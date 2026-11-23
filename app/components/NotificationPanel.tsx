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
} from './Icons';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onClear?: () => void;
  unreadCount?: number;
  items?: BasecampNotification[];
  onSelectNotification?: (notification: BasecampNotification) => void;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDeleteNotification?: (id: string) => void;
  onViewAll?: () => void;
  onSelectTask?: (taskId: string) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  onClear,
  unreadCount = 0,
  items = [],
  onSelectNotification,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onViewAll,
  onSelectTask,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');

  if (!isOpen) return null;

  const unreadItemsCount = items.filter((n) => !n.isRead && n.status !== 'deleted').length;
  const effectiveUnread = unreadCount !== undefined ? unreadCount : unreadItemsCount;

  const displayItems = items
    .filter((n) => n.status !== 'deleted')
    .filter((n) => (filterTab === 'unread' ? !n.isRead : true))
    .slice(0, 20);

  const getNotificationIcon = (type: NotificationType) => {
    if (type.startsWith('task_')) {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center shrink-0">
          <CheckSquareIcon className="w-4 h-4" />
        </div>
      );
    }
    if (type.startsWith('project_')) {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center shrink-0">
          <FolderIcon className="w-4 h-4" />
        </div>
      );
    }
    if (type.startsWith('chat_')) {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0">
          <ChatIcon className="w-4 h-4" />
        </div>
      );
    }
    if (type.startsWith('meeting_')) {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
          <CalendarIcon className="w-4 h-4" />
        </div>
      );
    }
    if (type.startsWith('file_')) {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
          <FileIcon className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] text-[#64748B] flex items-center justify-center shrink-0">
        <BellIcon className="w-4 h-4" />
      </div>
    );
  };

  const handleItemClick = (notif: BasecampNotification) => {
    if (onMarkAsRead && !notif.isRead) {
      onMarkAsRead(notif.id);
    }
    if (onSelectNotification) {
      onSelectNotification(notif);
    } else if (notif.taskId && onSelectTask) {
      onSelectTask(notif.taskId);
    }
    onClose();
  };

  const handleMarkAll = () => {
    if (onMarkAllAsRead) {
      onMarkAllAsRead();
    } else if (onClear) {
      onClear();
    }
  };

  return (
    <>
      {/* Backdrop to close panel */}
      <div
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-2xs"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Popover Panel */}
      <div className="fixed right-3 left-3 sm:left-auto sm:right-6 top-[76px] z-50 sm:w-[420px] max-w-md ml-auto bg-white rounded-xl border border-[#E2E8F0] shadow-2xl overflow-hidden font-sans animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col max-h-[82vh]">
        {/* Panel Header */}
        <div className="p-3.5 border-b border-[#F1F5F9] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-1.5">
              <span>Notifications</span>
              {effectiveUnread > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#EF4444] text-white">
                  {effectiveUnread}
                </span>
              )}
            </h4>
          </div>

          <div className="flex items-center gap-2">
            {effectiveUnread > 0 ? (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-xs text-[#049FD9] hover:text-[#0284C7] font-semibold hover:underline cursor-pointer"
              >
                Mark all as read
              </button>
            ) : (
              <span className="text-xs text-[#10B981] font-semibold flex items-center gap-1">
                ✓ All read
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-md hover:bg-[#E2E8F0] transition-colors cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter Tabs: All vs Unread */}
        <div className="px-3.5 pt-2 pb-1 border-b border-[#F1F5F9] flex items-center gap-2 bg-white">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              filterTab === 'all'
                ? 'bg-[#E0F2FE] text-[#0284C7]'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
            }`}
          >
            All ({items.filter((n) => n.status !== 'deleted').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('unread')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              filterTab === 'unread'
                ? 'bg-[#E0F2FE] text-[#0284C7]'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
            }`}
          >
            <span>Unread</span>
            {effectiveUnread > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
            )}
          </button>
        </div>

        {/* Notifications Feed */}
        <div className="divide-y divide-[#F1F5F9] overflow-y-auto flex-1 max-h-[460px]">
          {displayItems.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-[#F1F5F9] text-[#94A3B8] flex items-center justify-center mb-2.5">
                <BellIcon className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-[#334155]">
                {filterTab === 'unread'
                  ? "You're all caught up! No unread notifications."
                  : 'No notifications yet.'}
              </p>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">
                Activity from tasks, projects, messages, and files will appear here.
              </p>
            </div>
          ) : (
            displayItems.map((n) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`p-3.5 transition-all cursor-pointer flex items-start gap-3 relative group ${
                  !n.isRead
                    ? 'bg-[#F0F9FF]/70 hover:bg-[#E0F2FE]/60'
                    : 'hover:bg-[#F8FAFC]'
                }`}
              >
                {/* Unread indicator dot */}
                {!n.isRead && (
                  <span className="absolute top-4 left-1.5 w-1.5 h-1.5 rounded-full bg-[#049FD9]" />
                )}

                {/* Type Icon */}
                {getNotificationIcon(n.type)}

                {/* Notification Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1 mb-0.5">
                    <h5
                      className={`text-xs break-words font-bold ${
                        !n.isRead ? 'text-[#0F172A]' : 'text-[#334155]'
                      }`}
                    >
                      {n.title}
                    </h5>
                    <span className="text-[10px] text-[#94A3B8] shrink-0 font-medium whitespace-nowrap">
                      {getNotificationRelativeTime(n.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-[#64748B] leading-relaxed line-clamp-2">
                    {n.message}
                  </p>

                  {/* Context Pill (Project / Task) */}
                  {(n.projectName || n.taskTitle || n.fileName) && (
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      {n.projectName && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F1F5F9] text-[#475569]">
                          <FolderIcon className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[150px]">{n.projectName}</span>
                        </span>
                      )}
                      {n.taskTitle && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#E0F2FE] text-[#0284C7]">
                          <CheckSquareIcon className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[150px]">{n.taskTitle}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Action: Delete / Dismiss */}
                {onDeleteNotification && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNotification(n.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#94A3B8] hover:text-[#EF4444] rounded hover:bg-[#FEE2E2] transition-all cursor-pointer"
                    title="Dismiss notification"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Panel Footer: View All link */}
        <div className="p-3 border-t border-[#F1F5F9] bg-[#F8FAFC] flex items-center justify-between text-xs">
          <span className="text-[11px] text-[#94A3B8]">
            {items.length} total notification{items.length !== 1 ? 's' : ''}
          </span>
          {onViewAll && (
            <button
              type="button"
              onClick={() => {
                onViewAll();
                onClose();
              }}
              className="text-xs font-bold text-[#049FD9] hover:text-[#0284C7] hover:underline cursor-pointer"
            >
              View All Notifications →
            </button>
          )}
        </div>
      </div>
    </>
  );
};
