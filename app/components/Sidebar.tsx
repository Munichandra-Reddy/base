'use client';

import React from 'react';
import {
  DashboardIcon,
  CheckSquareIcon,
  FolderIcon,
  CalendarIcon,
  ChatIcon,
  FileIcon,
  UsersIcon,
} from './Icons';

export type NavTab =
  | 'dashboard'
  | 'tasks'
  | 'projects'
  | 'calendar'
  | 'chat'
  | 'files'
  | 'people'
  | 'checkins'
  | 'reports';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  tasksCount: number;
  chatCount: number;
  storageUsedGB?: number;
  storageTotalGB?: number;
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  tasksCount,
  chatCount,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: DashboardIcon },
    { id: 'tasks' as NavTab, label: 'My Tasks', icon: CheckSquareIcon, badge: tasksCount },
    { id: 'projects' as NavTab, label: 'Projects', icon: FolderIcon },
    { id: 'calendar' as NavTab, label: 'Calendar', icon: CalendarIcon },
    { id: 'chat' as NavTab, label: 'Campfire Chat', icon: ChatIcon, badge: chatCount },
    { id: 'files' as NavTab, label: 'Files', icon: FileIcon },
    { id: 'people' as NavTab, label: 'Employees', icon: UsersIcon },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#E5E5E5] p-4 flex flex-col justify-between h-full shrink-0 select-none overflow-y-auto">
      <div className="space-y-5">
        <div>
          <h3 className="px-3 text-[11px] font-bold tracking-wider text-[#595959] uppercase mb-2">
            WORKSPACE
          </h3>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className="w-full group flex items-center justify-between px-3 py-2 text-sm transition-colors cursor-pointer text-[#222222] font-medium"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-5 h-5 shrink-0 transition-colors ${
                        isActive ? 'text-[#049FD9]' : 'text-[#595959] group-hover:text-[#222222]'
                      }`}
                    />
                    <span className="whitespace-nowrap truncate text-sm">{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ml-2 bg-[#F4F6F8] text-[#595959]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
};
