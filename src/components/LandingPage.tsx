import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Scholarship, UserProfile } from '../types';
import { SEO } from './SEO';
import { useCompare } from './compare/useCompare';
import CompareModal from './compare/CompareModal';
import Hero from './landing/Hero';
import FeatureBento from './landing/FeatureBento';
import QuickCheck from './landing/QuickCheck';
import ValueCalculator from './landing/ValueCalculator';
import FeaturedOpportunities from './landing/FeaturedOpportunities';
import ScholarStories from './landing/ScholarStories';
import LimeBreakout from './landing/LimeBreakout';
import FaqSection from './landing/FaqSection';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  countries: string[];
  onViewAllFAQs?: () => void;
  user?: UserProfile | null;
}

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Techsari",
  "url": "https://www.techsari.online",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Techsari",
  "url": "https://www.techsari.online",
};

const FAQS = [
  {
    q: 'Do I need IELTS to apply through Techsari?',
    a: 'No. The No-IELTS filter surfaces scholarships that accept a Medium-of-Instruction certificate or the $60 Duolingo English Test.',
  },
  {
    q: 'Is Techsari free for students?',
    a: 'Matching, filtering and application tracking are free on the Explorer plan. Your data is never sold — that is written into our terms, not just promised.',
  },
  {
    q: 'How does matching actually work?',
    a: 'A deterministic engine checks your nationality, degree level, field of study and GPA against every listing\'s exact criteria. No generative guessing — if it says you qualify, you qualify.',
  },
  {
    q: 'How fast do I see my first matches?',
    a: 'Under three minutes. Complete the profile wizard and your ranked matches appear immediately.',
  },
];

export default function LandingPage({ onGetStarted, onLogin, countries, onViewAllFAQs, user }: LandingPageProps) {
  const [featured, setFeatured] = useState<Scholarship[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const { ids: compareIds, open: compareOpen, setOpen: setCompareOpen, toggle: toggleCompare } = useCompare();

  const comparedScholarships = featured.filter(s => compareIds.has(s.id));

  useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('scholarships')
      .select('id, name, provider, host_region, host_institution, funding_type, deadline, no_ielts, degree_levels, countries, fields_of_study, urgency, iso2, published, description, eligibility, amount, required_documents, apply_url, source_url, slug, created_at')
      .eq('published', true)
      .or(`deadline.is.null,deadline.gte.${today}`)
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(9)
      .then(({ data, error }) => {
        if (!cancelled && !error && data) {
          // Strict client-side filter: closed scholarships never appear on homepage
          const openSchols = (data as unknown as Scholarship[]).filter(s => {
            if (!s.deadline) return true;
            return s.deadline >= today;
          });
          setFeatured(openSchols);
        }
        if (!cancelled) setFeaturedLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div id="landing-root" className="bg-pure-white text-off-black-ink min-h-[100dvh]">
      <SEO
        title="Techsari — Scholarship Matching for African Students"
        description="Find scholarships you are eligible to win across all 54 African countries. Strict eligibility filtering removes scholarships you do not qualify for. No IELTS required options included."
        keywords="scholarships for African students, Africa scholarship matching, no IELTS scholarships Africa, fully funded scholarships Africa, scholarship application Africa"
        path="/"
        image="https://www.techsari.online/og-home.png"
        ogTitle="Techsari — Find Scholarships You Actually Qualify For"
        ogDescription="Strict eligibility matching for African students. See only scholarships where you meet every requirement. No spam. No data selling. No IELTS barrier."
        schema={[websiteSchema, organizationSchema]}
      />


      <main>
        <Hero onGetStarted={onGetStarted} onLogin={onLogin} countriesCount={countries.length} />
        <FeatureBento />
        <QuickCheck countries={countries} />
        <ValueCalculator />
        <FeaturedOpportunities
          scholarships={featured}
          loading={featuredLoading}
          compareIds={compareIds}
          onToggleCompare={toggleCompare}
          onOpenCompare={() => setCompareOpen(true)}
        />
        <ScholarStories />
        <LimeBreakout onGetStarted={onGetStarted} />
        <FaqSection faqs={FAQS} onViewAllFAQs={onViewAllFAQs} />
      </main>

      <CompareModal
        open={compareOpen}
        scholarships={comparedScholarships}
        onRemove={toggleCompare}
        onClose={() => setCompareOpen(false)}
      />

    </div>
  );
}
