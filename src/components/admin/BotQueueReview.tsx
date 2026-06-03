import React, { useState, useEffect, useCallback } from 'react';
import { Bot, RefreshCw, AlertTriangle, ExternalLink, ThumbsUp, ThumbsDown, CheckCircle, Search, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface BotQueueItem {
  id: string;
  extracted_data: any;
  source_url: string;
  confidence_score: number;
  scam_flags: string[];
  status: string;
  fingerprint: string;
  pipeline_run_id: string;
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  degree_levels: string[];
  host_region: string | null;
  countries: string[];
  name?: string;
}

interface PipelineStats {
  total_scholarships: number;
  published_scholarships: number;
  unpublished_scholarships: number;
  pending_review: number;
  high_confidence_pending: number;
  needs_review_pending: number;
  low_confidence_pending: number;
  scam_flagged_pending: number;
  approved_today: number;
  rejected_total: number;
  last_pipeline_run: string | null;
  scholarships_added_last_7_days: number;
}

const SCAM_FLAG_EXPLANATIONS: Record<string, string> = {
  application_fee_required: 'This scholarship requires an application fee. Do not publish.',
  non_institutional_contact: 'Contact email is not from an institutional domain. Verify legitimacy.',
  unverifiable_institution: 'Host institution could not be verified as accredited. Check independently.',
  suspicious_amount: 'Award amount is unusually high for an unverified institution.',
  broken_url: 'Application URL did not resolve during extraction. Verify before publishing.',
};

const HOST_REGIONS = [
  'West Africa hubs', 'East Africa hubs', 'Southern Africa hubs', 'North Africa hubs', 'Central Africa hubs',
  'United Kingdom and Ireland', 'United States and Canada', 'Australia and New Zealand',
  'Commonwealth Africa', 'Commonwealth Global', 'France and Belgium', 'Francophone destinations',
  'Lusophone destinations', 'Germany, Austria, Switzerland (German-speaking)',
  'Nordic countries: Sweden, Norway, Denmark, Finland', 'Netherlands and Belgium', 'Rest of Europe',
  'China and East Asia', 'Japan and South Korea', 'Southeast Asia', 'Middle East and Gulf states', 'Intra-African',
];

const SPONSOR_TYPES = ['Government', 'Foundation', 'University', 'Corporate', 'UN', 'Other'];
const DEGREE_OPTIONS = ['Secondary', 'Undergraduate', 'Masters', 'PhD', 'Postdoctoral', 'Professional', 'Short Course'];
const FUNDING_OPTIONS = ['Full', 'Partial', 'Tuition Only'];


function getDeadlineColor(deadline: string | null): string {
  if (!deadline) return 'text-on-surface-variant';
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days < 0) return 'text-status-urgent';
  if (days <= 30) return 'text-status-urgent font-bold';
  if (days <= 60) return 'text-status-warning font-bold';
  return 'text-on-surface';
}

function getDeadlineLabel(deadline: string | null): string {
  if (!deadline) return 'No deadline';
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return 'Due today';
  return `${days} days remaining`;
}

