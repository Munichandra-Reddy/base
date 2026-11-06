'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SearchIcon, BellIcon } from './Icons';

interface HeaderProps {
  onOpenCreateModal: () => void;
  onOpenSearchModal: () => void;
  onToggleNotifications: () => void;
  unreadNotifications: number;
  onLogout?: () => void;
  currentUser?: { email: string; fullName: string; companyName: string } | null;
  currentRole?: 'admin' | 'employee';
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCreateModal,
  onOpenSearchModal,
  onToggleNotifications,
  unreadNotifications,
  onLogout,
  currentUser,
  currentRole = 'admin',
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const userName = currentUser?.fullName || (currentRole === 'employee' ? 'Employee' : 'Muni');
  const userEmail = currentUser?.email || (currentRole === 'employee' ? 'employee@company.com' : 'cr7156816@gmail.com');
  const userAvatar = (userName[0] || (currentRole === 'employee' ? 'E' : 'M')).toUpperCase();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
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

  return (
    <header className="h-[72px] w-full bg-white border-b border-[#E5E5E5] px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-xs text-[#222222]">
      {/* Left section: Clean Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center font-black text-2xl text-[#011826] tracking-tight cursor-pointer">
          <span className="text-[#011826]">WorkOrbit</span>
        </div>
      </div>

      {/* Middle section: Global Search Bar */}
      <div className="flex-1 max-w-md xl:max-w-lg mx-2 sm:mx-6 min-w-0">
        <button
          onClick={onOpenSearchModal}
          className="w-full bg-[#F4F6F8] hover:bg-[#EBF0F5] border border-[#E5E5E5] rounded-full px-3 sm:px-4 py-2 flex items-center justify-between text-[#595959] text-sm transition-all group min-w-0"
        >
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <SearchIcon className="w-4 h-4 text-[#595959] group-hover:text-[#222222] shrink-0" />
            <span className="text-[#595959] font-medium text-xs sm:text-sm truncate">Search projects, tasks, employees, files...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-1 bg-white border border-[#E5E5E5] text-[#595959] text-xs font-mono font-semibold px-2 py-0.5 rounded shadow-2xs shrink-0 ml-1">
            ⌘F / Ctrl+K
          </kbd>
        </button>
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

            <div className="p-1.5 text-xs font-semibold text-[#595959]">
              <button
                onClick={handleLogoutClick}
                className="w-full text-left px-3 py-2 rounded-xl text-[#EF4444] hover:bg-[#FEF2F2] flex items-center gap-2.5 transition-colors font-bold"
              >
                <span>🚪 Log out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
