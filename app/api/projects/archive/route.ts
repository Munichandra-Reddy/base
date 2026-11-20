import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = String(body.id || body.projectId || '').trim();
    const action = String(body.action || 'archive').toLowerCase().trim(); // 'archive' | 'unarchive' | 'delete'
    const adminEmail = String(request.headers.get('x-admin-email') || body.adminEmail || 'Admin').toLowerCase().trim();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Project ID is required.' }, { status: 400 });
    }

    const projRef = doc(db, 'projects', id);
    const snap = await getDoc(projRef);

    if (!snap.exists()) {
      return NextResponse.json({ success: false, error: 'Project not found.' }, { status: 404 });
    }

    const projData = snap.data();

    if (action === 'delete') {
      await deleteDoc(projRef);

      try {
        const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await setDoc(doc(db, 'activityLogs', actId), {
          id: actId,
          projectId: id,
          projectName: projData.name,
          type: 'project_deleted',
          description: `Project "${projData.name || id}" was deleted by ${adminEmail}.`,
          performedBy: adminEmail,
          timestamp: new Date().toISOString(),
          createdAt: Date.now(),
        });
      } catch (e) {}

      return NextResponse.json({ success: true, message: `Project "${projData.name}" has been deleted.` });
    }

    const isArchived = action === 'archive';
    await setDoc(
      projRef,
      {
        archived: isArchived,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    try {
      const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'activityLogs', actId), {
        id: actId,
        projectId: id,
        projectName: projData.name,
        type: isArchived ? 'project_archived' : 'project_unarchived',
        description: `Project "${projData.name || id}" was ${isArchived ? 'archived' : 'unarchived'} by ${adminEmail}.`,
        performedBy: adminEmail,
        timestamp: new Date().toISOString(),
        createdAt: Date.now(),
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `Project "${projData.name}" has been ${isArchived ? 'archived' : 'unarchived'}.`,
      archived: isArchived,
    });
  } catch (error: any) {
    console.error('Error archiving project:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to archive project.' },
      { status: 500 }
    );
  }
}
