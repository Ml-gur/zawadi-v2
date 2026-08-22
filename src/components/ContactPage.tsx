import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { SEO } from './SEO';
import { GhostPillButton } from './ui';

const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "name": "Contact Zawadi",
  "description": "Get in touch with the Zawadi team for student support, scholarship listings, partnerships, and media inquiries."
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
    <div className="min-h-screen bg-canvas text-cream">
<SEO
  title="Contact Zawadi — Get Help or Partner With Us"
  description="Contact the Zawadi team for student support, scholarship provider listings, institutional partnerships, or press inquiries."
  path="/contact"
  ogTitle="Contact Zawadi — We're Here to Help"
  ogDescription="Reach out to the Zawadi team for student support, institutional partnerships, or scholarship provider inquiries. We respond within 24 hours."
  schema={contactSchema}
/>

      <div className="max-w-[960px] mx-auto px-6 py-16 md:py-24">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold text-muted hover:text-cream mb-8 cursor-pointer transition-colors">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back
        </button>

        <h1 className="font-display text-3xl md:text-4xl font-semibold text-cream tracking-tight mb-3">Get in Touch</h1>
        <p className="text-sm text-muted max-w-2xl mb-12 leading-relaxed">
          Whether you are a student with a question, a scholarship provider who wants to list on Zawadi, or an organization interested in partnering with us, we want to hear from you.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Form */}
          <div className="lg:col-span-3">
            {sent ? (
              <div className="bg-off-black rounded-lg border border-hairline/60 p-8 text-center">
                <span className="material-symbols-outlined text-5xl text-status-success mb-4">check_circle</span>
                <h3 className="font-display font-semibold text-lg text-cream tracking-tight mb-2">Message Sent!</h3>
                <p className="text-sm text-muted">Thank you for reaching out. Our team typically responds within 24 hours on business days.</p>
                <button onClick={() => setSent(false)} className="mt-6 text-xs font-bold text-cream hover:text-accent-green underline cursor-pointer">Send another message</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-off-black rounded-lg border border-hairline/60 p-6 md:p-8 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-cream mb-1.5 uppercase tracking-wider">Name <span className="text-status-error">*</span></label>
                    <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your full name" className="w-full p-3 rounded-lg border border-hairline bg-canvas text-xs text-cream placeholder:text-muted focus:outline-none focus:border-accent-green focus-visible:ring-1 focus-visible:ring-accent-green/40" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-cream mb-1.5 uppercase tracking-wider">Email <span className="text-status-error">*</span></label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="you@example.com" className="w-full p-3 rounded-lg border border-hairline bg-canvas text-xs text-cream placeholder:text-muted focus:outline-none focus:border-accent-green focus-visible:ring-1 focus-visible:ring-accent-green/40" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-cream mb-1.5 uppercase tracking-wider">Subject <span className="text-status-error">*</span></label>
                  <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-3 rounded-lg border border-hairline bg-canvas text-xs text-cream focus:outline-none focus:border-accent-green focus-visible:ring-1 focus-visible:ring-accent-green/40 cursor-pointer">
                    {SUBJECTS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-cream mb-1.5 uppercase tracking-wider">Message <span className="text-status-error">*</span></label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={6} placeholder="Tell us how we can help you..." className="w-full p-3 rounded-lg border border-hairline bg-canvas text-xs text-cream placeholder:text-muted focus:outline-none focus:border-accent-green focus-visible:ring-1 focus-visible:ring-accent-green/40 resize-y min-h-[120px]" />
                  <p className="text-[9px] text-muted text-right mt-1 font-semibold">{message.length} / 20 min characters</p>
                </div>

                <GhostPillButton type="submit" variant="gradient" fullWidth disabled={sending}>
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-accent-green border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">send</span>
                      Send Message
                    </>
                  )}
                </GhostPillButton>
              </form>
            )}
          </div>

          {/* Contact Cards */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-off-black rounded-lg border border-hairline/60 p-6">
              <div className="w-10 h-10 rounded-lg bg-accent-blue/10 text-accent-blue flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-lg">mail</span>
              </div>
              <h3 className="font-display font-semibold text-xs text-cream uppercase tracking-wider mb-1">Email</h3>
              <p className="text-sm font-medium text-cream">support@zawadi.app</p>
              <p className="text-[10px] text-muted mt-1">We aim to respond within 24 hours</p>
            </div>

            <div className="bg-off-black rounded-lg border border-hairline/60 p-6">
              <div className="w-10 h-10 rounded-lg bg-accent-pink/10 text-accent-pink flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-lg">schedule</span>
              </div>
              <h3 className="font-display font-semibold text-xs text-cream uppercase tracking-wider mb-1">Response Time</h3>
              <p className="text-sm font-medium text-cream">We respond within 24 hours on business days</p>
            </div>

            <div className="bg-off-black rounded-lg border border-hairline/60 p-6">
              <div className="w-10 h-10 rounded-lg bg-accent-orange/10 text-accent-orange flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-lg">business</span>
              </div>
              <h3 className="font-display font-semibold text-xs text-cream uppercase tracking-wider mb-1">For Scholarship Providers</h3>
              <p className="text-sm text-cream mb-3">Want to list your scholarship on Zawadi and reach qualified African students?</p>
              <button onClick={() => window.open('https://www.techsari.online/for-providers', '_blank')} className="text-xs font-bold text-accent-green hover:text-cream underline cursor-pointer">Visit For Providers →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
