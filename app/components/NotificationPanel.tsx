'use client';

import React from 'react';

export interface NotificationItem {
  id?: string;
  title: string;
  desc: string;
  time?: string;
  taskId?: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
  unreadCount?: number;
  items?: NotificationItem[];
  onSelectTask?: (taskId: string) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  onClear,
  unreadCount,
  items,
  onSelectTask,
}) => {
  if (!isOpen) return null;

  const defaultNotifications: NotificationItem[] = [
    { title: 'Project workspace updated', desc: 'E-Commerce Website setup complete', time: '5m ago' },
    { title: 'Sprint task status updated', desc: 'Homepage components deployed', time: '30m ago' },
    { title: 'Weekly Sprint Retrospective', desc: 'Starts in 1 hour in Campfire #general', time: '1h ago' },
  ];

  const notifications = items && items.length > 0 ? items : defaultNotifications;
  const isRead = unreadCount === 0;

  return (
    <>
      <div
        className="fixed inset-0 z-35 bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed right-3 left-3 sm:left-auto sm:right-6 top-16 z-40 sm:w-80 max-w-sm ml-auto bg-white rounded-xl border border-[#E5E5E5] shadow-lg overflow-hidden font-sans animate-in fade-in slide-in-from-top-1 duration-150">
        <div className="px-4 py-3 border-b border-[#E5E5E5] flex items-center justify-between bg-[#F4F6F8]">
          <h4 className="text-xs font-semibold text-[#222222]">Notifications</h4>
          <div className="flex items-center gap-2">
            {!isRead ? (
              <button onClick={onClear} className="text-xs text-[#049FD9] hover:text-[#004BAF] font-medium hover:underline cursor-pointer">
                Mark all as read
              </button>
            ) : (
              <span className="text-xs text-[#595959] font-medium flex items-center gap-1">
                ✓ All read
              </span>
            )}
            <button
              onClick={onClose}
              className="sm:hidden text-xs text-[#595959] hover:text-[#222222] font-bold p-1"
              aria-label="Close notifications"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="divide-y divide-[#E5E5E5] max-h-72 overflow-y-auto">
          {notifications.map((n, i) => (
            <div
              key={i}
              onClick={() => {
                if (n.taskId && onSelectTask) {
                  onSelectTask(n.taskId);
                  onClose();
                }
              }}
              className={`p-3 transition-colors ${
                n.taskId ? 'cursor-pointer hover:bg-[#EFF6FF]' : ''
              } ${isRead ? 'bg-[#F4F6F8]/40 opacity-70' : 'hover:bg-[#F4F6F8]'}`}
            >
              <div className="flex justify-between items-start mb-0.5 gap-2">
                <h5 className="text-xs font-semibold text-[#222222] break-words min-w-0">{n.title}</h5>
                <span className="text-[10px] text-[#595959] shrink-0">{n.time}</span>
              </div>
              <p className="text-xs text-[#595959] break-words">{n.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
