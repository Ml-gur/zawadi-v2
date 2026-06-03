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
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden mesh-gradient bg-grid-pattern px-6 pt-8 md:pt-16 pb-12 md:pb-24">
        <div className="max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10">

          {/* Content */}
          <div className="flex flex-col items-start gap-6 max-w-2xl animate-sweep">

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-primary leading-tight">
              Find Scholarships You Actually Qualify For
            </h1>

            <p className="text-body-lg text-on-surface-variant max-w-xl">
              Zawadi matches African students to funding opportunities based on strict eligibility criteria, not keyword guesses. No spam. No irrelevant results. No data selling.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto">
              <button
                onClick={onGetStarted}
                className="bg-secondary-container text-on-secondary-fixed hover:bg-[#00714d] hover:scale-102 px-8 py-4 min-h-[48px] min-w-[160px] rounded-full font-semibold transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                Create Your Profile
                <ArrowForward />
              </button>
              <a
                href="#how-it-works"
                className="bg-surface-container-lowest text-on-surface border border-outline-variant hover:bg-surface-container-low hover:border-2 px-8 py-4 min-h-[48px] min-w-[160px] rounded-full font-semibold transition-all duration-200 shadow-sm flex items-center justify-center gap-2 text-center"
              >
                See How it Works
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="mt-8 pt-8 border-t border-outline-variant/30 w-full">
              <p className="text-[10px] font-bold tracking-wider text-outline uppercase mb-4">USED BY STUDENTS IN ALL 54 AFRICAN COUNTRIES</p>
              <p className="text-xs font-bold text-on-surface-variant">Available across all 54 African countries</p>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative w-full aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden group shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary-container/10 to-secondary-container/10 rounded-3xl"></div>
            <div className="relative w-full h-full rounded-3xl overflow-hidden border border-outline-variant/20 bg-surface-container-lowest">
              <img
                alt="African student reviewing scholarship matches on laptop"
                className="w-full h-full object-cover"
                src="/hero-student.png"
              />
              <div className="absolute bottom-6 left-6 right-6 md:right-auto md:w-80 premium-glass rounded-2xl p-4 transition-transform duration-300 group-hover:-translate-y-2">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">100% Eligible Match</p>
                    <p className="text-xs text-secondary font-semibold">No IELTS Required</p>
                  </div>
                </div>
                <div className="w-full bg-surface-variant rounded-full h-1.5 mb-2">
                  <div className="bg-secondary-container h-1.5 rounded-full" style={{ width: '100%' }}></div>
                </div>
                <p className="text-xs text-on-surface-variant flex justify-between">
                  <span>You qualify for this award</span>
                  <span className="text-primary font-bold">Apply now →</span>
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Introduction */}
      <section className="px-6 py-20 bg-surface-bright">
        <div className="max-w-[800px] mx-auto text-center">
          <p className="text-body-lg text-on-surface-variant leading-relaxed">
            Most scholarship platforms show you thousands of awards you will never win. They do this because their real business is selling your personal data to advertisers. Zawadi works differently. Our matching engine checks your nationality, degree level, field of study, and academic record against the exact requirements of every scholarship in our database. You only see funding you are eligible to apply for.
          </p>
        </div>
      </section>

      {/* Value Proposition Pull Quote */}
      <section className="px-6 py-16 bg-primary text-on-primary">
        <div className="max-w-[960px] mx-auto text-center">
          <p className="text-xl md:text-2xl font-display font-bold leading-relaxed">
            For ambitious African students seeking local and international university funding, dissatisfied with mass scholarship directories that sell their personal data and provide irrelevant results. Zawadi provides 100% deterministic eligibility filtering, centralized deadline tracking, and an AI-powered essay co-creator with human review.
          </p>
        </div>
      </section>

      {/* Feature Section 1: Deterministic Matching */}
      <section className="px-6 py-20 bg-surface-container-low" id="how-it-works">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-on-primary mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="font-display text-2xl font-bold text-primary mb-4">100% Deterministic Matching</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Every scholarship result you see has passed through hard eligibility gates. If you do not meet the nationality requirement, the degree requirement, or the academic requirement, that scholarship does not appear in your results. We do not show you opportunities you cannot win.
              </p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-8 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-status-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-semibold text-on-surface">You are a Kenyan citizen</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-status-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-semibold text-on-surface">You hold a Bachelors degree</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-status-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-semibold text-on-surface">Your GPA meets the threshold</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-status-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-semibold text-on-surface">Your field matches program requirements</span>
                </div>
                <div className="mt-4 p-4 bg-primary-fixed/10 border border-primary/20 rounded-xl">
                  <p className="text-sm font-bold text-primary">You qualify for scholarships that match your profile</p>
                  <p className="text-xs text-on-surface-variant mt-1">Scholarships you do not qualify for are hidden.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2: No IELTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
            <div className="order-last md:order-first">
              <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="px-3 py-1 bg-status-success/10 border border-status-success/30 rounded-full">
                    <span className="text-xs font-black text-status-success">Save $250</span>
                  </div>
                  <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full">
                    <span className="text-xs font-black text-amber-600">Duolingo $60 OK</span>
                  </div>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Scholarships listed in Zawadi that accept Medium of Instruction certificates or the Duolingo English Test are clearly marked. Activate the No-IELTS filter to see only those opportunities.
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-on-surface-variant">
                  <svg className="w-4 h-4 text-status-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Medium of Instruction certificate accepted at 60% of partner scholarships</span>
                </div>
              </div>
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-secondary-container/20 text-secondary flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21l12-12M9 3l12 12" />
                </svg>
              </div>
              <h3 className="font-display text-2xl font-bold text-primary mb-4">No IELTS Required Filter</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                The IELTS exam costs $250, an amount that puts it out of reach for most African families. Zawadi filters for scholarships that accept a Medium of Instruction certificate from your school or the $60 Duolingo test instead. This single filter removes the biggest financial barrier standing between African students and global funding.
              </p>
            </div>
          </div>

          {/* Feature 3: AI Essay + Human Review */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <div className="w-12 h-12 rounded-xl bg-primary-fixed text-primary flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="font-display text-2xl font-bold text-primary mb-4">AI Essay Co-Creation With Human Review</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Generative AI helps you structure your statement of purpose. A trained peer mentor reviews the draft to make sure your authentic voice and cultural experience come through clearly. Scholarship committees fund people, not templates.
              </p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-8 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-primary">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">AI generates first draft</p>
                    <p className="text-xs text-on-surface-variant mt-1">Based on your background, motivations, and the scholarship criteria</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary-container/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-secondary">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Peer mentor reviews for voice</p>
                    <p className="text-xs text-on-surface-variant mt-1">A trained reviewer ensures your cultural perspective comes through</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-status-success/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-status-success">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">You submit with confidence</p>
                    <p className="text-xs text-on-surface-variant mt-1">Feedback returned within 48 hours</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 4: One Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-last md:order-first">
              <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-8 shadow-sm space-y-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-xl">track_changes</span>
                  <div>
                    <p className="text-sm font-bold text-primary">Track every application</p>
                    <p className="text-xs text-on-surface-variant">Deadlines, documents, and status in one place</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-secondary text-xl">auto_awesome</span>
                  <div>
                    <p className="text-sm font-bold text-primary">AI essay drafts</p>
                    <p className="text-xs text-on-surface-variant">Generate and refine essays tailored to each scholarship</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-status-info text-xl">folder</span>
                  <div>
                    <p className="text-sm font-bold text-primary">Document vault</p>
                    <p className="text-xs text-on-surface-variant">Upload once, reuse across every application</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-status-success text-xl">verified</span>
                  <div>
                    <p className="text-sm font-bold text-primary">Match scoring</p>
                    <p className="text-xs text-on-surface-variant">See exactly which scholarships fit your profile</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-secondary-container/20 text-secondary flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                </svg>
              </div>
              <h3 className="font-display text-2xl font-bold text-primary mb-4">One Dashboard for Every Application</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Track every scholarship you are pursuing from a single dashboard. Deadlines, document requirements, essay drafts, and application status all in one place. No spreadsheets. No missed deadlines.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-6 py-24 bg-primary text-on-primary text-center">
        <div className="max-w-[800px] mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-black mb-6">Ready to Find Scholarships You Qualify For?</h2>
          <p className="text-body-lg text-on-primary/80 mb-8 leading-relaxed">
            Zawadi is built for ambitious African students who are ready to apply but need a system that works as hard as they do. Create your profile in under three minutes and see which scholarships you qualify for today.
          </p>
          <button
            onClick={onGetStarted}
            className="bg-white text-primary hover:bg-primary-container hover:text-on-primary-fixed px-10 py-4 rounded-full font-bold transition-all duration-300 shadow-lg inline-flex items-center gap-2 cursor-pointer"
          >
            Create Your Profile
            <ArrowForward />
          </button>
        </div>
      </section>

      {/* Landing page FAQ */}
      <section id="faq" className="px-6 py-24 bg-surface-container-lowest">
        <div className="max-w-[960px] mx-auto">
          <h2 className="text-3xl font-display font-black text-primary mb-2">Frequently Asked Questions</h2>
          <p className="text-sm text-on-surface-variant mb-10">Quick answers to common questions about using Zawadi.</p>

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
