import React, { useState, useEffect } from 'react';
import { Scholarship, BotQueueIngestion, AuditLogItem } from '../types';
import ConfirmationDialog from './ConfirmationDialog';
import { 
  AFRICAN_COUNTRIES, 
  FIELD_GROUPS, 
  DOCUMENT_TYPES,
  ALL_DESTINATION_REGIONS 
} from '../config/matching-config';
import { getCountryByISO2 } from '../lib/country-graph';

// Icons
import { 
  Plus, Edit, Trash2, Eye, EyeOff, ClipboardCheck, CheckCircle2, CheckCircle, 
  AlertTriangle, Search, ExternalLink, Filter, X, 
  Globe, BookOpen, Clock, Check, RefreshCw, Layers, Download,
  Bot, Users, ShieldAlert, BadgeInfo, Brain,
  HelpCircle, LogOut, ChevronRight
} from 'lucide-react';

// Modular child panels
import AdminDashboard from './admin/AdminDashboard';
import UserManagement from './admin/UserManagement';
import BotQueueReview from './admin/BotQueueReview';
import AuditTrail from './admin/AuditTrail';
import AiConfigPanel from './admin/AiConfigPanel';

interface AdminPortalProps {
  user: any;
  scholarships: Scholarship[];
  botQueue: BotQueueIngestion[];
  auditLogs: AuditLogItem[];
  onAddScholarship: (schol: Partial<Scholarship>) => void;
  onRemoveScholarship: (id: string) => void;
  onBulkRemoveScholarships: (ids: string[]) => void;
  onTogglePublish: (id: string) => Promise<void>;
  onTriggerScrapeCampaign: () => Promise<void>;
  onReviewBotItem: (id: string, status: 'approved' | 'rejected', notes?: string) => Promise<void>;
}

