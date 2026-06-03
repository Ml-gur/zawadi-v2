import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { computeScholarshipMatch as computeScholarshipMatchEngine } from './src/lib/matching-engine';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import {
  getProfile, upsertProfile, getAllProfiles,
  getAllScholarships, getPublishedScholarships, getScholarshipById, upsertScholarship,
  getApplications, upsertApplication, deleteApplication as sbDeleteApplication,
  getDocuments, insertDocument, deleteDocument as sbDeleteDocument,
  getEssays, insertEssay, updateEssay, deleteEssay as sbDeleteEssay,
  getPendingIngestions, updateIngestion,
  insertPayment, getPaymentByReference, upsertPayment, updatePaymentByReference, insertAuditLog,
} from './src/lib/supabase-server';
import { validateScholarship } from './src/services/scholarship-validator';
import { runDiscoveryPipeline, initializePipelineScheduler } from './src/services/scholarship-pipeline';
import { MENTOR_REVIEW_LIMITS, PLAN_LABELS, PLAN_HIERARCHY } from './src/config/plan-config';

dotenv.config();

// ─── Runtime helpers ──────────────────────────────────────────────────
function saveDb(db: any) {
  try { fs.writeFileSync(dbPath, JSON.stringify(db, null, 2)); }
  catch (e) { console.error('[DB] Failed to save db.json:', e); }
}

// Supabase helper wrappers for local JSON mode
const EMPTY_DB = () => ({ scholarships: [], users: [], applications: [], documents: [], essays: [], bot_ingestions: [], payments: [], audit_logs: [], mentor_review_requests: [], mentor_profiles: [], mentor_feedback_ratings: [], notifications: [], contact_submissions: [], recommendation_feedback: [] });

async function sbGetUser(email: string): Promise<any> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin.from('users').select('*').eq('email', email).single();
  return data;
}
async function sbUpsertUser(data: any): Promise<any> {
  if (!supabaseAdmin) return null;
  const { data: d } = await supabaseAdmin.from('users').upsert(data).select().single();
  return d;
}
async function sbGetUsers(): Promise<any[]> {
  if (!supabaseAdmin) return [];
  const { data } = await supabaseAdmin.from('users').select('*');
  return data || [];
}
async function sbGetDocs(email: string): Promise<any[]> {
  if (!supabaseAdmin) return [];
  const { data } = await supabaseAdmin.from('documents').select('*').eq('user_email', email);
  return data || [];
}
async function sbInsertDoc(doc: any): Promise<any> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin.from('documents').insert(doc).select().single();
  return data;
}
async function sbDeleteDoc(id: string): Promise<void> {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from('documents').delete().eq('id', id);
}
async function sbGetDoc(id: string): Promise<any> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin.from('documents').select('*').eq('id', id).single();
  return data;
}
async function sbUpdateDocStatus(id: string, status: string, errorMsg?: string): Promise<void> {
  if (!supabaseAdmin) return;
  const update: any = { analysis_status: status, last_analyzed_at: new Date().toISOString() };
  if (errorMsg) update.analysis_error = errorMsg;
  await supabaseAdmin.from('documents').update(update).eq('id', id);
}
async function updateDocStatus(id: string, status: string, errorMsg?: string): Promise<void> {
  if (IS_SUPABASE_MODE) {
    await sbUpdateDocStatus(id, status, errorMsg);
  } else {
    const db = getDb();
    const doc = db.documents.find((d: any) => d.id === id);
    if (doc) {
      doc.analysis_status = status;
      doc.last_analyzed_at = new Date().toISOString();
      if (errorMsg) doc.analysis_error = errorMsg;
      saveDb(db);
    }
  }
}
async function sbGetApps(email: string): Promise<any[]> {
  if (!supabaseAdmin) return [];
  const { data } = await supabaseAdmin.from('applications').select('*').eq('user_email', email);
  return data || [];
}
async function sbUpsertApp(app: any): Promise<any> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin.from('applications').upsert(app).select().single();
  return data;
}
async function sbDeleteApp(id: string): Promise<void> {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from('applications').delete().eq('id', id);
}
async function sbGetScholarshipsList(): Promise<any[]> {
  if (!supabaseAdmin) return [];
  const { data } = await supabaseAdmin.from('scholarships').select('*');
  return data || [];
}
async function sbGetScholarshipById(id: string): Promise<any> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin.from('scholarships').select('*').eq('id', id).single();
  return data;
}
async function sbUpsertScholarship(s: any): Promise<any> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin.from('scholarships').upsert(s).select().single();
  return data;
}
async function sbGetEssaysList(email: string): Promise<any[]> {
  if (!supabaseAdmin) return [];
  const { data } = await supabaseAdmin.from('essays').select('*').eq('user_email', email);
  return data || [];
}
async function sbInsertAudit(log: any): Promise<void> {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from('audit_logs').insert(log);
}
async function sbGetPayByReference(ref: string): Promise<any> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin.from('payments').select('*').eq('reference', ref).single();
  return data;
}
async function sbUpsertPayRecord(p: any): Promise<any> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin.from('payments').upsert(p).select().single();
  return data;
}
async function sbUpdatePayByReference(ref: string, updates: any): Promise<any> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin.from('payments').update(updates).eq('reference', ref).select().single();
  return data;
}
// JWT secret — must be set in environment, never hardcoded
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable must be set.');
  process.exit(1);
}
if (JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters long.');
  process.exit(1);
}

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const genAI = (GOOGLE_API_KEY && GOOGLE_API_KEY !== 'your_api_key_here') ? new GoogleGenAI({ apiKey: GOOGLE_API_KEY }) : null;

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';

export const supabaseAdmin = SUPABASE_URL ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;
export const supabaseAnon = SUPABASE_URL ? createClient(SUPABASE_URL, VITE_SUPABASE_ANON_KEY) : null;

// ─── Data mode: Supabase-primary or local JSON fallback ───────────────
const IS_SUPABASE_MODE = !!SUPABASE_URL && !!SUPABASE_SERVICE_ROLE_KEY;
console.log(`[BOOT] Data mode: ${IS_SUPABASE_MODE ? 'SUPABASE (primary database — all reads/writes go to Supabase)' : 'LOCAL JSON (db.json — no Supabase configured)'}`);

const app = express();
const PORT = 3000;
const dailyGenCounts = new Map<string, number>();

const AFRICAN_COUNTRIES = [
  "Nigeria", "Ghana", "Sierra Leone", "Liberia", "Gambia",
  "Kenya", "Tanzania", "Uganda", "Rwanda", "Zambia",
  "Malawi", "Zimbabwe", "Botswana", "Namibia", "Eswatini",
  "Lesotho", "South Africa", "South Sudan", "Sudan", "Ethiopia", "Eritrea",
  "Senegal", "Côte d'Ivoire", "Mali", "Burkina Faso", "Guinea",
  "Niger", "Togo", "Benin", "Cameroon", "Republic of Congo",
  "DR Congo", "Central African Republic", "Chad", "Gabon", "Equatorial Guinea",
  "Madagascar", "Comoros", "Djibouti", "Mauritania", "Seychelles", "Mauritius",
  "Egypt", "Morocco", "Algeria", "Tunisia", "Libya", "Somalia",
  "Angola", "Mozambique", "Cape Verde", "Guinea-Bissau", "São Tomé & Príncipe",
  "Burundi"
];

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (_req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Resolve DB path
const dbPath = path.join(process.cwd(), 'src/data/db.json');

function getDb() {
  if (IS_SUPABASE_MODE) {
    try {
      const content = fs.readFileSync(dbPath, 'utf8');
      return JSON.parse(content);
    } catch { }
    return EMPTY_DB();
  }

  if (!fs.existsSync(dbPath)) {
    const defaults = EMPTY_DB();
    fs.writeFileSync(dbPath, JSON.stringify(defaults, null, 2));
    return defaults;
  }

  try {
    const content = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(content);
    // Clean any leaked admin fields
    let dirty = false;
    if (db.users) {
      for (const u of db.users) {
        if ('admin_email' in u) { delete u.admin_email; dirty = true; }
        if ('admin_id' in u) { delete u.admin_id; dirty = true; }
      }
    }
    if (dirty) saveDb(db);
    return db;
  } catch {
    return EMPTY_DB();
  }
}

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const fileFilter = (_req: any, file: any, cb: any) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only PDF, JPG, and PNG files are allowed'));
};
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }
});

function stripSensitive(user: any) {
  if (!user) return user;
  const { password_hash, ...safe } = user;
  return safe;
}

function fillUserDefaults(user: any) {
  if (!user) return user;
  return { native_language: "English", ...user };
}

function computeScholarshipMatch(s: any, user: any, userDocs: any[]) {
  return computeScholarshipMatchEngine(s, user, userDocs);
}

// -------------------------------------------------------------
// AUTHENTICATION — Supabase Auth
// -------------------------------------------------------------

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, name, password, country } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }

    const db = getDb();
    if (IS_SUPABASE_MODE && supabaseAdmin) {
      const existing = await sbGetUser(email.toLowerCase());
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }
    } else {
      const existing = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }
    }

    // Create auth user in Supabase Auth (manages password hashing + JWT)
    let authUserId: string | undefined;
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { name: name || email.split('@')[0], country: country || '' }
      });
      if (authError && !authError.message.includes('already')) throw authError;
      if (authData?.user) authUserId = authData.user.id;
    } catch (authErr: any) {
      // If Supabase Auth fails (e.g. tables not created yet), fall back to local auth
      console.warn('Supabase Auth unavailable, using local auth:', authErr.message);
    }

    const newUser = fillUserDefaults({
      email: email.toLowerCase(),
      name: name || email.split('@')[0],
      country: country || '',
      plan: "explorer",
      joined_at: new Date().toISOString().split('T')[0],
      role: "user",
      status: "active",
      confirmed_fields: [],
      auth_user_id: authUserId,
    });

    const password_hash = await bcrypt.hash(password, 10);
    (newUser as any).password_hash = password_hash;

    if (IS_SUPABASE_MODE && supabaseAdmin) {
      try {
        await upsertProfile({ ...newUser, password_hash });
      } catch (sbErr: any) {
        console.warn('[Register] Supabase profile upsert failed, saving locally:', sbErr.message);
        db.users.push(newUser);
        saveDb(db);
      }
    } else {
      db.users.push(newUser);
      saveDb(db);
    }

    const token = jwt.sign({ email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: stripSensitive(newUser) });
  } catch (err: any) {
    res.status(500).json({ error: "Registration failed: " + err.message });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (IS_SUPABASE_MODE && supabaseAdmin) {
      const { data: user, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .ilike('email', email)
        .single();

      if (!error && user && user.password_hash) {
        const valid = await bcrypt.compare(password, user.password_hash);
        if (valid) {
          const tokenExpiry = (user.role === 'super_admin' || user.role === 'content_manager') ? '8h' : '7d';
          const tokenPayload: any = { email: user.email, role: user.role };
          if (user.role === 'super_admin' || user.role === 'content_manager') {
            tokenPayload.admin = true;
          }
          const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: tokenExpiry });
          const mergedUser = await sbGetUser(user.email.toLowerCase());
          return res.json({ token, user: stripSensitive(mergedUser || user) });
        }
      }
    }

    const db = getDb();
    const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (!user || !user.password_hash) {
      db.audit_logs.push({
        id: "audit-" + Date.now(), admin_email: email,
        action: "failed_login", target_type: "auth", target_id: email,
        details: `Failed login attempt for ${email} from ${req.ip || "127.0.0.1"} — user not found`,
        ip_address: req.ip || "127.0.0.1", created_at: new Date().toISOString()
      });
      saveDb(db);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      db.audit_logs.push({
        id: "audit-" + Date.now(), admin_email: email,
        action: "failed_login", target_type: "auth", target_id: email,
        details: `Failed login attempt for ${email} from ${req.ip || "127.0.0.1"} — wrong password`,
        ip_address: req.ip || "127.0.0.1", created_at: new Date().toISOString()
      });
      saveDb(db);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const tokenExpiry = (user.role === 'super_admin' || user.role === 'content_manager') ? '8h' : '7d';
    const tokenPayload: any = { email: user.email, role: user.role };
    if (user.role === 'super_admin' || user.role === 'content_manager') {
      tokenPayload.admin = true;
    }
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: tokenExpiry });

    if (user.role === 'super_admin' || user.role === 'content_manager') {
      db.audit_logs.push({
        id: "audit-" + Date.now(), admin_email: user.email,
        action: "admin_login", target_type: "auth", target_id: user.email,
        details: `Admin login from ${user.email}`,
        ip_address: req.ip || "127.0.0.1", created_at: new Date().toISOString()
      });
      saveDb(db);
    }

    res.json({ token, user: stripSensitive(user) });
  } catch (err: any) {
    res.status(500).json({ error: "Login failed: " + err.message });
  }
});

app.post('/api/admin/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (IS_SUPABASE_MODE && supabaseAdmin) {
      const { data: user, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .ilike('email', email)
        .single();

      if (error || !user || !user.password_hash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      if (user.role !== 'super_admin') {
        return res.status(403).json({ error: "Access denied." });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = jwt.sign({ email: user.email, role: user.role, admin: true }, JWT_SECRET, { expiresIn: '8h' });
      return res.json({ token, user: stripSensitive(user) });
    }

    const db = getDb();
    const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

    if (!user || !user.password_hash) {
      db.audit_logs.push({
        id: "audit-" + Date.now(), admin_email: email,
        action: "failed_login", target_type: "auth", target_id: email,
        details: `Failed admin login attempt for ${email} from ${req.ip || "127.0.0.1"} — user not found`,
        ip_address: req.ip || "127.0.0.1", created_at: new Date().toISOString()
      });
      saveDb(db);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.role !== 'super_admin') {
      db.audit_logs.push({
        id: "audit-" + Date.now(), admin_email: email,
        action: "failed_login", target_type: "auth", target_id: email,
        details: `Failed admin login attempt for ${email} from ${req.ip || "127.0.0.1"} — not super_admin`,
        ip_address: req.ip || "127.0.0.1", created_at: new Date().toISOString()
      });
      saveDb(db);
      return res.status(403).json({ error: "Access denied." });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      db.audit_logs.push({
        id: "audit-" + Date.now(), admin_email: email,
        action: "failed_login", target_type: "auth", target_id: email,
        details: `Failed admin login attempt for ${email} from ${req.ip || "127.0.0.1"} — wrong password`,
        ip_address: req.ip || "127.0.0.1", created_at: new Date().toISOString()
      });
      saveDb(db);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ email: user.email, role: user.role, admin: true }, JWT_SECRET, { expiresIn: '8h' });

    db.audit_logs.push({
      id: "audit-" + Date.now(), admin_email: user.email,
      action: "admin_login", target_type: "auth", target_id: user.email,
      details: `Admin login from ${user.email}`,
      ip_address: req.ip || "127.0.0.1", created_at: new Date().toISOString()
    });
    saveDb(db);

    res.json({ token, user: stripSensitive(user) });
  } catch (err: any) {
    res.status(500).json({ error: "Admin login failed: " + err.message });
  }
});

app.get('/api/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (IS_SUPABASE_MODE && supabaseAdmin) {
      const user = await sbGetUser(decoded.email.toLowerCase());
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      return res.json({ user: stripSensitive(user) });
    }

    const db = getDb();
    const user = db.users.find((u: any) => u.email.toLowerCase() === decoded.email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    res.json({ user: stripSensitive(user) });
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

// ─── Password Reset ────────────────────────────────────────────────

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    if (IS_SUPABASE_MODE && supabaseAdmin) {
      const user = await sbGetUser(email.toLowerCase());
      if (user) {
        await sbUpsertUser({ ...user, reset_token: resetToken, reset_token_expiry: resetTokenExpiry });
      }
    } else {
      const db = getDb();
      const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
      if (user) {
        user.reset_token = resetToken;
        user.reset_token_expiry = resetTokenExpiry;
        saveDb(db);
      }
    }

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: "If an account with that email exists, a password reset link has been generated.",
      reset_token: resetToken,
      reset_url: `/reset-password?token=${resetToken}`
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to process password reset request" });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: "Token and new password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    let updated = false;

    if (IS_SUPABASE_MODE && supabaseAdmin) {
      const profiles = await sbGetUsers();
      const user = profiles.find((u: any) => u.reset_token === token);
      if (user && user.reset_token_expiry && user.reset_token_expiry > Date.now()) {
        const password_hash = await bcrypt.hash(password, 10);
        await sbUpsertUser({ ...user, password_hash, reset_token: null, reset_token_expiry: null });
        updated = true;
      }
    } else {
      const db = getDb();
      const user = db.users.find((u: any) => u.reset_token === token);
      if (user && user.reset_token_expiry && user.reset_token_expiry > Date.now()) {
        user.password_hash = await bcrypt.hash(password, 10);
        user.reset_token = null;
        user.reset_token_expiry = null;
        saveDb(db);
        updated = true;
      }
    }

    if (!updated) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    res.json({ success: true, message: "Password has been reset successfully." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// -------------------------------------------------------------
// REST API ROUTES — JSON DB
// -------------------------------------------------------------

const serverStartTime = Date.now();

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    timestamp: new Date().toISOString(),
    supabase: IS_SUPABASE_MODE,
    ai_provider: !!process.env.GEMINI_API_KEY || !!process.env.OPENAI_API_KEY || !!process.env.DEEPSEEK_API_KEY,
    memory_storage: true,
  });
});

app.get('/api/config', (_req, res) => {
  res.json({
    plans: {
      explorer: { id: "explorer", name: "Explorer", priceUsd: 0, priceKes: 0, essayLimit: 3, docLimit: 15 },
      plus: { id: "plus", name: "Scholar Plus", priceUsd: 5, priceKes: 650, essayLimit: 10, docLimit: 50 },
      pro: { id: "pro", name: "Application Pro", priceUsd: 12, priceKes: 1560, essayLimit: 25, docLimit: 9999 },
      institutional: { id: "institutional", name: "Zawadi Institutional", priceUsd: 0, priceKes: 0, essayLimit: 9999, docLimit: 9999 }
    },
    countries: AFRICAN_COUNTRIES,
    degreeLevels: ["Bachelors", "Masters", "PhD", "Doctorate", "Postdoctoral"],
    fields: [
      "Computer Science", "Engineering", "Business", "Public Health", "Law",
      "International Relations", "Economics", "Management", "Political Science",
      "Environmental Science", "Development Studies", "STEM", "All fields"
    ]
  });
});

