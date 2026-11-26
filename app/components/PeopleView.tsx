'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Person, EmployeeStatus, AccessRole, Project, Task, EmployeeActivityLog } from '@/lib/types';
import { deduplicateEmployees, DEFAULT_DEPARTMENTS, DEFAULT_DESIGNATIONS } from '@/lib/firebaseServices';
import {
  UsersIcon,
  UserPlusIcon,
  CheckCircleIcon,
  FolderIcon,
  ClockIcon,
  PlusIcon,
  SearchIcon,
  FilterIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  CheckSquareIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
} from './Icons';

interface FilterDropdownProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: Array<{ value: string; label: string }>;
  align?: 'left' | 'right';
  className?: string;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  value,
  onChange,
  options,
  align = 'left',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption =
    options.find((o) => o.value.toLowerCase() === value.toLowerCase()) || options[0];
  const isSelected = value !== 'all' && value !== 'name_asc';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all cursor-pointer whitespace-nowrap select-none ${
          isSelected
            ? 'bg-[#E0F2FE] border-[#049FD9] text-[#0284C7] font-semibold shadow-2xs'
            : 'bg-[#F8FAFC] hover:bg-white border-[#E2E8F0] hover:border-[#CBD5E1] text-[#334155]'
        }`}
      >
        {label && <span className="text-[#64748B] font-semibold">{label}:</span>}
        <span className="truncate max-w-[130px] sm:max-w-[160px]">{selectedOption?.label || value}</span>
        <svg
          className={`w-3.5 h-3.5 text-[#64748B] transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180 text-[#049FD9]' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* DROPDOWN MENU - STRICTLY POSITIONED BELOW WITH top-full mt-1.5 */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 w-max min-w-[190px] max-w-[320px] max-h-60 overflow-y-auto bg-white border border-[#E2E8F0] rounded-lg shadow-xl z-50 py-1 font-sans animate-in fade-in zoom-in-95 duration-100 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          style={{ top: '100%' }}
        >
          {options.map((opt) => {
            const active = opt.value.toLowerCase() === value.toLowerCase();
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#F0F9FF] text-[#0284C7] font-bold'
                    : 'text-[#1F2937] hover:bg-[#F8FAFC]'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {active && <span className="text-[#0284C7] font-bold text-xs shrink-0">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface PeopleViewProps {
  people: Person[];
  projects?: Project[];
  tasks?: Task[];
  onOpenAddEmployee?: () => void;
  isAdmin?: boolean;
  onUpdateEmployee?: (email: string, updates: Partial<Person>) => Promise<any> | void;
  onDeleteEmployee?: (email: string) => Promise<any> | void;
  onNavigateToProjects?: () => void;
}

export const PeopleView: React.FC<PeopleViewProps> = ({
  people,
  projects = [],
  tasks = [],
  onOpenAddEmployee,
  isAdmin = false,
  onUpdateEmployee,
  onDeleteEmployee,
  onNavigateToProjects,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [designationFilter, setDesignationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [joiningDateFilter, setJoiningDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'date_desc' | 'date_asc'>('name_asc');

  // Modals State
  const [viewingPerson, setViewingPerson] = useState<Person | null>(null);
  const [profileActiveTab, setProfileActiveTab] = useState<'overview' | 'projects' | 'tasks' | 'activity'>('overview');
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [deactivatingPerson, setDeactivatingPerson] = useState<Person | null>(null);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptModalTab, setDeptModalTab] = useState<'departments' | 'designations'>('departments');

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editDepartment, setEditDepartment] = useState('Engineering');
  const [editPhone, setEditPhone] = useState('');
  const [editJoiningDate, setEditJoiningDate] = useState('');
  const [editAccessRole, setEditAccessRole] = useState<AccessRole>('employee');

  // Department & Designation Management State
  const [departmentList, setDepartmentList] = useState<Array<{ id: string; name: string; employeeCount?: number }>>([]);
  const [designationList, setDesignationList] = useState<Array<{ id: string; name: string }>>([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDesigName, setNewDesigName] = useState('');
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editingDeptName, setEditingDeptName] = useState('');

  // Activity Logs for Dossier
  const [employeeActivities, setEmployeeActivities] = useState<EmployeeActivityLog[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Notice & Processing
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load Departments and Designations from Backend/Firestore
  const fetchDepartmentsAndDesignations = async () => {
    try {
      const [deptRes, desigRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/designations'),
      ]);
      const deptData = await deptRes.json();
      const desigData = await desigRes.json();

      if (deptData.success && Array.isArray(deptData.departments)) {
        setDepartmentList(deptData.departments);
      } else {
        setDepartmentList(DEFAULT_DEPARTMENTS.map((d) => ({ id: d.toLowerCase(), name: d })));
      }

      if (desigData.success && Array.isArray(desigData.designations)) {
        setDesignationList(desigData.designations);
      } else {
        setDesignationList(DEFAULT_DESIGNATIONS.map((d) => ({ id: d.toLowerCase(), name: d })));
      }
    } catch (e) {
      setDepartmentList(DEFAULT_DEPARTMENTS.map((d) => ({ id: d.toLowerCase(), name: d })));
      setDesignationList(DEFAULT_DESIGNATIONS.map((d) => ({ id: d.toLowerCase(), name: d })));
    }
  };

  useEffect(() => {
    fetchDepartmentsAndDesignations();
  }, []);

  // Fetch Activity Logs when Viewing an Employee
  useEffect(() => {
    if (!viewingPerson?.email) {
      setEmployeeActivities([]);
      return;
    }
    setIsLoadingActivities(true);
    fetch(`/api/activity?email=${encodeURIComponent(viewingPerson.email)}`)
      .then((res) => res.json())
      .then((data) => {
        setIsLoadingActivities(false);
        if (data.success && Array.isArray(data.activities)) {
          setEmployeeActivities(data.activities);
        } else {
          setEmployeeActivities([]);
        }
      })
      .catch(() => {
        setIsLoadingActivities(false);
        setEmployeeActivities([]);
      });
  }, [viewingPerson?.email]);

  // Clean deduplicated list of all real employees
  const deduplicatedList = useMemo(() => {
    return deduplicateEmployees(people || []);
  }, [people]);

  // Dynamic Summary Cards Metrics
  const summaryMetrics = useMemo(() => {
    const total = deduplicatedList.length;
    const active = deduplicatedList.filter((p) => (p.status || 'active').toLowerCase() === 'active').length;
    const inactive = deduplicatedList.filter((p) => {
      const s = (p.status || '').toLowerCase();
      return s === 'inactive' || s === 'suspended';
    }).length;

    // Distinct departments count
    const distinctDepts = new Set(
      deduplicatedList.map((p) => (p.department || 'General').trim().toLowerCase())
    ).size;

    // New Employees: Joined or invited within last 30 days or status is 'invited'
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const newEmployees = deduplicatedList.filter((p) => {
      if ((p.status || '').toLowerCase() === 'invited') return true;
      if (p.joiningDate) {
        const jd = new Date(p.joiningDate).getTime();
        if (!isNaN(jd) && jd >= thirtyDaysAgo) return true;
      }
      if (p.createdAt) {
        const cd = new Date(p.createdAt).getTime();
        if (!isNaN(cd) && cd >= thirtyDaysAgo) return true;
      }
      return false;
    }).length;

    return { total, active, inactive, departments: distinctDepts, newEmployees };
  }, [deduplicatedList]);

  // Filtered & Sorted Employees
  const displayPeople = useMemo(() => {
    let list = [...deduplicatedList];

    // Status Filter
    if (statusFilter !== 'all') {
      list = list.filter((p) => (p.status || 'active').toLowerCase() === statusFilter.toLowerCase());
    }

    // Department Filter
    if (departmentFilter !== 'all') {
      list = list.filter(
        (p) => (p.department || 'General').toLowerCase().trim() === departmentFilter.toLowerCase().trim()
      );
    }

    // Designation Filter
    if (designationFilter !== 'all') {
      list = list.filter((p) => {
        const d = (p.role || p.designation || 'Team Member').toLowerCase().trim();
        return d === designationFilter.toLowerCase().trim();
      });
    }

    // Joining Date Filter
    if (joiningDateFilter !== 'all') {
      const now = Date.now();
      list = list.filter((p) => {
        const dateStr = p.joiningDate || p.createdAt;
        if (!dateStr) return false;
        const dTime = new Date(dateStr).getTime();
        if (isNaN(dTime)) return false;

        if (joiningDateFilter === '30days') {
          return dTime >= now - 30 * 24 * 60 * 60 * 1000;
        }
        if (joiningDateFilter === '90days') {
          return dTime >= now - 90 * 24 * 60 * 60 * 1000;
        }
        if (joiningDateFilter === 'this_year') {
          const currentYear = new Date().getFullYear();
          return new Date(dateStr).getFullYear() === currentYear;
        }
        return true;
      });
    }

    // Search Query (Name, Email, Employee ID, Department, Role)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.employeeId && p.employeeId.toLowerCase().includes(q)) ||
          (p.role && p.role.toLowerCase().includes(q)) ||
          (p.designation && p.designation.toLowerCase().includes(q)) ||
          (p.department && p.department.toLowerCase().includes(q))
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'name_desc') {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === 'date_desc') {
        const da = new Date(a.joiningDate || a.createdAt || 0).getTime();
        const db = new Date(b.joiningDate || b.createdAt || 0).getTime();
        return db - da;
      }
      if (sortBy === 'date_asc') {
        const da = new Date(a.joiningDate || a.createdAt || 0).getTime();
        const db = new Date(b.joiningDate || b.createdAt || 0).getTime();
        return da - db;
      }
      return 0;
    });

    return list;
  }, [deduplicatedList, statusFilter, departmentFilter, designationFilter, joiningDateFilter, searchQuery, sortBy]);

  // Reset all filters helper
  const handleResetFilters = () => {
    setSearchQuery('');
    setDepartmentFilter('all');
    setDesignationFilter('all');
    setStatusFilter('all');
    setJoiningDateFilter('all');
    setSortBy('name_asc');
  };

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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]">
          <ShieldCheckIcon className="w-3 h-3" />
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

  // Open Edit Modal with existing data
  const handleOpenEdit = (person: Person) => {
    setEditingPerson(person);
    setEditName(person.name);
    setEditEmail(person.email);
    setEditDesignation(person.role || person.designation || 'Software Developer');
    setEditDepartment(person.department || 'Engineering');
    setEditPhone(person.phone || '');
    setEditJoiningDate(person.joiningDate || (person.createdAt ? person.createdAt.split('T')[0] : '2026-11-20'));
    setEditAccessRole((person.accessRole || 'employee') as AccessRole);
  };

  // Save Edit (calls /api/employees/update)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerson) return;
    setIsProcessing(true);
    setActionNotice(null);

    try {
      const res = await fetch('/api/employees/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editingPerson.email,
          newEmail: editEmail.trim(),
          name: editName.trim(),
          designation: editDesignation.trim(),
          department: editDepartment.trim(),
          phone: editPhone.trim(),
          joiningDate: editJoiningDate.trim(),
          accessRole: editAccessRole,
        }),
      });

      const data = await res.json();

      if (data.success && data.employee) {
        if (onUpdateEmployee) {
          await onUpdateEmployee(editingPerson.email, data.employee);
        }
        setActionNotice({
          type: 'success',
          message: `Profile for "${editName}" updated successfully in Firestore database!`,
        });
        setEditingPerson(null);
        fetchDepartmentsAndDesignations();
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Failed to update employee.' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Network error updating employee profile.' });
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
          message: `Employee "${deactivatingPerson.name}" deactivated. Account access is revoked; task and project history are preserved.`,
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

  // Add Department handler
  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeptName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewDeptName('');
        fetchDepartmentsAndDesignations();
        setActionNotice({ type: 'success', message: data.message });
      } else {
        setActionNotice({ type: 'error', message: data.error });
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', message: 'Failed to add department.' });
    }
  };

  // Delete Department handler
  const handleDeleteDepartment = async (dept: { id: string; name: string }) => {
    if (!confirm(`Are you sure you want to delete department "${dept.name}"?`)) return;
    try {
      const res = await fetch(`/api/departments?id=${encodeURIComponent(dept.id)}&name=${encodeURIComponent(dept.name)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchDepartmentsAndDesignations();
        setActionNotice({ type: 'success', message: data.message });
      } else {
        setActionNotice({ type: 'error', message: data.error });
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', message: 'Failed to delete department.' });
    }
  };

  // Add Designation handler
  const handleAddDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesigName.trim()) return;
    try {
      const res = await fetch('/api/designations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDesigName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewDesigName('');
        fetchDepartmentsAndDesignations();
        setActionNotice({ type: 'success', message: data.message });
      } else {
        setActionNotice({ type: 'error', message: data.error });
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', message: 'Failed to add designation.' });
    }
  };

  // Delete Designation handler
  const handleDeleteDesignation = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete designation "${name}"?`)) return;
    try {
      const res = await fetch(`/api/designations?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchDepartmentsAndDesignations();
        setActionNotice({ type: 'success', message: data.message });
      } else {
        setActionNotice({ type: 'error', message: data.error });
      }
    } catch (e: any) {
      setActionNotice({ type: 'error', message: 'Failed to delete designation.' });
    }
  };

  // Calculate dynamic tasks and projects for viewingPerson
  const personWorkData = useMemo(() => {
    if (!viewingPerson) {
      return {
        assignedProjects: [],
        assignedTasks: [],
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        completionRate: 100,
      };
    }

    const pName = (viewingPerson.name || '').toLowerCase().trim();
    const pEmail = (viewingPerson.email || '').toLowerCase().trim();
    const pId = (viewingPerson.employeeId || viewingPerson.id || '').toLowerCase().trim();

    // Assigned Projects: Employee is a member or manager or has tasks in the project
    const assignedProjects = (projects || []).filter((pr) => {
      const members = Array.isArray(pr.members) ? pr.members.map((m) => String(m).toLowerCase().trim()) : [];
      const manager = String(pr.manager || '').toLowerCase().trim();
      const hasMemberMatch = members.some((m) => m === pName || m === pEmail || m === pId);
      const isManager = manager === pName || manager === pEmail;
      return hasMemberMatch || isManager;
    });

    // Assigned Tasks
    const assignedTasks = (tasks || []).filter((t) => {
      const assignee = String(t.assignedTo || '').toLowerCase().trim();
      return assignee === pName || assignee === pEmail || assignee === pId;
    });

    const totalTasks = assignedTasks.length;
    const completedTasks = assignedTasks.filter((t) => t.completed).length;
    const pendingTasks = assignedTasks.filter((t) => !t.completed).length;

    const now = new Date();
    const overdueTasks = assignedTasks.filter((t) => {
      if (t.completed || !t.dueDate) return false;
      const d = new Date(t.dueDate);
      return !isNaN(d.getTime()) && d < now;
    }).length;

    const inProgressTasks = Math.max(0, pendingTasks - overdueTasks);
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

    return {
      assignedProjects,
      assignedTasks,
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      overdueTasks,
      completionRate,
    };
  }, [viewingPerson, projects, tasks]);

  return (
    <div className="space-y-5 font-sans w-full">
      {/* 1. TOP SUMMARY METRIC CARDS (Dynamic Database Counts) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Total Employees */}
        <div className="bg-white rounded-lg p-4 border border-[#E5E5E5] shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Total Employees</div>
            <div className="text-2xl font-bold text-[#111827] mt-1">{summaryMetrics.total}</div>
            <div className="text-[10px] text-[#049FD9] font-medium mt-0.5">Workspace team</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#E0F2FE] text-[#049FD9] flex items-center justify-center shrink-0">
            <UsersIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Active Employees */}
        <div className="bg-white rounded-lg p-4 border border-[#E5E5E5] shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Active Employees</div>
            <div className="text-2xl font-bold text-[#10B981] mt-1">{summaryMetrics.active}</div>
            <div className="text-[10px] text-[#64748B] font-medium mt-0.5">Full access</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#DCFCE7] text-[#10B981] flex items-center justify-center shrink-0">
            <CheckCircleIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Inactive / Suspended */}
        <div className="bg-white rounded-lg p-4 border border-[#E5E5E5] shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Inactive Employees</div>
            <div className="text-2xl font-bold text-[#64748B] mt-1">{summaryMetrics.inactive}</div>
            <div className="text-[10px] text-[#94A3B8] font-medium mt-0.5">Access disabled</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] text-[#64748B] flex items-center justify-center shrink-0">
            <ClockIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Departments */}
        <div className="bg-white rounded-lg p-4 border border-[#E5E5E5] shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Departments</div>
            <div className="text-2xl font-bold text-[#4F46E5] mt-1">
              {departmentList.length > 0 ? departmentList.length : summaryMetrics.departments}
            </div>
            <div className="text-[10px] text-[#6366F1] font-medium mt-0.5">Active divisions</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
            <FolderIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Card 5: New Employees */}
        <div className="bg-white rounded-lg p-4 border border-[#E5E5E5] shadow-2xs flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">New Employees</div>
            <div className="text-2xl font-bold text-[#D97706] mt-1">{summaryMetrics.newEmployees}</div>
            <div className="text-[10px] text-[#F59E0B] font-medium mt-0.5">Invited / 30d</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
            <UserPlusIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. TOP ACTION BAR (Clean Single-Row Header & Controls) */}
      <div className="bg-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-lg border border-[#E5E5E5] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-xl font-bold text-[#111827] tracking-tight shrink-0">
          Employee Directory & Operations
        </h1>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          {/* Table / Cards Toggle */}
          <div className="flex items-center bg-[#F4F6F8] border border-[#E5E5E5] rounded-md p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#111827] shadow-2xs font-semibold' : 'text-[#595959] hover:text-[#111827]'
              }`}
            >
              Table View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-[#111827] shadow-2xs font-semibold' : 'text-[#595959] hover:text-[#111827]'
              }`}
            >
              Cards
            </button>
          </div>

          {/* Manage Departments Button (Admin Only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setIsDeptModalOpen(true);
                fetchDepartmentsAndDesignations();
              }}
              className="px-3 py-1.5 rounded-md bg-[#F4F6F8] hover:bg-[#E2E8F0] text-[#111827] text-xs font-semibold border border-[#E5E5E5] transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <FolderIcon className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Departments & Roles</span>
            </button>
          )}

          {/* Add Employee Button (Admin Only) */}
          {isAdmin && onOpenAddEmployee && (
            <button
              onClick={onOpenAddEmployee}
              className="btn-primary shrink-0 flex items-center gap-1.5 text-xs py-1.5 px-3.5 cursor-pointer whitespace-nowrap shadow-2xs"
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
            <span>{actionNotice.type === 'success' ? '✓' : '!'}</span>
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

      {/* 3. SEARCH, FILTERS & CONTROLS BAR (PERFECT RESPONSIVE ALIGNMENT & BELOW-DROPDOWNS) */}
      <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-3">
        {/* Full-Width Search Input (Never Squeezed) */}
        <div className="relative w-full">
          <input id="peopleview-search-query-1" name="searchQuery"
            type="text"
            placeholder="Search by employee name, email, Employee ID, designation, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9] focus:bg-white transition-all shadow-2xs"
          />
          <SearchIcon className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2 text-[#94A3B8] hover:text-[#111827] text-xs font-bold p-1 cursor-pointer"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Controls Row (Dropdowns Strictly Display Below) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-2 border-t border-[#F1F5F9]">
          {/* Filter Pills Group */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1 mr-0.5">
              <FilterIcon className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Filters:</span>
            </span>

            {/* Department Custom Dropdown (Always Displays Below) */}
            <FilterDropdown
              label="Dept"
              value={departmentFilter}
              onChange={setDepartmentFilter}
              options={[
                { value: 'all', label: 'All Departments' },
                ...departmentList.map((d) => ({ value: d.name, label: d.name })),
              ]}
            />

            {/* Designation / Role Custom Dropdown (Always Displays Below) */}
            <FilterDropdown
              label="Role"
              value={designationFilter}
              onChange={setDesignationFilter}
              options={[
                { value: 'all', label: 'All Designations' },
                ...designationList.map((des) => ({ value: des.name, label: des.name })),
              ]}
            />

            {/* Account Status Custom Dropdown (Always Displays Below) */}
            <FilterDropdown
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'invited', label: 'Invited' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' },
              ]}
            />

            {/* Joining Date Custom Dropdown (Always Displays Below) */}
            <FilterDropdown
              label="Joined"
              value={joiningDateFilter}
              onChange={setJoiningDateFilter}
              options={[
                { value: 'all', label: 'All Time' },
                { value: '30days', label: 'Last 30 Days' },
                { value: '90days', label: 'Last 90 Days' },
                { value: 'this_year', label: 'This Year (2026)' },
              ]}
            />
          </div>

          {/* Right Group: Sort & Reset */}
          <div className="flex items-center gap-2 self-start lg:self-auto shrink-0 flex-wrap">
            <span className="text-[11px] font-semibold text-[#64748B]">Sort:</span>
            <FilterDropdown
              align="right"
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              options={[
                { value: 'name_asc', label: 'Name (A → Z)' },
                { value: 'name_desc', label: 'Name (Z → A)' },
                { value: 'date_desc', label: 'Joining Date (Newest)' },
                { value: 'date_asc', label: 'Joining Date (Oldest)' },
              ]}
            />

            {/* Reset Filters Button */}
            {(searchQuery ||
              departmentFilter !== 'all' ||
              designationFilter !== 'all' ||
              statusFilter !== 'all' ||
              joiningDateFilter !== 'all' ||
              sortBy !== 'name_asc') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 rounded-md bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#EF4444] text-xs font-semibold cursor-pointer transition-colors border border-[#EF4444]/20 flex items-center gap-1"
                title="Reset all filters"
              >
                <span>✕</span>
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. TABLE VIEW (Standard Enterprise Display) */}
      {viewMode === 'table' && displayPeople && displayPeople.length > 0 && (
        <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5E5E5] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Joining Date</th>
                  <th className="py-3 px-4">Account Status</th>
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
                      <td className="py-3.5 px-4 font-mono font-bold text-[#049FD9] whitespace-nowrap">
                        {empId}
                      </td>

                      {/* 2. Employee Name */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full ${person.avatarBg || 'bg-[#049FD9] text-white'} font-bold text-xs flex items-center justify-center shrink-0`}
                          >
                            {person.avatar}
                          </div>
                          <div>
                            <span className="font-bold text-[#111827] block">{person.name}</span>
                            {person.phone && (
                              <span className="text-[10px] text-[#94A3B8] font-normal">{person.phone}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Email */}
                      <td className="py-3.5 px-4 text-[#64748B] font-mono text-[11px] whitespace-nowrap">
                        {person.email}
                      </td>

                      {/* 4. Department */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569] font-semibold text-[11px] border border-[#E2E8F0]">
                          {dept}
                        </span>
                      </td>

                      {/* 5. Designation */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[#111827] font-semibold">
                        {designation}
                      </td>

                      {/* 6. Access Role */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderRoleBadge(person.accessRole || (person.role === 'admin' ? 'admin' : 'employee'))}
                      </td>

                      {/* 7. Joining Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[#64748B]">
                        {joining}
                      </td>

                      {/* 8. Account Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStatusBadge(status)}
                      </td>

                      {/* 9. Actions Menu (Admin Only) */}
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Profile */}
                            <button
                              type="button"
                              onClick={() => {
                                setViewingPerson(person);
                                setProfileActiveTab('overview');
                              }}
                              className="px-2.5 py-1 rounded bg-[#F4F6F8] hover:bg-[#E5E5E5] text-[#111827] text-[11px] font-semibold cursor-pointer transition-colors"
                              title="View Employee Profile & Statistics"
                            >
                              View Profile
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(person)}
                              className="px-2.5 py-1 rounded bg-[#F0F9FF] hover:bg-[#E0F2FE] text-[#0284C7] text-[11px] font-semibold cursor-pointer transition-colors"
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

                            {/* Activate / Deactivate Toggle */}
                            {status === 'active' || status === 'invited' ? (
                              <button
                                type="button"
                                onClick={() => setDeactivatingPerson(person)}
                                className="px-2.5 py-1 rounded bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#EF4444] text-[11px] font-semibold cursor-pointer transition-colors"
                                title="Deactivate Employee Account"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleReactivate(person)}
                                className="px-2.5 py-1 rounded bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#10B981] text-[11px] font-semibold cursor-pointer transition-colors"
                                title="Reactivate Employee Account"
                              >
                                Activate
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

      {/* 5. GRID / CARD VIEW */}
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
                  <div className="text-[#64748B] text-[10px] truncate font-mono" title={person.email}>
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
                      onClick={() => {
                        setViewingPerson(person);
                        setProfileActiveTab('overview');
                      }}
                      className="text-[#049FD9] hover:underline font-semibold cursor-pointer"
                    >
                      View Profile
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
                        Activate
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
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-10 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-lg bg-[#F4F6F8] text-[#595959] flex items-center justify-center mx-auto">
            <UsersIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#111827]">No employees match your filter criteria</h3>
          <p className="text-xs text-[#6B7280] max-w-md mx-auto">
            Try adjusting your search query, department, designation, or status filter to see other members.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3.5 py-1.5 rounded-md bg-[#011826] text-white text-xs font-semibold cursor-pointer hover:bg-black transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: VIEW EMPLOYEE PROFILE & DOSSIER (COMPLETE)       */}
      {/* ======================================================== */}
      {viewingPerson && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingPerson(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-sans overflow-y-auto"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-2xl w-full max-w-3xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#011826] p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-full ${viewingPerson.avatarBg || 'bg-[#049FD9] text-white'} font-bold flex items-center justify-center text-xl shrink-0 border-2 border-white/20`}
                >
                  {viewingPerson.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{viewingPerson.name}</h2>
                    {renderRoleBadge(viewingPerson.accessRole || (viewingPerson.role === 'admin' ? 'admin' : 'employee'))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#94A3B8] font-mono mt-0.5">
                    <span className="text-[#38BDF8] font-bold">{viewingPerson.employeeId || viewingPerson.id}</span>
                    <span>•</span>
                    <span>{viewingPerson.email}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    {renderStatusBadge(viewingPerson.status)}
                    <span className="text-[11px] text-[#CBD5E1]">
                      {viewingPerson.department || 'Engineering'} • {viewingPerson.role || viewingPerson.designation}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingPerson(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
              <button
                type="button"
                onClick={() => setProfileActiveTab('overview')}
                className={`py-3 px-3 border-b-2 transition-colors cursor-pointer ${
                  profileActiveTab === 'overview'
                    ? 'border-[#049FD9] text-[#049FD9] font-bold'
                    : 'border-transparent text-[#64748B] hover:text-[#111827]'
                }`}
              >
                Overview & Metrics
              </button>
              <button
                type="button"
                onClick={() => setProfileActiveTab('projects')}
                className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  profileActiveTab === 'projects'
                    ? 'border-[#049FD9] text-[#049FD9] font-bold'
                    : 'border-transparent text-[#64748B] hover:text-[#111827]'
                }`}
              >
                <span>Assigned Projects</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#E2E8F0] text-[#475569]">
                  {personWorkData.assignedProjects.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setProfileActiveTab('tasks')}
                className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  profileActiveTab === 'tasks'
                    ? 'border-[#049FD9] text-[#049FD9] font-bold'
                    : 'border-transparent text-[#64748B] hover:text-[#111827]'
                }`}
              >
                <span>Assigned Tasks</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#E2E8F0] text-[#475569]">
                  {personWorkData.assignedTasks.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setProfileActiveTab('activity')}
                className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  profileActiveTab === 'activity'
                    ? 'border-[#049FD9] text-[#049FD9] font-bold'
                    : 'border-transparent text-[#64748B] hover:text-[#111827]'
                }`}
              >
                <span>Activity History</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#E2E8F0] text-[#475569]">
                  {employeeActivities.length}
                </span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6">
              {/* TAB 1: OVERVIEW */}
              {profileActiveTab === 'overview' && (
                <div className="space-y-6">
                  {/* Personal & Professional Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Personal Information */}
                    <div className="bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0] space-y-2.5 text-xs">
                      <h4 className="font-bold text-[#111827] uppercase tracking-wider text-[11px] border-b border-[#E2E8F0] pb-2">
                        Personal Information
                      </h4>
                      <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                        <span className="text-[#64748B]">Full Name:</span>
                        <span className="font-semibold text-[#111827]">{viewingPerson.name}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                        <span className="text-[#64748B]">Employee ID:</span>
                        <span className="font-mono font-bold text-[#049FD9]">
                          {viewingPerson.employeeId || viewingPerson.id}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                        <span className="text-[#64748B]">Work Email:</span>
                        <span className="font-mono font-semibold text-[#111827]">{viewingPerson.email}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                        <span className="text-[#64748B]">Phone Number:</span>
                        <span className="font-semibold text-[#111827]">
                          {viewingPerson.phone || 'Not provided'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-[#64748B]">Joining Date:</span>
                        <span className="font-semibold text-[#111827]">
                          {viewingPerson.joiningDate || (viewingPerson.createdAt ? viewingPerson.createdAt.split('T')[0] : '2026-11-20')}
                        </span>
                      </div>
                    </div>

                    {/* Professional Information */}
                    <div className="bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0] space-y-2.5 text-xs">
                      <h4 className="font-bold text-[#111827] uppercase tracking-wider text-[11px] border-b border-[#E2E8F0] pb-2">
                        Professional Information
                      </h4>
                      <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                        <span className="text-[#64748B]">Department:</span>
                        <span className="font-semibold text-[#111827]">
                          {viewingPerson.department || 'Engineering'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                        <span className="text-[#64748B]">Designation:</span>
                        <span className="font-semibold text-[#111827]">
                          {viewingPerson.role || viewingPerson.designation || 'Team Member'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                        <span className="text-[#64748B]">Access Role:</span>
                        <div>{renderRoleBadge(viewingPerson.accessRole || (viewingPerson.role === 'admin' ? 'admin' : 'employee'))}</div>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                        <span className="text-[#64748B]">Account Status:</span>
                        <div>{renderStatusBadge(viewingPerson.status)}</div>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-[#64748B]">Organization:</span>
                        <span className="font-semibold text-[#111827]">Basecamp Workspace</span>
                      </div>
                    </div>
                  </div>

                  {/* Work Overview Metrics (Dynamic From Database) */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-[#111827] text-xs uppercase tracking-wider">
                      Work Overview & Task Metrics
                    </h4>

                    {/* 6 Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-center">
                      <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                        <span className="text-[10px] text-[#64748B] block font-semibold">Assigned Projects</span>
                        <span className="text-xl font-bold text-[#111827] block mt-1">
                          {personWorkData.assignedProjects.length}
                        </span>
                      </div>
                      <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                        <span className="text-[10px] text-[#64748B] block font-semibold">Total Tasks</span>
                        <span className="text-xl font-bold text-[#111827] block mt-1">
                          {personWorkData.totalTasks}
                        </span>
                      </div>
                      <div className="p-3 bg-[#ECFDF5] rounded-lg border border-[#A7F3D0]">
                        <span className="text-[10px] text-[#065F46] block font-semibold">Completed</span>
                        <span className="text-xl font-bold text-[#10B981] block mt-1">
                          {personWorkData.completedTasks}
                        </span>
                      </div>
                      <div className="p-3 bg-[#EFF6FF] rounded-lg border border-[#BFDBFE]">
                        <span className="text-[10px] text-[#1E40AF] block font-semibold">In Progress</span>
                        <span className="text-xl font-bold text-[#3B82F6] block mt-1">
                          {personWorkData.inProgressTasks}
                        </span>
                      </div>
                      <div className="p-3 bg-[#FFFBEB] rounded-lg border border-[#FDE68A]">
                        <span className="text-[10px] text-[#92400E] block font-semibold">Pending</span>
                        <span className="text-xl font-bold text-[#F59E0B] block mt-1">
                          {personWorkData.pendingTasks}
                        </span>
                      </div>
                      <div className="p-3 bg-[#FEF2F2] rounded-lg border border-[#FECACA]">
                        <span className="text-[10px] text-[#991B1B] block font-semibold">Overdue</span>
                        <span className="text-xl font-bold text-[#EF4444] block mt-1">
                          {personWorkData.overdueTasks}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0] space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-[#475569]">Task Completion Rate:</span>
                        <span className="text-[#049FD9] font-bold">{personWorkData.completionRate}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#10B981] transition-all duration-300 rounded-full"
                          style={{ width: `${personWorkData.completionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ASSIGNED PROJECTS */}
              {profileActiveTab === 'projects' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-[#111827]">
                      Projects Assigned to {viewingPerson.name} ({personWorkData.assignedProjects.length})
                    </h4>
                    {onNavigateToProjects && (
                      <button
                        type="button"
                        onClick={() => {
                          setViewingPerson(null);
                          onNavigateToProjects();
                        }}
                        className="text-xs font-semibold text-[#049FD9] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open Projects Workspace</span>
                        <ExternalLinkIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {personWorkData.assignedProjects.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                      No active projects are currently assigned to this employee.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {personWorkData.assignedProjects.map((proj) => (
                        <div
                          key={proj.id}
                          className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] hover:border-[#049FD9] transition-all space-y-2.5 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h5 className="font-bold text-sm text-[#111827]">{proj.name}</h5>
                              <p className="text-[#64748B] text-[11px] mt-0.5 line-clamp-1">{proj.description}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#DCFCE7] text-[#166534]">
                              {proj.status || 'Active'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#475569] pt-2 border-t border-[#E2E8F0]">
                            <div>
                              <span className="text-[#94A3B8] block text-[10px]">Manager / Lead</span>
                              <span className="font-semibold text-[#111827]">{proj.manager || 'Workspace Admin'}</span>
                            </div>
                            <div>
                              <span className="text-[#94A3B8] block text-[10px]">Start Date</span>
                              <span>{proj.startDate || '2026-11-01'}</span>
                            </div>
                            <div>
                              <span className="text-[#94A3B8] block text-[10px]">Deadline</span>
                              <span className="font-semibold text-[#111827]">{proj.deadline || '2026-12-15'}</span>
                            </div>
                            <div>
                              <span className="text-[#94A3B8] block text-[10px]">Progress</span>
                              <span className="font-bold text-[#049FD9]">{proj.progress || 0}%</span>
                            </div>
                          </div>

                          <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#049FD9] rounded-full"
                              style={{ width: `${proj.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ASSIGNED TASKS */}
              {profileActiveTab === 'tasks' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-xs text-[#111827]">
                    Tasks Assigned to {viewingPerson.name} ({personWorkData.assignedTasks.length})
                  </h4>

                  {personWorkData.assignedTasks.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                      No individual tasks are assigned to this employee.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-lg bg-white overflow-hidden text-xs">
                      {personWorkData.assignedTasks.map((t) => (
                        <div key={t.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#F8FAFC]">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-4 h-4 rounded flex items-center justify-center shrink-0 text-white text-[10px] ${
                                t.completed ? 'bg-[#10B981]' : 'border border-[#CBD5E1] bg-white'
                              }`}
                            >
                              {t.completed ? '✓' : ''}
                            </span>
                            <div className="min-w-0">
                              <span
                                className={`font-semibold block truncate ${
                                  t.completed ? 'line-through text-[#94A3B8]' : 'text-[#111827]'
                                }`}
                              >
                                {t.title}
                              </span>
                              <span className="text-[11px] text-[#64748B]">{t.project}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {t.dueDate && (
                              <span className="text-[11px] text-[#64748B] flex items-center gap-1">
                                <ClockIcon className="w-3 h-3 text-[#94A3B8]" />
                                <span>{t.dueDate}</span>
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                t.completed
                                  ? 'bg-[#DCFCE7] text-[#166534]'
                                  : 'bg-[#FEF3C7] text-[#B45309]'
                              }`}
                            >
                              {t.completed ? 'Completed' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ACTIVITY HISTORY */}
              {profileActiveTab === 'activity' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-xs text-[#111827]">
                    Recent Activity History for {viewingPerson.name}
                  </h4>

                  {isLoadingActivities ? (
                    <div className="p-8 text-center text-xs text-[#64748B] flex items-center justify-center gap-2">
                      <RefreshCwIcon className="w-4 h-4 animate-spin text-[#049FD9]" />
                      <span>Loading employee activity logs...</span>
                    </div>
                  ) : employeeActivities.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                      No audit events recorded yet for this employee account.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {employeeActivities.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs space-y-1"
                        >
                          <p className="font-semibold text-[#111827]">{log.description}</p>
                          <div className="flex items-center gap-2 text-[10px] text-[#64748B]">
                            <span>By: {log.performedBy || 'Admin'}</span>
                            <span>•</span>
                            <span>
                              {log.timestamp
                                ? new Date(log.timestamp).toLocaleString()
                                : 'Recent'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-[#F8FAFC] px-6 py-3.5 border-t border-[#E2E8F0] flex items-center justify-between">
              <span className="text-[11px] text-[#64748B]">
                ID: <span className="font-mono font-bold">{viewingPerson.employeeId || viewingPerson.id}</span>
              </span>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      const p = viewingPerson;
                      setViewingPerson(null);
                      handleOpenEdit(p);
                    }}
                    className="px-3 py-1.5 rounded-md bg-[#0284C7] text-white hover:bg-[#0369A1] text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Edit Profile
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingPerson(null)}
                  className="btn-primary py-1.5 px-4 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: EDIT EMPLOYEE PROFILE (CONNECTED TO DATABASE)   */}
      {/* ======================================================== */}
      {editingPerson && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingPerson(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div>
                <h3 className="text-base font-bold text-[#111827]">Edit Employee Information</h3>
                <p className="text-xs text-[#595959] font-mono">
                  {editingPerson.employeeId || editingPerson.id} • {editingPerson.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPerson(null)}
                className="w-7 h-7 rounded-md bg-[#F4F6F8] text-[#595959] hover:text-[#111827] flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input id="peopleview-edit-name-2" name="editName"
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Work Email Address <span className="text-red-500">*</span>
                </label>
                <input id="peopleview-edit-email-3" name="editEmail"
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                />
              </div>

              {/* Department & Designation */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Department</label>
                  <select id="peopleview-edit-department-4" name="editDepartment"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  >
                    {departmentList.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Designation</label>
                  <select id="peopleview-edit-designation-5" name="editDesignation"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  >
                    {designationList.map((des) => (
                      <option key={des.id} value={des.name}>
                        {des.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone Number & Joining Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Phone Number</label>
                  <input id="peopleview-edit-phone-6" name="editPhone"
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Joining Date</label>
                  <input id="peopleview-edit-joining-date-7" name="editJoiningDate"
                    type="date"
                    value={editJoiningDate}
                    onChange={(e) => setEditJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  />
                </div>
              </div>

              {/* Access Role (Admin Only) */}
              {isAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">
                    Access Role (Permissions)
                  </label>
                  <select id="peopleview-edit-access-role-8" name="editAccessRole"
                    value={editAccessRole}
                    onChange={(e) => setEditAccessRole(e.target.value as AccessRole)}
                    className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  >
                    <option value="employee">Employee (Workspace Member)</option>
                    <option value="admin">Admin (Workspace Administrator)</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E5E5]">
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
                  {isProcessing ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: MANAGE DEPARTMENTS & DESIGNATIONS                */}
      {/* ======================================================== */}
      {isDeptModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDeptModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div>
                <h3 className="text-base font-bold text-[#111827]">Departments & Designations Management</h3>
                <p className="text-xs text-[#595959]">Add, rename, or organize workspace divisions</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDeptModalOpen(false)}
                className="w-7 h-7 rounded-md bg-[#F4F6F8] text-[#595959] hover:text-[#111827] flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Tab switch */}
            <div className="flex border-b border-[#E5E5E5] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDeptModalTab('departments')}
                className={`py-2 px-4 border-b-2 cursor-pointer ${
                  deptModalTab === 'departments'
                    ? 'border-[#049FD9] text-[#049FD9] font-bold'
                    : 'border-transparent text-[#64748B] hover:text-[#111827]'
                }`}
              >
                Departments ({departmentList.length})
              </button>
              <button
                type="button"
                onClick={() => setDeptModalTab('designations')}
                className={`py-2 px-4 border-b-2 cursor-pointer ${
                  deptModalTab === 'designations'
                    ? 'border-[#049FD9] text-[#049FD9] font-bold'
                    : 'border-transparent text-[#64748B] hover:text-[#111827]'
                }`}
              >
                Designations ({designationList.length})
              </button>
            </div>

            {/* TAB 1: DEPARTMENTS */}
            {deptModalTab === 'departments' && (
              <div className="space-y-4 text-xs">
                {/* Add new department form */}
                <form onSubmit={handleAddDepartment} className="flex gap-2">
                  <input id="peopleview-new-dept-name-9" name="newDeptName"
                    type="text"
                    placeholder="New department name..."
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-[#CCCCCC] rounded-md text-xs font-medium focus:outline-none focus:border-[#049FD9]"
                  />
                  <button type="submit" className="btn-primary text-xs py-1.5 px-3">
                    Add Dept
                  </button>
                </form>

                {/* List of departments */}
                <div className="max-h-60 overflow-y-auto divide-y divide-[#F1F5F9] border border-[#E5E5E5] rounded-md">
                  {departmentList.map((dept) => (
                    <div key={dept.id} className="p-2.5 flex items-center justify-between hover:bg-[#F8FAFC]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#111827]">{dept.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#F1F5F9] text-[#64748B] font-mono">
                          {dept.employeeCount || 0} employees
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteDepartment(dept)}
                        className="text-[11px] text-[#EF4444] hover:underline font-semibold cursor-pointer"
                        title="Delete Department"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: DESIGNATIONS */}
            {deptModalTab === 'designations' && (
              <div className="space-y-4 text-xs">
                {/* Add new designation form */}
                <form onSubmit={handleAddDesignation} className="flex gap-2">
                  <input id="peopleview-new-desig-name-10" name="newDesigName"
                    type="text"
                    placeholder="New designation / job title..."
                    value={newDesigName}
                    onChange={(e) => setNewDesigName(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-[#CCCCCC] rounded-md text-xs font-medium focus:outline-none focus:border-[#049FD9]"
                  />
                  <button type="submit" className="btn-primary text-xs py-1.5 px-3">
                    Add Role
                  </button>
                </form>

                {/* List of designations */}
                <div className="max-h-60 overflow-y-auto divide-y divide-[#F1F5F9] border border-[#E5E5E5] rounded-md">
                  {designationList.map((desig) => (
                    <div key={desig.id} className="p-2.5 flex items-center justify-between hover:bg-[#F8FAFC]">
                      <span className="font-semibold text-[#111827]">{desig.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteDesignation(desig.id, desig.name)}
                        className="text-[11px] text-[#EF4444] hover:underline font-semibold cursor-pointer"
                        title="Delete Designation"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-[#E5E5E5]">
              <button
                type="button"
                onClick={() => setIsDeptModalOpen(false)}
                className="btn-primary text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: DEACTIVATE EMPLOYEE CONFIRMATION                 */}
      {/* ======================================================== */}
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
                Revoke access to the workspace without deleting task and project records.
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
                className="btn-secondary text-xs cursor-pointer"
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
