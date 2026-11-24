import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { Task, TaskPriority, TaskStatus, isTaskOverdue, TaskActivity } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Helper to normalize task data from Firestore
function normalizeTask(id: string, data: any, index: number = 0): Task {
  const isCompleted = Boolean(data.completed || data.status === 'completed');
  let status: TaskStatus = 'pending';
  if (['pending', 'in_progress', 'in_review', 'changes_requested', 'completed', 'cancelled'].includes(data.status)) {
    status = data.status as TaskStatus;
  } else if (isCompleted) {
    status = 'completed';
  }

  // Generate clean TSK-XXXX display ID if absent
  let taskId = data.taskId;
  if (!taskId) {
    const numericPart = (id || '').replace(/[^0-9]/g, '');
    if (numericPart.length >= 4) {
      taskId = `TSK-${numericPart.slice(-4)}`;
    } else {
      taskId = `TSK-${String(1001 + index).padStart(4, '0')}`;
    }
  }

  const progress = typeof data.progress === 'number' ? data.progress : isCompleted ? 100 : 0;
  const todayStr = new Date().toISOString().split('T')[0];
  const startDate = data.startDate || data.createdAt?.split('T')[0] || todayStr;
  const dueDate = data.dueDate || todayStr;
  const stream = data.stream || '';
  const streamName = data.streamName || '';
  const sprintWeek = data.sprintWeek || '';
  const weekendMeetingReview = Boolean(data.weekendMeetingReview);

  return {
    id,
    taskId,
    title: data.title || 'Untitled Task',
    description: data.description || '',
    project: data.project || data.projectName || 'General',
    projectId: data.projectId || '',
    completed: isCompleted,
    status,
    priority: (data.priority || 'medium').toLowerCase() as TaskPriority,
    assignedTo: data.assignedTo || 'Unassigned',
    assignedToId: data.assignedToId || data.assignedToUid || '',
    assignedToEmail: data.assignedToEmail || '',
    assignedToRole: data.assignedToRole || data.assignedToDesignation || '',
    assignedToDept: data.assignedToDept || data.assignedToDepartment || '',
    assignedBy: data.assignedBy || 'Admin',
    assignedByName: data.assignedByName || 'Workspace Administrator',
    startDate,
    dueDate,
    progress,
    instructions: data.instructions || '',
    adminNotes: data.adminNotes || '',
    stream,
    streamName,
    sprintWeek,
    weekendMeetingReview,
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    comments: Array.isArray(data.comments) ? data.comments : [],
    submissions: Array.isArray(data.submissions) ? data.submissions : [],
    activities: Array.isArray(data.activities) ? data.activities : [],
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    startedAt: data.startedAt || '',
    submittedAt: data.submittedAt || '',
    completedAt: data.completedAt || '',
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email')?.toLowerCase().trim() || '';
    const userRole = searchParams.get('role')?.toLowerCase().trim() || '';
    const userUid = searchParams.get('uid')?.trim() || '';
    const userName = searchParams.get('name')?.toLowerCase().trim() || '';

    const snap = await getDocs(collection(db, 'tasks'));
    let tasksList: Task[] = snap.docs.map((d, idx) => normalizeTask(d.id, d.data(), idx));

    // Filter out legacy dummy hardcoded tasks
    tasksList = tasksList.filter((t) => {
      if (['t-1', 't-2', 't-3', 't-4', 't-5', 't-6'].includes(t.id)) return false;
      if (t.assignedTo === 'Rahul Kumar' && (t.id.startsWith('t-') || t.id.startsWith('TSK-100'))) return false;
      return true;
    });

    // Sort by createdAt descending
    tasksList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    // Filter tasks if accessed by an Employee (non-admin)
    if (userEmail && userRole !== 'admin') {
      tasksList = tasksList.filter((t) => {
        if (userUid && t.assignedToId && t.assignedToId === userUid) return true;
        if (t.assignedToEmail && t.assignedToEmail.toLowerCase() === userEmail) return true;
        if (t.assignedTo && userName && t.assignedTo.toLowerCase().includes(userName)) return true;
        if (t.assignedTo && userEmail && t.assignedTo.toLowerCase().includes(userEmail)) return true;
        return false;
      });
    }

    // Dynamic Summary Metrics
    const metrics = {
      total: tasksList.length,
      pending: tasksList.filter((t) => t.status === 'pending' || (!t.status && !t.completed)).length,
      in_progress: tasksList.filter((t) => t.status === 'in_progress').length,
      in_review: tasksList.filter((t) => t.status === 'in_review').length,
      changes_requested: tasksList.filter((t) => t.status === 'changes_requested').length,
      completed: tasksList.filter((t) => t.status === 'completed' || t.completed).length,
      overdue: tasksList.filter((t) => isTaskOverdue(t)).length,
    };

    return NextResponse.json({
      success: true,
      tasks: tasksList,
      metrics,
    });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch tasks.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const projectName = String(body.project || body.projectName || '').trim();
    let projectId = String(body.projectId || '').trim();
    const assignedTo = String(body.assignedTo || '').trim();
    const assignedToEmail = String(body.assignedToEmail || '').toLowerCase().trim();
    const assignedToId = String(body.assignedToId || body.assignedToUid || '').trim();
    const assignedToRole = String(body.assignedToRole || body.assignedToDesignation || '').trim();
    const assignedToDept = String(body.assignedToDept || body.assignedToDepartment || '').trim();
    const assignedBy = String(body.assignedBy || request.headers.get('x-user-email') || 'Admin').trim();
    const assignedByName = String(body.assignedByName || 'Workspace Administrator').trim();

    const startDate = String(body.startDate || new Date().toISOString().split('T')[0]).trim();
    const dueDate = String(body.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]).trim();

    const priority: TaskPriority = ['low', 'medium', 'high', 'critical'].includes(String(body.priority).toLowerCase())
      ? (String(body.priority).toLowerCase() as TaskPriority)
      : 'medium';

    const instructions = String(body.instructions || '').trim();
    const adminNotes = String(body.adminNotes || '').trim();
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    const stream = String(body.stream || '').trim();
    const streamName = String(body.streamName || '').trim();
    const sprintWeek = String(body.sprintWeek || '').trim();
    const weekendMeetingReview = Boolean(body.weekendMeetingReview);

    // 1. Mandatory Validations
    if (!title) {
      return NextResponse.json({ success: false, error: 'Task Title is required.' }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ success: false, error: 'Task Description is required.' }, { status: 400 });
    }
    if (!projectName) {
      return NextResponse.json({ success: false, error: 'Project is required.' }, { status: 400 });
    }
    if (!assignedTo) {
      return NextResponse.json({ success: false, error: 'Assigned Employee is required.' }, { status: 400 });
    }
    if (!startDate || !dueDate) {
      return NextResponse.json({ success: false, error: 'Both Start Date and Due Date are required.' }, { status: 400 });
    }
    if (new Date(dueDate).getTime() < new Date(startDate).getTime()) {
      return NextResponse.json(
        { success: false, error: 'Due Date must not be earlier than Start Date.' },
        { status: 400 }
      );
    }

    // 2. Validate Project from Firestore (Ensure not cancelled)
    const projectsSnap = await getDocs(collection(db, 'projects'));
    let matchedProject = projectsSnap.docs.find((d) => {
      const data = d.data();
      return (
        (projectId && d.id === projectId) ||
        (data.name && data.name.toLowerCase().trim() === projectName.toLowerCase().trim())
      );
    });

    if (matchedProject) {
      projectId = matchedProject.id;
      const projData = matchedProject.data();
      if ((projData.status || '').toLowerCase() === 'cancelled') {
        return NextResponse.json(
          { success: false, error: `Cannot create task under cancelled project "${projData.name}".` },
          { status: 400 }
        );
      }
    }

    // 3. Auto-generate unique Task ID (TSK-XXXX)
    const existingTasksSnap = await getDocs(collection(db, 'tasks'));
    const existingIds = new Set(
      existingTasksSnap.docs.map((d) => (d.data().taskId || '').toUpperCase())
    );

    let candidateNumber = 1000 + existingTasksSnap.docs.length + 1;
    let candidateTaskId = `TSK-${candidateNumber}`;
    while (existingIds.has(candidateTaskId.toUpperCase())) {
      candidateNumber++;
      candidateTaskId = `TSK-${candidateNumber}`;
    }

    // 4. Initial Audit Activity
    const nowIso = new Date().toISOString();
    const initialActivity: TaskActivity = {
      id: `act_${Date.now()}_1`,
      taskId: candidateTaskId,
      projectId,
      performedBy: assignedBy,
      performedByName: assignedByName,
      activityType: 'task_created',
      description: `Task "${title}" (${candidateTaskId}) created under project "${projectName}" and assigned to ${assignedTo}.`,
      timestamp: nowIso,
    };

    const docId = `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newTask: Task = {
      id: docId,
      taskId: candidateTaskId,
      title,
      description,
      project: projectName,
      projectId,
      completed: false,
      status: 'pending',
      priority,
      assignedTo,
      assignedToId,
      assignedToEmail,
      assignedToRole,
      assignedToDept,
      assignedBy,
      assignedByName,
      startDate,
      dueDate,
      progress: 0,
      instructions,
      adminNotes,
      stream,
      streamName,
      sprintWeek,
      weekendMeetingReview,
      attachments,
      comments: [],
      submissions: [],
      activities: [initialActivity],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Save to Firestore tasks collection
    await setDoc(doc(db, 'tasks', docId), newTask);

    // 5. Global Activity Log
    try {
      const globalActId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'activityLogs', globalActId), {
        id: globalActId,
        taskId: docId,
        taskDisplayId: candidateTaskId,
        taskTitle: title,
        projectName,
        type: 'task_created',
        description: `Task "${title}" (${candidateTaskId}) assigned to ${assignedTo}. Priority: ${priority}, Due: ${dueDate}.`,
        performedBy: assignedByName || assignedBy,
        timestamp: nowIso,
        createdAt: Date.now(),
      });
    } catch (e) {
      console.warn('Task global activity log warning:', e);
    }

    // 6. Notification for assigned employee
    try {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        recipientUid: assignedToId || assignedToEmail || assignedTo,
        recipientEmail: assignedToEmail,
        taskId: docId,
        taskDisplayId: candidateTaskId,
        taskTitle: title,
        projectName,
        notificationType: 'task_assigned',
        message: `You have been assigned a new task: "${title}" in project "${projectName}". Due on ${dueDate}.`,
        createdAt: nowIso,
        read: false,
      });
    } catch (e) {
      console.warn('Task notification warning:', e);
    }

    return NextResponse.json({
      success: true,
      message: `Task ${title} has been assigned to ${assignedTo} successfully.`,
      task: newTask,
    });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred while creating task.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, taskId, ...updates } = body;

    const targetId = id || taskId;
    if (!targetId) {
      return NextResponse.json({ success: false, error: 'Task ID is required for updating.' }, { status: 400 });
    }

    const taskRef = doc(db, 'tasks', targetId);
    const existingSnap = await getDoc(taskRef);
    if (!existingSnap.exists()) {
      return NextResponse.json({ success: false, error: 'Task document not found.' }, { status: 404 });
    }

    const existingData = existingSnap.data();
    const nowIso = new Date().toISOString();
    const updatedActivities: TaskActivity[] = Array.isArray(existingData.activities)
      ? [...existingData.activities]
      : [];

    // Track due date changes
    if (updates.dueDate && updates.dueDate !== existingData.dueDate) {
      const startDate = updates.startDate || existingData.startDate || nowIso.split('T')[0];
      if (new Date(updates.dueDate).getTime() < new Date(startDate).getTime()) {
        return NextResponse.json(
          { success: false, error: 'Due Date must not be earlier than Start Date.' },
          { status: 400 }
        );
      }
      updatedActivities.unshift({
        id: `act_${Date.now()}_dd`,
        taskId: existingData.taskId || targetId,
        projectId: existingData.projectId,
        performedBy: updates.updatedBy || 'Admin',
        performedByName: updates.updatedByName || 'Workspace Administrator',
        activityType: 'due_date_changed',
        description: `Due date changed from ${existingData.dueDate} to ${updates.dueDate}.`,
        previousValue: existingData.dueDate,
        newValue: updates.dueDate,
        timestamp: nowIso,
      });
    }

    // Track priority changes
    if (updates.priority && updates.priority !== existingData.priority) {
      updatedActivities.unshift({
        id: `act_${Date.now()}_pr`,
        taskId: existingData.taskId || targetId,
        projectId: existingData.projectId,
        performedBy: updates.updatedBy || 'Admin',
        performedByName: updates.updatedByName || 'Workspace Administrator',
        activityType: 'priority_changed',
        description: `Priority changed from ${existingData.priority} to ${updates.priority}.`,
        previousValue: existingData.priority,
        newValue: updates.priority,
        timestamp: nowIso,
      });
    }

    // Generic edit activity
    if (updates.title || updates.description || updates.instructions) {
      updatedActivities.unshift({
        id: `act_${Date.now()}_edit`,
        taskId: existingData.taskId || targetId,
        projectId: existingData.projectId,
        performedBy: updates.updatedBy || 'Admin',
        performedByName: updates.updatedByName || 'Workspace Administrator',
        activityType: 'task_edited',
        description: `Task details updated.`,
        timestamp: nowIso,
      });
    }

    const patchPayload: Record<string, any> = {
      ...updates,
      activities: updatedActivities,
      updatedAt: nowIso,
    };

    if (updates.status === 'completed') {
      patchPayload.completed = true;
      patchPayload.progress = 100;
      if (!existingData.completedAt) patchPayload.completedAt = nowIso;
    } else if (updates.status && updates.status !== 'completed') {
      patchPayload.completed = false;
    }

    await updateDoc(taskRef, patchPayload);

    return NextResponse.json({
      success: true,
      message: 'Task updated successfully.',
      task: { id: targetId, ...existingData, ...patchPayload },
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update task.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userRole = request.headers.get('x-user-role');

    if (userRole && userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only Workspace Administrators can delete tasks.' },
        { status: 403 }
      );
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing task id.' }, { status: 400 });
    }

    const taskRef = doc(db, 'tasks', id);
    const snap = await getDoc(taskRef);
    if (snap.exists()) {
      const data = snap.data();
      await deleteDoc(taskRef);

      // Log deletion activity
      try {
        const actId = `act_${Date.now()}_del`;
        await setDoc(doc(db, 'activityLogs', actId), {
          id: actId,
          taskId: id,
          taskDisplayId: data.taskId || id,
          taskTitle: data.title,
          type: 'task_cancelled',
          description: `Task "${data.title}" was removed by Administrator.`,
          timestamp: new Date().toISOString(),
          createdAt: Date.now(),
        });
      } catch (e) {}
    }

    return NextResponse.json({ success: true, message: 'Task deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete task.' },
      { status: 500 }
    );
  }
}