export default function BotQueueReview() {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [search, setSearch] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [scamFilterOnly, setScamFilterOnly] = useState(false);
  const [items, setItems] = useState<BotQueueItem[]>([]);
  const [historyItems, setHistoryItems] = useState<BotQueueItem[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [editingFields, setEditingFields] = useState<Record<string, any>>({});

  const triggerToast = useCallback((msg: string, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const invokeFn = useCallback(async (action: string, body: any = {}) => {
    const { data, error } = await supabase.functions.invoke('run-pipeline', { body: { action, ...body } });
    if (!error) return data;
    return null;
  }, []);

  const fetchStats = useCallback(async () => {
    const data = await invokeFn('stats');
    if (data) setStats(data);
  }, [invokeFn]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const statusFilter = activeTab === 'pending' ? 'pending' : 'approved,rejected';
      const data = await invokeFn('bot-queue', { status: statusFilter });
      if (data) {
        const list = data.items || [];
        let filtered = scamFilterOnly ? list.filter((i: BotQueueItem) => Array.isArray(i.scam_flags) && i.scam_flags.length > 0) : list;
        if (activeTab === 'pending') setItems(filtered);
        else setHistoryItems(filtered);
      }
    } catch {}
    setLoading(false);
  }, [activeTab, search, confidenceFilter, scamFilterOnly, invokeFn]);

  useEffect(() => { fetchStats(); fetchItems(); }, [fetchStats, fetchItems]);

  const handleRunPipeline = async () => {
    setRunningPipeline(true);
    try {
      const data = await invokeFn('run');
      if (data) {
        triggerToast(`Pipeline acknowledged. Pending: ${data.pending_count || 0}. ${data.tip || ''}`);
        fetchStats();
        fetchItems();
      } else triggerToast('Pipeline run failed', 'error');
    } catch {
      triggerToast('Pipeline run error', 'error');
    }
    setRunningPipeline(false);
  };

  const handleApprove = async (id: string) => {
    const edits = editingFields[id] || {};
    try {
      const data = await invokeFn('review', { ingestion_id: id, review_action: 'approved', edited_scholarship: edits });
      if (data?.success) {
        const item = items.find(i => i.id === id);
        triggerToast(`"${item?.extracted_data?.name || 'Scholarship'}" added to scholarships pending publish`);
        setItems(prev => prev.filter(i => i.id !== id));
        fetchStats();
      } else triggerToast('Approve failed', 'error');
    } catch {
      triggerToast('Approve error', 'error');
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      const data = await invokeFn('review', { ingestion_id: rejectModal, review_action: 'rejected', review_notes: rejectReason });
      if (data?.success) {
        triggerToast('Item rejected');
        setItems(prev => prev.filter(i => i.id !== rejectModal));
        fetchStats();
      } else triggerToast('Reject failed', 'error');
    } catch {
      triggerToast('Reject error', 'error');
    }
    setRejectModal(null);
    setRejectReason('');
  };

  const updateEditField = (id: string, field: string, value: any) => {
    setEditingFields(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  };

  const getEditValue = (item: BotQueueItem, field: string) => {
    const ed = editingFields[item.id];
    if (ed && ed[field] !== undefined) return ed[field];
    return item.extracted_data?.[field] ?? '';
  };

  const renderItemCard = (item: BotQueueItem, isHistory: boolean) => {
    const data = item.extracted_data || {};
    const confidence = item.confidence_score ?? parseFloat(data.confidence_score) ?? 0;
    const scamFlags: string[] = item.scam_flags || data.scam_flags || [];
    const hasScamFlags = scamFlags.length > 0;
    const name = data.name || '';
    const provider = data.provider || '';
    const hostInst = data.host_institution || '';
    const hostRegion = item.host_region || data.host_region || '';
    const degreeLevels = item.degree_levels || data.degree_levels || [];
    const countries = item.countries || data.countries || [];
    const fundingType = data.funding_type || '';
    const noIelts = data.no_ielts;
    const deadline = data.deadline || '';
    const amount = data.amount || '';
    const eligibility = data.eligibility || '';
    const description = data.description || '';
    const applyUrl = data.apply_url || '';
    const iso2 = data.iso2 || '';
    const workExp = data.work_experience_required;
    const ageMasters = data.age_limit_masters;
    const agePhd = data.age_limit_phd;
    const sponsorType = data.sponsor_type || '';
    const confidenceColor = confidence >= 0.8 ? 'bg-status-success' : confidence >= 0.5 ? 'bg-status-warning' : 'bg-status-urgent';

    return (
      <div key={item.id} className="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl shadow-xs p-5 hover:shadow-sm transition-all">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left panel: summary */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display font-black text-primary text-lg leading-tight">{name}</h3>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0 ${confidenceColor}`}>
                {Math.round(confidence * 100)}%
              </div>
            </div>
            <p className="text-sm font-semibold text-on-surface">{provider}</p>
            {hostInst && <p className="text-xs text-on-surface-variant">{hostInst}</p>}
            {sponsorType && <p className="text-[10px] text-on-surface-variant font-medium">{sponsorType}</p>}

            <div className="flex flex-wrap gap-1.5">
              {hostRegion && (
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-primary-container/20 text-primary border border-primary/20">
                  {hostRegion}
                </span>
              )}
              {degreeLevels.map((d: string) => (
                <span key={d} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-surface-container text-on-surface-variant border border-outline-variant/30">
                  {d}
                </span>
              ))}
              {fundingType && (
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${fundingType === 'Full' ? 'bg-status-success/10 text-status-success' : 'bg-surface-container text-on-surface-variant'}`}>
                  {fundingType}
                </span>
              )}
              {noIelts === true && (
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-status-success/10 text-status-success border border-status-success/20">
                  No IELTS
                </span>
              )}
            </div>

            <p className={`text-xs font-medium ${getDeadlineColor(deadline)}`}>
              {deadline ? `${deadline} — ${getDeadlineLabel(deadline)}` : 'No deadline set'}
            </p>

            <p className="text-xs text-on-surface-variant">
              {Array.isArray(countries) && countries.length > 0
                ? countries.length === 1 && countries[0] === 'All African Countries'
                  ? 'All African Countries'
                  : `${countries.length} African Countries`
                : 'No countries specified'}
            </p>

            <a href={item.source_url || data.source_url} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline">
              <ExternalLink className="w-3 h-3" /> View Source
            </a>
          </div>

          {/* Right panel: editable fields */}
          {!isHistory && (
            <div className="lg:col-span-7 space-y-3 bg-surface-container-low/30 border border-outline-variant/30 rounded-xl p-4">
              {hasScamFlags && (
                <div className="bg-error/5 border border-error/30 rounded-lg p-3 space-y-1">
                  <p className="text-[10px] font-black text-error uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Scam Flags Detected
                  </p>
                  {scamFlags.map((flag: string) => (
                    <p key={flag} className="text-[11px] text-error pl-4">{SCAM_FLAG_EXPLANATIONS[flag] || flag}</p>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">Name</label>
                  <input value={getEditValue(item, 'name')} onChange={e => updateEditField(item.id, 'name', e.target.value)}
                         className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2 text-xs outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">Provider</label>
                  <input value={getEditValue(item, 'provider')} onChange={e => updateEditField(item.id, 'provider', e.target.value)}
                         className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2 text-xs outline-none focus:border-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">Host Institution</label>
                  <input value={getEditValue(item, 'host_institution')} onChange={e => updateEditField(item.id, 'host_institution', e.target.value)}
                         className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2 text-xs outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">Funding Type</label>
                  <select value={getEditValue(item, 'funding_type')} onChange={e => updateEditField(item.id, 'funding_type', e.target.value)}
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2 text-xs outline-none focus:border-primary">
                    <option value="">None</option>
                    {FUNDING_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[{ key: 'deadline', label: 'Deadline', type: 'date', warn: true },
                  { key: 'amount', label: 'Amount', type: 'text', warn: true },
                  { key: 'apply_url', label: 'Apply URL', type: 'url', warn: true }].map(f => (
                  <div key={f.key}>
                    <label className={`text-[9px] font-bold uppercase flex items-center gap-1 ${f.warn ? 'text-status-warning' : 'text-on-surface-variant'}`}>
                      {f.warn && <AlertTriangle className="w-2.5 h-2.5" />}
                      {f.label}
                    </label>
                    <input type={f.type} value={getEditValue(item, f.key)} onChange={e => updateEditField(item.id, f.key, e.target.value)}
                           className={`w-full bg-surface-container-lowest border rounded-lg p-2 text-xs outline-none focus:border-primary ${f.warn ? 'border-status-warning/40' : 'border-outline-variant/40'}`} />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">Eligibility</label>
                  <textarea value={getEditValue(item, 'eligibility')} onChange={e => updateEditField(item.id, 'eligibility', e.target.value)} rows={2}
                            className="w-full bg-surface-container-lowest border border-status-warning/40 rounded-lg p-2 text-xs outline-none focus:border-primary resize-none" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">Description</label>
                  <textarea value={getEditValue(item, 'description')} onChange={e => updateEditField(item.id, 'description', e.target.value)} rows={2}
                            className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2 text-xs outline-none focus:border-primary resize-none" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">Degree Levels</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {DEGREE_OPTIONS.map(d => {
                      const val = getEditValue(item, 'degree_levels');
                      const arr = Array.isArray(val) ? val : [];
                      const checked = arr.includes(d);
                      return (
                        <label key={d} className={`px-2 py-0.5 rounded text-[9px] font-bold border cursor-pointer ${checked ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container text-on-surface-variant border-outline-variant/40'}`}>
                          <input type="checkbox" checked={checked}
                                 onChange={() => {
                                   const next = checked ? arr.filter((x: string) => x !== d) : [...arr, d];
                                   updateEditField(item.id, 'degree_levels', next);
                                 }} className="hidden" /> {d}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">Work Exp (yrs)</label>
                  <input type="number" value={getEditValue(item, 'work_experience_required') ?? ''}
                         onChange={e => updateEditField(item.id, 'work_experience_required', e.target.value ? parseInt(e.target.value) : null)}
                         className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2 text-xs outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">No IELTS</label>
                  <label className="flex items-center gap-2 mt-1 cursor-pointer">
                    <input type="checkbox" checked={getEditValue(item, 'no_ielts') === true}
                           onChange={e => updateEditField(item.id, 'no_ielts', e.target.checked)} className="w-4 h-4" />
                    <span className="text-xs">{getEditValue(item, 'no_ielts') ? 'Yes' : 'No'}</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">Host Region</label>
                  <select value={getEditValue(item, 'host_region')} onChange={e => updateEditField(item.id, 'host_region', e.target.value)}
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2 text-xs outline-none focus:border-primary">
                    <option value="">None</option>
                    {HOST_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">ISO2</label>
                  <input value={getEditValue(item, 'iso2')} onChange={e => updateEditField(item.id, 'iso2', e.target.value)}
                         className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2 text-xs outline-none focus:border-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">Age Limit (Masters)</label>
                  <input type="number" value={getEditValue(item, 'age_limit_masters') ?? ''}
                         onChange={e => updateEditField(item.id, 'age_limit_masters', e.target.value ? parseInt(e.target.value) : null)}
                         className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2 text-xs outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">Age Limit (PhD)</label>
                  <input type="number" value={getEditValue(item, 'age_limit_phd') ?? ''}
                         onChange={e => updateEditField(item.id, 'age_limit_phd', e.target.value ? parseInt(e.target.value) : null)}
                         className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2 text-xs outline-none focus:border-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">Sponsor Type</label>
                  <select value={getEditValue(item, 'sponsor_type')} onChange={e => updateEditField(item.id, 'sponsor_type', e.target.value)}
                          className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2 text-xs outline-none focus:border-primary">
                    <option value="">None</option>
                    {SPONSOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase">Countries</label>
                  <textarea value={Array.isArray(getEditValue(item, 'countries')) ? getEditValue(item, 'countries').join('\n') : ''}
                            onChange={e => updateEditField(item.id, 'countries', e.target.value.split('\n').map((s: string) => s.trim()).filter(Boolean))}
                            rows={2} placeholder="One per line or All African Countries"
                            className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-2 text-xs outline-none focus:border-primary resize-none" />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2 border-t border-outline-variant/30">
                <button onClick={() => handleApprove(item.id)}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${hasScamFlags ? 'bg-error text-white hover:bg-error-fixed' : 'bg-status-success/10 text-status-success border border-status-success/20 hover:bg-status-success/20'}`}>
                  <ThumbsUp className="w-3.5 h-3.5" />
                  {hasScamFlags ? 'Approve with Flags' : 'Approve'}
                </button>
                <button onClick={() => setRejectModal(item.id)}
                        className="flex-1 py-2 px-3 rounded-xl font-bold text-xs bg-error/5 text-error border border-error/20 hover:bg-error/10 flex items-center justify-center gap-1.5 cursor-pointer transition-all">
                  <ThumbsDown className="w-3.5 h-3.5" /> Reject
                </button>
                <button onClick={() => {
                  setItems(prev => {
                    const moved = prev.filter(i => i.id !== item.id);
                    const idx = prev.findIndex(i => i.id === item.id);
                    if (idx !== -1) moved.push(prev[idx]);
                    return moved;
                  });
                }}
                        className="flex-1 py-2 px-3 rounded-xl font-bold text-xs bg-surface-container text-on-surface-variant border border-outline-variant/40 hover:bg-surface-container-low flex items-center justify-center gap-1.5 cursor-pointer transition-all">
                  <X className="w-3.5 h-3.5" /> Skip
                </button>
              </div>
            </div>
          )}

          {/* History view: read-only */}
          {isHistory && (
            <div className="lg:col-span-7 space-y-2 bg-surface-container-low/30 border border-outline-variant/30 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${item.status === 'approved' ? 'bg-status-success/10 text-status-success' : 'bg-error/10 text-error'}`}>
                  {item.status === 'approved' ? 'Approved' : 'Rejected'}
                </span>
                {item.reviewed_by && <span className="text-[10px] text-on-surface-variant">by {item.reviewed_by}</span>}
                {item.reviewed_at && <span className="text-[10px] text-on-surface-variant">{new Date(item.reviewed_at).toLocaleString()}</span>}
              </div>
              {item.review_notes && <p className="text-xs text-on-surface bg-surface-container-low rounded-lg p-2">{item.review_notes}</p>}
              {hostRegion && <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-primary-container/20 text-primary">{hostRegion}</span>}
              {degreeLevels.map((d: string) => (
                <span key={d} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-surface-container text-on-surface-variant">{d}</span>
              ))}
              {fundingType && <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${fundingType === 'Full' ? 'bg-status-success/10 text-status-success' : ''}`}>{fundingType}</span>}
            </div>
          )}
        </div>
      </div>
    );
  };

  const list = activeTab === 'pending' ? items : historyItems;

  return (
    <div className="space-y-6 animate-sweep">
      {toast && (
        <div className={`fixed bottom-6 right-6 ${toast.type === 'error' ? 'bg-error' : 'bg-primary'} text-white border border-outline-variant/50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 z-50 animate-sweep text-xs font-bold`}>
          <CheckCircle className="w-4 h-4 text-secondary shrink-0" />
          {toast.msg}
        </div>
      )}

      {/* Pipeline stats bar */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="font-display text-lg font-black text-primary flex items-center gap-2">
            <Bot className="w-5 h-5" /> Pipeline Review Queue
          </h2>
          <button onClick={handleRunPipeline} disabled={runningPipeline}
                  className="text-xs font-bold bg-primary hover:bg-primary-container text-white py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
            {runningPipeline ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {runningPipeline ? 'Running...' : 'Run Pipeline Now'}
          </button>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
          {[
            { label: 'Pending Review', value: stats?.pending_review ?? 0, color: 'text-on-surface' },
            { label: 'High Confidence', value: stats?.high_confidence_pending ?? 0, color: 'text-status-success' },
            { label: 'Needs Review', value: stats?.needs_review_pending ?? 0, color: 'text-status-warning' },
            { label: 'Scam Flagged', value: stats?.scam_flagged_pending ?? 0, color: 'text-error' },
            { label: 'Approved Today', value: stats?.approved_today ?? 0, color: 'text-primary' },
            { label: 'Last Run', value: stats?.last_pipeline_run ? new Date(stats.last_pipeline_run).toLocaleDateString() : 'Never', color: 'text-on-surface-variant' },
            { label: 'Total Live', value: stats?.published_scholarships ?? 0, color: 'text-on-surface' },
          ].map(s => (
            <div key={s.label} className="bg-surface-container-low/50 rounded-xl p-2.5 text-center">
              <p className={`text-lg font-black ${s.color}`}>{typeof s.value === 'number' ? s.value : s.value}</p>
              <p className="text-[9px] text-on-surface-variant font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-outline-variant/30 pb-2">
        <button onClick={() => setActiveTab('pending')}
                className={`text-xs font-bold pb-1 border-b-2 transition-colors cursor-pointer ${activeTab === 'pending' ? 'text-primary border-primary' : 'text-on-surface-variant border-transparent hover:text-on-surface'}`}>
          Pending Review ({stats?.pending_review ?? 0})
        </button>
        <button onClick={() => setActiveTab('history')}
                className={`text-xs font-bold pb-1 border-b-2 transition-colors cursor-pointer ${activeTab === 'history' ? 'text-primary border-primary' : 'text-on-surface-variant border-transparent hover:text-on-surface'}`}>
          Reviewed History
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-on-surface-variant/75 absolute left-3 top-2.5" />
          <input value={search} onChange={e => setSearch(e.target.value)}
                 placeholder="Search by name..."
                 className="w-full bg-surface-container-low text-on-surface text-xs pl-9 pr-4 py-2 rounded-xl border border-outline-variant/20 focus:border-primary/50 outline-none" />
        </div>
        {['all', 'high', 'medium', 'low'].map(t => (
          <button key={t} onClick={() => setConfidenceFilter(t)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border cursor-pointer transition-all ${confidenceFilter === t ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/40 hover:bg-surface-container'}`}>
            {t === 'all' ? 'All' : t === 'high' ? 'High (>0.8)' : t === 'medium' ? 'Needs Review' : 'Low (<0.5)'}
          </button>
        ))}
        <button onClick={() => setScamFilterOnly(!scamFilterOnly)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border cursor-pointer transition-all ${scamFilterOnly ? 'bg-error text-white border-error' : 'bg-surface-container-low text-on-surface-variant border-outline-variant/40'}`}>
          Scam Flagged
        </button>
      </div>

      {/* Items */}
      <div className="space-y-4">
        {loading && <div className="text-center py-8 text-on-surface-variant text-xs"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading...</div>}
        {!loading && list.length === 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant/55 rounded-2xl py-16 text-center text-outline">
            <Bot className="w-8 h-8 mx-auto text-outline/50 mb-2" />
            <p className="font-bold text-xs">Queue is empty.</p>
            <p className="text-[10px] mt-0.5 font-light">Run the pipeline above to discover new scholarships.</p>
          </div>
        )}
        {list.map(item => renderItemCard(item, activeTab === 'history'))}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-outline-variant/30">
            <h3 className="font-bold text-sm text-primary mb-3">Reject Scholarship</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection (optional)"
                      className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-3 text-xs outline-none focus:border-primary resize-none" rows={3} />
            <div className="flex gap-2 mt-4">
              <button onClick={handleReject} className="flex-1 py-2 bg-error text-white rounded-xl font-bold text-xs cursor-pointer">Confirm Reject</button>
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="flex-1 py-2 bg-surface-container text-on-surface rounded-xl font-bold text-xs cursor-pointer">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
