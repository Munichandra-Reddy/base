import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, query, orderBy, limit, where } from 'firebase/firestore';
import { EmployeeActivityLog } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.toLowerCase().trim();
    const employeeId = searchParams.get('employeeId')?.trim();

    const activityRef = collection(db, 'activityLogs');
    const snap = await getDocs(activityRef);

    let logs: EmployeeActivityLog[] = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as EmployeeActivityLog));

    // Sort newest first
    logs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // Filter by employee if requested
    if (email) {
      logs = logs.filter(
        (l) => l.employeeEmail?.toLowerCase() === email || (l.description && l.description.toLowerCase().includes(email))
      );
    } else if (employeeId) {
      logs = logs.filter(
        (l) => l.employeeId === employeeId || (l.description && l.description.includes(employeeId))
      );
    }

    return NextResponse.json({
      success: true,
      activities: logs.slice(0, 50),
      count: logs.length,
    });
  } catch (error: any) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch activity logs.', activities: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const actId = body.id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newLog: EmployeeActivityLog = {
      id: actId,
      employeeId: body.employeeId || '',
      employeeEmail: body.employeeEmail ? String(body.employeeEmail).toLowerCase().trim() : '',
      employeeName: body.employeeName || body.userName || '',
      type: body.type || 'profile_updated',
      description: body.description || body.action || 'Activity recorded',
      performedBy: body.performedBy || 'Admin',
      timestamp: body.timestamp || new Date().toISOString(),
      createdAt: body.createdAt || Date.now(),
    };

    const docRef = doc(db, 'activityLogs', actId);
    await setDoc(docRef, newLog, { merge: true });

    return NextResponse.json({ success: true, activity: newLog });
  } catch (error: any) {
    console.error('Error recording activity:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record activity.' },
      { status: 500 }
    );
  }
}