app.get('/api/scholarships', async (req, res) => {
  let list: any[] = [];

  if (IS_SUPABASE_MODE) {
    list = await sbGetScholarshipsList();
  } else {
    const db = getDb();
    list = db.scholarships || [];
  }

  const userRole = req.query.role as string;
  const isAdmin = userRole === 'super_admin' || userRole === 'content_manager';
  if (!isAdmin) {
    list = list.filter((s: any) => s.published);
  }

  const country = req.query.country as string;
  const degree = req.query.degree as string;
  const field = req.query.field as string;
  const funding = req.query.funding as string;
  const host_region = req.query.host_region as string;
  const urgency = req.query.urgency as string;
  const no_ielts = req.query.no_ielts as string;
  const sponsor_type = req.query.sponsor_type as string;
  const email = (req.query.email || '') as string;

  if (country && country !== 'All Regions' && country !== 'Any' && country !== '') {
    list = list.filter((s: any) =>
      (s.countries || s.country || []).some((c: string) => c.toLowerCase().trim() === country.toLowerCase().trim() || c.toLowerCase().trim() === 'global' || c.toLowerCase().trim() === 'pan-african')
    );
  }
  if (degree && degree !== 'All Levels' && degree !== 'Any' && degree !== '') {
    list = list.filter((s: any) =>
      (s.degree_levels || []).some((d: string) => d.toLowerCase() === degree.toLowerCase())
    );
  }
  if (field && field !== 'All Fields' && field !== 'Any' && field !== '') {
    list = list.filter((s: any) =>
      (s.fields_of_study || s.fields || []).some((f: string) => f.toLowerCase() === field.toLowerCase() || f.toLowerCase() === 'all fields')
    );
  }
  if (funding && funding !== 'Any' && funding !== '') {
    list = list.filter((s: any) => s.funding_type?.toLowerCase() === funding.toLowerCase());
  }
  if (host_region && host_region !== '') {
    list = list.filter((s: any) => s.host_region?.toLowerCase() === host_region.toLowerCase());
  }
  if (urgency && urgency !== '') {
    list = list.filter((s: any) => s.urgency?.toLowerCase() === urgency.toLowerCase());
  }
  if (no_ielts === 'true') {
    list = list.filter((s: any) => s.no_ielts === true);
  }
  if (sponsor_type && sponsor_type !== '') {
    list = list.filter((s: any) => s.sponsor_type?.toLowerCase() === sponsor_type.toLowerCase());
  }

  if (email) {
    if (IS_SUPABASE_MODE) {
      const user = await sbGetUser(email);
      const userDocs = await sbGetDocs(email);
      if (user) {
        list = list.map((s: any) => ({ ...s, match: computeScholarshipMatch(s, user, userDocs) }));
        list.sort((a: any, b: any) => (b.match?.score || 0) - (a.match?.score || 0));
      }
    } else {
      const db = getDb();
      const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
      const userDocs = db.documents.filter((d: any) => d.user_email?.toLowerCase() === email.toLowerCase()) || [];
      if (user) {
        list = list.map((s: any) => ({ ...s, match: computeScholarshipMatch(s, user, userDocs) }));
        list.sort((a: any, b: any) => (b.match?.score || 0) - (a.match?.score || 0));
      }
    }
  }

  res.json(list);
});

app.get('/api/match/:scholarshipId', async (req, res) => {
  const email = req.query.email as string;
  if (!email) return res.status(400).json({ error: 'Email required' });

  let user: any, schol: any, userDocs: any[];

  if (IS_SUPABASE_MODE) {
    user = await sbGetUser(email);
    schol = await sbGetScholarshipById(req.params.scholarshipId);
    userDocs = await sbGetDocs(email);
  } else {
    const db = getDb();
    user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    schol = db.scholarships.find((s: any) => s.id === req.params.scholarshipId);
    userDocs = db.documents.filter((d: any) => d.user_email?.toLowerCase() === email.toLowerCase()) || [];
  }

  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!schol) return res.status(404).json({ error: 'Scholarship not found' });

  const match = computeScholarshipMatch(schol, user, userDocs);
  res.json({ match, scholarship: schol });
});

app.get('/api/match', async (req, res) => {
  const email = req.query.email as string;
  if (!email) return res.status(400).json({ error: 'Email required' });

  let user: any, userDocs: any[], scholarships: any[];

  if (IS_SUPABASE_MODE) {
    user = await sbGetUser(email);
    userDocs = await sbGetDocs(email);
    scholarships = (await sbGetScholarshipsList()).filter((s: any) => s.published);
  } else {
    const db = getDb();
    user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    userDocs = db.documents.filter((d: any) => d.user_email?.toLowerCase() === email.toLowerCase()) || [];
    scholarships = (db.scholarships || []).filter((s: any) => s.published);
  }

  if (!user) return res.status(404).json({ error: 'User not found' });

  const results = scholarships
    .map((s: any) => ({ scholarship_id: s.id, match: computeScholarshipMatch(s, user, userDocs) }))
    .sort((a: any, b: any) => (b.match?.score || 0) - (a.match?.score || 0));

  res.json(results);
});

app.post('/api/match-rationale', async (req: any, res) => {
  try {
    const { user_email, scholarship_id } = req.body;
    if (!user_email || !scholarship_id) {
      return res.status(400).json({ error: 'user_email and scholarship_id required' });
    }

    let user: any, schol: any, userDocs: any[];
    if (IS_SUPABASE_MODE) {
      user = await sbGetUser(user_email);
      schol = await sbGetScholarshipById(scholarship_id);
      userDocs = await sbGetDocs(user_email);
    } else {
      const db = getDb();
      user = db.users.find((u: any) => u.email.toLowerCase() === user_email.toLowerCase());
      schol = db.scholarships.find((s: any) => s.id === scholarship_id);
      userDocs = db.documents.filter((d: any) => d.user_email?.toLowerCase() === user_email.toLowerCase()) || [];
    }
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!schol) return res.status(404).json({ error: 'Scholarship not found' });

    const match = computeScholarshipMatch(schol, user, userDocs);

    const { generateContent, hasAnyKey } = await import('./src/services/ai-provider');
    if (!hasAnyKey()) {
      return res.json({ match, rationale: { summary: 'AI rationale unavailable — no AI provider configured.' } });
    }

    const systemPrompt = 'You are a scholarship matching advisor. Explain why a student matches (or does not match) a specific scholarship. Be specific, constructive, and actionable. Return ONLY valid JSON with keys: summary (2-3 sentence overall assessment), strengths (array of strings), weaknesses (array of strings or empty), suggestions (array of actionable suggestions). No markdown, no code fences.';

    const userPrompt = `Student Profile:
- Name: ${user.name || 'N/A'}
- Country: ${user.country || 'N/A'}
- Degree Level: ${user.degree_level || 'N/A'}
- Field: ${user.field_of_study || 'N/A'}
- GPA: ${user.gpa || 'N/A'}
- Work Experience: ${user.work_experience_years || 0} years
- Has Research: ${user.has_research ? 'Yes' : 'No'}
- Has Leadership: ${user.has_leadership ? 'Yes' : 'No'}

Scholarship:
- Name: ${schol.name || 'N/A'}
- Provider: ${schol.provider || 'N/A'}
- Degree Levels: ${Array.isArray(schol.degree_levels) ? schol.degree_levels.join(', ') : schol.degree_levels || 'N/A'}
- Fields: ${Array.isArray(schol.fields_of_study || schol.fields) ? (schol.fields_of_study || schol.fields).join(', ') : 'N/A'}
- Countries: ${Array.isArray(schol.countries) ? schol.countries.join(', ') : schol.countries || 'N/A'}
- Funding: ${schol.funding_type || 'N/A'}
- Deadline: ${schol.deadline || 'N/A'}

Match Score: ${match.score}/100
${match.is_eligible ? 'Eligible: Yes' : 'Eligible: No'}
Match Reasons: ${(match.reasons || []).join('; ')}
${match.disqualifying_reasons?.length ? `Disqualifiers: ${match.disqualifying_reasons.join('; ')}` : ''}
Breakdown: ${JSON.stringify(match.breakdown || {})}`;

    const result = await generateContent({ systemInstruction: systemPrompt, prompt: userPrompt, temperature: 0.3, maxOutputTokens: 1024 });
    let rationale: any = { summary: 'Unable to generate rationale at this time.' };
    if (result?.text) {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { rationale = JSON.parse(jsonMatch[0]); } catch {}
      }
    }

    res.json({ match, rationale });
  } catch (err: any) {
    console.error('[Match Rationale] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate match rationale.' });
  }
});

app.post('/api/match/feedback', verifyAuth, async (req: any, res) => {
  try {
    const user_email = req.userEmail;
    const { scholarship_id, feedback, comment } = req.body;
    if (!scholarship_id || !feedback) {
      return res.status(400).json({ error: 'scholarship_id and feedback required' });
    }
    if (!['relevant', 'irrelevant'].includes(feedback)) {
      return res.status(400).json({ error: 'feedback must be "relevant" or "irrelevant"' });
    }

    const entry = {
      id: 'recfb-' + Date.now(),
      user_email,
      scholarship_id,
      feedback,
      comment: comment || null,
      created_at: new Date().toISOString(),
    };

    if (IS_SUPABASE_MODE) {
      if (supabaseAdmin) {
        await supabaseAdmin.from('recommendation_feedback').insert(entry);
      }
    } else {
      const db = getDb();
      if (!db.recommendation_feedback) db.recommendation_feedback = [];
      db.recommendation_feedback.push(entry);
      saveDb(db);
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('[Match Feedback] Error:', err.message);
    res.status(500).json({ error: 'Failed to save feedback.' });
  }
});

app.get('/api/match/feedback', verifyAuth, async (req: any, res) => {
  try {
    const user_email = req.userEmail;
    let feedbackList: any[] = [];

    if (IS_SUPABASE_MODE) {
      if (supabaseAdmin) {
        const { data } = await supabaseAdmin
          .from('recommendation_feedback')
          .select('*')
          .eq('user_email', user_email)
          .order('created_at', { ascending: false });
        feedbackList = data || [];
      }
    } else {
      const db = getDb();
      feedbackList = (db.recommendation_feedback || [])
        .filter((f: any) => f.user_email?.toLowerCase() === user_email?.toLowerCase())
        .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    res.json(feedbackList);
  } catch (err: any) {
    console.error('[Match Feedback] Error:', err.message);
    res.json([]);
  }
});

app.get('/api/users', verifyAuth, async (req: any, res) => {
  const email = req.userEmail;
  if (!email) return res.status(401).json({ error: "Authentication required." });

  let user: any;

  if (IS_SUPABASE_MODE) {
    user = await sbGetUser(email);
  } else {
    const db = getDb();
    user = db.users.find((u: any) => u.email.toLowerCase() === email);
  }

  if (!user) {
    user = fillUserDefaults({
      email, name: email.split('@')[0], country: '',
      plan: "explorer", joined_at: new Date().toISOString().split('T')[0],
      role: "user", status: "active"
    });
    if (IS_SUPABASE_MODE) {
      await sbUpsertUser(user);
    } else {
      const db = getDb();
      db.users.push(user);
      saveDb(db);
    }
  }

  res.json({ user: stripSensitive(user) });
});

app.get('/api/users/:email', verifyAuth, async (req: any, res) => {
  const email = req.userEmail;
  let user: any;

  if (IS_SUPABASE_MODE) {
    user = await sbGetUser(email);
  } else {
    const db = getDb();
    user = db.users.find((u: any) => u.email.toLowerCase() === email);
  }

  if (!user) {
    user = fillUserDefaults({
      email, name: email.split('@')[0], country: '',
      plan: "explorer", joined_at: new Date().toISOString().split('T')[0],
      role: "user", status: "active"
    });
    if (IS_SUPABASE_MODE) {
      await sbUpsertUser(user);
    } else {
      const db = getDb();
      db.users.push(user);
      saveDb(db);
    }
  }
  res.json({ user: stripSensitive(user) });
});

app.post('/api/users', verifyAuth, async (req: any, res) => {
  const email = req.userEmail;
  if (!email) return res.status(401).json({ error: "Authentication required." });

  const PROTECTED_FIELDS = ['role', 'status', 'password_hash', 'plan', 'auth_user_id', 'joined_at', 'admin_email'];
  const safeBody = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => !PROTECTED_FIELDS.includes(k))
  );

  if (IS_SUPABASE_MODE) {
    const existing = await sbGetUser(email);
    const updatedKeys = Object.keys(safeBody).filter(k => k !== 'email' && k !== 'confirmed_fields');
    const existingConfirmed = existing?.confirmed_fields || [];
    const mergedConfirmed = Array.from(new Set([...existingConfirmed, ...updatedKeys]));

    const profile = {
      email,
      ...safeBody,
      confirmed_fields: mergedConfirmed,
      gpa: req.body.gpa !== undefined ? parseFloat(req.body.gpa) : existing?.gpa,
      work_experience_years: req.body.work_experience_years !== undefined ? parseFloat(req.body.work_experience_years) : existing?.work_experience_years,
      publications: req.body.publications !== undefined ? parseInt(req.body.publications) : existing?.publications,
      updated_at: new Date().toISOString()
    };
    await sbUpsertUser(profile);
    const mergedUser = await sbGetUser(email);
    return res.json({ success: true, user: stripSensitive(mergedUser || profile) });
  }

  const db = getDb();
  let userIndex = db.users.findIndex((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (userIndex !== -1) {
    const updatedKeys = Object.keys(safeBody).filter(k => k !== 'email' && k !== 'confirmed_fields');
    const existingConfirmed = db.users[userIndex].confirmed_fields || [];
    const mergedConfirmed = Array.from(new Set([...existingConfirmed, ...updatedKeys]));

    db.users[userIndex] = {
      ...db.users[userIndex], ...safeBody,
      confirmed_fields: mergedConfirmed,
      gpa: req.body.gpa !== undefined ? parseFloat(req.body.gpa) : db.users[userIndex].gpa,
      work_experience_years: req.body.work_experience_years !== undefined ? parseFloat(req.body.work_experience_years) : db.users[userIndex].work_experience_years,
      publications: req.body.publications !== undefined ? parseInt(req.body.publications) : db.users[userIndex].publications,
      updated_at: new Date().toISOString()
    };
    saveDb(db);
    res.json({ success: true, user: stripSensitive(db.users[userIndex]) });
  } else {
    const newUser = fillUserDefaults({
      email, name: req.body.name || email.split('@')[0], country: req.body.country || '',
      degree_level: req.body.degree_level, field_of_study: req.body.field_of_study, plan: req.body.plan || "explorer",
      gpa: req.body.gpa !== undefined ? parseFloat(req.body.gpa) : undefined,
      gpa_scale: req.body.gpa_scale, gpa_system: req.body.gpa_system, native_language: req.body.native_language,
      additional_languages: req.body.additional_languages,
      work_experience_years: req.body.work_experience_years !== undefined ? parseFloat(req.body.work_experience_years) : undefined,
      has_research: req.body.has_research !== undefined ? !!req.body.has_research : undefined,
      publications: req.body.publications !== undefined ? parseInt(req.body.publications) : undefined,
      has_leadership: req.body.has_leadership !== undefined ? !!req.body.has_leadership : undefined,
      verified_via_doc: req.body.verified_via_doc !== undefined ? !!req.body.verified_via_doc : undefined,
      date_of_birth: req.body.date_of_birth, institution: req.body.institution, avatar_url: req.body.avatar_url,
      joined_at: new Date().toISOString().split('T')[0],
      role: "user", status: "active",
      confirmed_fields: Object.keys(req.body).filter(k => k !== 'email'),
    });
    db.users.push(newUser);
    saveDb(db);
    res.json({ success: true, user: stripSensitive(newUser) });
  }
});

app.get('/api/applications', verifyAuth, async (req: any, res) => {
  const email = req.userEmail;
  if (IS_SUPABASE_MODE) {
    const list = await sbGetApps(email);
    return res.json(list);
  }
  const db = getDb();
  const list = db.applications.filter((a: any) => a.user_email?.toLowerCase() === email.toLowerCase());
  res.json(list);
});

app.post('/api/applications', verifyAuth, async (req: any, res) => {
  const rawEmail = req.body.user_email || req.body.email || '';
  const user_email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  const { scholarship_id, status, priority, notes } = req.body;

  if (!user_email) return res.status(400).json({ error: "Email is required" });

  const VALID_PRIORITIES = ['High', 'Normal', 'Low'];
  const finalPriority = VALID_PRIORITIES.includes(priority) ? priority : 'Normal';

  const payload = {
    id: "app-" + Date.now(),
    user_email, scholarship_id,
    status: status || "Saved", priority: finalPriority,
    notes: notes || "", updated_at: new Date().toISOString().split('T')[0]
  };

  if (IS_SUPABASE_MODE) {
    await sbUpsertApp(payload);
    return res.json({ success: true, application: payload });
  }

  const db = getDb();
  let appIndex = db.applications.findIndex((a: any) =>
    a.user_email?.toLowerCase() === user_email && a.scholarship_id === scholarship_id
  );
  if (appIndex !== -1) payload.id = db.applications[appIndex].id;

  if (appIndex !== -1) db.applications[appIndex] = payload;
  else db.applications.push(payload);
  saveDb(db);
  res.json({ success: true, application: payload });
});

app.delete('/api/applications/:id', verifyAuth, async (req: any, res) => {
  const email = req.userEmail;
  if (!email) return res.status(401).json({ error: "Authentication required." });
  const id = req.params.id;

  if (IS_SUPABASE_MODE) {
    await sbDeleteApp(id);
    return res.json({ success: true });
  }

  const db = getDb();
  const appIndex = db.applications.findIndex((a: any) => a.id === id);
  if (appIndex === -1) return res.status(404).json({ error: "Application not found." });
  if (db.applications[appIndex].user_email?.toLowerCase() !== email) {
    return res.status(403).json({ error: "You can only delete your own applications." });
  }
  db.applications.splice(appIndex, 1);
  saveDb(db);
  res.json({ success: true });
});

app.get('/api/documents', verifyAuth, async (req: any, res) => {
  const email = req.userEmail;
  if (IS_SUPABASE_MODE) {
    const list = await sbGetDocs(email);
    return res.json(list);
  }
  const db = getDb();
  const list = db.documents.filter((d: any) => d.user_email?.toLowerCase() === email.toLowerCase());
  res.json(list);
});

app.post('/api/documents/upload', verifyAuth, upload.single('file'), async (req: any, res) => {
  const user_email = req.userEmail;
  const docType = req.body.type || 'Academic Transcript';

  if (!user_email) return res.status(401).json({ error: "Authentication required." });
  if (!req.file) return res.status(400).json({ error: "No file provided." });

  const file = req.file;
  const sizeFormatted = file.size >= 1048576
    ? (file.size / 1048576).toFixed(1) + ' MB'
    : (file.size / 1024).toFixed(0) + ' KB';

  let user: any = null;
  let limit = 15;

  if (IS_SUPABASE_MODE) {
    user = await sbGetUser(user_email);
    if (user?.plan === 'plus') limit = 50;
    else if (user?.plan === 'pro' || user?.plan === 'institutional') limit = 9999;
    const currentDocs = await sbGetDocs(user_email);
    if (currentDocs.length >= limit) {
      return res.status(403).json({ error: `Upload limit of ${limit} documents reached.` });
    }
  } else {
    const db = getDb();
    const ui = db.users.findIndex((u: any) => u.email.toLowerCase() === user_email);
    user = ui !== -1 ? db.users[ui] : null;
    const currentDocs = db.documents.filter((d: any) => d.user_email?.toLowerCase() === user_email);
    if (user?.plan === 'plus') limit = 50;
    else if (user?.plan === 'pro' || user?.plan === 'institutional') limit = 9999;
    if (currentDocs.length >= limit) {
      return res.status(403).json({ error: `Upload limit of ${limit} documents reached.` });
    }
  }

  const newDoc: any = {
    id: "doc-" + Date.now(), user_email, name: file.originalname,
    type: docType, size: sizeFormatted, file_path: file.originalname,
    uploaded_at: new Date().toISOString().split('T')[0],
    ai_extraction_result: null,
    storage_path: null as string | null,
    analysis_status: 'pending',
    last_analyzed_at: null,
    analysis_error: null,
  };

  // Upload to Supabase Storage if in Supabase mode
  if (IS_SUPABASE_MODE && supabaseAdmin) {
    const storagePath = `${user_email}/${docType}/${Date.now()}_${file.originalname}`;
    const { error: storageError } = await supabaseAdmin.storage
      .from('scholarship-docs')
      .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });
    if (!storageError) {
      newDoc.storage_path = storagePath;
    } else {
      console.error('[Upload] Supabase storage upload failed:', storageError.message);
    }
  }

  // Save document first
  if (IS_SUPABASE_MODE) {
    await sbInsertDoc(newDoc);
  } else {
    const db = getDb();
    db.documents.push(newDoc);
    saveDb(db);
  }

  // Trigger AI analysis asynchronously (non-blocking)
  const userPlan = user?.plan || 'explorer';
  if (file.buffer) {
    analyzeDocumentAsync(file.buffer, docType, user_email, userPlan, newDoc.id, file.mimetype, file.originalname).catch(() => {});
  }

  res.json({ success: true, document: newDoc });
});

