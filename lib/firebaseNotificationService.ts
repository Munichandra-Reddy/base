import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { BasecampNotification, NotificationType, Task, Project } from './types';

// ============================================================================
// HELPER: Relative Time Formatter
// ============================================================================
export const getNotificationRelativeTime = (timestamp: number | string): string => {
  const ts = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  if (!ts || isNaN(ts)) return 'Just now';

  const diffMs = Date.now() - ts;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// ============================================================================
// 1. CREATE NOTIFICATION (WITH IDEMPOTENCY / DEDUPLICATION)
// ============================================================================
export interface CreateNotificationInput {
  recipientEmail: string;
  recipientUid?: string;
  actorUid?: string;
  actorName?: string;
  actorAvatar?: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: 'task' | 'project' | 'chat' | 'calendar' | 'file';
  relatedEntityId?: string;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
  conversationId?: string;
  conversationName?: string;
  eventId?: string;
  fileId?: string;
  fileName?: string;
  deduplicationKey?: string;
  actionUrl?: string;
}

export const createNotification = async (
  input: CreateNotificationInput
): Promise<string | null> => {
  try {
    const cleanRecipientEmail = (input.recipientEmail || '').toLowerCase().trim();
    if (!cleanRecipientEmail) {
      console.warn('[Notification] Missing recipientEmail, skipping.');
      return null;
    }

    // Never notify actor of their own action
    if (
      input.actorUid &&
      input.actorUid.toLowerCase().trim() === cleanRecipientEmail
    ) {
      return null;
    }

    // 1. Deduplication check
    if (input.deduplicationKey) {
      try {
        const notifCol = collection(db, 'notifications');
        const q = query(
          notifCol,
          where('recipientEmail', '==', cleanRecipientEmail),
          where('deduplicationKey', '==', input.deduplicationKey),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          // Already created, avoid duplicate
          return snap.docs[0].id;
        }
      } catch (dedupErr) {
        console.warn('[Notification] Dedup query warning:', dedupErr);
      }
    }

    // 2. Generate Notification Record
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    const notif: BasecampNotification = {
      id,
      notificationId: id,
      recipientEmail: cleanRecipientEmail,
      recipientUid: input.recipientUid || cleanRecipientEmail,
      actorUid: input.actorUid || 'system',
      actorName: input.actorName || 'Workspace',
      actorAvatar: input.actorAvatar || (input.actorName ? input.actorName[0]?.toUpperCase() : 'W'),
      type: input.type,
      title: input.title,
      message: input.message,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId || input.taskId || input.projectId || input.conversationId || input.fileId || '',
      projectId: input.projectId || '',
      projectName: input.projectName || '',
      taskId: input.taskId || '',
      taskTitle: input.taskTitle || '',
      conversationId: input.conversationId || '',
      conversationName: input.conversationName || '',
      eventId: input.eventId || '',
      fileId: input.fileId || '',
      fileName: input.fileName || '',
      isRead: false,
      createdAt: now,
      timestampStr: new Date(now).toISOString(),
      deduplicationKey: input.deduplicationKey || '',
      status: 'active',
      actionUrl: input.actionUrl || '',
    };

    const docRef = doc(db, 'notifications', id);
    await setDoc(docRef, notif);

    // Update localStorage cache for resilience
    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem('workorbit_user_notifications');
        const parsed = local ? JSON.parse(local) : [];
        localStorage.setItem(
          'workorbit_user_notifications',
          JSON.stringify([notif, ...parsed].slice(0, 100))
        );
      } catch (e) {}
    }

    return id;
  } catch (error) {
    console.error('[Notification] Error creating notification:', error);
    return null;
  }
};

