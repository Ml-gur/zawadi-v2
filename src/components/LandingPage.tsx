import React, { useState } from 'react';
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
  "description": "AI-powered scholarship matching platform built for African students. Deterministic eligibility matching, No-IELTS filter, AI essay generation.",
  "foundingDate": "2025",
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "hello@techsari.africa",
    "contactType": "customer support"
  }
};

/* ── Inline SVG icons (no external dependency) ── */
const TargetIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const LanguagesIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
  </svg>
);

const SparklesIcon = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const CheckIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default function LandingPage({ onGetStarted, onLogin, countries, onViewAllFAQs }: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  return (
    <div className="bg-background text-on-background min-h-screen">
      <SEO
        title="Scholarships for African Students — Zawadi"
        description="Find scholarships you qualify for across all 54 African countries. Deterministic matching, No-IELTS filter, AI essay help. Free for students."
        path="/"
        schema={organizationSchema}
      />

      {/* ──────────────────────────────────────────────
          Section 1 — Hero (full-width)
          ────────────────────────────────────────────── */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden mesh-gradient bg-grid-pattern px-6 pt-24 md:pt-28 pb-16 md:pb-32">
        {/* Decorative gradient orb */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,107,73,0.12)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-[-15%] left-[-5%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(0,23,54,0.08)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-[960px] mx-auto w-full text-center z-10">
          <div className="flex flex-col items-center gap-6 animate-sweep">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-primary leading-tight max-w-4xl">
              Find Scholarships You Actually Qualify For
            </h1>

            <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl leading-relaxed">
              100% eligibility matching for African students. No spam. No data selling.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto justify-center">
              <button
                onClick={onGetStarted}
                className="bg-secondary-container text-on-secondary-fixed hover:bg-[#00714d] hover:scale-105 px-8 py-4 min-h-[48px] min-w-[180px] rounded-full font-semibold transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                Create Your Profile
                <ArrowForward />
              </button>
              <a
                href="#how-it-works"
                className="bg-surface-container-lowest text-on-surface border border-outline-variant hover:bg-surface-container-low hover:border-outline px-8 py-4 min-h-[48px] min-w-[180px] rounded-full font-semibold transition-all duration-200 shadow-sm flex items-center justify-center gap-2 text-center"
              >
                See How It Works
              </a>
            </div>

            <p className="text-xs font-bold text-on-surface-variant/60 mt-2">
              Available across all 54 African countries
            </p>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────
          Section 2 — One-line difference (centered)
          ────────────────────────────────────────────── */}
      <section className="px-6 py-20 md:py-28 bg-surface-bright">
        <div className="max-w-[720px] mx-auto text-center">
          <p className="text-2xl md:text-3xl font-display font-bold text-primary leading-relaxed">
            We only show you scholarships you are eligible to win.
          </p>
          <p className="mt-4 text-sm md:text-base text-on-surface-variant">
            Not hundreds. Not thousands. The ones you can actually get.
          </p>
        </div>
      </section>

      {/* ──────────────────────────────────────────────
          Section 3 — Three Feature Cards
          ────────────────────────────────────────────── */}
      <section className="px-6 py-20 md:py-28 bg-surface-container-low">
        <div className="max-w-[1080px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Card 1: Precise Matching */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 md:p-8 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <TargetIcon className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-primary">Precise Matching</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Your nationality, degree, and GPA filter out everything you don&apos;t qualify for.
              </p>
            </div>

            {/* Card 2: No IELTS Barrier */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 md:p-8 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-secondary-container/20 text-secondary flex items-center justify-center">
                <LanguagesIcon className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-primary">No IELTS Barrier</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Filter for scholarships that accept MOI certificates or the $60 Duolingo test.
              </p>
            </div>

            {/* Card 3: AI Essay Co-Creator */}
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 md:p-8 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-primary-fixed/40 text-primary flex items-center justify-center">
                <SparklesIcon className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-primary">AI Essay Co-Creator</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Write compelling applications with AI that learns your voice, reviewed by a real mentor.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────
          Section 4 — Social Proof (three stats)
          ────────────────────────────────────────────── */}
      <section className="px-6 py-20 md:py-28 bg-surface-bright">
        <div className="max-w-[960px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="text-3xl md:text-4xl font-black text-primary">54</div>
              <p className="text-sm font-semibold text-on-surface">Available across all 54 African countries</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                <CheckIcon className="w-5 h-5 text-status-success" />
              </div>
              <p className="text-sm font-semibold text-on-surface">Zero data selling — ever</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-secondary-container/20 flex items-center justify-center mb-1">
                <CheckIcon className="w-5 h-5 text-secondary" />
              </div>
              <p className="text-sm font-semibold text-on-surface">Real human mentor review on every plan</p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────
          Section 5 — How it works (4 numbered steps)
          ────────────────────────────────────────────── */}
      <section id="how-it-works" className="px-6 py-20 md:py-28 bg-surface-container-lowest">
        <div className="max-w-[960px] mx-auto">
          <h2 className="text-2xl md:text-3xl font-display font-black text-primary text-center mb-12 md:mb-16">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center text-lg font-black">
                1
              </div>
              <h3 className="font-display text-sm font-bold text-primary">Create your profile</h3>
              <p className="text-xs text-on-surface-variant">3 minutes</p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center text-lg font-black">
                2
              </div>
              <h3 className="font-display text-sm font-bold text-primary">See only scholarships you qualify for</h3>
              <p className="text-xs text-on-surface-variant">&nbsp;</p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center text-lg font-black">
                3
              </div>
              <h3 className="font-display text-sm font-bold text-primary">Write your application with AI</h3>
              <p className="text-xs text-on-surface-variant">&nbsp;</p>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center text-lg font-black">
                4
              </div>
              <h3 className="font-display text-sm font-bold text-primary">Get a human mentor review</h3>
              <p className="text-xs text-on-surface-variant">&nbsp;</p>
            </div>
          </div>

          {/* Dot connector on desktop */}
          <div className="hidden lg:block relative">
            <div className="absolute top-[-40px] left-[12.5%] right-[12.5%] h-0.5 bg-outline-variant/30">
              <div className="h-full bg-secondary-container/60" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────
          Section 6 — CTA (dark background, full-width)
          ────────────────────────────────────────────── */}
      <section className="px-6 py-24 md:py-32 bg-primary text-on-primary text-center">
        <div className="max-w-[640px] mx-auto">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-black mb-6 leading-tight">
            Your scholarship is out there. Let us help you find it.
          </h2>
          <button
            onClick={onGetStarted}
            className="bg-white text-primary hover:bg-primary-fixed-dim hover:text-on-primary-fixed px-10 py-4 min-h-[48px] rounded-full font-bold text-lg transition-all duration-300 shadow-lg inline-flex items-center gap-2 cursor-pointer"
          >
            Start for Free
            <ArrowForward />
          </button>
          <p className="mt-6 text-xs text-on-primary/60">
            Create your profile in 3 minutes. No credit card required.
          </p>
        </div>
      </section>

      {/* ──────────────────────────────────────────────
          Landing page FAQ (retained, compact)
          ────────────────────────────────────────────── */}
      <section id="faq" className="px-6 py-20 md:py-24 bg-surface-container-lowest">
        <div className="max-w-[800px] mx-auto">
          <h2 className="text-2xl font-display font-black text-primary mb-2 text-center">Frequently Asked Questions</h2>
          <p className="text-sm text-on-surface-variant mb-10 text-center">Quick answers to common questions about using Zawadi.</p>

          <div className="space-y-2">
            {landingFaqs.map((faq, idx) => {
              const faqId = `lf-${idx}`;
              const isOpen = openFaq === faqId;
              return (
                <div key={faqId} className={`border rounded-2xl transition-all duration-300 overflow-hidden ${isOpen ? 'bg-primary-fixed/5 border-primary shadow-md' : 'bg-surface border-outline-variant/30'}`}>
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : faqId)}
                    className="w-full flex justify-between items-center p-5 text-left cursor-pointer group"
                    aria-expanded={isOpen}
                  >
                    <span className={`font-black text-xs uppercase tracking-wide ${isOpen ? 'text-primary' : 'text-on-surface'}`}>{faq.q}</span>
                    <svg className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : 'text-on-surface-variant'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 border-t border-outline-variant/20' : 'max-h-0 opacity-0'}`}>
                    <div className="p-5 text-xs text-on-surface-variant leading-relaxed bg-surface-container-lowest/50">{faq.a}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {onViewAllFAQs && (
            <div className="mt-8 text-center">
              <button onClick={onViewAllFAQs} className="inline-flex items-center gap-2 text-xs font-bold text-secondary hover:text-primary transition-colors cursor-pointer border border-secondary/30 hover:border-primary/30 rounded-xl px-5 py-2.5">
                View All FAQs
                <ArrowForward className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

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