async function analyzeDocumentAsync(buffer: Buffer, docType: string, user_email: string, plan: string, docId: string, mimetype: string = 'application/octet-stream', filename: string = 'document') {
  try {
    // Mark as processing
    await updateDocStatus(docId, 'processing');

    const { analyzeDocument } = await import('./src/services/document-intelligence');
    const { result, analyzed, extraction } = await analyzeDocument(buffer, docType, user_email, plan, mimetype, filename);
    if (!analyzed || !result) {
      await updateDocStatus(docId, 'completed');
      return;
    }

    const aiResult = JSON.stringify({ data: result, extraction });
    // Update document record with extraction result
    if (IS_SUPABASE_MODE) {
      try {
        const { updateDocumentAiResult } = await import('./src/lib/supabase-server');
        await updateDocumentAiResult(docId, aiResult);
      } catch {}
    } else {
      const db = getDb();
      const doc = db.documents.find((d: any) => d.id === docId);
      if (doc) {
        doc.ai_extraction_result = aiResult;
        saveDb(db);
      }
    }

    // Update user profile with extracted data
    const existingUser = IS_SUPABASE_MODE ? await sbGetUser(user_email) : getDb().users.find((u: any) => u.email.toLowerCase() === user_email.toLowerCase());
    if (!existingUser) return;

    const { buildProfileEnrichment } = await import('./src/services/document-intelligence');
    const enrichmentFields = buildProfileEnrichment(result, docType);

    const updates: any = {};
    const r = result as any;

    if (r.institution_name && !existingUser.institution) updates.institution = r.institution_name;
    if (r.degree_level && !existingUser.degree_level) updates.degree_level = r.degree_level;
    if (r.field_of_study && !existingUser.field_of_study) updates.field_of_study = r.field_of_study;
    if (r.gpa !== null && r.gpa !== undefined) {
      const currentGpa = parseFloat(existingUser.gpa);
      if (!currentGpa || r.gpa > currentGpa) updates.gpa = r.gpa;
    }
    if (r.gpa_scale && !existingUser.gpa_scale) updates.gpa_scale = String(r.gpa_scale);
    if (r.work_experience_years !== null && r.work_experience_years !== undefined && !existingUser.work_experience_years) {
      updates.work_experience_years = r.work_experience_years;
    }
    if (r.primary_field && !existingUser.field_of_study) updates.field_of_study = r.primary_field;

    // Persist document-extracted enrichment fields (overwrites — doc data is source of truth)
    if (enrichmentFields.doc_gpa_normalised_extracted !== undefined) {
      updates.doc_gpa_normalised_extracted = enrichmentFields.doc_gpa_normalised_extracted;
    }
    if (enrichmentFields.doc_has_research_extracted !== undefined) {
      updates.doc_has_research_extracted = enrichmentFields.doc_has_research_extracted;
    }
    if (enrichmentFields.doc_publication_count_extracted !== undefined) {
      updates.doc_publication_count_extracted = enrichmentFields.doc_publication_count_extracted;
    }
    if (enrichmentFields.doc_work_years_extracted !== undefined) {
      updates.doc_work_years_extracted = enrichmentFields.doc_work_years_extracted;
    }
    if (enrichmentFields.doc_has_leadership_extracted !== undefined) {
      updates.doc_has_leadership_extracted = enrichmentFields.doc_has_leadership_extracted;
    }
    if (enrichmentFields.doc_reference_sentiment !== undefined) {
      updates.doc_reference_sentiment = enrichmentFields.doc_reference_sentiment;
    }
    if (enrichmentFields.doc_certificate_type !== undefined) {
      updates.doc_certificate_type = enrichmentFields.doc_certificate_type;
    }

    if (Object.keys(updates).length > 0) {
      await sbUpsertUser({ email: user_email, ...updates });
    }

    await updateDocStatus(docId, 'completed');
  } catch (err: any) {
    console.error('[Analyze] Failed:', err?.message);
    await updateDocStatus(docId, 'failed', err?.message || 'Unknown error');
  }
}

app.post('/api/documents/analyze/:id', verifyAuth, async (req: any, res) => {
  // Re-analyze a document on demand
  const user_email = req.userEmail;
  const docId = req.params.id;
  let doc: any;
  if (IS_SUPABASE_MODE) {
    const { getDocumentById } = await import('./src/lib/supabase-server');
    doc = await getDocumentById(docId);
  } else {
    doc = getDb().documents.find((d: any) => d.id === docId);
  }
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (doc.user_email?.toLowerCase() !== user_email.toLowerCase()) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const user = IS_SUPABASE_MODE ? await sbGetUser(user_email) : getDb().users.find((u: any) => u.email.toLowerCase() === user_email.toLowerCase());
  const filePath = path.join(uploadsDir, doc.file_path || '');
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });
  const buffer = fs.readFileSync(filePath);
  const docFilename = doc.name || doc.file_path || 'document';
  const ext = path.extname(docFilename).toLowerCase();
  let mime = 'application/octet-stream';
  if (ext === '.pdf') mime = 'application/pdf';
  else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
  else if (ext === '.png') mime = 'image/png';
  const { analyzeDocument } = await import('./src/services/document-intelligence');
  const { result, extraction } = await analyzeDocument(buffer, doc.type, user_email, user?.plan || 'explorer', mime, docFilename);
  if (result) {
    const aiResult = JSON.stringify({ data: result, extraction });
    if (IS_SUPABASE_MODE) {
      const { updateDocumentAiResult } = await import('./src/lib/supabase-server');
      await updateDocumentAiResult(docId, aiResult);
    } else {
      const db = getDb();
      const d = db.documents.find((d: any) => d.id === docId);
      if (d) d.ai_extraction_result = aiResult;
      saveDb(db);
    }
  }
  res.json({ success: true, ai_extraction_result: result });
});

app.get('/api/documents/:id/download', verifyAuth, async (req: any, res) => {
  const id = req.params.id;

  if (IS_SUPABASE_MODE) {
    const doc = await sbGetDoc(id);
    if (!doc) return res.status(404).json({ error: "Document not found." });
    if (doc.user_email?.toLowerCase() !== req.userEmail) {
      return res.status(403).json({ error: "Access denied." });
    }
    if (!doc.storage_path) {
      return res.status(404).json({ error: "File not found in storage." });
    }
    const { data, error } = await supabaseAdmin!.storage
      .from('scholarship-docs')
      .download(doc.storage_path);
    if (error || !data) {
      return res.status(404).json({ error: "File not found in storage." });
    }
    const ext = path.extname(doc.name || 'file').toLowerCase();
    const ct = ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : 'image/jpeg';
    res.setHeader('Content-Type', ct);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.name}"`);
    res.send(Buffer.from(await data.arrayBuffer()));
    return;
  }

  const db = getDb();
  const doc = db.documents.find((d: any) => d.id === id);
  if (!doc) return res.status(404).json({ error: "Document not found." });
  if (doc.user_email?.toLowerCase() !== req.userEmail) {
    return res.status(403).json({ error: "Access denied." });
  }
  if (doc.file_path) {
    const filePath = path.join(uploadsDir, doc.file_path);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(doc.name || 'file').toLowerCase();
      const ct = ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : 'image/jpeg';
      res.setHeader('Content-Type', ct);
      res.setHeader('Content-Disposition', `attachment; filename="${doc.name}"`);
      res.sendFile(filePath);
      return;
    }
  }
  res.status(404).json({ error: "File not found." });
});

app.delete('/api/documents/:id', verifyAuth, async (req: any, res) => {
  const id = req.params.id;

  if (IS_SUPABASE_MODE) {
    const doc = await sbGetDoc(id);
    if (doc?.storage_path) {
      await supabaseAdmin!.storage
        .from('scholarship-docs')
        .remove([doc.storage_path]);
    }
    await sbDeleteDoc(id);
    return res.json({ success: true });
  }

  const db = getDb();
  const index = db.documents.findIndex((d: any) => d.id === id);
  if (index === -1) return res.status(404).json({ error: "Document not found." });

  const doc = db.documents[index];
  if (doc.user_email?.toLowerCase() !== req.userEmail) {
    return res.status(403).json({ error: "You can only delete your own documents." });
  }

  if (doc.file_path) {
    const filePath = path.join(uploadsDir, doc.file_path);
    try {
      fs.unlinkSync(filePath);
    } catch (err: any) {
      console.warn(`Warning: Physical file not found for document ${id}: ${filePath}`);
    }
  }

  db.documents.splice(index, 1);
  saveDb(db);
  res.json({ success: true });
});

// --------------- Contact Submissions ---------------

app.post('/api/contact', async (req: any, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  if (!email || !/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: 'Valid email is required' });
  if (!subject) return res.status(400).json({ error: 'Subject is required' });
  if (!message || message.trim().length < 20) return res.status(400).json({ error: 'Message must be at least 20 characters' });

  const db = getDb();
  const contactEntry = {
    id: 'cnt-' + Date.now(),
    name: name.trim(),
    email: email.trim(),
    subject,
    message: message.trim(),
    status: 'new',
    created_at: new Date().toISOString()
  };

  // Store in Supabase if available
  if (IS_SUPABASE_MODE && supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin.from('contact_submissions').insert(contactEntry);
      if (error) throw error;
    } catch (e: any) {
      console.error('[SUPABASE] contact_submissions insert error:', e.message);
    }
  }

  // Store locally
  const contactList = db.contact_submissions || [];
  contactList.push(contactEntry);
  db.contact_submissions = contactList;
  saveDb(db);

  // Send email notification (log if no email service configured)
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@zawadi.app';
  const emailService = process.env.EMAIL_SERVICE || '';
  if (emailService) {
    try {
      // Placeholder for actual email sending (e.g., SendGrid, Resend, etc.)
      console.log(`[CONTACT] Email notification sent to ${adminEmail} regarding ${subject} from ${email}`);
    } catch (e: any) {
      console.error('[CONTACT] Failed to send email notification:', e.message);
    }
  } else {
    console.log(`[CONTACT] New submission from ${name} <${email}> — Subject: ${subject}`);
    console.log(`[CONTACT] Message: ${message.substring(0, 100)}...`);
    console.log(`[CONTACT] Admin notification would be sent to ${adminEmail} (no EMAIL_SERVICE configured)`);
  }

  res.json({ success: true, id: contactEntry.id });
});

app.get('/api/contact', async (req: any, res) => {
  const db = getDb();
  const list = db.contact_submissions || [];
  res.json(list);
});

app.get('/api/essays', verifyAuth, async (req: any, res) => {
  const email = req.userEmail;
  if (IS_SUPABASE_MODE) {
    const list = await sbGetEssaysList(email);
    return res.json(list);
  }
  const db = getDb();
  const list = db.essays.filter((e: any) => e.user_email?.toLowerCase() === email.toLowerCase());
  res.json(list);
});

app.get('/api/essays/history', verifyAuth, async (req: any, res) => {
  const email = req.userEmail;
  if (IS_SUPABASE_MODE) {
    const list = await sbGetEssaysList(email);
    return res.json(list);
  }
  const db = getDb();
  const list = db.essays.filter((e: any) => e.user_email?.toLowerCase() === email.toLowerCase());
  res.json(list);
});

