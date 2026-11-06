'use client';

import React, { useState } from 'react';
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
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  tasksCount,
  chatCount,
  storageUsedGB,
  storageTotalGB,
  isAdmin = false,
}) => {
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [showUpgradeNotice, setShowUpgradeNotice] = useState(false);

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
    <>
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

        {/* Bottom Storage & Workspace Plan Card (Clickable to view full details) */}
        <div className="pt-3 border-t border-[#E5E5E5]">
          <div
            onClick={() => setIsPlanModalOpen(true)}
            className="p-2 -mx-1 rounded-lg hover:bg-[#F9FAFB] cursor-pointer transition-colors group"
            title="Click to view subscription and storage details"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-[#111827] mb-1.5">
              <span className="group-hover:text-[#049FD9] transition-colors">Workspace Plan</span>
              <span className="text-[#049FD9] font-medium text-[11px] bg-[#E0F2FE] px-1.5 py-0.5 rounded">Pro Plan</span>
            </div>
            <div className="w-full bg-[#F3F4F6] rounded-full h-1.5 overflow-hidden mb-1.5">
              <div
                className="bg-[#049FD9] h-full rounded-full transition-all duration-500"
                style={{ width: `${storagePercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-normal text-[#6B7280]">
              <span>{storageUsedGB} GB of {storageTotalGB} GB</span>
              <span className="font-medium text-[#049FD9] group-hover:underline">Details &rarr;</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Subscription & Storage Management Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#049FD9]/10 text-[#049FD9] flex items-center justify-center font-bold">
                  <ChartIcon className="w-5 h-5 text-[#049FD9]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#011826]">Workspace Plan & Storage</h3>
                  <p className="text-xs text-gray-500">Overview of subscription tier and cloud capacity</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPlanModalOpen(false);
                  setShowUpgradeNotice(false);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Plan Card */}
              <div className="p-4 rounded-xl border border-[#049FD9]/20 bg-linear-to-br from-[#E0F2FE]/40 to-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-[#011826]">WorkOrbit Pro</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">Annual billing • Renews Oct 14, 2027</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-[#011826]">$49</span>
                  <span className="text-xs text-gray-500"> /month</span>
                </div>
              </div>

              {/* Storage Quota Section */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileIcon className="w-4 h-4 text-[#049FD9]" />
                    <span className="text-xs font-semibold text-[#011826]">Cloud Storage Quota</span>
                  </div>
                  <span className="text-xs font-bold text-[#011826]">
                    {storageUsedGB} GB / {storageTotalGB} GB ({storagePercentage}%)
                  </span>
                </div>

                {/* Multi-segment progress bar */}
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden flex">
                  <div className="bg-[#049FD9] h-full" style={{ width: '42%' }} title="Project Docs: 4.2 GB" />
                  <div className="bg-[#0284C7] h-full" style={{ width: '21%' }} title="Media & Images: 2.1 GB" />
                  <div className="bg-[#38BDF8] h-full" style={{ width: '12%' }} title="Chat Logs & Check-ins: 1.2 GB" />
                </div>

                {/* Legend */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#049FD9]" />
                    <span>Docs (4.2 GB)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" />
                    <span>Media (2.1 GB)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]" />
                    <span>Data (1.2 GB)</span>
                  </div>
                </div>
              </div>

              {/* Team Seats */}
              <div className="p-4 rounded-xl border border-gray-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <UsersIcon className="w-4 h-4 text-gray-600" />
                  <div>
                    <p className="text-xs font-semibold text-[#011826]">Team Member Seats</p>
                    <p className="text-[11px] text-gray-500">4 of 10 member seats utilized</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-md">
                  6 Seats Available
                </span>
              </div>

              {/* Included Features */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Features Included in Pro</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Unlimited Projects & Tasks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Campfire Chat & Channels</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Role-Based Access Control</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Automated Daily Check-ins</span>
                  </div>
                </div>
              </div>

              {showUpgradeNotice && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                  Storage expansion or custom enterprise tiers can be added instantly. Your workspace administrator can configure billing add-ons in Workspace Settings.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              {isAdmin ? (
                <>
                  <button
                    onClick={() => setShowUpgradeNotice(true)}
                    className="text-xs font-semibold text-[#049FD9] hover:underline cursor-pointer"
                  >
                    Add Extra Storage +
                  </button>
                  <button
                    onClick={() => {
                      setIsPlanModalOpen(false);
                      setShowUpgradeNotice(false);
                    }}
                    className="px-4 py-2 bg-[#011826] hover:bg-[#022840] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <span className="text-[11px] text-gray-500">
                    Workspace plan managed by Administrator (Muni)
                  </span>
                  <button
                    onClick={() => setIsPlanModalOpen(false)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
