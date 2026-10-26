'use client';

import React, { useState, useEffect } from 'react';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  addFirebaseUserAccount,
  addFirebaseEmployee,
  subscribeToUserAccounts,
  StoredUserAccount,
} from '@/lib/firebaseServices';
import { Person } from '@/lib/types';
import { EyeIcon, EyeOffIcon } from './Icons';

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
  <div className="w-14 h-14 rounded-2xl bg-[#011826] flex items-center justify-center text-white shadow-md mx-auto mb-3">
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
  const [isResetExpired, setIsResetExpired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isResetSending, setIsResetSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-detect password reset URL link params from email and enforce 15-minute timeout
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlEmail = urlParams.get('resetEmail');
      const urlRole = urlParams.get('role');
      const urlCode = urlParams.get('resetCode');
      const urlExp = urlParams.get('exp');
      const hash = window.location.hash;

      if (urlEmail && (urlCode || hash === '#reset-password')) {
        const decodedEmail = decodeURIComponent(urlEmail);
        setMode('forgot');
        setEmail(decodedEmail);
        if (urlRole === 'employee' || urlRole === 'admin') {
          setLoginRole(urlRole);
        }
        setIsResetLinkFromEmail(true);

        // 15-minute expiration check
        const now = Date.now();
        const expirationTime = urlExp ? parseInt(urlExp, 10) : 0;

        if (expirationTime > 0 && now > expirationTime) {
          setIsResetExpired(true);
        } else {
          setIsResetExpired(false);
          // Verify with Firestore database record
          if (db) {
            getDoc(doc(db, 'password_resets', decodedEmail.replace(/[^a-zA-Z0-9]/g, '_')))
              .then((snap) => {
                if (snap.exists()) {
                  const data = snap.data();
                  if (data) {
                    if (data.used) {
                      setIsResetExpired(true);
                    } else if (data.expiresAt && now > data.expiresAt) {
                      setIsResetExpired(true);
                    }
                  }
                }
              })
              .catch(() => {});
          }
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

    // Enforce 15-minute expiration verification before changing password
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlExp = urlParams.get('exp');
      if (urlExp) {
        const expirationTime = parseInt(urlExp, 10);
        if (Date.now() > expirationTime) {
          setIsResetExpired(true);
          setErrorMessage('Password reset link has timed out. The 15-minute limit expired.');
          return;
        }
      }
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !validateEmail(cleanEmail)) {
      setErrorMessage('Please enter registered email address.');
      return;
    }

    // Verify Firestore reset record hasn't expired or been used
    if (db) {
      try {
        const resetSnap = await getDoc(doc(db, 'password_resets', cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')));
        if (resetSnap.exists()) {
          const resetData = resetSnap.data();
          if (resetData) {
            if (resetData.used) {
              setIsResetExpired(true);
              setErrorMessage('This password reset link has already been used.');
              return;
            }
            if (resetData.expiresAt && Date.now() > resetData.expiresAt) {
              setIsResetExpired(true);
              setErrorMessage('Password reset link has timed out. The 15-minute limit expired.');
              return;
            }
          }
        }
      } catch (e) {}
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

      // Mark reset code as used in Firestore so it cannot be reused
      try {
        const resetDoc = doc(db, 'password_resets', cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'));
        await setDoc(resetDoc, { used: true, updatedAt: Date.now() }, { merge: true });
      } catch (e) {}

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
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col font-sans">
      {/* 1. CISCO HEADER / NAVBAR */}
      <header className="h-[74px] bg-[#FFFFFF] border-b border-[#E5E5E5] px-6 lg:px-12 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-6">
          <div
            onClick={() => {
              handleTabSwitch('login');
              setLoginRole('admin');
            }}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-lg bg-[#011826] flex items-center justify-center text-white shadow-xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="7" strokeWidth="2.5" />
                <circle cx="12" cy="5" r="2" fill="currentColor" />
                <circle cx="17" cy="16" r="1.5" fill="currentColor" />
                <circle cx="7" cy="15" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <span className="text-xl font-bold text-[#011826] tracking-tight">WorkOrbit</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 pl-5 border-l border-[#E5E5E5]">
            <span
              onClick={() => handleTabSwitch('login')}
              className="text-[15px] font-medium text-[#222222] hover:text-[#049FD9] transition-colors cursor-pointer"
            >
              Overview
            </span>
            <span
              onClick={() => handleTabSwitch('login')}
              className="text-[15px] font-medium text-[#222222] hover:text-[#049FD9] transition-colors cursor-pointer"
            >
              Projects & Tasks
            </span>
            <span
              onClick={() => handleTabSwitch('login')}
              className="text-[15px] font-medium text-[#222222] hover:text-[#049FD9] transition-colors cursor-pointer"
            >
              Campfire Chat
            </span>
            <span
              onClick={() => handleTabSwitch('login')}
              className="text-[15px] font-medium text-[#222222] hover:text-[#049FD9] transition-colors cursor-pointer"
            >
              Cisco Packet Tracer
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              handleTabSwitch('login');
              setLoginRole('employee');
            }}
            className="btn-login"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('signup')}
            className="btn-signup"
          >
            Sign up
          </button>
        </div>
      </header>

      {/* 2. MAIN SPLIT LAYOUT (FORM + ASYMMETRIC GRAPHIC CARDS) */}
      <main className="flex-1 flex items-center justify-center py-8 lg:py-12 px-6 lg:px-12">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* LEFT COLUMN: HERO HEADING + LOGIN/SIGNUP FORM */}
          <div className="lg:col-span-6 space-y-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#F0F9FF] border border-[#049FD9]/30 text-[#049FD9] text-xs font-semibold">
                <span>Enterprise Workspace Platform</span>
              </div>
              <h1 className="text-4xl lg:text-[44px] font-light text-[#222222] leading-[1.1] tracking-tight">
                {mode === 'login'
                  ? 'WorkOrbit Workspace'
                  : mode === 'signup'
                  ? 'Create Employee Account'
                  : 'Recover Password'}
              </h1>
              <p className="text-base font-normal text-[#595959] leading-[1.6]">
                {mode === 'login'
                  ? 'High-performance team management, campfire discussions, tasks, and file sharing in one unified workspace.'
                  : mode === 'signup'
                  ? 'Register your company email to join your workspace team, claim sprint tasks, and collaborate in real-time.'
                  : 'Enter your registered work email address below to receive secure password recovery instructions.'}
              </p>
              <div className="pt-1">
                <a
                  href="#learn-more"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRoleSwitch(loginRole === 'admin' ? 'employee' : 'admin');
                  }}
                  className="highlight-link inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Switch to {loginRole === 'admin' ? 'Employee Portal' : 'Admin Console'}</span>
                  <span>→</span>
                </a>
              </div>
            </div>

            {/* FORM CONTAINER */}
            <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-micro p-6 sm:p-7 space-y-4">
              
              {/* ADMIN vs EMPLOYEE LOGIN SWITCHER (ONLY IN LOGIN MODE) */}
              {mode === 'login' && (
                <div className="grid grid-cols-2 p-1 bg-[#F4F6F8] rounded-lg border border-[#E5E5E5]">
                  <button
                    type="button"
                    onClick={() => handleRoleSwitch('admin')}
                    className={`py-2 rounded-md font-semibold text-xs transition-all flex items-center justify-center cursor-pointer ${
                      loginRole === 'admin'
                        ? 'bg-[#011826] text-white shadow-xs font-bold'
                        : 'text-[#595959] hover:text-[#011826]'
                    }`}
                  >
                    Admin Login
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleSwitch('employee')}
                    className={`py-2 rounded-md font-semibold text-xs transition-all flex items-center justify-center cursor-pointer ${
                      loginRole === 'employee'
                        ? 'bg-[#011826] text-white shadow-xs font-bold'
                        : 'text-[#595959] hover:text-[#011826]'
                    }`}
                  >
                    Employee Login
                  </button>
                </div>
              )}

              {/* Validation / Success Messages */}
              {errorMessage && (
                <div className="p-3 bg-[#FEF2F2] border border-[#EF4444]/30 rounded-lg text-xs font-semibold text-[#EF4444] flex items-center gap-2 animate-in fade-in duration-150">
                  <span className="text-sm">⚠️</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-[#F0FDF4] border border-[#6CC04A]/30 rounded-lg text-xs font-bold text-[#238823] flex items-center gap-2 animate-in fade-in duration-150">
                  <span className="text-sm">✅</span>
                  <span>{successMessage}</span>
                </div>
              )}

              {/* FORGOT PASSWORD FORM */}
              {mode === 'forgot' ? (
                <div className="space-y-4">
                  {isResetLinkFromEmail ? (
                    isResetExpired ? (
                      /* Link Timed Out View */
                      <div className="p-6 bg-[#FEF2F2] border border-[#EF4444]/30 rounded-2xl text-center space-y-3 animate-in fade-in duration-150">
                        <div className="w-12 h-12 mx-auto bg-[#FEE2E2] rounded-full flex items-center justify-center text-2xl shadow-inner">
                          ⏱️
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-[#991B1B]">Password Reset Link Timed Out</h2>
                          <p className="text-xs text-[#7F1D1D] mt-1 leading-relaxed font-medium">
                            This password reset link was valid for 15 minutes and has timed out. For security, please request a new password reset email.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsResetExpired(false);
                            setIsResetLinkFromEmail(false);
                            setErrorMessage(null);
                            setSuccessMessage(null);
                            if (typeof window !== 'undefined') {
                              window.history.replaceState({}, document.title, window.location.pathname);
                            }
                          }}
                          className="w-full py-2.5 bg-[#011826] hover:bg-[#082236] text-white font-semibold text-xs rounded-md shadow-xs transition-all cursor-pointer"
                        >
                          Request New Reset Link →
                        </button>
                      </div>
                    ) : (
                      /* Set New Password Form */
                      <form onSubmit={handleDirectChangePassword} className="space-y-3.5">
                        <div className="text-center pb-1">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-2 bg-[#FEF3C7] border border-[#F59E0B]/30 rounded-full text-[11px] font-bold text-[#B45309]">
                            <span>⏱️</span>
                            <span>Valid for 15 minutes</span>
                          </div>
                          <h2 className="text-sm font-bold text-[#222222]">Set New Password</h2>
                          <p className="text-xs text-[#595959]">
                            Create a new password for <span className="font-semibold text-[#222222]">{email}</span>
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#222222] mb-1">New Password (min 6 characters) *</label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              required
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Enter new password"
                              className="w-full px-3.5 py-2.5 pr-10 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#049FD9] focus:border-[#049FD9] transition-all placeholder:text-[#999999]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-2.5 text-[#595959] hover:text-[#222222] cursor-pointer p-0.5 transition-colors"
                              aria-label={showNewPassword ? "Hide password" : "Show password"}
                            >
                              {showNewPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#222222] mb-1">Confirm New Password *</label>
                          <div className="relative">
                            <input
                              type={showConfirmNewPassword ? 'text' : 'password'}
                              required
                              value={confirmNewPassword}
                              onChange={(e) => setConfirmNewPassword(e.target.value)}
                              placeholder="Confirm new password"
                              className="w-full px-3.5 py-2.5 pr-10 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#049FD9] focus:border-[#049FD9] transition-all placeholder:text-[#999999]"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                              className="absolute right-3 top-2.5 text-[#595959] hover:text-[#222222] cursor-pointer p-0.5 transition-colors"
                              aria-label={showConfirmNewPassword ? "Hide password" : "Show password"}
                            >
                              {showConfirmNewPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-2.5 bg-[#011826] hover:bg-[#082236] text-white font-semibold text-sm rounded-md shadow-xs transition-all cursor-pointer mt-1"
                        >
                          {isSubmitting ? 'Updating Password...' : 'Save & Update Password →'}
                        </button>
                      </form>
                    )
                  ) : (
                    /* Request Reset Email Form */
                    <form onSubmit={handleForgotPassword} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-[#222222] mb-1.5">
                          {loginRole === 'admin' ? 'Admin Registered Email' : 'Employee Registered Email'}
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={loginRole === 'admin' ? 'admin@company.com' : 'employee@company.com'}
                          className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#049FD9] focus:border-[#049FD9] transition-all placeholder:text-[#999999]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isResetSending}
                        className="w-full py-2.5 bg-[#011826] hover:bg-[#082236] text-white font-semibold text-sm rounded-md shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>✉️</span>
                        <span>{isResetSending ? 'Sending direct message to mail...' : 'Send Password Reset Email'}</span>
                      </button>
                    </form>
                  )}

                  <div className="text-center pt-2 border-t border-[#E5E5E5]">
                    <button
                      type="button"
                      onClick={() => {
                        handleTabSwitch('login');
                        setIsResetLinkFromEmail(false);
                        setIsResetExpired(false);
                        if (typeof window !== 'undefined') {
                          window.history.replaceState({}, document.title, window.location.pathname);
                        }
                      }}
                      className="text-xs font-semibold text-[#049FD9] hover:text-[#238823] hover:underline cursor-pointer"
                    >
                      ← Back to {loginRole === 'admin' ? 'Admin' : 'Employee'} Sign in
                    </button>
                  </div>
                </div>
              ) : (
                /* LOGIN & SIGNUP FORM */
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {/* SIGN UP FIELDS */}
                  {mode === 'signup' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-[#222222] mb-1">Full name *</label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Priya Sharma"
                          className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#049FD9] focus:border-[#049FD9] transition-all placeholder:text-[#999999]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#222222] mb-1">Employee Work Email *</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="priya@company.com"
                          className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#049FD9] focus:border-[#049FD9] transition-all placeholder:text-[#999999]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-semibold text-[#222222] mb-1">Role / Title *</label>
                          <input
                            type="text"
                            required
                            value={designation}
                            onChange={(e) => setDesignation(e.target.value)}
                            placeholder="e.g. Developer"
                            className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#049FD9] focus:border-[#049FD9] transition-all placeholder:text-[#999999]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#222222] mb-1">Company *</label>
                          <input
                            type="text"
                            required
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="GEONIXA"
                            className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#049FD9] focus:border-[#049FD9] transition-all placeholder:text-[#999999]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#222222] mb-1">Password (min 6 characters) *</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create password"
                            className="w-full px-3.5 py-2.5 pr-10 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#049FD9] focus:border-[#049FD9] transition-all placeholder:text-[#999999]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-2.5 text-[#595959] hover:text-[#222222] cursor-pointer p-0.5 transition-colors"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#222222] mb-1">Confirm password *</label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                            className="w-full px-3.5 py-2.5 pr-10 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#049FD9] focus:border-[#049FD9] transition-all placeholder:text-[#999999]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-2.5 text-[#595959] hover:text-[#222222] cursor-pointer p-0.5 transition-colors"
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          >
                            {showConfirmPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="agreeTerms"
                          checked={agreeTerms}
                          onChange={(e) => setAgreeTerms(e.target.checked)}
                          className="w-4 h-4 rounded border-[#CCCCCC] text-[#049FD9] focus:ring-[#049FD9] accent-[#049FD9] cursor-pointer"
                        />
                        <label htmlFor="agreeTerms" className="text-xs font-medium text-[#595959] cursor-pointer select-none">
                          I agree to company Terms of Service & Privacy Policy.
                        </label>
                      </div>
                    </>
                  )}

                  {/* LOGIN FIELDS */}
                  {mode === 'login' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-[#222222] mb-1.5">
                          {loginRole === 'admin' ? 'Admin Email Address' : 'Employee Work Email'}
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={loginRole === 'admin' ? 'admin@company.com' : 'employee@company.com'}
                          className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#049FD9] focus:border-[#049FD9] transition-all placeholder:text-[#999999]"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-[#222222]">Password</label>
                          <button
                            type="button"
                            onClick={handleForgotPasswordClick}
                            className="text-xs font-semibold text-[#049FD9] hover:text-[#238823] hover:underline cursor-pointer"
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
                            className="w-full px-3.5 py-2.5 pr-10 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:ring-2 focus:ring-[#049FD9] focus:border-[#049FD9] transition-all placeholder:text-[#999999]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-2.5 text-[#595959] hover:text-[#222222] cursor-pointer p-0.5 transition-colors"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="rememberMe"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-[#CCCCCC] text-[#049FD9] focus:ring-[#049FD9] accent-[#049FD9] cursor-pointer"
                        />
                        <label htmlFor="rememberMe" className="text-xs font-medium text-[#595959] cursor-pointer select-none">
                          Remember my session
                        </label>
                      </div>
                    </>
                  )}

                  {/* FORM ACTION BUTTON */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-2.5 px-5 font-semibold text-sm rounded-md shadow-xs transition-all cursor-pointer mt-2 ${
                      mode === 'signup'
                        ? 'btn-signup w-full'
                        : 'bg-[#011826] hover:bg-[#082236] text-white'
                    }`}
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

              {/* FOOTER SWITCHER */}
              {mode === 'signup' && (
                <div className="text-center pt-2 border-t border-[#E5E5E5]">
                  <p className="text-xs text-[#595959] font-medium">
                    Already have an employee account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        handleTabSwitch('login');
                        setLoginRole('employee');
                      }}
                      className="font-semibold text-[#049FD9] hover:text-[#238823] hover:underline cursor-pointer"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              )}

              {mode === 'login' && (
                <div className="text-center pt-2 border-t border-[#E5E5E5] space-y-1">
                  <p className="text-xs text-[#595959] font-medium">
                    {loginRole === 'employee' ? (
                      <>
                        Need an employee account?{' '}
                        <button
                          type="button"
                          onClick={() => handleTabSwitch('signup')}
                          className="font-semibold text-[#049FD9] hover:text-[#238823] hover:underline cursor-pointer"
                        >
                          Create Account
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-[#595959]">
                        🔒 Single Master Administrator access with encrypted Firebase auth.
                      </span>
                    )}
                  </p>
                </div>
              )}

            </div>
          </div>

          {/* RIGHT COLUMN: IMAGE CONTAINERS (RIGHT-SIDE GRAPHIC CARDS) */}
          <div className="lg:col-span-6 flex flex-col sm:flex-row gap-4 items-stretch justify-center">
            
            {/* 1. Main Large Portrait Graphic Card with Asymmetric 28px Curves */}
            <div className="flex-1 bg-gradient-to-br from-[#011826] via-[#082236] to-[#011826] text-white p-7 shadow-xl border border-[#0d314d] rounded-tl-[32px] rounded-br-[32px] rounded-tr-lg rounded-bl-lg flex flex-col justify-between min-h-[440px] relative overflow-hidden group">
              {/* Background ambient network lines */}
              <div className="absolute inset-0 bg-dotgrid opacity-20 pointer-events-none" />
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#049FD9]/15 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[#6CC04A]/15 blur-2xl pointer-events-none" />

              {/* Top Tag & Header */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#049FD9]/20 text-[#049FD9] border border-[#049FD9]/30 text-xs font-semibold">
                  <span>⚡ Cisco Packet Tracer Ready</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">v2.4.0</span>
              </div>

              {/* Graphic Illustration: Interconnected Workspace Topology */}
              <div className="relative z-10 my-6 py-4 flex flex-col items-center justify-center">
                <div className="relative w-44 h-36 flex items-center justify-center">
                  {/* Central Node */}
                  <div className="w-16 h-16 rounded-2xl bg-[#049FD9] text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-[#049FD9]/30 z-10 border-2 border-white/20">
                    <span className="text-center text-[10px] uppercase font-mono font-bold leading-tight">Work<br />Orbit</span>
                  </div>

                  {/* Connecting Line 1 */}
                  <div className="absolute -top-1 left-2 flex items-center gap-1.5 bg-[#082236] border border-[#049FD9]/50 rounded-lg px-2 py-1 text-[10px] text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6CC04A] animate-ping" />
                    <span>Sprint Dev</span>
                  </div>

                  {/* Connecting Line 2 */}
                  <div className="absolute -bottom-2 -left-2 flex items-center gap-1.5 bg-[#082236] border border-[#049FD9]/50 rounded-lg px-2 py-1 text-[10px] text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#049FD9]" />
                    <span>Campfire</span>
                  </div>

                  {/* Connecting Line 3 */}
                  <div className="absolute top-8 -right-4 flex items-center gap-1.5 bg-[#082236] border border-[#049FD9]/50 rounded-lg px-2 py-1 text-[10px] text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#238823]" />
                    <span>Check-ins</span>
                  </div>

                  {/* Concentric rings */}
                  <div className="absolute w-36 h-36 rounded-full border border-dashed border-[#049FD9]/30 animate-spin" style={{ animationDuration: '30s' }} />
                </div>
              </div>

              {/* Bottom Details */}
              <div className="relative z-10 space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-light text-white tracking-tight">Connected Team Pod</h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#6CC04A] text-white text-[11px] font-bold">
                    <span>● Active</span>
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-normal leading-relaxed">
                  Real-time multi-project sync, automated check-ins, and high-speed chat built for modern agile teams.
                </p>
              </div>
            </div>

            {/* 2. Smaller Stacked Square Cards Side-by-Side with Asymmetric 24px Curves */}
            <div className="w-full sm:w-56 flex flex-col gap-3.5 justify-between">
              
              {/* Stacked Card 1: Sprint Velocity */}
              <div className="bg-white p-4.5 rounded-tl-[24px] rounded-br-[24px] rounded-tr-md rounded-bl-md border border-[#E5E5E5] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-[#595959] uppercase tracking-wider">
                    Sprint Velocity
                  </span>
                  <div className="w-6 h-6 rounded-md bg-[#F0FDF4] text-[#6CC04A] flex items-center justify-center text-xs">
                    ✓
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-light text-[#222222] leading-tight">68% Done</div>
                  <div className="text-[11px] font-semibold text-[#238823] mt-1 flex items-center gap-1">
                    <span>↑ +18% vs last cycle</span>
                  </div>
                </div>
              </div>

              {/* Stacked Card 2: Campfire Active */}
              <div className="bg-white p-4.5 rounded-tl-[24px] rounded-br-[24px] rounded-tr-md rounded-bl-md border border-[#E5E5E5] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-[#595959] uppercase tracking-wider">
                    Campfire Chat
                  </span>
                  <div className="w-6 h-6 rounded-md bg-[#F0F9FF] text-[#049FD9] flex items-center justify-center text-xs">
                    💬
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-light text-[#222222] leading-tight">4 Online</div>
                  <div className="text-[11px] font-semibold text-[#049FD9] mt-1 flex items-center gap-1">
                    <span>● General & Dev channels</span>
                  </div>
                </div>
              </div>

              {/* Stacked Card 3: Security & Network Tier */}
              <div className="bg-white p-4.5 rounded-tl-[24px] rounded-br-[24px] rounded-tr-md rounded-bl-md border border-[#E5E5E5] shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-[#595959] uppercase tracking-wider">
                    Security Tier
                  </span>
                  <div className="w-6 h-6 rounded-md bg-[#011826] text-white flex items-center justify-center text-xs">
                    🔒
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-light text-[#011826] leading-tight">Enterprise</div>
                  <div className="text-[11px] font-semibold text-[#595959] mt-1 flex items-center gap-1">
                    <span>AES-256 cloud encryption</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </main>
    </div>
  );
};
