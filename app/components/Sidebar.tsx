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
  CheckCircleIcon,
  ChartIcon,
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
  storageUsedGB: number;
  storageTotalGB: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  tasksCount,
  chatCount,
  storageUsedGB,
  storageTotalGB,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: DashboardIcon },
    { id: 'tasks' as NavTab, label: 'My Tasks', icon: CheckSquareIcon, badge: tasksCount },
    { id: 'projects' as NavTab, label: 'Projects', icon: FolderIcon },
    { id: 'calendar' as NavTab, label: 'Calendar', icon: CalendarIcon },
    { id: 'chat' as NavTab, label: 'Campfire Chat', icon: ChatIcon, badge: chatCount },
    { id: 'files' as NavTab, label: 'Files', icon: FileIcon },
    { id: 'people' as NavTab, label: 'Employees', icon: UsersIcon },
    { id: 'checkins' as NavTab, label: 'Check-ins', icon: CheckCircleIcon },
    { id: 'reports' as NavTab, label: 'Reports', icon: ChartIcon },
  ];

  const storagePercentage = Math.min(100, Math.round((storageUsedGB / storageTotalGB) * 100));

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

      {/* Bottom Storage & Workspace Plan Card */}
      <div className="pt-3 border-t border-[#E5E5E5]">
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-[#111827] mb-1.5">
            <span>Workspace Plan</span>
            <span className="text-[#049FD9] font-medium text-[11px]">Pro Plan</span>
          </div>
          <div className="w-full bg-[#F3F4F6] rounded-full h-1 overflow-hidden mb-1.5">
            <div
              className="bg-[#049FD9] h-full rounded-full transition-all duration-500"
              style={{ width: `${storagePercentage}%` }}
            />
          </div>
          <div className="text-[10px] font-normal text-[#6B7280]">
            {storageUsedGB} GB of {storageTotalGB} GB storage used
          </div>
        </div>
      </div>
    </aside>
  );
};
