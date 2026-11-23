import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import {
  Conversation,
  ConversationType,
  ConversationParticipant,
  CampfireMessage,
  ChatAttachment,
  Project,
  Person,
} from './types';
import { saveFileToDB } from './fileUtils';

// Helper to normalize user identifiers (email or UID)
export const normalizeUserKey = (val?: string): string => {
  if (!val) return '';
  return val.trim().toLowerCase().replace(/[^a-zA-Z0-9@._-]/g, '_');
};

// Deterministic ID for 1-on-1 direct conversations to prevent duplicates
export const getDirectConversationId = (userA: string, userB: string): string => {
  const normA = normalizeUserKey(userA);
  const normB = normalizeUserKey(userB);
  const sorted = [normA, normB].sort();
  const clean0 = sorted[0].replace(/[^a-zA-Z0-9]/g, '_');
  const clean1 = sorted[1].replace(/[^a-zA-Z0-9]/g, '_');
  return `dm_${clean0}_${clean1}`;
};

// Deterministic ID for Project conversations to ensure 1:1 mapping with projects
export const getProjectConversationId = (projectId: string): string => {
  const cleanId = String(projectId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `proj_${cleanId}`;
};

// Format timestamp strings consistently in Asia/Kolkata timezone
export const formatMessageTime = (date: Date = new Date()): string => {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
};

export const formatMessageDate = (date: Date = new Date()): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

// Human-friendly date header for message separators
export const getHumanDateLabel = (dateStr?: string): string => {
  if (!dateStr) return 'Today';
  const todayStr = formatMessageDate(new Date());
  if (dateStr === todayStr) return 'Today';

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yestStr = formatMessageDate(yesterday);
  if (dateStr === yestStr) return 'Yesterday';

  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(d);
    }
  } catch {}
  return dateStr;
};

// Helper to determine friendly attachment category
export const getAttachmentCategory = (
  fileType: string,
  fileName: string
): 'image' | 'pdf' | 'doc' | 'sheet' | 'archive' | 'file' => {
  const lowerType = (fileType || '').toLowerCase();
  const lowerName = (fileName || '').toLowerCase();

  if (lowerType.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(lowerName)) {
    return 'image';
  }
  if (lowerType.includes('pdf') || lowerName.endsWith('.pdf')) {
    return 'pdf';
  }
  if (
    lowerType.includes('sheet') ||
    lowerType.includes('excel') ||
    lowerType.includes('csv') ||
    /\.(xlsx?|csv|tsv)$/i.test(lowerName)
  ) {
    return 'sheet';
  }
  if (
    lowerType.includes('word') ||
    lowerType.includes('document') ||
    lowerType.includes('text') ||
    /\.(docx?|txt|rtf|md|json)$/i.test(lowerName)
  ) {
    return 'doc';
  }
  if (
    lowerType.includes('zip') ||
    lowerType.includes('tar') ||
    lowerType.includes('compressed') ||
    /\.(zip|tar|gz|7z|rar)$/i.test(lowerName)
  ) {
    return 'archive';
  }
  return 'file';
};

