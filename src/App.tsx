import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import { Scholarship, UserProfile, ApplicationTracker as TrackerType, DocumentVaultItem, EssayStudioGeneration, BotQueueIngestion, AuditLogItem } from './types';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { Logo } from './components/Logo';
import ProfileSetupWizard from './components/ProfileSetupWizard';
import toast, { Toaster } from 'react-hot-toast';
import { AFRICAN_COUNTRIES } from './config/matching-config';
import { supabase } from './lib/supabase';
import { computeScholarshipMatch } from './lib/matching-engine';
import { analyzeWritingVoice, generateStyleSummary } from './services/essay-voice-learner';
import {
  getPublishedScholarships,
  getAllScholarships,
  upsertScholarship,
  deleteScholarship,
  bulkDeleteScholarships,
  bulkSetPublished,
  togglePublishScholarship,
  autoUnpublishExpiredScholarships,
  getProfileByEmail,
  upsertProfile,
  getUserApplications,
  upsertApplication,
  deleteApplication,
  getUserDocuments,
  uploadDocumentToStorage,
  insertDocument,
  deleteDocument,
  getUserEssays,
  getBotIngestions,
  getAuditLogs,
} from './lib/supabase-queries';

function ScholarshipRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/scholarships/browse/${slug}`} replace />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex gap-4">
        {[1, 2, 3].map(i => <div key={i} className="h-12 bg-surface-container-high rounded-2xl flex-1" />)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 bg-surface-container-high rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4 h-56 bg-surface-container-high rounded-3xl" />
        <div className="col-span-12 lg:col-span-8 h-56 bg-surface-container-high rounded-3xl" />
        <div className="col-span-12 md:col-span-6 lg:col-span-4 h-48 bg-surface-container-high rounded-3xl" />
        <div className="col-span-12 md:col-span-6 lg:col-span-8 h-48 bg-surface-container-high rounded-3xl" />
      </div>
    </div>
  );
}

const LandingPage = lazy(() => import('./components/LandingPage'));
import LandingHeader from './components/landing/LandingHeader';
import LandingFooter from './components/landing/LandingFooter';
const AuthScreen = lazy(() => import('./components/AuthScreen'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const Scholarships = lazy(() => import('./components/Scholarships'));
const DocumentVault = lazy(() => import('./components/DocumentVault'));
const PublicScholarshipList = lazy(() => import('./pages/public/PublicScholarshipList'));
const PublicScholarshipDetail = lazy(() => import('./pages/public/PublicScholarshipDetail'));
const ComingSoonPage = lazy(() => import('./components/ComingSoonPage'));
const EssayGenerator = lazy(() => import('./components/EssayGenerator'));
const AdminPortal = lazy(() => import('./components/AdminPortal'));
const StudentProfile = lazy(() => import('./components/StudentProfile'));
const SubscriptionPlans = lazy(() => import('./components/SubscriptionPlans'));
const AboutPage = lazy(() => import('./components/AboutPage'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./components/TermsOfService'));
const FAQPage = lazy(() => import('./components/FAQPage'));
const ContactPage = lazy(() => import('./components/ContactPage'));
const HowItWorksPage = lazy(() => import('./components/HowItWorksPage'));
const NotFoundPage = lazy(() => import('./components/NotFoundPage'));
const ApplicationTracker = lazy(() => import('./components/ApplicationTracker'));
const AdminLoginPage = lazy(() => import('./components/AdminLoginPage'));
const ForgotPassword = lazy(() => import('./components/ForgotPassword'));
const ResetPassword = lazy(() => import('./components/ResetPassword'));
const MentorPortal = lazy(() => import('./components/MentorPortal'));

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [applications, setApplications] = useState<TrackerType[]>([]);
  const [documents, setDocuments] = useState<DocumentVaultItem[]>([]);
  const [essays, setEssays] = useState<EssayStudioGeneration[]>([]);
  const [botQueue, setBotQueue] = useState<BotQueueIngestion[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const [authLoading, setAuthLoading] = useState(true);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  const fetchUserDataIdRef = useRef(0);
  const profileSetupDismissedRef = useRef(false);
  const paymentCallbackHandledRef = useRef(false);

  // Handle Paystack redirect callback (mobile money flow)
  useEffect(() => {
    if (paymentCallbackHandledRef.current) return;
    const params = new URLSearchParams(location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) return;
    paymentCallbackHandledRef.current = true;
    // Strip query params from URL
    window.history.replaceState({}, '', location.pathname);
    // Verify payment in the background
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error('Payment completed! Please log in again to activate your subscription.');
          return;
        }
        const { data, error } = await supabase.functions.invoke('process-payment', {
          body: { action: 'verify', reference }
        });
        if (!error && data?.user) {
          setUser(data.user);
          toast.success('Subscription activated successfully!');
        } else {
          toast.error(data?.error || error?.message || 'Payment verification pending. It may take a moment.');
        }
      } catch {
        toast.error('Could not verify payment. Please contact support.');
      }
    })();
  }, [location.search]);

  const countries = AFRICAN_COUNTRIES.map(c => c.name);

  const tabToPath: Record<string, string> = {
    dashboard: '/dashboard', scholarships: '/scholarships',
    vault: '/vault', essays: '/essays', profile: '/profile',
    billing: '/billing', admin: '/admin', tracker: '/applications',
    mentor: '/mentor',
  };
  const pathToTab: Record<string, string> = {
    '/dashboard': 'dashboard', '/scholarships': 'scholarships',
    '/vault': 'vault', '/essays': 'essays', '/profile': 'profile',
    '/billing': 'billing', '/admin': 'admin', '/applications': 'tracker',
    '/mentor': 'mentor',
  };

  const currentTab = pathToTab[location.pathname] || '';
  const isPublicPage = ['/', '/about', '/faq', '/privacy', '/terms', '/how-it-works', '/contact', '/forgot-password', '/reset-password', '/scholarships'].includes(location.pathname) || location.pathname.startsWith('/scholarships/');

  const ownsChrome = location.pathname === '/' || location.pathname === '/scholarships/browse' || location.pathname.startsWith('/scholarships/browse') || location.pathname === '/scholarships';
  const hideHeaderFooter = (!isPublicPage && !user) || ownsChrome;

  const handleNavigateToTab = (tab: string) => {
    const path = tabToPath[tab];
    if (path) navigate(path);
    else if (tab === 'home') { navigate('/'); setShowAuth(false); }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        (async () => {
          try {
            const userEmail = session.user.email || '';
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .or(`email.eq.${userEmail},id.eq.${session.user.id}`)
              .maybeSingle();
            if (!error && profile) {
              setUser(profile as UserProfile);
            } else {
              setUser({
                email: session.user.email!,
                name: session.user.user_metadata?.name || '',
                country: session.user.user_metadata?.country || '',
                role: 'user',
                plan: 'explorer',
                joined_at: session.user.created_at ?? new Date().toISOString(),
                status: 'active',
              });
            }
          } catch {
            // Ignored
          } finally {
            setAuthLoading(false);
          }
        })();
      } else {
        setAuthLoading(false);
      }
    }).catch(() => {
      setAuthLoading(false);
    });
  }, []);

  // Scholarships load once via fetchUserData after login (or via the public
  // API for guests) — a second fetch here doubled the payload on every login.
  useEffect(() => {
    if (user?.email) fetchUserData(user.email);
  }, [user?.email]);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'super_admin' || user.role === 'content_manager') {
      setProfileReady(true);
      return;
    }
    const hasProfileFields = user.degree_level && user.field_of_study && user.age && user.gpa && user.country;
    if (hasProfileFields) {
      setShowProfileSetup(false);
      setProfileReady(true);
    } else if (profileSetupDismissedRef.current) {
      setProfileReady(true);
    } else {
      setShowProfileSetup(true);
      setProfileReady(false);
    }
  }, [user]);

  useEffect(() => {
    const handler = () => {
      if (user?.role !== 'super_admin' && user?.role !== 'content_manager') {
        setShowProfileSetup(true);
      }
    };
    window.addEventListener('open-profile-setup', handler);
    return () => window.removeEventListener('open-profile-setup', handler);
  }, [user?.role]);

  useEffect(() => {
    const handler = () => {
      setShowAuth(true);
    };
    window.addEventListener('open-auth', handler);
    return () => window.removeEventListener('open-auth', handler);
  }, []);

  useEffect(() => {
    const handler = () => handleLogout();
    window.addEventListener('Techsari-signout', handler);
    return () => window.removeEventListener('Techsari-signout', handler);
  });

  useEffect(() => {
    if (!showAuth) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowAuth(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showAuth]);

  const fetchScholarships = async (_email?: string) => {
    try {
      const isAdmin = user?.role === 'super_admin' || user?.role === 'content_manager';
      if (isAdmin) {
        try { await autoUnpublishExpiredScholarships(); } catch {}
      }
      let result;
      if (isAdmin) {
        result = await getAllScholarships();
      } else {
        result = await getPublishedScholarships();
      }
      const { data, error } = result;
      if (!error && data) {
        let scholarships = data as Scholarship[];
        if (_email) {
          try {
            const { data: profile } = await getProfileByEmail(_email);
            const { data: userDocs } = await getUserDocuments(_email);
            if (profile) {
              scholarships = scholarships.map(s => ({
                ...s,
                match: computeScholarshipMatch(s, profile, userDocs || [])
              }));
              scholarships.sort((a, b) => (b.match?.score || 0) - (a.match?.score || 0));
            }
          } catch (e) {
            console.error("Error computing match scores", e);
            toast.error("Could not compute scholarship matches");
          }
        }
        setScholarships(scholarships);
      }
    } catch (e) {
      console.error("Error loading scholarships database", e);
    }
  };

  const fetchUserData = async (email: string) => {
    const requestId = ++fetchUserDataIdRef.current;
    try {
      const { data: profile, error: uErr } = await getProfileByEmail(email);
      if (!uErr && profile && fetchUserDataIdRef.current === requestId) setUser(profile as UserProfile);
      if (fetchUserDataIdRef.current !== requestId) return;
      fetchScholarships(email);
      const { data: tData } = await getUserApplications(email);
      if (tData && fetchUserDataIdRef.current === requestId) setApplications(tData as TrackerType[]);
      const { data: dData } = await getUserDocuments(email);
      if (dData && fetchUserDataIdRef.current === requestId) setDocuments(dData as DocumentVaultItem[]);
      const { data: eData } = await getUserEssays(email);
      if (eData && fetchUserDataIdRef.current === requestId) setEssays(eData as EssayStudioGeneration[]);
      if (user?.role === 'super_admin' && fetchUserDataIdRef.current === requestId) {
        const { data: bData } = await getBotIngestions();
        if (bData) setBotQueue(bData as BotQueueIngestion[]);
        const { data: lData } = await getAuditLogs();
        if (lData) setAuditLogs(lData as AuditLogItem[]);
      }
    } catch (e) {
      console.error("Error synchronizing sandbox state", e);
    }
  };

  const handleLoginSuccess = async (email: string, token?: string) => {
    try {
      // Read the freshly-established local session instead of re-validating
      // over the network (getUser adds a round-trip that stalls on slow links).
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user;
      if (authUser) {
        const userEmail = email || authUser.email || '';
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .or(`email.eq.${userEmail},id.eq.${authUser.id}`)
          .maybeSingle();

        if (!error && profile) {
          setUser(profile as UserProfile);
          setShowAuth(false);
          if (profile.role === 'super_admin') {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        } else {
          // Fallback: construct basic user from session metadata
          const basicUser: UserProfile = {
            email: authUser.email!,
            name: authUser.user_metadata?.name || '',
            country: authUser.user_metadata?.country || '',
            role: 'user',
            plan: 'explorer',
            joined_at: authUser.created_at ?? new Date().toISOString(),
            status: 'active',
          };
          setUser(basicUser);
          setShowAuth(false);
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('Login profile sync error', err);
    }
  };

  const handleLogout = () => {
    supabase.auth.signOut();
    setUser(null);
    profileSetupDismissedRef.current = false;
    setShowAuth(false);
    setApplications([]);
    setDocuments([]);
    setEssays([]);
    setBotQueue([]);
    setAuditLogs([]);
    navigate('/');
  };

  const handleTrackScholarship = async (scholarshipId: string, status: string, notes = '', priority = 'Normal') => {
    if (!user) return;
    try {
      const application = { user_email: user.email, scholarship_id: scholarshipId, status, notes, priority };
      const { data, error } = await upsertApplication(application);
      if (!error && data) {
        setApplications(prev => {
          const filtered = prev.filter(a => a.scholarship_id !== scholarshipId);
          if (status !== 'not_started') filtered.push(data as TrackerType);
          return filtered;
        });
      } else if (error) {
        console.error("Stage update failed", error);
        toast.error(error.message || 'Could not update the stage. Try again.');
      }
    } catch (e: any) {
      console.error("Error setting scholarship milestone state", e);
      toast.error(e?.message || 'Could not update the stage. Try again.');
    }
  };

  const handleRemoveTrack = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await deleteApplication(id);
      if (!error) {
        setApplications(prev => prev.filter(a => a.id !== id));
        toast.success("Scholarship removed from your tracker");
      } else {
        toast.error(error.message || "Failed to stop tracking this scholarship.");
      }
    } catch (err) { console.error("Error deleting tracked application", err); }
  };

  const handleUploadDocument = async (file: File, docType: string) => {
    if (!user) return;
    try {
      const { storagePath } = await uploadDocumentToStorage(user.email, file, docType);
      const doc = {
        id: crypto.randomUUID(),
        user_email: user.email,
        name: file.name,
        type: docType,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        file_path: storagePath,
        mime_type: file.type,
        uploaded_at: new Date().toISOString(),
      };
      const { data, error } = await insertDocument(doc);
      if (error) throw new Error(error.message || 'Failed to save document metadata');
      if (data) {
        const insertedDoc = data as DocumentVaultItem;
        setDocuments(prev => [...prev, insertedDoc]);
        // Fire-and-forget AI document analysis via Edge Function + client fallback
        (async () => {
          try {
            const arrayBuf = await file.arrayBuffer();
            const buffer = new Uint8Array(arrayBuf);
            const { extractTextFromBuffer } = await import('./services/text-extractor');
            const extraction = await extractTextFromBuffer(buffer, file.type, file.name);
            const trimmed = extraction.text?.trim() || '';
            if (trimmed.length < 50) {
              await supabase.from('documents').update({
                analysis_status: 'failed',
                analysis_error: extraction.warning || `Could not extract sufficient text (${trimmed.length} chars). Try uploading a text-based PDF or DOCX.`,
                last_analyzed_at: new Date().toISOString(),
              }).eq('id', insertedDoc.id);
            } else {
              const analysis = await invokeDocAnalysis(insertedDoc.id, docType, trimmed, user.email);
              await supabase.from('documents').update({
                analysis_status: analysis.ok ? 'completed' : (analysis.retryable ? 'pending' : 'failed'),
                analysis_error: analysis.ok ? null : (analysis.error || 'Analysis will retry automatically.'),
                last_analyzed_at: new Date().toISOString(),
              }).eq('id', insertedDoc.id);
            }
            handleRefreshDocuments();
          } catch (err) {
            console.error("AI document analysis failed", err);
            const errMsg = err instanceof Error ? err.message : 'Unknown error';
            if (!errMsg.includes('Unsupported file type')) {
              try {
                await supabase.from('documents').update({
                  analysis_status: 'pending',
                  analysis_error: 'Analysis service unavailable. Document saved successfully.',
                  last_analyzed_at: new Date().toISOString(),
                }).eq('id', insertedDoc.id);
              } catch {}
            }
          }
        })();
      }
    } catch (err: any) {
      console.error("Upload handler error", err);
      const msg = err?.message || err?.error || (typeof err === 'string' ? err : '') || 'Upload failed. Check that the storage bucket "scholarship-docs" exists and you have run migration 004.';
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const handleRemoveDoc = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await deleteDocument(id);
      if (!error) setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) { console.error("Removal folder error", err); }
  };

  const handleUpdateProfile = async (updatedFields: any) => {
    if (!user?.email) { toast.error('Session expired. Please log in again.'); return; }
    try {
      const sanitized = { ...updatedFields };
      const numericFields = ['gpa', 'work_experience_years', 'publications', 'age'];
      for (const key of numericFields) {
        if (sanitized[key] === '' || sanitized[key] === undefined || sanitized[key] === null) {
          sanitized[key] = null;
        }
      }
      // Track which fields the user has explicitly confirmed for the Onboarding Guide
      const existingConfirmed: string[] = user.confirmed_fields || [];
      const newConfirmed: string[] = Object.keys(sanitized).filter(
        k => sanitized[k] !== null && sanitized[k] !== undefined && sanitized[k] !== ''
      );
      const mergedConfirmed = [...new Set([...existingConfirmed, ...newConfirmed])];
      sanitized.confirmed_fields = mergedConfirmed;
      const { data, error } = await upsertProfile({ email: user.email, ...sanitized });
      if (error) throw new Error(error.message || `Server error`);
      if (data) {
        setUser(data as UserProfile);
        fetchUserData(data.email);
        toast.success('Profile saved successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile');
      throw err;
    }
  };

  interface DocAnalysisResult { ok: boolean; error?: string; retryable?: boolean }

  async function invokeDocAnalysis(documentId: string, docType: string, textContent: string, userEmail: string): Promise<DocAnalysisResult> {
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/document-analysis`;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        const res = await fetch(fnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ action: 'analyze', documentId, docType, textContent }),
          signal: AbortSignal.timeout(25000),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const errMsg = errBody?.error || `Analysis failed (HTTP ${res.status})`;
          console.error(`[invokeDocAnalysis] HTTP ${res.status}:`, errBody);
          // 4xx is deterministic (auth/validation/schema) — retrying cannot help
          if (res.status >= 400 && res.status < 500) return { ok: false, error: errMsg, retryable: false };
          if (attempt === 0) { await new Promise(r => setTimeout(r, 2000)); continue; }
          return { ok: false, error: errMsg, retryable: true };
        }
        const result = await res.json();
        return result?.success === true ? { ok: true } : { ok: false, error: 'Analysis returned no result', retryable: true };
      } catch (err: any) {
        console.error(`[invokeDocAnalysis] attempt ${attempt + 1} failed:`, err);
        if (attempt === 0) { await new Promise(r => setTimeout(r, 2000)); continue; }
        const msg = err?.name === 'TimeoutError' ? 'Analysis timed out' : (err?.message || 'Analysis service unreachable');
        return { ok: false, error: msg, retryable: true };
      }
    }
    return { ok: false, error: 'Analysis service unreachable', retryable: true };
  }

  const handleReanalyzeDocument = async (doc: DocumentVaultItem) => {
    if (!user) return;
    try {
      const { data: fileData, error: dlError } = await supabase.storage
        .from('scholarship-docs')
        .download(doc.file_path!);
      if (dlError || !fileData) throw new Error(dlError?.message || 'Could not download file');
      const arrayBuf = await fileData.arrayBuffer();
      const buffer = new Uint8Array(arrayBuf);
      const { extractTextFromBuffer } = await import('./services/text-extractor');
      const extraction = await extractTextFromBuffer(buffer, doc.mime_type || 'application/pdf', doc.name);
      const textContent = extraction.text;
      const trimmed = textContent?.trim() || '';
      if (trimmed.length < 50) {
        await supabase.from('documents').update({
          analysis_status: 'failed',
          analysis_error: 'Could not extract sufficient text for analysis',
          last_analyzed_at: new Date().toISOString(),
        }).eq('id', doc.id);
        toast.error('Could not extract enough text from this document');
      } else {
        const analysis = await invokeDocAnalysis(doc.id, doc.type, trimmed, user.email);
        if (!analysis.ok) {
          toast.error(analysis.error || 'Document analysis failed. The document will be retried automatically.');
        } else {
          toast.success('Document analyzed successfully!');
        }
      }
      handleRefreshDocuments();
    } catch (err: any) {
      console.error("Re-analysis failed", err);
      toast.error(err?.message || 'Re-analysis failed');
    }
  };

  const handleRefreshDocuments = async () => {
    if (!user) return;
    try {
      const { data: dData } = await getUserDocuments(user.email);
      if (dData) setDocuments(dData as DocumentVaultItem[]);
    } catch {}
  };

  const handleGenerateEssay = async (essayType: string, scholarshipName: string, prompt: string, stage: 'draft' | 'critique' | 'polish', previousContent?: string, wordCount?: number, documentIds?: string[]) => {
    if (!user) throw new Error("Authentication mandatory");
    const { data: resData, error: invokeErr } = await supabase.functions.invoke('generate-essay', {
      body: { email: user.email, essay_type: essayType, scholarship_name: scholarshipName, prompt, stage, previous_content: previousContent, word_count: wordCount, document_ids: documentIds }
    });
    if (invokeErr || !resData) {
      const err = new Error(invokeErr?.message || resData?.error || "Generation endpoint faulted.");
      (err as any).status = invokeErr ? 500 : 400;
      throw err;
    }
    const essayId = resData.id || resData.essay?.id || "temp";
    if (resData.id || resData.essay) {
      setEssays(prev => {
        const existing = prev.find((e: any) => e.scholarship_name === scholarshipName && e.essay_type === essayType);
        const payload = existing || { id: essayId, user_email: user.email, scholarship_name: scholarshipName, essay_type: essayType, prompt, draft: resData.content, final: '', critique: '' };
        if (stage === 'draft') payload.draft = resData.content;
        else if (stage === 'polish') payload.final = resData.content;
        else payload.critique = resData.content;
        const filtered = prev.filter(e => e.id !== (existing?.id || essayId));
        return [...filtered, payload];
      });
    }
    
    // Voice learning: after polish stage, analyze writing style (fire-and-forget)
    if (stage === 'polish' && resData.content && resData.content.length > 100) {
      (async () => {
        try {
          const samples = essays
            .filter((e: any) => e.draft || e.final)
            .map((e: any) => [e.draft, e.critique, e.final].filter(Boolean).join('\n'))
            .concat([resData.content]);
          const { profile, style_notes } = await analyzeWritingVoice(user.email, samples);
          if (profile) {
            await upsertProfile({
              email: user.email,
              voice_profile: profile,
              essay_style_notes: style_notes || '',
              essays_written: (user.essays_written || 0) + 1,
            });
          }
        } catch { /* voice learning is non-critical */ }
      })();
    }
    
    return { id: essayId, content: resData.content, remaining_today: resData.remaining_today, daily_limit: resData.daily_limit };
  };

  const handleAddScholarship = async (scholPayload: Partial<Scholarship>) => {
    if (!user) return;
    try {
      const { data, error } = await upsertScholarship(scholPayload);
      if (!error && data) {
        setScholarships(prev => {
          const exists = prev.some(s => s.id === data.id);
          if (exists) return prev.map(s => s.id === data.id ? data as Scholarship : s);
          return [...prev, data as Scholarship];
        });
        toast.success("Listing saved successfully!");
        fetchUserData(user.email);
        fetch('https://www.google.com/ping?sitemap=https://www.techsari.online/sitemap.xml').catch(() => {});
      }
    } catch (err) { console.error("CRUD insertion error", err); }
  };

  const handleRemoveScholarship = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await deleteScholarship(id);
      if (!error) {
        setScholarships(prev => prev.filter(s => s.id !== id));
        fetchUserData(user.email);
        toast.success("Opportunity removed");
      }
    } catch (err) { console.error("CRUD deletion error", err); }
  };

  const handleTogglePublish = async (id: string) => {
    if (!user) return;
    try {
      const current = scholarships.find(s => s.id === id);
      const { data, error } = await togglePublishScholarship(id, current?.published ?? false);
      if (!error && data) {
        setScholarships(prev => prev.map(s => s.id === id ? { ...s, published: data.published ?? !s.published } : s));
        fetch('https://www.google.com/ping?sitemap=https://www.techsari.online/sitemap.xml').catch(() => {});
        toast.success(data.published ? "Opportunity published" : "Opportunity unpublished");
      } else {
        toast.error(`Toggle failed: ${error?.message || 'Server error'}`);
      }
    } catch (err) { console.error("Toggle publish error", err); }
  };

  const handleBulkSetPublished = async (ids: string[], published: boolean) => {
    if (!user) return;
    try {
      const { error } = await bulkSetPublished(ids, published);
      if (!error) {
        setScholarships(prev => prev.map(s => ids.includes(s.id) ? { ...s, published } : s));
        toast.success(`${published ? 'Published' : 'Unpublished'} ${ids.length} listing${ids.length === 1 ? '' : 's'}`);
      } else {
        toast.error(`Bulk update failed: ${error.message || 'Server error'}`);
      }
    } catch (err) { console.error("Bulk publish error", err); }
  };

  const handleBulkRemoveScholarships = async (ids: string[]) => {
    if (!user) return;
    try {
      const { error } = await bulkDeleteScholarships(ids);
      if (!error) {
        setScholarships(prev => prev.filter(s => !ids.includes(s.id)));
        fetchUserData(user.email);
        toast.success(`Successfully removed ${ids.length} selected opportunities!`);
      } else {
        toast.error(`Bulk deletion failed: ${error.message || 'Server error'}`);
      }
    } catch (err) { console.error("Bulk CRUD deletion error", err); }
  };

  const handleTriggerScrapeCampaign = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke('run-pipeline', {
        body: { action: 'trigger' }
      });
      if (!error && data) { setBotQueue(data.bot_queue); fetchUserData(user.email); }
    } catch (err) { console.error("Ingestion crawler failed", err); }
  };

  const handleReviewBotItem = async (id: string, status: 'approved' | 'rejected', _notes = '') => {
    if (!user) return;
    try {
      const { error } = await supabase.functions.invoke('run-pipeline', {
        body: { action: 'review', id, status }
      });
      if (!error) { setBotQueue(prev => prev.filter(b => b.id !== id)); fetchScholarships(); fetchUserData(user.email); }
    } catch (err) { console.error("Moderation error", err); }
  };


  if (authLoading && !isPublicPage) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-surface-container-lowest gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-on-surface-variant font-medium">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest text-on-surface font-body min-h-[100dvh] flex flex-col">

      {/* Unified header — same chrome for guests and scholars */}
      <LandingHeader
        user={user}
        onGetStarted={() => setShowAuth(true)}
        onLogin={() => setShowAuth(true)}
      />


      {/* Main Content */}
      <main className={ownsChrome ? 'flex-grow w-full' : 'flex-grow max-w-[1200px] w-full mx-auto px-4 md:px-10 py-10'}>
        <Suspense fallback={<div className="py-24 text-center text-xs text-on-surface-variant">Loading...</div>}>
          {!user && showAuth && (
            <div
              className="fixed inset-0 z-[90] bg-off-black-ink/65 backdrop-blur-sm overflow-y-auto"
              onClick={() => setShowAuth(false)}
              role="dialog"
              aria-modal="true"
              aria-label="Sign in or create an account"
            >
              <div className="min-h-full flex items-center justify-center p-4">
                <div onClick={e => e.stopPropagation()} className="w-full max-w-md">
                  <AuthScreen
                    onLoginSuccess={handleLoginSuccess}
                    countries={countries}
                    onClose={() => setShowAuth(false)}
                  />
                </div>
              </div>
            </div>
          )}
          <Routes>
              <Route path="/" element={<LandingPage user={user} onGetStarted={() => setShowAuth(true)} onLogin={() => setShowAuth(true)} countries={countries} onViewAllFAQs={() => navigate('/faq')} />} />
              <Route path="/about" element={<AboutPage onBack={() => navigate('/')} />} />
              <Route path="/faq" element={<FAQPage onBack={() => navigate('/')} />} />
              <Route path="/privacy" element={<PrivacyPolicy onBack={() => navigate('/')} />} />
              <Route path="/terms" element={<TermsOfService onBack={() => navigate('/')} />} />
              <Route path="/how-it-works" element={<HowItWorksPage onBack={() => navigate('/')} onGetStarted={() => { setShowAuth(true); navigate('/'); }} />} />
              <Route path="/scholarships/browse" element={<Suspense fallback={<div className="py-24 text-center text-xs text-on-surface-variant">Loading scholarships...</div>}><PublicScholarshipList user={user} /></Suspense>} />
              <Route path="/scholarships/browse/:slug" element={<Suspense fallback={<div className="py-24 text-center text-xs text-on-surface-variant">Loading...</div>}><PublicScholarshipDetail user={user} /></Suspense>} />
              <Route path="/scholarships/:slug" element={<ScholarshipRedirect />} />
              <Route path="/scholarships" element={<Suspense fallback={<div className="py-24 text-center text-xs text-on-surface-variant">Loading scholarships...</div>}><Scholarships user={user} scholarships={scholarships} applications={applications} documents={documents} onTrackScholarship={handleTrackScholarship} onUploadMetadata={handleUploadDocument} onNavigateToTab={handleNavigateToTab} /></Suspense>} />
              <Route path="/contact" element={<ContactPage onBack={() => navigate('/')} />} />
              <Route path="/forgot-password" element={<Suspense fallback={null}><ForgotPassword onBack={() => { setShowAuth(false); navigate('/'); }} /></Suspense>} />
              <Route path="/reset-password" element={<Suspense fallback={null}><ResetPassword onBackToLogin={() => { setShowAuth(false); navigate('/'); }} /></Suspense>} />
              <Route path="/admin/login" element={<Suspense fallback={null}><AdminLoginPage /></Suspense>} />
              <Route path="/admin" element={
                !user
                  ? <Navigate to="/admin/login" replace />
                  : user.role !== 'super_admin'
                    ? <Navigate to="/admin/login" replace />
                    : <Suspense fallback={<div className="py-24 text-center text-xs text-on-surface-variant">Loading admin...</div>}>
                        <AdminPortal user={user} scholarships={scholarships} botQueue={botQueue} auditLogs={auditLogs} onAddScholarship={handleAddScholarship} onRemoveScholarship={handleRemoveScholarship} onBulkRemoveScholarships={handleBulkRemoveScholarships} onBulkSetPublished={handleBulkSetPublished} onTogglePublish={handleTogglePublish} onTriggerScrapeCampaign={handleTriggerScrapeCampaign} onReviewBotItem={handleReviewBotItem} />
                      </Suspense>
              } />

              {user ? (
                <>
                  <Route path="/dashboard" element={
                    !profileReady ? (
                      <div className="flex flex-col items-center justify-center py-24">
                        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-xs text-on-surface-variant font-medium">Preparing your workspace...</p>
                      </div>
                    ) : (
                      <Suspense fallback={<DashboardSkeleton />}>
                        <Dashboard user={user} scholarships={scholarships} applications={applications} documents={documents} essays={essays} onNavigateToTab={handleNavigateToTab} onViewScholarship={(schol) => navigate(`/scholarships/browse/${schol.slug}`)} onTriggerQuickDraft={() => navigate('/essays')} />
                      </Suspense>
                    )
                  } />
                  <Route path="/vault" element={<Suspense fallback={<div className="py-24 text-center text-xs text-on-surface-variant">Loading vault...</div>}><DocumentVault user={user} documents={documents} onUploadDocument={handleUploadDocument} onRemoveDoc={handleRemoveDoc} onReanalyzeDocument={handleReanalyzeDocument} onNavigateToTab={handleNavigateToTab} onRefreshDocuments={handleRefreshDocuments} userEmail={user?.email} /></Suspense>} />
                  <Route path="/essays" element={
                    <Suspense fallback={<div className="py-24 text-center text-xs text-on-surface-variant">Loading AI Essay Studio...</div>}>
                      <EssayGenerator
                        user={user}
                        essays={essays}
                        scholarships={scholarships}
                        documents={documents}
                        onGenerateEssay={handleGenerateEssay}
                        onNavigateToTab={handleNavigateToTab}
                        onUploadMetadata={handleUploadDocument}
                      />
                    </Suspense>
                  } />
                  <Route path="/profile" element={<Suspense fallback={<div className="py-24 text-center text-xs text-on-surface-variant">Loading profile...</div>}><StudentProfile user={user} onUpdateProfile={handleUpdateProfile} onNavigateToTab={handleNavigateToTab} /></Suspense>} />
                  <Route path="/applications" element={<Suspense fallback={<div className="py-24 text-center text-xs text-on-surface-variant">Loading tracker...</div>}><ApplicationTracker scholarships={scholarships} applications={applications} onTrackScholarship={handleTrackScholarship} onRemoveTrack={handleRemoveTrack} onNavigateToTab={handleNavigateToTab} /></Suspense>} />
                  <Route path="/billing" element={<Suspense fallback={<div className="py-24 text-center text-xs text-on-surface-variant">Loading plans...</div>}><SubscriptionPlans user={user} onPlanUpdated={(u) => { setUser(u); fetchUserData(u.email); }} onNavigateToTab={handleNavigateToTab} /></Suspense>} />
                  <Route path="/mentor" element={<Suspense fallback={<div className="py-24 text-center text-xs text-on-surface-variant">Loading mentor portal...</div>}><MentorPortal user={user} onBack={() => navigate('/dashboard')} /></Suspense>} />
                  <Route path="*" element={<Suspense fallback={null}><NotFoundPage onBack={() => navigate('/')} /></Suspense>} />
                </>
              ) : (
                <Route path="*" element={<Suspense fallback={null}><NotFoundPage onBack={() => navigate('/')} /></Suspense>} />
              )}
            </Routes>
        </Suspense>
      </main>

      {/* Footer */}
      {user ? (
        <footer className="w-full border-t border-ash bg-pure-white">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Logo size={20} tone="dark" />
              <span className="text-ed-body-sm font-medium text-off-black-ink">Techsari</span>
            </div>
            <div className="flex items-center gap-5 text-ed-caption uppercase text-graphite">
              <Link to="/privacy" className="hover:text-off-black-ink transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-off-black-ink transition-colors">Terms</Link>
              <Link to="/contact" className="hover:text-off-black-ink transition-colors">Support</Link>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-graphite">
              <span className="w-1.5 h-1.5 rounded-full bg-electric-lime" aria-hidden />
              <span>© 2026 Techsari — AI-powered scholarship matching for African scholars</span>
            </div>
          </div>
        </footer>
      ) : (
        <LandingFooter />
      )}

      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <PWAInstallPrompt />

      {showProfileSetup && (
        <ProfileSetupWizard
          user={user}
          onSave={async (profile) => { try { await handleUpdateProfile(profile); setShowProfileSetup(false); setProfileReady(true); profileSetupDismissedRef.current = true; } catch {} }}
          onDismiss={() => { setShowProfileSetup(false); setProfileReady(true); profileSetupDismissedRef.current = true; }}
        />
      )}
    </div>
  );
}
