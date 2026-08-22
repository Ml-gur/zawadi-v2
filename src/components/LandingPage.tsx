import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowForward } from './Icons';
import { SEO } from './SEO';
import { supabase } from '../lib/supabase';
import type { Scholarship } from '../types';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  countries: string[];
  onViewAllFAQs?: () => void;
}

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Zawadi",
  "url": "https://techsari.online",
  "description": "Scholarship matching platform for African students using strict eligibility filtering across all 54 African countries",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Zawadi",
  "url": "https://techsari.online",
  "description": "AI-powered scholarship matching built exclusively for African students."
};

/* ── Inline stroked icons (1.5px, cream) ── */

const ShieldCheckIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const LightningIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

const MapPinIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

const DatabaseCheckIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l1.5 1.5L14.25 10.5" />
  </svg>
);

const SearchIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const ClipboardCheckIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12" />
  </svg>
);

const SparklesAIIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
  </svg>
);

const LockIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const GlobeIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
  </svg>
);

const BadgeCheckIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
  </svg>
);

const StarIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const QuoteMark = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <span className={`font-display font-semibold leading-none select-none ${className}`}>{'"'}</span>
);

function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, isVisible };
}

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ── Shared card shells ── */

const panelBase = 'bg-off-black border border-hairline/70 rounded-lg';