export default function AdminPortal({
  user,
  scholarships,
  botQueue,
  auditLogs,
  onAddScholarship,
  onRemoveScholarship,
  onBulkRemoveScholarships,
  onTogglePublish,
  onTriggerScrapeCampaign,
  onReviewBotItem
}: AdminPortalProps) {
  
  // Dashboard navigation sub-tabs
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'dashboard' | 'scholarships' | 'bot_queue' | 'users' | 'audit_log' | 'ai_config'>('dashboard');
  
  const [scholarshipToDelete, setScholarshipToDelete] = useState<string | null>(null);
  const [selectedPreviewSchol, setSelectedPreviewSchol] = useState<Scholarship | null>(null);

  // Core administrative states
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Combined stats — fetched live from server
  const [stats, setStats] = useState({
    total_listings: 0,
    published_listings: 0,
    draft_listings: 0,
    pending_crawler_queue: 0,
    user_count: 0,
    active_users: 0,
    active_subscriptions: 0,
    total_applications: 0,
    total_documents: 0,
    total_essays: 0,
    mrr_value: 0,
    mrr_kes: 0,
    audit_count: 0,
    total_payments: 0,
    successful_payments: 0,
    distribution: { explorer: 0, plus: 0, pro: 0, institutional: 0 },
    userGrowth: [] as { month: string; users: number }[],
    appStatusBreakdown: {} as Record<string, number>,
    essayTrend: [] as { date: string; essays: number }[]
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Search & Filter for Active Scholarships table
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPublishStatus, setFilterPublishStatus] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [filterRegion, setFilterRegion] = useState<string>('all');

  // Multi-select row tracking state for bulk delete
  const [selectedScholIds, setSelectedScholIds] = useState<string[]>([]);

  const handleToggleSelectAll = (filteredList: Scholarship[]) => {
    if (selectedScholIds.length === filteredList.length && filteredList.length > 0) {
      setSelectedScholIds([]);
    } else {
      setSelectedScholIds(filteredList.map(s => s.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedScholIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (selectedScholIds.length === 0) return;
    if (window.confirm(`Are you sure you want to permanently delete all ${selectedScholIds.length} selected scholarships? This cannot be undone.`)) {
      onBulkRemoveScholarships(selectedScholIds);
      setSelectedScholIds([]);
    }
  };

  // Form states (merged for both Creation and Editing inside beautiful Slide-Over)
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const adminFetch = (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem('zawadi_admin_token');
    if (token) {
      const headers = new Headers(options.headers);
      headers.set('Authorization', `Bearer ${token}`);
      return fetch(url, { ...options, headers });
    }
    return fetch(url, options);
  };

  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState('');
  const [formHost, setFormHost] = useState('');
  const [formEligibility, setFormEligibility] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formFundingType, setFormFundingType] = useState<'Full' | 'Partial'>('Full');
  const [formApplyUrl, setFormApplyUrl] = useState('');
  const [formSourceUrl, setFormSourceUrl] = useState('');
  const [formVerifiedAt, setFormVerifiedAt] = useState('');
  const [formPublished, setFormPublished] = useState(true);
  const [formNoIelts, setFormNoIelts] = useState(false);
  const [formHostRegion, setFormHostRegion] = useState('');
  const [formHostCountry, setFormHostCountry] = useState<string[]>([]);
  const [formIso2, setFormIso2] = useState('');
  const [iso2Error, setIso2Error] = useState('');
  const [formHostInstitution, setFormHostInstitution] = useState('');
  const [formFieldsOfStudy, setFormFieldsOfStudy] = useState<string[]>([]);
  const [formCountries, setFormCountries] = useState<string[]>([]);
  const [formWorkExp, setFormWorkExp] = useState<number | null>(null);
  const [formAgeMasters, setFormAgeMasters] = useState<number | null>(null);
  const [formAgePhd, setFormAgePhd] = useState<number | null>(null);
  const [formSponsorType, setFormSponsorType] = useState('');
  const [formPipelineSource, setFormPipelineSource] = useState('');
  const [formQualityScore, setFormQualityScore] = useState<number | null>(null);
  const [formScamFlags, setFormScamFlags] = useState<string[]>([]);
  const [formVerifiedBy, setFormVerifiedBy] = useState('');

  // Selected arrays based on taxonomy
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedDegrees, setSelectedDegrees] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [customDocName, setCustomDocName] = useState('');

  // Country filter for checkbox selector
  const [countryFilter, setCountryFilter] = useState('');

  // Manual 8-Point Vetting Checklist State
  const [checklist, setChecklist] = useState({
    directUrl: false,
    citizenship: false,
    fields: false,
    degrees: false,
    funding: false,
    deadline: false,
    documents: false,
    criteria: false
  });

  // Ingestion campaign scraping trigger indicator
  const [isScraping, setIsScraping] = useState(false);

  // Re-calculate Statistics from live server data
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await adminFetch(`/api/admin/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats({
          total_listings: data.totalScholarships || 0,
          published_listings: data.publishedScholarships || 0,
          draft_listings: data.draftScholarships || 0,
          pending_crawler_queue: data.pendingBotCount || 0,
          user_count: data.totalUsers || 0,
          active_users: data.activeUsers || 0,
          active_subscriptions: data.activeSubs || 0,
          total_applications: data.totalApplications || 0,
          total_documents: data.totalDocuments || 0,
          total_essays: data.totalEssays || 0,
          mrr_value: data.mrr || 0,
          mrr_kes: data.mrrKes || 0,
          audit_count: (data.auditLogs || 0) + 0,
          total_payments: data.totalPayments || 0,
          successful_payments: data.successfulPayments || 0,
          distribution: data.distribution || { explorer: 0, plus: 0, pro: 0, institutional: 0 },
          userGrowth: data.userGrowth || [],
          appStatusBreakdown: data.appStatusBreakdown || {},
          essayTrend: data.essayTrend || []
        });
      }
    } catch (e) {
      console.error("Failed to fetch admin stats", e);
      // Fallback: compute from local props
      const total = scholarships.length;
      const published = scholarships.filter(s => s.published).length;
      setStats(prev => ({
        ...prev,
        total_listings: total,
        published_listings: published,
        draft_listings: total - published,
        pending_crawler_queue: botQueue.filter(b => b.status === 'pending').length,
        user_count: usersList.length,
        audit_count: auditLogs.length
      }));
    }
    setStatsLoading(false);
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [scholarships, botQueue, auditLogs, usersList]);

  // Fetch users from server and map to component format
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await adminFetch(`/api/admin/users`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((u: any) => ({
          id: u.email,
          name: u.name || u.email?.split('@')[0] || 'Unknown',
          email: u.email || '',
          country: u.country || 'Kenya',
          plan: u.plan || 'explorer',
          status: u.status || 'active',
          role: u.role || 'user',
          joined: u.joined_at || 'Unknown',
          activity: '—',
          appCount: 0,
          essayCount: 0,
          docCount: 0,
          docSize: '0 KB'
        }));
        setUsersList(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch users", e);
    }
    setUsersLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reset checkboxes on filter / sub-tab navigation changes
  useEffect(() => {
    setSelectedScholIds([]);
  }, [activeAdminSubTab, searchQuery, filterPublishStatus, filterRegion]);

  // Set default Verified Date
  useEffect(() => {
    if (!formVerifiedAt) {
      setFormVerifiedAt(new Date().toISOString().split('T')[0]);
    }
  }, []);

  // Update Users state via real API
  const handleUpdatePlan = async (userEmail: string, newPlan: string) => {
    try {
      const res = await adminFetch(`/api/admin/users/${encodeURIComponent(userEmail)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan })
      });
      if (res.ok) fetchUsers();
    } catch (e) {
      console.error("Failed to update user plan", e);
    }
  };

  const handleToggleStatus = async (userEmail: string) => {
    const target = usersList.find(u => u.email === userEmail);
    if (!target) return;
    const newStatus = target.status === 'active' ? 'suspended' : 'active';
    try {
      const res = await adminFetch(`/api/admin/users/${encodeURIComponent(userEmail)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchUsers();
    } catch (e) {
      console.error("Failed to toggle user status", e);
    }
  };

  const handleDeleteUser = async (userEmail: string) => {
    try {
      const res = await adminFetch(`/api/admin/users/${encodeURIComponent(userEmail)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_email: user.email })
      });
      if (res.ok) fetchUsers();
    } catch (e) {
      console.error("Failed to delete user", e);
    }
  };

  // Open Edit Drawer
  const handleOpenEdit = (s: Scholarship) => {
    setEditingId(s.id);
    setFormName(s.name ?? '');
    setFormProvider(s.provider ?? '');
    setFormHost(s.host ?? '');
    setFormEligibility(s.eligibility ?? '');
    setFormAmount(s.amount ?? '');
    setFormDeadline(s.deadline ?? '');
    setFormDescription(s.description ?? '');
    setFormFundingType((s.funding_type === 'Full' || s.funding_type === 'Partial') ? s.funding_type : 'Full');
    setFormApplyUrl(s.apply_url ?? '');
    setFormSourceUrl(s.source_url ?? '');
    setFormVerifiedAt(s.verified_at || new Date().toISOString().split('T')[0]);
    setFormPublished(s.published ?? false);
    setFormNoIelts(s.no_ielts ?? false);

    setSelectedCountries(s.country || s.countries || []);
    setSelectedDegrees(s.degree_levels || []);
    setSelectedFields(s.fields || []);
    setSelectedDocs(s.required_documents || []);
    setFormHostRegion(s.host_region ?? '');
    setFormHostCountry(s.host_country ?? []);
    setFormIso2(Array.isArray(s.iso2) ? s.iso2.join(', ') : (s.iso2 ?? ''));
    setIso2Error('');

    setFormHostInstitution(s.host_institution || s.host || '');
    setFormFieldsOfStudy(s.fields_of_study || s.fields || []);
    setFormCountries(s.countries || s.country || []);
    setFormWorkExp(s.work_experience_required ?? null);
    setFormAgeMasters(s.age_limit_masters ?? null);
    setFormAgePhd(s.age_limit_phd ?? null);
    setFormSponsorType(s.sponsor_type || '');
    setFormPipelineSource(s.pipeline_source || '');
    setFormQualityScore(s.quality_score ?? null);
    setFormScamFlags(s.scam_flags || []);
    setFormVerifiedBy(s.verified_by || '');

    setChecklist({});

    setShowForm(true);
  };

  // Open Create Drawer
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormProvider('');
    setFormHost('');
    setFormEligibility('');
    setFormAmount('Full Tuition & Academic Stipend');
    setFormDeadline(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 60 days
    setFormDescription('');
    setFormFundingType('Full');
    setFormApplyUrl('');
    setFormSourceUrl('');
    setFormVerifiedAt(new Date().toISOString().split('T')[0]);
    setFormPublished(true);
    setFormNoIelts(false);

    setSelectedCountries(['KE', 'NG', 'GH']);
    setSelectedDegrees(['Masters']);
    setSelectedFields(['Computer Science', 'Software Engineering']);
    setSelectedDocs(['CV', 'Transcript', 'SOP']);
    setFormHostRegion('');
    setFormHostCountry([]);
    setFormIso2('');
    setIso2Error('');

    setShowForm(true);
  };

  // Switch to editing from bot approves
  const handleApproveAndEditFromBot = (item: any) => {
    setEditingId(null);
    setFormName(item.scholarship_name ?? '');
    setFormProvider(item.provider ?? '');
    setFormHost(item.host ?? '');
    setFormDescription(item.note ?? '');
    setFormEligibility("Open to eligible African nations matching core conditions.");
    setFormAmount(item.amount ?? 'Full Tuition & Stipend');
    setFormDeadline(item.deadline ?? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setFormApplyUrl(item.apply_url ?? '');
    setFormSourceUrl(item.source_url ?? '');
    setFormFundingType('Full');
    setFormVerifiedAt(new Date().toISOString().split('T')[0]);
    setFormPublished(false); // as draft
    setFormNoIelts(item.no_ielts === true || false);

    setSelectedCountries(['KE', 'NG', 'GH']);
    setSelectedDegrees(item.degree ? [item.degree] : ['Masters']);
    setSelectedFields(['Computer Science', 'Software Engineering']);
    setSelectedDocs(['CV', 'Transcript', 'SOP']);
    setFormHostRegion('');
    setFormHostCountry([]);

    setShowForm(true);
  };

  // Quick Preset Country selections inside form
  const applyCountryPreset = (type: 'all' | 'none' | 'east' | 'west' | 'north' | 'central' | 'southern' | 'anglophone' | 'francophone' | 'lusophone' | 'arabophone') => {
    if (type === 'all') {
      setSelectedCountries(['ALL', ...AFRICAN_COUNTRIES.map(c => c.code)]);
    } else if (type === 'none') {
      setSelectedCountries([]);
    } else if (type === 'east') {
      setSelectedCountries(AFRICAN_COUNTRIES.filter(c => c.region === 'East Africa').map(c => c.code));
    } else if (type === 'west') {
      setSelectedCountries(AFRICAN_COUNTRIES.filter(c => c.region === 'West Africa').map(c => c.code));
    } else if (type === 'north') {
      setSelectedCountries(AFRICAN_COUNTRIES.filter(c => c.region === 'North Africa').map(c => c.code));
    } else if (type === 'central') {
      setSelectedCountries(AFRICAN_COUNTRIES.filter(c => c.region === 'Central Africa').map(c => c.code));
    } else if (type === 'southern') {
      setSelectedCountries(AFRICAN_COUNTRIES.filter(c => c.region === 'Southern Africa').map(c => c.code));
    } else if (type === 'anglophone') {
      setSelectedCountries(AFRICAN_COUNTRIES.filter(c => c.lang === 'english').map(c => c.code));
    } else if (type === 'francophone') {
      setSelectedCountries(AFRICAN_COUNTRIES.filter(c => c.lang === 'french').map(c => c.code));
    } else if (type === 'lusophone') {
      setSelectedCountries(AFRICAN_COUNTRIES.filter(c => c.lang === 'portuguese').map(c => c.code));
    } else if (type === 'arabophone') {
      setSelectedCountries(AFRICAN_COUNTRIES.filter(c => c.lang === 'arabic').map(c => c.code));
    }
  };

  const toggleChecklist = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFormSubmit = async (e: React.FormEvent, publishedOverride?: boolean) => {
    e.preventDefault();

    const targetPublished = publishedOverride ?? formPublished;

    if (!formName || !formProvider || !formHost || !formApplyUrl) {
      alert("Please specify the main parameters: Title, Sponsor, Host Institution and Apply link.");
      return;
    }

    if (!formApplyUrl.startsWith('http')) {
      alert("Verify Error: Apply link must start with http:// or https://");
      return;
    }

    if (selectedCountries.length === 0) {
      alert("Verify Error: Choose at least one eligible African territory code.");
      return;
    }

    // ISO2 validation
    if (formIso2.trim()) {
      const iso2Parts = formIso2.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      for (const code of iso2Parts) {
        if (!getCountryByISO2(code)) {
          setIso2Error(`Host country code "${code}" not recognized. Please use a valid ISO 3166-1 alpha-2 code.`);
          return;
        }
      }
      setIso2Error('');
    }

    const payload: any = {
      id: editingId || undefined,
      name: formName,
      provider: formProvider,
      description: formDescription || "Full international scholarship program matching active academic requirements.",
      eligibility: formEligibility || "African citizens of approved eligibility criteria.",
      amount: formAmount,
      deadline: formDeadline,
      countries: formCountries.length > 0 ? formCountries : selectedCountries,
      degree_levels: selectedDegrees,
      fields_of_study: formFieldsOfStudy.length > 0 ? formFieldsOfStudy : selectedFields,
      required_documents: selectedDocs,
      funding_type: formFundingType,
      apply_url: formApplyUrl,
      source_url: formSourceUrl || undefined,
      verified_at: formVerifiedAt,
      published: targetPublished,
      no_ielts: formNoIelts,
      host_region: formHostRegion || undefined,
      host_country: formHostCountry.length > 0 ? formHostCountry : undefined,
      iso2: formIso2.trim() ? formIso2.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : undefined,
      host_institution: formHostInstitution || formHost,
      work_experience_required: formWorkExp,
      age_limit_masters: formAgeMasters,
      age_limit_phd: formAgePhd,
      sponsor_type: formSponsorType || undefined,
      pipeline_source: formPipelineSource || undefined,
      quality_score: formQualityScore,
      scam_flags: formScamFlags,
      verified_by: formVerifiedBy || undefined,
    };

    onAddScholarship(payload);
    setShowForm(false);
  };

  const handleRunBot = async () => {
    setIsScraping(true);
    try {
      await onTriggerScrapeCampaign();
    } catch {
      alert("Pipeline crawl session triggered.");
    } finally {
      setIsScraping(false);
    }
  };

  // Export user database to CSV
  const handleExportUsersCSV = () => {
    const headers = ['Email', 'Name', 'Country', 'Plan', 'Status', 'Role', 'Joined At'];
    const fieldKeys = ['email', 'name', 'country', 'plan', 'status', 'role', 'joined'];

    const rows = usersList.map(u => {
      const esc = (val: any) => {
        if (val === null || val === undefined) return '""';
        let text = String(val);
        if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      };
      return fieldKeys.map(k => esc(u[k])).join(',');
    });

    const csvContent = '\ufeff' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `zawadi_users_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export current active scholarship database to CSV
  const handleExportCSV = () => {
    const headers = [
      'ID', 'Scholarship Name', 'Provider', 'Host Institution', 
      'Funding Type', 'Value Amount', 'Deadline', 'Eligible Regions/Countries', 
      'Academic Degrees', 'Selected Study Fields', 'Requirements Documents', 
      'Apply URL Page', 'Source reference URL', 'Verified Timestamp', 'Published State', 
      'Main Description Text', 'Core Eligibility text description'
    ];

    const rows = scholarships.map(s => {
      const escapeCSVField = (val: any) => {
        if (val === null || val === undefined) return '""';
        let text = String(val);
        if (val instanceof Array) text = val.join('; ');
        
        if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      };

      return [
        escapeCSVField(s.id),
        escapeCSVField(s.name),
        escapeCSVField(s.provider),
        escapeCSVField(s.host),
        escapeCSVField(s.funding_type),
        escapeCSVField(s.amount),
        escapeCSVField(s.deadline),
        escapeCSVField(s.country),
        escapeCSVField(s.degree_levels),
        escapeCSVField(s.fields),
        escapeCSVField(s.required_documents),
        escapeCSVField(s.apply_url),
        escapeCSVField(s.source_url),
        escapeCSVField(s.verified_at),
        escapeCSVField(s.published ? 'TRUE' : 'FALSE'),
        escapeCSVField(s.description),
        escapeCSVField(s.eligibility)
      ].join(',');
    });

    const csvContent = '\ufeff' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.setAttribute('download', `zawadi_academic_database_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Filter Active Listings table
  const filteredScholarships = scholarships.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.host.toLowerCase().includes(searchQuery.toLowerCase());
    
  const matchesPublish = 
    filterPublishStatus === 'all' ? true :
    filterPublishStatus === 'published' ? s.published && !s.archived :
    filterPublishStatus === 'archived' ? s.archived : !s.published && !s.archived;

    const matchesRegion =
      filterRegion === 'all' ? true :
      filterRegion === 'global' ? s.host.toLowerCase().includes('global') || s.provider.toLowerCase().includes('global') :
      filterRegion.length === 2 ? (s.country || []).includes(filterRegion.toUpperCase()) :
      AFRICAN_COUNTRIES.filter(c => c.region === filterRegion).some(c => (s.country || []).includes(c.name));

    return matchesSearch && matchesPublish && matchesRegion;
  });

  // Pages header helper based on active selection
  const getHeaderDetails = () => {
    switch(activeAdminSubTab) {
      case 'dashboard':
        return { title: 'Admin Control Center', desc: 'Control vetted opportunity indices, scraper parameters, MRR metrics or operator audits.' };
      case 'scholarships':
        return { title: 'Scholarship Database Manager', desc: 'Perform cascading CRUD validations, publish live offers, or export listings.' };
      case 'bot_queue':
        return { title: 'Parser Mod Ingestions Review', desc: 'Approve, adjust parameters, or dismiss scraped materials before publishing.' };
      case 'users':
        return { title: 'Core Candidates Directory', desc: 'Configure active student plans, assign roles, cancel memberships and audit vaults.' };
      case 'audit_log':
        return { title: 'Security Trails Timeline', desc: 'Unmodifiable chronological audit reports on administrative activities.' };
      case 'ai_config':
        return { title: 'AI Configuration', desc: 'Configure AI providers, API keys, and select the active model for essay generation.' };
      default:
        return { title: 'System Administration Control', desc: '' };
    }
  };

  const currentHeader = getHeaderDetails();

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[85vh] text-[13px] bg-background">
      
      {/* PERSISTENT SYSTEM SIDEBAR - EXACT COLOURS AND LAYOUT MATCH */}
      <div className="w-full lg:w-64 bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-5 shrink-0 flex flex-col justify-between shadow-xs">
        <div className="space-y-6">
          
          {/* Top Logo branding block header */}
          <div className="flex items-center gap-3 border-b border-outline-variant/40 pb-4">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-extrabold shadow-sm">
              🎓
            </div>
            <div>
              <h1 className="font-display font-black text-primary leading-tight text-sm uppercase tracking-wide">Zawadi Admin</h1>
              <span className="text-[10px] text-outline tracking-wider uppercase font-semibold block">System Oversight</span>
            </div>
          </div>

          {/* Persistent buttons group list */}
          <nav className="flex flex-col gap-1.5">
            
            {/* Nav 1: Dashboard */}
            <button 
              onClick={() => setActiveAdminSubTab('dashboard')}
              className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-xl font-bold text-xs tracking-tight transition-all text-left outline-none ${activeAdminSubTab === 'dashboard' ? 'bg-secondary-container text-on-secondary-container shadow-xs' : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'}`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              Dashboard Overview
            </button>

            {/* Nav 2: Active listings */}
            <button 
              onClick={() => setActiveAdminSubTab('scholarships')}
              className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-xl font-bold text-xs tracking-tight transition-all text-left outline-none ${activeAdminSubTab === 'scholarships' ? 'bg-secondary-container text-on-secondary-container shadow-xs' : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'}`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              Manage Scholarships
            </button>

            {/* Nav 3: Bot Queue */}
            <button 
              onClick={() => setActiveAdminSubTab('bot_queue')}
              className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-xl font-bold text-xs tracking-tight transition-all text-left outline-none relative ${activeAdminSubTab === 'bot_queue' ? 'bg-secondary-container text-on-secondary-container shadow-xs' : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'}`}
            >
              <Bot className="w-4 h-4 shrink-0" />
              Bot Queue (Ingestion)
              {stats.pending_crawler_queue > 0 && (
                <span className="absolute right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-status-urgent text-white scale-90">
                  {stats.pending_crawler_queue}
                </span>
              )}
            </button>

            {/* Nav 4: Users registry */}
            <button 
              onClick={() => setActiveAdminSubTab('users')}
              className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-xl font-bold text-xs tracking-tight transition-all text-left outline-none ${activeAdminSubTab === 'users' ? 'bg-secondary-container text-on-secondary-container shadow-xs' : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'}`}
            >
              <Users className="w-4 h-4 shrink-0" />
              User Accounts
            </button>

            {/* Nav 5: Audit trail */}
            <button 
              onClick={() => setActiveAdminSubTab('audit_log')}
              className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-xl font-bold text-xs tracking-tight transition-all text-left outline-none ${activeAdminSubTab === 'audit_log' ? 'bg-secondary-container text-on-secondary-container shadow-xs' : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'}`}
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              Security Audit Trails
            </button>

            {/* Nav 6: AI Config */}
            <button 
              onClick={() => setActiveAdminSubTab('ai_config')}
              className={`w-full flex items-center gap-3 py-2.5 px-4 rounded-xl font-bold text-xs tracking-tight transition-all text-left outline-none ${activeAdminSubTab === 'ai_config' ? 'bg-secondary-container text-on-secondary-container shadow-xs' : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'}`}
            >
              <Brain className="w-4 h-4 shrink-0" />
              AI Configuration
            </button>

          </nav>
        </div>

        {/* Bottom CTA & lower rail links */}
        <div className="space-y-3 pt-6 border-t border-outline-variant/40 mt-6 lg:mt-0">
          
          <button 
            onClick={handleOpenCreate}
            className="w-full bg-primary hover:bg-primary-container text-white py-2.5 px-4 rounded-xl text-xs font-bold transition-transform active:scale-98 flex items-center justify-center gap-2 shadow-sm cursor-pointer border border-primary-fixed/15"
          >
            <Plus className="w-4 h-4 shrink-0 text-secondary" />
            New Scholarship
          </button>

          <div className="flex flex-col gap-0.5 mt-2">
            <a 
              href="mailto:support@zawadi.app" 
              className="px-4 py-2 text-xs text-on-surface-variant hover:text-primary font-semibold flex items-center gap-2.5 rounded-lg hover:bg-surface-container-low transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-on-surface-variant/70" />
              Oversight Support
            </a>
            <button 
              onClick={() => window.location.reload()}
              className="w-full text-left px-4 py-2 text-xs text-error font-semibold flex items-center gap-2.5 rounded-lg hover:bg-error/5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Restart Dev Server
            </button>
          </div>

        </div>
      </div>

      {/* RIGHT SIDE WORKSPACE WORK LOGS CONTAINER */}
      <div className="flex-1 space-y-6 flex flex-col justify-between">
        
        {/* Dynamic header / Title banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest border border-outline-variant/50 rounded-3xl p-6 shadow-xs">
          <div>
            <span className="text-[10px] text-outline uppercase tracking-wider font-extrabold flex items-center gap-1">
              Zawadi Control Unit
              <ChevronRight className="w-3 h-3" />
              {activeAdminSubTab.replace('_', ' ')}
            </span>
            <h2 className="font-display text-xl font-black text-primary tracking-tight mt-1">
              {currentHeader.title}
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">{currentHeader.desc}</p>
          </div>

        </div>

        {/* WORKSPACE CONTENT DISPATCH */}
        <div className="flex-grow">
          
          {/* Dashboard Tab router */}
          {activeAdminSubTab === 'dashboard' && (
            <AdminDashboard 
              scholarshipsCount={stats.total_listings}
              publishedCount={stats.published_listings}
              usersCount={stats.user_count}
              activeUsersCount={stats.active_users}
              activeSubscriptionsCount={stats.active_subscriptions}
              mrrValue={stats.mrr_value}
              totalApplications={stats.total_applications}
              totalDocuments={stats.total_documents}
              totalEssays={stats.total_essays}
              pendingBotCount={stats.pending_crawler_queue}
              distribution={stats.distribution}
              userGrowth={stats.userGrowth}
              appStatusBreakdown={stats.appStatusBreakdown}
              essayTrend={stats.essayTrend}
              recentBotQueues={botQueue}
              isScraping={isScraping}
              onRunBot={handleRunBot}
              onNavigateToTab={setActiveAdminSubTab}
              onOpenCreateModal={handleOpenCreate}
              onExportUsersCSV={handleExportUsersCSV}
              onReviewBotItem={onReviewBotItem}
            />
          )}

          {/* User management Tab router */}
          {activeAdminSubTab === 'users' && (
            <UserManagement 
              usersList={usersList}
              onUpdatePlan={handleUpdatePlan}
              onToggleStatus={handleToggleStatus}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {/* Ingestion Bot queue Review tab router */}
          {activeAdminSubTab === 'bot_queue' && <BotQueueReview />}

          {/* Audit Logs tab router */}
          {activeAdminSubTab === 'audit_log' && (
            <AuditTrail 
              auditLogsList={auditLogs.map((log, index) => ({
                id: log.id || `PROP-LOG-${index}`,
                created_at: log.created_at || 'Just Now',
                admin_email: log.admin_email || 'Sarah Jenkins',
                action: log.action || 'Listing Update',
                target_type: log.target_type || 'Opportunity',
                target_id: log.target_id || 'SCH-01',
                details: log.details || 'Clean manual verification check',
                ip_address: log.ip_address || '194.22.1.201'
              }))}
            />
          )}

          {/* AI Configuration tab router */}
          {activeAdminSubTab === 'ai_config' && <AiConfigPanel />}

          {/* ACTIVE SCHOLARSHIPS MANAGER TAB SECTION */}
          {activeAdminSubTab === 'scholarships' && (
            <div className="space-y-6 animate-sweep">
              
              {/* filter bar database manager */}
              <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-4 shadow-xs">
                
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-on-surface-variant absolute left-3.5 top-2.5" />
                  <input 
                    type="text"
                    placeholder="Search scholarships database by title, provider, or university country..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-container-low text-on-surface text-xs pl-10 pr-4 py-2 rounded-xl border border-outline-variant/20 focus:border-primary/50 outline-none"
                  />
                </div>

                <div className="flex gap-2 shrink-0 flex-wrap">
                  {selectedScholIds.length > 0 && (
                    <button 
                      onClick={handleBulkDelete}
                      className="bg-error hover:bg-opacity-90 text-white py-2 px-4 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs border border-error/20"
                      title="Bulk delete selected scholarship records permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Bulk Delete ({selectedScholIds.length})
                    </button>
                  )}

                  <select
                    value={filterPublishStatus}
                    onChange={(e) => setFilterPublishStatus(e.target.value as any)}
                    className="py-2 px-3 bg-surface border border-outline-variant text-[11px] font-bold rounded-xl outline-none"
                  >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
          <option value="archived">Archived</option>
        </select>

                  <select
                    value={filterRegion}
                    onChange={(e) => setFilterRegion(e.target.value)}
                    className="py-2 px-3 bg-surface border border-outline-variant text-[11px] font-bold rounded-xl outline-none"
                  >
                    <option value="all">All Regions</option>
                    <option value="global">Global Focus</option>
                    {[...new Set(AFRICAN_COUNTRIES.map(c => c.region))].sort().map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                    <optgroup label="—— Individual Countries ——">
                      {AFRICAN_COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                      ))}
                    </optgroup>
                  </select>

                  <button 
                    onClick={handleExportCSV}
                    className="bg-primary hover:bg-primary-container text-white py-2 px-4 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs border border-primary-fixed/10"
                    title="Bulk database export as CSV spreadsheet"
                  >
                    <Download className="w-3.5 h-3.5" />
                    CSV Export
                  </button>
                </div>

              </div>

              {/* Main scholarships table grid */}
              <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant/50 font-bold uppercase tracking-wider text-[9px]">
                        <th className="px-4 py-3.5 w-[45px] text-center">
                          <input 
                            type="checkbox"
                            checked={selectedScholIds.length === filteredScholarships.length && filteredScholarships.length > 0}
                            onChange={() => handleToggleSelectAll(filteredScholarships)}
                            className="rounded border-outline-variant text-primary focus:ring-primary h-3.5 w-3.5 accent-primary cursor-pointer align-middle"
                          />
                        </th>
                        <th className="px-6 py-3.5">Scholarship Title</th>
                        <th className="px-6 py-3.5">Provider Sponsor</th>
                        <th className="px-6 py-3.5">Eligible Countries</th>
                        <th className="px-6 py-3.5">Closing Deadline</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30 text-on-surface/90">
                      {filteredScholarships.map((s) => (
                        <tr key={s.id} className={`transition-all hover:pl-2 group ${selectedScholIds.includes(s.id) ? 'bg-primary/5' : 'hover:bg-surface-container-low/30'}`}>
                          <td className="px-4 py-3.5 text-center">
                            <input 
                              type="checkbox"
                              checked={selectedScholIds.includes(s.id)}
                              onChange={() => handleToggleSelectOne(s.id)}
                              className="rounded border-outline-variant text-primary focus:ring-primary h-3.5 w-3.5 accent-primary cursor-pointer align-middle"
                            />
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="font-bold text-primary max-w-[280px] truncate leading-tight">{s.name}</div>
                            <span className="text-[10px] text-on-surface-variant font-light mt-0.5 block flex items-center gap-1">
                              🏫 Host: {s.host}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-primary">{s.provider}</td>
                          <td className="px-6 py-4 font-mono text-[10.5px]">
                          {(Array.isArray(s.country) && s.country[0] === 'ALL') ? (
                            <span className="bg-secondary-container/10 border border-secondary/20 text-secondary font-black px-1.5 py-0.5 rounded text-[8px]">PAN-AFRICAN ALL</span>
                          ) : (
                            <span className="truncate max-w-[120px] block" title={Array.isArray(s.country) ? s.country.join(', ') : ''}>
                              {Array.isArray(s.country) ? `${s.country.slice(0, 4).join(', ')}${s.country.length > 4 ? ` +${s.country.length - 4}` : ''}` : '—'}
                            </span>
                          )}
                          </td>
                          <td className="px-6 py-4 font-mono font-medium text-on-surface-variant">{s.deadline || 'Variable / No exp'}</td>
                          <td className="px-6 py-4">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
              s.archived
                ? 'bg-surface-variant/40 border-outline-variant/30 text-on-surface-variant'
                : s.published
                  ? 'bg-status-success/15 border-status-success/25 text-status-success'
                  : 'bg-status-warning/15 border-status-warning/25 text-status-warning'
            }`}>
              {s.archived ? 'Archived' : s.published ? 'Published' : 'Draft'}
            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setSelectedPreviewSchol(s)}
                                className="p-1.5 bg-surface-container border border-outline-variant/40 hover:bg-primary-fixed hover:-translate-y-0.5 transition-all text-primary rounded-lg cursor-pointer"
                                title="Visual simulator preview"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleOpenEdit(s)}
                                className="p-1.5 bg-surface-container border border-outline-variant/40 hover:bg-primary-fixed hover:-translate-y-0.5 transition-all text-primary rounded-lg cursor-pointer"
                                title="Open full edit slide-drawer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => onTogglePublish(s.id)}
                                className={`p-1.5 border hover:-translate-y-0.5 transition-all rounded-lg cursor-pointer ${s.published ? 'bg-status-warning/10 border-status-warning/30 text-status-warning hover:bg-status-warning/20' : 'bg-status-success/10 border-status-success/30 text-status-success hover:bg-status-success/20'}`}
                                title={s.published ? 'Unpublish from live site' : 'Publish to live site'}
                              >
                                {s.published ? <EyeOff className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              </button>
                              <button 
                                onClick={() => setScholarshipToDelete(s.id)}
                                className="p-1.5 bg-surface-container border border-outline-variant/40 hover:bg-error-container hover:text-error hover:-translate-y-0.5 transition-all text-on-surface-variant rounded-lg cursor-pointer"
                                title="Remove listing permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {filteredScholarships.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-outline">
                            No listings match filter details. Add new opportunities above!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                <div className="bg-surface-container-low px-6 py-3 text-[10px] text-on-surface-variant font-semibold select-none flex justify-between items-center border-t border-outline-variant/45">
                  <span>Showing 1 to {filteredScholarships.length} of {scholarships.length} scholarships</span>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* CONFIRMATION OVERLAY DRAWERS */}
      <ConfirmationDialog 
        isOpen={scholarshipToDelete !== null}
        title="Confirm permanent cascade database deletion"
        message="This operation represents an unmodifiable hard purge from Supabase. Student match metrics, active checklists and crawler scrapers histories relating to this ID will be completely destroyed."
        confirmText="Destroy records"
        cancelText="Keep"
        type="danger"
        onConfirm={() => {
          if (scholarshipToDelete) {
            onRemoveScholarship(scholarshipToDelete);
            setScholarshipToDelete(null);
          }
        }}
        onCancel={() => setScholarshipToDelete(null)}
      />

      {/* DETAILED RIGHT PREVIEW SLIDE PANEL SIMULATING CANDIDATE CLIENT VIEW */}
      {selectedPreviewSchol && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div 
            className="fixed inset-0 bg-primary/30 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedPreviewSchol(null)}
          />
          <div className="bg-surface-container-lowest border-l border-outline-variant w-full max-w-2xl h-screen shadow-2xl overflow-y-auto relative z-10 flex flex-col justify-between">
            
            {/* Top header row */}
            <div className="sticky top-0 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/40 px-6 py-4 flex justify-between items-center z-10">
              <div>
                <span className="text-[10px] text-secondary font-extrabold uppercase tracking-widest bg-secondary-container/10 py-1 px-2.5 rounded border border-secondary/20">Client Visual Simulation</span>
                <h3 className="font-display font-black text-primary text-base mt-1.5 leading-none">Scholarship Live Mockup</h3>
              </div>
              <button 
                onClick={() => setSelectedPreviewSchol(null)}
                className="p-2 border border-outline-variant hover:bg-surface-container rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            {/* Core client content area */}
            <div className="p-6 space-y-6 flex-grow">
              
              {/* Box 1: Core visual */}
              <div className="bg-primary hover:bg-primary-container text-white rounded-3xl p-5 shadow-lg space-y-3">
                <div className="flex justify-between items-start gap-3">
                  <span className="bg-secondary text-white font-extrabold text-[9px] uppercase px-2 py-0.5 rounded tracking-wider">{selectedPreviewSchol.funding_type} Funding</span>
                  <span className="text-[11px] font-mono opacity-80 font-bold">📆 Deadline: {selectedPreviewSchol.deadline || 'Continuous'}</span>
                </div>
                <h2 className="font-display font-black text-lg md:text-xl leading-snug">{selectedPreviewSchol.name}</h2>
                <div className="pt-2 border-t border-white/10 flex flex-wrap justify-between items-center text-xs opacity-90 gap-2">
                  <span>🏢 Sponsor: <strong>{selectedPreviewSchol.provider}</strong></span>
                  <span>🎓 Institution: <strong>{selectedPreviewSchol.host}</strong></span>
                </div>
              </div>

              {/* Grid 2 Column detail rows */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-primary">
                
                <div className="bg-surface-container-low border border-outline-variant/50 rounded-2xl p-4 space-y-2">
                  <span className="text-[9px] uppercase text-outline font-black block">Eligible African Regions</span>
                  {Array.isArray(selectedPreviewSchol.country) && selectedPreviewSchol.country[0] === 'ALL' ? (
                    <p className="flex items-center gap-1"><span className="text-[11px]">🌍</span> Pan-African Comprehensive (All 54 States)</p>
                  ) : (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(selectedPreviewSchol.country || []).map(c => (
                        <span key={c} className="px-2 py-0.5 rounded bg-surface border border-outline-variant/30 font-mono text-[9px]">{c}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-surface-container-low border border-outline-variant/50 rounded-2xl p-4 space-y-2">
                  <span className="text-[9px] uppercase text-outline font-black block">Degree Level Matchers</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(selectedPreviewSchol.degree_levels || []).map(d => (
                      <span key={d} className="px-2 py-0.5 rounded bg-primary-fixed text-primary font-bold text-[9px]">{d}</span>
                    ))}
                  </div>
                </div>

              </div>

              {/* Box 3: Matching score details */}
              <div className="bg-background border border-outline p-4 rounded-2xl text-xs space-y-2">
                <span className="text-[9px] uppercase text-outline font-black block">Eligible Study Fields</span>
                <div className="flex flex-wrap gap-1">
                  {(selectedPreviewSchol.fields || []).map(f => (
                    <span key={f} className="px-2 py-0.5 rounded bg-surface border border-outline-variant text-[9px]">{f}</span>
                  ))}
                </div>
              </div>

              {/* Description formatting block */}
              <div className="space-y-3.5">
                <div>
                  <h4 className="font-display font-black text-primary text-xs uppercase tracking-wider">Opportunity Overview</h4>
                  <p className="text-xs text-on-surface leading-relaxed mt-1 whitespace-pre-line text-on-surface-variant/90">{selectedPreviewSchol.description}</p>
                </div>
                <div>
                  <h4 className="font-display font-black text-primary text-xs uppercase tracking-wider">Academic eligibility conditions</h4>
                  <p className="text-xs text-on-surface leading-relaxed mt-1 whitespace-pre-line text-on-surface-variant/90">{selectedPreviewSchol.eligibility}</p>
                </div>
              </div>

              {/* Requirement Checklist docs list */}
              <div className="bg-surface-container-low border border-outline-variant p-4.5 rounded-2xl space-y-3">
                <h4 className="font-display font-black text-primary text-xs uppercase">Cascading Document Verification Requirements</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-on-surface">
                  {selectedPreviewSchol.required_documents?.map(doc => (
                    <div key={doc} className="flex items-center gap-2 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-secondary-fixed flex items-center justify-center text-[7px]">✓</span>
                      {doc}
                    </div>
                  )) || <p className="text-[10px] text-outline italic">No required document constraints uploaded.</p>}
                </div>
              </div>

            </div>

            {/* Bottom action bar */}
            <div className="sticky bottom-0 bg-surface-container-low border-t border-outline-variant/60 px-6 py-4 flex justify-between items-center bg-surface-container-low">
              <span className="text-[10px] font-mono text-outline font-semibold">Verified at: {selectedPreviewSchol.verified_at || 'Recently checked'}</span>
              <a 
                href={selectedPreviewSchol.apply_url}
                target="_blank"
                rel="noreferrer"
                className="bg-primary text-white font-bold text-xs py-2 px-5 rounded-xl block flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                Access Official Portal Page
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>
        </div>
      )}

      {/* FULL CASCADING SLIDE-OVER DRAWER OVERLAY FOR EDITING & MANUAL CREATION */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-end font-medium">
          <div 
            className="fixed inset-0 bg-primary/30 backdrop-blur-xs transition-opacity"
            onClick={() => setShowForm(false)}
          />
          <form 
            onSubmit={handleFormSubmit}
            className="bg-surface-container-lowest border-l border-outline-variant w-full max-w-2xl h-screen shadow-2xl overflow-y-auto relative z-10 flex flex-col justify-between"
          >
            
            {/* Top drawer header */}
            <div className="sticky top-0 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/60 px-6 py-4 flex justify-between items-center z-10">
              <div>
                <span className="text-[9px] uppercase tracking-widest text-secondary font-black bg-secondary-container/10 border border-secondary/20 py-1 px-2 rounded">
                  {editingId ? 'Database Update Registry' : 'Manual Index Record'}
                </span>
                <h3 className="font-display font-black text-primary text-base mt-2 leading-none">
                  {editingId ? 'Edit Scholarship Listing' : 'Enter Vetted Scholarship Opportunity'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="p-2 border border-outline-variant hover:bg-surface-container rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4 text-on-surface-variant" />
              </button>
            </div>

            {formPipelineSource === 'pipeline' && (
                <div className="bg-primary-fixed/5 border border-primary-fixed/20 rounded-xl p-4 space-y-2 mb-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-primary text-on-primary">Pipeline</span>
                    {formQualityScore != null && (
                      <span className="text-[10px] text-on-surface-variant">AI Confidence: {(formQualityScore * 100).toFixed(0)}%</span>
                    )}
                    {formScamFlags.length > 0 && formScamFlags.map((f: string) => (
                      <span key={f} className="px-2 py-0.5 rounded text-[9px] font-bold bg-error/10 text-error border border-error/20">{f}</span>
                    ))}
                    {formVerifiedBy && <span className="text-[10px] text-on-surface-variant">Verified by {formVerifiedBy}</span>}
                    {formVerifiedAt && <span className="text-[10px] text-on-surface-variant">on {new Date(formVerifiedAt).toLocaleDateString()}</span>}
                    {formSourceUrl && (
                      <a href={formSourceUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> View Original Source
                      </a>
                    )}
                  </div>
                </div>
              )}

            {/* Form details input grids */}
            <div className="p-6 space-y-5 flex-grow text-xs text-on-surface font-semibold">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-on-surface-variant tracking-wider font-extrabold block">Scholarship Listing Title *</label>
                  <input 
                    type="text"
                    required
                    maxLength={140}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Oxford Reach Global Leaders Scholarship"
                    className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-xl border border-outline-variant/65 outline-none focus:border-primary text-xs"
                  />
                </div>

                {/* Organizer */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-on-surface-variant tracking-wider font-extrabold block">Provider sponsoring organisation *</label>
                  <input 
                    type="text"
                    required
                    value={formProvider}
                    onChange={(e) => setFormProvider(e.target.value)}
                    placeholder="e.g. Mastercard Foundation or British Council"
                    className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-xl border border-outline-variant/65 outline-none focus:border-primary text-xs"
                  />
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Host */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-on-surface-variant block font-extrabold">Host Institution / Country *</label>
                  <input 
                    type="text"
                    required
                    value={formHost}
                    onChange={(e) => setFormHost(e.target.value)}
                    placeholder="e.g. University of Edinburgh or UK Universities"
                    className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-xl border border-outline-variant/65 outline-none focus:border-primary text-xs"
                  />
                </div>

                {/* Valuation amount value */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-on-surface-variant block font-extrabold">Fulfillment value amount</label>
                  <input 
                    type="text"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="e.g. Full tuition, laptop allowance, annual stipend"
                    className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-xl border border-outline-variant/65 outline-none focus:border-primary text-xs"
                  />
                </div>

                {/* Closing Calendar deadline */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-on-surface-variant block font-extrabold">Closing Date deadline *</label>
                  <input 
                    type="date"
                    required
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full bg-surface-container text-on-surface py-1.5 px-3 rounded-xl border border-outline-variant/65 outline-none focus:border-primary text-xs font-mono font-bold"
                  />
                </div>

              </div>

              {/* URL verifications with live verifier warning */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-on-surface-variant block font-extrabold">Live Application link URL *</label>
                  <input 
                    type="url"
                    required
                    value={formApplyUrl}
                    onChange={(e) => setFormApplyUrl(e.target.value)}
                    placeholder="https://oxford.ac.uk/scholarship/apply"
                    className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-xl border border-outline-variant/65 outline-none focus:border-primary text-xs"
                  />
                  {(formApplyUrl.includes('opportunitiesforafricans') || formApplyUrl.includes('scholarship.com') || formApplyUrl.includes('scholars4dev')) && (
                    <p className="text-[10px] text-error font-extrabold">Alert: Aggregator URL detected. Replace with direct university portal endpoint!</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-on-surface-variant block font-extrabold">Original Source reference URL</label>
                  <input 
                    type="url"
                    value={formSourceUrl}
                    onChange={(e) => setFormSourceUrl(e.target.value)}
                    placeholder="https://oxford.ac.uk/announcement"
                    className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-xl border border-outline-variant/65 outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              {/* Funding option, Verified date, and published state */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-background border border-outline-variant p-3.5 rounded-2xl">
                
                <div className="space-y-1">
                  <span className="text-[9px] uppercase text-on-surface-variant font-extrabold block">Fulfillment Funding tier</span>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setFormFundingType('Full')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${formFundingType === 'Full' ? 'bg-primary border-primary text-white' : 'bg-surface hover:bg-surface-container text-on-surface-variant border-outline-variant/60'}`}
                    >
                      Full
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormFundingType('Partial')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${formFundingType === 'Partial' ? 'bg-primary border-primary text-white' : 'bg-surface hover:bg-surface-container text-on-surface-variant border-outline-variant/60'}`}
                    >
                      Partial
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-on-surface-variant block font-extrabold">Verified Timestamp Date</label>
                  <input 
                    type="date"
                    value={formVerifiedAt}
                    onChange={(e) => setFormVerifiedAt(e.target.value)}
                    className="w-full bg-surface text-on-surface py-1.5 px-3 rounded-lg border border-outline-variant/60 outline-none text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] uppercase text-on-surface-variant block font-extrabold">State visibility setting</span>
                  <div className="flex items-center gap-2 pt-1">
                    <input 
                      type="checkbox"
                      id="formPubStateCheck"
                      checked={formPublished}
                      onChange={(e) => setFormPublished(e.target.checked)}
                      className="w-4 h-4 text-primary bg-surface border-outline-variant rounded focus:ring-primary shrink-0"
                    />
                    <label htmlFor="formPubStateCheck" className="text-xs font-bold text-primary select-none cursor-pointer">
                      {formPublished ? 'Live on Platform' : 'Draft listing mode'}
                    </label>
                  </div>
                </div>

                {/* No-IELTS toggle */}
                <div className="space-y-1">
                  <span className="text-[9px] uppercase text-on-surface-variant block font-extrabold">English test policy</span>
                  <div className="flex items-center gap-2 pt-1">
                    <input 
                      type="checkbox"
                      id="formNoIeltsCheck"
                      checked={formNoIelts}
                      onChange={(e) => setFormNoIelts(e.target.checked)}
                      className="w-4 h-4 text-amber-600 bg-surface border-outline-variant rounded focus:ring-amber-600 shrink-0 accent-amber-600"
                    />
                    <label htmlFor="formNoIeltsCheck" className="text-xs font-bold text-amber-700 select-none cursor-pointer flex items-center gap-1.5">
                      <span>No IELTS required</span>
                      <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-200 rounded px-1.5 py-0.5 font-black uppercase">Accepts MOI / Duolingo</span>
                    </label>
                  </div>
                </div>

              </div>

              {/* Host region & countries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-container-low border border-outline-variant/40 p-3.5 rounded-2xl">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-on-surface-variant block font-extrabold">
                    Destination Region
                  </label>
                  <select
                    value={formHostRegion}
                    onChange={(e) => setFormHostRegion(e.target.value)}
                    className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-xl border border-outline-variant/65 outline-none focus:border-primary text-xs"
                  >
                    <option value="">-- Select region --</option>
                    {ALL_DESTINATION_REGIONS.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                  <p className="text-[9px] text-outline mt-0.5">Used by matching engine for destination scoring</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-on-surface-variant block font-extrabold">
                    Host Country(ies)
                  </label>
                  <input
                    type="text"
                    value={formHostCountry.join(', ')}
                    onChange={(e) => setFormHostCountry(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="e.g. united kingdom, ireland"
                    className="w-full bg-surface-container text-on-surface py-2 px-3 rounded-xl border border-outline-variant/65 outline-none focus:border-primary text-xs"
                  />
                  <p className="text-[9px] text-outline mt-0.5">Comma-separated, lowercase. Overrides region if set.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-on-surface-variant block font-extrabold">
                    ISO 3166-1 alpha-2
                  </label>
                  <input
                    type="text"
                    value={formIso2}
                    onChange={(e) => { setFormIso2(e.target.value); setIso2Error(''); }}
                    placeholder="e.g. GB, DE, FR, or NG, GH, KE for multi-country"
                    className={`w-full bg-surface-container text-on-surface py-2 px-3 rounded-xl border outline-none focus:border-primary text-xs ${iso2Error ? 'border-red-500' : 'border-outline-variant/65'}`}
                  />
                  {iso2Error ? (
                    <p className="text-[9px] text-red-500 mt-0.5">{iso2Error}</p>
                  ) : (
                    <p className="text-[9px] text-outline mt-0.5">Comma-separated. Validated against country graph.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase flex items-center gap-1">
                    {!formWorkExp && <span className="w-1.5 h-1.5 rounded-full bg-error" />}
                    Work Exp (yrs)
                  </label>
                  <input type="number" value={formWorkExp ?? ''} onChange={e => setFormWorkExp(e.target.value ? parseInt(e.target.value) : null)}
                         placeholder="e.g. 2" className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-2.5 text-xs outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase flex items-center gap-1">
                    {!formAgeMasters && <span className="w-1.5 h-1.5 rounded-full bg-error" />}
                    Age Limit (Masters)
                  </label>
                  <input type="number" value={formAgeMasters ?? ''} onChange={e => setFormAgeMasters(e.target.value ? parseInt(e.target.value) : null)}
                         placeholder="e.g. 35" className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-2.5 text-xs outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase flex items-center gap-1">
                    {!formAgePhd && <span className="w-1.5 h-1.5 rounded-full bg-error" />}
                    Age Limit (PhD)
                  </label>
                  <input type="number" value={formAgePhd ?? ''} onChange={e => setFormAgePhd(e.target.value ? parseInt(e.target.value) : null)}
                         placeholder="e.g. 40" className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-2.5 text-xs outline-none focus:border-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">Sponsor Type</label>
                  <select value={formSponsorType} onChange={e => setFormSponsorType(e.target.value)}
                          className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-2.5 text-xs outline-none focus:border-primary">
                    <option value="">None</option>
                    {['Government', 'Foundation', 'University', 'Corporate', 'UN', 'Other'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">Fields of Study</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['Computer Science', 'Engineering', 'Business', 'Public Health', 'Law', 'Economics', 'STEM', 'All fields'].map(f => (
                      <label key={f} className={`px-2 py-0.5 rounded text-[9px] font-bold border cursor-pointer ${formFieldsOfStudy.includes(f) ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container text-on-surface-variant border-outline-variant/40'}`}>
                        <input type="checkbox" checked={formFieldsOfStudy.includes(f)}
                               onChange={() => setFormFieldsOfStudy(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])}
                               className="hidden" /> {f}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-on-surface-variant uppercase">Countries (one per line)</label>
                <textarea value={formCountries.join('\n')} onChange={e => setFormCountries(e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
                          placeholder="Kenya&#10;Nigeria&#10;Ghana&#10;or: All African Countries" rows={3}
                          className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-2.5 text-xs outline-none focus:border-primary resize-none" />
              </div>

              {/* Multi-Selectors Degree level & fields of study */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Degree checkbox match */}
                <div className="space-y-1 bg-surface-container-low border border-outline-variant/40 p-3.5 rounded-2xl">
                  <span className="text-[9px] uppercase text-on-surface-variant block font-extrabold">Eligible Academic Degree Matchers</span>
                  <div className="flex flex-col gap-2 mt-2">
                    {['Undergraduate', 'Masters', 'PhD', 'Diploma', 'Short Course', 'Postdoc'].map((deg) => {
                      const isChecked = selectedDegrees.includes(deg);
                      return (
                        <div key={deg} className="flex items-center gap-2">
                          <input 
                            type="checkbox"
                            id={`matchDeg_${deg}`}
                            checked={isChecked}
                            onChange={() => {
                              setSelectedDegrees(prev => isChecked ? prev.filter(d => d !== deg) : [...prev, deg]);
                            }}
                            className="w-4 h-4 text-primary bg-surface border-outline-variant rounded focus:ring-primary shrink-0"
                          />
                          <label htmlFor={`matchDeg_${deg}`} className="text-xs text-on-surface font-semibold select-none cursor-pointer">{deg}</label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Study field groups select */}
                <div className="space-y-1 bg-surface-container-low border border-outline-variant/40 p-3.5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] uppercase text-on-surface-variant block font-extrabold">Study Field Taxonomy matchers</span>
                    <p className="text-[9.5px] text-outline mt-0.5">Define academic subjects matched in core score algorithms.</p>
                  </div>
                  <div className="h-44 overflow-y-auto space-y-2.5 pr-2.5 mt-2.5 border-t border-outline-variant/40 pt-2 text-xs">
                    {FIELD_GROUPS.map((grp) => (
                      <div key={grp.group} className="space-y-1">
                        <span className="font-extrabold text-primary text-[9.5px] tracking-wide uppercase block">{grp.group}</span>
                        <div className="flex flex-col gap-1.5 pl-2">
                          {grp.fields.slice(0, 4).map((fld) => {
                            const isChecked = selectedFields.includes(fld);
                            return (
                              <div key={fld} className="flex items-center gap-2">
                                <input 
                                  type="checkbox"
                                  id={`matchFld_${fld}`}
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedFields(prev => isChecked ? prev.filter(f => f !== fld) : [...prev, fld]);
                                  }}
                                  className="w-3.5 h-3.5 text-primary bg-surface border-outline-variant rounded focus:ring-primary shrink-0"
                                />
                                <label htmlFor={`matchFld_${fld}`} className="text-[11px] text-on-surface-variant font-medium select-none cursor-pointer">{fld}</label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* African Country multi-selectors with region preset filters */}
              <div className="bg-surface-container-low border border-outline-variant p-4.5 rounded-3xl space-y-3">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div>
                    <span className="text-[9.5px] uppercase text-primary font-black block">Eligible African territories ({selectedCountries.length} selected)</span>
                    <p className="text-[9px] text-outline mt-0.5">Choose countries explicitly eligible or use Quick Presets.</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button type="button" onClick={() => applyCountryPreset('all')} className="py-1 px-2 border border-outline-variant bg-surface hover:bg-surface-container text-[10px] rounded-lg cursor-pointer">All 54</button>
                    <button type="button" onClick={() => applyCountryPreset('none')} className="py-1 px-2 border border-outline-variant bg-surface hover:bg-surface-container text-[10px] rounded-lg cursor-pointer">None</button>
                    <button type="button" onClick={() => applyCountryPreset('east')} className="py-1 px-2 border border-outline-variant bg-surface hover:bg-surface-container text-[10px] rounded-lg cursor-pointer">East</button>
                    <button type="button" onClick={() => applyCountryPreset('west')} className="py-1 px-2 border border-outline-variant bg-surface hover:bg-surface-container text-[10px] rounded-lg cursor-pointer">West</button>
                    <button type="button" onClick={() => applyCountryPreset('north')} className="py-1 px-2 border border-outline-variant bg-surface hover:bg-surface-container text-[10px] rounded-lg cursor-pointer">North</button>
                    <button type="button" onClick={() => applyCountryPreset('anglophone')} className="py-1 px-2 border border-outline-variant bg-surface hover:bg-surface-container text-[10px] rounded-lg cursor-pointer">English</button>
                    <button type="button" onClick={() => applyCountryPreset('francophone')} className="py-1 px-2 border border-outline-variant bg-surface hover:bg-surface-container text-[10px] rounded-lg cursor-pointer">French</button>
                  </div>
                </div>

                {/* Country checkboxes grid */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-on-surface-variant absolute left-3 top-2" />
                  <input 
                    type="text"
                    placeholder="Search countries..."
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    className="w-full bg-surface text-on-surface text-[11px] pl-9 pr-3 py-1.5 rounded-xl border border-outline-variant/40 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 max-h-36 overflow-y-auto pt-1">
                  {/* Select All item */}
                  <div className="flex items-center gap-1.5 p-1 bg-surface-container-lowest border border-outline-variant/30 rounded">
                    <input 
                      type="checkbox"
                      id="chkCountry_ALL"
                      checked={selectedCountries.includes('ALL')}
                      onChange={() => {
                        const isChecked = selectedCountries.includes('ALL');
                        setSelectedCountries(isChecked ? [] : ['ALL', ...AFRICAN_COUNTRIES.map(c => c.code)]);
                      }}
                      className="w-3.5 h-3.5 text-primary bg-surface border-outline-variant rounded"
                    />
                    <label htmlFor="chkCountry_ALL" className="text-[10.5px] text-primary font-black select-none truncate cursor-pointer">PAN-AFRICAN ALL</label>
                  </div>

                  {AFRICAN_COUNTRIES.filter(c => c.name.toLowerCase().includes(countryFilter.toLowerCase())).map((cty) => {
                    const isChecked = selectedCountries.includes(cty.code);
                    return (
                      <div key={cty.code} className="flex items-center gap-1.5 p-1 bg-surface-container hover:bg-surface transition-colors rounded">
                        <input 
                          type="checkbox"
                          id={`chkCountry_${cty.code}`}
                          checked={isChecked}
                          onChange={() => {
                            setSelectedCountries(prev => {
                              const withoutAll = prev.filter(c => c !== 'ALL');
                              if (isChecked) {
                                return withoutAll.filter(c => c !== cty.code);
                              } else {
                                return [...withoutAll, cty.code];
                              }
                            });
                          }}
                          className="w-3.5 h-3.5 text-primary bg-surface border-outline-variant rounded"
                        />
                        <label htmlFor={`chkCountry_${cty.code}`} className="text-[10px] text-on-surface font-semibold select-none truncate cursor-pointer" title={cty.name}>
                          {cty.code} – {cty.name}
                        </label>
                      </div>
                    );
                  })}
                </div>

              </div>

              {/* Textareas for description and requirements */}
              <div className="space-y-4">
                
                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-on-surface-variant font-extrabold block">Opportunity Detailed Overview Paragraphs</label>
                  <textarea 
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Enter visual descriptors, eligibility parameters, values, scholarship duration conditions etc..."
                    className="w-full h-24 bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant/60 outline-none focus:border-primary text-xs resize-y"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-on-surface-variant font-extrabold block">Academic criteria conditions Eligibility requirements</label>
                  <textarea 
                    value={formEligibility}
                    onChange={(e) => setFormEligibility(e.target.value)}
                    placeholder="Specify conditions in bullet structures. E.g. Must have First Class degree, must be under 35 years of age..."
                    className="w-full h-24 bg-surface-container text-on-surface p-3 rounded-xl border border-outline-variant/60 outline-none focus:border-primary text-xs resize-y"
                  />
                </div>

              </div>

              {/* Document checklists */}
              <div className="space-y-1 bg-surface-container-low border border-outline-variant p-3.5 rounded-2xl">
                <span className="text-[9.5px] uppercase text-on-surface-variant block font-extrabold">Required documents checkpoints</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5">
                  {DOCUMENT_TYPES.map((doc) => {
                    const isChecked = selectedDocs.includes(doc.value);
                    return (
                      <div key={doc.value} className="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          id={`chkDoc_${doc.value}`}
                          checked={isChecked}
                          onChange={() => {
                            setSelectedDocs(prev => isChecked ? prev.filter(d => d !== doc.value) : [...prev, doc.value]);
                          }}
                          className="w-4 h-4 text-primary bg-surface border-outline-variant rounded focus:ring-primary shrink-0"
                        />
                        <label htmlFor={`chkDoc_${doc.value}`} className="text-[11px] text-on-surface font-semibold select-none cursor-pointer" title={doc.required_by}>{doc.label}</label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AUTOMATED FIELD COMPLETENESS CHECKER */}
              {(() => {
                const requiredFields = [
                  { key: 'name', label: 'Name', val: formName },
                  { key: 'provider', label: 'Provider', val: formProvider },
                  { key: 'description', label: 'Description', val: formDescription },
                  { key: 'eligibility', label: 'Eligibility', val: formEligibility },
                  { key: 'deadline', label: 'Deadline', val: formDeadline },
                  { key: 'apply_url', label: 'Apply URL', val: formApplyUrl },
                  { key: 'degree_levels', label: 'Degree Levels', val: selectedDegrees.length > 0 },
                  { key: 'countries', label: 'Countries', val: (formCountries.length > 0 || selectedCountries.length > 0) },
                  { key: 'host_region', label: 'Host Region', val: !!formHostRegion },
                  { key: 'funding_type', label: 'Funding Type', val: !!formFundingType },
                ];
                const missing = requiredFields.filter(f => !f.val || (typeof f.val === 'string' && !f.val.trim()));
                return (
                  <div className={`bg-surface-container-low border-2 rounded-3xl p-5 space-y-3.5 ${missing.length > 0 ? 'border-status-warning/40' : 'border-status-success/20'}`}>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-primary flex items-center gap-2">
                        {missing.length > 0 ? <AlertTriangle className="w-4 h-4 text-status-warning" /> : <CheckCircle className="w-4 h-4 text-status-success" />}
                        Field Completeness Check
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${missing.length === 0 ? 'bg-status-success/10 text-status-success' : 'bg-status-warning/10 text-status-warning'}`}>
                        {missing.length} field{missing.length !== 1 ? 's' : ''} need attention
                      </span>
                    </div>
                    {missing.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {missing.map(f => (
                          <span key={f.key} className="text-[9px] font-bold text-error bg-error/5 border border-error/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-error" /> {f.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {missing.length === 0 && (
                      <p className="text-[10px] text-status-success font-semibold">All required fields are filled.</p>
                    )}
                  </div>
                );
              })()}

            </div>

            {/* Sticky form actions footer */}
            <div className="sticky bottom-0 bg-surface-container-low border-t border-outline-variant/60 px-6 py-4 flex justify-between gap-3 items-center">
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 border border-outline-variant text-on-surface-variant font-bold text-xs rounded-xl hover:bg-surface-container transition-colors cursor-pointer"
              >
                Dismiss Changes
              </button>
              <button type="button" onClick={() => {
                    const previewData = {
                      name: formName,
                      provider: formProvider,
                      host_institution: formHostInstitution || formHost,
                      countries: formCountries.length > 0 ? formCountries : selectedCountries,
                      degree_levels: selectedDegrees,
                      fields_of_study: formFieldsOfStudy.length > 0 ? formFieldsOfStudy : selectedFields,
                      funding_type: formFundingType,
                      amount: formAmount,
                      deadline: formDeadline,
                      apply_url: formApplyUrl,
                      description: formDescription,
                      eligibility: formEligibility,
                      host_region: formHostRegion,
                      no_ielts: formNoIelts,
                      work_experience_required: formWorkExp,
                      age_limit_masters: formAgeMasters,
                      age_limit_phd: formAgePhd,
                      sponsor_type: formSponsorType,
                      urgency: formDeadline ? (Math.ceil((new Date(formDeadline).getTime() - Date.now()) / 86400000) <= 30 ? 'Urgent' : Math.ceil((new Date(formDeadline).getTime() - Date.now()) / 86400000) <= 60 ? 'Warning' : 'Normal') : 'Normal',
                    };
                    localStorage.setItem('zawadi_preview_scholarship', JSON.stringify(previewData));
                    window.open('/', '_blank');
                  }}
                  className="py-2.5 px-4 bg-surface-container text-on-surface hover:bg-surface-container-high rounded-xl font-bold text-[11px] transition-all cursor-pointer border border-outline-variant/40">
                    <Eye className="w-3.5 h-3.5 inline mr-1" />
                    Preview as Student
                  </button>
              <div className="flex items-center gap-2">
                {editingId && formPublished && (
                  <button 
                    type="button"
                    onClick={() => { handleFormSubmit({ preventDefault: () => {} } as any, false); }}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Unpublish
                  </button>
                )}
                {editingId && !formPublished && (
                  <button 
                    type="button"
                    onClick={() => { handleFormSubmit({ preventDefault: () => {} } as any, true); }}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Publish
                  </button>
                )}
                <button 
                  type="submit"
                  className="bg-primary text-white font-black text-xs py-2.5 px-6 rounded-xl transition-all hover:scale-101 active:scale-98 shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-secondary" />
                  {editingId ? 'Save & Push Updates' : 'Publish to Database'}
                </button>
              </div>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
