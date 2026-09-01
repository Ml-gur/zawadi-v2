import React, { useState } from 'react';
import { SEO } from './SEO';
import { Breadcrumbs } from './Breadcrumbs';

interface FAQPageProps {
  onBack: () => void;
}

const faqData = [
  {
    category: "Eligibility & Matching",
    items: [
      { q: "How does Techsari decide which scholarships to show me?", a: "When you create a profile, you enter your nationality, current degree level, field of study, and GPA. Our matching engine checks these four data points against the exact eligibility requirements of every scholarship in our database. You only see scholarships where you meet 100 percent of the criteria. We do not show you awards you are unlikely to win." },
      { q: "Which African countries does Techsari cover?", a: "All 54 African countries. Our scholarship database and matching engine cover students from every country on the continent including francophone, anglophone, lusophone, and Arabic-speaking nations." },
      { q: "I am a first-year undergraduate student. Are there scholarships for me?", a: "Yes. Our database includes undergraduate scholarships alongside postgraduate and research funding. Use the degree level filter to show only undergraduate opportunities." }
    ]
  },
  {
    category: "IELTS & Language Requirements",
    items: [
      { q: "Do I need IELTS to apply for scholarships on Techsari?", a: "It depends on the scholarship — and we record the exact requirement for every listing. Many accept a Medium of Instruction certificate from your school or university, or the Duolingo English Test ($60, online, results in 48 hours). Some require IELTS. Use the No-IELTS filter to see only scholarships with confirmed alternatives, and check the English requirement shown on each listing before paying for any test." },
      { q: "What is a Medium of Instruction certificate?", a: "A Medium of Instruction certificate is a letter from your school or university confirming that your classes were conducted in English. Many scholarship providers accept this in place of an IELTS score. You can request it from your institution's registrar office, usually at no cost." },
      { q: "Can I submit my Duolingo English Test score instead of IELTS?", a: "Yes. The Duolingo English Test costs $60, is taken online from your home, and results are available within 48 hours. Many scholarships in our database accept Duolingo scores. Use the No-IELTS filter to find them." }
    ]
  },
  {
    category: "Pricing & Data Privacy",
    items: [
      { q: "Is Techsari free for students?", a: "The core matching, filtering, and application tracking features are free on the Explorer plan. Premium features including unlimited essay generation and priority mentor review are available on paid plans. We will never sell your personal data to third parties." },
      { q: "Does Techsari share my personal data with scholarship providers or advertisers?", a: "No. We do not sell student data. Our business model is built on subscription plans and institutional partnerships, not on monetizing your personal information." },
      { q: "How much do paid plans cost?", a: "Scholar Plus: $5/month — 10 essays/day, 50 document vault uploads, detailed match scores. Application Pro: $12/month — 25 essays/day, unlimited documents, auto-apply engine, essay voice learning. Techsari Institutional: custom pricing for universities and NGOs — unlimited everything, dedicated support. All prices shown in USD. Payments processed via Paystack." }
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
      { q: "What documents do I need to apply for scholarships?", a: "Most scholarships require academic transcripts, a CV, a statement of purpose, and proof of English proficiency. Some require recommendation letters. The document checklist on each scholarship page shows exactly what is required — you can store them in your Document Vault for safekeeping." }
    ]
  },
  {
    category: "Getting Started",
    items: [
      { q: "How long does it take to set up a profile and see my first matches?", a: "Under three minutes. The profile setup wizard asks for five data points: your date of birth, nationality, degree level, field of study, and GPA. As soon as you complete the wizard your match results appear." },
      { q: "Does Techsari work on mobile?", a: "Yes. Techsari is fully responsive and works on phones, tablets, and desktops. You can also install it as a Progressive Web App for a native app-like experience." },
      { q: "Do I need to install anything?", a: "No. Techsari is a web application — just visit in your browser. It works on desktop and mobile. For offline access, you can install it as a PWA." }
    ]
  },
  {
    category: "Scams, Costs & Timelines",
    items: [
      { q: "Do I ever have to pay to apply for a scholarship?", a: "No. Legitimate scholarships are free to apply for. Any 'registration', 'processing' or 'refundable' fee is the classic scam signal flagged by universities and consumer agencies alike. Every listing on Techsari links to the official source so you can verify before you act." },
      { q: "Can I get a fully funded scholarship without IELTS?", a: "Yes. Programs such as Türkiye Burslari, MEXT Japan, CSC China, GKS Korea and Stipendium Hungaricum accept alternatives like Medium-of-Instruction letters, interviews, Duolingo, or a funded language-prep year. Use our No-IELTS filter to surface them." },
      { q: "Does DAAD accept an MOI letter instead of IELTS?", a: "It varies by course. DAAD's standard EPOS requirement is IELTS band 6 or TOEFL 80, but some courses accept alternatives — always confirm with the specific program page. Our listings carry the exact English requirement per grant." },
      { q: "What are the basic Chevening requirements?", a: "Citizenship of an eligible country, an undergraduate degree, at least 2,800 hours (about two years) of post-degree work experience, three UK course choices with one unconditional offer, and a commitment to return home for two years after the award." },
      { q: "What does 'fully funded' actually cover?", a: "Typically full tuition plus a monthly stipend, airfare and health insurance. Beware 'tuition-only' awards — living costs abroad make them unaffordable without extra funding. Our listings show the coverage breakdown so nothing surprises you on arrival." },
      { q: "Can I apply for several scholarships at the same time?", a: "Yes, and you should. Successful applicants typically run five to eight tailored applications per cycle across competitive and moderately competitive programs. The application tracker keeps every pipeline stage in one place." },
      { q: "How do I convert KCSE or WAEC grades to a US GPA?", a: "Use letter-grade mapping rather than raw percentages — for example, WAEC A1 (75–100%) maps to 4.0 and C6 to about 2.3. Strict African marking scales otherwise understate your record when read as plain percentages." },
      { q: "How do I know if a scholarship offer is fake?", a: "Verify independently: find the provider's official domain yourself, confirm the award exists through contacts listed there, and never pay or share bank or OTP details to 'release' an award. Real sponsors never use personal mobile-money or WhatsApp accounts." },
      { q: "When should I start applying for next year's intake?", a: "Start 12 months ahead. Most deadlines cluster between October and February — Chevening in November, Erasmus Mundus October to January, Türkiye in February, CSC March to April — and transcripts take weeks to obtain." }
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
    <div className="min-h-[100dvh] bg-surface-container-lowest text-on-surface font-body antialiased">
      <SEO
        title="Scholarship FAQ for African Students — Techsari Techsari"
        description="Answers to common questions about finding scholarships as an African student. Covers IELTS alternatives, eligibility matching, how to apply, and which countries qualify."
        path="/faq"
        image="https://www.techsari.online/og-faq.png"
        ogTitle="Scholarship FAQ for African Students — Techsari Techsari"
        ogDescription="Common questions about scholarships for African students. IELTS requirements, application tips, eligibility criteria, and how the Techsari matching system works."
        schema={faqSchema}
      />
      <div className="max-w-[960px] mx-auto px-6 py-12">
        <Breadcrumbs items={[{ name: 'FAQ', path: '/faq' }]} />

        <span className="font-eyebrow text-eyebrow uppercase tracking-wider text-graphite block mb-2">Knowledge Base</span>
        <h1 className="font-display text-4xl md:text-5xl font-medium text-on-surface tracking-tight mb-3">
          Frequently Asked Questions
        </h1>
        <p className="font-body text-base text-secondary mb-8">
          Answers to common questions about Techsari, IELTS alternatives, and the matching engine. Need personalized guidance?{' '}
          <a href="mailto:hello@techsari.online" className="text-primary font-medium underline hover:text-primary-fixed transition-colors">
            Contact support
          </a>.
        </p>

        <div className="relative mb-10">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search questions across eligibility, IELTS, pricing, essays..."
            className="w-full p-4 pl-12 bg-surface-container-low border border-outline-variant rounded-xl font-body text-sm text-on-surface placeholder:text-secondary focus:border-primary focus:ring-1 focus:ring-primary/40 outline-none transition-colors"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-secondary hover:text-on-surface cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-surface-container-low rounded-card border border-outline-variant">
            <p className="font-headline text-lg font-medium text-on-surface mb-2">No results found for "{search}"</p>
            <p className="font-body text-sm text-secondary">Try different keywords or browse the categories below.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {filtered.map((cat, catIdx) => (
              <div key={catIdx}>
                <h2 className="font-headline text-lg font-medium text-on-surface uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  {cat.category}
                </h2>
                <div className="space-y-3">
                  {cat.items.map((faq, idx) => {
                    const faqId = `${catIdx}-${idx}`;
                    const isOpen = openFaq === faqId;
                    return (
                      <div
                        key={faqId}
                        className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                          isOpen ? 'bg-surface-container-low border-primary/40 shadow-xs' : 'bg-surface-container-lowest border-outline-variant hover:border-outline'
                        }`}
                      >
                        <button
                          onClick={() => setOpenFaq(isOpen ? null : faqId)}
                          className="w-full flex justify-between items-center p-5 md:p-6 text-left select-none outline-none focus:outline-none cursor-pointer group hover:bg-surface-container-low/50 transition-colors"
                          aria-expanded={isOpen}
                        >
                          <span className={`font-headline text-base font-medium transition-colors duration-200 ${isOpen ? 'text-primary' : 'text-on-surface'} group-hover:text-primary`}>
                            {faq.q}
                          </span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 shrink-0 ml-4 ${isOpen ? 'border-primary bg-primary-container text-on-surface rotate-180' : 'border-outline-variant text-secondary group-hover:border-primary group-hover:text-primary'}`}>
                            <svg className="w-4 h-4 text-inherit" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100 border-t border-outline-variant/60' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                          <div className="p-5 md:p-6 font-body text-sm text-secondary leading-relaxed whitespace-pre-line bg-surface-container-lowest/50">
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

        <div className="mt-16 text-center border-t border-outline-variant pt-8">
          <p className="font-body text-sm text-secondary">
            Still have questions? <a href="mailto:hello@techsari.online" className="text-primary font-medium underline hover:text-primary-fixed transition-colors">hello@techsari.online</a>
          </p>
        </div>
      </div>
    </div>
  );
}
