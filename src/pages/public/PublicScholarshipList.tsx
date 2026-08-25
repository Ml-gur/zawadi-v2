import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Columns2, LayoutGrid, Rows3, Search, X } from 'lucide-react';
import { useCompare } from '../../components/compare/useCompare';
import CompareModal from '../../components/compare/CompareModal';
import { SEO } from '../../components/SEO';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import BrowseCard from './BrowseCard';
import BrowseTable from './BrowseTable';
import type { ScholarshipTeaser } from './browse-shared';

interface ListResponse {
  scholarships: ScholarshipTeaser[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

function SkeletonCard() {
  return (
    <div className="rounded-ed border border-ash/70 bg-pure-white p-8 min-h-[300px] animate-pulse" aria-hidden>
      <div className="h-4 w-24 bg-mist rounded-full mb-6" />
      <div className="h-5 w-3/4 bg-mist rounded mb-3" />
      <div className="h-3 w-1/2 bg-mist rounded mb-6" />
      <div className="h-3 w-full bg-mist rounded mb-2" />
      <div className="h-3 w-2/3 bg-mist rounded" />
    </div>
  );
}

const chipClass = (active: boolean) =>
  `px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer border ${
    active
      ? 'bg-off-black-ink text-pure-white border-off-black-ink hover:bg-black'
      : 'bg-pure-white border-ash text-graphite hover:border-off-black-ink hover:text-off-black-ink'
  }`;

export default function PublicScholarshipList({ user }: { user?: any } = {}) {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('');
  const [level, setLevel] = useState('');
  const [region, setRegion] = useState('');
  const [funding, setFunding] = useState<'' | 'Full' | 'Partial'>('');
  const [noIeltsOnly, setNoIeltsOnly] = useState(false);
  const [closingSoonOnly, setClosingSoonOnly] = useState(false);
  const [view, setView] = useState<'grid' | 'table'>('grid');

  const { ids: compareIds, open: compareOpen, setOpen: setCompareOpen, toggle: toggleCompare, clear: clearCompare } = useCompare();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/scholarships-public?page=${page}&limit=${limit}`)
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(async () => {
        try {
          const { supabase } = await import('../../lib/supabase');
          const offset = (page - 1) * limit;
          const today = new Date().toISOString().split('T')[0];
          const baseColumns = 'id,slug,name,provider,countries,degree_levels,funding_type,amount,deadline,urgency,description,no_ielts,targets_financial_need,targets_first_generation,is_intra_african,fields_of_study,host_region,iso2,opens_at,updated_at';
          const runQuery = (columns: string) => supabase.from('scholarships').select(columns).eq('published', true).or(`deadline.is.null,deadline.gte.${today}`).order('deadline', { ascending: true, nullsFirst: false }).range(offset, offset + limit - 1);
          const [countRes, dataRes0] = await Promise.all([
            supabase.from('scholarships').select('id', { count: 'exact', head: true }).eq('published', true).or(`deadline.is.null,deadline.gte.${today}`),
            runQuery(baseColumns),
          ]);
          // migration 015 (opens_at) not applied yet — retry without the column
          const needsRetry = Boolean(dataRes0.error) && (
            (dataRes0.error as any)?.code === 'PGRST204' ||
            (dataRes0.error as any)?.code === '42703' ||
            /opens_at/.test((dataRes0.error as any)?.message || '')
          );
          const dataRes: any = needsRetry ? await runQuery(baseColumns.replace(',opens_at', '')) : dataRes0;
          if (cancelled) return;
          if (dataRes.error) throw dataRes.error;
          const scholarships = (dataRes.data || []).map(s => ({ ...s, description: s.description ? String(s.description).slice(0, 300) : null })) as ScholarshipTeaser[];
          setData({ scholarships, total: countRes.count ?? scholarships.length, page, limit, hasMore: offset + limit < (countRes.count ?? 0) });
        } catch { /* keep empty */ }
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [page]);

  const items = data?.scholarships ?? [];

  const levels = useMemo(
    () => [...new Set(items.flatMap(s => s.degree_levels || []))].sort(),
    [items],
  );
  const countries = useMemo(
    () => [...new Set(items.flatMap(s => s.countries || []))].sort(),
    [items],
  );

  const REGION_MAP: Record<string, string[]> = {
    'East Africa': ['Kenya', 'Tanzania', 'Uganda', 'Rwanda', 'Ethiopia', 'Burundi'],
    'West Africa': ['Nigeria', 'Ghana', 'Senegal', 'Ivory Coast', 'Mali'],
    'Southern Africa': ['South Africa', 'Zimbabwe', 'Zambia', 'Botswana', 'Namibia'],
    'North Africa': ['Egypt', 'Morocco', 'Tunisia', 'Algeria'],
    'International': [],
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(s => {
      if (funding && s.funding_type !== funding) return false;
      if (noIeltsOnly && !s.no_ielts) return false;
      if (closingSoonOnly) {
        const t = s.deadline ? Date.parse(s.deadline) : NaN;
        const days = Number.isNaN(t) ? Infinity : Math.ceil((t - Date.now()) / 86_400_000);
        if (!(days >= 0 && days <= 30) && s.urgency !== 'Urgent') return false;
      }
      if (level && !(s.degree_levels || []).includes(level)) return false;
      if (country && !(s.countries || []).includes(country)) return false;
      if (region) {
        const members = REGION_MAP[region] || [];
        if (members.length === 0) {
          // International: show scholarships with no country restriction or non-African coverage
          if (s.countries && s.countries.length > 0 && s.countries.some(c => Object.values(REGION_MAP).flat().includes(c))) return false;
        } else if (s.countries && s.countries.length > 0) {
          if (!s.countries.some(c => members.includes(c))) return false;
        }
      }
      if (q) {
        const hay = `${s.name} ${s.provider} ${s.description} ${(s.countries || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, query, country, level, region, funding, noIeltsOnly, closingSoonOnly]);

  const clearFilters = () => { setQuery(''); setCountry(''); setLevel(''); setRegion(''); setFunding(''); setNoIeltsOnly(false); setClosingSoonOnly(false); };
  const hasFilters = Boolean(query || country || level || region || funding || noIeltsOnly || closingSoonOnly);
  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const openAuth = () => window.dispatchEvent(new CustomEvent('open-auth'));

  return (
    <div id="browse-root" className="min-h-[100dvh] bg-parchment text-off-black-ink flex flex-col">
      <SEO
        title="Open Scholarships for African Students | Techsari"
        description={`Browse ${data?.total || 'available'} open scholarships for African students. Find opportunities you're 100% eligible for.`}
        path="/scholarships/browse"
      />


      <main className="flex-grow w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-14 md:py-20">
        {/* Page header */}
        <div className="mb-10 md:mb-12">
          <Breadcrumbs items={[{ name: 'Scholarships', path: '/scholarships/browse' }]} />
          <p className="text-ed-caption uppercase text-graphite mb-5">Scholarship database</p>
          <h1 className="text-ed-h1-sm md:text-ed-h1 text-off-black-ink max-w-[20ch]">100% Eligible Opportunities</h1>
          <p className="mt-4 text-ed-sub font-normal text-graphite">
            {data
              ? `${data.total} verified listing${data.total !== 1 ? 's' : ''}, refreshed daily.`
              : 'Loading verified listings…'}
          </p>
        </div>

        {/* Signup banner — guests only; authed users get a workspace strip */}
        {user ? (
          <section className="mb-8 rounded-ed bg-mist border border-ash p-6 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-ed-body text-off-black-ink">
              Browsing as <span className="font-medium">{String(user.name || user.email || 'member')}</span> — open your workspace to track, save and apply.
            </p>
            <Link
              to="/scholarships"
              className="inline-flex items-center justify-center rounded-full bg-electric-lime px-6 min-h-[44px] text-ed-body-sm font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all shrink-0"
            >
              Open workspace
            </Link>
          </section>
        ) : (
          <section className="mb-8 rounded-ed bg-deep-charcoal text-pure-white p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-ed-sub text-pure-white">See only what you qualify for.</h2>
              <p className="mt-2 text-ed-body-sm text-smoke max-w-[52ch]">
                A free profile unlocks eligibility breakdowns and application links for every listing.
              </p>
            </div>
            <div className="flex items-center gap-5 shrink-0">
              <button
                onClick={openAuth}
                className="inline-flex items-center justify-center rounded-full bg-electric-lime px-7 min-h-[48px] text-base font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all cursor-pointer"
              >
                Sign up free
              </button>
              <button onClick={openAuth} className="text-base font-medium text-pure-white border-b border-pure-white pb-0.5 hover:text-smoke hover:border-smoke transition-colors cursor-pointer">
                Log in
              </button>
            </div>
          </section>
        )}

        {/* Filters panel */}
        <section aria-label="Filters" className="rounded-ed border border-ash/70 bg-pure-white p-6 md:p-8 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite pointer-events-none" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search scholarships, keywords, or sponsors…"
                aria-label="Search scholarships"
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-ash bg-pure-white text-ed-body placeholder:text-graphite focus:outline-none focus:border-graphite hover:border-graphite transition-colors"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:col-span-2 gap-3">
              <div className="relative">
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  aria-label="Filter by country"
                  className="w-full appearance-none px-4 py-3 pr-10 rounded-lg border border-ash bg-pure-white text-ed-body-sm font-medium focus:outline-none focus:border-graphite hover:border-graphite transition-colors cursor-pointer"
                >
                  <option value="">Country</option>
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite pointer-events-none" aria-hidden />
              </div>
              <div className="relative">
                <select
                  value={level}
                  onChange={e => setLevel(e.target.value)}
                  aria-label="Filter by degree level"
                  className="w-full appearance-none px-4 py-3 pr-10 rounded-lg border border-ash bg-pure-white text-ed-body-sm font-medium focus:outline-none focus:border-graphite hover:border-graphite transition-colors cursor-pointer"
                >
                  <option value="">Level</option>
                  {levels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite pointer-events-none" aria-hidden />
              </div>
              <div className="relative">
                <select
                  value={region}
                  onChange={e => setRegion(e.target.value)}
                  aria-label="Filter by region"
                  className="w-full appearance-none px-4 py-3 pr-10 rounded-lg border border-ash bg-pure-white text-ed-body-sm font-medium focus:outline-none focus:border-graphite hover:border-graphite transition-colors cursor-pointer"
                >
                  <option value="">Region</option>
                  <option>East Africa</option>
                  <option>West Africa</option>
                  <option>Southern Africa</option>
                  <option>North Africa</option>
                  <option>International</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite pointer-events-none" aria-hidden />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-ed-caption uppercase text-graphite mr-1">Quick filters:</span>
              <button onClick={() => { setFunding(''); setNoIeltsOnly(false); }} aria-pressed={!funding && !noIeltsOnly} className={chipClass(!funding && !noIeltsOnly)}>
                All Types
              </button>
              <button onClick={() => setFunding(f => (f === 'Full' ? '' : 'Full'))} aria-pressed={funding === 'Full'} className={chipClass(funding === 'Full')}>
                Full Tuition
              </button>
              <button onClick={() => setFunding(f => (f === 'Partial' ? '' : 'Partial'))} aria-pressed={funding === 'Partial'} className={chipClass(funding === 'Partial')}>
                Grants
              </button>
              <button onClick={() => setNoIeltsOnly(v => !v)} aria-pressed={noIeltsOnly} className={chipClass(noIeltsOnly)}>
                No IELTS
              </button>
              <button onClick={() => setClosingSoonOnly(v => !v)} aria-pressed={closingSoonOnly} className={chipClass(closingSoonOnly)}>
                Closing soon
              </button>
            </div>

            <div className="flex items-center gap-1 bg-mist border border-ash/80 rounded-lg p-1" role="group" aria-label="View mode">
              <button
                onClick={() => setView('grid')}
                aria-pressed={view === 'grid'}
                aria-label="Grid view"
                className={`p-3 rounded-md transition-colors cursor-pointer inline-flex ${view === 'grid' ? 'bg-pure-white border border-ash text-off-black-ink hover:border-graphite' : 'text-graphite hover:text-off-black-ink'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('table')}
                aria-pressed={view === 'table'}
                aria-label="Table view"
                className={`p-3 rounded-md transition-colors cursor-pointer inline-flex ${view === 'table' ? 'bg-pure-white border border-ash text-off-black-ink hover:border-graphite' : 'text-graphite hover:text-off-black-ink'}`}
              >
                <Rows3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Results */}
        {!loading && items.length > 0 && (
          <p className="mb-5 text-ed-body-sm text-graphite" role="status">
            Showing {filtered.length} of {items.length} listings on this page
            {hasFilters && (
              <>
                {' · '}
                <button onClick={clearFilters} className="underline underline-offset-4 decoration-ash hover:text-off-black-ink transition-colors cursor-pointer">
                  Clear filters
                </button>
              </>
            )}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-5 lg:gap-6" aria-hidden>
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-ed border border-ash/70 bg-pure-white py-16 px-6 text-center">
            {items.length === 0 ? (
              <>
                <p className="text-ed-sub text-off-black-ink">No open scholarships found.</p>
                <p className="mt-2 text-ed-body text-graphite">Check back soon — new listings land daily.</p>
              </>
            ) : (
              <>
                <p className="text-ed-sub text-off-black-ink">Nothing matches those filters.</p>
                <p className="mt-2 text-ed-body text-graphite">Loosen a filter or check back — new listings land daily.</p>
                {hasFilters && (
                  <button onClick={clearFilters} className="mt-6 inline-flex text-base font-medium text-off-black-ink border-b border-off-black-ink pb-0.5 hover:text-graphite hover:border-graphite transition-colors cursor-pointer">
                    Clear all filters
                  </button>
                )}
              </>
            )}
          </div>
        ) : view === 'table' ? (
          <BrowseTable items={filtered} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-5 lg:gap-6">
            {filtered.map((s, i) => {
              const isDark = i % 3 === 2;
              return (
                <div key={s.id} className={`h-full ${isDark ? 'col-span-2 md:col-span-2 lg:col-span-1' : ''}`}>
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

        {/* Pagination */}
        {!loading && data && data.total > limit && (
          <nav aria-label="Pagination" className="flex items-center justify-center gap-4 mt-12">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-6 min-h-[48px] rounded-full border border-off-black-ink text-sm font-medium text-off-black-ink hover:bg-off-black-ink hover:text-pure-white transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              Previous
            </button>
            <span className="text-ed-body-sm text-graphite">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!data.hasMore}
              className="px-6 min-h-[48px] rounded-full border border-off-black-ink text-sm font-medium text-off-black-ink hover:bg-off-black-ink hover:text-pure-white transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              Next
            </button>
          </nav>
        )}

        {/* Floating comparison bar */}
        {compareIds.size > 0 && !compareOpen && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] animate-sweep">
            <div className="flex items-center gap-3 bg-off-black-ink text-pure-white rounded-full pl-5 pr-2 py-2 shadow-none border border-off-black-ink">
              <Columns2 className="w-4 h-4 text-electric-lime" aria-hidden />
              <span className="text-ed-body-sm font-medium whitespace-nowrap">{compareIds.size} selected for comparison</span>
              <button
                onClick={clearCompare}
                aria-label="Clear selection"
                className="icon-btn inline-flex items-center justify-center rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
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
          scholarships={items.filter(s => compareIds.has(s.id))}
          onRemove={toggleCompare}
          onClose={() => setCompareOpen(false)}
        />
      </main>

    </div>
  );
}
