import React, { useState } from 'react';
import { DocumentVaultItem } from '../types';
import ConfirmationDialog from './ConfirmationDialog';

interface DocumentVaultProps {
  user: any;
  documents: DocumentVaultItem[];
  onUploadDocument: (file: File, docType: string) => void;
  onRemoveDoc: (id: string) => void;
  onNavigateToTab: (tab: string) => void;
  onRefreshDocuments: () => void;
}

const authFetch = (url: string, options: RequestInit = {}): Promise<Response> => {
  const headers = new Headers(options.headers);
  const token = localStorage.getItem('zawadi_token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...options, headers });
};

export default function DocumentVault({
  user,
  documents,
  onUploadDocument,
  onRemoveDoc,
  onNavigateToTab,
  onRefreshDocuments
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

  const docTypes = [
    "CV / Resume", "Academic Transcript", "Motivation Letter", "Statement of Purpose",
    "Reference Letter", "Passport / ID", "Financial Evidence", "Admission Letter", "Other"
  ];

  // Derive limitations based on payment plans allocation matrix
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
    await onUploadDocument(selectedFile, docType);
    setUploading(false);
    setSelectedFile(null);
    // Auto-refresh after 2s to pick up AI extraction results
    setTimeout(() => onRefreshDocuments(), 2000);
  };

  const getDocIcon = (type: string) => {
    if (type.includes('CV') || type.includes('Resume')) return 'badge';
    if (type.includes('Transcript')) return 'table_chart';
    if (type.includes('Letter') || type.includes('SOP') || type.includes('Purpose')) return 'description';
    return 'article';
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

        {/* Limit Tracker */}
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
              
              {/* Trash removal */}
              <button 
                onClick={() => setDocToDelete(doc.id)}
                className="text-on-surface-variant hover:text-status-urgent transition-colors p-1 rounded-full hover:bg-surface-container-high cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>

            <h4 className="font-bold text-sm text-on-surface mb-2 truncate" title={doc.name}>{doc.name}</h4>
            
            <div className="flex items-center gap-2 mt-1 mb-2">
              {doc.ai_extraction_result ? (
                <button
                  onClick={() => {
                    setAiExtractionDoc(doc);
                    try { setAiExtractionData(JSON.parse(doc.ai_extraction_result)); } catch { setAiExtractionData(null); }
                  }}
                  className="inline-flex items-center gap-1 bg-primary-fixed/20 text-primary text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-primary/20 cursor-pointer hover:bg-primary-fixed/40 transition-colors"
                >
                  <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
                  AI Extracted
                </button>
              ) : (
                <span className="text-[9px] text-outline font-semibold opacity-50">No AI extraction</span>
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

      {/* AI Extraction Modal */}
      {aiExtractionDoc && aiExtractionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-sweep">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">auto_awesome</span>
                <h3 className="font-display font-black text-primary text-sm">AI Document Analysis</h3>
              </div>
              <button onClick={() => setAiExtractionDoc(null)} className="p-1 hover:bg-surface-container rounded cursor-pointer">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <p className="text-xs font-bold text-on-surface-variant">{aiExtractionDoc.name}</p>
              <div className="bg-surface rounded-xl p-4 space-y-2 text-xs">
                {Object.entries(aiExtractionData).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-on-surface-variant font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-on-surface font-bold text-right max-w-[60%]">
                      {Array.isArray(val) ? val.join(', ') || '—' : String(val ?? '—')}
                    </span>
                  </div>
                ))}
              </div>
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
