import React, { useState } from 'react';
import { SEO } from './SEO';

interface FAQPageProps {
  onBack: () => void;
}

const faqData = [
  {
    category: "Eligibility & Matching",
    items: [
      { q: "How does Zawadi decide which scholarships to show me?", a: "When you create a profile, you enter your nationality, current degree level, field of study, and GPA. Our matching engine checks these four data points against the exact eligibility requirements of every scholarship in our database. You only see scholarships where you meet 100 percent of the criteria. We do not show you awards you are unlikely to win." },
      { q: "Which African countries does Zawadi cover?", a: "All 54 African countries. Our scholarship database and matching engine cover students from every country on the continent including francophone, anglophone, lusophone, and Arabic-speaking nations." },
      { q: "I am a first-year undergraduate student. Are there scholarships for me?", a: "Yes. Our database includes undergraduate scholarships alongside postgraduate and research funding. Use the degree level filter to show only undergraduate opportunities." }
    ]
  },
  {
    category: "IELTS & Language Requirements",
    items: [
      { q: "Do I need to take the IELTS to apply for scholarships on Zawadi?", a: "No. Zawadi has a No-IELTS filter that shows you scholarships accepting a Medium of Instruction certificate from your secondary school or university, or the Duolingo English Test which costs $60. You do not need to pay $250 for IELTS to use this platform or to qualify for the scholarships we list." },
      { q: "What is a Medium of Instruction certificate?", a: "A Medium of Instruction certificate is a letter from your school or university confirming that your classes were conducted in English. Many scholarship providers accept this in place of an IELTS score. You can request it from your institution's registrar office, usually at no cost." },
      { q: "Can I submit my Duolingo English Test score instead of IELTS?", a: "Yes. The Duolingo English Test costs $60, is taken online from your home, and results are available within 48 hours. Many scholarships in our database accept Duolingo scores. Use the No-IELTS filter to find them." }
    ]
  },
  {
    category: "Pricing & Data Privacy",
    items: [
      { q: "Is Zawadi free for students?", a: "The core matching, filtering, and application tracking features are free on the Explorer plan. Premium features including unlimited essay generation and priority mentor review are available on paid plans. We will never sell your personal data to third parties." },
      { q: "Does Zawadi share my personal data with scholarship providers or advertisers?", a: "No. We do not sell student data. Our business model is built on subscription plans and institutional partnerships, not on monetizing your personal information." },
      { q: "How much do paid plans cost?", a: "Scholar Plus: $5/month — 10 essays/day, 50 documents, detailed match scores, basic AI document intelligence. Application Pro: $12/month — 25 essays/day, unlimited documents, auto-apply engine, essay voice learning, full AI document intelligence. Zawadi Institutional: custom pricing for universities and NGOs — unlimited everything, dedicated support. All prices shown in USD. Payments processed via Paystack." }
    ]
  },
  {
    category: "AI Essay Tool",
    items: [
      { q: "How does the AI essay tool work?", a: "You select the scholarship you are applying for, enter notes about your background and motivations, and the AI generates a structured first draft of your statement of purpose. A peer mentor then reviews the draft to make sure it reflects your authentic voice before you submit." },
      { q: "Are the essays written entirely by AI?", a: "No. The AI produces a first draft based on your input. A trained peer mentor reviews that draft to ensure your authentic voice and cultural experience come through. We do not send AI-generated text directly to scholarship committees." },
      { q: "What types of essays can the tool generate?", a: "Personal Statement, Statement of Purpose, Motivation Letter, Leadership Essay, Study Plan, and Research Proposal." }
    ]
  },
  {
    category: "Application Tracking",
    items: [
      { q: "Can I track multiple scholarship applications at once?", a: "Yes. The application tracker lets you manage every scholarship you are pursuing from a single dashboard. You can update your status at each stage from saved through to awarded or rejected, add notes, and set priority levels." },
      { q: "What documents do I need to apply for scholarships?", a: "Most scholarships require academic transcripts, a CV, a statement of purpose, and proof of English proficiency. Some require recommendation letters. The document checklist on each scholarship page shows exactly what is required and whether you have already uploaded each item to your vault." }
    ]
  },
  {
    category: "Getting Started",
    items: [
      { q: "How long does it take to set up a profile and see my first matches?", a: "Under three minutes. The profile setup wizard asks for five data points: your date of birth, nationality, degree level, field of study, and GPA. As soon as you complete the wizard your match results appear." },
      { q: "Does Zawadi work on mobile?", a: "Yes. Zawadi is fully responsive and works on phones, tablets, and desktops. You can also install it as a Progressive Web App for a native app-like experience." },
      { q: "Do I need to install anything?", a: "No. Zawadi is a web application — just visit in your browser. It works on desktop and mobile. For offline access, you can install it as a PWA." }
    ]
  }
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqData.flatMap(cat => cat.items).map(item => ({
    "@type": "Question",
    "name": item.q,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": item.a
    }
  }))
};

