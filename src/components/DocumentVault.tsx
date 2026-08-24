import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, BadgeCheck, CheckCircle2, CircleAlert, Clock, CloudUpload,
  Download, FileSpreadsheet, FileText, FolderOpen, IdCard, Info,
  MessageSquareText, Pencil, RotateCcw, Trash2, TriangleAlert, X,
} from 'lucide-react';
import { SEO } from './SEO';
import type { LucideIcon } from 'lucide-react';
import { DocumentVaultItem, ExtractionConfirmationData } from '../types';
import ConfirmationDialog from './ConfirmationDialog';
import { downloadDocument } from '../lib/supabase-queries';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const helperCls = 'text-ed-caption normal-case tracking-normal text-graphite';

interface DocumentVaultProps {
  user: any;
  documents: DocumentVaultItem[];
  onUploadDocument: (file: File, docType: string) => void;
  onRemoveDoc: (id: string) => void;
  onReanalyzeDocument?: (doc: DocumentVaultItem) => Promise<void>;
  onNavigateToTab: (tab: string) => void;
  onRefreshDocuments: () => void;
  userEmail?: string;
}

export default function DocumentVault({
  user,
  documents,
  onUploadDocument,
  onRemoveDoc,
  onReanalyzeDocument,
  onNavigateToTab,
  onRefreshDocuments,
  userEmail
}: DocumentVaultProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('Academic Transcript');
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [aiExtractionDoc, setAiExtractionDoc] = useState<DocumentVaultItem | null>(null);
  const [aiExtractionData, setAiExtractionData] = useState<any>(null);
  const [aiExtracting, setAiExtracting] = useState<string | null>(null);
  const [refreshSpin, setRefreshSpin] = useState(false);
  const [confirmDoc, setConfirmDoc] = useState<DocumentVaultItem | null>(null);
  const [confirmData, setConfirmData] = useState<ExtractionConfirmationData | null>(null);
  const [savingConfirm, setSavingConfirm] = useState(false);
  const [manualEntryDoc, setManualEntryDoc] = useState<DocumentVaultItem | null>(null);
  const [manualForm, setManualForm] = useState<ExtractionConfirmationData>({
    institution_name: null, degree_level: null, field_of_study: null,
    gpa: null, gpa_scale: null, gpa_system: null,
    graduation_year: null, work_experience_years: null, skills: [],
  });

  // Honest auto-retry: analysis_status 'pending' used to sit there forever with a
  // claim that it would "retry automatically". Make that true — docs pending for
  // over 90s get one silent re-analysis attempt per session.
  const autoRetriedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!onReanalyzeDocument) return;
    const stuck = (documents || []).filter(d =>
      d.analysis_status === 'pending' &&
      !autoRetriedRef.current.has(d.id) &&
      Date.parse(d.uploaded_at) < Date.now() - 90_000
    );
    for (const doc of stuck.slice(0, 3)) {
      autoRetriedRef.current.add(doc.id);
      onReanalyzeDocument(doc).catch(() => {});
    }
  }, [documents, onReanalyzeDocument]);

  const docTypes = [
    "CV / Resume", "Academic Transcript", "Motivation Letter", "Statement of Purpose",
    "Reference Letter", "Passport / ID", "Financial Evidence", "Admission Letter", "Other"
  ];

  const userPlan = (user?.plan || 'explorer').toLowerCase();
  const limit = userPlan === 'plus' ? 50 : userPlan === 'pro' || userPlan === 'institutional' ? 9999 : 15;
  const currentCount = documents.length;
  const isFull = currentCount >= limit;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setErrorMsg('');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg("Please select a file to upload (PDF, JPG, or PNG up to 10MB)");
      return;
    }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(selectedFile.type)) {
      setErrorMsg("Only PDF, JPG, and PNG files are accepted");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMsg("File size exceeds 10MB limit");
      return;
    }
    if (isFull) {
      setErrorMsg(`Vault limit reached (${currentCount}/${limit}). Upgrade to higher storage packages to proceed!`);
      return;
    }
    setErrorMsg("");
    setUploading(true);
    try {
      await onUploadDocument(selectedFile, docType);
      setSelectedFile(null);
      setTimeout(() => onRefreshDocuments(), 2000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getDocIcon = (type: string): LucideIcon => {
    if (type.includes('CV') || type.includes('Resume')) return IdCard;
    if (type.includes('Transcript')) return FileSpreadsheet;
    if (type.includes('Letter') || type.includes('SOP') || type.includes('Purpose')) return FileText;
    return FileText;
  };

  const getExtractionBadge = (doc: DocumentVaultItem) => {
    const method = doc.extraction_method;
    if (!method || doc.analysis_status !== 'completed') return null;

    const badges: Record<string, { label: string; cls: string; tip: string }> = {
      pattern: { label: 'P', cls: 'bg-parchment text-graphite border-ash', tip: 'Extracted by pattern matching — no AI used' },
      ai: { label: 'AI', cls: 'bg-deep-charcoal text-pure-white border-deep-charcoal', tip: 'Extracted by DeepSeek AI' },
      hybrid: { label: 'H', cls: 'bg-electric-lime/40 text-off-black-ink border-off-black-ink/20', tip: 'Hybrid — pattern matching with AI fallback' },
    };

    const b = badges[method] || badges.hybrid;
    return (
      <span title={b.tip} className={`inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${b.cls}`}>
        {b.label}
      </span>
    );
  };

  const parseExtraction = (doc: DocumentVaultItem): ExtractionConfirmationData | null => {
    if (!doc.ai_extraction_result) return null;
    try {
      const parsed = typeof doc.ai_extraction_result === 'string'
        ? JSON.parse(doc.ai_extraction_result)
        : doc.ai_extraction_result;
      return {
        institution_name: parsed.institution_name ?? parsed.data?.institution_name ?? null,
        degree_level: parsed.degree_level ?? parsed.data?.degree_level ?? null,
        field_of_study: parsed.field_of_study ?? parsed.data?.field_of_study ?? null,
        gpa: parsed.gpa ?? parsed.data?.gpa ?? null,
        gpa_scale: parsed.gpa_scale ?? parsed.data?.gpa_scale ?? null,
        gpa_system: parsed.gpa_system ?? parsed.data?.gpa_system ?? null,
        graduation_year: parsed.graduation_year ?? parsed.data?.graduation_year ?? null,
        work_experience_years: parsed.work_experience_years ?? parsed.data?.work_experience_years ?? null,
        skills: parsed.skills ?? parsed.data?.skills ?? [],
      };
    } catch { return null; }
  };

  const openConfirmation = (doc: DocumentVaultItem) => {
    const data = parseExtraction(doc);
    if (data) {
      setConfirmDoc(doc);
      setConfirmData(data);
    }
  };

  const handleSaveConfirmation = async () => {
    if (!confirmDoc || !confirmData) return;
    setSavingConfirm(true);
    try {
      const { error } = await supabase
        .from('documents')
        .update({ user_confirmed: true })
        .eq('id', confirmDoc.id);
      if (error) throw error;

      if (userEmail) {
        const profileUpdate: Record<string, any> = {};
        if (confirmData.gpa) profileUpdate.gpa = confirmData.gpa;
        if (confirmData.institution_name) profileUpdate.institution = confirmData.institution_name;
        if (confirmData.field_of_study) profileUpdate.field_of_study = confirmData.field_of_study;
        if (confirmData.degree_level) profileUpdate.degree_level = confirmData.degree_level;
        if (confirmData.graduation_year) profileUpdate.graduation_year = confirmData.graduation_year;
        if (confirmData.work_experience_years) profileUpdate.work_experience_years = confirmData.work_experience_years;
        profileUpdate.doc_gpa_user_confirmed = confirmData.gpa;

        if (Object.keys(profileUpdate).length > 0) {
          await supabase.from('profiles').update(profileUpdate).eq('email', userEmail);
        }
      }

      toast.success('Details confirmed and saved to your profile!');
      setConfirmDoc(null);
      setConfirmData(null);
      onRefreshDocuments();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save confirmation');
    } finally {
      setSavingConfirm(false);
    }
  };

  const handleManualSave = async () => {
    if (!manualEntryDoc) return;
    setSavingConfirm(true);
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          ai_extraction_result: manualForm,
          analysis_status: 'completed',
          extraction_method: 'manual',
          user_confirmed: true,
        })
        .eq('id', manualEntryDoc.id);
      if (error) throw error;

      if (userEmail) {
        const profileUpdate: Record<string, any> = {};
        if (manualForm.gpa) profileUpdate.gpa = manualForm.gpa;
        if (manualForm.institution_name) profileUpdate.institution = manualForm.institution_name;
        if (manualForm.field_of_study) profileUpdate.field_of_study = manualForm.field_of_study;
        if (manualForm.degree_level) profileUpdate.degree_level = manualForm.degree_level;
        if (manualForm.work_experience_years) profileUpdate.work_experience_years = manualForm.work_experience_years;
        profileUpdate.doc_gpa_user_confirmed = manualForm.gpa;

        if (Object.keys(profileUpdate).length > 0) {
          await supabase.from('profiles').update(profileUpdate).eq('email', userEmail);
        }
      }

      toast.success('Details saved to your profile!');
      setManualEntryDoc(null);
      onRefreshDocuments();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save');
    } finally {
      setSavingConfirm(false);
    }
  };

  const confidenceIcon = (val: any, conf?: number) => {
    if (conf === undefined) return null;
    if (conf >= 0.85) return <span title="High confidence" className="text-off-black-ink text-xs">&#10003;</span>;
    if (conf >= 0.7) return <span title="Medium confidence — verify" className="text-stone text-xs">&#9679;</span>;
    return <span title="Low confidence — please verify" className="text-error text-xs">&#9671;</span>;
  };

  return (
    <div className="bg-pure-white text-off-black-ink max-w-[1200px] mx-auto px-4 sm:px-6 py-14 md:py-20">
      <SEO title="Document Vault | Techsari" description="Store transcripts, MOI letters and recommendations once — reuse them across every application." path="/documentvault" noindex />

      <div className="space-y-8 animate-sweep">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-ed-sub font-medium text-off-black-ink">Document Vault folder</h2>
            <p className={helperCls + ' mt-0.5'}>Securely organize, match, and load credentials required for global admissions.</p>
          </div>
          <button
            onClick={async () => {
              setRefreshSpin(true);
              await onRefreshDocuments();
              setTimeout(() => setRefreshSpin(false), 600);
            }}
            className="icon-btn inline-flex items-center justify-center rounded-full border border-ash text-graphite hover:text-off-black-ink hover:border-graphite transition-colors cursor-pointer shrink-0 self-start md:self-auto"
            title="Refresh documents"
          >
            <RotateCcw className={`w-4 h-4 ${refreshSpin ? 'animate-spin' : ''}`} />
          </button>

          <div className="bg-pure-white p-4 rounded-lg border border-ash w-full md:w-72 shrink-0">
            <div className="flex justify-between items-center mb-2 text-ed-caption">
              <span className="font-medium text-graphite">Storage Slots</span>
              <span className="font-medium text-off-black-ink">
                {currentCount} / {limit === 9999 ? 'Unlimited' : limit} used
              </span>
            </div>
            <div className="w-full bg-ash rounded-full h-1 mb-2 overflow-hidden">
              <div
                className={`h-full bg-electric-lime rounded-full transition-all`}
                style={{ width: `${Math.min(100, (currentCount / limit) * 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-ed-caption font-medium text-graphite mt-1 px-1">
              <span>Tier: {userPlan.toUpperCase()}</span>
              {userPlan === 'explorer' && (
                <button
                  onClick={() => onNavigateToTab('billing')}
                  className="text-off-black-ink underline decoration-electric-lime underline-offset-2 hover:text-graphite hover:decoration-graphite flex items-center gap-0.5 cursor-pointer"
                >
                  Upgrade <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
            <TriangleAlert className="w-4 h-4 text-error shrink-0" />
            <span className="text-ed-caption normal-case tracking-normal text-error">{errorMsg}</span>
          </div>
        )}

        {/* Upload Dropzone Form */}
        <div className="bg-parchment border-2 border-dashed border-ash hover:border-graphite rounded-ed p-8 flex flex-col items-center justify-center text-center transition-colors">
          <CloudUpload className="w-6 h-6 text-graphite mb-3" />
          <h3 className="text-ed-body font-medium text-off-black-ink mb-1">Load Credentials</h3>
          <p className={helperCls + ' mb-6 max-w-sm'}>Connect a virtual transcript, personal CV, or scanned ID to matching checklists.</p>

          <form onSubmit={handleUpload} className="w-full max-w-lg flex flex-col md:flex-row gap-3 items-center justify-center">
            <label className="w-full md:flex-1 cursor-pointer">
              <span className={`block px-4 py-3 min-h-[44px] bg-pure-white border border-ash rounded-lg text-ed-body-sm truncate ${selectedFile ? 'text-off-black-ink font-medium' : 'text-graphite'}`}>
                {selectedFile ? selectedFile.name : 'Choose file (PDF, JPG, PNG)'}
              </span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full md:w-auto px-4 py-3 min-h-[44px] bg-pure-white border border-ash rounded-lg text-ed-body-sm text-off-black-ink focus:border-graphite focus:outline-none cursor-pointer"
            >
              {docTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <button
              type="submit"
              disabled={uploading}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-electric-lime min-h-[44px] py-3 px-6 text-ed-body-sm font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
            >
              {uploading ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-off-black-ink border-t-transparent rounded-full animate-spin"></span>
                  Uploading...
                </>
              ) : 'Upload'}
            </button>
          </form>
        </div>

        {/* Vault Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-pure-white border border-ash rounded-ed p-5 transition-colors relative group hover:border-graphite/60"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-parchment text-graphite">
                  {(() => { const DocIcon = getDocIcon(doc.type); return <DocIcon className="w-5 h-5" />; })()}
                </div>

                <div className="flex items-center gap-1">
                  {doc.file_path && (
                    <button
                      onClick={async () => {
                        try {
                          const { data, error } = await downloadDocument(doc.file_path!);
                          if (error) throw error;
                          const url = URL.createObjectURL(data);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = doc.name;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch {
                          toast.error('Could not download file');
                        }
                      }}
                      className="icon-btn inline-flex items-center justify-center rounded-full text-graphite hover:text-off-black-ink transition-colors cursor-pointer"
                      title="Download file"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setDocToDelete(doc.id)}
                    className="icon-btn inline-flex items-center justify-center rounded-full text-graphite hover:text-error transition-colors cursor-pointer"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h4 className="font-medium text-ed-body-sm text-off-black-ink mb-2 truncate" title={doc.name}>{doc.name}</h4>

              <div className="flex items-center gap-2 mt-1 mb-2 flex-wrap">
                {doc.ai_extraction_result && doc.analysis_status === 'completed' && (
                  <>
                    {getExtractionBadge(doc)}
                    <button
                      onClick={() => openConfirmation(doc)}
                      className={`inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider px-2 py-1 rounded-full border cursor-pointer transition-colors ${doc.user_confirmed ? 'bg-electric-lime text-off-black-ink border-off-black-ink' : 'bg-pure-white text-graphite border-ash hover:border-graphite hover:text-off-black-ink'}`}
                      title={doc.user_confirmed ? 'Confirmed by you' : 'Review & confirm extracted data'}
                    >
                      {doc.user_confirmed ? <BadgeCheck className="w-3 h-3" /> : <MessageSquareText className="w-3 h-3" />}
                      {doc.user_confirmed ? 'Confirmed' : 'Review'}
                    </button>
                  </>
                )}
                {doc.analysis_status === 'failed' && (
                  <span
                    title={doc.analysis_error || 'Analysis failed'}
                    className="inline-flex items-center gap-1 bg-error/10 text-error text-[9px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border border-error/20 cursor-help"
                  >
                    <CircleAlert className="w-3 h-3" />
                    Failed
                  </span>
                )}
                {doc.analysis_status === 'pending' && (
                  <span
                    title={doc.analysis_error || 'Extracting and matching your document'}
                    className="inline-flex items-center gap-1 bg-parchment text-graphite text-[9px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border border-ash"
                  >
                    <span className="inline-block w-2.5 h-2.5 border-2 border-graphite border-t-transparent rounded-full animate-spin" />
                    Analyzing…
                  </span>
                )}
                {doc.analysis_status === 'completed' && !doc.ai_extraction_result && (
                  <span className="inline-flex items-center gap-1 bg-electric-lime text-off-black-ink text-[9px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border border-off-black-ink">
                    <CheckCircle2 className="w-3 h-3" />
                    Analyzed
                  </span>
                )}
                {(doc.analysis_status === 'unreadable' || doc.analysis_status === 'failed' || doc.analysis_status === null) && (
                  <button
                    onClick={() => {
                      setManualForm({
                        institution_name: null, degree_level: null, field_of_study: null,
                        gpa: null, gpa_scale: null, gpa_system: null,
                        graduation_year: null, work_experience_years: null, skills: [],
                      });
                      setManualEntryDoc(doc);
                    }}
                    className="inline-flex items-center gap-1 bg-pure-white text-graphite text-[9px] font-medium uppercase tracking-wider px-2 py-1 rounded-full border border-ash cursor-pointer hover:text-off-black-ink hover:border-graphite transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    Enter manually
                  </button>
                )}
                {(doc.analysis_status === 'pending') && onReanalyzeDocument && (
                  <button
                    onClick={async () => {
                      setAiExtracting(doc.id);
                      try {
                        await onReanalyzeDocument(doc);
                      } finally {
                        setAiExtracting(null);
                      }
                    }}
                    disabled={aiExtracting === doc.id}
                    className="inline-flex items-center gap-1 bg-pure-white text-graphite text-[9px] font-medium uppercase tracking-wider px-2 py-1 rounded-full border border-ash cursor-pointer hover:text-off-black-ink hover:border-graphite transition-colors disabled:opacity-50"
                  >
                    {aiExtracting === doc.id ? (
                      <span className="inline-block w-2.5 h-2.5 border-2 border-off-black-ink border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <RotateCcw className="w-3 h-3" />
                    )}
                    {aiExtracting === doc.id ? 'Analyzing...' : 'Re-analyze'}
                  </button>
                )}
              </div>

              <div className="flex justify-between items-center mt-2 pt-3 border-t border-ash">
                <span className="bg-parchment text-graphite text-ed-eyebrow font-medium uppercase tracking-wider px-2.5 py-1 rounded-full">
                  {doc.type}
                </span>
                <div className="text-right text-ed-caption text-graphite">
                  <p>{doc.size}</p>
                  <p>Uploaded: {doc.uploaded_at}</p>
                </div>
              </div>
            </div>
          ))}

          {documents.length === 0 && (
            <div className="col-span-full text-center py-16 bg-parchment border border-dashed border-ash rounded-ed">
              <FolderOpen className="w-6 h-6 text-graphite mx-auto mb-4" />
              <h4 className="font-medium text-ed-body text-off-black-ink mb-1">Your vault is completely empty</h4>
              <p className={helperCls}>Upload transcripts, motivation drafts, or resumes above to match opportunities.</p>
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {confirmDoc && confirmData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-off-black-ink/65 backdrop-blur-sm p-4 animate-sweep">
            <div className="bg-pure-white rounded-ed border border-ash w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="p-5 border-b border-ash flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-off-black-ink" />
                  <h3 className="font-medium text-ed-body-sm text-off-black-ink">Confirm Extracted Details</h3>
                </div>
                <button onClick={() => { setConfirmDoc(null); setConfirmData(null); }} className="icon-btn inline-flex items-center justify-center rounded-full text-graphite hover:text-off-black-ink transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                <p className={helperCls + ' mb-2'}>Review the extracted information below. Fields with high confidence are pre-verified. Correct any errors before saving.</p>
                <div className="bg-parchment rounded-lg p-4 space-y-3 text-ed-body-sm">
                  {Object.entries(confirmData).map(([key, val]) => {
                    if (key === 'skills') return null;
                    const displayVal = val ?? '—';
                    return (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <span className="text-ed-caption font-medium text-graphite capitalize min-w-[120px]">{key.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <input
                            type={key === 'gpa' || key === 'work_experience_years' || key === 'graduation_year' ? 'number' : 'text'}
                            value={displayVal === '—' ? '' : String(displayVal)}
                            onChange={(e) => {
                              const newData = { ...confirmData };
                              const numVal = e.target.value ? (key === 'gpa' || key === 'work_experience_years' ? parseFloat(e.target.value) : key === 'graduation_year' ? parseInt(e.target.value) : e.target.value) : null;
                              (newData as any)[key] = numVal;
                              setConfirmData(newData);
                            }}
                            className="w-full max-w-[160px] px-2 py-2 min-h-[36px] bg-pure-white border border-ash rounded-md text-right text-ed-body-sm font-medium text-off-black-ink focus:border-graphite outline-none"
                            step={key === 'gpa' ? '0.01' : '1'}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-ed-caption italic text-graphite">Your confirmed details will update your profile and improve scholarship matching.</p>
              </div>
              <div className="p-4 border-t border-ash flex justify-end gap-3">
                <button
                  onClick={() => { setConfirmDoc(null); setConfirmData(null); }}
                  className="rounded-full border border-ash px-5 min-h-[44px] text-ed-caption font-medium text-graphite hover:text-off-black-ink hover:border-graphite transition-colors cursor-pointer"
                >
                  Skip for Now
                </button>
                <button
                  onClick={handleSaveConfirmation}
                  disabled={savingConfirm}
                  className="inline-flex items-center gap-2 rounded-full bg-electric-lime px-6 min-h-[44px] text-ed-caption font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingConfirm ? (
                    <><span className="inline-block w-3 h-3 border-2 border-off-black-ink border-t-transparent rounded-full animate-spin"></span>Saving...</>
                  ) : 'Save Confirmed Details'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Entry Modal for unreadable/failed docs */}
        {manualEntryDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-off-black-ink/65 backdrop-blur-sm p-4 animate-sweep">
            <div className="bg-pure-white rounded-ed border border-ash w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="p-5 border-b border-ash flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-off-black-ink" />
                  <h3 className="font-medium text-ed-body-sm text-off-black-ink">Enter Details Manually</h3>
                </div>
                <button onClick={() => setManualEntryDoc(null)} className="icon-btn inline-flex items-center justify-center rounded-full text-graphite hover:text-off-black-ink transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                <p className="text-ed-caption normal-case tracking-normal text-error mb-2 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>We could not read the text from your document. This may happen if the file is password-protected or uses an unusual format. Your document is safely stored. Please fill in your details below.</span>
                </p>
                <div className="bg-parchment rounded-lg p-4 space-y-3 text-ed-body-sm">
                  {Object.entries(manualForm).map(([key, val]) => {
                    if (key === 'skills') return null;
                    const displayVal = val ?? '';
                    return (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <span className="text-ed-caption font-medium text-graphite capitalize min-w-[120px]">{key.replace(/_/g, ' ')}</span>
                        <input
                          type={key === 'gpa' || key === 'work_experience_years' ? 'number' : key === 'graduation_year' ? 'number' : 'text'}
                          value={String(displayVal)}
                          onChange={(e) => {
                            const newForm = { ...manualForm };
                            const raw = e.target.value;
                            (newForm as any)[key] = key === 'gpa' ? (raw ? parseFloat(raw) : null) : key === 'work_experience_years' ? (raw ? parseFloat(raw) : null) : key === 'graduation_year' ? (raw ? parseInt(raw) : null) : raw || null;
                            setManualForm(newForm);
                          }}
                          className="w-full max-w-[160px] px-2 py-2 min-h-[36px] bg-pure-white border border-ash rounded-md text-right text-ed-body-sm font-medium text-off-black-ink focus:border-graphite outline-none"
                          step={key === 'gpa' ? '0.01' : '1'}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 border-t border-ash flex justify-end gap-3">
                <button
                  onClick={() => setManualEntryDoc(null)}
                  className="rounded-full border border-ash px-5 min-h-[44px] text-ed-caption font-medium text-graphite hover:text-off-black-ink hover:border-graphite transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualSave}
                  disabled={savingConfirm}
                  className="inline-flex items-center gap-2 rounded-full bg-electric-lime px-6 min-h-[44px] text-ed-caption font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingConfirm ? (
                    <><span className="inline-block w-3 h-3 border-2 border-off-black-ink border-t-transparent rounded-full animate-spin"></span>Saving...</>
                  ) : 'Save Details'}
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmationDialog
          isOpen={!!docToDelete}
          title="Delete Document from Vault"
          message={`Are you sure you want to permanently delete "${documents.find(d => d.id === docToDelete)?.name || 'this document'}" from your Document Vault? This entry will be removed alongside any real-time checklist associations.`}
          confirmText="Yes, Delete"
          cancelText="Keep Document"
          type="danger"
          onConfirm={() => {
            if (docToDelete) {
              onRemoveDoc(docToDelete);
              setDocToDelete(null);
            }
          }}
          onCancel={() => setDocToDelete(null)}
        />

      </div>
    </div>
  );
}