app.post('/api/essays/generate', verifyAuth, async (req: any, res) => {
  const user_email = req.userEmail;
  const db = getDb();
  const { essay_type, scholarship_name, prompt, stage, previous_content, notes, word_count, provider: reqProvider, document_ids } = req.body;

  const user = db.users.find((u: any) => u.email?.toLowerCase() === user_email?.toLowerCase());
  const todayStart = new Date().toISOString().split('T')[0];
  const genKey = `${user_email?.toLowerCase()}|${todayStart}`;
  const genEntry = dailyGenCounts.get(genKey) || 0;

  let limit = 3;
  if (user?.plan === 'plus') limit = 10;
  if (user?.plan === 'pro') limit = 25;
  if (user?.plan === 'institutional') limit = 9999;

  if (genEntry >= limit) {
    const planInfo: Record<string, { label: string; limit: number; upgrade: string }> = {
      explorer: { label: 'Explorer', limit: 3, upgrade: 'plus' },
      plus: { label: 'Scholar Plus', limit: 10, upgrade: 'pro' },
      pro: { label: 'Application Pro', limit: 25, upgrade: '' },
    };
    const p = user?.plan || 'explorer';
    const info = planInfo[p] || planInfo.explorer;
    const nextPlan = info.upgrade
      ? ` Upgrade to **${planInfo[info.upgrade]?.label || info.upgrade}** (${planInfo[info.upgrade]?.limit || 'more'} per day) for more generations.`
      : '';
    const friendlyName = p === 'explorer' ? 'the free plan' : `your current plan`;
    return res.status(430).json({
      error: `You've used all ${limit} essay generations available today on ${friendlyName}${nextPlan}`,
      daily_limit: limit,
      plan: p,
      upgrade_to: info.upgrade || null,
      upgrade_message: nextPlan ? `Upgrade to ${planInfo[info.upgrade]?.label} for ${planInfo[info.upgrade]?.limit} daily generations` : null,
    });
  }

  let generatedText = "";

  const userCountry = user?.country || 'your country';
  const userField = user?.field_of_study || 'your field';
  const userDegree = user?.degree_level || 'graduate';
  const userNotes = prompt || notes || '';
  const hasResearch = user?.has_research;
  const hasLeadership = user?.has_leadership;
  const workYrs = user?.work_experience_years;
  const userName = user?.name || 'the applicant';

  // Load document grounding context from specified document IDs
  let documentContext = '';
  if (document_ids && Array.isArray(document_ids) && document_ids.length > 0) {
    try {
      const docContexts: string[] = [];
      for (const docId of document_ids) {
        let doc: any = null;
        if (IS_SUPABASE_MODE) {
          doc = await sbGetDoc(docId);
        } else {
          doc = db.documents.find((d: any) => d.id === docId);
        }
        if (!doc || doc.user_email?.toLowerCase() !== user_email?.toLowerCase()) continue;
        if (doc.ai_extraction_result) {
          let parsed: any = null;
          try { parsed = typeof doc.ai_extraction_result === 'string' ? JSON.parse(doc.ai_extraction_result) : doc.ai_extraction_result; } catch {}
          const data = parsed?.data || parsed;
          if (data && typeof data === 'object') {
            const lines: string[] = [`--- From ${doc.name || docId} (${doc.type || 'document'}) ---`];
            for (const [k, v] of Object.entries(data)) {
              if (v !== null && v !== undefined && v !== '') {
                lines.push(`  ${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
              }
            }
            docContexts.push(lines.join('\n'));
          }
        }
      }
      if (docContexts.length > 0) {
        documentContext = '\nDocument-based evidence for your essay (use these facts, do not fabricate):\n' + docContexts.join('\n\n');
      }
    } catch (err: any) {
      console.error('[Essay] Document grounding error:', err.message);
    }
  }

  const { generateContent, hasAnyKey, getProviderConfig, setProviderConfig, getDefaultConfig } = await import('./src/services/ai-provider');

  if (reqProvider) {
    const cfg = getProviderConfig();
    setProviderConfig({ ...cfg, provider: reqProvider });
  }

  if (hasAnyKey()) {
    try {
      let systemInstruction = '';
      let userPrompt = '';

      if (stage === 'draft') {
        systemInstruction = `You are Zawadi, an expert scholarship essay coach helping African students write compelling statements of purpose.
You generate high-quality, personalized scholarship essays based on the student's background and the specific scholarship.
The student is from ${userCountry}, pursuing a ${userDegree} in ${userField}.
Use their provided notes to write an authentic, persuasive essay.
Write in first person from the student's perspective. Tone: confident, humble, mission-driven.
Ground all claims in the document-based evidence provided — never fabricate GPA, institutions, degrees, or other factual details.`;

        userPrompt = `Write a ${essay_type || 'Personal Statement'} essay for the "${scholarship_name}" scholarship.

Student background:
- Name: ${userName}
- Country: ${userCountry}
- Degree level: ${userDegree}
- Field of study: ${userField}
${hasResearch ? '- Has research experience' : ''}
${hasLeadership ? '- Has leadership experience' : ''}
${workYrs ? `- ${workYrs} years of work experience` : ''}
${documentContext}

Student's personal notes: ${userNotes || 'The student has strong academic credentials and a desire to return to Africa after studies.'}

Instructions: Write a complete, compelling essay of approximately ${word_count || 500} words.`;

      } else if (stage === 'critique') {
        const targetText = previous_content || prompt || '';
        userPrompt = `You are an expert scholarship essay reviewer. Analyze the following draft essay for the "${scholarship_name}" scholarship.
1) Strengths (2-3 specific points)
2) Areas for improvement (2-3 specific points with suggestions)
3) One rewritten opening paragraph

The student is from ${userCountry}, studying ${userField} at the ${userDegree} level.
${documentContext ? '\nNote: The student has uploaded documents containing these verified facts — check the essay for alignment:\n' + documentContext : ''}

DRAFT ESSAY: ${targetText}`;

      } else if (stage === 'polish') {
        const baseText = previous_content || prompt || '';
        userPrompt = `You are an expert academic editor. Polish the following essay for the "${scholarship_name}" scholarship.
Improve clarity, flow, grammar, and impact while preserving the student's authentic voice.
Fix grammatical errors. Strengthen weak verbs. Improve sentence variety.
Do not change the core meaning or add fictional details.

ESSAY TO POLISH: ${baseText}`;
      }

      const result = await generateContent({
        systemInstruction: systemInstruction || undefined,
        prompt: userPrompt,
        temperature: stage === 'draft' ? 0.8 : stage === 'polish' ? 0.3 : 0.5,
        maxOutputTokens: stage === 'critique' ? 1000 : 1500,
      });
      generatedText = result?.text || '';
    } catch (err: any) {
      console.error('AI generation failed:', err.message);
    }
  }

  // Fallback template
  if (!generatedText) {
    const sentences = (prompt || notes || '').split(/[.!?\n]+/).filter((s: string) => s.trim().length > 10);
    const userBackground = sentences.length > 0 ? sentences.slice(0, 2).join('. ') : 'your unique background';
    const userGoals = sentences.length > 1 ? sentences[sentences.length - 1] : 'your career goals';

    if (stage === 'draft') {
      generatedText = `Statement of Purpose — ${scholarship_name}

Growing up in ${userCountry}, I have always been driven by a desire to create meaningful change within my community and beyond. My journey in ${userField} began with a curiosity that has since matured into a focused commitment to addressing real-world challenges.

Background & Motivation: ${userBackground || `My academic journey in ${userField} has equipped me with a strong foundation to tackle complex problems.`}

Goals & Vision: ${userGoals || `My goal is to leverage training from this program to develop innovative solutions in ${userField} for communities across ${userCountry} and broader Africa.`}

Why This Scholarship: The ${scholarship_name} represents a unique opportunity to gain world-class training and bring that knowledge back to where it is needed most.

Sincerely, ${user?.name || 'Applicant'}`;
    } else if (stage === 'critique') {
      generatedText = `### Critique Analysis for ${scholarship_name}

**Strengths:** Personal narrative from ${userCountry} provides authentic perspective. Focus on ${userField} aligns well with scholarship goals.

**Areas for Improvement:** Consider adding more specific examples. Strengthen the connection between past experience and future goals.

**Next Steps:** Proceed to the Polish stage for final refinements.`;
    } else if (stage === 'polish') {
      const baseText = previous_content || prompt || '';
      generatedText = baseText.length > 50
        ? `Polished version:\n\n${baseText}`
        : `As a dedicated ${userDegree} candidate from ${userCountry} focused on ${userField}, my journey has been defined by a commitment to driving meaningful change.`;
    }
  }

  let savedId = "ess-" + Date.now();
  if (stage === 'draft' || stage === 'polish') {
    const existing = db.essays.find((e: any) =>
      e.user_email?.toLowerCase() === user_email?.toLowerCase() && e.scholarship_name === scholarship_name
    );
    const payload: any = {
      id: existing ? existing.id : savedId, user_email, scholarship_name: scholarship_name || "General Scholarship",
      essay_type: essay_type || "Personal Statement", prompt: prompt || "Write a personal essay", stage, created_at: todayStart,
    };
    if (stage === 'draft') {
      payload.draft = generatedText; payload.critique = existing?.critique || ''; payload.final = existing?.final || '';
    } else {
      payload.draft = existing?.draft || ''; payload.critique = existing?.critique || ''; payload.final = generatedText;
    }
    if (existing) {
      const idx = db.essays.findIndex((e: any) => e.id === existing.id);
      db.essays[idx] = payload;
      savedId = existing.id;
    } else {
      db.essays.push(payload);
    }
    saveDb(db);
  }

  // Trigger voice learning after polish (fire-and-forget)
  if (stage === 'polish' && generatedText.length > 100) {
    (async () => {
      try {
        const { analyzeWritingVoice, generateStyleSummary } = await import('./src/services/essay-voice-learner');
        if (db.users && user_email) {
          const allSamples = db.essays
            .filter((e: any) => e.user_email?.toLowerCase() === user_email?.toLowerCase())
            .map((e: any) => [e.draft, e.critique, e.final].filter(Boolean).join('\n'));
          const result = await analyzeWritingVoice(user_email, allSamples);
          if (result.profile) {
            const summary = generateStyleSummary(result.profile, allSamples.length);
            const userIdx = db.users.findIndex((u: any) => u.email?.toLowerCase() === user_email?.toLowerCase());
            if (userIdx !== -1) {
              db.users[userIdx].voice_profile = result.profile;
              db.users[userIdx].essay_style_notes = summary;
              db.users[userIdx].essays_written = (db.users[userIdx].essays_written || 0) + 1;
              db.users[userIdx].writing_samples = (db.users[userIdx].writing_samples || []).concat([generatedText.slice(0, 1000)]);
              saveDb(db);
            }
          }
        }
      } catch {}
    })();
  }

  dailyGenCounts.set(genKey, genEntry + 1);

  res.json({
    id: savedId, content: generatedText, stage,
    remaining_today: Math.max(0, limit - genEntry - 1),
    daily_limit: limit, plan: user?.plan || "explorer"
  });
});

// --------------- Essay Voice Profile ---------------

app.get('/api/essays/voice-profile', verifyAuth, async (req: any, res) => {
  const db = getDb();
  const email = req.userEmail?.toLowerCase();
  const local = db.users.find((u: any) => u.email?.toLowerCase() === email);
  const profile = {
    style_notes: local?.essay_style_notes || '',
    essays_analyzed: local?.essays_written || 0,
    voice_profile: local?.voice_profile || null,
    writing_samples: local?.writing_samples || [],
    user_email: email
  };
  if (IS_SUPABASE_MODE) {
    try {
      const { getEssaySoulProfile } = await import('./src/lib/supabase-server');
      const sbProfile = await getEssaySoulProfile(email);
      if (sbProfile) return res.json(sbProfile);
    } catch {}
  }
  res.json(profile);
});

app.post('/api/essays/voice-profile', verifyAuth, async (req: any, res) => {
  const db = getDb();
  const email = req.userEmail?.toLowerCase();
  const { style_notes, voice_profile, writing_samples } = req.body;
  const userIdx = db.users.findIndex((u: any) => u.email?.toLowerCase() === email);
  if (userIdx !== -1) {
    if (style_notes) db.users[userIdx].essay_style_notes = style_notes;
    if (voice_profile) db.users[userIdx].voice_profile = voice_profile;
    if (writing_samples) db.users[userIdx].writing_samples = writing_samples;
    db.users[userIdx].essays_written = (db.users[userIdx].essays_written || 0) + 1;
    db.users[userIdx].updated_at = new Date().toISOString();
    saveDb(db);
  }
  if (IS_SUPABASE_MODE) {
    try {
      const { upsertEssaySoulProfile } = await import('./src/lib/supabase-server');
      await upsertEssaySoulProfile({
        user_email: email,
        voice_profile: voice_profile || null,
        writing_samples: writing_samples || [],
        style_notes: style_notes || '',
        essays_analyzed: (db.users[userIdx]?.essays_written || 0),
        last_updated: new Date().toISOString()
      });
    } catch {}
  }
  res.json({ saved: true });
});

// --------------- Mentor Review System (v2 - Full Pipeline) ---------------

function getMentorEntitlement(plan: string) {
  return MENTOR_REVIEW_LIMITS[plan?.toLowerCase()] || MENTOR_REVIEW_LIMITS.explorer;
}

function countMonthlyReviews(db: any, email: string): number {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return (db.mentor_review_requests || []).filter((r: any) =>
    r.user_email?.toLowerCase() === email?.toLowerCase() &&
    r.status !== 'cancelled' &&
    new Date(r.requested_at) >= startOfMonth
  ).length;
}

// --------------- Student Endpoints ---------------

// POST /api/essays/request-mentor-review
app.post('/api/essays/request-mentor-review', verifyAuth, async (req: any, res) => {
  try {
    const db = getDb();
    const email = req.userEmail?.toLowerCase();
    const user = db.users.find((u: any) => u.email?.toLowerCase() === email);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const plan = user.plan || 'explorer';
    const entitlement = getMentorEntitlement(plan);

    let monthlyCount = 0;
    if (IS_SUPABASE_MODE) {
      try {
        const { getMonthlyMentorRequestCount } = await import('./src/lib/supabase-server');
        monthlyCount = await getMonthlyMentorRequestCount(email);
      } catch {}
    } else {
      monthlyCount = countMonthlyReviews(db, email);
    }

    if (entitlement.reviews_per_month !== null && monthlyCount >= entitlement.reviews_per_month) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      return res.status(403).json({
        error: `You have used all ${entitlement.reviews_per_month} mentor reviews for this month. Your next review slot opens on ${nextMonth.toISOString().split('T')[0]} or upgrade your plan for more reviews.`
      });
    }

    const { essay_id, essay_content, scholarship_name, scholarship_provider, scholarship_deadline, scholarship_host_region, student_notes } = req.body;
    if (!essay_id || !essay_content || !scholarship_name) {
      return res.status(400).json({ error: 'essay_id, essay_content, and scholarship_name are required' });
    }

    const responseDeadline = new Date(Date.now() + entitlement.response_days_guarantee * 24 * 60 * 60 * 1000);

    const payload = {
      request_reference: '',
      user_email: email,
      user_first_name: user.name?.split(' ')[0] || user.name || 'Student',
      user_country: user.country || 'Not specified',
      user_plan: plan,
      essay_id,
      essay_version: 1,
      essay_content,
      scholarship_name,
      scholarship_provider: scholarship_provider || null,
      scholarship_deadline: scholarship_deadline || null,
      scholarship_host_region: scholarship_host_region || null,
      student_notes: student_notes || null,
      status: 'pending',
      priority: entitlement.priority,
      response_deadline: responseDeadline,
      feedback_type: entitlement.feedback_type,
      includes_revised_sections: entitlement.includes_revised_sections,
      includes_strategy_session: entitlement.includes_strategy_session,
      requested_at: new Date().toISOString()
    };

    let saved: any;
    if (IS_SUPABASE_MODE) {
      const { insertMentorRequest } = await import('./src/lib/supabase-server');
      saved = await insertMentorRequest(payload);
    } else {
      const requests = db.mentor_review_requests || [];
      saved = { ...payload, id: 'mrr-l-' + Date.now(), request_reference: 'MRR-LOCAL-' + Date.now() };
      requests.push(saved);
      db.mentor_review_requests = requests;
      saveDb(db);
    }

    res.json({
      success: true,
      request: saved,
      remaining_this_month: entitlement.reviews_per_month !== null ? entitlement.reviews_per_month - monthlyCount - 1 : null,
      plan: PLAN_LABELS[plan] || plan,
      response_deadline: responseDeadline,
      feedback_type: entitlement.feedback_type,
    });

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@zawadi.app';
    if (IS_SUPABASE_MODE) {
      try {
        const { insertNotification } = await import('./src/lib/supabase-server');
        await insertNotification({
          user_email: adminEmail,
          message: `New mentor review request ${saved.request_reference} for ${scholarship_name}`,
          type: 'mentor_request',
          related_id: saved.id,
        });
      } catch {}
    }
  } catch (err: any) {
    console.error('Mentor request error:', err);
    res.status(500).json({ error: err.message || 'Failed to submit mentor review request' });
  }
});

// GET /api/essays/mentor-review-status/:essay_id
app.get('/api/essays/mentor-review-status/:essay_id', verifyAuth, async (req: any, res) => {
  try {
    const email = req.userEmail?.toLowerCase();
    const essayId = req.params.essay_id;
    const db = getDb();

    let requests: any[] = [];
    if (IS_SUPABASE_MODE) {
      const { getMentorRequestsForUser } = await import('./src/lib/supabase-server');
      const all = await getMentorRequestsForUser(email);
      requests = all.filter((r: any) => r.essay_id === essayId);
    } else {
      requests = (db.mentor_review_requests || []).filter((r: any) =>
        r.user_email?.toLowerCase() === email && r.essay_id === essayId
      );
    }

    const sanitized = requests.map((r: any) => ({
      id: r.id,
      request_reference: r.request_reference,
      status: r.status,
      priority: r.priority,
      response_deadline: r.response_deadline,
      assigned_mentor_name: r.status !== 'pending' ? r.assigned_mentor_name : null,
      feedback_type: r.feedback_type,
      feedback_overall_assessment: r.status === 'delivered_to_student' ? r.feedback_overall_assessment : null,
      feedback_opening: r.status === 'delivered_to_student' ? r.feedback_opening : null,
      feedback_narrative: r.status === 'delivered_to_student' ? r.feedback_narrative : null,
      feedback_evidence: r.status === 'delivered_to_student' ? r.feedback_evidence : null,
      feedback_cultural_authenticity: r.status === 'delivered_to_student' ? r.feedback_cultural_authenticity : null,
      feedback_closing: r.status === 'delivered_to_student' ? r.feedback_closing : null,
      feedback_general_advice: r.status === 'delivered_to_student' ? r.feedback_general_advice : null,
      revised_sections: r.status === 'delivered_to_student' ? r.revised_sections : null,
      mentor_confidence_score: r.status === 'delivered_to_student' ? r.mentor_confidence_score : null,
      estimated_success_probability: r.status === 'delivered_to_student' ? r.estimated_success_probability : null,
      student_notes: r.student_notes,
      requested_at: r.requested_at,
      delivered_at: r.delivered_at,
    }));

    res.json(sanitized);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------- Admin Endpoints ---------------

// GET /api/admin/mentor-queue
app.get('/api/admin/mentor-queue', verifySuperAdmin, async (req: any, res) => {
  try {
    const db = getDb();
    let requests: any[] = [];

    if (IS_SUPABASE_MODE) {
      const { getMentorRequests } = await import('./src/lib/supabase-server');
      requests = await getMentorRequests();
    } else {
      requests = db.mentor_review_requests || [];
    }

    if (req.query.status) requests = requests.filter((r: any) => r.status === req.query.status);
    if (req.query.priority) requests = requests.filter((r: any) => r.priority === req.query.priority);
    if (req.query.assigned_mentor_email) requests = requests.filter((r: any) => r.assigned_mentor_email === req.query.assigned_mentor_email);

    requests.sort((a: any, b: any) => new Date(a.response_deadline).getTime() - new Date(b.response_deadline).getTime());

    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/mentor-queue/:id/assign
app.patch('/api/admin/mentor-queue/:id/assign', verifySuperAdmin, async (req: any, res) => {
  try {
    const { mentor_email } = req.body;
    if (!mentor_email) return res.status(400).json({ error: 'mentor_email is required' });

    const db = getDb();

    let mentorProfile: any = null;
    if (IS_SUPABASE_MODE) {
      const { getMentorProfile } = await import('./src/lib/supabase-server');
      mentorProfile = await getMentorProfile(mentor_email);
    } else {
      mentorProfile = (db.mentor_profiles || []).find((m: any) => m.mentor_email === mentor_email);
    }

    if (!mentorProfile || !mentorProfile.is_active) {
      return res.status(400).json({ error: 'Mentor not found or inactive' });
    }

    let activeCount = 0;
    if (IS_SUPABASE_MODE) {
      const { getMentorRequests } = await import('./src/lib/supabase-server');
      const active = await getMentorRequests('assigned', mentor_email);
      const reviewing = await getMentorRequests('under_review', mentor_email);
      activeCount = (active?.length || 0) + (reviewing?.length || 0);
    } else {
      activeCount = (db.mentor_review_requests || []).filter((r: any) =>
        r.assigned_mentor_email === mentor_email &&
        (r.status === 'assigned' || r.status === 'under_review')
      ).length;
    }

    if (activeCount >= (mentorProfile.max_concurrent_reviews || 3)) {
      return res.status(400).json({ error: `Mentor has reached their maximum of ${mentorProfile.max_concurrent_reviews} concurrent reviews` });
    }

    const now = new Date().toISOString();
    const updates = {
      status: 'assigned',
      assigned_mentor_email: mentor_email,
      assigned_mentor_name: mentorProfile.display_name,
      assigned_at: now,
    };

    let updated: any;
    if (IS_SUPABASE_MODE) {
      const { updateMentorRequest } = await import('./src/lib/supabase-server');
      updated = await updateMentorRequest(req.params.id, updates);
    } else {
      const idx = (db.mentor_review_requests || []).findIndex((r: any) => r.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Request not found' });
      db.mentor_review_requests[idx] = { ...db.mentor_review_requests[idx], ...updates };
      saveDb(db);
      updated = db.mentor_review_requests[idx];
    }

    if (IS_SUPABASE_MODE) {
      try {
        const { insertNotification } = await import('./src/lib/supabase-server');
        await insertNotification({
          user_email: mentor_email,
          message: `You have been assigned a new mentor review: ${updated.request_reference} for ${updated.scholarship_name}`,
          type: 'new_assignment',
          related_id: updated.id,
        });
      } catch {}
    }

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/mentor-queue/:id/approve
app.patch('/api/admin/mentor-queue/:id/approve', verifySuperAdmin, async (req: any, res) => {
  try {
    const { admin_approval_notes } = req.body;
    const db = getDb();
    const now = new Date().toISOString();

    let request: any;
    if (IS_SUPABASE_MODE) {
      const { getMentorRequestById, updateMentorRequest } = await import('./src/lib/supabase-server');
      request = await getMentorRequestById(req.params.id);
      if (!request) return res.status(404).json({ error: 'Request not found' });
      if (request.status !== 'submitted_by_mentor') return res.status(400).json({ error: `Cannot approve request in ${request.status} status` });

      const { getProfile } = await import('./src/lib/supabase-server');
      const profile = await getProfile(request.user_email);
      if (!profile) return res.status(400).json({ error: 'User profile not found' });

      const { getEssays } = await import('./src/lib/supabase-server');
      const userEssays = await getEssays(request.user_email);
      if (!userEssays?.some((e: any) => e.id === request.essay_id)) {
        return res.status(400).json({ error: 'Essay does not belong to this user' });
      }

      request = await updateMentorRequest(req.params.id, {
        status: 'approved_by_admin',
        admin_approved_by: req.adminEmail,
        admin_approved_at: now,
        admin_approval_notes: admin_approval_notes || null,
      });

      request = await updateMentorRequest(req.params.id, {
        status: 'delivered_to_student',
        delivered_at: now,
      });

      const { insertNotification } = await import('./src/lib/supabase-server');
      await insertNotification({
        user_email: request.user_email,
        message: `Your mentor review ${request.request_reference} for ${request.scholarship_name} is ready!`,
        type: 'mentor_feedback_ready',
        related_id: request.id,
      });

      const { insertAuditLog } = await import('./src/lib/supabase-server');
      await insertAuditLog({
        id: 'audit-' + Date.now(),
        admin_email: req.adminEmail,
        action: 'mentor_feedback_approved',
        target_type: 'mentor_review_request',
        target_id: request.id,
        details: `Approved feedback for ${request.user_email} on essay ${request.essay_id} (${request.request_reference})`,
        created_at: now,
      });
    } else {
      const idx = (db.mentor_review_requests || []).findIndex((r: any) => r.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Request not found' });
      request = db.mentor_review_requests[idx];
      if (request.status !== 'submitted_by_mentor') return res.status(400).json({ error: `Cannot approve request in ${request.status} status` });
      request.status = 'approved_by_admin';
      request.admin_approved_by = req.adminEmail;
      request.admin_approved_at = now;
      request.admin_approval_notes = admin_approval_notes || null;
      request.status = 'delivered_to_student';
      request.delivered_at = now;
      db.mentor_review_requests[idx] = request;
      saveDb(db);
    }

    res.json(request);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/mentor-queue/:id/reject
app.patch('/api/admin/mentor-queue/:id/reject', verifySuperAdmin, async (req: any, res) => {
  try {
    const { rejection_reason } = req.body;
    if (!rejection_reason) return res.status(400).json({ error: 'Rejection reason is required' });

    let request: any;
    if (IS_SUPABASE_MODE) {
      const { getMentorRequestById, updateMentorRequest } = await import('./src/lib/supabase-server');
      request = await getMentorRequestById(req.params.id);
      if (!request) return res.status(404).json({ error: 'Request not found' });
      if (request.status !== 'submitted_by_mentor') return res.status(400).json({ error: 'Request must be in submitted_by_mentor status' });

      request = await updateMentorRequest(req.params.id, {
        status: 'assigned',
        admin_approval_notes: rejection_reason,
        admin_rejection_reason: rejection_reason,
      });

      const { insertNotification } = await import('./src/lib/supabase-server');
      await insertNotification({
        user_email: request.assigned_mentor_email,
        message: `Your review for ${request.request_reference} was returned by admin: ${rejection_reason}`,
        type: 'mentor_revision_needed',
        related_id: request.id,
      });
    } else {
      const db = getDb();
      const idx = (db.mentor_review_requests || []).findIndex((r: any) => r.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Request not found' });
      request = db.mentor_review_requests[idx];
      if (request.status !== 'submitted_by_mentor') return res.status(400).json({ error: 'Request must be in submitted_by_mentor status' });
      request.status = 'assigned';
      request.admin_approval_notes = rejection_reason;
      request.admin_rejection_reason = rejection_reason;
      db.mentor_review_requests[idx] = request;
      saveDb(db);
    }

    res.json(request);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------- Mentor Endpoints ---------------

// GET /api/mentor/queue
app.get('/api/mentor/queue', verifyAuth, async (req: any, res) => {
  try {
    const db = getDb();
    let requests: any[] = [];

    if (IS_SUPABASE_MODE) {
      const { getMentorRequests } = await import('./src/lib/supabase-server');
      const assigned = await getMentorRequests('assigned', req.userEmail);
      const underReview = await getMentorRequests('under_review', req.userEmail);
      requests = [...(assigned || []), ...(underReview || [])];
    } else {
      requests = (db.mentor_review_requests || []).filter((r: any) =>
        r.assigned_mentor_email === req.userEmail &&
        (r.status === 'assigned' || r.status === 'under_review')
      );
    }

    const sanitized = requests.map((r: any) => ({
      id: r.id,
      request_reference: r.request_reference,
      user_first_name: r.user_first_name,
      user_country: r.user_country,
      user_plan: r.user_plan,
      essay_content: r.essay_content,
      scholarship_name: r.scholarship_name,
      scholarship_provider: r.scholarship_provider,
      scholarship_deadline: r.scholarship_deadline,
      scholarship_host_region: r.scholarship_host_region,
      student_notes: r.student_notes,
      feedback_type: r.feedback_type,
      includes_revised_sections: r.includes_revised_sections,
      response_deadline: r.response_deadline,
      assigned_at: r.assigned_at,
      status: r.status,
      admin_rejection_reason: r.admin_rejection_reason,
    }));

    res.json(sanitized);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/mentor/queue/:id/start
app.patch('/api/mentor/queue/:id/start', verifyAuth, async (req: any, res) => {
  try {
    let request: any;
    if (IS_SUPABASE_MODE) {
      const { getMentorRequestById, updateMentorRequest } = await import('./src/lib/supabase-server');
      request = await getMentorRequestById(req.params.id);
      if (!request) return res.status(404).json({ error: 'Request not found' });
      if (request.assigned_mentor_email !== req.userEmail) return res.status(403).json({ error: 'Not assigned to you' });
      if (request.status !== 'assigned') return res.status(400).json({ error: `Cannot start request in ${request.status} status` });
      request = await updateMentorRequest(req.params.id, { status: 'under_review', mentor_started_review_at: new Date().toISOString() });
    } else {
      const db = getDb();
      const idx = (db.mentor_review_requests || []).findIndex((r: any) => r.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Request not found' });
      request = db.mentor_review_requests[idx];
      if (request.assigned_mentor_email !== req.userEmail) return res.status(403).json({ error: 'Not assigned to you' });
      if (request.status !== 'assigned') return res.status(400).json({ error: `Cannot start request in ${request.status} status` });
      request.status = 'under_review';
      request.mentor_started_review_at = new Date().toISOString();
      db.mentor_review_requests[idx] = request;
      saveDb(db);
    }
    res.json(request);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/mentor/queue/:id/submit
app.patch('/api/mentor/queue/:id/submit', verifyAuth, async (req: any, res) => {
  try {
    let request: any;
    if (IS_SUPABASE_MODE) {
      const { getMentorRequestById } = await import('./src/lib/supabase-server');
      request = await getMentorRequestById(req.params.id);
    } else {
      const db = getDb();
      request = (db.mentor_review_requests || []).find((r: any) => r.id === req.params.id);
    }

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.assigned_mentor_email !== req.userEmail) return res.status(403).json({ error: 'Not assigned to you' });
    if (request.status !== 'under_review') return res.status(400).json({ error: `Cannot submit request in ${request.status} status` });

    const feedbackType = request.feedback_type || 'basic';
    const { feedback_overall_assessment, feedback_opening, feedback_narrative, feedback_evidence, feedback_cultural_authenticity, feedback_closing, feedback_general_advice, revised_sections, mentor_confidence_score, estimated_success_probability, mentor_private_notes } = req.body;

    const missing: string[] = [];
    if (!feedback_overall_assessment) missing.push('feedback_overall_assessment');
    if (!feedback_general_advice || feedback_general_advice.trim().length < 100) missing.push('feedback_general_advice (min 100 characters)');
    if (feedbackType !== 'basic') {
      if (!feedback_opening || feedback_opening.trim().length < 30) missing.push('feedback_opening (min 30 characters)');
      if (!feedback_narrative || feedback_narrative.trim().length < 30) missing.push('feedback_narrative (min 30 characters)');
      if (!feedback_evidence || feedback_evidence.trim().length < 30) missing.push('feedback_evidence (min 30 characters)');
      if (!feedback_cultural_authenticity || feedback_cultural_authenticity.trim().length < 30) missing.push('feedback_cultural_authenticity (min 30 characters)');
      if (!feedback_closing || feedback_closing.trim().length < 30) missing.push('feedback_closing (min 30 characters)');
    }
    if (feedbackType === 'full' || feedbackType === 'full_plus') {
      if (!mentor_confidence_score) missing.push('mentor_confidence_score');
    }
    if (feedbackType === 'full_plus') {
      if (!estimated_success_probability) missing.push('estimated_success_probability');
    }
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    const updates: any = {
      status: 'submitted_by_mentor',
      mentor_submitted_at: new Date().toISOString(),
      feedback_overall_assessment,
      feedback_opening: feedback_opening || null,
      feedback_narrative: feedback_narrative || null,
      feedback_evidence: feedback_evidence || null,
      feedback_cultural_authenticity: feedback_cultural_authenticity || null,
      feedback_closing: feedback_closing || null,
      feedback_general_advice,
      revised_sections: revised_sections || null,
      mentor_confidence_score: mentor_confidence_score || null,
      estimated_success_probability: estimated_success_probability || null,
      mentor_private_notes: mentor_private_notes || null,
    };

    if (IS_SUPABASE_MODE) {
      const { updateMentorRequest } = await import('./src/lib/supabase-server');
      request = await updateMentorRequest(req.params.id, updates);
    } else {
      const db = getDb();
      const idx = (db.mentor_review_requests || []).findIndex((r: any) => r.id === req.params.id);
      db.mentor_review_requests[idx] = { ...db.mentor_review_requests[idx], ...updates };
      saveDb(db);
      request = db.mentor_review_requests[idx];
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@zawadi.app';
    if (IS_SUPABASE_MODE) {
      try {
        const { insertNotification } = await import('./src/lib/supabase-server');
        await insertNotification({
          user_email: adminEmail,
          message: `Mentor review ${request.request_reference} is ready for admin approval`,
          type: 'mentor_submitted',
          related_id: request.id,
        });
      } catch {}
    }

    res.json(request);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------- Mentor Feedback Ratings ---------------

app.post('/api/mentor/feedback-rating/:request_id', verifyAuth, async (req: any, res) => {
  try {
    const { request_id } = req.params;
    const email = req.userEmail?.toLowerCase();
    const db = getDb();

    let request: any;
    if (IS_SUPABASE_MODE) {
      const { getMentorRequestById } = await import('./src/lib/supabase-server');
      request = await getMentorRequestById(request_id);
    } else {
      request = (db.mentor_review_requests || []).find((r: any) => r.id === request_id);
    }

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.user_email !== email) return res.status(403).json({ error: 'Not your request' });
    if (request.status !== 'delivered_to_student') return res.status(400).json({ error: 'Feedback not yet delivered' });

    const { helpfulness_rating, accuracy_rating, clarity_rating, would_recommend, student_comment } = req.body;
    if (!helpfulness_rating || !accuracy_rating || !clarity_rating) {
      return res.status(400).json({ error: 'helpfulness_rating, accuracy_rating, and clarity_rating are required' });
    }

    const ratingPayload: any = {
      request_id,
      rated_by_email: email,
      helpfulness_rating,
      accuracy_rating,
      clarity_rating,
      would_recommend: would_recommend || false,
      student_comment: student_comment || null,
    };

    if (IS_SUPABASE_MODE) {
      const { insertMentorRating, getMentorProfile, upsertMentorProfile } = await import('./src/lib/supabase-server');
      await insertMentorRating(ratingPayload);
      if (request.assigned_mentor_email) {
        const mentorProfile = await getMentorProfile(request.assigned_mentor_email);
        if (mentorProfile) {
          const avg = (helpfulness_rating + accuracy_rating + clarity_rating) / 3;
          const currentTotal = (mentorProfile.average_mentor_score || 0) * (mentorProfile.total_reviews_completed || 0);
          const newCount = (mentorProfile.total_reviews_completed || 0) + 1;
          const newAvg = (currentTotal + avg) / newCount;
          await upsertMentorProfile({
            mentor_email: request.assigned_mentor_email,
            total_reviews_completed: newCount,
            average_mentor_score: Math.round(newAvg * 100) / 100,
          });
        }
      }
    } else {
      const ratings = db.mentor_feedback_ratings || [];
      ratingPayload.id = 'mfr-' + Date.now();
      ratings.push(ratingPayload);
      db.mentor_feedback_ratings = ratings;
      saveDb(db);
    }

    res.json({ success: true, rating: ratingPayload });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------- Mentor Profiles (Admin) ---------------

app.get('/api/admin/mentor-profiles', verifySuperAdmin, async (req: any, res) => {
  try {
    if (IS_SUPABASE_MODE) {
      const { getMentorProfiles } = await import('./src/lib/supabase-server');
      const profiles = await getMentorProfiles();
      return res.json(profiles);
    }
    const db = getDb();
    res.json(db.mentor_profiles || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/mentor-profiles', verifySuperAdmin, async (req: any, res) => {
  try {
    const { display_name, bio, specializations, max_concurrent_reviews } = req.body;
    if (!display_name) return res.status(400).json({ error: 'display_name is required' });

    const adminEmail = req.adminEmail;
    const profile = {
      mentor_email: adminEmail,
      display_name,
      bio: bio || '',
      specializations: specializations || [],
      max_concurrent_reviews: max_concurrent_reviews || 3,
    };

    if (IS_SUPABASE_MODE) {
      const { upsertMentorProfile } = await import('./src/lib/supabase-server');
      const saved = await upsertMentorProfile(profile);
      return res.json(saved);
    }
    const db = getDb();
    const profiles = db.mentor_profiles || [];
    const existing = profiles.findIndex((p: any) => p.mentor_email === adminEmail);
    if (existing !== -1) profiles[existing] = { ...profiles[existing], ...profile };
    else profiles.push(profile);
    db.mentor_profiles = profiles;
    saveDb(db);
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --------------- Notifications ---------------

app.get('/api/notifications', verifyAuth, async (req: any, res) => {
  try {
    const email = req.userEmail?.toLowerCase();
    const unreadOnly = req.query.unread === 'true';

    if (IS_SUPABASE_MODE) {
      const { getNotifications } = await import('./src/lib/supabase-server');
      const list = await getNotifications(email, unreadOnly);
      return res.json(list);
    }
    const db = getDb();
    let list = db.notifications || [];
    list = list.filter((n: any) => n.user_email === email);
    if (unreadOnly) list = list.filter((n: any) => !n.is_read);
    list.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/notifications/:id/read', verifyAuth, async (req: any, res) => {
  try {
    if (IS_SUPABASE_MODE) {
      const { markNotificationRead } = await import('./src/lib/supabase-server');
      await markNotificationRead(req.params.id);
      return res.json({ success: true });
    }
    const db = getDb();
    const idx = (db.notifications || []).findIndex((n: any) => n.id === req.params.id);
    if (idx !== -1) {
      db.notifications[idx].is_read = true;
      saveDb(db);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const PLAN_CATALOG: Record<string, {
  name: string;
  monthly: { amount: number; planCode: string };
  annual: { amount: number; planCode: string };
}> = {
  plus: {
    name: 'Scholar Plus',
    monthly: { amount: 650, planCode: 'PLN_unw5dchqqxx8h81' },
    annual: { amount: 6500, planCode: 'PLN_7lbcd0qe0atza2a' }
  },
  pro: {
    name: 'Application Pro',
    monthly: { amount: 1560, planCode: 'PLN_02f9ve9p86cpx44' },
    annual: { amount: 15600, planCode: 'PLN_r7qx092mwmn5bfz' }
  }
};
const PAYMENT_STATUSES = new Set(['pending', 'success', 'failed', 'abandoned']);

type BillingPeriod = 'monthly' | 'annual';

// ─── Shared payment helpers ─────────────────────────────────────

function normalizeBillingPeriod(value: any): BillingPeriod {
  return value === 'annual' ? 'annual' : 'monthly';
}

function normalizePaystackMetadata(metadata: any): Record<string, any> {
  if (!metadata) return {};
  if (typeof metadata === 'string') {
    try { return JSON.parse(metadata); } catch { return {}; }
  }
  return metadata;
}

function resolvePlanFromCode(planCode: string): { planName: string; billingPeriod: BillingPeriod; amount: number; planCode: string } | null {
  for (const [planName, plan] of Object.entries(PLAN_CATALOG)) {
    for (const period of ['monthly', 'annual'] as BillingPeriod[]) {
      if (plan[period].planCode === planCode) {
        return { planName, billingPeriod: period, amount: plan[period].amount, planCode };
      }
    }
  }
  return null;
}

function resolvePaymentIntent(planName: string, billingPeriodInput: any, planCodeInput?: string) {
  const normalizedPlan = String(planName || '').toLowerCase();
  const billingPeriod = normalizeBillingPeriod(billingPeriodInput);
  const catalogPlan = PLAN_CATALOG[normalizedPlan];
  if (!catalogPlan) {
    return { error: 'Invalid paid plan selected.' };
  }

  const trusted = catalogPlan[billingPeriod];
  if (planCodeInput && planCodeInput !== trusted.planCode) {
    return { error: 'Plan code does not match the selected plan and billing period.' };
  }

  return {
    planName: normalizedPlan,
    planLabel: catalogPlan.name,
    billingPeriod,
    planCode: trusted.planCode,
    amount: trusted.amount,
    currency: 'KES'
  };
}

async function verifyPlanUpgrade(user_email: string, plan_name: string, options: { allowSamePlan?: boolean } = {}): Promise<string | null> {
  if (!PLAN_CATALOG[plan_name]) return 'Invalid paid plan selected.';
  const user = IS_SUPABASE_MODE ? await sbGetUser(user_email) : getDb().users.find((u: any) => u.email.toLowerCase() === user_email.toLowerCase());
  if (!user) return 'User not found.';
  const currentPlan = user.plan || 'explorer';
  const targetRank = PLAN_HIERARCHY[plan_name] ?? -1;
  const currentRank = PLAN_HIERARCHY[currentPlan] ?? 0;
  if (targetRank < currentRank) {
    return 'Plan downgrades are not permitted via this endpoint.';
  }
  if (!options.allowSamePlan && targetRank === currentRank) {
    return `You are already subscribed to the ${PLAN_CATALOG[plan_name].name} tier.`;
  }
  return null;
}

function getLocalPaymentByReference(reference: string) {
  const db = getDb();
  return (db.payments || []).find((p: any) => p.paystack_reference === reference) || null;
}

async function getStoredPayment(reference: string) {
  const local = getLocalPaymentByReference(reference);
  if (local) return local;
  return IS_SUPABASE_MODE ? await sbGetPayByReference(reference) : null;
}

async function persistPaymentRecord(payment: any) {
  const now = new Date().toISOString();
  const record = {
    ...payment,
    id: payment.id || `pay-${String(payment.paystack_reference || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '').slice(-42)}`,
    status: PAYMENT_STATUSES.has(payment.status) ? payment.status : 'pending',
    currency: payment.currency || 'KES',
    created_at: payment.created_at || now,
    updated_at: now
  };

  const db = getDb();
  db.payments = db.payments || [];
  const existingIndex = db.payments.findIndex((p: any) => p.paystack_reference === record.paystack_reference);
  if (existingIndex >= 0) db.payments[existingIndex] = { ...db.payments[existingIndex], ...record };
  else db.payments.push(record);
  saveDb(db);

  await sbUpsertPayRecord(record);
  return record;
}

async function updatePaymentRecord(reference: string, updates: any) {
  const existing = await getStoredPayment(reference);
  const record = await persistPaymentRecord({
    ...(existing || { paystack_reference: reference }),
    ...updates,
    paystack_reference: reference
  });
  await sbUpdatePayByReference(reference, updates);
  return record;
}

async function completeSuccessfulPayment(payment: any, eventId = '') {
  const reference = payment.paystack_reference;
  if (!reference) return null;

  const existing = await getStoredPayment(reference);
  if (existing?.status === 'success') {
    const user = IS_SUPABASE_MODE ? await sbGetUser(existing.user_email) : getDb().users.find((u: any) => u.email?.toLowerCase() === existing.user_email?.toLowerCase());
    return stripSensitive(user);
  }

  const upgradeError = await verifyPlanUpgrade(payment.user_email, payment.plan, { allowSamePlan: true });
  if (upgradeError) {
    await updatePaymentRecord(reference, { status: 'failed', failure_reason: upgradeError, webhook_event_id: eventId || existing?.webhook_event_id || '' });
    return null;
  }

  const now = new Date().toISOString();
  await persistPaymentRecord({
    ...(existing || {}),
    ...payment,
    status: 'success',
    paid_at: payment.paid_at || now,
    webhook_event_id: eventId || payment.webhook_event_id || existing?.webhook_event_id || ''
  });

  if (IS_SUPABASE_MODE) {
    await sbUpsertUser({ email: payment.user_email, plan: payment.plan });
    await sbInsertAudit({
      id: "audit-" + Date.now(), admin_email: "billing@zawadi.app",
      action: "user_plan_updated", target_type: "user", target_id: payment.user_email,
      details: `Activated ${payment.plan} plan for ${payment.user_email} after verified Paystack payment (ref: ${reference})`,
      ip_address: "127.0.0.1", created_at: now
    });
    const user = await sbGetUser(payment.user_email);
    return stripSensitive({ ...user, plan: payment.plan });
  }

  const db = getDb();
  const userIndex = db.users.findIndex((u: any) => u.email.toLowerCase() === payment.user_email.toLowerCase());
  if (userIndex === -1) return null;
  db.users[userIndex].plan = payment.plan;
  db.users[userIndex].updated_at = now;
  db.audit_logs = db.audit_logs || [];
  db.audit_logs.push({
    id: "audit-" + Date.now(), admin_email: "billing@zawadi.app",
    action: "user_plan_updated", target_type: "user", target_id: payment.user_email,
    details: `Activated ${payment.plan} plan for ${payment.user_email} after verified Paystack payment (ref: ${reference})`,
    ip_address: "127.0.0.1", created_at: now
  });
  saveDb(db);
  return stripSensitive(db.users[userIndex]);
}

async function markPaymentTerminal(reference: string, status: 'failed' | 'abandoned', reason: string, eventId = '') {
  const existing = await getStoredPayment(reference);
  if (existing?.status === 'success') return existing;
  return await updatePaymentRecord(reference, {
    status,
    failure_reason: reason,
    webhook_event_id: eventId || existing?.webhook_event_id || '',
    paid_at: existing?.paid_at || ''
  });
}

function verifyPaystackWebhookSignature(req: any) {
  if (!PAYSTACK_SECRET_KEY) return true;
  const signature = String(req.headers['x-paystack-signature'] || '');
  if (!signature || !req.rawBody) return false;
  const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY).update(req.rawBody).digest('hex');
  if (hash.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

// ─── PAYMENT ENDPOINTS ───────────────────────────────────────────
// Full Paystack lifecycle:
//   1. Initialize server-trusted payment intent and persist pending record
//   2. Paystack processes payment in hosted checkout
//   3. Verify transaction with Paystack before activation
//   4. Activate user plan and store successful payment
//   5. Webhooks idempotently handle success, failed, and delayed events
//   6. Frontend can mark closed checkouts as abandoned

app.post('/api/payments/initialize', verifyAuth, async (req: any, res) => {
  const user_email = req.userEmail;
  const intent: any = resolvePaymentIntent(req.body.plan_name, req.body.billing_period, req.body.plan_code);
  if (intent.error) return res.status(400).json({ error: intent.error });
  const paymentMethod = req.body.payment_method === 'mobile_money' ? 'mobile_money' : 'card';
  const phoneNumber = typeof req.body.phone_number === 'string' ? req.body.phone_number.replace(/[^\d+]/g, '').slice(0, 20) : '';

  const upgradeError = await verifyPlanUpgrade(user_email, intent.planName);
  if (upgradeError) return res.status(403).json({ error: upgradeError });

  if (PAYSTACK_SECRET_KEY) {
    try {
      const paystackPayload: any = {
        email: user_email,
        amount: Math.round(intent.amount * 100),
        currency: intent.currency,
        plan: intent.planCode,
        callback_url: process.env.PAYSTACK_CALLBACK_URL || undefined,
        metadata: {
          user_email,
          plan_name: intent.planName,
          billing_period: intent.billingPeriod,
          payment_method: paymentMethod,
          phone_number: paymentMethod === 'mobile_money' ? phoneNumber : undefined,
          trusted_amount: intent.amount,
          currency: intent.currency
        }
      };

      if (paymentMethod === 'mobile_money' && phoneNumber) {
        paystackPayload.channels = ['mobile_money', 'ussd'];
        paystackPayload.mobile_money = {
          phone: phoneNumber,
          provider: 'mpesa'
        };
      }

      const initRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paystackPayload)
      });
      const initData: any = await initRes.json();
      if (!initData.status) {
        return res.status(502).json({ error: `Paystack init failed: ${initData.message}` });
      }

      await persistPaymentRecord({
        user_email,
        paystack_reference: initData.data.reference,
        paystack_subscription_code: intent.planCode,
        amount: intent.amount,
        currency: intent.currency,
        plan: intent.planName,
        billing_period: intent.billingPeriod,
        status: 'pending',
        authorization_url: initData.data.authorization_url || ''
      });

      return res.json({
        access_code: initData.data.access_code,
        reference: initData.data.reference,
        authorization_url: initData.data.authorization_url,
        amount: intent.amount,
        currency: intent.currency,
        plan_name: intent.planName,
        billing_period: intent.billingPeriod
      });
    } catch (e: any) {
      console.error('[PAYMENT] Paystack init error:', e);
      return res.status(502).json({ error: 'Failed to initialize payment with Paystack.' });
    }
  }

  const sandboxRef = `sandbox_${Date.now()}`;
  await persistPaymentRecord({
    user_email,
    paystack_reference: sandboxRef,
    paystack_subscription_code: intent.planCode,
    amount: intent.amount,
    currency: intent.currency,
    plan: intent.planName,
    billing_period: intent.billingPeriod,
    status: 'pending'
  });
  return res.json({
    access_code: sandboxRef,
    reference: sandboxRef,
    authorization_url: null,
    amount: intent.amount,
    currency: intent.currency,
    plan_name: intent.planName,
    billing_period: intent.billingPeriod
  });
});

app.post('/api/payments/verify', verifyAuth, async (req: any, res) => {
  const user_email = req.userEmail;
  const { user_email: body_email, reference } = req.body;

  if (body_email && body_email.toLowerCase() !== user_email.toLowerCase()) {
    return res.status(403).json({ error: "You can only verify your own payment." });
  }
  if (!reference) return res.status(400).json({ error: "Payment reference is required." });

  let payment = await getStoredPayment(reference);
  if (payment?.user_email && payment.user_email.toLowerCase() !== user_email.toLowerCase()) {
    return res.status(403).json({ error: "This payment reference belongs to another account." });
  }
  if (payment?.status === 'success') {
    const user = IS_SUPABASE_MODE ? await sbGetUser(user_email) : getDb().users.find((u: any) => u.email.toLowerCase() === user_email.toLowerCase());
    return res.json({ success: true, user: stripSensitive(user), idempotent: true });
  }

  if (!payment) {
    const fallbackIntent: any = resolvePaymentIntent(req.body.plan_name, req.body.billing_period, req.body.plan_code);
    if (fallbackIntent.error) return res.status(400).json({ error: fallbackIntent.error });
    payment = await persistPaymentRecord({
      user_email,
      paystack_reference: reference,
      paystack_subscription_code: fallbackIntent.planCode,
      amount: fallbackIntent.amount,
      currency: fallbackIntent.currency,
      plan: fallbackIntent.planName,
      billing_period: fallbackIntent.billingPeriod,
      status: 'pending'
    });
  }

  let paystackData: any = null;
  if (PAYSTACK_SECRET_KEY) {
    try {
      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}` }
      });
      const verifyData: any = await verifyRes.json();
      paystackData = verifyData.data || null;
      if (!verifyData.status || !paystackData) {
        await markPaymentTerminal(reference, 'failed', verifyData.message || 'Paystack verification failed.');
        return res.status(402).json({ error: "Payment could not be verified with Paystack." });
      }
    } catch (e) {
      console.error('[PAYMENT] Paystack verify error:', e);
      return res.status(502).json({ error: "Could not reach Paystack verification service." });
    }

    const paidStatus = paystackData.status;
    if (paidStatus !== 'success') {
      const terminalStatus = paidStatus === 'abandoned' ? 'abandoned' : 'failed';
      await markPaymentTerminal(reference, terminalStatus, `Paystack transaction status: ${paidStatus || 'unknown'}`);
      return res.status(402).json({ error: `Payment is not successful yet. Current Paystack status: ${paidStatus || 'unknown'}.` });
    }

    const metadata = normalizePaystackMetadata(paystackData.metadata);
    const planFromCode = resolvePlanFromCode(paystackData.plan?.plan_code || payment.paystack_subscription_code || '');
    const planName = payment.plan || metadata.plan_name || planFromCode?.planName;
    const billingPeriod = payment.billing_period || metadata.billing_period || planFromCode?.billingPeriod || 'monthly';
    const intent: any = resolvePaymentIntent(planName, billingPeriod, payment.paystack_subscription_code || planFromCode?.planCode);
    if (intent.error) return res.status(400).json({ error: intent.error });

    const paidAmount = Math.round((paystackData.amount || 0) / 100);
    const paidCurrency = paystackData.currency || 'KES';
    const customerEmail = paystackData.customer?.email || metadata.user_email || user_email;
    if (customerEmail.toLowerCase() !== user_email.toLowerCase()) {
      await markPaymentTerminal(reference, 'failed', 'Paystack customer email does not match authenticated user.');
      return res.status(403).json({ error: "Verified payment belongs to another Paystack customer." });
    }
    if (paidAmount !== intent.amount || paidCurrency !== intent.currency) {
      await markPaymentTerminal(reference, 'failed', `Payment amount/currency mismatch. Expected ${intent.amount} ${intent.currency}, got ${paidAmount} ${paidCurrency}.`);
      return res.status(402).json({ error: "Verified payment amount does not match the selected plan." });
    }

    payment = {
      ...payment,
      user_email,
      paystack_reference: reference,
      paystack_subscription_code: intent.planCode,
      amount: intent.amount,
      currency: intent.currency,
      plan: intent.planName,
      billing_period: intent.billingPeriod,
      paid_at: paystackData.paid_at || new Date().toISOString()
    };
  } else if (!String(reference).startsWith('sandbox_')) {
    await markPaymentTerminal(reference, 'failed', "Sandbox verification requires a sandbox_ reference.");
    return res.status(402).json({ error: "Payment could not be verified. If testing locally, ensure your reference starts with 'sandbox_'." });
  }

  const updatedUser = await completeSuccessfulPayment(payment);
  if (!updatedUser) return res.status(404).json({ error: "User not found or plan could not be activated." });
  res.json({ success: true, user: updatedUser });
});

