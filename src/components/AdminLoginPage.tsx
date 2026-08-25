import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

// Optional client-side pre-check only; the real boundary is RLS + role checks server-side.
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string | undefined;

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (ADMIN_EMAIL && email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      setError('Access denied. Admin privileges required.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message === 'Invalid login credentials'
          ? 'Incorrect email or password'
          : authError.message);
        setLoading(false);
        return;
      }

      if (!data.user || !data.session) {
        setError('Login failed. Please try again.');
        setLoading(false);
        return;
      }

      // Verify the user has super_admin role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile || profile.role !== 'super_admin') {
        setError('Access denied. Admin privileges required.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      window.location.href = '/admin';
    } catch {
      setError('Connection error. Please check your connection.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="bg-off-black-ink border border-ash rounded-lg p-8 space-y-5">
          <div className="text-center">
            <div className="w-10 h-10 rounded-lg border border-ash flex items-center justify-center font-mono font-bold text-sm text-accent-green mx-auto mb-3">Z</div>
            <h3 className="text-lg font-bold text-pure-white">Sign in</h3>
            <p className="text-xs text-muted mt-1">Enter your credentials to continue</p>
          </div>

          {error && (
            <div className="p-3 border border-status-urgent/40 text-status-urgent text-xs rounded-lg text-center">{error}</div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full p-3 bg-canvas border border-ash rounded-lg text-sm text-pure-white placeholder:text-muted focus:border-accent-green outline-none transition-colors"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full p-3 bg-canvas border border-ash rounded-lg text-sm text-pure-white placeholder:text-muted focus:border-accent-green outline-none transition-colors"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-gradient-stroke w-full py-3 text-pure-white font-semibold rounded-full transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
