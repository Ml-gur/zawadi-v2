import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { GhostPillButton } from './ui/GhostPillButton';

interface ForgotPasswordProps {
  onBack: () => void;
}

const inputClass =
  'w-full bg-canvas border border-ash rounded-lg px-4 py-3 min-h-[44px] text-pure-white placeholder:text-muted focus:border-accent-green focus-visible:ring-2 focus-visible:ring-accent-green/40 outline-none transition-colors';

export default function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setSent(true);
      setLoading(false);
    } catch {
      setError('Connection error. Please check your connection.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-canvas bg-grid-pattern">
      <div className="w-full max-w-md bg-off-black-ink border border-ash rounded-lg p-6 animate-sweep">
        <h3 className="font-display text-2xl font-black text-pure-white text-center mb-2">Reset Password</h3>
        <p className="text-xs text-muted text-center mb-8">
          Enter your email to receive a password reset link.
        </p>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-error/20 bg-error/10 p-4 text-xs text-error">
            <span>{error}</span>
          </div>
        )}

        {sent ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-status-success/20 bg-status-success/10 p-4 text-xs text-status-success">
              A password reset link has been sent to your email. Please check your inbox and follow the link to reset your password.
            </div>
            <p className="text-xs text-muted text-center">
              The link expires in 1 hour. If you don't see the email, check your spam folder.
            </p>
            <GhostPillButton
              type="button"
              variant="gradient"
              fullWidth
              onClick={onBack}
            >
              Back to Sign In
            </GhostPillButton>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-pure-white">Email Address</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
                type="email"
                required
              />
            </div>

            <GhostPillButton
              type="submit"
              variant="gradient"
              fullWidth
              disabled={loading}
              className="mt-4"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </GhostPillButton>

            <div className="text-center">
              <button
                type="button"
                onClick={onBack}
                className="text-xs font-medium text-accent-green underline-offset-4 hover:underline transition-colors cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
