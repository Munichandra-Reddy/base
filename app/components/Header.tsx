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