// Format bytes into human-readable size
export const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ============================================================================
// 1. PROJECT CONVERSATIONS SYNC (Auto-links Projects to Campfire Chat)
// ============================================================================
export const syncProjectConversations = async (
  projects: Project[],
  currentUser: any,
  isAdmin: boolean
): Promise<void> => {
  if (!projects || projects.length === 0) return;

  for (const proj of projects) {
    if (!proj.id) continue;
    const convId = getProjectConversationId(proj.id);

    try {
      const convRef = doc(db, 'conversations', convId);
      const snap = await getDoc(convRef);

      // Extract all members of this project
      const memberKeys = new Set<string>();
      const memberDetails: Record<string, ConversationParticipant> = {};

      // 1. Manager
      if (proj.managerEmail) {
        const norm = normalizeUserKey(proj.managerEmail);
        memberKeys.add(norm);
        memberDetails[norm] = {
          uid: norm,
          name: proj.manager || 'Project Manager',
          email: proj.managerEmail,
          role: 'manager',
          avatar: (proj.manager || 'M')[0].toUpperCase(),
          avatarBg: 'bg-emerald-100 text-emerald-800',
        };
      }

      // 2. Project Members
      if (Array.isArray(proj.members)) {
        proj.members.forEach((m) => {
          if (!m) return;
          const norm = normalizeUserKey(m);
          memberKeys.add(norm);
          if (!memberDetails[norm]) {
            memberDetails[norm] = {
              uid: norm,
              name: m.includes('@') ? m.split('@')[0] : m,
              email: m.includes('@') ? m : '',
              role: 'member',
              avatar: m[0].toUpperCase(),
              avatarBg: 'bg-blue-100 text-blue-800',
            };
          }
        });
      }

      // 3. Member Details if available
      if (Array.isArray(proj.memberDetails)) {
        proj.memberDetails.forEach((md) => {
          if (md.email) {
            const norm = normalizeUserKey(md.email);
            memberKeys.add(norm);
            memberDetails[norm] = {
              uid: norm,
              name: md.name || md.email,
              email: md.email,
              role: md.role || 'member',
              designation: md.designation,
              avatar: md.avatar || (md.name || 'U')[0].toUpperCase(),
              avatarBg: md.avatarBg || 'bg-blue-100 text-blue-800',
            };
          }
        });
      }

      // 4. Always include Workspace Admin in project conversations
      memberKeys.add('admin');
      memberKeys.add('cr7156816@gmail.com');

      const memberUidsArray = Array.from(memberKeys);

      if (!snap.exists()) {
        // Initialize new dedicated project conversation
        const now = Date.now();
        const initialConv: Conversation = {
          id: convId,
          type: 'project',
          name: proj.name,
          description: proj.description || `Dedicated channel for ${proj.name} milestones and team coordination.`,
          projectId: proj.id,
          projectName: proj.name,
          memberUids: memberUidsArray,
          memberDetails,
          createdBy: proj.managerEmail || 'admin',
          createdByName: proj.manager || 'Workspace Admin',
          createdAt: now,
          updatedAt: now,
          lastMessageAt: now,
          lastMessage: {
            text: `Welcome to the ${proj.name} project channel! Use this space to collaborate on tasks and milestones.`,
            senderUid: 'system',
            senderName: proj.manager || 'Workspace Admin',
            timestamp: formatMessageTime(new Date(now)),
            createdAt: now,
            messageType: 'text',
          },
          unreadCounts: {},
        };

        await setDoc(convRef, initialConv);

        // Also add the initial welcome message to the messages subcollection
        const msgRef = doc(collection(db, 'conversations', convId, 'messages'), `msg_${now}`);
        await setDoc(msgRef, {
          id: `msg_${now}`,
          conversationId: convId,
          senderUid: 'system',
          senderName: proj.manager || 'Workspace Admin',
          senderEmail: proj.managerEmail || 'admin@workorbit.com',
          senderAvatar: '🎯',
          senderAvatarBg: 'bg-blue-100 text-blue-800',
          messageType: 'text',
          text: `Welcome to the ${proj.name} project channel! Use this space to collaborate on tasks and milestones.`,
          createdAt: now,
          timestampStr: formatMessageTime(new Date(now)),
          dateStr: formatMessageDate(new Date(now)),
          readBy: ['system'],
          status: 'sent',
        });
      } else {
        // Update membership & project name in case members were added or removed
        await setDoc(
          convRef,
          {
            name: proj.name,
            projectName: proj.name,
            description: proj.description || snap.data()?.description || '',
            memberUids: memberUidsArray,
            memberDetails,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn(`Sync notice for project chat ${proj.id}:`, err);
    }
  }
};

// ============================================================================
// 2. USER CONVERSATIONS SUBSCRIPTION (Real-Time List)
// ============================================================================
export const subscribeToUserConversations = (
  userIdentifier: string,
  userEmail: string,
  isAdmin: boolean,
  callback: (conversations: Conversation[]) => void
) => {
  if (typeof window === 'undefined') return () => {};

  const normId = normalizeUserKey(userIdentifier);
  const normEmail = normalizeUserKey(userEmail);

  try {
    const convCol = collection(db, 'conversations');
    const q = query(convCol, orderBy('lastMessageAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const convs: Conversation[] = [];

        snapshot.forEach((d) => {
          const data = d.data() as Conversation;
          const convId = d.id;
          const members: string[] = Array.isArray(data.memberUids)
            ? data.memberUids.map((m) => normalizeUserKey(m))
            : [];

          // Permission check:
          // Admin can access all conversations or project conversations
          // Non-admin can only access conversations where they are a member
          const isMember =
            members.includes(normId) ||
            members.includes(normEmail) ||
            (normEmail && members.some((m) => m === normEmail || normEmail.includes(m) || m.includes(normEmail))) ||
            (data.type === 'project' && isAdmin);

          if (isMember) {
            // Calculate unread count specifically for this user
            const unreadCount =
              (data.unreadCounts && (data.unreadCounts[normId] || data.unreadCounts[normEmail])) || 0;

            convs.push({
              ...data,
              id: convId,
              unreadCount,
            });
          }
        });

        callback(convs);
      },
      (error) => {
        if (error?.code !== 'unavailable') {
          console.warn('Conversations snapshot notice:', error?.message || error);
        }
      }
    );
  } catch (e) {
    console.error('Error subscribing to conversations:', e);
    return () => {};
  }
};

// ============================================================================
// 3. CONVERSATION MESSAGES SUBSCRIPTION (Real-Time Stream)
// ============================================================================
export const subscribeToConversationMessages = (
  conversationId: string,
  callback: (messages: CampfireMessage[]) => void,
  limitCount: number = 80
) => {
  if (typeof window === 'undefined' || !conversationId) return () => {};

  try {
    const messagesCol = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesCol, orderBy('createdAt', 'asc'), limit(limitCount));

    return onSnapshot(
      q,
      (snapshot) => {
        const msgs: CampfireMessage[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as CampfireMessage;
          msgs.push({
            ...data,
            id: d.id,
            conversationId,
          });
        });
        callback(msgs);
      },
      (error) => {
        if (error?.code !== 'unavailable') {
          console.warn(`Messages snapshot notice for ${conversationId}:`, error?.message || error);
        }
      }
    );
  } catch (e) {
    console.error(`Error subscribing to messages for ${conversationId}:`, e);
    return () => {};
  }
};

// ============================================================================
// 4. SEND MESSAGE (Real-Time + Unread Counter Updates)
// ============================================================================
export interface SendMessageParams {
  conversationId: string;
  senderUid: string;
  senderName: string;
  senderEmail: string;
  senderAvatar?: string;
  senderAvatarBg?: string;
  text: string;
  messageType?: 'text' | 'file' | 'image';
  attachments?: ChatAttachment[];
}

export const sendCampfireMessage = async (
  params: SendMessageParams
): Promise<string> => {
  const {
    conversationId,
    senderUid,
    senderName,
    senderEmail,
    senderAvatar,
    senderAvatarBg,
    text,
    messageType = 'text',
    attachments = [],
  } = params;

  if (!conversationId) throw new Error('Conversation ID is required');
  if (!text.trim() && attachments.length === 0) throw new Error('Message content or attachment is required');

  const now = Date.now();
  const timeStr = formatMessageTime(new Date(now));
  const dateStr = formatMessageDate(new Date(now));
  const normSender = normalizeUserKey(senderUid || senderEmail);

  // 1. Add message document to subcollection
  const messagesCol = collection(db, 'conversations', conversationId, 'messages');
  const msgDoc = await addDoc(messagesCol, {
    conversationId,
    senderUid: normSender,
    senderName,
    senderEmail,
    senderAvatar: senderAvatar || senderName[0]?.toUpperCase() || 'U',
    senderAvatarBg: senderAvatarBg || 'bg-blue-100 text-blue-800',
    messageType,
    text: text.trim(),
    attachments,
    createdAt: now,
    timestampStr: timeStr,
    dateStr,
    readBy: [normSender],
    status: 'sent',
  });

  // 2. Fetch conversation to increment unread counters for other members
  const convRef = doc(db, 'conversations', conversationId);
  try {
    const convSnap = await getDoc(convRef);
    if (convSnap.exists()) {
      const convData = convSnap.data() as Conversation;
      const unreadCounts = { ...(convData.unreadCounts || {}) };

      // Increment for all members except the sender
      if (Array.isArray(convData.memberUids)) {
        convData.memberUids.forEach((memberKey) => {
          const normMember = normalizeUserKey(memberKey);
          if (normMember && normMember !== normSender) {
            unreadCounts[normMember] = (unreadCounts[normMember] || 0) + 1;
          }
        });
      }

      let previewText = text.trim();
      if (!previewText && attachments.length > 0) {
        previewText = attachments[0].fileType === 'image' ? '📷 Image' : `📎 ${attachments[0].fileName}`;
      }

      await updateDoc(convRef, {
        lastMessage: {
          text: previewText,
          senderUid: normSender,
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
  } catch (err) {
    console.warn('Notice updating conversation lastMessage:', err);
  }

  return msgDoc.id;
};

// ============================================================================
// 5. MARK CONVERSATION AS READ
// ============================================================================
export const markConversationAsRead = async (
  conversationId: string,
  userIdentifier: string,
  userEmail?: string
): Promise<void> => {
  if (!conversationId || !userIdentifier) return;

  const normId = normalizeUserKey(userIdentifier);
  const normEmail = normalizeUserKey(userEmail);

  try {
    const convRef = doc(db, 'conversations', conversationId);
    const convSnap = await getDoc(convRef);

    if (convSnap.exists()) {
      const convData = convSnap.data() as Conversation;
      const unreadCounts = { ...(convData.unreadCounts || {}) };

      if (unreadCounts[normId] || (normEmail && unreadCounts[normEmail])) {
        unreadCounts[normId] = 0;
        if (normEmail) unreadCounts[normEmail] = 0;

        const readReceipts = { ...(convData.readReceipts || {}) };
        readReceipts[normId] = { lastReadAt: Date.now() };
        if (normEmail) readReceipts[normEmail] = { lastReadAt: Date.now() };

        await updateDoc(convRef, {
          unreadCounts,
          readReceipts,
        });
      }
    }
  } catch (err) {
    console.warn(`Notice marking conversation ${conversationId} as read:`, err);
  }
};

// ============================================================================
// 6. CREATE DIRECT (1-ON-1) CONVERSATION
// ============================================================================
export const createDirectConversation = async (
  currentUser: ConversationParticipant,
  targetUser: ConversationParticipant
): Promise<string> => {
  const normCurrent = normalizeUserKey(currentUser.uid || currentUser.email);
  const normTarget = normalizeUserKey(targetUser.uid || targetUser.email);

  if (normCurrent === normTarget) {
    throw new Error('Cannot start a direct conversation with yourself.');
  }

  const convId = getDirectConversationId(normCurrent, normTarget);
  const convRef = doc(db, 'conversations', convId);
  const snap = await getDoc(convRef);

  if (!snap.exists()) {
    const now = Date.now();
    const newConv: Conversation = {
      id: convId,
      type: 'direct',
      name: targetUser.name,
      memberUids: [normCurrent, normTarget],
      memberDetails: {
        [normCurrent]: { ...currentUser, uid: normCurrent },
        [normTarget]: { ...targetUser, uid: normTarget },
      },
      createdBy: normCurrent,
      createdByName: currentUser.name,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      unreadCounts: {
        [normCurrent]: 0,
        [normTarget]: 0,
      },
    };

    await setDoc(convRef, newConv);
  }

  return convId;
};

// ============================================================================
// 7. CREATE GROUP CONVERSATION
// ============================================================================
export interface CreateGroupParams {
  name: string;
  description?: string;
  members: ConversationParticipant[];
  createdBy: ConversationParticipant;
}

export const createGroupConversation = async (
  params: CreateGroupParams
): Promise<string> => {
  const { name, description = '', members, createdBy } = params;

  if (!name.trim()) throw new Error('Group name is required.');

  const now = Date.now();
  const convId = `group_${now}_${Math.random().toString(36).substring(2, 7)}`;
  const normCreator = normalizeUserKey(createdBy.uid || createdBy.email);

  const memberKeys = new Set<string>([normCreator]);
  const memberDetails: Record<string, ConversationParticipant> = {
    [normCreator]: { ...createdBy, uid: normCreator },
  };

  members.forEach((m) => {
    const norm = normalizeUserKey(m.uid || m.email);
    if (norm) {
      memberKeys.add(norm);
      memberDetails[norm] = { ...m, uid: norm };
    }
  });

  const memberUids = Array.from(memberKeys);
  const convRef = doc(db, 'conversations', convId);

  const newGroup: Conversation = {
    id: convId,
    type: 'group',
    name: name.trim(),
    description: description.trim(),
    memberUids,
    memberDetails,
    createdBy: normCreator,
    createdByName: createdBy.name,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    lastMessage: {
      text: `${createdBy.name} created the group "${name.trim()}".`,
      senderUid: 'system',
      senderName: 'System',
      timestamp: formatMessageTime(new Date(now)),
      createdAt: now,
      messageType: 'text',
    },
    unreadCounts: {},
  };

  await setDoc(convRef, newGroup);

  // Add system creation message
  const msgRef = doc(collection(db, 'conversations', convId, 'messages'), `msg_${now}`);
  await setDoc(msgRef, {
    id: `msg_${now}`,
    conversationId: convId,
    senderUid: 'system',
    senderName: 'System',
    senderEmail: 'system@workorbit.com',
    senderAvatar: '👥',
    senderAvatarBg: 'bg-indigo-100 text-indigo-800',
    messageType: 'text',
    text: `${createdBy.name} created the group "${name.trim()}".`,
    createdAt: now,
    timestampStr: formatMessageTime(new Date(now)),
    dateStr: formatMessageDate(new Date(now)),
    readBy: [normCreator],
    status: 'sent',
  });

  return convId;
};

// ============================================================================
// 8. UPDATE GROUP DETAILS & MEMBERSHIP
// ============================================================================
export const updateGroupDetails = async (
  conversationId: string,
  updates: {
    name?: string;
    description?: string;
    addMembers?: ConversationParticipant[];
    removeMemberUids?: string[];
  }
): Promise<void> => {
  const convRef = doc(db, 'conversations', conversationId);
  const snap = await getDoc(convRef);
  if (!snap.exists()) throw new Error('Group not found');

  const data = snap.data() as Conversation;
  const currentMembers = new Set<string>(data.memberUids || []);
  const currentDetails = { ...(data.memberDetails || {}) };

  if (updates.addMembers) {
    updates.addMembers.forEach((m) => {
      const norm = normalizeUserKey(m.uid || m.email);
      currentMembers.add(norm);
      currentDetails[norm] = { ...m, uid: norm };
    });
  }

  if (updates.removeMemberUids) {
    updates.removeMemberUids.forEach((uid) => {
      const norm = normalizeUserKey(uid);
      currentMembers.delete(norm);
      delete currentDetails[norm];
    });
  }

  const patch: Partial<Conversation> = {
    updatedAt: Date.now(),
    memberUids: Array.from(currentMembers),
    memberDetails: currentDetails,
  };

  if (updates.name && updates.name.trim()) {
    patch.name = updates.name.trim();
  }
  if (updates.description !== undefined) {
    patch.description = updates.description.trim();
  }

  await updateDoc(convRef, patch);
};

// ============================================================================
// 9. UPLOAD ATTACHMENT (Firebase Storage with Client Resiliency)
// ============================================================================
export const uploadChatAttachment = async (
  file: File,
  conversationId: string,
  onProgress?: (percent: number) => void
): Promise<ChatAttachment> => {
  const maxBytes = 25 * 1024 * 1024; // 25 MB limit
  if (file.size > maxBytes) {
    throw new Error('File exceeds maximum allowable size of 25 MB.');
  }

  const fileId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `campfire_attachments/${conversationId}/${Date.now()}_${cleanFileName}`;
  const fileCategory = getAttachmentCategory(file.type, file.name);

  // Attempt Firebase Storage Upload if storage is available
  if (storage) {
    try {
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return await new Promise<ChatAttachment>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(Math.round(progress));
          },
          (error) => {
            console.warn('Firebase Storage upload notice, falling back to local storage:', error);
            // Fall back to local data URL on storage network restriction
            fallbackLocalUpload(file, fileId, cleanFileName, fileCategory)
              .then(resolve)
              .catch(reject);
          },
          async () => {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) onProgress(100);
            resolve({
              id: fileId,
              fileName: file.name,
              fileUrl: downloadUrl,
              storagePath,
              fileType: fileCategory,
              fileSize: formatFileSize(file.size),
              bytes: file.size,
            });
          }
        );
      });
    } catch (e) {
      console.warn('Direct storage error, falling back to local file handler:', e);
    }
  }

  // Fallback for sandboxed environments or offline storage
  return await fallbackLocalUpload(file, fileId, cleanFileName, fileCategory, onProgress);
};

const fallbackLocalUpload = async (
  file: File,
  fileId: string,
  cleanFileName: string,
  fileCategory: 'image' | 'pdf' | 'doc' | 'sheet' | 'archive' | 'file',
  onProgress?: (percent: number) => void
): Promise<ChatAttachment> => {
  if (onProgress) onProgress(50);
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Store in IndexedDB for fast offline retrieval
  try {
    await saveFileToDB(cleanFileName, file);
  } catch {}

  if (onProgress) onProgress(100);

  return {
    id: fileId,
    fileName: file.name,
    fileUrl: dataUrl,
    fileType: fileCategory,
    fileSize: formatFileSize(file.size),
    bytes: file.size,
  };
};
