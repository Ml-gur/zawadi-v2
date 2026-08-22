import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { SEO } from '../../components/SEO';
import { ScholarshipSchema } from '../../components/ScholarshipSchema';
import { GhostPillButton } from '../../components/ui';
import { Clock, Globe, GraduationCap, MapPin, Building2, BookOpen, Languages, ArrowLeft, Eye, Share2 } from 'lucide-react';
import ShareButton from '../../components/ShareButton';

interface ScholarshipDetail {
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
  fields_of_study: string[];
  instruction_language: string;
  host_institution: string;
  host_country: string[];
  host_region: string;
  targets_rural_origin: boolean;
  targets_ldc_countries: boolean;
  stem_focus: boolean;
  development_focus: boolean;
  min_gpa_normalised: number;
  requires_leadership: boolean;
  requires_community: boolean;
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

function stripHtml(text: string): string {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '').trim();
}

interface PublicScholarshipDetailProps {
  user?: any;
}

export default function PublicScholarshipDetail({ user }: PublicScholarshipDetailProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [scholarship, setScholarship] = useState<ScholarshipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/scholarships-public-detail?slug=${encodeURIComponent(slug)}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then(d => {
        if (d) setScholarship(d);
        setLoading(false);
      })
      .catch(() => { setLoading(false); setNotFound(true); });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-accent-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !scholarship) {
    return (
      <div className="min-h-screen bg-canvas text-cream flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-semibold text-cream tracking-tight mb-3">Scholarship Not Available</h1>
          <p className="text-sm text-muted mb-6">
            This scholarship may be closed or no longer accepting applications.
          </p>
          <Link
            to="/scholarships/browse"
            className="btn-gradient-stroke inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full font-semibold text-sm text-cream transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" /> Browse Open Scholarships
          </Link>
        </div>
      </div>
    );
  }

  const closingSoon = isClosingSoon(scholarship.deadline, scholarship.urgency);
  const cleanDesc = stripHtml(scholarship.description || '');
  const seoDesc = cleanDesc
    ? `${cleanDesc.slice(0, 155).trim()}... Deadline: ${formatDeadline(scholarship.deadline)}. Open to students from ${scholarship.countries?.join(', ') || 'multiple countries'}.`
    : `Apply for ${scholarship.name}. Deadline: ${formatDeadline(scholarship.deadline)}.`;

  // Build dynamic OG image URL (truncate long values to keep URL safe)
  const ogName = (scholarship.name || '').slice(0, 60);
  const ogProvider = (scholarship.provider || '').slice(0, 50);
  const ogCountries = (scholarship.countries || []).slice(0, 3).join(', ').slice(0, 80);
  const ogDegrees = (scholarship.degree_levels || []).slice(0, 2).join(', ').slice(0, 40);
  const ogDeadline = formatDeadline(scholarship.deadline).slice(0, 40);
  const ogUpdated = scholarship.updated_at ? `&_=${scholarship.updated_at.slice(0, 10)}` : '';

  const ogImageUrl = `https://techsari.online/api/og-scholarship?name=${encodeURIComponent(ogName)}&provider=${encodeURIComponent(ogProvider)}&funding_type=${encodeURIComponent(scholarship.funding_type || '')}&deadline=${encodeURIComponent(ogDeadline)}&countries=${encodeURIComponent(ogCountries)}&degree_levels=${encodeURIComponent(ogDegrees)}&no_ielts=${scholarship.no_ielts ? 'true' : ''}${ogUpdated}`;

  return (
    <div className="min-h-screen bg-canvas text-cream">
      <SEO
        title={`${scholarship.name} | Zawadi`}
        description={seoDesc}
        path={`/scholarships/browse/${scholarship.slug}`}
        image={ogImageUrl}
      />
      <ScholarshipSchema scholarship={scholarship} />

      <div className="max-w-[800px] mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <Link to="/scholarships/browse" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-cream mb-6 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to scholarships
        </Link>

        {/* Logged-in Banner */}
        {user && (
          <div className="mb-6 p-4 rounded-lg bg-status-success/10 border border-status-success/20">
            <p className="text-sm font-medium text-status-success flex items-center gap-2">
              <Eye className="w-4 h-4" />
              You are logged in!{' '}
              <Link to="/scholarships" className="underline font-bold">
                View the full scholarship in your dashboard &rarr;
              </Link>
            </p>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start gap-3 mb-2">
            <h1 className="text-2xl font-semibold text-cream tracking-tight">{scholarship.name}</h1>
            {closingSoon && (
              <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-status-urgent/10 text-status-urgent">Closing Soon</span>
            )}
            <div className="ml-auto shrink-0">
              <ShareButton
                url={`/scholarships/browse/${scholarship.slug}`}
                title={scholarship.name}
                iconOnly
                size="md"
              />
            </div>
          </div>
          {scholarship.provider && (
            <p className="text-sm text-muted">{scholarship.provider}</p>
          )}
        </div>

        {/* Key Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          {scholarship.amount && (
            <div className="p-3 rounded-lg bg-off-black border border-hairline/40">
              <p className="text-[11px] font-bold text-muted uppercase mb-0.5">Funding</p>
              <p className="text-sm font-semibold text-cream">{scholarship.amount}</p>
            </div>
          )}
          <div className="p-3 rounded-lg bg-off-black border border-hairline/40">
            <p className="text-[11px] font-bold text-muted uppercase mb-0.5">Deadline</p>
            <p className="text-sm font-semibold text-cream flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {formatDeadline(scholarship.deadline)}
            </p>
          </div>
          {scholarship.degree_levels && scholarship.degree_levels.length > 0 && (
            <div className="p-3 rounded-lg bg-off-black border border-hairline/40">
              <p className="text-[11px] font-bold text-muted uppercase mb-0.5">Level</p>
              <p className="text-sm font-semibold text-cream flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" /> {scholarship.degree_levels.join(', ')}
              </p>
            </div>
          )}
          {scholarship.host_institution && (
            <div className="p-3 rounded-lg bg-off-black border border-hairline/40">
              <p className="text-[11px] font-bold text-muted uppercase mb-0.5">Host</p>
              <p className="text-sm font-semibold text-cream flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> {scholarship.host_institution}
              </p>
            </div>
          )}
          {scholarship.host_region && (
            <div className="p-3 rounded-lg bg-off-black border border-hairline/40">
              <p className="text-[11px] font-bold text-muted uppercase mb-0.5">Region</p>
              <p className="text-sm font-semibold text-cream flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {scholarship.host_region}
              </p>
            </div>
          )}
          {scholarship.instruction_language && (
            <div className="p-3 rounded-lg bg-off-black border border-hairline/40">
              <p className="text-[11px] font-bold text-muted uppercase mb-0.5">Language</p>
              <p className="text-sm font-semibold text-cream flex items-center gap-1">
                <Languages className="w-3.5 h-3.5" /> {scholarship.instruction_language}
              </p>
            </div>
          )}
        </div>

        {/* Countries */}
        {scholarship.countries && scholarship.countries.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-bold text-muted uppercase mb-2">Eligible Countries</h2>
            <div className="flex flex-wrap gap-1.5">
              {scholarship.countries.map(c => (
                <span key={c} className="text-xs px-2.5 py-1 rounded-full bg-off-black border border-hairline/60 text-cream">{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {scholarship.no_ielts && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-accent-orange/10 text-accent-orange border border-accent-orange/25">No IELTS Accepted</span>}
          {scholarship.targets_financial_need && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/25">Financial Need Based</span>}
          {scholarship.targets_first_generation && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-accent-lilac/10 text-accent-lilac border border-accent-lilac/25">First Generation</span>}
          {scholarship.is_intra_african && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-accent-green/10 text-accent-green border border-accent-green/25">Intra-African</span>}
          {scholarship.stem_focus && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-accent-light-green/10 text-accent-light-green border border-accent-light-green/25">STEM Focus</span>}
          {scholarship.development_focus && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-accent-pink/10 text-accent-pink border border-accent-pink/25">Development Focus</span>}
          {scholarship.requires_leadership && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-accent-orange/10 text-accent-orange border border-accent-orange/25">Leadership Required</span>}
          {scholarship.requires_community && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-accent-pink/10 text-accent-pink border border-accent-pink/25">Community Service</span>}
        </div>

        {/* Description */}
        {cleanDesc && (
          <div className="mb-8">
            <h2 className="text-xs font-bold text-muted uppercase mb-2">About This Scholarship</h2>
            <p className="text-sm text-muted leading-relaxed">{cleanDesc}</p>
          </div>
        )}

        {/* Key Facts */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-muted uppercase mb-2">Key Facts</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {scholarship.min_gpa_normalised != null && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-off-black">
                <span className="text-muted">Min GPA:</span>
                <span className="font-semibold text-cream">{(scholarship.min_gpa_normalised * 100).toFixed(0)}%</span>
              </div>
            )}
            {scholarship.requires_leadership && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-off-black">
                <span className="text-muted">Leadership:</span>
                <span className="font-semibold text-cream">Required</span>
              </div>
            )}
            {scholarship.requires_community && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-off-black">
                <span className="text-muted">Community:</span>
                <span className="font-semibold text-cream">Required</span>
              </div>
            )}
            {scholarship.fields_of_study && scholarship.fields_of_study.length > 0 && (
              <div className="col-span-2 flex items-center gap-2 p-2 rounded-lg bg-off-black">
                <BookOpen className="w-3.5 h-3.5 text-muted" />
                <span className="text-muted">Fields:</span>
                <span className="font-semibold text-cream">{scholarship.fields_of_study.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Locked Section */}
        <div className="relative rounded-lg border border-hairline/40 overflow-hidden mb-8">
          <div className="p-6 backdrop-blur-sm">
            <h3 className="text-base font-semibold text-cream tracking-tight mb-3">Full Details & Application Link</h3>
            <div className="space-y-3 blur-sm select-none">
              <div className="h-4 bg-hairline/30 rounded w-3/4" />
              <div className="h-4 bg-hairline/30 rounded w-1/2" />
              <div className="h-4 bg-hairline/30 rounded w-5/6" />
              <div className="h-10 bg-accent-green/10 rounded-lg w-full mt-4" />
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-canvas/80 px-4 text-center">
            <p className="text-sm font-semibold text-cream mb-1 max-w-md">Sign in to view full eligibility requirements and the direct application link</p>
            <div className="flex items-center gap-3 mt-3">
              <GhostPillButton variant="gradient" size="sm" onClick={() => navigate('/')}>
                Create Free Account
              </GhostPillButton>
              <button
                onClick={() => navigate('/')}
                className="px-5 py-2.5 min-h-[44px] bg-transparent text-cream font-semibold rounded-full border border-cream/60 hover:border-cream hover:bg-cream/[0.04] transition-colors cursor-pointer text-sm"
              >
                Log In
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
