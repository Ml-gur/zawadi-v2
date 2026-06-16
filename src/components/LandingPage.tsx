import React, { useState, useEffect, useRef } from 'react';
import { ArrowForward } from './Icons';
import { SEO } from './SEO';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  countries: string[];
  onViewAllFAQs?: () => void;
}

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Techsari Zawadi",
  "url": "https://www.techsari.online/",
  "logo": "https://www.techsari.online/icon.svg",
  "description": "Stop searching global spam. Discover daily-updated, 100% eligible African scholarships, track deadlines, and write winning essays with our AI Studio.",
  "foundingDate": "2025",
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "hello@techsari.africa",
    "contactType": "customer support"
  }
};

/* ── Inline SVG icons ── */

const ShieldCheckIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const LightningIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const MapIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const DatabaseCheckIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
  </svg>
);

const SearchIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ClipboardCheckIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const SparklesAIIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const LockIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const GlobeIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BadgeCheckIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
);

const StarIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const QuoteIcon = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
  </svg>
);

/* ── Scroll reveal hook ── */

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
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

function RevealSection({ children, className = '', threshold = 0.15, as: Tag = 'section' as any }: {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  as?: keyof JSX.IntrinsicElements;
}) {
  const { ref, isVisible } = useScrollReveal(threshold);
  return (
    <Tag
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

/* ── Main component ── */

export default function LandingPage({ onGetStarted, onLogin, countries, onViewAllFAQs }: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  return (
    <div className="bg-background text-on-background min-h-screen">
      <SEO
        title="Zawadi — Find Scholarships You're 100% Eligible For | African Students"
        description="Stop searching global spam. Discover daily-updated, 100% eligible African scholarships, track deadlines, and write winning essays with our AI Studio."
        path="/"
        image="https://techsari.online/og-home.png"
        schema={organizationSchema}
      />

      {/* ═══════════════════════════════════════════════
          Section 1 — Hero
          ═══════════════════════════════════════════════ */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-grid-pattern mesh-gradient px-6 pt-24 md:pt-28 pb-16 md:pb-32">
        {/* Decorative gradient orbs */}
        <div className="absolute top-[-15%] right-[-8%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(0,107,73,0.10)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-8%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,23,54,0.06)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(254,147,44,0.06)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-[1100px] mx-auto w-full z-10">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            {/* Left: text content */}
            <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left gap-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black leading-tight max-w-xl">
                Unlock Your Academic Future with{' '}
                <span className="text-primary">Techsari Zawadi</span>
              </h1>

              <p className="text-lg md:text-xl text-on-surface-variant max-w-lg leading-relaxed">
                AI-powered scholarship matching built exclusively for African students.
                Find and apply for opportunities you are 100% eligible for.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mt-2 w-full sm:w-auto">
                <button
                  onClick={onGetStarted}
                  className="bg-primary text-on-primary hover:bg-primary-container hover:scale-105 px-8 py-4 min-h-[48px] rounded-full font-semibold transition-all duration-200 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  Start Your Journey
                  <ArrowForward className="w-4 h-4" />
                </button>
                <a
                  href="#features"
                  className="bg-surface-container-lowest text-on-surface border border-outline-variant hover:bg-surface-container-low hover:border-outline px-8 py-4 min-h-[48px] rounded-full font-semibold transition-all duration-200 shadow-sm flex items-center justify-center gap-2 text-center"
                >
                  See How it Works
                </a>
              </div>

              {/* Login link */}
              <p className="text-xs text-on-surface-variant/60 mt-1">
                Already have an account?{' '}
                <button onClick={onLogin} className="font-semibold text-primary hover:underline cursor-pointer">
                  Sign in
                </button>
              </p>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 mt-3 text-xs text-on-surface-variant/70">
                <span className="flex items-center gap-1.5">
                  <ShieldCheckIcon className="w-4 h-4 text-status-success" />
                  No data selling
                </span>
                <span className="flex items-center gap-1.5">
                  <GlobeIcon className="w-4 h-4" />
                  {countries.length} African countries
                </span>
                <span className="flex items-center gap-1.5">
                  <BadgeCheckIcon className="w-4 h-4 text-secondary" />
                  Human-vetted accuracy
                </span>
              </div>
            </div>

            {/* Right: floating glass card */}
            <div className="flex-1 flex justify-center lg:justify-end">
              <div className="relative">
                {/* Decorative image placeholder with gradient */}
                <div className="w-72 h-80 md:w-80 md:h-96 rounded-3xl bg-gradient-to-br from-primary-container/30 via-primary-fixed/20 to-secondary-container/30 border border-surface-container-highest/50 shadow-2xl overflow-hidden">
                  {/* Abstract illustration inside */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-40 h-40 rounded-full bg-primary/5 flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <SearchIcon className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Floating stats */}
                  <div className="absolute top-6 left-6 bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant/20 rounded-2xl px-4 py-3 shadow-lg">
                    <div className="text-2xl font-black text-primary">98%</div>
                    <div className="text-xs text-on-surface-variant">Match Accuracy</div>
                  </div>
                  <div className="absolute bottom-8 right-6 bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant/20 rounded-2xl px-4 py-3 shadow-lg">
                    <div className="text-2xl font-black text-secondary">2,500+</div>
                    <div className="text-xs text-on-surface-variant">Scholarships</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          Section 2 — Problem / Empathy
          ═══════════════════════════════════════════════ */}
      <RevealSection className="px-6 py-20 md:py-28 bg-surface-container-lowest">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-black text-on-surface leading-tight max-w-2xl mx-auto">
              The System Isn't Built for Us.<br />We Understand Your Journey.
            </h2>
            <p className="mt-4 text-sm md:text-base text-on-surface-variant max-w-xl mx-auto">
              Finding scholarships as an African student shouldn't be overwhelming.
              We've built the tools that put clarity and confidence back in your hands.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {/* Card 1: Absolute Precision */}
            <div className="group bg-surface border border-outline-variant/20 rounded-2xl p-6 md:p-7 hover:border-primary/30 hover:shadow-lg transition-all duration-300 flex flex-col gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <SearchIcon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-black text-primary">100%</div>
              <h3 className="font-display font-bold text-on-surface">Absolute Precision</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Our deterministic engine matches you only to scholarships where you meet every single requirement.
              </p>
            </div>

            {/* Card 2: Zero Fatigue */}
            <div className="group bg-surface border border-outline-variant/20 rounded-2xl p-6 md:p-7 hover:border-primary/30 hover:shadow-lg transition-all duration-300 flex flex-col gap-3">
              <div className="w-11 h-11 rounded-xl bg-secondary-container/30 text-secondary flex items-center justify-center">
                <LightningIcon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-black text-secondary">3 min</div>
              <h3 className="font-display font-bold text-on-surface">Zero Fatigue</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Set up your profile in under three minutes. No endless scrolling, just your matches.
              </p>
            </div>

            {/* Card 3: Structured Guidance */}
            <div className="group bg-surface border border-outline-variant/20 rounded-2xl p-6 md:p-7 hover:border-primary/30 hover:shadow-lg transition-all duration-300 flex flex-col gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary-fixed/40 text-primary flex items-center justify-center">
                <MapIcon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-black text-primary">4-step</div>
              <h3 className="font-display font-bold text-on-surface">Structured Guidance</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                A clear path from profile creation to submission, with AI and human support at every stage.
              </p>
            </div>

            {/* Card 4: Verified Data */}
            <div className="group bg-surface border border-outline-variant/20 rounded-2xl p-6 md:p-7 hover:border-primary/30 hover:shadow-lg transition-all duration-300 flex flex-col gap-3">
              <div className="w-11 h-11 rounded-xl bg-secondary-container/30 text-secondary flex items-center justify-center">
                <DatabaseCheckIcon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-black text-secondary">2,500+</div>
              <h3 className="font-display font-bold text-on-surface">Verified Data</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Every scholarship in our database is verified and kept current — no dead links, no outdated info.
              </p>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ═══════════════════════════════════════════════
          Section 3 — Bento Features Grid
          ═══════════════════════════════════════════════ */}
      <RevealSection id="features" className="px-6 py-20 md:py-28 bg-surface-container-low">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-black text-on-surface leading-tight max-w-2xl mx-auto">
              Intelligent Tools for Global Excellence
            </h2>
            <p className="mt-4 text-sm md:text-base text-on-surface-variant max-w-xl mx-auto">
              Purpose-built features that transform how African students discover and win international scholarships.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {/* Featured card — spans 2 columns on lg */}
            <div className="md:col-span-2 lg:col-span-2 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-3xl p-6 md:p-8 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <SearchIcon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-white/70">Core Engine</span>
                </div>
                <h3 className="text-xl md:text-2xl font-display font-black mb-3">
                  100% Deterministic Matching
                </h3>
                <p className="text-sm text-white/80 leading-relaxed max-w-lg mb-5">
                  Unlike AI chatbots that hallucinate eligibility, our engine cross-references your nationality,
                  degree level, field of study, and GPA against hard-coded requirements. If it says you qualify,
                  you actually qualify.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold">54 Countries</span>
                  <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold">Real-time Updates</span>
                  <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold">No AI Hallucination</span>
                </div>
              </div>
            </div>

            {/* Card: Track Every Application */}
            <div className="bg-surface border border-outline-variant/20 rounded-2xl p-6 md:p-7 hover:border-primary/30 hover:shadow-md transition-all duration-300 flex flex-col gap-3">
              <div className="w-11 h-11 rounded-xl bg-secondary-container/30 text-secondary flex items-center justify-center">
                <ClipboardCheckIcon className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-on-surface">Track Every Application</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                A visual pipeline showing exactly where each application stands — draft, submitted, under review, or awarded.
              </p>
              {/* Mini pipeline illustration */}
              <div className="flex items-center gap-1 mt-2">
                {['Draft', 'Submitted', 'Review', 'Awarded'].map((stage, i) => (
                  <React.Fragment key={stage}>
                    <div className={`h-2 flex-1 rounded-full ${i === 0 ? 'bg-outline-variant/40' : i === 1 ? 'bg-status-info/40' : i === 2 ? 'bg-status-warning/40' : 'bg-secondary-container/60'}`} />
                    {i < 3 && <div className="w-1" />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Card: AI Co-Creation + Human Review */}
            <div className="bg-surface border border-outline-variant/20 rounded-2xl p-6 md:p-7 hover:border-primary/30 hover:shadow-md transition-all duration-300 flex flex-col gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <SparklesAIIcon className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-on-surface">AI Co-Creation + Human Review</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Our AI learns your writing voice to generate personal statements, then a real human mentor reviews
                and refines every essay before submission.
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-secondary">
                <BadgeCheckIcon className="w-4 h-4" />
                Human-reviewed on every plan
              </div>
            </div>

            {/* Card: Secure Document Vault */}
            <div className="bg-surface border border-outline-variant/20 rounded-2xl p-6 md:p-7 hover:border-primary/30 hover:shadow-md transition-all duration-300 flex flex-col gap-3">
              <div className="w-11 h-11 rounded-xl bg-secondary-container/30 text-secondary flex items-center justify-center">
                <LockIcon className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-on-surface">Secure Document Vault</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Upload transcripts, recommendation letters, and certificates once. We organize, store,
                and surface the right documents for each application.
              </p>
            </div>

            {/* Card: Alternative English Pathways */}
            <div className="bg-surface border border-outline-variant/20 rounded-2xl p-6 md:p-7 hover:border-primary/30 hover:shadow-md transition-all duration-300 flex flex-col gap-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-3xl bg-status-success/10 pointer-events-none" />
              <div className="w-11 h-11 rounded-xl bg-status-success/15 text-status-success flex items-center justify-center">
                <GlobeIcon className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-on-surface">Alternative English Pathways</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Filter scholarships that accept Medium of Instruction certificates or the $60 Duolingo English Test.
                No IELTS required.
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="px-2.5 py-0.5 rounded-full bg-status-success/10 text-status-success text-xs font-semibold">No IELTS</span>
                <span className="px-2.5 py-0.5 rounded-full bg-status-success/10 text-status-success text-xs font-semibold">MOI Accepted</span>
                <span className="px-2.5 py-0.5 rounded-full bg-status-success/10 text-status-success text-xs font-semibold">Duolingo $60</span>
              </div>
            </div>
          </div>

          {/* Bottom badge */}
          <div className="flex justify-center mt-10">
            <div className="inline-flex items-center gap-2 bg-secondary-container/20 border border-secondary-container/30 rounded-full px-5 py-2.5">
              <BadgeCheckIcon className="w-4 h-4 text-secondary" />
              <span className="text-xs font-bold text-on-surface-variant">
                Human-Vetted Accuracy — every scholarship verified by our research team
              </span>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ═══════════════════════════════════════════════
          Section 4 — Testimonials
          ═══════════════════════════════════════════════ */}
      <RevealSection className="px-6 py-20 md:py-28 bg-surface-container-lowest">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-black text-on-surface leading-tight max-w-2xl mx-auto">
              Success Stories from African Scholars
            </h2>
            <p className="mt-4 text-sm md:text-base text-on-surface-variant max-w-xl mx-auto">
              Real students who found and won life-changing scholarships through Techsari Zawadi.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
            {/* Featured scholar — spans left side */}
            <div className="lg:col-span-2 bg-gradient-to-br from-surface-container-low to-surface border border-outline-variant/20 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center md:items-start relative overflow-hidden">
              <div className="absolute top-4 right-6 text-6xl text-primary/5 pointer-events-none">
                <QuoteIcon className="w-16 h-16" />
              </div>
              <div className="flex-shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary-container/40 flex items-center justify-center text-3xl font-black text-primary">
                  AK
                </div>
              </div>
              <div className="flex-1 relative z-10 text-center md:text-left">
                <p className="text-base md:text-lg text-on-surface leading-relaxed italic mb-4">
                  "I had been searching for scholarships for over a year and kept hitting dead ends.
                  Techsari Zawadi showed me 12 opportunities I was 100% eligible for within minutes.
                  I secured a fully-funded Master's in Germany. This platform changed my life."
                </p>
                <div>
                  <div className="font-display font-bold text-primary">Amina Kouyaté</div>
                  <div className="text-xs text-on-surface-variant flex items-center gap-1 justify-center md:justify-start mt-1">
                    <MapIcon className="w-3.5 h-3.5" />
                    Mali → Germany • MSc in Renewable Energy
                  </div>
                  <div className="flex items-center gap-0.5 mt-2 justify-center md:justify-start">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <StarIcon key={i} className="w-4 h-4 text-secondary" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Smaller testimonial 1 */}
            <div className="bg-surface border border-outline-variant/20 rounded-2xl p-6 md:p-7 flex flex-col gap-4 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary-container/40 to-primary-fixed/40 flex items-center justify-center text-lg font-black text-secondary">
                  CN
                </div>
                <div>
                  <div className="font-display font-bold text-on-surface text-sm">Chidi Nnamdi</div>
                  <div className="text-xs text-on-surface-variant">Nigeria → Canada</div>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                "The No-IELTS filter alone saved me $250 and months of preparation. I used my MOI certificate
                and got accepted to the University of Toronto with a full scholarship."
              </p>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <StarIcon key={i} className="w-3.5 h-3.5 text-secondary" />
                ))}
              </div>
            </div>

            {/* Smaller testimonial 2 */}
            <div className="bg-surface border border-outline-variant/20 rounded-2xl p-6 md:p-7 flex flex-col gap-4 hover:shadow-md transition-all duration-300 lg:col-start-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-fixed/40 to-secondary-container/40 flex items-center justify-center text-lg font-black text-primary">
                  FM
                </div>
                <div>
                  <div className="font-display font-bold text-on-surface text-sm">Faith Muthoni</div>
                  <div className="text-xs text-on-surface-variant">Kenya → UK</div>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                "The AI essay co-creator helped me articulate my story in a way I never could alone.
                My mentor's feedback made the difference. Now I'm studying Medicine at King's College London."
              </p>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <StarIcon key={i} className="w-3.5 h-3.5 text-secondary" />
                ))}
              </div>
            </div>

            {/* Call to action card */}
            <div className="bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-2xl p-6 md:p-7 flex flex-col justify-center items-center text-center gap-4">
              <p className="font-display font-bold text-lg leading-snug">
                Ready to write your own success story?
              </p>
              <button
                onClick={onGetStarted}
                className="bg-white text-primary hover:bg-primary-fixed hover:text-on-primary-fixed px-6 py-3 min-h-[48px] rounded-full font-bold transition-all duration-200 shadow-md flex items-center gap-2 cursor-pointer"
              >
                Start Your Journey
                <ArrowForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ═══════════════════════════════════════════════
          Section 5 — FAQ
          ═══════════════════════════════════════════════ */}
      <RevealSection id="faq" className="px-6 py-20 md:py-28 bg-surface-container-low">
        <div className="max-w-[800px] mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-2xl md:text-3xl font-display font-black text-on-surface">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Everything you need to know about finding scholarships with Techsari Zawadi.
            </p>
          </div>

          <div className="space-y-2">
            {landingFaqs.map((faq, idx) => {
              const faqId = `lf-${idx}`;
              const isOpen = openFaq === faqId;
              return (
                <div
                  key={faqId}
                  className={`border rounded-2xl transition-all duration-300 overflow-hidden ${
                    isOpen
                      ? 'bg-primary-fixed/5 border-primary shadow-md'
                      : 'bg-surface border-outline-variant/30'
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : faqId)}
                    className="w-full flex justify-between items-center p-5 text-left cursor-pointer group"
                    aria-expanded={isOpen}
                  >
                    <span
                      className={`font-bold text-sm transition-colors ${
                        isOpen ? 'text-primary' : 'text-on-surface group-hover:text-primary'
                      }`}
                    >
                      {faq.q}
                    </span>
                    <svg
                      className={`w-5 h-5 flex-shrink-0 ml-4 transition-transform duration-300 ${
                        isOpen ? 'rotate-180 text-primary' : 'text-on-surface-variant'
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div
                    className={`transition-all duration-300 ease-in-out ${
                      isOpen
                        ? 'max-h-[500px] opacity-100 border-t border-outline-variant/20'
                        : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="p-5 text-sm text-on-surface-variant leading-relaxed bg-surface-container-lowest/50">
                      {faq.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {onViewAllFAQs && (
            <div className="mt-10 text-center">
              <button
                onClick={onViewAllFAQs}
                className="inline-flex items-center gap-2 text-sm font-bold text-secondary hover:text-primary transition-colors cursor-pointer border border-secondary/30 hover:border-primary/30 rounded-xl px-5 py-3"
              >
                View All FAQs
                <ArrowForward className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </RevealSection>

      {/* ═══════════════════════════════════════════════
          Footer CTA
          ═══════════════════════════════════════════════ */}
      <RevealSection className="px-6 py-20 md:py-24 bg-primary text-on-primary text-center">
        <div className="max-w-[640px] mx-auto">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-black mb-6 leading-tight">
            Your scholarship is out there. Let us help you find it.
          </h2>
          <button
            onClick={onGetStarted}
            className="bg-white text-primary hover:bg-primary-fixed-dim hover:text-on-primary-fixed px-10 py-4 min-h-[48px] rounded-full font-bold text-lg transition-all duration-300 shadow-lg inline-flex items-center gap-2 cursor-pointer"
          >
            Start for Free
            <ArrowForward className="w-4 h-4" />
          </button>
          <p className="mt-6 text-xs text-on-primary/60">
            Create your profile in 3 minutes. No credit card required.
          </p>
        </div>
      </RevealSection>
    </div>
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
