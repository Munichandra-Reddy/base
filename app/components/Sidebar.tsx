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
    <aside className="w-68 bg-white border-r border-slate-200 p-4 flex flex-col justify-between h-full shrink-0 select-none overflow-y-auto">
      <div className="space-y-5">
        <div>
          <h3 className="px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">
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
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-bold shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="whitespace-nowrap truncate text-sm font-semibold">{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                        isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
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
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2">
            <span>Workspace Plan</span>
            <span className="text-blue-600 font-bold">Pro Plan</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-2">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${storagePercentage}%` }}
            />
          </div>
          <div className="text-[11px] font-medium text-slate-400">
            {storageUsedGB} GB of {storageTotalGB} GB storage used
          </div>
        </div>

        {/* Small steps rocket card matching Image 1 */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border border-blue-100 text-center space-y-1">
          <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto text-lg shadow-2xs">
            🚀
          </div>
          <p className="text-xs font-bold text-slate-800 leading-snug">
            Small steps <br /> create big results.
          </p>
          <p className="text-[11px] font-black text-blue-600 italic tracking-wide">
            WorkOrbit
          </p>
        </div>
      </div>
    </aside>
  );
};
