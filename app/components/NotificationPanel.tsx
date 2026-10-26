'use client';

import React from 'react';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
  unreadCount?: number;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose, onClear, unreadCount }) => {
  if (!isOpen) return null;

  const notifications = [
    { title: 'Project workspace updated', desc: 'E-Commerce Website setup complete', time: '5m ago' },
    { title: 'Sprint task status updated', desc: 'Homepage components deployed', time: '30m ago' },
    { title: 'Weekly Sprint Retrospective', desc: 'Starts in 1 hour in Campfire #general', time: '1h ago' },
  ];

  const isRead = unreadCount === 0;

  return (
    <div className="absolute right-6 top-16 z-40 w-80 bg-white rounded-2xl border border-[#E5E5E5] shadow-xl overflow-hidden font-sans">
      <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between bg-[#F4F6F8]">
        <h4 className="text-sm font-bold text-[#222222]">Notifications</h4>
        {!isRead ? (
          <button onClick={onClear} className="text-xs text-[#049FD9] hover:text-[#238823] font-semibold hover:underline cursor-pointer">
            Mark all as read
          </button>
        ) : (
          <span className="text-xs text-[#238823] font-bold flex items-center gap-1">
            ✓ All read
          </span>
        )}
      </div>

      <div className="divide-y divide-[#E5E5E5] max-h-72 overflow-y-auto">
        {notifications.map((n, i) => (
          <div key={i} className={`p-3.5 transition-colors ${isRead ? 'bg-[#F4F6F8]/50 opacity-70' : 'hover:bg-[#F4F6F8]'}`}>
            <div className="flex justify-between items-start mb-0.5 gap-2">
              <h5 className="text-xs font-bold text-[#222222] break-words min-w-0">{n.title}</h5>
              <span className="text-[10px] text-[#595959] shrink-0">{n.time}</span>
            </div>
            <p className="text-xs text-[#595959] break-words">{n.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
