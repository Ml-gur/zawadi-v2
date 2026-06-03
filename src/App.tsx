import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { Scholarship, UserProfile, ApplicationTracker as TrackerType, DocumentVaultItem, EssayStudioGeneration, BotQueueIngestion, AuditLogItem } from './types';
import PWAInstallPrompt from './components/PWAInstallPrompt';
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
  togglePublishScholarship,
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
const AuthScreen = lazy(() => import('./components/AuthScreen'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const Scholarships = lazy(() => import('./components/Scholarships'));
const DocumentVault = lazy(() => import('./components/DocumentVault'));
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  const isPublicPage = ['/', '/about', '/faq', '/privacy', '/terms', '/how-it-works', '/contact', '/forgot-password', '/reset-password'].includes(location.pathname);

  const hideHeaderFooter = !isPublicPage && !user;

  const handleNavigateToTab = (tab: string) => {
    setMobileMenuOpen(false);
    const path = tabToPath[tab];
    if (path) navigate(path);
    else if (tab === 'home') { navigate('/'); setShowAuth(false); }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Store token for backward compat
        localStorage.setItem('zawadi_token', session.access_token);
        // Fetch the user profile from Supabase
        supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data: profile, error }) => {
          if (!error && profile) {
            setUser(profile as UserProfile);
            if (profile.role === 'super_admin') {
              localStorage.setItem('zawadi_admin_token', session.access_token);
            }
          } else {
            // Fallback: construct basic user from session
            setUser({
              email: session.user.email!,
              name: session.user.user_metadata?.name || '',
              country: session.user.user_metadata?.country || '',
              role: 'student',
              plan: 'explorer',
            } as UserProfile);
          }
        }).catch(() => {
          localStorage.removeItem('zawadi_token');
        });
      } else {
        localStorage.removeItem('zawadi_token');
      }
    }).catch(() => {
      localStorage.removeItem('zawadi_token');
    });
  }, []);

  useEffect(() => {
    fetchScholarships();
  }, []);

  useEffect(() => {
    if (user?.email) fetchUserData(user.email);
  }, [user?.email]);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'super_admin' || user.role === 'content_manager') {
      setProfileReady(true);
      return;
    }
    const hasProfileFields = user.degree_level && user.field_of_study && user.date_of_birth && user.gpa && user.country;
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

  const fetchScholarships = async (_email?: string) => {
    try {
      const isAdmin = user?.role === 'super_admin' || user?.role === 'content_manager';
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
    if (!token) return;
    localStorage.setItem('zawadi_token', token);
    try {
      // Fetch the user profile from Supabase using the authenticated session
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (!error && profile) {
          setUser(profile as UserProfile);
          setShowAuth(false);
          if (profile.role === 'super_admin') {
            localStorage.setItem('zawadi_admin_token', token);
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
            role: 'student',
            plan: 'explorer',
          } as UserProfile;
          setUser(basicUser);
          setShowAuth(false);
          navigate('/dashboard');
        }
      } else {
        localStorage.removeItem('zawadi_token');
      }
    } catch (err) {
      localStorage.removeItem('zawadi_token');
    }
  };

  const handleLogout = () => {
    supabase.auth.signOut();
    localStorage.removeItem('zawadi_token');
    localStorage.removeItem('zawadi_admin_token');
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
      const application = { email: user.email, user_email: user.email, scholarship_id: scholarshipId, status, notes, priority };
      const { data, error } = await upsertApplication(application);
      if (!error && data) {
        setApplications(prev => {
          const filtered = prev.filter(a => a.scholarship_id !== scholarshipId);
          if (status !== 'not_started') filtered.push(data as TrackerType);
          return filtered;
        });
      }
    } catch (e) {
      console.error("Error setting scholarship milestone state", e);
    }
  };

  const handleRemoveTrack = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await deleteApplication(id);
      if (!error) setApplications(prev => prev.filter(a => a.id !== id));
      else alert(error.message || "Failed to stop tracking this scholarship.");
    } catch (err) { console.error("Error deleting tracked application", err); }
  };

  const handleUploadDocument = async (file: File, docType: string) => {
    if (!user) return;
    try {
      const { storagePath } = await uploadDocumentToStorage(user.email, file, docType);
      const doc = {
        user_email: user.email,
        name: file.name,
        type: docType,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        file_path: storagePath,
        uploaded_at: new Date().toISOString(),
      };
      const { data, error } = await insertDocument(doc);
      if (!error && data) {
        const insertedDoc = data as DocumentVaultItem;
        setDocuments(prev => [...prev, insertedDoc]);
        // Fire-and-forget AI document analysis
        (async () => {
          try {
            const arrayBuf = await file.arrayBuffer();
            const buffer = new Uint8Array(arrayBuf);
            const { analyzeDocument } = await import('./services/document-intelligence');
            const { result, analyzed } = await analyzeDocument(
              buffer as any,
              docType,
              user.email,
              user.plan || 'explorer',
              file.type,
              file.name
            );
            if (analyzed && result) {
              const { error: updateErr } = await supabase
                .from('documents')
                .update({ ai_extraction_result: JSON.stringify(result) })
                .eq('id', insertedDoc.id);
              if (!updateErr) {
                handleRefreshDocuments();
              }
            }
          } catch (err) {
            console.error("AI document analysis failed", err);
          }
        })();
      }
    } catch (err) { console.error("Upload handler connection fault", err); }
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
      const { data, error } = await upsertProfile({ email: user.email, ...updatedFields });
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
        alert("Listing saved successfully!");
        fetchUserData(user.email);
      }
    } catch (err) { console.error("CRUD insertion error", err); }
  };

  const handleRemoveScholarship = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await deleteScholarship(id);
      if (!error) { setScholarships(prev => prev.filter(s => s.id !== id)); fetchUserData(user.email); }
    } catch (err) { console.error("CRUD deletion error", err); }
  };

  const handleTogglePublish = async (id: string) => {
    if (!user) return;
    try {
      const current = scholarships.find(s => s.id === id);
      const { data, error } = await togglePublishScholarship(id, current?.published ?? false);
      if (!error && data) {
        setScholarships(prev => prev.map(s => s.id === id ? { ...s, published: data.published ?? !s.published } : s));
      } else {
        alert(`Toggle failed: ${error?.message || 'Server error'}`);
      }
    } catch (err) { console.error("Toggle publish error", err); }
  };

  const handleBulkRemoveScholarships = async (ids: string[]) => {
    if (!user) return;
    try {
      const { error } = await bulkDeleteScholarships(ids);
      if (!error) { setScholarships(prev => prev.filter(s => !ids.includes(s.id))); fetchUserData(user.email); alert(`Successfully removed ${ids.length} selected opportunities!`); }
      else { alert(`Bulk deletion failed: ${error.message || 'Server error context'}`); }
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

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="bg-transparent text-on-surface font-sans min-h-screen flex flex-col">

      {/* Header */}
      {!hideHeaderFooter && (
        <header className="sticky top-0 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/60 z-40">
          <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center justify-between">

            <div className="flex items-center gap-6">
              <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 cursor-pointer hover:opacity-90">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-md font-display font-black">Z</div>
                <div>
                  <span className="font-display text-lg font-black text-primary tracking-tight whitespace-nowrap">Techsari Zawadi</span>
                  <span className="text-[9px] bg-primary-fixed text-primary px-1.5 py-0.5 rounded font-bold uppercase block w-max mt-0.5 tracking-wider">African Scholars</span>
                </div>
              </Link>

              {user && (
                <nav className="hidden lg:flex items-center gap-1 text-xs font-bold text-on-surface-variant uppercase tracking-tight">
                  {user.role !== 'super_admin' ? (
                    <>
                      <button onClick={() => navigate('/dashboard')} className={`px-3 py-2 rounded-lg hover:text-primary ${isActive('/dashboard') ? 'text-primary bg-primary/5' : ''}`}>Workspace</button>
                      <button onClick={() => navigate('/scholarships')} className={`px-3 py-2 rounded-lg hover:text-primary ${isActive('/scholarships') ? 'text-primary bg-primary/5' : ''}`}>Scholarships</button>
                      <button onClick={() => navigate('/vault')} className={`px-3 py-2 rounded-lg hover:text-primary ${isActive('/vault') ? 'text-primary bg-primary/5' : ''}`}>Doc Vault</button>
                      <button onClick={() => navigate('/essays')} className={`px-3 py-2 rounded-lg hover:text-primary ${isActive('/essays') ? 'text-primary bg-primary/5' : ''}`}>AI Essay Studio</button>
                      <button onClick={() => navigate('/profile')} className={`px-3 py-2 rounded-lg hover:text-primary ${isActive('/profile') ? 'text-primary bg-primary/5' : ''}`}>My Profile</button>
                      <button onClick={() => navigate('/billing')} className={`px-3 py-2 rounded-lg hover:text-primary ${isActive('/billing') ? 'text-primary bg-primary/5' : ''}`}>Premium Plans</button>
                    </>
                  ) : null}
                  {user.role === 'super_admin' && (
                    <>
                      <button onClick={() => navigate('/mentor')} className={`px-3 py-2 rounded-lg hover:text-primary ${isActive('/mentor') ? 'text-primary bg-primary/5' : ''}`}>Mentor Queue</button>
                      <button onClick={() => navigate('/admin')} className={`px-3.5 py-2 rounded-lg text-secondary bg-secondary-container/10 border border-secondary/20 hover:bg-secondary-container/30 ${isActive('/admin') ? 'bg-secondary-container/30 text-primary font-black' : ''}`}>System Control</button>
                    </>
                  )}
                </nav>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!user && (
                <nav className="hidden sm:flex items-center gap-4 text-xs font-bold text-on-surface-variant mr-4">
                  <button onClick={() => navigate('/about')} className="hover:text-primary transition-colors cursor-pointer">About</button>
                  <button onClick={() => navigate('/contact')} className="hover:text-primary transition-colors cursor-pointer">Contact</button>
                  <button onClick={() => navigate('/faq')} className="hover:text-primary transition-colors cursor-pointer">FAQ</button>
                </nav>
              )}
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-primary">{user.name || "Scholar Sandbox"}</p>
                    <p className="text-[10px] font-extrabold text-secondary flex items-center justify-end gap-1.5">
                      <span>{user.plan && user.plan.toLowerCase() !== 'explorer' ? user.plan.toUpperCase() + ' TIER' : 'FREE ACADEMIC ACCOUNT'}</span>
                      {(!user.plan || user.plan.toLowerCase() === 'explorer') && (
                        <button onClick={() => navigate('/billing')} className="bg-amber-500 hover:bg-amber-600 text-white font-black text-[9px] uppercase px-1.5 py-0.5 rounded cursor-pointer transition-all shrink-0">Upgrade</button>
                      )}
                    </p>
                  </div>
                  <button onClick={handleLogout} className="bg-surface hover:bg-surface-variant border border-outline-variant text-[11px] font-bold uppercase tracking-tight py-2 px-3.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3">
                  <button onClick={() => setShowAuth(true)} className="bg-transparent hover:bg-surface-container text-primary font-bold text-[11px] sm:text-xs px-3 sm:px-4 py-2.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap">Log In</button>
                  <button onClick={() => setShowAuth(true)} className="bg-primary hover:bg-primary-container text-on-primary font-bold text-[11px] sm:text-xs px-4 sm:px-6 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer whitespace-nowrap">Create Your Profile</button>
                </div>
              )}

              {user && (
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden text-primary p-2 cursor-pointer">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    {mobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
                  </svg>
                </button>
              )}
            </div>
          </div>

          {mobileMenuOpen && user && (
            <div className="lg:hidden border-t border-outline-variant bg-surface-container-lowest py-3 px-6 flex flex-col gap-2 shadow-inner">
              {user.role !== 'super_admin' ? (
                <>
                  <button onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }} className={`text-left text-xs font-bold uppercase tracking-wide py-2 ${isActive('/dashboard') ? 'text-primary' : 'text-on-surface-variant'}`}>Workspace Cockpit</button>
                  <button onClick={() => { navigate('/scholarships'); setMobileMenuOpen(false); }} className={`text-left text-xs font-bold uppercase tracking-wide py-2 ${isActive('/scholarships') ? 'text-primary' : 'text-on-surface-variant'}`}>Scholarships</button>
                  <button onClick={() => { navigate('/vault'); setMobileMenuOpen(false); }} className={`text-left text-xs font-bold uppercase tracking-wide py-2 ${isActive('/vault') ? 'text-primary' : 'text-on-surface-variant'}`}>Document Vault</button>
                  <button onClick={() => { navigate('/essays'); setMobileMenuOpen(false); }} className={`text-left text-xs font-bold uppercase tracking-wide py-2 ${isActive('/essays') ? 'text-primary' : 'text-on-surface-variant'}`}>AI Essay Studio</button>
                  <button onClick={() => { navigate('/profile'); setMobileMenuOpen(false); }} className={`text-left text-xs font-bold uppercase tracking-wide py-2 ${isActive('/profile') ? 'text-primary' : 'text-on-surface-variant'}`}>My Profile</button>
                  <button onClick={() => { navigate('/billing'); setMobileMenuOpen(false); }} className={`text-left text-xs font-bold uppercase tracking-wide py-2 ${isActive('/billing') ? 'text-primary' : 'text-on-surface-variant'}`}>Premium Plans</button>
                </>
              ) : null}
              {user.role === 'super_admin' && (
                <button onClick={() => { navigate('/admin'); setMobileMenuOpen(false); }} className={`text-left text-xs font-bold uppercase tracking-wide py-2 text-secondary ${isActive('/admin') ? 'font-black text-primary' : ''}`}>System Control</button>
              )}
            </div>
          )}
        </header>
      )}

      {/* Main Content */}
      <main className="flex-grow max-w-[1280px] w-full mx-auto px-6 py-8">
        <Suspense fallback={<div className="py-24 text-center text-xs text-on-surface-variant">Loading...</div>}>
          {!user && showAuth && location.pathname === '/' ? (
            <AuthScreen onLoginSuccess={handleLoginSuccess} countries={countries} />
          ) : (
            <Routes>
              <Route path="/" element={<LandingPage onGetStarted={() => setShowAuth(true)} onLogin={() => setShowAuth(true)} countries={countries} onViewAllFAQs={() => navigate('/faq')} />} />
              <Route path="/about" element={<AboutPage onBack={() => navigate('/')} />} />
              <Route path="/faq" element={<FAQPage onBack={() => navigate('/')} />} />
              <Route path="/privacy" element={<PrivacyPolicy onBack={() => navigate('/')} />} />
              <Route path="/terms" element={<TermsOfService onBack={() => navigate('/')} />} />
              <Route path="/how-it-works" element={<HowItWorksPage onBack={() => navigate('/')} onGetStarted={() => { setShowAuth(true); navigate('/'); }} />} />
              <Route path="/contact" element={<ContactPage onBack={() => navigate('/')} />} />
              <Route path="/forgot-password" element={<Suspense fallback={null}><ForgotPassword onBack={() => { setShowAuth(false); navigate('/'); }} /></Suspense>} />
              <Route path="/reset-password" element={<Suspense fallback={null}><ResetPassword onBackToLogin={() => { setShowAuth(false); navigate('/'); }} /></Suspense>} />
              <Route path="/admin/login" element={<Suspense fallback={null}><AdminLoginPage /></Suspense>} />
              <Route path="/admin" element={
                (() => {
                  const adminToken = localStorage.getItem('zawadi_admin_token');
                  if (!user) {
                    // Still loading session; check if admin token exists as fallback
                    if (adminToken) return <div className="py-24 text-center text-xs text-on-surface-variant">Loading...</div>;
                    return <Navigate to="/admin/login" replace />;
                  }
                  if (user.role !== 'super_admin') {
                    localStorage.removeItem('zawadi_admin_token');
                    return <Navigate to="/admin/login" replace />;
                  }
                  return <Suspense fallback={<div className="py-24 text-center text-xs text-on-surface-variant">Loading admin...</div>}><AdminPortal user={user} scholarships={scholarships} botQueue={botQueue} auditLogs={auditLogs} onAddScholarship={handleAddScholarship} onRemoveScholarship={handleRemoveScholarship} onBulkRemoveScholarships={handleBulkRemoveScholarships} onTogglePublish={handleTogglePublish} onTriggerScrapeCampaign={handleTriggerScrapeCampaign} onReviewBotItem={handleReviewBotItem} /></Suspense>;
                })()
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
                        <Dashboard user={user} scholarships={scholarships} applications={applications} documents={documents} essays={essays} onNavigateToTab={handleNavigateToTab} onViewScholarship={() => navigate('/scholarships')} onTriggerQuickDraft={() => navigate('/essays')} />
                      </Suspense>
                    )
                  } />
                  <Route path="/scholarships" element={<Suspense fallback={<div className="py-24 text-center text-xs text-on-surface-variant">Loading scholarships...</div>}><Scholarships user={user} scholarships={scholarships} applications={applications} documents={documents} onTrackScholarship={handleTrackScholarship} onUploadMetadata={handleUploadDocument} onNavigateToTab={handleNavigateToTab} /></Suspense>} />
                  <Route path="/vault" element={<Suspense fallback={<div className="py-24 text-center text-xs text-on-surface-variant">Loading vault...</div>}><DocumentVault user={user} documents={documents} onUploadDocument={handleUploadDocument} onRemoveDoc={handleRemoveDoc} onNavigateToTab={handleNavigateToTab} onRefreshDocuments={handleRefreshDocuments} /></Suspense>} />
                  <Route path="/essays" element={<Suspense fallback={<div className="py-24 text-center text-xs text-on-surface-variant">Loading essay studio...</div>}><EssayGenerator user={user} essays={essays} scholarships={scholarships} documents={documents} onGenerateEssay={handleGenerateEssay} onNavigateToTab={handleNavigateToTab} onUploadMetadata={handleUploadDocument} /></Suspense>} />
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
          )}
        </Suspense>
      </main>

      {/* Footer */}
      {!hideHeaderFooter && (
        <footer className="bg-surface-container border-t border-outline-variant/50 pt-12 pb-8 px-6">
          <div className="max-w-[1280px] w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-on-surface-variant font-light text-xs items-start">
            <div className="flex flex-col gap-3">
              <h4 className="font-display font-black text-primary text-sm tracking-tight flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center text-white font-black text-xs shrink-0">Z</div>
                Techsari Zawadi
              </h4>
              <p className="leading-relaxed">Zawadi matches African students to scholarships they actually qualify for. No spam. No data selling.</p>
            </div>
            <div className="flex flex-col [&_button]:m-0 [&_button]:p-0 [&_button]:min-h-0 [&_button+button]:mt-2">
              <p className="text-primary font-black uppercase text-[10px] tracking-wider mb-2">QUICK NAVIGATION</p>
              <button onClick={() => user ? navigate('/dashboard') : setShowAuth(true)} className="block hover:text-primary text-left cursor-pointer">Workspace</button>
              <button onClick={() => user ? navigate('/scholarships') : setShowAuth(true)} className="block hover:text-primary text-left cursor-pointer">Find Scholarships</button>
              <button onClick={() => navigate('/how-it-works')} className="block hover:text-primary text-left cursor-pointer">How It Works</button>
            </div>
            <div className="flex flex-col [&_button]:m-0 [&_button]:p-0 [&_button]:min-h-0 [&_button+button]:mt-2">
              <p className="text-primary font-black uppercase text-[10px] tracking-wider mb-2">LEGAL & COMPANY</p>
              <button onClick={() => navigate('/about')} className="block hover:text-primary text-left cursor-pointer">About Us</button>
              <button onClick={() => navigate('/contact')} className="block hover:text-primary text-left cursor-pointer">Contact Us</button>
              <button onClick={() => navigate('/privacy')} className="block hover:text-primary text-left cursor-pointer">Privacy Policy</button>
              <button onClick={() => navigate('/terms')} className="block hover:text-primary text-left cursor-pointer">Terms of Service</button>
              <button onClick={() => navigate('/faq')} className="block hover:text-primary text-left cursor-pointer">FAQ</button>
              <p className="text-[10px] text-outline font-semibold mt-4">&copy; 2026 Techsari Zawadi. All rights reserved.</p>
            </div>
          </div>
        </footer>
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
