import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  getDirectConversationId,
  normalizeUserKey,
  formatMessageTime,
  formatMessageDate,
} from '@/lib/firebaseChatService';
import { initialChatMessages } from '@/lib/data';
import { ChatMessage } from '@/lib/types';

export const dynamic = 'force-dynamic';

let memoryChatMessages: ChatMessage[] = [...initialChatMessages];

// GET: Fetch conversations or messages
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const userEmail = searchParams.get('userEmail');

    // 1. Fetch messages for a specific conversation
    if (conversationId) {
      const messagesCol = collection(db, 'conversations', conversationId, 'messages');
      const q = query(messagesCol, orderBy('createdAt', 'asc'), limit(100));
      const snap = await getDocs(q);

      const messages = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      return NextResponse.json({ success: true, messages });
    }

    // 2. Fetch conversations for a specific user
    if (userEmail) {
      const normEmail = normalizeUserKey(userEmail);
      const convsCol = collection(db, 'conversations');
      const q = query(convsCol, orderBy('lastMessageAt', 'desc'), limit(50));
      const snap = await getDocs(q);

      const conversations = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c: any) => {
          if (!Array.isArray(c.memberUids)) return false;
          return c.memberUids.some((m: string) => normalizeUserKey(m) === normEmail);
        });

      return NextResponse.json({ success: true, conversations });
    }

    // Fallback: Legacy chat messages
    return NextResponse.json({ success: true, messages: memoryChatMessages });
  } catch (error: any) {
    console.error('Chat API GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Send message, create conversation, or legacy message
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action;

    // Action 1: Send a Campfire Chat Message
    if (action === 'send_message' || body.conversationId) {
      const conversationId = String(body.conversationId || '').trim();
      const text = String(body.text || body.content || '').trim();
      const senderUid = normalizeUserKey(body.senderUid || body.senderEmail || body.sender);
      const senderName = String(body.senderName || body.sender || 'User').trim();
      const senderEmail = String(body.senderEmail || '').trim();
      const messageType = body.messageType || 'text';
      const attachments = Array.isArray(body.attachments) ? body.attachments : [];

      if (!conversationId) {
        return NextResponse.json({ success: false, error: 'conversationId is required' }, { status: 400 });
      }

      const now = Date.now();
      const timeStr = formatMessageTime(new Date(now));
      const dateStr = formatMessageDate(new Date(now));

      // 1. Add message to Firestore subcollection
      const messagesCol = collection(db, 'conversations', conversationId, 'messages');
      const msgRef = await addDoc(messagesCol, {
        conversationId,
        senderUid,
        senderName,
        senderEmail,
        senderAvatar: body.senderAvatar || senderName[0]?.toUpperCase() || 'U',
        senderAvatarBg: body.senderAvatarBg || 'bg-blue-100 text-blue-800',
        messageType,
        text,
        attachments,
        createdAt: now,
        timestampStr: timeStr,
        dateStr,
        readBy: [senderUid],
        status: 'sent',
      });

      // 2. Update parent conversation metadata
      const convRef = doc(db, 'conversations', conversationId);
      const convSnap = await getDoc(convRef);
      if (convSnap.exists()) {
        const cData = convSnap.data();
        const unreadCounts = { ...(cData.unreadCounts || {}) };

        if (Array.isArray(cData.memberUids)) {
          cData.memberUids.forEach((m: string) => {
            const normM = normalizeUserKey(m);
            if (normM && normM !== senderUid) {
              unreadCounts[normM] = (unreadCounts[normM] || 0) + 1;
            }
          });
        }

        let preview = text;
        if (!preview && attachments.length > 0) {
          preview = attachments[0].fileType === 'image' ? '📷 Image' : `📎 ${attachments[0].fileName}`;
        }

        await updateDoc(convRef, {
          lastMessage: {
            text: preview,
            senderUid,
            senderName,
            timestamp: timeStr,
            createdAt: now,
            messageType,
          },
          lastMessageAt: now,
          updatedAt: now,
          unreadCounts,
        });
      }

      return NextResponse.json({
        success: true,
        messageId: msgRef.id,
        createdAt: now,
        timestampStr: timeStr,
      });
    }

    // Action 2: Legacy fallback
    const newMessage: ChatMessage = {
      id: `c-${Date.now()}`,
      sender: body.sender || 'User',
      senderAvatar: (body.sender || 'U')[0].toUpperCase(),
      avatarBg: 'bg-blue-100 text-blue-700',
      content: body.content || '',
      timestamp: formatMessageTime(),
      channel: body.channel || 'general',
    };
    memoryChatMessages.push(newMessage);
    return NextResponse.json({ success: true, message: newMessage, messages: memoryChatMessages });
  } catch (error: any) {
    console.error('Chat API POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
