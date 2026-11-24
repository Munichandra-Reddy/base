'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Project, Task, FileItem, Person, ProjectStatus, ProjectPriority, EmployeeActivityLog, CampfireMessage, ProjectLearningPlan } from '@/lib/types';
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
import {
  getProjectConversationId,
  subscribeToConversationMessages,
  sendCampfireMessage,
  normalizeUserKey,
} from '@/lib/firebaseChatService';
import { UploadFileModal } from './UploadFileModal';
import { downloadProjectFile, deleteProjectFile } from '@/lib/firebaseFilesService';

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
  currentUser?: { email: string; fullName: string; companyName?: string; role?: string; uid?: string } | null;
  selectedProjectId?: string | null;
  onSelectProject?: (project: Project | null) => void;
  onUpdateProject?: (project: Project) => void;
  onDeleteProject?: (id: string) => void;
  onNavigateToEmployee?: (email: string) => void;
  onNavigateToChat?: (conversationId?: string) => void;
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
  onNavigateToChat,
}) => {
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

  // Project Details sub-tab: 'learning' | 'overview' | 'team' | 'tasks' | 'messages' | 'meetings' | 'updates' | 'files'
  const [detailsTab, setDetailsTab] = useState<'learning' | 'overview' | 'team' | 'tasks' | 'messages' | 'meetings' | 'updates' | 'files'>('learning');

  // Phase 8: Project Files states
  const [isProjectUploadModalOpen, setIsProjectUploadModalOpen] = useState(false);
  const [projectFileSearch, setProjectFileSearch] = useState('');
  const [previewingProjectFile, setPreviewingProjectFile] = useState<FileItem | null>(null);
  const [deletingProjectFileId, setDeletingProjectFileId] = useState<string | null>(null);

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

  // Project-Based Learning (PBL) Form Fields
  const [formTeamName, setFormTeamName] = useState('Kaling');
  const [formProjectType, setFormProjectType] = useState<'website' | 'app'>('website');
  const [formTechStackUiUx, setFormTechStackUiUx] = useState('Brand Kit, Figma Design System');
  const [formTechStackFrontend, setFormTechStackFrontend] = useState('React.js / Next.js, Tailwind CSS');
  const [formTechStackBackend, setFormTechStackBackend] = useState('Node.js, Express, REST APIs');
  const [formTechStackDatabase, setFormTechStackDatabase] = useState('PostgreSQL / Firebase Cloud, Vercel');
  const [formWeekendMeetingDate, setFormWeekendMeetingDate] = useState('');

  // Project-Based Learning Modals & Controls State
  const [isScopeModalOpen, setIsScopeModalOpen] = useState(false);
  const [scopeObjectives, setScopeObjectives] = useState('');
  const [scopeDeliverables, setScopeDeliverables] = useState('');
  const [scopeProposedTechStack, setScopeProposedTechStack] = useState('');
  const [scopeDocUrl, setScopeDocUrl] = useState('');
  const [scopeContent, setScopeContent] = useState('');

  const [isDivideWorkModalOpen, setIsDivideWorkModalOpen] = useState(false);
  const [streamTaskStream, setStreamTaskStream] = useState<'ui_ux' | 'frontend' | 'backend' | 'database_cloud'>('ui_ux');
  const [streamTaskMember, setStreamTaskMember] = useState('');
  const [streamTaskTitle, setStreamTaskTitle] = useState('');
  const [streamTaskDescription, setStreamTaskDescription] = useState('');
  const [streamTaskSprintWeek, setStreamTaskSprintWeek] = useState('Sprint 1 (Week 1)');
  const [streamTaskDueDate, setStreamTaskDueDate] = useState('');
  const [streamTaskPriority, setStreamTaskPriority] = useState<ProjectPriority>('medium');

  const [isWeekendMeetingModalOpen, setIsWeekendMeetingModalOpen] = useState(false);
  const [meetingDateInput, setMeetingDateInput] = useState('');
  const [meetingAgendaInput, setMeetingAgendaInput] = useState('');
  const [meetingNotesInput, setMeetingNotesInput] = useState('');

  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionNotesInput, setRevisionNotesInput] = useState('');

  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [liveUrlInput, setLiveUrlInput] = useState('');
  const [finalReportUrlInput, setFinalReportUrlInput] = useState('');

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
  const [realtimeProjectMessages, setRealtimeProjectMessages] = useState<CampfireMessage[]>([]);
  const [customMessages, setCustomMessages] = useState<Record<string, Array<{ id: string; sender: string; text: string; time: string }>>>({});
  const [newUpdateText, setNewUpdateText] = useState('');
  const [customUpdates, setCustomUpdates] = useState<Array<{ id: string; project: string; author: string; role: string; timeAgo: string; text: string; category: string }>>([]);

  // Subscribe to Project Campfire chat messages in real-time
  useEffect(() => {
    if (!selectedProject?.id || detailsTab !== 'messages') return;
    const convId = getProjectConversationId(selectedProject.id);
    const unsub = subscribeToConversationMessages(convId, (msgs) => {
      setRealtimeProjectMessages(msgs);
    });
    return () => unsub();
  }, [selectedProject?.id, detailsTab]);

  // Send Project Campfire message
  const handleSendProjectMessage = async () => {
    if (!chatInputText.trim() || !selectedProject?.id) return;
    const convId = getProjectConversationId(selectedProject.id);
    const textToSend = chatInputText.trim();
    setChatInputText('');

    const userEmail = (currentUser?.email || 'admin@workorbit.com').toLowerCase().trim();
    const userName = currentUser?.fullName || (isAdmin ? 'Workspace Admin' : 'Employee');
    const userKey = normalizeUserKey(userEmail);

    try {
      await sendCampfireMessage({
        conversationId: convId,
        senderUid: userKey,
        senderName: userName,
        senderEmail: userEmail,
        senderAvatar: userName[0]?.toUpperCase() || 'U',
        senderAvatarBg: isAdmin ? 'bg-[#011826] text-white' : 'bg-blue-100 text-blue-800',
        text: textToSend,
        messageType: 'text',
      });
    } catch (e) {
      console.warn('Error sending project chat message:', e);
    }
  };

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
          return Boolean(d && typeof d === 'string' && d.startsWith(currentYearMonth));
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
    const nextWeekend = new Date();
    nextWeekend.setDate(nextWeekend.getDate() + ((6 - nextWeekend.getDay() + 7) % 7 || 7));

    setFormName('');
    setFormDescription('');
    setFormCategory('Web Development');
    const defaultPM = currentUser?.fullName || activeEmployees[0]?.name || 'Workspace Admin';
    const defaultPMEmail = currentUser?.email || activeEmployees[0]?.email || '';
    setFormManager(defaultPM);
    setFormManagerEmail(defaultPMEmail);
    setFormMembers([defaultPM]);
    setFormStartDate(start);
    setFormEndDate(end);
    setFormPriority('medium');
    setFormStatus('planning');
    setFormNotes('');
    setFormTeamName('Kaling');
    setFormProjectType('website');
    setFormTechStackUiUx('Brand Kit, Figma Design System');
    setFormTechStackFrontend('React.js / Next.js, Tailwind CSS');
    setFormTechStackBackend('Node.js, Express, REST APIs');
    setFormTechStackDatabase('PostgreSQL / Firebase Cloud, Vercel');
    setFormWeekendMeetingDate(nextWeekend.toISOString().split('T')[0]);
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
          teamName: formTeamName.trim() || 'Team',
          projectType: formProjectType,
          mentorName: formManager.trim() || currentUser?.fullName || 'Workspace Admin',
          mentorEmail: formManagerEmail.trim() || currentUser?.email || '',
          techStackUiUx: formTechStackUiUx,
          techStackFrontend: formTechStackFrontend,
          techStackBackend: formTechStackBackend,
          techStackDatabase: formTechStackDatabase,
          weekendMeetingDate: formWeekendMeetingDate,
        }),
      });

      const data = await res.json();
      if (data.success && data.project) {
        setIsCreateModalOpen(false);
        setActionNotice({
          type: 'success',
          message: data.message || `Project "${formName}" with Team "${formTeamName}" has been created successfully.`,
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
    setFormTeamName(project.teamName || 'Kaling');
    setFormProjectType((project.projectType as 'website' | 'app') || 'website');
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
          teamName: formTeamName.trim() || editingProject.teamName || 'Team',
          projectType: formProjectType || editingProject.projectType || 'website',
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

  // ==========================================
  // PROJECT-BASED LEARNING (PBL) ACTIONS
  // ==========================================
  const getStreamLabel = (stream?: string) => {
    switch (stream) {
      case 'ui_ux':
        return 'UI/UX [Brand Kit]';
      case 'frontend':
        return 'Frontend [React.js]';
      case 'backend':
        return 'Backend [APIs]';
      case 'database_cloud':
        return 'Database & Cloud';
      default:
        return stream || 'General Stream';
    }
  };

  // Submit Scope of Document (Team Members)
  const handleSaveScopeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setIsProcessing(true);
    setActionNotice(null);

    const updatedLP = {
      ...(selectedProject.learningPlan || {}),
      teamName: selectedProject.teamName || selectedProject.learningPlan?.teamName || 'Team',
      projectType: selectedProject.projectType || selectedProject.learningPlan?.projectType || 'website',
      scopeOfDocument: {
        submitted: true,
        submittedBy: currentUser?.email || '',
        submittedByName: currentUser?.fullName || 'Team Member',
        submittedAt: new Date().toISOString(),
        objectives: scopeObjectives.trim(),
        deliverables: scopeDeliverables.trim(),
        proposedTechStack: scopeProposedTechStack.trim(),
        documentUrl: scopeDocUrl.trim(),
        content: scopeContent.trim(),
        status: 'submitted' as const,
      },
      stage: 'scope_submitted' as const,
      techStack: {
        uiUx: selectedProject.learningPlan?.techStack?.uiUx || 'Brand Kit, Figma Design System',
        frontend: selectedProject.learningPlan?.techStack?.frontend || (scopeProposedTechStack.includes('React') ? 'React.js' : 'Frontend Framework'),
        backend: selectedProject.learningPlan?.techStack?.backend || 'Node.js, Express, REST APIs',
        databaseCloud: selectedProject.learningPlan?.techStack?.databaseCloud || 'PostgreSQL / Firebase Cloud',
        notes: scopeProposedTechStack,
      },
    };

    try {
      const res = await fetch('/api/projects/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser?.email || 'admin@basecamp.com',
        },
        body: JSON.stringify({
          id: selectedProject.id,
          learningPlan: updatedLP,
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        if (onUpdateProject) onUpdateProject(data.project);
        setSelectedProject(data.project);
        setIsScopeModalOpen(false);
        setActionNotice({ type: 'success', message: 'Scope of Document submitted to Project Manager (Mentor/Client) for review!' });
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Failed to submit scope document.' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Error submitting scope document.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Mentor Review: Approve Scope & Lock Tech Stack
  const handleApproveScopeAndLockTechStack = async () => {
    if (!selectedProject) return;
    setIsProcessing(true);
    setActionNotice(null);

    const updatedLP = {
      ...(selectedProject.learningPlan || {}),
      scopeOfDocument: {
        ...(selectedProject.learningPlan?.scopeOfDocument || {}),
        status: 'approved' as const,
        reviewedAt: new Date().toISOString(),
      },
      techStackLocked: true,
      stage: 'tech_stack_locked' as const,
      workDivisionStatus: 'in_progress' as const,
    };

    try {
      const res = await fetch('/api/projects/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser?.email || 'admin@basecamp.com',
        },
        body: JSON.stringify({
          id: selectedProject.id,
          status: 'active',
          learningPlan: updatedLP,
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        if (onUpdateProject) onUpdateProject(data.project);
        setSelectedProject(data.project);
        setActionNotice({
          type: 'success',
          message: 'Scope approved & Tech Stack LOCKED! Project work can now be divided into UI/UX, Frontend, Backend, and Database Cloud streams.',
        });
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Failed to lock tech stack.' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Error approving scope.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Mentor Review: Request Revisions
  const handleRequestScopeRevisions = async (feedbackNotes: string) => {
    if (!selectedProject || !feedbackNotes.trim()) return;
    setIsProcessing(true);
    setActionNotice(null);

    const updatedLP = {
      ...(selectedProject.learningPlan || {}),
      scopeOfDocument: {
        ...(selectedProject.learningPlan?.scopeOfDocument || {}),
        status: 'revisions_requested' as const,
        mentorFeedback: feedbackNotes.trim(),
        reviewedAt: new Date().toISOString(),
      },
      stage: 'scope_pending' as const,
    };

    try {
      const res = await fetch('/api/projects/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser?.email || 'admin@basecamp.com',
        },
        body: JSON.stringify({
          id: selectedProject.id,
          learningPlan: updatedLP,
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        if (onUpdateProject) onUpdateProject(data.project);
        setSelectedProject(data.project);
        setIsRevisionModalOpen(false);
        setActionNotice({ type: 'success', message: 'Revision feedback sent to team.' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Error sending revision feedback.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Assign specific stream responsibility to dedicated team member
  const handleUpdateStreamAssignment = async (role: 'frontend' | 'backend' | 'database' | 'testing', memberName: string) => {
    if (!selectedProject) return;
    const currentLP: ProjectLearningPlan = selectedProject.learningPlan || { techStackLocked: true };
    const currentAssignments = currentLP.streamAssignments || {};
    const updatedAssignments = {
      ...currentAssignments,
      [role]: memberName,
    };

    try {
      const res = await fetch('/api/projects/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser?.email || 'admin@basecamp.com',
        },
        body: JSON.stringify({
          id: selectedProject.id,
          learningPlan: {
            ...currentLP,
            streamAssignments: updatedAssignments,
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.project) {
        setSelectedProject(data.project);
        if (onUpdateProject) onUpdateProject(data.project);
        const roleLabel = role === 'frontend' ? 'Frontend Development' : role === 'backend' ? 'Backend Development' : role === 'database' ? 'Database Management' : 'Testing';
        setActionNotice({
          type: 'success',
          message: memberName ? `Assigned ${memberName} to ${roleLabel}.` : `Cleared assignment for ${roleLabel}.`,
        });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Failed to update responsibility.' });
    }
  };

  // Work Division: Create & Assign Stream Task
  const handleSaveStreamTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !streamTaskTitle.trim() || !streamTaskMember) return;
    setIsProcessing(true);
    setActionNotice(null);

    const assignedEmp = activeEmployees.find((p) => p.name.toLowerCase() === streamTaskMember.toLowerCase());

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || 'admin@basecamp.com',
        },
        body: JSON.stringify({
          title: streamTaskTitle.trim(),
          description: streamTaskDescription.trim() || `Stream: ${streamTaskStream.toUpperCase()} deliverable for ${streamTaskSprintWeek}`,
          project: selectedProject.name,
          projectId: selectedProject.id,
          assignedTo: streamTaskMember,
          assignedToEmail: assignedEmp?.email || '',
          assignedToId: assignedEmp?.id || '',
          assignedToRole: assignedEmp?.role || assignedEmp?.designation || '',
          assignedToDept: assignedEmp?.department || '',
          startDate: new Date().toISOString().split('T')[0],
          dueDate: streamTaskDueDate || new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
          priority: streamTaskPriority,
          stream: streamTaskStream,
          streamName: getStreamLabel(streamTaskStream),
          sprintWeek: streamTaskSprintWeek,
          weekendMeetingReview: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsDivideWorkModalOpen(false);
        setStreamTaskTitle('');
        setStreamTaskDescription('');
        setActionNotice({
          type: 'success',
          message: `Task successfully assigned to ${streamTaskMember} under stream [${getStreamLabel(streamTaskStream)}].`,
        });
      } else {
        setActionNotice({ type: 'error', message: data.error || 'Failed to create stream task.' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Error creating stream task.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Weekend Meeting Update
  const handleSaveWeekendMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setIsProcessing(true);
    setActionNotice(null);

    const updatedLP = {
      ...(selectedProject.learningPlan || {}),
      weekendMeeting: {
        scheduledDate: meetingDateInput.trim(),
        agenda: meetingAgendaInput.trim(),
        meetingNotes: meetingNotesInput.trim(),
        status: 'scheduled' as const,
      },
    };

    try {
      const res = await fetch('/api/projects/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser?.email || 'admin@basecamp.com',
        },
        body: JSON.stringify({
          id: selectedProject.id,
          learningPlan: updatedLP,
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        if (onUpdateProject) onUpdateProject(data.project);
        setSelectedProject(data.project);
        setIsWeekendMeetingModalOpen(false);
        setActionNotice({ type: 'success', message: 'Weekend Sprint review meeting updated successfully.' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Error updating weekend meeting.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Testing & Final Report & Live URL
  const handleSaveLiveAndReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setIsProcessing(true);
    setActionNotice(null);

    const updatedLP = {
      ...(selectedProject.learningPlan || {}),
      liveUrl: liveUrlInput.trim(),
      finalDocumentReport: {
        submitted: Boolean(finalReportUrlInput.trim()),
        reportUrl: finalReportUrlInput.trim(),
      },
      stage: liveUrlInput.trim() ? ('live' as const) : ('final_report' as const),
    };

    try {
      const res = await fetch('/api/projects/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser?.email || 'admin@basecamp.com',
        },
        body: JSON.stringify({
          id: selectedProject.id,
          status: liveUrlInput.trim() ? 'completed' : selectedProject.status,
          learningPlan: updatedLP,
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        if (onUpdateProject) onUpdateProject(data.project);
        setSelectedProject(data.project);
        setIsLiveModalOpen(false);
        setActionNotice({ type: 'success', message: 'Project status, Final Report & Live URL updated!' });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err?.message || 'Error updating status.' });
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
  const handleAddTeamMember = async (empName?: string) => {
    const memberToAdd = empName || selectedNewMember;
    if (!managingTeamProject || !memberToAdd) return;
    setIsProcessing(true);
    setActionNotice(null);

    try {
      const targetEmp = activeEmployees.find((e) => e.name === memberToAdd || e.email === memberToAdd);
      const res = await fetch('/api/projects/team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser?.email || 'admin@basecamp.com',
        },
        body: JSON.stringify({
          projectId: managingTeamProject.id,
          action: 'add_member',
          memberName: targetEmp?.name || memberToAdd,
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
    // Role-based Dedicated Team Access Guard: Only employees in this project's dedicated team can access it
    if (!isAdmin && currentUser) {
      const userEmail = (currentUser.email || '').toLowerCase().trim();
      const userName = (currentUser.fullName || '').toLowerCase().trim();
      const members = (selectedProject.members || []).map((m) => m.toLowerCase().trim());
      const isMember = members.some(
        (m) =>
          m === userName ||
          m === userEmail ||
          (userName && (m.includes(userName) || userName.includes(m))) ||
          (userEmail && (m.includes(userEmail) || userEmail.includes(m)))
      );
      if (!isMember) {
        return (
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-8 text-center max-w-lg mx-auto mt-12 shadow-sm space-y-4 font-sans">
            <div className="w-14 h-14 rounded-full bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center mx-auto text-2xl font-bold">
              🔒
            </div>
            <h3 className="text-lg font-bold text-[#111827]">Access Restricted</h3>
            <p className="text-xs text-[#595959] leading-relaxed">
              You are not an assigned member of this project team. Only dedicated team members assigned to <strong>{selectedProject.name}</strong> can access and view this project.
            </p>
            <button
              type="button"
              onClick={() => setSelectedProject(null)}
              className="btn-primary text-xs py-2 px-4 cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Back to My Projects</span>
            </button>
          </div>
        );
      }
    }

    const taskMetrics = getProjectTaskMetrics(selectedProject);
    const pmProfile = getMemberProfile(selectedProject.manager || selectedProject.managerEmail || '');
    const todayStr = new Date().toISOString().split('T')[0];

    const projectFiles = files.filter(
      (f) =>
        (f.projectId && (f.projectId === selectedProject.id || f.projectId === selectedProject.projectId)) ||
        (f.project && f.project.toLowerCase() === selectedProject.name.toLowerCase())
    );

    const filteredProjectFiles = !projectFileSearch.trim()
      ? projectFiles
      : projectFiles.filter(
          (f) =>
            f.name.toLowerCase().includes(projectFileSearch.toLowerCase().trim()) ||
            (f.uploadedBy && f.uploadedBy.toLowerCase().includes(projectFileSearch.toLowerCase().trim()))
        );
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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-[#111827]">{selectedProject.name}</h1>
              {selectedProject.teamName && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
                  👥 Team: {selectedProject.teamName}
                </span>
              )}
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                {selectedProject.projectType === 'app' ? '📱 Mobile App' : '💻 Website'}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                🎓 Mentor: {selectedProject.mentorName || selectedProject.manager || 'Admin'}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Open Team Group Chat Button */}
            <button
              type="button"
              onClick={() => onNavigateToChat ? onNavigateToChat(`project_${selectedProject.id}`) : setDetailsTab('messages')}
              className="px-3 py-1.5 rounded-md bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] text-xs font-semibold border border-[#BFDBFE] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              title="Open Project Team Group Chat"
            >
              <ChatIcon className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Team Group Chat</span>
            </button>

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
            onClick={() => setDetailsTab('learning')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              detailsTab === 'learning'
                ? 'border-[#049FD9] text-[#049FD9] font-bold'
                : 'border-transparent text-[#64748B] hover:text-[#111827]'
            }`}
          >
            <span className="text-sm">🎓</span>
            <span>Project Learning Plan (PBL)</span>
            {selectedProject.learningPlan?.techStackLocked && (
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                🔒 Stack Locked
              </span>
            )}
          </button>
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
          <button
            type="button"
            onClick={() => setDetailsTab('files')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              detailsTab === 'files'
                ? 'border-[#049FD9] text-[#049FD9] font-bold'
                : 'border-transparent text-[#64748B] hover:text-[#111827]'
            }`}
          >
            <FolderIcon className="w-3.5 h-3.5" />
            <span>Docs & Files</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#E2E8F0] text-[#475569]">
              {projectFiles.length}
            </span>
          </button>
        </div>

        {/* TAB 0: PROJECT-BASED LEARNING (PBL) ROADMAP & EXECUTION */}
        {detailsTab === 'learning' && (
          <div className="space-y-5">
            {/* 1. VISUAL LEARNING LIFECYCLE PIPELINE */}
            <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                    <span>Project-Based Learning Lifecycle</span>
                    <span className="text-[11px] font-normal text-[#64748B]">
                      (Admin Mentor/Client &rarr; Team &ldquo;{selectedProject.teamName || 'Team'}&rdquo;)
                    </span>
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Follows the structured PBL roadmap: Scope of Document &rarr; Tech Stack Lock &rarr; Work Division (4 Streams) &rarr; Weekly Sprints &amp; Weekend Meets &rarr; Testing &amp; Live Product.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateToChat ? onNavigateToChat(`project_${selectedProject.id}`) : setDetailsTab('messages')}
                  className="px-3 py-1.5 rounded-md bg-[#049FD9] text-white hover:bg-[#038bbd] text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <ChatIcon className="w-3.5 h-3.5" />
                  <span>Open Team Group Chat</span>
                </button>
              </div>

              {/* 5-Step Visual Stepper */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
                {/* Step 1: Scope of Document */}
                <div className={`p-3 rounded-lg border text-xs space-y-1 ${
                  selectedProject.learningPlan?.scopeOfDocument?.status === 'approved'
                    ? 'bg-[#F0FDF4] border-[#16A34A]/30 text-[#166534]'
                    : selectedProject.learningPlan?.scopeOfDocument?.status === 'submitted'
                    ? 'bg-[#EFF6FF] border-[#2563EB]/30 text-[#1D4ED8]'
                    : 'bg-[#FFFBEB] border-[#D97706]/30 text-[#92400E]'
                }`}>
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span>1. Scope of Document</span>
                    <span>
                      {selectedProject.learningPlan?.scopeOfDocument?.status === 'approved'
                        ? '✓ Done'
                        : selectedProject.learningPlan?.scopeOfDocument?.status === 'submitted'
                        ? '⏳ In Review'
                        : '⚠️ Required'}
                    </span>
                  </div>
                  <p className="text-[10px] opacity-80">
                    {selectedProject.learningPlan?.scopeOfDocument?.status === 'approved'
                      ? 'Approved by Mentor/Client'
                      : selectedProject.learningPlan?.scopeOfDocument?.status === 'submitted'
                      ? 'Submitted for Client approval'
                      : 'Team must submit scope'}
                  </p>
                </div>

                {/* Step 2: Tech Stack Lock */}
                <div className={`p-3 rounded-lg border text-xs space-y-1 ${
                  selectedProject.learningPlan?.techStackLocked
                    ? 'bg-[#F0FDF4] border-[#16A34A]/30 text-[#166534]'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
                }`}>
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span>2. Tech Stack [Lock]</span>
                    <span>{selectedProject.learningPlan?.techStackLocked ? '🔒 Locked' : 'Pending'}</span>
                  </div>
                  <p className="text-[10px] opacity-80">
                    {selectedProject.learningPlan?.techStackLocked
                      ? 'Tech Stack locked by Client'
                      : 'Locked after Scope review'}
                  </p>
                </div>

                {/* Step 3: Work Division (4 Streams) */}
                <div className={`p-3 rounded-lg border text-xs space-y-1 ${
                  taskMetrics.total > 0
                    ? 'bg-[#F0FDF4] border-[#16A34A]/30 text-[#166534]'
                    : selectedProject.learningPlan?.techStackLocked
                    ? 'bg-[#EFF6FF] border-[#2563EB]/30 text-[#1D4ED8]'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
                }`}>
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span>3. Work Division</span>
                    <span>{taskMetrics.total > 0 ? `✓ ${taskMetrics.total} Tasks` : 'Ready'}</span>
                  </div>
                  <p className="text-[10px] opacity-80">
                    UI/UX, Frontend, Backend, Cloud
                  </p>
                </div>

                {/* Step 4: Sprints & Weekend Meet */}
                <div className={`p-3 rounded-lg border text-xs space-y-1 ${
                  selectedProject.learningPlan?.weekendMeeting?.scheduledDate
                    ? 'bg-[#F0FDF4] border-[#16A34A]/30 text-[#166534]'
                    : 'bg-[#EFF6FF] border-[#2563EB]/30 text-[#1D4ED8]'
                }`}>
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span>4. Weekly Sprints</span>
                    <span>Weekend Meet</span>
                  </div>
                  <p className="text-[10px] opacity-80">
                    {selectedProject.learningPlan?.currentSprint || 'Weekly Sprint'}
                  </p>
                </div>

                {/* Step 5: Product Live */}
                <div className={`p-3 rounded-lg border text-xs space-y-1 ${
                  selectedProject.learningPlan?.liveUrl
                    ? 'bg-[#F0FDF4] border-[#16A34A]/30 text-[#166534]'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]'
                }`}>
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span>5. Product Live</span>
                    <span>{selectedProject.learningPlan?.liveUrl ? '🚀 Live' : 'Testing/Report'}</span>
                  </div>
                  <p className="text-[10px] opacity-80">
                    Testing &rarr; Report &rarr; Live
                  </p>
                </div>
              </div>
            </div>

            {/* 2. STAGE 1: SCOPE OF DOCUMENT REVIEW / SUBMISSION */}
            <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                <div>
                  <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
                    <span>Stage 1: Scope of Document</span>
                    {selectedProject.learningPlan?.scopeOfDocument?.status === 'approved' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]">
                        ✓ Approved by Client / Mentor
                      </span>
                    )}
                    {selectedProject.learningPlan?.scopeOfDocument?.status === 'submitted' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#DBEAFE] text-[#1D4ED8] border border-[#93C5FD]">
                        ⏳ Submitted (Pending Review)
                      </span>
                    )}
                    {(!selectedProject.learningPlan?.scopeOfDocument?.status || selectedProject.learningPlan?.scopeOfDocument?.status === 'pending' || selectedProject.learningPlan?.scopeOfDocument?.status === 'revisions_requested') && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                        ⚠️ Scope Submission Required
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Team prepares the Scope of Document (SRS, architecture, features, proposed tech stack) and submits to Project Manager (acting as Client).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScopeObjectives(selectedProject.learningPlan?.scopeOfDocument?.objectives || '');
                      setScopeDeliverables(selectedProject.learningPlan?.scopeOfDocument?.deliverables || '');
                      setScopeProposedTechStack(selectedProject.learningPlan?.scopeOfDocument?.proposedTechStack || 'React.js, Node.js, Express, PostgreSQL/Firebase');
                      setScopeDocUrl(selectedProject.learningPlan?.scopeOfDocument?.documentUrl || '');
                      setScopeContent(selectedProject.learningPlan?.scopeOfDocument?.content || '');
                      setIsScopeModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-md bg-[#F4F6F8] hover:bg-[#E2E8F0] text-[#111827] text-xs font-semibold border border-[#E5E5E5] transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>📄</span>
                    <span>{selectedProject.learningPlan?.scopeOfDocument?.submitted ? 'Update Scope Doc' : 'Submit Scope of Document'}</span>
                  </button>
                </div>
              </div>

              {/* Scope Content Details */}
              {selectedProject.learningPlan?.scopeOfDocument?.submitted ? (
                <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-[#64748B] pb-2 border-b border-[#E2E8F0]">
                    <span>
                      Submitted by: <strong className="text-[#111827]">{selectedProject.learningPlan.scopeOfDocument.submittedByName || selectedProject.learningPlan.scopeOfDocument.submittedBy}</strong>
                    </span>
                    <span>
                      {selectedProject.learningPlan.scopeOfDocument.submittedAt ? new Date(selectedProject.learningPlan.scopeOfDocument.submittedAt).toLocaleString() : 'Recently'}
                    </span>
                  </div>

                  {selectedProject.learningPlan.scopeOfDocument.objectives && (
                    <div>
                      <span className="font-bold text-[#111827] block text-[11px]">Objectives &amp; Scope:</span>
                      <p className="text-[#334155] whitespace-pre-wrap mt-0.5">{selectedProject.learningPlan.scopeOfDocument.objectives}</p>
                    </div>
                  )}

                  {selectedProject.learningPlan.scopeOfDocument.deliverables && (
                    <div>
                      <span className="font-bold text-[#111827] block text-[11px]">Key Deliverables:</span>
                      <p className="text-[#334155] whitespace-pre-wrap mt-0.5">{selectedProject.learningPlan.scopeOfDocument.deliverables}</p>
                    </div>
                  )}

                  {selectedProject.learningPlan.scopeOfDocument.proposedTechStack && (
                    <div>
                      <span className="font-bold text-[#111827] block text-[11px]">Proposed Tech Stack:</span>
                      <p className="text-[#334155] mt-0.5">{selectedProject.learningPlan.scopeOfDocument.proposedTechStack}</p>
                    </div>
                  )}

                  {selectedProject.learningPlan.scopeOfDocument.documentUrl && (
                    <div className="pt-1">
                      <a
                        href={selectedProject.learningPlan.scopeOfDocument.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#049FD9] hover:underline font-bold"
                      >
                        <span>📎 View Scope of Document Attachment / Link</span>
                        <span>&nearr;</span>
                      </a>
                    </div>
                  )}

                  {/* Mentor Feedback / Revision notice */}
                  {selectedProject.learningPlan.scopeOfDocument.mentorFeedback && (
                    <div className="p-2.5 bg-[#FEF2F2] border border-[#FCA5A5] rounded text-xs text-[#991B1B]">
                      <strong>Mentor Revision Feedback:</strong> {selectedProject.learningPlan.scopeOfDocument.mentorFeedback}
                    </div>
                  )}

                  {/* Admin / Client Review Actions */}
                  {isAdmin && !selectedProject.learningPlan?.techStackLocked && (
                    <div className="pt-2 flex items-center gap-2 border-t border-[#E2E8F0] flex-wrap">
                      <button
                        type="button"
                        onClick={handleApproveScopeAndLockTechStack}
                        disabled={isProcessing}
                        className="px-3.5 py-1.5 rounded-md bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1.5"
                      >
                        <span>🔒</span>
                        <span>Approve Scope &amp; Lock Tech Stack (Client Approval)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsRevisionModalOpen(true)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 rounded-md bg-[#F4F6F8] hover:bg-[#E2E8F0] text-[#111827] text-xs font-semibold border border-[#E5E5E5] cursor-pointer"
                      >
                        Request Scope Revisions
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-xs text-[#92400E] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <strong className="block font-bold">Scope of Document Not Yet Submitted</strong>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      The team has not yet submitted the Scope of Document for client review. Team members or mentor can click &ldquo;Submit Scope of Document&rdquo; to proceed.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsScopeModalOpen(true)}
                    className="btn-primary py-1.5 px-3.5 text-xs font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    Submit Scope Now
                  </button>
                </div>
              )}
            </div>

            {/* 3. STAGE 2: TECH STACK LOCKED */}
            <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                <div>
                  <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
                    <span>Stage 2: Tech Stack [Lock]</span>
                    {selectedProject.learningPlan?.techStackLocked ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] flex items-center gap-1">
                        <span>🔒</span>
                        <span>LOCKED BY CLIENT / MENTOR</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
                        ⏳ Unlocked (Awaiting Scope Approval)
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Locked technical specifications agreed between the Client/Mentor and the Team.
                  </p>
                </div>

                {isAdmin && !selectedProject.learningPlan?.techStackLocked && (
                  <button
                    type="button"
                    onClick={handleApproveScopeAndLockTechStack}
                    className="px-3 py-1.5 rounded-md bg-[#049FD9] text-white hover:bg-[#038bbd] text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🔒 Lock Tech Stack</span>
                  </button>
                )}
              </div>

              {/* 4 Stream Tech Stack Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* 1. UI/UX [Brand Kit] */}
                <div className="p-3.5 rounded-lg border border-purple-200 bg-purple-50/40 space-y-1.5">
                  <div className="flex items-center justify-between text-purple-900 font-bold text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span>🎨</span>
                      <span>UI/UX [Brand Kit]</span>
                    </span>
                    {selectedProject.learningPlan?.techStackLocked && <span className="text-[10px]">🔒</span>}
                  </div>
                  <p className="font-semibold text-[#111827] text-xs">
                    {selectedProject.learningPlan?.techStack?.uiUx || 'Brand Kit, Figma Design System'}
                  </p>
                  <span className="text-[10px] text-[#64748B] block">Wireframes, brand colors, UI components</span>
                </div>

                {/* 2. Frontend */}
                <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/40 space-y-1.5">
                  <div className="flex items-center justify-between text-blue-900 font-bold text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span>💻</span>
                      <span>Frontend</span>
                    </span>
                    {selectedProject.learningPlan?.techStackLocked && <span className="text-[10px]">🔒</span>}
                  </div>
                  <p className="font-semibold text-[#111827] text-xs">
                    {selectedProject.learningPlan?.techStack?.frontend || 'React.js / Next.js, Tailwind CSS'}
                  </p>
                  <span className="text-[10px] text-[#64748B] block">Web app screens, state management</span>
                </div>

                {/* 3. Backend */}
                <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/40 space-y-1.5">
                  <div className="flex items-center justify-between text-amber-900 font-bold text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span>⚙️</span>
                      <span>Backend</span>
                    </span>
                    {selectedProject.learningPlan?.techStackLocked && <span className="text-[10px]">🔒</span>}
                  </div>
                  <p className="font-semibold text-[#111827] text-xs">
                    {selectedProject.learningPlan?.techStack?.backend || 'Node.js, Express, REST APIs'}
                  </p>
                  <span className="text-[10px] text-[#64748B] block">Server logic, auth, business APIs</span>
                </div>

                {/* 4. Database Cloud */}
                <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/40 space-y-1.5">
                  <div className="flex items-center justify-between text-emerald-900 font-bold text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span>☁️</span>
                      <span>Database Cloud</span>
                    </span>
                    {selectedProject.learningPlan?.techStackLocked && <span className="text-[10px]">🔒</span>}
                  </div>
                  <p className="font-semibold text-[#111827] text-xs">
                    {selectedProject.learningPlan?.techStack?.databaseCloud || 'PostgreSQL / Firebase Cloud'}
                  </p>
                  <span className="text-[10px] text-[#64748B] block">Cloud DB schema, deployment hosting</span>
                </div>
              </div>
            </div>

            {/* 4. STAGE 3: WORK DIVISION (Teams -> work divide) */}
            <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#F1F5F9] gap-3">
                <div>
                  <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
                    <span>Stage 3: Teams &rarr; Work Divide</span>
                    {selectedProject.learningPlan?.scopeOfDocument?.status === 'approved' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]">
                        ✓ Development Unlocked
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5]">
                        🔒 Development Locked
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Client/Mentor assigns core development responsibilities and divides weekly sprint tasks across the dedicated team.
                  </p>
                </div>
              </div>

              {/* DEVELOPMENT LOCK GATE: Requires Project Scope Document Approval first */}
              {selectedProject.learningPlan?.scopeOfDocument?.status !== 'approved' ? (
                <div className="p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg text-xs text-[#991B1B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🔒</span>
                    <div>
                      <strong className="block font-bold text-sm">Development Work Locked</strong>
                      <p className="text-[11px] text-[#B91C1C] mt-0.5">
                        Before starting development, the assigned team must first submit the <strong>Project Scope Document</strong> containing project requirements, planned features, technologies, and proposed tech stack. Until the Admin reviews and approves the document, the tech stack remains locked and no development work can begin.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setScopeObjectives(selectedProject.learningPlan?.scopeOfDocument?.objectives || '');
                      setScopeDeliverables(selectedProject.learningPlan?.scopeOfDocument?.deliverables || '');
                      setScopeProposedTechStack(selectedProject.learningPlan?.scopeOfDocument?.proposedTechStack || 'React.js, Node.js, Express, PostgreSQL/Firebase');
                      setScopeDocUrl(selectedProject.learningPlan?.scopeOfDocument?.documentUrl || '');
                      setScopeContent(selectedProject.learningPlan?.scopeOfDocument?.content || '');
                      setIsScopeModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded font-bold text-xs shrink-0 cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    <span>📄</span>
                    <span>{selectedProject.learningPlan?.scopeOfDocument?.submitted ? 'Review Scope Document' : 'Submit Scope Document'}</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* DEDICATED TEAM STREAM RESPONSIBILITIES (Frontend, Backend, Database, Testing) */}
                  <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                      <div>
                        <h5 className="font-bold text-[#111827] text-xs flex items-center gap-1.5">
                          <span>🎯</span>
                          <span>Assign Stream Responsibilities (Team Roles)</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]">
                            ✓ Scope Approved
                          </span>
                        </h5>
                        <p className="text-[11px] text-[#64748B] mt-0.5">
                          Admin assigns individual team members from <strong>{selectedProject.teamName || 'Dedicated Team'}</strong> to specific project streams:
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold text-[#0369A1] bg-[#E0F2FE] px-2.5 py-1 rounded-md border border-[#BAE6FD]">
                        👥 Team Members: {selectedProject.members?.length || 0}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      {/* 1. Frontend Development */}
                      <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#0369A1] flex items-center gap-1">
                            <span>💻</span> Frontend Development
                          </span>
                        </div>
                        <p className="text-[10px] text-[#64748B]">Assign one employee</p>
                        {isAdmin ? (
                          <select
                            value={selectedProject.learningPlan?.streamAssignments?.frontend || ''}
                            onChange={(e) => handleUpdateStreamAssignment('frontend', e.target.value)}
                            className="w-full p-1.5 bg-white border border-[#CCCCCC] rounded text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#049FD9] cursor-pointer"
                          >
                            <option value="">Assign one employee...</option>
                            {(selectedProject.members || []).map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="font-bold text-xs text-[#0369A1] p-1.5 bg-[#E0F2FE] rounded">
                            {selectedProject.learningPlan?.streamAssignments?.frontend || 'Unassigned'}
                          </div>
                        )}
                      </div>

                      {/* 2. Backend Development */}
                      <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#0284C7] flex items-center gap-1">
                            <span>⚙️</span> Backend Development
                          </span>
                        </div>
                        <p className="text-[10px] text-[#64748B]">Assign one employee</p>
                        {isAdmin ? (
                          <select
                            value={selectedProject.learningPlan?.streamAssignments?.backend || ''}
                            onChange={(e) => handleUpdateStreamAssignment('backend', e.target.value)}
                            className="w-full p-1.5 bg-white border border-[#CCCCCC] rounded text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#049FD9] cursor-pointer"
                          >
                            <option value="">Assign one employee...</option>
                            {(selectedProject.members || []).map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="font-bold text-xs text-[#0284C7] p-1.5 bg-[#E0F2FE] rounded">
                            {selectedProject.learningPlan?.streamAssignments?.backend || 'Unassigned'}
                          </div>
                        )}
                      </div>

                      {/* 3. Database Management */}
                      <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-700 flex items-center gap-1">
                            <span>☁️</span> Database Management
                          </span>
                        </div>
                        <p className="text-[10px] text-[#64748B]">Assign one employee</p>
                        {isAdmin ? (
                          <select
                            value={selectedProject.learningPlan?.streamAssignments?.database || ''}
                            onChange={(e) => handleUpdateStreamAssignment('database', e.target.value)}
                            className="w-full p-1.5 bg-white border border-[#CCCCCC] rounded text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#049FD9] cursor-pointer"
                          >
                            <option value="">Assign one employee...</option>
                            {(selectedProject.members || []).map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="font-bold text-xs text-emerald-700 p-1.5 bg-emerald-50 rounded">
                            {selectedProject.learningPlan?.streamAssignments?.database || 'Unassigned'}
                          </div>
                        )}
                      </div>

                      {/* 4. Testing */}
                      <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-700 flex items-center gap-1">
                            <span>🧪</span> Testing (QA)
                          </span>
                        </div>
                        <p className="text-[10px] text-[#64748B]">Assign one employee</p>
                        {isAdmin ? (
                          <select
                            value={selectedProject.learningPlan?.streamAssignments?.testing || ''}
                            onChange={(e) => handleUpdateStreamAssignment('testing', e.target.value)}
                            className="w-full p-1.5 bg-white border border-[#CCCCCC] rounded text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#049FD9] cursor-pointer"
                          >
                            <option value="">Assign one employee...</option>
                            {(selectedProject.members || []).map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="font-bold text-xs text-purple-700 p-1.5 bg-purple-50 rounded">
                            {selectedProject.learningPlan?.streamAssignments?.testing || 'Unassigned'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SPRINT TASK DIVISION HEADER & ACTION */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 gap-2">
                    <span className="font-bold text-xs text-[#111827]">
                      Sprint Tasks ({taskMetrics.total} tasks divided)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setStreamTaskMember(selectedProject.members?.[0] || '');
                        setStreamTaskDueDate(new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]);
                        setIsDivideWorkModalOpen(true);
                      }}
                      className="btn-primary py-1.5 px-3.5 text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>+ Divide Work / Assign Task</span>
                    </button>
                  </div>

                  {/* 4-Stream Tasks Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {(['ui_ux', 'frontend', 'backend', 'database_cloud'] as const).map((streamKey) => {
                  const streamTasks = taskMetrics.pTasks.filter((t) => t.stream === streamKey || (!t.stream && streamKey === 'frontend'));
                  return (
                    <div key={streamKey} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#E2E8F0]">
                        <span className="font-bold text-[#111827] text-xs">{getStreamLabel(streamKey)}</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white text-[#475569] border border-[#E2E8F0]">
                          {streamTasks.length}
                        </span>
                      </div>

                      {streamTasks.length === 0 ? (
                        <div className="py-6 text-center text-[#94A3B8] text-[11px]">
                          No tasks assigned to this stream yet.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {streamTasks.map((t) => (
                            <div key={t.id} className="p-2.5 bg-white border border-[#E5E5E5] rounded shadow-2xs space-y-1.5">
                              <div className="flex items-center justify-between gap-1 text-[10px]">
                                <span className="font-mono text-[#049FD9] font-bold">{t.taskId || t.id}</span>
                                {t.sprintWeek && (
                                  <span className="px-1 py-0.2 bg-[#F1F5F9] text-[#475569] rounded font-semibold text-[9px]">
                                    {t.sprintWeek}
                                  </span>
                                )}
                              </div>
                              <p className={`font-semibold text-xs leading-snug ${t.completed ? 'line-through text-[#94A3B8]' : 'text-[#111827]'}`}>
                                {t.title}
                              </p>
                              <div className="flex items-center justify-between pt-1 border-t border-[#F8FAFC] text-[10px]">
                                <span className="text-[#64748B] truncate max-w-[90px]">👤 {t.assignedTo}</span>
                                <div>{renderStatusBadge(t.status || 'pending')}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
                </>
              )}
            </div>

            {/* 5. STAGE 4: WEEKLY SPRINTS & WEEKEND MEETINGS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card A: Sprint Week Target */}
              <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                  <h4 className="font-bold text-[#111827] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <span>🏃 Weekly Sprint Cycle</span>
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E0F2FE] text-[#0369A1]">
                    {selectedProject.learningPlan?.currentSprint || 'Sprint 1 (Week 1)'}
                  </span>
                </div>
                <p className="text-[#64748B]">
                  Work is organized into target sprint weeks. Team members execute their module tasks and demo deliverables during the weekend meeting.
                </p>
                <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Current Sprint:</span>
                    <strong className="text-[#111827]">{selectedProject.learningPlan?.currentSprint || 'Sprint 1 (Week 1)'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Total Sprint Tasks:</span>
                    <span className="font-bold text-[#049FD9]">{taskMetrics.total} tasks</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Completed This Sprint:</span>
                    <span className="font-bold text-[#16A34A]">{taskMetrics.completed} tasks ({taskMetrics.completionRate}%)</span>
                  </div>
                </div>
              </div>

              {/* Card B: Weekend Meeting (weekend Meet) */}
              <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                  <h4 className="font-bold text-[#111827] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <span>📅 Weekend Review Meeting</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setMeetingDateInput(selectedProject.learningPlan?.weekendMeeting?.scheduledDate || '');
                      setMeetingAgendaInput(selectedProject.learningPlan?.weekendMeeting?.agenda || 'Weekly sprint review & stream demos');
                      setMeetingNotesInput(selectedProject.learningPlan?.weekendMeeting?.meetingNotes || '');
                      setIsWeekendMeetingModalOpen(true);
                    }}
                    className="text-[#049FD9] hover:underline font-bold text-xs cursor-pointer"
                  >
                    Edit Meeting
                  </button>
                </div>
                <p className="text-[#64748B]">
                  Every weekend meeting aligns team members with Project Manager / Client to review UI/UX, Frontend, Backend, and Cloud work.
                </p>
                <div className="p-3 bg-[#F0FDF4] border border-[#16A34A]/30 rounded-lg space-y-2 text-[#166534]">
                  <div className="flex justify-between font-bold text-xs">
                    <span>Scheduled Date:</span>
                    <span>{selectedProject.learningPlan?.weekendMeeting?.scheduledDate || 'This Weekend (Sat/Sun)'}</span>
                  </div>
                  <div className="text-[11px]">
                    <strong>Agenda:</strong> {selectedProject.learningPlan?.weekendMeeting?.agenda || 'Sprint review, module demo, blockers & next week targets.'}
                  </div>
                  {selectedProject.learningPlan?.weekendMeeting?.meetingNotes && (
                    <div className="text-[11px] pt-1 border-t border-[#16A34A]/20">
                      <strong>Mentor Notes:</strong> {selectedProject.learningPlan.weekendMeeting.meetingNotes}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 6. STAGE 5: PRODUCT LIFECYCLE (Testing -> Final Report -> Live) */}
            <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                <div>
                  <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
                    <span>Stage 5: Testing &rarr; Final Document &rarr; Live</span>
                    {selectedProject.learningPlan?.liveUrl && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]">
                        🚀 Live Product
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Final deliverables: QA testing, Project Report documentation, and live deployment link.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setLiveUrlInput(selectedProject.learningPlan?.liveUrl || '');
                    setFinalReportUrlInput(selectedProject.learningPlan?.finalDocumentReport?.reportUrl || '');
                    setIsLiveModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-md bg-[#F4F6F8] hover:bg-[#E2E8F0] text-[#111827] text-xs font-semibold border border-[#E5E5E5] cursor-pointer"
                >
                  Update Report &amp; Live URL
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Product Testing */}
                <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1">
                  <span className="text-[#64748B] font-bold block text-[10px] uppercase">1. Product Testing</span>
                  <span className="font-semibold text-[#111827] block">
                    {taskMetrics.completed > 0 ? `QA in progress (${taskMetrics.completed} verified)` : 'Pre-testing setup'}
                  </span>
                  <span className="text-[10px] text-[#64748B]">Automated tests &amp; manual validation</span>
                </div>

                {/* Final Document (Project Report) */}
                <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1">
                  <span className="text-[#64748B] font-bold block text-[10px] uppercase">2. Final Document (Project Report)</span>
                  {selectedProject.learningPlan?.finalDocumentReport?.reportUrl ? (
                    <a
                      href={selectedProject.learningPlan.finalDocumentReport.reportUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#049FD9] font-bold hover:underline block"
                    >
                      📎 View Final Project Report &nearr;
                    </a>
                  ) : (
                    <span className="text-[#94A3B8]">Pending report submission</span>
                  )}
                  <span className="text-[10px] text-[#64748B]">Complete project documentation &amp; specs</span>
                </div>

                {/* Live Product */}
                <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1">
                  <span className="text-[#64748B] font-bold block text-[10px] uppercase">3. Live Deployment</span>
                  {selectedProject.learningPlan?.liveUrl ? (
                    <a
                      href={selectedProject.learningPlan.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#16A34A] font-bold hover:underline block"
                    >
                      🚀 Open Live Website / App &nearr;
                    </a>
                  ) : (
                    <span className="text-[#94A3B8]">Deployment pending</span>
                  )}
                  <span className="text-[10px] text-[#64748B]">Production URL for client demonstration</span>
                </div>
              </div>
            </div>
          </div>
        )}

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
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-[#111827]">Campfire Project Chat</h3>
              <span className="text-[10px] text-[#049FD9] bg-[#F0F9FF] px-2 py-0.5 rounded border border-[#BAE6FD] font-semibold">
                Real-Time Firestore Sync
              </span>
            </div>
            <div className="h-64 border border-[#E2E8F0] rounded-lg p-4 overflow-y-auto space-y-3 bg-[#F8FAFC] text-xs">
              {realtimeProjectMessages.length === 0 ? (
                <div className="p-3 bg-white rounded-lg border border-[#E2E8F0] shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#111827] mb-1">
                    <span>{selectedProject.manager || 'Workspace Admin'}</span>
                    <span className="text-[#94A3B8] font-normal">10:00 AM</span>
                  </div>
                  <p className="text-xs text-[#334155]">
                    Welcome to the {selectedProject.name} workspace! Use this channel to coordinate objectives and milestones.
                  </p>
                </div>
              ) : (
                realtimeProjectMessages.map((msg) => (
                  <div key={msg.id} className="p-3 bg-white rounded-lg border border-[#E2E8F0] shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#111827] mb-1">
                      <span className="font-bold text-[#111827]">{msg.senderName}</span>
                      <span className="text-[#94A3B8] font-normal">{msg.timestampStr}</span>
                    </div>
                    <p className="text-xs text-[#334155]">{msg.text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Type a message to project team..."
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendProjectMessage();
                  }
                }}
                className="flex-1 px-3 py-2 border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
              />
              <button
                type="button"
                onClick={handleSendProjectMessage}
                disabled={!chatInputText.trim()}
                className="btn-primary py-2 px-4 text-xs font-semibold cursor-pointer disabled:opacity-50"
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

        {/* TAB 7: DOCS & FILES (PHASE 8) */}
        {detailsTab === 'files' && (
          <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
              <div>
                <h3 className="font-bold text-base text-[#111827] flex items-center gap-2">
                  <FolderIcon className="w-4 h-4 text-[#049FD9]" />
                  <span>Project Files & Documents</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E0F2FE] text-[#0284C7]">
                    {projectFiles.length}
                  </span>
                </h3>
                <p className="text-[#64748B] text-xs mt-0.5">
                  Centralized documents, assets, and deliverables for <span className="font-semibold text-[#334155]">{selectedProject.name}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <SearchIcon className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search project files..."
                    value={projectFileSearch}
                    onChange={(e) => setProjectFileSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 border border-[#CBD5E1] rounded-md text-xs text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#049FD9] w-48 sm:w-56"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsProjectUploadModalOpen(true)}
                  className="px-3.5 py-1.5 bg-[#049FD9] hover:bg-[#0388BA] text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
              </div>
            </div>

            {filteredProjectFiles.length === 0 ? (
              <div className="py-12 px-4 text-center border-2 border-dashed border-[#E2E8F0] rounded-lg">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center mb-3">
                  <FolderIcon className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#1E293B]">No files uploaded for this project yet</h4>
                <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1 mb-4">
                  Keep all specs, designs, spreadsheets, and deliverables centralized in one place.
                </p>
                <button
                  type="button"
                  onClick={() => setIsProjectUploadModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#049FD9] hover:bg-[#0388BA] text-white rounded-md text-xs font-semibold shadow-2xs cursor-pointer"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Upload First File</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredProjectFiles.map((file) => {
                  const canDelete =
                    isAdmin ||
                    (currentUser &&
                      (currentUser.uid === file.uploadedByUid ||
                        currentUser.email.toLowerCase() === (file.uploadedByEmail || '').toLowerCase()));
                  const isImage = String(file?.contentType || '').startsWith('image/') || file?.type === 'image';
                  const isPdf = String(file?.contentType || '').includes('pdf') || file?.type === 'pdf';

                  return (
                    <div
                      key={file.id || file.fileId}
                      className="border border-[#E2E8F0] rounded-lg p-3 hover:border-[#049FD9] transition-all bg-white shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#F4F6F8] border border-[#E5E5E5] flex items-center justify-center shrink-0 text-base">
                              📄
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-semibold text-xs text-[#1E293B] truncate" title={file.name}>
                                {file.name}
                              </h5>
                              <p className="text-[10px] text-[#64748B]">
                                {file.size} • {file.uploadedAt || 'Recently'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {file.description && (
                          <p className="text-[11px] text-[#64748B] line-clamp-2 mb-2 italic">
                            "{file.description}"
                          </p>
                        )}

                        <div className="text-[10px] text-[#475569] flex items-center gap-1 mb-3">
                          <span className="text-[#94A3B8]">By:</span>
                          <span className="font-medium text-[#1E293B] truncate">{file.uploadedBy || 'Team Member'}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          {(isImage || isPdf) && (
                            <button
                              type="button"
                              onClick={() => setPreviewingProjectFile(file)}
                              className="px-2 py-1 text-[11px] font-semibold text-[#0284C7] bg-[#E0F2FE] hover:bg-[#BAE6FD] rounded cursor-pointer transition-colors"
                            >
                              Preview
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => downloadProjectFile(file)}
                            className="px-2 py-1 text-[11px] font-semibold text-[#334155] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded cursor-pointer transition-colors"
                          >
                            Download
                          </button>
                        </div>
                        {canDelete && (
                          <button
                            type="button"
                            disabled={deletingProjectFileId === (file.fileId || file.id)}
                            onClick={async () => {
                              if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
                                const targetId = file.fileId || file.id;
                                setDeletingProjectFileId(targetId);
                                try {
                                  await deleteProjectFile({
                                    fileId: targetId,
                                    userEmail: currentUser?.email || '',
                                    userName: currentUser?.fullName || '',
                                    isAdmin: Boolean(isAdmin),
                                  });
                                } catch (err: any) {
                                  alert(err.message || 'Failed to delete file');
                                } finally {
                                  setDeletingProjectFileId(null);
                                }
                              }
                            }}
                            className="text-[11px] font-semibold text-[#EF4444] hover:text-[#DC2626] hover:bg-[#FEE2E2] px-1.5 py-1 rounded cursor-pointer transition-colors disabled:opacity-50"
                          >
                            {deletingProjectFileId === (file.fileId || file.id) ? '...' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal: Project Upload File Modal */}
        {isProjectUploadModalOpen && (
          <UploadFileModal
            isOpen={isProjectUploadModalOpen}
            onClose={() => setIsProjectUploadModalOpen(false)}
            projects={projects}
            currentUser={currentUser}
            isAdmin={isAdmin}
            preselectedProjectId={selectedProject.id}
          />
        )}

        {/* Modal: In-App Project File Preview */}
        {previewingProjectFile && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#E2E8F0]">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <div className="min-w-0 pr-4">
                  <h4 className="font-bold text-sm text-[#0F172A] truncate">{previewingProjectFile.name}</h4>
                  <p className="text-[11px] text-[#64748B]">{previewingProjectFile.size} • {previewingProjectFile.project || 'Project Document'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadProjectFile(previewingProjectFile)}
                    className="px-3 py-1.5 bg-[#049FD9] text-white text-xs font-semibold rounded-md shadow-2xs hover:bg-[#0388BA] cursor-pointer"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewingProjectFile(null)}
                    className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] rounded-md transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#0F172A]/5 min-h-[350px]">
                {(String(previewingProjectFile?.contentType || '').startsWith('image/') || previewingProjectFile?.type === 'image') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewingProjectFile.downloadUrl || previewingProjectFile.fileUrl || previewingProjectFile.url || ''}
                    alt={previewingProjectFile.name}
                    className="max-h-[75vh] max-w-full object-contain rounded shadow"
                  />
                ) : (
                  <iframe
                    src={previewingProjectFile.downloadUrl || previewingProjectFile.fileUrl || previewingProjectFile.url || ''}
                    title={previewingProjectFile.name}
                    className="w-full h-[75vh] border-0 rounded bg-white shadow"
                  />
                )}
              </div>
            </div>
          </div>
        )}

{/* ======================================================== */}
      {/* PBL MODAL A: SUBMIT / EDIT SCOPE OF DOCUMENT             */}
      {/* ======================================================== */}
      {isScopeModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsScopeModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans overflow-y-auto"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-2xl w-full max-w-lg p-6 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">📄</span>
                  <h3 className="text-base font-bold text-[#111827]">
                    {selectedProject?.learningPlan?.scopeOfDocument?.status === 'approved'
                      ? 'Update Scope of Document'
                      : 'Submit Scope of Document'}
                  </h3>
                </div>
                <p className="text-xs text-[#64748B]">
                  Team <span className="font-semibold text-[#0284C7]">{selectedProject?.teamName || 'Kaling'}</span> submits specifications for Mentor review &amp; tech stack locking.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsScopeModalOpen(false)}
                className="w-7 h-7 rounded-md bg-[#F4F6F8] text-[#595959] hover:text-[#111827] flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveScopeSubmission} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Scope Document URL or Design Link <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://docs.google.com/... or Figma PRD link"
                  value={scopeDocUrl}
                  onChange={(e) => setScopeDocUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Key Project Objectives <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="What core problems does this system solve? e.g. Customer Portal with real-time updates..."
                  value={scopeObjectives}
                  onChange={(e) => setScopeObjectives(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Proposed Tech Stack &amp; Libraries
                </label>
                <input
                  type="text"
                  placeholder="e.g. Next.js, Tailwind CSS, Firebase, Express, PostgreSQL"
                  value={scopeProposedTechStack}
                  onChange={(e) => setScopeProposedTechStack(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Planned Deliverables
                </label>
                <textarea
                  rows={2}
                  placeholder="1. UI Brand Kit &amp; Wireframes 2. Responsive Web/Mobile App 3. Backend APIs..."
                  value={scopeDeliverables}
                  onChange={(e) => setScopeDeliverables(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Executive Summary &amp; Architecture Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide additional details regarding system architecture, module boundaries, target audience..."
                  value={scopeContent}
                  onChange={(e) => setScopeContent(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9] resize-none"
                />
              </div>

              <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-md text-[11px] text-[#166534]">
                💡 <strong>Next Step:</strong> Once submitted, the Project Manager / Mentor (who also acts as the Client) will review this scope and lock the official Tech Stack before dividing work.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setIsScopeModalOpen(false)}
                  className="px-4 py-2 rounded-md bg-[#F4F6F8] hover:bg-[#E2E8F0] text-[#111827] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="btn-primary py-2 px-5 text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isProcessing ? 'Submitting...' : 'Submit Scope to Mentor →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PBL MODAL B: DIVIDE WORK INTO STREAMS & SPRINTS           */}
      {/* ======================================================== */}
      {isDivideWorkModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDivideWorkModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans overflow-y-auto"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-2xl w-full max-w-lg p-6 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <h3 className="text-base font-bold text-[#111827]">Divide Work to Team Members</h3>
                </div>
                <p className="text-xs text-[#64748B]">
                  Assign sprint tasks across the 4 work streams for{' '}
                  <span className="font-semibold text-[#0284C7]">{selectedProject?.name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDivideWorkModalOpen(false)}
                className="w-7 h-7 rounded-md bg-[#F4F6F8] text-[#595959] hover:text-[#111827] flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStreamTask} className="space-y-3.5">
              {/* Stream Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Architectural Work Stream <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'ui_ux', label: '🎨 1. UI/UX [Brand Kit]', desc: selectedProject?.learningPlan?.techStack?.uiUx || 'Figma' },
                    { key: 'frontend', label: '💻 2. Frontend [React JS]', desc: selectedProject?.learningPlan?.techStack?.frontend || 'React/Next.js' },
                    { key: 'backend', label: '⚙️ 3. Backend & APIs', desc: selectedProject?.learningPlan?.techStack?.backend || 'Node/Express' },
                    { key: 'database_cloud', label: '☁️ 4. Database Cloud', desc: selectedProject?.learningPlan?.techStack?.databaseCloud || selectedProject?.learningPlan?.techStack?.database || 'Firebase/Cloud' },
                  ].map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setStreamTaskStream(s.key as any)}
                      className={`p-2.5 text-left rounded-lg border transition-all cursor-pointer ${
                        streamTaskStream === s.key
                          ? 'border-[#0284C7] bg-[#E0F2FE] text-[#0369A1] font-bold shadow-sm'
                          : 'border-[#E2E8F0] hover:border-[#CBD5E1] text-[#475569]'
                      }`}
                    >
                      <div className="text-xs">{s.label}</div>
                      <div className="text-[10px] text-[#64748B] truncate mt-0.5">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Assignee Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Assign to Employee / Team Member <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={streamTaskMember}
                  onChange={(e) => setStreamTaskMember(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                >
                  <option value="">Select team member...</option>
                  {(selectedProject?.members && selectedProject.members.length > 0
                    ? activeEmployees.filter((emp) =>
                        selectedProject.members.some(
                          (m) => m.toLowerCase() === emp.name.toLowerCase() || m.toLowerCase() === (emp.email || '').toLowerCase()
                        )
                      )
                    : activeEmployees
                  ).map((emp) => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name} ({emp.role || emp.designation || 'Member'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sprint Week & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Sprint / Target Week</label>
                  <select
                    value={streamTaskSprintWeek}
                    onChange={(e) => setStreamTaskSprintWeek(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  >
                    <option value="Sprint 1 (Week 1)">Sprint 1 (Week 1)</option>
                    <option value="Sprint 2 (Week 2)">Sprint 2 (Week 2)</option>
                    <option value="Sprint 3 (Week 3)">Sprint 3 (Week 3)</option>
                    <option value="Sprint 4 (Week 4)">Sprint 4 (Week 4)</option>
                    <option value="Sprint 5 (Week 5)">Sprint 5 (Week 5)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Task Priority</label>
                  <select
                    value={streamTaskPriority}
                    onChange={(e) => setStreamTaskPriority(e.target.value as ProjectPriority)}
                    className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Task Title */}
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design responsive dashboard brand kit &amp; navigation"
                  value={streamTaskTitle}
                  onChange={(e) => setStreamTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Target Due Date (Weekend Review) <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={streamTaskDueDate}
                  onChange={(e) => setStreamTaskDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                />
              </div>

              {/* Task Description */}
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Work Requirements &amp; Guidelines <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Specific requirements, expected commits, deliverables for the upcoming weekend meet..."
                  value={streamTaskDescription}
                  onChange={(e) => setStreamTaskDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setIsDivideWorkModalOpen(false)}
                  className="px-4 py-2 rounded-md bg-[#F4F6F8] hover:bg-[#E2E8F0] text-[#111827] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="btn-primary py-2 px-5 text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isProcessing ? 'Assigning...' : 'Assign Task to Employee →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PBL MODAL C: SCHEDULE / EDIT WEEKEND SPRINT MEETING       */}
      {/* ======================================================== */}
      {isWeekendMeetingModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsWeekendMeetingModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans overflow-y-auto"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-2xl w-full max-w-lg p-6 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">📅</span>
                  <h3 className="text-base font-bold text-[#111827]">Weekly Sprint &amp; Weekend Meeting</h3>
                </div>
                <p className="text-xs text-[#64748B]">
                  Schedule sprint target review and record mentor feedback for{' '}
                  <span className="font-semibold text-[#0284C7]">{selectedProject?.name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsWeekendMeetingModalOpen(false)}
                className="w-7 h-7 rounded-md bg-[#F4F6F8] text-[#595959] hover:text-[#111827] flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWeekendMeeting} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Upcoming Weekend Meeting Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={meetingDateInput}
                  onChange={(e) => setMeetingDateInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Sprint Agenda &amp; Milestones to Demonstrate
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Review UI/UX brand kit prototypes, inspect React API integration, evaluate database indexes..."
                  value={meetingAgendaInput}
                  onChange={(e) => setMeetingAgendaInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Mentor Meeting Notes &amp; Action Items
                </label>
                <textarea
                  rows={3}
                  placeholder="Client/Mentor observations from the meeting, decisions taken, next sprint guidance..."
                  value={meetingNotesInput}
                  onChange={(e) => setMeetingNotesInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setIsWeekendMeetingModalOpen(false)}
                  className="px-4 py-2 rounded-md bg-[#F4F6F8] hover:bg-[#E2E8F0] text-[#111827] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="btn-primary py-2 px-5 text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isProcessing ? 'Saving...' : 'Save Meeting Schedule &amp; Notes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PBL MODAL D: REQUEST SCOPE REVISIONS (MENTOR ACTION)     */}
      {/* ======================================================== */}
      {isRevisionModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsRevisionModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans overflow-y-auto"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-2xl w-full max-w-lg p-6 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">✏️</span>
                  <h3 className="text-base font-bold text-[#111827]">Request Scope Document Revisions</h3>
                </div>
                <p className="text-xs text-[#64748B]">
                  Project Mentor / Client feedback for{' '}
                  <span className="font-semibold text-[#0284C7]">{selectedProject?.teamName || 'Team'}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRevisionModalOpen(false)}
                className="w-7 h-7 rounded-md bg-[#F4F6F8] text-[#595959] hover:text-[#111827] flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  What changes or additions are needed before tech stack lock? <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Please clarify database schema for multi-tenant support and specify component library in tech stack..."
                  value={revisionNotesInput}
                  onChange={(e) => setRevisionNotesInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setIsRevisionModalOpen(false)}
                  className="px-4 py-2 rounded-md bg-[#F4F6F8] hover:bg-[#E2E8F0] text-[#111827] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing || !revisionNotesInput.trim()}
                  onClick={() => handleRequestScopeRevisions(revisionNotesInput)}
                  className="py-2 px-5 rounded-md bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? 'Sending...' : 'Send Feedback to Team →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PBL MODAL E: PRODUCT TESTING, FINAL REPORT & GO LIVE      */}
      {/* ======================================================== */}
      {isLiveModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsLiveModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans overflow-y-auto"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-2xl w-full max-w-lg p-6 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚀</span>
                  <h3 className="text-base font-bold text-[#111827]">Product Testing, Report &amp; Go Live</h3>
                </div>
                <p className="text-xs text-[#64748B]">
                  Final milestone delivery for{' '}
                  <span className="font-semibold text-[#0284C7]">{selectedProject?.name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLiveModalOpen(false)}
                className="w-7 h-7 rounded-md bg-[#F4F6F8] text-[#595959] hover:text-[#111827] flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLiveAndReport} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Live Production URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://my-project.vercel.app or Play Store link"
                  value={liveUrlInput}
                  onChange={(e) => setLiveUrlInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Final Project Document / Report URL
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... (Comprehensive Project Report)"
                  value={finalReportUrlInput}
                  onChange={(e) => setFinalReportUrlInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9]"
                />
              </div>

              <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-md text-xs text-[#065F46] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>✅</span> Final Deliverable Checklist:
                </div>
                <p className="text-[11px]">
                  • Product QA Testing passed across UI/UX, Frontend, Backend, Cloud.<br />
                  • Final Project Report submitted.<br />
                  • Live deployment accessible to client and evaluators.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setIsLiveModalOpen(false)}
                  className="px-4 py-2 rounded-md bg-[#F4F6F8] hover:bg-[#E2E8F0] text-[#111827] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="py-2 px-5 rounded-md bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isProcessing ? 'Publishing...' : '🚀 Mark Project Live &amp; Complete'}
                </button>
              </div>
            </form>
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
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center shrink-0">
            <AlertCircleIcon className="w-4 h-4" />
          </div>
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

      {/* 2. SEARCH, FILTERS & CONTROLS BAR (All Dropdowns Strictly Open Below) */}
      <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-3">
        {/* Search Input & Action Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
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
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="btn-primary shrink-0 flex items-center gap-1.5 text-xs py-2 px-3.5 cursor-pointer whitespace-nowrap shadow-2xs"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create Project</span>
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

              {/* Project-Based Learning (PBL) Setup */}
              <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🎓</span>
                    <span className="text-xs font-bold text-[#166534]">Project-Based Learning Setup</span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                    Mentor &amp; Team Workflow
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#166534] mb-1">
                      Team / Group Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kaling"
                      value={formTeamName}
                      onChange={(e) => setFormTeamName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-[#86EFAC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#16A34A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#166534] mb-1">
                      Project Platform / Type
                    </label>
                    <select
                      value={formProjectType}
                      onChange={(e) => setFormProjectType(e.target.value as 'website' | 'app')}
                      className="w-full px-3 py-1.5 bg-white border border-[#86EFAC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#16A34A]"
                    >
                      <option value="website">Software Development [Website]</option>
                      <option value="app">Mobile Application [APP]</option>
                    </select>
                  </div>
                </div>

                {/* Tech Stack 4 Streams */}
                <div>
                  <label className="block text-[11px] font-bold text-[#166534] mb-1">
                    Target Tech Stack (Locks upon Scope Approval)
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-[#15803D] font-medium block">1. UI/UX [Brand Kit]</span>
                      <input
                        type="text"
                        value={formTechStackUiUx}
                        onChange={(e) => setFormTechStackUiUx(e.target.value)}
                        placeholder="Figma, Brand Kit, Design Tokens"
                        className="w-full px-2.5 py-1 bg-white border border-[#86EFAC] rounded text-xs text-[#111827] focus:outline-none focus:border-[#16A34A]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#15803D] font-medium block">2. Frontend [React JS]</span>
                      <input
                        type="text"
                        value={formTechStackFrontend}
                        onChange={(e) => setFormTechStackFrontend(e.target.value)}
                        placeholder="React.js / Next.js, Tailwind CSS"
                        className="w-full px-2.5 py-1 bg-white border border-[#86EFAC] rounded text-xs text-[#111827] focus:outline-none focus:border-[#16A34A]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#15803D] font-medium block">3. Backend &amp; APIs</span>
                      <input
                        type="text"
                        value={formTechStackBackend}
                        onChange={(e) => setFormTechStackBackend(e.target.value)}
                        placeholder="Node.js, Express, REST APIs"
                        className="w-full px-2.5 py-1 bg-white border border-[#86EFAC] rounded text-xs text-[#111827] focus:outline-none focus:border-[#16A34A]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#15803D] font-medium block">4. Database &amp; Cloud</span>
                      <input
                        type="text"
                        value={formTechStackDatabase}
                        onChange={(e) => setFormTechStackDatabase(e.target.value)}
                        placeholder="Firebase Cloud / PostgreSQL, Vercel"
                        className="w-full px-2.5 py-1 bg-white border border-[#86EFAC] rounded text-xs text-[#111827] focus:outline-none focus:border-[#16A34A]"
                      />
                    </div>
                  </div>
                </div>

                {/* Weekend Review Meeting */}
                <div>
                  <label className="block text-xs font-semibold text-[#166534] mb-1">
                    First Weekend Review Meeting Date
                  </label>
                  <input
                    type="date"
                    value={formWeekendMeetingDate}
                    onChange={(e) => setFormWeekendMeetingDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#86EFAC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#16A34A]"
                  />
                  <p className="text-[10px] text-[#15803D] mt-0.5">
                    Team creates Scope of Document first, then submits to Admin/Mentor (who acts as Client) for approval.
                  </p>
                </div>
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

              {/* Project-Based Learning (PBL) Setup */}
              <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🎓</span>
                    <span className="text-xs font-bold text-[#166534]">Project-Based Learning Setup</span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                    Mentor &amp; Team Workflow
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#166534] mb-1">
                      Team / Group Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kaling"
                      value={formTeamName}
                      onChange={(e) => setFormTeamName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-[#86EFAC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#16A34A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#166534] mb-1">
                      Project Platform / Type
                    </label>
                    <select
                      value={formProjectType}
                      onChange={(e) => setFormProjectType(e.target.value as 'website' | 'app')}
                      className="w-full px-3 py-1.5 bg-white border border-[#86EFAC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#16A34A]"
                    >
                      <option value="website">Software Development [Website]</option>
                      <option value="app">Mobile Application [APP]</option>
                    </select>
                  </div>
                </div>

                {/* Tech Stack 4 Streams */}
                <div>
                  <label className="block text-[11px] font-bold text-[#166534] mb-1">
                    Target Tech Stack (Locks upon Scope Approval)
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-[#15803D] font-medium block">1. UI/UX [Brand Kit]</span>
                      <input
                        type="text"
                        value={formTechStackUiUx}
                        onChange={(e) => setFormTechStackUiUx(e.target.value)}
                        placeholder="Figma, Brand Kit, Design Tokens"
                        className="w-full px-2.5 py-1 bg-white border border-[#86EFAC] rounded text-xs text-[#111827] focus:outline-none focus:border-[#16A34A]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#15803D] font-medium block">2. Frontend [React JS]</span>
                      <input
                        type="text"
                        value={formTechStackFrontend}
                        onChange={(e) => setFormTechStackFrontend(e.target.value)}
                        placeholder="React.js / Next.js, Tailwind CSS"
                        className="w-full px-2.5 py-1 bg-white border border-[#86EFAC] rounded text-xs text-[#111827] focus:outline-none focus:border-[#16A34A]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#15803D] font-medium block">3. Backend &amp; APIs</span>
                      <input
                        type="text"
                        value={formTechStackBackend}
                        onChange={(e) => setFormTechStackBackend(e.target.value)}
                        placeholder="Node.js, Express, REST APIs"
                        className="w-full px-2.5 py-1 bg-white border border-[#86EFAC] rounded text-xs text-[#111827] focus:outline-none focus:border-[#16A34A]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#15803D] font-medium block">4. Database &amp; Cloud</span>
                      <input
                        type="text"
                        value={formTechStackDatabase}
                        onChange={(e) => setFormTechStackDatabase(e.target.value)}
                        placeholder="Firebase Cloud / PostgreSQL, Vercel"
                        className="w-full px-2.5 py-1 bg-white border border-[#86EFAC] rounded text-xs text-[#111827] focus:outline-none focus:border-[#16A34A]"
                      />
                    </div>
                  </div>
                </div>

                {/* Weekend Review Meeting */}
                <div>
                  <label className="block text-xs font-semibold text-[#166534] mb-1">
                    First Weekend Review Meeting Date
                  </label>
                  <input
                    type="date"
                    value={formWeekendMeetingDate}
                    onChange={(e) => setFormWeekendMeetingDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#86EFAC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#16A34A]"
                  />
                  <p className="text-[10px] text-[#15803D] mt-0.5">
                    Team creates Scope of Document first, then submits to Admin/Mentor (who acts as Client) for approval.
                  </p>
                </div>
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
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
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
              <div className="w-full">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddTeamMember(e.target.value);
                    }
                  }}
                  disabled={isProcessing}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9] cursor-pointer disabled:opacity-50"
                >
                  <option value="">Select active employee to add...</option>
                  {activeEmployees
                    .filter((e) => !(managingTeamProject.members || []).includes(e.name))
                    .map((emp) => (
                      <option key={emp.id} value={emp.name}>
                        {emp.name} ({emp.role || emp.designation} - {emp.department})
                      </option>
                    ))}
                </select>
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
