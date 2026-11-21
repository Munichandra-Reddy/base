'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, Task, FileItem, Person, ProjectStatus, ProjectPriority, EmployeeActivityLog } from '@/lib/types';
import {
  FolderIcon,
  FileIcon,
  ChatIcon,
  VideoIcon,
  CheckSquareIcon,
  ListIcon,
  GridIcon,
  KanbanIcon,
  UserPlusIcon,
  FilterIcon,
  CalendarIcon,
  ClockIcon,
  SearchIcon,
  PlusIcon,
  ShieldCheckIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  AlertCircleIcon,
} from './Icons';
import { getDirectFileBlobUrl, openProtectedDocument } from '@/lib/fileUtils';
import { deduplicateEmployees } from '@/lib/firebaseServices';

// ==========================================
// 1. CUSTOM FILTER DROPDOWN (Strictly Opens Below)
// ==========================================
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
  const containerRef = useRef<HTMLDivElement>(null);

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
    <div className={`relative inline-block text-left shrink-0 ${className}`} ref={containerRef}>
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

// ==========================================
// 2. MAIN COMPONENT PROPS
// ==========================================
interface ProjectsViewProps {
  projects: Project[];
  tasks?: Task[];
  files?: FileItem[];
  people?: Person[];
  onOpenCreateProject?: () => void;
  isAdmin?: boolean;
  currentUser?: { email: string; fullName: string; companyName: string; role?: string } | null;
  selectedProjectId?: string | null;
  onSelectProject?: (project: Project | null) => void;
  onUpdateProject?: (project: Project) => void;
  onDeleteProject?: (id: string) => void;
  onNavigateToEmployee?: (email: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  tasks = [],
  files = [],
  people = [],
  onOpenCreateProject,
  isAdmin = false,
  currentUser,
  selectedProjectId,
  onSelectProject,
  onUpdateProject,
  onDeleteProject,
  onNavigateToEmployee,
}) => {
  // View mode: 'table' | 'cards'
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'date_desc' | 'date_asc' | 'priority' | 'progress'>('date_desc');

  // Selected project for details view
  const [selectedProject, setSelectedProject] = useState<Project | null>(() => {
    if (selectedProjectId) {
      return (
        projects.find(
          (p) =>
            p.id === selectedProjectId ||
            p.name.toLowerCase().trim() === selectedProjectId.toLowerCase().trim()
        ) || null
      );
    }
    return null;
  });

  // Project Details sub-tab: 'overview' | 'team' | 'tasks' | 'messages' | 'meetings' | 'updates'
  const [detailsTab, setDetailsTab] = useState<'overview' | 'team' | 'tasks' | 'messages' | 'meetings' | 'updates'>('overview');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [managingTeamProject, setManagingTeamProject] = useState<Project | null>(null);
  const [statusChangeProject, setStatusChangeProject] = useState<Project | null>(null);
  const [archivingProject, setArchivingProject] = useState<Project | null>(null);

  // Form states for Create / Edit
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('Web Development');
  const [formManager, setFormManager] = useState('');
  const [formManagerEmail, setFormManagerEmail] = useState('');
  const [formMembers, setFormMembers] = useState<string[]>([]);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formPriority, setFormPriority] = useState<ProjectPriority>('medium');
  const [formStatus, setFormStatus] = useState<ProjectStatus>('planning');
  const [formNotes, setFormNotes] = useState('');
  const [isFormPMDropdownOpen, setIsFormPMDropdownOpen] = useState(false);
  const [formPMSearch, setFormPMSearch] = useState('');
  const [formTeamSearch, setFormTeamSearch] = useState('');
  const [isEditPMDropdownOpen, setIsEditPMDropdownOpen] = useState(false);
  const [editPMSearch, setEditPMSearch] = useState('');
  const formPMDropdownRef = useRef<HTMLDivElement>(null);
  const editPMDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (formPMDropdownRef.current && !formPMDropdownRef.current.contains(e.target as Node)) {
        setIsFormPMDropdownOpen(false);
      }
      if (editPMDropdownRef.current && !editPMDropdownRef.current.contains(e.target as Node)) {
        setIsEditPMDropdownOpen(false);
      }
    };
    if (isFormPMDropdownOpen || isEditPMDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFormPMDropdownOpen, isEditPMDropdownOpen]);

  // Deduplicated real active employees from Employee Management
  const activeEmployees = useMemo(() => {
    const list = deduplicateEmployees(people || []);
    return list.filter((p) => (p.status || 'active').toLowerCase() === 'active');
  }, [people]);

  const filteredFormPMEmp = useMemo(() => {
    return activeEmployees.filter((emp) => {
      if (!formPMSearch.trim()) return true;
      const q = formPMSearch.toLowerCase().trim();
      const nameMatch = (emp.name || '').toLowerCase().includes(q);
      const roleMatch = (emp.role || emp.designation || '').toLowerCase().includes(q);
      const deptMatch = (emp.department || '').toLowerCase().includes(q);
      const emailMatch = (emp.email || '').toLowerCase().includes(q);
      return nameMatch || roleMatch || deptMatch || emailMatch;
    });
  }, [activeEmployees, formPMSearch]);

  const filteredEditPMEmp = useMemo(() => {
    return activeEmployees.filter((emp) => {
      if (!editPMSearch.trim()) return true;
      const q = editPMSearch.toLowerCase().trim();
      const nameMatch = (emp.name || '').toLowerCase().includes(q);
      const roleMatch = (emp.role || emp.designation || '').toLowerCase().includes(q);
      const deptMatch = (emp.department || '').toLowerCase().includes(q);
      const emailMatch = (emp.email || '').toLowerCase().includes(q);
      return nameMatch || roleMatch || deptMatch || emailMatch;
    });
  }, [activeEmployees, editPMSearch]);

  const filteredFormEmployees = useMemo(() => {
    return activeEmployees.filter((emp) => {
      if (!formTeamSearch.trim()) return true;
      const q = formTeamSearch.toLowerCase().trim();
      const nameMatch = (emp.name || '').toLowerCase().includes(q);
      const roleMatch = (emp.role || emp.designation || '').toLowerCase().includes(q);
      const deptMatch = (emp.department || '').toLowerCase().includes(q);
      const emailMatch = (emp.email || '').toLowerCase().includes(q);
      return nameMatch || roleMatch || deptMatch || emailMatch;
    });
  }, [activeEmployees, formTeamSearch]);

  // Team management modal state
  const [selectedNewMember, setSelectedNewMember] = useState('');
  const [selectedNewPM, setSelectedNewPM] = useState('');

  // Project activity logs
  const [projectActivities, setProjectActivities] = useState<EmployeeActivityLog[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Notification Banner
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Collaboration state (Campfire & Updates)
  const [chatInputText, setChatInputText] = useState('');
  const [customMessages, setCustomMessages] = useState<Record<string, Array<{ id: string; sender: string; text: string; time: string }>>>({});
  const [newUpdateText, setNewUpdateText] = useState('');
  const [customUpdates, setCustomUpdates] = useState<Array<{ id: string; project: string; author: string; role: string; timeAgo: string; text: string; category: string }>>([]);

  // Sync selectedProject with prop
  useEffect(() => {
    if (selectedProjectId) {
      const found = projects.find(
        (p) =>
          p.id === selectedProjectId ||
          p.name.toLowerCase().trim() === selectedProjectId.toLowerCase().trim()
      );
      if (found) setSelectedProject(found);
    } else if (selectedProjectId === null) {
      setSelectedProject(null);
    }
  }, [selectedProjectId, projects]);

  // Keep internal selectedProject updated when `projects` prop changes
  useEffect(() => {
    if (selectedProject) {
      const updated = projects.find((p) => p.id === selectedProject.id);
      if (updated) setSelectedProject(updated);
    }
  }, [projects]);

  // Fetch project activity logs when viewing project details
  useEffect(() => {
    if (!selectedProject) {
      setProjectActivities([]);
      return;
    }
    setIsLoadingActivities(true);
    fetch(`/api/activity?projectId=${encodeURIComponent(selectedProject.id)}`)
      .then((res) => res.json())
      .then((data) => {
        setIsLoadingActivities(false);
        if (data.success && Array.isArray(data.activities)) {
          setProjectActivities(data.activities);
        } else {
          setProjectActivities([]);
        }
      })
      .catch(() => {
        setIsLoadingActivities(false);
        setProjectActivities([]);
      });
  }, [selectedProject?.id]);

  // Employee Role-Based Access: Non-admin employees see ONLY assigned projects
  const accessibleProjects = useMemo(() => {
    if (isAdmin) return projects;

    const userEmail = (currentUser?.email || '').toLowerCase().trim();
    const userName = (currentUser?.fullName || '').toLowerCase().trim();

    return projects.filter((p) => {
      const isPM =
        (p.managerEmail && p.managerEmail.toLowerCase() === userEmail) ||
        (p.manager && p.manager.toLowerCase().includes(userName));
      const isMember = (p.members || []).some((m) => {
        const ml = m.toLowerCase();
        return ml.includes(userEmail) || ml.includes(userName);
      });
      return isPM || isMember;
    });
  }, [projects, isAdmin, currentUser]);

  // Dynamic Summary Metrics (from actual database projects)
  const summaryMetrics = useMemo(() => {
    const total = accessibleProjects.length;
    const active = accessibleProjects.filter((p) => (p.status || '').toLowerCase() === 'active').length;
    const planning = accessibleProjects.filter((p) => (p.status || '').toLowerCase() === 'planning').length;
    const onHold = accessibleProjects.filter((p) => {
      const s = (p.status || '').toLowerCase();
      return s === 'on_hold' || s === 'on hold';
    }).length;
    const completed = accessibleProjects.filter((p) => (p.status || '').toLowerCase() === 'completed').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = accessibleProjects.filter((p) => {
      const deadline = p.endDate || p.deadline;
      if (!deadline) return false;
      const s = (p.status || '').toLowerCase();
      return deadline < todayStr && s !== 'completed' && s !== 'cancelled';
    }).length;

    return { total, active, planning, onHold, completed, overdue };
  }, [accessibleProjects]);

  // Filtered & Sorted Projects List
  const displayedProjects = useMemo(() => {
    let list = [...accessibleProjects];

    // Status Filter
    if (statusFilter !== 'all') {
      list = list.filter((p) => {
        const s = (p.status || '').toLowerCase();
        if (statusFilter === 'on_hold') return s === 'on_hold' || s === 'on hold';
        return s === statusFilter.toLowerCase();
      });
    }

    // Priority Filter
    if (priorityFilter !== 'all') {
      list = list.filter((p) => (p.priority || 'medium').toLowerCase() === priorityFilter.toLowerCase());
    }

    // Manager Filter
    if (managerFilter !== 'all') {
      list = list.filter((p) => (p.manager || '').toLowerCase().trim() === managerFilter.toLowerCase().trim());
    }

    // Date Filter
    if (dateFilter !== 'all') {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const currentYearMonth = todayStr.substring(0, 7);

      list = list.filter((p) => {
        const d = p.endDate || p.deadline;
        if (!d) return false;
        if (dateFilter === 'overdue') {
          return d < todayStr && p.status !== 'completed' && p.status !== 'cancelled';
        }
        if (dateFilter === 'this_month') {
          return d.startsWith(currentYearMonth);
        }
        if (dateFilter === 'recent') {
          return d >= thirtyDaysAgo;
        }
        return true;
      });
    }

    // Search Query (Project Name, ID, Manager, Category)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          (p.projectId && p.projectId.toLowerCase().includes(q)) ||
          p.id.toLowerCase().includes(q) ||
          (p.manager && p.manager.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          p.description.toLowerCase().includes(q)
        );
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'date_desc') {
        const da = a.endDate || a.deadline || '';
        const db = b.endDate || b.deadline || '';
        return db.localeCompare(da);
      }
      if (sortBy === 'date_asc') {
        const da = a.endDate || a.deadline || '';
        const db = b.endDate || b.deadline || '';
        return da.localeCompare(db);
      }
      if (sortBy === 'progress') {
        return (b.progress || 0) - (a.progress || 0);
      }
      if (sortBy === 'priority') {
        const pOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        const pa = pOrder[(a.priority || 'medium').toLowerCase()] || 0;
        const pb = pOrder[(b.priority || 'medium').toLowerCase()] || 0;
        return pb - pa;
      }
      return 0;
    });

    return list;
  }, [accessibleProjects, statusFilter, priorityFilter, managerFilter, dateFilter, searchQuery, sortBy]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setManagerFilter('all');
    setDateFilter('all');
    setSortBy('date_desc');
  };

  // Distinct Project Managers for Dropdown
  const projectManagerOptions = useMemo(() => {
    const managers = new Set<string>();
    projects.forEach((p) => {
      if (p.manager) managers.add(p.manager.trim());
    });
    return Array.from(managers).sort();
  }, [projects]);

  // Status Badge Helper
  const renderStatusBadge = (status?: ProjectStatus | string) => {
    const s = (status || 'planning').toLowerCase();
    if (s === 'active') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#10B981] border border-[#10B981]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          Active
        </span>
      );
    }
    if (s === 'planning') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EFF6FF] text-[#3B82F6] border border-[#3B82F6]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
          Planning
        </span>
      );
    }
    if (s === 'on_hold' || s === 'on hold') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
          On Hold
        </span>
      );
    }
    if (s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
          Completed
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF2F2] text-[#EF4444] border border-[#EF4444]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]">
        {status}
      </span>
    );
  };

  // Priority Badge Helper
  const renderPriorityBadge = (priority?: ProjectPriority | string) => {
    const p = (priority || 'medium').toLowerCase();
    if (p === 'critical') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#FEF2F2] text-[#991B1B] border border-[#F87171]">
          Critical
        </span>
      );
    }
    if (p === 'high') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#FFF1F2] text-[#E11D48] border border-[#FDA4AF]">
          High
        </span>
      );
    }
    if (p === 'medium') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-[#FEF3C7] text-[#B45309] border border-[#FCD34D]">
          Medium
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
        Low
      </span>
    );
  };

  // Open Create Project Modal
  const handleOpenCreate = () => {
    const now = new Date();
    const start = now.toISOString().split('T')[0];
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    setFormName('');
    setFormDescription('');
    setFormCategory('Web Development');
    const defaultPM = activeEmployees[0]?.name || currentUser?.fullName || 'Workspace Admin';
    const defaultPMEmail = activeEmployees[0]?.email || currentUser?.email || '';
    setFormManager(defaultPM);
    setFormManagerEmail(defaultPMEmail);
    setFormMembers([defaultPM]);
    setFormStartDate(start);
    setFormEndDate(end);
    setFormPriority('medium');
    setFormStatus('planning');
    setFormNotes('');
    setIsCreateModalOpen(true);
  };

  // Submit Create Project Form
  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDescription.trim()) return;
    if (new Date(formEndDate).getTime() < new Date(formStartDate).getTime()) {
      setActionNotice({ type: 'error', message: 'Project End Date must be after the Start Date.' });
      return;
    }

    setIsProcessing(true);
    setActionNotice(null);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser?.email || 'admin@basecamp.com',
        },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim(),
          category: formCategory.trim(),
          manager: formManager.trim(),
          managerEmail: formManagerEmail.trim(),
          members: formMembers,
          startDate: formStartDate,
          endDate: formEndDate,
          priority: formPriority,
          status: formStatus,
          notes: formNotes.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.project) {
        setIsCreateModalOpen(false);
        setActionNotice({
          type: 'success',
          message: data.message || `Project "${formName}" has been created successfully.`,
        });
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Failed to create project.' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Network error creating project.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Open Edit Project Modal
  const handleOpenEdit = (project: Project) => {
    setEditingProject(project);
    setFormName(project.name);
    setFormDescription(project.description || '');
    setFormCategory(project.category || 'General');
    setFormManager(project.manager || '');
    setFormManagerEmail(project.managerEmail || '');
    setFormMembers(project.members || []);
    setFormStartDate(project.startDate || new Date().toISOString().split('T')[0]);
    setFormEndDate(project.endDate || project.deadline || '');
    setFormPriority((project.priority as ProjectPriority) || 'medium');
    setFormStatus((project.status as ProjectStatus) || 'planning');
    setFormNotes(project.notes || '');
  };

  // Save Edit Project
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    if (formStartDate && formEndDate && new Date(formEndDate).getTime() < new Date(formStartDate).getTime()) {
      setActionNotice({ type: 'error', message: 'Project End Date must be after the Start Date.' });
      return;
    }

    setIsProcessing(true);
    setActionNotice(null);

    try {
      const res = await fetch('/api/projects/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser?.email || 'admin@basecamp.com',
        },
        body: JSON.stringify({
          id: editingProject.id,
          name: formName.trim(),
          description: formDescription.trim(),
          category: formCategory.trim(),
          manager: formManager.trim(),
          managerEmail: formManagerEmail.trim(),
          members: formMembers,
          startDate: formStartDate,
          endDate: formEndDate,
          priority: formPriority,
          status: formStatus,
          notes: formNotes.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.project) {
        if (onUpdateProject) onUpdateProject(data.project);
        setEditingProject(null);
        setActionNotice({
          type: 'success',
          message: `Project "${formName}" updated successfully in database.`,
        });
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Failed to update project.' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Network error updating project.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick Change Status
  const handleSaveStatusChange = async (newStatus: ProjectStatus) => {
    if (!statusChangeProject) return;
    setIsProcessing(true);
    setActionNotice(null);

    try {
      const res = await fetch('/api/projects/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser?.email || 'admin@basecamp.com',
        },
        body: JSON.stringify({
          id: statusChangeProject.id,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusChangeProject(null);
        setActionNotice({
          type: 'success',
          message: `Project status changed to "${newStatus}".`,
        });
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Failed to update status.' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Network error updating status.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Add Member via Manage Team Modal
  const handleAddTeamMember = async () => {
    if (!managingTeamProject || !selectedNewMember) return;
    setIsProcessing(true);
    setActionNotice(null);

    try {
      const targetEmp = activeEmployees.find((e) => e.name === selectedNewMember || e.email === selectedNewMember);
      const res = await fetch('/api/projects/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser?.email || 'admin@basecamp.com',
        },
        body: JSON.stringify({
          projectId: managingTeamProject.id,
          action: 'add_member',
          memberName: targetEmp?.name || selectedNewMember,
          memberEmail: targetEmp?.email || '',
        }),
      });

      const data = await res.json();
      if (data.success && data.members) {
        const updated = { ...managingTeamProject, members: data.members };
        setManagingTeamProject(updated);
        if (selectedProject?.id === updated.id) setSelectedProject(updated);
        setSelectedNewMember('');
        setActionNotice({ type: 'success', message: data.message });
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Failed to add member.' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Network error adding member.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove Member via Manage Team Modal
  const handleRemoveTeamMember = async (memberIdentifier: string) => {
    if (!managingTeamProject) return;
    setIsProcessing(true);
    setActionNotice(null);

    try {
      const res = await fetch('/api/projects/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser?.email || 'admin@basecamp.com',
        },
        body: JSON.stringify({
          projectId: managingTeamProject.id,
          action: 'remove_member',
          member: memberIdentifier,
        }),
      });

      const data = await res.json();
      if (data.success && data.members) {
        const updated = { ...managingTeamProject, members: data.members };
        setManagingTeamProject(updated);
        if (selectedProject?.id === updated.id) setSelectedProject(updated);
        setActionNotice({ type: 'success', message: data.message });
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Failed to remove member.' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Network error removing member.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Change PM via Manage Team Modal
  const handleChangePM = async () => {
    if (!managingTeamProject || !selectedNewPM) return;
    setIsProcessing(true);
    setActionNotice(null);

    try {
      const targetEmp = activeEmployees.find((e) => e.name === selectedNewPM || e.email === selectedNewPM);
      const res = await fetch('/api/projects/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser?.email || 'admin@basecamp.com',
        },
        body: JSON.stringify({
          projectId: managingTeamProject.id,
          action: 'change_manager',
          newManagerName: targetEmp?.name || selectedNewPM,
          newManagerEmail: targetEmp?.email || '',
          newManagerId: targetEmp?.employeeId || targetEmp?.id || '',
        }),
      });

      const data = await res.json();
      if (data.success) {
        const updated = {
          ...managingTeamProject,
          manager: data.manager,
          members: data.members,
        };
        setManagingTeamProject(updated);
        if (selectedProject?.id === updated.id) setSelectedProject(updated);
        setSelectedNewPM('');
        setActionNotice({ type: 'success', message: data.message });
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Failed to change Project Manager.' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Network error changing Project Manager.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Archive or Delete Project
  const handleConfirmArchive = async (action: 'archive' | 'delete') => {
    if (!archivingProject) return;
    setIsProcessing(true);
    setActionNotice(null);

    try {
      const res = await fetch('/api/projects/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser?.email || 'admin@basecamp.com',
        },
        body: JSON.stringify({
          id: archivingProject.id,
          action,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (action === 'delete' && onDeleteProject) {
          onDeleteProject(archivingProject.id);
        }
        if (selectedProject?.id === archivingProject.id) {
          setSelectedProject(null);
          if (onSelectProject) onSelectProject(null);
        }
        setArchivingProject(null);
        setActionNotice({ type: 'success', message: data.message });
      } else {
        setActionNotice({ type: 'error', message: data.error || `Failed to ${action} project.` });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || `Network error during ${action}.` });
    } finally {
      setIsProcessing(false);
    }
  };

  // Member toggle for multi-select inside forms
  const toggleFormMember = (empName: string) => {
    if (formMembers.includes(empName)) {
      if (empName === formManager) {
        // PM cannot be unselected from team members
        setActionNotice({
          type: 'error',
          message: 'The Project Manager must remain a member of the project team.',
        });
        return;
      }
      setFormMembers(formMembers.filter((m) => m !== empName));
    } else {
      setFormMembers([...formMembers, empName]);
    }
  };

  // Member details helper: links members to actual `people` profile
  const getMemberProfile = (memberStr: string): Person | undefined => {
    const clean = memberStr.toLowerCase().trim();
    return people.find((p) => {
      return (
        p.name.toLowerCase().trim() === clean ||
        p.email.toLowerCase().trim() === clean ||
        (p.employeeId && p.employeeId.toLowerCase().trim() === clean)
      );
    });
  };

  // Calculate task metrics for a project
  const getProjectTaskMetrics = (proj: Project) => {
    const pTasks = (tasks || []).filter(
      (t) =>
        (t.project && t.project.toLowerCase().trim() === proj.name.toLowerCase().trim()) ||
        (t as any).projectId === proj.id
    );
    const total = pTasks.length;
    const completed = pTasks.filter((t) => t.completed).length;
    const inProgress = pTasks.filter((t) => !t.completed && (t.status === 'in_progress' || (t as any).inProgress)).length;
    const pending = total - completed - inProgress;

    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = pTasks.filter((t) => !t.completed && t.dueDate && t.dueDate < todayStr).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : proj.progress || 0;

    return { total, completed, inProgress, pending, overdue, completionRate, pTasks };
  };

  // ==========================================
  // VIEW 1: DEDICATED PROJECT DETAILS PAGE ("Next Page")
  // ==========================================
  if (selectedProject) {
    const taskMetrics = getProjectTaskMetrics(selectedProject);
    const pmProfile = getMemberProfile(selectedProject.manager || selectedProject.managerEmail || '');
    const todayStr = new Date().toISOString().split('T')[0];
    const isOverdue =
      Boolean(selectedProject.endDate && selectedProject.endDate < todayStr) &&
      selectedProject.status !== 'completed' &&
      selectedProject.status !== 'cancelled';

    // Days remaining calculation
    let daysRemainingText = 'On schedule';
    if (selectedProject.endDate) {
      const diffMs = new Date(selectedProject.endDate).getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        daysRemainingText = `${Math.abs(diffDays)} days overdue`;
      } else if (diffDays === 0) {
        daysRemainingText = 'Due today';
      } else {
        daysRemainingText = `${diffDays} days remaining`;
      }
    }

    return (
      <div className="space-y-5 font-sans w-full">
        {/* Top Breadcrumb & Action Header */}
        <div className="bg-white p-4 sm:p-5 rounded-lg border border-[#E5E5E5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[#111827]">{selectedProject.name}</h1>
          </div>

          {/* Quick Actions (Admin only) */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setManagingTeamProject(selectedProject)}
                  className="px-3 py-1.5 rounded-md bg-[#F4F6F8] hover:bg-[#E2E8F0] text-[#111827] text-xs font-semibold border border-[#E5E5E5] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                >
                  <UserPlusIcon className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Manage Team</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusChangeProject(selectedProject)}
                  className="px-3 py-1.5 rounded-md bg-[#F4F6F8] hover:bg-[#E2E8F0] text-[#111827] text-xs font-semibold border border-[#E5E5E5] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                >
                  <RefreshCwIcon className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Change Status</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedProject)}
                  className="btn-primary py-1.5 px-3.5 text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  Edit Project
                </button>
              </>
            )}
          </div>
        </div>

        {/* Action Notice Alert */}
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

        {/* Sub-tabs Navigation */}
        <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs px-4 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setDetailsTab('overview')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer ${
              detailsTab === 'overview'
                ? 'border-[#049FD9] text-[#049FD9] font-bold'
                : 'border-transparent text-[#64748B] hover:text-[#111827]'
            }`}
          >
            Overview & Metrics
          </button>
          <button
            type="button"
            onClick={() => setDetailsTab('team')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              detailsTab === 'team'
                ? 'border-[#049FD9] text-[#049FD9] font-bold'
                : 'border-transparent text-[#64748B] hover:text-[#111827]'
            }`}
          >
            <span>Project Team</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#E2E8F0] text-[#475569]">
              {(selectedProject.members || []).length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setDetailsTab('tasks')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              detailsTab === 'tasks'
                ? 'border-[#049FD9] text-[#049FD9] font-bold'
                : 'border-transparent text-[#64748B] hover:text-[#111827]'
            }`}
          >
            <span>Tasks</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#E2E8F0] text-[#475569]">
              {taskMetrics.total}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setDetailsTab('messages')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              detailsTab === 'messages'
                ? 'border-[#049FD9] text-[#049FD9] font-bold'
                : 'border-transparent text-[#64748B] hover:text-[#111827]'
            }`}
          >
            <ChatIcon className="w-3.5 h-3.5" />
            <span>Messages</span>
          </button>
          <button
            type="button"
            onClick={() => setDetailsTab('meetings')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              detailsTab === 'meetings'
                ? 'border-[#049FD9] text-[#049FD9] font-bold'
                : 'border-transparent text-[#64748B] hover:text-[#111827]'
            }`}
          >
            <VideoIcon className="w-3.5 h-3.5" />
            <span>Meetings</span>
          </button>
          <button
            type="button"
            onClick={() => setDetailsTab('updates')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              detailsTab === 'updates'
                ? 'border-[#049FD9] text-[#049FD9] font-bold'
                : 'border-transparent text-[#64748B] hover:text-[#111827]'
            }`}
          >
            <ClockIcon className="w-3.5 h-3.5" />
            <span>Work Updates</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW & METRICS */}
        {detailsTab === 'overview' && (
          <div className="space-y-5">
            {/* 4 Overview Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Section A: Project Overview */}
              <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-3 text-xs">
                <h3 className="font-bold text-[#111827] uppercase tracking-wider text-[11px] border-b border-[#F1F5F9] pb-2 flex items-center justify-between">
                  <span>Project Overview</span>
                  <span className="text-[#049FD9] font-mono font-bold">{selectedProject.projectId || selectedProject.id}</span>
                </h3>
                <p className="text-[#4B5563] text-xs leading-relaxed">
                  {selectedProject.description || 'No description provided for this project.'}
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F1F5F9]">
                  <div>
                    <span className="text-[#94A3B8] block text-[10px]">Category</span>
                    <span className="font-semibold text-[#111827]">{selectedProject.category || 'General'}</span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block text-[10px]">Project Manager</span>
                    <span className="font-semibold text-[#111827]">{selectedProject.manager || 'Workspace Admin'}</span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block text-[10px]">Priority</span>
                    <div>{renderPriorityBadge(selectedProject.priority)}</div>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block text-[10px]">Status</span>
                    <div>{renderStatusBadge(selectedProject.status)}</div>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block text-[10px]">Start Date</span>
                    <span className="font-medium text-[#111827]">{selectedProject.startDate || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] block text-[10px]">End Date / Deadline</span>
                    <span className="font-medium text-[#111827]">{selectedProject.endDate || selectedProject.deadline || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              {/* Section D: Timeline & Milestones */}
              <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-3 text-xs">
                <h3 className="font-bold text-[#111827] uppercase tracking-wider text-[11px] border-b border-[#F1F5F9] pb-2">
                  Project Timeline & Milestones
                </h3>

                <div className={`p-3 rounded-lg border ${isOverdue ? 'bg-[#FEF2F2] border-[#EF4444]/30 text-[#991B1B]' : 'bg-[#F0FDF4] border-[#16A34A]/30 text-[#166534]'}`}>
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span>{isOverdue ? '⚠️ Project Overdue' : '✓ Timeline Status'}</span>
                    <span>{daysRemainingText}</span>
                  </div>
                  <p className="text-[11px] mt-1 opacity-90">
                    {isOverdue
                      ? `This project was due on ${selectedProject.endDate || selectedProject.deadline}. Work is currently pending completion.`
                      : `Deadline is set for ${selectedProject.endDate || selectedProject.deadline || 'upcoming'}. Work is actively progressing.`}
                  </p>
                </div>

                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                    <span className="text-[#64748B]">Project Created:</span>
                    <span className="font-semibold text-[#111827]">
                      {selectedProject.createdAt ? new Date(selectedProject.createdAt).toLocaleDateString() : 'Active workspace'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                    <span className="text-[#64748B]">Last Updated:</span>
                    <span className="font-semibold text-[#111827]">
                      {selectedProject.updatedAt ? new Date(selectedProject.updatedAt).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#64748B]">Team Size:</span>
                    <span className="font-bold text-[#049FD9]">{(selectedProject.members || []).length} assigned members</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section C: Project Progress & Task Metrics */}
            <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-[#111827] uppercase tracking-wider">
                  Project Progress & Work Metrics
                </h3>
                <span className="text-xs font-bold text-[#049FD9]">{taskMetrics.completionRate}% Completed</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#10B981] transition-all duration-300 rounded-full"
                  style={{ width: `${taskMetrics.completionRate}%` }}
                />
              </div>

              {/* 5 Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center pt-2">
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#64748B] block font-semibold">Total Tasks</span>
                  <span className="text-xl font-bold text-[#111827] block mt-1">{taskMetrics.total}</span>
                </div>
                <div className="p-3 bg-[#ECFDF5] rounded-lg border border-[#A7F3D0]">
                  <span className="text-[10px] text-[#065F46] block font-semibold">Completed</span>
                  <span className="text-xl font-bold text-[#10B981] block mt-1">{taskMetrics.completed}</span>
                </div>
                <div className="p-3 bg-[#EFF6FF] rounded-lg border border-[#BFDBFE]">
                  <span className="text-[10px] text-[#1E40AF] block font-semibold">In Progress</span>
                  <span className="text-xl font-bold text-[#3B82F6] block mt-1">{taskMetrics.inProgress}</span>
                </div>
                <div className="p-3 bg-[#FFFBEB] rounded-lg border border-[#FDE68A]">
                  <span className="text-[10px] text-[#92400E] block font-semibold">Pending</span>
                  <span className="text-xl font-bold text-[#F59E0B] block mt-1">{taskMetrics.pending}</span>
                </div>
                <div className="p-3 bg-[#FEF2F2] rounded-lg border border-[#FECACA] col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-[#991B1B] block font-semibold">Overdue</span>
                  <span className="text-xl font-bold text-[#EF4444] block mt-1">{taskMetrics.overdue}</span>
                </div>
              </div>
            </div>

            {/* Section E: Project Activity History */}
            <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-3">
              <h3 className="font-bold text-xs text-[#111827] uppercase tracking-wider">
                Recent Project Activity
              </h3>

              {isLoadingActivities ? (
                <div className="p-6 text-center text-xs text-[#64748B] flex items-center justify-center gap-2">
                  <RefreshCwIcon className="w-4 h-4 animate-spin text-[#049FD9]" />
                  <span>Loading project activity history...</span>
                </div>
              ) : projectActivities.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  No audit events recorded yet for this project.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto">
                  {projectActivities.map((act) => (
                    <div key={act.id} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs space-y-1">
                      <p className="font-semibold text-[#111827]">{act.description}</p>
                      <div className="flex items-center gap-2 text-[10px] text-[#64748B]">
                        <span>By: {act.performedBy || 'Admin'}</span>
                        <span>•</span>
                        <span>{act.timestamp ? new Date(act.timestamp).toLocaleString() : 'Recent'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PROJECT TEAM MANAGEMENT */}
        {detailsTab === 'team' && (
          <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E5]">
              <div>
                <h3 className="font-bold text-base text-[#111827]">Project Team & Roles</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {(selectedProject.members || []).length} assigned workspace members
                </p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setManagingTeamProject(selectedProject)}
                  className="btn-primary py-1.5 px-3.5 text-xs font-semibold cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <UserPlusIcon className="w-3.5 h-3.5" />
                  <span>Manage Team</span>
                </button>
              )}
            </div>

            <div className="divide-y divide-[#F1F5F9]">
              {(selectedProject.members || []).map((memberStr) => {
                const profile = getMemberProfile(memberStr);
                const isPM =
                  memberStr.toLowerCase() === (selectedProject.manager || '').toLowerCase() ||
                  (selectedProject.managerEmail && memberStr.toLowerCase() === selectedProject.managerEmail.toLowerCase());

                return (
                  <div key={memberStr} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full ${profile?.avatarBg || 'bg-[#049FD9] text-white'} font-bold flex items-center justify-center text-xs shrink-0`}
                      >
                        {profile?.avatar || memberStr[0]?.toUpperCase() || 'M'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#111827] truncate">
                            {profile?.name || memberStr}
                          </span>
                          {isPM && (
                            <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD]">
                              Project Manager
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#64748B] truncate">
                          {profile?.department || 'Engineering'} • {profile?.role || profile?.designation || 'Team Member'}
                          {profile?.email && ` • ${profile.email}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {profile?.email && onNavigateToEmployee && (
                        <button
                          type="button"
                          onClick={() => onNavigateToEmployee(profile.email)}
                          className="px-2.5 py-1 text-xs text-[#049FD9] hover:underline cursor-pointer"
                        >
                          View Profile
                        </button>
                      )}
                      {isAdmin && !isPM && (
                        <button
                          type="button"
                          onClick={() => {
                            setManagingTeamProject(selectedProject);
                            handleRemoveTeamMember(memberStr);
                          }}
                          className="px-2 py-1 text-xs text-[#EF4444] hover:bg-[#FEF2F2] rounded cursor-pointer"
                          title="Remove from project"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: TASKS LIST */}
        {detailsTab === 'tasks' && (
          <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <h3 className="font-bold text-base text-[#111827]">
                Project Tasks ({taskMetrics.total})
              </h3>
              <span className="text-xs font-bold text-[#10B981]">{taskMetrics.completed} Completed</span>
            </div>

            {taskMetrics.pTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                No individual tasks are assigned to this project yet. Use "New Task" from the top menu to add project tasks.
              </div>
            ) : (
              <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-lg overflow-hidden text-xs">
                {taskMetrics.pTasks.map((t) => (
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
                        <span className={`font-semibold block truncate ${t.completed ? 'line-through text-[#94A3B8]' : 'text-[#111827]'}`}>
                          {t.title}
                        </span>
                        <span className="text-[11px] text-[#64748B]">Assigned to: {t.assignedTo || 'Unassigned'}</span>
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
                          t.completed ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF3C7] text-[#B45309]'
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

        {/* TAB 4: CAMPFIRE MESSAGES */}
        {detailsTab === 'messages' && (
          <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-4">
            <h3 className="font-bold text-base text-[#111827]">Campfire Project Chat</h3>
            <div className="h-64 border border-[#E2E8F0] rounded-lg p-4 overflow-y-auto space-y-3 bg-[#F8FAFC] text-xs">
              {(customMessages[selectedProject.id] || [
                {
                  id: 'init-1',
                  sender: selectedProject.manager || 'Workspace Admin',
                  text: `Welcome to the ${selectedProject.name} workspace! Use this channel to coordinate objectives and milestones.`,
                  time: '10:00 AM',
                },
              ]).map((msg) => (
                <div key={msg.id} className="p-3 bg-white rounded-lg border border-[#E2E8F0] shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#111827] mb-1">
                    <span>{msg.sender}</span>
                    <span className="text-[#94A3B8] font-normal">{msg.time}</span>
                  </div>
                  <p className="text-xs text-[#334155]">{msg.text}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Type a message to project team..."
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (!chatInputText.trim()) return;
                    const newMsg = {
                      id: `msg-${Date.now()}`,
                      sender: currentUser?.fullName || 'Admin',
                      text: chatInputText.trim(),
                      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    };
                    setCustomMessages((prev) => ({
                      ...prev,
                      [selectedProject.id]: [...(prev[selectedProject.id] || []), newMsg],
                    }));
                    setChatInputText('');
                  }
                }}
                className="flex-1 px-3 py-2 border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
              />
              <button
                type="button"
                onClick={() => {
                  if (!chatInputText.trim()) return;
                  const newMsg = {
                    id: `msg-${Date.now()}`,
                    sender: currentUser?.fullName || 'Admin',
                    text: chatInputText.trim(),
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  };
                  setCustomMessages((prev) => ({
                    ...prev,
                    [selectedProject.id]: [...(prev[selectedProject.id] || []), newMsg],
                  }));
                  setChatInputText('');
                }}
                className="btn-primary py-2 px-4 text-xs font-semibold cursor-pointer"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: MEETINGS */}
        {detailsTab === 'meetings' && (
          <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-4 text-xs">
            <h3 className="font-bold text-base text-[#111827]">Scheduled Project Syncs</h3>
            <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#111827]">Weekly Sprint Standup</h4>
                <p className="text-[11px] text-[#64748B] mt-0.5">Every Monday & Thursday • 10:00 AM IST</p>
              </div>
              <button
                type="button"
                onClick={() => alert('Starting video room for ' + selectedProject.name)}
                className="btn-primary py-1.5 px-3.5 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
              >
                <VideoIcon className="w-3.5 h-3.5" />
                <span>Join Sync</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 6: WORK UPDATES */}
        {detailsTab === 'updates' && (
          <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-4 text-xs">
            <h3 className="font-bold text-base text-[#111827]">Work Updates & Check-ins</h3>
            <div className="space-y-2">
              <textarea
                rows={2}
                placeholder="Share a project progress update with the team..."
                value={newUpdateText}
                onChange={(e) => setNewUpdateText(e.target.value)}
                className="w-full p-2.5 border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9] resize-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newUpdateText.trim()) return;
                  const newUpd = {
                    id: `upd-${Date.now()}`,
                    project: selectedProject.name,
                    author: currentUser?.fullName || 'Admin',
                    role: 'Team Lead',
                    timeAgo: 'Just now',
                    text: newUpdateText.trim(),
                    category: 'Verified Submission',
                  };
                  setCustomUpdates((prev) => [newUpd, ...prev]);
                  setNewUpdateText('');
                }}
                className="btn-primary py-1.5 px-3.5 text-xs font-semibold cursor-pointer"
              >
                Post Update
              </button>
            </div>

            <div className="space-y-3 pt-3 border-t border-[#E5E5E5]">
              {customUpdates.map((upd) => (
                <div key={upd.id} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  <div className="flex items-center justify-between font-semibold text-[#111827] text-xs">
                    <span>{upd.author}</span>
                    <span className="text-[10px] text-[#94A3B8]">{upd.timeAgo}</span>
                  </div>
                  <p className="text-xs text-[#475569] mt-1">{upd.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: STANDARD PROJECT MANAGEMENT DASHBOARD
  // ==========================================
  return (
    <div className="space-y-5 font-sans w-full">
      {/* 1. TOP SUMMARY METRIC CARDS (Dynamic From Firestore) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Projects */}
        <div className="bg-white rounded-lg p-3.5 border border-[#E5E5E5] shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Total Projects</div>
            <div className="text-xl sm:text-2xl font-bold text-[#111827] mt-0.5">{summaryMetrics.total}</div>
            <div className="text-[10px] text-[#049FD9] font-medium">All recorded</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#E0F2FE] text-[#049FD9] flex items-center justify-center shrink-0">
            <FolderIcon className="w-4 h-4" />
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-white rounded-lg p-3.5 border border-[#E5E5E5] shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Active</div>
            <div className="text-xl sm:text-2xl font-bold text-[#10B981] mt-0.5">{summaryMetrics.active}</div>
            <div className="text-[10px] text-[#10B981] font-medium">In progress</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#DCFCE7] text-[#10B981] flex items-center justify-center shrink-0">
            <FolderIcon className="w-4 h-4" />
          </div>
        </div>

        {/* Planning Projects */}
        <div className="bg-white rounded-lg p-3.5 border border-[#E5E5E5] shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Planning</div>
            <div className="text-xl sm:text-2xl font-bold text-[#3B82F6] mt-0.5">{summaryMetrics.planning}</div>
            <div className="text-[10px] text-[#3B82F6] font-medium">Pre-kickoff</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center shrink-0">
            <ClockIcon className="w-4 h-4" />
          </div>
        </div>

        {/* On Hold Projects */}
        <div className="bg-white rounded-lg p-3.5 border border-[#E5E5E5] shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">On Hold</div>
            <div className="text-xl sm:text-2xl font-bold text-[#D97706] mt-0.5">{summaryMetrics.onHold}</div>
            <div className="text-[10px] text-[#F59E0B] font-medium">Paused</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
            <ClockIcon className="w-4 h-4" />
          </div>
        </div>

        {/* Completed Projects */}
        <div className="bg-white rounded-lg p-3.5 border border-[#E5E5E5] shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Completed</div>
            <div className="text-xl sm:text-2xl font-bold text-[#16A34A] mt-0.5">{summaryMetrics.completed}</div>
            <div className="text-[10px] text-[#16A34A] font-medium">Delivered</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0">
            <CheckSquareIcon className="w-4 h-4" />
          </div>
        </div>

        {/* Overdue Projects */}
        <div className="bg-white rounded-lg p-3.5 border border-[#E5E5E5] shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Overdue</div>
            <div className="text-xl sm:text-2xl font-bold text-[#EF4444] mt-0.5">{summaryMetrics.overdue}</div>
            <div className="text-[10px] text-[#EF4444] font-medium">Past deadline</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center shrink-0">
            <AlertCircleIcon className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 2. TOP ACTION HEADER */}
      <div className="bg-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-lg border border-[#E5E5E5] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-xl font-bold text-[#111827] tracking-tight shrink-0">
          Project Management Directory
        </h1>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          {/* View Mode Toggle: Table / Cards / Kanban */}
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
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-[#111827] shadow-2xs font-semibold' : 'text-[#595959] hover:text-[#111827]'
              }`}
            >
              Cards
            </button>
          </div>

          {/* Create Project Button (Admin Only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="btn-primary shrink-0 flex items-center gap-1.5 text-xs py-1.5 px-3.5 cursor-pointer whitespace-nowrap shadow-2xs"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create Project</span>
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

      {/* 3. SEARCH, FILTERS & CONTROLS BAR (All Dropdowns Strictly Open Below) */}
      <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-3">
        {/* Full-Width Search Input */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search projects by name, Project ID, manager, or category..."
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

        {/* Filter Controls Row (All in single line without wrapping) */}
        <div className="pt-2 border-t border-[#F1F5F9] flex items-center gap-2 text-xs text-[#334155] overflow-x-auto scrollbar-none flex-nowrap">
          {/* Status Filter */}
          <FilterDropdown
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'planning', label: 'Planning' },
              { value: 'active', label: 'Active' },
              { value: 'on_hold', label: 'On Hold' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />

          {/* Priority Filter */}
          <FilterDropdown
            label="Priority"
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={[
              { value: 'all', label: 'All Priorities' },
              { value: 'critical', label: 'Critical' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
          />

          {/* Project Manager Filter */}
          <FilterDropdown
            label="Manager"
            value={managerFilter}
            onChange={setManagerFilter}
            options={[
              { value: 'all', label: 'All Managers' },
              ...projectManagerOptions.map((pm) => ({ value: pm, label: pm })),
            ]}
          />

          {/* Date Range Filter */}
          <FilterDropdown
            label="Timeline"
            value={dateFilter}
            onChange={setDateFilter}
            options={[
              { value: 'all', label: 'All Timelines' },
              { value: 'overdue', label: 'Overdue Only' },
              { value: 'this_month', label: 'Due This Month' },
              { value: 'recent', label: 'Last 30 Days' },
            ]}
          />

          {/* Sort Controls (Placed directly beside Timeline) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-semibold text-[#64748B]">Sort:</span>
            <FilterDropdown
              align="left"
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              options={[
                { value: 'date_desc', label: 'Deadline (Newest)' },
                { value: 'date_asc', label: 'Deadline (Oldest)' },
                { value: 'name_asc', label: 'Name (A → Z)' },
                { value: 'name_desc', label: 'Name (Z → A)' },
                { value: 'priority', label: 'Priority (High → Low)' },
                { value: 'progress', label: 'Progress (%)' },
              ]}
            />
          </div>

          {/* Reset Filters */}
          {(searchQuery ||
            statusFilter !== 'all' ||
            priorityFilter !== 'all' ||
            managerFilter !== 'all' ||
            dateFilter !== 'all' ||
            sortBy !== 'date_desc') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 rounded-md bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#EF4444] text-xs font-semibold cursor-pointer transition-colors border border-[#EF4444]/20 flex items-center gap-1 shrink-0 whitespace-nowrap"
              title="Reset all filters"
            >
              <span>✕</span>
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. PROFESSIONAL 10-COLUMN ENTERPRISE TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5E5E5] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-3.5 whitespace-nowrap">Project ID</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Project Name</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Project Manager</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Assigned Employees</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Start Date</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">End Date</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Priority</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Progress</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5] font-medium text-[#334155]">
                {displayedProjects.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-[#64748B]">
                      <p className="font-semibold text-sm text-[#111827]">No projects found</p>
                      <p className="text-xs text-[#94A3B8] mt-1">Try adjusting your search criteria or filters.</p>
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-3 px-3 py-1.5 bg-[#F4F6F8] hover:bg-[#E2E8F0] text-[#111827] font-semibold text-xs rounded-md border border-[#E5E5E5] cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  displayedProjects.map((proj) => {
                    const taskMetrics = getProjectTaskMetrics(proj);
                    const membersList = proj.members || [];
                    const pmName = proj.manager || 'Workspace Admin';

                    return (
                      <tr key={proj.id} className="hover:bg-[#F8FAFC] transition-colors">
                        {/* Project ID */}
                        <td className="py-3 px-3.5 font-mono font-bold text-[#049FD9] whitespace-nowrap">
                          {proj.projectId || proj.id}
                        </td>

                        {/* Project Name */}
                        <td className="py-3 px-3.5 font-bold text-[#111827]">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProject(proj);
                              if (onSelectProject) onSelectProject(proj);
                            }}
                            className="text-left hover:text-[#049FD9] hover:underline cursor-pointer flex flex-col"
                          >
                            <span className="truncate max-w-[200px]">{proj.name}</span>
                            <span className="text-[10px] text-[#94A3B8] font-normal truncate max-w-[200px]">
                              {proj.category || 'General'}
                            </span>
                          </button>
                        </td>

                        {/* Project Manager */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#E0F2FE] text-[#049FD9] font-bold text-[10px] flex items-center justify-center shrink-0">
                              {pmName[0]?.toUpperCase() || 'M'}
                            </div>
                            <span className="font-semibold text-[#111827]">{pmName}</span>
                          </div>
                        </td>

                        {/* Assigned Employees */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="flex items-center -space-x-1.5 overflow-hidden">
                            {membersList.slice(0, 4).map((m, idx) => {
                              const emp = getMemberProfile(m);
                              return (
                                <div
                                  key={idx}
                                  title={emp?.name || m}
                                  className={`w-6 h-6 rounded-full border border-white flex items-center justify-center text-[10px] font-bold text-white shadow-2xs ${
                                    emp?.avatarBg || 'bg-[#049FD9]'
                                  }`}
                                >
                                  {emp?.avatar || m[0]?.toUpperCase() || 'E'}
                                </div>
                              );
                            })}
                            {membersList.length > 4 && (
                              <div className="w-6 h-6 rounded-full bg-[#E2E8F0] border border-white flex items-center justify-center text-[9px] font-bold text-[#475569]">
                                +{membersList.length - 4}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Start Date */}
                        <td className="py-3 px-3.5 text-[#64748B] whitespace-nowrap">
                          {proj.startDate || '—'}
                        </td>

                        {/* End Date */}
                        <td className="py-3 px-3.5 text-[#64748B] whitespace-nowrap">
                          {proj.endDate || proj.deadline || '—'}
                        </td>

                        {/* Priority */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {renderPriorityBadge(proj.priority)}
                        </td>

                        {/* Project Status */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {renderStatusBadge(proj.status)}
                        </td>

                        {/* Progress */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="w-24">
                            <div className="flex items-center justify-between text-[10px] font-semibold text-[#475569] mb-1">
                              <span>{taskMetrics.completionRate}%</span>
                              <span className="text-[9px] text-[#94A3B8]">({taskMetrics.completed}/{taskMetrics.total})</span>
                            </div>
                            <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#10B981] rounded-full"
                                style={{ width: `${taskMetrics.completionRate}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProject(proj);
                                if (onSelectProject) onSelectProject(proj);
                              }}
                              className="px-2.5 py-1 rounded bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0284C7] font-semibold text-[11px] cursor-pointer transition-colors"
                              title="View full project details"
                            >
                              View
                            </button>

                            {isAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(proj)}
                                  className="px-2.5 py-1 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] font-semibold text-[11px] cursor-pointer transition-colors"
                                  title="Edit project"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setManagingTeamProject(proj)}
                                  className="px-2.5 py-1 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] font-semibold text-[11px] cursor-pointer transition-colors"
                                  title="Manage team members"
                                >
                                  Team
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStatusChangeProject(proj)}
                                  className="px-2.5 py-1 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] font-semibold text-[11px] cursor-pointer transition-colors"
                                  title="Change status"
                                >
                                  Status
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setArchivingProject(proj)}
                                  className="px-2 py-1 rounded text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEF2F2] text-[11px] cursor-pointer transition-colors"
                                  title="Archive project"
                                >
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. CARDS VIEW */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedProjects.length === 0 ? (
            <div className="col-span-full py-12 text-center text-[#64748B] bg-white rounded-lg border border-[#E5E5E5]">
              <p className="font-semibold text-sm text-[#111827]">No projects match your filters.</p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 px-3 py-1.5 bg-[#F4F6F8] hover:bg-[#E2E8F0] text-[#111827] font-semibold text-xs rounded-md border border-[#E5E5E5] cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            displayedProjects.map((proj) => {
              const taskMetrics = getProjectTaskMetrics(proj);
              const membersList = proj.members || [];

              return (
                <div
                  key={proj.id}
                  className="bg-white rounded-lg border border-[#E5E5E5] p-5 shadow-2xs hover:border-[#049FD9] transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-[#049FD9] block">
                          {proj.projectId || proj.id}
                        </span>
                        <h3 className="font-bold text-base text-[#111827] mt-0.5 line-clamp-1">{proj.name}</h3>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {renderPriorityBadge(proj.priority)}
                        {renderStatusBadge(proj.status)}
                      </div>
                    </div>

                    <p className="text-xs text-[#64748B] line-clamp-2 leading-relaxed">
                      {proj.description || 'No description provided.'}
                    </p>

                    <div className="pt-2 border-t border-[#F1F5F9] space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#94A3B8]">Manager:</span>
                        <span className="font-semibold text-[#111827]">{proj.manager || 'Workspace Admin'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#94A3B8]">Deadline:</span>
                        <span className="font-semibold text-[#111827]">{proj.endDate || proj.deadline || '—'}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-[#475569] mb-1">
                        <span>Progress</span>
                        <span className="text-[#049FD9]">{taskMetrics.completionRate}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#10B981] rounded-full"
                          style={{ width: `${taskMetrics.completionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                    <div className="flex items-center -space-x-1.5">
                      {membersList.slice(0, 3).map((m, idx) => {
                        const emp = getMemberProfile(m);
                        return (
                          <div
                            key={idx}
                            title={emp?.name || m}
                            className={`w-6 h-6 rounded-full border border-white flex items-center justify-center text-[10px] font-bold text-white shadow-2xs ${
                              emp?.avatarBg || 'bg-[#049FD9]'
                            }`}
                          >
                            {emp?.avatar || m[0]?.toUpperCase() || 'E'}
                          </div>
                        );
                      })}
                      {membersList.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-[#E2E8F0] border border-white flex items-center justify-center text-[9px] font-bold text-[#475569]">
                          +{membersList.length - 3}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProject(proj);
                          if (onSelectProject) onSelectProject(proj);
                        }}
                        className="px-3 py-1 rounded bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0284C7] font-semibold text-xs cursor-pointer transition-colors"
                      >
                        View Project
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(proj)}
                          className="px-2.5 py-1 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] font-semibold text-xs cursor-pointer transition-colors"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}



      {/* ======================================================== */}
      {/* MODAL 1: CREATE PROJECT (CONNECTED TO FIRESTORE)         */}
      {/* ======================================================== */}
      {isCreateModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans overflow-y-auto"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-lg p-6 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div>
                <h3 className="text-base font-bold text-[#111827]">Create New Project</h3>
                <p className="text-xs text-[#64748B]">Set up project scope, manager, team, timeline, and priorities.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-7 h-7 rounded-md bg-[#F4F6F8] text-[#595959] hover:text-[#111827] flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="space-y-3.5">
              {/* Project Name */}
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mobile Banking App v2"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                />
              </div>

              {/* Project Description */}
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Project Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Key deliverables, business goals, requirements..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9] resize-none"
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Mobile Apps">Mobile Apps</option>
                    <option value="UI/UX Design">UI/UX Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="DevOps & Cloud">DevOps & Cloud</option>
                    <option value="Internal Operations">Internal Operations</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Priority <span className="text-red-500">*</span></label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as ProjectPriority)}
                    className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Project Manager Selection */}
              <div className="relative" ref={formPMDropdownRef}>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Project Manager <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={
                      isFormPMDropdownOpen
                        ? formPMSearch
                        : formManager
                        ? (() => {
                            const emp = activeEmployees.find((p) => p.name.toLowerCase() === formManager.toLowerCase());
                            return emp ? `${emp.name} (${emp.role || emp.designation} • ${emp.department})` : formManager;
                          })()
                        : ''
                    }
                    onChange={(e) => {
                      setFormPMSearch(e.target.value);
                      if (!isFormPMDropdownOpen) setIsFormPMDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setIsFormPMDropdownOpen(true);
                      setFormPMSearch('');
                    }}
                    placeholder="Select Project Manager..."
                    className={`w-full px-3 py-2 pr-14 bg-white border rounded-md text-xs font-medium text-[#111827] placeholder-[#888888] focus:outline-none transition-all cursor-pointer ${
                      isFormPMDropdownOpen
                        ? 'border-[#049FD9] ring-1 ring-[#049FD9]'
                        : 'border-[#CCCCCC] hover:border-[#999999]'
                    }`}
                  />
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
                    {formManager && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormManager('');
                          setFormManagerEmail('');
                          setFormPMSearch('');
                        }}
                        className="text-[#888888] hover:text-[#111827] text-xs p-0.5 cursor-pointer"
                        title="Clear manager"
                      >
                        ✕
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsFormPMDropdownOpen((prev) => !prev);
                        if (!isFormPMDropdownOpen) setFormPMSearch('');
                      }}
                      className="text-[#888888] hover:text-[#111827] p-0.5 cursor-pointer"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform duration-150 ${
                          isFormPMDropdownOpen ? 'rotate-180 text-[#049FD9]' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Dropdown Menu - Strictly Opens Below (Single box only!) */}
                {isFormPMDropdownOpen && (
                  <div
                    className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-[#CCCCCC] rounded-md shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-[#F1F5F9] font-sans animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: '100%' }}
                  >
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFormManager('');
                        setFormManagerEmail('');
                        setIsFormPMDropdownOpen(false);
                        setFormPMSearch('');
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[#888888] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                    >
                      Select Project Manager...
                    </button>
                    {filteredFormPMEmp.length === 0 ? (
                      <div className="py-4 text-center text-xs text-[#888888]">
                        No employees match &ldquo;{formPMSearch}&rdquo;
                      </div>
                    ) : (
                      filteredFormPMEmp.map((emp) => {
                        const isChosen = emp.name.toLowerCase() === formManager.toLowerCase();
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFormManager(emp.name);
                              setFormManagerEmail(emp.email || '');
                              if (!formMembers.includes(emp.name)) {
                                setFormMembers([...formMembers, emp.name]);
                              }
                              setIsFormPMDropdownOpen(false);
                              setFormPMSearch('');
                            }}
                            className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              isChosen
                                ? 'bg-[#E0F2FE] text-[#0284C7] font-semibold'
                                : 'text-[#111827] hover:bg-[#F8FAFC]'
                            }`}
                          >
                            <div>
                              <span className="font-semibold block">{emp.name}</span>
                              <span className="text-[10px] text-[#64748B]">
                                {emp.role || emp.designation}
                                {emp.department ? ` • ${emp.department}` : ''}
                              </span>
                            </div>
                            {isChosen && <span className="text-[#0284C7] font-bold text-xs shrink-0">✓</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
                <span className="text-[10px] text-[#64748B] mt-0.5 block">
                  Only active employees from Employee Management can lead projects.
                </span>
              </div>

              {/* Team Members Multi-Select */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#111827]">
                    Assign Team Members {formMembers.length > 0 && (
                      <span className="text-[#0284C7] font-bold ml-1">({formMembers.length} selected)</span>
                    )}
                  </label>
                  {formMembers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormMembers(formManager ? [formManager] : [])}
                      className="text-[11px] text-[#64748B] hover:text-red-500 font-medium transition-colors cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                {/* Team Search Box */}
                <div className="relative mb-2">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#888888]">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={formTeamSearch}
                    onChange={(e) => setFormTeamSearch(e.target.value)}
                    placeholder="Search employees by name, role, department..."
                    className="w-full pl-8 pr-7 py-1.5 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] placeholder-[#888888] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] transition-all"
                  />
                  {formTeamSearch && (
                    <button
                      type="button"
                      onClick={() => setFormTeamSearch('')}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#888888] hover:text-[#111827] text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="p-2.5 bg-[#F8FAFC] border border-[#CCCCCC] rounded-md max-h-36 overflow-y-auto space-y-1 text-xs">
                  {filteredFormEmployees.length === 0 ? (
                    <div className="py-4 text-center text-xs text-[#888888]">
                      No employees match &ldquo;{formTeamSearch}&rdquo;
                    </div>
                  ) : (
                    filteredFormEmployees.map((emp) => {
                      const isChecked = formMembers.includes(emp.name);
                      const isPM = emp.name === formManager;

                      return (
                        <label
                          key={emp.id}
                          className={`p-1.5 rounded flex items-center justify-between cursor-pointer transition-colors ${
                            isChecked ? 'bg-[#E0F2FE] text-[#0284C7] font-semibold' : 'hover:bg-white text-[#475569]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isPM}
                              onChange={() => toggleFormMember(emp.name)}
                              className="w-3.5 h-3.5 text-[#049FD9] rounded cursor-pointer"
                            />
                            <span>{emp.name}</span>
                            <span className="text-[10px] text-[#94A3B8]">
                              ({emp.role || emp.designation}{emp.department ? ` • ${emp.department}` : ''})
                            </span>
                          </div>
                          {isPM && <span className="text-[10px] font-bold text-[#0284C7]">PM</span>}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">
                    End Date / Deadline <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  />
                </div>
              </div>

              {/* Initial Status */}
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Initial Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as ProjectStatus)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                >
                  <option value="planning">Planning (Default)</option>
                  <option value="active">Active</option>
                </select>
              </div>

              {/* Project Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Project Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Confidential notes, special client considerations..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9] resize-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-md bg-[#F4F6F8] hover:bg-[#E2E8F0] text-[#111827] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="btn-primary py-2 px-5 text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Project</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: EDIT PROJECT                                    */}
      {/* ======================================================== */}
      {editingProject && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingProject(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans overflow-y-auto"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-lg p-6 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div>
                <h3 className="text-base font-bold text-[#111827]">Edit Project Information</h3>
                <p className="text-xs text-[#64748B] font-mono">
                  {editingProject.projectId || editingProject.id} • {editingProject.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="w-7 h-7 rounded-md bg-[#F4F6F8] text-[#595959] hover:text-[#111827] flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              {/* Project Name */}
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Project Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9] resize-none"
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Mobile Apps">Mobile Apps</option>
                    <option value="UI/UX Design">UI/UX Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="DevOps & Cloud">DevOps & Cloud</option>
                    <option value="Internal Operations">Internal Operations</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as ProjectPriority)}
                    className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Project Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as ProjectStatus)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Project Manager */}
              <div className="relative" ref={editPMDropdownRef}>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Project Manager</label>
                <div className="relative">
                  <input
                    type="text"
                    value={
                      isEditPMDropdownOpen
                        ? editPMSearch
                        : formManager
                        ? (() => {
                            const emp = activeEmployees.find((p) => p.name.toLowerCase() === formManager.toLowerCase());
                            return emp ? `${emp.name} (${emp.role || emp.designation} • ${emp.department})` : formManager;
                          })()
                        : ''
                    }
                    onChange={(e) => {
                      setEditPMSearch(e.target.value);
                      if (!isEditPMDropdownOpen) setIsEditPMDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setIsEditPMDropdownOpen(true);
                      setEditPMSearch('');
                    }}
                    placeholder="Select Project Manager..."
                    className={`w-full px-3 py-2 pr-14 bg-white border rounded-md text-xs font-medium text-[#111827] placeholder-[#888888] focus:outline-none transition-all cursor-pointer ${
                      isEditPMDropdownOpen
                        ? 'border-[#049FD9] ring-1 ring-[#049FD9]'
                        : 'border-[#CCCCCC] hover:border-[#999999]'
                    }`}
                  />
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
                    {formManager && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormManager('');
                          setFormManagerEmail('');
                          setEditPMSearch('');
                        }}
                        className="text-[#888888] hover:text-[#111827] text-xs p-0.5 cursor-pointer"
                        title="Clear manager"
                      >
                        ✕
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditPMDropdownOpen((prev) => !prev);
                        if (!isEditPMDropdownOpen) setEditPMSearch('');
                      }}
                      className="text-[#888888] hover:text-[#111827] p-0.5 cursor-pointer"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform duration-150 ${
                          isEditPMDropdownOpen ? 'rotate-180 text-[#049FD9]' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Dropdown Menu - Strictly Opens Below (Single box only!) */}
                {isEditPMDropdownOpen && (
                  <div
                    className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-[#CCCCCC] rounded-md shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-[#F1F5F9] font-sans animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: '100%' }}
                  >
                    {filteredEditPMEmp.length === 0 ? (
                      <div className="py-4 text-center text-xs text-[#888888]">
                        No employees match &ldquo;{editPMSearch}&rdquo;
                      </div>
                    ) : (
                      filteredEditPMEmp.map((emp) => {
                        const isChosen = emp.name.toLowerCase() === formManager.toLowerCase();
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFormManager(emp.name);
                              setFormManagerEmail(emp.email || '');
                              if (!formMembers.includes(emp.name)) {
                                setFormMembers([...formMembers, emp.name]);
                              }
                              setIsEditPMDropdownOpen(false);
                              setEditPMSearch('');
                            }}
                            className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              isChosen
                                ? 'bg-[#E0F2FE] text-[#0284C7] font-semibold'
                                : 'text-[#111827] hover:bg-[#F8FAFC]'
                            }`}
                          >
                            <div>
                              <span className="font-semibold block">{emp.name}</span>
                              <span className="text-[10px] text-[#64748B]">
                                {emp.role || emp.designation}
                                {emp.department ? ` • ${emp.department}` : ''}
                              </span>
                            </div>
                            {isChosen && <span className="text-[#0284C7] font-bold text-xs shrink-0">✓</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">End Date / Deadline</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Project Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9] resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 rounded-md bg-[#F4F6F8] hover:bg-[#E2E8F0] text-[#111827] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="btn-primary py-2 px-5 text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: MANAGE TEAM MEMBERS                             */}
      {/* ======================================================== */}
      {managingTeamProject && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setManagingTeamProject(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div>
                <h3 className="text-base font-bold text-[#111827]">Manage Project Team</h3>
                <p className="text-xs text-[#64748B] font-mono">
                  {managingTeamProject.name} ({managingTeamProject.projectId || managingTeamProject.id})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManagingTeamProject(null)}
                className="w-7 h-7 rounded-md bg-[#F4F6F8] text-[#595959] hover:text-[#111827] flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Current Project Manager */}
            <div className="p-3 bg-[#E0F2FE] rounded-lg border border-[#BAE6FD] flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-[#0284C7] font-bold uppercase block">Current Project Manager</span>
                <span className="font-bold text-[#111827] text-sm">{managingTeamProject.manager}</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedNewPM}
                  onChange={(e) => setSelectedNewPM(e.target.value)}
                  className="px-2 py-1 text-xs bg-white border border-[#BAE6FD] rounded-md font-medium text-[#111827]"
                >
                  <option value="">Change PM to...</option>
                  {activeEmployees.map((e) => (
                    <option key={e.id} value={e.name}>
                      {e.name}
                    </option>
                  ))}
                </select>
                {selectedNewPM && (
                  <button
                    type="button"
                    onClick={handleChangePM}
                    className="px-2.5 py-1 bg-[#0284C7] text-white rounded text-xs font-semibold cursor-pointer"
                  >
                    Update
                  </button>
                )}
              </div>
            </div>

            {/* Add New Member Section */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-semibold text-[#111827]">Add Active Employee to Team</label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedNewMember}
                  onChange={(e) => setSelectedNewMember(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                >
                  <option value="">Select active employee...</option>
                  {activeEmployees
                    .filter((e) => !(managingTeamProject.members || []).includes(e.name))
                    .map((emp) => (
                      <option key={emp.id} value={emp.name}>
                        {emp.name} ({emp.role || emp.designation} - {emp.department})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedNewMember || isProcessing}
                  onClick={handleAddTeamMember}
                  className="btn-primary py-2 px-4 text-xs font-semibold cursor-pointer disabled:opacity-50 shrink-0"
                >
                  Add Member
                </button>
              </div>
            </div>

            {/* Members List */}
            <div className="space-y-2 pt-2 border-t border-[#E5E5E5]">
              <span className="text-xs font-semibold text-[#111827] block">
                Current Members ({(managingTeamProject.members || []).length})
              </span>
              <div className="max-h-48 overflow-y-auto divide-y divide-[#F1F5F9] border border-[#E5E5E5] rounded-md p-1">
                {(managingTeamProject.members || []).map((mStr) => {
                  const emp = getMemberProfile(mStr);
                  const isPM = mStr.toLowerCase() === (managingTeamProject.manager || '').toLowerCase();

                  return (
                    <div key={mStr} className="p-2 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[#111827]">{emp?.name || mStr}</span>
                          {isPM && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#E0F2FE] text-[#0284C7]">
                              PM
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#64748B] block">
                          {emp?.department || 'General'} • {emp?.role || emp?.designation || 'Team Member'}
                        </span>
                      </div>

                      {!isPM && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTeamMember(mStr)}
                          className="text-xs text-[#EF4444] hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setManagingTeamProject(null)}
                className="btn-primary py-1.5 px-4 text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: QUICK CHANGE STATUS                             */}
      {/* ======================================================== */}
      {statusChangeProject && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setStatusChangeProject(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
              <h3 className="text-sm font-bold text-[#111827]">Change Project Status</h3>
              <button
                type="button"
                onClick={() => setStatusChangeProject(null)}
                className="text-xs text-[#64748B] hover:text-[#111827]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#64748B]">
              Update the active lifecycle status for <strong>{statusChangeProject.name}</strong>.
            </p>

            <div className="space-y-2">
              {(
                [
                  { s: 'planning', label: 'Planning', desc: 'Work has not started yet' },
                  { s: 'active', label: 'Active', desc: 'Work is currently in progress' },
                  { s: 'on_hold', label: 'On Hold', desc: 'Work is temporarily paused' },
                  { s: 'completed', label: 'Completed', desc: 'Project successfully finished' },
                  { s: 'cancelled', label: 'Cancelled', desc: 'Project has been terminated' },
                ] as Array<{ s: ProjectStatus; label: string; desc: string }>
              ).map(({ s, label, desc }) => {
                const isSelected = (statusChangeProject.status || '').toLowerCase() === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSaveStatusChange(s)}
                    className={`w-full p-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'border-[#049FD9] bg-[#E0F2FE] text-[#0284C7] font-bold'
                        : 'border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#334155]'
                    }`}
                  >
                    <div>
                      <span className="block font-semibold">{label}</span>
                      <span className="text-[10px] text-[#64748B] block mt-0.5">{desc}</span>
                    </div>
                    {isSelected && <span className="text-[#0284C7] font-bold">✓</span>}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[#E5E5E5] flex justify-end">
              <button
                type="button"
                onClick={() => setStatusChangeProject(null)}
                className="px-3 py-1.5 rounded-md bg-[#F4F6F8] text-[#111827] text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: ARCHIVE / DELETE CONFIRMATION                   */}
      {/* ======================================================== */}
      {archivingProject && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setArchivingProject(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center font-bold text-lg mx-auto">
              ⚠️
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-[#111827]">Archive or Delete Project</h3>
              <p className="text-xs text-[#64748B]">
                Are you sure you want to manage <strong>{archivingProject.name}</strong>?
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmArchive('archive')}
                className="w-full py-2 px-3 rounded-md bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#B45309] font-bold text-xs cursor-pointer transition-colors"
              >
                Archive Project (Hide from view)
              </button>
              <button
                type="button"
                onClick={() => handleConfirmArchive('delete')}
                className="w-full py-2 px-3 rounded-md bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] font-bold text-xs cursor-pointer transition-colors"
              >
                Permanently Delete Project
              </button>
              <button
                type="button"
                onClick={() => setArchivingProject(null)}
                className="w-full py-2 px-3 rounded-md bg-[#F4F6F8] hover:bg-[#E2E8F0] text-[#111827] font-semibold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
