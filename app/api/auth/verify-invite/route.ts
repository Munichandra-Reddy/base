import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email')?.toLowerCase().trim();

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Invitation token is missing.' },
        { status: 400 }
      );
    }

    const inviteRef = doc(db, 'invitations', token);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      return NextResponse.json(
        { valid: false, error: 'Invitation not found or invalid token.' },
        { status: 404 }
      );
    }

    const data = inviteSnap.data();

    // Check email match if supplied
    if (email && data.email && data.email.toLowerCase() !== email) {
      return NextResponse.json(
        { valid: false, error: 'Invitation token does not match the provided email address.' },
        { status: 400 }
      );
    }

    // Check if already used
    if (data.used) {
      return NextResponse.json(
        {
          valid: false,
          isUsed: true,
          error: 'This invitation has already been used to activate an account. Please sign in.',
        },
        { status: 400 }
      );
    }

    // Check expiration
    const now = Date.now();
    if (data.expiresAt && now > data.expiresAt) {
      return NextResponse.json(
        {
          valid: false,
          isExpired: true,
          error: 'This invitation link has expired (48 hours limit). Please ask your workspace administrator to resend the invitation.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: data.email,
      fullName: data.fullName,
      employeeId: data.employeeId,
      department: data.department,
      designation: data.designation,
      accessRole: data.accessRole,
    });
  } catch (error: any) {
    console.error('Error verifying invitation:', error);
    return NextResponse.json(
      { valid: false, error: error.message || 'Failed to verify invitation.' },
      { status: 500 }
    );
  }
}
