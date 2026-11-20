'use client';

import React, { useState, useMemo } from 'react';
import { Person, EmployeeStatus, AccessRole } from '@/lib/types';
import { deduplicateEmployees } from '@/lib/firebaseServices';
import { UsersIcon, PlusIcon } from './Icons';

interface PeopleViewProps {
  people: Person[];
  onOpenAddEmployee?: () => void;
  isAdmin?: boolean;
  onUpdateEmployee?: (email: string, updates: Partial<Person>) => Promise<any> | void;
  onDeleteEmployee?: (email: string) => Promise<any> | void;
}

export const PeopleView: React.FC<PeopleViewProps> = ({
  people,
  onOpenAddEmployee,
  isAdmin = false,
  onUpdateEmployee,
  onDeleteEmployee,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [viewingPerson, setViewingPerson] = useState<Person | null>(null);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [deactivatingPerson, setDeactivatingPerson] = useState<Person | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editDepartment, setEditDepartment] = useState('Engineering');
  const [editPhone, setEditPhone] = useState('');
  const [editAccessRole, setEditAccessRole] = useState<AccessRole>('employee');

  // Action status feedback
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const displayPeople = useMemo(() => {
    let list = deduplicateEmployees(people || []);

    if (statusFilter !== 'all') {
      list = list.filter((p) => (p.status || 'active').toLowerCase() === statusFilter.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.employeeId && p.employeeId.toLowerCase().includes(q)) ||
          (p.role && p.role.toLowerCase().includes(q)) ||
          (p.department && p.department.toLowerCase().includes(q))
      );
    }

    return list;
  }, [people, statusFilter, searchQuery]);

  // Status badge styling helper
  const renderStatusBadge = (status?: EmployeeStatus | string) => {
    const s = (status || 'active').toLowerCase();
    if (s === 'invited') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#B45309] border border-[#F59E0B]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
          Invited
        </span>
      );
    }
    if (s === 'active') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#10B981] border border-[#10B981]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          Active
        </span>
      );
    }
    if (s === 'inactive') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
          Inactive
        </span>
      );
    }
    if (s === 'suspended') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF2F2] text-[#EF4444] border border-[#EF4444]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
          Suspended
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#10B981] border border-[#10B981]/30">
        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
        {status}
      </span>
    );
  };

  // Role badge helper
  const renderRoleBadge = (role?: AccessRole | string) => {
    const r = (role || 'employee').toLowerCase();
    if (r === 'admin') {
      return (
        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]">
          Admin
        </span>
      );
    }
    return (
      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F0F9FF] text-[#0284C7] border border-[#BAE6FD]">
        Employee
      </span>
    );
  };

  // Open Edit Modal
  const handleOpenEdit = (person: Person) => {
    setEditingPerson(person);
    setEditName(person.name);
    setEditDesignation(person.role || person.designation || 'Team Member');
    setEditDepartment(person.department || 'Engineering');
    setEditPhone(person.phone || '');
    setEditAccessRole((person.accessRole || 'employee') as AccessRole);
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerson) return;
    setIsProcessing(true);

    const updates: Partial<Person> = {
      name: editName.trim(),
      role: editDesignation.trim(),
      designation: editDesignation.trim(),
      department: editDepartment.trim(),
      phone: editPhone.trim(),
      accessRole: editAccessRole,
    };

    try {
      if (onUpdateEmployee) {
        await onUpdateEmployee(editingPerson.email, updates);
      }
      setActionNotice({ type: 'success', message: `Profile for ${editName} updated successfully.` });
      setEditingPerson(null);
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Failed to update employee.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Action: Resend Invitation
  const handleResendInvitation = async (person: Person) => {
    setIsProcessing(true);
    setActionNotice(null);
    try {
      const res = await fetch('/api/employees/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: person.email }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({
          type: 'success',
          message: `Invitation email resent successfully to ${person.email}!`,
        });
        if (onUpdateEmployee) {
          onUpdateEmployee(person.email, { status: 'invited', invitedAt: new Date().toISOString() });
        }
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Failed to resend invitation.' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Network error resending invitation.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Action: Deactivate Employee
  const handleDeactivate = async () => {
    if (!deactivatingPerson) return;
    setIsProcessing(true);
    setActionNotice(null);

    try {
      const res = await fetch('/api/employees/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: deactivatingPerson.email, status: 'inactive' }),
      });
      const data = await res.json();

      if (data.success) {
        setActionNotice({
          type: 'success',
          message: `Employee "${deactivatingPerson.name}" deactivated. Account access is revoked; task/project history is preserved.`,
        });
        if (onUpdateEmployee) {
          onUpdateEmployee(deactivatingPerson.email, { status: 'inactive' });
        }
        setDeactivatingPerson(null);
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Failed to deactivate employee.' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Network error deactivating employee.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Action: Reactivate Employee
  const handleReactivate = async (person: Person) => {
    setIsProcessing(true);
    setActionNotice(null);
    try {
      const res = await fetch('/api/employees/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: person.email, status: 'active' }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({
          type: 'success',
          message: `Employee "${person.name}" reactivated successfully! Workspace access is restored.`,
        });
        if (onUpdateEmployee) {
          onUpdateEmployee(person.email, { status: 'active' });
        }
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Failed to reactivate employee.' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Network error reactivating employee.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Action: Reset Password
  const handleResetPassword = async (person: Person) => {
    setIsProcessing(true);
    setActionNotice(null);
    try {
      const res = await fetch('/api/auth/send-reset-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: person.email, role: person.accessRole || 'employee' }),
      });
      const data = await res.json();
      if (data.success) {
        setActionNotice({
          type: 'success',
          message: `Password reset email sent to ${person.email}!`,
        });
      } else {
        setActionNotice({ type: 'error', message: data.error || data.message || 'Failed to send reset email.' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Network error sending password reset.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5 font-sans w-full">
      {/* Top Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-lg border border-[#E5E5E5] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#111827]">Workspace Employees Directory</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F4F6F8] text-[#049FD9] border border-[#E5E5E5]">
              {displayPeople.length} {displayPeople.length === 1 ? 'member' : 'members'}
            </span>
          </div>
          <p className="text-[#595959] text-xs font-normal mt-1">
            Manage employee accounts, access roles, account invitations, and workspace permissions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#F4F6F8] border border-[#E5E5E5] rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'table' ? 'bg-white text-[#111827] shadow-2xs font-semibold' : 'text-[#595959] hover:text-[#111827]'
              }`}
            >
              Table View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'grid' ? 'bg-white text-[#111827] shadow-2xs font-semibold' : 'text-[#595959] hover:text-[#111827]'
              }`}
            >
              Cards
            </button>
          </div>

          {isAdmin && onOpenAddEmployee && (
            <button
              onClick={onOpenAddEmployee}
              className="btn-primary shrink-0 flex items-center gap-1.5 text-xs py-2 px-3.5"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-lg text-xs font-semibold flex items-center justify-between animate-in fade-in duration-150 ${
            actionNotice.type === 'success'
              ? 'bg-[#F0FDF4] border border-[#16A34A]/30 text-[#16A34A]'
              : 'bg-[#FEF2F2] border border-[#EF4444]/30 text-[#EF4444]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{actionNotice.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{actionNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-[#E5E5E5] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search by name, email, ID, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9] focus:bg-white transition-all"
          />
          <svg
            className="w-4 h-4 text-[#94A3B8] absolute left-2.5 top-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto text-xs">
          {['all', 'active', 'invited', 'inactive', 'suspended'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1 rounded-md capitalize transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-[#011826] text-white font-bold shadow-2xs'
                  : 'bg-[#F4F6F8] text-[#595959] hover:text-[#111827] font-medium'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* TABLE VIEW (Standard Enterprise Display) */}
      {viewMode === 'table' && displayPeople && displayPeople.length > 0 && (
        <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5E5E5] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Access Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Joining Date</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5] font-medium text-[#334155]">
                {displayPeople.map((person) => {
                  const empId = person.employeeId || person.id || 'EMP-1001';
                  const designation = person.role || person.designation || 'Team Member';
                  const dept = person.department || 'Engineering';
                  const status = person.status || 'active';
                  const joining = person.joiningDate || (person.createdAt ? person.createdAt.split('T')[0] : '2026-11-20');

                  return (
                    <tr key={person.id || person.email} className="hover:bg-[#F8FAFC] transition-colors">
                      {/* 1. Employee ID */}
                      <td className="py-3 px-4 font-mono font-bold text-[#049FD9] whitespace-nowrap">
                        {empId}
                      </td>

                      {/* 2. Employee Name */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full ${person.avatarBg || 'bg-[#049FD9] text-white'} font-bold text-xs flex items-center justify-center shrink-0`}
                          >
                            {person.avatar}
                          </div>
                          <span className="font-bold text-[#111827]">{person.name}</span>
                        </div>
                      </td>

                      {/* 3. Email */}
                      <td className="py-3 px-4 text-[#64748B] font-mono text-[11px] whitespace-nowrap">
                        {person.email}
                      </td>

                      {/* 4. Department */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] font-semibold text-[11px]">
                          {dept}
                        </span>
                      </td>

                      {/* 5. Designation */}
                      <td className="py-3 px-4 whitespace-nowrap text-[#111827] font-semibold">
                        {designation}
                      </td>

                      {/* 6. Access Role */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderRoleBadge(person.accessRole || (person.role === 'admin' ? 'admin' : 'employee'))}
                      </td>

                      {/* 7. Account Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderStatusBadge(status)}
                      </td>

                      {/* 8. Joining Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-[#64748B]">
                        {joining}
                      </td>

                      {/* 9. Actions Menu (Admin Only) */}
                      {isAdmin && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Dossier */}
                            <button
                              type="button"
                              onClick={() => setViewingPerson(person)}
                              className="px-2 py-1 rounded bg-[#F4F6F8] hover:bg-[#E5E5E5] text-[#111827] text-[11px] font-semibold cursor-pointer transition-colors"
                              title="View Employee Dossier"
                            >
                              View
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(person)}
                              className="px-2 py-1 rounded bg-[#F0F9FF] hover:bg-[#E0F2FE] text-[#0284C7] text-[11px] font-semibold cursor-pointer transition-colors"
                              title="Edit Employee Information"
                            >
                              Edit
                            </button>

                            {/* Resend Invite (If invited) */}
                            {status === 'invited' && (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleResendInvitation(person)}
                                className="px-2 py-1 rounded bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] text-[11px] font-bold cursor-pointer transition-colors"
                                title="Resend Invitation Email"
                              >
                                Resend
                              </button>
                            )}

                            {/* Reset Password */}
                            {status === 'active' && (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleResetPassword(person)}
                                className="px-2 py-1 rounded bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#475569] text-[11px] font-medium cursor-pointer transition-colors"
                                title="Send Password Reset Email"
                              >
                                Reset Pwd
                              </button>
                            )}

                            {/* Deactivate / Reactivate */}
                            {status === 'active' || status === 'invited' ? (
                              <button
                                type="button"
                                onClick={() => setDeactivatingPerson(person)}
                                className="px-2 py-1 rounded bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#EF4444] text-[11px] font-semibold cursor-pointer transition-colors"
                                title="Deactivate Employee Account"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleReactivate(person)}
                                className="px-2 py-1 rounded bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#10B981] text-[11px] font-semibold cursor-pointer transition-colors"
                                title="Reactivate Employee Account"
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GRID / CARD VIEW */}
      {viewMode === 'grid' && displayPeople && displayPeople.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {displayPeople.map((person) => {
            const empId = person.employeeId || person.id || 'EMP-1001';
            const designation = person.role || person.designation || 'Team Member';
            const dept = person.department || 'Engineering';
            const status = person.status || 'active';

            return (
              <div
                key={person.id || person.email}
                className="bg-white rounded-lg border border-[#E5E5E5] p-4 shadow-2xs space-y-3 hover:border-[#049FD9] transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full ${person.avatarBg || 'bg-[#049FD9] text-white'} font-bold text-xs flex items-center justify-center shrink-0`}
                    >
                      {person.avatar}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-[#111827] truncate" title={person.name}>
                        {person.name}
                      </h3>
                      <p className="text-[11px] font-semibold text-[#049FD9] font-mono">
                        {empId}
                      </p>
                    </div>
                  </div>
                  {renderRoleBadge(person.accessRole || (person.role === 'admin' ? 'admin' : 'employee'))}
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="text-[#111827] font-semibold truncate" title={designation}>
                    {designation}
                  </div>
                  <div className="text-[#64748B] text-[10px] truncate" title={person.email}>
                    {person.email}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] text-[10px] font-semibold">
                      {dept}
                    </span>
                    {renderStatusBadge(status)}
                  </div>
                </div>

                {isAdmin && (
                  <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      onClick={() => setViewingPerson(person)}
                      className="text-[#049FD9] hover:underline font-semibold cursor-pointer"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(person)}
                      className="text-[#0284C7] hover:underline font-semibold cursor-pointer"
                    >
                      Edit
                    </button>
                    {status === 'invited' ? (
                      <button
                        type="button"
                        onClick={() => handleResendInvitation(person)}
                        className="text-[#B45309] hover:underline font-semibold cursor-pointer"
                      >
                        Resend
                      </button>
                    ) : status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => setDeactivatingPerson(person)}
                        className="text-[#EF4444] hover:underline font-semibold cursor-pointer"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReactivate(person)}
                        className="text-[#10B981] hover:underline font-semibold cursor-pointer"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {(!displayPeople || displayPeople.length === 0) && (
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-10 text-center space-y-2 shadow-2xs">
          <div className="w-10 h-10 rounded-lg bg-[#F4F6F8] text-[#595959] flex items-center justify-center mx-auto">
            <UsersIcon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-[#111827]">No employees match your filter</h3>
          <p className="text-xs text-[#6B7280] max-w-md mx-auto">
            Try adjusting your search query or status filter to see other workspace members.
          </p>
        </div>
      )}

      {/* MODAL 1: VIEW EMPLOYEE DOSSIER */}
      {viewingPerson && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingPerson(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${viewingPerson.avatarBg || 'bg-[#049FD9] text-white'} font-bold flex items-center justify-center text-sm`}>
                  {viewingPerson.avatar}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827]">{viewingPerson.name}</h3>
                  <p className="text-xs text-[#049FD9] font-mono font-bold">{viewingPerson.employeeId || viewingPerson.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingPerson(null)}
                className="w-7 h-7 rounded-md bg-[#F4F6F8] text-[#595959] hover:text-[#111827] flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <div>
                  <span className="text-[#64748B] block text-[10px]">Account Status</span>
                  <div className="mt-1">{renderStatusBadge(viewingPerson.status)}</div>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px]">Access Role</span>
                  <div className="mt-1">{renderRoleBadge(viewingPerson.accessRole || (viewingPerson.role === 'admin' ? 'admin' : 'employee'))}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                  <span className="text-[#64748B]">Work Email:</span>
                  <span className="font-semibold text-[#111827]">{viewingPerson.email}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                  <span className="text-[#64748B]">Designation:</span>
                  <span className="font-semibold text-[#111827]">{viewingPerson.role || viewingPerson.designation || 'Team Member'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                  <span className="text-[#64748B]">Department:</span>
                  <span className="font-semibold text-[#111827]">{viewingPerson.department || 'Engineering'}</span>
                </div>
                {viewingPerson.phone && (
                  <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                    <span className="text-[#64748B]">Phone Number:</span>
                    <span className="font-semibold text-[#111827]">{viewingPerson.phone}</span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 border-b border-[#F1F5F9]">
                  <span className="text-[#64748B]">Joining Date:</span>
                  <span className="font-semibold text-[#111827]">{viewingPerson.joiningDate || (viewingPerson.createdAt ? viewingPerson.createdAt.split('T')[0] : '2026-11-20')}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#64748B]">Active Projects Assigned:</span>
                  <span className="font-semibold text-[#111827]">{viewingPerson.projectsCount || 1}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
              <button
                type="button"
                onClick={() => setViewingPerson(null)}
                className="btn-primary py-2 px-4 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT EMPLOYEE */}
      {editingPerson && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingPerson(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div>
                <h3 className="text-base font-bold text-[#111827]">Edit Employee Profile</h3>
                <p className="text-xs text-[#595959]">{editingPerson.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPerson(null)}
                className="w-7 h-7 rounded-md bg-[#F4F6F8] text-[#595959] hover:text-[#111827] flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Designation / Job Title</label>
                <input
                  type="text"
                  required
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Department</label>
                  <select
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Product">Product</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                    <option value="Customer Support">Customer Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Access Role</label>
                  <select
                    value={editAccessRole}
                    onChange={(e) => setEditAccessRole(e.target.value as AccessRole)}
                    className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 000-0000"
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setEditingPerson(null)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="btn-primary text-xs"
                >
                  {isProcessing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DEACTIVATE EMPLOYEE CONFIRMATION */}
      {deactivatingPerson && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeactivatingPerson(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="pb-2 border-b border-[#E5E5E5]">
              <h3 className="text-base font-bold text-[#EF4444]">Deactivate Employee Account</h3>
              <p className="text-xs text-[#595959] mt-0.5">
                Revoke access to the workspace without deleting project records.
              </p>
            </div>

            <div className="p-3.5 bg-[#FEF2F2] rounded-lg border border-[#FCA5A5] text-xs text-[#991B1B] space-y-2">
              <p>
                Are you sure you want to deactivate <strong>{deactivatingPerson.name}</strong> ({deactivatingPerson.email})?
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#7F1D1D]">
                <li>Future workspace logins will be immediately blocked.</li>
                <li>Authentication refresh tokens and sessions will be revoked.</li>
                <li>All historical tasks, check-ins, and project contributions remain preserved.</li>
                <li>You can reactivate this employee account at any time.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeactivatingPerson(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleDeactivate}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-[#EF4444] text-white hover:bg-[#DC2626] transition-colors cursor-pointer"
              >
                {isProcessing ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
