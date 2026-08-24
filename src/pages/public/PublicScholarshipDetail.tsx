import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { SEO } from '../../components/SEO';
import { ScholarshipSchema } from '../../components/ScholarshipSchema';
import {
  Clock,
  MapPin,
  Building2,
  BookOpen,
  ArrowLeft,
  Eye,
  CheckCircle2,
  Calendar,
  Hourglass,
  Sparkles,
  School,
  Share2,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import ShareButton from '../../components/ShareButton';
import { flagFor } from '../../lib/flags';

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
  iso2?: string | string[];
  targets_rural_origin: boolean;
  targets_ldc_countries: boolean;
  stem_focus: boolean;
  development_focus: boolean;
  min_gpa_normalised: number;
  requires_leadership: boolean;
  requires_community: boolean;
  apply_url?: string;
  source_url?: string;
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

  const openAuth = (action?: string) => {
    window.dispatchEvent(new CustomEvent('open-auth', { detail: { action: action || 'signup' } }));
  };

  useEffect(() => {
    if (!slug) return;
    let isCancelled = false;
    setLoading(true);
    setNotFound(false);

    const fetchDetail = async () => {
      // 1. Direct Supabase query as primary source
      try {
        const { supabase } = await import('../../lib/supabase');
        // Try slug first
        let res = await supabase
          .from('scholarships')
          .select(`
            id,slug,name,provider,countries,degree_levels,funding_type,amount,deadline,
            urgency,description,no_ielts,targets_financial_need,targets_first_generation,
            is_intra_african,updated_at,fields_of_study,instruction_language,host_institution,
            host_country,host_region,iso2,targets_rural_origin,targets_ldc_countries,stem_focus,
            development_focus,min_gpa_normalised,requires_leadership,requires_community,
            apply_url,source_url,published
          `)
          .eq('slug', slug)
          .maybeSingle();

        // If not found by slug, try matching id
        if (!res.data) {
          res = await supabase
            .from('scholarships')
            .select(`
              id,slug,name,provider,countries,degree_levels,funding_type,amount,deadline,
              urgency,description,no_ielts,targets_financial_need,targets_first_generation,
              is_intra_african,updated_at,fields_of_study,instruction_language,host_institution,
              host_country,host_region,iso2,targets_rural_origin,targets_ldc_countries,stem_focus,
              development_focus,min_gpa_normalised,requires_leadership,requires_community,
              apply_url,source_url,published
            `)
            .eq('id', slug)
            .maybeSingle();
        }

        // If still not found, try case-insensitive slug
        if (!res.data) {
          res = await supabase
            .from('scholarships')
            .select(`
              id,slug,name,provider,countries,degree_levels,funding_type,amount,deadline,
              urgency,description,no_ielts,targets_financial_need,targets_first_generation,
              is_intra_african,updated_at,fields_of_study,instruction_language,host_institution,
              host_country,host_region,iso2,targets_rural_origin,targets_ldc_countries,stem_focus,
              development_focus,min_gpa_normalised,requires_leadership,requires_community,
              apply_url,source_url,published
            `)
            .ilike('slug', slug)
            .maybeSingle();
        }

        if (!isCancelled && res.data) {
          setScholarship(res.data as unknown as ScholarshipDetail);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Direct supabase fetch failed, trying API fallback', err);
      }

      // 2. Fallback to API route
      try {
        const r = await fetch(`/api/scholarships-public-detail?slug=${encodeURIComponent(slug)}`);
        if (r.ok) {
          const contentType = r.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await r.json();
            if (!isCancelled && data && (data.id || data.name)) {
              setScholarship(data);
              setLoading(false);
              return;
            }
          }
        }
      } catch {}

      if (!isCancelled) {
        setNotFound(true);
        setLoading(false);
      }
    };

    fetchDetail();

    return () => {
      isCancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-pure-white text-off-black-ink flex flex-col justify-between">
        <div className="flex-grow flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-electric-lime border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (notFound || !scholarship) {
    return (
      <div className="min-h-[100dvh] bg-parchment text-off-black-ink flex flex-col justify-between">
        <div className="flex-grow flex items-center justify-center px-4 py-20">
          <div className="text-center max-w-md bg-pure-white border border-ash rounded-ed p-8 md:p-10">
            <h1 className="text-2xl font-medium text-off-black-ink tracking-tight mb-3">Scholarship Not Available</h1>
            <p className="text-sm font-normal text-graphite mb-6 leading-relaxed">
              This scholarship could not be found or may no longer be accepting applications.
            </p>
            <Link
              to="/scholarships/browse"
              className="inline-flex items-center justify-center gap-1.5 px-6 min-h-[44px] rounded-full font-medium text-sm bg-electric-lime text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Browse Open Scholarships
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const isClosed = Boolean(scholarship.deadline && scholarship.deadline < today);
  const closingSoon = !isClosed && isClosingSoon(scholarship.deadline, scholarship.urgency);
  const cleanDesc = stripHtml(scholarship.description || '');
  const seoDesc = cleanDesc
    ? `${cleanDesc.slice(0, 155).trim()}... Deadline: ${formatDeadline(scholarship.deadline)}. Open to students from ${scholarship.countries?.join(', ') || 'multiple African countries'}.`
    : `Apply for ${scholarship.name}. Deadline: ${formatDeadline(scholarship.deadline)}.`;

  const ogName = (scholarship.name || '').slice(0, 60);
  const ogProvider = (scholarship.provider || '').slice(0, 50);
  const ogCountries = (scholarship.countries || []).slice(0, 3).join(', ').slice(0, 80);
  const ogDegrees = (scholarship.degree_levels || []).slice(0, 2).join(', ').slice(0, 40);
  const ogDeadline = formatDeadline(scholarship.deadline).slice(0, 40);
  const ogUpdated = scholarship.updated_at ? `&_=${scholarship.updated_at.slice(0, 10)}` : '';

  const ogImageUrl = `https://techsari.online/api/og-scholarship?name=${encodeURIComponent(ogName)}&provider=${encodeURIComponent(ogProvider)}&funding_type=${encodeURIComponent(scholarship.funding_type || '')}&deadline=${encodeURIComponent(ogDeadline)}&countries=${encodeURIComponent(ogCountries)}&degree_levels=${encodeURIComponent(ogDegrees)}&no_ielts=${scholarship.no_ielts ? 'true' : ''}${ogUpdated}`;

  const categoryEyebrow = scholarship.fields_of_study?.[0]
    || (scholarship.stem_focus ? 'Engineering & Technology' : '')
    || scholarship.provider
    || 'Global Scholarship Opportunity';

  return (
    <div className="min-h-[100dvh] bg-surface-container-lowest text-on-surface font-body antialiased flex flex-col justify-between">
      <SEO
        title={`${scholarship.name} | Techsari Zawadi`}
        description={seoDesc}
        path={`/scholarships/browse/${scholarship.slug || scholarship.id}`}
        image={ogImageUrl}
      />
      <ScholarshipSchema scholarship={scholarship} />

      <main className="max-w-[1200px] mx-auto px-4 md:px-10 py-12 flex flex-col gap-10">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4">
          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex items-center gap-2 text-ed-body-sm text-graphite whitespace-nowrap overflow-x-auto">
              <li><Link to="/" className="hover:text-off-black-ink transition-colors">Home</Link></li>
              <li aria-hidden>/</li>
              <li><Link to="/scholarships/browse" className="hover:text-off-black-ink transition-colors">Scholarships</Link></li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-off-black-ink font-medium truncate max-w-[320px] sm:max-w-[480px]">{scholarship.name}</li>
            </ol>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <ShareButton
              url={`/scholarships/browse/${scholarship.slug}`}
              title={scholarship.name}
              iconOnly
              size="md"
            />
          </div>
        </div>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://techsari.online/' },
              { '@type': 'ListItem', position: 2, name: 'Scholarships', item: 'https://techsari.online/scholarships/browse' },
              { '@type': 'ListItem', position: 3, name: scholarship.name, item: `https://techsari.online/scholarships/browse/${scholarship.slug || scholarship.id}` },
            ],
          })}
        </script>

        {/* Logged-in Banner */}
        {user && (
          <div className="p-4 rounded-lg bg-electric-lime/20 border border-off-black-ink/20 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-ed-body-sm font-medium text-off-black-ink flex items-center gap-2">
              <Eye className="w-4 h-4" aria-hidden />
              You are signed in — track this application in your workspace.
            </p>
            <Link to="/scholarships" className="text-ed-body-sm font-medium text-off-black-ink border-b border-off-black-ink pb-0.5 hover:text-graphite hover:border-graphite transition-colors">
              Open workspace &rarr;
            </Link>
          </div>
        )}

        {/* Hero Section */}
        <div className="bg-parchment rounded-card p-8 md:p-12 flex flex-col gap-6 border border-ash shadow-sm">
          <div className="flex flex-col gap-2">
            <span className="font-eyebrow text-eyebrow uppercase tracking-wider text-graphite">
              {categoryEyebrow}
            </span>
            <h1 className="font-heading-lg-mobile md:font-heading-lg text-heading-lg-mobile md:text-heading-lg text-deep-charcoal max-w-4xl tracking-tight">
              {scholarship.name}
            </h1>
            {scholarship.provider && (
              <p className="font-body text-base text-secondary font-medium">
                Offered by {scholarship.provider}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full border border-ash bg-pure-white font-caption text-caption text-secondary">
              <span aria-hidden className="mr-1.5 text-base leading-none">{flagFor(scholarship)}</span>
              {scholarship.countries?.length
                ? (scholarship.countries.length <= 3 ? scholarship.countries.join(', ') : `${scholarship.countries.slice(0, 3).join(', ')} +${scholarship.countries.length - 3}`)
                : 'All African countries'}
            </span>
            {(scholarship.host_institution || scholarship.host_country?.length) && (
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-full border border-ash bg-pure-white font-caption text-caption text-secondary">
                <MapPin className="mr-1.5 w-3.5 h-3.5 text-primary" />
                {[scholarship.host_institution, scholarship.host_country?.join(', ')].filter(Boolean).join(' · ')}
              </span>
            )}
            {scholarship.degree_levels && scholarship.degree_levels.length > 0 && (
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-full border border-ash bg-pure-white font-caption text-caption text-secondary">
                <School className="mr-1.5 w-3.5 h-3.5 text-primary" />
                {scholarship.degree_levels.join(', ')}
              </span>
            )}
            {scholarship.no_ielts && (
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-full border border-primary-container bg-primary-container/40 font-caption text-caption text-on-surface font-semibold">
                No IELTS Required
              </span>
            )}
            {isClosed ? (
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-surface-container-high text-secondary border border-ash font-caption text-caption font-bold">
                Applications Closed
              </span>
            ) : closingSoon ? (
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-error text-on-error font-caption text-caption font-bold">
                Closing Soon
              </span>
            ) : null}
          </div>
        </div>

        {/* Content Split: Left (Details) + Right (Sidebar) */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-12 items-start">
          
          {/* Left Column: Details */}
          <div className="flex-1 flex flex-col gap-10 w-full">
            
            {/* About the Scholarship */}
            <section className="flex flex-col gap-3">
              <h2 className="font-headline text-2xl font-medium text-deep-charcoal">About the Opportunity</h2>
              <p className="font-body text-base text-secondary leading-relaxed whitespace-pre-line">
                {cleanDesc || 'This scholarship opportunity provides academic and financial support to deserving students across Africa. Review the eligibility requirements below and prepare your application materials.'}
              </p>
            </section>

            <div className="w-full h-px bg-ash"></div>

            {/* Eligibility Criteria */}
            <section className="flex flex-col gap-4">
              <h2 className="font-headline text-2xl font-medium text-deep-charcoal">Eligibility Criteria</h2>
              <ul className="flex flex-col gap-3.5">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="font-body text-base text-secondary">
                    Open to citizens from: <strong className="text-on-surface">{scholarship.countries?.join(', ') || 'All African Countries'}</strong>.
                  </span>
                </li>
                {scholarship.degree_levels && (
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="font-body text-base text-secondary">
                      Degree Level: <strong className="text-on-surface">{scholarship.degree_levels.join(', ')}</strong>.
                    </span>
                  </li>
                )}
                {scholarship.min_gpa_normalised != null && (
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="font-body text-base text-secondary">
                      Minimum normalized academic average: <strong className="text-on-surface">{(scholarship.min_gpa_normalised * 100).toFixed(0)}%</strong> or equivalent.
                    </span>
                  </li>
                )}
                {scholarship.fields_of_study && scholarship.fields_of_study.length > 0 && (
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="font-body text-base text-secondary">
                      Eligible Fields: <strong className="text-on-surface">{scholarship.fields_of_study.join(', ')}</strong>.
                    </span>
                  </li>
                )}
                {scholarship.requires_leadership && (
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="font-body text-base text-secondary">
                      Demonstrated leadership potential and extracurricular involvement.
                    </span>
                  </li>
                )}
                {scholarship.targets_financial_need && (
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="font-body text-base text-secondary">
                      Priority given to candidates demonstrating financial need.
                    </span>
                  </li>
                )}
              </ul>
            </section>

            <div className="w-full h-px bg-ash"></div>

            {/* Application Steps */}
            <section className="flex flex-col gap-4">
              <h2 className="font-headline text-2xl font-medium text-deep-charcoal">Application Steps</h2>
              <div className="flex flex-col gap-4">
                <div className="flex gap-4 p-5 rounded-xl border border-ash bg-surface-container-lowest">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-subheading text-base font-bold text-deep-charcoal">
                    1
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-headline text-lg font-medium text-deep-charcoal">Prepare Academic Records & CV</h3>
                    <p className="font-body-sm text-sm text-secondary mt-1">
                      Upload your latest transcripts and standard CV to your Document Vault for automated parsing.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 rounded-xl border border-ash bg-surface-container-lowest">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-subheading text-base font-bold text-deep-charcoal">
                    2
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-headline text-lg font-medium text-deep-charcoal">Draft Statement of Purpose</h3>
                    <p className="font-body-sm text-sm text-secondary mt-1">
                      Use the AI Essay Studio to craft a compelling personal statement tailored to this scholarship's values.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 rounded-xl border border-ash bg-surface-container-lowest">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-subheading text-base font-bold text-deep-charcoal">
                    3
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-headline text-lg font-medium text-deep-charcoal">Submit Official Application</h3>
                    <p className="font-body-sm text-sm text-secondary mt-1">
                      Submit all required documents directly via the provider portal before the deadline.
                    </p>
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* Right Column: Sticky Sidebar */}
          <aside className="w-full lg:w-[380px] flex-shrink-0">
            <div className="bg-pure-white border border-ash rounded-card p-6 md:p-8 flex flex-col gap-6 sticky top-[100px] shadow-sm">
              
              <div className="flex flex-col gap-1 pb-4 border-b border-ash">
                <span className="font-eyebrow text-eyebrow text-graphite uppercase tracking-wider">Funding Amount</span>
                <div className="font-headline text-3xl font-bold text-deep-charcoal">
                  {scholarship.amount || (scholarship.funding_type === 'Full' ? 'Full Tuition & Stipend' : 'Partial Tuition Grant')}
                </div>
                <span className="font-body-sm text-xs text-secondary mt-0.5">
                  {scholarship.funding_type === 'Full' ? 'Covers full tuition, living stipend, and travel allowances' : 'Grant towards study expenses'}
                </span>
              </div>

              <div className="flex flex-col gap-3 py-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-body text-secondary flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" /> Deadline
                  </span>
                  <span className="font-headline font-semibold text-deep-charcoal">
                    {formatDeadline(scholarship.deadline)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-body text-secondary flex items-center gap-2">
                    <Hourglass className="w-4 h-4 text-primary" /> Type
                  </span>
                  <span className="font-headline font-semibold text-deep-charcoal">
                    {scholarship.funding_type || 'Academic Grant'}
                  </span>
                </div>
              </div>

              {isClosed ? (
                <div className="flex flex-col gap-3">
                  <div className="p-4 rounded-xl bg-surface-container-low border border-ash text-center">
                    <p className="text-sm font-medium text-deep-charcoal">Applications for this cycle are closed.</p>
                    <p className="text-xs text-secondary mt-1">Explore active scholarships currently accepting applications.</p>
                  </div>
                  <button
                    onClick={() => navigate('/scholarships/browse')}
                    className="w-full py-4 rounded-button bg-electric-lime text-off-black-ink font-subheading text-[17px] font-medium hover:bg-lime-hover active:scale-[0.98] transition-all shadow-sm cursor-pointer"
                  >
                    Browse Open Scholarships
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {user ? (
                    <button
                      onClick={() => navigate('/scholarships')}
                      className="w-full py-4 rounded-button bg-electric-lime text-off-black-ink font-subheading text-[17px] font-medium hover:bg-lime-hover active:scale-[0.98] transition-all shadow-sm cursor-pointer"
                    >
                      Track in My Workspace
                    </button>
                  ) : (
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('open-auth', { detail: { action: 'signup' } }))}
                      className="w-full py-4 rounded-button bg-electric-lime text-off-black-ink font-subheading text-[17px] font-medium hover:bg-lime-hover active:scale-[0.98] transition-all shadow-sm cursor-pointer"
                    >
                      Apply & Get Matched
                    </button>
                  )}
                  {(scholarship.apply_url || scholarship.source_url) && (
                    <a
                      href={scholarship.apply_url || scholarship.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 rounded-button border border-off-black-ink bg-transparent font-body-sm text-sm font-medium text-deep-charcoal hover:bg-surface-container-low transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      Visit Official Portal <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}

              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Scholarship link copied to clipboard!');
                }}
                className="w-full py-3 rounded-button border border-ash bg-transparent font-body-sm text-sm font-medium text-deep-charcoal hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                Share / Save Link
              </button>

            </div>
          </aside>

        </div>

      </main>
    </div>
  );
}

