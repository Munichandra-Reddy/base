'use client';

import React, { useState } from 'react';
import { Person, AuditLog } from '@/lib/types';
import { initialAuditLogs } from '@/lib/data';
import {
  ShieldCheckIcon,
  UsersIcon,
  FolderIcon,
  CheckSquareIcon,
  FileIcon,
  SearchIcon,
  DownloadIcon,
  PlusIcon,
} from './Icons';

interface AdminViewProps {
  people: Person[];
  onOpenAddEmployee?: () => void;
  currentUser?: { email: string; fullName: string; companyName: string } | null;
}

type AdminSubTab = 'team' | 'storage' | 'audit' | 'billing';

export const AdminView: React.FC<AdminViewProps> = ({
  people: initialPeopleList,
  onOpenAddEmployee,
  currentUser,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>('team');
  const [members, setMembers] = useState<Person[]>(initialPeopleList);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);
  const [memberSearch, setMemberSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'manager' | 'member' | 'guest'>('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditCategory, setAuditCategory] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const workspaceName = currentUser?.companyName || 'ABC Technologies';

  const handleRoleChange = (memberId: string, newRole: 'admin' | 'manager' | 'member' | 'guest') => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, roleType: newRole } : m))
    );

    const targetMember = members.find((m) => m.id === memberId);
    if (targetMember) {
      const newLog: AuditLog = {
        id: `log-${Date.now()}`,
        actor: currentUser?.fullName || 'Rahul Kumar',
        actorEmail: currentUser?.email || 'rahul@abctech.com',
        avatar: (currentUser?.fullName?.[0] || 'R').toUpperCase(),
        avatarBg: 'bg-slate-900 text-white',
        action: 'Role Updated',
        target: `${targetMember.name} assigned ${newRole.toUpperCase()} role`,
        category: 'user',
        timestamp: 'Just now',
        ipAddress: '192.168.1.14',
        status: 'success',
      };
      setAuditLogs((prev) => [newLog, ...prev]);
      showToast(`Updated ${targetMember.name}'s role to ${newRole.toUpperCase()}`);
    }
  };

  const handleToggleStatus = (memberId: string) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === memberId) {
          const nextStatus = m.status === 'active' ? 'away' : 'active';
          return { ...m, status: nextStatus };
        }
        return m;
      })
    );
    showToast('Member status updated');
  };

  const handleExportAuditLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `workorbit_audit_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported audit logs JSON');
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.role.toLowerCase().includes(memberSearch.toLowerCase());
    const matchesRole = roleFilter === 'all' || (m.roleType || 'member') === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.actor.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.target.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(auditSearch.toLowerCase());
    const matchesCategory = auditCategory === 'all' || log.category === auditCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0B192C] text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-micro flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black tracking-wider uppercase flex items-center gap-1 shadow-2xs">
              <ShieldCheckIcon className="w-3 h-3 text-emerald-400" />
              Admin Console
            </span>
            <span className="text-xs font-bold text-[#10B981] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-emerald-200">
              Pro Plan • Active
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#0F172A]">{workspaceName} Admin Center</h1>
          <p className="text-xs font-medium text-[#64748B] mt-0.5">
            Role-based permissions (RBAC), team seats, storage quota, and security audit log.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportAuditLogs}
            className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-bold text-[#334155] shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <DownloadIcon className="w-4 h-4 text-[#64748B]" />
            <span>Export Data</span>
          </button>
          {onOpenAddEmployee && (
            <button
              onClick={onOpenAddEmployee}
              className="px-4 py-2 bg-[#0B192C] hover:bg-[#15293F] active:bg-[#0B192C] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>+ Add Member</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Metric Cards (4 Cards Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Team Seats */}
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center">
              <UsersIcon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-[#64748B]">Team Seats</span>
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xl font-black text-[#0F172A]">{members.length}</span>
              <span className="text-[11px] font-bold text-[#64748B]">of 10 Seats Used</span>
            </div>
            <div className="w-full bg-[#EBF0F5] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (members.length / 10) * 100)}%` }}
              />
            </div>
            <div className="text-[10px] font-semibold text-[#10B981] mt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              {Math.max(0, 10 - members.length)} seats available
            </div>
          </div>
        </div>

        {/* Card 2: Workspace Storage */}
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center">
              <FileIcon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-[#64748B]">Storage Quota</span>
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xl font-black text-[#0F172A]">7.5 GB</span>
              <span className="text-[11px] font-bold text-[#64748B]">of 10 GB (75%)</span>
            </div>
            <div className="w-full bg-[#EBF0F5] rounded-full h-1.5 overflow-hidden">
              <div className="bg-[#0B192C] h-full rounded-full" style={{ width: '75%' }} />
            </div>
            <div className="text-[10px] font-semibold text-[#64748B] mt-1.5">
              2.5 GB high-speed cloud space free
            </div>
          </div>
        </div>

        {/* Card 3: Active Projects & Sprints */}
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center">
              <FolderIcon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-[#64748B]">Project Load</span>
          </div>
          <div>
            <div className="text-xl font-black text-[#0F172A] leading-tight">8 Active</div>
            <div className="text-[10px] font-semibold text-[#334155] flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span>4 Completed Sprints</span>
            </div>
          </div>
        </div>

        {/* Card 4: Security & Compliance */}
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-200/60 flex items-center justify-center">
              <ShieldCheckIcon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-[#64748B]">Security Score</span>
          </div>
          <div>
            <div className="text-xl font-black text-[#0F172A] leading-tight">100% Compliant</div>
            <div className="text-[10px] font-semibold text-[#10B981] flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span>2FA Enforced • 0 Alerts</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('team')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'team'
              ? 'bg-[#0B192C] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#EBF0F5]'
          }`}
        >
          <UsersIcon className="w-3.5 h-3.5" />
          <span>Team & Roles (RBAC)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{members.length}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('storage')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'storage'
              ? 'bg-[#0B192C] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#EBF0F5]'
          }`}
        >
          <FileIcon className="w-3.5 h-3.5" />
          <span>Storage & Resources</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'audit'
              ? 'bg-[#0B192C] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#EBF0F5]'
          }`}
        >
          <ShieldCheckIcon className="w-3.5 h-3.5" />
          <span>Audit Logs & Security</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{auditLogs.length}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('billing')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'billing'
              ? 'bg-[#0B192C] text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#EBF0F5]'
          }`}
        >
          <span>💳 Plan & Billing</span>
        </button>
      </div>

      {/* 4. Tab Panels */}

      {/* TAB 1: TEAM & ROLES (RBAC) */}
      {activeSubTab === 'team' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-micro space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#0F172A]">Workspace Members & Roles</h2>
              <p className="text-xs text-[#64748B]">Assign permissions, change authority tiers, and control seat access.</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <SearchIcon className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by name or email..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-[#F1F3F6] rounded-xl text-xs border border-[#E2E8F0] focus:outline-none focus:bg-white text-[#0F172A]"
                />
              </div>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-[#F1F3F6] rounded-xl text-xs font-bold border border-[#E2E8F0] text-[#334155] focus:outline-none"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admins</option>
                <option value="manager">Managers</option>
                <option value="member">Members</option>
                <option value="guest">Guests</option>
              </select>
            </div>
          </div>

          {/* Members Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase pb-2">
                  <th className="pb-3 pr-4">Member</th>
                  <th className="pb-3 pr-4">Role Title</th>
                  <th className="pb-3 pr-4">Access Level (RBAC)</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Projects</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[#334155]">
                {filteredMembers.map((member) => {
                  const roleType = member.roleType || (member.role.toLowerCase().includes('admin') ? 'admin' : 'member');
                  return (
                    <tr key={member.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full ${member.avatarBg} font-extrabold flex items-center justify-center text-xs shrink-0 shadow-2xs`}>
                            {member.avatar}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-[#0F172A] truncate">{member.name}</div>
                            <div className="text-[10px] text-[#64748B] truncate">{member.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 pr-4 text-xs font-semibold text-[#0F172A]">
                        {member.role}
                      </td>

                      <td className="py-3 pr-4">
                        <select
                          value={roleType}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as any)}
                          className="px-2.5 py-1 rounded-lg border border-[#CBD5E1] bg-white text-xs font-bold text-[#0F172A] focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
                        >
                          <option value="admin">🛡️ Admin</option>
                          <option value="manager">💼 Manager</option>
                          <option value="member">👤 Member</option>
                          <option value="guest">👁️ Guest</option>
                        </select>
                      </td>

                      <td className="py-3 pr-4">
                        <button
                          onClick={() => handleToggleStatus(member.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                            member.status === 'active'
                              ? 'bg-[#ECFDF5] text-[#10B981] border-emerald-200 hover:bg-emerald-100'
                              : 'bg-[#FFFBEB] text-[#F59E0B] border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'active' ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`} />
                          <span className="capitalize">{member.status}</span>
                        </button>
                      </td>

                      <td className="py-3 pr-4 text-xs font-semibold text-[#64748B]">
                        {member.projectsCount} projects
                      </td>

                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleRoleChange(member.id, 'guest')}
                          className="text-[11px] font-bold text-[#EF4444] hover:underline cursor-pointer"
                        >
                          Revoke Access
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STORAGE & RESOURCES */}
      {activeSubTab === 'storage' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-micro space-y-4">
            <h2 className="text-base font-black text-[#0F172A]">Storage Utilization Breakdown</h2>
            <p className="text-xs text-[#64748B]">Current usage across project documents, chat uploads, and backups.</p>

            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs font-bold text-[#334155] mb-1">
                  <span>📁 Project Documents & Files</span>
                  <span className="text-[#0F172A]">4.2 GB (56%)</span>
                </div>
                <div className="w-full bg-[#EBF0F5] rounded-full h-2 overflow-hidden">
                  <div className="bg-[#0B192C] h-full rounded-full" style={{ width: '56%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-[#334155] mb-1">
                  <span>💬 Campfire Chat Media & Assets</span>
                  <span className="text-[#0F172A]">2.1 GB (28%)</span>
                </div>
                <div className="w-full bg-[#EBF0F5] rounded-full h-2 overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: '28%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-[#334155] mb-1">
                  <span>📊 Database Records & Task History</span>
                  <span className="text-[#0F172A]">1.2 GB (16%)</span>
                </div>
                <div className="w-full bg-[#EBF0F5] rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: '16%' }} />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between mt-4">
              <span className="text-xs font-bold text-[#334155]">Total Allocated: 10.0 GB</span>
              <span className="text-xs font-extrabold text-[#10B981]">2.5 GB Free</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-micro space-y-4">
            <h2 className="text-base font-black text-[#0F172A]">Resource Management & Cleanup</h2>
            <p className="text-xs text-[#64748B]">Configure file retention limits and cleanup temporary data.</p>

            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-[#0F172A]">File Retention Policy</span>
                  <span className="text-xs font-black text-indigo-600">90 Days</span>
                </div>
                <p className="text-[11px] text-[#64748B]">Auto-archive files from completed projects older than 90 days.</p>
              </div>

              <div className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-[#0F172A]">Database Snapshots</span>
                  <span className="text-xs font-black text-emerald-600">Daily Automated</span>
                </div>
                <p className="text-[11px] text-[#64748B]">Nightly Firestore and asset replication with 30-day rollback.</p>
              </div>
            </div>

            <button
              onClick={() => showToast('Temporary files and cache cleared!')}
              className="w-full py-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F1F3F6] text-xs font-bold text-[#0F172A] shadow-2xs transition-colors cursor-pointer"
            >
              🧹 Clear Temporary Cache & Preview Buffers
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS & SECURITY */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-micro space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#0F172A]">Security & Audit Trail</h2>
              <p className="text-xs text-[#64748B]">Comprehensive log of permission changes, security events, and deletions.</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <SearchIcon className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search audit trail..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-[#F1F3F6] rounded-xl text-xs border border-[#E2E8F0] focus:outline-none focus:bg-white text-[#0F172A]"
                />
              </div>

              <select
                value={auditCategory}
                onChange={(e) => setAuditCategory(e.target.value)}
                className="px-3 py-1.5 bg-[#F1F3F6] rounded-xl text-xs font-bold border border-[#E2E8F0] text-[#334155] focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="security">Security</option>
                <option value="user">User & Roles</option>
                <option value="system">System</option>
                <option value="billing">Billing</option>
                <option value="project">Projects</option>
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase pb-2">
                  <th className="pb-3 pr-4">Timestamp</th>
                  <th className="pb-3 pr-4">Actor</th>
                  <th className="pb-3 pr-4">Action</th>
                  <th className="pb-3 pr-4">Details / Target</th>
                  <th className="pb-3 pr-4">IP / Source</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[#334155]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 pr-4 text-[11px] font-semibold text-[#64748B] whitespace-nowrap">
                      {log.timestamp}
                    </td>

                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full ${log.avatarBg} font-extrabold flex items-center justify-center text-[10px] shrink-0`}>
                          {log.avatar}
                        </div>
                        <span className="font-bold text-xs text-[#0F172A] whitespace-nowrap">{log.actor}</span>
                      </div>
                    </td>

                    <td className="py-3 pr-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#F1F3F6] text-[#0F172A] text-[10px] font-bold uppercase border border-[#E2E8F0]">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 pr-4 font-medium text-xs text-[#0F172A] max-w-xs break-words">
                      {log.target}
                    </td>

                    <td className="py-3 pr-4 text-[11px] text-[#64748B] font-mono">
                      {log.ipAddress || 'Internal'}
                    </td>

                    <td className="py-3 text-right">
                      <span className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981] border border-emerald-200">
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PLAN & BILLING */}
      {activeSubTab === 'billing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Plan */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-micro flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-[#0F172A]">Free Tier</h3>
                <div className="text-2xl font-black text-[#0F172A] mt-2 mb-4">$0 <span className="text-xs font-normal text-[#64748B]">/ month</span></div>
                <ul className="text-xs font-medium text-[#64748B] space-y-2">
                  <li>✓ Up to 3 team members</li>
                  <li>✓ 1 GB Cloud Storage</li>
                  <li>✓ Standard Campfire chat</li>
                </ul>
              </div>
              <button disabled className="mt-6 w-full py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed">
                Free Base
              </button>
            </div>

            {/* Pro Plan (Active) */}
            <div className="bg-white p-6 rounded-2xl border-2 border-indigo-600 shadow-md flex flex-col justify-between relative overflow-hidden">
              <span className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                CURRENT PLAN
              </span>
              <div>
                <h3 className="font-extrabold text-sm text-indigo-600">Pro Organization</h3>
                <div className="text-2xl font-black text-[#0F172A] mt-2 mb-4">$49 <span className="text-xs font-normal text-[#64748B]">/ month</span></div>
                <ul className="text-xs font-semibold text-[#334155] space-y-2">
                  <li>✓ Up to 10 team seats (7 in use)</li>
                  <li>✓ 10 GB High-Speed Cloud Storage</li>
                  <li>✓ Role-based permissions & audit log</li>
                  <li>✓ Unlimited projects & files</li>
                </ul>
              </div>
              <button disabled className="mt-6 w-full py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-extrabold cursor-default">
                Active & Paid • Renews Nov 1, 2026
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-micro flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-[#0F172A]">Enterprise</h3>
                <div className="text-2xl font-black text-[#0F172A] mt-2 mb-4">$199 <span className="text-xs font-normal text-[#64748B]">/ month</span></div>
                <ul className="text-xs font-medium text-[#64748B] space-y-2">
                  <li>✓ Unlimited team members</li>
                  <li>✓ 1 TB Cloud Storage & replication</li>
                  <li>✓ Dedicated account manager & SLA</li>
                  <li>✓ Custom SSO / SAML authentication</li>
                </ul>
              </div>
              <button
                onClick={() => showToast('Enterprise upgrade request submitted to sales.')}
                className="mt-6 w-full py-2 rounded-xl bg-[#0B192C] hover:bg-[#15293F] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                Upgrade to Enterprise
              </button>
            </div>
          </div>

          {/* Billing Receipts */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-micro space-y-3">
            <h3 className="font-extrabold text-sm text-[#0F172A]">Payment & Invoices History</h3>
            <div className="divide-y divide-[#E2E8F0] text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#0F172A]">Invoice #INV-2026-10</div>
                  <div className="text-[11px] text-[#64748B]">Oct 01, 2026 • Visa •••• 4242</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-[#0F172A]">$49.00 USD</span>
                  <button onClick={() => showToast('Receipt downloaded')} className="text-indigo-600 font-bold hover:underline cursor-pointer">
                    Download Receipt
                  </button>
                </div>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#0F172A]">Invoice #INV-2026-09</div>
                  <div className="text-[11px] text-[#64748B]">Sep 01, 2026 • Visa •••• 4242</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-[#0F172A]">$49.00 USD</span>
                  <button onClick={() => showToast('Receipt downloaded')} className="text-indigo-600 font-bold hover:underline cursor-pointer">
                    Download Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
