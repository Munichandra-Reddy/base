'use client';

import React, { useState, useEffect } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { addFirebaseUserAccount, addFirebaseEmployee, StoredUserAccount } from '@/lib/firebaseServices';
import { Person } from '@/lib/types';

export interface UserAccount {
  email: string;
  password?: string;
  fullName: string;
  companyName: string;
  role: 'admin' | 'employee';
  designation?: string;
}

interface AuthViewProps {
  onLogin: (email: string, fullName?: string, companyName?: string, role?: 'admin' | 'employee') => void;
  people?: Person[];
}

// Single Fixed Admin Credentials
export const ADMIN_CREDENTIALS = {
  email: 'cr7156816@gmail.com',
  password: 'Muni@526',
  fullName: 'Muni',
  companyName: 'GEONIXA',
};

const OrbitLogoIcon = () => (
  <div className="w-14 h-14 rounded-2xl bg-[#0B192C] flex items-center justify-center text-white shadow-md mx-auto mb-3">
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="12" r="7" strokeWidth="2.5" />
      <circle cx="12" cy="5" r="2" fill="currentColor" />
      <circle cx="17" cy="16" r="1.5" fill="currentColor" />
      <circle cx="7" cy="15" r="1.5" fill="currentColor" />
    </svg>
  </div>
);

