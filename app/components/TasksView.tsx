'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Task,
  Project,
  Person,
  TaskStatus,
  TaskPriority,
  isTaskOverdue,
  TaskComment,
  TaskActivity,
  TaskSubmission,
} from '@/lib/types';
import {
  CheckSquareIcon,
  PlusIcon,
  SearchIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  FolderIcon,
  UsersIcon,
  FilterIcon,
  DownloadIcon,
  FileIcon,
} from './Icons';

interface TaskFilterDropdownProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

const TaskFilterDropdown: React.FC<TaskFilterDropdownProps> = ({
  label,
  value,
  onChange,
  options,
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
    options.find((o) => o.value === value) || options[0];

  return (
    <div className={`relative inline-flex items-center gap-1 shrink-0 ${className}`} ref={containerRef}>
      {label && <span className="text-[11px] font-medium text-[#64748B] shrink-0">{label}:</span>}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`px-2 py-1 bg-white border rounded text-xs text-[#111827] focus:outline-none cursor-pointer flex items-center justify-between gap-1 transition-all select-none shrink-0 ${
          isOpen
            ? 'border-[#049FD9] ring-1 ring-[#049FD9]'
            : 'border-[#CCCCCC] hover:border-[#999999]'
        }`}
      >
        <span className="truncate max-w-[130px] sm:max-w-[150px]">{selectedOption?.label || value}</span>
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

      {/* DROPDOWN MENU - STRICTLY POSITIONED BELOW WITH top-full mt-1 */}
      {isOpen && (
        <div
          className="absolute top-full mt-1 left-0 min-w-full w-max max-w-[260px] max-h-60 overflow-y-auto bg-white border border-[#CCCCCC] rounded-md shadow-xl z-50 py-1 font-sans animate-in fade-in zoom-in-95 duration-100"
          style={{ top: '100%' }}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#EBF7FD] text-[#049FD9] font-semibold'
                    : 'text-[#1F2937] hover:bg-[#F8FAFC]'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {active && <span className="text-[#049FD9] font-bold text-xs shrink-0">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface TasksViewProps {
  tasks: Task[];
  projects?: Project[];
  people?: Person[];
  onToggleTask?: (id: string) => void;
  onOpenAddTask?: () => void;
  isAdmin?: boolean;
  currentUser?: {
    uid?: string;
    email: string;
    fullName: string;
    companyName?: string;
    role?: string;
  } | null;
  onRefreshTasks?: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  projects = [],
  people = [],
  onToggleTask,
  onOpenAddTask,
  isAdmin = false,
  currentUser,
  onRefreshTasks,
}) => {
  // Current user identifiers
  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const userName = (currentUser?.fullName || '').trim();
  const userUid = currentUser?.uid || '';

  // Local state for tasks (synced with props.tasks)
  const [taskList, setTaskList] = useState<Task[]>(tasks);
  useEffect(() => {
    setTaskList(tasks);
  }, [tasks]);

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_progress' | 'in_review' | 'changes_requested' | 'completed' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDueDateFilter, setSelectedDueDateFilter] = useState('all');
  const [sortOption, setSortOption] = useState<'due_asc' | 'due_desc' | 'priority' | 'name'>('due_asc');

  // Modals
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewActionType, setReviewActionType] = useState<'approve' | 'request_changes'>('approve');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Form states for Create/Edit
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskProject, setTaskProject] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [taskAssignedToId, setTaskAssignedToId] = useState('');
  const [taskAssignedToEmail, setTaskAssignedToEmail] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskStartDate, setTaskStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [taskDueDate, setTaskDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [taskInstructions, setTaskInstructions] = useState('');
  const [taskAdminNotes, setTaskAdminNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Create Task Modal: Project & Assignee Dropdown states (Strictly Opens Below with Search)
  const [isTaskProjectDropdownOpen, setIsTaskProjectDropdownOpen] = useState(false);
  const [taskProjectSearch, setTaskProjectSearch] = useState('');
  const taskProjectRef = useRef<HTMLDivElement>(null);

  const [isTaskAssigneeDropdownOpen, setIsTaskAssigneeDropdownOpen] = useState(false);
  const [taskAssigneeSearch, setTaskAssigneeSearch] = useState('');
  const taskAssigneeRef = useRef<HTMLDivElement>(null);

  // Submission / Review form states
  const [submissionSummary, setSubmissionSummary] = useState('');
  const [submissionComment, setSubmissionComment] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [progressSlider, setProgressSlider] = useState<number>(0);
  const [progressNote, setProgressNote] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  // Reassign modal states
  const [reassignEmployee, setReassignEmployee] = useState('');

  // Show auto-dismiss toast
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // -------------------------------------------------------------
  // Filter active eligible employees (excluding admin)
  // -------------------------------------------------------------
  const activeEmployees = useMemo(() => {
    return people.filter((p) => {
      const email = (p.email || '').toLowerCase();
      if (email === 'cr7156816@gmail.com') return false;
      return (p.status || 'active') === 'active';
    });
  }, [people]);

  // Active valid projects (exclude cancelled)
  const validProjects = useMemo(() => {
    return projects.filter((p) => (p.status || '').toLowerCase() !== 'cancelled');
  }, [projects]);

  // Project members for selected project in Create/Edit
  const projectEligibleEmployees = useMemo(() => {
    if (!taskProject) return activeEmployees;
    const proj = projects.find((p) => p.name === taskProject || p.id === taskProject);
    if (!proj || !proj.members || proj.members.length === 0) return activeEmployees;

    const memberSet = new Set(proj.members.map((m) => m.toLowerCase().trim()));
    const matched = activeEmployees.filter(
      (emp) =>
        memberSet.has(emp.name.toLowerCase().trim()) ||
        memberSet.has(emp.email.toLowerCase().trim())
    );
    return matched.length > 0 ? matched : activeEmployees;
  }, [taskProject, projects, activeEmployees]);

  const filteredValidProjects = useMemo(() => {
    if (!taskProjectSearch.trim()) return validProjects;
    const q = taskProjectSearch.toLowerCase().trim();
    return validProjects.filter((p) =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.projectId || p.id || '').toLowerCase().includes(q)
    );
  }, [validProjects, taskProjectSearch]);

  const filteredProjectEligibleEmployees = useMemo(() => {
    if (!taskAssigneeSearch.trim()) return projectEligibleEmployees;
    const q = taskAssigneeSearch.toLowerCase().trim();
    return projectEligibleEmployees.filter((emp) =>
      (emp.name || '').toLowerCase().includes(q) ||
      (emp.role || emp.designation || '').toLowerCase().includes(q) ||
      (emp.department || '').toLowerCase().includes(q) ||
      (emp.email || '').toLowerCase().includes(q)
    );
  }, [projectEligibleEmployees, taskAssigneeSearch]);

  // Close Task Project / Assignee dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (taskProjectRef.current && !taskProjectRef.current.contains(event.target as Node)) {
        setIsTaskProjectDropdownOpen(false);
      }
      if (taskAssigneeRef.current && !taskAssigneeRef.current.contains(event.target as Node)) {
        setIsTaskAssigneeDropdownOpen(false);
      }
    };
    if (isTaskProjectDropdownOpen || isTaskAssigneeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTaskProjectDropdownOpen, isTaskAssigneeDropdownOpen]);

  // Reset dropdown and search states when create modal closes
  useEffect(() => {
    if (!isCreateModalOpen) {
      setIsTaskProjectDropdownOpen(false);
      setTaskProjectSearch('');
      setIsTaskAssigneeDropdownOpen(false);
      setTaskAssigneeSearch('');
    }
  }, [isCreateModalOpen]);

  // -------------------------------------------------------------
  // Dynamic 6 Summary Metric Calculations
  // -------------------------------------------------------------
  const summaryMetrics = useMemo(() => {
    // If employee view, consider only tasks assigned to the employee
    const baseList = isAdmin
      ? taskList
      : taskList.filter((t) => {
          if (userUid && t.assignedToId === userUid) return true;
          if (t.assignedToEmail && t.assignedToEmail.toLowerCase() === userEmail) return true;
          if (t.assignedTo && userName && t.assignedTo.toLowerCase().includes(userName.toLowerCase())) return true;
          if (t.assignedTo && userEmail && t.assignedTo.toLowerCase().includes(userEmail)) return true;
          return false;
        });

    const total = baseList.length;
    const pending = baseList.filter((t) => (t.status || 'pending') === 'pending' && !t.completed).length;
    const in_progress = baseList.filter((t) => t.status === 'in_progress').length;
    const in_review = baseList.filter((t) => t.status === 'in_review').length;
    const changes_requested = baseList.filter((t) => t.status === 'changes_requested').length;
    const completed = baseList.filter((t) => t.status === 'completed' || t.completed).length;
    const overdue = baseList.filter((t) => isTaskOverdue(t)).length;

    return { total, pending, in_progress, in_review, changes_requested, completed, overdue, baseCount: baseList.length };
  }, [taskList, isAdmin, userUid, userEmail, userName]);

  // -------------------------------------------------------------
  // Filtered Tasks for Data Table
  // -------------------------------------------------------------
  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return taskList.filter((task) => {
      // 1. Role-based isolation for employees
      if (!isAdmin) {
        const isMine =
          (userUid && task.assignedToId === userUid) ||
          (task.assignedToEmail && task.assignedToEmail.toLowerCase() === userEmail) ||
          (task.assignedTo && userName && task.assignedTo.toLowerCase().includes(userName.toLowerCase())) ||
          (task.assignedTo && userEmail && task.assignedTo.toLowerCase().includes(userEmail));
        if (!isMine) return false;
      }

      // 2. Tab Filter
      if (activeTab === 'pending') {
        if (task.status !== 'pending' && (task.status || task.completed)) return false;
      } else if (activeTab === 'in_progress') {
        if (task.status !== 'in_progress') return false;
      } else if (activeTab === 'in_review') {
        if (task.status !== 'in_review') return false;
      } else if (activeTab === 'changes_requested') {
        if (task.status !== 'changes_requested') return false;
      } else if (activeTab === 'completed') {
        if (task.status !== 'completed' && !task.completed) return false;
      } else if (activeTab === 'overdue') {
        if (!isTaskOverdue(task)) return false;
      }

      // 3. Dropdown Filter: Project
      if (selectedProject !== 'all') {
        if (task.project !== selectedProject && task.projectId !== selectedProject) return false;
      }

      // 4. Dropdown Filter: Employee (Admin only)
      if (isAdmin && selectedEmployee !== 'all') {
        if (task.assignedTo !== selectedEmployee && task.assignedToEmail !== selectedEmployee) return false;
      }

      // 5. Dropdown Filter: Priority
      if (selectedPriority !== 'all') {
        if ((task.priority || 'medium').toLowerCase() !== selectedPriority.toLowerCase()) return false;
      }

      // 6. Dropdown Filter: Status
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'overdue') {
          if (!isTaskOverdue(task)) return false;
        } else if (task.status !== selectedStatus) {
          return false;
        }
      }

      // 7. Dropdown Filter: Due Date
      if (selectedDueDateFilter === 'today') {
        if (task.dueDate !== todayStr) return false;
      } else if (selectedDueDateFilter === 'overdue') {
        if (!isTaskOverdue(task)) return false;
      } else if (selectedDueDateFilter === 'this_week') {
        const d = new Date(task.dueDate || '');
        const now = new Date();
        const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24));
        if (diffDays < 0 || diffDays > 7) return false;
      }

      // 8. Search query (title, taskId, project, assignedTo)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (task.title || '').toLowerCase().includes(q);
        const idMatch = (task.taskId || task.id || '').toLowerCase().includes(q);
        const projMatch = (task.project || '').toLowerCase().includes(q);
        const empMatch = (task.assignedTo || '').toLowerCase().includes(q);
        if (!titleMatch && !idMatch && !projMatch && !empMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortOption === 'due_asc') {
        return new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime();
      }
      if (sortOption === 'due_desc') {
        return new Date(b.dueDate || '').getTime() - new Date(a.dueDate || '').getTime();
      }
      if (sortOption === 'priority') {
        const priorityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        return (priorityOrder[(b.priority || 'medium').toLowerCase()] || 0) -
               (priorityOrder[(a.priority || 'medium').toLowerCase()] || 0);
      }
      if (sortOption === 'name') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });
  }, [
    taskList,
    isAdmin,
    userUid,
    userEmail,
    userName,
    activeTab,
    selectedProject,
    selectedEmployee,
    selectedPriority,
    selectedStatus,
    selectedDueDateFilter,
    searchQuery,
    sortOption,
  ]);

  // Reset filters handler
  const handleResetFilters = () => {
    setActiveTab('all');
    setSearchQuery('');
    setSelectedProject('all');
    setSelectedEmployee('all');
    setSelectedPriority('all');
    setSelectedStatus('all');
    setSelectedDueDateFilter('all');
    setSortOption('due_asc');
  };

  // Open dossier for a specific task
  const openDossier = (task: Task) => {
    setSelectedTask(task);
    setProgressSlider(task.progress || 0);
    setProgressNote('');
    setIsDossierOpen(true);
  };

  // Refresh dossier if currently opened
  const syncCurrentTask = (updated: Task) => {
    setSelectedTask(updated);
    setTaskList((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  // -------------------------------------------------------------
  // ACTION: CREATE TASK (Admin)
  // -------------------------------------------------------------
  const handleOpenCreateModal = () => {
    setTaskTitle('');
    setTaskDescription('');
    setTaskProject(validProjects.length > 0 ? validProjects[0].name : 'E-Commerce Website');
    setTaskAssignedTo('');
    setTaskAssignedToId('');
    setTaskAssignedToEmail('');
    setTaskPriority('medium');
    setTaskStartDate(new Date().toISOString().split('T')[0]);
    setTaskDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setTaskInstructions('');
    setTaskAdminNotes('');
    setFormError('');
    setIsTaskProjectDropdownOpen(false);
    setTaskProjectSearch('');
    setIsTaskAssigneeDropdownOpen(false);
    setTaskAssigneeSearch('');
    setIsCreateModalOpen(true);
  };

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!taskTitle.trim()) {
      setFormError('Task Title is required.');
      return;
    }
    if (!taskDescription.trim()) {
      setFormError('Task Description is required.');
      return;
    }
    if (!taskProject.trim()) {
      setFormError('Please select a valid Project.');
      return;
    }
    if (!taskAssignedTo.trim()) {
      setFormError('Please select an Assigned Employee.');
      return;
    }
    if (new Date(taskDueDate).getTime() < new Date(taskStartDate).getTime()) {
      setFormError('Due Date must not be earlier than Start Date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedEmpObj = activeEmployees.find(
        (emp) => emp.name === taskAssignedTo || emp.id === taskAssignedToId
      );
      const selectedProjObj = projects.find(
        (p) => p.name === taskProject || p.id === taskProject
      );

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
        },
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          project: taskProject.trim(),
          projectId: selectedProjObj ? selectedProjObj.id : '',
          assignedTo: taskAssignedTo.trim(),
          assignedToId: selectedEmpObj ? selectedEmpObj.id : taskAssignedToId,
          assignedToEmail: selectedEmpObj ? selectedEmpObj.email : taskAssignedToEmail,
          assignedToRole: selectedEmpObj?.role || selectedEmpObj?.designation || '',
          assignedToDept: selectedEmpObj?.department || '',
          assignedBy: userEmail || 'Admin',
          assignedByName: userName || 'Workspace Administrator',
          priority: taskPriority,
          startDate: taskStartDate,
          dueDate: taskDueDate,
          instructions: taskInstructions.trim(),
          adminNotes: taskAdminNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create task.');
      }

      setTaskList((prev) => [data.task, ...prev]);
      setIsCreateModalOpen(false);
      showToast(data.message || `Task "${taskTitle}" assigned successfully!`);
      if (onRefreshTasks) onRefreshTasks();
    } catch (err: any) {
      setFormError(err.message || 'Error creating task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // ACTION: START TASK (Employee)
  // -------------------------------------------------------------
  const handleStartTask = async (task: Task) => {
    try {
      const res = await fetch('/api/tasks/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          action: 'start',
          userUid,
          userName,
          userEmail,
          userRole: isAdmin ? 'admin' : 'employee',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to start task.');

      syncCurrentTask(data.task);
      showToast(`Started "${task.title}". Status updated to In Progress!`);
    } catch (err: any) {
      alert(err.message || 'Failed to start task.');
    }
  };

  // -------------------------------------------------------------
  // ACTION: SAVE PROGRESS (Employee)
  // -------------------------------------------------------------
  const handleSaveProgress = async () => {
    if (!selectedTask) return;
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/tasks/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask.id,
          action: 'progress',
          progress: progressSlider,
          comment: progressNote.trim(),
          userUid,
          userName,
          userEmail,
          userRole: isAdmin ? 'admin' : 'employee',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update progress.');

      syncCurrentTask(data.task);
      setProgressNote('');
      showToast(`Task progress saved at ${progressSlider}%!`);
    } catch (err: any) {
      alert(err.message || 'Failed to save progress.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // ACTION: SUBMIT FOR REVIEW (Employee)
  // -------------------------------------------------------------
  const handleSubmitForReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    if (!submissionSummary.trim()) {
      alert('Please enter a work completion summary.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/tasks/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask.id,
          action: 'submit',
          summary: submissionSummary.trim(),
          comment: submissionComment.trim(),
          progress: Math.max(90, selectedTask.progress || 90),
          userUid,
          userName,
          userEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Submission failed.');

      syncCurrentTask(data.task);
      setIsSubmitModalOpen(false);
      setSubmissionSummary('');
      setSubmissionComment('');
      showToast(`"${selectedTask.title}" submitted successfully for review!`);
    } catch (err: any) {
      alert(err.message || 'Submission error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // ACTION: ADMIN REVIEW (Approve or Request Changes)
  // -------------------------------------------------------------
  const handleOpenReviewModal = (task: Task, type: 'approve' | 'request_changes') => {
    setSelectedTask(task);
    setReviewActionType(type);
    setReviewFeedback('');
    setIsReviewModalOpen(true);
  };

  const handleReviewDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    if (reviewActionType === 'request_changes' && !reviewFeedback.trim()) {
      alert('Please specify the changes or feedback required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/tasks/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask.id,
          action: reviewActionType,
          feedbackReason: reviewFeedback.trim(),
          comment: reviewFeedback.trim(),
          userUid,
          userName,
          userEmail,
          userRole: 'admin',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Review action failed.');

      syncCurrentTask(data.task);
      setIsReviewModalOpen(false);
      showToast(data.message || 'Review completed successfully!');
    } catch (err: any) {
      alert(err.message || 'Error processing review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // ACTION: REASSIGN TASK (Admin)
  // -------------------------------------------------------------
  const handleOpenReassignModal = (task: Task) => {
    setSelectedTask(task);
    setReassignEmployee('');
    setIsReassignModalOpen(true);
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !reassignEmployee.trim()) return;

    const chosenEmp = activeEmployees.find(
      (emp) => emp.name === reassignEmployee || emp.email === reassignEmployee
    );

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/tasks/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask.id,
          newAssigneeName: chosenEmp ? chosenEmp.name : reassignEmployee,
          newAssigneeEmail: chosenEmp ? chosenEmp.email : '',
          newAssigneeId: chosenEmp ? chosenEmp.id : '',
          newAssigneeRole: chosenEmp?.role || chosenEmp?.designation || '',
          newAssigneeDept: chosenEmp?.department || '',
          adminName: userName || 'Workspace Administrator',
          adminEmail: userEmail || 'Admin',
          userRole: 'admin',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Reassign failed.');

      const updatedTask: Task = {
        ...selectedTask,
        assignedTo: chosenEmp ? chosenEmp.name : reassignEmployee,
        assignedToEmail: chosenEmp?.email,
        assignedToId: chosenEmp?.id,
        assignedToRole: chosenEmp?.role || chosenEmp?.designation,
      };
      syncCurrentTask(updatedTask);
      setIsReassignModalOpen(false);
      showToast(`Task reassigned to ${chosenEmp ? chosenEmp.name : reassignEmployee} successfully!`);
    } catch (err: any) {
      alert(err.message || 'Reassign error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // ACTION: ADD TASK COMMENT
  // -------------------------------------------------------------
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newCommentText.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/tasks/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask.id,
          userId: userUid || userEmail || 'user',
          userName: userName || 'Team Member',
          userRole: isAdmin ? 'Administrator' : 'Employee',
          message: newCommentText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to post comment.');

      const updatedComments: TaskComment[] = [
        ...(selectedTask.comments || []),
        data.comment,
      ];
      syncCurrentTask({ ...selectedTask, comments: updatedComments });
      setNewCommentText('');
      showToast('Comment posted.');
    } catch (err: any) {
      alert(err.message || 'Error adding comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for priority badge styling
  const renderPriorityBadge = (priority?: string) => {
    const p = (priority || 'medium').toLowerCase();
    switch (p) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEF2F2] text-[#991B1B] border border-[#F87171]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#FFF7ED] text-[#C2410C] border border-[#FDBA74]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
            High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0F9FF] text-[#0369A1] border border-[#BAE6FD]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7]" />
            Medium
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
            Low
          </span>
        );
    }
  };

  // Helper for status badge styling
  const renderStatusBadge = (task: Task) => {
    const isOverdue = isTaskOverdue(task);
    const s = task.status || (task.completed ? 'completed' : 'pending');

    if (isOverdue && s !== 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] animate-pulse">
          <AlertCircleIcon className="w-3 h-3 text-[#DC2626]" />
          Overdue
        </span>
      );
    }

    switch (s) {
      case 'in_review':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
            <ClockIcon className="w-3 h-3 text-[#2563EB]" />
            In Review
          </span>
        );
      case 'changes_requested':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]">
            <AlertCircleIcon className="w-3 h-3 text-[#E11D48]" />
            Changes Needed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-ping" />
            In Progress
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F4F6F8] text-[#334155] border border-[#CBD5E1]">
            <CheckCircleIcon className="w-3 h-3 text-[#16A34A]" />
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]">
            Cancelled
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-[#E5E5E5] shadow-xl animate-in slide-in-from-top-3 duration-200">
          <span className="text-base">{toastMessage.type === 'success' ? '✅' : '⚠️'}</span>
          <span className={`text-xs font-semibold ${toastMessage.type === 'success' ? 'text-[#166534]' : 'text-[#991B1B]'}`}>
            {toastMessage.text}
          </span>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-lg border border-[#E5E5E5] shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">
            {isAdmin ? 'Task Management' : 'My Tasks'}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <button
              onClick={handleOpenCreateModal}
              className="btn-primary flex items-center gap-1.5 cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. DYNAMIC SUMMARY CARDS (6 Metrics calculated dynamically from Firestore) */}
      <div className="grid grid-cols-2 min-[640px]:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3 lg:gap-4 w-full">
        {/* Metric 1: Total Tasks */}
        <div
          onClick={() => setActiveTab('all')}
          className={`bg-white p-3 rounded-[4px] border transition-all cursor-pointer flex flex-col justify-between min-h-[82px] shadow-2xs ${
            activeTab === 'all' ? 'border-[#049FD9] ring-1 ring-[#049FD9]' : 'border-[#E5E5E5] hover:border-[#049FD9]'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5 gap-1.5">
            <span className="text-xs font-semibold text-[#595959] truncate">
              {isAdmin ? 'Total Tasks' : 'My Tasks'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#F4F6F8] text-[#049FD9] border border-[#E5E5E5] flex items-center justify-center shrink-0">
              <CheckSquareIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#111827] leading-tight">
              {summaryMetrics.total}
            </div>
            <div className="text-[11px] font-medium text-[#595959] mt-0.5 truncate">
              {summaryMetrics.completed} completed
            </div>
          </div>
        </div>

        {/* Metric 2: Pending Tasks */}
        <div
          onClick={() => setActiveTab('pending')}
          className={`bg-white p-3 rounded-[4px] border transition-all cursor-pointer flex flex-col justify-between min-h-[82px] shadow-2xs ${
            activeTab === 'pending' ? 'border-[#049FD9] ring-1 ring-[#049FD9]' : 'border-[#E5E5E5] hover:border-[#049FD9]'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5 gap-1.5">
            <span className="text-xs font-semibold text-[#595959] truncate">Pending</span>
            <div className="w-7 h-7 rounded-lg bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] flex items-center justify-center shrink-0">
              <ClockIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#111827] leading-tight">
              {summaryMetrics.pending}
            </div>
            <div className="text-[11px] font-medium text-[#595959] mt-0.5 truncate">
              ready to start
            </div>
          </div>
        </div>

        {/* Metric 3: In Progress Tasks */}
        <div
          onClick={() => setActiveTab('in_progress')}
          className={`bg-white p-3 rounded-[4px] border transition-all cursor-pointer flex flex-col justify-between min-h-[82px] shadow-2xs ${
            activeTab === 'in_progress' ? 'border-[#049FD9] ring-1 ring-[#049FD9]' : 'border-[#E5E5E5] hover:border-[#049FD9]'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5 gap-1.5">
            <span className="text-xs font-semibold text-[#595959] truncate">In Progress</span>
            <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] flex items-center justify-center shrink-0">
              <CheckSquareIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#111827] leading-tight">
              {summaryMetrics.in_progress}
            </div>
            <div className="text-[11px] font-medium text-[#595959] mt-0.5 truncate">
              currently active
            </div>
          </div>
        </div>

        {/* Metric 4: Submitted for Review (Highlight for Admin) */}
        <div
          onClick={() => setActiveTab('in_review')}
          className={`bg-white p-3 rounded-[4px] border transition-all cursor-pointer flex flex-col justify-between min-h-[82px] shadow-2xs ${
            activeTab === 'in_review'
              ? 'border-[#2563EB] ring-2 ring-[#2563EB]'
              : summaryMetrics.in_review > 0
              ? 'border-[#93C5FD] bg-[#F8FAFC]'
              : 'border-[#E5E5E5] hover:border-[#049FD9]'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5 gap-1.5">
            <span className="text-xs font-semibold text-[#1E40AF] truncate">
              For Review
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#DBEAFE] text-[#1D4ED8] border border-[#93C5FD] flex items-center justify-center shrink-0">
              <ClockIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-extrabold text-[#1E3A8A] leading-tight">
              {summaryMetrics.in_review}
            </div>
            <div className="text-[11px] font-medium text-[#1E40AF] mt-0.5 truncate">
              {isAdmin ? 'awaiting approval' : 'submitted'}
            </div>
          </div>
        </div>

        {/* Metric 5: Completed Tasks */}
        <div
          onClick={() => setActiveTab('completed')}
          className={`bg-white p-3 rounded-[4px] border transition-all cursor-pointer flex flex-col justify-between min-h-[82px] shadow-2xs ${
            activeTab === 'completed' ? 'border-[#049FD9] ring-1 ring-[#049FD9]' : 'border-[#E5E5E5] hover:border-[#049FD9]'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5 gap-1.5">
            <span className="text-xs font-semibold text-[#595959] truncate">Completed</span>
            <div className="w-7 h-7 rounded-lg bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] flex items-center justify-center shrink-0">
              <CheckCircleIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#111827] leading-tight">
              {summaryMetrics.completed}
            </div>
            <div className="text-[11px] font-medium text-[#595959] mt-0.5 truncate">
              100% approved
            </div>
          </div>
        </div>

        {/* Metric 6: Overdue Tasks */}
        <div
          onClick={() => setActiveTab('overdue')}
          className={`bg-white p-3 rounded-[4px] border transition-all cursor-pointer flex flex-col justify-between min-h-[82px] shadow-2xs ${
            activeTab === 'overdue'
              ? 'border-[#DC2626] ring-2 ring-[#DC2626]'
              : summaryMetrics.overdue > 0
              ? 'border-[#FCA5A5] bg-[#FEF2F2]/40'
              : 'border-[#E5E5E5] hover:border-[#049FD9]'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5 gap-1.5">
            <span className="text-xs font-semibold text-[#DC2626] truncate">Overdue</span>
            <div className="w-7 h-7 rounded-lg bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] flex items-center justify-center shrink-0">
              <AlertCircleIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-extrabold text-[#DC2626] leading-tight">
              {summaryMetrics.overdue}
            </div>
            <div className="text-[11px] font-medium text-[#B91C1C] mt-0.5 truncate">
              needs attention
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER TABS & SEARCH BAR */}
      <div className="bg-white p-3.5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-3">
        {/* Row A: Status Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none whitespace-nowrap bg-[#F4F6F8] p-1 rounded-lg">
            {(
              [
                { id: 'all' as const, label: 'All Tasks', count: summaryMetrics.total, badgeColor: '' },
                { id: 'pending' as const, label: 'Pending', count: summaryMetrics.pending, badgeColor: '' },
                { id: 'in_progress' as const, label: 'In Progress', count: summaryMetrics.in_progress, badgeColor: '' },
                { id: 'in_review' as const, label: 'Review Submissions', count: summaryMetrics.in_review, badgeColor: 'bg-[#2563EB] text-white' },
                ...(summaryMetrics.changes_requested > 0
                  ? [{ id: 'changes_requested' as const, label: 'Changes Requested', count: summaryMetrics.changes_requested, badgeColor: 'bg-[#E11D48] text-white' }]
                  : []),
                { id: 'completed' as const, label: 'Completed', count: summaryMetrics.completed, badgeColor: '' },
                { id: 'overdue' as const, label: 'Overdue', count: summaryMetrics.overdue, badgeColor: 'bg-[#DC2626] text-white' },
              ]
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-[#111827] shadow-2xs'
                    : 'text-[#595959] hover:text-[#111827]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    tab.badgeColor || 'bg-[#E5E5E5] text-[#334155]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <SearchIcon className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Title, ID, Project, Employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#CCCCCC] rounded-[4px] text-xs text-[#111827] font-medium placeholder-[#9CA3AF] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9]"
            />
          </div>
        </div>

        {/* Row B: Dropdown Filters & Sort (Single Line - All Fit in One Line) */}
        <div className="pt-2.5 border-t border-[#F0F0F0] flex items-center gap-2 text-xs text-[#334155] overflow-x-auto scrollbar-none flex-nowrap">
          {/* Project Filter */}
          <TaskFilterDropdown
            label="Project"
            value={selectedProject}
            onChange={setSelectedProject}
            options={[
              { value: 'all', label: 'All Projects' },
              ...projects.map((p) => ({ value: p.name, label: p.name })),
            ]}
          />

          {/* Assigned Employee Filter (Admin) */}
          {isAdmin && (
            <TaskFilterDropdown
              label="Assignee"
              value={selectedEmployee}
              onChange={setSelectedEmployee}
              options={[
                { value: 'all', label: 'All Assignees' },
                ...activeEmployees.map((emp) => ({
                  value: emp.name,
                  label: `${emp.name} (${emp.role || emp.department || 'Employee'})`,
                })),
              ]}
            />
          )}

          {/* Priority Filter */}
          <TaskFilterDropdown
            label="Priority"
            value={selectedPriority}
            onChange={setSelectedPriority}
            options={[
              { value: 'all', label: 'All Priorities' },
              { value: 'critical', label: 'Critical' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
          />

          {/* Due Date Filter */}
          <TaskFilterDropdown
            label="Due Date"
            value={selectedDueDateFilter}
            onChange={setSelectedDueDateFilter}
            options={[
              { value: 'all', label: 'All Deadlines' },
              { value: 'today', label: 'Due Today' },
              { value: 'this_week', label: 'Due This Week' },
              { value: 'overdue', label: 'Overdue Only' },
            ]}
          />

          {/* Sort By (Placed directly beside Due Date) */}
          <TaskFilterDropdown
            label="Sort"
            value={sortOption}
            onChange={(val) => setSortOption(val as any)}
            options={[
              { value: 'due_asc', label: 'Deadline (Earliest First)' },
              { value: 'due_desc', label: 'Deadline (Latest First)' },
              { value: 'priority', label: 'Priority (Highest First)' },
              { value: 'name', label: 'Task Name (A → Z)' },
            ]}
          />

          {/* Reset Filters (Fit directly at the end of the same line) */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-2 py-1 text-xs text-[#64748B] hover:text-[#0F172A] hover:bg-[#E5E5E5] rounded transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            Reset
          </button>
        </div>
      </div>

      {/* 3. ENTERPRISE TASK TABLE (10 Columns) */}
      <div className="bg-white rounded-lg border border-[#E5E5E5] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E5E5E5] text-[#475569] font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3.5 whitespace-nowrap">Task ID</th>
                <th className="py-3 px-3.5 whitespace-nowrap min-w-[200px]">Task Title</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Project</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Assigned To</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Priority</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Start Date</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Due Date</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
                <th className="py-3 px-3.5 whitespace-nowrap min-w-[130px]">Progress</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 px-4 text-center text-[#595959]">
                    <CheckSquareIcon className="w-10 h-10 mx-auto mb-2 opacity-35 text-[#595959]" />
                    <p className="text-xs font-semibold text-[#111827]">No tasks found</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      No tasks matched your search or filter settings.
                    </p>
                    <button
                      onClick={handleResetFilters}
                      className="mt-3 px-3 py-1 rounded bg-[#F4F6F8] border border-[#CCCCCC] text-xs font-semibold text-[#111827] hover:bg-[#E5E5E5] transition-colors cursor-pointer"
                    >
                      Clear All Filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const isOverdue = isTaskOverdue(task);
                  const isAssignedToCurrent =
                    (userUid && task.assignedToId === userUid) ||
                    (task.assignedToEmail && task.assignedToEmail.toLowerCase() === userEmail) ||
                    (task.assignedTo && userName && task.assignedTo.toLowerCase().includes(userName.toLowerCase())) ||
                    (task.assignedTo && userEmail && task.assignedTo.toLowerCase().includes(userEmail));

                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-[#F8FAFC] transition-colors cursor-pointer ${
                        task.status === 'in_review' ? 'bg-[#EFF6FF]/20' : ''
                      }`}
                      onClick={() => openDossier(task)}
                    >
                      {/* Column 1: Task ID */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] font-bold text-[#0F172A]">
                        <span className="px-1.5 py-0.5 bg-[#F1F5F9] border border-[#CBD5E1] rounded text-[#334155]">
                          {task.taskId || task.id}
                        </span>
                      </td>

                      {/* Column 2: Task Title */}
                      <td className="py-3 px-3.5">
                        <div className="flex flex-col">
                          <span
                            className={`font-semibold text-xs leading-snug ${
                              task.completed ? 'line-through text-[#94A3B8]' : 'text-[#0F172A]'
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>
                      </td>

                      {/* Column 3: Project Name */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] font-medium text-[#334155]">
                          <FolderIcon className="w-3 h-3 text-[#64748B]" />
                          {task.project}
                        </span>
                      </td>

                      {/* Column 4: Assigned Employee */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] font-bold text-[10px] flex items-center justify-center shrink-0">
                            {(task.assignedTo || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-[#0F172A] truncate max-w-[130px]">
                              {task.assignedTo}
                            </span>
                            {task.assignedToRole && (
                              <span className="text-[10px] text-[#64748B] truncate max-w-[130px]">
                                {task.assignedToRole}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 5: Priority */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {renderPriorityBadge(task.priority)}
                      </td>

                      {/* Column 6: Start Date */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-[#475569] font-medium text-[11px]">
                        {task.startDate || '—'}
                      </td>

                      {/* Column 7: Due Date */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 font-medium text-[11px]">
                          <span
                            className={
                              isOverdue ? 'text-[#DC2626] font-bold' : 'text-[#475569]'
                            }
                          >
                            {task.dueDate || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Column 8: Status */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {renderStatusBadge(task)}
                      </td>

                      {/* Column 9: Progress */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="w-28 flex items-center gap-2">
                          <div className="w-full bg-[#E2E8F0] rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                task.completed || (task.progress || 0) === 100
                                  ? 'bg-[#16A34A]'
                                  : task.status === 'in_review'
                                  ? 'bg-[#2563EB]'
                                  : task.status === 'changes_requested'
                                  ? 'bg-[#E11D48]'
                                  : 'bg-[#049FD9]'
                              }`}
                              style={{ width: `${task.progress || 0}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-[#475569] w-7 shrink-0 text-right">
                            {task.progress || 0}%
                          </span>
                        </div>
                      </td>

                      {/* Column 10: Actions */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Admin: If in review, quick review buttons */}
                          {isAdmin && task.status === 'in_review' && (
                            <>
                              <button
                                onClick={() => handleOpenReviewModal(task, 'approve')}
                                title="Approve Submission"
                                className="px-2 py-1 rounded bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] hover:bg-[#BBF7D0] font-bold text-[11px] cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleOpenReviewModal(task, 'request_changes')}
                                title="Request Changes"
                                className="px-2 py-1 rounded bg-[#FFE4E6] text-[#9F1239] border border-[#FECDD3] hover:bg-[#FEE2E2] font-semibold text-[11px] cursor-pointer"
                              >
                                Changes
                              </button>
                            </>
                          )}

                          {/* Employee: Start button if pending */}
                          {!isAdmin && isAssignedToCurrent && (task.status === 'pending' || !task.status) && (
                            <button
                              onClick={() => handleStartTask(task)}
                              className="px-2 py-1 rounded bg-[#049FD9] text-white hover:bg-[#0385B5] font-semibold text-[11px] cursor-pointer"
                            >
                              Start Task
                            </button>
                          )}

                          {/* Employee: Submit button if in progress or changes requested */}
                          {!isAdmin && isAssignedToCurrent && (task.status === 'in_progress' || task.status === 'changes_requested') && (
                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setIsSubmitModalOpen(true);
                              }}
                              className="px-2 py-1 rounded bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] hover:bg-[#DBEAFE] font-semibold text-[11px] cursor-pointer"
                            >
                              Submit
                            </button>
                          )}

                          {/* Reassign (Admin) */}
                          {isAdmin && (
                            <button
                              onClick={() => handleOpenReassignModal(task)}
                              title="Reassign Task"
                              className="px-2 py-1 rounded bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9] font-medium text-[11px] cursor-pointer"
                            >
                              Reassign
                            </button>
                          )}

                          {/* View details */}
                          <button
                            onClick={() => openDossier(task)}
                            className="px-2 py-1 rounded bg-white border border-[#CCCCCC] text-[#111827] hover:bg-[#F4F6F8] font-semibold text-[11px] cursor-pointer"
                          >
                            View
                          </button>
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

      {/* ============================================================= */}
      {/* 4. TASK DETAILS DOSSIER MODAL (Complete View & Lifecycle Hub) */}
      {/* ============================================================= */}
      {isDossierOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div
            className="bg-white rounded-xl border border-[#E5E5E5] shadow-2xl w-full max-w-4xl my-8 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dossier Header */}
            <div className="p-4 sm:p-5 border-b border-[#E5E5E5] bg-[#F8FAFC] flex items-start justify-between gap-3 shrink-0">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-[#E2E8F0] text-[#0F172A] font-mono font-bold text-xs">
                    {selectedTask.taskId || selectedTask.id}
                  </span>
                  <span className="text-xs font-semibold text-[#64748B]">
                    Project: <span className="text-[#0F172A]">{selectedTask.project}</span>
                  </span>
                  {renderPriorityBadge(selectedTask.priority)}
                  {renderStatusBadge(selectedTask)}
                </div>
                <h2 className="text-lg font-bold text-[#0F172A] mt-1">{selectedTask.title}</h2>
              </div>
              <button
                onClick={() => setIsDossierOpen(false)}
                className="w-8 h-8 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0] flex items-center justify-center text-lg font-bold cursor-pointer transition-colors shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Dossier Body (Scrollable) */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* SECTION A: Task Information Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F8FAFC] p-3.5 rounded-lg border border-[#E2E8F0]">
                <div>
                  <span className="text-[10px] font-bold text-[#64748B] uppercase">Assigned To</span>
                  <div className="font-semibold text-xs text-[#0F172A] mt-0.5 truncate">
                    {selectedTask.assignedTo}
                  </div>
                  {selectedTask.assignedToRole && (
                    <div className="text-[10px] text-[#64748B] truncate">{selectedTask.assignedToRole}</div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-[#64748B] uppercase">Assigned By</span>
                  <div className="font-semibold text-xs text-[#0F172A] mt-0.5 truncate">
                    {selectedTask.assignedByName || selectedTask.assignedBy || 'Admin'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-[#64748B] uppercase">Start Date</span>
                  <div className="font-semibold text-xs text-[#0F172A] mt-0.5">
                    {selectedTask.startDate || '—'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-[#64748B] uppercase">Due Date</span>
                  <div className={`font-semibold text-xs mt-0.5 ${isTaskOverdue(selectedTask) ? 'text-[#DC2626]' : 'text-[#0F172A]'}`}>
                    {selectedTask.dueDate || '—'}
                    {isTaskOverdue(selectedTask) && ' (Overdue)'}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-bold text-xs text-[#0F172A] mb-1">Task Scope & Description</h4>
                <div className="p-3 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#334155] leading-relaxed whitespace-pre-wrap">
                  {selectedTask.description || 'No detailed description provided.'}
                </div>
              </div>

              {/* SECTION B: Task Instructions (Employee-facing) */}
              {selectedTask.instructions && (
                <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-xs">
                  <div className="font-bold text-[#1E40AF] mb-1 flex items-center gap-1.5">
                    <span>📋 Employee Instructions & Deliverables:</span>
                  </div>
                  <div className="text-[#1E3A8A] whitespace-pre-wrap leading-relaxed">
                    {selectedTask.instructions}
                  </div>
                </div>
              )}

              {/* SECTION C: Internal Admin Notes (Hidden from employees) */}
              {isAdmin && selectedTask.adminNotes && (
                <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-xs">
                  <div className="font-bold text-[#B45309] mb-1 flex items-center gap-1.5">
                    <span>🔒 Confidential Admin Notes (Internal Only):</span>
                  </div>
                  <div className="text-[#92400E] whitespace-pre-wrap leading-relaxed">
                    {selectedTask.adminNotes}
                  </div>
                </div>
              )}

              {/* SECTION D: Progress & Action Controls */}
              <div className="p-4 bg-white border border-[#E2E8F0] rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[#0F172A]">Task Execution & Progress</h4>
                  <span className="px-2 py-0.5 bg-[#F1F5F9] rounded font-bold text-xs text-[#0F172A]">
                    {selectedTask.progress || 0}% Complete
                  </span>
                </div>

                <div className="w-full bg-[#E2E8F0] rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      selectedTask.completed ? 'bg-[#16A34A]' : 'bg-[#049FD9]'
                    }`}
                    style={{ width: `${selectedTask.progress || 0}%` }}
                  />
                </div>

                {/* Progress Actions based on Role & Status */}
                {selectedTask.status === 'completed' ? (
                  <div className="p-3 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] font-medium flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-[#16A34A]" />
                    <span>This task is 100% completed and verified by Workspace Administrator.</span>
                  </div>
                ) : selectedTask.status === 'in_review' ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] font-medium flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ClockIcon className="w-4 h-4 text-[#2563EB]" />
                        <span>Submitted for Review. Progress editing is currently locked pending review decision.</span>
                      </div>
                    </div>

                    {/* Admin Review Action Hub */}
                    {isAdmin && (
                      <div className="p-3.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg space-y-2.5">
                        <span className="text-xs font-bold text-[#0F172A] block">
                          Administrator Review Decision:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenReviewModal(selectedTask, 'approve')}
                            className="px-3.5 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                            <span>Approve Task (100% Completed)</span>
                          </button>
                          <button
                            onClick={() => handleOpenReviewModal(selectedTask, 'request_changes')}
                            className="px-3.5 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                          >
                            <AlertCircleIcon className="w-4 h-4" />
                            <span>Request Revisions</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* In Progress or Pending */
                  <div className="space-y-3">
                    {(selectedTask.status === 'pending' || !selectedTask.status) && (
                      <div className="flex items-center justify-between p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg">
                        <span className="text-xs text-[#B45309] font-medium">
                          Task is in Pending status. Click Start Task to begin work.
                        </span>
                        <button
                          onClick={() => handleStartTask(selectedTask)}
                          className="px-3.5 py-1.5 bg-[#049FD9] hover:bg-[#0385B5] text-white font-bold text-xs rounded cursor-pointer transition-colors"
                        >
                          Start Task Now
                        </button>
                      </div>
                    )}

                    {(selectedTask.status === 'in_progress' || selectedTask.status === 'changes_requested') && (
                      <div className="space-y-3 pt-2">
                        <div>
                          <div className="flex justify-between items-center mb-1 text-xs font-semibold text-[#0F172A]">
                            <label>Update Work Progress:</label>
                            <span className="font-bold text-[#049FD9]">{progressSlider}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="99"
                            value={progressSlider}
                            onChange={(e) => setProgressSlider(Number(e.target.value))}
                            className="w-full accent-[#049FD9] cursor-pointer"
                          />
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Optional progress update note..."
                            value={progressNote}
                            onChange={(e) => setProgressNote(e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-white border border-[#CCCCCC] rounded text-xs text-[#111827] focus:outline-none focus:border-[#049FD9]"
                          />
                          <button
                            onClick={handleSaveProgress}
                            disabled={isSubmitting}
                            className="btn-secondary whitespace-nowrap cursor-pointer"
                          >
                            Save Progress
                          </button>
                          <button
                            onClick={() => setIsSubmitModalOpen(true)}
                            className="btn-primary whitespace-nowrap cursor-pointer"
                          >
                            Submit for Review
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION E: Review Submissions History */}
              {selectedTask.submissions && selectedTask.submissions.length > 0 && (
                <div>
                  <h4 className="font-bold text-xs text-[#0F172A] mb-2">Work Submissions & Review Log</h4>
                  <div className="space-y-2">
                    {selectedTask.submissions.map((sub, idx) => (
                      <div
                        key={sub.id || idx}
                        className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-[#0F172A]">
                            Submitted by {sub.submittedByName || sub.submittedBy}
                          </span>
                          <span className="text-[10px] text-[#64748B]">
                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : ''}
                          </span>
                        </div>
                        <div className="text-xs text-[#334155] italic">"{sub.summary}"</div>
                        {sub.comment && (
                          <div className="text-[11px] text-[#64748B]">Notes: {sub.comment}</div>
                        )}
                        {sub.reviewStatus !== 'pending' && (
                          <div
                            className={`p-2 rounded text-[11px] font-medium mt-1.5 border ${
                              sub.reviewStatus === 'approved'
                                ? 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]'
                                : 'bg-[#FFF1F2] text-[#9F1239] border-[#FECDD3]'
                            }`}
                          >
                            <span className="font-bold">
                              {sub.reviewStatus === 'approved' ? '✓ Approved' : '✗ Changes Requested'} by{' '}
                              {sub.reviewerName || 'Admin'}:
                            </span>{' '}
                            {sub.reviewComment || 'No additional comment.'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION F: Task Comments Stream */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-[#0F172A]">Task Comments & Team Discussion</h4>
                <div className="max-h-56 overflow-y-auto space-y-2.5 p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  {(!selectedTask.comments || selectedTask.comments.length === 0) ? (
                    <div className="text-center text-[#94A3B8] text-xs py-3">
                      No comments yet. Start the conversation below.
                    </div>
                  ) : (
                    selectedTask.comments.map((cmt) => (
                      <div key={cmt.id} className="bg-white p-2.5 rounded border border-[#E5E5E5] space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#0F172A]">{cmt.userName}</span>
                            <span className="px-1.5 py-0.2 rounded bg-[#F1F5F9] text-[9px] font-semibold text-[#475569]">
                              {cmt.userRole}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#94A3B8]">
                            {cmt.createdAt ? new Date(cmt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <div className="text-xs text-[#334155] whitespace-pre-wrap">{cmt.message}</div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <textarea
                    rows={2}
                    placeholder="Type a comment or instruction..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 p-2 bg-white border border-[#CCCCCC] rounded text-xs text-[#111827] focus:outline-none focus:border-[#049FD9] resize-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !newCommentText.trim()}
                    className="btn-primary self-end py-2 px-3 text-xs cursor-pointer"
                  >
                    Post Comment
                  </button>
                </form>
              </div>

              {/* SECTION G: Activity Log Audit History */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-[#0F172A]">Task Audit Trail & History</h4>
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] font-mono text-[11px]">
                  {(!selectedTask.activities || selectedTask.activities.length === 0) ? (
                    <div className="text-[#94A3B8] text-center">No logged activity yet.</div>
                  ) : (
                    selectedTask.activities.map((act) => (
                      <div key={act.id} className="flex items-start justify-between gap-2 text-[#475569]">
                        <span className="leading-snug">
                          <strong className="text-[#0F172A]">{act.performedByName || act.performedBy}:</strong>{' '}
                          {act.description}
                        </span>
                        <span className="text-[10px] text-[#94A3B8] shrink-0">
                          {act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : ''}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Dossier Footer */}
            <div className="p-3.5 border-t border-[#E5E5E5] bg-[#F8FAFC] flex items-center justify-between shrink-0">
              <div className="text-[11px] text-[#64748B]">
                Last updated: {selectedTask.updatedAt ? new Date(selectedTask.updatedAt).toLocaleDateString() : 'Today'}
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => handleOpenReassignModal(selectedTask)}
                    className="btn-secondary text-xs"
                  >
                    Reassign Task
                  </button>
                )}
                <button
                  onClick={() => setIsDossierOpen(false)}
                  className="btn-primary text-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 5. ADMIN CREATE TASK MODAL */}
      {/* ============================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div
            className="bg-white rounded-xl border border-[#E5E5E5] shadow-2xl w-full max-w-xl my-8 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-[#E5E5E5] bg-[#F8FAFC] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#0F172A]">Create New Task</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Assign work to project members and configure deadlines.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#64748B] hover:text-[#0F172A] font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="p-2.5 rounded bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] font-semibold text-xs">
                  {formError}
                </div>
              )}

              {/* Task Title */}
              <div>
                <label className="block font-bold text-[#0F172A] mb-1">
                  Task Title <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design homepage hero banner"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-xs text-[#111827] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9]"
                />
              </div>

              {/* Task Description */}
              <div>
                <label className="block font-bold text-[#0F172A] mb-1">
                  Task Description <span className="text-[#DC2626]">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explain scope, goals, and specifications..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-xs text-[#111827] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9]"
                />
              </div>

              {/* Project Selection & Assigned Employee (Strictly Opens Below with Single Searchable Box) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Project Selection */}
                <div className="relative" ref={taskProjectRef}>
                  <label className="block font-bold text-[#0F172A] mb-1">
                    Select Project <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={isTaskProjectDropdownOpen ? taskProjectSearch : taskProject}
                      onChange={(e) => {
                        setTaskProjectSearch(e.target.value);
                        if (!isTaskProjectDropdownOpen) setIsTaskProjectDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setIsTaskProjectDropdownOpen(true);
                        setTaskProjectSearch('');
                      }}
                      placeholder="Search project..."
                      className={`w-full p-2.5 pr-14 bg-white border rounded-md text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none transition-all cursor-pointer ${
                        isTaskProjectDropdownOpen
                          ? 'border-[#049FD9] ring-1 ring-[#049FD9]'
                          : 'border-[#CCCCCC] hover:border-[#999999]'
                      }`}
                    />
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
                      {taskProject && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTaskProject('');
                            setTaskProjectSearch('');
                          }}
                          className="text-[#888888] hover:text-[#222222] text-xs p-0.5 cursor-pointer"
                          title="Clear project"
                        >
                          ✕
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsTaskProjectDropdownOpen((prev) => !prev);
                          if (!isTaskProjectDropdownOpen) setTaskProjectSearch('');
                        }}
                        className="text-[#888888] hover:text-[#222222] p-0.5 cursor-pointer"
                      >
                        <svg
                          className={`w-3.5 h-3.5 transition-transform duration-150 ${
                            isTaskProjectDropdownOpen ? 'rotate-180 text-[#049FD9]' : ''
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

                  {/* Dropdown Menu - Strictly Opens Below */}
                  {isTaskProjectDropdownOpen && (
                    <div
                      className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-[#CCCCCC] rounded-md shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-[#F1F5F9] font-sans animate-in fade-in zoom-in-95 duration-100"
                      style={{ top: '100%' }}
                    >
                      {filteredValidProjects.length === 0 ? (
                        <div className="p-3 text-center text-xs text-[#888888]">
                          No matching projects found
                        </div>
                      ) : (
                        filteredValidProjects.map((p) => {
                          const isSelected = p.name === taskProject;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setTaskProject(p.name);
                                setIsTaskProjectDropdownOpen(false);
                                setTaskProjectSearch('');
                              }}
                              className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[#EBF7FD] text-[#049FD9] font-semibold'
                                  : 'hover:bg-[#F8FAFC] text-[#222222]'
                              }`}
                            >
                              <div className="truncate">
                                <span className="font-semibold">{p.name}</span>{' '}
                                <span className="text-[10px] text-[#64748B]">({p.projectId || p.id})</span>
                              </div>
                              {isSelected && <span className="text-[#049FD9] font-bold">✓</span>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Assigned Employee (Project Members) */}
                <div className="relative" ref={taskAssigneeRef}>
                  <label className="block font-bold text-[#0F172A] mb-1">
                    Assign Employee <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={
                        isTaskAssigneeDropdownOpen
                          ? taskAssigneeSearch
                          : taskAssignedTo
                          ? `${taskAssignedTo}${
                              projectEligibleEmployees.find((e) => e.name === taskAssignedTo)
                                ? ` (${projectEligibleEmployees.find((e) => e.name === taskAssignedTo)?.role || projectEligibleEmployees.find((e) => e.name === taskAssignedTo)?.designation || 'Team Member'})`
                                : ''
                            }`
                          : ''
                      }
                      onChange={(e) => {
                        setTaskAssigneeSearch(e.target.value);
                        if (!isTaskAssigneeDropdownOpen) setIsTaskAssigneeDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setIsTaskAssigneeDropdownOpen(true);
                        setTaskAssigneeSearch('');
                      }}
                      placeholder="Search employee by name, role, dept..."
                      className={`w-full p-2.5 pr-14 bg-white border rounded-md text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none transition-all cursor-pointer ${
                        isTaskAssigneeDropdownOpen
                          ? 'border-[#049FD9] ring-1 ring-[#049FD9]'
                          : 'border-[#CCCCCC] hover:border-[#999999]'
                      }`}
                    />
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
                      {taskAssignedTo && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTaskAssignedTo('');
                            setTaskAssignedToId('');
                            setTaskAssignedToEmail('');
                            setTaskAssigneeSearch('');
                          }}
                          className="text-[#888888] hover:text-[#222222] text-xs p-0.5 cursor-pointer"
                          title="Clear assignee"
                        >
                          ✕
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsTaskAssigneeDropdownOpen((prev) => !prev);
                          if (!isTaskAssigneeDropdownOpen) setTaskAssigneeSearch('');
                        }}
                        className="text-[#888888] hover:text-[#222222] p-0.5 cursor-pointer"
                      >
                        <svg
                          className={`w-3.5 h-3.5 transition-transform duration-150 ${
                            isTaskAssigneeDropdownOpen ? 'rotate-180 text-[#049FD9]' : ''
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

                  {/* Dropdown Menu - Strictly Opens Below */}
                  {isTaskAssigneeDropdownOpen && (
                    <div
                      className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-[#CCCCCC] rounded-md shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-[#F1F5F9] font-sans animate-in fade-in zoom-in-95 duration-100"
                      style={{ top: '100%' }}
                    >
                      {filteredProjectEligibleEmployees.length === 0 ? (
                        <div className="p-3 text-center text-xs text-[#888888]">
                          No matching employees found
                        </div>
                      ) : (
                        filteredProjectEligibleEmployees.map((emp) => {
                          const isSelected = emp.name === taskAssignedTo;
                          return (
                            <button
                              key={emp.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setTaskAssignedTo(emp.name);
                                setTaskAssignedToId(emp.id);
                                setTaskAssignedToEmail(emp.email || '');
                                setIsTaskAssigneeDropdownOpen(false);
                                setTaskAssigneeSearch('');
                              }}
                              className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[#EBF7FD] text-[#049FD9] font-semibold'
                                  : 'hover:bg-[#F8FAFC] text-[#222222]'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="font-semibold truncate">{emp.name}</div>
                                <div className="text-[10px] text-[#64748B] truncate">
                                  {emp.role || emp.designation || 'Team Member'}
                                  {emp.department ? ` • ${emp.department}` : ''}
                                </div>
                              </div>
                              {isSelected && <span className="text-[#049FD9] font-bold">✓</span>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Priority & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">
                    Priority <span className="text-[#DC2626]">*</span>
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full p-2 bg-white border border-[#CCCCCC] rounded-md text-xs text-[#111827] focus:outline-none focus:border-[#049FD9] cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">
                    Start Date <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={taskStartDate}
                    onChange={(e) => setTaskStartDate(e.target.value)}
                    className="w-full p-2 bg-white border border-[#CCCCCC] rounded-md text-xs text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">
                    Due Date <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full p-2 bg-white border border-[#CCCCCC] rounded-md text-xs text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  />
                </div>
              </div>

              {/* Instructions (Employee Facing) */}
              <div>
                <label className="block font-bold text-[#0F172A] mb-1">
                  Employee-Facing Instructions <span className="text-[#64748B] font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Specific requirements, checklist items, links..."
                  value={taskInstructions}
                  onChange={(e) => setTaskInstructions(e.target.value)}
                  className="w-full p-2 bg-white border border-[#CCCCCC] rounded-md text-xs text-[#111827] focus:outline-none focus:border-[#049FD9]"
                />
              </div>

              {/* Internal Admin Notes */}
              <div>
                <label className="block font-bold text-[#0F172A] mb-1">
                  Internal Admin Notes <span className="text-[#64748B] font-normal">(Hidden from employees)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Private notes, budget, confidential review criteria..."
                  value={taskAdminNotes}
                  onChange={(e) => setTaskAdminNotes(e.target.value)}
                  className="w-full p-2 bg-white border border-[#CCCCCC] rounded-md text-xs text-[#111827] focus:outline-none focus:border-[#049FD9]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                >
                  {isSubmitting ? 'Creating Task...' : 'Create & Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 6. ADMIN REVIEW DECISION MODAL (Approve / Request Changes) */}
      {/* ============================================================= */}
      {isReviewModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
          <div
            className="bg-white rounded-xl border border-[#E5E5E5] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`p-4 border-b ${
                reviewActionType === 'approve'
                  ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                  : 'bg-[#FFF1F2] border-[#FECDD3]'
              }`}
            >
              <h3
                className={`font-bold text-base ${
                  reviewActionType === 'approve' ? 'text-[#166534]' : 'text-[#9F1239]'
                }`}
              >
                {reviewActionType === 'approve'
                  ? 'Approve Task Submission'
                  : 'Request Changes on Task'}
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Task: <strong className="text-[#0F172A]">{selectedTask.title}</strong>
              </p>
            </div>

            <form onSubmit={handleReviewDecisionSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
              {reviewActionType === 'approve' ? (
                <div className="space-y-3">
                  <p className="text-[#334155] leading-relaxed">
                    Approving this task will mark its status as <strong>Completed (100%)</strong>,
                    record your verification timestamp, and send an approval notification to{' '}
                    <strong>{selectedTask.assignedTo}</strong>.
                  </p>
                  <div>
                    <label className="block font-bold text-[#0F172A] mb-1">
                      Approval Note <span className="text-[#64748B] font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Great work, meets all requirements!"
                      value={reviewFeedback}
                      onChange={(e) => setReviewFeedback(e.target.value)}
                      className="w-full p-2 bg-white border border-[#CCCCCC] rounded text-xs text-[#111827] focus:outline-none focus:border-[#16A34A]"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[#334155] leading-relaxed">
                    Please provide clear instructions for the required revisions. The task status
                    will be set to <strong>Changes Requested</strong> so the employee can resubmit.
                  </p>
                  <div>
                    <label className="block font-bold text-[#0F172A] mb-1">
                      Revision Instructions <span className="text-[#DC2626]">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g. Please fix the header spacing and ensure responsiveness on mobile."
                      value={reviewFeedback}
                      onChange={(e) => setReviewFeedback(e.target.value)}
                      className="w-full p-2 bg-white border border-[#CCCCCC] rounded text-xs text-[#111827] focus:outline-none focus:border-[#DC2626]"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-md font-semibold text-white transition-all cursor-pointer ${
                    reviewActionType === 'approve'
                      ? 'bg-[#16A34A] hover:bg-[#15803D]'
                      : 'bg-[#DC2626] hover:bg-[#B91C1C]'
                  }`}
                >
                  {isSubmitting
                    ? 'Processing...'
                    : reviewActionType === 'approve'
                    ? 'Confirm Approval'
                    : 'Send Feedback & Request Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 7. EMPLOYEE SUBMIT FOR REVIEW MODAL */}
      {/* ============================================================= */}
      {isSubmitModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
          <div
            className="bg-white rounded-xl border border-[#E5E5E5] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-[#E5E5E5] bg-[#EFF6FF]">
              <h3 className="font-bold text-base text-[#1E40AF]">Submit Task for Review</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Task: <strong className="text-[#0F172A]">{selectedTask.title}</strong>
              </p>
            </div>

            <form onSubmit={handleSubmitForReview} className="p-4 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#0F172A] mb-1">
                  Work Completion Summary <span className="text-[#DC2626]">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Summarize the work done, components modified, deliverables completed..."
                  value={submissionSummary}
                  onChange={(e) => setSubmissionSummary(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded text-xs text-[#111827] focus:outline-none focus:border-[#049FD9]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">
                  Additional Notes for Reviewer <span className="text-[#64748B] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Any testing instructions or access details..."
                  value={submissionComment}
                  onChange={(e) => setSubmissionComment(e.target.value)}
                  className="w-full p-2 bg-white border border-[#CCCCCC] rounded text-xs text-[#111827] focus:outline-none focus:border-[#049FD9]"
                />
              </div>

              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-[11px] text-[#64748B] leading-relaxed">
                ℹ️ Once submitted, the task status will transition to <strong>In Review</strong> and
                Administrator will be notified for verification. Normal progress editing will be
                paused until review completion.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !submissionSummary.trim()}
                  className="btn-primary"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Deliverable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 8. ADMIN REASSIGN TASK MODAL */}
      {/* ============================================================= */}
      {isReassignModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
          <div
            className="bg-white rounded-xl border border-[#E5E5E5] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#E5E5E5] bg-[#F8FAFC]">
              <h3 className="font-bold text-base text-[#0F172A]">Reassign Task</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Current Assignee: <strong className="text-[#0F172A]">{selectedTask.assignedTo}</strong>
              </p>
            </div>

            <form onSubmit={handleReassignSubmit} className="p-4 sm:p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#0F172A] mb-1">
                  Select New Assignee <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  required
                  value={reassignEmployee}
                  onChange={(e) => setReassignEmployee(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded text-xs text-[#111827] focus:outline-none focus:border-[#049FD9] cursor-pointer"
                >
                  <option value="">Select Employee...</option>
                  {activeEmployees
                    .filter((emp) => emp.name !== selectedTask.assignedTo)
                    .map((emp) => (
                      <option key={emp.id} value={emp.name}>
                        {emp.name} — {emp.role || emp.department || 'Employee'}
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-[11px] text-[#64748B]">
                Reassigning will preserve all previous comments, files, and audit logs while
                dispatching a notification to the new assignee.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setIsReassignModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !reassignEmployee.trim()}
                  className="btn-primary"
                >
                  {isSubmitting ? 'Reassigning...' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
