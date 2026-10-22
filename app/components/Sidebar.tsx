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
  WhatsAppIcon,
} from './Icons';

export type NavTab =
  | 'dashboard'
  | 'tasks'
  | 'projects'
  | 'calendar'
  | 'chat'
  | 'whatsapp'
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
    { id: 'whatsapp' as NavTab, label: 'WhatsApp', icon: WhatsAppIcon },
    { id: 'files' as NavTab, label: 'Files', icon: FileIcon },
    { id: 'people' as NavTab, label: 'Employees', icon: UsersIcon },
    { id: 'checkins' as NavTab, label: 'Check-ins', icon: CheckCircleIcon },
    { id: 'reports' as NavTab, label: 'Reports', icon: ChartIcon },
  ];

  const storagePercentage = Math.min(100, Math.round((storageUsedGB / storageTotalGB) * 100));

  return (
    <aside className="w-68 bg-white border-r border-[#E2E8F0] p-4 flex flex-col justify-between h-full shrink-0 select-none overflow-y-auto">
      <div className="space-y-5">
        <div>
          <h3 className="px-3 text-[11px] font-bold tracking-wider text-[#64748B] uppercase mb-2">
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
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                    isActive
                      ? 'bg-[#0B192C] text-white font-bold shadow-xs'
                      : 'text-[#334155] hover:bg-[#EBF0F5] hover:text-[#0F172A] font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-[#CBD5E1]'}`} />
                    <span className="whitespace-nowrap truncate text-sm font-semibold">{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                        isActive ? 'bg-[#15293F] text-white' : 'bg-[#EBF0F5] text-[#64748B]'
                      }`}
                    >
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
      <div className="pt-4 border-t border-[#E2E8F0]">
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-[#334155] mb-2">
            <span>Workspace Plan</span>
            <span className="text-[#0F172A] font-bold">Pro Plan</span>
          </div>
          <div className="w-full bg-[#EBF0F5] rounded-full h-1.5 overflow-hidden mb-2">
            <div
              className="bg-[#0B192C] h-full rounded-full transition-all duration-500"
              style={{ width: `${storagePercentage}%` }}
            />
          </div>
          <div className="text-[11px] font-medium text-[#64748B]">
            {storageUsedGB} GB of {storageTotalGB} GB storage used
          </div>
        </div>
      </div>
    </aside>
  );
};
