'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  currentUser?: { email: string; fullName: string; companyName: string } | null;
  currentRole?: 'admin' | 'employee';
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  tasksCount,
  chatCount,
  isAdmin = false,
  isMobileOpen = false,
  onCloseMobile,
  currentUser,
  currentRole = 'admin',
  onLogout,
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);

  const desktopProfileRef = useRef<HTMLDivElement>(null);
  const mobileProfileRef = useRef<HTMLDivElement>(null);

  const userName = currentUser?.fullName || (currentRole === 'employee' ? 'HARI KISHORE REDDY' : 'Muni');
  const userEmail = currentUser?.email || (currentRole === 'employee' ? 'employee@company.com' : 'cr7156816@gmail.com');
  const userRole = currentRole === 'employee' ? 'Product Designer' : 'Workspace Admin';
  const userAvatar = (userName[0] || (currentRole === 'employee' ? 'H' : 'M')).toUpperCase();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inDesktop = desktopProfileRef.current && desktopProfileRef.current.contains(target);
      const inMobile = mobileProfileRef.current && mobileProfileRef.current.contains(target);
      if (!inDesktop && !inMobile) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogoutClick = () => {
    setIsProfileOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      alert('You have logged out of WorkOrbit.');
    }
  };

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
    <div className="space-y-5 flex-1 overflow-y-auto min-h-0 pr-0.5">
      {isMobile && (
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] px-1 shrink-0">
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

  const profileSection = (isMobile: boolean) => (
    <div
      ref={isMobile ? mobileProfileRef : desktopProfileRef}
      className="pt-3 border-t border-[#E5E5E5] mt-auto relative shrink-0"
    >
      {/* Profile Trigger Button - Matches Image 1 */}
      <button
        type="button"
        onClick={() => setIsProfileOpen(!isProfileOpen)}
        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#F4F6F8] transition-colors cursor-pointer select-none text-left group"
        aria-label="User Profile Menu"
        aria-expanded={isProfileOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-full bg-[#049FD9] text-white font-extrabold flex items-center justify-center text-sm shadow-xs border border-[#E5E5E5] shrink-0">
            {userAvatar}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="font-bold text-xs text-[#222222] truncate" title={userName}>
              {userName}
            </div>
            <div className="text-[11px] text-[#595959] font-normal truncate mt-0.5" title={userRole}>
              {userRole}
            </div>
          </div>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-[#595959] group-hover:text-[#222222] transition-transform shrink-0 ${
            isProfileOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Upward Dropdown Menu */}
      {isProfileOpen && (
        <div className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-xl border border-[#E5E5E5] shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 text-[#222222]">
          <div className="p-3.5 border-b border-[#E5E5E5] bg-[#F4F6F8]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#049FD9] text-white font-extrabold flex items-center justify-center text-sm shadow-xs shrink-0">
                {userAvatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs text-[#222222] truncate">{userName}</div>
                <div className="text-[11px] text-[#595959] truncate">{userEmail}</div>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-white text-[#222222] uppercase border border-[#CCCCCC]">
                {currentRole === 'employee' ? 'Employee Mode' : 'Workspace Admin'}
              </span>
            </div>
          </div>

          <div className="p-1.5 text-xs font-semibold text-[#595959] space-y-0.5">
            <button
              type="button"
              onClick={() => {
                setIsProfileOpen(false);
                setIsProfileModalOpen(true);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-[#111827] hover:bg-[#F4F6F8] flex items-center gap-2.5 transition-colors font-medium cursor-pointer"
            >
              <span>👤 Profile Settings</span>
            </button>

            {currentRole === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  setIsWorkspaceModalOpen(true);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-[#111827] hover:bg-[#F4F6F8] flex items-center gap-2.5 transition-colors font-medium cursor-pointer"
              >
                <span>⚙️ Workspace Settings</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLogoutClick}
              className="w-full text-left px-3 py-2 rounded-lg text-[#EF4444] hover:bg-[#FEF2F2] flex items-center gap-2.5 transition-colors font-bold cursor-pointer"
            >
              <span>🚪 Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar - Profile at bottom-left corner below Employees (Image 3) */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-[#E5E5E5] p-4 flex-col justify-between h-full shrink-0 select-none relative">
        {navContent(false)}
        {profileSection(false)}
      </aside>

      {/* 2. Mobile / Tablet Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* 3. Mobile / Tablet Slide-out Drawer with Profile at bottom */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white border-r border-[#E5E5E5] p-4 flex flex-col justify-between h-full select-none transform transition-transform duration-300 ease-in-out lg:hidden shadow-2xl relative ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent(true)}
        {profileSection(true)}
      </aside>

      {/* User Profile Settings Modal */}
      {isProfileModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsProfileModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4 font-sans text-left overflow-y-auto"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div>
                <h3 className="text-base font-semibold text-[#111827]">Account & Profile</h3>
                <p className="text-xs text-[#595959]">Manage your account details and security settings</p>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="w-7 h-7 rounded-md bg-[#F4F6F8] text-[#595959] hover:text-[#111827] flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Full Name</label>
                <input
                  type="text"
                  disabled
                  value={userName}
                  className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg text-xs font-medium text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={userEmail}
                  className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg text-xs font-medium text-[#595959]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Assigned Role</label>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#F4F6F8] text-[#111827] border border-[#E5E5E5] uppercase">
                    {currentRole === 'admin' ? 'Workspace Administrator' : 'Product Designer'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E5E5E5]">
                <p className="text-[11px] text-[#595959]">
                  To change your password, use the <strong>Forgot Password</strong> link on the sign-in screen to receive a secure recovery code.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Settings Modal (Admin Only) */}
      {isWorkspaceModalOpen && currentRole === 'admin' && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsWorkspaceModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4 font-sans text-left overflow-y-auto"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div>
                <h3 className="text-base font-semibold text-[#111827]">Workspace Settings</h3>
                <p className="text-xs text-[#595959]">Organization-wide configuration & security controls</p>
              </div>
              <button
                type="button"
                onClick={() => setIsWorkspaceModalOpen(false)}
                className="w-7 h-7 rounded-md bg-[#F4F6F8] text-[#595959] hover:text-[#111827] flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#F4F6F8] rounded-lg border border-[#E5E5E5]">
                  <span className="text-[11px] text-[#595959] block">Organization</span>
                  <span className="font-bold text-sm text-[#111827]">GEONIXA</span>
                </div>
                <div className="p-3 bg-[#F4F6F8] rounded-lg border border-[#E5E5E5]">
                  <span className="text-[11px] text-[#595959] block">Plan Tier</span>
                  <span className="font-bold text-sm text-[#049FD9]">Pro Plan (Active)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Workspace Domain</label>
                <input
                  type="text"
                  disabled
                  value="geonixa.workorbit.app"
                  className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg text-xs font-medium text-[#595959]"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-[#E5E5E5]">
                <h4 className="font-semibold text-xs text-[#111827]">Security & Role Policies</h4>
                <div className="space-y-1.5 text-[11px] text-[#595959]">
                  <div className="flex items-center gap-2">
                    <span className="text-[#16A34A] font-bold">✓</span>
                    <span>Strict role-based project creation (Admins only)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#16A34A] font-bold">✓</span>
                    <span>Employee project and task scoping enabled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#16A34A] font-bold">✓</span>
                    <span>Firestore database security rules enforced</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsWorkspaceModalOpen(false)}
                className="btn-primary"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
