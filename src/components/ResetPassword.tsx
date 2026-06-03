import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ResetPasswordProps {
  onBackToLogin: () => void;
}

export default function ResetPassword({ onBackToLogin }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch {
      setError('Connection error. Please check your connection.');
      setLoading(false);
    }
  };

  // Still loading session state
  if (hasSession === null) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-6 bg-grid-pattern">
        <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-8 shadow-xl text-center">
          <p className="text-xs text-on-surface-variant">Checking reset link...</p>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-6 bg-grid-pattern">
        <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-8 shadow-xl relative overflow-hidden animate-sweep">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-secondary-container to-secondary"></div>
          <h3 className="font-display text-2xl font-black text-primary text-center mb-2">Invalid Link</h3>
          <p className="text-xs text-on-surface-variant text-center mb-8">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full py-3.5 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary-container transition-colors shadow-sm cursor-pointer"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-6 bg-grid-pattern">
        <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-8 shadow-xl relative overflow-hidden animate-sweep">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-secondary-container to-secondary"></div>
          <h3 className="font-display text-2xl font-black text-primary text-center mb-2">Password Reset</h3>
          <div className="p-4 bg-status-success/10 border border-status-success/20 text-status-success text-xs rounded-xl mb-8">
            Your password has been reset successfully. You can now sign in with your new password.
          </div>
          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full py-3.5 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary-container transition-colors shadow-sm cursor-pointer"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-grid-pattern">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-8 shadow-xl relative overflow-hidden animate-sweep">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-secondary-container to-secondary"></div>

        <h3 className="font-display text-2xl font-black text-primary text-center mb-2">Set New Password</h3>
        <p className="text-xs text-on-surface-variant text-center mb-8">
          Enter your new password below.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-error-container/10 border border-error/20 text-error text-xs rounded-xl flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">New Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full p-3 bg-surface border border-outline-variant/60 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              type="password"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Confirm Password</label>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              className="w-full p-3 bg-surface border border-outline-variant/60 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              type="password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary-container transition-colors shadow-sm cursor-pointer mt-4 disabled:opacity-50"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-xs text-secondary hover:text-primary transition-colors font-medium cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
