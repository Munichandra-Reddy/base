import { Task, Project, Person } from './types';
import {
  getKolkataTodayString,
  isTaskOverdue,
  isTaskAssignedToEmployee,
} from './dashboardCalculations';

/**
 * BASECAMP / WORKORBIT – PHASE 10: REPORTS AND ANALYTICS ENGINE
 * Pure calculation functions adhering strictly to Phase 10 business logic.
 * Timezone: Asia/Kolkata (+05:30)
 * Uses actual Firestore document records (no dummy/fake data).
 */

// ========================================================
// 1. TIMEZONE & DATE UTILITIES (Asia/Kolkata)
// ========================================================

export const getKolkataDate = (): Date => {
  const dateStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  return new Date(dateStr);
};

export const getDaysOverdue = (dueDateStr?: string): number => {
  if (!dueDateStr) return 0;
  const todayStr = getKolkataTodayString();
  const due = new Date(dueDateStr);
  const today = new Date(todayStr);
  const diffMs = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 1);
};

export const calculateDurationDays = (startDateStr?: string, endDateStr?: string): number => {
  if (!startDateStr || !endDateStr || startDateStr === '—' || endDateStr === '—') return 0;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const diffMs = end.getTime() - start.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(days, 1);
};

// ========================================================
// 2. EMPLOYEE-WISE TASK COMPLETION CALCULATION
// Formula: (Completed Tasks / Total Eligible Tasks) * 100
// - Count only tasks assigned to that employee
// - Exclude cancelled tasks from denominator
// - Only approved completed tasks count as completed
// - Avoid counting the same task multiple times
// - Handle zero assigned tasks without division errors (0%)
// ========================================================

export interface EmployeeCompletionReport {
  employee: Person;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  totalAssigned: number;
  totalEligible: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  inReviewTasks: number;
  overdueTasks: number;
  completionPercentage: number;
  tasks: Task[];
}

export const calculateEmployeeCompletionReport = (
  employee: Person,
  tasks: Task[]
): EmployeeCompletionReport => {
  // Deduplicate matched tasks by task.id
  const seenTaskIds = new Set<string>();
  const empTasks: Task[] = [];

  for (const t of tasks) {
    if (!t || !t.id || seenTaskIds.has(t.id)) continue;
    if (isTaskAssignedToEmployee(t, employee)) {
      seenTaskIds.add(t.id);
      empTasks.push(t);
    }
  }

  const totalAssigned = empTasks.length;
  // Exclude cancelled tasks from denominator
  const eligibleTasks = empTasks.filter((t) => t.status !== 'cancelled');
  const totalEligible = eligibleTasks.length;

  // Only approved completed tasks count as completed
  const completedTasks = eligibleTasks.filter(
    (t) => (t.status === 'completed' || t.completed) && t.status !== 'cancelled'
  ).length;

  const inProgressTasks = eligibleTasks.filter((t) => t.status === 'in_progress').length;
  const inReviewTasks = eligibleTasks.filter((t) => t.status === 'in_review').length;
  const pendingTasks = eligibleTasks.filter(
    (t) => (!t.status || t.status === 'pending') && !t.completed
  ).length;

  const overdueTasks = eligibleTasks.filter((t) => isTaskOverdue(t)).length;

  const completionPercentage =
    totalEligible > 0 ? Math.round((completedTasks / totalEligible) * 100) : 0;

  return {
    employee,
    employeeId: employee.employeeId || employee.id || 'EMP-1000',
    name: employee.name,
    email: employee.email,
    department: employee.department || 'General',
    designation: employee.role || employee.designation || 'Team Member',
    totalAssigned,
    totalEligible,
    completedTasks,
    pendingTasks,
    inProgressTasks,
    inReviewTasks,
    overdueTasks,
    completionPercentage,
    tasks: empTasks,
  };
};

// ========================================================
// 3. PROJECT-WISE PROGRESS REPORT CALCULATION
// Formula: Project Progress = (Completed Eligible Tasks / Total Eligible Tasks) * 100
// - Exclude cancelled tasks from denominator
// - Only approved completed tasks count as completed
// - Show 0% when no eligible tasks
// ========================================================

export interface ProjectProgressReport {
  project: Project;
  id: string;
  name: string;
  manager: string;
  managerEmail?: string;
  membersCount: number;
  startDate: string;
  deadline: string;
  status: string;
  totalTasks: number;
  totalEligible: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  inReviewTasks: number;
  overdueTasks: number;
  progressPercentage: number;
  tasks: Task[];
}

