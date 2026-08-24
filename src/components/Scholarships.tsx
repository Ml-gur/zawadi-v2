import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCompare } from './compare/useCompare';
import CompareModal from './compare/CompareModal';
import { Columns2, Download, Bell, RefreshCw, X, CalendarClock, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { Scholarship, ApplicationTracker, DocumentVaultItem } from '../types';
import { AFRICAN_COUNTRIES } from '../config/matching-config';
import { Lock, Search, GraduationCap, Bookmark, ArrowLeft, ArrowDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SEO } from './SEO';
import ShareButton from './ShareButton';
import BrowseCard from '../pages/public/BrowseCard';

interface ScholarshipsProps {
  user?: any;
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
  const [isPublic, setIsPublic] = useState(false);
  const [publicScholarships, setPublicScholarships] = useState<Scholarship[]>([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState<string | null>(null);
  const [publicTotalCount, setPublicTotalCount] = useState(0);
  const [publicPage, setPublicPage] = useState(0);
  const [publicHasMore, setPublicHasMore] = useState(true);
  const PUBLIC_PAGE_SIZE = 24;
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);

  // Public mode filters
  const [publicSearch, setPublicSearch] = useState('');
  const [publicCountry, setPublicCountry] = useState('');
  const [publicDegree, setPublicDegree] = useState('');
  const [publicNoIelts, setPublicNoIelts] = useState(false);

  // Check auth session at mount
  useEffect(() => {
    if (!user) {
      setIsPublic(true);
      fetchPublicScholarships();
    } else {
      setIsPublic(false);
    }
  }, [user]);

  const fetchPublicScholarships = async (page = 0, append = false) => {
    setPublicLoading(true);
    setPublicError(null);
    try {
      const from = page * PUBLIC_PAGE_SIZE;
      const to = from + PUBLIC_PAGE_SIZE - 1;
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('scholarships')
        .select('id, name, provider, host_region, host_institution, funding_type, deadline, no_ielts, degree_levels, countries, fields_of_study, urgency, iso2, published, description, eligibility, amount, required_documents, apply_url, source_url, slug, created_at')
        .eq('published', true)
        .or(`deadline.is.null,deadline.gte.${today}`)
        .order('id', { ascending: false })
        .range(from, to);

      if (!error && data) {
        if (append) {
          setPublicScholarships(prev => [...prev, ...(data as unknown as Scholarship[])]);
        } else {
          setPublicScholarships(data as unknown as Scholarship[]);
        }
        setPublicHasMore(data.length === PUBLIC_PAGE_SIZE);
        setPublicPage(page);
      } else if (error) {
        console.error('Error fetching public scholarships:', error);
        setPublicError('Could not load scholarships. Please try again later.');
      }
    } catch (e) {
      console.error('Error fetching public scholarships', e);
      setPublicError('An unexpected error occurred. Please refresh the page.');
    } finally {
      setPublicLoading(false);
    }
  };

  const handleLoadMore = () => {
    fetchPublicScholarships(publicPage + 1, true);
  };

  useEffect(() => {
    if (!publicLoading && publicScholarships.length > 0) {
      (async () => {
        try {
          const today = new Date().toISOString().split('T')[0];
          const { count } = await supabase.from('scholarships').select('id', { count: 'exact', head: true }).eq('published', true).or(`deadline.is.null,deadline.gte.${today}`);
          if (count != null) setPublicTotalCount(count);
        } catch {
          // keep previous total
        }
      })();
    }
  }, [publicLoading, publicScholarships.length]);

  const handleShowAuth = () => {
    setShowAuthModal(true);
  };

  const handleAuthAction = () => {
    window.dispatchEvent(new CustomEvent('open-auth', { detail: { action: 'signup' } }));
  };

  // Public mode filters
  const filteredPublic = publicScholarships.filter(s => {
    const matchesSearch = !publicSearch ||
      (s.name || '').toLowerCase().includes(publicSearch.toLowerCase()) ||
      (s.provider || '').toLowerCase().includes(publicSearch.toLowerCase());

    const matchesCountry = !publicCountry ||
      (s.countries || s.country || []).some((c: string) =>
        c.toLowerCase().includes(publicCountry.toLowerCase())
      );

    const degLevels = Array.isArray(s.degree_levels) ? s.degree_levels : [];
    const matchesDegree = !publicDegree ||
      degLevels.some(d => d && typeof d === 'string' && d.toLowerCase() === publicDegree.toLowerCase());

    const matchesNoIelts = !publicNoIelts || s.no_ielts === true;

    return matchesSearch && matchesCountry && matchesDegree && matchesNoIelts;
  });

  // Filtering state (moved before early return to preserve hook count across renders)
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
  const [deadlineSort, setDeadlineSort] = useState(false);
  const { ids: compareIds, open: compareOpen, setOpen: setCompareOpen, toggle: toggleCompare } = useCompare();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('sort') === 'deadline') setDeadlineSort(true);
  }, [searchParams]);
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

    const eligible = scholarships.filter(s => s && s.published);

    eligible.forEach(s => {
      const dl = s.deadline ? Math.ceil((new Date(s.deadline).getTime() - Date.now()) / 86400000) : null;
      const isUrgent = dl !== null && !Number.isNaN(dl) && dl > 0 && dl <= 45
        && !s.deadline!.toLowerCase().includes('varies')
        && !s.deadline!.toLowerCase().includes('annual');
      if (isUrgent) {
        alerts.push({
          id: `deadline-${s.id}`,
          title: `Approaching deadline: ${s.name}`,
          description: `Closes ${s.deadline} — ${dl === 1 ? 'tomorrow' : `in ${dl} days`}. Make sure your essays and documents are ready.`,
          date: `Closing: ${s.deadline}`,
          severity: 'urgent',
          sourceSchol: s
        });
      } else if ((s.match?.score || 0) >= 90) {
        alerts.push({
          id: `new-${s.id}`,
          title: `New match recommendation: ${s.name}`,
          description: `From ${s.provider} — your profile scores ${s.match!.score}% compatibility.`,
          date: 'New',
          severity: 'info',
          sourceSchol: s
        });
      }
    });

    const sorted = alerts.sort((a, b) => {
      if (a.severity === 'urgent' && b.severity !== 'urgent') return -1;
      if (a.severity !== 'urgent' && b.severity === 'urgent') return 1;
      if (a.severity === 'urgent' && b.severity === 'urgent') {
        const da = Date.parse(a.sourceSchol.deadline) || Infinity;
        const db = Date.parse(b.sourceSchol.deadline) || Infinity;
        return da - db;
      }
      return 0;
    });
    return sorted.slice(0, 12);
  }, [scholarships]);

  // Public preview rendering
  if (isPublic) {
    return (
      <div id="scholarship-dashboard-root" className="min-h-[100dvh] bg-parchment text-off-black-ink flex flex-col">
        <div className="flex-grow w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-14 md:py-20 space-y-8">
        <SEO
          title="Scholarships for African Students — Zawadi"
          description="Browse verified scholarships open to students from all 54 African countries. Filtered for real eligibility. No IELTS required options. Full funding and partial funding available."
          ogTitle="Scholarships for African Students — Zawadi"
          ogDescription="Verified scholarships open to African students. Every listing is checked for active deadlines and real eligibility. See funding from UK, Germany, USA, Japan, and African universities."
          path="/scholarships"
          image="https://techsari.online/og-scholarships.png"
        />

        {/* Guest Banner — dark island */}
        <div className="rounded-ed bg-deep-charcoal text-pure-white p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-ed-sub text-pure-white">You are viewing scholarships as a guest</h2>
            <p className="mt-2 text-ed-body-sm text-smoke max-w-xl">
              Create a free account to see your eligibility score for each one.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => { setShowAuthModal(false); handleAuthAction(); }}
              className="inline-flex items-center justify-center rounded-full bg-electric-lime px-7 min-h-[48px] text-base font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all cursor-pointer"
            >
              Create Free Account
            </button>
            <button
              onClick={() => { setShowAuthModal(false); handleAuthAction(); }}
              className="text-base font-medium text-pure-white border-b border-pure-white pb-0.5 hover:text-smoke hover:border-smoke transition-colors cursor-pointer"
            >
              Log In
            </button>
          </div>
        </div>

        {/* Filter Bar — editorial white */}
        <div className="rounded-ed border border-ash/70 bg-pure-white p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite pointer-events-none" aria-hidden />
              <input
                value={publicSearch}
                onChange={(e) => setPublicSearch(e.target.value)}
                placeholder="Search scholarships, keywords, or sponsors…"
                aria-label="Search scholarships"
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-ash bg-pure-white text-ed-body placeholder:text-graphite focus:outline-none focus:border-graphite hover:border-graphite transition-colors"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:col-span-2 gap-3">
              <select
                value={publicCountry}
                onChange={(e) => setPublicCountry(e.target.value)}
                aria-label="Filter by country"
                className="w-full appearance-none px-4 py-3 pr-10 rounded-lg border border-ash bg-pure-white text-ed-body-sm font-medium focus:outline-none focus:border-graphite hover:border-graphite transition-colors cursor-pointer"
              >
                <option value="">Country</option>
                {AFRICAN_COUNTRIES.map(c => (
                  <option key={c.code} value={c.name}>{c.name}</option>
                ))}
                <option value="Europe">Europe</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
              </select>
              <select
                value={publicDegree}
                onChange={(e) => setPublicDegree(e.target.value)}
                aria-label="Filter by level"
                className="w-full appearance-none px-4 py-3 pr-10 rounded-lg border border-ash bg-pure-white text-ed-body-sm font-medium focus:outline-none focus:border-graphite hover:border-graphite transition-colors cursor-pointer"
              >
                <option value="">Level</option>
                {['Bachelors', 'Masters', 'PhD', 'Doctorate', 'Postdoctoral'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <label className="flex items-center justify-center gap-2 text-ed-body-sm font-medium bg-pure-white border border-ash rounded-lg px-4 py-3 cursor-pointer hover:border-off-black-ink transition-colors">
                <input
                  type="checkbox"
                  checked={publicNoIelts}
                  onChange={(e) => setPublicNoIelts(e.target.checked)}
                  className="rounded text-off-black-ink border-ash accent-off-black-ink cursor-pointer w-4 h-4"
                />
                <span className={publicNoIelts ? 'text-off-black-ink font-medium' : 'text-graphite'}>No IELTS</span>
              </label>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-ed-caption uppercase text-graphite">Showing {filteredPublic.length} filtered results</span>
            {(publicSearch || publicCountry || publicDegree || publicNoIelts) && (
              <button
                onClick={() => { setPublicSearch(''); setPublicCountry(''); setPublicDegree(''); setPublicNoIelts(false); }}
                className="text-ed-body-sm font-medium text-off-black-ink border-b border-off-black-ink pb-0.5 hover:text-graphite hover:border-graphite transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <span className="text-ed-body-sm text-graphite">
            Showing {filteredPublic.length} of {publicTotalCount || filteredPublic.length} scholarships
          </span>
          <span className="text-ed-body-sm text-graphite hidden md:inline">
            <button onClick={() => handleShowAuth()} className="font-medium text-off-black-ink border-b border-off-black-ink pb-0.5 hover:text-graphite hover:border-graphite transition-colors cursor-pointer">Sign up free</button> to see all and get matched
          </span>
          {publicError && (
            <span className="text-xs font-medium text-ed-error bg-ed-error/10 border border-ed-error/20 px-3 py-1.5 rounded-full">
              {publicError}
            </span>
          )}
        </div>

        {/* Scholarship Cards Grid — editorial */}
        {publicLoading && publicScholarships.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-ed border border-ash/70 bg-pure-white p-8 min-h-[300px] animate-pulse">
                <div className="h-4 w-24 bg-mist rounded-full mb-6" />
                <div className="h-5 w-3/4 bg-mist rounded mb-3" />
                <div className="h-3 w-1/2 bg-mist rounded mb-6" />
                <div className="h-3 w-full bg-mist rounded mb-2" />
                <div className="h-3 w-2/3 bg-mist rounded" />
              </div>
            ))}
          </div>
        ) : filteredPublic.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {filteredPublic.map((s, idx) => {
                const isDark = idx % 3 === 2;
                const urgency = (() => {
                  if (!s.deadline || s.deadline.toLowerCase().includes('varies'))
                    return { label: 'Varies', isClosing: false };
                  const days = Math.ceil((new Date(s.deadline).getTime() - Date.now()) / 86400000);
                  if (days < 0) return { label: 'Deadline Passed', isClosing: false };
                  if (days <= 30) return { label: `${days} days left`, isClosing: true };
                  return { label: `${days} days left`, isClosing: false };
                })();

                const hostInfo = [s.host_institution, s.host_region].filter(Boolean).join(' · ');
                const category = (s.degree_levels?.[0] || s.funding_type || 'Opportunity').toUpperCase();

                return (
                  <div key={s.id} onClick={() => setSelectedSchol(s)} className={isDark ? 'md:col-span-2 lg:col-span-1 cursor-pointer' : 'cursor-pointer'}>
                    <article className={`group h-full min-h-[300px] rounded-ed p-7 md:p-8 flex flex-col justify-between transition-transform duration-300 hover:-translate-y-1 ${isDark ? 'bg-deep-charcoal text-pure-white' : 'bg-pure-white border border-ash/70'}`}>
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <span className={`text-ed-eyebrow uppercase pt-1 ${isDark ? 'text-smoke' : 'text-graphite'}`}>{category}</span>
                          {urgency.isClosing ? (
                            <span className="shrink-0 rounded-full bg-electric-lime px-3 py-1 text-ed-caption uppercase text-off-black-ink">Closing soon</span>
                          ) : (
                            <span className={`shrink-0 rounded-full border px-3 py-1 text-ed-caption uppercase ${isDark ? 'border-stone text-smoke' : 'border-ash text-graphite'}`}>{urgency.label}</span>
                          )}
                        </div>
                        <h3 className={`text-ed-h2 leading-tight line-clamp-2 ${isDark ? 'text-pure-white' : 'text-off-black-ink'}`}>{s.name}</h3>
                        {s.provider && <p className={`mt-1 text-ed-body-sm font-medium ${isDark ? 'text-pure-white/80' : 'text-off-black-ink/80'}`}>{s.provider}</p>}
                        {hostInfo && <p className={`text-xs flex items-center gap-1 mt-1 ${isDark ? 'text-smoke' : 'text-graphite'}`}><GraduationCap className="w-3 h-3 shrink-0" />{hostInfo}</p>}
                      {(s.countries || s.country) && (s.countries || s.country).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {(s.countries || s.country || []).slice(0, 3).map((c: string) => (
                            <span key={c} className={`text-xs px-2 py-0.5 rounded-full border ${isDark ? 'border-stone text-smoke' : 'border-ash text-graphite'}`}>{c}</span>
                          ))}
                          {(s.countries || s.country || []).length > 3 && <span className={`text-xs ${isDark ? 'text-smoke' : 'text-graphite'}`}>+{((s.countries || s.country || []).length - 3)} more</span>}
                        </div>
                      )}
                      {s.amount && <p className={`mt-3 text-ed-body-sm font-medium ${isDark ? 'text-electric-lime' : 'text-graphite'}`}>{s.amount}</p>}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {s.funding_type && <span className={`text-xs px-2.5 py-0.5 rounded-full border ${isDark ? 'border-stone text-smoke' : 'border-ash text-graphite'}`}>{s.funding_type === 'Full' ? 'Full Funding' : 'Partial Funding'}</span>}
                        {s.no_ielts && <span className={`text-xs px-2.5 py-0.5 rounded-full border ${isDark ? 'border-electric-lime/50 text-electric-lime' : 'border-ash text-graphite'}`}>No IELTS</span>}
                      </div>
                      </div>
                      <div className={`mt-6 pt-4 border-t flex items-center justify-between gap-3 ${isDark ? 'border-stone' : 'border-ash'}`}>
                        <ShareButton url={`/scholarships/browse/${s.slug}`} iconOnly size="sm" tone={isDark ? 'dark' : 'light'} />
                        <span className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-smoke' : 'text-graphite'}`}><Lock className="w-3 h-3" />Sign up for match score</span>
                        <span className={`text-sm font-medium ${isDark ? 'text-electric-lime' : 'text-off-black-ink'}`}>Sign Up Free</span>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>

            {publicHasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={publicLoading}
                  className="px-8 py-3 min-h-[48px] rounded-full border border-off-black-ink text-sm font-medium text-off-black-ink hover:bg-off-black-ink hover:text-pure-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {publicLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load More Scholarships
                      <ArrowDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-canvas border border-hairline/60 rounded-lg">
            <Search className="w-8 h-8 text-muted-variant mx-auto mb-3" />
            <p className="text-sm text-muted font-medium">No scholarships match your filters.</p>
            <p className="text-xs text-muted/50 mt-1">Try adjusting your search criteria or check back later.</p>
            <div className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-primary/5 border border-primary/20 rounded-full">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <button onClick={() => handleShowAuth()} className="text-xs font-bold text-primary hover:text-secondary transition-colors cursor-pointer">
                Sign up free to see all scholarships and get matched
              </button>
            </div>
          </div>
        )}

        {/* Public Scholarship Detail Modal with Soft Gate */}
        {selectedSchol && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedSchol(null)}>
            <div
              className="bg-canvas rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <div className="sticky top-0 bg-canvas/90 backdrop-blur-sm flex items-center justify-between p-4 border-b border-hairline/20 z-10">
                <button onClick={() => setSelectedSchol(null)} className="flex items-center gap-1.5 text-xs font-bold text-muted hover:text-primary transition-colors cursor-pointer">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                {selectedSchol.slug && (
                  <ShareButton
                    url={`/scholarships/browse/${selectedSchol.slug}`}
                    title={selectedSchol.name}
                    iconOnly
                    size="sm"
                  />
                )}
              </div>

              {/* Visible top half - name, provider, description, basic requirements */}
              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {selectedSchol.funding_type && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedSchol.funding_type === 'Full'
                          ? 'bg-status-success/10 text-status-success'
                          : 'bg-secondary-container/20 text-secondary'
                      }`}>
                        {selectedSchol.funding_type === 'Full' ? 'Fully Funded' : 'Partially Funded'}
                      </span>
                    )}
                    {selectedSchol.no_ielts && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-status-warning/10 text-status-warning border border-status-warning/30">No IELTS</span>
                    )}
                  </div>
                  <h2 className="text-xl font-display font-black text-primary mb-1">{selectedSchol.name}</h2>
                  <p className="text-sm text-muted font-medium">{selectedSchol.provider} {selectedSchol.host_institution ? `• ${selectedSchol.host_institution}` : ''}</p>
                </div>

                {(selectedSchol.countries || selectedSchol.country) && (selectedSchol.countries || selectedSchol.country).length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Eligible Countries</h4>
                    <div className="flex flex-wrap gap-1">
                      {(selectedSchol.countries || selectedSchol.country || []).map((c: string) => (
                        <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-off-black text-muted font-medium">{c}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSchol.description && (
                  <div>
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Description</h4>
                    <p className="text-xs text-muted/80 leading-relaxed line-clamp-6">{selectedSchol.description}</p>
                  </div>
                )}

                {selectedSchol.eligibility && (
                  <div>
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Basic Requirements</h4>
                    <p className="text-xs text-muted/80 leading-relaxed line-clamp-4">{selectedSchol.eligibility}</p>
                  </div>
                )}

                {(selectedSchol.degree_levels || []).length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Degree Levels</h4>
                    <div className="flex flex-wrap gap-1">
                      {(selectedSchol.degree_levels || []).map((d: string) => (
                        <span key={d} className="text-[11px] px-2 py-0.5 rounded-full bg-primary-fixed/15 text-primary font-semibold">{d}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Soft gate - blurred bottom section */}
                <div className="relative mt-8 rounded-lg overflow-hidden">
                  {/* Blurred content preview */}
                  <div className="p-6 blur-sm select-none space-y-4">
                    <div className="h-4 bg-outline-variant/30 rounded w-3/4" />
                    <div className="h-4 bg-outline-variant/30 rounded w-1/2" />
                    <div className="h-4 bg-outline-variant/30 rounded w-5/6" />
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="h-20 bg-outline-variant/20 rounded-lg" />
                      <div className="h-20 bg-outline-variant/20 rounded-lg" />
                    </div>
                    <div className="h-12 bg-primary/10 rounded-lg" />
                  </div>

                  {/* Gate overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 backdrop-blur-[2px] p-6 text-center">
                    <Lock className="w-8 h-8 text-primary mb-3" />
                    <h3 className="text-base font-display font-black text-primary mb-2">Unlock Full Details</h3>
                    <p className="text-xs text-muted mb-4 max-w-sm">
                      Create a free account to see your full eligibility breakdown, required documents, and match score.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleShowAuth()}
                        className="px-5 py-2.5 bg-transparent border border-cream/60 hover:border-cream hover:bg-cream/[0.04] text-cream font-bold rounded-lg hover:bg-primary-container transition-colors cursor-pointer text-xs"
                      >
                        Sign Up Free
                      </button>
                      <button
                        onClick={() => handleShowAuth()}
                        className="px-5 py-2.5 bg-transparent border border-hairline text-primary font-bold rounded-lg hover:bg-off-black transition-colors cursor-pointer text-xs"
                      >
                        Log In
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

                {/* Save/Track Auth Modal */}
        {showTrackModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTrackModal(false)}>
            <div
              className="bg-canvas rounded-lg max-w-sm w-full p-8 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Bookmark className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-display font-black text-primary mb-2">Save Scholarships</h3>
              <p className="text-xs text-muted mb-6 leading-relaxed">
                You need a free account to save scholarships and track your applications.
                It takes under two minutes to set up.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setShowTrackModal(false); handleAuthAction(); }}
                  className="w-full px-5 py-3 bg-transparent border border-cream/60 hover:border-cream hover:bg-cream/[0.04] text-cream font-bold rounded-lg hover:bg-primary-container transition-colors cursor-pointer text-sm"
                >
                  Create Free Account
                </button>
                <button
                  onClick={() => { setShowTrackModal(false); handleAuthAction(); }}
                  className="w-full px-5 py-2.5 bg-transparent border border-hairline/60 text-primary font-bold rounded-lg hover:bg-off-black transition-colors cursor-pointer text-sm"
                >
                  Log In
                </button>
                <button
                  onClick={() => setShowTrackModal(false)}
                  className="w-full mt-1 text-xs font-bold text-muted hover:text-primary transition-colors cursor-pointer"
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Auth Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAuthModal(false)}>
            <div
              className="bg-canvas rounded-lg max-w-sm w-full p-8 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <GraduationCap className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-display font-black text-primary mb-2">Welcome to Zawadi</h3>
              <p className="text-xs text-muted mb-6 leading-relaxed">
                Create a free profile to see your eligibility score for each scholarship, track applications, and get matched to opportunities you qualify for.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setShowAuthModal(false); handleAuthAction(); }}
                  className="w-full px-5 py-3 bg-transparent border border-cream/60 hover:border-cream hover:bg-cream/[0.04] text-cream font-bold rounded-lg hover:bg-primary-container transition-colors cursor-pointer text-sm"
                >
                  Create Free Account
                </button>
                <button
                  onClick={() => { setShowAuthModal(false); handleAuthAction(); }}
                  className="w-full px-5 py-2.5 bg-transparent border border-hairline/60 text-primary font-bold rounded-lg hover:bg-off-black transition-colors cursor-pointer text-sm"
                >
                  Log In
                </button>
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="w-full mt-1 text-xs font-bold text-muted hover:text-primary transition-colors cursor-pointer"
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    );
  }

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
    // Deadline sort deep-link (?sort=deadline): soonest CLOSING first, expired pushed to the bottom
    if (deadlineSort) {
      const now = Date.now();
      const da = a.deadline ? Date.parse(a.deadline) : NaN;
      const db = b.deadline ? Date.parse(b.deadline) : NaN;
      const aValid = !Number.isNaN(da) && da >= now;
      const bValid = !Number.isNaN(db) && db >= now;
      if (aValid && bValid) return da - db;
      if (aValid) return -1;
      if (bValid) return 1;
      const aOpen = !a.deadline || /varies|annual|rolling/i.test(a.deadline);
      const bOpen = !b.deadline || /varies|annual|rolling/i.test(b.deadline);
      if (aOpen && !bOpen) return -1;
      if (!aOpen && bOpen) return 1;
      return 0;
    }
    // Push expired scholarships to the bottom regardless of match score
    const now = Date.now();
    const aExpired = a.deadline ? Math.ceil((new Date(a.deadline).getTime() - now) / 86400000) < 0 : false;
    const bExpired = b.deadline ? Math.ceil((new Date(b.deadline).getTime() - now) / 86400000) < 0 : false;
    if (aExpired && !bExpired) return 1;
    if (!aExpired && bExpired) return -1;
    // Within same expired/active group, sort by match score descending
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
    <div id="scholarship-dashboard-root" className="min-h-[100dvh] bg-parchment text-off-black-ink flex flex-col">
      <div className="flex-grow w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-14 md:py-20 space-y-8">
      
      {/* Scholarship finder — cards route to the shared public detail page for a uniform experience */}
      <div className="space-y-6">

          {/* Main Top Header Section with Side Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-ed-caption uppercase text-graphite tracking-wide mb-1">Africa-wide scholarship finder</p>
              <h2 className="text-ed-h1-sm text-off-black-ink tracking-tight">Scholarship finder</h2>
            </div>
            
            {/* Top Right Action Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowAlertsModal(true)}
                className="relative inline-flex items-center gap-1.5 px-4 min-h-[40px] bg-pure-white border border-ash rounded-full text-ed-body-sm font-medium text-graphite hover:text-off-black-ink hover:border-off-black-ink transition-all cursor-pointer"
              >
                <Bell className="w-4 h-4" aria-hidden />
                <span>Alerts</span>
                {systemAlerts.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-electric-lime border border-off-black-ink text-off-black-ink text-[9px] font-medium">
                    {systemAlerts.length}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => {
                  toast.success("Syncing all tracked opportunities with your active application pipeline...");
                  window.location.reload();
                }}
                className="inline-flex items-center gap-1.5 px-4 min-h-[40px] bg-pure-white border border-ash rounded-full text-ed-body-sm font-medium text-graphite hover:text-off-black-ink hover:border-off-black-ink transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" aria-hidden />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* Premium Filter System Container — editorial */}
          <div className="bg-pure-white border border-ash/70 rounded-ed p-6 md:p-8 space-y-5">
            <h3 className="text-ed-caption uppercase text-graphite">Filter scholarships</h3>
            
            {/* Horizontal Filter Layout Row 1 */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Keyword Search */}
              <div className="relative flex-1 min-w-[260px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite pointer-events-none" aria-hidden />
                <input 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search scholarship, school, country, field"
                  className="w-full pl-10 pr-4 py-3 border border-ash rounded-lg text-ed-body-sm bg-pure-white text-off-black-ink placeholder:text-graphite focus:outline-none focus:border-graphite hover:border-graphite transition-colors"
                  type="text"
                />
              </div>

              {/* All countries selector */}
              <select 
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="bg-pure-white border border-ash rounded-lg px-4 py-3 text-ed-body-sm font-medium text-off-black-ink focus:outline-none focus:border-graphite hover:border-graphite transition-colors cursor-pointer"
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
                className="bg-pure-white border border-ash rounded-lg px-4 py-3 text-ed-body-sm font-medium text-off-black-ink focus:outline-none focus:border-graphite hover:border-graphite transition-colors cursor-pointer"
              >
                <option value="">All levels</option>
                {degrees.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              {/* All Statuses tracking selector */}
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-pure-white border border-ash rounded-lg px-4 py-3 text-ed-body-sm font-medium text-off-black-ink focus:outline-none focus:border-graphite hover:border-graphite transition-colors cursor-pointer"
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
                className="bg-pure-white border border-ash rounded-lg px-4 py-3 text-ed-body-sm font-medium text-off-black-ink focus:outline-none focus:border-graphite hover:border-graphite transition-colors cursor-pointer"
              >
                <option value="">All funding</option>
                <option value="Full">Fully funded</option>
                <option value="Partial">Partially funded</option>
              </select>

              {/* Sponsor types */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-pure-white border border-ash rounded-lg px-4 py-3 text-ed-body-sm font-medium text-off-black-ink focus:outline-none focus:border-graphite hover:border-graphite transition-colors cursor-pointer"
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
                className="bg-pure-white border border-ash rounded-lg px-4 py-3 text-ed-body-sm font-medium text-off-black-ink focus:outline-none focus:border-graphite hover:border-graphite transition-colors cursor-pointer"
              >
                <option value="">Any access</option>
                <option value="Direct">Direct portal access</option>
                <option value="Consortium">Consortium application</option>
              </select>
            </div>

            {/* Horizontal Filter Layout Row 2 */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-ash">
              {/* School host text filter */}
              <input 
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
                placeholder="School"
                className="bg-pure-white border border-ash rounded-lg px-4 py-3 text-ed-body-sm text-off-black-ink placeholder:text-graphite focus:outline-none focus:border-graphite hover:border-graphite w-32 transition-colors"
                type="text"
              />

              {/* Docs Ready Checkbox */}
              <label className="flex items-center gap-2 text-ed-body-sm font-medium bg-pure-white border border-ash px-4 py-3 rounded-lg cursor-pointer hover:border-off-black-ink transition-colors">
                <input 
                  type="checkbox"
                  checked={docsReadyFilter}
                  onChange={(e) => setDocsReadyFilter(e.target.checked)}
                  className="rounded text-primary border-hairline/80 accent-primary cursor-pointer w-3.5 h-3.5"
                />
                <span>Docs ready</span>
              </label>

              {/* Amount Shown Checkbox */}
              <label className="flex items-center gap-1.5 text-ed-body-sm font-medium bg-pure-white border border-ash px-4 py-3 rounded-lg cursor-pointer hover:border-off-black-ink transition-colors">
                <input
                  type="checkbox"
                  checked={amountShownFilter}
                  onChange={(e) => setAmountShownFilter(e.target.checked)}
                  className="rounded text-primary border-hairline/80 accent-primary cursor-pointer w-3.5 h-3.5"
                />
                <span>Amount shown</span>
              </label>

              {/* Match accuracy threshold selector */}
              <select
                value={matchSortFilter}
                onChange={(e) => setMatchSortFilter(e.target.value as any)}
                aria-label="Match score threshold"
                className="bg-pure-white border border-ash rounded-lg px-4 py-3 text-ed-body-sm font-medium text-off-black-ink focus:outline-none focus:border-graphite hover:border-graphite transition-colors cursor-pointer"
              >
                <option value="default">Any match</option>
                <option value="high">Score &gt;= 80%</option>
                <option value="all">Any alignment</option>
              </select>

              {/* No-IELTS toggle with tooltip */}
              <div className="relative">
                <label className="flex items-center gap-1.5 text-ed-body-sm font-medium bg-pure-white border border-ash px-4 py-3 rounded-lg cursor-pointer hover:border-off-black-ink transition-colors">
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
                    className="rounded text-primary border-hairline/80 accent-primary cursor-pointer w-3.5 h-3.5"
                  />
                  <span>No IELTS</span>
                </label>
                {showNoIeltsTooltip && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-off-black-ink text-pure-white text-xs rounded-lg p-3 z-50 pointer-events-none">
                    <div className="flex items-start gap-2">
                      <Search className="w-3.5 h-3.5 shrink-0 mt-0.5 text-electric-lime" aria-hidden />
                      <span>Removing the destination filter will show you more No-IELTS opportunities across all regions.</span>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-off-black-ink border-r border-b rotate-45 -mt-1"></div>
                  </div>
                )}
              </div>

              {/* Urgency filter dropdown */}
              <select value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)} aria-label="Filter by urgency"
                      className="bg-pure-white border border-ash rounded-lg px-4 py-3 text-ed-body-sm font-medium text-off-black-ink focus:outline-none focus:border-graphite hover:border-graphite transition-colors cursor-pointer">
                <option value="">Urgency: All</option>
                <option value="Closing Soon">Closing Soon (≤30 days)</option>
                <option value="Closing in 60">Closing in 60 days</option>
                <option value="Open All">Open All Deadlines</option>
              </select>
              <select value={hostRegionFilter} onChange={e => setHostRegionFilter(e.target.value)} aria-label="Filter by host region"
                      className="bg-pure-white border border-ash rounded-lg px-4 py-3 text-ed-body-sm font-medium text-off-black-ink focus:outline-none focus:border-graphite hover:border-graphite transition-colors cursor-pointer">
                <option value="">Region: All</option>
                {['West Africa hubs','East Africa hubs','Southern Africa hubs','North Africa hubs','Central Africa hubs','United Kingdom and Ireland','United States and Canada','Australia and New Zealand','Commonwealth Africa','Commonwealth Global','France and Belgium','Francophone destinations','Lusophone destinations','Germany, Austria, Switzerland (German-speaking)','Nordic countries','Netherlands and Belgium','Rest of Europe','China and East Asia','Japan and South Korea','Southeast Asia','Middle East and Gulf states','Intra-African'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <select value={sponsorTypeFilter} onChange={e => setSponsorTypeFilter(e.target.value)} aria-label="Filter by sponsor type"
                      className="bg-pure-white border border-ash rounded-lg px-4 py-3 text-ed-body-sm font-medium text-off-black-ink focus:outline-none focus:border-graphite hover:border-graphite transition-colors cursor-pointer">
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
                    className="text-xs font-medium text-graphite underline underline-offset-4 decoration-ash hover:text-off-black-ink cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table Counts Subheader Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap px-1">
            <span className="text-ed-caption uppercase text-graphite bg-parchment border border-ash px-3 py-1.5 rounded-full">
              {filteredList.length} opportunities located
            </span>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setDeadlineSort(v => !v)}
                aria-pressed={deadlineSort}
                className={`inline-flex items-center rounded-full px-4 min-h-[40px] text-ed-body-sm font-medium transition-all cursor-pointer ${
                  deadlineSort
                    ? 'bg-off-black-ink text-pure-white'
                    : 'border border-ash text-graphite hover:border-off-black-ink hover:text-off-black-ink'
                }`}
              >
                Closing soon first
              </button>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-4 min-h-[40px] border border-ash rounded-full text-ed-body-sm font-medium text-graphite hover:text-off-black-ink hover:border-off-black-ink transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" aria-hidden />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Opportunities grid — same as /scholarships/browse */}
          {filteredList.length === 0 ? (
            <div className="rounded-ed border border-ash/70 bg-pure-white py-16 px-6 text-center">
              <p className="text-ed-sub text-off-black-ink">No scholarships match your current filters.</p>
              <p className="mt-2 text-ed-body text-graphite">Try removing some filters or updating your profile details — new opportunities land daily.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {filteredList.map((s, idx) => {
                const isDark = idx % 3 === 2;
                return (
                  <div key={s.id} onClick={() => navigate(`/scholarships/browse/${s.slug || s.id}`)} className={isDark ? 'md:col-span-2 lg:col-span-1 cursor-pointer' : 'cursor-pointer'}>
                    <BrowseCard
                      s={s}
                      dark={isDark}
                      comparing={compareIds.has(s.id)}
                      onToggleCompare={() => toggleCompare(s.id)}
                    />
                  </div>
                );
              })}
            </div>
          )}
         </div>

      {/* Floating comparison bar */}
      {compareIds.size > 0 && !compareOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] animate-sweep">
          <div className="flex items-center gap-3 bg-off-black-ink text-pure-white rounded-full pl-5 pr-2 py-2 border border-off-black-ink">
            <Columns2 className="w-4 h-4 text-electric-lime" aria-hidden />
            <span className="text-ed-body-sm font-medium whitespace-nowrap">{compareIds.size} selected for comparison</span>
            <button
              onClick={() => setCompareOpen(true)}
              className="inline-flex items-center rounded-full bg-electric-lime px-5 min-h-[40px] text-ed-body-sm font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all cursor-pointer"
            >
              Compare now
            </button>
          </div>
        </div>
      )}

      <CompareModal
        open={compareOpen}
        scholarships={scholarships.filter(s => compareIds.has(s.id))}
        onRemove={toggleCompare}
        onClose={() => setCompareOpen(false)}
      />

      {/* Scholarship alerts drawer */}
      {showAlertsModal && (
        <div id="alerts_system_modal" className="fixed inset-0 bg-off-black-ink/65 backdrop-blur-sm flex justify-end z-50 animate-fade-in">
          <div className="w-full max-w-md bg-pure-white h-full flex flex-col justify-between border-l border-ash animate-slide-in-right">

            {/* Header */}
            <div className="p-6 border-b border-ash flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-electric-lime shrink-0">
                  <Bell className="w-4 h-4 text-off-black-ink" aria-hidden />
                </span>
                <div>
                  <h3 className="text-heading text-off-black-ink tracking-tight">Scholarship alerts</h3>
                  <p className="text-ed-caption uppercase text-graphite">Live deadlines &amp; updates</p>
                </div>
              </div>
              <button
                onClick={() => setShowAlertsModal(false)}
                aria-label="Close alerts"
                className="icon-btn w-9 h-9 rounded-full border border-ash inline-flex items-center justify-center text-graphite hover:text-off-black-ink hover:border-graphite transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {systemAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-parchment border border-ash mb-4" aria-hidden>
                    <Bell className="w-5 h-5 text-graphite" strokeWidth={1.5} />
                  </span>
                  <p className="text-ed-body-sm font-medium text-off-black-ink">No pending alerts or deadlines found.</p>
                </div>
              ) : (
                systemAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`p-4 border rounded-lg space-y-3 transition-colors ${
                      alert.severity === 'urgent'
                        ? 'bg-error/5 border-error/25 hover:border-error/45'
                        : 'bg-parchment border-ash hover:border-graphite/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        alert.severity === 'urgent' ? 'bg-error/10 text-error' : 'bg-electric-lime text-off-black-ink'
                      }`}>
                        {alert.severity === 'urgent'
                          ? <CalendarClock className="w-4 h-4" aria-hidden />
                          : <Sparkles className="w-4 h-4" aria-hidden />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                            alert.severity === 'urgent' ? 'bg-error/10 text-error' : 'bg-off-black-ink/5 text-graphite'
                          }`}>
                            {alert.severity === 'urgent' ? 'Urgent' : 'Opportunity'}
                          </span>
                          <span className="text-[10px] font-medium text-graphite">{alert.date}</span>
                        </div>
                        <h4 className="font-medium text-ed-body-sm text-off-black-ink mt-1.5 leading-normal">{alert.title}</h4>
                        <p className="text-xs text-graphite mt-1 leading-relaxed">
                          {alert.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1 border-t border-ash/70">
                      <button
                        onClick={() => {
                          navigate(`/scholarships/browse/${alert.sourceSchol.slug || alert.sourceSchol.id}`);
                          setShowAlertsModal(false);
                        }}
                        className="px-3 py-1.5 rounded-full bg-off-black-ink text-pure-white text-xs font-medium hover:bg-black transition-colors cursor-pointer"
                      >
                        Explore Opportunity
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-ash">
              <button
                onClick={() => setShowAlertsModal(false)}
                className="w-full py-2.5 min-h-[44px] rounded-full bg-electric-lime text-off-black-ink font-medium text-sm hover:bg-lime-hover active:scale-[0.98] transition-all cursor-pointer text-center"
              >
                Got it, Thanks
              </button>
            </div>

          </div>
        </div>
      )}
      </div>
    </div>
  );
}


