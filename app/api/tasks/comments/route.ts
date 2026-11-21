import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { TaskActivity, TaskComment } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskId, userId, userName, userRole, message } = body;

    if (!taskId || !message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'taskId and message are required.' },
        { status: 400 }
      );
    }

    const taskRef = doc(db, 'tasks', taskId);
    const snap = await getDoc(taskRef);
    if (!snap.exists()) {
      return NextResponse.json({ success: false, error: 'Task not found.' }, { status: 404 });
    }

    const taskData = snap.data();
    const nowIso = new Date().toISOString();

    const newComment: TaskComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      taskId: taskData.taskId || taskId,
      userId: userId || 'anonymous',
      userName: userName || 'Team Member',
      userRole: userRole || 'Employee',
      message: message.trim(),
      createdAt: nowIso,
    };

    const comments = Array.isArray(taskData.comments) ? [...taskData.comments] : [];
    comments.push(newComment);

    const activities: TaskActivity[] = Array.isArray(taskData.activities)
      ? [...taskData.activities]
      : [];

    activities.unshift({
      id: `act_${Date.now()}_cmt`,
      taskId: taskData.taskId || taskId,
      projectId: taskData.projectId,
      performedBy: userId || 'user',
      performedByName: userName || 'Team Member',
      activityType: 'comment_added',
      description: `${userName || 'User'} added a comment: "${message.trim().substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
      timestamp: nowIso,
    });

    await updateDoc(taskRef, {
      comments,
      activities,
      updatedAt: nowIso,
    });

    return NextResponse.json({
      success: true,
      message: 'Comment added successfully.',
      comment: newComment,
    });
  } catch (error: any) {
    console.error('Error adding task comment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add comment.' },
      { status: 500 }
    );
  }
}
