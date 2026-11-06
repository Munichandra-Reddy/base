'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SearchIcon, BellIcon } from './Icons';

interface HeaderProps {
  onOpenCreateModal: () => void;
  onOpenSearchModal?: () => void;
  onNavigate?: (tab: any) => void;
  onToggleNotifications: () => void;
  unreadNotifications: number;
  onLogout?: () => void;
  currentUser?: { email: string; fullName: string; companyName: string } | null;
  currentRole?: 'admin' | 'employee';
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCreateModal,
  onOpenSearchModal,
  onNavigate,
  onToggleNotifications,
  unreadNotifications,
  onLogout,
  currentUser,
  currentRole = 'admin',
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const quickLinks = [
    { label: 'E-Commerce Homepage Design', type: 'Task', tab: 'tasks' },
    { label: 'Mobile App v2 Architecture', type: 'Project', tab: 'projects' },
    { label: 'Login API Endpoint Spec', type: 'File', tab: 'files' },
    { label: 'Workspace Employees Directory', type: 'People', tab: 'people' },
    { label: 'Daily Standup Campfire', type: 'Chat', tab: 'chat' },
  ];

  const filteredResults = quickLinks.filter(
    (l) =>
      l.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const userName = currentUser?.fullName || (currentRole === 'employee' ? 'Employee' : 'Muni');
  const userEmail = currentUser?.email || (currentRole === 'employee' ? 'employee@company.com' : 'cr7156816@gmail.com');
  const userAvatar = (userName[0] || (currentRole === 'employee' ? 'E' : 'M')).toUpperCase();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'f')) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogoutClick = () => {
    setIsProfileOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      alert('You have logged out of WorkOrbit.');
    }
  };

  return (
    <header className="h-[72px] w-full bg-white border-b border-[#E5E5E5] px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-xs text-[#222222]">
      {/* Left section: Clean Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center font-black text-2xl text-[#011826] tracking-tight cursor-pointer">
          <span className="text-[#011826]">WorkOrbit</span>
        </div>
      </div>

      {/* Middle section: Direct Global Search Bar with Live Dropdown */}
      <div className="flex-1 max-w-md xl:max-w-lg mx-2 sm:mx-6 min-w-0 relative" ref={searchRef}>
        <div
          className={`w-full bg-[#F4F6F8] border transition-all rounded-full px-3 sm:px-4 py-2 flex items-center justify-between text-sm min-w-0 ${
            isSearchFocused
              ? 'border-[#049FD9] ring-2 ring-[#049FD9]/15 bg-white'
              : 'border-[#E5E5E5] hover:border-[#CCCCCC]'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <SearchIcon
              className={`w-4 h-4 shrink-0 transition-colors ${
                isSearchFocused ? 'text-[#049FD9]' : 'text-[#595959]'
              }`}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchFocused(true);
              }}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsSearchFocused(false);
                  searchInputRef.current?.blur();
                }
              }}
              placeholder="Search projects, tasks, employees, files..."
              className="w-full bg-transparent text-xs sm:text-sm text-[#222222] font-medium placeholder-[#8C8C8C] focus:outline-none"
            />
          </div>

          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="text-[#8C8C8C] hover:text-[#222222] text-xs font-bold px-1.5 py-0.5 shrink-0 transition-colors cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search Results Dropdown - Directly attached below search input */}
        {isSearchFocused && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl border border-[#E5E5E5] shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150 font-sans">
            <div className="p-2 max-h-80 overflow-y-auto space-y-1">
              {filteredResults.length > 0 ? (
                filteredResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (onNavigate) {
                        onNavigate(item.tab);
                      }
                      setIsSearchFocused(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#F4F6F8] rounded-lg text-left transition-colors cursor-pointer group"
                  >
                    <span className="text-xs font-medium text-[#222222] group-hover:text-[#049FD9] transition-colors truncate">
                      {item.label}
                    </span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#F4F6F8] text-[#595959] border border-[#E5E5E5] shrink-0 ml-2">
                      {item.type}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-[#8C8C8C] font-medium">
                  No results found for &ldquo;{searchQuery}&rdquo;
                </div>
              )}
            </div>
            <div className="px-3 py-2 bg-[#F8FAFC] border-t border-[#E5E5E5] flex items-center justify-between text-[11px] text-[#64748B] font-medium">
              <span>Quick navigation</span>
              <span>Press <kbd className="bg-white border border-[#E2E8F0] px-1 rounded font-mono text-[10px]">ESC</kbd> to close</span>
            </div>
          </div>
        )}
      </div>

      {/* Right section: Create New + Notifications + User Avatar */}
      <div className="flex items-center gap-2 sm:gap-3 relative shrink-0" ref={profileRef}>
        <button
          onClick={onOpenCreateModal}
          className="btn-primary"
        >
          <span>Create New</span>
        </button>

        {/* Bell Notifications */}
        <button
          onClick={onToggleNotifications}
          className="relative p-2 text-[#595959] hover:text-[#222222] hover:bg-[#F4F6F8] rounded-full transition-colors shrink-0"
        >
          <BellIcon className="w-5 h-5" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-[#EF4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadNotifications}
            </span>
          )}
        </button>

        {/* User Profile Trigger */}
        <div
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className="flex items-center gap-2 pl-2 border-l border-[#E5E5E5] cursor-pointer hover:opacity-90 select-none py-1 min-w-0"
        >
          <div className="w-8 h-8 rounded-full bg-[#049FD9] text-white font-extrabold flex items-center justify-center text-sm shadow-xs border border-[#E5E5E5] shrink-0">
            {userAvatar}
          </div>
          <div className="hidden md:block text-left leading-tight min-w-0 max-w-[140px] xl:max-w-none">
            <div className="font-bold text-xs text-[#222222] truncate">{userName}</div>
            <div className="text-[11px] text-[#595959] font-medium truncate">
              {currentRole === 'employee' ? 'Product Designer' : 'Workspace Admin'}
            </div>
          </div>
          <svg className={`w-3.5 h-3.5 text-[#595959] transition-transform shrink-0 ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Profile Dropdown Menu */}
        {isProfileOpen && (
          <div className="absolute right-0 top-14 w-60 bg-white rounded-xl border border-[#E5E5E5] shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-[#222222]">
            <div className="p-4 border-b border-[#E5E5E5] bg-[#F4F6F8]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#049FD9] text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                  {userAvatar}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-[#222222] truncate">{userName}</div>
                  <div className="text-xs text-[#595959] truncate">{userEmail}</div>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-[#FFFFFF] text-[#222222] uppercase border border-[#CCCCCC]">
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
                onClick={handleLogoutClick}
                className="w-full text-left px-3 py-2 rounded-lg text-[#EF4444] hover:bg-[#FEF2F2] flex items-center gap-2.5 transition-colors font-bold cursor-pointer"
              >
                <span>🚪 Log out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Profile Settings Modal */}
      {isProfileModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsProfileModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans text-left"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
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
                    {currentRole === 'admin' ? 'Workspace Administrator' : 'Team Member / Employee'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E5E5E5]">
                <p className="text-[11px] text-[#595959]">
                  To change your password, use the <strong>Forgot Password</strong> link on the sign-in screen to receive a secure single-use recovery code.
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans text-left"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
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
    </header>
  );
};
