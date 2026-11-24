'use client';

import React, { useState, useMemo } from 'react';
import { BasecampNotification, NotificationType } from '@/lib/types';
import { getNotificationRelativeTime } from '@/lib/firebaseNotificationService';
import {
  CheckSquareIcon,
  FolderIcon,
  ChatIcon,
  CalendarIcon,
  FileIcon,
  BellIcon,
  SearchIcon,
} from './Icons';

interface NotificationsViewProps {
  notifications: BasecampNotification[];
  onSelectNotification: (notification: BasecampNotification) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  currentUser?: { email: string; fullName: string; role?: string } | null;
  isAdmin?: boolean;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  onSelectNotification,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  currentUser,
  isAdmin = false,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;

  const activeNotifications = useMemo(() => {
    return notifications.filter((n) => n.status !== 'deleted');
  }, [notifications]);

  const unreadCount = useMemo(() => {
    return activeNotifications.filter((n) => !n.isRead).length;
  }, [activeNotifications]);

  const filteredNotifications = useMemo(() => {
    return activeNotifications.filter((n) => {
      // 1. Read Filter
      if (readFilter === 'unread' && n.isRead) return false;

      // 2. Category Filter
      if (filterCategory !== 'all') {
        const notifType = String(n.type || (n as any).notificationType || '').toLowerCase();
        if (filterCategory === 'tasks' && !notifType.startsWith('task_')) return false;
        if (filterCategory === 'projects' && !notifType.startsWith('project_')) return false;
        if (filterCategory === 'chat' && !notifType.startsWith('chat_')) return false;
        if (filterCategory === 'calendar' && !notifType.startsWith('meeting_')) return false;
        if (filterCategory === 'files' && !notifType.startsWith('file_')) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = n.title.toLowerCase().includes(q);
        const matchMsg = n.message.toLowerCase().includes(q);
        const matchProj = (n.projectName || '').toLowerCase().includes(q);
        const matchTask = (n.taskTitle || '').toLowerCase().includes(q);
        if (!matchTitle && !matchMsg && !matchProj && !matchTask) return false;
      }

      return true;
    });
  }, [activeNotifications, readFilter, filterCategory, searchQuery]);

  const paginatedNotifications = useMemo(() => {
    return filteredNotifications.slice(0, page * itemsPerPage);
  }, [filteredNotifications, page]);

  const hasMore = paginatedNotifications.length < filteredNotifications.length;

