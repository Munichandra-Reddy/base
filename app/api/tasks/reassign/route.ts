import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { TaskActivity } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      taskId,
      newAssigneeName,
      newAssigneeEmail,
      newAssigneeId,
      newAssigneeRole,
      newAssigneeDept,
      adminName,
      adminEmail,
      userRole,
    } = body;

    if (userRole !== 'admin' && !adminEmail?.includes('cr7156816')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only Workspace Administrators can reassign tasks.' },
        { status: 403 }
      );
    }

    if (!taskId || !newAssigneeName) {
      return NextResponse.json(
        { success: false, error: 'taskId and newAssigneeName are required.' },
        { status: 400 }
      );
    }

    const taskRef = doc(db, 'tasks', taskId);
    const snap = await getDoc(taskRef);
    if (!snap.exists()) {
      return NextResponse.json({ success: false, error: 'Task not found.' }, { status: 404 });
    }

    const taskData = snap.data();
    const previousAssignee = taskData.assignedTo || 'Unassigned';
    const nowIso = new Date().toISOString();

    const activities: TaskActivity[] = Array.isArray(taskData.activities)
      ? [...taskData.activities]
      : [];

    const act: TaskActivity = {
      id: `act_${Date.now()}_reass`,
      taskId: taskData.taskId || taskId,
      projectId: taskData.projectId,
      performedBy: adminEmail || 'Admin',
      performedByName: adminName || 'Workspace Administrator',
      activityType: 'task_reassigned',
      description: `Task reassigned from ${previousAssignee} to ${newAssigneeName}.`,
      previousValue: previousAssignee,
      newValue: newAssigneeName,
      timestamp: nowIso,
    };
    activities.unshift(act);

    await updateDoc(taskRef, {
      assignedTo: newAssigneeName,
      assignedToEmail: newAssigneeEmail || '',
      assignedToId: newAssigneeId || '',
      assignedToRole: newAssigneeRole || '',
      assignedToDept: newAssigneeDept || '',
      activities,
      updatedAt: nowIso,
    });

    // Notify newly assigned employee
    try {
      const notifId = `notif_${Date.now()}_reass`;
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        recipientUid: newAssigneeId || newAssigneeEmail || newAssigneeName,
        recipientEmail: newAssigneeEmail,
        taskId,
        taskDisplayId: taskData.taskId || taskId,
        taskTitle: taskData.title,
        projectName: taskData.project,
        notificationType: 'task_reassigned',
        message: `Task "${taskData.title}" in project "${taskData.project}" has been reassigned to you.`,
        createdAt: nowIso,
        read: false,
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `Task successfully reassigned to ${newAssigneeName}.`,
    });
  } catch (error: any) {
    console.error('Error reassigning task:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reassign task.' },
      { status: 500 }
    );
  }
}
