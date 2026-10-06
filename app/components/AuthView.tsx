'use client';

import React, { useState } from 'react';
import { WorkOrbitLogo } from './Icons';

interface AuthViewProps {
  onLogin: (email: string, fullName?: string) => void;
}

const DEFAULT_ACCOUNTS = [
  'rahul@abctech.com',
  'priya@abctech.com',
  'chandra@abctech.com',
  'ananya@abctech.com',
  'michael@abctech.com',
];

export const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [registeredEmails, setRegisteredEmails] = useState<string[]>(DEFAULT_ACCOUNTS);
  
  const [email, setEmail] = useState('rahul@abctech.com');
  const [password, setPassword] = useState('password123');
  const [fullName, setFullName] = useState('Rahul Kumar');
  const [companyName, setCompanyName] = useState('ABC Technologies');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [suggestSignup, setSuggestSignup] = useState(false);
  const [suggestLogin, setSuggestLogin] = useState(false);

  const handleTabSwitch = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSuggestSignup(false);
    setSuggestLogin(false);
  };

  const validateEmail = (val: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(val.trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setSuggestSignup(false);
    setSuggestLogin(false);

    const cleanEmail = email.toLowerCase().trim();

    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (mode === 'login') {
      const accountExists = registeredEmails.some((acc) => acc.toLowerCase() === cleanEmail);

      if (!accountExists) {
        setErrorMessage(`No account found with "${cleanEmail}". Please create an account first.`);
        setSuggestSignup(true);
        return;
      }

      setSuccessMessage('Sign in successful! Entering workspace...');
      setTimeout(() => {
        onLogin(cleanEmail);
      }, 400);
    } else {
      if (!fullName.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }

      if (!companyName.trim()) {
        setErrorMessage('Please enter your workspace or company name.');
        return;
      }

      const accountExists = registeredEmails.some((acc) => acc.toLowerCase() === cleanEmail);

      if (accountExists) {
        setErrorMessage(`An account with "${cleanEmail}" already exists. Please log in.`);
        setSuggestLogin(true);
        return;
      }

      setRegisteredEmails((prev) => [...prev, cleanEmail]);
      setSuccessMessage(`Account created successfully for ${fullName}! Entering workspace...`);
      setTimeout(() => {
        onLogin(cleanEmail, fullName);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      {/* Container */}
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl p-9 space-y-7">
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center gap-2.5 text-3xl font-black text-slate-900 tracking-tight">
            <WorkOrbitLogo />
            <span>WorkOrbit</span>
          </div>
          <p className="text-sm text-slate-500 font-semibold">
            Project management, campfire chat, and team check-ins in one place.
          </p>
        </div>

        {/* Toggle Mode Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl">
          <button
            type="button"
            onClick={() => handleTabSwitch('login')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              mode === 'login' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('signup')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              mode === 'signup' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Validation Feedback Banners */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <span className="font-bold text-base">⚠️</span>
              <div className="flex-1 font-semibold leading-relaxed">{errorMessage}</div>
            </div>

            {suggestSignup && (
              <button
                type="button"
                onClick={() => handleTabSwitch('signup')}
                className="w-full mt-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs"
              >
                Create Account Now →
              </button>
            )}

            {suggestLogin && (
              <button
                type="button"
                onClick={() => handleTabSwitch('login')}
                className="w-full mt-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs"
              >
                Log In to Existing Account →
              </button>
            )}
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-700 flex items-center gap-2.5 animate-in fade-in duration-200 font-bold">
            <span className="font-bold text-base">✅</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4.5">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Kumar"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Workspace / Company Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. ABC Technologies"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-400 mt-1 font-medium block">Must be at least 6 characters.</span>
          </div>

          {mode === 'login' && (
            <div className="flex items-center justify-between text-xs font-semibold">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600" />
                <span>Remember me</span>
              </label>
              <a href="#" className="text-blue-600 font-bold hover:underline">
                Forgot password?
              </a>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl shadow-sm transition-all"
          >
            {mode === 'login' ? 'Sign In to Workspace' : 'Create Workspace Account'}
          </button>
        </form>

        {/* Demo Quick Sign-in */}
        <div className="pt-3 border-t border-slate-100 text-center">
          <p className="text-xs font-medium text-slate-400 mb-2">Want to test as Rahul?</p>
          <button
            onClick={() => {
              setEmail('rahul@abctech.com');
              onLogin('rahul@abctech.com');
            }}
            className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition-colors border border-blue-100"
          >
            ⚡ Demo Sign In as rahul (Workspace Admin)
          </button>
        </div>
      </div>
    </div>
  );
};
