import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { SEO } from './SEO';
import { Breadcrumbs } from './Breadcrumbs';
import { GhostPillButton } from './ui';

const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "name": "Contact Techsari",
  "description": "Get in touch with the Techsari team for student support, scholarship listings, partnerships, and media inquiries."
};

const SUBJECTS = [
  { value: 'Student Support', label: 'Student Support' },
  { value: 'List a Scholarship', label: 'List a Scholarship' },
  { value: 'Partnership Inquiry', label: 'Partnership Inquiry' },
  { value: 'Technical Issue', label: 'Technical Issue' },
  { value: 'Press and Media', label: 'Press and Media' },
  { value: 'Other', label: 'Other' },
];

type FieldErrors = { name?: string; email?: string; message?: string };

/**
 * Field-level validation. Errors are returned per field so each one can be
 * rendered next to the input it belongs to and announced to screen readers —
 * a toast alone disappears and names no field.
 */
function validateContact(values: { name: string; email: string; message: string }): FieldErrors {
  const errors: FieldErrors = {};
  const trimmedMessage = values.message.trim();

  if (!values.name.trim()) errors.name = 'Enter your name so we know who to reply to.';

  if (!values.email.trim()) errors.email = 'Enter your email address.';
  else if (!/^\S+@\S+\.\S+$/.test(values.email.trim()))
    errors.email = 'Enter a valid email address, like you@example.com.';

  if (!trimmedMessage) errors.message = 'Tell us how we can help.';
  else if (trimmedMessage.length < 20)
    errors.message = `Please add ${20 - trimmedMessage.length} more character${20 - trimmedMessage.length === 1 ? '' : 's'} — 20 is the minimum.`;

  return errors;
}

