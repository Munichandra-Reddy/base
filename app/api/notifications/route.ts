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
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { BasecampNotification } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.toLowerCase().trim();
    const unreadOnly = searchParams.get('unread') === 'true';

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email query parameter is required' },
        { status: 400 }
      );
    }

    const notifCol = collection(db, 'notifications');
    let q = query(notifCol, where('recipientEmail', '==', email));

    const snap = await getDocs(q);
    let notifications: BasecampNotification[] = [];

    snap.docs.forEach((d) => {
      const data = d.data() as BasecampNotification;
      if (data.status !== 'deleted') {
        notifications.push({
          ...data,
          id: d.id,
          notificationId: data.notificationId || d.id,
          isRead: Boolean(data.isRead),
          createdAt: data.createdAt || Date.now(),
        });
      }
    });

    if (unreadOnly) {
      notifications = notifications.filter((n) => !n.isRead);
    }

    // Sort newest first
    notifications.sort((a, b) => b.createdAt - a.createdAt);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cleanRecipient = (body.recipientEmail || '').toLowerCase().trim();

    if (!cleanRecipient) {
      return NextResponse.json(
        { success: false, error: 'Recipient email is required' },
        { status: 400 }
      );
    }

    const id = body.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    const newNotif: BasecampNotification = {
      id,
      notificationId: id,
      recipientEmail: cleanRecipient,
      recipientUid: body.recipientUid || cleanRecipient,
      actorUid: body.actorUid || 'system',
      actorName: body.actorName || 'Workspace',
      actorAvatar: body.actorAvatar || (body.actorName ? body.actorName[0]?.toUpperCase() : 'W'),
      type: body.type || 'system',
      title: body.title || 'Notification',
      message: body.message || '',
      relatedEntityType: body.relatedEntityType || 'task',
      relatedEntityId: body.relatedEntityId || body.taskId || body.projectId || '',
      projectId: body.projectId || '',
      projectName: body.projectName || '',
      taskId: body.taskId || '',
      taskTitle: body.taskTitle || '',
      conversationId: body.conversationId || '',
      conversationName: body.conversationName || '',
      eventId: body.eventId || '',
      fileId: body.fileId || '',
      fileName: body.fileName || '',
      isRead: false,
      createdAt: now,
      timestampStr: new Date(now).toISOString(),
      deduplicationKey: body.deduplicationKey || '',
      status: 'active',
      actionUrl: body.actionUrl || '',
    };

    await setDoc(doc(db, 'notifications', id), newNotif);

    return NextResponse.json({
      success: true,
      notification: newNotif,
    });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create notification' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { notificationId, markAll, userEmail } = body;

    if (markAll && userEmail) {
      const cleanEmail = userEmail.toLowerCase().trim();
      const notifCol = collection(db, 'notifications');
      const q = query(
        notifCol,
        where('recipientEmail', '==', cleanEmail),
        where('isRead', '==', false)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const batch = writeBatch(db);
        const now = Date.now();
        snap.docs.forEach((d) => {
          batch.update(d.ref, { isRead: true, readAt: now });
        });
        await batch.commit();
      }

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (notificationId) {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, {
        isRead: true,
        readAt: Date.now(),
      });
      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    return NextResponse.json(
      { success: false, error: 'notificationId or markAll with userEmail is required' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update notification' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    await deleteDoc(doc(db, 'notifications', notificationId));

    return NextResponse.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