// ============================================================================
// 2. REAL-TIME SUBSCRIPTION TO USER NOTIFICATIONS
// ============================================================================
export const subscribeToUserNotifications = (
  userEmail: string,
  callback: (notifications: BasecampNotification[]) => void
): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  const cleanEmail = (userEmail || '').toLowerCase().trim();
  if (!cleanEmail) {
    callback([]);
    return () => {};
  }

  try {
    const notifCol = collection(db, 'notifications');
    const q = query(
      notifCol,
      where('recipientEmail', '==', cleanEmail)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: BasecampNotification[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as any;
          if (data && data.status !== 'deleted') {
            const rawType = data.type || data.notificationType || 'system';
            list.push({
              ...data,
              id: d.id,
              notificationId: data.notificationId || d.id,
              type: rawType,
              title: data.title || 'Notification',
              message: data.message || '',
              isRead: Boolean(data.isRead || data.read),
              createdAt: typeof data.createdAt === 'number' ? data.createdAt : data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
            });
          }
        });

        // Sort descending by creation date
        list.sort((a, b) => b.createdAt - a.createdAt);

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('workorbit_user_notifications', JSON.stringify(list));
          } catch (e) {}
        }

        callback(list);
      },
      (error) => {
        if (error?.code !== 'unavailable') {
          console.warn('[Notification] Snapshot notice:', error?.message || error);
        }
        // Load fallback from localStorage
        if (typeof window !== 'undefined') {
          try {
            const saved = localStorage.getItem('workorbit_user_notifications');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed)) callback(parsed);
            }
          } catch (e) {}
        }
      }
    );
  } catch (err) {
    console.error('[Notification] Subscription init error:', err);
    return () => {};
  }
};

// ============================================================================
// 3. MARK NOTIFICATION AS READ
// ============================================================================
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  if (!notificationId) return;
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, {
      isRead: true,
      readAt: Date.now(),
    });
  } catch (error) {
    console.error('[Notification] Error marking notification as read:', error);
  }
};

// ============================================================================
// 4. MARK ALL NOTIFICATIONS AS READ
// ============================================================================
export const markAllNotificationsAsRead = async (userEmail: string): Promise<void> => {
  const cleanEmail = (userEmail || '').toLowerCase().trim();
  if (!cleanEmail) return;

  try {
    const notifCol = collection(db, 'notifications');
    const q = query(
      notifCol,
      where('recipientEmail', '==', cleanEmail),
      where('isRead', '==', false)
    );

    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    const now = Date.now();
    snap.docs.forEach((d) => {
      batch.update(d.ref, { isRead: true, readAt: now });
    });
    await batch.commit();
  } catch (error) {
    console.error('[Notification] Error marking all as read:', error);
  }
};

// ============================================================================
// 5. DELETE NOTIFICATION (SOFT / HARD DELETE)
// ============================================================================
export const deleteNotification = async (notificationId: string): Promise<void> => {
  if (!notificationId) return;
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('[Notification] Error deleting notification:', error);
  }
};

// ============================================================================
// 6. EVENT DISPATCHERS (AUTOMATIC NOTIFICATION GENERATION)
// ============================================================================

/**
 * Task Assigned Event
 */
export const notifyTaskAssigned = async (params: {
  taskId: string;
  taskTitle: string;
  projectId?: string;
  projectName?: string;
  assigneeEmail: string;
  assigneeName?: string;
  actorName?: string;
  actorUid?: string;
}) => {
  const { taskId, taskTitle, projectId, projectName, assigneeEmail, actorName, actorUid } = params;
  if (!assigneeEmail) return;

  await createNotification({
    recipientEmail: assigneeEmail,
    actorUid,
    actorName: actorName || 'Admin',
    type: 'task_assigned',
    title: 'You have a new task.',
    message: `Assigned: "${taskTitle}" in ${projectName || 'workspace'}`,
    relatedEntityType: 'task',
    relatedEntityId: taskId,
    taskId,
    taskTitle,
    projectId,
    projectName,
    deduplicationKey: `task_assigned_${taskId}_${assigneeEmail}`,
  });
};

/**
 * Task Due Soon Event (Due Tomorrow or within 24 Hours)
 */
export const notifyTaskDueSoon = async (params: {
  taskId: string;
  taskTitle: string;
  projectId?: string;
  projectName?: string;
  assigneeEmail: string;
  dueDate: string;
}) => {
  const { taskId, taskTitle, projectId, projectName, assigneeEmail, dueDate } = params;
  if (!assigneeEmail) return;

  await createNotification({
    recipientEmail: assigneeEmail,
    type: 'task_due_soon',
    title: 'Your task is due tomorrow.',
    message: `"${taskTitle}" is due on ${dueDate}. Please finish and submit for review.`,
    relatedEntityType: 'task',
    relatedEntityId: taskId,
    taskId,
    taskTitle,
    projectId,
    projectName,
    deduplicationKey: `due_soon_${taskId}_${dueDate}`,
  });
};

/**
 * Task Overdue Event
 */
