import React from 'react';
import { SEO } from './SEO';
import { Breadcrumbs } from './Breadcrumbs';

interface AboutPageProps {
  onBack?: () => void;
}

export default function AboutPage({ onBack }: AboutPageProps) {
  return (
    <div className="bg-surface-container-lowest text-on-surface font-body min-h-[100dvh]">
      <SEO
        title="About Zawadi — Scholarship Platform Built for African Students"
        description="Zawadi was built to fix the scholarship access gap for African students. We filter out irrelevant results, remove the IELTS barrier, and pair AI essay tools with human mentor review."
        path="/about"
        image="https://www.techsari.online/og-about.png"
        ogTitle="About Zawadi — Built for African Students"
        ogDescription="Most scholarship platforms sell student data to advertisers. Zawadi does not. We match students to funding they qualify for and help them apply without wasting time on irrelevant results."
      />
      <section className="px-4 md:px-10 py-16 md:py-24">
        <div className="max-w-[840px] mx-auto">
          <Breadcrumbs items={[{ name: 'About', path: '/about' }]} />

          <span className="font-eyebrow text-eyebrow uppercase tracking-wider text-graphite block mb-2">Our Mission</span>
          <h1 className="font-display text-4xl md:text-5xl font-medium tracking-tight text-on-surface mb-8">About Techsari Zawadi</h1>

          <div className="space-y-6 font-body text-base text-secondary leading-relaxed">
            <p>
              Every year, billions of dollars in scholarship funding go unclaimed. Not because African students are unqualified, but because the tools built to help them apply were never designed with African students in mind. Mass scholarship directories flood users with irrelevant results, collect personal data, and sell it to textbook publishers and for-profit colleges. African students get spam, while life-changing scholarships go unfilled.
            </p>

            <p>
              Zawadi was built to dismantle the specific structural barriers that keep qualified African scholars from applying: the prohibitive $250 IELTS examination requirement that blocks candidates before they begin, the lack of structured guidance on articulating impact in statements of purpose, and the cognitive overhead of managing multiple portals, fragmented deadlines, and unverified criteria.
            </p>

            <p>
              Our platform pairs a deterministic matching engine with automated document parsing and AI essay co-creation. You only see opportunities for which you satisfy 100% of the fine-print criteria. All your transcripts, test waivers, and drafts remain organized in one encrypted Document Vault, tracked seamlessly in your personal workspace.
            </p>

            <p>
              We exist to give high-achieving African researchers and students the same world-class application guidance that wealthy international students pay thousands of dollars for—democratizing access to higher education across the continent.
            </p>
          </div>

          <div className="mt-12 p-8 bg-parchment rounded-card border border-ash">
            <p className="font-headline text-xl font-medium text-deep-charcoal leading-relaxed">
              "Zawadi's mission is to transform the scholarship discovery experience from exploiting student data to actively equipping African leaders."
            </p>
          </div>

          <div className="mt-8 p-6 bg-surface-container-low border border-outline-variant rounded-xl flex items-center justify-between flex-wrap gap-4">
            <p className="font-body text-sm text-secondary">
              <strong className="text-on-surface">Headquarters:</strong> Nairobi, Kenya
            </p>
            <p className="font-body text-sm text-secondary">
              <strong className="text-on-surface">Direct Contact:</strong>{' '}
              <a href="mailto:hello@techsari.online" className="text-primary font-medium underline hover:text-primary-container transition-colors">hello@techsari.online</a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
