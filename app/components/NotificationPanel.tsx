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
    { title: 'Priya Sharma assigned a new task', desc: 'Design mobile navigation flow', time: '5m ago' },
    { title: 'Chandra Reddy commented on Login API', desc: 'API endpoints ready for testing', time: '30m ago' },
    { title: 'Weekly Sprint Retrospective', desc: 'Starts in 1 hour in Campfire #general', time: '1h ago' },
  ];

  const isRead = unreadCount === 0;

  return (
    <div className="absolute right-6 top-16 z-40 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900">Notifications</h4>
        {!isRead ? (
          <button onClick={onClear} className="text-xs text-slate-900 font-bold hover:underline cursor-pointer">
            Mark all as read
          </button>
        ) : (
          <span className="text-xs text-slate-900 font-bold flex items-center gap-1">
            ✓ All read
          </span>
        )}
      </div>

      <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
        {notifications.map((n, i) => (
          <div key={i} className={`p-3.5 transition-colors ${isRead ? 'bg-slate-50/50 opacity-70' : 'hover:bg-slate-50'}`}>
            <div className="flex justify-between items-start mb-0.5 gap-2">
              <h5 className="text-xs font-bold text-slate-800 break-words min-w-0">{n.title}</h5>
              <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
            </div>
            <p className="text-xs text-slate-500 break-words">{n.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
