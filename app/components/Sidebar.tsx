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
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  tasksCount,
  chatCount,
  isMobileOpen = false,
  onCloseMobile,
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

  const handleNavClick = (tab: NavTab) => {
    setActiveTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const navContent = (isMobile: boolean) => (
    <div className="space-y-5">
      {isMobile && (
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] px-1">
          <div className="flex items-center font-black text-xl text-[#011826] tracking-tight">
            <span>WorkOrbit</span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="w-8 h-8 rounded-lg bg-[#F4F6F8] hover:bg-[#E5E5E5] text-[#595959] hover:text-[#011826] flex items-center justify-center text-sm transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>
      )}

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
                onClick={() => handleNavClick(item.id)}
                className={`w-full group flex items-center justify-between px-3 py-2.5 text-sm transition-colors cursor-pointer text-[#222222] font-medium rounded-lg ${
                  isActive ? 'bg-[#F4F6F8]' : 'hover:bg-[#F9FAFB]'
                }`}
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
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                      isActive ? 'bg-white text-[#595959]' : 'bg-[#F4F6F8] text-[#595959]'
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
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-[#E5E5E5] p-4 flex-col justify-between h-full shrink-0 select-none overflow-y-auto">
        {navContent(false)}
      </aside>

      {/* 2. Mobile / Tablet Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* 3. Mobile / Tablet Slide-out Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white border-r border-[#E5E5E5] p-4 flex flex-col justify-between h-full select-none overflow-y-auto transform transition-transform duration-300 ease-in-out lg:hidden shadow-2xl ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent(true)}
      </aside>
    </>
  );
};
