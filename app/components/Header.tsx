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
  onToggleMobileSidebar?: () => void;
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
  onToggleMobileSidebar,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const quickLinks = [
    { label: 'E-Commerce Homepage Design', type: 'Task', tab: 'tasks' },
    { label: 'Mobile App v2 Architecture', type: 'Project', tab: 'projects' },
    { label: 'Login API Endpoint Spec', type: 'File', tab: 'files' },
    { label: 'Workspace Employees Directory', type: 'People', tab: 'people' },
    { label: 'Daily Standup Campfire', type: 'Chat', tab: 'chat' },
    { label: 'Workspace Productivity Reports', type: 'Reports', tab: 'reports' },
  ];

  const filteredResults = quickLinks.filter(
    (l) =>
      l.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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

  return (
    <header className="h-[72px] w-full bg-white border-b border-[#E5E5E5] px-3 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-xs text-[#222222]">
      {/* Left section: Hamburger (Mobile) + Title */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 -ml-1 text-[#595959] hover:text-[#011826] hover:bg-[#F4F6F8] rounded-lg transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div
          onClick={() => onNavigate && onNavigate('dashboard')}
          className="flex items-center font-black text-xl sm:text-2xl text-[#011826] tracking-tight cursor-pointer select-none"
        >
          <span className="text-[#011826]">WorkOrbit</span>
        </div>
      </div>

      {/* Middle section: Direct Global Search Bar with Live Dropdown */}
      <div className="flex-1 max-w-[130px] min-[400px]:max-w-[180px] sm:max-w-md xl:max-w-lg mx-1.5 sm:mx-6 min-w-0 relative" ref={searchRef}>
        <div
          className={`w-full bg-[#F4F6F8] border transition-all rounded-[4px] px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between text-xs sm:text-sm min-w-0 ${
            isSearchFocused
              ? 'border-[#049FD9] ring-2 ring-[#049FD9]/15 bg-white'
              : 'border-[#E5E5E5] hover:border-[#CCCCCC]'
          }`}
        >
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
            <SearchIcon
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors ${
                isSearchFocused ? 'text-[#049FD9]' : 'text-[#595959]'
              }`}
            />
            <input
              ref={searchInputRef}
              id="global-search"
              name="search"
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
              placeholder="Search..."
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
              className="text-[#8C8C8C] hover:text-[#222222] text-xs font-bold px-1 py-0.5 shrink-0 transition-colors cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search Results Dropdown - Full width on mobile, attached on desktop */}
        {isSearchFocused && (
          <div className="fixed left-3 right-3 sm:absolute sm:left-0 sm:right-0 top-[68px] sm:top-full sm:mt-2 bg-white rounded-[4px] border border-[#E5E5E5] shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150 font-sans">
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

      {/* Right section: Create New + Notifications */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <button
          onClick={onOpenCreateModal}
          className="btn-primary px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-[0.8125rem]"
        >
          <span className="hidden sm:inline">Create New</span>
          <span className="sm:hidden font-bold">+ New</span>
        </button>

        {/* Bell Notifications */}
        <button
          onClick={onToggleNotifications}
          className="relative p-1.5 sm:p-2 text-[#595959] hover:text-[#222222] hover:bg-[#F4F6F8] rounded-full transition-colors shrink-0"
        >
          <BellIcon className="w-5 h-5" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-[#EF4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadNotifications}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
