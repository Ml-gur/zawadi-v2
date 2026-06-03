import React, { useState } from 'react';

interface ForgotPasswordProps {
  onBack: () => void;
}

export default function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setError('');
    setLoading(true);
    setResetLink('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Request failed');
        setLoading(false);
        return;
      }
      if (data.reset_token) {
        const origin = window.location.origin;
        setResetLink(`${origin}/reset-password?token=${data.reset_token}`);
      }
      setLoading(false);
    } catch {
      setError('Connection error. Make sure the server is running.');
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

        {resetLink ? (
          <div className="space-y-4">
            <div className="p-4 bg-status-success/10 border border-status-success/20 text-status-success text-xs rounded-xl">
              A reset link has been generated. Click the link below to reset your password.
            </div>
            <div className="p-3 bg-surface border border-outline-variant/60 rounded-xl break-all">
              <a
                href={resetLink}
                className="text-secondary hover:text-primary font-medium text-xs underline"
              >
                {resetLink}
              </a>
            </div>
            <p className="text-[10px] text-outline text-center">
              This link expires in 1 hour.
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
