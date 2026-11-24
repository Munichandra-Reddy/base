'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EyeIcon, EyeOffIcon } from '@/app/components/Icons';

function SetupPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [designation, setDesignation] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Read URL params and verify invitation token on mount
  useEffect(() => {
    let rawToken = searchParams.get('token') || '';
    let rawEmail = searchParams.get('email') || '';

    // Also check hash or sessionStorage if user navigated internally
    if (!rawToken && typeof window !== 'undefined') {
      const hash = window.location.hash;
      const urlParams = new URLSearchParams(window.location.search);
      rawToken = urlParams.get('token') || urlParams.get('inviteToken') || '';
      rawEmail = urlParams.get('email') || '';
    }

    if (!rawToken) {
      setIsLoading(false);
      setIsTokenValid(false);
      setErrorMessage('No invitation token found in link. Please use the complete link from your invitation email.');
      return;
    }

    setToken(rawToken);
    if (rawEmail) setEmail(decodeURIComponent(rawEmail));

    // Verify invitation with backend
    fetch(`/api/auth/verify-invite?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(rawEmail)}`)
      .then((res) => res.json())
      .then((data) => {
        setIsLoading(false);
        if (data.valid) {
          setIsTokenValid(true);
          setEmail(data.email || rawEmail);
          setFullName(data.fullName || '');
          setEmployeeId(data.employeeId || '');
          setDepartment(data.department || '');
          setDesignation(data.designation || '');
        } else {
          setIsTokenValid(false);
          setErrorMessage(data.error || 'This invitation link is invalid or has expired.');
        }
      })
      .catch((err) => {
        setIsLoading(false);
        setIsTokenValid(false);
        setErrorMessage('Failed to connect to server to verify invitation link.');
      });
  }, [searchParams]);

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, text: 'None', color: 'bg-gray-200' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score, text: 'Weak', color: 'bg-[#EF4444]' };
    if (score <= 4) return { score, text: 'Good', color: 'bg-[#F59E0B]' };
    return { score, text: 'Strong', color: 'bg-[#10B981]' };
  };

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter matching passwords.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          password: newPassword,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMessage('Password created successfully! Your employee account is now fully activated.');
        // Also update local storage if on same machine
        if (typeof window !== 'undefined') {
          try {
            const saved = localStorage.getItem('workorbit_registered_users');
            const users = saved ? JSON.parse(saved) : [];
            const updated = users.map((u: any) =>
              u.email?.toLowerCase() === email.toLowerCase() ? { ...u, status: 'active', password: newPassword } : u
            );
            localStorage.setItem('workorbit_registered_users', JSON.stringify(updated));
          } catch (e) {}
        }

        setTimeout(() => {
          router.push('/');
        }, 2200);
      } else {
        setErrorMessage(data.error || 'Failed to set password. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error occurred while setting password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col justify-center items-center p-3 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-xl border border-[#E5E5E5] shadow-sm p-6 sm:p-8 space-y-6">
        
        {/* Header with Basecamp Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#011826] flex items-center justify-center text-[#049FD9] shadow-sm mx-auto mb-3">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="7" strokeWidth="2" />
              <circle cx="12" cy="5" r="2" fill="currentColor" />
              <circle cx="17" cy="16" r="1.5" fill="currentColor" />
              <circle cx="7" cy="15" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#111827] tracking-tight">
            Basecamp Employee Setup
          </h1>
          <p className="text-xs text-[#595959]">
            Set your confidential password to activate your workspace account
          </p>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-10 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#049FD9] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#595959] font-medium">Verifying invitation security token...</p>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && !isLoading && (
          <div className="p-4 bg-[#FEF2F2] border border-[#EF4444]/30 rounded-xl text-xs font-semibold text-[#EF4444] space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span className="font-bold">Invitation Error</span>
            </div>
            <p className="font-normal text-[#991B1B] leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="p-5 bg-[#F0FDF4] border border-[#238823]/30 rounded-xl text-center space-y-3 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-[#DCFCE7] text-[#16A34A] text-2xl flex items-center justify-center mx-auto">
              ✓
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#15803D]">Account Activated!</h3>
              <p className="text-xs text-[#166534] mt-1">{successMessage}</p>
              <p className="text-[11px] text-[#6B7280] mt-2">Redirecting you to Login in a moment...</p>
            </div>
          </div>
        )}

        {/* Invalid / Expired State Action */}
        {!isLoading && !isTokenValid && (
          <div className="text-center pt-2 space-y-4">
            <p className="text-xs text-[#595959]">
              If your link has expired (48 hours validity) or has already been used, please contact your workspace administrator to request a new invitation email.
            </p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="btn-primary w-full py-2.5 text-xs font-semibold"
            >
              Go to Workspace Login &rarr;
            </button>
          </div>
        )}

        {/* Password Setup Form */}
        {!isLoading && isTokenValid && !successMessage && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Employee Dossier Preview Card */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Employee:</span>
                <span className="font-bold text-[#0F172A]">{fullName || email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Work Email:</span>
                <span className="font-semibold text-[#0F172A]">{email}</span>
              </div>
              {employeeId && (
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Employee ID:</span>
                  <span className="font-bold text-[#049FD9] font-mono">{employeeId}</span>
                </div>
              )}
              {designation && (
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Designation:</span>
                  <span className="font-medium text-[#0F172A]">{designation} ({department})</span>
                </div>
              )}
            </div>

            {/* Field 1: New Password */}
            <div>
              <label className="block text-xs font-bold text-[#222222] mb-1">
                New Password <span className="text-[#EF4444]">*</span>
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create confidential password (min 6 chars)"
                  className="w-full px-3.5 py-2.5 pr-10 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#595959] hover:text-[#222222] cursor-pointer p-0.5 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#6B7280]">Strength:</span>
                    <span className={`font-bold ${strength.text === 'Strong' ? 'text-[#10B981]' : strength.text === 'Good' ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                      {strength.text}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 rounded-full ${strength.score >= 1 ? strength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 rounded-full ${strength.score >= 3 ? strength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 rounded-full ${strength.score >= 5 ? strength.color : 'bg-transparent'}`} />
                  </div>
                </div>
              )}
            </div>

            {/* Field 2: Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-[#222222] mb-1">
                Confirm Password <span className="text-[#EF4444]">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password to confirm"
                  className="w-full px-3.5 py-2.5 pr-10 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-[#595959] hover:text-[#222222] cursor-pointer p-0.5 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5 px-4 text-sm font-bold shadow-xs mt-2"
            >
              {isSubmitting ? 'Setting Password & Activating...' : 'Set Password & Activate Account →'}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="text-center pt-2 border-t border-[#E5E5E5]">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-xs text-[#595959] hover:text-[#049FD9] transition-colors"
          >
            &larr; Return to Workspace Login
          </button>
        </div>

      </div>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center p-4">
          <div className="w-8 h-8 border-3 border-[#049FD9] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SetupPasswordForm />
    </Suspense>
  );
}
