import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface ForgotPasswordProps {
  onBack: () => void;
}

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
        redirectTo: window.location.origin + '/reset-password',
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
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-grid-pattern">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-8 shadow-xl relative overflow-hidden animate-sweep">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-secondary-container to-secondary"></div>

        <h3 className="font-display text-2xl font-black text-primary text-center mb-2">Reset Password</h3>
        <p className="text-xs text-on-surface-variant text-center mb-8">
          Enter your email to receive a password reset link.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-error-container/10 border border-error/20 text-error text-xs rounded-xl flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {sent ? (
          <div className="space-y-4">
            <div className="p-4 bg-status-success/10 border border-status-success/20 text-status-success text-xs rounded-xl">
              A password reset link has been sent to your email. Please check your inbox and follow the link to reset your password.
            </div>
            <p className="text-[10px] text-outline text-center">
              The link expires in 1 hour. If you don't see the email, check your spam folder.
            </p>
            <button
              type="button"
              onClick={onBack}
              className="w-full py-3.5 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary-container transition-colors shadow-sm cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Email Address</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full p-3 bg-surface border border-outline-variant/60 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                type="email"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary-container transition-colors shadow-sm cursor-pointer mt-4 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={onBack}
                className="text-xs text-secondary hover:text-primary transition-colors font-medium cursor-pointer"
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
