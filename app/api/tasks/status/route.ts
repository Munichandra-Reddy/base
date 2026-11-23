import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { TaskActivity, TaskSubmission } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      taskId,
      action,
      userUid,
      userName,
      userEmail,
      userRole,
      progress,
      comment,
      summary,
      attachments,
      feedbackReason,
    } = body;

    if (!taskId || !action) {
      return NextResponse.json(
        { success: false, error: 'taskId and action are required.' },
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
    const activities: TaskActivity[] = Array.isArray(taskData.activities)
      ? [...taskData.activities]
      : [];
    const submissions: TaskSubmission[] = Array.isArray(taskData.submissions)
      ? [...taskData.submissions]
      : [];

    let updatePayload: Record<string, any> = { updatedAt: nowIso };
    let successMessage = '';

    // ==========================================
    // ACTION 1: START TASK (Pending -> In Progress)
    // ==========================================
    if (action === 'start') {
      if (taskData.status === 'completed' || taskData.status === 'cancelled') {
        return NextResponse.json(
          { success: false, error: `Cannot start a ${taskData.status} task.` },
          { status: 400 }
        );
      }

      updatePayload.status = 'in_progress';
      updatePayload.startedAt = nowIso;
      updatePayload.progress = taskData.progress || 10;

      const act: TaskActivity = {
        id: `act_${Date.now()}_start`,
        taskId: taskData.taskId || taskId,
        projectId: taskData.projectId,
        performedBy: userEmail || userUid || 'Employee',
        performedByName: userName || 'Employee',
        activityType: 'task_started',
        description: `${userName || 'Employee'} started working on the task.`,
        timestamp: nowIso,
      };
      activities.unshift(act);
      updatePayload.activities = activities;
      successMessage = `Task "${taskData.title}" started successfully!`;
    }

    // ==========================================
    // ACTION 2: UPDATE PROGRESS (1-99%)
    // ==========================================
    else if (action === 'progress') {
      if (taskData.status === 'in_review') {
        return NextResponse.json(
          { success: false, error: 'Cannot edit progress while task is submitted for review.' },
          { status: 400 }
        );
      }

      const numProgress = Math.min(100, Math.max(0, Number(progress) || 0));
      const oldProgress = taskData.progress || 0;
      updatePayload.progress = numProgress;

      // Status adjustment: if 0 and pending, keep pending; if >0 and pending, switch to in_progress
      if (numProgress > 0 && taskData.status === 'pending') {
        updatePayload.status = 'in_progress';
        if (!taskData.startedAt) updatePayload.startedAt = nowIso;
      }

      const act: TaskActivity = {
        id: `act_${Date.now()}_prog`,
        taskId: taskData.taskId || taskId,
        projectId: taskData.projectId,
        performedBy: userEmail || userUid || 'Employee',
        performedByName: userName || 'Employee',
        activityType: 'progress_updated',
        description: `Progress updated from ${oldProgress}% to ${numProgress}%.${comment ? ` Note: "${comment}"` : ''}`,
        previousValue: `${oldProgress}%`,
        newValue: `${numProgress}%`,
        timestamp: nowIso,
      };
      activities.unshift(act);
      updatePayload.activities = activities;

      // If employee left a comment along with the progress update, record it
      if (comment && comment.trim()) {
        const comments = Array.isArray(taskData.comments) ? [...taskData.comments] : [];
        comments.push({
          id: `cmt_${Date.now()}`,
          taskId: taskData.taskId || taskId,
          userId: userUid || userEmail || 'user',
          userName: userName || 'Employee',
          userRole: userRole || 'Team Member',
          message: comment.trim(),
          createdAt: nowIso,
        });
        updatePayload.comments = comments;
      }

      successMessage = `Progress updated to ${numProgress}% successfully.`;
    }

    // ==========================================
    // ACTION 3: SUBMIT FOR REVIEW (In Progress / Changes Requested -> In Review)
    // ==========================================
    else if (action === 'submit') {
      if (!summary || !summary.trim()) {
        return NextResponse.json(
          { success: false, error: 'A work completion summary is required before submitting for review.' },
          { status: 400 }
        );
      }

      const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newSubmission: TaskSubmission = {
        id: submissionId,
        submittedBy: userEmail || userUid || 'Employee',
        submittedByName: userName || 'Employee',
        summary: summary.trim(),
        ...(comment && comment.trim() ? { comment: comment.trim() } : {}),
        progress: typeof progress === 'number' ? progress : taskData.progress || 90,
        attachments: Array.isArray(attachments) ? attachments : [],
        submittedAt: nowIso,
        reviewStatus: 'pending',
      };

      submissions.unshift(newSubmission);

      updatePayload.status = 'in_review';
      updatePayload.submittedAt = nowIso;
      updatePayload.submissions = submissions;

      const act: TaskActivity = {
        id: `act_${Date.now()}_sub`,
        taskId: taskData.taskId || taskId,
        projectId: taskData.projectId,
        performedBy: userEmail || userUid || 'Employee',
        performedByName: userName || 'Employee',
        activityType: 'submitted_for_review',
        description: `Task submitted for review by ${userName || 'Employee'}. Summary: "${summary.trim()}"`,
        timestamp: nowIso,
      };
      activities.unshift(act);
      updatePayload.activities = activities;

      // Notify Workspace Administrator
      try {
        const notifId = `notif_${Date.now()}_rev`;
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          recipientUid: 'admin',
          recipientEmail: 'cr7156816@gmail.com',
          taskId,
          taskDisplayId: taskData.taskId || taskId,
          taskTitle: taskData.title,
          projectName: taskData.project,
          notificationType: 'task_submitted_for_review',
          message: `${userName || 'An employee'} submitted "${taskData.title}" for your review.`,
          createdAt: nowIso,
          read: false,
        });
      } catch (e) {}

      successMessage = `"${taskData.title}" has been submitted successfully for review.`;
    }

    // ==========================================
    // ACTION 4: APPROVE TASK (In Review -> Completed)
    // ==========================================
    else if (action === 'approve') {
      if (userRole !== 'admin' && !userEmail?.includes('cr7156816')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Only Workspace Administrators can approve task submissions.' },
          { status: 403 }
        );
      }

      // Mark the latest pending submission as approved
      if (submissions.length > 0 && submissions[0].reviewStatus === 'pending') {
        submissions[0].reviewStatus = 'approved';
        submissions[0].reviewerId = userEmail || userUid || 'Admin';
        submissions[0].reviewerName = userName || 'Workspace Administrator';
        submissions[0].reviewComment = comment ? comment.trim() : 'Approved.';
        submissions[0].reviewedAt = nowIso;
      }

      updatePayload.status = 'completed';
      updatePayload.completed = true;
      updatePayload.progress = 100;
      updatePayload.completedAt = nowIso;
      updatePayload.submissions = submissions;

      const act: TaskActivity = {
        id: `act_${Date.now()}_appr`,
        taskId: taskData.taskId || taskId,
        projectId: taskData.projectId,
        performedBy: userEmail || userUid || 'Admin',
        performedByName: userName || 'Workspace Administrator',
        activityType: 'review_approved',
        description: `Task approved by ${userName || 'Admin'}. Marked as 100% completed.${comment ? ` Feedback: "${comment}"` : ''}`,
        previousValue: `${taskData.progress || 90}%`,
        newValue: '100%',
        timestamp: nowIso,
      };
      activities.unshift(act);

      const actCompleted: TaskActivity = {
        id: `act_${Date.now()}_comp`,
        taskId: taskData.taskId || taskId,
        projectId: taskData.projectId,
        performedBy: userEmail || userUid || 'Admin',
        performedByName: userName || 'Workspace Administrator',
        activityType: 'task_completed',
        description: `Task lifecycle completed.`,
        timestamp: nowIso,
      };
      activities.unshift(actCompleted);
      updatePayload.activities = activities;

      // Notify the assigned employee of task approval
      try {
        const notifId = `notif_${Date.now()}_appr`;
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          notificationId: notifId,
          recipientUid: taskData.assignedToId || taskData.assignedToEmail || taskData.assignedTo,
          recipientEmail: (taskData.assignedToEmail || '').toLowerCase().trim(),
          actorName: userName || 'Admin',
          taskId,
          taskDisplayId: taskData.taskId || taskId,
          taskTitle: taskData.title,
          projectId: taskData.projectId || '',
          projectName: taskData.project || '',
          type: 'task_approved',
          title: 'Your work was approved.',
          message: `Admin approved your work on task "${taskData.title}".`,
          relatedEntityType: 'task',
          relatedEntityId: taskId,
          createdAt: Date.now(),
          timestampStr: nowIso,
          isRead: false,
          read: false,
          status: 'active',
        });
      } catch (e) {}

      successMessage = `Task approved successfully. "${taskData.title}" is now completed.`;
    }

    // ==========================================
    // ACTION 5: REQUEST CHANGES (In Review -> Changes Requested)
    // ==========================================
    else if (action === 'request_changes') {
      if (userRole !== 'admin' && !userEmail?.includes('cr7156816')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Only Workspace Administrators can request task changes.' },
          { status: 403 }
        );
      }

      const feedback = feedbackReason || comment;
      if (!feedback || !feedback.trim()) {
        return NextResponse.json(
          { success: false, error: 'Please enter the specific feedback/reason for requesting changes.' },
          { status: 400 }
        );
      }

      // Mark latest submission as changes_requested
      if (submissions.length > 0 && submissions[0].reviewStatus === 'pending') {
        submissions[0].reviewStatus = 'changes_requested';
        submissions[0].reviewerId = userEmail || userUid || 'Admin';
        submissions[0].reviewerName = userName || 'Workspace Administrator';
        submissions[0].reviewComment = feedback.trim();
        submissions[0].reviewedAt = nowIso;
      }

      updatePayload.status = 'changes_requested';
      updatePayload.completed = false;
      updatePayload.submissions = submissions;

      const act: TaskActivity = {
        id: `act_${Date.now()}_cr`,
        taskId: taskData.taskId || taskId,
        projectId: taskData.projectId,
        performedBy: userEmail || userUid || 'Admin',
        performedByName: userName || 'Workspace Administrator',
        activityType: 'changes_requested',
        description: `Changes requested by ${userName || 'Admin'}. Feedback: "${feedback.trim()}"`,
        timestamp: nowIso,
      };
      activities.unshift(act);
      updatePayload.activities = activities;

      // Also record as a comment so employee sees it prominently in comments trail
      const comments = Array.isArray(taskData.comments) ? [...taskData.comments] : [];
      comments.push({
        id: `cmt_${Date.now()}_cr`,
        taskId: taskData.taskId || taskId,
        userId: userUid || userEmail || 'admin',
        userName: userName || 'Administrator (Reviewer)',
        userRole: 'Administrator',
        message: `Changes Requested: ${feedback.trim()}`,
        createdAt: nowIso,
      });
      updatePayload.comments = comments;

      // Notify the assigned employee of requested changes
      try {
        const notifId = `notif_${Date.now()}_cr`;
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          notificationId: notifId,
          recipientUid: taskData.assignedToId || taskData.assignedToEmail || taskData.assignedTo,
          recipientEmail: (taskData.assignedToEmail || '').toLowerCase().trim(),
          actorName: userName || 'Admin',
          taskId,
          taskDisplayId: taskData.taskId || taskId,
          taskTitle: taskData.title,
          projectId: taskData.projectId || '',
          projectName: taskData.project || '',
          type: 'changes_requested',
          title: 'Changes have been requested on your task.',
          message: feedback.trim() ? `Feedback on "${taskData.title}": ${feedback.trim()}` : `Admin requested changes on "${taskData.title}".`,
          relatedEntityType: 'task',
          relatedEntityId: taskId,
          createdAt: Date.now(),
          timestampStr: nowIso,
          isRead: false,
          read: false,
          status: 'active',
        });
      } catch (e) {}

      successMessage = `Feedback sent. Task status updated to Changes Requested.`;
    }

    // ==========================================
    // ACTION 6: CANCEL TASK
    // ==========================================
    else if (action === 'cancel') {
      if (userRole !== 'admin' && !userEmail?.includes('cr7156816')) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Only Workspace Administrators can cancel tasks.' },
          { status: 403 }
        );
      }

      updatePayload.status = 'cancelled';
      updatePayload.completed = false;

      const act: TaskActivity = {
        id: `act_${Date.now()}_canc`,
        taskId: taskData.taskId || taskId,
        projectId: taskData.projectId,
        performedBy: userEmail || userUid || 'Admin',
        performedByName: userName || 'Workspace Administrator',
        activityType: 'task_cancelled',
        description: `Task was cancelled by ${userName || 'Admin'}.`,
        timestamp: nowIso,
      };
      activities.unshift(act);
      updatePayload.activities = activities;
      successMessage = `Task "${taskData.title}" has been cancelled.`;
    }

    await updateDoc(taskRef, updatePayload);

    return NextResponse.json({
      success: true,
      message: successMessage,
      task: { id: taskId, ...taskData, ...updatePayload },
    });
  } catch (error: any) {
    console.error('Error handling task status change:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update task status.' },
      { status: 500 }
    );
  }
}
