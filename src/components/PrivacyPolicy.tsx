import React from 'react';
import { SEO } from './SEO';
import { Breadcrumbs } from './Breadcrumbs';

interface PrivacyPolicyProps {
  onBack?: () => void;
}

export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
  return (
    <div className="bg-pure-white text-off-black-ink min-h-[100dvh]">
      <SEO
        title="Privacy Policy — Techsari Zawadi"
        description="How Techsari Zawadi collects, uses, and protects the personal information of African students who use our scholarship platform."
        path="/privacy"
      />
      <section className="px-4 sm:px-6 py-16 md:py-24">
        <div className="max-w-[800px] mx-auto">
          <Breadcrumbs items={[{ name: 'Privacy policy', path: '/privacy' }]} />

          <h1 className="text-ed-h1-sm font-display font-semibold tracking-tight text-off-black-ink mb-2">Privacy Policy</h1>
          <p className="text-ed-body-sm text-graphite mb-8">Last updated: August 25, 2026</p>

          <p className="text-ed-body text-graphite leading-relaxed mb-10">
            This policy explains what information Zawadi collects, why we collect it,
            who may process it, and the choices you have. We have written it in plain
            language because it applies to real people making real applications.
          </p>

          <div className="space-y-12">

            <Section title="1. Who we are">
              <p>
                Zawadi is a scholarship discovery and application platform operated by
                Techsari, a company based in Kenya serving African students.
              </p>
              <div className="bg-parchment border border-ash rounded-ed p-6 space-y-1">
                <p><strong className="text-off-black-ink">Questions about your privacy?</strong></p>
                <p>Email: <a href="mailto:privacy@techsari.online" className="font-medium text-off-black-ink underline decoration-ash underline-offset-4 hover:decoration-off-black-ink transition-colors">privacy@techsari.online</a></p>
                <p>Contact page: <a href="https://www.techsari.online/contact" className="font-medium text-off-black-ink underline decoration-ash underline-offset-4 hover:decoration-off-black-ink transition-colors">www.techsari.online/contact</a></p>
              </div>
            </Section>

            <Section title="2. What we collect">
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full text-ed-body-sm border-collapse">
                  <thead>
                    <tr className="bg-parchment border-b border-ash">
                      <th className="text-left p-3 text-ed-eyebrow uppercase tracking-wider font-medium text-graphite">Information</th>
                      <th className="text-left p-3 text-ed-eyebrow uppercase tracking-wider font-medium text-graphite">Why we need it</th>
                    </tr>
                  </thead>
                  <tbody className="text-graphite">
                    <tr className="border-b border-ash"><td className="p-3 align-top">Full name</td><td className="p-3 align-top">Creating your account and identifying your applications.</td></tr>
                    <tr className="border-b border-ash"><td className="p-3 align-top">Email address</td><td className="p-3 align-top">Signing in, password resets, security notices, and deadline reminders.</td></tr>
                    <tr className="border-b border-ash"><td className="p-3 align-top">Country</td><td className="p-3 align-top">Applying eligibility rules that differ by nationality and residence.</td></tr>
                    <tr className="border-b border-ash"><td className="p-3 align-top">Age or age range</td><td className="p-3 align-top">Checking scholarship eligibility, since many programs have age limits, and improving matching accuracy.</td></tr>
                    <tr className="border-b border-ash"><td className="p-3 align-top">Gender</td><td className="p-3 align-top">Determining eligibility for gender-specific scholarships and matching you with relevant opportunities.</td></tr>
                    <tr className="border-b border-ash"><td className="p-3 align-top">Academic and application information (degree level, field of study, GPA)</td><td className="p-3 align-top">Matching you with scholarships and helping you prepare applications.</td></tr>
                    <tr className="border-b border-ash"><td className="p-3 align-top">Uploaded documents (transcripts, CVs, certificates)</td><td className="p-3 align-top">Storing them in your document vault and attaching them where an application requires them.</td></tr>
                    <tr className="border-b border-ash"><td className="p-3 align-top">Essay prompts and content</td><td className="p-3 align-top">Drafting and reviewing essays with our AI writing tools.</td></tr>
                    <tr className="border-b border-ash"><td className="p-3 align-top">Payment information and transaction references</td><td className="p-3 align-top">Managing subscriptions and receipts. Payments are handled by our payment processor; we do not receive your full card number.</td></tr>
                    <tr className="border-b border-ash"><td className="p-3 align-top">Technical information</td><td className="p-3 align-top">Keeping the service working and secure, such as sign-in sessions, device and browser type, and basic diagnostics.</td></tr>
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="3. How we use your information">
              <ul className="list-disc pl-6 space-y-2">
                <li>To match you with scholarships and manage your applications</li>
                <li>To power tools such as deadline tracking, document storage, and essay drafting</li>
                <li>To process subscriptions and send receipts</li>
                <li>To send service updates and reminders. We send marketing emails only with your consent, which you can withdraw at any time</li>
                <li>To detect abuse, keep accounts secure, and comply with our legal obligations</li>
                <li>To understand how the service is used so we can improve it</li>
              </ul>
            </Section>

            <Section title="4. Artificial intelligence">
              <p>
                Some features of Zawadi use artificial intelligence to assist with
                scholarship matching, application preparation, and essay drafting.
                Information you provide to these features may be processed by our AI
                service providers to generate responses or recommendations.
              </p>
              <p>We do not use your personal information to train our own AI models without your consent.</p>
              <p className="bg-parchment border border-ash rounded-ed p-5">
                AI-generated content may not always be accurate and should be reviewed
                before being submitted to a scholarship provider.
              </p>
            </Section>

            <Section title="5. Who may process your information">
              <p>To operate Zawadi, we rely on categories of service providers:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Cloud infrastructure providers (hosting, databases, authentication, and file storage)</li>
                <li>Payment processors</li>
                <li>AI service providers</li>
                <li>Communications providers (for example, email delivery)</li>
              </ul>
              <p>
                These providers only receive information necessary to perform the
                services they provide to us and are subject to appropriate contractual
                and security obligations.
              </p>
              <p>
                We do not sell your personal information or share it with third parties
                for their own advertising or marketing purposes. We may share
                information with service providers that process information on our
                behalf to operate and improve Zawadi. We may also disclose information
                where we are required to do so by law.
              </p>
            </Section>

            <Section title="6. International transfers">
              <p>
                Your information may be processed in Kenya and other countries where
                our service providers operate. Where personal information is
                transferred internationally, we take appropriate steps required by
                applicable law to protect it.
              </p>
            </Section>

            <Section title="7. How long we keep your information">
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full text-ed-body-sm border-collapse">
                  <thead>
                    <tr className="bg-parchment border-b border-ash">
                      <th className="text-left p-3 text-ed-eyebrow uppercase tracking-wider font-medium text-graphite">Information</th>
                      <th className="text-left p-3 text-ed-eyebrow uppercase tracking-wider font-medium text-graphite">How long we keep it</th>
                    </tr>
                  </thead>
                  <tbody className="text-graphite">
                    <tr className="border-b border-ash"><td className="p-3 align-top">Account and profile information</td><td className="p-3 align-top">Until you delete your account</td></tr>
                    <tr className="border-b border-ash"><td className="p-3 align-top">Applications, documents, and essay drafts</td><td className="p-3 align-top">Until you delete them or close your account</td></tr>
                    <tr className="border-b border-ash"><td className="p-3 align-top">Payment records</td><td className="p-3 align-top">As long as we are required to keep them for tax and accounting purposes</td></tr>
                    <tr className="border-b border-ash"><td className="p-3 align-top">Copies in backups</td><td className="p-3 align-top">Removed within a reasonable period after deletion, typically within 90 days</td></tr>
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="8. How we protect your information">
              <ul className="list-disc pl-6 space-y-2">
                <li>Data is encrypted while in transit and while stored</li>
                <li>Access to personal information is limited to authorized people who need it to run the service</li>
                <li>Accounts are protected by authentication controls, and we monitor for misuse</li>
                <li>No system is perfectly secure, so we also encourage you to use a strong, unique password</li>
              </ul>
            </Section>

            <Section title="9. Cookies">
              <p>
                We use only the small number of cookies needed to run the service,
                mainly to keep you signed in securely. We do not use advertising or
                cross-site tracking cookies.
              </p>
            </Section>

            <Section title="10. Your rights">
              <p>You can ask us to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-off-black-ink">Access:</strong> give you a copy of the personal information we hold about you</li>
                <li><strong className="text-off-black-ink">Correct:</strong> fix information that is inaccurate or incomplete</li>
                <li><strong className="text-off-black-ink">Delete:</strong> delete your account and associated personal information</li>
                <li><strong className="text-off-black-ink">Object:</strong> object to certain processing, including direct marketing</li>
                <li><strong className="text-off-black-ink">Withdraw consent:</strong> stop processing you previously consented to</li>
                <li><strong className="text-off-black-ink">Portability:</strong> where applicable, receive your data in a portable format</li>
                <li><strong className="text-off-black-ink">Complain:</strong> lodge a complaint with a data protection authority</li>
              </ul>
              <p>
                To exercise any of these rights, email{' '}
                <a href="mailto:privacy@techsari.online" className="font-medium text-off-black-ink underline decoration-ash underline-offset-4 hover:decoration-off-black-ink transition-colors">privacy@techsari.online</a>{' '}
                or reach us through our contact page. We will respond within 30 days.
              </p>
              <p>
                In Kenya, you may also complain to the Office of the Data Protection
                Commission (ODPC), the national data protection regulator.
              </p>
            </Section>

            <Section title="11. Age requirements">
              <p>
                Zawadi is intended for people aged 16 and older, consistent with our
                Terms of Service. We do not knowingly collect personal information
                from anyone under 16. If we learn that we have, we will delete it.
              </p>
              <p>
                Where a user is under 18, we handle their personal information with
                the additional protections required under Kenya's Data Protection Act.
              </p>
            </Section>

            <Section title="12. Changes to this policy">
              <p>
                We may update this policy as the service evolves. If a change is
                material, we will tell you through the platform or by email before it
                takes effect. Continuing to use Zawadi after a change means you accept
                the updated policy.
              </p>
            </Section>

            <Section title="13. Contact us">
              <div className="bg-parchment border border-ash rounded-ed p-6 space-y-1">
                <p><strong className="text-off-black-ink">Techsari</strong> · Nairobi, Kenya</p>
                <p>Privacy inquiries: <a href="mailto:privacy@techsari.online" className="font-medium text-off-black-ink underline decoration-ash underline-offset-4 hover:decoration-off-black-ink transition-colors">privacy@techsari.online</a></p>
                <p>Contact page: <a href="https://www.techsari.online/contact" className="font-medium text-off-black-ink underline decoration-ash underline-offset-4 hover:decoration-off-black-ink transition-colors">www.techsari.online/contact</a></p>
              </div>
            </Section>
          </div>

          <div className="mt-12 pt-8 border-t border-ash">
            <p className="text-ed-caption text-graphite">Last updated: August 25, 2026</p>
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
