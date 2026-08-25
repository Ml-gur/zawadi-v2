import React from 'react';
import { ArrowForward } from './Icons';
import { GhostPillButton } from './ui';
import { SEO } from './SEO';
import { Breadcrumbs } from './Breadcrumbs';

interface HowItWorksPageProps {
  onBack: () => void;
  onGetStarted: () => void;
}

export default function HowItWorksPage({ onBack, onGetStarted }: HowItWorksPageProps) {

  const steps = [
    {
      number: 1,
      title: 'Create your academic profile in three minutes',
      description: 'Enter five core data points: date of birth, nationality, degree level, field of study, and normalized GPA. That is all our matching engine needs to unlock your personalized scholarship opportunities.'
    },
    {
      number: 2,
      title: 'See only scholarships you are 100% eligible to win',
      description: 'Our engine checks your profile against the exact fine print of every international and regional opportunity. Irrelevant scholarships are filtered out. You see a ranked list with transparency into why each award fits your profile.'
    },
    {
      number: 3,
      title: 'Filter for verified No-IELTS opportunities',
      description: 'If you do not have an IELTS score, activate the No-IELTS filter to surface scholarships that accept a Medium of Instruction certificate or the affordable Duolingo English Test. Eliminate testing cost barriers immediately.'
    },
    {
      number: 4,
      title: 'Build your application with AI essay studio',
      description: 'Select any scholarship to open the dedicated essay assistant. Input your background, goals, and leadership experiences to generate tailored statements of purpose that preserve your authentic scholar voice.'
    },
    {
      number: 5,
      title: 'Track deadlines and documents from one workspace',
      description: 'Store transcripts and test certificates in your encrypted Document Vault. Track live deadlines with countdown timers so you never miss an application window.'
    }
  ];

  return (
    <div className="bg-surface-container-lowest text-on-surface font-body min-h-[100dvh] antialiased">
      <SEO
        title="How Zawadi Works — Scholarship Matching for African Students"
        description="Create a profile in three minutes. See scholarships you qualify for. Build your application with AI that learns your writing style. Get mentor review before you submit."
        path="/how-it-works"
        image="https://www.techsari.online/og-how-it-works.png"
        ogTitle="How Zawadi Works — From Profile to Scholarship Application"
        ogDescription="Five steps from registration to submitted application. Zawadi handles eligibility filtering, essay drafting, and document tracking so African students can focus on applying."
      />
      <section className="px-4 md:px-10 py-16 md:py-24">
        <div className="max-w-[800px] mx-auto">
          <Breadcrumbs items={[{ name: 'How it works', path: '/how-it-works' }]} />

          <span className="font-eyebrow text-eyebrow uppercase tracking-wider text-graphite block mb-2">Step-by-Step Guide</span>
          <h1 className="font-display text-4xl md:text-5xl font-medium text-on-surface tracking-tight mb-4">How Techsari Zawadi Works</h1>
          <p className="font-body text-base md:text-lg text-secondary mb-14 max-w-2xl">
            From initial registration to verified submission. Five simple steps to discover and apply for scholarships you actually qualify for.
          </p>

          <div className="space-y-10">
            {steps.map((step) => (
              <div key={step.number} className="flex gap-6 p-6 md:p-8 rounded-card border border-outline-variant bg-surface-container-low transition-all hover:bg-surface-container">
                <div className="w-12 h-12 rounded-full bg-primary-container text-on-surface flex items-center justify-center font-headline font-bold text-xl shrink-0 shadow-xs">
                  {step.number}
                </div>
                <div className="pt-1 flex flex-col gap-2">
                  <h2 className="font-headline text-xl md:text-2xl font-medium text-on-surface tracking-tight">{step.title}</h2>
                  <p className="font-body text-base text-secondary leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <button
              onClick={onGetStarted}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-primary-container text-on-surface font-subheading text-base font-medium hover:bg-primary-fixed active:scale-[0.98] transition-all shadow-sm cursor-pointer"
            >
              <span>Create Free Account</span>
              <ArrowForward />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
