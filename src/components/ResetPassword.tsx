import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { GhostPillButton } from './ui/GhostPillButton';

interface ResetPasswordProps {
  onBackToLogin: () => void;
}

const inputClass =
  'w-full bg-canvas border border-ash rounded-lg px-4 py-3 min-h-[44px] text-pure-white placeholder:text-muted focus:border-accent-green focus-visible:ring-2 focus-visible:ring-accent-green/40 outline-none transition-colors';

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
      <div className="min-h-[85vh] flex items-center justify-center p-6 bg-canvas bg-grid-pattern">
        <div className="w-full max-w-md bg-off-black-ink border border-ash rounded-lg p-6 text-center">
          <p className="text-xs text-muted">Checking reset link...</p>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-6 bg-canvas bg-grid-pattern">
        <div className="w-full max-w-md bg-off-black-ink border border-ash rounded-lg p-6 animate-sweep">
          <h3 className="font-display text-2xl font-black text-pure-white text-center mb-2">Invalid Link</h3>
          <p className="text-xs text-muted text-center mb-8">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <GhostPillButton
            type="button"
            variant="gradient"
            fullWidth
            onClick={onBackToLogin}
          >
            Back to Sign In
          </GhostPillButton>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-6 bg-canvas bg-grid-pattern">
        <div className="w-full max-w-md bg-off-black-ink border border-ash rounded-lg p-6 animate-sweep">
          <h3 className="font-display text-2xl font-black text-pure-white text-center mb-2">Password Reset</h3>
          <div className="mb-8 rounded-lg border border-status-success/20 bg-status-success/10 p-4 text-xs text-status-success">
            Your password has been reset successfully. You can now sign in with your new password.
          </div>
          <GhostPillButton
            type="button"
            variant="gradient"
            fullWidth
            onClick={onBackToLogin}
          >
            Back to Sign In
          </GhostPillButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-canvas bg-grid-pattern">
      <div className="w-full max-w-md bg-off-black-ink border border-ash rounded-lg p-6 animate-sweep">
        <h3 className="font-display text-2xl font-black text-pure-white text-center mb-2">Set New Password</h3>
        <p className="text-xs text-muted text-center mb-8">
          Enter your new password below.
        </p>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-error/20 bg-error/10 p-4 text-xs text-error">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-pure-white">New Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className={inputClass}
              type="password"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-pure-white">Confirm Password</label>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              className={inputClass}
              type="password"
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
            {loading ? 'Resetting...' : 'Reset Password'}
          </GhostPillButton>

          <div className="text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-xs font-medium text-accent-green underline-offset-4 hover:underline transition-colors cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
