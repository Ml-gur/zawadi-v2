import React from 'react';
import { ArrowForward } from './Icons';
import { SEO } from './SEO';

interface HowItWorksPageProps {
  onBack: () => void;
  onGetStarted: () => void;
}

export default function HowItWorksPage({ onBack, onGetStarted }: HowItWorksPageProps) {

  const steps = [
    {
      number: 1,
      title: 'Create your profile in three minutes',
      description: 'Enter five data points: your date of birth, nationality, degree level, field of study, and GPA. That is all we need to start matching you to scholarships you qualify for.'
    },
    {
      number: 2,
      title: 'See only scholarships you are eligible to win',
      description: 'Our matching engine checks your profile against the exact requirements of every scholarship in our database. Scholarships you do not qualify for are filtered out entirely. You see a ranked list of real opportunities with a match score explaining why each one fits your profile.'
    },
    {
      number: 3,
      title: 'Filter for No-IELTS opportunities',
      description: 'If you do not have an IELTS score, activate the No-IELTS filter to show only scholarships that accept a Medium of Instruction certificate or the Duolingo English Test. This removes the $250 language testing barrier immediately.'
    },
    {
      number: 4,
      title: 'Build your application with AI assistance',
      description: 'Select a scholarship and open the essay co-creator. Enter notes about your background, motivations, and research interests. The AI generates a structured first draft of your statement of purpose. A peer mentor reviews the draft and returns feedback within 48 hours.'
    },
    {
      number: 5,
      title: 'Track every application from one dashboard',
      description: 'Save each scholarship you decide to pursue. The application tracker follows your progress from initial research through to submission, interview, and award. Deadlines are tracked automatically so nothing is missed.'
    }
  ];

  return (
    <div className="bg-background text-on-background min-h-screen">
      <SEO
        title="How Zawadi Works — Scholarship Matching for African Students"
        description="Create a profile in three minutes. See scholarships you qualify for. Build your application with AI that learns your writing style. Get mentor review before you submit."
        path="/how-it-works"
        ogTitle="How Zawadi Works — From Profile to Scholarship Application"
        ogDescription="Four steps from registration to submitted application. Zawadi handles eligibility filtering, essay drafting, and human mentor review so African students can focus on applying."
      />
      <section className="px-6 py-20 md:py-24">
        <div className="max-w-[800px] mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors mb-8 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>

          <h1 className="text-3xl md:text-5xl font-display font-black text-primary mb-4">How Zawadi Works</h1>
          <p className="text-body-lg text-on-surface-variant mb-12 max-w-2xl">
            From profile creation to application submission. Five steps to find and apply for scholarships you actually qualify for.
          </p>

          <div className="space-y-12">
            {steps.map((step) => (
              <div key={step.number} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center font-display font-black text-lg shrink-0">
                    {step.number}
                  </div>
                  {step.number < 5 && (
                    <div className="w-0.5 flex-1 bg-outline-variant/40 mt-2"></div>
                  )}
                </div>
                <div className="pt-2">
                  <h2 className="font-display text-xl font-bold text-primary mb-2">{step.title}</h2>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <button
              onClick={onGetStarted}
              className="bg-secondary-container text-on-secondary-fixed hover:bg-secondary-fixed px-10 py-4 rounded-full font-semibold transition-all duration-300 shadow-md inline-flex items-center gap-2 cursor-pointer"
            >
              Create Your Profile
              <ArrowForward />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
