import React from 'react';
import { SEO } from './SEO';
import { Breadcrumbs } from './Breadcrumbs';

interface TermsOfServiceProps {
  onBack?: () => void;
}

export default function TermsOfService({ onBack }: TermsOfServiceProps) {
  return (
    <div className="bg-pure-white text-off-black-ink min-h-[100dvh]">
      <SEO
        title="Terms of Service — Techsari Techsari"
        description="The Terms of Service governing your use of Techsari Techsari, a scholarship discovery and application platform for African students."
        path="/terms"
      />
      <section className="px-4 sm:px-6 py-16 md:py-24">
        <div className="max-w-[800px] mx-auto">
          <Breadcrumbs items={[{ name: 'Terms of service', path: '/terms' }]} />

          <h1 className="text-ed-h1-sm font-display font-semibold tracking-tight text-off-black-ink mb-2">Terms of Service</h1>
          <p className="text-ed-body-sm text-graphite mb-8">Last updated: August 25, 2026</p>

          <p className="text-ed-body text-graphite leading-relaxed mb-10">
            These Terms govern your use of Techsari, operated by Techsari ("we", "us",
            "our"). By creating an account or using the Service, you agree to them.
          </p>

          <div className="space-y-12">

            <Section title="1. What Techsari is — and is not">
              <p>
                Techsari provides scholarship discovery, matching, and application-support
                tools, including deadline tracking, document storage, essay drafting
                assistance, and application management.
              </p>
              <p className="bg-parchment border border-ash rounded-ed p-5 font-medium text-off-black-ink">
                Techsari does not award scholarships, determine scholarship eligibility,
                or guarantee admission, funding, or selection by any scholarship provider.
              </p>
            </Section>

            <Section title="2. Eligibility and accounts">
              <ul className="list-disc pl-6 space-y-2">
                <li>Techsari is intended for individuals aged 16 and older. By creating an account, you confirm that you meet this requirement</li>
                <li>You must provide accurate and complete registration information and keep it up to date</li>
                <li>You are responsible for keeping your password confidential and for all activity under your account</li>
                <li>One account per person; shared accounts are not permitted</li>
              </ul>
            </Section>

            <Section title="3. Scholarship listings">
              <p>
                We make reasonable efforts to identify and maintain accurate
                scholarship information. However, scholarship information may change
                without notice, and we cannot guarantee that every listing, deadline,
                eligibility requirement, funding amount, or application link is always
                accurate or current.
              </p>
              <p>
                Always confirm details with the official scholarship provider before
                relying on them or submitting an application.
              </p>
            </Section>

            <Section title="4. Third-party scholarship providers">
              <p>
                Techsari is independent from the scholarship organizations listed on the
                platform unless expressly stated otherwise.
              </p>
              <p>
                Scholarship providers are solely responsible for their own application
                processes, eligibility decisions, communications, selection decisions,
                and awards.
              </p>
            </Section>

            <Section title="5. External links">
              <p>
                The Service links to external websites, including official scholarship
                pages. Those sites have their own terms and privacy policies, and we do
                not control or endorse their content or practices.
              </p>
            </Section>

            <Section title="6. AI-assisted tools">
              <ul className="list-disc pl-6 space-y-2">
                <li>AI features assist with matching, preparation, and drafting. You remain responsible for the final content you submit to any provider</li>
                <li>AI output does not guarantee accuracy, completeness, or originality. Review and personalize it before use</li>
                <li>You are responsible for reviewing the rules of each scholarship provider and ensuring that any application you submit complies with its requirements concerning AI assistance, originality, authorship, and disclosure</li>
              </ul>
            </Section>

            <Section title="7. Subscriptions, pricing, and cancellation">
              <ul className="list-disc pl-6 space-y-2">
                <li>Paid plans are billed monthly or annually through our payment processor</li>
                <li>Charges are processed in Kenyan Shillings (KES). Prices may also be displayed in USD for convenience. The amount actually charged will be the KES amount shown at checkout</li>
                <li>Subscriptions renew automatically unless cancelled before the next billing date</li>
                <li>Before you pay, checkout shows the price, currency, renewal schedule, and how to cancel</li>
                <li>Cancellation stops future renewals. Unless otherwise required by law or stated at checkout, cancellation does not automatically create a right to a refund for the current billing period</li>
                <li>We will give at least 30 days' notice before changing prices</li>
                <li>Failed payments may result in your account moving to the free plan</li>
              </ul>
            </Section>

            <Section title="8. Acceptable use">
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Use the Service for any unlawful purpose</li>
                <li>Submit fraudulent applications or misrepresent your identity or qualifications</li>
                <li>Attempt to gain unauthorized access to any part of the Service</li>
                <li>Scrape, harvest, or extract data without permission</li>
                <li>Upload malicious content or disrupt the Service</li>
                <li>Use the Service or its outputs to build, train, operate, or market a competing service without our permission</li>
                <li>Spam, harass, or impersonate any person or entity</li>
              </ul>
            </Section>

            <Section title="9. Intellectual property">
              <ul className="list-disc pl-6 space-y-2">
                <li>The Techsari platform, including its code, design, branding, and name, belongs to Techsari</li>
                <li>You own the documents and application data you upload to the Service</li>
                <li>You may use content generated through our AI tools for your personal educational and scholarship application purposes, subject to applicable law and the rules of the relevant scholarship provider</li>
                <li>You grant Techsari a limited license to store and process your content solely to provide the Service, and to maintain, secure, troubleshoot, and improve the Service as described in our Privacy Policy</li>
              </ul>
            </Section>

            <Section title="10. No professional advice">
              <p>
                Content on Techsari is provided for informational and educational
                purposes only. It is not legal, financial, immigration, or academic
                advice, and should not be treated as a substitute for guidance from a
                qualified professional.
              </p>
            </Section>

            <Section title="11. Disclaimers and limitation of liability">
              <p>
                The Service is provided "as is" and "as available". We do not guarantee
                that listings are always accurate or current, that you will receive any
                award, that the Service will be uninterrupted or error-free, or that AI
                output will suit your specific needs.
              </p>
              <p>
                To the maximum extent permitted by law, Techsari shall not be liable
                for any indirect, incidental, special, consequential, or punitive
                damages arising from your use of the Service. Our total liability for
                any claim relating to the Service is limited to the amount you paid us
                in the 12 months before the claim arose.
              </p>
              <p className="font-medium text-off-black-ink">
                Nothing in these Terms excludes or limits liability that cannot
                lawfully be excluded or limited under applicable law.
              </p>
            </Section>

            <Section title="12. Suspension and termination">
              <p>
                <strong className="text-off-black-ink">By you:</strong> you may close your account at any time through the platform or by contacting us.
              </p>
              <p>
                <strong className="text-off-black-ink">By us:</strong> we may suspend or terminate an account where we reasonably believe that the account has violated these Terms, created a security risk, engaged in fraudulent or abusive activity, or exposed Techsari or other users to legal or operational risk. Where reasonably practical, we will notify you.
              </p>
              <p>After termination, your data is handled as described in our Privacy Policy.</p>
            </Section>

            <Section title="13. Changes to these Terms">
              <p>
                We may update these Terms over time. Material changes will be
                communicated through the platform or by email before they take effect.
                Continued use after changes take effect constitutes acceptance.
              </p>
            </Section>

            <Section title="14. Governing law and disputes">
              <p>
                If something goes wrong, please contact us first at{' '}
                <a href="mailto:legal@techsari.online" className="font-medium text-off-black-ink underline decoration-ash underline-offset-4 hover:decoration-off-black-ink transition-colors">legal@techsari.online</a>{' '}
                so we can try to resolve it informally. We will respond within 30
                days. This is a service commitment, not a precondition for exercising
                your rights.
              </p>
              <p>
                Nothing in this section prevents a user from exercising any rights or
                remedies available under applicable law.
              </p>
              <p>
                These Terms are governed by the laws of Kenya, and disputes shall be
                resolved in the courts of Kenya.
              </p>
              <p>
                For users outside Kenya, you may also be entitled to protections under
                your local consumer protection laws.
              </p>
            </Section>

            <Section title="15. Contact">
              <div className="bg-parchment border border-ash rounded-ed p-6 space-y-1">
                <p><strong className="text-off-black-ink">Questions about these Terms?</strong></p>
                <p>Email: <a href="mailto:legal@techsari.online" className="font-medium text-off-black-ink underline decoration-ash underline-offset-4 hover:decoration-off-black-ink transition-colors">legal@techsari.online</a></p>
                <p>Contact page: <a href="https://www.techsari.online/contact" className="font-medium text-off-black-ink underline decoration-ash underline-offset-4 hover:decoration-off-black-ink transition-colors">www.techsari.online/contact</a></p>
              </div>
            </Section>
          </div>

          <div className="mt-12 pt-8 border-t border-ash">
            <p className="text-ed-caption text-graphite">Last updated: August 25, 2026</p>
            <p className="text-ed-body-sm text-graphite italic mt-2">
              <em>Techsari Techsari · Built for African students, by Africans.</em>
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
      <h2 className="text-ed-sub font-display font-semibold tracking-tight text-off-black-ink mb-4">{title}</h2>
      <div className="space-y-3 text-ed-body text-graphite leading-relaxed">{children}</div>
    </div>
  );
}