export const notifyTaskOverdue = async (params: {
  taskId: string;
  taskTitle: string;
  projectId?: string;
  projectName?: string;
  assigneeEmail: string;
  dueDate: string;
}) => {
  const { taskId, taskTitle, projectId, projectName, assigneeEmail, dueDate } = params;
  if (!assigneeEmail) return;

  await createNotification({
    recipientEmail: assigneeEmail,
    type: 'task_overdue',
    title: 'Your task is overdue.',
    message: `"${taskTitle}" was due on ${dueDate} and requires immediate attention.`,
    relatedEntityType: 'task',
    relatedEntityId: taskId,
    taskId,
    taskTitle,
    projectId,
    projectName,
    deduplicationKey: `overdue_${taskId}_${dueDate}`,
  });
};

/**
 * Task Approved Event
 */
export const notifyTaskApproved = async (params: {
  taskId: string;
  taskTitle: string;
  projectId?: string;
  projectName?: string;
  submitterEmail: string;
  actorName?: string;
}) => {
  const { taskId, taskTitle, projectId, projectName, submitterEmail, actorName } = params;
  if (!submitterEmail) return;

  await createNotification({
    recipientEmail: submitterEmail,
    actorName: actorName || 'Workspace Admin',
    type: 'task_approved',
    title: 'Your work was approved.',
    message: `Admin approved your work on task "${taskTitle}".`,
    relatedEntityType: 'task',
    relatedEntityId: taskId,
    taskId,
    taskTitle,
    projectId,
    projectName,
    deduplicationKey: `approved_${taskId}_${Date.now().toString().slice(0, 6)}`,
  });
};

/**
 * Changes Requested Event
 */
export const notifyTaskChangesRequested = async (params: {
  taskId: string;
  taskTitle: string;
  projectId?: string;
  projectName?: string;
  submitterEmail: string;
  comments?: string;
  actorName?: string;
}) => {
  const { taskId, taskTitle, projectId, projectName, submitterEmail, comments, actorName } = params;
  if (!submitterEmail) return;

  await createNotification({
    recipientEmail: submitterEmail,
    actorName: actorName || 'Workspace Admin',
    type: 'changes_requested',
    title: 'Changes have been requested on your task.',
    message: comments ? `"${taskTitle}": ${comments}` : `Admin requested revisions for "${taskTitle}".`,
    relatedEntityType: 'task',
    relatedEntityId: taskId,
    taskId,
    taskTitle,
    projectId,
    projectName,
    deduplicationKey: `changes_req_${taskId}_${Date.now().toString().slice(0, 6)}`,
  });
};

/**
 * Task Reassigned Event
 */
export const notifyTaskReassigned = async (params: {
  taskId: string;
  taskTitle: string;
  projectId?: string;
  projectName?: string;
  newAssigneeEmail: string;
  actorName?: string;
}) => {
  const { taskId, taskTitle, projectId, projectName, newAssigneeEmail, actorName } = params;
  if (!newAssigneeEmail) return;

  await createNotification({
    recipientEmail: newAssigneeEmail,
    actorName: actorName || 'Admin',
    type: 'task_reassigned',
    title: 'A task has been assigned to you.',
    message: `Task "${taskTitle}" was reassigned to you in ${projectName || 'workspace'}.`,
    relatedEntityType: 'task',
    relatedEntityId: taskId,
    taskId,
    taskTitle,
    projectId,
    projectName,
    deduplicationKey: `reassigned_${taskId}_${newAssigneeEmail}`,
  });
};

/**
 * Project Member Added Event
 */
export const notifyProjectMemberAdded = async (params: {
  projectId: string;
  projectName: string;
  memberEmail: string;
  managerName?: string;
  actorName?: string;
}) => {
  const { projectId, projectName, memberEmail, managerName, actorName } = params;
  if (!memberEmail) return;

  await createNotification({
    recipientEmail: memberEmail,
    actorName: actorName || managerName || 'Admin',
    type: 'project_added',
    title: 'You were added to a project.',
    message: `Project: "${projectName}" • Lead: ${managerName || 'Admin'}`,
    relatedEntityType: 'project',
    relatedEntityId: projectId,
    projectId,
    projectName,
    deduplicationKey: `proj_add_${projectId}_${memberEmail}`,
  });
};

/**
 * Project Detail or Status Update Event
 */