export default function FAQPage({ onBack }: FAQPageProps) {
  const [search, setSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const lowerSearch = search.toLowerCase();

  const filtered = faqData
    .map(cat => ({
      ...cat,
      items: cat.items.filter(
        item =>
          item.q.toLowerCase().includes(lowerSearch) ||
          item.a.toLowerCase().includes(lowerSearch)
      )
    }))
    .filter(cat => cat.items.length > 0);

  return (
    <div className="min-h-screen bg-surface-container-lowest">
      <SEO
        title="Scholarship FAQs for African Students — Zawadi"
        description="Answers to common questions African students ask about finding scholarships, IELTS requirements, AI essay help, and how Zawadi matching works."
        path="/faq"
        image="https://techsari.online/og-faq.png"
        schema={faqSchema}
      />
      <div className="max-w-[960px] mx-auto px-6 py-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors mb-8 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </button>

        <h1 className="font-display text-4xl font-black text-primary mb-2">
          Frequently Asked Questions
        </h1>
        <p className="text-sm text-on-surface-variant mb-8">
          Common questions about Zawadi, the No-IELTS filter, and how our eligibility matching works. Can't find what you're looking for?{' '}
          <a href="mailto:hello@techsari.online" className="text-secondary hover:underline">
            Contact us
          </a>.
        </p>

        <div className="relative mb-10">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="w-full p-4 pl-12 bg-surface border border-outline-variant/60 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant hover:text-primary cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg text-on-surface-variant mb-2">No results found for "{search}"</p>
            <p className="text-xs text-outline">Try different keywords or browse the categories below.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {filtered.map((cat, catIdx) => (
              <div key={catIdx}>
                <h2 className="text-xs font-black text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  {cat.category}
                </h2>
                <div className="space-y-2">
                  {cat.items.map((faq, idx) => {
                    const faqId = `${catIdx}-${idx}`;
                    const isOpen = openFaq === faqId;
                    return (
                      <div key={faqId} className={`border rounded-2xl transition-all duration-300 overflow-hidden ${isOpen ? 'bg-primary-fixed/5 border-primary shadow-md translate-y-[-2px]' : 'bg-surface border-outline-variant/30 hover:border-outline-variant hover:shadow-sm'}`}>
                        <button
                          onClick={() => setOpenFaq(isOpen ? null : faqId)}
                          className="w-full flex justify-between items-center p-5 text-left select-none outline-none focus:outline-none cursor-pointer group"
                          aria-expanded={isOpen}
                        >
                          <span className={`font-black text-xs uppercase tracking-wide transition-colors duration-200 ${isOpen ? 'text-primary' : 'text-on-surface'}`}>
                            {faq.q}
                          </span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${isOpen ? 'bg-primary/10 border-primary text-primary rotate-180' : 'border-outline-variant/70 text-on-surface-variant group-hover:bg-surface-container'}`}>
                            <svg className="w-4 h-4 text-inherit" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 border-t border-outline-variant/20' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                          <div className="p-5 text-xs text-on-surface-variant leading-relaxed font-light whitespace-pre-line bg-surface-container-lowest/50">
                            {faq.a}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-16 text-center border-t border-outline-variant/20 pt-8">
          <p className="text-xs text-on-surface-variant">
            Still have questions? <a href="mailto:hello@techsari.online" className="text-secondary hover:underline">hello@techsari.online</a>
          </p>
        </div>
      </div>
    </div>
  );
}
