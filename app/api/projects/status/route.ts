import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ProjectStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: ProjectStatus[] = ['planning', 'active', 'on_hold', 'completed', 'cancelled'];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = String(body.id || body.projectId || '').trim();
    const status = String(body.status || '').toLowerCase().trim() as ProjectStatus;
    const adminEmail = String(request.headers.get('x-admin-email') || body.adminEmail || 'Admin').toLowerCase().trim();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Project ID is required.' }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status "${status}". Valid statuses are: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const projRef = doc(db, 'projects', id);
    const snap = await getDoc(projRef);

    if (!snap.exists()) {
      return NextResponse.json({ success: false, error: 'Project not found.' }, { status: 404 });
    }

    const projData = snap.data();
    const oldStatus = projData.status || 'planning';

    await setDoc(
      projRef,
      {
        status,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Record activity log
    try {
      const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'activityLogs', actId), {
        id: actId,
        projectId: id,
        projectDisplayId: projData.projectId || id,
        projectName: projData.name || id,
        type: 'project_status_changed',
        description: `Project "${projData.name || id}" status changed from "${oldStatus}" to "${status}".`,
        performedBy: adminEmail,
        timestamp: new Date().toISOString(),
        createdAt: Date.now(),
      });
    } catch (actErr) {
      console.warn('Activity logging warning:', actErr);
    }

    return NextResponse.json({
      success: true,
      message: `Project status updated to "${status}".`,
      status,
    });
  } catch (error: any) {
    console.error('Error updating project status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update project status.' },
      { status: 500 }
    );
  }
}
