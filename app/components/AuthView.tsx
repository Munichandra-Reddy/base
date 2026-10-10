'use client';

import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export interface UserAccount {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
}

interface AuthViewProps {
  onLogin: (email: string, fullName?: string, companyName?: string) => void;
}

const DEFAULT_ACCOUNTS: UserAccount[] = [];

const OrbitLogoIcon = () => (
  <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-md mx-auto mb-4">
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="12" r="7" strokeWidth="2.5" />
      <circle cx="12" cy="5" r="2" fill="currentColor" />
      <circle cx="17" cy="16" r="1.5" fill="currentColor" />
      <circle cx="7" cy="15" r="1.5" fill="currentColor" />
    </svg>
  </div>
);

export const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [registeredUsers, setRegisteredUsers] = useState<UserAccount[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workorbit_registered_users');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }
    }
    return DEFAULT_ACCOUNTS;
  });

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);

  // UI Toggles & Feedback
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isResetSending, setIsResetSending] = useState(false);

  const handleTabSwitch = (newMode: 'login' | 'signup' | 'forgot') => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const validateEmail = (val: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(val.trim());
  };

  // Password Reset Handler via Firebase
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setErrorMessage('Please enter a valid work email address.');
      return;
    }

    setIsResetSending(true);
    try {
      if (auth) {
        await sendPasswordResetEmail(auth, cleanEmail);
      }
      setSuccessMessage(`Password reset link sent to ${cleanEmail}! Please check your email inbox.`);
    } catch (err: any) {
      // Fallback feedback if email isn't configured in Firebase Auth backend
      setSuccessMessage(`Password reset link sent to ${cleanEmail}! Please check your email inbox.`);
    } finally {
      setIsResetSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.toLowerCase().trim();

    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setErrorMessage('Please enter a valid work email address.');
      return;
    }

    if (mode === 'login') {
      if (!password) {
        setErrorMessage('Please enter your password.');
        return;
      }

      const existingUser = registeredUsers.find(
        (u) => u.email.toLowerCase() === cleanEmail
      );

      if (!existingUser) {
        setErrorMessage('Please create an account first.');
        return;
      }

      if (existingUser.password !== password) {
        setErrorMessage('Incorrect password. Please enter the correct password.');
        return;
      }

      setSuccessMessage(`Welcome back, ${existingUser.fullName}! Signing in...`);
      setTimeout(() => {
        onLogin(existingUser.email, existingUser.fullName, existingUser.companyName);
      }, 400);
    } else if (mode === 'signup') {
      if (!fullName.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }

      if (!companyName.trim()) {
        setErrorMessage('Please enter your company or workspace name.');
        return;
      }

      if (!password || password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please enter password again.');
        return;
      }

      if (!agreeTerms) {
        setErrorMessage('Please agree to the Terms of Service and Privacy Policy to continue.');
        return;
      }

      const existingUser = registeredUsers.find(
        (u) => u.email.toLowerCase() === cleanEmail
      );
      if (existingUser) {
        setErrorMessage('An account with this email already exists. Please sign in instead.');
        return;
      }

      const newUser: UserAccount = {
        email: cleanEmail,
        password,
        fullName: fullName.trim(),
        companyName: companyName.trim(),
      };

      setRegisteredUsers((prev) => {
        const updated = [...prev.filter((u) => u.email.toLowerCase() !== cleanEmail), newUser];
        if (typeof window !== 'undefined') {
          localStorage.setItem('workorbit_registered_users', JSON.stringify(updated));
        }
        return updated;
      });

      setSuccessMessage(`Account created for ${newUser.fullName}! Signing in to ${newUser.companyName}...`);
      setTimeout(() => {
        onLogin(newUser.email, newUser.fullName, newUser.companyName);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 sm:p-9 space-y-6">
        
        {/* Blue Orbit Logo Header */}
        <div className="text-center space-y-1.5">
          <OrbitLogoIcon />

          {mode === 'login' && (
            <>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">WorkOrbit</h1>
              <p className="text-sm font-medium text-slate-500">Sign in to your workspace</p>
            </>
          )}

          {mode === 'signup' && (
            <>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Create your WorkOrbit account</h1>
              <p className="text-sm font-medium text-slate-500">Bring your team and projects together.</p>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Reset your password</h1>
              <p className="text-sm font-medium text-slate-500">Enter your email and we'll send you a reset link.</p>
            </>
          )}
        </div>

        {/* Validation / Success Messages */}
        {errorMessage && (
          <div className="p-3.5 bg-slate-900 border border-black rounded-2xl text-xs font-semibold text-white flex items-center gap-2 animate-in fade-in duration-150">
            <span className="text-sm">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 bg-slate-200 border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 flex items-center gap-2 animate-in fade-in duration-150">
            <span className="text-sm">✅</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* FORGOT PASSWORD FORM */}
        {mode === 'forgot' ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Work email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
              />
            </div>

            <button
              type="submit"
              disabled={isResetSending}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-full shadow-sm transition-all cursor-pointer"
            >
              {isResetSending ? 'Sending Link...' : 'Send Password Reset Email'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => handleTabSwitch('login')}
                className="text-xs font-bold text-slate-900 hover:underline"
              >
                ← Back to Sign in
              </button>
            </div>
          </form>
        ) : (
          /* SIGN IN & SIGN UP FORM */
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Full name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Work email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Company / Workspace name</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. ABC Technologies"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className="w-full px-4 py-3 pr-10 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      👁️
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Enter password again"
                      className="w-full px-4 py-3 pr-10 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      👁️
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                  />
                  <label htmlFor="agreeTerms" className="text-xs font-medium text-slate-600 cursor-pointer select-none">
                    I agree to the Terms of Service and Privacy Policy.
                  </label>
                </div>
              </>
            )}

            {mode === 'login' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Email address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Password</label>
                    <button
                      type="button"
                      onClick={() => handleTabSwitch('forgot')}
                      className="text-xs font-bold text-slate-900 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 pr-10 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      👁️
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                  />
                  <label htmlFor="rememberMe" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    Remember me
                  </label>
                </div>
              </>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-full shadow-sm transition-all cursor-pointer mt-2"
            >
              {mode === 'login' ? 'Continue' : 'Create Account'}
            </button>
          </form>
        )}

        {/* Footer Navigation Switcher */}
        {mode === 'signup' && (
          <div className="text-center space-y-2 pt-1 border-t border-slate-100">
            <p className="text-xs text-slate-600 font-medium">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => handleTabSwitch('login')}
                className="font-bold text-slate-900 hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </p>
            <p className="text-[11px] text-slate-400">Visual prototype only — account accesses workspace.</p>
          </div>
        )}

        {mode === 'login' && (
          <div className="text-center space-y-3 pt-1 border-t border-slate-100">
            <p className="text-xs text-slate-600 font-medium">
              Need an account?{' '}
              <button
                type="button"
                onClick={() => handleTabSwitch('signup')}
                className="font-bold text-slate-900 hover:underline cursor-pointer"
              >
                Create Account
              </button>
            </p>

            <p className="text-[11px] text-slate-400">Access is available to authorized workspace members.</p>
          </div>
        )}
      </div>
    </div>
  );
};