  const getNotificationIcon = (type?: NotificationType | string) => {
    const safeType = String(type || '').toLowerCase();
    if (safeType.startsWith('task_')) {
      return (
        <div className="w-9 h-9 rounded-lg bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
          <CheckSquareIcon className="w-4 h-4" />
        </div>
      );
    }
    if (safeType.startsWith('project_')) {
      return (
        <div className="w-9 h-9 rounded-lg bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center shrink-0">
          <FolderIcon className="w-4 h-4" />
        </div>
      );
    }
    if (safeType.startsWith('chat_')) {
      return (
        <div className="w-9 h-9 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0">
          <ChatIcon className="w-4 h-4" />
        </div>
      );
    }
    if (safeType.startsWith('meeting_')) {
      return (
        <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
          <CalendarIcon className="w-4 h-4" />
        </div>
      );
    }
    if (safeType.startsWith('file_')) {
      return (
        <div className="w-9 h-9 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
          <FileIcon className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-lg bg-[#F1F5F9] text-[#64748B] flex items-center justify-center shrink-0">
        <BellIcon className="w-4 h-4" />
      </div>
    );
  };

  const getCategoryBadge = (type?: NotificationType | string) => {
    const safeType = String(type || '').toLowerCase();
    if (safeType.startsWith('task_')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E0F2FE] text-[#0284C7]">Tasks</span>;
    }
    if (safeType.startsWith('project_')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F3E8FF] text-[#9333EA]">Projects</span>;
    }
    if (safeType.startsWith('chat_')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#DCFCE7] text-[#16A34A]">Campfire</span>;
    }
    if (safeType.startsWith('meeting_')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FEF3C7] text-[#D97706]">Calendar</span>;
    }
    if (safeType.startsWith('file_')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EEF2FF] text-[#4F46E5]">Docs & Files</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F1F5F9] text-[#64748B]">System</span>;
  };

  return (
    <div className="space-y-6 font-sans w-full max-w-5xl mx-auto">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E5]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#111827] flex items-center gap-2.5">
            <BellIcon className="w-6 h-6 text-[#049FD9]" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EF4444] text-white">
                {unreadCount} unread
              </span>
            )}
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Real-time feed of task assignments, project updates, campfire messages, and deliverables.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="px-3.5 py-2 bg-white border border-[#CBD5E1] hover:border-[#049FD9] text-[#0284C7] rounded-md text-xs font-semibold shadow-2xs hover:bg-[#F0F9FF] transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>✓</span>
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* 2. Filter Pills & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
          {[
            { id: 'all', label: 'All' },
            { id: 'tasks', label: 'Tasks' },
            { id: 'projects', label: 'Projects' },
            { id: 'chat', label: 'Messages' },
            { id: 'calendar', label: 'Meetings' },
            { id: 'files', label: 'Files' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setFilterCategory(cat.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                filterCategory === cat.id
                  ? 'bg-[#049FD9] text-white font-bold shadow-2xs'
                  : 'bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569]'
              }`}
            >
              {cat.label}
            </button>
          ))}

          <span className="w-px h-5 bg-[#CBD5E1] mx-1 shrink-0" />

          {/* Read / Unread toggle */}
          <button
            type="button"
            onClick={() => {
              setReadFilter(readFilter === 'all' ? 'unread' : 'all');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              readFilter === 'unread'
                ? 'bg-[#E0F2FE] border border-[#049FD9] text-[#0284C7] font-bold'
                : 'bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B]'
            }`}
          >
            <span>Unread Only</span>
            {unreadCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
            )}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <SearchIcon className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="notifications-search"
            name="notificationsSearch"
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#CBD5E1] rounded-md text-xs text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#049FD9]"
          />
        </div>
      </div>

      {/* 3. Notification Feed */}
      <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs overflow-hidden">
        {paginatedNotifications.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#F1F5F9] text-[#94A3B8] flex items-center justify-center mb-3">
              <BellIcon className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#1E293B]">No notifications found</h4>
            <p className="text-xs text-[#64748B] max-w-sm mx-auto mt-1">
              {readFilter === 'unread'
                ? "You've read all your notifications! Check back later for new workspace activity."
                : 'No activities matching your current filters.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {paginatedNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.isRead) onMarkAsRead(notif.id);
                  onSelectNotification(notif);
                }}
                className={`p-4 transition-all cursor-pointer flex items-start gap-3.5 group relative ${
                  !notif.isRead ? 'bg-[#F0F9FF]/80 hover:bg-[#E0F2FE]/60' : 'hover:bg-[#F8FAFC]'
                }`}
              >
                {/* Left unread bar indicator */}
                {!notif.isRead && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#049FD9]" />
                )}

                {/* Category Icon */}
                {getNotificationIcon(notif.type)}

                {/* Content Section */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`text-xs sm:text-sm font-bold ${
                          !notif.isRead ? 'text-[#0F172A]' : 'text-[#334155]'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      {getCategoryBadge(notif.type)}
                    </div>
                    <span className="text-[11px] text-[#94A3B8] font-medium shrink-0">
                      {getNotificationRelativeTime(notif.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-[#475569] leading-relaxed">
                    {notif.message}
                  </p>

                  {/* Context Meta Pills */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {notif.projectName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                        <FolderIcon className="w-2.5 h-2.5 text-[#049FD9]" />
                        <span>{notif.projectName}</span>
                      </span>
                    )}
                    {notif.taskTitle && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E0F2FE] text-[#0284C7]">
                        <CheckSquareIcon className="w-2.5 h-2.5" />
                        <span>{notif.taskTitle}</span>
                      </span>
                    )}
                    {notif.fileName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EEF2FF] text-[#4F46E5]">
                        <FileIcon className="w-2.5 h-2.5" />
                        <span>{notif.fileName}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete / Dismiss button */}
                <div className="flex items-center gap-1 shrink-0">
                  {!notif.isRead && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsRead(notif.id);
                      }}
                      className="text-[11px] font-semibold text-[#0284C7] hover:underline px-2 py-1 rounded hover:bg-[#E0F2FE]"
                      title="Mark as read"
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNotification(notif.id);
                    }}
                    className="p-1.5 text-[#94A3B8] hover:text-[#EF4444] rounded hover:bg-[#FEE2E2] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Delete notification"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Pagination */}
        {hasMore && (
          <div className="p-4 bg-[#F8FAFC] border-t border-[#F1F5F9] text-center">
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 bg-white border border-[#CBD5E1] text-[#334155] rounded-md text-xs font-semibold hover:bg-[#F1F5F9] transition-colors shadow-2xs cursor-pointer"
            >
              Load more notifications ({filteredNotifications.length - paginatedNotifications.length} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
