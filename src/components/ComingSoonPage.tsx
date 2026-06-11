import { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ComingSoonPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      const waitlist = JSON.parse(localStorage.getItem('essay_waitlist') || '[]');
      if (waitlist.includes(email.trim())) {
        toast.success('You\'re already on the list!');
        setSubmitted(true);
        return;
      }
      waitlist.push(email.trim());
      localStorage.setItem('essay_waitlist', JSON.stringify(waitlist));
      setSubmitted(true);
      toast.success('You\'ll be notified when AI Essay Studio launches!');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-lg w-full"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-6 ring-1 ring-primary/10">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-3xl font-black text-primary mb-2 tracking-tight">
          The AI Application Studio: Coming Soon
        </h1>

        <p className="text-base font-semibold text-on-surface-variant mb-4">
          Your intelligent co-creator for winning scholarship essays.
        </p>

        <p className="text-sm text-on-surface-variant/70 leading-relaxed max-w-sm mx-auto mb-8">
          We are building a powerful AI assistant that doesn't just write for you—it writes
          with you. Soon, you will be able to turn your unique cultural and academic
          experiences into highly competitive Personal Statements, Motivation Letters, and
          Study Plans. Join the waitlist to be the first to know when we launch our guided
          drafting tools and authentic voice-learning AI.
        </p>

        {submitted ? (
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-success">
            <CheckCircle className="w-5 h-5" />
            You're on the waitlist. We'll notify you when it's live!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-sm mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 p-3 bg-surface border border-outline-variant/60 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-3 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary-container transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Notify Me When It\'s Live'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
