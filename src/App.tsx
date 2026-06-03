import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Scholarship, UserProfile, ApplicationTracker as TrackerType, DocumentVaultItem, EssayStudioGeneration, BotQueueIngestion, AuditLogItem } from './types';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import ProfileSetupWizard from './components/ProfileSetupWizard';
import toast, { Toaster } from 'react-hot-toast';
import { AFRICAN_COUNTRIES } from './config/matching-config';

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
    const token = localStorage.getItem('zawadi_token');
    if (!token) {
      toast.error('Payment completed! Please log in again to activate your subscription.');
      return;
    }
    // Call verify in the background
    (async () => {
      try {
        const res = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ reference })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            toast.success('Subscription activated successfully!');
          }
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || 'Payment verification pending. It may take a moment.');
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

  const authFetch = (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem('zawadi_token');
    if (token) {
      const headers = new Headers(options.headers);
      headers.set('Authorization', `Bearer ${token}`);
      return fetch(url, { ...options, headers });
    }
    return fetch(url, options);
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('zawadi_token');
    if (savedToken) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.user) setUser(data.user);
          else localStorage.removeItem('zawadi_token');
        })
        .catch(() => localStorage.removeItem('zawadi_token'));
    }
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

  const fetchScholarships = async (email?: string) => {
    try {
      const targetEmail = email || user?.email || '';
      const isAdmin = user?.role === 'super_admin' || user?.role === 'content_manager';
      const params = new URLSearchParams();
      if (targetEmail) params.set('email', targetEmail);
      if (isAdmin) params.set('role', 'super_admin');
      const qs = params.toString();
      const url = qs ? `/api/scholarships?${qs}` : '/api/scholarships';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setScholarships(data);
      }
    } catch (e) {
      console.error("Error loading scholarships database", e);
    }
  };

  const fetchUserData = async (email: string) => {
    const requestId = ++fetchUserDataIdRef.current;
    try {
      const uRes = await authFetch(`/api/users?email=${encodeURIComponent(email)}`);
      if (uRes.ok) {
        const uData = await uRes.json();
        if (uData.user && fetchUserDataIdRef.current === requestId) setUser(uData.user);
      }
      if (fetchUserDataIdRef.current !== requestId) return;
      fetchScholarships(email);
      const tRes = await authFetch(`/api/applications?email=${encodeURIComponent(email)}`);
      if (tRes.ok && fetchUserDataIdRef.current === requestId) { const tData = await tRes.json(); setApplications(tData); }
      const dRes = await authFetch(`/api/documents?email=${encodeURIComponent(email)}`);
      if (dRes.ok && fetchUserDataIdRef.current === requestId) { const dData = await dRes.json(); setDocuments(dData); }
      const eRes = await authFetch(`/api/essays?email=${encodeURIComponent(email)}`);
      if (eRes.ok && fetchUserDataIdRef.current === requestId) { const eData = await eRes.json(); setEssays(eData); }
      if (user?.role === 'super_admin' && fetchUserDataIdRef.current === requestId) {
        const bRes = await authFetch(`/api/admin/bot-queue?admin_email=${encodeURIComponent(email)}`);
        if (bRes.ok) { const bData = await bRes.json(); setBotQueue(bData); }
        const lRes = await authFetch(`/api/admin/logs?admin_email=${encodeURIComponent(email)}`);
        if (lRes.ok) { const lData = await lRes.json(); setAuditLogs(lData); }
      }
    } catch (e) {
      console.error("Error synchronizing sandbox state", e);
    }
  };

  const handleLoginSuccess = async (email: string, token?: string) => {
    if (!token) return;
    localStorage.setItem('zawadi_token', token);
    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setShowAuth(false);
        if (data.user.role === 'super_admin') {
          localStorage.setItem('zawadi_admin_token', token);
        }
        navigate(data.user.role === 'super_admin' ? '/admin' : '/dashboard');
      } else {
        localStorage.removeItem('zawadi_token');
      }
    } catch (err) {
      localStorage.removeItem('zawadi_token');
    }
  };

  const handleLogout = () => {
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
      const response = await authFetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, user_email: user.email, scholarship_id: scholarshipId, status, notes, priority })
      });
      if (response.ok) {
        const data = await response.json();
        setApplications(prev => {
          const filtered = prev.filter(a => a.scholarship_id !== scholarshipId);
          if (status !== 'not_started') filtered.push(data.application);
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
      const response = await authFetch(`/api/applications/${id}?email=${encodeURIComponent(user.email)}`, { method: 'DELETE' });
      if (response.ok) setApplications(prev => prev.filter(a => a.id !== id));
      else { const errData = await response.json(); alert(errData.error || "Failed to stop tracking this scholarship."); }
    } catch (err) { console.error("Error deleting tracked application", err); }
  };

  const handleUploadDocument = async (file: File, docType: string) => {
    if (!user) return;
    try {
      const formData = new FormData();
      formData.append('email', user.email);
      formData.append('file', file);
      formData.append('type', docType);
      const response = await authFetch('/api/documents/upload', { method: 'POST', body: formData });
      if (response.ok) { const dData = await response.json(); setDocuments(prev => [...prev, dData.document]); }
    } catch (err) { console.error("Upload handler connection fault", err); }
  };

  const handleRemoveDoc = async (id: string) => {
    if (!user) return;
    try {
      const response = await authFetch(`/api/documents/${id}?email=${encodeURIComponent(user.email)}`, { method: 'DELETE' });
      if (response.ok) setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) { console.error("Removal folder error", err); }
  };

  const handleUpdateProfile = async (updatedFields: any) => {
    if (!user?.email) { toast.error('Session expired. Please log in again.'); return; }
    try {
      const response = await authFetch('/api/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, ...updatedFields })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(errData.error || `Server error (${response.status})`);
      }
      const data = await response.json();
      if (data.user) {
        setUser(data.user);
        // Re-fetch to ensure all fields are synced from the server
        fetchUserData(data.user.email);
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
      const dRes = await authFetch(`/api/documents?email=${encodeURIComponent(user.email)}`);
      if (dRes.ok) setDocuments(await dRes.json());
    } catch {}
  };

  const handleGenerateEssay = async (essayType: string, scholarshipName: string, prompt: string, stage: 'draft' | 'critique' | 'polish', previousContent?: string, wordCount?: number) => {
    if (!user) throw new Error("Authentication mandatory");
    const response = await authFetch('/api/essays/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, essay_type: essayType, scholarship_name: scholarshipName, prompt, stage, previous_content: previousContent, word_count: wordCount })
    });
    if (!response.ok) { const errBody = await response.json(); const err = new Error(errBody.error || "Generation endpoint faulted."); (err as any).status = response.status; throw err; }
    const resData = await response.json();
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
    return { id: essayId, content: resData.content, remaining_today: resData.remaining_today, daily_limit: resData.daily_limit };
  };

  const handleAddScholarship = async (scholPayload: Partial<Scholarship>) => {
    if (!user) return;
    try {
      const response = await authFetch('/api/scholarships', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...scholPayload, admin_email: user.email })
      });
      if (response.ok) {
        const data = await response.json();
        setScholarships(prev => {
          const exists = prev.some(s => s.id === data.scholarship.id);
          if (exists) return prev.map(s => s.id === data.scholarship.id ? data.scholarship : s);
          return [...prev, data.scholarship];
        });
        alert("Listing saved successfully!");
        fetchUserData(user.email);
      }
    } catch (err) { console.error("CRUD insertion error", err); }
  };

  const handleRemoveScholarship = async (id: string) => {
    if (!user) return;
    try {
      const response = await authFetch(`/api/scholarships/${id}?admin_email=${encodeURIComponent(user.email)}`, { method: 'DELETE' });
      if (response.ok) { setScholarships(prev => prev.filter(s => s.id !== id)); fetchUserData(user.email); }
    } catch (err) { console.error("CRUD deletion error", err); }
  };

  const handleTogglePublish = async (id: string) => {
    if (!user) return;
    try {
      const response = await authFetch(`/api/admin/scholarships/${id}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_email: user.email })
      });
      if (response.ok) {
        const data = await response.json();
        setScholarships(prev => prev.map(s => s.id === id ? { ...s, published: data.scholarship?.published ?? !s.published } : s));
      } else {
        const errData = await response.json();
        alert(`Toggle failed: ${errData.error || 'Server error'}`);
      }
    } catch (err) { console.error("Toggle publish error", err); }
  };

  const handleBulkRemoveScholarships = async (ids: string[]) => {
    if (!user) return;
    try {
      const response = await authFetch('/api/admin/scholarships/bulk-delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, admin_email: user.email, email: user.email })
      });
      if (response.ok) { setScholarships(prev => prev.filter(s => !ids.includes(s.id))); fetchUserData(user.email); alert(`Successfully removed ${ids.length} selected opportunities!`); }
      else { const errorData = await response.json(); alert(`Bulk deletion failed: ${errorData.error || 'Server error context'}`); }
    } catch (err) { console.error("Bulk CRUD deletion error", err); }
  };

  const handleTriggerScrapeCampaign = async () => {
    if (!user) return;
    try {
      const response = await authFetch('/api/admin/bot-run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ admin_email: user.email })
      });
      if (response.ok) { const data = await response.json(); setBotQueue(data.bot_queue); fetchUserData(user.email); }
    } catch (err) { console.error("Ingestion crawler failed", err); }
  };

  const handleReviewBotItem = async (id: string, status: 'approved' | 'rejected', _notes = '') => {
    if (!user) return;
    try {
      const response = await authFetch('/api/admin/ingestions/action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: status, admin_email: user.email })
      });
      if (response.ok) { setBotQueue(prev => prev.filter(b => b.id !== id)); fetchScholarships(); fetchUserData(user.email); }
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
                  if (!adminToken) return <Navigate to="/admin/login" replace />;
                  try {
                    const payload = JSON.parse(atob(adminToken.split('.')[1]));
                    if (payload.exp * 1000 < Date.now()) {
                      localStorage.removeItem('zawadi_admin_token');
                      return <Navigate to="/admin/login" replace />;
                    }
                    if (!payload.admin) {
                      localStorage.removeItem('zawadi_admin_token');
                      return <Navigate to="/admin/login" replace />;
                    }
                  } catch {
                    localStorage.removeItem('zawadi_admin_token');
                    return <Navigate to="/admin/login" replace />;
                  }
                  if (!user) return <div className="py-24 text-center text-xs text-on-surface-variant">Loading...</div>;
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
                  <Route path="/essays" element={<Suspense fallback={<div className="py-24 text-center text-xs text-on-surface-variant">Loading essay studio...</div>}><EssayGenerator user={user} essays={essays} scholarships={scholarships} onGenerateEssay={handleGenerateEssay} onNavigateToTab={handleNavigateToTab} onUploadMetadata={handleUploadDocument} /></Suspense>} />
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