export const notifyProjectUpdated = async (params: {
  projectId: string;
  projectName: string;
  members: string[];
  actorName?: string;
  actorEmail?: string;
  updateSummary: string;
}) => {
  const { projectId, projectName, members, actorName, actorEmail, updateSummary } = params;
  const cleanActor = (actorEmail || '').toLowerCase().trim();

  for (const member of members) {
    const cleanMember = (member || '').toLowerCase().trim();
    if (!cleanMember || cleanMember === cleanActor) continue;

    await createNotification({
      recipientEmail: cleanMember,
      actorName: actorName || 'Project Manager',
      type: 'project_updated',
      title: 'A project you are part of has been updated.',
      message: `"${projectName}": ${updateSummary}`,
      relatedEntityType: 'project',
      relatedEntityId: projectId,
      projectId,
      projectName,
      deduplicationKey: `proj_upd_${projectId}_${Date.now().toString().slice(0, 6)}_${cleanMember}`,
    });
  }
};

/**
 * Project Deadline Approaching Event
 */
export const notifyProjectDeadlineApproaching = async (params: {
  projectId: string;
  projectName: string;
  members: string[];
  deadline: string;
}) => {
  const { projectId, projectName, members, deadline } = params;

  for (const member of members) {
    const cleanMember = (member || '').toLowerCase().trim();
    if (!cleanMember) continue;

    await createNotification({
      recipientEmail: cleanMember,
      type: 'project_deadline',
      title: 'A project deadline is approaching.',
      message: `Project "${projectName}" deadline is ${deadline}.`,
      relatedEntityType: 'project',
      relatedEntityId: projectId,
      projectId,
      projectName,
      deduplicationKey: `proj_dl_${projectId}_${deadline}_${cleanMember}`,
    });
  }
};

/**
 * Chat Message Event (Direct, Group, or Project)
 */
export const notifyChatMessage = async (params: {
  conversationId: string;
  conversationType: 'direct' | 'group' | 'project';
  conversationName?: string;
  senderEmail: string;
  senderName: string;
  recipientEmails: string[];
  previewText: string;
  projectId?: string;
  projectName?: string;
}) => {
  const {
    conversationId,
    conversationType,
    conversationName,
    senderEmail,
    senderName,
    recipientEmails,
    previewText,
    projectId,
    projectName,
  } = params;

  const cleanSender = (senderEmail || '').toLowerCase().trim();
  const safePreview = previewText.length > 70 ? `${previewText.slice(0, 67)}...` : previewText;

  for (const recipient of recipientEmails) {
    const cleanRecipient = (recipient || '').toLowerCase().trim();
    if (!cleanRecipient || cleanRecipient === cleanSender) continue;

    let type: NotificationType = 'chat_direct';
    let title = 'You received a message.';
    let message = `${senderName}: "${safePreview}"`;

    if (conversationType === 'group') {
      type = 'chat_group';
      title = 'You have a new group message.';
      message = `${conversationName || 'Group'} • ${senderName}: "${safePreview}"`;
    } else if (conversationType === 'project') {
      type = 'chat_project';
      title = `New message in ${projectName || conversationName || 'Project'}.`;
      message = `${senderName}: "${safePreview}"`;
    }

    await createNotification({
      recipientEmail: cleanRecipient,
      actorUid: cleanSender,
      actorName: senderName,
      type,
      title,
      message,
      relatedEntityType: 'chat',
      relatedEntityId: conversationId,
      conversationId,
      conversationName: conversationName || projectName,
      projectId,
      projectName,
      deduplicationKey: `chat_${conversationId}_${Date.now().toString().slice(0, 5)}_${cleanRecipient}`,
    });
  }
};

/**
 * File Uploaded Event
 */
export const notifyFileUploaded = async (params: {
  fileId: string;
  fileName: string;
  projectId: string;
  projectName: string;
  uploaderEmail: string;
  uploaderName: string;
  projectMembers: string[];
}) => {
  const {
    fileId,
    fileName,
    projectId,
    projectName,
    uploaderEmail,
    uploaderName,
    projectMembers,
  } = params;

  const cleanUploader = (uploaderEmail || '').toLowerCase().trim();

  for (const member of projectMembers) {
    const cleanMember = (member || '').toLowerCase().trim();
    if (!cleanMember || cleanMember === cleanUploader) continue;

    await createNotification({
      recipientEmail: cleanMember,
      actorUid: cleanUploader,
      actorName: uploaderName,
      type: 'file_uploaded',
      title: 'A new file was uploaded to your project.',
      message: `"${fileName}" was added to ${projectName} by ${uploaderName}.`,
      relatedEntityType: 'file',
      relatedEntityId: fileId,
      fileId,
      fileName,
      projectId,
      projectName,
      deduplicationKey: `file_up_${fileId}_${cleanMember}`,
    });
  }
};