export const calculateProjectProgressReport = (
  project: Project,
  tasks: Task[]
): ProjectProgressReport => {
  const seenTaskIds = new Set<string>();
  const projectTasks: Task[] = [];

  const projId = project.id;
  const projName = (project.name || '').toLowerCase().trim();

  for (const t of tasks) {
    if (!t || !t.id || seenTaskIds.has(t.id)) continue;
    const taskProjId = t.projectId;
    const taskProjName = (t.project || '').toLowerCase().trim();

    const matchesId = projId && taskProjId && taskProjId === projId;
    const matchesName = projName && taskProjName && taskProjName === projName;

    if (matchesId || matchesName) {
      seenTaskIds.add(t.id);
      projectTasks.push(t);
    }
  }

  const totalTasks = projectTasks.length;
  const eligibleTasks = projectTasks.filter((t) => t.status !== 'cancelled');
  const totalEligible = eligibleTasks.length;

  const completedTasks = eligibleTasks.filter(
    (t) => (t.status === 'completed' || t.completed) && t.status !== 'cancelled'
  ).length;

  const inProgressTasks = eligibleTasks.filter((t) => t.status === 'in_progress').length;
  const inReviewTasks = eligibleTasks.filter((t) => t.status === 'in_review').length;
  const pendingTasks = eligibleTasks.filter(
    (t) => (!t.status || t.status === 'pending') && !t.completed
  ).length;

  const overdueTasks = eligibleTasks.filter((t) => isTaskOverdue(t)).length;

  const progressPercentage =
    totalEligible > 0 ? Math.round((completedTasks / totalEligible) * 100) : 0;

  const manager = project.manager || project.managerEmail || 'Unassigned';
  const startDate = project.startDate || (project.createdAt ? project.createdAt.split('T')[0] : '—');
  const deadline = project.deadline || project.endDate || '—';

  return {
    project,
    id: project.id,
    name: project.name,
    manager,
    managerEmail: project.managerEmail,
    membersCount: Array.isArray(project.members) ? project.members.length : 0,
    startDate,
    deadline,
    status: project.status || 'active',
    totalTasks,
    totalEligible,
    completedTasks,
    pendingTasks,
    inProgressTasks,
    inReviewTasks,
    overdueTasks,
    progressPercentage,
    tasks: projectTasks,
  };
};

// ========================================================
// 4. MONTHLY PRODUCTIVITY CALCULATION
// - Uses actual task creation, assignment, and completion timestamps
// - Generates monthly performance metrics and historical trend
// ========================================================

export interface MonthlyProductivityData {
  monthKey: string; // e.g. "2026-10"
  monthLabel: string; // e.g. "October 2026"
  tasksAssigned: number;
  tasksCompleted: number;
  tasksPending: number;
  tasksOverdue: number;
  completionPercentage: number;
  employeeCompletion: { employeeName: string; completedCount: number }[];
  projectCompletion: { projectName: string; completedCount: number }[];
  historicalTrend: { monthKey: string; monthLabel: string; assigned: number; completed: number; rate: number }[];
}