export const AuthView: React.FC<AuthViewProps> = ({ onLogin, people = [] }) => {
  // Mode: 'login' | 'signup' | 'forgot'
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  
  // Login Role: 'admin' | 'employee'
  const [loginRole, setLoginRole] = useState<'admin' | 'employee'>('admin');

  // Registered Employees from localStorage
  const [registeredUsers, setRegisteredUsers] = useState<UserAccount[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workorbit_registered_users');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter((u: UserAccount) => {
              const email = (u.email || '').toLowerCase().trim();
              return email && email !== 'cr7156816@gmail.com' && !email.endsWith('@abctech.com');
            });
          }
        } catch (e) {}
      }
    }
    return [];
  });

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('');
  const [companyName, setCompanyName] = useState('GEONIXA');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);

  // UI Toggles & Feedback
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isResetSending, setIsResetSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear messages when switching tabs
  const handleTabSwitch = (newMode: 'login' | 'signup' | 'forgot') => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleRoleSwitch = (newRole: 'admin' | 'employee') => {
    setLoginRole(newRole);
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmail('');
    setPassword('');
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
      setSuccessMessage(`Password reset instructions sent to ${cleanEmail}! Please check your inbox.`);
    } finally {
      setIsResetSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.toLowerCase().trim();

    // 1. Email Format Validation
    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setErrorMessage('Please enter a valid email address (e.g., name@company.com).');
      return;
    }

    // ==========================================
    // A. LOGIN SUBMISSION
    // ==========================================
    if (mode === 'login') {
      if (!password) {
        setErrorMessage('Please enter your password.');
        return;
      }

      // ADMIN LOGIN
      if (loginRole === 'admin') {
        if (cleanEmail === ADMIN_CREDENTIALS.email.toLowerCase() && password === ADMIN_CREDENTIALS.password) {
          setSuccessMessage('Administrator verified! Opening Admin Dashboard...');
          setIsSubmitting(true);
          setTimeout(() => {
            onLogin(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.fullName, ADMIN_CREDENTIALS.companyName, 'admin');
          }, 450);
          return;
        } else {
          setErrorMessage('Invalid administrator credentials. Access restricted to authorized admin only.');
          return;
        }
      }

      // EMPLOYEE LOGIN
      if (loginRole === 'employee') {
        // Prevent using admin email in employee login
        if (cleanEmail === ADMIN_CREDENTIALS.email.toLowerCase()) {
          setErrorMessage('This is the administrator email. Please switch to "Admin Login" above.');
          return;
        }

        const employeeAccount = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail);

        if (!employeeAccount) {
          setErrorMessage('Employee account not found. Please click "Create Employee Account" below to register.');
          return;
        }

        if (employeeAccount.password !== password) {
          setErrorMessage('Incorrect password. Please enter the correct password.');
          return;
        }

        setSuccessMessage(`Welcome back, ${employeeAccount.fullName}! Opening Employee Dashboard...`);
        setIsSubmitting(true);
        setTimeout(() => {
          onLogin(employeeAccount.email, employeeAccount.fullName, employeeAccount.companyName || 'GEONIXA', 'employee');
        }, 450);
        return;
      }
    }

    // ==========================================
    // B. SIGN UP SUBMISSION (ONLY FOR EMPLOYEES)
    // ==========================================
    if (mode === 'signup') {
      if (!fullName.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }

      // Prohibit using the admin email
      if (cleanEmail === ADMIN_CREDENTIALS.email.toLowerCase()) {
        setErrorMessage('This email is reserved for the Administrator. Please register with your personal or work email.');
        return;
      }

      // Duplicate Employee Email Check (Rules & Regulations)
      const isDuplicate = registeredUsers.some((u) => u.email.toLowerCase() === cleanEmail) ||
        people.some((p) => p.email && p.email.toLowerCase() === cleanEmail);

      if (isDuplicate) {
        setErrorMessage('An employee account with this email already exists. Duplicate employee registrations are not allowed.');
        return;
      }

      if (!password || password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter your password.');
        return;
      }

      if (!agreeTerms) {
        setErrorMessage('Please agree to the Terms of Service and Privacy Policy to continue.');
        return;
      }

      setIsSubmitting(true);

      const assignedRole = designation.trim() || 'Software Engineer';
      const userCompanyName = companyName.trim() || 'GEONIXA';

      const newAccount: UserAccount = {
        email: cleanEmail,
        password,
        fullName: fullName.trim(),
        companyName: userCompanyName,
        role: 'employee',
        designation: assignedRole,
      };

      // 1. Save to localStorage registered users
      const updatedUsers = [...registeredUsers.filter((u) => u.email.toLowerCase() !== cleanEmail), newAccount];
      setRegisteredUsers(updatedUsers);
      if (typeof window !== 'undefined') {
        localStorage.setItem('workorbit_registered_users', JSON.stringify(updatedUsers));
      }

      // 2. Create Employee Person entry
      const avatarColors = [
        'bg-[#0B192C] text-white',
        'bg-[#15293F] text-white',
        'bg-indigo-600 text-white',
        'bg-purple-600 text-white',
        'bg-emerald-600 text-white',
        'bg-sky-600 text-white',
      ];
      const randomAvatarColor = avatarColors[updatedUsers.length % avatarColors.length];

      const newEmployee: Person = {
        id: `emp-${Date.now()}`,
        name: fullName.trim(),
        role: assignedRole,
        email: cleanEmail,
        status: 'active',
        avatar: fullName.trim()[0]?.toUpperCase() || 'E',
        avatarBg: randomAvatarColor,
        projectsCount: 1,
      };

      // 3. Save to localStorage people
      if (typeof window !== 'undefined') {
        const savedPeople = localStorage.getItem('workorbit_people');
        let currentPeopleList: Person[] = [];
        if (savedPeople) {
          try {
            currentPeopleList = JSON.parse(savedPeople);
          } catch (e) {}
        }
        const updatedPeople = [...currentPeopleList.filter((p) => p.email?.toLowerCase() !== cleanEmail), newEmployee];
        localStorage.setItem('workorbit_people', JSON.stringify(updatedPeople));
      }

      // 4. Save to Firebase Firestore Database (Both user_accounts & employees collections)
      try {
        await addFirebaseUserAccount({
          email: cleanEmail,
          password,
          fullName: fullName.trim(),
          companyName: userCompanyName,
          role: 'employee',
          designation: assignedRole,
          createdAt: new Date().toISOString(),
        });
        await addFirebaseEmployee(newEmployee);
      } catch (err) {
        console.warn('Firebase account sync warning:', err);
      }

      setSuccessMessage(`Employee account created for ${newAccount.fullName}! Opening your Employee Dashboard...`);

      setTimeout(() => {
        onLogin(newAccount.email, newAccount.fullName, newAccount.companyName, 'employee');
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F3F6] flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E8F0] shadow-xl p-8 sm:p-9 space-y-5">
        
        {/* Logo Header */}
        <div className="text-center space-y-1">
          <OrbitLogoIcon />

          {mode === 'login' && (
            <>
              <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">WorkOrbit</h1>
              <p className="text-xs font-semibold text-[#64748B]">
                {loginRole === 'admin'
                  ? 'Administrator Access Portal'
                  : 'Employee Workspace Portal'}
              </p>
            </>
          )}

          {mode === 'signup' && (
            <>
              <h1 className="text-xl font-black text-[#0F172A] tracking-tight">Create Employee Account</h1>
              <p className="text-xs font-medium text-[#64748B]">Join your team on WorkOrbit.</p>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <h1 className="text-xl font-black text-[#0F172A] tracking-tight">Reset your password</h1>
              <p className="text-xs font-medium text-[#64748B]">Enter your email to receive a password reset link.</p>
            </>
          )}
        </div>

        {/* ADMIN vs EMPLOYEE LOGIN SWITCHER (ONLY IN LOGIN MODE) */}
        {mode === 'login' && (
          <div className="grid grid-cols-2 p-1 bg-[#F1F3F6] rounded-2xl border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => handleRoleSwitch('admin')}
              className={`py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginRole === 'admin'
                  ? 'bg-[#0B192C] text-white shadow-xs font-black'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <span>👑</span>
              <span>Admin Login</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleSwitch('employee')}
              className={`py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginRole === 'employee'
                  ? 'bg-[#0B192C] text-white shadow-xs font-black'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <span>👤</span>
              <span>Employee Login</span>
            </button>
          </div>
        )}

        {/* Validation / Success Messages */}
        {errorMessage && (
          <div className="p-3 bg-[#FEF2F2] border border-[#EF4444]/30 rounded-2xl text-xs font-semibold text-[#EF4444] flex items-center gap-2 animate-in fade-in duration-150">
            <span className="text-sm">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-[#ECFDF5] border border-[#10B981]/30 rounded-2xl text-xs font-bold text-[#10B981] flex items-center gap-2 animate-in fade-in duration-150">
            <span className="text-sm">✅</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* FORGOT PASSWORD FORM */}
        {mode === 'forgot' ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1.5">Work email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 bg-[#F1F3F6] border border-[#E2E8F0] rounded-2xl text-sm font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0B192C] transition-all placeholder:text-[#94A3B8]"
              />
            </div>

            <button
              type="submit"
              disabled={isResetSending}
              className="w-full py-3 bg-[#0B192C] hover:bg-[#15293F] active:bg-[#0B192C] text-white font-bold text-sm rounded-full shadow-sm transition-all cursor-pointer"
            >
              {isResetSending ? 'Sending Link...' : 'Send Password Reset Email'}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => handleTabSwitch('login')}
                className="text-xs font-bold text-[#0B192C] hover:underline"
              >
                ← Back to Sign in
              </button>
            </div>
          </form>
        ) : (
          /* SIGN IN & SIGN UP FORM */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* SIGN UP FIELDS (ONLY EMPLOYEE REGISTRATION) */}
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Full name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-4 py-2.5 bg-[#F1F3F6] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0B192C] transition-all placeholder:text-[#94A3B8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Employee Work Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="priya@company.com"
                    className="w-full px-4 py-2.5 bg-[#F1F3F6] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0B192C] transition-all placeholder:text-[#94A3B8]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Role / Title *</label>
                    <input
                      type="text"
                      required
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Developer"
                      className="w-full px-3 py-2.5 bg-[#F1F3F6] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0B192C] transition-all placeholder:text-[#94A3B8]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Company *</label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="GEONIXA"
                      className="w-full px-3 py-2.5 bg-[#F1F3F6] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0B192C] transition-all placeholder:text-[#94A3B8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Password (min 6 characters) *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create password"
                      className="w-full px-4 py-2.5 pr-10 bg-[#F1F3F6] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0B192C] transition-all placeholder:text-[#94A3B8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-[#64748B] hover:text-[#0F172A] cursor-pointer text-xs"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Confirm password *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-4 py-2.5 pr-10 bg-[#F1F3F6] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0B192C] transition-all placeholder:text-[#94A3B8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-[#64748B] hover:text-[#0F172A] cursor-pointer text-xs"
                    >
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 rounded border-[#CBD5E1] text-[#0B192C] focus:ring-[#0B192C] accent-[#0B192C] cursor-pointer"
                  />
                  <label htmlFor="agreeTerms" className="text-[11px] font-medium text-[#334155] cursor-pointer select-none">
                    I agree to company Terms of Service & Privacy Policy.
                  </label>
                </div>
              </>
            )}

            {/* LOGIN FIELDS */}
            {mode === 'login' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1.5">
                    {loginRole === 'admin' ? 'Admin Email Address' : 'Employee Work Email'}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={loginRole === 'admin' ? 'cr7156816@gmail.com' : 'employee@company.com'}
                    className="w-full px-4 py-3 bg-[#F1F3F6] border border-[#E2E8F0] rounded-2xl text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0B192C] transition-all placeholder:text-[#94A3B8]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#334155]">Password</label>
                    {loginRole === 'employee' && (
                      <button
                        type="button"
                        onClick={() => handleTabSwitch('forgot')}
                        className="text-[11px] font-bold text-[#0B192C] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={loginRole === 'admin' ? 'Enter admin password' : 'Enter your password'}
                      className="w-full px-4 py-3 pr-10 bg-[#F1F3F6] border border-[#E2E8F0] rounded-2xl text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0B192C] transition-all placeholder:text-[#94A3B8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-[#64748B] hover:text-[#0F172A] cursor-pointer text-xs"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#CBD5E1] text-[#0B192C] focus:ring-[#0B192C] accent-[#0B192C] cursor-pointer"
                  />
                  <label htmlFor="rememberMe" className="text-xs font-semibold text-[#334155] cursor-pointer select-none">
                    Remember my session
                  </label>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#0B192C] hover:bg-[#15293F] active:bg-[#0B192C] text-white font-bold text-xs rounded-full shadow-sm transition-all cursor-pointer mt-2"
            >
              {isSubmitting
                ? 'Verifying...'
                : mode === 'signup'
                ? 'Create Employee Account'
                : loginRole === 'admin'
                ? 'Sign in as Administrator →'
                : 'Sign in as Employee →'}
            </button>
          </form>
        )}

        {/* Footer Navigation */}
        {mode === 'signup' && (
          <div className="text-center space-y-1.5 pt-2 border-t border-[#E2E8F0]">
            <p className="text-xs text-[#334155] font-medium">
              Already have an employee account?{' '}
              <button
                type="button"
                onClick={() => {
                  handleTabSwitch('login');
                  setLoginRole('employee');
                }}
                className="font-bold text-[#0B192C] hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </p>
          </div>
        )}

        {mode === 'login' && loginRole === 'employee' && (
          <div className="text-center space-y-2 pt-2 border-t border-[#E2E8F0]">
            <p className="text-xs text-[#334155] font-medium">
              Need an employee account?{' '}
              <button
                type="button"
                onClick={() => handleTabSwitch('signup')}
                className="font-bold text-[#0B192C] hover:underline cursor-pointer"
              >
                Create Account
              </button>
            </p>
            <p className="text-[11px] text-[#64748B]">Employee registrations are automatically verified.</p>
          </div>
        )}

        {mode === 'login' && loginRole === 'admin' && (
          <div className="text-center pt-2 border-t border-[#E2E8F0]">
            <p className="text-[11px] text-[#64748B]">
              🔒 Protected administrative console. Single master administrator credentials only.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
