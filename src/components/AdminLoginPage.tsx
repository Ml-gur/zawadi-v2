import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
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

      const token = data.session.access_token;
      localStorage.setItem('zawadi_admin_token', token);
      localStorage.setItem('zawadi_token', token);
      window.location.href = '/admin';
    } catch {
      setError('Connection error. Please check your connection.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-8 shadow-xl space-y-5">
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black text-sm mx-auto mb-3">Z</div>
            <h3 className="text-lg font-bold text-primary">Sign in</h3>
            <p className="text-xs text-on-surface-variant mt-1">Enter your credentials to continue</p>
          </div>

          {error && (
            <div className="p-3 bg-error-container/10 border border-error/20 text-error text-xs rounded-lg text-center">{error}</div>
          )}

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full p-3 bg-surface border border-outline-variant/60 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full p-3 bg-surface border border-outline-variant/60 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary-container transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
