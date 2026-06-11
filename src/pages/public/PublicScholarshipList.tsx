import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SEO } from '../../components/SEO';
import { ExternalLink, Clock, Globe, GraduationCap, Loader2 } from 'lucide-react';

interface ScholarshipTeaser {
  id: string;
  slug: string;
  name: string;
  provider: string;
  countries: string[];
  degree_levels: string[];
  funding_type: string;
  amount: string;
  deadline: string;
  urgency: string;
  description: string;
  no_ielts: boolean;
  targets_financial_need: boolean;
  targets_first_generation: boolean;
  is_intra_african: boolean;
  updated_at: string;
}

interface ListResponse {
  scholarships: ScholarshipTeaser[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

function formatDeadline(dateStr: string | null): string {
  if (!dateStr) return 'Check website';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Check website';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isClosingSoon(deadline: string | null, urgency: string): boolean {
  if (!deadline) return false;
  if (urgency === 'Urgent') return true;
  const d = new Date(deadline);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return diff > 0 && diff <= 14 * 24 * 60 * 60 * 1000;
}

function truncateCountries(countries: string[]): string {
  if (!countries || countries.length === 0) return 'All countries';
  if (countries.length <= 3) return countries.join(', ');
  return countries.slice(0, 3).join(', ') + ` +${countries.length - 3} more`;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/40 p-5 animate-pulse">
      <div className="h-5 bg-outline-variant/30 rounded-lg w-3/4 mb-3" />
      <div className="h-3 bg-outline-variant/20 rounded w-1/2 mb-4" />
      <div className="flex gap-2 mb-3">
        <div className="h-5 bg-outline-variant/20 rounded-full w-16" />
        <div className="h-5 bg-outline-variant/20 rounded-full w-20" />
      </div>
      <div className="h-3 bg-outline-variant/20 rounded w-full mb-2" />
      <div className="h-3 bg-outline-variant/20 rounded w-2/3" />
    </div>
  );
}

export default function PublicScholarshipList() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 20;
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/scholarships-public?page=${page}&limit=${limit}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [page]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Open Scholarships for African Students | Zawadi"
        description={`Browse ${data?.total || 'available'} open scholarships for African students. Find opportunities you're 100% eligible for, powered by AI matching.`}
        path="/scholarships/browse"
      />

      <div className="max-w-[1000px] mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-primary mb-2">Open Scholarships</h1>
          <p className="text-sm text-on-surface-variant/70">
            {data ? `${data.total} open scholarship${data.total !== 1 ? 's' : ''} found` : 'Browse open scholarships'}
          </p>
        </div>

        {/* Signup Banner */}
        <div className="mb-8 p-4 rounded-2xl bg-primary/5 border border-primary/10 text-center">
          <p className="text-sm text-on-surface-variant font-medium mb-3">
            Create a free account to see full details, eligibility requirements, and application links for all scholarships.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary-container transition-colors cursor-pointer text-sm"
            >
              Sign Up Free
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 bg-transparent text-primary font-bold rounded-xl hover:bg-primary/5 transition-colors cursor-pointer text-sm"
            >
              Log In
            </button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : data && data.scholarships.length > 0 ? (
          <>
            <div className="grid gap-4">
              {data.scholarships.map(s => {
                const closingSoon = isClosingSoon(s.deadline, s.urgency);
                return (
                  <div
                    key={s.id}
                    className="rounded-2xl bg-surface-container-lowest border border-outline-variant/40 p-5 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="min-w-0">
                        <Link to={`/scholarships/browse/${s.slug}`} className="text-base font-bold text-primary hover:underline truncate block">
                          {s.name}
                        </Link>
                        {s.provider && (
                          <p className="text-xs text-on-surface-variant/60 mt-0.5">{s.provider}</p>
                        )}
                      </div>
                      <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        closingSoon
                          ? 'bg-error/10 text-error'
                          : 'bg-success/10 text-success'
                      }`}>
                        {closingSoon ? 'Closing Soon' : 'Open'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-on-surface-variant/70 mb-3">
                      {s.amount && (
                        <span className="flex items-center gap-1">
                          <span className="font-medium">{s.amount}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {s.deadline ? `Closes ${formatDeadline(s.deadline)}` : 'Deadline: Check website'}
                      </span>
                      {s.countries && s.countries.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5" />
                          {truncateCountries(s.countries)}
                        </span>
                      )}
                      {s.degree_levels && s.degree_levels.length > 0 && (
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5" />
                          {s.degree_levels.join(', ')}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {s.no_ielts && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">No IELTS</span>}
                      {s.targets_financial_need && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Financial Need</span>}
                      {s.is_intra_african && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Intra-African</span>}
                    </div>

                    <Link
                      to={`/scholarships/browse/${s.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                    >
                      View Details <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {data.total > limit && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-surface border border-outline-variant/40 hover:bg-surface-container transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-xs text-on-surface-variant/60">
                  Page {page} of {Math.ceil(data.total / limit)}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!data.hasMore}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-surface border border-outline-variant/40 hover:bg-surface-container transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-sm text-on-surface-variant/50">No open scholarships found. Check back soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
