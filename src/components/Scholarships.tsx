import React, { useState } from 'react';
import { Scholarship, ApplicationTracker, DocumentVaultItem } from '../types';
import { AFRICAN_COUNTRIES } from '../config/matching-config';
import { ExternalLink } from 'lucide-react';

interface ScholarshipsProps {
  user: any;
  scholarships: Scholarship[];
  applications: ApplicationTracker[];
  documents: DocumentVaultItem[];
  onTrackScholarship: (scholarshipId: string, status: string, notes?: string, priority?: any) => void;
  onUploadMetadata: (file: File, docType: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export default function Scholarships({
  user,
  scholarships,
  applications,
  documents,
  onTrackScholarship,
  onUploadMetadata,
  onNavigateToTab
}: ScholarshipsProps) {
  const [selectedSchol, setSelectedSchol] = useState<Scholarship | null>(null);
  
  // Filtering state
  const [search, setSearch] = useState('');
  const [degree, setDegree] = useState('');
  const [field, setField] = useState('');
  const [funding, setFunding] = useState('');

  // Premium Custom filter systems as shown in screenshot
  const [countryFilter, setCountryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [accessFilter, setAccessFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [hostRegionFilter, setHostRegionFilter] = useState('');
  const [sponsorTypeFilter, setSponsorTypeFilter] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [docsReadyFilter, setDocsReadyFilter] = useState(false);
  const [amountShownFilter, setAmountShownFilter] = useState(false);
  const [matchSortFilter, setMatchSortFilter] = useState<'default' | 'high' | 'all'>('default');
  const [noIeltsFilter, setNoIeltsFilter] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showNoIeltsTooltip, setShowNoIeltsTooltip] = useState(false);

  // Compute live alerts dynamically from current active listings
  const systemAlerts = React.useMemo(() => {
    const alerts: Array<{
      id: string;
      title: string;
      description: string;
      date: string;
      severity: 'urgent' | 'info';
      sourceSchol: Scholarship;
    }> = [];

    // Filter scholarships that are published
    const eligible = scholarships.filter(s => s && s.published);

    eligible.forEach(s => {
      // 1. Upcoming deadlines (e.g. contains solid month dates, not is Varies)
      const isUrgent = s.deadline && !s.deadline.toLowerCase().includes('varies') && !s.deadline.toLowerCase().includes('annual');
      if (isUrgent) {
        alerts.push({
          id: `deadline-${s.id}`,
          title: `Approaching Deadline: ${s.name}`,
          description: `The deadline is ${s.deadline}. Please make sure your personal essays in AI Essay Studio are complete and ready.`,
          date: `Closing: ${s.deadline}`,
          severity: 'urgent',
          sourceSchol: s
        });
      } else {
        // 2. High matching affinity resource
        const isHighMatch = (s.match?.score || 0) >= 94;
        if (isHighMatch) {
          alerts.push({
            id: `new-${s.id}`,
            title: `New Match recommendation: ${s.name}`,
            description: `A highly recommended opportunity from ${s.provider} matches your configured study profile with ${s.match!.score}% compatibility.`,
            date: `New`,
            severity: 'info',
            sourceSchol: s
          });
        }
      }
    });

    // Sort to show urgent first
    return alerts.sort((a, b) => {
      if (a.severity === 'urgent' && b.severity !== 'urgent') return -1;
      if (a.severity !== 'urgent' && b.severity === 'urgent') return 1;
      return 0;
    });
  }, [scholarships]);

  // Dropdown options
  const degrees = ["Bachelors", "Masters", "PhD", "Doctorate", "Postdoctoral"];
  const fields = [
    "Computer Science", "Engineering", "Business", "Public Health", "Law",
    "International Relations", "Economics", "Management", "Political Science",
    "Environmental Science", "Development Studies", "STEM"
  ];

  const getApplicationForSchol = (scholId: string) => {
    return applications.find(a => a.scholarship_id === scholId);
  };

  // Apply filters on the client-side for immediate fast feedback
  const filteredList = scholarships.filter((s) => {
    if (!s || !s.published) return false;
    
    const nameStr = s.name || '';
    const descStr = s.description || '';
    const provStr = s.provider || '';
    const hostStr = s.host_institution || s.host || '';
    const eligStr = s.eligibility || '';
    
    // 1. Keyword search
    const matchesSearch = nameStr.toLowerCase().includes(search.toLowerCase()) || 
                          descStr.toLowerCase().includes(search.toLowerCase()) ||
                          provStr.toLowerCase().includes(search.toLowerCase()) ||
                          hostStr.toLowerCase().includes(search.toLowerCase()) || 
                          eligStr.toLowerCase().includes(search.toLowerCase());
                          
    // 2. Country Filter
    let matchesCountry = true;
    if (countryFilter) {
      matchesCountry = (s.countries || s.country || []).some((c: string) => c && c.toLowerCase().includes(countryFilter.toLowerCase())) || 
                       (s.host_institution || s.host || '').toLowerCase().includes(countryFilter.toLowerCase());
    }

    // 3. Degree selector
    const degLevels = Array.isArray(s.degree_levels) ? s.degree_levels : [];
    let matchesDegree = degree === '' ? true : degLevels.some(d => d && typeof d === 'string' && d.toLowerCase() === degree.toLowerCase());
    
    // 4. Status Filter
    let matchesStatus = true;
    if (statusFilter) {
      const app = getApplicationForSchol(s.id);
      const currentStatus = app && app.status !== 'not_started' ? app.status : 'not_started';
      if (statusFilter === 'not_started') {
        matchesStatus = currentStatus === 'not_started';
      } else {
        matchesStatus = currentStatus.toLowerCase() === statusFilter.toLowerCase();
      }
    }

    // 5. Funding Filter
    const matchesFunding = funding === '' ? true : s.funding_type === funding;

    // 6. Sponsor / Institution Type Filter
    let matchesType = true;
    if (typeFilter) {
      matchesType = (s.provider || '').toLowerCase().includes(typeFilter.toLowerCase()) || 
                    (s.name || '').toLowerCase().includes(typeFilter.toLowerCase());
    }

    // 7. Access filter (Direct, Consortium etc.)
    let matchesAccess = true;
    if (accessFilter) {
      if (accessFilter === 'Consortium') {
        matchesAccess = (s.description || '').toLowerCase().includes('consortium') || (s.host_institution || s.host || '').toLowerCase().includes('consortium') || (s.deadline || '').toLowerCase().includes('consortium');
      } else {
        matchesAccess = !(s.description || '').toLowerCase().includes('consortium');
      }
    }

    // 8. Urgency filter
    let matchesUrgency = true;
    if (urgencyFilter) {
      if (urgencyFilter === 'Closing Soon') {
        matchesUrgency = s.deadline ? Math.ceil((new Date(s.deadline).getTime() - Date.now()) / 86400000) <= 30 : false;
      } else if (urgencyFilter === 'Closing in 60') {
        matchesUrgency = s.deadline ? Math.ceil((new Date(s.deadline).getTime() - Date.now()) / 86400000) <= 60 : false;
      } else if (urgencyFilter === 'Open All') {
        matchesUrgency = !s.deadline || Math.ceil((new Date(s.deadline).getTime() - Date.now()) / 86400000) > 0;
      }
    }

    // 9. School name filter
    let matchesSchool = true;
    if (schoolFilter) {
      matchesSchool = (s.host_institution || s.host || '').toLowerCase().includes(schoolFilter.toLowerCase());
    }

    // 10. Documents Ready filter (checks user's vaults)
    let matchesDocsReady = true;
    if (docsReadyFilter) {
      // Find missing required documents
      const missing = (s.required_documents || []).filter(req => !documents.some(doc => doc.type && doc.type.toLowerCase() === req.toLowerCase()));
      matchesDocsReady = missing.length === 0;
    }

    // 11. Amount Shown filter (does not equal N/A or empty value)
    let matchesAmountVal = true;
    if (amountShownFilter) {
      matchesAmountVal = !!s.amount && s.amount !== 'N/A' && s.amount !== '';
    }

    // 12. Match rating score compatibility filter
    let matchesRating = true;
    if (matchSortFilter === 'high') {
      matchesRating = (s.match?.score || 0) >= 80;
    }

    // 13. No-IELTS filter
    let matchesNoIelts = true;
    if (noIeltsFilter) {
      matchesNoIelts = s.no_ielts === true;
    }

    // 14. Host region filter
    let matchesHostRegion = true;
    if (hostRegionFilter) {
      matchesHostRegion = (s.host_region || '').toLowerCase() === hostRegionFilter.toLowerCase();
    }

    // 15. Sponsor type filter
    let matchesSponsorType = true;
    if (sponsorTypeFilter) {
      matchesSponsorType = (s.sponsor_type || '').toLowerCase() === sponsorTypeFilter.toLowerCase();
    }

    return matchesSearch && matchesCountry && matchesDegree && matchesStatus && matchesFunding && matchesType && matchesAccess && matchesUrgency && matchesSchool && matchesDocsReady && matchesAmountVal && matchesRating && matchesNoIelts && matchesHostRegion && matchesSponsorType;
  }).sort((a, b) => {
    const scoreA = a.match ? a.match.score : 0;
    const scoreB = b.match ? b.match.score : 0;
    return scoreB - scoreA;
  });

  // Export current scholarship results to CSV
  const handleExportCSV = () => {
    const headers = ['Scholarship Name', 'Provider / Sponsor', 'Host Country & School', 'Funding Tier', 'Financial Value', 'Application Deadline', 'Eligible Territories', 'Required Documents List', 'Tracking Status'];
    const rows = filteredList.map(s => {
      const app = getApplicationForSchol(s.id);
      const escape = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
      return [
        escape(s.name),
        escape(s.provider),
        escape(`${(s.countries || s.country || []).join('; ')} - ${s.host_institution || s.host || ''}`),
        escape(s.funding_type),
        escape(s.amount),
        escape(s.deadline),
        escape((s.countries || s.country || []).join(', ')),
        escape((s.required_documents || []).join(', ')),
        escape(app && app.status !== 'not_started' ? app.status : 'Not Tracking')
      ].join(',');
    });
    
    const csvContent = '\ufeff' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `zawadi_academic_listings_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleSave = (scholId: string) => {
    const tracked = applications.find(a => a.scholarship_id === scholId);
    if (tracked) {
      onTrackScholarship(scholId, 'not_started', '', 'Normal');
    } else {
      onTrackScholarship(scholId, 'Saved', 'Saved dynamically from my explore grid', 'Normal');
    }
  };

  const isSaved = (scholId: string) => {
    return applications.some(a => a.scholarship_id === scholId && a.status !== 'not_started');
  };

  // Document matching check
  const checkDocumentStored = (docType: string) => {
    return documents.some(d => d && d.type && d.type.toLowerCase() === (docType || '').toLowerCase());
  };

  return (
    <div className="space-y-6">
      
      {/* If detailed scholarship is selected, show details mockup (9th mockup) */}
      {selectedSchol ? (
        <div className="animate-sweep space-y-6">
          
          {/* Breadcrumb / Back button */}
          <div className="flex items-center gap-2 text-on-surface-variant font-semibold text-xs py-2">
            <button 
              onClick={() => setSelectedSchol(null)}
              className="hover:text-primary flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Database
            </button>
            <span>/</span>
            <span>{selectedSchol.fields?.[0] || "Global Development"}</span>
            <span>/</span>
            <span className="text-primary font-bold truncate max-w-[200px]">{selectedSchol.name}</span>
          </div>

          {/* Bento Grid Layout for Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column (8 cols): Info */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* Detail Hero banner */}
              <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-fixed rounded-full opacity-10 -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="bg-surface-container text-on-surface font-semibold text-[10px] px-2.5 py-1 rounded uppercase tracking-wider border border-outline-variant">
                        {selectedSchol.degree_levels?.[0] || "Graduate"}
                      </span>
                      <span className="bg-secondary-fixed text-on-secondary-fixed font-semibold text-[10px] px-2.5 py-1 rounded uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">verified</span> Fully Funded
                      </span>
                      {selectedSchol.no_ielts && (
                        <span className="bg-amber-50 text-amber-700 font-semibold text-[10px] px-2.5 py-1 rounded uppercase tracking-wider flex items-center gap-1 border border-amber-200">
                          <span className="material-symbols-outlined text-[12px]">check_circle</span> No IELTS
                        </span>
                      )}
                    </div>

                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-black text-primary mb-2">
                      {selectedSchol.name}
                    </h1>
                    <p className="text-sm font-semibold text-on-surface-variant mb-6">
                      {selectedSchol.provider} • {selectedSchol.host_institution || selectedSchol.host}
                    </p>

                    <div className="flex flex-wrap gap-4 text-xs mt-4">
                      <div className="flex items-center gap-2 bg-background p-3 rounded-xl border border-outline-variant">
                        <span className="material-symbols-outlined text-primary text-lg">payments</span>
                        <div>
                          <p className="text-[10px] text-on-surface-variant font-bold uppercase">Funding Value</p>
                          <p className="font-bold text-on-surface text-xs">{selectedSchol.amount || "Full tuition expenses"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-background p-3 rounded-xl border border-outline-variant">
                        <span className="material-symbols-outlined text-status-warning text-lg">calendar_today</span>
                        <div>
                          <p className="text-[10px] text-on-surface-variant font-bold uppercase">Target Deadline</p>
                          <p className="font-bold text-on-surface text-xs">
                            {selectedSchol.deadline} 
                            <span className="text-status-warning font-normal text-[10px] ml-1.5">
                              {(() => {
                                const days = Math.ceil((new Date(selectedSchol.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                return days > 0 ? `(${days} days left)` : '(Deadline passed)';
                              })()}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {selectedSchol.no_ielts === true && (
                      <div className="bg-status-success/10 border border-status-success/30 rounded-xl p-3 mt-3">
                        <p className="text-xs font-bold text-status-success">No IELTS Required. IELTS alternatives accepted.</p>
                      </div>
                    )}
                  </div>

                  {/* Circle Match percentage */}
                  <div className="flex flex-col items-center justify-center bg-background p-4 rounded-xl border border-outline-variant shadow-sm min-w-[140px] shrink-0">
                    {selectedSchol.match ? (
                      <>
                        <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider mb-2">My compatibility</p>
                        <div className="relative w-16 h-16 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <path className="text-surface-container-high" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                            <path className="text-status-success" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${selectedSchol.match.score}, 100`} strokeWidth="3"></path>
                          </svg>
                          <span className="absolute text-lg font-black text-primary">{selectedSchol.match.score}%</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider mb-2">Compatibility</p>
                        <div className="w-16 h-16 flex items-center justify-center bg-surface-container-high rounded-full">
                          <span className="material-symbols-outlined text-2xl text-outline">person_edit</span>
                        </div>
                        <button onClick={() => window.dispatchEvent(new CustomEvent('open-profile-setup'))} className="mt-2 text-[8px] font-black text-primary hover:underline uppercase tracking-wider">
                          Set up profile
                        </button>
                      </>
                    )}
                    {selectedSchol.no_ielts && (
                      <span className="mt-2 text-[8px] font-black text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 uppercase">No IELTS</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Overview Details tabs */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden text-sm">
                <div className="flex border-b border-outline-variant bg-surface-admin px-4 overflow-x-auto hide-scrollbar">
                  <button className="px-6 py-4 font-bold text-primary border-b-2 border-primary">Overview</button>
                  <button className="px-6 py-4 text-on-surface-variant hover:text-primary">Eligible Regions</button>
                </div>
                <div className="p-6 md:p-8 space-y-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-primary mb-3">About the Scholarship</h3>
                    <p className="text-on-surface-variant leading-relaxed font-light">
                      {selectedSchol.description}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-primary mb-3">Eligibility Requirements</h3>
                    <p className="text-on-surface-variant leading-relaxed font-light mb-4">
                      {selectedSchol.eligibility}
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2.5 text-on-surface font-light">
                        <span className="material-symbols-outlined text-secondary text-sm mt-0.5">check_circle</span>
                        Citizen of: {(selectedSchol.countries || selectedSchol.country || []).join(', ')}
                      </li>
                      <li className="flex items-start gap-2.5 text-on-surface font-light">
                        <span className="material-symbols-outlined text-secondary text-sm mt-0.5">check_circle</span>
                        Course topics: {(selectedSchol.fields || []).join(', ')}
                      </li>
                    </ul>

                    {/* Match Reasons */}
                    {selectedSchol.match && selectedSchol.match.reasons.length > 0 && (
                      <div className="mt-6 bg-status-success/5 border border-status-success/15 rounded-xl p-4">
                        <h4 className="text-xs font-black text-status-success uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">auto_awesome</span>
                          Why this scholarship fits you
                        </h4>
                        <ul className="space-y-1.5">
                          {(selectedSchol.match?.reasons || []).map((r, i) => (
                            <li key={i} className="text-xs text-on-surface-variant flex items-start gap-2">
                              <span className="text-status-success mt-0.5">✓</span>
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Requirements Section */}
                    {(selectedSchol.work_experience_required || selectedSchol.age_limit_masters || selectedSchol.age_limit_phd || selectedSchol.no_ielts) && (
                      <div className="mt-6 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5">
                        <h4 className="font-bold text-xs text-primary mb-3">Requirements</h4>
                        <div className="space-y-2 text-xs">
                          {selectedSchol.work_experience_required && <p className="font-semibold text-on-surface">{selectedSchol.work_experience_required} years of professional work experience required</p>}
                          {selectedSchol.age_limit_masters && <p className="font-semibold text-on-surface">Maximum age for Masters applicants is {selectedSchol.age_limit_masters} years</p>}
                          {selectedSchol.age_limit_phd && <p className="font-semibold text-on-surface">Maximum age for PhD applicants is {selectedSchol.age_limit_phd} years</p>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Vault matching Checklist */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 shadow-sm">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h3 className="text-lg font-black text-primary mb-1">Required Documents Checklist</h3>
                    <p className="text-xs text-on-surface-variant">Validated in real-time against your Document Vault</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(selectedSchol.required_documents || []).map((docName) => {
                    const isDocStored = checkDocumentStored(docName);
                    return (
                      <div 
                        key={docName} 
                        className={`flex items-center justify-between p-4 border rounded-xl shadow-xs ${isDocStored ? 'border-status-success/30 bg-status-success/5' : 'border-status-warning/30 bg-status-warning/5'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded flex-shrink-0 flex items-center justify-center font-bold ${isDocStored ? 'bg-status-success/10 text-status-success' : 'bg-status-warning/10 text-status-warning'}`}>
                            <span className="material-symbols-outlined text-lg">
                              {docName.includes('CV') ? 'description' : docName.includes('Transcript') ? 'table_chart' : 'edit_document'}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-on-surface">{docName}</p>
                            <p className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-0.5 ${isDocStored ? 'text-status-success' : 'text-status-warning'}`}>
                              <span className="material-symbols-outlined text-xs">
                                {isDocStored ? 'check' : 'warning'}
                              </span>
                              {isDocStored ? 'Loaded' : 'Missing'}
                            </p>
                          </div>
                        </div>
                        {!isDocStored && (
                          <button 
                            onClick={() => {
                              const fileName = docName.replace(' / ', '_') + "_sample.pdf";
                              const blob = new Blob(['Sample ' + docName], { type: 'application/pdf' });
                              const file = new File([blob], fileName, { type: 'application/pdf' });
                              onUploadMetadata(file, docName);
                            }}
                            className="text-status-warning hover:bg-status-warning/15 p-2 rounded-full transition-colors cursor-pointer"
                            title="Auto-simulate upload of this item"
                          >
                            <span className="material-symbols-outlined text-sm">upload</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Right Column (4 cols): Tracking actions (Bento Side widget) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Application CTA widget */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                <div className="flex flex-col gap-3 mb-6">
                  <a 
                    href={selectedSchol.apply_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="bg-primary text-on-primary font-bold text-center text-sm rounded-lg py-3 w-full flex items-center justify-center gap-2 hover:bg-primary-container transition-colors shadow-sm"
                  >
                    Apply Now (Official Site)
                    <span className="material-symbols-outlined text-xs">open_in_new</span>
                  </a>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleToggleSave(selectedSchol.id)}
                      className={`font-bold text-xs rounded-lg py-2.5 px-4 flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${isSaved(selectedSchol.id) ? 'bg-secondary-container border-secondary/30 text-on-secondary-container' : 'bg-surface border-outline-variant hover:bg-surface-variant text-on-surface'}`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {isSaved(selectedSchol.id) ? 'check' : 'bookmark_border'}
                      </span>
                      {isSaved(selectedSchol.id) ? 'Saved ✓' : 'Save'}
                    </button>

                    <button 
                      onClick={() => {
                        sessionStorage.setItem('zawadi_essay_scholarship', selectedSchol.name);
                        sessionStorage.setItem('zawadi_essay_scholarship_id', selectedSchol.id);
                        onNavigateToTab?.('essays');
                      }} 
                      className="bg-tertiary-fixed text-on-tertiary-fixed font-bold text-xs rounded-lg py-2.5 px-4 flex items-center justify-center gap-1.5 hover:bg-tertiary-fixed-dim transition-colors border border-tertiary-fixed"
                    >
                      <span className="material-symbols-outlined text-sm">auto_awesome</span>
                      AI Essay
                    </button>
                  </div>
                </div>

                <hr className="border-outline-variant/50 mb-6" />

                {/* Tracker widget */}
                <h4 className="font-bold text-xs text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-md">analytics</span>
                  Application Tracker Status
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase mb-1 block">Tracking Stage</label>
                    {(() => {
                      const currentStatus = getApplicationForSchol(selectedSchol.id)?.status || 'not_started';
                      let selectBgStyle = "bg-surface border-outline-variant text-on-surface";
                      if (currentStatus === 'Applied') {
                        selectBgStyle = "bg-secondary text-white border-secondary font-black";
                      } else if (currentStatus === 'Drafting' || currentStatus === 'Essay Drafting') {
                        selectBgStyle = "bg-primary text-white border-primary font-black animate-pulse";
                      } else if (currentStatus === 'Saved') {
                        selectBgStyle = "bg-secondary/15 text-secondary border-secondary/30 font-extrabold";
                      }
                      return (
                        <select 
                          value={currentStatus}
                          onChange={(e) => onTrackScholarship(selectedSchol.id, e.target.value, getApplicationForSchol(selectedSchol.id)?.notes || '', getApplicationForSchol(selectedSchol.id)?.priority || 'Normal')}
                          className={`w-full p-2.5 text-xs rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer font-bold transition-all border ${selectBgStyle}`}
                        >
                          <option value="not_started" className="bg-surface text-on-surface font-semibold">Not Tracked (Disable)</option>
                          <option value="Saved" className="bg-surface text-secondary font-semibold">Saved</option>
                          <option value="Drafting" className="bg-surface text-primary font-semibold">Drafting</option>
                          <option value="Preparing Documents" className="bg-surface text-on-surface font-semibold">Preparing Documents</option>
                          <option value="Essay Drafting" className="bg-surface text-on-surface font-semibold">Essay Drafting</option>
                          <option value="Ready to Submit" className="bg-surface text-on-surface font-semibold">Ready to Submit</option>
                          <option value="Applied" className="bg-surface text-secondary font-semibold">Applied</option>
                          <option value="Interview" className="bg-surface text-on-surface font-semibold">Interview</option>
                          <option value="Awarded" className="bg-surface text-status-success font-semibold">Awarded</option>
                          <option value="Rejected" className="bg-surface text-status-urgent font-semibold">Rejected</option>
                        </select>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase mb-1 block">Priority Level</label>
                    <div className="flex gap-2">
                      {['Low', 'Normal', 'High'].map((p) => (
                        <button
                          key={p}
                          onClick={() => {
                            const app = getApplicationForSchol(selectedSchol.id);
                            onTrackScholarship(
                              selectedSchol.id, 
                              app?.status || 'Saved', 
                              app?.notes || '', 
                              p as any
                            );
                          }}
                          className={`flex-1 text-center py-2 border rounded font-bold text-[11px] transition-all cursor-pointer ${
                            (getApplicationForSchol(selectedSchol.id)?.priority || 'Normal') === p 
                              ? 'bg-primary-fixed border-primary text-primary font-black scale-102' 
                              : 'border-outline-variant/60 bg-surface hover:bg-surface-variant text-on-surface-variant'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase mb-1 block">Personal Application Notes</label>
                    <textarea 
                      value={getApplicationForSchol(selectedSchol.id)?.notes || ''}
                      onChange={(e) => {
                        const app = getApplicationForSchol(selectedSchol.id);
                        onTrackScholarship(
                          selectedSchol.id,
                          app?.status || 'Saved',
                          e.target.value,
                          app?.priority || 'Normal'
                        );
                      }}
                      placeholder="Add personal checklists, ideas, essay prompts or references..."
                      rows={3}
                      className="w-full bg-surface border border-outline-variant rounded-lg p-2 text-xs text-on-surface focus:outline-none focus:border-primary resize-none placeholder:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Match breakdown metrics */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm space-y-4">
                <h4 className="font-bold text-xs text-primary uppercase">Compatibility Breakdown</h4>
                
                <div className="space-y-3">
                  {(selectedSchol.match ? [
                    { label: 'Country / Region', key: 'country' as const },
                    { label: 'Degree Level', key: 'degree' as const },
                    { label: 'Field of Study', key: 'field' as const },
                    { label: 'GPA / Grades', key: 'gpa' as const },
                    { label: 'Language', key: 'languages' as const },
                    { label: 'Experience', key: 'experience' as const },
                    { label: 'Destination', key: 'destination' as const },
                    { label: 'Documents', key: 'documents' as const },
                  ] : []).map(({ label, key }) => {
                    const val = selectedSchol.match!.breakdown[key];
                    const color = val >= 90 ? 'bg-status-success' : val >= 70 ? 'bg-primary' : val >= 40 ? 'bg-status-warning' : 'bg-status-error';
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span>{label}</span>
                          <span className={val >= 90 ? 'text-status-success font-black' : val >= 70 ? 'text-primary font-black' : 'text-status-warning font-black'}>{val}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-surface-variant rounded-full">
                          <div className={`h-full ${color} rounded-full`} style={{ width: `${val}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                  {selectedSchol.match?.no_ielts_benefit && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[10px] text-amber-800 font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-amber-600">check_circle</span>
                      No IELTS required — save $300+ on English proficiency tests
                    </div>
                  )}
                </div>
              </div>

              {/* Source & Verification */}
              <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5">
                <h4 className="font-bold text-xs text-primary mb-3">Source & Verification</h4>
                <div className="space-y-2 text-xs">
                  {selectedSchol.source_url && (
                    <a href={selectedSchol.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> View Original Listing
                    </a>
                  )}
                  {selectedSchol.verified_at && <p className="text-on-surface-variant">Verified: {new Date(selectedSchol.verified_at).toLocaleDateString()}</p>}
                  <p className="text-on-surface-variant">Data source: {selectedSchol.pipeline_source === 'pipeline' ? 'Pipeline' : 'Manual Admin Entry'}</p>
                  {selectedSchol.apply_url ? (
                    <a href={selectedSchol.apply_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary-container transition-all">
                      Apply Now
                    </a>
                  ) : selectedSchol.source_url ? (
                    <a href={selectedSchol.source_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 px-4 py-2 bg-surface-container text-on-surface rounded-xl font-bold text-xs hover:bg-surface-container-high transition-all border border-outline-variant/40">
                      Find Application Link
                    </a>
                  ) : null}
                </div>
              </div>

            </div>

          </div>

        </div>
      ) : (
        // Premium Table-based Scholarship Finder & Unified Tracker Dashboard
        <div className="space-y-6">
          
          {/* Main Top Header Section with Side Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold text-secondary tracking-widest uppercase mb-0.5">Africa-Wide Scholarship Web App</p>
              <h2 className="font-display text-3xl font-black text-primary tracking-tight">Scholarship finder</h2>
            </div>
            
            {/* Top Right Action Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <button 
                onClick={() => setShowAlertsModal(true)}
                className="relative flex items-center gap-1.5 px-3 py-2 bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/50 rounded-xl text-xs font-bold text-on-surface cursor-pointer shadow-3xs transition-all"
              >
                <span className="material-symbols-outlined text-[16px] text-amber-500 font-bold">notifications</span>
                <span>Alerts</span>
                {systemAlerts.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white animate-pulse">
                    {systemAlerts.length}
                  </span>
                )}
              </button>
              
              <button 
                onClick={() => {
                  alert("Syncing all tracked opportunities with your active application pipeline...");
                  window.location.reload();
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/50 rounded-xl text-xs font-bold text-on-surface cursor-pointer shadow-3xs transition-all"
              >
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant font-bold">sync</span>
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* Premium Filter System Container */}
          <div className="bg-surface-container-lowest/95 border border-outline-variant/60 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-primary/70 uppercase tracking-widest">Premium filter system</h3>
            
            {/* Horizontal Filter Layout Row 1 */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Keyword Search */}
              <div className="relative flex-1 min-w-[260px]">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[16px] font-bold">search</span>
                <input 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search scholarship, school, country, field"
                  className="w-full pl-10 pr-4 py-2 border border-outline-variant/70 rounded-lg text-xs bg-surface text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  type="text"
                />
              </div>

              {/* All countries selector */}
              <select 
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="bg-surface border border-outline-variant/70 rounded-lg px-3 py-2 text-xs font-bold text-on-surface-variant focus:outline-none focus:border-primary cursor-pointer w-max"
              >
                <option value="">All countries</option>
                {AFRICAN_COUNTRIES.map(c => (
                  <option key={c.code} value={c.name}>{c.name}</option>
                ))}
                <option value="Europe">Europe</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
              </select>

              {/* All Levels selector (Degree) */}
              <select 
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                className="bg-surface border border-outline-variant/70 rounded-lg px-3 py-2 text-xs font-bold text-on-surface-variant focus:outline-none focus:border-primary cursor-pointer w-max"
              >
                <option value="">All levels</option>
                {degrees.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              {/* All Statuses tracking selector */}
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface border border-outline-variant/70 rounded-lg px-3 py-2 text-xs font-bold text-on-surface-variant focus:outline-none focus:border-primary cursor-pointer w-max"
              >
                <option value="">All statuses</option>
                <option value="not_started">Not started</option>
                <option value="Saved">Saved</option>
                <option value="Drafting">Drafting</option>
                <option value="Preparing Documents">Preparing Documents</option>
                <option value="Essay Drafting">Essay Drafting</option>
                <option value="Ready to Submit">Ready to Submit</option>
                <option value="Applied">Applied</option>
                <option value="Interview">Interview</option>
                <option value="Awarded">Awarded</option>
                <option value="Rejected">Rejected</option>
              </select>

              {/* All Funding Tier */}
              <select 
                value={funding}
                onChange={(e) => setFunding(e.target.value)}
                className="bg-surface border border-outline-variant/70 rounded-lg px-3 py-2 text-xs font-bold text-on-surface-variant focus:outline-none focus:border-primary cursor-pointer w-max"
              >
                <option value="">All funding</option>
                <option value="Full">Fully funded</option>
                <option value="Partial">Partially funded</option>
              </select>

              {/* Sponsor types */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-surface border border-outline-variant/70 rounded-lg px-3 py-2 text-xs font-bold text-on-surface-variant focus:outline-none focus:border-primary cursor-pointer w-max"
              >
                <option value="">All types</option>
                <option value="Government">Government</option>
                <option value="Foundation">Foundation</option>
                <option value="University">University</option>
                <option value="Consortium">Consortium</option>
              </select>

              {/* Access portal types */}
              <select 
                value={accessFilter}
                onChange={(e) => setAccessFilter(e.target.value)}
                className="bg-surface border border-outline-variant/70 rounded-lg px-3 py-2 text-xs font-bold text-on-surface-variant focus:outline-none focus:border-primary cursor-pointer w-max"
              >
                <option value="">Any access</option>
                <option value="Direct">Direct portal access</option>
                <option value="Consortium">Consortium application</option>
              </select>
            </div>

            {/* Horizontal Filter Layout Row 2 */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-outline-variant/30">
              {/* School host text filter */}
              <input 
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
                placeholder="School"
                className="bg-surface border border-outline-variant/70 rounded-lg px-3 py-2 text-xs font-semibold text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary w-28"
                type="text"
              />

              {/* Docs Ready Checkbox */}
              <label className="flex items-center gap-1.5 text-xs text-on-surface font-bold bg-surface border border-outline-variant/70 px-3 py-2 rounded-lg cursor-pointer hover:bg-surface-variant/45 transition-colors">
                <input 
                  type="checkbox"
                  checked={docsReadyFilter}
                  onChange={(e) => setDocsReadyFilter(e.target.checked)}
                  className="rounded text-primary border-outline-variant/80 accent-primary cursor-pointer w-3.5 h-3.5"
                />
                <span>Docs ready</span>
              </label>

              {/* Amount Shown Checkbox */}
              <label className="flex items-center gap-1.5 text-xs text-on-surface font-bold bg-surface border border-outline-variant/70 px-3 py-2 rounded-lg cursor-pointer hover:bg-surface-variant/45 transition-colors">
                <input 
                  type="checkbox"
                  checked={amountShownFilter}
                  onChange={(e) => setAmountShownFilter(e.target.checked)}
                  className="rounded text-primary border-outline-variant/80 accent-primary cursor-pointer w-3.5 h-3.5"
                />
                <span>Amount shown</span>
              </label>

              {/* Match accuracy threshold selector */}
              <select
                value={matchSortFilter}
                onChange={(e) => setMatchSortFilter(e.target.value as any)}
                className="bg-surface border border-outline-variant/70 rounded-lg px-3 py-2 text-xs font-bold text-on-surface-variant focus:outline-none focus:border-primary cursor-pointer w-max"
              >
                <option value="default">match</option>
                <option value="high">Score &gt;= 90%</option>
                <option value="all">Any alignment</option>
              </select>

              {/* No-IELTS toggle with tooltip */}
              <div className="relative">
                <label className="flex items-center gap-1.5 text-xs text-on-surface font-bold bg-surface border border-outline-variant/70 px-3 py-2 rounded-lg cursor-pointer hover:bg-surface-variant/45 transition-colors">
                  <input 
                    type="checkbox"
                    checked={noIeltsFilter}
                    onChange={(e) => {
                      setNoIeltsFilter(e.target.checked);
                      if (e.target.checked && user?.destination_openness === 'specific') {
                        setShowNoIeltsTooltip(true);
                      } else {
                        setShowNoIeltsTooltip(false);
                      }
                    }}
                    className="rounded text-secondary border-outline-variant/80 accent-secondary cursor-pointer w-3.5 h-3.5"
                  />
                  <span>No IELTS</span>
                </label>
                {showNoIeltsTooltip && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-surface-container-high text-on-surface text-[10px] rounded-lg p-3 shadow-lg border border-outline-variant z-50 pointer-events-none">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-secondary text-base shrink-0">info</span>
                      <span>Removing the destination filter will show you more No-IELTS opportunities across all regions.</span>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-surface-container-high border-r border-b border-outline-variant rotate-45 -mt-1"></div>
                  </div>
                )}
              </div>

              {/* Urgency filter dropdown */}
              <select value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)}
                      className="py-2.5 px-4 bg-surface-container-low border border-outline-variant/40 text-xs font-semibold rounded-xl outline-none">
                <option value="">Urgency: All</option>
                <option value="Closing Soon">Closing Soon (≤30 days)</option>
                <option value="Closing in 60">Closing in 60 days</option>
                <option value="Open All">Open All Deadlines</option>
              </select>
              <select value={hostRegionFilter} onChange={e => setHostRegionFilter(e.target.value)}
                      className="py-2.5 px-4 bg-surface-container-low border border-outline-variant/40 text-xs font-semibold rounded-xl outline-none">
                <option value="">Region: All</option>
                {['West Africa hubs','East Africa hubs','Southern Africa hubs','North Africa hubs','Central Africa hubs','United Kingdom and Ireland','United States and Canada','Australia and New Zealand','Commonwealth Africa','Commonwealth Global','France and Belgium','Francophone destinations','Lusophone destinations','Germany, Austria, Switzerland (German-speaking)','Nordic countries','Netherlands and Belgium','Rest of Europe','China and East Asia','Japan and South Korea','Southeast Asia','Middle East and Gulf states','Intra-African'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <select value={sponsorTypeFilter} onChange={e => setSponsorTypeFilter(e.target.value)}
                      className="py-2.5 px-4 bg-surface-container-low border border-outline-variant/40 text-xs font-semibold rounded-xl outline-none">
                <option value="">Sponsor: All</option>
                {['Government', 'Foundation', 'University', 'Corporate', 'UN'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {/* Results count & Clear filters helper */}
              <div className="ml-auto flex items-center gap-3">
                {(search || countryFilter || degree || statusFilter || funding || typeFilter || accessFilter || urgencyFilter || schoolFilter || docsReadyFilter || amountShownFilter || matchSortFilter !== 'default' || noIeltsFilter || hostRegionFilter || sponsorTypeFilter) && (
                  <button 
                    onClick={() => {
                      setSearch('');
                      setCountryFilter('');
                      setDegree('');
                      setStatusFilter('');
                      setFunding('');
                      setTypeFilter('');
                      setAccessFilter('');
                      setUrgencyFilter('');
                      setHostRegionFilter('');
                      setSponsorTypeFilter('');
                      setSchoolFilter('');
                      setDocsReadyFilter(false);
                      setAmountShownFilter(false);
                      setMatchSortFilter('default');
                      setNoIeltsFilter(false);
                    }}
                    className="text-xs font-black text-secondary hover:text-primary cursor-pointer hover:underline"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table Counts Subheader Bar */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold text-on-surface-variant uppercase tracking-wider bg-surface-container/40 px-3 py-1.5 rounded-lg border border-outline-variant/30">
              {filteredList.length} Opportunities Located
            </span>

            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-4 py-2 border border-outline-variant/60 rounded-xl text-xs font-bold text-on-surface bg-surface-container-lowest hover:bg-surface-container transition-all cursor-pointer shadow-3xs"
            >
              <span className="material-symbols-outlined text-sm font-bold">download</span>
              <span>Export</span>
            </button>
          </div>

          {/* Main Opportunities List Table Container */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="border-b border-outline-variant text-[10px] uppercase font-bold text-on-surface-variant tracking-wider bg-surface-container-low/80">
                    <th className="py-4 px-5">Match</th>
                    <th className="py-4 px-5">Scholarship</th>
                    <th className="py-4 px-5">Country and school</th>
                    <th className="py-4 px-5">Amount</th>
                    <th className="py-4 px-5">Eligibility</th>
                    <th className="py-4 px-5">Documents</th>
                    <th className="py-4 px-5">Urgency</th>
                    <th className="py-4 px-5">Status</th>
                    <th className="py-4 px-5">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center">
                        <span className="material-symbols-outlined text-4xl text-outline-variant mb-3">search</span>
                        <p className="text-sm text-on-surface-variant font-medium">No scholarships match your current filters. Try removing some filters or updating your profile details. New opportunities are added daily through our automated discovery pipeline.</p>
                      </td>
                    </tr>
                  ) : filteredList.map((s) => {
                    const matchedApp = getApplicationForSchol(s.id);
                    const currentStatus = matchedApp && matchedApp.status !== 'not_started' ? matchedApp.status : 'not_started';
                    const currentPriority = matchedApp && matchedApp.priority ? matchedApp.priority : 'Normal';
                    const matchScore = s.match ? s.match.score : 0;
                    
                    // Determine which required documents are missing in the vault
                    const missingDocs = (s.required_documents || []).filter(
                      reqDoc => !documents.some(d => d.type && d.type.toLowerCase() === reqDoc.toLowerCase())
                    );

                    // Dynamic colors for the tracking stage select dropdown inside table
                    let trackingStageBg = "bg-surface border-outline-variant/80 text-on-surface";
                    if (currentStatus === 'Applied') {
                      trackingStageBg = "bg-secondary text-white border-secondary font-black";
                    } else if (currentStatus === 'Drafting' || currentStatus === 'Essay Drafting') {
                      trackingStageBg = "bg-primary text-white border-primary font-black animate-pulse";
                    } else if (currentStatus === 'Saved') {
                      trackingStageBg = "bg-secondary/15 text-secondary border-secondary/30 font-bold";
                    }

                    return (
                      <tr key={s.id} className="hover:bg-surface-container-low/40 transition-colors duration-150 align-top">
                        
                        {/* Column 1: Match Score Gauge & Checkbox flag */}
                        <td className="py-5 px-5 shrink-0 max-w-[100px]">
                          <div className="flex flex-col items-center gap-2">
                            {matchScore > 0 ? (
                              <>
                                {/* SVG Radial compatibility ring charts */}
                                <div className="relative w-11 h-11 flex items-center justify-center bg-surface-container-low/30 rounded-full select-none">
                                  <svg className="absolute w-11 h-11 transform -rotate-90">
                                    <circle
                                      cx="22"
                                      cy="22"
                                      r="18"
                                      className="text-outline-variant/20"
                                      strokeWidth="3.5"
                                      stroke="currentColor"
                                      fill="transparent"
                                    />
                                    <circle
                                      cx="22"
                                      cy="22"
                                      r="18"
                                      className={matchScore >= 80 ? "text-secondary" : "text-status-warning"}
                                      strokeWidth="3.5"
                                      strokeDasharray={2 * Math.PI * 18}
                                      strokeDashoffset={2 * Math.PI * 18 * (1 - matchScore / 100)}
                                      strokeLinecap="round"
                                      stroke="currentColor"
                                      fill="transparent"
                                    />
                                  </svg>
                                  <span className="text-[11px] font-black text-primary relative">{matchScore}%</span>
                                </div>

                                {/* Match reason tooltip */}
                                {s.match && (s.match?.reasons || []).length > 0 && (
                                  <div className="group relative">
                                    <span className="text-[8px] text-status-success font-black uppercase tracking-wider cursor-help border border-status-success/20 rounded px-1 py-0.5 bg-status-success/5">
                                      why match?
                                    </span>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 bg-surface-container-high text-on-surface text-[9px] rounded-lg p-2 shadow-lg border border-outline-variant opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none whitespace-normal text-left">
                                      <ul className="list-disc list-inside space-y-0.5">
                                        {(s.match?.reasons || []).slice(0, 3).map((r, i) => (
                                          <li key={i}>{r}</li>
                                        ))}
                                        {(s.match?.reasons || []).length > 3 && (
                                          <li className="text-secondary font-bold">+{(s.match?.reasons || []).length - 3} more</li>
                                        )}
                                      </ul>
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-11 h-11 flex items-center justify-center bg-surface-container-high rounded-full">
                                  <span className="material-symbols-outlined text-sm text-outline">person_edit</span>
                                </div>
                                <button
                                  onClick={() => window.dispatchEvent(new CustomEvent('open-profile-setup'))}
                                  className="text-[7px] font-black text-primary hover:underline uppercase tracking-wider"
                                >
                                  Set up profile
                                </button>
                              </div>
                            )}

                            {/* No-IELTS badge */}
                            {s.no_ielts && (
                              <span className="text-[7px] font-black text-amber-600 bg-amber-50 border border-amber-200 rounded px-1 py-0.5 uppercase tracking-wide whitespace-nowrap">
                                No IELTS
                              </span>
                            )}

                            {/* Applied/Not Applied checkpoint with checkbox */}
                            <label className="flex items-center gap-1 mt-1 cursor-pointer select-none">
                              <input 
                                type="checkbox"
                                checked={currentStatus !== 'not_started'}
                                onChange={() => handleToggleSave(s.id)}
                                className="w-3 h-3 rounded text-secondary border-outline accent-secondary cursor-pointer"
                              />
                              <span className={`text-[9px] font-bold ${currentStatus !== 'not_started' ? 'text-secondary font-black' : 'text-on-surface-variant/70'}`}>
                                {currentStatus !== 'not_started' ? (currentStatus === 'Applied' ? 'Applied ✓' : currentStatus) : 'Not applied'}
                              </span>
                            </label>
                          </div>
                        </td>

                        {/* Column 2: Scholarship Name & Details */}
                        <td className="py-5 px-5 max-w-[280px]">
                          <div className="space-y-1 relative">
                            {s.urgency === 'Urgent' && (
                              <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-status-urgent text-white mb-1">Urgent</span>
                            )}
                            {s.urgency === 'Warning' && (
                              <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-status-warning text-white mb-1">Closing Soon</span>
                            )}
                            {s.urgency === 'Expired' && (
                              <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-outline text-white mb-1">Deadline Passed</span>
                            )}
                            <h4 
                              onClick={() => setSelectedSchol(s)}
                              className="font-display font-extrabold text-xs text-primary leading-tight hover:text-secondary hover:underline cursor-pointer transition-colors"
                            >
                              {s.name}
                            </h4>
                            <p className="text-[10px] text-on-surface-variant/90 leading-snug font-medium">
                              {s.provider}
                            </p>
                            {s.host_institution && s.host_institution !== s.provider && (
                              <p className="text-[10px] text-on-surface-variant">{s.host_institution}</p>
                            )}
                            {s.sponsor_type && (
                              <p className="text-[10px] text-outline font-medium">{s.sponsor_type}</p>
                            )}
                            
                            {/* Course/Subject chips in light blue */}
                            <div className="flex flex-wrap gap-1 pt-1">
                              {(s.fields || []).map(f => (
                                <span 
                                  key={f}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-primary-fixed/20 text-on-primary-fixed-variant border border-primary/5 font-semibold"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>

                            {/* Official Portal External Link */}
                            <div className="pt-1.5">
                              <a 
                                href={s.apply_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center gap-1 text-[9px] text-secondary font-black hover:underline hover:opacity-90 transition-opacity"
                              >
                                <span className="material-symbols-outlined text-[11px]">open_in_new</span>
                                <span>Official portal</span>
                              </a>
                            </div>
                          </div>
                        </td>

                        {/* Column 3: Country and School Host */}
                        <td className="py-5 px-5 max-w-[200px]">
                          <div className="space-y-1">
                            <div className="font-extrabold text-xs text-on-surface whitespace-normal leading-snug">
                              {(s.countries || s.country || []).join(', ')}
                            </div>
                            <div className="text-[10px] text-on-surface-variant/90 leading-relaxed font-normal">
                              {s.host_institution || s.host || ''}
                            </div>
                            <div className="text-[9px] font-bold text-primary bg-primary/5 border border-primary/10 rounded px-1.5 py-0.5 w-max">
                              {(s.degree_levels || []).join(', ')}
                            </div>
                          </div>
                        </td>

                        {/* Column 4: Amount & Financial coverage */}
                        <td className="py-5 px-5 max-w-[150px]">
                          <div className="space-y-1">
                            <div className="font-extrabold text-xs text-on-surface italic">
                              {s.funding_type === 'Full' ? 'Fully Funded' : 'Partially Funded'}
                            </div>
                            <div className="text-[10px] text-on-surface-variant/95 leading-normal font-medium">
                              {s.amount}
                            </div>
                          </div>
                        </td>

                        {/* Column 5: Eligibility Criteria */}
                        <td className="py-5 px-5 max-w-[200px]">
                          <p className="text-[10px] text-on-surface-variant/90 leading-relaxed font-normal line-clamp-4">
                            {s.eligibility}
                          </p>
                        </td>

                        {/* Column 6: Required Documents & Live checklist status */}
                        <td className="py-5 px-5 max-w-[220px]">
                          <div className="space-y-1.5">
                            <div className="text-[10px] text-primary/80 font-bold leading-normal">
                              {(s.required_documents || []).join(', ')}
                            </div>
                            
                            {/* Interactive Document Matching Alerts */}
                            {missingDocs.length > 0 ? (
                              <div className="bg-status-warning/5 border border-status-warning/15 text-[9px] p-2 rounded-lg text-on-surface-variant">
                                <span className="font-extrabold text-status-warning tracking-tight">Missing: </span>
                                {missingDocs.join(', ')}
                              </div>
                            ) : (
                              <div className="bg-secondary/5 border border-secondary/15 text-[9px] px-2 py-1 rounded-lg text-secondary font-black inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-[11px]">check_circle</span>
                                <span>All Documents Ready</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Column 7: Urgency & Deadline pill */}
                        <td className="py-5 px-5">
                          <div className="space-y-1">
                            <span className="inline-block font-extrabold text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wide bg-primary-fixed text-primary border border-primary/15 whitespace-nowrap">
                              {s.deadline.toLowerCase().includes('varies') || s.deadline.toLowerCase().includes('consortium') ? 'Varies by university' : 'Closes ' + s.deadline}
                            </span>
                          </div>
                        </td>

                        {/* Column 8: Status selector Dropdown in table */}
                        <td className="py-5 px-5">
                          <select 
                            value={currentStatus}
                            onChange={(e) => onTrackScholarship(s.id, e.target.value, matchedApp?.notes || `Auto-saved from listings list`, matchedApp?.priority || 'Normal')}
                            className={`p-1.5 px-2 border rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-bold transition-all w-max ${trackingStageBg}`}
                          >
                            <option value="not_started">Not started</option>
                            <option value="Saved">Saved</option>
                            <option value="Drafting">Drafting</option>
                            <option value="Preparing Documents">Preparing Documents</option>
                            <option value="Essay Drafting">Essay Drafting</option>
                            <option value="Ready to Submit">Ready to Submit</option>
                            <option value="Applied">Applied</option>
                            <option value="Interview">Interview</option>
                            <option value="Awarded">Awarded</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>

                        {/* Column 9: Priority selector dropdown inside table */}
                        <td className="py-5 px-5">
                          <select 
                            value={currentPriority}
                            onChange={(e) => {
                              onTrackScholarship(s.id, currentStatus === 'not_started' ? 'Saved' : currentStatus, matchedApp?.notes || '', e.target.value as any);
                            }}
                            className={`p-1.5 border rounded-lg text-[11px] focus:outline-none cursor-pointer font-bold w-max ${
                              currentPriority === 'High' 
                                ? 'bg-status-urgent/15 text-status-urgent border-status-urgent/25' 
                                : currentPriority === 'Normal'
                                ? 'bg-status-info/15 text-status-info border-status-info/25'
                                : 'bg-status-warning/15 text-status-warning border-status-warning/25'
                            }`}
                          >
                            <option value="Low">Low</option>
                            <option value="Normal">Normal</option>
                            <option value="High">High</option>
                          </select>
                        </td>

                      </tr>
                    );
                  })}

                </tbody>
              </table>
            </div>
          </div>

         </div>
      )}

      {/* Premium Notification Alerts Modal */}
      {showAlertsModal && (
        <div id="alerts_system_modal" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-end z-50 animate-fade-in">
          <div className="w-full max-w-md bg-surface-container-lowest h-full shadow-2xl flex flex-col justify-between border-l border-outline-variant/40 animate-slide-in-right">
            
            {/* Header */}
            <div className="p-6 border-b border-outline-variant/40 flex items-center justify-between">
              <div className="flex items-center gap-2 font-display">
                <span className="material-symbols-outlined text-amber-500 font-bold">notifications_active</span>
                <div>
                  <h3 className="font-display font-black text-primary text-base">Scholarship Alert Center</h3>
                  <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Live deadlines & updates</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAlertsModal(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center cursor-pointer text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {systemAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">notifications_off</span>
                  <p className="text-xs font-bold text-on-surface-variant">No pending alerts or deadlines found.</p>
                </div>
              ) : (
                systemAlerts.map(alert => (
                  <div 
                    key={alert.id}
                    className={`p-4 border rounded-2xl space-y-3 transition-all ${
                      alert.severity === 'urgent' 
                        ? 'bg-status-urgent/5 border-status-urgent/25 hover:border-status-urgent/45' 
                        : 'bg-status-info/5 border-status-info/25 hover:border-status-info/45'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        alert.severity === 'urgent' ? 'bg-status-urgent/15 text-status-urgent' : 'bg-status-info/15 text-status-info'
                      }`}>
                        <span className="material-symbols-outlined text-base">
                          {alert.severity === 'urgent' ? 'alarm' : 'campaign'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                            alert.severity === 'urgent' ? 'bg-status-urgent/10 text-status-urgent' : 'bg-status-info/10 text-status-info'
                          }`}>
                            {alert.severity === 'urgent' ? 'Urgent' : 'Opportunity'}
                          </span>
                          <span className="text-[9px] font-bold text-on-surface-variant/70">{alert.date}</span>
                        </div>
                        <h4 className="font-extrabold text-xs text-on-surface mt-1.5 leading-normal">{alert.title}</h4>
                        <p className="text-[11px] text-on-surface-variant/85 mt-1 leading-relaxed">
                          {alert.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-1 border-t border-outline-variant/10">
                      <button
                        onClick={() => {
                          setSelectedSchol(alert.sourceSchol);
                          setShowAlertsModal(false);
                        }}
                        className="px-3 py-1.5 bg-surface text-primary border border-outline-variant hover:bg-surface-variant rounded-lg text-[10px] font-black cursor-pointer transition-colors"
                      >
                        Explore Opportunity
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-outline-variant/40 bg-surface-container-low/50">
              <button
                onClick={() => setShowAlertsModal(false)}
                className="w-full py-2.5 bg-primary hover:bg-primary/95 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-all shadow-sm text-center"
              >
                Got it, Thanks
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}


