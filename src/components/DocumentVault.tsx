import React, { useState } from 'react';
import { DocumentVaultItem, ExtractionConfirmationData } from '../types';
import ConfirmationDialog from './ConfirmationDialog';
import { downloadDocument } from '../lib/supabase-queries';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

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

  const getDocIcon = (type: string) => {
    if (type.includes('CV') || type.includes('Resume')) return 'badge';
    if (type.includes('Transcript')) return 'table_chart';
    if (type.includes('Letter') || type.includes('SOP') || type.includes('Purpose')) return 'description';
    return 'article';
  };

  const getExtractionBadge = (doc: DocumentVaultItem) => {
    const method = doc.extraction_method;
    if (!method || doc.analysis_status !== 'completed') return null;

    const badges: Record<string, { label: string; cls: string; tip: string }> = {
      pattern: { label: 'P', cls: 'bg-green-100 text-green-700 border-green-200', tip: 'Extracted by pattern matching — no AI used' },
      ai: { label: 'AI', cls: 'bg-purple-100 text-purple-700 border-purple-200', tip: 'Extracted by DeepSeek AI' },
      hybrid: { label: 'H', cls: 'bg-amber-100 text-amber-700 border-amber-200', tip: 'Hybrid — pattern matching with AI fallback' },
    };

    const b = badges[method] || badges.hybrid;
    return (
      <span title={b.tip} className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${b.cls}`}>
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
    if (conf >= 0.85) return <span title="High confidence" className="text-green-600 text-xs">&#10003;</span>;
    if (conf >= 0.7) return <span title="Medium confidence — verify" className="text-amber-500 text-xs">&#9679;</span>;
    return <span title="Low confidence — please verify" className="text-red-500 text-xs">&#9671;</span>;
  };

  return (
    <div className="space-y-6 animate-sweep">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-display text-2xl font-black text-primary">Document Vault folder</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">Securely organize, match, and load credentials required for global admissions.</p>
        </div>
        <button
          onClick={async () => {
            setRefreshSpin(true);
            await onRefreshDocuments();
            setTimeout(() => setRefreshSpin(false), 600);
          }}
          className="p-2 border border-outline-variant hover:bg-surface-container-low text-on-surface-variant rounded-lg transition-colors cursor-pointer"
          title="Refresh documents"
        >
          <span className={`material-symbols-outlined text-sm ${refreshSpin ? 'animate-spin' : ''}`}>refresh</span>
        </button>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/60 w-full md:w-72 shadow-sm shrink-0">
          <div className="flex justify-between items-center mb-2 text-xs">
            <span className="font-semibold text-on-surface-variant">Storage Slots</span>
            <span className="font-black text-primary">
              {currentCount} / {limit === 9999 ? 'Unlimited' : limit} used
            </span>
          </div>
          <div className="w-full bg-surface-container-high rounded-full h-1.5 mb-2 overflow-hidden">
            <div
              className={`h-full bg-primary rounded-full transition-all`}
              style={{ width: `${Math.min(100, (currentCount / limit) * 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center text-[10px] font-bold text-secondary mt-1 px-1">
            <span>Tier: {userPlan.toUpperCase()}</span>
            {userPlan === 'explorer' && (
              <button
                onClick={() => onNavigateToTab('billing')}
                className="text-amber-500 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                Upgrade <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-error-container/10 border border-error/20 text-error text-xs rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">warning</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Dropzone Form */}
      <div className="bg-surface-container-lowest border-2 border-dashed border-outline-variant/60 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-xs">
        <div className="bg-primary/5 text-primary p-3 rounded-full mb-4">
          <span className="material-symbols-outlined text-3xl">cloud_upload</span>
        </div>
        <h3 className="font-display text-lg font-bold text-on-surface mb-2">Load Credentials</h3>
        <p className="text-xs text-on-surface-variant mb-6 max-w-sm">Connect a virtual transcript, personal CV, or scanned ID to matching checklists.</p>

        <form onSubmit={handleUpload} className="w-full max-w-lg flex flex-col md:flex-row gap-3 items-center justify-center">
          <label className="w-full md:flex-1 cursor-pointer">
            <span className={`block p-2.5 bg-surface border border-outline-variant/60 rounded-lg text-xs ${selectedFile ? 'text-on-surface font-bold' : 'text-outline'}`}>
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
            className="w-full md:w-auto p-2.5 bg-surface border border-outline-variant/60 rounded-lg text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
          >
            {docTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <button
            type="submit"
            disabled={uploading}
            className="w-full md:w-auto bg-primary text-on-primary font-bold text-xs py-2.5 px-6 rounded-lg hover:bg-primary-container transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
          >
            {uploading ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
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
            className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-primary/5 text-primary p-3 rounded-lg">
                <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {getDocIcon(doc.type)}
                </span>
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
                    className="text-on-surface-variant hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-container-high cursor-pointer"
                    title="Download file"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                  </button>
                )}
                <button
                  onClick={() => setDocToDelete(doc.id)}
                  className="text-on-surface-variant hover:text-status-urgent transition-colors p-1 rounded-full hover:bg-surface-container-high cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>

            <h4 className="font-bold text-sm text-on-surface mb-2 truncate" title={doc.name}>{doc.name}</h4>

            <div className="flex items-center gap-2 mt-1 mb-2 flex-wrap">
              {doc.ai_extraction_result && doc.analysis_status === 'completed' && (
                <>
                  {getExtractionBadge(doc)}
                  <button
                    onClick={() => openConfirmation(doc)}
                    className="inline-flex items-center gap-1 bg-primary-fixed/20 text-primary text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-primary/20 cursor-pointer hover:bg-primary-fixed/40 transition-colors"
                    title={doc.user_confirmed ? 'Confirmed by you' : 'Review & confirm extracted data'}
                  >
                    <span className="material-symbols-outlined text-[10px]">
                      {doc.user_confirmed ? 'verified' : 'rate_review'}
                    </span>
                    {doc.user_confirmed ? 'Confirmed' : 'Review'}
                  </button>
                </>
              )}
              {doc.analysis_status === 'failed' && (
                <span className="inline-flex items-center gap-1 bg-status-urgent/10 text-status-urgent text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-status-urgent/20">
                  <span className="material-symbols-outlined text-[10px]">error_outline</span>
                  Failed
                </span>
              )}
              {doc.analysis_status === 'pending' && (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-200">
                  <span className="material-symbols-outlined text-[10px]">pending</span>
                  Pending
                </span>
              )}
              {doc.analysis_status === 'completed' && !doc.ai_extraction_result && (
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-green-200">
                  <span className="material-symbols-outlined text-[10px]">check_circle</span>
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
                  className="inline-flex items-center gap-1 bg-surface-container-high text-on-surface-variant text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-outline-variant/40 cursor-pointer hover:bg-primary-fixed/20 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[10px]">edit_note</span>
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
                  className="inline-flex items-center gap-1 bg-surface-container-high text-on-surface-variant text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-outline-variant/40 cursor-pointer hover:bg-primary-fixed/20 hover:text-primary transition-colors disabled:opacity-50"
                >
                  {aiExtracting === doc.id ? (
                    <span className="inline-block w-2.5 h-2.5 border-2 border-on-surface-variant border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span className="material-symbols-outlined text-[10px]">refresh</span>
                  )}
                  {aiExtracting === doc.id ? 'Analyzing...' : 'Re-analyze'}
                </button>
              )}
            </div>

            <div className="flex justify-between items-center mt-2 pt-3 border-t border-outline-variant/10">
              <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded">
                {doc.type}
              </span>
              <div className="text-right text-[10px] text-outline font-semibold">
                <p>{doc.size}</p>
                <p>Uploaded: {doc.uploaded_at}</p>
              </div>
            </div>
          </div>
        ))}

        {documents.length === 0 && (
          <div className="col-span-12 text-center py-16 bg-surface-container-lowest border border-outline-variant/40 rounded-3xl">
            <span className="material-symbols-outlined text-4xl text-outline mb-4">folder_open</span>
            <h4 className="font-semibold text-on-surface mb-1">Your vault is completely empty</h4>
            <p className="text-xs text-on-surface-variant">Upload transcripts, motivation drafts, or resumes above to match opportunities.</p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmDoc && confirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-sweep">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">verified</span>
                <h3 className="font-display font-black text-primary text-sm">Confirm Extracted Details</h3>
              </div>
              <button onClick={() => { setConfirmDoc(null); setConfirmData(null); }} className="p-1 hover:bg-surface-container rounded cursor-pointer">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <p className="text-xs text-on-surface-variant mb-2">Review the extracted information below. Fields with high confidence are pre-verified. Correct any errors before saving.</p>
              <div className="bg-surface rounded-xl p-4 space-y-3 text-xs">
                {Object.entries(confirmData).map(([key, val]) => {
                  if (key === 'skills') return null;
                  const displayVal = val ?? '—';
                  return (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <span className="text-on-surface-variant font-medium capitalize min-w-[120px]">{key.replace(/_/g, ' ')}</span>
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
                          className="w-full max-w-[160px] p-1.5 bg-surface-container-high border border-outline-variant/40 rounded text-right text-on-surface font-bold"
                          step={key === 'gpa' ? '0.01' : '1'}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-on-surface-variant italic">Your confirmed details will update your profile and improve scholarship matching.</p>
            </div>
            <div className="p-4 border-t border-outline-variant/30 flex justify-end gap-3">
              <button
                onClick={() => { setConfirmDoc(null); setConfirmData(null); }}
                className="text-xs font-bold text-on-surface-variant px-4 py-2 rounded-lg hover:bg-surface-container cursor-pointer"
              >
                Skip for Now
              </button>
              <button
                onClick={handleSaveConfirmation}
                disabled={savingConfirm}
                className="bg-primary text-on-primary font-bold text-xs px-6 py-2 rounded-lg hover:bg-primary-container transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {savingConfirm ? (
                  <><span className="inline-block w-3 h-3 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>Saving...</>
                ) : 'Save Confirmed Details'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal for unreadable/failed docs */}
      {manualEntryDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-sweep">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">edit_note</span>
                <h3 className="font-display font-black text-primary text-sm">Enter Details Manually</h3>
              </div>
              <button onClick={() => setManualEntryDoc(null)} className="p-1 hover:bg-surface-container rounded cursor-pointer">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <p className="text-xs text-status-urgent mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">info</span>
                We could not read the text from your document. This may happen if the file is password-protected or uses an unusual format. Your document is safely stored. Please fill in your details below.
              </p>
              <div className="bg-surface rounded-xl p-4 space-y-3 text-xs">
                {Object.entries(manualForm).map(([key, val]) => {
                  if (key === 'skills') return null;
                  const displayVal = val ?? '';
                  return (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <span className="text-on-surface-variant font-medium capitalize min-w-[120px]">{key.replace(/_/g, ' ')}</span>
                      <input
                        type={key === 'gpa' || key === 'work_experience_years' ? 'number' : key === 'graduation_year' ? 'number' : 'text'}
                        value={String(displayVal)}
                        onChange={(e) => {
                          const newForm = { ...manualForm };
                          const raw = e.target.value;
                          (newForm as any)[key] = key === 'gpa' ? (raw ? parseFloat(raw) : null) : key === 'work_experience_years' ? (raw ? parseFloat(raw) : null) : key === 'graduation_year' ? (raw ? parseInt(raw) : null) : raw || null;
                          setManualForm(newForm);
                        }}
                        className="w-full max-w-[160px] p-1.5 bg-surface-container-high border border-outline-variant/40 rounded text-right text-on-surface font-bold"
                        step={key === 'gpa' ? '0.01' : '1'}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t border-outline-variant/30 flex justify-end gap-3">
              <button
                onClick={() => setManualEntryDoc(null)}
                className="text-xs font-bold text-on-surface-variant px-4 py-2 rounded-lg hover:bg-surface-container cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleManualSave}
                disabled={savingConfirm}
                className="bg-primary text-on-primary font-bold text-xs px-6 py-2 rounded-lg hover:bg-primary-container transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {savingConfirm ? (
                  <><span className="inline-block w-3 h-3 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>Saving...</>
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
  );
}
