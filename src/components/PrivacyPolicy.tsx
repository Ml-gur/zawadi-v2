import React from 'react';
import { SEO } from './SEO';

interface PrivacyPolicyProps {
  onBack?: () => void;
}

export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  return (
    <div className="bg-background text-on-background min-h-screen">
      <SEO
        title="Privacy Policy — Techsari Zawadi"
        description="Techsari Zawadi Privacy Policy — how we collect, use, and protect your data as an African student using our scholarship platform."
        path="/privacy"
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

          <h1 className="text-3xl md:text-5xl font-display font-black text-primary mb-2">Privacy Policy</h1>
          <p className="text-sm text-on-surface-variant mb-2">Last updated: May 27, 2026</p>
          <p className="text-sm text-on-surface-variant mb-8">Effective date: May 27, 2026</p>

          <div className="prose prose-sm max-w-none space-y-8 text-on-surface-variant leading-relaxed">

            <Section title="1. Who We Are">
              <p>
                <strong>Techsari Zawadi</strong> ("we," "our," "us") is a scholarship discovery and application management platform operated by Techsari, serving African students worldwide.
              </p>
              <div className="bg-surface border border-outline-variant/30 rounded-2xl p-4 space-y-1">
                <p><strong>Contact:</strong></p>
                <p>Email: <a href="mailto:privacy@techsari.online" className="text-secondary hover:underline">privacy@techsari.online</a></p>
                <p>Website: <a href="https://www.techsari.online" className="text-secondary hover:underline">https://www.techsari.online</a></p>
              </div>
            </Section>

            <Section title="2. What Data We Collect">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface border-b border-outline-variant/30">
                      <th className="text-left p-3 font-bold text-primary">Data</th>
                      <th className="text-left p-3 font-bold text-primary">When Collected</th>
                      <th className="text-left p-3 font-bold text-primary">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-outline-variant/10"><td className="p-3">Full name</td><td className="p-3">Registration</td><td className="p-3">Account identification; essay personalization</td></tr>
                    <tr className="border-b border-outline-variant/10"><td className="p-3">Email address</td><td className="p-3">Registration</td><td className="p-3">Account login; password reset; service notifications</td></tr>
                    <tr className="border-b border-outline-variant/10"><td className="p-3">Password (hashed)</td><td className="p-3">Registration</td><td className="p-3">Account authentication (we never see your password)</td></tr>
                    <tr className="border-b border-outline-variant/10"><td className="p-3">Country</td><td className="p-3">Registration</td><td className="p-3">Scholarship eligibility filtering; localized pricing</td></tr>
                    <tr className="border-b border-outline-variant/10"><td className="p-3">Application tracking data</td><td className="p-3">Platform usage</td><td className="p-3">Scholarship management; match score improvement</td></tr>
                    <tr className="border-b border-outline-variant/10"><td className="p-3">Uploaded documents</td><td className="p-3">User upload</td><td className="p-3">Document vault for application support</td></tr>
                    <tr className="border-b border-outline-variant/10"><td className="p-3">Essay prompts and content</td><td className="p-3">Essay generator usage</td><td className="p-3">AI essay generation</td></tr>
                    <tr className="border-b border-outline-variant/10"><td className="p-3">Payment transaction references</td><td className="p-3">Payment checkout</td><td className="p-3">Subscription management; receipts</td></tr>
                    <tr className="border-b border-outline-variant/10"><td className="p-3">Usage analytics</td><td className="p-3">Platform interaction</td><td className="p-3">Product improvement (aggregated, anonymized)</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-status-warning font-semibold mt-4">We do NOT collect: Date of birth, physical address, phone number, government ID numbers, credit card numbers, bank account details, or biometric data.</p>
            </Section>

            <Section title="3. How We Use Your Data">
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>To provide the service:</strong> Match you with scholarships, generate essays, track applications</li>
                <li><strong>To improve the product:</strong> Analyze usage patterns (aggregated and anonymized) to improve features</li>
                <li><strong>To communicate:</strong> Send service updates, deadline alerts, and (with your consent) newsletters</li>
                <li><strong>To process payments:</strong> Facilitate Paystack subscription payments (we never see your card details)</li>
                <li><strong>To comply with legal obligations:</strong> Tax records, regulatory requirements</li>
              </ul>
              <p className="text-secondary font-bold">We do NOT sell, rent, or share your personal data with third parties for their marketing purposes.</p>
            </Section>

            <Section title="4. Legal Basis for Processing">
              <p>Under applicable data protection laws (including Kenya's Data Protection Act 2019, Nigeria's NDPR, and the GDPR for EU residents), we process your data on these legal bases:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Contractual necessity:</strong> To provide the Zawadi service you signed up for</li>
                <li><strong>Legitimate interest:</strong> To improve and secure our platform</li>
                <li><strong>Consent:</strong> For optional communications (newsletters, product updates)</li>
                <li><strong>Legal obligation:</strong> Tax records and regulatory compliance</li>
              </ul>
            </Section>

            <Section title="5. Data Storage & Security">
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Where:</strong> Data is stored on Supabase servers (EU and US regions) and Vercel's global edge network</li>
                <li><strong>Encryption:</strong> All data encrypted at rest (AES-256) and in transit (TLS 1.2+)</li>
                <li><strong>Passwords:</strong> Hashed using bcrypt via Supabase Auth — we cannot recover your password</li>
                <li><strong>Access control:</strong> Your data is accessible only to you (via authentication) and to authorized Techsari administrators for support purposes</li>
                <li><strong>Row-level security:</strong> Database policies ensure each user can only access their own data</li>
              </ul>
            </Section>

            <Section title="6. Data Retention">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface border-b border-outline-variant/30">
                      <th className="text-left p-3 font-bold text-primary">Data</th>
                      <th className="text-left p-3 font-bold text-primary">How Long We Keep It</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-outline-variant/10"><td className="p-3">Active account data</td><td className="p-3">Until you delete your account</td></tr>
                    <tr className="border-b border-outline-variant/10"><td className="p-3">Inactive account (12+ months no login)</td><td className="p-3">12 months, then anonymized or deleted</td></tr>
                    <tr className="border-b border-outline-variant/10"><td className="p-3">Payment records</td><td className="p-3">7 years (tax compliance)</td></tr>
                    <tr className="border-b border-outline-variant/10"><td className="p-3">Deleted account data</td><td className="p-3">Purged within 30 days of deletion request</td></tr>
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="7. Your Rights">
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Access:</strong> Request a copy of all data we hold about you</li>
                <li><strong>Correct:</strong> Update inaccurate or incomplete data</li>
                <li><strong>Delete:</strong> Request deletion of your account and all associated data</li>
                <li><strong>Export:</strong> Receive your data in a portable format (JSON)</li>
                <li><strong>Withdraw consent:</strong> Opt out of non-essential communications</li>
                <li><strong>Complain:</strong> Lodge a complaint with your local data protection authority</li>
              </ul>
              <p>To exercise any of these rights, email <a href="mailto:privacy@techsari.online" className="text-secondary hover:underline">privacy@techsari.online</a>. We will respond within 30 days.</p>
              <p>For Kenya residents: You may also contact the Office of the Data Protection Commissioner (ODPC) at info@odpc.go.ke.</p>
              <p>For Nigeria residents: You may contact the Nigeria Data Protection Commission (NDPC) at info@ndpc.gov.ng.</p>
            </Section>

            <Section title="8. Cookies">
              <p>Zawadi uses only <strong>essential cookies</strong> required for the platform to function:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface border-b border-outline-variant/30">
                      <th className="text-left p-3 font-bold text-primary">Cookie</th>
                      <th className="text-left p-3 font-bold text-primary">Purpose</th>
                      <th className="text-left p-3 font-bold text-primary">Duration</th>
                      <th className="text-left p-3 font-bold text-primary">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-outline-variant/10"><td className="p-3"><code>sb-access-token</code></td><td className="p-3">Authentication (Supabase)</td><td className="p-3">Session</td><td className="p-3">Essential</td></tr>
                    <tr className="border-b border-outline-variant/10"><td className="p-3"><code>sb-refresh-token</code></td><td className="p-3">Session renewal (Supabase)</td><td className="p-3">30 days</td><td className="p-3">Essential</td></tr>
                  </tbody>
                </table>
              </div>
              <p>We do NOT use tracking cookies, advertising cookies, or third-party analytics cookies. No cookie consent banner is required because we only use essential cookies.</p>
            </Section>

            <Section title="9. Third-Party Services">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface border-b border-outline-variant/30">
                      <th className="text-left p-3 font-bold text-primary">Service</th>
                      <th className="text-left p-3 font-bold text-primary">Purpose</th>
                      <th className="text-left p-3 font-bold text-primary">Data Shared</th>
                      <th className="text-left p-3 font-bold text-primary">Privacy Policy</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-outline-variant/10"><td className="p-3">Supabase</td><td className="p-3">Database, auth, file storage</td><td className="p-3">All platform data</td><td className="p-3"><a href="https://supabase.com/privacy" className="text-secondary hover:underline">supabase.com/privacy</a></td></tr>
                    <tr className="border-b border-outline-variant/10"><td className="p-3">Paystack</td><td className="p-3">Payment processing</td><td className="p-3">Payment references, amounts</td><td className="p-3"><a href="https://paystack.com/privacy" className="text-secondary hover:underline">paystack.com/privacy</a></td></tr>
                    <tr className="border-b border-outline-variant/10"><td className="p-3">Vercel</td><td className="p-3">Hosting</td><td className="p-3">All platform data</td><td className="p-3"><a href="https://vercel.com/legal/privacy-policy" className="text-secondary hover:underline">vercel.com/legal/privacy-policy</a></td></tr>
                    <tr className="border-b border-outline-variant/10"><td className="p-3">OpenRouter (DeepSeek)</td><td className="p-3">AI essay generation</td><td className="p-3">Essay prompts (transient)</td><td className="p-3"><a href="https://openrouter.ai/privacy" className="text-secondary hover:underline">openrouter.ai/privacy</a></td></tr>
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="10. Children's Privacy">
              <p>Zawadi is intended for users aged 16 and above. We do not knowingly collect data from children under 16. If you believe a child under 16 has provided us with personal data, please contact us immediately.</p>
            </Section>

            <Section title="11. International Data Transfers">
              <p>Your data may be transferred to and processed in countries outside your country of residence (including the United States and European Union). We ensure appropriate safeguards are in place (standard contractual clauses, provider SOC 2 certifications) for any such transfers.</p>
            </Section>

            <Section title="12. Changes to This Policy">
              <p>We will notify you of material changes to this Privacy Policy via email and/or a prominent notice on our platform. Continued use after changes constitutes acceptance.</p>
            </Section>

            <Section title="13. Compliance">
              <p>Zawadi complies with:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Kenya Data Protection Act (DPA) 2019</strong></li>
                <li><strong>Nigeria Data Protection Regulation (NDPR)</strong></li>
                <li><strong>EU General Data Protection Regulation (GDPR)</strong></li>
              </ul>
            </Section>

            <Section title="14. Contact Us">
              <div className="bg-surface border border-outline-variant/30 rounded-2xl p-4 space-y-2">
                <p><strong>Privacy inquiries:</strong> <a href="mailto:privacy@techsari.online" className="text-secondary hover:underline">privacy@techsari.online</a> — Response within 30 days</p>
                <p><strong>Security vulnerabilities:</strong> <a href="mailto:security@techsari.online" className="text-secondary hover:underline">security@techsari.online</a> — Response within 48 hours</p>
              </div>
            </Section>
          </div>

          <div className="mt-12 pt-8 border-t border-outline-variant/20">
            <p className="text-xs text-on-surface-variant">
              <strong>Last updated:</strong> May 27, 2026 &middot; <strong>Effective date:</strong> May 27, 2026
            </p>
            <p className="text-sm text-on-surface-variant italic mt-2">
              <em>Techsari Zawadi — Your data is yours. We protect it accordingly.</em>
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