export const calculateMonthlyProductivity = (
  tasks: Task[],
  selectedMonthKey: string // YYYY-MM
): MonthlyProductivityData => {
  const getTaskCreationMonth = (t: Task): string => {
    if (t.createdAt) {
      return t.createdAt.substring(0, 7);
    }
    if (t.startDate) {
      return t.startDate.substring(0, 7);
    }
    return '2026-10'; // Default fallback
  };

  const getTaskCompletionMonth = (t: Task): string | null => {
    if (!t.completed && t.status !== 'completed') return null;
    if (t.completedAt) {
      return t.completedAt.substring(0, 7);
    }
    // Check activities for review_approved or task_completed
    if (Array.isArray(t.activities)) {
      const act = t.activities.find(
        (a) => a.activityType === 'review_approved' || a.activityType === 'task_completed'
      );
      if (act && act.timestamp) {
        return act.timestamp.substring(0, 7);
      }
    }
    if (t.updatedAt) {
      return t.updatedAt.substring(0, 7);
    }
    if (t.dueDate) {
      return t.dueDate.substring(0, 7);
    }
    return '2026-10';
  };

  // Assigned during selected month
  const assignedInMonth = tasks.filter((t) => getTaskCreationMonth(t) === selectedMonthKey);

  // Completed during selected month
  const completedInMonth = tasks.filter((t) => getTaskCompletionMonth(t) === selectedMonthKey);

  // Pending during selected month
  const pendingInMonth = tasks.filter((t) => {
    const createdMonth = getTaskCreationMonth(t);
    const compMonth = getTaskCompletionMonth(t);
    const isPendingNow = t.status !== 'completed' && !t.completed && t.status !== 'cancelled';
    return (createdMonth <= selectedMonthKey && (!compMonth || compMonth > selectedMonthKey)) || (createdMonth === selectedMonthKey && isPendingNow);
  });

  // Overdue in selected month
  const overdueInMonth = tasks.filter((t) => {
    if (t.status === 'completed' || t.status === 'cancelled' || t.completed) return false;
    return t.dueDate && t.dueDate.startsWith(selectedMonthKey) && isTaskOverdue(t);
  });

  const completionPercentage =
    assignedInMonth.length > 0
      ? Math.round((completedInMonth.length / assignedInMonth.length) * 100)
      : completedInMonth.length > 0
      ? 100
      : 0;

  // Employee-wise completion count
  const empCompletionMap: Record<string, number> = {};
  for (const t of completedInMonth) {
    const empName = t.assignedTo || 'Unassigned';
    empCompletionMap[empName] = (empCompletionMap[empName] || 0) + 1;
  }
  const employeeCompletion = Object.entries(empCompletionMap)
    .map(([employeeName, completedCount]) => ({ employeeName, completedCount }))
    .sort((a, b) => b.completedCount - a.completedCount);

  // Project-wise completion count
  const projCompletionMap: Record<string, number> = {};
  for (const t of completedInMonth) {
    const projName = t.project || 'General';
    projCompletionMap[projName] = (projCompletionMap[projName] || 0) + 1;
  }
  const projectCompletion = Object.entries(projCompletionMap)
    .map(([projectName, completedCount]) => ({ projectName, completedCount }))
    .sort((a, b) => b.completedCount - a.completedCount);

  // Historical 6-Month Trend series up to selected month
  const trend: { monthKey: string; monthLabel: string; assigned: number; completed: number; rate: number }[] = [];
  const [yearStr, monthNumStr] = selectedMonthKey.split('-');
  let currentYear = parseInt(yearStr, 10) || 2026;
  let currentMonth = parseInt(monthNumStr, 10) || 10;

  for (let i = 5; i >= 0; i--) {
    let y = currentYear;
    let m = currentMonth - i;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    const mKey = `${y}-${String(m).padStart(2, '0')}`;
    const dateObj = new Date(y, m - 1, 1);
    const mLabel = dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' });

    const mAssigned = tasks.filter((t) => getTaskCreationMonth(t) === mKey).length;
    const mCompleted = tasks.filter((t) => getTaskCompletionMonth(t) === mKey).length;
    const mRate = mAssigned > 0 ? Math.round((mCompleted / mAssigned) * 100) : mCompleted > 0 ? 100 : 0;

    trend.push({
      monthKey: mKey,
      monthLabel: mLabel,
      assigned: mAssigned,
      completed: mCompleted,
      rate: mRate,
    });
  }

  const selectedDate = new Date(currentYear, currentMonth - 1, 1);
  const monthLabel = selectedDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return {
    monthKey: selectedMonthKey,
    monthLabel,
    tasksAssigned: assignedInMonth.length,
    tasksCompleted: completedInMonth.length,
    tasksPending: pendingInMonth.length,
    tasksOverdue: overdueInMonth.length,
    completionPercentage,
    employeeCompletion,
    projectCompletion,
    historicalTrend: trend,
  };
};

// ========================================================
// 5. EMPLOYEE WORKLOAD CALCULATION
// - Actual active task assignments (pending, in_progress, in_review)
// - Excludes completed and cancelled tasks
// - Categorizes workload status objectively
// ========================================================

export type WorkloadStatus = 'heavy' | 'balanced' | 'light';

export interface EmployeeWorkloadItem {
  employee: Person;
  employeeId: string;
  name: string;
  department: string;
  designation: string;
  activeTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  inReviewTasks: number;
  overdueTasks: number;
  highPriorityTasks: number;
  workloadStatus: WorkloadStatus;
  workloadLabel: string;
}

export interface DepartmentWorkloadSummary {
  department: string;
  employeeCount: number;
  activeTasksCount: number;
  overdueCount: number;
  highPriorityCount: number;
}

