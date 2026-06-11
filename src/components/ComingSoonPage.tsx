import { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Loader2, CheckCircle, Layers, Brain, FileText, Users } from 'lucide-react';

const features = [
  {
    icon: Layers,
    title: 'The 3-Stage Pipeline',
    body: 'Say goodbye to the blank page. Our system will walk you through a structured "Draft \u2192 Critique & Rewrite \u2192 Final Polish" pipeline so you learn how to build a strong narrative rather than just copying generated text.',
  },
  {
    icon: Brain,
    title: 'Essay Voice Learning',
    body: 'For our premium users, the AI will analyze your past writing samples to learn your specific tone, vocabulary, and sentence structure. Your application will sound exactly like you\u2014not a machine.',
  },
  {
    icon: FileText,
    title: 'Support for Every Format',
    body: 'Whether you need a Statement of Purpose, a Leadership Essay, or a Motivation Letter, the AI Studio will be trained to help you structure it.',
  },
  {
    icon: Users,
    title: 'Mentor-Ready Drafts',
    body: 'Once you and the AI have polished your essay, you can seamlessly hand it off to one of our human Scholarship Ambassadors to inject that final layer of cultural nuance and strategic review.',
  },
];

export default function ComingSoonPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'duplicate' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const validate = (value: string): string | null => {
    if (!value.trim()) return 'Please enter your email';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Please enter a valid email address';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate(email);
    if (error) {
      setStatus('error');
      setMessage(error);
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (res.status === 200) {
        setStatus('success');
        setMessage('You are on the list! We will be in touch.');
      } else if (res.status === 409) {
        setStatus('duplicate');
        setMessage('This email is already on the waitlist');
      } else {
        setStatus('error');
        setMessage('Something went wrong, please try again');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong, please try again');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-6 ring-1 ring-primary/10">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>

          <h1 className="text-3xl font-black text-primary mb-2 tracking-tight">
            Meet Your New Scholarship Co-Creator. <span className="text-on-surface-variant/40">(Coming Soon)</span>
          </h1>

          <p className="text-base font-semibold text-on-surface-variant mb-5">
            Overcome writer's block and build applications that stand out.
          </p>

          <p className="text-sm text-on-surface-variant/70 leading-relaxed max-w-lg mx-auto">
            African students have incredible stories to tell, but formatting those experiences
            to meet the exact expectations of international admissions committees can be
            exhausting. Our upcoming AI Application Studio is designed to act as your personal
            writing advisor. Instead of giving you a generic template, it uses a guided
            interview approach to draw out your authentic voice and specific achievements,
            perfectly tailored to the scholarship prompt.
          </p>
        </div>

        <div className="grid gap-4 mb-10">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="flex items-start gap-4 p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/40"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary mb-1">{f.title}</h3>
                <p className="text-xs text-on-surface-variant/70 leading-relaxed">{f.body}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          {status === 'success' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 text-sm font-semibold text-success"
            >
              <CheckCircle className="w-5 h-5" />
              {message}
            </motion.div>
          ) : (
            <>
              <p className="text-xs text-on-surface-variant/50 mb-4">
                Join the waitlist to be the first to know when we launch.
              </p>

              <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-sm mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (status === 'error' || status === 'duplicate') { setStatus('idle'); setMessage(''); } }}
                  placeholder="Enter your email"
                  disabled={status === 'loading'}
                  className="flex-1 p-3 bg-surface border border-outline-variant/60 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors disabled:opacity-50"
                  required
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="px-5 py-3 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary-container transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap text-sm"
                >
                  {status === 'loading' ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Joining...
                    </span>
                  ) : (
                    'Notify Me When It\'s Live'
                  )}
                </button>
              </form>

              {(status === 'error' || status === 'duplicate') && message && (
                <p className="mt-3 text-xs font-medium text-error">{message}</p>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
