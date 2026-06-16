import React from 'react';
import { SEO } from './SEO';

interface AboutPageProps {
  onBack?: () => void;
}

export default function AboutPage({ onBack }: AboutPageProps) {
  return (
    <div className="bg-background text-on-background min-h-screen">
      <SEO
        title="About Zawadi — Scholarship Platform Built for African Students"
        description="Zawadi was built to fix the scholarship access gap for African students. We filter out irrelevant results, remove the IELTS barrier, and pair AI essay tools with human mentor review."
        path="/about"
        ogTitle="About Zawadi — Built for African Students"
        ogDescription="Most scholarship platforms sell student data to advertisers. Zawadi does not. We match students to funding they qualify for and help them apply without wasting time on irrelevant results."
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

          <h1 className="text-3xl md:text-5xl font-display font-black text-primary mb-8">About Zawadi</h1>

          <div className="space-y-6 text-sm text-on-surface-variant leading-relaxed">
            <p>
              Every year, billions of dollars in scholarship funding go unclaimed. Not because African students are unqualified. Because the tools built to help them apply were never designed with African students in mind. Mass scholarship directories built for the American market flood users with irrelevant results, collect their personal data, and sell it to textbook publishers and for-profit colleges. African students get spam. The scholarships go unfilled.
            </p>

            <p>
              Zawadi was built to fix the specific barriers that keep qualified African students from applying. The $250 IELTS requirement that eliminates candidates before they can even start. The absence of guidance on how to write a compelling statement of purpose when your culture does not encourage self-promotion. The tool fatigue of managing five different portals, three email accounts, and a spreadsheet of deadlines. These are not small inconveniences. They are the reasons scholarships go unclaimed.
            </p>

            <p>
              The platform uses a deterministic matching engine that checks a student's profile against the exact fine print of every scholarship requirement. If you do not qualify, the scholarship does not appear. When you do qualify, you get an AI co-creation tool to help you draft your application essay and a peer mentor to review it before you submit. All your documents live in one vault. All your applications track in one dashboard.
            </p>

            <p>
              Our minimum viable segment is high-achieving, first-generation African high school graduates and early-career researchers who are actively seeking funding but cannot afford private consultants or expensive standardized testing. We exist to give those students the same quality of guidance that wealthy students pay thousands of dollars for, at no cost to the student.
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-outline-variant/20">
            <p className="text-base font-display font-bold text-primary leading-relaxed">
              Zawadi's mission is to shift the scholarship industry from exploiting students to equipping them.
            </p>
          </div>

          <div className="mt-12 p-6 bg-surface border border-outline-variant/30 rounded-2xl">
            <p className="text-xs text-on-surface-variant">
              <strong className="text-primary">Contact:</strong>{' '}
              <a href="mailto:hello@techsari.online" className="text-secondary hover:underline">hello@techsari.online</a>
              {' | '}Nairobi, Kenya
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