export const calculateEmployeeWorkloadReport = (
  employees: Person[],
  tasks: Task[]
): {
  items: EmployeeWorkloadItem[];
  departmentSummaries: DepartmentWorkloadSummary[];
  heavyCount: number;
  balancedCount: number;
  lightCount: number;
  totalActiveTasks: number;
} => {
  const items: EmployeeWorkloadItem[] = employees.map((emp) => {
    const rep = calculateEmployeeCompletionReport(emp, tasks);
    const activeTasks = rep.pendingTasks + rep.inProgressTasks + rep.inReviewTasks;
    
    // High priority tasks
    const highPriorityTasks = rep.tasks.filter((t) => {
      const p = String(t.priority || '').toLowerCase();
      const isActive = t.status !== 'completed' && !t.completed && t.status !== 'cancelled';
      return isActive && (p === 'high' || p === 'critical');
    }).length;

    let workloadStatus: WorkloadStatus = 'balanced';
    let workloadLabel = 'Balanced Workload';

    if (activeTasks > 5) {
      workloadStatus = 'heavy';
      workloadLabel = 'High Active Workload';
    } else if (activeTasks < 2) {
      workloadStatus = 'light';
      workloadLabel = 'Available / Light';
    }

    return {
      employee: emp,
      employeeId: rep.employeeId,
      name: emp.name,
      department: rep.department,
      designation: rep.designation,
      activeTasks,
      pendingTasks: rep.pendingTasks,
      inProgressTasks: rep.inProgressTasks,
      inReviewTasks: rep.inReviewTasks,
      overdueTasks: rep.overdueTasks,
      highPriorityTasks,
      workloadStatus,
      workloadLabel,
    };
  });

  // Department Summaries
  const deptMap: Record<string, { employeeCount: number; activeTasksCount: number; overdueCount: number; highPriorityCount: number }> = {};

  for (const item of items) {
    const dept = item.department || 'General';
    if (!deptMap[dept]) {
      deptMap[dept] = { employeeCount: 0, activeTasksCount: 0, overdueCount: 0, highPriorityCount: 0 };
    }
    deptMap[dept].employeeCount += 1;
    deptMap[dept].activeTasksCount += item.activeTasks;
    deptMap[dept].overdueCount += item.overdueTasks;
    deptMap[dept].highPriorityCount += item.highPriorityTasks;
  }

  const departmentSummaries: DepartmentWorkloadSummary[] = Object.entries(deptMap).map(
    ([department, stats]) => ({
      department,
      ...stats,
    })
  );

  const heavyCount = items.filter((i) => i.workloadStatus === 'heavy').length;
  const balancedCount = items.filter((i) => i.workloadStatus === 'balanced').length;
  const lightCount = items.filter((i) => i.workloadStatus === 'light').length;
  const totalActiveTasks = items.reduce((sum, i) => sum + i.activeTasks, 0);

  return {
    items,
    departmentSummaries,
    heavyCount,
    balancedCount,
    lightCount,
    totalActiveTasks,
  };
};

// ========================================================
// 6. PROJECT COMPLETION HISTORY CALCULATION
// - Preserves historical completion info
// - Calculates project duration and task final completion %
// ========================================================

export interface ProjectHistoryItem {
  project: Project;
  id: string;
  name: string;
  manager: string;
  startDate: string;
  plannedCompletionDate: string;
  actualCompletionDate: string;
  durationDays: number;
  finalProgress: number;
  status: string;
  totalTasks: number;
  completedTasks: number;
}

export const calculateProjectCompletionHistory = (
  projects: Project[],
  tasks: Task[]
): ProjectHistoryItem[] => {
  return projects.map((proj) => {
    const rep = calculateProjectProgressReport(proj, tasks);
    const startDate = proj.startDate || (proj.createdAt ? proj.createdAt.split('T')[0] : '—');
    const plannedCompletionDate = proj.deadline || proj.endDate || '—';

    let actualCompletionDate = '—';
    if (proj.status === 'completed') {
      actualCompletionDate = proj.updatedAt ? proj.updatedAt.split('T')[0] : plannedCompletionDate !== '—' ? plannedCompletionDate : getKolkataTodayString();
    }

    const durationDays = calculateDurationDays(
      startDate,
      actualCompletionDate !== '—' ? actualCompletionDate : plannedCompletionDate
    );

    return {
      project: proj,
      id: proj.id,
      name: proj.name,
      manager: rep.manager,
      startDate,
      plannedCompletionDate,
      actualCompletionDate,
      durationDays,
      finalProgress: rep.progressPercentage,
      status: proj.status || 'active',
      totalTasks: rep.totalEligible,
      completedTasks: rep.completedTasks,
    };
  });
};
