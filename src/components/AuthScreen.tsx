import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { GhostPillButton } from './ui/GhostPillButton';

interface AuthScreenProps {
  onLoginSuccess: (email: string, token?: string) => void;
  countries: string[];
}

const inputBase =
  'w-full bg-canvas border rounded-lg px-4 py-3 min-h-[44px] text-cream placeholder:text-muted focus:border-accent-green focus-visible:ring-2 focus-visible:ring-accent-green/40 outline-none transition-colors';
const inputClass = `${inputBase} border-hairline`;
const inputErrorClass = `${inputBase} border-error`;

export default function AuthScreen({ onLoginSuccess, countries }: AuthScreenProps) {
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
          } else if (signInErr?.message?.includes('Email not confirmed')) {
            setErrorMsg('Account created! Please check your email for a confirmation link.');
          } else {
            // Account exists — try to sign in after brief delay
            setErrorMsg('Account created! Signing you in automatically...');
            await new Promise(r => setTimeout(r, 1500));
            const retrySignIn = await supabase.auth.signInWithPassword({ email, password });
            if (retrySignIn.data?.session) {
              await onLoginSuccess(email, retrySignIn.data.session.access_token);
              setLoading(false);
              return;
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
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-canvas bg-grid-pattern">
      <div className="w-full max-w-md bg-off-black border border-hairline rounded-lg p-6 animate-sweep">
        <h3 className="font-display text-2xl font-black text-cream text-center mb-2">
          {isSignUp ? "Create Account" : "Sign In"}
        </h3>
        <p className="text-xs text-muted text-center mb-8">
          {isSignUp
            ? "Your scholarship journey starts here."
            : "Welcome back — continue your scholarship journey."
          }
        </p>

        {errorMsg && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-error/20 bg-error/10 p-4 text-xs text-error">
            <span className="material-symbols-outlined text-sm">warning</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-4" onKeyDown={handleKeyDown}>
          {isSignUp && (
            <div>
              <label className="mb-2 block text-sm text-cream">Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className={inputClass}
                type="text"
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm text-cream">Email Address</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={emailError ? inputErrorClass : inputClass}
              type="email"
            />
            {emailError && <p className="mt-1 text-xs text-error">{emailError}</p>}
          </div>

          {isSignUp && (
            <div>
              <label className="mb-2 block text-sm text-cream">Country of Citizenship</label>
              <select
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
            <label className="mb-2 block text-sm text-cream">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className={passwordError ? inputErrorClass : inputClass}
              type="password"
            />
            {passwordError && <p className="mt-1 text-xs text-error">{passwordError}</p>}
          </div>

          <GhostPillButton
            type="button"
            variant="gradient"
            fullWidth
            disabled={loading}
            onClick={handleSubmit}
            className="mt-4"
          >
            {loading ? "Please wait..." : (isSignUp ? "Create Account" : "Sign In")}
          </GhostPillButton>

          {!isSignUp && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs font-medium text-accent-green underline-offset-4 hover:underline transition-colors cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={toggleMode}
            className="text-xs font-medium text-accent-green underline-offset-4 hover:underline transition-colors cursor-pointer"
          >
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up instead"}
          </button>
        </div>

        {!isSignUp && (
          <p className="mt-6 text-xs text-center text-muted">
            Sign in with your email and password
          </p>
        )}
      </div>
    </div>
  );
}
