import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { Person, AccessRole } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const currentEmail = String(body.email || '').toLowerCase().trim();
    const newEmail = body.newEmail ? String(body.newEmail).toLowerCase().trim() : currentEmail;
    const fullName = String(body.name || body.fullName || '').trim();
    const designation = String(body.designation || body.role || '').trim();
    const department = String(body.department || 'Engineering').trim();
    const phone = String(body.phone || '').trim();
    const joiningDate = String(body.joiningDate || '').trim();
    const accessRole: AccessRole = body.accessRole === 'admin' ? 'admin' : 'employee';
    const adminEmail = String(request.headers.get('x-admin-email') || body.adminEmail || '').toLowerCase().trim();

    if (!currentEmail) {
      return NextResponse.json(
        { success: false, error: 'Current employee email is required.' },
        { status: 400 }
      );
    }

    if (!fullName) {
      return NextResponse.json(
        { success: false, error: 'Employee Full Name is required.' },
        { status: 400 }
      );
    }

    if (!designation) {
      return NextResponse.json(
        { success: false, error: 'Designation / Job Title is required.' },
        { status: 400 }
      );
    }

    if (!department) {
      return NextResponse.json(
        { success: false, error: 'Department is required.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid work email address.' },
        { status: 400 }
      );
    }

    const currentDocId = currentEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const currentEmpRef = doc(db, 'employees', currentDocId);
    const currentSnap = await getDoc(currentEmpRef);

    if (!currentSnap.exists()) {
      return NextResponse.json(
        { success: false, error: `Employee "${currentEmail}" not found in database.` },
        { status: 404 }
      );
    }

    const existingData = currentSnap.data() as Person;

    // Check if new email is taken by another employee
    const newDocId = newEmail.replace(/[^a-zA-Z0-9]/g, '_');
    if (newEmail !== currentEmail) {
      const targetEmpRef = doc(db, 'employees', newDocId);
      const targetSnap = await getDoc(targetEmpRef);
      if (targetSnap.exists()) {
        return NextResponse.json(
          { success: false, error: `Work email "${newEmail}" is already registered to another employee.` },
          { status: 400 }
        );
      }
    }

    const updatedProfile: Person = {
      ...existingData,
      id: newDocId,
      name: fullName,
      email: newEmail,
      role: designation,
      designation,
      department,
      phone,
      accessRole,
      joiningDate: joiningDate || existingData.joiningDate || new Date().toISOString().split('T')[0],
      avatar: fullName[0]?.toUpperCase() || 'E',
    };

    // Save to employees collection
    const targetRef = doc(db, 'employees', newDocId);
    await setDoc(targetRef, updatedProfile, { merge: true });

    // Update user_accounts collection
    const targetUserRef = doc(db, 'user_accounts', newDocId);
    await setDoc(
      targetUserRef,
      {
        fullName,
        email: newEmail,
        designation,
        department,
        phone,
        accessRole,
        role: accessRole,
        joiningDate: updatedProfile.joiningDate,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // If email changed, safely delete old documents
    if (newDocId !== currentDocId) {
      try {
        await deleteDoc(currentEmpRef);
        await deleteDoc(doc(db, 'user_accounts', currentDocId));
      } catch (cleanupErr) {
        console.warn('Old document cleanup warning:', cleanupErr);
      }
    }

    // Record Activity Log
    try {
      const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'activityLogs', actId), {
        id: actId,
        employeeId: updatedProfile.employeeId || newDocId,
        employeeEmail: newEmail,
        employeeName: fullName,
        type: 'profile_updated',
        description: `Profile updated for ${fullName} (${designation}, ${department})`,
        performedBy: adminEmail || 'Admin',
        timestamp: new Date().toISOString(),
        createdAt: Date.now(),
      });
    } catch (actErr) {
      console.warn('Activity log record warning:', actErr);
    }

    return NextResponse.json({
      success: true,
      message: `Employee "${fullName}" updated successfully.`,
      employee: updatedProfile,
    });
  } catch (error: any) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update employee.' },
      { status: 500 }
    );
  }
}
