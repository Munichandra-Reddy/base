'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Conversation,
  ConversationType,
  ConversationParticipant,
  CampfireMessage,
  ChatAttachment,
  Person,
  Project,
  ChatMessage,
} from '@/lib/types';
import {
  subscribeToUserConversations,
  subscribeToConversationMessages,
  sendCampfireMessage,
  markConversationAsRead,
  createDirectConversation,
  createGroupConversation,
  updateGroupDetails,
  uploadChatAttachment,
  syncProjectConversations,
  normalizeUserKey,
  getHumanDateLabel,
} from '@/lib/firebaseChatService';
import { isPersonOnline } from '@/lib/dashboardCalculations';
import {
  ChatIcon,
  SearchIcon,
  PlusIcon,
  UsersIcon,
  DownloadIcon,
  SendIcon,
  CheckCircleIcon,
} from './Icons';

interface ChatViewProps {
  currentUser?: {
    email: string;
    fullName: string;
    companyName?: string;
  } | null;
  isAdmin?: boolean;
  people?: Person[];
  projects?: Project[];
  initialConversationId?: string | null;
  onUpdateUnreadCount?: (totalUnread: number) => void;
  // Legacy backward-compatibility props
  messages?: ChatMessage[];
  onSendMessage?: (content: string, channel: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  currentUser,
  isAdmin = false,
  people = [],
  projects = [],
  initialConversationId = null,
  onUpdateUnreadCount,
}) => {
  // Current user credentials
  const userEmail = (currentUser?.email || 'admin@workorbit.com').toLowerCase().trim();
  const userName = currentUser?.fullName || (isAdmin ? 'Workspace Admin' : 'Employee');
  const userKey = normalizeUserKey(userEmail);

  const WORKSPACE_ADMIN_EMAIL = 'cr7156816@gmail.com';

  // Workspace Administrator profile representation for private direct chats
  const adminContact: Person = useMemo(() => {
    return {
      id: 'admin_workspace',
      employeeId: 'ADMIN-001',
      name: 'Muni (Workspace Admin)',
      email: WORKSPACE_ADMIN_EMAIL,
      role: 'Workspace Administrator',
      designation: 'Workspace Administrator',
      status: 'active',
      accessRole: 'admin',
      avatar: 'M',
      avatarBg: 'bg-[#011826] text-white',
      projectsCount: projects.length,
    };
  }, [projects.length]);

  // All contactable users for direct messaging:
  // - If logged-in user is an employee: includes Workspace Admin (at the top) + fellow employees.
  // - If logged-in user is admin: includes all employees.
  const contactablePeople = useMemo(() => {
    const list: Person[] = [];
    const isCurrentUserAdmin = userEmail === WORKSPACE_ADMIN_EMAIL || isAdmin;

    // If current user is an employee, add Workspace Admin at the top of the direct chat directory
    if (!isCurrentUserAdmin) {
      list.push(adminContact);
    }

    // Add all other employees (excluding the current user and any duplicate admin entry)
    people.forEach((p) => {
      const pEmail = (p.email || '').toLowerCase().trim();
      if (pEmail && pEmail !== userEmail && pEmail !== WORKSPACE_ADMIN_EMAIL) {
        list.push(p);
      }
    });

    return list;
  }, [people, userEmail, isAdmin, adminContact]);

  // Core State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<CampfireMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'group' | 'project'>('all');
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Message input & attachment state
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Modals state
  const [isNewDirectModalOpen, setIsNewDirectModalOpen] = useState(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Form states for modals
  const [directSearch, setDirectSearch] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupSelectedMembers, setGroupSelectedMembers] = useState<string[]>([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [addMemberUid, setAddMemberUid] = useState('');

  // Mobile layout state
  const [isMobileViewingChat, setIsMobileViewingChat] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Sync project conversations when projects change
  useEffect(() => {
    if (projects && projects.length > 0) {
      syncProjectConversations(projects, currentUser, isAdmin).catch((err) =>
        console.warn('Project campfire sync notice:', err)
      );
    }
  }, [projects, currentUser, isAdmin]);

  // 2. Real-time subscription to User's Conversations
  useEffect(() => {
    setIsLoadingConvs(true);
    const unsub = subscribeToUserConversations(userKey, userEmail, isAdmin, (convs) => {
      setConversations(convs);
      setIsLoadingConvs(false);

      // Compute total unread across all conversations
      const totalUnread = convs.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      if (onUpdateUnreadCount) onUpdateUnreadCount(totalUnread);

      // Select default conversation if none selected
      setSelectedConvId((current) => {
        if (current && convs.some((c) => c.id === current)) return current;
        if (initialConversationId && convs.some((c) => c.id === initialConversationId)) {
          return initialConversationId;
        }
        return convs.length > 0 ? convs[0].id : null;
      });
    });

    return () => unsub();
  }, [userKey, userEmail, isAdmin, initialConversationId, onUpdateUnreadCount]);

  // Active Conversation Object
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvId) || null;
  }, [conversations, selectedConvId]);

  // 3. Real-time subscription to Messages of active conversation
  useEffect(() => {
    if (!selectedConvId) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    // Mark conversation as read on open
    markConversationAsRead(selectedConvId, userKey, userEmail);

    const unsub = subscribeToConversationMessages(selectedConvId, (newMsgs) => {
      setMessages(newMsgs);
      setIsLoadingMessages(false);
      // Auto mark read if conversation is open and new messages arrive
      markConversationAsRead(selectedConvId, userKey, userEmail);
    });

    return () => unsub();
  }, [selectedConvId, userKey, userEmail]);

  // 4. Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, uploadProgress]);

  // Filtered Conversations list
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Tab filter
      if (activeTab !== 'all' && c.type !== activeTab) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (c.name || '').toLowerCase().includes(q);
        const matchesProject = (c.projectName || '').toLowerCase().includes(q);
        const matchesDesc = (c.description || '').toLowerCase().includes(q);
        const matchesLastMsg = (c.lastMessage?.text || '').toLowerCase().includes(q);
        return matchesName || matchesProject || matchesDesc || matchesLastMsg;
      }

      return true;
    });
  }, [conversations, activeTab, searchQuery]);

  // Handle Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConvId) return;

    const trimmed = messageText.trim();
    if (!trimmed && !selectedFile) return;

    try {
      setIsSending(true);
      setSendError(null);

      let attachments: ChatAttachment[] = [];

      // If a file is attached, upload first
      if (selectedFile) {
        setIsUploading(true);
        const att = await uploadChatAttachment(selectedFile, selectedConvId, (pct) => {
          setUploadProgress(pct);
        });
        attachments.push(att);
        setIsUploading(false);
        setUploadProgress(null);
        setSelectedFile(null);
      }

      const msgType: 'text' | 'file' | 'image' =
        attachments.length > 0
          ? attachments[0].fileType === 'image'
            ? 'image'
            : 'file'
          : 'text';

      await sendCampfireMessage({
        conversationId: selectedConvId,
        senderUid: userKey,
        senderName: userName,
        senderEmail: userEmail,
        senderAvatar: userName[0]?.toUpperCase() || 'U',
        senderAvatarBg: isAdmin ? 'bg-[#011826] text-white' : 'bg-blue-100 text-blue-800',
        text: trimmed,
        messageType: msgType,
        attachments,
      });

      setMessageText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setSendError(err.message || 'Failed to send message. Please retry.');
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  // Handle Start Direct Message
  const handleStartDirect = async (targetPerson: Person) => {
    try {
      const isTargetAdmin =
        targetPerson.accessRole === 'admin' ||
        targetPerson.email?.toLowerCase() === WORKSPACE_ADMIN_EMAIL;

      const targetUser: ConversationParticipant = {
        uid: normalizeUserKey(targetPerson.email || targetPerson.id),
        name: isTargetAdmin ? 'Muni (Workspace Admin)' : targetPerson.name,
        email: targetPerson.email,
        avatar: isTargetAdmin ? 'M' : targetPerson.avatar || targetPerson.name[0]?.toUpperCase() || 'U',
        avatarBg: isTargetAdmin ? 'bg-[#011826] text-white' : targetPerson.avatarBg || 'bg-blue-100 text-blue-800',
        designation: isTargetAdmin ? 'Workspace Administrator' : targetPerson.role || targetPerson.designation,
        role: isTargetAdmin ? 'admin' : targetPerson.accessRole || 'employee',
      };

      const myUser: ConversationParticipant = {
        uid: userKey,
        name: userName,
        email: userEmail,
        avatar: userName[0]?.toUpperCase() || 'U',
        avatarBg: isAdmin ? 'bg-[#011826] text-white' : 'bg-blue-100 text-blue-800',
        role: isAdmin ? 'admin' : 'employee',
      };

      const convId = await createDirectConversation(myUser, targetUser);
      setSelectedConvId(convId);
      setIsNewDirectModalOpen(false);
      setIsMobileViewingChat(true);
    } catch (err: any) {
      alert(err.message || 'Failed to start direct conversation');
    }
  };

  // Handle Create Group Conversation
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    try {
      const myUser: ConversationParticipant = {
        uid: userKey,
        name: userName,
        email: userEmail,
        avatar: userName[0]?.toUpperCase() || 'U',
        avatarBg: isAdmin ? 'bg-[#011826] text-white' : 'bg-blue-100 text-blue-800',
        role: isAdmin ? 'admin' : 'employee',
      };

      const selectedParticipants: ConversationParticipant[] = groupSelectedMembers
        .map((uid) => {
          const person = contactablePeople.find((p) => normalizeUserKey(p.email || p.id) === uid);
          if (!person) return null;
          const isTargetAdmin = person.email?.toLowerCase() === WORKSPACE_ADMIN_EMAIL;
          return {
            uid: normalizeUserKey(person.email || person.id),
            name: isTargetAdmin ? 'Muni (Workspace Admin)' : person.name,
            email: person.email,
            avatar: isTargetAdmin ? 'M' : person.avatar || person.name[0]?.toUpperCase() || 'U',
            avatarBg: isTargetAdmin ? 'bg-[#011826] text-white' : person.avatarBg || 'bg-indigo-100 text-indigo-800',
            designation: person.role || person.designation,
            role: isTargetAdmin ? 'admin' : person.accessRole || 'employee',
          };
        })
        .filter(Boolean) as ConversationParticipant[];

      const convId = await createGroupConversation({
        name: groupName.trim(),
        description: groupDesc.trim(),
        members: selectedParticipants,
        createdBy: myUser,
      });

      setSelectedConvId(convId);
      setIsNewGroupModalOpen(false);
      setGroupName('');
      setGroupDesc('');
      setGroupSelectedMembers([]);
      setIsMobileViewingChat(true);
    } catch (err: any) {
      alert(err.message || 'Failed to create group');
    }
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { [dateStr: string]: CampfireMessage[] } = {};
    messages.forEach((m) => {
      const d = m.dateStr || 'Today';
      if (!groups[d]) groups[d] = [];
      groups[d].push(m);
    });
    return groups;
  }, [messages]);

  // Helper to get conversation display title
  const getConversationTitle = (conv: Conversation) => {
    if (conv.type === 'direct') {
      // Find the other participant
      if (conv.memberDetails) {
        const otherKey = Object.keys(conv.memberDetails).find((k) => k !== userKey);
        if (otherKey && conv.memberDetails[otherKey]) {
          return conv.memberDetails[otherKey].name;
        }
      }
      return conv.name || 'Direct Message';
    }
    return conv.name;
  };

  // Helper to get conversation avatar
  const getConversationAvatar = (conv: Conversation) => {
    if (conv.type === 'direct') {
      if (conv.memberDetails) {
        const otherKey = Object.keys(conv.memberDetails).find((k) => k !== userKey);
        if (otherKey && conv.memberDetails[otherKey]) {
          const p = conv.memberDetails[otherKey];
          const isTargetAdmin =
            otherKey === normalizeUserKey(WORKSPACE_ADMIN_EMAIL) ||
            p.email?.toLowerCase() === WORKSPACE_ADMIN_EMAIL;

          return {
            text: isTargetAdmin ? 'M' : p.avatar || p.name[0]?.toUpperCase() || 'U',
            bg: isTargetAdmin ? 'bg-[#011826] text-white' : p.avatarBg || 'bg-blue-100 text-blue-800',
            isDirect: true,
            email: p.email,
            isAdmin: isTargetAdmin,
          };
        }
      }
      return { text: conv.name[0]?.toUpperCase() || 'U', bg: 'bg-blue-100 text-blue-800', isDirect: true };
    }
    if (conv.type === 'project') {
      return { text: '📁', bg: 'bg-[#F0F9FF] text-[#049FD9]', isProject: true };
    }
    return { text: '👥', bg: 'bg-[#F3E8FF] text-[#7E22CE]', isGroup: true };
  };

  // Other person info if direct chat
  const directPartner = useMemo(() => {
    if (!activeConversation || activeConversation.type !== 'direct') return null;
    if (activeConversation.memberDetails) {
      const otherKey = Object.keys(activeConversation.memberDetails).find((k) => k !== userKey);
      if (otherKey) {
        const details = activeConversation.memberDetails[otherKey];
        const isTargetAdmin =
          otherKey === normalizeUserKey(WORKSPACE_ADMIN_EMAIL) ||
          details.email?.toLowerCase() === WORKSPACE_ADMIN_EMAIL;

        if (isTargetAdmin) {
          return {
            ...details,
            name: details.name || 'Muni (Workspace Admin)',
            designation: 'Workspace Administrator',
            isOnline: true,
            isAdmin: true,
          };
        }

        const fullPerson = contactablePeople.find((p) => normalizeUserKey(p.email || p.id) === otherKey);
        return {
          ...details,
          isOnline: fullPerson ? isPersonOnline(fullPerson) : false,
          isAdmin: false,
        };
      }
    }
    return null;
  }, [activeConversation, userKey, contactablePeople]);

  return (
    <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs h-[calc(100vh-140px)] min-h-[580px] max-h-[880px] flex overflow-hidden font-sans w-full">
      {/* ========================================================================= */}
      {/* LEFT PANEL: CONVERSATION DIRECTORY & FILTERS */}
      {/* ========================================================================= */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-[#E5E5E5] flex flex-col bg-[#FAFAFA] shrink-0 ${
          isMobileViewingChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#E5E5E5] bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#F4F6F8] text-[#049FD9] border border-[#E5E5E5] flex items-center justify-center shrink-0">
                <ChatIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#111827] leading-tight">Campfire Chat</h2>
                <p className="text-[11px] text-[#595959]">Team messaging & channels</p>
              </div>
            </div>

            {/* Actions: Direct or Group Chat */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsNewDirectModalOpen(true)}
                className="w-8 h-8 rounded-md bg-[#F4F6F8] hover:bg-[#E5E5E5] text-[#111827] flex items-center justify-center transition-all cursor-pointer border border-[#E5E5E5]"
                title="Direct Message"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsNewGroupModalOpen(true)}
                className="w-8 h-8 rounded-md bg-[#F4F6F8] hover:bg-[#E5E5E5] text-[#111827] flex items-center justify-center transition-all cursor-pointer border border-[#E5E5E5]"
                title="Create Group"
              >
                <UsersIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-2.5">
            <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C]" />
            <input id="chatview-search-query-1" name="searchQuery"
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F4F6F8] border border-[#E5E5E5] rounded-md pl-8 pr-3 py-1.5 text-xs text-[#111827] placeholder-[#8C8C8C] focus:outline-none focus:border-[#049FD9] focus:bg-white"
            />
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#F4F6F8] p-0.5 rounded-lg border border-[#E5E5E5] text-[11px] font-medium">
            {(
              [
                { key: 'all', label: 'All' },
                { key: 'direct', label: 'Direct' },
                { key: 'group', label: 'Groups' },
                { key: 'project', label: 'Projects' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-1 rounded-md text-center transition-all cursor-pointer capitalize ${
                  activeTab === tab.key
                    ? 'bg-white text-[#111827] font-bold shadow-2xs'
                    : 'text-[#595959] hover:text-[#111827]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#F0F0F0]">
          {isLoadingConvs ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-[#E5E5E5]" />
                  <div className="flex-1 space-y-1.5">
                    <div className="w-2/3 h-3.5 bg-[#E5E5E5] rounded" />
                    <div className="w-4/5 h-2.5 bg-[#E5E5E5] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8C8C8C] space-y-2">
              <div className="w-10 h-10 rounded-full bg-[#F4F6F8] text-[#8C8C8C] flex items-center justify-center mx-auto">
                <ChatIcon className="w-5 h-5" />
              </div>
              <p className="font-semibold text-[#595959]">No conversations found</p>
              <p className="text-[11px]">
                {searchQuery
                  ? 'Try searching with a different keyword.'
                  : 'Start a direct message or create a group to begin chatting.'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === selectedConvId;
              const avatar = getConversationAvatar(conv);
              const title = getConversationTitle(conv);
              const unread = conv.unreadCount || 0;

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => {
                    setSelectedConvId(conv.id);
                    setIsMobileViewingChat(true);
                  }}
                  className={`w-full text-left p-3 sm:p-3.5 flex items-start gap-3 transition-colors cursor-pointer relative ${
                    isSelected ? 'bg-white shadow-xs border-l-4 border-l-[#049FD9]' : 'hover:bg-white'
                  }`}
                >
                  {/* Avatar with online status */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${avatar.bg} border border-[#E5E5E5]`}
                    >
                      {avatar.text}
                    </div>
                    {avatar.isDirect && avatar.email && (
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                          people.some(
                            (p) =>
                              p.email &&
                              p.email.toLowerCase() === avatar.email?.toLowerCase() &&
                              isPersonOnline(p)
                          )
                            ? 'bg-[#16A34A]'
                            : 'bg-[#94A3B8]'
                        }`}
                      />
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-semibold text-xs text-[#111827] truncate">{title}</span>
                      <span className="text-[10px] text-[#8C8C8C] shrink-0 font-normal">
                        {conv.lastMessage?.timestamp || ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-[#595959] truncate font-normal">
                        {conv.lastMessage?.text || 'No messages yet'}
                      </p>
                      {unread > 0 && (
                        <span className="bg-[#049FD9] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 min-w-[18px] text-center leading-tight">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT PANEL: MAIN CHAT STREAM & INPUT */}
      {/* ========================================================================= */}
      <div
        className={`flex-1 flex flex-col bg-white overflow-hidden ${
          !isMobileViewingChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeConversation ? (
          <>
            {/* Thread Header */}
            <div className="p-3.5 sm:p-4 border-b border-[#E5E5E5] flex items-center justify-between gap-3 bg-white shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setIsMobileViewingChat(false)}
                  className="md:hidden p-1.5 -ml-1 rounded-md hover:bg-[#F4F6F8] text-[#595959] hover:text-[#111827] cursor-pointer"
                  title="Back to conversation list"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Avatar */}
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    getConversationAvatar(activeConversation).bg
                  } border border-[#E5E5E5]`}
                >
                  {getConversationAvatar(activeConversation).text}
                </div>

                {/* Information */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-[#111827] truncate">
                      {getConversationTitle(activeConversation)}
                    </h3>
                    {activeConversation.type === 'project' && (
                      <span className="bg-[#F0F9FF] text-[#049FD9] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#BAE6FD]">
                        Project
                      </span>
                    )}
                    {activeConversation.type === 'group' && (
                      <span className="bg-[#FAF5FF] text-[#7E22CE] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#E9D5FF]">
                        Group
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#595959] truncate">
                    {activeConversation.type === 'direct' && directPartner ? (
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            directPartner.isOnline ? 'bg-[#16A34A]' : 'bg-[#94A3B8]'
                          }`}
                        />
                        <span>{directPartner.isOnline ? 'Active Now' : 'Offline'}</span>
                        {directPartner.designation && <span>• {directPartner.designation}</span>}
                      </span>
                    ) : activeConversation.type === 'project' ? (
                      <span>
                        Project Channel • {activeConversation.memberUids?.length || 0} members participating
                      </span>
                    ) : (
                      <span>
                        {activeConversation.description ||
                          `Group channel • ${activeConversation.memberUids?.length || 0} members`}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {(activeConversation.type === 'group' || activeConversation.type === 'project') && (
                  <button
                    type="button"
                    onClick={() => setIsMembersModalOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#F4F6F8] hover:bg-[#E5E5E5] text-[#111827] rounded-md text-xs font-semibold border border-[#E5E5E5] transition-colors cursor-pointer"
                  >
                    <UsersIcon className="w-3.5 h-3.5 text-[#595959]" />
                    <span className="hidden sm:inline">Members</span>
                    <span>({activeConversation.memberUids?.length || 0})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-6 bg-[#FAFAFA]">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full text-xs text-[#8C8C8C]">
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#F4F6F8] text-[#049FD9] flex items-center justify-center mb-1">
                    <ChatIcon className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-[#111827]">No messages yet</h4>
                  <p className="text-xs text-[#595959] max-w-sm">
                    Be the first to break the ice! Share project updates, ask questions, or send attachments.
                  </p>
                </div>
              ) : (
                Object.keys(groupedMessages).map((dateKey) => (
                  <div key={dateKey} className="space-y-4">
                    {/* Date Separator */}
                    <div className="flex items-center gap-3 my-2">
                      <div className="flex-1 h-px bg-[#E5E5E5]" />
                      <span className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider bg-white px-2.5 py-0.5 rounded-full border border-[#E5E5E5] shadow-2xs">
                        {getHumanDateLabel(dateKey)}
                      </span>
                      <div className="flex-1 h-px bg-[#E5E5E5]" />
                    </div>

                    {/* Messages in this date */}
                    {groupedMessages[dateKey].map((msg) => {
                      const isMe = msg.senderUid === userKey || msg.senderEmail?.toLowerCase() === userEmail;

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-2.5 sm:gap-3 group ${
                            isMe ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          {/* Sender Avatar */}
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs border border-[#E5E5E5] ${
                              msg.senderAvatarBg || (isMe ? 'bg-[#011826] text-white' : 'bg-blue-100 text-blue-800')
                            }`}
                          >
                            {msg.senderAvatar || msg.senderName[0]?.toUpperCase() || 'U'}
                          </div>

                          {/* Message Bubble Container */}
                          <div
                            className={`max-w-[85%] sm:max-w-md md:max-w-lg lg:max-w-xl space-y-1 ${
                              isMe ? 'items-end' : 'items-start'
                            }`}
                          >
                            {/* Sender Info Line */}
                            <div
                              className={`flex items-center gap-2 text-[10px] ${
                                isMe ? 'flex-row-reverse text-right' : 'flex-row text-left'
                              }`}
                            >
                              <span className="font-bold text-[#111827]">
                                {isMe ? 'You' : msg.senderName}
                              </span>
                              <span className="text-[#8C8C8C] font-normal">{msg.timestampStr}</span>
                            </div>

                            {/* Text / Attachments Bubble */}
                            <div
                              className={`p-3 rounded-lg border text-xs leading-relaxed break-words shadow-2xs ${
                                isMe
                                  ? 'bg-white border-[#BAE6FD] text-[#111827] rounded-tr-none'
                                  : 'bg-white border-[#E5E5E5] text-[#111827] rounded-tl-none'
                              }`}
                            >
                              {/* Text content */}
                              {msg.text && (
                                <p className="text-xs text-[#111827] whitespace-pre-wrap">{msg.text}</p>
                              )}

                              {/* Attachment rendering */}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="space-y-2 mt-2">
                                  {msg.attachments.map((att) => (
                                    <div key={att.id}>
                                      {att.fileType === 'image' ? (
                                        <div className="relative group/img cursor-pointer overflow-hidden rounded-md border border-[#E5E5E5]">
                                          <img
                                            src={att.fileUrl}
                                            alt={att.fileName}
                                            className="max-h-60 w-auto rounded object-cover hover:opacity-95 transition-opacity"
                                            onClick={() => setLightboxImage(att.fileUrl)}
                                          />
                                          <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-2 py-1 flex items-center justify-between">
                                            <span className="truncate max-w-[70%]">{att.fileName}</span>
                                            <a
                                              href={att.fileUrl}
                                              download={att.fileName}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="underline text-white font-semibold hover:text-[#049FD9]"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              Download
                                            </a>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between gap-3 p-2.5 bg-[#F8FAFC] rounded-md border border-[#E2E8F0]">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-7 h-7 rounded bg-[#E2E8F0] text-[#475569] flex items-center justify-center shrink-0 text-xs">
                                              📄
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-xs font-semibold text-[#111827] truncate">
                                                {att.fileName}
                                              </p>
                                              <p className="text-[10px] text-[#64748B]">{att.fileSize}</p>
                                            </div>
                                          </div>
                                          <a
                                            href={att.fileUrl}
                                            download={att.fileName}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 rounded hover:bg-[#E2E8F0] text-[#049FD9] transition-colors shrink-0"
                                            title="Download attachment"
                                          >
                                            <DownloadIcon className="w-4 h-4" />
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Delivery checkmark */}
                            {isMe && (
                              <div className="flex justify-end pr-1 text-[9px] text-[#8C8C8C]">
                                <span className="flex items-center gap-1">
                                  <CheckCircleIcon className="w-3 h-3 text-[#16A34A]" />
                                  <span>Delivered</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}

              {/* Upload in progress preview in thread */}
              {isUploading && uploadProgress !== null && (
                <div className="flex items-center justify-end">
                  <div className="bg-white border border-[#BAE6FD] p-3 rounded-lg shadow-2xs max-w-xs w-full space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#0369A1] font-semibold">
                      <span>Uploading attachment...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-[#E0F2FE] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#0284C7] h-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Error Banner */}
            {sendError && (
              <div className="px-4 py-2 bg-[#FEF2F2] border-t border-[#FCA5A5] flex items-center justify-between text-xs text-[#991B1B]">
                <span>{sendError}</span>
                <button
                  type="button"
                  onClick={() => setSendError(null)}
                  className="font-bold hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Attachment Staged Preview */}
            {selectedFile && (
              <div className="px-4 py-2 bg-[#F8FAFC] border-t border-[#E5E5E5] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">📎</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#111827] truncate">{selectedFile.name}</p>
                    <p className="text-[10px] text-[#64748B]">
                      {(selectedFile.size / 1024).toFixed(1)} KB ready to send
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-xs text-[#EF4444] hover:underline font-semibold"
                >
                  Remove
                </button>
              </div>
            )}

            {/* Chat Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 sm:p-4 border-t border-[#E5E5E5] bg-white flex items-center gap-2 sm:gap-3 shrink-0"
            >
              {/* File Attachment Button */}
              <input id="chatview-file_field-2" name="file_field"
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setSelectedFile(file);
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending || isUploading}
                className="w-9 h-9 rounded-md bg-[#F4F6F8] hover:bg-[#E5E5E5] text-[#595959] hover:text-[#111827] flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-[#E5E5E5]"
                title="Attach file or image"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              </button>

              {/* Text Input */}
              <div className="flex-1 min-w-0">
                <input id="chatview-message-text-3" name="messageText"
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`Message ${getConversationTitle(activeConversation)}... (Press Enter to send)`}
                  disabled={isSending || isUploading}
                  className="w-full bg-[#F9FAFB] border border-[#E5E5E5] rounded-md px-3.5 py-2 text-xs text-[#111827] font-medium placeholder-[#8C8C8C] focus:outline-none focus:border-[#049FD9] focus:bg-white focus:ring-1 focus:ring-[#049FD9]"
                />
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={isSending || isUploading || (!messageText.trim() && !selectedFile)}
                className="btn-primary text-xs px-3.5 py-2 sm:px-4 flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SendIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
            <div className="w-16 h-16 rounded-full bg-[#F4F6F8] text-[#049FD9] flex items-center justify-center">
              <ChatIcon className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-base text-[#111827]">Welcome to Campfire Chat</h3>
            <p className="text-xs text-[#595959] max-w-sm">
              Select a conversation from the left panel, start a private one-to-one direct message, or create a team group.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: START DIRECT MESSAGE */}
      {/* ========================================================================= */}
      {isNewDirectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#111827]">New Direct Message</h3>
                <p className="text-[11px] text-[#595959]">Start a private conversation with Workspace Admin or an employee</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewDirectModalOpen(false)}
                className="w-7 h-7 rounded hover:bg-[#F4F6F8] text-[#8C8C8C] hover:text-[#111827] flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 border-b border-[#E5E5E5] bg-[#FAFAFA]">
              <div className="relative">
                <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C]" />
                <input id="chatview-direct-search-4" name="directSearch"
                  type="text"
                  placeholder="Search by name, email, or 'admin'..."
                  value={directSearch}
                  onChange={(e) => setDirectSearch(e.target.value)}
                  className="w-full bg-white border border-[#E5E5E5] rounded-md pl-8 pr-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 divide-y divide-[#F0F0F0]">
              {contactablePeople
                .filter((p) => {
                  if (p.email?.toLowerCase() === userEmail) return false;
                  if (!directSearch.trim()) return true;
                  const q = directSearch.toLowerCase().trim();
                  return (
                    p.name.toLowerCase().includes(q) ||
                    (p.email || '').toLowerCase().includes(q) ||
                    (p.role || '').toLowerCase().includes(q) ||
                    (p.designation || '').toLowerCase().includes(q)
                  );
                })
                .map((person) => {
                  const isTargetAdmin =
                    person.accessRole === 'admin' ||
                    person.email?.toLowerCase() === WORKSPACE_ADMIN_EMAIL;
                  const online = isTargetAdmin || isPersonOnline(person);

                  return (
                    <button
                      key={person.id || person.email}
                      type="button"
                      onClick={() => handleStartDirect(person)}
                      className={`w-full text-left p-2.5 rounded-md hover:bg-[#F4F6F8] flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        isTargetAdmin ? 'bg-[#F0F9FF]/50 border border-[#BAE6FD] my-1' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                              isTargetAdmin
                                ? 'bg-[#011826] text-white'
                                : person.avatarBg || 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {isTargetAdmin ? 'M' : person.avatar || person.name[0]?.toUpperCase() || 'U'}
                          </div>
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                              online ? 'bg-[#16A34A]' : 'bg-[#94A3B8]'
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-[#111827] truncate">{person.name}</p>
                            {isTargetAdmin && (
                              <span className="text-[9px] bg-[#011826] text-white px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#595959] truncate">
                            {isTargetAdmin
                              ? 'Workspace Administrator (Private Direct Chat)'
                              : person.role || person.designation || person.email}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] text-[#049FD9] font-bold shrink-0">Message →</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE GROUP CHAT */}
      {/* ========================================================================= */}
      {isNewGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateGroup}
            className="bg-white rounded-lg border border-[#E5E5E5] shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#111827]">Create Team Group</h3>
                <p className="text-[11px] text-[#595959]">Start a collaborative channel with multiple members</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewGroupModalOpen(false)}
                className="w-7 h-7 rounded hover:bg-[#F4F6F8] text-[#8C8C8C] hover:text-[#111827] flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3.5 border-b border-[#E5E5E5]">
              <div>
                <label className="block text-[11px] font-bold text-[#111827] uppercase mb-1">
                  Group Name *
                </label>
                <input id="chatview-group-name-5" name="groupName"
                  type="text"
                  placeholder="e.g. Design Sprint Team, Marketing Sync"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 text-xs border border-[#E5E5E5] rounded-md text-[#111827] focus:outline-none focus:border-[#049FD9]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#111827] uppercase mb-1">
                  Description (Optional)
                </label>
                <input id="chatview-group-desc-6" name="groupDesc"
                  type="text"
                  placeholder="What is this channel for?"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-[#E5E5E5] rounded-md text-[#111827] focus:outline-none focus:border-[#049FD9]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#111827] uppercase mb-1">
                  Add Members ({groupSelectedMembers.length} selected)
                </label>
                <div className="relative mb-2">
                  <SearchIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C]" />
                  <input id="chatview-group-search-7" name="groupSearch"
                    type="text"
                    placeholder="Filter team members..."
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    className="w-full bg-[#F4F6F8] border border-[#E5E5E5] rounded-md pl-8 pr-3 py-1 text-xs text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  />
                </div>
              </div>
            </div>

            {/* Member Selection List */}
            <div className="flex-1 overflow-y-auto p-2 divide-y divide-[#F0F0F0]">
              {contactablePeople
                .filter((p) => {
                  if (p.email?.toLowerCase() === userEmail) return false;
                  if (!groupSearch.trim()) return true;
                  const q = groupSearch.toLowerCase().trim();
                  return (
                    p.name.toLowerCase().includes(q) ||
                    (p.email || '').toLowerCase().includes(q) ||
                    (p.role || '').toLowerCase().includes(q)
                  );
                })
                .map((person) => {
                  const uid = normalizeUserKey(person.email || person.id);
                  const isChecked = groupSelectedMembers.includes(uid);
                  const isTargetAdmin =
                    person.accessRole === 'admin' ||
                    person.email?.toLowerCase() === WORKSPACE_ADMIN_EMAIL;

                  return (
                    <label
                      key={person.id || person.email}
                      className="p-2.5 rounded-md hover:bg-[#F4F6F8] flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] ${
                            isTargetAdmin
                              ? 'bg-[#011826] text-white'
                              : person.avatarBg || 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isTargetAdmin ? 'M' : person.avatar || person.name[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-[#111827] truncate">{person.name}</p>
                            {isTargetAdmin && (
                              <span className="text-[9px] bg-[#011826] text-white px-1 py-0.2 rounded font-bold uppercase">
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#595959] truncate">{person.role || person.email}</p>
                        </div>
                      </div>

                      <input id="chatview-checkbox_field-8" name="checkbox_field"
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGroupSelectedMembers((prev) => [...prev, uid]);
                          } else {
                            setGroupSelectedMembers((prev) => prev.filter((id) => id !== uid));
                          }
                        }}
                        className="w-4 h-4 rounded text-[#049FD9] focus:ring-[#049FD9]"
                      />
                    </label>
                  );
                })}
            </div>

            <div className="p-3.5 border-t border-[#E5E5E5] bg-[#FAFAFA] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewGroupModalOpen(false)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!groupName.trim()}
                className="btn-primary text-xs py-1.5 px-4 cursor-pointer disabled:opacity-50"
              >
                Create Group
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: MEMBERS DRAWER / MODAL */}
      {/* ========================================================================= */}
      {isMembersModalOpen && activeConversation && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#111827]">
                  {activeConversation.name} • Members
                </h3>
                <p className="text-[11px] text-[#595959]">
                  {activeConversation.memberUids?.length || 0} participants in this channel
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMembersModalOpen(false)}
                className="w-7 h-7 rounded hover:bg-[#F4F6F8] text-[#8C8C8C] hover:text-[#111827] flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Add Member form if Group and user is admin or creator */}
            {activeConversation.type === 'group' && (isAdmin || activeConversation.createdBy === userKey) && (
              <div className="p-3 border-b border-[#E5E5E5] bg-[#FAFAFA] flex items-center gap-2">
                <select id="chatview-add-member-uid-9" name="addMemberUid"
                  value={addMemberUid}
                  onChange={(e) => setAddMemberUid(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-[#E5E5E5] rounded-md text-[#111827] focus:outline-none focus:border-[#049FD9]"
                >
                  <option value="">Select team member or admin to add...</option>
                  {contactablePeople
                    .filter((p) => {
                      const norm = normalizeUserKey(p.email || p.id);
                      return !activeConversation.memberUids?.includes(norm);
                    })
                    .map((p) => (
                      <option key={p.id} value={normalizeUserKey(p.email || p.id)}>
                        {p.name} ({p.role || p.email})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={async () => {
                    if (!addMemberUid) return;
                    const p = contactablePeople.find((x) => normalizeUserKey(x.email || x.id) === addMemberUid);
                    if (!p) return;
                    try {
                      await updateGroupDetails(activeConversation.id, {
                        addMembers: [
                          {
                            uid: addMemberUid,
                            name: p.name,
                            email: p.email,
                            avatar: p.avatar || p.name[0]?.toUpperCase() || 'U',
                            avatarBg: p.avatarBg || 'bg-blue-100 text-blue-800',
                            designation: p.role,
                          },
                        ],
                      });
                      setAddMemberUid('');
                    } catch (err: any) {
                      alert(err.message || 'Error adding member');
                    }
                  }}
                  disabled={!addMemberUid}
                  className="btn-primary text-xs py-1.5 px-3 cursor-pointer disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            )}

            {/* Member List */}
            <div className="flex-1 overflow-y-auto p-2 divide-y divide-[#F0F0F0]">
              {(activeConversation.memberUids || []).map((mKey) => {
                const details = activeConversation.memberDetails?.[mKey];
                const matchingPerson = people.find((p) => normalizeUserKey(p.email || p.id) === mKey);
                const displayName = details?.name || matchingPerson?.name || mKey;
                const displayEmail = details?.email || matchingPerson?.email || '';
                const online = matchingPerson ? isPersonOnline(matchingPerson) : false;
                const canRemove =
                  activeConversation.type === 'group' &&
                  (isAdmin || activeConversation.createdBy === userKey) &&
                  mKey !== activeConversation.createdBy;

                return (
                  <div
                    key={mKey}
                    className="p-2.5 flex items-center justify-between gap-3 hover:bg-[#F9FAFB] rounded-md"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            details?.avatarBg || matchingPerson?.avatarBg || 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {details?.avatar || displayName[0]?.toUpperCase() || 'U'}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-white ${
                            online ? 'bg-[#16A34A]' : 'bg-[#94A3B8]'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-[#111827] truncate">{displayName}</p>
                          {mKey === activeConversation.createdBy && (
                            <span className="text-[9px] bg-[#FEF3C7] text-[#92400E] px-1.5 py-0.2 rounded font-bold">
                              Owner
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#595959] truncate">{displayEmail}</p>
                      </div>
                    </div>

                    {canRemove && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`Remove ${displayName} from this group?`)) {
                            try {
                              await updateGroupDetails(activeConversation.id, {
                                removeMemberUids: [mKey],
                              });
                            } catch (err: any) {
                              alert(err.message || 'Error removing member');
                            }
                          }
                        }}
                        className="text-[11px] text-[#EF4444] hover:underline font-semibold cursor-pointer shrink-0"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: IMAGE LIGHTBOX */}
      {/* ========================================================================= */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="Enlarged view"
              className="max-h-[85vh] max-w-full rounded-lg shadow-2xl object-contain mx-auto"
            />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-[#111827] font-bold flex items-center justify-center shadow-lg hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