app.post('/api/payments/abandon', verifyAuth, async (req: any, res) => {
  const user_email = req.userEmail;
  const { reference } = req.body;
  if (!reference) return res.status(400).json({ error: "Payment reference is required." });
  const payment = await getStoredPayment(reference);
  if (!payment) return res.status(404).json({ error: "Payment reference not found." });
  if (payment.user_email?.toLowerCase() !== user_email.toLowerCase()) {
    return res.status(403).json({ error: "This payment reference belongs to another account." });
  }
  if (payment.status === 'success') return res.json({ success: true, status: 'success' });
  const updated = await markPaymentTerminal(reference, 'abandoned', 'Checkout was closed before payment authorization.');
  res.json({ success: true, status: updated.status });
});

app.post('/api/payments/webhook', async (req: any, res) => {
  if (!verifyPaystackWebhookSignature(req)) return res.sendStatus(401);

  const event = req.body?.event;
  const data = req.body?.data;
  if (!event || !data) return res.status(400).json({ error: 'Invalid webhook payload' });

  const metadata = normalizePaystackMetadata(data.metadata);
  const reference = data.reference || metadata.reference || '';
  const eventId = String(data.id || data.event_id || `${event}:${reference}:${data.paid_at || data.created_at || ''}`);

  try {
    if (event === 'charge.success' && data.status === 'success') {
      const planFromCode = resolvePlanFromCode(data.plan?.plan_code || data.plan_code || '');
      const planName = (metadata.plan_name || planFromCode?.planName || '').toLowerCase();
      const billingPeriod = metadata.billing_period || planFromCode?.billingPeriod || 'monthly';
      const intent: any = resolvePaymentIntent(planName, billingPeriod, data.plan?.plan_code || planFromCode?.planCode);
      if (intent.error || !reference) return res.sendStatus(200);

      const email = (metadata.user_email || data.customer?.email || '').toLowerCase();
      if (!email) return res.sendStatus(200);

      const paidAmount = Math.round((data.amount || 0) / 100);
      const paidCurrency = data.currency || 'KES';
      if (paidAmount !== intent.amount || paidCurrency !== intent.currency) {
        await markPaymentTerminal(reference, 'failed', `Webhook amount/currency mismatch. Expected ${intent.amount} ${intent.currency}, got ${paidAmount} ${paidCurrency}.`, eventId);
        return res.sendStatus(200);
      }

      await completeSuccessfulPayment({
        user_email: email,
        paystack_reference: reference,
        paystack_subscription_code: intent.planCode,
        amount: intent.amount,
        currency: intent.currency,
        plan: intent.planName,
        billing_period: intent.billingPeriod,
        paid_at: data.paid_at || new Date().toISOString()
      }, eventId);
    }

    if (['charge.failed', 'invoice.payment_failed'].includes(event) && reference) {
      await markPaymentTerminal(reference, 'failed', data.gateway_response || data.message || `Paystack event: ${event}`, eventId);
    }

    if (['charge.abandoned', 'transaction.abandoned'].includes(event) && reference) {
      await markPaymentTerminal(reference, 'abandoned', `Paystack event: ${event}`, eventId);
    }
  } catch (e: any) {
    console.error('[PAYMENT] Webhook handling error:', e.message || e);
    return res.sendStatus(500);
  }

  res.sendStatus(200);
});

