import React from 'react';
import { SEO } from './SEO';

interface TermsOfServiceProps {
  onBack?: () => void;
}

export default function TermsOfService({ onBack }: TermsOfServiceProps) {
  return (
    <div className="bg-background text-on-background min-h-screen">
      <SEO
        title="Terms of Service — Techsari Zawadi"
        description="Techsari Zawadi Terms of Service — the terms governing your use of our AI-powered scholarship platform for African students."
        path="/terms"
      />
      <section className="px-6 py-20 md:py-24">
        <div className="max-w-[800px] mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-primary hover:text-secondary mb-8 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Home
          </button>

          <h1 className="text-3xl md:text-5xl font-display font-black text-primary mb-2">Terms of Service</h1>
          <p className="text-sm text-on-surface-variant mb-8">Last updated: May 27, 2026</p>

          <div className="prose prose-sm max-w-none space-y-8 text-on-surface-variant leading-relaxed">

            <Section title="1. Acceptance of Terms">
              <p>By accessing or using Techsari Zawadi ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
            </Section>

            <Section title="2. Description of Service">
              <p>Zawadi is a scholarship discovery and application management platform. We provide AI-powered tools including scholarship matching, essay generation, document management, and application tracking. The Service is provided on a freemium basis with paid subscription tiers.</p>
              <p className="text-status-warning font-semibold">Zawadi does NOT:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Guarantee scholarship awards</li>
                <li>Submit applications on your behalf without your review</li>
                <li>Replace official scholarship application processes</li>
                <li>Provide financial aid, loans, or direct funding</li>
              </ul>
            </Section>

            <Section title="3. User Accounts">
              <ul className="list-disc pl-6 space-y-2">
                <li>You must provide accurate and complete registration information</li>
                <li>You are responsible for maintaining the confidentiality of your password</li>
                <li>You must be at least 16 years old to use the Service</li>
                <li>One account per person; shared accounts are prohibited</li>
                <li>You are responsible for all activity under your account</li>
                <li>We reserve the right to suspend or terminate accounts that violate these terms</li>
              </ul>
            </Section>

            <Section title="4. Acceptable Use">
              <p>You agree NOT to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to any part of the Service</li>
                <li>Use automated tools to scrape, harvest, or extract data without permission</li>
                <li>Upload malicious content or attempt to disrupt the Service</li>
                <li>Generate essays for fraudulent applications or misrepresentation</li>
                <li>Resell or redistribute AI-generated content as your own AI service</li>
                <li>Use the Service to spam or harass others</li>
                <li>Impersonate any person or entity</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
            </Section>

            <Section title="5. AI-Generated Content">
              <ul className="list-disc pl-6 space-y-2">
                <li>AI-generated essays are tools to <strong>assist</strong> your application. You remain responsible for the final content submitted to scholarship providers</li>
                <li>We do not guarantee that AI-generated essays will result in scholarship awards</li>
                <li>You should <strong>review and personalize</strong> all AI-generated content before submission</li>
                <li>AI-generated content may contain errors or inaccuracies — always verify</li>
                <li>Some scholarship providers may have policies regarding AI-assisted applications. It is your responsibility to comply</li>
              </ul>
            </Section>

            <Section title="6. Scholarship Listings">
              <ul className="list-disc pl-6 space-y-2">
                <li>We strive to verify all scholarship listings, but we cannot guarantee 100% accuracy</li>
                <li>Deadlines, eligibility criteria, and application links may change — always verify on the official website</li>
                <li>We are not responsible for the content or practices of external websites linked from our platform</li>
                <li>"Apply Now" links direct you to official scholarship pages; Zawadi does not process applications directly</li>
              </ul>
            </Section>

            <Section title="7. Payments & Subscriptions">
              <ul className="list-disc pl-6 space-y-2">
                <li>Paid plans are billed monthly or annually via Paystack</li>
                <li>Payments are processed in Kenyan Shillings (KES) at the displayed rate</li>
                <li>Prices displayed in USD are approximate; actual charges are in KES</li>
                <li>Subscription fees are <strong>non-refundable</strong> except as required by law</li>
                <li>You may cancel your subscription at any time. Access continues until the end of the current billing period</li>
                <li>We reserve the right to change pricing with <strong>30 days notice</strong></li>
                <li>Failed payments may result in downgrade to the free Explorer plan</li>
              </ul>
            </Section>

            <Section title="8. Intellectual Property">
              <ul className="list-disc pl-6 space-y-2">
                <li>The Zawadi platform, including its code, design, branding, and name, is owned by Techsari</li>
                <li>Scholarship listings are curated from publicly available information</li>
                <li>You retain ownership of your uploaded documents and application data</li>
                <li>AI-generated essays: You own the content you create using our tools, subject to our right to use anonymized data for service improvement</li>
                <li>You grant Zawadi a limited license to store and process your content solely to provide the Service</li>
              </ul>
            </Section>

            <Section title="9. Limitation of Liability">
              <p>Zawadi is provided <strong>"as is"</strong> and <strong>"as available."</strong> We do not guarantee:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>That scholarship listings are always accurate or current (though we strive to verify)</li>
                <li>That you will be awarded any scholarship</li>
                <li>That the Service will be uninterrupted or error-free</li>
                <li>That AI-generated content will be suitable for your specific needs</li>
              </ul>
              <p><strong>To the maximum extent permitted by law, Techsari shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from use of the Service.</strong></p>
              <p>Our total liability for any claim arising from the Service shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
            </Section>

            <Section title="10. Termination">
              <p><strong>By you:</strong> You may terminate your account at any time through the platform or by contacting us. Upon termination, your data will be handled per our Privacy Policy.</p>
              <p><strong>By us:</strong> We may terminate or suspend your account for violation of these terms, with or without notice. Upon termination, your right to use the Service immediately ceases.</p>
            </Section>

            <Section title="11. Changes to Terms">
              <p>We may update these terms from time to time. Material changes will be communicated via email and/or a prominent notice on our platform. Continued use after changes constitutes acceptance.</p>
            </Section>

            <Section title="12. Governing Law">
              <p>These terms are governed by the laws of <strong>Kenya</strong>. Any disputes shall be resolved in Kenyan courts.</p>
              <p>For users outside Kenya, you may also be entitled to protections under your local consumer protection laws.</p>
            </Section>

            <Section title="13. Dispute Resolution">
              <p>Before filing a formal legal claim, we encourage you to contact us at <a href="mailto:legal@techsari.online" className="text-secondary hover:underline">legal@techsari.online</a> to resolve the dispute informally. We will respond within 30 days.</p>
            </Section>

            <Section title="14. Contact">
              <div className="bg-surface border border-outline-variant/30 rounded-2xl p-4 space-y-1">
                <p><strong>Questions about these terms:</strong></p>
                <p>Email: <a href="mailto:legal@techsari.online" className="text-secondary hover:underline">legal@techsari.online</a></p>
                <p>Website: <a href="https://www.techsari.online/contact" className="text-secondary hover:underline">https://www.techsari.online/contact</a></p>
              </div>
            </Section>
          </div>

          <div className="mt-12 pt-8 border-t border-outline-variant/20">
            <p className="text-xs text-on-surface-variant">Last updated: May 27, 2026</p>
            <p className="text-sm text-on-surface-variant italic mt-2">
              <em>Techsari Zawadi — Built for African students, by Africans.</em>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl md:text-2xl font-display font-bold text-primary mb-4">{title}</h2>
      <div className="space-y-3 text-sm">{children}</div>
    </div>
  );
}
