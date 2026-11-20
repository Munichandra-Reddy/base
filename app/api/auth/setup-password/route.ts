import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token || '').trim();
    const email = String(body.email || '').toLowerCase().trim();
    const password = String(body.password || '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Invitation token is required.' },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email address is required.' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // 1. Verify invitation token in Firestore
    const inviteRef = doc(db, 'invitations', token);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unrecognized invitation link.' },
        { status: 404 }
      );
    }

    const inviteData = inviteSnap.data();

    if (inviteData.used) {
      return NextResponse.json(
        { success: false, error: 'This invitation has already been used. Please log in with your password.' },
        { status: 400 }
      );
    }

    const now = Date.now();
    if (inviteData.expiresAt && now > inviteData.expiresAt) {
      return NextResponse.json(
        { success: false, error: 'This invitation has expired (48 hours limit). Please ask your administrator to resend an invitation.' },
        { status: 400 }
      );
    }

    const cleanEmail = (inviteData.email || email).toLowerCase().trim();
    const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const nowIso = new Date().toISOString();

    // 2. Mark Invitation as used
    await setDoc(
      inviteRef,
      {
        used: true,
        usedAt: now,
      },
      { merge: true }
    );

    // 3. Update Employee Profile status to 'active'
    const empRef = doc(db, 'employees', docId);
    await setDoc(
      empRef,
      {
        status: 'active',
        activatedAt: nowIso,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    // 4. Update / Save user_accounts in Firestore with password & active status
    const userRef = doc(db, 'user_accounts', docId);
    await setDoc(
      userRef,
      {
        email: cleanEmail,
        password: password, // Stored for login verification
        fullName: inviteData.fullName || cleanEmail.split('@')[0],
        companyName: 'Basecamp',
        role: inviteData.accessRole || 'employee',
        accessRole: inviteData.accessRole || 'employee',
        designation: inviteData.designation || 'Team Member',
        department: inviteData.department || 'General',
        employeeId: inviteData.employeeId || docId,
        status: 'active',
        activatedAt: nowIso,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Password created successfully! Your employee account is now fully activated.',
      user: {
        email: cleanEmail,
        fullName: inviteData.fullName || cleanEmail.split('@')[0],
        role: inviteData.accessRole || 'employee',
        companyName: 'Basecamp',
      },
    });
  } catch (error: any) {
    console.error('Error setting employee password:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to set password.' },
      { status: 500 }
    );
  }
}
