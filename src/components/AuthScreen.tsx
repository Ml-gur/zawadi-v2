import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthScreenProps {
  onLoginSuccess: (email: string, token?: string) => void;
  countries: string[];
  onClose?: () => void;
}

const inputBase =
  'w-full bg-parchment border rounded-lg px-4 py-3 min-h-[44px] text-off-black-ink placeholder:text-stone focus:border-graphite focus-visible:ring-2 focus-visible:ring-surface-tint/40 outline-none transition-colors';
const inputClass = `${inputBase} border-ash`;
const inputErrorClass = `${inputBase} border-error`;

export default function AuthScreen({ onLoginSuccess, countries, onClose }: AuthScreenProps) {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('Kenya');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSubmit = async () => {
    setEmailError('');
    setPasswordError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    if (!password || password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, country } }
        });

        if (error) {
          if (error.message.includes('already registered') || error.message.includes('already exists')) {
            setErrorMsg('An account with this email already exists');
          } else if (error.message.includes('Invalid login credentials')) {
            setErrorMsg('Incorrect email or password');
          } else {
            setErrorMsg(error.message);
          }
          setLoading(false);
          return;
        }

        if (data.user && data.session) {
          await onLoginSuccess(data.user.email!, data.session.access_token);
          setLoading(false);
          return;
        }

        // No session = email confirmation may be required. Try auto-login.
        if (data.user) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInData?.session) {
            await onLoginSuccess(email, signInData.session.access_token);
          } else {
            // Sign-in failed after successful sign-up — most likely email
            // confirmation is required.  Supabase may surface this as
            // "Email not confirmed", "email_not_confirmed", or a generic
            // "Invalid login credentials" error depending on project config.
            const msg = signInErr?.message ?? '';
            const needsConfirmation =
              msg.includes('Email not confirmed') ||
              msg.includes('email_not_confirmed') ||
              msg.toLowerCase().includes('email') && msg.toLowerCase().includes('confirm');
            if (needsConfirmation) {
              setErrorMsg('Account created! Please check your email for a confirmation link.');
            } else if (msg.includes('Invalid login credentials')) {
              // Auto-login failed for another reason — still tell the user
              // the account was created so they can try signing in manually.
              setErrorMsg('Account created! Please check your email, then sign in with your credentials.');
            } else {
              setErrorMsg('Account created! Please check your email for a confirmation link.');
            }
          }
        }
        setLoading(false);
        return;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setErrorMsg('Incorrect email or password');
          } else {
            setErrorMsg(error.message);
          }
          setLoading(false);
          return;
        }

        if (data.user && data.session) {
          await onLoginSuccess(data.user.email!, data.session.access_token);
        }
        setLoading(false);
        return;
      }
    } catch (err: any) {
      setErrorMsg("Cannot reach server. Please check your connection.");
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setEmail('');
    setName('');
    setPassword('');
    setCountry('Kenya');
    setErrorMsg('');
    setEmailError('');
    setPasswordError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative w-full max-w-md bg-pure-white border border-ash rounded-ed p-7 md:p-8 animate-sweep">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign in"
          className="icon-btn absolute top-3 right-3 inline-flex items-center justify-center rounded-full text-graphite hover:text-off-black-ink transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" aria-hidden />
        </button>
      )}

      <h3 className="text-heading tracking-tight text-off-black-ink mb-1.5">
        {isSignUp ? 'Create your free profile' : 'Welcome back'}
      </h3>
      <p className="text-ed-body-sm text-graphite mb-7">
        {isSignUp
          ? 'Set up in three minutes. No fees, no card.'
          : 'Sign in to manage your matched applications.'}
      </p>

      {errorMsg && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-error/30 bg-error/10 p-4 text-xs font-medium text-error">
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="space-y-4" onKeyDown={handleKeyDown}>
        {isSignUp && (
          <div>
            <label htmlFor="auth-name" className="mb-1.5 block text-ed-body-sm font-medium text-off-black-ink">Full Name</label>
            <input
              id="auth-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className={inputClass}
              type="text"
            />
          </div>
        )}

        <div>
          <label htmlFor="auth-email" className="mb-1.5 block text-ed-body-sm font-medium text-off-black-ink">Email Address</label>
          <input
            id="auth-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={emailError ? inputErrorClass : inputClass}
            type="email"
            autoComplete="email"
          />
          {emailError && <p className="mt-1 text-xs text-error">{emailError}</p>}
        </div>

        {isSignUp && (
          <div>
            <label htmlFor="auth-country" className="mb-1.5 block text-ed-body-sm font-medium text-off-black-ink">Country of Citizenship</label>
            <select
              id="auth-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="auth-password" className="mb-1.5 block text-ed-body-sm font-medium text-off-black-ink">Password</label>
          <input
            id="auth-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className={passwordError ? inputErrorClass : inputClass}
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />
          {passwordError && <p className="mt-1 text-xs text-error">{passwordError}</p>}
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="w-full mt-2 inline-flex items-center justify-center rounded-full bg-electric-lime px-8 min-h-[52px] text-base font-medium text-off-black-ink hover:bg-lime-hover active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
        >
          {loading ? 'Please wait…' : (isSignUp ? 'Create free account' : 'Continue to dashboard')}
        </button>

        {!isSignUp && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-xs font-medium text-graphite underline underline-offset-4 decoration-ash hover:text-off-black-ink hover:decoration-graphite transition-colors cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 pt-5 border-t border-ash text-center">
        <button
          type="button"
          onClick={toggleMode}
          className="text-xs font-medium text-graphite hover:text-off-black-ink transition-colors cursor-pointer"
        >
          {isSignUp ? 'Already have an account? ' : "Don't have an account yet? "}
          <span className="underline underline-offset-4 decoration-electric-lime">{isSignUp ? 'Sign in' : 'Sign up free'}</span>
        </button>
      </div>
    </div>
  );
}
