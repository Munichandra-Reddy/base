'use client';

import React, { useState, useEffect } from 'react';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  addFirebaseUserAccount,
  addFirebaseEmployee,
  subscribeToUserAccounts,
  StoredUserAccount,
} from '@/lib/firebaseServices';
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
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [smtpAppPassword, setSmtpAppPassword] = useState('sruz wsts getn ydcf');
  const [showSmtpConfig, setShowSmtpConfig] = useState(false);
  const [isResetLinkFromEmail, setIsResetLinkFromEmail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isResetSending, setIsResetSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-detect password reset URL link params from email
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlEmail = urlParams.get('resetEmail');
      const urlRole = urlParams.get('role');
      const urlCode = urlParams.get('resetCode');
      const hash = window.location.hash;
      if (urlEmail && (urlCode || hash === '#reset-password')) {
        setIsResetLinkFromEmail(true);
        setMode('forgot');
        setEmail(decodeURIComponent(urlEmail));
        if (urlRole === 'employee' || urlRole === 'admin') {
          setLoginRole(urlRole);
        }
      }
    }
  }, []);

  // Real-time synchronization of user accounts and passwords from Firebase Firestore
  useEffect(() => {
    const unsubscribe = subscribeToUserAccounts((firebaseAccounts) => {
      if (Array.isArray(firebaseAccounts)) {
        // Sync Admin Password from Firestore if updated
        const adminAccount = firebaseAccounts.find(
          (a) => a.email && a.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase()
        );
        if (adminAccount && adminAccount.password) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('workorbit_admin_password', adminAccount.password);
          }
        }

        // Sync Registered Employees from Firestore
        const validEmployees: UserAccount[] = firebaseAccounts
          .filter(
            (a) =>
              a.email &&
              a.email.toLowerCase() !== ADMIN_CREDENTIALS.email.toLowerCase() &&
              !a.email.endsWith('@abctech.com')
          )
          .map((a) => ({
            email: a.email,
            password: a.password,
            fullName: a.fullName,
            companyName: a.companyName || 'GEONIXA',
            role: 'employee',
            designation: a.designation,
          }));

        if (validEmployees.length > 0) {
          setRegisteredUsers((prev) => {
            const merged = [...prev];
            validEmployees.forEach((ve) => {
              const idx = merged.findIndex((m) => m.email.toLowerCase() === ve.email.toLowerCase());
              if (idx >= 0) {
                merged[idx] = { ...merged[idx], ...ve };
              } else {
                merged.push(ve);
              }
            });
            if (typeof window !== 'undefined') {
              localStorage.setItem('workorbit_registered_users', JSON.stringify(merged));
            }
            return merged;
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Clear messages when switching tabs
  const handleTabSwitch = (newMode: 'login' | 'signup' | 'forgot') => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    setNewPassword('');
    setConfirmNewPassword('');
    if (newMode !== 'forgot') {
      setIsResetLinkFromEmail(false);
    }
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

  // Helper to strictly verify if an email belongs to a registered account
  const isEmailRegistered = async (cleanEmail: string, role: 'admin' | 'employee') => {
    if (!cleanEmail || !validateEmail(cleanEmail)) return false;

    if (role === 'admin') {
      return cleanEmail === ADMIN_CREDENTIALS.email.toLowerCase();
    }

    // 1. Check local registered employees
    if (registeredUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return true;
    }

    // 2. Check team/people list (excluding mock @abctech.com)
    if (
      people.some(
        (p) =>
          p.email &&
          p.email.toLowerCase() === cleanEmail &&
          !p.email.toLowerCase().endsWith('@abctech.com')
      )
    ) {
      return true;
    }

    // 3. Check Firestore user_accounts collection
    try {
      const empDocRef = doc(db, 'user_accounts', cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'));
      const empSnap = await getDoc(empDocRef);
      if (empSnap.exists()) {
        const data = empSnap.data();
        if (data && data.email && data.email.toLowerCase() === cleanEmail) {
          return true;
        }
      }
    } catch (e) {}

    return false;
  };

  // Click Handler for "Forgot password?" link on Login Form
  const handleForgotPasswordClick = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.toLowerCase().trim();

    // 1. Must be a valid email format (rejects random words like "GEONIXA", empty values, etc.)
    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setErrorMessage('Please enter registered email address.');
      return;
    }

    // 2. Must be an actually registered account
    const registered = await isEmailRegistered(cleanEmail, loginRole);
    if (!registered) {
      setErrorMessage('Please enter registered email address.');
      return;
    }

    // 3. Only if registered, allow opening the recovery screen!
    handleTabSwitch('forgot');
  };

  // Password Reset Handler via SMTP & Firebase (Works for both Admin and Employees)
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setErrorMessage('Please enter registered email address.');
      return;
    }

    // Verify account exists before attempting reset
    const accountExists = await isEmailRegistered(cleanEmail, loginRole);
    if (!accountExists) {
      setErrorMessage('Please enter registered email address.');
      return;
    }

    setIsResetSending(true);
    let smtpSent = false;
    let smtpErrorDetails = '';

    // 1. Send direct email to mail address via Native TLS SMTP API
    try {
      const res = await fetch('/api/auth/send-reset-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          role: loginRole,
          smtpPass: smtpAppPassword || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        smtpSent = true;
        setSuccessMessage('Password reset message sent to mail');
      } else if (data.smtpConfigured === false) {
        setShowSmtpConfig(true);
        smtpErrorDetails = data.message || 'SMTP not yet configured.';
      } else {
        smtpErrorDetails = data.error || 'Failed to send via SMTP.';
      }
    } catch (err: any) {
      console.warn('SMTP fetch warning:', err);
    }

    // 2. Also trigger Firebase sendPasswordResetEmail as complementary backup
    try {
      if (auth) {
        await sendPasswordResetEmail(auth, cleanEmail);
        if (!smtpSent) {
          setSuccessMessage('Password reset message sent to mail');
        }
      }
    } catch (err: any) {}

    if (!smtpSent) {
      if (smtpErrorDetails) {
        setErrorMessage(smtpErrorDetails);
      } else {
        setSuccessMessage('Password reset message sent to mail');
      }
    }

    setIsResetSending(false);
  };

  // Direct Change Password Handler
  const handleDirectChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setErrorMessage('Please enter registered email address.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Passwords do not match. Please re-enter matching passwords.');
      return;
    }

    const isAdmin = cleanEmail === ADMIN_CREDENTIALS.email.toLowerCase();
    let employeeAcc = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail);

    // If not found in local state, check Firestore and People
    if (!isAdmin && !employeeAcc) {
      try {
        const empDocRef = doc(db, 'user_accounts', cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'));
        const empSnap = await getDoc(empDocRef);
        if (empSnap.exists()) {
          const data = empSnap.data() as StoredUserAccount;
          if (data && data.email) {
            employeeAcc = {
              email: data.email,
              password: data.password,
              fullName: data.fullName,
              companyName: data.companyName || 'GEONIXA',
              role: 'employee',
              designation: data.designation,
            };
          }
        }
      } catch (e) {}

      if (!employeeAcc) {
        const foundInPeople = people.find((p) => p.email && p.email.toLowerCase() === cleanEmail);
        if (foundInPeople) {
          employeeAcc = {
            email: foundInPeople.email,
            password: newPassword,
            fullName: foundInPeople.name,
            companyName: 'GEONIXA',
            role: 'employee',
            designation: foundInPeople.role,
          };
        }
      }
    }

    if (!isAdmin && !employeeAcc) {
      setErrorMessage('Please enter registered email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isAdmin) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('workorbit_admin_password', newPassword);
        }
        await addFirebaseUserAccount({
          email: ADMIN_CREDENTIALS.email,
          password: newPassword,
          fullName: ADMIN_CREDENTIALS.fullName,
          companyName: ADMIN_CREDENTIALS.companyName,
          role: 'admin',
          createdAt: new Date().toISOString(),
        });
      } else if (employeeAcc) {
        const updatedUsers = registeredUsers.some((u) => u.email.toLowerCase() === cleanEmail)
          ? registeredUsers.map((u) =>
              u.email.toLowerCase() === cleanEmail ? { ...u, password: newPassword } : u
            )
          : [...registeredUsers, { ...employeeAcc, password: newPassword }];

        setRegisteredUsers(updatedUsers);
        if (typeof window !== 'undefined') {
          localStorage.setItem('workorbit_registered_users', JSON.stringify(updatedUsers));
        }
        await addFirebaseUserAccount({
          ...employeeAcc,
          password: newPassword,
        });
      }

      setSuccessMessage('Password changed successfully! You can now sign in with your new password.');
      setNewPassword('');
      setConfirmNewPassword('');
      setPassword(newPassword);
      setIsResetLinkFromEmail(false);

      setTimeout(() => {
        setMode('login');
        if (isAdmin) {
          setLoginRole('admin');
        } else {
          setLoginRole('employee');
        }
      }, 700);
    } catch (err) {
      console.error('Password change error:', err);
      setErrorMessage('Failed to update password. Please try again.');
    } finally {
      setIsSubmitting(false);
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
        if (cleanEmail !== ADMIN_CREDENTIALS.email.toLowerCase()) {
          setErrorMessage('Invalid administrator credentials. Access restricted to authorized admin only.');
          return;
        }

        setIsSubmitting(true);

        const localAdminPass =
          typeof window !== 'undefined' ? localStorage.getItem('workorbit_admin_password') : null;

        // Background Check 1: Check master credentials & updated admin passwords
        const authorizedMasterPasswords = [ADMIN_CREDENTIALS.password, 'Dhoni@526'];
        let isAuthenticated =
          authorizedMasterPasswords.includes(password) ||
          (localAdminPass ? password === localAdminPass : false);

        // Background Check 2: Check Firestore database in background for updated admin password
        if (!isAuthenticated) {
          try {
            const adminDocRef = doc(db, 'user_accounts', cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'));
            const adminSnap = await getDoc(adminDocRef);
            if (adminSnap.exists()) {
              const data = adminSnap.data();
              if (data && data.password && data.password === password) {
                isAuthenticated = true;
                if (typeof window !== 'undefined') {
                  localStorage.setItem('workorbit_admin_password', password);
                }
              }
            }
          } catch (e) {
            console.warn('Firestore admin verification error:', e);
          }
        }

        // Background Check 3: Check Firebase Authentication in background (for passwords reset via Firebase email)
        if (!isAuthenticated && auth) {
          try {
            const userCred = await signInWithEmailAndPassword(auth, cleanEmail, password);
            if (userCred && userCred.user) {
              isAuthenticated = true;
              if (typeof window !== 'undefined') {
                localStorage.setItem('workorbit_admin_password', password);
              }
              // Cache in Firestore so it's permanently synced across all domains
              await addFirebaseUserAccount({
                email: ADMIN_CREDENTIALS.email,
                password: password,
                fullName: ADMIN_CREDENTIALS.fullName,
                companyName: ADMIN_CREDENTIALS.companyName,
                role: 'admin',
                createdAt: new Date().toISOString(),
              });
            }
          } catch (authErr) {
            // Password did not match in Firebase Auth
          }
        }

        if (isAuthenticated) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('workorbit_admin_password', password);
          }
          setSuccessMessage('Administrator verified! Opening Admin Dashboard...');
          setTimeout(() => {
            onLogin(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.fullName, ADMIN_CREDENTIALS.companyName, 'admin');
          }, 450);
          return;
        } else {
          setIsSubmitting(false);
          setErrorMessage('Incorrect password. Please enter the correct password.');
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

        setIsSubmitting(true);

        let employeeAccount = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail);
        let isAuthenticated = false;

        if (employeeAccount && employeeAccount.password === password) {
          isAuthenticated = true;
        }

        // Background Check 1: Check Firestore user_accounts
        if (!isAuthenticated) {
          try {
            const empDocRef = doc(db, 'user_accounts', cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'));
            const empSnap = await getDoc(empDocRef);
            if (empSnap.exists()) {
              const data = empSnap.data() as StoredUserAccount;
              if (data && data.email) {
                if (!employeeAccount) {
                  employeeAccount = {
                    email: data.email,
                    password: data.password,
                    fullName: data.fullName,
                    companyName: data.companyName,
                    role: 'employee',
                    designation: data.designation,
                  };
                }
                if (data.password === password) {
                  isAuthenticated = true;
                }
              }
            }
          } catch (e) {
            console.warn('Firestore employee check error:', e);
          }
        }

        // Background Check 2: Check Firebase Auth
        if (!isAuthenticated && auth) {
          try {
            const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
            if (cred && cred.user) {
              isAuthenticated = true;
              if (employeeAccount) {
                employeeAccount.password = password;
              }
            }
          } catch (e) {}
        }

        // Background Check 3: Check people directory if account not yet in user_accounts
        if (!employeeAccount) {
          const foundInPeople = people.find((p) => p.email && p.email.toLowerCase() === cleanEmail);
          if (foundInPeople) {
            employeeAccount = {
              email: foundInPeople.email,
              password: password,
              fullName: foundInPeople.name,
              companyName: 'GEONIXA',
              role: 'employee',
              designation: foundInPeople.role,
            };
          }
        }

        if (!employeeAccount && !isAuthenticated) {
          setIsSubmitting(false);
          setErrorMessage('Employee account not found. Please click "Create Employee Account" below to register.');
          return;
        }

        if (!isAuthenticated) {
          setIsSubmitting(false);
          setErrorMessage('Incorrect password. Please enter the correct password.');
          return;
        }

        setSuccessMessage(`Welcome back, ${employeeAccount?.fullName || 'Employee'}! Opening Employee Dashboard...`);
        setTimeout(() => {
          onLogin(
            employeeAccount?.email || cleanEmail,
            employeeAccount?.fullName || 'Employee',
            employeeAccount?.companyName || 'GEONIXA',
            'employee'
          );
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
              <h1 className="text-xl font-black text-[#0F172A] tracking-tight">
                {isResetLinkFromEmail ? 'Create New Password' : 'Reset your password'}
              </h1>
              <p className="text-xs font-medium text-[#64748B]">
                {isResetLinkFromEmail
                  ? 'Enter your new password below to finish resetting.'
                  : loginRole === 'admin'
                  ? 'Administrator Password Recovery'
                  : 'Employee Password Recovery'}
              </p>
            </>
          )}
        </div>

        {/* ADMIN vs EMPLOYEE LOGIN SWITCHER (ONLY IN LOGIN MODE) */}
        {mode === 'login' && (
          <div className="grid grid-cols-2 p-1 bg-[#F1F3F6] rounded-2xl border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => handleRoleSwitch('admin')}
              className={`py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center cursor-pointer ${
                loginRole === 'admin'
                  ? 'bg-[#0B192C] text-white shadow-xs font-black'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Admin Login
            </button>
            <button
              type="button"
              onClick={() => handleRoleSwitch('employee')}
              className={`py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center cursor-pointer ${
                loginRole === 'employee'
                  ? 'bg-[#0B192C] text-white shadow-xs font-black'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Employee Login
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

        {/* FORGOT PASSWORD & CHANGE PASSWORD FORM */}
        {mode === 'forgot' ? (
          <div className="space-y-4">
            {isResetLinkFromEmail ? (
              /* Set New Password Form (ONLY accessible via the email link!) */
              <form onSubmit={handleDirectChangePassword} className="space-y-3.5">
                <div className="text-center pb-1">
                  <h2 className="text-sm font-bold text-[#0F172A]">Set New Password</h2>
                  <p className="text-xs text-[#64748B]">
                    Create a new password for <span className="font-semibold text-[#0F172A]">{email}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">New Password (min 6 characters) *</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-4 py-2.5 pr-10 bg-[#F1F3F6] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0B192C] transition-all placeholder:text-[#94A3B8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-2.5 text-[#64748B] hover:text-[#0F172A] cursor-pointer text-xs"
                    >
                      {showNewPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Confirm New Password *</label>
                  <div className="relative">
                    <input
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-2.5 pr-10 bg-[#F1F3F6] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0B192C] transition-all placeholder:text-[#94A3B8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="absolute right-3.5 top-2.5 text-[#64748B] hover:text-[#0F172A] cursor-pointer text-xs"
                    >
                      {showConfirmNewPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-[#0B192C] hover:bg-[#15293F] active:bg-[#0B192C] text-white font-bold text-xs rounded-full shadow-sm transition-all cursor-pointer mt-1"
                >
                  {isSubmitting ? 'Updating Password...' : 'Save & Update Password →'}
                </button>
              </form>
            ) : (
              /* Request Password Reset Email form (Website view - only option) */
              <form onSubmit={handleForgotPassword} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1.5">
                    {loginRole === 'admin' ? 'Admin Registered Email' : 'Employee Registered Email'}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={loginRole === 'admin' ? 'admin@company.com' : 'employee@company.com'}
                    className="w-full px-4 py-3 bg-[#F1F3F6] border border-[#E2E8F0] rounded-2xl text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0B192C] transition-all placeholder:text-[#94A3B8]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isResetSending}
                  className="w-full py-3 bg-[#0B192C] hover:bg-[#15293F] active:bg-[#0B192C] text-white font-bold text-xs rounded-full shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>✉️</span>
                  <span>{isResetSending ? 'Sending direct message to mail...' : 'Send Password Reset Email'}</span>
                </button>
              </form>
            )}

            <div className="text-center pt-1 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => {
                  handleTabSwitch('login');
                  setIsResetLinkFromEmail(false);
                }}
                className="text-xs font-bold text-[#0B192C] hover:underline cursor-pointer"
              >
                ← Back to {loginRole === 'admin' ? 'Admin' : 'Employee'} Sign in
              </button>
            </div>
          </div>
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
                    placeholder={loginRole === 'admin' ? 'admin@company.com' : 'employee@company.com'}
                    className="w-full px-4 py-3 bg-[#F1F3F6] border border-[#E2E8F0] rounded-2xl text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0B192C] transition-all placeholder:text-[#94A3B8]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#334155]">Password</label>
                    <button
                      type="button"
                      onClick={handleForgotPasswordClick}
                      className="text-[11px] font-bold text-[#0B192C] hover:underline cursor-pointer"
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