/**
 * Meeting Invitation Event
 */
export const notifyMeetingInvited = async (params: {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  attendeeEmails: string[];
  organizerName?: string;
  organizerEmail?: string;
}) => {
  const {
    eventId,
    eventTitle,
    eventDate,
    eventTime,
    attendeeEmails,
    organizerName,
    organizerEmail,
  } = params;

  const cleanOrganizer = (organizerEmail || '').toLowerCase().trim();

  for (const attendee of attendeeEmails) {
    const cleanAttendee = (attendee || '').toLowerCase().trim();
    if (!cleanAttendee || cleanAttendee === cleanOrganizer) continue;

    await createNotification({
      recipientEmail: cleanAttendee,
      actorName: organizerName || 'Meeting Organizer',
      type: 'meeting_invite',
      title: 'You have been invited to a meeting.',
      message: `"${eventTitle}" on ${eventDate} at ${eventTime}.`,
      relatedEntityType: 'calendar',
      relatedEntityId: eventId,
      eventId,
      deduplicationKey: `meeting_inv_${eventId}_${cleanAttendee}`,
    });
  }
};

/**
 * Meeting Reminder Event
 */
export const notifyMeetingReminder = async (params: {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  attendeeEmails: string[];
}) => {
  const { eventId, eventTitle, eventDate, eventTime, attendeeEmails } = params;

  for (const attendee of attendeeEmails) {
    const cleanAttendee = (attendee || '').toLowerCase().trim();
    if (!cleanAttendee) continue;

    await createNotification({
      recipientEmail: cleanAttendee,
      type: 'meeting_reminder',
      title: 'Your meeting starts in 15 minutes.',
      message: `Reminder for "${eventTitle}" at ${eventTime} today.`,
      relatedEntityType: 'calendar',
      relatedEntityId: eventId,
      eventId,
      deduplicationKey: `meeting_rem_${eventId}_${eventDate}_${cleanAttendee}`,
    });
  }
};

// ============================================================================
// 7. AUTOMATED SCHEDULED REMINDER SCAN (TASKS & PROJECTS)
// ============================================================================
export const runScheduledReminderScan = async (
  tasks: Task[],
  projects: Project[],
  userEmail: string
): Promise<void> => {
  const cleanEmail = (userEmail || '').toLowerCase().trim();
  if (!cleanEmail) return;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Calculate tomorrow date string
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // 1. Scan tasks assigned to this user
  for (const task of tasks) {
    const assignedEmail = (task.assignedToEmail || '').toLowerCase().trim();
    const assignedName = (task.assignedTo || '').toLowerCase().trim();

    const isAssigned =
      assignedEmail === cleanEmail ||
      assignedName === cleanEmail ||
      (task.assignedToId && task.assignedToId.toLowerCase() === cleanEmail);

    if (!isAssigned) continue;

    const isDone = task.completed || task.status === 'completed' || task.status === 'cancelled';
    if (isDone) continue;

    const due = task.dueDate;
    if (!due) continue;

    // A. Task Due Tomorrow
    if (due === tomorrowStr) {
      await notifyTaskDueSoon({
        taskId: task.id,
        taskTitle: task.title,
        projectId: task.projectId,
        projectName: task.project,
        assigneeEmail: cleanEmail,
        dueDate: due,
      });
    }

    // B. Task Overdue
    if (due < todayStr) {
      await notifyTaskOverdue({
        taskId: task.id,
        taskTitle: task.title,
        projectId: task.projectId,
        projectName: task.project,
        assigneeEmail: cleanEmail,
        dueDate: due,
      });
    }
  }

  // 2. Scan projects user is a member of
  for (const project of projects) {
    const isMember = (project.members || []).some(
      (m) => m.toLowerCase().includes(cleanEmail)
    );
    if (!isMember) continue;

    const isDone = project.status === 'completed' || project.status === 'cancelled';
    if (isDone) continue;

    const deadline = project.endDate || project.deadline;
    if (!deadline) continue;

    // Check if deadline is within next 3 days
    const diffDays = Math.ceil(
      (new Date(deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays >= 0 && diffDays <= 3) {
      await notifyProjectDeadlineApproaching({
        projectId: project.id,
        projectName: project.name,
        members: [cleanEmail],
        deadline,
      });
    }
  }
};