const Chip: React.FC<{ children: React.ReactNode; tone?: 'cream' | 'orange' | 'pink' | 'green' | 'blue' | 'lilac' }> = ({ children, tone = 'cream' }) => {
  const tones = {
    cream: 'border-hairline text-muted',
    orange: 'border-accent-orange/40 text-accent-orange',
    pink: 'border-accent-pink/40 text-accent-pink',
    green: 'border-accent-green/40 text-accent-green',
    blue: 'border-accent-blue/40 text-accent-blue',
    lilac: 'border-accent-lilac/40 text-accent-lilac',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full border text-[10px] md:text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export default function LandingPage({ onGetStarted, onLogin, countries, onViewAllFAQs }: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [featuredScholarships, setFeaturedScholarships] = useState<Scholarship[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('scholarships')
      .select('id, name, provider, host_region, host_institution, funding_type, deadline, no_ielts, degree_levels, countries, fields_of_study, urgency, iso2, published, description, eligibility, amount, required_documents, apply_url, source_url, slug, created_at')
      .eq('published', true)
      .order('id', { ascending: false })
      .limit(3)
      .then(({ data, error }) => {
        if (!cancelled && !error && data) {
          setFeaturedScholarships(data as unknown as Scholarship[]);
        }
        if (!cancelled) setFeaturedLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-canvas text-cream min-h-[100dvh]">
      <SEO
        title="Zawadi — Scholarship Matching for African Students"
        description="Find scholarships you are eligible to win across all 54 African countries. Strict eligibility filtering removes scholarships you do not qualify for. No IELTS required options included."
        keywords="scholarships for African students, Africa scholarship matching, no IELTS scholarships Africa, fully funded scholarships Africa, scholarship application Africa"
        path="/"
        image="https://techsari.online/og-home.png"
        ogTitle="Zawadi — Find Scholarships You Actually Qualify For"
        ogDescription="Strict eligibility matching for African students. See only scholarships where you meet every requirement. No spam. No data selling. No IELTS barrier."
        schema={[websiteSchema, organizationSchema]}
      />

      {/* ═══ Hero ═══ */}
      <section className="relative min-h-[100dvh] flex items-center overflow-hidden bg-grid-pattern px-4 sm:px-6 pt-24 pb-16">
        {/* Decorative gradient shapes — overlap the type, lit from within */}
        <div aria-hidden className="absolute top-[8%] right-[-12%] w-[420px] h-[420px] md:w-[640px] md:h-[640px] rounded-full pointer-events-none bg-[radial-gradient(circle_at_35%_35%,rgba(254,197,251,0.16)_0%,rgba(0,186,226,0.07)_45%,transparent_70%)]" />
        <div aria-hidden className="absolute bottom-[-18%] left-[-14%] w-[380px] h-[380px] md:w-[560px] md:h-[560px] rounded-full pointer-events-none bg-[radial-gradient(circle_at_60%_40%,rgba(10,228,72,0.10)_0%,rgba(171,255,132,0.05)_50%,transparent_72%)]" />

        <div className="max-w-[1280px] mx-auto w-full z-10">
          <Reveal>
            <p className="text-base md:text-lg text-cream mb-5 md:mb-7">{'{'} Scholarships, matched honestly {'}'}</p>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="text-heading-lg lg:text-display font-semibold text-cream max-w-none lg:max-w-[12ch]">
              Animate your future<span className="text-accent-green">.</span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="text-body md:text-body-lg text-muted mt-5 md:mt-7 max-w-[52ch] leading-relaxed">
              Zawadi matches African students to scholarships they are 100% eligible for — verified daily, no spam.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 md:mt-10">
              <button
                onClick={onGetStarted}
                className="btn-gradient-stroke inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 min-h-[48px] text-base md:text-lg font-semibold text-cream transition-all duration-200 hover:brightness-110 active:scale-[0.98] cursor-pointer"
              >
                Start free
                <ArrowForward className="w-4 h-4" />
              </button>
              <Link
                to="/scholarships/browse"
                className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 min-h-[48px] text-base md:text-lg font-semibold text-cream border border-cream/60 hover:border-cream hover:bg-cream/[0.04] transition-all duration-200 active:scale-[0.98]"
              >
                Browse scholarships
              </Link>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-8 md:mt-12 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <ShieldCheckIcon className="w-4 h-4" />
                No data selling
              </span>
              <span className="flex items-center gap-1.5">
                <GlobeIcon className="w-4 h-4" />
                {countries.length || 54} African countries
              </span>
              <span className="flex items-center gap-1.5">
                <BadgeCheckIcon className="w-4 h-4" />
                Human-vetted listings
              </span>
              <button onClick={onLogin} className="underline underline-offset-4 decoration-hairline hover:decoration-cream cursor-pointer text-left">
                Already have an account? Sign in
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ Featured scholarships ═══ */}
      <section className="hairline">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-8 md:mb-12">
            <div>
              <p className="text-accent-orange font-semibold mb-2"><span className="text-cream">{'{'}</span> Open now <span className="text-cream">{'}'}</span></p>
              <h2 className="text-subheading font-semibold text-cream tracking-tight">Explore active scholarships</h2>
            </div>
            <p className="text-muted text-sm md:text-base max-w-[38ch]">Hand-picked opportunities currently open to African students. Updated daily.</p>
          </div>

          {featuredLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`${panelBase} p-6 animate-pulse`}>
                  <div className="h-4 w-3/4 bg-hairline/40 rounded mb-3" />
                  <div className="h-3 w-1/2 bg-hairline/30 rounded mb-6" />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-hairline/30 rounded-full" />
                    <div className="h-5 w-20 bg-hairline/30 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredScholarships.length === 0 ? (
            <div className={`${panelBase} text-center py-14 px-6`}>
              <SearchIcon className="w-7 h-7 text-muted mx-auto mb-3" />
              <p className="text-cream font-medium mb-1">No featured scholarships right now</p>
              <p className="text-muted text-sm">New opportunities are added daily. Check back soon or browse all scholarships.</p>
            </div>
          ) : (
            <>
              {/* Mobile: horizontal snap scroll */}
              <div className="flex md:hidden gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar -mx-4 px-4 pb-1">
                {featuredScholarships.map(s => (
                  <Link
                    key={s.id}
                    to={`/scholarships`}
                    className={`snap-start shrink-0 w-[280px] ${panelBase} p-5 flex flex-col gap-3 hover:border-hairline`}
                  >
                    <ScholarshipCardBody s={s} />
                  </Link>
                ))}
              </div>
              {/* Desktop: grid */}
              <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-5">
                {featuredScholarships.map(s => (
                  <Link key={s.id} to={`/scholarships`} className={`${panelBase} p-6 flex flex-col gap-3 transition-colors duration-200 hover:border-muted`}>
                    <ScholarshipCardBody s={s} />
                  </Link>
                ))}
              </div>
            </>
          )}

          <div className="mt-8 md:mt-10">
            <Link
              to="/scholarships"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 min-h-[44px] text-sm font-semibold text-cream border border-cream/60 hover:border-cream hover:bg-cream/[0.04] transition-all duration-200"
            >
              View all scholarships
              <ArrowForward className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ Why Zawadi — stat bento ═══ */}
      <section className="hairline">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16 md:py-24">
          <Reveal>
            <h2 className="text-subheading md:text-heading font-semibold text-cream tracking-tight max-w-[22ch] mb-10 md:mb-14">
              The system isn't built for us. So we built our own.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            <Reveal className="sm:col-span-2">
              <div className={`${panelBase} relative overflow-hidden p-6 md:p-8 h-full bg-[radial-gradient(circle_at_85%_15%,rgba(10,228,72,0.08)_0%,transparent_55%)]`}>
                <p className="text-xs uppercase tracking-wider text-muted mb-4">Matching engine</p>
                <div className="font-mono text-5xl md:text-6xl font-medium tabular-nums text-accent-green">100%</div>
                <h3 className="font-semibold text-cream text-lg md:text-xl mt-3 mb-2">Deterministic eligibility</h3>
                <p className="text-sm text-muted leading-relaxed max-w-md">
                  Every listing is checked against your nationality, degree level, field of study and GPA.
                  If it says you qualify, you qualify.
                </p>
                <div className="flex flex-wrap gap-2 mt-5">
                  <Chip tone="green">54 countries</Chip>
                  <Chip>Daily refresh</Chip>
                  <Chip>No hallucinations</Chip>
                </div>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className={`${panelBase} p-6 h-full flex flex-col gap-3`}>
                <LightningIcon className="w-5 h-5 text-accent-light-green" />
                <div className="font-mono text-3xl tabular-nums text-cream mt-auto pt-6">3 min</div>
                <h3 className="font-medium text-cream text-sm">Profile to matches</h3>
                <p className="text-xs text-muted leading-relaxed">Set up once. No endless scrolling — just scholarships you can actually win.</p>
              </div>
            </Reveal>

            <Reveal delay={140}>
              <div className={`${panelBase} p-6 h-full flex flex-col gap-3`}>
                <MapPinIcon className="w-5 h-5 text-accent-orange" />
                <div className="font-mono text-3xl tabular-nums text-cream mt-auto pt-6">4-step</div>
                <h3 className="font-medium text-cream text-sm">Guided path</h3>
                <p className="text-xs text-muted leading-relaxed">Profile, matches, essays, submission — with AI and human support at each stage.</p>
              </div>
            </Reveal>

            <Reveal delay={200} className="sm:col-span-2 lg:col-span-4">
              <div className={`${panelBase} p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4 md:gap-8`}>
                <DatabaseCheckIcon className="w-5 h-5 text-accent-blue shrink-0" />
                <div className="font-mono text-3xl md:text-4xl tabular-nums text-cream shrink-0">2,500+</div>
                <p className="text-sm text-muted leading-relaxed">
                  verified listings kept current — no dead links, no expired deadlines, no recycled spam.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ Features ═══ */}
      <section id="features" className="hairline scroll-mt-24">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16 md:py-24">
          <Reveal>
            <h2 className="text-subheading md:text-heading font-semibold text-cream tracking-tight max-w-[24ch] mb-10 md:mb-14">
              Built for how applications actually happen.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            <FeatureCard
              icon={<ClipboardCheckIcon className="w-5 h-5 text-accent-pink" />}
              title="Track every application"
              body="A visual pipeline showing exactly where each application stands."
              accent={<PipelineBars />}
            />
            <FeatureCard
              icon={<SparklesAIIcon className="w-5 h-5 text-accent-lilac" />}
              title="AI + human review"
              body="The AI learns your writing voice for personal statements; a real mentor reviews every essay before you submit."
              foot={
                <span className="flex items-center gap-2 text-xs font-medium text-accent-green">
                  <BadgeCheckIcon className="w-4 h-4" />
                  Human-reviewed on every plan
                </span>
              }
            />
            <FeatureCard
              icon={<LockIcon className="w-5 h-5 text-accent-blue" />}
              title="Secure document vault"
              body="Upload transcripts, references and certificates once — we surface the right document for every application."
            />
            <FeatureCard
              icon={<GlobeIcon className="w-5 h-5 text-status-success" />}
              title="Alternative English pathways"
              body="Filter for scholarships that accept a Medium-of-Instruction certificate or the $60 Duolingo test."
              foot={
                <div className="flex flex-wrap gap-1.5">
                  <Chip tone="green">No IELTS</Chip>
                  <Chip tone="green">MOI accepted</Chip>
                  <Chip tone="green">Duolingo $60</Chip>
                </div>
              }
            />
            <Reveal delay={120} className="md:col-span-2">
              <div className={`${panelBase} p-6 md:p-8 h-full flex flex-col justify-between gap-6 bg-[radial-gradient(circle_at_15%_85%,rgba(0,186,226,0.06)_0%,transparent_55%)]`}>
                <div>
                  <h3 className="font-semibold text-cream text-lg md:text-xl mb-2">Deadlines that find you first</h3>
                  <p className="text-sm text-muted leading-relaxed max-w-lg">
                    Deadline tracking with reminders calibrated to each scholarship's timezone and requirements,
                    so no opportunity lapses because of a date you missed.
                  </p>
                </div>
                <div className="font-mono text-muted text-sm tabular-nums flex items-center gap-3">
                  <span className="text-accent-pink">●</span> rolling · seasonal · fixed deadlines tracked
                </div>
              </div>
            </Reveal>
          </div>

          <div className="flex justify-center mt-8 md:mt-10">
            <div className="inline-flex items-center gap-2 border border-hairline rounded-full px-5 py-2.5">
              <BadgeCheckIcon className="w-4 h-4 text-accent-green" />
              <span className="text-xs text-muted">Human-vetted accuracy — every listing verified by our research team</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Testimonials ═══ */}
      <section className="hairline">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16 md:py-24">
          <Reveal>
            <p className="text-base md:text-lg text-cream mb-4">{'{'} Proof, not promises {'}'}</p>
            <h2 className="text-subheading md:text-heading font-semibold text-cream tracking-tight max-w-[24ch] mb-10 md:mb-14">
              Scholars already there.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            <Reveal className="md:col-span-2">
              <figure className={`${panelBase} relative overflow-hidden p-6 md:p-8 h-full flex flex-col gap-5`}>
                <QuoteMark className="absolute top-5 right-6 text-6xl text-hairline/50" />
                <blockquote className="text-base md:text-xl leading-relaxed text-cream max-w-[52ch]">
                  "Zawadi showed me twelve opportunities I was 100% eligible for within minutes.
                  I secured a fully-funded Master's in Germany."
                </blockquote>
                <figcaption className="mt-auto flex items-center gap-4">
                  <span className="w-12 h-12 md:w-14 md:h-14 rounded-lg ring-1 ring-hairline flex items-center justify-center font-mono text-cream">AK</span>
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium text-cream text-sm">Amina Kouyaté</span>
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      <MapPinIcon className="w-3.5 h-3.5" /> Mali → Germany · MSc Renewable Energy
                    </span>
                    <span className="flex items-center gap-0.5 text-accent-green">
                      {[1, 2, 3, 4, 5].map(i => <StarIcon key={i} className="w-3.5 h-3.5" />)}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>

            <Reveal delay={100}>
              <figure className={`${panelBase} p-6 h-full flex flex-col gap-4`}>
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 md:w-12 md:h-12 rounded-lg ring-1 ring-hairline flex items-center justify-center font-mono text-cream text-sm">CN</span>
                  <span className="flex flex-col">
                    <span className="font-medium text-cream text-sm">Chidi Nnamdi</span>
                    <span className="text-xs text-muted">Nigeria → Canada</span>
                  </span>
                </div>
                <blockquote className="text-sm text-muted leading-relaxed">
                  "The No-IELTS filter saved me $250 and months of prep. MOI certificate, full ride at Toronto."
                </blockquote>
                <span className="flex items-center gap-0.5 mt-auto text-accent-green">
                  {[1, 2, 3, 4, 5].map(i => <StarIcon key={i} className="w-3 h-3" />)}
                </span>
              </figure>
            </Reveal>

            <Reveal delay={60}>
              <figure className={`${panelBase} p-6 h-full flex flex-col gap-4`}>
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 md:w-12 md:h-12 rounded-lg ring-1 ring-hairline flex items-center justify-center font-mono text-cream text-sm">FM</span>
                  <span className="flex flex-col">
                    <span className="font-medium text-cream text-sm">Faith Muthoni</span>
                    <span className="text-xs text-muted">Kenya → UK</span>
                  </span>
                </div>
                <blockquote className="text-sm text-muted leading-relaxed">
                  "My mentor's feedback made the difference. Now studying Medicine at King's College London."
                </blockquote>
                <span className="flex items-center gap-0.5 mt-auto text-accent-green">
                  {[1, 2, 3, 4, 5].map(i => <StarIcon key={i} className="w-3 h-3" />)}
                </span>
              </figure>
            </Reveal>

            <Reveal delay={120} className="md:col-span-2">
              <div className={`${panelBase} p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5`}>
                <p className="font-medium text-cream text-lg md:text-xl max-w-[28ch]">Ready to write your own story?</p>
                <button
                  onClick={onGetStarted}
                  className="btn-gradient-stroke inline-flex items-center gap-2 rounded-full px-6 py-3 min-h-[48px] font-semibold text-cream transition-all duration-200 hover:brightness-110 active:scale-[0.98] cursor-pointer shrink-0"
                >
                  Start free
                  <ArrowForward className="w-4 h-4" />
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" className="hairline scroll-mt-24">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-16 md:py-24">
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": landingFaqs.map(faq => ({
                "@type": "Question",
                "name": faq.q,
                "acceptedAnswer": { "@type": "Answer", "text": faq.a }
              }))
            })}
          </script>

          <Reveal>
            <h2 className="text-subheading font-semibold text-cream tracking-tight mb-2">Frequently asked</h2>
            <p className="text-muted text-sm mb-8">Everything about finding scholarships with Zawadi.</p>
          </Reveal>

          <div className="space-y-2">
            {landingFaqs.map((faq, idx) => {
              const faqId = `lf-${idx}`;
              const isOpen = openFaq === faqId;
              return (
                <div key={faqId} className={`border rounded-lg transition-colors duration-200 overflow-hidden ${isOpen ? 'border-hairline bg-off-black' : 'border-hairline/60 bg-transparent hover:border-hairline'}`}>
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : faqId)}
                    className="w-full flex justify-between items-center gap-4 p-4 md:p-5 text-left cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span className={`text-sm md:text-base transition-colors ${isOpen ? 'text-accent-green' : 'text-cream'}`}>{faq.q}</span>
                    <svg
                      className={`w-4 h-4 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-accent-green' : 'text-muted'}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className={`transition-all duration-300 ease-out ${isOpen ? 'max-h-[400px]' : 'max-h-0'}`}>
                    <p className="px-4 md:px-5 pb-5 text-sm text-muted leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {onViewAllFAQs && (
            <div className="mt-8">
              <button
                onClick={onViewAllFAQs}
                className="inline-flex items-center gap-2 text-sm font-semibold text-accent-green hover:brightness-110 cursor-pointer underline underline-offset-4 decoration-accent-green/40 hover:decoration-accent-green transition-all"
              >
                View all FAQs
                <ArrowForward className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ═══ Final CTA ═══ */}
      <section className="hairline relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_120%,rgba(10,228,72,0.10)_0%,transparent_60%)]" />
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-20 md:py-32 relative">
          <Reveal>
            <h2 className="text-heading md:text-heading-lg font-semibold text-cream tracking-tight max-w-[18ch]">
              Your scholarship is out there.
            </h2>
            <button
              onClick={onGetStarted}
              className="btn-gradient-stroke inline-flex items-center gap-2 rounded-full px-8 py-3.5 min-h-[52px] text-lg font-semibold text-cream transition-all duration-200 hover:brightness-110 active:scale-[0.98] cursor-pointer mt-8 md:mt-10"
            >
              Start for free
              <ArrowForward className="w-4 h-4" />
            </button>
            <p className="mt-5 text-sm text-muted">Create your profile in three minutes. No credit card required.</p>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

/* ── Sub-components ── */

function ScholarshipCardBody({ s }: { s: Scholarship }) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-cream text-sm leading-snug line-clamp-2 flex-1">{s.name}</h3>
        {s.no_ielts && (
          <span className="shrink-0 px-2 py-0.5 rounded-full border border-accent-green/40 text-accent-green text-[10px] font-medium uppercase tracking-wide">
            No IELTS
          </span>
        )}
      </div>
      <p className="text-xs text-muted line-clamp-2">
        {s.provider}{s.host_institution ? ` \u00B7 ${s.host_institution}` : ''}
      </p>
      <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
        {s.funding_type && <Chip>{s.funding_type}</Chip>}
        {s.degree_levels?.slice(0, 2).map((d: string) => <Chip key={d}>{d}</Chip>)}
        {s.deadline && <Chip tone="pink">{s.deadline}</Chip>}
      </div>
    </>
  );
}

function PipelineBars() {
  return (
    <div className="flex items-center gap-1 mt-1" aria-hidden>
      {[
        ['Draft', 'bg-hairline'],
        ['Submitted', 'bg-accent-blue/50'],
        ['Review', 'bg-status-warning/50'],
        ['Awarded', 'bg-accent-green/60'],
      ].map(([stage, color], i) => (
        <React.Fragment key={stage}>
          <div className={`h-1.5 flex-1 rounded-full ${color}`} title={stage} />
          {i < 3 && <div className="w-1" />}
        </React.Fragment>
      ))}
    </div>
  );
}

function FeatureCard({ icon, title, body, foot, accent, delay = 0 }: {
  icon: React.ReactNode;
  title: string;
  body: string;
  foot?: React.ReactNode;
  accent?: React.ReactNode;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className="h-full">
      <div className={`${panelBase} p-6 h-full flex flex-col gap-3 transition-colors duration-200 hover:border-muted`}>
        {icon}
        <h3 className="font-medium text-cream text-base">{title}</h3>
        <p className="text-sm text-muted leading-relaxed">{body}</p>
        {accent}
        {foot && <div className="mt-auto pt-3">{foot}</div>}
      </div>
    </Reveal>
  );
}

/* ── Landing Page FAQs ── */

const landingFaqs = [
  {
    q: "Do I need to take the IELTS to apply for scholarships on Zawadi?",
    a: "No. Zawadi has a No-IELTS filter that shows you scholarships accepting a Medium of Instruction certificate from your secondary school or university, or the Duolingo English Test which costs $60."
  },
  {
    q: "Is Zawadi free for students?",
    a: "The core matching, filtering, and application tracking features are free on the Explorer plan. We will never sell your personal data to third parties."
  },
  {
    q: "How does Zawadi decide which scholarships to show me?",
    a: "Our matching engine checks your nationality, degree level, field of study, and GPA against the exact eligibility requirements of every scholarship in our database. You only see scholarships where you meet 100 percent of the criteria."
  },
  {
    q: "How long does it take to set up a profile and see my first matches?",
    a: "Under three minutes. As soon as you complete the profile wizard your match results appear."
  }
];