// ─── Legacy checkout endpoint (kept for backwards compat) ──────
app.post('/api/payments/checkout', verifyAuth, async (req: any, res) => {
  const user_email = req.userEmail;
  const { user_email: body_email, reference } = req.body;
  if (body_email && body_email.toLowerCase() !== user_email.toLowerCase()) {
    return res.status(403).json({ error: "You can only update your own plan." });
  }
  if (!reference) return res.status(400).json({ error: "Payment reference is required." });

  const existing = await getStoredPayment(reference);
  if (!existing) {
    const intent: any = resolvePaymentIntent(req.body.plan_name, req.body.billing_period, req.body.plan_code);
    if (intent.error) return res.status(400).json({ error: intent.error });
    const upgradeError = await verifyPlanUpgrade(user_email, intent.planName);
    if (upgradeError) return res.status(403).json({ error: upgradeError });
    await persistPaymentRecord({
      user_email,
      paystack_reference: reference,
      paystack_subscription_code: intent.planCode,
      amount: intent.amount,
      currency: intent.currency,
      plan: intent.planName,
      billing_period: intent.billingPeriod,
      status: 'pending'
    });
  }

  let payment = await getStoredPayment(reference);
  if (payment?.user_email && payment.user_email.toLowerCase() !== user_email.toLowerCase()) {
    return res.status(403).json({ error: "This payment reference belongs to another account." });
  }
  if (payment?.status === 'success') {
    const user = IS_SUPABASE_MODE ? await sbGetUser(user_email) : getDb().users.find((u: any) => u.email.toLowerCase() === user_email.toLowerCase());
    return res.json({ success: true, user: stripSensitive(user), idempotent: true });
  }

  if (PAYSTACK_SECRET_KEY) {
    let paystackData: any = null;
    try {
      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { 'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}` }
      });
      const verifyData: any = await verifyRes.json();
      paystackData = verifyData.data || null;
      if (!verifyData.status || !paystackData || paystackData.status !== 'success') {
        await markPaymentTerminal(reference, paystackData?.status === 'abandoned' ? 'abandoned' : 'failed', verifyData.message || `Paystack transaction status: ${paystackData?.status || 'unknown'}`);
        return res.status(402).json({ error: "Payment could not be verified with Paystack." });
      }
    } catch (e) {
      console.error('[PAYMENT] Paystack checkout verify error:', e);
      return res.status(502).json({ error: "Could not reach Paystack verification service." });
    }

    const metadata = normalizePaystackMetadata(paystackData.metadata);
    const planFromCode = resolvePlanFromCode(paystackData.plan?.plan_code || payment.paystack_subscription_code || '');
    const intent: any = resolvePaymentIntent(payment.plan || metadata.plan_name || planFromCode?.planName, payment.billing_period || metadata.billing_period || planFromCode?.billingPeriod, payment.paystack_subscription_code || planFromCode?.planCode);
    if (intent.error) return res.status(400).json({ error: intent.error });

    const paidAmount = Math.round((paystackData.amount || 0) / 100);
    const paidCurrency = paystackData.currency || 'KES';
    const customerEmail = paystackData.customer?.email || metadata.user_email || user_email;
    if (customerEmail.toLowerCase() !== user_email.toLowerCase()) {
      await markPaymentTerminal(reference, 'failed', 'Paystack customer email does not match authenticated user.');
      return res.status(403).json({ error: "Verified payment belongs to another Paystack customer." });
    }
    if (paidAmount !== intent.amount || paidCurrency !== intent.currency) {
      await markPaymentTerminal(reference, 'failed', `Payment amount/currency mismatch. Expected ${intent.amount} ${intent.currency}, got ${paidAmount} ${paidCurrency}.`);
      return res.status(402).json({ error: "Verified payment amount does not match the selected plan." });
    }

    payment = {
      ...payment,
      paystack_subscription_code: intent.planCode,
      amount: intent.amount,
      currency: intent.currency,
      plan: intent.planName,
      billing_period: intent.billingPeriod,
      paid_at: paystackData.paid_at || new Date().toISOString()
    };
  } else if (!String(reference).startsWith('sandbox_')) {
    await markPaymentTerminal(reference, 'failed', "Sandbox verification requires a sandbox_ reference.");
    return res.status(402).json({ error: "Payment could not be verified. If testing locally, ensure your reference starts with 'sandbox_'." });
  }

  const updatedUser = await completeSuccessfulPayment(payment);
  if (!updatedUser) return res.status(404).json({ error: "User not found or plan could not be activated." });
  res.json({ success: true, user: updatedUser });
});

// -------------------------------------------------------------
// ADMIN ENDPOINTS
// -------------------------------------------------------------

function verifySuperAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "No token provided" });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded.admin || (decoded.role !== 'super_admin')) {
      return res.status(403).json({ error: "Access denied." });
    }
    (req as any).adminEmail = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function verifyAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

app.post('/api/admin/bot/scout', verifySuperAdmin, async (_req: any, res) => {
  if (IS_SUPABASE_MODE && supabaseAdmin) {
    const { data, error, count } = await supabaseAdmin.from('bot_ingestions').select('*', { count: 'exact', head: false }).limit(5);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ count: count || 0, items: data || [] });
  }
  const db = getDb();
  res.json({ count: db.bot_ingestions?.length || 0, items: db.bot_ingestions || [] });
});

app.post('/api/admin/bot-run', verifySuperAdmin, async (_req: any, res) => {
  const db = getDb();
  const pending = (db.bot_ingestions || []).filter((i: any) => i.status === 'pending');
  res.json({ success: true, count: pending.length, items: pending });
});

app.get('/api/admin/ingestions', verifySuperAdmin, (req: any, res) => {
  const db = getDb();
  res.json(db.bot_ingestions || []);
});

app.get('/api/admin/bot-queue', verifySuperAdmin, async (req: any, res) => {
  try {
    const status = (req.query.status as string) || 'pending';
    const confidence_tier = req.query.confidence_tier as string;
    const host_region = req.query.host_region as string;
    const degree_levels = req.query.degree_levels as string;
    const search = req.query.search as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sort = (req.query.sort as string) || 'confidence_score_desc';

    if (IS_SUPABASE_MODE) {
      let query = supabaseAdmin
        .from('bot_ingestions')
        .select('*', { count: 'exact' });

      if (status) {
        query = query.eq('status', status);
      }
      if (confidence_tier) {
        query = query.eq('confidence_tier', confidence_tier);
      }
      if (host_region) {
        query = query.eq('host_region', host_region);
      }
      if (degree_levels) {
        const levels = degree_levels.split(',').map((l: string) => l.trim());
        query = query.overlaps('degree_levels', levels);
      }
      if (search) {
        query = query.filter('extracted_data->>name', 'ilike', `%${search}%`);
      }

      if (sort === 'confidence_score_asc') {
        query = query.order('confidence_score', { ascending: true });
      } else if (sort === 'confidence_score_desc') {
        query = query.order('confidence_score', { ascending: false });
      } else if (sort === 'created_at_asc') {
        query = query.order('created_at', { ascending: true });
      } else if (sort === 'created_at_desc') {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order('confidence_score', { ascending: false });
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      const items = (data || []).map((item: any) => ({
        ...item,
        name: item.extracted_data?.name || '',
      }));

      return res.json({
        items,
        total: count || 0,
        page,
        page_size: limit,
        total_pages: Math.ceil((count || 0) / limit),
      });
    }

    let list = [...(getDb().bot_ingestions || [])];

    if (status) {
      list = list.filter((i: any) => i.status === status);
    }
    if (confidence_tier) {
      list = list.filter((i: any) => {
        const score = parseFloat(i.confidence_score) || 0;
        const tier = score >= 0.8 ? 'high' : score >= 0.5 ? 'medium' : 'low';
        return tier === confidence_tier;
      });
    }
    if (host_region) {
      list = list.filter((i: any) => i.host_region?.toLowerCase() === host_region.toLowerCase());
    }
    if (degree_levels) {
      const levels = degree_levels.split(',').map((l: string) => l.trim());
      list = list.filter((i: any) =>
        (i.degree_levels || []).some((d: string) => levels.includes(d))
      );
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i: any) =>
        i.extracted_data?.name?.toLowerCase().includes(q)
      );
    }

    const total = list.length;
    const total_pages = Math.ceil(total / limit);
    const from = (page - 1) * limit;
    const items = list.slice(from, from + limit).map((item: any) => ({
      ...item,
      name: item.extracted_data?.name || '',
    }));

    res.json({ items, total, page, page_size: limit, total_pages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DEPRECATED: Use PATCH /api/admin/bot-queue/:id/review instead.
// This legacy endpoint only maps 5 fields (name, provider, host, source_url, apply_url)
// and does not use the new column names (host_institution, fields_of_study, countries).
// Kept temporarily to avoid breaking existing callers.
app.post('/api/admin/ingestions/action', verifySuperAdmin, (req: any, res) => {
  const db = getDb();
  const { id, action, admin_email } = req.body;

  const ingIdx = db.bot_ingestions.findIndex((i: any) => i.id === id);
  if (ingIdx === -1) return res.status(404).json({ error: "Ingestion not found" });

  if (action === 'approve') {
    const ing = db.bot_ingestions[ingIdx];
    const newSchol = {
      id: "schol-" + Date.now(), name: ing.scholarship_name,
      provider: ing.provider, host: ing.host,
      description: `Discovered via Zawadi Bot Scout. Originally fetched from ${ing.source_url}`,
      source_url: ing.source_url, apply_url: ing.apply_url,
      published: false, view_count: 0
    };
    db.scholarships.push(newSchol);
    db.bot_ingestions[ingIdx].status = 'approved';

    db.audit_logs.push({
      id: "audit-" + Date.now(), admin_email: admin_email || req.adminEmail,
      action: "ingestion_approved", target_type: "scholarship", target_id: newSchol.id,
      details: `Approved "${ing.scholarship_name}" from Bot Queue`,
      ip_address: req.ip || "127.0.0.1", created_at: new Date().toISOString()
    });

    saveDb(db);
    res.json({ success: true, scholarship: newSchol });
  } else if (action === 'reject') {
    db.bot_ingestions[ingIdx].status = 'rejected';
    saveDb(db);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: "Invalid action" });
  }
});

app.post('/api/admin/bot-queue/review', verifySuperAdmin, (_req: any, res) => {
  res.json({ success: true, message: "Review submitted" });
});

app.post('/api/admin/scholarships', verifySuperAdmin, async (req: any, res) => {
  const schol = req.body;

  if (IS_SUPABASE_MODE) {
    await sbUpsertScholarship(schol);
    await sbInsertAudit({
      id: "audit-" + Date.now(), admin_email: req.body.admin_email || req.adminEmail,
      action: "scholarship_updated", target_type: "scholarship", target_id: schol.id,
      details: `Updated scholarship "${schol.name}"`,
      ip_address: req.ip || "127.0.0.1", created_at: new Date().toISOString()
    });
    return res.json({ success: true, scholarship: schol });
  }

  const db = getDb();
  const idx = db.scholarships.findIndex((s: any) => s.id === schol.id);
  if (idx !== -1) db.scholarships[idx] = schol;
  else db.scholarships.push(schol);

  db.audit_logs.push({
    id: "audit-" + Date.now(), admin_email: req.body.admin_email || req.adminEmail,
    action: "scholarship_updated", target_type: "scholarship", target_id: schol.id,
    details: `Updated scholarship "${schol.name}"`,
    ip_address: req.ip || "127.0.0.1", created_at: new Date().toISOString()
  });

  saveDb(db);
  res.json({ success: true, scholarship: schol });
});

app.delete('/api/admin/scholarships/:id', verifySuperAdmin, async (req: any, res) => {
  if (IS_SUPABASE_MODE) {
    // Mark as unpublished instead of delete to maintain referential integrity
    await sbUpsertScholarship({ id: req.params.id, published: false });
    return res.json({ success: true });
  }
  const db = getDb();
  const idx = db.scholarships.findIndex((s: any) => s.id === req.params.id);
  if (idx !== -1) db.scholarships.splice(idx, 1);
  saveDb(db);
  res.json({ success: true });
});

app.delete('/api/scholarships/:id', verifySuperAdmin, async (req: any, res) => {
  if (IS_SUPABASE_MODE) {
    await sbUpsertScholarship({ id: req.params.id, published: false });
    return res.json({ success: true });
  }
  const db = getDb();
  const idx = db.scholarships.findIndex((s: any) => s.id === req.params.id);
  if (idx !== -1) db.scholarships.splice(idx, 1);
  saveDb(db);
  res.json({ success: true });
});

app.post('/api/admin/scholarships/bulk-delete', verifySuperAdmin, async (req: any, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "No scholarship IDs provided" });
  }
  if (IS_SUPABASE_MODE) {
    for (const id of ids) {
      await sbUpsertScholarship({ id, published: false });
    }
    return res.json({ success: true, deleted: ids.length });
  }
  const db = getDb();
  db.scholarships = db.scholarships.filter((s: any) => !ids.includes(s.id));
  saveDb(db);
  res.json({ success: true, deleted: ids.length });
});

