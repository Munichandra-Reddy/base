'use client';

import React, { useState, useMemo } from 'react';
import { Task, Project, Person, Activity } from '@/lib/types';
import {
  getKolkataTodayString,
  isTaskOverdue,
  isTaskAssignedToEmployee,
} from '@/lib/dashboardCalculations';
import {
  calculateEmployeeCompletionReport,
  calculateProjectProgressReport,
  calculateMonthlyProductivity,
  calculateEmployeeWorkloadReport,
  calculateProjectCompletionHistory,
  getDaysOverdue,
  EmployeeCompletionReport,
  ProjectProgressReport,
} from '@/lib/reportCalculations';
import {
  ChartIcon,
  UsersIcon,
  FolderIcon,
  CheckSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  SearchIcon,
  FilterIcon,
  DownloadIcon,
  FileIcon,
} from './Icons';

interface ReportsViewProps {
  tasks: Task[];
  projects: Project[];
  people: Person[];
  activities?: Activity[];
  currentUser?: { email?: string; fullName?: string; employeeId?: string; id?: string } | null;
  isAdmin?: boolean;
  onNavigateToProject?: (projectId: string) => void;
  onNavigateToEmployee?: (email?: string) => void;
  onNavigateToTasks?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  tasks,
  projects,
  people,
  activities = [],
  currentUser,
  isAdmin = false,
  onNavigateToProject,
  onNavigateToEmployee,
  onNavigateToTasks,
}) => {
  // Navigation Tabs
  type AdminTab =
    | 'overview'
    | 'employees'
    | 'projects'
    | 'pending'
    | 'overdue'
    | 'monthly'
    | 'workload'
    | 'history';

  type EmployeeTab = 'overview' | 'completed' | 'pending' | 'overdue';

  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('overview');
  const [activeEmployeeTab, setActiveEmployeeTab] = useState<EmployeeTab>('overview');
  // Allow Admin to preview personal employee report view
  const [adminViewMode, setAdminViewMode] = useState<'workspace' | 'personal'>('workspace');

  // Modals for Drilled-Down Reports
  const [drillEmployee, setDrillEmployee] = useState<EmployeeCompletionReport | null>(null);
  const [drillProject, setDrillProject] = useState<ProjectProgressReport | null>(null);

  // Filters & Search States
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeDeptFilter, setEmployeeDeptFilter] = useState('all');

  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('all');

  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingProjectFilter, setPendingProjectFilter] = useState('all');
  const [pendingEmployeeFilter, setPendingEmployeeFilter] = useState('all');
  const [pendingDeptFilter, setPendingDeptFilter] = useState('all');
  const [pendingPriorityFilter, setPendingPriorityFilter] = useState('all');
  const [pendingStatusFilter, setPendingStatusFilter] = useState('all');
  const [pendingSortBy, setPendingSortBy] = useState<'newest' | 'oldest' | 'due_date' | 'priority'>('due_date');

  const [overdueSearch, setOverdueSearch] = useState('');
  const [overdueProjectFilter, setOverdueProjectFilter] = useState('all');
  const [overduePriorityFilter, setOverduePriorityFilter] = useState('all');

  // Month Key for Monthly Productivity (defaults to October 2026 or current month)
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    const today = getKolkataTodayString();
    return today.substring(0, 7); // e.g. "2026-10" or "2026-11"
  });

  const [workloadDeptFilter, setWorkloadDeptFilter] = useState('all');
  const [workloadStatusFilter, setWorkloadStatusFilter] = useState<'all' | 'heavy' | 'balanced' | 'light'>('all');

  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [historyManagerFilter, setHistoryManagerFilter] = useState<string>('all');

  // Today string in Asia/Kolkata
  const todayStr = useMemo(() => getKolkataTodayString(), []);

  // Unique departments for filter dropdowns
  const departments = useMemo(() => {
    const set = new Set<string>();
    people.forEach((p) => {
      if (p.department) set.add(p.department);
    });
    return Array.from(set).sort();
  }, [people]);

  // Unique project managers for filter dropdowns
  const projectManagers = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.manager) set.add(p.manager);
      else if (p.managerEmail) set.add(p.managerEmail);
    });
    return Array.from(set).sort();
  }, [projects]);

  // =========================================================
  // 1. ADMIN DASHBOARD STATS (Section 2)
  // =========================================================
  const totalEmployees = people.length;
  const activeEmployees = people.filter((p) => (p.status || 'active') === 'active').length;
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => (p.status || '').toLowerCase() === 'active').length;
  const completedProjects = projects.filter((p) => (p.status || '').toLowerCase() === 'completed').length;

  const totalTasks = tasks.length;
  const eligibleTasks = tasks.filter((t) => t.status !== 'cancelled');
  const totalEligibleTasks = eligibleTasks.length;

  const completedTasks = tasks.filter(
    (t) => (t.status === 'completed' || t.completed) && t.status !== 'cancelled'
  ).length;

  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const inReviewTasks = tasks.filter((t) => t.status === 'in_review').length;
  const pendingTasks = tasks.filter(
    (t) => (!t.status || t.status === 'pending') && !t.completed
  ).length;
  const overdueTasks = tasks.filter((t) => isTaskOverdue(t)).length;

  const overallCompletionPercentage =
    totalEligibleTasks > 0 ? Math.round((completedTasks / totalEligibleTasks) * 100) : 0;

  // =========================================================
  // 2. EMPLOYEE REPORTS (Section 3)
  // =========================================================
  const employeeReports: EmployeeCompletionReport[] = useMemo(() => {
    return people.map((emp) => calculateEmployeeCompletionReport(emp, tasks));
  }, [people, tasks]);

  const filteredEmployeeReports = useMemo(() => {
    return employeeReports.filter((rep) => {
      if (employeeDeptFilter !== 'all' && rep.department !== employeeDeptFilter) return false;
      if (employeeSearch) {
        const q = employeeSearch.toLowerCase();
        const matchesName = rep.name.toLowerCase().includes(q);
        const matchesEmail = rep.email.toLowerCase().includes(q);
        const matchesId = rep.employeeId.toLowerCase().includes(q);
        const matchesDesig = rep.designation.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesId && !matchesDesig) return false;
      }
      return true;
    });
  }, [employeeReports, employeeDeptFilter, employeeSearch]);

  // =========================================================
  // 3. PROJECT PROGRESS REPORTS (Section 4)
  // =========================================================
  const projectReports: ProjectProgressReport[] = useMemo(() => {
    return projects.map((p) => calculateProjectProgressReport(p, tasks));
  }, [projects, tasks]);

  const filteredProjectReports = useMemo(() => {
    return projectReports.filter((rep) => {
      if (projectStatusFilter !== 'all' && rep.status.toLowerCase() !== projectStatusFilter.toLowerCase()) {
        return false;
      }
      if (projectSearch) {
        const q = projectSearch.toLowerCase();
        const matchesName = rep.name.toLowerCase().includes(q);
        const matchesMgr = rep.manager.toLowerCase().includes(q);
        if (!matchesName && !matchesMgr) return false;
      }
      return true;
    });
  }, [projectReports, projectStatusFilter, projectSearch]);

  // =========================================================
  // 4. PENDING TASKS REPORT (Section 5)
  // =========================================================
  const allPendingTasks = useMemo(() => {
    return tasks.filter((t) => t.status !== 'completed' && !t.completed && t.status !== 'cancelled');
  }, [tasks]);

  const filteredPendingTasks = useMemo(() => {
    let list = allPendingTasks.filter((t) => {
      if (pendingProjectFilter !== 'all') {
        const matchesProjId = t.projectId === pendingProjectFilter;
        const matchesProjName = t.project?.toLowerCase() === pendingProjectFilter.toLowerCase();
        if (!matchesProjId && !matchesProjName) return false;
      }
      if (pendingEmployeeFilter !== 'all') {
        const assigned = (t.assignedToEmail || t.assignedTo || '').toLowerCase();
        if (!assigned.includes(pendingEmployeeFilter.toLowerCase())) return false;
      }
      if (pendingDeptFilter !== 'all') {
        const emp = people.find((p) => isTaskAssignedToEmployee(t, p));
        if (!emp || emp.department !== pendingDeptFilter) return false;
      }
      if (pendingPriorityFilter !== 'all') {
        if (String(t.priority || '').toLowerCase() !== pendingPriorityFilter.toLowerCase()) return false;
      }
      if (pendingStatusFilter !== 'all') {
        const s = t.status || 'pending';
        if (s !== pendingStatusFilter) return false;
      }
      if (pendingSearch) {
        const q = pendingSearch.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesProj = (t.project || '').toLowerCase().includes(q);
        const matchesAssignee = (t.assignedTo || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesProj && !matchesAssignee) return false;
      }
      return true;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (pendingSortBy === 'newest') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      if (pendingSortBy === 'oldest') {
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      }
      if (pendingSortBy === 'due_date') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (pendingSortBy === 'priority') {
        const weights: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        const pA = weights[String(a.priority || '').toLowerCase()] || 0;
        const pB = weights[String(b.priority || '').toLowerCase()] || 0;
        return pB - pA;
      }
      return 0;
    });

    return list;
  }, [
    allPendingTasks,
    pendingProjectFilter,
    pendingEmployeeFilter,
    pendingDeptFilter,
    pendingPriorityFilter,
    pendingStatusFilter,
    pendingSearch,
    pendingSortBy,
    people,
  ]);

  // =========================================================
  // 5. OVERDUE TASKS REPORT (Section 6)
  // =========================================================
  const allOverdueTasks = useMemo(() => {
    return tasks.filter((t) => isTaskOverdue(t));
  }, [tasks]);

  const filteredOverdueTasks = useMemo(() => {
    return allOverdueTasks.filter((t) => {
      if (overdueProjectFilter !== 'all') {
        const matchesProjId = t.projectId === overdueProjectFilter;
        const matchesProjName = t.project?.toLowerCase() === overdueProjectFilter.toLowerCase();
        if (!matchesProjId && !matchesProjName) return false;
      }
      if (overduePriorityFilter !== 'all') {
        if (String(t.priority || '').toLowerCase() !== overduePriorityFilter.toLowerCase()) return false;
      }
      if (overdueSearch) {
        const q = overdueSearch.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesProj = (t.project || '').toLowerCase().includes(q);
        const matchesAssignee = (t.assignedTo || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesProj && !matchesAssignee) return false;
      }
      return true;
    });
  }, [allOverdueTasks, overdueProjectFilter, overduePriorityFilter, overdueSearch]);

  // =========================================================
  // 6. MONTHLY PRODUCTIVITY DATA (Section 7)
  // =========================================================
  const monthlyData = useMemo(() => {
    return calculateMonthlyProductivity(tasks, selectedMonthKey);
  }, [tasks, selectedMonthKey]);

  // =========================================================
  // 7. EMPLOYEE WORKLOAD DATA (Section 8)
  // =========================================================
  const workloadData = useMemo(() => {
    return calculateEmployeeWorkloadReport(people, tasks);
  }, [people, tasks]);

  const filteredWorkloadItems = useMemo(() => {
    return workloadData.items.filter((item) => {
      if (workloadDeptFilter !== 'all' && item.department !== workloadDeptFilter) return false;
      if (workloadStatusFilter !== 'all' && item.workloadStatus !== workloadStatusFilter) return false;
      return true;
    });
  }, [workloadData, workloadDeptFilter, workloadStatusFilter]);

  // =========================================================
  // 8. PROJECT COMPLETION HISTORY (Section 9)
  // =========================================================
  const historyItems = useMemo(() => {
    return calculateProjectCompletionHistory(projects, tasks);
  }, [projects, tasks]);

  const filteredHistoryItems = useMemo(() => {
    return historyItems.filter((item) => {
      if (historyStatusFilter !== 'all') {
        if (item.status.toLowerCase() !== historyStatusFilter.toLowerCase()) return false;
      }
      if (historyManagerFilter !== 'all') {
        if (item.manager !== historyManagerFilter) return false;
      }
      return true;
    });
  }, [historyItems, historyStatusFilter, historyManagerFilter]);

  // =========================================================
  // 9. EMPLOYEE PERSONAL REPORTS (Section 10)
  // =========================================================
  // Find current employee record or match by currentUser
  const myEmployeeRecord = useMemo(() => {
    if (!currentUser) return null;
    return (
      people.find(
        (p) =>
          (p.email && p.email.toLowerCase() === currentUser.email?.toLowerCase()) ||
          (p.name && p.name.toLowerCase() === currentUser.fullName?.toLowerCase()) ||
          (p.employeeId && p.employeeId === currentUser.employeeId)
      ) || null
    );
  }, [people, currentUser]);

  const myTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (myEmployeeRecord) {
        return isTaskAssignedToEmployee(t, myEmployeeRecord);
      }
      if (currentUser) {
        const uEmail = (currentUser.email || '').toLowerCase();
        const uName = (currentUser.fullName || '').toLowerCase();
        if (t.assignedToEmail && t.assignedToEmail.toLowerCase() === uEmail) return true;
        if (t.assignedTo && t.assignedTo.toLowerCase() === uName) return true;
      }
      return false;
    });
  }, [tasks, myEmployeeRecord, currentUser]);

  const myCompletedTasks = useMemo(() => {
    return myTasks.filter((t) => (t.status === 'completed' || t.completed) && t.status !== 'cancelled');
  }, [myTasks]);

  const myPendingTasks = useMemo(() => {
    return myTasks.filter((t) => t.status !== 'completed' && !t.completed && t.status !== 'cancelled');
  }, [myTasks]);

  const myOverdueTasks = useMemo(() => {
    return myTasks.filter((t) => isTaskOverdue(t));
  }, [myTasks]);

  const myInProgressTasks = useMemo(() => {
    return myTasks.filter((t) => t.status === 'in_progress');
  }, [myTasks]);

  const myMonthlyData = useMemo(() => {
    return calculateMonthlyProductivity(myTasks, selectedMonthKey);
  }, [myTasks, selectedMonthKey]);

  // =========================================================
  // CSV EXPORT HELPER
  // =========================================================
  const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join(
        '\n'
      );
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}-${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCurrentReport = () => {
    if (effectiveIsAdmin && adminViewMode === 'workspace') {
      if (activeAdminTab === 'employees') {
        const headers = ['Employee Name', 'Employee ID', 'Department', 'Designation', 'Total Assigned', 'Eligible', 'Completed', 'In Progress', 'In Review', 'Pending', 'Overdue', 'Completion Rate'];
        const rows = filteredEmployeeReports.map((r) => [r.name, r.employeeId, r.department, r.designation, r.totalAssigned, r.totalEligible, r.completedTasks, r.inProgressTasks, r.inReviewTasks, r.pendingTasks, r.overdueTasks, `${r.completionPercentage}%`]);
        exportToCSV('workorbit-employee-completion-report', headers, rows);
      } else if (activeAdminTab === 'projects') {
        const headers = ['Project Name', 'Manager', 'Status', 'Start Date', 'Deadline', 'Total Tasks', 'Eligible', 'Completed', 'In Progress', 'Pending', 'Overdue', 'Progress %'];
        const rows = filteredProjectReports.map((p) => [p.name, p.manager, p.status, p.startDate, p.deadline, p.totalTasks, p.totalEligible, p.completedTasks, p.inProgressTasks, p.pendingTasks, p.overdueTasks, `${p.progressPercentage}%`]);
        exportToCSV('workorbit-project-progress-report', headers, rows);
      } else if (activeAdminTab === 'pending') {
        const headers = ['Task Title', 'Project', 'Assigned To', 'Priority', 'Start Date', 'Due Date', 'Status'];
        const rows = filteredPendingTasks.map((t) => [t.title, t.project || '—', t.assignedTo || 'Unassigned', t.priority || 'medium', t.startDate || '—', t.dueDate || '—', t.status || 'pending']);
        exportToCSV('workorbit-pending-tasks-report', headers, rows);
      } else if (activeAdminTab === 'overdue') {
        const headers = ['Task Title', 'Project', 'Assigned To', 'Due Date', 'Days Overdue', 'Priority', 'Status'];
        const rows = filteredOverdueTasks.map((t) => [t.title, t.project || '—', t.assignedTo || 'Unassigned', t.dueDate || '—', getDaysOverdue(t.dueDate), t.priority || 'medium', t.status || 'pending']);
        exportToCSV('workorbit-overdue-tasks-report', headers, rows);
      } else if (activeAdminTab === 'workload') {
        const headers = ['Employee Name', 'Department', 'Active Tasks', 'Pending', 'In Progress', 'In Review', 'Overdue', 'High Priority', 'Workload Status'];
        const rows = filteredWorkloadItems.map((w) => [w.name, w.department, w.activeTasks, w.pendingTasks, w.inProgressTasks, w.inReviewTasks, w.overdueTasks, w.highPriorityTasks, w.workloadLabel]);
        exportToCSV('workorbit-employee-workload-report', headers, rows);
      } else if (activeAdminTab === 'history') {
        const headers = ['Project Name', 'Manager', 'Start Date', 'Planned Completion', 'Actual Completion', 'Duration (Days)', 'Final Progress %', 'Status'];
        const rows = filteredHistoryItems.map((h) => [h.name, h.manager, h.startDate, h.plannedCompletionDate, h.actualCompletionDate, h.durationDays, `${h.finalProgress}%`, h.status]);
        exportToCSV('workorbit-project-history-report', headers, rows);
      } else {
        // Overview
        const headers = ['Metric', 'Value'];
        const rows = [
          ['Total Employees', totalEmployees],
          ['Active Employees', activeEmployees],
          ['Total Projects', totalProjects],
          ['Active Projects', activeProjects],
          ['Completed Projects', completedProjects],
          ['Total Tasks', totalTasks],
          ['Completed Tasks', completedTasks],
          ['Pending Tasks', pendingTasks],
          ['In Progress Tasks', inProgressTasks],
          ['In Review Tasks', inReviewTasks],
          ['Overdue Tasks', overdueTasks],
          ['Overall Completion Percentage', `${overallCompletionPercentage}%`],
        ];
        exportToCSV('workorbit-admin-overview-report', headers, rows);
      }
    } else {
      // Employee personal export
      const headers = ['Task Title', 'Project', 'Status', 'Priority', 'Due Date', 'Completed Date'];
      const rows = myTasks.map((t) => [t.title, t.project || '—', t.status || (t.completed ? 'completed' : 'pending'), t.priority || 'medium', t.dueDate || '—', t.completedAt || '—']);
      exportToCSV('my-personal-tasks-report', headers, rows);
    }
  };

  const effectiveIsAdmin = isAdmin;

  // Helper for priority badges
  const renderPriorityBadge = (priority?: string) => {
    const p = String(priority || 'medium').toLowerCase();
    switch (p) {
      case 'critical':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]">
            CRITICAL
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFF7ED] text-[#EA580C] border border-[#FDBA74]">
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
            MEDIUM
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
            LOW
          </span>
        );
    }
  };

  // Helper for status badges
  const renderStatusBadge = (status?: string, completed?: boolean) => {
    if (completed || status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]">
          <CheckCircleIcon className="w-3 h-3 text-[#16A34A]" />
          Completed
        </span>
      );
    }
    switch (status) {
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
            <ClockIcon className="w-3 h-3 text-[#2563EB]" />
            In Progress
          </span>
        );
      case 'in_review':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FAF5FF] text-[#7E22CE] border border-[#E9D5FF]">
            In Review
          </span>
        );
      case 'changes_requested':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
            Changes Needed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]">
            Cancelled
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans w-full max-w-7xl mx-auto pb-12 select-text">
      {/* ========================================================
          1. HEADER CARD (Design Preserved, Basecamp Theme)
      ======================================================== */}
      <div className="bg-white p-4 sm:p-6 rounded-lg border border-[#E5E5E5] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#F4F6F8] text-[#049FD9] flex items-center justify-center shrink-0 border border-[#E5E5E5]">
              <ChartIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
                {effectiveIsAdmin && adminViewMode === 'workspace'
                  ? 'Workspace Reports & Real-Time Analytics'
                  : 'My Personal Performance & Reports'}
              </h1>
              <p className="text-xs text-[#595959] mt-0.5">
                {effectiveIsAdmin && adminViewMode === 'workspace'
                  ? 'Real-time Firestore audit metrics, employee velocities, project completion rates, and workload intelligence.'
                  : 'Track your completed deliverables, pending workload, upcoming deadlines, and monthly output.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Bar (Export, Role indicator, Date) */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
          {effectiveIsAdmin && (
            <div className="flex items-center bg-[#F4F6F8] p-1 rounded-lg border border-[#E5E5E5]">
              <button
                type="button"
                onClick={() => setAdminViewMode('workspace')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  adminViewMode === 'workspace'
                    ? 'bg-white text-[#049FD9] shadow-xs'
                    : 'text-[#595959] hover:text-[#111827]'
                }`}
              >
                Workspace Analytics
              </button>
              <button
                type="button"
                onClick={() => setAdminViewMode('personal')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  adminViewMode === 'personal'
                    ? 'bg-white text-[#049FD9] shadow-xs'
                    : 'text-[#595959] hover:text-[#111827]'
                }`}
              >
                My Personal View
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F4F6F8] border border-[#E5E5E5] text-xs font-semibold text-[#111827]">
            <ClockIcon className="w-3.5 h-3.5 text-[#049FD9]" />
            <span>Asia/Kolkata</span>
          </div>

          <button
            type="button"
            onClick={handleExportCurrentReport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#049FD9] hover:bg-[#004BAF] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Download CSV report of current view"
          >
            <DownloadIcon className="w-3.5 h-3.5 text-white" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          2. ADMIN WORKSPACE NAVIGATION TABS
      ======================================================== */}
      {effectiveIsAdmin && adminViewMode === 'workspace' && (
        <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs p-1.5 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {[
              { id: 'overview' as AdminTab, label: 'Analytics Dashboard', badge: undefined },
              { id: 'employees' as AdminTab, label: 'Employee Completion', badge: people.length },
              { id: 'projects' as AdminTab, label: 'Project Progress', badge: projects.length },
              { id: 'pending' as AdminTab, label: 'Pending Tasks', badge: allPendingTasks.length },
              {
                id: 'overdue' as AdminTab,
                label: 'Overdue Tasks',
                badge: overdueTasks,
                badgeColor: overdueTasks > 0 ? 'bg-[#DC2626] text-white' : undefined,
              },
              { id: 'monthly' as AdminTab, label: 'Monthly Productivity', badge: undefined },
              { id: 'workload' as AdminTab, label: 'Employee Workload', badge: undefined },
              { id: 'history' as AdminTab, label: 'Project History', badge: projects.length },
            ].map((tab) => {
              const isActive = activeAdminTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveAdminTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#049FD9] text-white shadow-xs'
                      : 'text-[#475569] hover:bg-[#F4F6F8] hover:text-[#0F172A]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : tab.badgeColor || 'bg-[#F1F5F9] text-[#475569]'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          3. EMPLOYEE REPORT TABS
      ======================================================== */}
      {(!effectiveIsAdmin || adminViewMode === 'personal') && (
        <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs p-1.5 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {[
              { id: 'overview' as EmployeeTab, label: 'My Monthly Activity', badge: undefined },
              {
                id: 'completed' as EmployeeTab,
                label: 'My Completed Tasks',
                badge: myCompletedTasks.length,
              },
              {
                id: 'pending' as EmployeeTab,
                label: 'My Pending Tasks',
                badge: myPendingTasks.length,
              },
              {
                id: 'overdue' as EmployeeTab,
                label: 'My Overdue Tasks',
                badge: myOverdueTasks.length,
                badgeColor: myOverdueTasks.length > 0 ? 'bg-[#DC2626] text-white' : undefined,
              },
            ].map((tab) => {
              const isActive = activeEmployeeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveEmployeeTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#049FD9] text-white shadow-xs'
                      : 'text-[#475569] hover:bg-[#F4F6F8] hover:text-[#0F172A]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : tab.badgeColor || 'bg-[#F1F5F9] text-[#475569]'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW A: ADMIN OVERVIEW & ANALYTICS DASHBOARD (Section 2)
      ======================================================== */}
      {effectiveIsAdmin && adminViewMode === 'workspace' && activeAdminTab === 'overview' && (
        <div className="space-y-6">
          {/* 11 Workspace-wide KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
            {/* Card 1: Total Employees */}
            <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
              <div className="flex items-center justify-between text-[#595959] mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Employees</span>
                <UsersIcon className="w-4 h-4 text-[#049FD9]" />
              </div>
              <div className="text-2xl font-black text-[#111827]">{totalEmployees}</div>
              <div className="text-[11px] text-[#16A34A] font-medium mt-0.5">{activeEmployees} active</div>
            </div>

            {/* Card 2: Total Projects */}
            <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
              <div className="flex items-center justify-between text-[#595959] mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Projects</span>
                <FolderIcon className="w-4 h-4 text-[#049FD9]" />
              </div>
              <div className="text-2xl font-black text-[#111827]">{totalProjects}</div>
              <div className="text-[11px] text-[#2563EB] font-medium mt-0.5">{activeProjects} active</div>
            </div>

            {/* Card 3: Completed Projects */}
            <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
              <div className="flex items-center justify-between text-[#595959] mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Completed Proj</span>
                <CheckCircleIcon className="w-4 h-4 text-[#16A34A]" />
              </div>
              <div className="text-2xl font-black text-[#16A34A]">{completedProjects}</div>
              <div className="text-[11px] text-[#595959] font-medium mt-0.5">verified done</div>
            </div>

            {/* Card 4: Total Tasks */}
            <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
              <div className="flex items-center justify-between text-[#595959] mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Tasks</span>
                <CheckSquareIcon className="w-4 h-4 text-[#049FD9]" />
              </div>
              <div className="text-2xl font-black text-[#111827]">{totalTasks}</div>
              <div className="text-[11px] text-[#595959] font-medium mt-0.5">{totalEligibleTasks} eligible</div>
            </div>

            {/* Card 5: Completed Tasks */}
            <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
              <div className="flex items-center justify-between text-[#595959] mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Completed Tasks</span>
                <CheckCircleIcon className="w-4 h-4 text-[#16A34A]" />
              </div>
              <div className="text-2xl font-black text-[#16A34A]">{completedTasks}</div>
              <div className="text-[11px] text-[#16A34A] font-medium mt-0.5">admin-approved</div>
            </div>

            {/* Card 6: In Progress Tasks */}
            <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
              <div className="flex items-center justify-between text-[#595959] mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">In Progress</span>
                <ClockIcon className="w-4 h-4 text-[#2563EB]" />
              </div>
              <div className="text-2xl font-black text-[#2563EB]">{inProgressTasks}</div>
              <div className="text-[11px] text-[#595959] font-medium mt-0.5">active work</div>
            </div>

            {/* Card 7: Tasks In Review */}
            <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
              <div className="flex items-center justify-between text-[#595959] mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">In Review</span>
                <AlertCircleIcon className="w-4 h-4 text-[#9333EA]" />
              </div>
              <div className="text-2xl font-black text-[#9333EA]">{inReviewTasks}</div>
              <div className="text-[11px] text-[#595959] font-medium mt-0.5">awaiting approval</div>
            </div>

            {/* Card 8: Pending Tasks */}
            <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
              <div className="flex items-center justify-between text-[#595959] mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Pending</span>
                <ClockIcon className="w-4 h-4 text-[#D97706]" />
              </div>
              <div className="text-2xl font-black text-[#D97706]">{pendingTasks}</div>
              <div className="text-[11px] text-[#595959] font-medium mt-0.5">ready to start</div>
            </div>

            {/* Card 9: Overdue Tasks */}
            <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
              <div className="flex items-center justify-between text-[#595959] mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Overdue</span>
                <AlertCircleIcon className="w-4 h-4 text-[#DC2626]" />
              </div>
              <div className="text-2xl font-black text-[#DC2626]">{overdueTasks}</div>
              <div className="text-[11px] text-[#DC2626] font-medium mt-0.5">
                {overdueTasks > 0 ? 'needs attention' : 'on schedule'}
              </div>
            </div>

            {/* Card 10: Task Completion % */}
            <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-[#595959] mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Completion Rate</span>
                <ChartIcon className="w-4 h-4 text-[#049FD9]" />
              </div>
              <div className="text-2xl font-black text-[#049FD9]">{overallCompletionPercentage}%</div>
              <div className="text-[11px] text-[#595959] font-medium mt-0.5">
                {completedTasks}/{totalEligibleTasks} eligible done
              </div>
            </div>
          </div>

          {/* Visual Analytics Grid: Task Distribution & Project Velocity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Status Distribution Radial / Progress Breakdown */}
            <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                <div>
                  <h3 className="text-sm font-bold text-[#111827]">Task Status Breakdown</h3>
                  <p className="text-xs text-[#595959]">Live Firestore task status lifecycle counts</p>
                </div>
                <span className="text-xs font-bold text-[#049FD9] bg-[#F0FDF4] px-2.5 py-0.5 rounded-md border border-[#BBF7D0]">
                  {overallCompletionPercentage}% Completed
                </span>
              </div>

              {/* Progress Bar Stack */}
              <div className="w-full bg-[#F3F4F6] rounded-full h-3 overflow-hidden flex">
                <div
                  style={{ width: `${(completedTasks / (totalTasks || 1)) * 100}%` }}
                  className="bg-[#16A34A] h-full"
                  title={`Completed: ${completedTasks}`}
                />
                <div
                  style={{ width: `${(inProgressTasks / (totalTasks || 1)) * 100}%` }}
                  className="bg-[#2563EB] h-full"
                  title={`In Progress: ${inProgressTasks}`}
                />
                <div
                  style={{ width: `${(inReviewTasks / (totalTasks || 1)) * 100}%` }}
                  className="bg-[#9333EA] h-full"
                  title={`In Review: ${inReviewTasks}`}
                />
                <div
                  style={{ width: `${(pendingTasks / (totalTasks || 1)) * 100}%` }}
                  className="bg-[#D97706] h-full"
                  title={`Pending: ${pendingTasks}`}
                />
                <div
                  style={{ width: `${(overdueTasks / (totalTasks || 1)) * 100}%` }}
                  className="bg-[#DC2626] h-full"
                  title={`Overdue: ${overdueTasks}`}
                />
              </div>

              {/* Legend Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0]">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#16A34A] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-[#16A34A]">Completed</div>
                    <div className="font-bold text-[#111827]">{completedTasks} tasks</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2563EB] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-[#1D4ED8]">In Progress</div>
                    <div className="font-bold text-[#111827]">{inProgressTasks} tasks</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-[#FAF5FF] border border-[#E9D5FF]">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#9333EA] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-[#7E22CE]">In Review</div>
                    <div className="font-bold text-[#111827]">{inReviewTasks} tasks</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-[#FFFBEB] border border-[#FDE68A]">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#D97706] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-[#92400E]">Pending</div>
                    <div className="font-bold text-[#111827]">{pendingTasks} tasks</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5]">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#DC2626] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-[#DC2626]">Overdue</div>
                    <div className="font-bold text-[#111827]">{overdueTasks} tasks</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#64748B] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-[#64748B]">Cancelled</div>
                    <div className="font-bold text-[#111827]">{tasks.length - totalEligibleTasks} tasks</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Projects Progress Overview */}
            <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                <div>
                  <h3 className="text-sm font-bold text-[#111827]">Projects Task Velocity</h3>
                  <p className="text-xs text-[#595959]">Live completion progress per active project</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAdminTab('projects')}
                  className="text-xs font-bold text-[#049FD9] hover:underline"
                >
                  View All Projects →
                </button>
              </div>

              <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                {projectReports.slice(0, 5).map((p) => (
                  <div key={p.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-[#374151]">
                      <span className="font-semibold text-[#111827] truncate max-w-[200px]">{p.name}</span>
                      <span className="font-bold text-[#049FD9]">
                        {p.completedTasks}/{p.totalEligible} tasks ({p.progressPercentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#F3F4F6] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#049FD9] h-full rounded-full transition-all duration-300"
                        style={{ width: `${p.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW B: EMPLOYEE TASK COMPLETION REPORT (Section 3)
      ======================================================== */}
      {effectiveIsAdmin && adminViewMode === 'workspace' && activeAdminTab === 'employees' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <SearchIcon className="w-4 h-4 text-[#595959] absolute left-3 top-1/2 -translate-y-1/2" />
              <input id="reportsview-loyee-search-1" name="loyeeSearch"
                type="text"
                placeholder="Search employee by name, email, ID..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#F4F6F8] border border-[#E5E5E5] rounded-lg text-xs text-[#111827] placeholder-[#595959] focus:outline-hidden focus:border-[#049FD9]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-[#595959] shrink-0">Department:</span>
              <select id="reportsview-loyee-dept-filter-2" name="loyeeDeptFilter"
                value={employeeDeptFilter}
                onChange={(e) => setEmployeeDeptFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#F4F6F8] border border-[#E5E5E5] rounded-lg text-xs font-semibold text-[#111827] focus:outline-hidden"
              >
                <option value="all">All Departments ({people.length})</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Employees Table */}
          <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E5E5E5] text-[11px] font-bold text-[#595959] uppercase tracking-wider">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-3">Emp ID</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Designation</th>
                    <th className="py-3 px-2 text-center">Assigned</th>
                    <th className="py-3 px-2 text-center">Done</th>
                    <th className="py-3 px-2 text-center">In Progress</th>
                    <th className="py-3 px-2 text-center">In Review</th>
                    <th className="py-3 px-2 text-center">Pending</th>
                    <th className="py-3 px-2 text-center">Overdue</th>
                    <th className="py-3 px-4">Completion %</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {filteredEmployeeReports.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-[#595959]">
                        No employees match the specified filters.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployeeReports.map((rep) => (
                      <tr key={rep.employee.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#049FD9] text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {(rep.name[0] || 'E').toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-[#111827] truncate">{rep.name}</div>
                              <div className="text-[10px] text-[#595959] truncate">{rep.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#475569] whitespace-nowrap">
                          {rep.employeeId}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap font-medium text-[#111827]">
                          {rep.department}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-[#595959]">
                          {rep.designation}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-[#111827]">
                          {rep.totalAssigned}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-[#16A34A]">
                          {rep.completedTasks}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-[#2563EB]">
                          {rep.inProgressTasks}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-[#9333EA]">
                          {rep.inReviewTasks}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-[#D97706]">
                          {rep.pendingTasks}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {rep.overdueTasks > 0 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]">
                              {rep.overdueTasks}
                            </span>
                          ) : (
                            <span className="text-[#595959]">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-28 space-y-1">
                            <div className="flex justify-between text-[11px] font-bold text-[#111827]">
                              <span>{rep.completionPercentage}%</span>
                            </div>
                            <div className="w-full bg-[#E2E8F0] rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  rep.completionPercentage === 100
                                    ? 'bg-[#16A34A]'
                                    : rep.completionPercentage > 50
                                    ? 'bg-[#049FD9]'
                                    : 'bg-[#D97706]'
                                }`}
                                style={{ width: `${rep.completionPercentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setDrillEmployee(rep)}
                            className="px-2.5 py-1 rounded bg-[#F4F6F8] hover:bg-[#E5E5E5] text-[#049FD9] hover:text-[#004BAF] text-xs font-bold transition-colors cursor-pointer"
                          >
                            Details →
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW C: PROJECT-WISE PROGRESS REPORT (Section 4)
      ======================================================== */}
      {effectiveIsAdmin && adminViewMode === 'workspace' && activeAdminTab === 'projects' && (
        <div className="space-y-4">
          {/* Project Filters Bar */}
          <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <SearchIcon className="w-4 h-4 text-[#595959] absolute left-3 top-1/2 -translate-y-1/2" />
              <input id="reportsview-search-3" name="search"
                type="text"
                placeholder="Search project name, manager..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#F4F6F8] border border-[#E5E5E5] rounded-lg text-xs text-[#111827] placeholder-[#595959] focus:outline-hidden focus:border-[#049FD9]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-[#595959] shrink-0">Status:</span>
              <select id="reportsview-status-filter-4" name="statusFilter"
                value={projectStatusFilter}
                onChange={(e) => setProjectStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#F4F6F8] border border-[#E5E5E5] rounded-lg text-xs font-semibold text-[#111827] focus:outline-hidden"
              >
                <option value="all">All Statuses ({projects.length})</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="planning">Planning</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Projects Table */}
          <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E5E5E5] text-[11px] font-bold text-[#595959] uppercase tracking-wider">
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-3">Manager</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Start Date</th>
                    <th className="py-3 px-3">Deadline</th>
                    <th className="py-3 px-2 text-center">Eligible Tasks</th>
                    <th className="py-3 px-2 text-center">Done</th>
                    <th className="py-3 px-2 text-center">In Progress</th>
                    <th className="py-3 px-2 text-center">Pending</th>
                    <th className="py-3 px-2 text-center">Overdue</th>
                    <th className="py-3 px-4">Progress %</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {filteredProjectReports.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-[#595959]">
                        No projects match the specified filters.
                      </td>
                    </tr>
                  ) : (
                    filteredProjectReports.map((p) => (
                      <tr key={p.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <FolderIcon className="w-4 h-4 text-[#049FD9] shrink-0" />
                            <div className="font-bold text-[#111827] truncate max-w-[180px]">
                              {p.name}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-medium text-[#475569] whitespace-nowrap">
                          {p.manager}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              p.status === 'completed'
                                ? 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]'
                                : p.status === 'active'
                                ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                                : 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-[#595959]">{p.startDate}</td>
                        <td className="py-3 px-3 whitespace-nowrap text-[#595959]">{p.deadline}</td>
                        <td className="py-3 px-2 text-center font-bold text-[#111827]">
                          {p.totalEligible}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-[#16A34A]">
                          {p.completedTasks}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-[#2563EB]">
                          {p.inProgressTasks}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-[#D97706]">
                          {p.pendingTasks}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {p.overdueTasks > 0 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]">
                              {p.overdueTasks}
                            </span>
                          ) : (
                            <span className="text-[#595959]">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-28 space-y-1">
                            <div className="flex justify-between text-[11px] font-bold text-[#111827]">
                              <span>{p.progressPercentage}%</span>
                            </div>
                            <div className="w-full bg-[#E2E8F0] rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  p.progressPercentage === 100
                                    ? 'bg-[#16A34A]'
                                    : p.progressPercentage > 50
                                    ? 'bg-[#049FD9]'
                                    : 'bg-[#D97706]'
                                }`}
                                style={{ width: `${p.progressPercentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setDrillProject(p)}
                            className="px-2.5 py-1 rounded bg-[#F4F6F8] hover:bg-[#E5E5E5] text-[#049FD9] hover:text-[#004BAF] text-xs font-bold transition-colors cursor-pointer"
                          >
                            Details →
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW D: PENDING TASKS REPORT (Section 5)
      ======================================================== */}
      {effectiveIsAdmin && adminViewMode === 'workspace' && activeAdminTab === 'pending' && (
        <div className="space-y-4">
          {/* Multi-Filters Bar */}
          <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <SearchIcon className="w-4 h-4 text-[#595959] absolute left-3 top-1/2 -translate-y-1/2" />
                <input id="reportsview-pending-search-5" name="pendingSearch"
                  type="text"
                  placeholder="Search pending tasks..."
                  value={pendingSearch}
                  onChange={(e) => setPendingSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#F4F6F8] border border-[#E5E5E5] rounded-lg text-xs text-[#111827] placeholder-[#595959] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold text-[#595959]">
                <span>Sort by:</span>
                <select id="reportsview-pending-sort-by-6" name="pendingSortBy"
                  value={pendingSortBy}
                  onChange={(e) => setPendingSortBy(e.target.value as any)}
                  className="px-3 py-1.5 bg-[#F4F6F8] border border-[#E5E5E5] rounded-lg text-xs font-semibold text-[#111827] focus:outline-hidden"
                >
                  <option value="due_date">Due Date Soonest</option>
                  <option value="newest">Newest Created</option>
                  <option value="oldest">Oldest Created</option>
                  <option value="priority">Highest Priority</option>
                </select>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#E5E5E5] text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#595959] uppercase block mb-1">Project</label>
                <select id="reportsview-pending-project-filter-7" name="pendingProjectFilter"
                  value={pendingProjectFilter}
                  onChange={(e) => setPendingProjectFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F4F6F8] border border-[#E5E5E5] rounded-lg text-xs text-[#111827]"
                >
                  <option value="all">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#595959] uppercase block mb-1">Department</label>
                <select id="reportsview-pending-dept-filter-8" name="pendingDeptFilter"
                  value={pendingDeptFilter}
                  onChange={(e) => setPendingDeptFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F4F6F8] border border-[#E5E5E5] rounded-lg text-xs text-[#111827]"
                >
                  <option value="all">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#595959] uppercase block mb-1">Priority</label>
                <select id="reportsview-pending-priority-filter-9" name="pendingPriorityFilter"
                  value={pendingPriorityFilter}
                  onChange={(e) => setPendingPriorityFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F4F6F8] border border-[#E5E5E5] rounded-lg text-xs text-[#111827]"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#595959] uppercase block mb-1">Status</label>
                <select id="reportsview-pending-status-filter-10" name="pendingStatusFilter"
                  value={pendingStatusFilter}
                  onChange={(e) => setPendingStatusFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F4F6F8] border border-[#E5E5E5] rounded-lg text-xs text-[#111827]"
                >
                  <option value="all">All Incomplete</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pending Tasks Table */}
          <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E5E5E5] text-[11px] font-bold text-[#595959] uppercase tracking-wider">
                    <th className="py-3 px-4">Task Title</th>
                    <th className="py-3 px-3">Project</th>
                    <th className="py-3 px-3">Assigned Employee</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Start Date</th>
                    <th className="py-3 px-3">Due Date</th>
                    <th className="py-3 px-3">Current Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {filteredPendingTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#595959]">
                        No pending tasks found with the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredPendingTasks.map((t) => (
                      <tr key={t.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#111827]">{t.title}</div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#049FD9] whitespace-nowrap">
                          {t.project || 'General'}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-[#E2E8F0] font-bold text-[10px] text-[#475569] flex items-center justify-center shrink-0">
                              {(t.assignedTo?.[0] || 'U').toUpperCase()}
                            </div>
                            <span className="font-medium text-[#111827]">{t.assignedTo || 'Unassigned'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">{renderPriorityBadge(t.priority)}</td>
                        <td className="py-3 px-3 whitespace-nowrap text-[#595959]">{t.startDate || '—'}</td>
                        <td className="py-3 px-3 whitespace-nowrap font-medium text-[#111827]">
                          {t.dueDate || '—'}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">{renderStatusBadge(t.status, t.completed)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW E: OVERDUE TASKS REPORT (Section 6)
      ======================================================== */}
      {effectiveIsAdmin && adminViewMode === 'workspace' && activeAdminTab === 'overdue' && (
        <div className="space-y-4">
          {/* Overdue Alert Banner */}
          {allOverdueTasks.length > 0 ? (
            <div className="bg-[#FEF2F2] border border-[#FECACA] p-4 rounded-lg flex items-center gap-3">
              <AlertCircleIcon className="w-5 h-5 text-[#DC2626] shrink-0" />
              <div>
                <div className="text-xs font-bold text-[#991B1B]">
                  {allOverdueTasks.length} task(s) currently overdue in this workspace
                </div>
                <div className="text-[11px] text-[#B91C1C]">
                  Tasks whose due date has passed according to the Asia/Kolkata timezone ({todayStr}).
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] p-4 rounded-lg flex items-center gap-3">
              <CheckCircleIcon className="w-5 h-5 text-[#16A34A] shrink-0" />
              <div className="text-xs font-bold text-[#166534]">
                All clear! Zero tasks are currently overdue.
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <SearchIcon className="w-4 h-4 text-[#595959] absolute left-3 top-1/2 -translate-y-1/2" />
              <input id="reportsview-overdue-search-11" name="overdueSearch"
                type="text"
                placeholder="Search overdue tasks..."
                value={overdueSearch}
                onChange={(e) => setOverdueSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#F4F6F8] border border-[#E5E5E5] rounded-lg text-xs text-[#111827] placeholder-[#595959] focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[#595959]">Project:</span>
                <select id="reportsview-overdue-project-filter-12" name="overdueProjectFilter"
                  value={overdueProjectFilter}
                  onChange={(e) => setOverdueProjectFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-[#F4F6F8] border border-[#E5E5E5] rounded-lg text-xs font-semibold text-[#111827]"
                >
                  <option value="all">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[#595959]">Priority:</span>
                <select id="reportsview-overdue-priority-filter-13" name="overduePriorityFilter"
                  value={overduePriorityFilter}
                  onChange={(e) => setOverduePriorityFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-[#F4F6F8] border border-[#E5E5E5] rounded-lg text-xs font-semibold text-[#111827]"
                >
                  <option value="all">All</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Overdue Table */}
          <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FEF2F2]/50 border-b border-[#FECACA] text-[11px] font-bold text-[#991B1B] uppercase tracking-wider">
                    <th className="py-3 px-4">Task Title</th>
                    <th className="py-3 px-3">Project</th>
                    <th className="py-3 px-3">Assigned Employee</th>
                    <th className="py-3 px-3">Due Date</th>
                    <th className="py-3 px-3">Days Overdue</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Current Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {filteredOverdueTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#595959]">
                        No overdue tasks found.
                      </td>
                    </tr>
                  ) : (
                    filteredOverdueTasks.map((t) => {
                      const days = getDaysOverdue(t.dueDate);
                      return (
                        <tr key={t.id} className="hover:bg-[#FEF2F2]/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#DC2626]">{t.title}</div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-[#111827] whitespace-nowrap">
                            {t.project || 'General'}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-medium text-[#111827]">
                            {t.assignedTo || 'Unassigned'}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-bold text-[#DC2626]">
                            {t.dueDate || '—'}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]">
                              {days} day{days === 1 ? '' : 's'} overdue
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">{renderPriorityBadge(t.priority)}</td>
                          <td className="py-3 px-3 whitespace-nowrap">{renderStatusBadge(t.status, t.completed)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW F: MONTHLY PRODUCTIVITY REPORT (Section 7)
      ======================================================== */}
      {effectiveIsAdmin && adminViewMode === 'workspace' && activeAdminTab === 'monthly' && (
        <div className="space-y-6">
          {/* Month Selector Bar */}
          <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#111827]">
                Monthly Productivity: {monthlyData.monthLabel}
              </h2>
              <p className="text-xs text-[#595959]">
                Calculated strictly from task timestamps and Admin approval records
              </p>
            </div>

            {/* Month Dropdown / Selection */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#595959]">Select Month:</span>
              <select id="reportsview-selected-month-key-14" name="selectedMonthKey"
                value={selectedMonthKey}
                onChange={(e) => setSelectedMonthKey(e.target.value)}
                className="px-3 py-1.5 bg-[#F4F6F8] border border-[#E5E5E5] rounded-lg text-xs font-bold text-[#111827] focus:outline-hidden"
              >
                <option value="2026-11">November 2026</option>
                <option value="2026-10">October 2026</option>
                <option value="2026-09">September 2026</option>
                <option value="2026-08">August 2026</option>
                <option value="2026-07">July 2026</option>
                <option value="2026-06">June 2026</option>
              </select>
            </div>
          </div>

          {/* Monthly KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
              <span className="text-[10px] font-bold text-[#595959] uppercase block">Assigned in Month</span>
              <div className="text-2xl font-black text-[#111827] mt-1">{monthlyData.tasksAssigned}</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
              <span className="text-[10px] font-bold text-[#16A34A] uppercase block">Completed in Month</span>
              <div className="text-2xl font-black text-[#16A34A] mt-1">{monthlyData.tasksCompleted}</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
              <span className="text-[10px] font-bold text-[#D97706] uppercase block">Still Pending</span>
              <div className="text-2xl font-black text-[#D97706] mt-1">{monthlyData.tasksPending}</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
              <span className="text-[10px] font-bold text-[#DC2626] uppercase block">Overdue in Month</span>
              <div className="text-2xl font-black text-[#DC2626] mt-1">{monthlyData.tasksOverdue}</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-[#049FD9] uppercase block">Monthly Velocity %</span>
              <div className="text-2xl font-black text-[#049FD9] mt-1">
                {monthlyData.completionPercentage}%
              </div>
            </div>
          </div>

          {/* Historical Trend Chart (6 Months Velocity) */}
          <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div>
                <h3 className="text-sm font-bold text-[#111827]">6-Month Historical Velocity Trend</h3>
                <p className="text-xs text-[#595959]">Comparison of tasks assigned vs completed each month</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-[#049FD9] rounded-xs" />
                  <span>Assigned</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-[#16A34A] rounded-xs" />
                  <span>Completed</span>
                </div>
              </div>
            </div>

            {/* Dynamic CSS Bar Chart */}
            <div className="h-56 bg-[#F8FAFC] rounded-lg p-4 border border-[#E5E5E5] flex items-end justify-between gap-4">
              {monthlyData.historicalTrend.map((item) => {
                const maxVal = Math.max(
                  ...monthlyData.historicalTrend.map((h) => Math.max(h.assigned, h.completed)),
                  5
                );
                const assignedHeight = Math.max((item.assigned / maxVal) * 100, 8);
                const completedHeight = Math.max((item.completed / maxVal) * 100, 8);

                return (
                  <div key={item.monthKey} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full flex items-end justify-center gap-1.5 h-full">
                      {/* Assigned Bar */}
                      <div
                        className="w-full max-w-[24px] bg-[#049FD9] rounded-t-xs hover:opacity-90 transition-all relative group flex flex-col items-center"
                        style={{ height: `${assignedHeight}%` }}
                      >
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-7 px-1.5 py-0.5 bg-[#0F172A] text-white text-[9px] rounded font-bold pointer-events-none transition-opacity whitespace-nowrap z-10">
                          {item.assigned} assigned
                        </div>
                      </div>

                      {/* Completed Bar */}
                      <div
                        className="w-full max-w-[24px] bg-[#16A34A] rounded-t-xs hover:opacity-90 transition-all relative group flex flex-col items-center"
                        style={{ height: `${completedHeight}%` }}
                      >
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-7 px-1.5 py-0.5 bg-[#0F172A] text-white text-[9px] rounded font-bold pointer-events-none transition-opacity whitespace-nowrap z-10">
                          {item.completed} completed
                        </div>
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-[10px] font-bold text-[#111827]">{item.monthLabel}</div>
                      <div className="text-[9px] font-semibold text-[#049FD9]">{item.rate}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Breakdown: Employee-wise and Project-wise Completion Rankings for Month */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employee Monthly Ranking */}
            <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-[#111827]">Employee Completion ({monthlyData.monthLabel})</h3>
              {monthlyData.employeeCompletion.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#595959]">No tasks completed in this month yet.</div>
              ) : (
                <div className="space-y-2">
                  {monthlyData.employeeCompletion.map((emp, i) => (
                    <div key={emp.employeeName} className="flex items-center justify-between p-2 rounded-lg bg-[#F9FAFB] border border-[#E5E5E5] text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#E2E8F0] font-bold text-[10px] flex items-center justify-center text-[#475569]">
                          {i + 1}
                        </span>
                        <span className="font-semibold text-[#111827]">{emp.employeeName}</span>
                      </div>
                      <span className="font-bold text-[#16A34A]">{emp.completedCount} completed</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Project Monthly Ranking */}
            <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-[#111827]">Project Delivery ({monthlyData.monthLabel})</h3>
              {monthlyData.projectCompletion.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#595959]">No tasks completed in this month yet.</div>
              ) : (
                <div className="space-y-2">
                  {monthlyData.projectCompletion.map((proj, i) => (
                    <div key={proj.projectName} className="flex items-center justify-between p-2 rounded-lg bg-[#F9FAFB] border border-[#E5E5E5] text-xs">
                      <div className="flex items-center gap-2">
                        <FolderIcon className="w-4 h-4 text-[#049FD9]" />
                        <span className="font-semibold text-[#111827]">{proj.projectName}</span>
                      </div>
                      <span className="font-bold text-[#049FD9]">{proj.completedCount} tasks done</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW G: EMPLOYEE WORKLOAD REPORT (Section 8)
      ======================================================== */}
      {effectiveIsAdmin && adminViewMode === 'workspace' && activeAdminTab === 'workload' && (
        <div className="space-y-6">
          {/* Workload Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
              <span className="text-[10px] font-bold text-[#595959] uppercase block">Total Active Tasks</span>
              <div className="text-2xl font-black text-[#111827] mt-1">{workloadData.totalActiveTasks}</div>
              <div className="text-[11px] text-[#595959] font-medium mt-0.5">
                {(workloadData.totalActiveTasks / (people.length || 1)).toFixed(1)} tasks/employee avg
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
              <span className="text-[10px] font-bold text-[#D97706] uppercase block">Heavy Workload</span>
              <div className="text-2xl font-black text-[#D97706] mt-1">{workloadData.heavyCount}</div>
              <div className="text-[11px] text-[#D97706] font-medium mt-0.5">&gt; 5 active tasks</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
              <span className="text-[10px] font-bold text-[#16A34A] uppercase block">Balanced Workload</span>
              <div className="text-2xl font-black text-[#16A34A] mt-1">{workloadData.balancedCount}</div>
              <div className="text-[11px] text-[#16A34A] font-medium mt-0.5">2 – 5 active tasks</div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
              <span className="text-[10px] font-bold text-[#2563EB] uppercase block">Available / Light</span>
              <div className="text-2xl font-black text-[#2563EB] mt-1">{workloadData.lightCount}</div>
              <div className="text-[11px] text-[#2563EB] font-medium mt-0.5">&lt; 2 active tasks</div>
            </div>
          </div>

          {/* Department Workload Breakdown Cards */}
          <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-[#111827]">Department Workload Distribution</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {workloadData.departmentSummaries.map((dept) => (
                <div key={dept.department} className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                  <div className="font-bold text-xs text-[#111827]">{dept.department}</div>
                  <div className="text-lg font-black text-[#049FD9]">{dept.activeTasksCount} active tasks</div>
                  <div className="text-[10px] text-[#595959]">
                    {dept.employeeCount} team members • {dept.overdueCount} overdue
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workload Table */}
          <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs overflow-hidden">
            <div className="p-3 border-b border-[#E5E5E5] flex flex-wrap items-center justify-between gap-3 bg-[#F8FAFC]">
              <span className="font-bold text-xs text-[#111827]">Active Assignments by Employee</span>
              <div className="flex items-center gap-2">
                <select id="reportsview-workload-dept-filter-15" name="workloadDeptFilter"
                  value={workloadDeptFilter}
                  onChange={(e) => setWorkloadDeptFilter(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-[#E5E5E5] rounded-md text-xs font-semibold text-[#111827]"
                >
                  <option value="all">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <select id="reportsview-workload-status-filter-16" name="workloadStatusFilter"
                  value={workloadStatusFilter}
                  onChange={(e) => setWorkloadStatusFilter(e.target.value as any)}
                  className="px-2.5 py-1 bg-white border border-[#E5E5E5] rounded-md text-xs font-semibold text-[#111827]"
                >
                  <option value="all">All Workload Statuses</option>
                  <option value="heavy">Heavy Workload</option>
                  <option value="balanced">Balanced</option>
                  <option value="light">Available / Light</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E5E5E5] text-[11px] font-bold text-[#595959] uppercase tracking-wider">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-2 text-center">Active Tasks</th>
                    <th className="py-3 px-2 text-center">Pending</th>
                    <th className="py-3 px-2 text-center">In Progress</th>
                    <th className="py-3 px-2 text-center">In Review</th>
                    <th className="py-3 px-2 text-center">Overdue</th>
                    <th className="py-3 px-2 text-center">High Priority</th>
                    <th className="py-3 px-3">Workload Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {filteredWorkloadItems.map((item) => (
                    <tr key={item.employee.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#111827]">{item.name}</div>
                        <div className="text-[10px] text-[#595959]">{item.designation}</div>
                      </td>
                      <td className="py-3 px-3 font-medium text-[#475569]">{item.department}</td>
                      <td className="py-3 px-2 text-center font-black text-sm text-[#049FD9]">
                        {item.activeTasks}
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-[#D97706]">{item.pendingTasks}</td>
                      <td className="py-3 px-2 text-center font-bold text-[#2563EB]">{item.inProgressTasks}</td>
                      <td className="py-3 px-2 text-center font-bold text-[#9333EA]">{item.inReviewTasks}</td>
                      <td className="py-3 px-2 text-center">
                        {item.overdueTasks > 0 ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[#FEF2F2] text-[#DC2626]">
                            {item.overdueTasks}
                          </span>
                        ) : (
                          <span className="text-[#595959]">0</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {item.highPriorityTasks > 0 ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FFF7ED] text-[#EA580C]">
                            {item.highPriorityTasks}
                          </span>
                        ) : (
                          <span className="text-[#595959]">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.workloadStatus === 'heavy'
                              ? 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]'
                              : item.workloadStatus === 'light'
                              ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                              : 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]'
                          }`}
                        >
                          {item.workloadLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW H: PROJECT COMPLETION HISTORY (Section 9)
      ======================================================== */}
      {effectiveIsAdmin && adminViewMode === 'workspace' && activeAdminTab === 'history' && (
        <div className="space-y-4">
          {/* History Filters */}
          <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#595959]">Status Filter:</span>
              {['all', 'completed', 'active', 'on_hold', 'cancelled'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setHistoryStatusFilter(st)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg uppercase transition-colors ${
                    historyStatusFilter === st
                      ? 'bg-[#049FD9] text-white'
                      : 'bg-[#F4F6F8] text-[#595959] hover:bg-[#E5E5E5]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#595959]">Manager:</span>
              <select id="reportsview-history-manager-filter-17" name="historyManagerFilter"
                value={historyManagerFilter}
                onChange={(e) => setHistoryManagerFilter(e.target.value)}
                className="px-2.5 py-1 bg-[#F4F6F8] border border-[#E5E5E5] rounded-lg text-xs font-semibold text-[#111827]"
              >
                <option value="all">All Managers</option>
                {projectManagers.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Project History Table */}
          <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E5E5E5] text-[11px] font-bold text-[#595959] uppercase tracking-wider">
                    <th className="py-3 px-4">Project Name</th>
                    <th className="py-3 px-3">Manager</th>
                    <th className="py-3 px-3">Start Date</th>
                    <th className="py-3 px-3">Planned Completion</th>
                    <th className="py-3 px-3">Actual Completion</th>
                    <th className="py-3 px-3">Duration</th>
                    <th className="py-3 px-3">Final Task %</th>
                    <th className="py-3 px-3">Project Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {filteredHistoryItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#595959]">
                        No project history records found.
                      </td>
                    </tr>
                  ) : (
                    filteredHistoryItems.map((item) => (
                      <tr key={item.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="py-3 px-4 font-bold text-[#111827]">
                          <div className="flex items-center gap-2">
                            <FolderIcon className="w-4 h-4 text-[#049FD9] shrink-0" />
                            <span>{item.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-medium text-[#475569]">{item.manager}</td>
                        <td className="py-3 px-3 text-[#595959]">{item.startDate}</td>
                        <td className="py-3 px-3 text-[#595959]">{item.plannedCompletionDate}</td>
                        <td className="py-3 px-3 font-semibold text-[#111827]">
                          {item.actualCompletionDate}
                        </td>
                        <td className="py-3 px-3 font-medium text-[#475569]">
                          {item.durationDays > 0 ? `${item.durationDays} days` : '—'}
                        </td>
                        <td className="py-3 px-3 font-bold text-[#049FD9]">
                          {item.completedTasks}/{item.totalTasks} ({item.finalProgress}%)
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              item.status === 'completed'
                                ? 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]'
                                : item.status === 'active'
                                ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                                : 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW I: EMPLOYEE PERSONAL REPORTS DASHBOARD (Section 10)
      ======================================================== */}
      {(!effectiveIsAdmin || adminViewMode === 'personal') && (
        <div className="space-y-6">
          {/* Sub-tab 1: My Monthly Activity & Overview */}
          {activeEmployeeTab === 'overview' && (
            <div className="space-y-6">
              {/* Personal 4 KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
                  <span className="text-[10px] font-bold text-[#595959] uppercase block">Assigned to Me</span>
                  <div className="text-2xl font-black text-[#111827] mt-1">{myTasks.length}</div>
                  <div className="text-[11px] text-[#595959] font-medium mt-0.5">all-time tasks</div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
                  <span className="text-[10px] font-bold text-[#16A34A] uppercase block">Completed by Me</span>
                  <div className="text-2xl font-black text-[#16A34A] mt-1">{myCompletedTasks.length}</div>
                  <div className="text-[11px] text-[#16A34A] font-medium mt-0.5">admin-approved</div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
                  <span className="text-[10px] font-bold text-[#2563EB] uppercase block">In Progress</span>
                  <div className="text-2xl font-black text-[#2563EB] mt-1">{myInProgressTasks.length}</div>
                  <div className="text-[11px] text-[#2563EB] font-medium mt-0.5">active right now</div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs">
                  <span className="text-[10px] font-bold text-[#DC2626] uppercase block">Overdue Tasks</span>
                  <div className="text-2xl font-black text-[#DC2626] mt-1">{myOverdueTasks.length}</div>
                  <div className="text-[11px] text-[#DC2626] font-medium mt-0.5">
                    {myOverdueTasks.length > 0 ? 'needs attention' : 'on schedule'}
                  </div>
                </div>
              </div>

              {/* Personal Monthly Output Chart */}
              <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">My Monthly Output & Velocity</h3>
                    <p className="text-xs text-[#595959]">Deliverables completed by you month-over-month</p>
                  </div>
                  <div className="text-xs font-bold text-[#049FD9]">
                    Current Month Velocity: {myMonthlyData.completionPercentage}%
                  </div>
                </div>

                <div className="h-48 bg-[#F8FAFC] rounded-lg p-4 border border-[#E5E5E5] flex items-end justify-between gap-4">
                  {myMonthlyData.historicalTrend.map((item) => {
                    const maxVal = Math.max(
                      ...myMonthlyData.historicalTrend.map((h) => Math.max(h.assigned, h.completed)),
                      4
                    );
                    const compHeight = Math.max((item.completed / maxVal) * 100, 8);

                    return (
                      <div key={item.monthKey} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                        <div
                          className="w-full max-w-[32px] bg-[#049FD9] rounded-t-xs hover:bg-[#004BAF] transition-all relative group flex flex-col items-center"
                          style={{ height: `${compHeight}%` }}
                        >
                          <div className="opacity-0 group-hover:opacity-100 absolute -top-7 px-1.5 py-0.5 bg-[#0F172A] text-white text-[9px] rounded font-bold pointer-events-none transition-opacity whitespace-nowrap z-10">
                            {item.completed} completed
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#111827]">{item.monthLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 2: My Completed Tasks */}
          {activeEmployeeTab === 'completed' && (
            <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-[#E5E5E5] bg-[#F8FAFC]">
                <h3 className="font-bold text-xs text-[#111827]">
                  Approved Completed Deliverables ({myCompletedTasks.length})
                </h3>
                <p className="text-[11px] text-[#595959]">Only Admin-approved tasks appear in this verified report.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E5E5E5] text-[11px] font-bold text-[#595959] uppercase tracking-wider">
                      <th className="py-3 px-4">Task Title</th>
                      <th className="py-3 px-3">Project</th>
                      <th className="py-3 px-3">Priority</th>
                      <th className="py-3 px-3">Completion Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {myCompletedTasks.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-[#595959]">
                          No completed tasks yet.
                        </td>
                      </tr>
                    ) : (
                      myCompletedTasks.map((t) => (
                        <tr key={t.id} className="hover:bg-[#F9FAFB] transition-colors">
                          <td className="py-3 px-4 font-bold text-[#111827]">{t.title}</td>
                          <td className="py-3 px-3 font-semibold text-[#049FD9]">{t.project}</td>
                          <td className="py-3 px-3">{renderPriorityBadge(t.priority)}</td>
                          <td className="py-3 px-3 font-medium text-[#16A34A]">
                            {t.completedAt ? t.completedAt.split('T')[0] : t.updatedAt?.split('T')[0] || 'Verified'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-tab 3: My Pending Tasks */}
          {activeEmployeeTab === 'pending' && (
            <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-[#E5E5E5] bg-[#F8FAFC]">
                <h3 className="font-bold text-xs text-[#111827]">My Active Workload ({myPendingTasks.length})</h3>
                <p className="text-[11px] text-[#595959]">Tasks currently assigned to you and ready for delivery.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E5E5E5] text-[11px] font-bold text-[#595959] uppercase tracking-wider">
                      <th className="py-3 px-4">Task Title</th>
                      <th className="py-3 px-3">Project</th>
                      <th className="py-3 px-3">Priority</th>
                      <th className="py-3 px-3">Due Date</th>
                      <th className="py-3 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {myPendingTasks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#595959]">
                          No active pending tasks assigned to you right now.
                        </td>
                      </tr>
                    ) : (
                      myPendingTasks.map((t) => (
                        <tr key={t.id} className="hover:bg-[#F9FAFB] transition-colors">
                          <td className="py-3 px-4 font-bold text-[#111827]">{t.title}</td>
                          <td className="py-3 px-3 font-semibold text-[#049FD9]">{t.project}</td>
                          <td className="py-3 px-3">{renderPriorityBadge(t.priority)}</td>
                          <td className="py-3 px-3 text-[#475569]">{t.dueDate || '—'}</td>
                          <td className="py-3 px-3">{renderStatusBadge(t.status, t.completed)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-tab 4: My Overdue Tasks */}
          {activeEmployeeTab === 'overdue' && (
            <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-[#FECACA] bg-[#FEF2F2]/40">
                <h3 className="font-bold text-xs text-[#DC2626]">
                  My Overdue Tasks ({myOverdueTasks.length})
                </h3>
                <p className="text-[11px] text-[#B91C1C]">
                  Please prioritize completing these items or coordinate with your project manager.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FEF2F2]/40 border-b border-[#FECACA] text-[11px] font-bold text-[#991B1B] uppercase tracking-wider">
                      <th className="py-3 px-4">Task Title</th>
                      <th className="py-3 px-3">Project</th>
                      <th className="py-3 px-3">Due Date</th>
                      <th className="py-3 px-3">Days Overdue</th>
                      <th className="py-3 px-3">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {myOverdueTasks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#16A34A] font-medium">
                          Great job! None of your tasks are overdue.
                        </td>
                      </tr>
                    ) : (
                      myOverdueTasks.map((t) => {
                        const days = getDaysOverdue(t.dueDate);
                        return (
                          <tr key={t.id} className="hover:bg-[#FEF2F2]/20 transition-colors">
                            <td className="py-3 px-4 font-bold text-[#DC2626]">{t.title}</td>
                            <td className="py-3 px-3 font-semibold text-[#111827]">{t.project}</td>
                            <td className="py-3 px-3 font-bold text-[#DC2626]">{t.dueDate}</td>
                            <td className="py-3 px-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]">
                                {days} day{days === 1 ? '' : 's'} overdue
                              </span>
                            </td>
                            <td className="py-3 px-3">{renderPriorityBadge(t.priority)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODAL 1: DETAILED EMPLOYEE REPORT MODAL
      ======================================================== */}
      {drillEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#E5E5E5] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#049FD9] text-white font-black text-sm flex items-center justify-center shadow-xs">
                  {(drillEmployee.name[0] || 'E').toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#111827]">{drillEmployee.name}</h3>
                  <div className="text-xs text-[#595959]">
                    {drillEmployee.employeeId} • {drillEmployee.department} • {drillEmployee.designation}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrillEmployee(null)}
                className="w-8 h-8 rounded-lg bg-[#F4F6F8] hover:bg-[#E5E5E5] text-[#595959] hover:text-[#111827] flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[10px] font-bold text-[#595959] uppercase block">Total Assigned</span>
                  <div className="text-xl font-black text-[#111827] mt-0.5">{drillEmployee.totalAssigned}</div>
                </div>
                <div className="p-3 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0]">
                  <span className="text-[10px] font-bold text-[#16A34A] uppercase block">Completed</span>
                  <div className="text-xl font-black text-[#16A34A] mt-0.5">{drillEmployee.completedTasks}</div>
                </div>
                <div className="p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]">
                  <span className="text-[10px] font-bold text-[#2563EB] uppercase block">In Progress</span>
                  <div className="text-xl font-black text-[#2563EB] mt-0.5">{drillEmployee.inProgressTasks}</div>
                </div>
                <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A]">
                  <span className="text-[10px] font-bold text-[#D97706] uppercase block">Completion %</span>
                  <div className="text-xl font-black text-[#D97706] mt-0.5">{drillEmployee.completionPercentage}%</div>
                </div>
              </div>

              {/* Task Breakdown List */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-[#111827] uppercase tracking-wider">
                  Assigned Deliverables ({drillEmployee.tasks.length})
                </h4>
                <div className="divide-y divide-[#E5E5E5] border border-[#E5E5E5] rounded-lg max-h-60 overflow-y-auto">
                  {drillEmployee.tasks.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#595959]">No tasks currently assigned.</div>
                  ) : (
                    drillEmployee.tasks.map((t) => (
                      <div key={t.id} className="p-3 flex items-center justify-between text-xs hover:bg-[#F9FAFB]">
                        <div>
                          <div className="font-bold text-[#111827]">{t.title}</div>
                          <div className="text-[10px] text-[#595959] mt-0.5">
                            {t.project} • Due: {t.dueDate || 'No date'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {renderPriorityBadge(t.priority)}
                          {renderStatusBadge(t.status, t.completed)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E5E5E5] bg-[#F8FAFC] flex justify-end">
              <button
                type="button"
                onClick={() => setDrillEmployee(null)}
                className="px-4 py-1.5 rounded-lg bg-[#F4F6F8] hover:bg-[#E5E5E5] text-xs font-bold text-[#111827] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: DETAILED PROJECT REPORT MODAL
      ======================================================== */}
      {drillProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#E5E5E5] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#049FD9] flex items-center justify-center shrink-0 border border-[#BFDBFE]">
                  <FolderIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#111827]">{drillProject.name}</h3>
                  <div className="text-xs text-[#595959]">
                    Manager: {drillProject.manager} • Deadline: {drillProject.deadline}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrillProject(null)}
                className="w-8 h-8 rounded-lg bg-[#F4F6F8] hover:bg-[#E5E5E5] text-[#595959] hover:text-[#111827] flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Progress Summary Card */}
              <div className="p-4 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#166534]">Overall Project Progress</span>
                  <div className="text-2xl font-black text-[#16A34A]">{drillProject.progressPercentage}%</div>
                </div>
                <div className="text-right text-xs text-[#166534]">
                  <div>{drillProject.completedTasks} of {drillProject.totalEligible} tasks completed</div>
                  <div>Status: <span className="font-bold uppercase">{drillProject.status}</span></div>
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-[#111827] uppercase tracking-wider">
                  Project Tasks ({drillProject.tasks.length})
                </h4>
                <div className="divide-y divide-[#E5E5E5] border border-[#E5E5E5] rounded-lg max-h-60 overflow-y-auto">
                  {drillProject.tasks.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#595959]">No tasks registered in this project.</div>
                  ) : (
                    drillProject.tasks.map((t) => (
                      <div key={t.id} className="p-3 flex items-center justify-between text-xs hover:bg-[#F9FAFB]">
                        <div>
                          <div className="font-bold text-[#111827]">{t.title}</div>
                          <div className="text-[10px] text-[#595959] mt-0.5">
                            Assigned: {t.assignedTo || 'Unassigned'} • Due: {t.dueDate || '—'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {renderPriorityBadge(t.priority)}
                          {renderStatusBadge(t.status, t.completed)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E5E5E5] bg-[#F8FAFC] flex justify-between items-center">
              {onNavigateToProject && (
                <button
                  type="button"
                  onClick={() => {
                    const id = drillProject.id;
                    setDrillProject(null);
                    onNavigateToProject(id);
                  }}
                  className="text-xs font-bold text-[#049FD9] hover:underline"
                >
                  Open in Projects View →
                </button>
              )}
              <button
                type="button"
                onClick={() => setDrillProject(null)}
                className="px-4 py-1.5 rounded-lg bg-[#F4F6F8] hover:bg-[#E5E5E5] text-xs font-bold text-[#111827] transition-colors cursor-pointer ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
