import React, { useState } from 'react';
import toast from 'react-hot-toast';
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

export default function ContactPage({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Student Support');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) { toast.error('Name is required'); return; }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { toast.error('Valid email is required'); return; }
    if (!message.trim() || message.trim().length < 20) { toast.error('Message must be at least 20 characters'); return; }

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
      toast.success('Message sent! We\'ll respond within 24 hours.');
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
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
              <form onSubmit={handleSubmit} className="bg-surface-container-low rounded-card border border-outline-variant p-6 md:p-8 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label text-xs font-medium text-on-surface mb-1.5 uppercase tracking-wider">Name <span className="text-error">*</span></label>
                    <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your full name" className="w-full p-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm text-on-surface placeholder:text-secondary focus:outline-none focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/40" />
                  </div>
                  <div>
                    <label className="block font-label text-xs font-medium text-on-surface mb-1.5 uppercase tracking-wider">Email <span className="text-error">*</span></label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="you@example.com" className="w-full p-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm text-on-surface placeholder:text-secondary focus:outline-none focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/40" />
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
                  <label className="block font-label text-xs font-medium text-on-surface mb-1.5 uppercase tracking-wider">Message <span className="text-error">*</span></label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={6} placeholder="Tell us how we can help you..." className="w-full p-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm text-on-surface placeholder:text-secondary focus:outline-none focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 resize-y min-h-[120px]" />
                  <p className="font-caption text-[10px] text-secondary text-right mt-1">{message.length} / 20 min characters</p>
                </div>

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