app.post('/api/scholarships', verifySuperAdmin, async (req: any, res) => {
  const schol = req.body;

  if (IS_SUPABASE_MODE) {
    await sbUpsertScholarship(schol);
    await sbInsertAudit({
      id: "audit-" + Date.now(), admin_email: req.body.admin_email || req.adminEmail,
      action: "scholarship_updated", target_type: "scholarship", target_id: schol.id,
      details: `Updated scholarship "${schol.name}"`,
      ip_address: req.ip || "127.0.0.1", created_at: new Date().toISOString()
    });
    return res.json({ success: true, scholarship: schol });
  }

  const db = getDb();
  const idx = db.scholarships.findIndex((s: any) => s.id === schol.id);
  if (idx !== -1) db.scholarships[idx] = schol;
  else db.scholarships.push(schol);

  const adminEmail = req.body.admin_email || req.adminEmail;
  db.audit_logs.push({
    id: "audit-" + Date.now(), admin_email: adminEmail,
    action: idx !== -1 ? "scholarship_updated" : "scholarship_created",
    target_type: "scholarship", target_id: schol.id,
    details: `${idx !== -1 ? "Updated" : "Created"} scholarship "${schol.name}" by ${adminEmail}`,
    ip_address: req.ip || "127.0.0.1", created_at: new Date().toISOString()
  });

  saveDb(db);
  res.json({ success: true, scholarship: schol });
});

app.get('/api/admin/audit', verifySuperAdmin, (req: any, res) => {
  const db = getDb();
  res.json((db.audit_logs || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 200));
});

app.get('/api/admin/logs', verifySuperAdmin, (req: any, res) => {
  const db = getDb();
  res.json((db.audit_logs || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 200));
});

app.get('/api/admin/analysis-logs', verifySuperAdmin, async (_req: any, res) => {
  try {
    let docs: any[];
    if (IS_SUPABASE_MODE) {
      if (!supabaseAdmin) return res.json([]);
      const { data } = await supabaseAdmin.from('documents').select('*').not('analysis_status', 'is', null).order('last_analyzed_at', { ascending: false }).limit(100);
      docs = data || [];
    } else {
      const db = getDb();
      docs = (db.documents || []).filter((d: any) => d.analysis_status).sort((a: any, b: any) => new Date(b.last_analyzed_at || 0).getTime() - new Date(a.last_analyzed_at || 0).getTime()).slice(0, 100);
    }
    res.json(docs.map((d: any) => ({
      id: d.id, user_email: d.user_email, name: d.name, type: d.type, analysis_status: d.analysis_status, last_analyzed_at: d.last_analyzed_at, analysis_error: d.analysis_error || null,
    })));
  } catch (err: any) {
    console.error('[Admin] Analysis logs error:', err.message);
    res.json([]);
  }
});

app.get('/api/admin/users', verifySuperAdmin, async (req, res) => {
  if (IS_SUPABASE_MODE) {
    const users = await sbGetUsers();
    return res.json(users.map(stripSensitive));
  }
  const db = getDb();
  const users = db.users || [];
  res.json(users.map(stripSensitive));
});

app.patch('/api/admin/users/:email', verifySuperAdmin, async (req, res) => {
  const email = req.params.email.toLowerCase();
  // Strip admin-only audit fields — they don't belong in the profiles table
  const safeBody = { ...req.body };
  delete safeBody.admin_email;
  delete safeBody.admin_id;
  if (IS_SUPABASE_MODE) {
    await sbUpsertUser({ email, ...safeBody });
    return res.json({ success: true, user: stripSensitive({ email, ...safeBody }) });
  }
  const db = getDb();
  const idx = db.users.findIndex((u: any) => u.email.toLowerCase() === email);
  if (idx === -1) return res.status(404).json({ error: "User not found" });
  db.users[idx] = { ...db.users[idx], ...safeBody };
  saveDb(db);
  res.json({ success: true, user: stripSensitive(db.users[idx]) });
});

app.delete('/api/admin/users/:email', verifySuperAdmin, async (req: any, res) => {
  const email = req.params.email.toLowerCase();
  if (IS_SUPABASE_MODE) {
    // In Supabase, suspend instead of delete to maintain referential integrity
    await sbUpsertUser({ email, status: 'suspended' });
    return res.json({ success: true });
  }
  const db = getDb();
  const idx = db.users.findIndex((u: any) => u.email.toLowerCase() === email);
  if (idx !== -1) db.users.splice(idx, 1);
  saveDb(db);
  res.json({ success: true });
});