export default function ContactPage({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Student Support');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');

  const clearFieldError = (field: keyof FieldErrors) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const found = validateContact({ name, email, message });
    if (Object.keys(found).length > 0) {
      setErrors(found);
      // Focus the first problem so keyboard and screen-reader users are not
      // left hunting for the field that failed.
      const firstInvalid = (['name', 'email', 'message'] as const).find((field) => found[field]);
      if (firstInvalid) document.getElementById(`contact-${firstInvalid}`)?.focus();
      return;
    }
    setErrors({});

    setSending(true);
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .insert({
          name: name.trim(),
          email: email.trim(),
          subject,
          message: message.trim(),
          status: 'new',
        });

      if (error) throw error;

      setSent(true);
      setName('');
      setEmail('');
      setSubject('Student Support');
      setMessage('');
    } catch (err: any) {
      setSubmitError(
        err?.message || 'We could not send your message. Please try again, or email hello@techsari.online.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-surface-container-lowest text-on-surface font-body antialiased">
      <SEO
        title="Contact Techsari — Get Help or Partner With Us"
        description="Contact the Techsari team for student support, scholarship provider listings, institutional partnerships, or press inquiries."
        path="/contact"
        ogTitle="Contact Techsari — We're Here to Help"
        ogDescription="Reach out to the Techsari team for student support, institutional partnerships, or scholarship provider inquiries. We respond within 24 hours."
        schema={contactSchema}
      />

      <div className="max-w-[960px] mx-auto px-6 py-16 md:py-24">
        <Breadcrumbs items={[{ name: 'Contact', path: '/contact' }]} />

        <span className="font-eyebrow text-eyebrow uppercase tracking-wider text-graphite block mb-2">Support & Partnerships</span>
        <h1 className="font-display text-4xl md:text-5xl font-medium text-on-surface tracking-tight mb-3">Get in Touch</h1>
        <p className="font-body text-base text-secondary max-w-2xl mb-12 leading-relaxed">
          Whether you are an African student with a question, a scholarship provider who wants to list verified opportunities, or an academic partner, we are here to support you.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Form */}
          <div className="lg:col-span-3">
            {sent ? (
              <div className="bg-surface-container-low rounded-card border border-outline-variant p-8 md:p-10 text-center">
                <span className="material-symbols-outlined text-5xl text-primary mb-4">check_circle</span>
                <h3 className="font-headline font-medium text-xl text-on-surface tracking-tight mb-2">Message Sent!</h3>
                <p className="font-body text-sm text-secondary">Thank you for reaching out. Our student support team typically responds within 24 hours on business days.</p>
                <button onClick={() => setSent(false)} className="mt-6 font-body text-xs font-semibold text-primary underline hover:text-on-surface cursor-pointer">Send another message</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="bg-surface-container-low rounded-card border border-outline-variant p-6 md:p-8 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block font-label text-xs font-medium text-on-surface mb-1.5 uppercase tracking-wider">Name <span className="text-error">*</span></label>
                    <input
                      id="contact-name"
                      value={name}
                      onChange={(e) => { setName(e.target.value); clearFieldError('name'); }}
                      placeholder="Your full name"
                      aria-invalid={errors.name ? true : undefined}
                      aria-describedby={errors.name ? 'contact-name-error' : undefined}
                      className={`w-full p-3 rounded-lg border bg-surface-container-lowest text-sm text-on-surface placeholder:text-secondary focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 ${errors.name ? 'border-error focus:border-error' : 'border-outline-variant focus:border-primary'}`}
                    />
                    {errors.name && (
                      <p id="contact-name-error" role="alert" className="mt-1.5 font-body text-xs text-error">{errors.name}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block font-label text-xs font-medium text-on-surface mb-1.5 uppercase tracking-wider">Email <span className="text-error">*</span></label>
                    <input
                      id="contact-email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
                      type="email"
                      placeholder="you@example.com"
                      aria-invalid={errors.email ? true : undefined}
                      aria-describedby={errors.email ? 'contact-email-error' : undefined}
                      className={`w-full p-3 rounded-lg border bg-surface-container-lowest text-sm text-on-surface placeholder:text-secondary focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 ${errors.email ? 'border-error focus:border-error' : 'border-outline-variant focus:border-primary'}`}
                    />
                    {errors.email && (
                      <p id="contact-email-error" role="alert" className="mt-1.5 font-body text-xs text-error">{errors.email}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-label text-xs font-medium text-on-surface mb-1.5 uppercase tracking-wider">Subject <span className="text-error">*</span></label>
                  <select aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm text-on-surface focus:outline-none focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 cursor-pointer">
                    {SUBJECTS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block font-label text-xs font-medium text-on-surface mb-1.5 uppercase tracking-wider">Message <span className="text-error">*</span></label>
                  <textarea
                    id="contact-message"
                    value={message}
                    onChange={(e) => { setMessage(e.target.value); clearFieldError('message'); }}
                    rows={6}
                    placeholder="Tell us how we can help you..."
                    aria-invalid={errors.message ? true : undefined}
                    aria-describedby={errors.message ? 'contact-message-error' : 'contact-message-hint'}
                    className={`w-full p-3 rounded-lg border bg-surface-container-lowest text-sm text-on-surface placeholder:text-secondary focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 resize-y min-h-[120px] ${errors.message ? 'border-error focus:border-error' : 'border-outline-variant focus:border-primary'}`}
                  />
                  {errors.message ? (
                    <p id="contact-message-error" role="alert" className="mt-1.5 font-body text-xs text-error">{errors.message}</p>
                  ) : (
                    <p id="contact-message-hint" className="font-caption text-[10px] text-secondary text-right mt-1">
                      {message.trim().length} / 20 min characters
                    </p>
                  )}
                </div>

                {submitError && (
                  <p role="alert" className="rounded-lg border border-error/30 bg-error/10 px-4 py-3 font-body text-xs text-error">
                    {submitError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3.5 rounded-full bg-primary-container text-on-surface font-subheading text-base font-medium shadow-sm hover:bg-primary-fixed active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">send</span>
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Contact Cards */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-surface-container-low rounded-card border border-outline-variant p-6">
              <div className="w-10 h-10 rounded-full bg-primary-container text-on-surface flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-lg">mail</span>
              </div>
              <h3 className="font-headline font-medium text-sm text-on-surface uppercase tracking-wider mb-1">Direct Support</h3>
              <p className="font-body text-sm font-semibold text-primary">hello@techsari.online</p>
              <p className="font-body-sm text-xs text-secondary mt-1">We respond within 24 hours on business days</p>
            </div>

            <div className="bg-surface-container-low rounded-card border border-outline-variant p-6">
              <div className="w-10 h-10 rounded-full bg-primary-container text-on-surface flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-lg">business</span>
              </div>
              <h3 className="font-headline font-medium text-sm text-on-surface uppercase tracking-wider mb-1">For Scholarship Providers</h3>
              <p className="font-body text-sm text-secondary mb-3">Want to list your foundation or university scholarship on Techsari and reach verified candidates?</p>
              <a href="mailto:hello@techsari.online" className="font-body text-xs font-semibold text-primary hover:underline">
                Partner with us &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
