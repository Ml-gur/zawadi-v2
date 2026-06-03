import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface AuthScreenProps {
  onLoginSuccess: (email: string, token?: string) => void;
  countries: string[];
}

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
            // Account exists — try to sign in anyway
            setErrorMsg('Account created! Signing you in automatically...');
            const retrySignIn = await supabase.auth.signInWithPassword({ email, password });
            if (retrySignIn.data?.session) {
              await onLoginSuccess(email, retrySignIn.data.session.access_token);
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
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-grid-pattern">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-8 shadow-xl relative overflow-hidden animate-sweep">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-secondary-container to-secondary"></div>
        
        <h3 className="font-display text-2xl font-black text-primary text-center mb-2">
          {isSignUp ? "Create Account" : "Sign In"}
        </h3>
        <p className="text-xs text-on-surface-variant text-center mb-8">
          {isSignUp 
            ? "Your scholarship journey starts here." 
            : "Welcome back — continue your scholarship journey."
          }
        </p>

        {errorMsg && (
          <div className="mb-6 p-4 bg-error-container/10 border border-error/20 text-error text-xs rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">warning</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-4" onKeyDown={handleKeyDown}>
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Full Name</label>
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full p-3 bg-surface border border-outline-variant/60 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                type="text"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Email Address</label>
            <input 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              className={`w-full p-3 bg-surface border ${emailError ? 'border-red-500' : 'border-outline-variant/60'} rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors`}
              type="email"
            />
            {emailError && <p className="text-[11px] text-red-600 font-medium mt-1">{emailError}</p>}
          </div>

          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Country of Citizenship</label>
              <select 
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full p-3 bg-surface border border-outline-variant/60 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors cursor-pointer"
              >
                {countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Password</label>
            <input 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className={`w-full p-3 bg-surface border ${passwordError ? 'border-red-500' : 'border-outline-variant/60'} rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors`}
              type="password"
            />
            {passwordError && <p className="text-[11px] text-red-600 font-medium mt-1">{passwordError}</p>}
          </div>

          <button 
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="w-full py-3.5 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary-container transition-colors shadow-sm cursor-pointer mt-4 disabled:opacity-50"
          >
            {loading ? "Please wait..." : (isSignUp ? "Create Account" : "Sign In")}
          </button>

          {!isSignUp && (
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-[11px] text-on-surface-variant hover:text-secondary transition-colors font-medium cursor-pointer"
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
            className="text-xs text-secondary hover:text-primary transition-colors font-medium border-b border-secondary/30 pb-0.5 cursor-pointer"
          >
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up instead"}
          </button>
        </div>

        {!isSignUp && (
          <p className="mt-6 text-[10px] text-center text-outline">
            Sign in with your email and password
          </p>
        )}
      </div>
    </div>
  );
}