app.get('/api/admin/stats', verifySuperAdmin, async (req: any, res) => {
  let totalScholarships = 0, publishedScholarships = 0, draftScholarships = 0;
  let totalUsers = 0, activeUsers = 0, activeSubs = 0;
  let totalApplications = 0, totalDocuments = 0, totalEssays = 0;
  let totalPayments = 0, successfulPayments = 0, pendingBotCount = 0, auditCount = 0;
  let mrr = 0, mrrKes = 0;
  const distribution = { explorer: 0, plus: 0, pro: 0, institutional: 0 };
  const userGrowth: { month: string; users: number }[] = [];
  const appStatusBreakdown: Record<string, number> = {};
  const essayTrend: { date: string; essays: number }[] = [];
  const MRR_PRICING: Record<string, number> = { explorer: 0, plus: 6, pro: 12, institutional: 0 };

  if (IS_SUPABASE_MODE && supabaseAdmin) {
    try {
      const [{ count: sCount }, { data: sData }, { count: uCount }, { data: uData },
        { count: dCount }, { data: dData }, { count: eCount }, { data: eData },
        { count: pCount }, { data: pData }, { count: bCount },
        { count: aCount }] = await Promise.all([
        supabaseAdmin.from('scholarships').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('scholarships').select('published'),
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('users').select('plan, status, joined_at'),
        supabaseAdmin.from('applications').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('applications').select('status'),
        supabaseAdmin.from('essays').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('essays').select('created_at'),
        supabaseAdmin.from('payments').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('payments').select('status'),
        supabaseAdmin.from('bot_ingestions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabaseAdmin.from('audit_logs').select('*', { count: 'exact', head: true }),
      ]);

      totalScholarships = sCount || 0;
      publishedScholarships = (sData || []).filter((s: any) => s.published).length;
      draftScholarships = totalScholarships - publishedScholarships;
      totalUsers = uCount || 0;
      totalApplications = dCount || 0;
      totalDocuments = (await supabaseAdmin.from('documents').select('*', { count: 'exact', head: true })).count || 0;
      totalEssays = eCount || 0;
      totalPayments = pCount || 0;
      pendingBotCount = bCount || 0;
      auditCount = aCount || 0;

      const uList = uData || [];
      activeUsers = uList.filter((u: any) => u.status === 'active').length;
      for (const u of uList) {
        distribution[u.plan as keyof typeof distribution] = (distribution[u.plan as keyof typeof distribution] || 0) + 1;
        const m = (u.joined_at || '').substring(0, 7);
        if (m) {
          const existing = userGrowth.find(g => g.month === m);
          if (existing) existing.users++;
          else userGrowth.push({ month: m, users: 1 });
        }
      }
      userGrowth.sort((a, b) => a.month.localeCompare(b.month));

      const pList = pData || [];
      successfulPayments = pList.filter((p: any) => p.status === 'success').length;
      activeSubs = successfulPayments;

      for (const a of (dData || [])) {
        const status = a.status || 'Unknown';
        appStatusBreakdown[status] = (appStatusBreakdown[status] || 0) + 1;
      }

      const eList = eData || [];
      const essayDayMap = new Map<string, number>();
      for (const e of eList) {
        const d = (e.created_at || '').substring(0, 10);
        if (d) essayDayMap.set(d, (essayDayMap.get(d) || 0) + 1);
      }
      for (const [date, count] of essayDayMap) {
        essayTrend.push({ date, essays: count });
      }
      essayTrend.sort((a, b) => a.date.localeCompare(b.date));

      mrr = uList.reduce((sum: number, u: any) => sum + (MRR_PRICING[u.plan] || 0), 0);
      mrrKes = mrr * 130;
    } catch (supaErr) {
      console.error('[STATS] Supabase query failed, falling back to local:', supaErr);
      // Fall through to local fallback
    }
  }

  if (!IS_SUPABASE_MODE || supabaseAdmin === null) {
    const db = getDb();
    const allUsers = db.users || [];
    const allPayments = db.payments || [];

    totalScholarships = db.scholarships?.length || 0;
    publishedScholarships = (db.scholarships || []).filter((s: any) => s.published).length;
    draftScholarships = totalScholarships - publishedScholarships;
    totalUsers = allUsers.length;
    activeUsers = allUsers.filter((u: any) => u.status === 'active').length;
    activeSubs = allPayments.filter((p: any) => p.status === 'success').length;
    totalApplications = db.applications?.length || 0;
    totalDocuments = db.documents?.length || 0;
    totalEssays = db.essays?.length || 0;
    totalPayments = allPayments.length;
    pendingBotCount = (db.bot_ingestions || db.bot_queue || []).filter((b: any) => b.status === 'pending').length;
    auditCount = db.audit_logs?.length || 0;

    for (const u of allUsers) {
      distribution[u.plan as keyof typeof distribution] = (distribution[u.plan as keyof typeof distribution] || 0) + 1;
      const m = (u.joined_at || '').substring(0, 7);
      if (m) {
        const existing = userGrowth.find(g => g.month === m);
        if (existing) existing.users++;
        else userGrowth.push({ month: m, users: 1 });
      }
    }
    userGrowth.sort((a, b) => a.month.localeCompare(b.month));

    for (const a of (db.applications || [])) {
      const status = a.status || 'Unknown';
      appStatusBreakdown[status] = (appStatusBreakdown[status] || 0) + 1;
    }

    const essayDayMap = new Map<string, number>();
    for (const e of (db.essays || [])) {
      const d = (e.created_at || '').substring(0, 10);
      if (d) essayDayMap.set(d, (essayDayMap.get(d) || 0) + 1);
    }
    for (const [date, count] of essayDayMap) {
      essayTrend.push({ date, essays: count });
    }
    essayTrend.sort((a, b) => a.date.localeCompare(b.date));

    mrr = allUsers.reduce((sum: number, u: any) => sum + (MRR_PRICING[u.plan] || 0), 0);
    mrrKes = mrr * 130;
  }

  res.json({
    totalScholarships, publishedScholarships, draftScholarships, pendingBotCount,
    totalUsers, activeUsers, activeSubs, totalApplications, totalDocuments, totalEssays,
    mrr, mrrKes, auditCount, totalPayments, successfulPayments,
    distribution, userGrowth, appStatusBreakdown, essayTrend,
  });
});

// -------------------------------------------------------------
// PIPELINE ENDPOINTS
// -------------------------------------------------------------

app.post('/api/admin/pipeline/ingest', verifySuperAdmin, async (req: any, res) => {
  try {
    const { pipeline_run, scholarships } = req.body;

    if (!pipeline_run || !scholarships || !Array.isArray(scholarships)) {
      return res.status(400).json({ error: 'Missing pipeline_run or scholarships array' });
    }

    const pipelineRunId = pipeline_run.timestamp || new Date().toISOString();
    let inserted = 0;
    let duplicates_skipped = 0;
    let scam_flagged = 0;
    const rejected_invalid: { name: string; errors: string[] }[] = [];
    const total_received = scholarships.length;

    for (const schol of scholarships) {
      const fingerprint = crypto
        .createHash('sha256')
        .update(`${schol.name}${schol.provider}${schol.deadline}`)
        .digest('hex');

      if (IS_SUPABASE_MODE) {
        const { data: existing } = await supabaseAdmin
          .from('bot_ingestions')
          .select('fingerprint')
          .eq('fingerprint', fingerprint)
          .maybeSingle();

        if (existing) {
          duplicates_skipped++;
          continue;
        }
      } else {
        const db = getDb();
        if ((db.bot_ingestions || []).some((i: any) => i.fingerprint === fingerprint)) {
          duplicates_skipped++;
          continue;
        }
      }

      const validation = validateScholarship(schol);
      if (!validation.isValid) {
        rejected_invalid.push({ name: schol.name || 'Unknown', errors: validation.errors });
        continue;
      }

      const hasScamFlags = Array.isArray(schol.scam_flags) && schol.scam_flags.length > 0;
      if (hasScamFlags) {
        scam_flagged++;
      }

      const ingestionRecord: any = {
        extracted_data: schol,
        source_url: schol.source_url || '',
        confidence_score: parseFloat(schol.confidence_score) || 0.5,
        scam_flags: schol.scam_flags || [],
        status: 'pending',
        fingerprint,
        pipeline_run_id: pipelineRunId,
        degree_levels: schol.degree_levels || [],
        host_region: schol.host_region || null,
        countries: schol.countries || [],
      };

      if (IS_SUPABASE_MODE) {
        const { error } = await supabaseAdmin
          .from('bot_ingestions')
          .insert(ingestionRecord);
        if (error) throw error;
      } else {
        const db = getDb();
        ingestionRecord.id = crypto.randomUUID();
        ingestionRecord.created_at = new Date().toISOString();
        if (!db.bot_ingestions) db.bot_ingestions = [];
        db.bot_ingestions.push(ingestionRecord);
        saveDb(db);
      }
      inserted++;
    }

    res.json({
      total_received,
      inserted,
      duplicates_skipped,
      scam_flagged,
      rejected_invalid,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/bot-queue/:id/review', verifySuperAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { action, review_notes, edited_scholarship } = req.body;

    if (!action || !['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'action must be "approved" or "rejected"' });
    }

    if (IS_SUPABASE_MODE) {
      const { data: ingestion, error: fetchError } = await supabaseAdmin
        .from('bot_ingestions')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !ingestion) {
        return res.status(404).json({ error: 'Ingestion not found' });
      }

      if (action === 'approved') {
        const extracted = ingestion.extracted_data || {};
        const edits = edited_scholarship || {};
        const scholId = 'schol-' + Date.now();

        const mapped = {
          id: scholId,
          name: edits.name || extracted.name || '',
          provider: edits.provider || extracted.provider || '',
          host_institution: edits.host_institution || extracted.host_institution || extracted.host || '',
          countries: edits.countries || extracted.countries || extracted.country || [],
          degree_levels: edits.degree_levels || extracted.degree_levels || [],
          fields_of_study: edits.fields_of_study || extracted.fields_of_study || extracted.fields || [],
          funding_type: edits.funding_type || extracted.funding_type || null,
          amount: edits.amount || extracted.amount || null,
          deadline: edits.deadline || extracted.deadline || null,
          description: edits.description || extracted.description || null,
          eligibility: edits.eligibility || extracted.eligibility || null,
          required_documents: edits.required_documents || extracted.required_documents || null,
          apply_url: edits.apply_url || extracted.apply_url || '',
          source_url: edits.source_url || extracted.source_url || ingestion.source_url || '',
          published: false,
          verified: true,
          verified_by: req.adminEmail,
          verified_at: new Date().toISOString(),
          view_count: 0,
          no_ielts: edits.no_ielts !== undefined ? edits.no_ielts : extracted.no_ielts !== undefined ? extracted.no_ielts : null,
          work_experience_required: edits.work_experience_required !== undefined ? edits.work_experience_required : extracted.work_experience_required || null,
          instruction_language: edits.instruction_language || extracted.instruction_language || 'English',
          min_gpa_normalised: edits.min_gpa_normalised !== undefined ? edits.min_gpa_normalised : extracted.min_gpa_normalised || null,
          requires_research: edits.requires_research !== undefined ? edits.requires_research : extracted.requires_research !== undefined ? extracted.requires_research : false,
          requires_leadership: edits.requires_leadership !== undefined ? edits.requires_leadership : extracted.requires_leadership !== undefined ? extracted.requires_leadership : false,
          requires_community: edits.requires_community !== undefined ? edits.requires_community : extracted.requires_community !== undefined ? extracted.requires_community : false,
          targets_financial_need: edits.targets_financial_need !== undefined ? edits.targets_financial_need : extracted.targets_financial_need !== undefined ? extracted.targets_financial_need : false,
          targets_first_generation: edits.targets_first_generation !== undefined ? edits.targets_first_generation : extracted.targets_first_generation !== undefined ? extracted.targets_first_generation : false,
          targets_rural_origin: edits.targets_rural_origin !== undefined ? edits.targets_rural_origin : extracted.targets_rural_origin !== undefined ? extracted.targets_rural_origin : false,
          targets_ldc_countries: edits.targets_ldc_countries !== undefined ? edits.targets_ldc_countries : extracted.targets_ldc_countries !== undefined ? extracted.targets_ldc_countries : false,
          is_intra_african: edits.is_intra_african !== undefined ? edits.is_intra_african : extracted.is_intra_african !== undefined ? extracted.is_intra_african : false,
          stem_focus: edits.stem_focus !== undefined ? edits.stem_focus : extracted.stem_focus !== undefined ? extracted.stem_focus : false,
          development_focus: edits.development_focus !== undefined ? edits.development_focus : extracted.development_focus !== undefined ? extracted.development_focus : false,
          social_sciences_focus: edits.social_sciences_focus !== undefined ? edits.social_sciences_focus : extracted.social_sciences_focus !== undefined ? extracted.social_sciences_focus : false,
          humanities_focus: edits.humanities_focus !== undefined ? edits.humanities_focus : extracted.humanities_focus !== undefined ? extracted.humanities_focus : false,
          peace_conflict_focus: edits.peace_conflict_focus !== undefined ? edits.peace_conflict_focus : extracted.peace_conflict_focus !== undefined ? extracted.peace_conflict_focus : false,
          quality_score: edits.quality_score !== undefined ? edits.quality_score : parseFloat(ingestion.confidence_score) || null,
          scam_flags: edits.scam_flags || extracted.scam_flags || [],
          pipeline_source: 'pipeline',
          sponsor_type: edits.sponsor_type || extracted.sponsor_type || null,
          urgency: edits.urgency || extracted.urgency || 'Normal',
          host_region: edits.host_region || extracted.host_region || null,
          host_country: edits.host_country || extracted.host_country || null,
          iso2: edits.iso2 || extracted.iso2 || null,
          age_limit_masters: edits.age_limit_masters !== undefined ? edits.age_limit_masters : extracted.age_limit_masters || null,
          age_limit_phd: edits.age_limit_phd !== undefined ? edits.age_limit_phd : extracted.age_limit_phd || null,
          min_work_years: edits.min_work_years !== undefined ? edits.min_work_years : extracted.min_work_years || null,
          max_work_years: edits.max_work_years !== undefined ? edits.max_work_years : extracted.max_work_years || null,
          min_english_score: edits.min_english_score !== undefined ? edits.min_english_score : extracted.min_english_score || null,
          min_english_test_type: edits.min_english_test_type || extracted.min_english_test_type || null,
          min_french_level: edits.min_french_level || extracted.min_french_level || null,
          min_arabic_level: edits.min_arabic_level || extracted.min_arabic_level || null,
          min_portuguese_level: edits.min_portuguese_level || extracted.min_portuguese_level || null,
          requires_publications: edits.requires_publications !== undefined ? edits.requires_publications : extracted.requires_publications !== undefined ? extracted.requires_publications : false,
          min_publication_count: edits.min_publication_count !== undefined ? edits.min_publication_count : extracted.min_publication_count || null,
        };

        const { error: insertError } = await supabaseAdmin
          .from('scholarships')
          .insert(mapped);
        if (insertError) throw insertError;

        const { error: updateError } = await supabaseAdmin
          .from('bot_ingestions')
          .update({
            status: 'approved',
            reviewed_by: req.adminEmail,
            reviewed_at: new Date().toISOString(),
            review_notes: review_notes || null,
          })
          .eq('id', id);
        if (updateError) throw updateError;

        const auditLog = {
          id: 'audit-' + Date.now(),
          admin_email: req.adminEmail,
          action: 'ingestion_approved',
          target_type: 'scholarship',
          target_id: scholId,
          details: `Approved "${mapped.name}" from Bot Queue via pipeline review`,
          ip_address: req.ip || '127.0.0.1',
          created_at: new Date().toISOString(),
        };
        const { error: auditError } = await supabaseAdmin
          .from('audit_logs')
          .insert(auditLog);
        if (auditError) console.error('[AUDIT]', auditError.message);

        return res.json({ success: true, scholarship_id: scholId });
      }

      if (action === 'rejected') {
        const { error: updateError } = await supabaseAdmin
          .from('bot_ingestions')
          .update({
            status: 'rejected',
            reviewed_by: req.adminEmail,
            reviewed_at: new Date().toISOString(),
            review_notes: review_notes || null,
          })
          .eq('id', id);
        if (updateError) throw updateError;

        const auditLog = {
          id: 'audit-' + Date.now(),
          admin_email: req.adminEmail,
          action: 'ingestion_rejected',
          target_type: 'bot_ingestion',
          target_id: id,
          details: `Rejected ingestion ${id}${review_notes ? ': ' + review_notes : ''}`,
          ip_address: req.ip || '127.0.0.1',
          created_at: new Date().toISOString(),
        };
        const { error: auditError } = await supabaseAdmin
          .from('audit_logs')
          .insert(auditLog);
        if (auditError) console.error('[AUDIT]', auditError.message);

        return res.json({ success: true });
      }
    }

    const db = getDb();
    const ingIdx = (db.bot_ingestions || []).findIndex((i: any) => i.id === id);
    if (ingIdx === -1) return res.status(404).json({ error: 'Ingestion not found' });

    if (action === 'approved') {
      const ing = db.bot_ingestions[ingIdx];
      const extracted = ing.extracted_data || {};
      const edits = edited_scholarship || {};
      const scholId = 'schol-' + Date.now();

      const newSchol: any = {
        id: scholId,
        name: edits.name || extracted.name || ing.scholarship_name || '',
        provider: edits.provider || extracted.provider || ing.provider || '',
        host_institution: edits.host_institution || extracted.host_institution || extracted.host || ing.host || '',
        countries: edits.countries || extracted.countries || extracted.country || [],
        degree_levels: edits.degree_levels || extracted.degree_levels || [],
        fields_of_study: edits.fields_of_study || extracted.fields_of_study || extracted.fields || [],
        funding_type: edits.funding_type || extracted.funding_type || null,
        amount: edits.amount || extracted.amount || null,
        deadline: edits.deadline || extracted.deadline || null,
        description: edits.description || extracted.description || null,
        eligibility: edits.eligibility || extracted.eligibility || null,
        required_documents: edits.required_documents || extracted.required_documents || null,
        apply_url: edits.apply_url || extracted.apply_url || ing.apply_url || '',
        source_url: edits.source_url || extracted.source_url || ing.source_url || '',
        published: false,
        verified: true,
        verified_by: req.adminEmail,
        verified_at: new Date().toISOString(),
        view_count: 0,
        no_ielts: edits.no_ielts !== undefined ? edits.no_ielts : extracted.no_ielts !== undefined ? extracted.no_ielts : null,
        instruction_language: edits.instruction_language || extracted.instruction_language || 'English',
        quality_score: edits.quality_score !== undefined ? edits.quality_score : parseFloat(ing.confidence_score) || null,
        pipeline_source: 'pipeline',
        host_region: edits.host_region || extracted.host_region || null,
        host_country: edits.host_country || extracted.host_country || null,
        iso2: edits.iso2 || extracted.iso2 || null,
      };

      db.scholarships.push(newSchol);
      db.bot_ingestions[ingIdx].status = 'approved';
      db.bot_ingestions[ingIdx].reviewed_by = req.adminEmail;
      db.bot_ingestions[ingIdx].reviewed_at = new Date().toISOString();
      if (review_notes) db.bot_ingestions[ingIdx].review_notes = review_notes;

      db.audit_logs.push({
        id: 'audit-' + Date.now(),
        admin_email: req.adminEmail,
        action: 'ingestion_approved',
        target_type: 'scholarship',
        target_id: scholId,
        details: `Approved "${newSchol.name}" from Bot Queue via pipeline review`,
        ip_address: req.ip || '127.0.0.1',
        created_at: new Date().toISOString(),
      });

      saveDb(db);
      return res.json({ success: true, scholarship_id: scholId });
    }

    if (action === 'rejected') {
      db.bot_ingestions[ingIdx].status = 'rejected';
      db.bot_ingestions[ingIdx].reviewed_by = req.adminEmail;
      db.bot_ingestions[ingIdx].reviewed_at = new Date().toISOString();
      db.bot_ingestions[ingIdx].review_notes = review_notes || null;

      db.audit_logs.push({
        id: 'audit-' + Date.now(),
        admin_email: req.adminEmail,
        action: 'ingestion_rejected',
        target_type: 'bot_ingestion',
        target_id: id,
        details: `Rejected ingestion ${id}${review_notes ? ': ' + review_notes : ''}`,
        ip_address: req.ip || '127.0.0.1',
        created_at: new Date().toISOString(),
      });

      saveDb(db);
      return res.json({ success: true });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/scholarships/:id/publish', verifySuperAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;

    // Try local db.json first (works for locally-imported scholarships)
    const db = getDb();
    const localIdx = db.scholarships.findIndex((s: any) => s.id === id);
    if (localIdx !== -1) {
      const schol = db.scholarships[localIdx];
      const newPublished = !schol.published;
      schol.published = newPublished;
      db.audit_logs.push({
        id: 'audit-' + Date.now(),
        admin_email: req.adminEmail,
        action: newPublished ? 'scholarship_published' : 'scholarship_unpublished',
        target_type: 'scholarship',
        target_id: id,
        details: `${newPublished ? 'Published' : 'Unpublished'} scholarship "${schol.name}" by ${req.adminEmail}`,
        ip_address: req.ip || '127.0.0.1',
        created_at: new Date().toISOString(),
      });
      saveDb(db);

      // Also try Supabase if in that mode
      if (IS_SUPABASE_MODE) {
        try {
          await supabaseAdmin.from('scholarships').upsert({ id, published: newPublished }, { onConflict: 'id' });
        } catch { /* Supabase sync best-effort */ }
      }

      return res.json({ success: true, scholarship: schol });
    }

    // Fall back to Supabase-only lookup for Supabase-native scholarships
    if (IS_SUPABASE_MODE) {
      const { data: schol, error: fetchError } = await supabaseAdmin
        .from('scholarships')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !schol) {
        return res.status(404).json({ error: 'Scholarship not found' });
      }

      const newPublished = !schol.published;
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('scholarships')
        .update({ published: newPublished })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      const auditLog = {
        id: 'audit-' + Date.now(),
        admin_email: req.adminEmail,
        action: newPublished ? 'scholarship_published' : 'scholarship_unpublished',
        target_type: 'scholarship',
        target_id: id,
        details: `${newPublished ? 'Published' : 'Unpublished'} scholarship "${schol.name}" by ${req.adminEmail}`,
        ip_address: req.ip || '127.0.0.1',
        created_at: new Date().toISOString(),
      };
      const { error: auditError } = await supabaseAdmin.from('audit_logs').insert(auditLog);
      if (auditError) console.error('[AUDIT]', auditError.message);

      return res.json({ success: true, scholarship: updated });
    }

    return res.status(404).json({ error: 'Scholarship not found' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/pipeline/stats', verifySuperAdmin, async (req: any, res) => {
  try {
    if (IS_SUPABASE_MODE) {
      const [
        { count: total_scholarships },
        { count: published_scholarships },
        { count: unpublished_scholarships },
        { count: pending_review },
        { count: high_confidence_pending },
        { count: needs_review_pending },
        { count: low_confidence_pending },
        { count: scam_flagged_pending },
        { count: approved_today },
        { count: rejected_total },
        { data: lastPipelineData },
        { count: scholarships_added_last_7_days },
      ] = await Promise.all([
        supabaseAdmin.from('scholarships').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('scholarships').select('*', { count: 'exact', head: true }).eq('published', true),
        supabaseAdmin.from('scholarships').select('*', { count: 'exact', head: true }).eq('published', false),
        supabaseAdmin.from('bot_ingestions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabaseAdmin.from('bot_ingestions').select('*', { count: 'exact', head: true }).eq('status', 'pending').gte('confidence_score', 0.8),
        supabaseAdmin.from('bot_ingestions').select('*', { count: 'exact', head: true }).eq('status', 'pending').gte('confidence_score', 0.5).lt('confidence_score', 0.8),
        supabaseAdmin.from('bot_ingestions').select('*', { count: 'exact', head: true }).eq('status', 'pending').lt('confidence_score', 0.5),
        supabaseAdmin.from('bot_ingestions').select('*', { count: 'exact', head: true }).eq('status', 'pending').not('scam_flags', 'eq', '[]'),
        supabaseAdmin.from('bot_ingestions').select('*', { count: 'exact', head: true }).eq('status', 'approved').gte('reviewed_at', new Date().toISOString().split('T')[0]),
        supabaseAdmin.from('bot_ingestions').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabaseAdmin.from('bot_ingestions').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabaseAdmin.from('scholarships').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);

      return res.json({
        total_scholarships: total_scholarships || 0,
        published_scholarships: published_scholarships || 0,
        unpublished_scholarships: unpublished_scholarships || 0,
        pending_review: pending_review || 0,
        high_confidence_pending: high_confidence_pending || 0,
        needs_review_pending: needs_review_pending || 0,
        low_confidence_pending: low_confidence_pending || 0,
        scam_flagged_pending: scam_flagged_pending || 0,
        approved_today: approved_today || 0,
        rejected_total: rejected_total || 0,
        last_pipeline_run: lastPipelineData?.created_at || null,
        scholarships_added_last_7_days: scholarships_added_last_7_days || 0,
      });
    }

    const db = getDb();
    const now = new Date();
    const todayStart = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const s = db.scholarships || [];
    const i = db.bot_ingestions || [];

    res.json({
      total_scholarships: s.length,
      published_scholarships: s.filter((x: any) => x.published).length,
      unpublished_scholarships: s.filter((x: any) => !x.published).length,
      pending_review: i.filter((x: any) => x.status === 'pending').length,
      high_confidence_pending: i.filter((x: any) => x.status === 'pending' && parseFloat(x.confidence_score) >= 0.8).length,
      needs_review_pending: i.filter((x: any) => x.status === 'pending' && parseFloat(x.confidence_score) >= 0.5 && parseFloat(x.confidence_score) < 0.8).length,
      low_confidence_pending: i.filter((x: any) => x.status === 'pending' && parseFloat(x.confidence_score) < 0.5).length,
      scam_flagged_pending: i.filter((x: any) => x.status === 'pending' && Array.isArray(x.scam_flags) && x.scam_flags.length > 0).length,
      approved_today: i.filter((x: any) => x.status === 'approved' && x.reviewed_at && x.reviewed_at.startsWith(todayStart)).length,
      rejected_total: i.filter((x: any) => x.status === 'rejected').length,
      last_pipeline_run: i.length > 0 ? i.map((x: any) => x.created_at).sort().reverse()[0] : null,
      scholarships_added_last_7_days: s.filter((x: any) => x.created_at && x.created_at >= sevenDaysAgo).length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/pipeline/status', verifySuperAdmin, async (req: any, res) => {
  try {
    if (IS_SUPABASE_MODE) {
      const { data: lastRun } = await supabaseAdmin
        .from('bot_ingestions')
        .select('pipeline_run_id, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: pending_count } = await supabaseAdmin
        .from('bot_ingestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      return res.json({
        last_run: lastRun?.pipeline_run_id || null,
        last_run_timestamp: lastRun?.created_at || null,
        pending_count: pending_count || 0,
        is_running: false,
      });
    }

    const db = getDb();
    const ing = db.bot_ingestions || [];
    const lastRun = ing.length > 0
      ? ing.slice().sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      : null;

    res.json({
      last_run: lastRun?.pipeline_run_id || null,
      last_run_timestamp: lastRun?.created_at || null,
      pending_count: ing.filter((x: any) => x.status === 'pending').length,
      is_running: false,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/pipeline/run', verifySuperAdmin, async (_req: any, res) => {
  try {
    const summary = await runDiscoveryPipeline();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AI Config ────────────────────────────────────────────────

app.get('/api/admin/ai-config', verifySuperAdmin, async (_req: any, res) => {
  try {
    if (IS_SUPABASE_MODE && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from('ai_config').select('*').eq('id', 'default').maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      const cfg = data || { provider: 'gemini', openai_key: '', deepseek_key: '', gemini_key: '' };
      return res.json({
        provider: cfg.provider,
        openai_key: cfg.openai_key ? `${cfg.openai_key.substring(0, 8)}...${cfg.openai_key.slice(-4)}` : '',
        deepseek_key: cfg.deepseek_key ? `${cfg.deepseek_key.substring(0, 8)}...${cfg.deepseek_key.slice(-4)}` : '',
        gemini_key: cfg.gemini_key ? `${cfg.gemini_key.substring(0, 8)}...${cfg.gemini_key.slice(-4)}` : '',
        has_openai: !!cfg.openai_key,
        has_deepseek: !!cfg.deepseek_key,
        has_gemini: !!cfg.gemini_key,
      });
    }
    const env = process.env;
    return res.json({
      provider: env.AI_PROVIDER || 'gemini',
      openai_key: env.OPENAI_API_KEY ? `${env.OPENAI_API_KEY.substring(0, 8)}...${env.OPENAI_API_KEY.slice(-4)}` : '',
      deepseek_key: env.DEEPSEEK_API_KEY ? `${env.DEEPSEEK_API_KEY.substring(0, 8)}...${env.DEEPSEEK_API_KEY.slice(-4)}` : '',
      gemini_key: env.GOOGLE_API_KEY ? `${env.GOOGLE_API_KEY.substring(0, 8)}...${env.GOOGLE_API_KEY.slice(-4)}` : '',
      has_openai: !!(env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'your_api_key_here'),
      has_deepseek: !!(env.DEEPSEEK_API_KEY && env.DEEPSEEK_API_KEY !== 'your_deepseek_api_key_from_platform_deepseek_com'),
      has_gemini: !!(env.GOOGLE_API_KEY && env.GOOGLE_API_KEY !== 'your_api_key_here'),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/ai-config', verifySuperAdmin, async (req: any, res) => {
  try {
    const { provider, openai_key, deepseek_key, gemini_key } = req.body;
    const validProviders = ['openai', 'deepseek', 'gemini'];
    if (provider && !validProviders.includes(provider)) {
      return res.status(400).json({ error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` });
    }

    if (IS_SUPABASE_MODE && supabaseAdmin) {
      const { data: existing } = await supabaseAdmin.from('ai_config').select('*').eq('id', 'default').maybeSingle();
      const updates: any = { updated_at: new Date().toISOString() };
      if (provider) updates.provider = provider;
      if (openai_key) updates.openai_key = openai_key;
      if (deepseek_key) updates.deepseek_key = deepseek_key;
      if (gemini_key) updates.gemini_key = gemini_key;

      if (existing) {
        const { error } = await supabaseAdmin.from('ai_config').update(updates).eq('id', 'default');
        if (error) return res.status(500).json({ error: error.message });
      } else {
        const { error } = await supabaseAdmin.from('ai_config').insert({ id: 'default', ...updates });
        if (error) return res.status(500).json({ error: error.message });
      }

      const { setProviderConfig, getDefaultConfig } = await import('./src/services/ai-provider');
      const { data: fresh } = await supabaseAdmin.from('ai_config').select('*').eq('id', 'default').single();
      if (fresh) {
        setProviderConfig({
          provider: fresh.provider,
          openaiKey: fresh.openai_key || '',
          deepseekKey: fresh.deepseek_key || '',
          geminiKey: fresh.gemini_key || '',
        });
      }

      return res.json({ success: true, provider: provider || existing?.provider || 'gemini' });
    }

    if (provider) process.env.AI_PROVIDER = provider;
    if (openai_key) process.env.OPENAI_API_KEY = openai_key;
    if (deepseek_key) process.env.DEEPSEEK_API_KEY = deepseek_key;
    if (gemini_key) process.env.GOOGLE_API_KEY = gemini_key;

    const { setProviderConfig } = await import('./src/services/ai-provider');
    setProviderConfig({
      provider: (process.env.AI_PROVIDER as any) || 'gemini',
      openaiKey: process.env.OPENAI_API_KEY || '',
      deepseekKey: process.env.DEEPSEEK_API_KEY || '',
      geminiKey: process.env.GOOGLE_API_KEY || '',
    });

    res.json({ success: true, provider: provider || 'gemini' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// VITE DEV MIDDLEWARE + SPA FALLBACK
// -------------------------------------------------------------
// On Vercel: export the Express app as a serverless function (API routes only).
// Locally: start Vite dev server with SSR middleware.
// Production (non-Vercel): serve built static files.

async function bootServer() {
  if (process.env.VERCEL === '1') return;

  const PORT = process.env.PORT || 3001;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res) => {
      try {
        const html = await vite.transformIndexHtml(req.url, `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            <meta name="theme-color" content="#0f172a" />
            <link rel="apple-touch-icon" href="/pwa-icon-192.png" />
            <link rel="manifest" href="/manifest.webmanifest" />
            <title>Zawadi — Scholarships for Africa</title>
          </head>
          <body>
            <div id="root"></div>
            <script type="module" src="/src/main.tsx"></script>
          </body>
        </html>
      `);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        res.status(500).end(e.message);
      }
    });
  }

  app.listen(PORT, () => {
    console.log(`[SERVER] Running on port ${PORT}${isProduction ? '' : ' (Vite dev mode)'}`);
  });
}

bootServer();

export default app;

