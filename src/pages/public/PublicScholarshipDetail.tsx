import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { SEO } from '../../components/SEO';
import { ScholarshipSchema } from '../../components/ScholarshipSchema';
import { Clock, Globe, GraduationCap, MapPin, Building2, BookOpen, Languages, ArrowLeft, Eye } from 'lucide-react';

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !scholarship) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold text-primary mb-3">Scholarship Not Available</h1>
          <p className="text-sm text-on-surface-variant/70 mb-6">
            This scholarship may be closed or no longer accepting applications.
          </p>
          <Link to="/scholarships/browse" className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary-container transition-colors text-sm">
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
    <div className="min-h-screen bg-background">
      <SEO
        title={`${scholarship.name} | Zawadi`}
        description={seoDesc}
        path={`/scholarships/browse/${scholarship.slug}`}
        image={ogImageUrl}
      />
      <ScholarshipSchema scholarship={scholarship} />

      <div className="max-w-[800px] mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <Link to="/scholarships/browse" className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant/50 hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to scholarships
        </Link>

        {/* Logged-in Banner */}
        {user && (
          <div className="mb-6 p-4 rounded-2xl bg-success/10 border border-success/20">
            <p className="text-sm font-medium text-success flex items-center gap-2">
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
            <h1 className="text-2xl font-black text-primary">{scholarship.name}</h1>
            {closingSoon && (
              <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-error/10 text-error">Closing Soon</span>
            )}
          </div>
          {scholarship.provider && (
            <p className="text-sm text-on-surface-variant/60">{scholarship.provider}</p>
          )}
        </div>

        {/* Key Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          {scholarship.amount && (
            <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/40">
              <p className="text-[11px] font-bold text-on-surface-variant/50 uppercase mb-0.5">Funding</p>
              <p className="text-sm font-bold text-primary">{scholarship.amount}</p>
            </div>
          )}
          <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/40">
            <p className="text-[11px] font-bold text-on-surface-variant/50 uppercase mb-0.5">Deadline</p>
            <p className="text-sm font-bold text-primary flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {formatDeadline(scholarship.deadline)}
            </p>
          </div>
          {scholarship.degree_levels && scholarship.degree_levels.length > 0 && (
            <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/40">
              <p className="text-[11px] font-bold text-on-surface-variant/50 uppercase mb-0.5">Level</p>
              <p className="text-sm font-bold text-primary flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" /> {scholarship.degree_levels.join(', ')}
              </p>
            </div>
          )}
          {scholarship.host_institution && (
            <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/40">
              <p className="text-[11px] font-bold text-on-surface-variant/50 uppercase mb-0.5">Host</p>
              <p className="text-sm font-bold text-primary flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> {scholarship.host_institution}
              </p>
            </div>
          )}
          {scholarship.host_region && (
            <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/40">
              <p className="text-[11px] font-bold text-on-surface-variant/50 uppercase mb-0.5">Region</p>
              <p className="text-sm font-bold text-primary flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {scholarship.host_region}
              </p>
            </div>
          )}
          {scholarship.instruction_language && (
            <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/40">
              <p className="text-[11px] font-bold text-on-surface-variant/50 uppercase mb-0.5">Language</p>
              <p className="text-sm font-bold text-primary flex items-center gap-1">
                <Languages className="w-3.5 h-3.5" /> {scholarship.instruction_language}
              </p>
            </div>
          )}
        </div>

        {/* Countries */}
        {scholarship.countries && scholarship.countries.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-bold text-on-surface-variant/50 uppercase mb-2">Eligible Countries</h2>
            <div className="flex flex-wrap gap-1.5">
              {scholarship.countries.map(c => (
                <span key={c} className="text-xs px-2.5 py-1 rounded-full bg-surface-container-lowest border border-outline-variant/40">{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {scholarship.no_ielts && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">No IELTS Accepted</span>}
          {scholarship.targets_financial_need && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Financial Need Based</span>}
          {scholarship.targets_first_generation && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">First Generation</span>}
          {scholarship.is_intra_african && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">Intra-African</span>}
          {scholarship.stem_focus && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">STEM Focus</span>}
          {scholarship.development_focus && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">Development Focus</span>}
          {scholarship.requires_leadership && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">Leadership Required</span>}
          {scholarship.requires_community && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200">Community Service</span>}
        </div>

        {/* Description */}
        {cleanDesc && (
          <div className="mb-8">
            <h2 className="text-xs font-bold text-on-surface-variant/50 uppercase mb-2">About This Scholarship</h2>
            <p className="text-sm text-on-surface-variant/80 leading-relaxed">{cleanDesc}</p>
          </div>
        )}

        {/* Key Facts */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-on-surface-variant/50 uppercase mb-2">Key Facts</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {scholarship.min_gpa_normalised != null && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-lowest">
                <span className="text-on-surface-variant/50">Min GPA:</span>
                <span className="font-bold text-primary">{(scholarship.min_gpa_normalised * 100).toFixed(0)}%</span>
              </div>
            )}
            {scholarship.requires_leadership && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-lowest">
                <span className="text-on-surface-variant/50">Leadership:</span>
                <span className="font-bold text-primary">Required</span>
              </div>
            )}
            {scholarship.requires_community && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-lowest">
                <span className="text-on-surface-variant/50">Community:</span>
                <span className="font-bold text-primary">Required</span>
              </div>
            )}
            {scholarship.fields_of_study && scholarship.fields_of_study.length > 0 && (
              <div className="col-span-2 flex items-center gap-2 p-2 rounded-lg bg-surface-container-lowest">
                <BookOpen className="w-3.5 h-3.5 text-on-surface-variant/50" />
                <span className="text-on-surface-variant/50">Fields:</span>
                <span className="font-bold text-primary">{scholarship.fields_of_study.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Locked Section */}
        <div className="relative rounded-2xl border border-outline-variant/40 overflow-hidden mb-8">
          <div className="p-6 backdrop-blur-sm">
            <h3 className="text-base font-bold text-primary mb-3">Full Details & Application Link</h3>
            <div className="space-y-3 blur-sm select-none">
              <div className="h-4 bg-outline-variant/30 rounded w-3/4" />
              <div className="h-4 bg-outline-variant/30 rounded w-1/2" />
              <div className="h-4 bg-outline-variant/30 rounded w-5/6" />
              <div className="h-10 bg-primary/10 rounded-xl w-full mt-4" />
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60">
            <p className="text-sm font-bold text-primary mb-1">Sign in to view full eligibility requirements and the direct application link</p>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => navigate('/')}
                className="px-5 py-2.5 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary-container transition-colors cursor-pointer text-sm"
              >
                Create Free Account
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-5 py-2.5 bg-transparent text-primary font-bold rounded-xl hover:bg-primary/5 transition-colors cursor-pointer text-sm"
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
