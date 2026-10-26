'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SearchIcon, BellIcon } from './Icons';

export interface WorkspaceItem {
  id: string;
  name: string;
  plan: string;
}

const defaultWorkspaces: WorkspaceItem[] = [
  { id: 'ws-1', name: 'ABC Technologies', plan: 'PRO' },
  { id: 'ws-2', name: 'Acme Dev Studio', plan: 'FREE' },
  { id: 'ws-3', name: 'Global Operations', plan: 'ENTERPRISE' },
];

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
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>(defaultWorkspaces);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('ws-1');

  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspacePlan, setNewWorkspacePlan] = useState('PRO');

  const workspaceRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const userName = currentUser?.fullName || (currentRole === 'employee' ? 'Employee' : 'Muni');
  const userEmail = currentUser?.email || (currentRole === 'employee' ? 'employee@company.com' : 'cr7156816@gmail.com');
  const userAvatar = (userName[0] || (currentRole === 'employee' ? 'E' : 'M')).toUpperCase();

  // Load persisted localStorage state strictly after initial client mount to prevent SSR hydration errors
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workorbit_workspaces');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) setWorkspaces(parsed);
        } catch (e) {}
      }

      const savedId = localStorage.getItem('workorbit_active_workspace_id');
      if (savedId) setActiveWorkspaceId(savedId);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (workspaceRef.current && !workspaceRef.current.contains(event.target as Node)) {
        setIsWorkspaceOpen(false);
        setIsCreatingWorkspace(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || defaultWorkspaces[0];

  const displayWorkspaceName = currentUser?.companyName || activeWorkspace.name;

  const handleSelectWorkspace = (ws: WorkspaceItem) => {
    setActiveWorkspaceId(ws.id);
    setIsWorkspaceOpen(false);
    setIsCreatingWorkspace(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('workorbit_active_workspace_id', ws.id);
    }
  };

  const handleAddWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    const newWs: WorkspaceItem = {
      id: `ws-${Date.now()}`,
      name: newWorkspaceName.trim(),
      plan: newWorkspacePlan,
    };

    const updated = [...workspaces, newWs];
    setWorkspaces(updated);
    setActiveWorkspaceId(newWs.id);
    setNewWorkspaceName('');
    setIsCreatingWorkspace(false);
    setIsWorkspaceOpen(false);

    if (typeof window !== 'undefined') {
      localStorage.setItem('workorbit_workspaces', JSON.stringify(updated));
      localStorage.setItem('workorbit_active_workspace_id', newWs.id);
    }
  };

  const handleLogoutClick = () => {
    setIsProfileOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      alert('You have logged out of WorkOrbit.');
    }
  };

  return (
    <header className="h-[72px] bg-[#011826] border-b border-[#0d314d] px-6 flex items-center justify-between shrink-0 z-30 shadow-sm text-white">
      {/* Left section: Clean Title + Workspace Dropdown */}
      <div className="flex items-center gap-4">
        <div className="flex items-center font-black text-2xl text-white tracking-tight cursor-pointer">
          <span className="text-white">WorkOrbit</span>
        </div>

        {/* Organization / Workspace selector */}
        <div className="relative" ref={workspaceRef}>
          <button
            type="button"
            onClick={() => {
              setIsWorkspaceOpen(!isWorkspaceOpen);
              setIsProfileOpen(false);
            }}
            className="flex items-center gap-2.5 px-3 py-1.5 bg-[#082236] border border-[#0d314d] rounded-xl text-sm text-white font-semibold hover:bg-[#0c2f4a] transition-colors cursor-pointer ml-2 focus:outline-none"
          >
            <span suppressHydrationWarning>{displayWorkspaceName}</span>
            <span
              suppressHydrationWarning
              className="text-[10px] font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-[#011826] text-slate-200 uppercase border border-[#0d314d]"
            >
              {activeWorkspace.plan}
            </span>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                isWorkspaceOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Workspace Dropdown Menu */}
          {isWorkspaceOpen && (
            <div className="absolute left-2 top-12 w-72 bg-white rounded-2xl border border-[#E5E5E5] shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-[#222222]">
              <div className="p-3 border-b border-[#E5E5E5] bg-[#F4F6F8] flex items-center justify-between">
                <span className="text-xs font-bold text-[#595959] uppercase tracking-wider">
                  Workspaces ({workspaces.length})
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingWorkspace(!isCreatingWorkspace)}
                  className="text-xs font-bold text-[#049FD9] hover:text-[#238823] flex items-center gap-1 hover:underline"
                >
                  {isCreatingWorkspace ? 'Cancel' : '+ Add Workspace'}
                </button>
              </div>

              {isCreatingWorkspace && (
                <form onSubmit={handleAddWorkspace} className="p-3 space-y-3 bg-[#F4F6F8]/60 border-b border-[#E5E5E5]">
                  <div className="text-xs font-bold text-[#222222]">Create New Workspace</div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#595959] mb-1">Workspace Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Corp"
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-lg focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] font-medium text-[#222222]"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#595959] mb-1">Plan</label>
                    <select
                      value={newWorkspacePlan}
                      onChange={(e) => setNewWorkspacePlan(e.target.value)}
                      className="w-full text-xs px-2 py-1.5 bg-white border border-[#E5E5E5] rounded-lg focus:outline-none focus:border-[#049FD9] font-medium text-[#222222]"
                    >
                      <option value="PRO">PRO</option>
                      <option value="FREE">FREE</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCreatingWorkspace(false)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#595959] hover:bg-[#E5E5E5] rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-bold text-white bg-[#011826] hover:bg-[#082236] rounded-md shadow-2xs"
                    >
                      Add Workspace
                    </button>
                  </div>
                </form>
              )}

              <div className="p-1.5 space-y-1 max-h-60 overflow-y-auto">
                {workspaces.map((ws) => {
                  const isSelected = ws.id === activeWorkspace.id;
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => handleSelectWorkspace(ws)}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-[#F4F6F8] text-[#222222] font-bold border border-[#CCCCCC]'
                          : 'hover:bg-[#F4F6F8] text-[#595959] font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="truncate text-xs">{ws.name}</span>
                        <span className="text-[9px] font-black tracking-wider px-1.5 py-0.2 rounded bg-[#FFFFFF] text-[#595959] uppercase border border-[#E5E5E5]">
                          {ws.plan}
                        </span>
                      </div>
                      {isSelected && (
                        <svg className="w-4 h-4 text-[#049FD9] shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              {!isCreatingWorkspace && (
                <div className="p-2 border-t border-[#E5E5E5] bg-[#F4F6F8]/60">
                  <button
                    type="button"
                    onClick={() => setIsCreatingWorkspace(true)}
                    className="w-full py-2 px-3 text-xs font-bold text-[#222222] hover:bg-[#F4F6F8] border border-dashed border-[#CCCCCC] rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Add New Workspace</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Middle section: Global Search Bar */}
      <div className="flex-1 max-w-lg mx-6">
        <button
          onClick={onOpenSearchModal}
          className="w-full bg-[#082236] hover:bg-[#0c2f4a] border border-[#0d314d] rounded-full px-4 py-2 flex items-center justify-between text-slate-300 text-sm transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <SearchIcon className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
            <span className="text-slate-300 font-medium">Search projects, tasks, employees, files...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-1 bg-[#011826] border border-[#0d314d] text-slate-300 text-xs font-mono font-semibold px-2 py-0.5 rounded shadow-2xs">
            ⌘F / Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right section: Create New + Notifications + User Avatar */}
      <div className="flex items-center gap-3 relative" ref={profileRef}>
        <button
          onClick={onOpenCreateModal}
          className="px-4 py-2 text-sm font-bold text-white bg-[#6CC04A] hover:bg-[#5bb33b] active:bg-[#4ea230] rounded-md shadow-sm flex items-center transition-colors"
        >
          <span>Create New</span>
        </button>

        {/* Bell Notifications */}
        <button
          onClick={onToggleNotifications}
          className="relative p-2 text-slate-300 hover:text-white hover:bg-[#082236] rounded-full transition-colors"
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
          onClick={() => {
            setIsProfileOpen(!isProfileOpen);
            setIsWorkspaceOpen(false);
          }}
          className="flex items-center gap-2 pl-2 border-l border-[#0d314d] cursor-pointer hover:opacity-90 select-none py-1"
        >
          <div className="w-8 h-8 rounded-full bg-[#049FD9] text-white font-extrabold flex items-center justify-center text-sm shadow-xs border border-[#0d314d]">
            {userAvatar}
          </div>
          <div className="hidden md:block text-left leading-tight">
            <div className="font-bold text-xs text-white">{userName}</div>
            <div className="text-[11px] text-slate-400 font-medium">
              {currentRole === 'employee' ? 'Product Designer' : 'Workspace Admin'}
            </div>
          </div>
          <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Profile Dropdown Menu */}
        {isProfileOpen && (
          <div className="absolute right-0 top-14 w-60 bg-white rounded-2xl border border-[#E5E5E5] shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-[#222222]">
            <div className="p-4 border-b border-[#E5E5E5] bg-[#F4F6F8]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#011826] text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
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
