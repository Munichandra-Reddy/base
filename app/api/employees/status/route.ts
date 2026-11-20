import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || '').toLowerCase().trim();
    const newStatus = String(body.status || '').toLowerCase().trim(); // 'active' | 'inactive' | 'suspended'

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Employee email is required.' },
        { status: 400 }
      );
    }

    if (!['active', 'inactive', 'suspended', 'invited'].includes(newStatus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be "active", "inactive", "suspended", or "invited".' },
        { status: 400 }
      );
    }

    // Prohibit deactivating the master admin
    if (email === 'cr7156816@gmail.com') {
      return NextResponse.json(
        { success: false, error: 'Cannot alter status of the primary Workspace Administrator.' },
        { status: 403 }
      );
    }

    const docId = email.replace(/[^a-zA-Z0-9]/g, '_');
    const empRef = doc(db, 'employees', docId);
    const empSnap = await getDoc(empRef);

    if (!empSnap.exists()) {
      return NextResponse.json(
        { success: false, error: `Employee "${email}" not found.` },
        { status: 404 }
      );
    }

    const updates: Record<string, any> = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    if (newStatus === 'inactive') {
      updates.deactivatedAt = new Date().toISOString();
    } else if (newStatus === 'active') {
      updates.reactivatedAt = new Date().toISOString();
    }

    // Update employees collection in Firestore
    await setDoc(empRef, updates, { merge: true });

    // Update user_accounts collection in Firestore
    const userRef = doc(db, 'user_accounts', docId);
    await setDoc(userRef, updates, { merge: true });

    // Record Activity Log
    try {
      const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const empData = empSnap.data();
      await setDoc(doc(db, 'activityLogs', actId), {
        id: actId,
        employeeId: empData.employeeId || docId,
        employeeEmail: email,
        employeeName: empData.name || empData.fullName || email,
        type: newStatus === 'active' ? 'reactivated' : 'deactivated',
        description: `Employee account for ${empData.name || email} was ${newStatus === 'active' ? 'reactivated' : 'deactivated'}.`,
        performedBy: 'Admin',
        timestamp: new Date().toISOString(),
        createdAt: Date.now(),
      });
    } catch (actErr) {
      console.warn('Activity log record warning:', actErr);
    }

    const statusActionText =
      newStatus === 'inactive'
        ? 'deactivated'
        : newStatus === 'active'
        ? 'reactivated'
        : newStatus === 'suspended'
        ? 'suspended'
        : 'updated';

    return NextResponse.json({
      success: true,
      status: newStatus,
      message: `Employee account for ${email} has been ${statusActionText} successfully.`,
    });
  } catch (error: any) {
    console.error('Error updating employee status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update employee status.' },
      { status: 500 }
    );
  }
}
