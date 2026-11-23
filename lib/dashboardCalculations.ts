import { Task, Project, Person } from './types';

/**
 * BASECAMP / WORKORBIT – PHASE 5: REAL-TIME DASHBOARD CALCULATIONS
 * Timezone: Asia/Kolkata (+05:30)
 * All metrics derived directly from actual Firestore records.
 */

// 1. ASIA/KOLKATA TIMEZONE HELPERS
export const getKolkataTodayString = (): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

export const getKolkataDateWithOffset = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

// 2. TASK OVERDUE AND DUE SOON CALCULATIONS
export const isTaskOverdue = (task: Task): boolean => {
  if (!task || task.completed || task.status === 'completed' || task.status === 'cancelled') {
    return false;
  }
  if (!task.dueDate) return false;
  const today = getKolkataTodayString();
  return task.dueDate < today;
};

export const isTaskDueSoon = (task: Task): boolean => {
  if (!task || task.completed || task.status === 'completed' || task.status === 'cancelled') {
    return false;
  }
  if (!task.dueDate) return false;
  const today = getKolkataTodayString();
  const next7Days = getKolkataDateWithOffset(7);
  return task.dueDate >= today && task.dueDate <= next7Days;
};

// 3. EMPLOYEE TASK MATCHING (ROLE-BASED PERMISSIONS)
export const isTaskAssignedToEmployee = (
  task: Task,
  employee?: { email?: string; fullName?: string; id?: string; employeeId?: string } | null
): boolean => {
  if (!task || !employee) return false;
  const empEmail = (employee.email || '').toLowerCase().trim();
  const empName = (employee.fullName || '').toLowerCase().trim();
  const empId = employee.id || employee.employeeId;

  if (task.assignedToEmail && empEmail && task.assignedToEmail.toLowerCase().trim() === empEmail) {
    return true;
  }

  if (task.assignedToId && empId && task.assignedToId === empId) {
    return true;
  }

  if (task.assignedTo) {
    const assigned = task.assignedTo.toLowerCase().trim();
    if (assigned === 'you') return true;
    if (empName && (assigned === empName || assigned.includes(empName) || empName.includes(assigned))) {
      return true;
    }
  }

  return false;
};

// 4. PROJECT PARTICIPATION MATCHING
export const isEmployeeInProject = (
  project: Project,
  employee?: { email?: string; fullName?: string; id?: string } | null,
  employeeTasks: Task[] = []
): boolean => {
  if (!project || !employee) return false;
  const empEmail = (employee.email || '').toLowerCase().trim();
  const empName = (employee.fullName || '').toLowerCase().trim();

  // Check project member details
  if (Array.isArray(project.memberDetails)) {
    if (
      project.memberDetails.some(
        (m) =>
          (m.email && m.email.toLowerCase().trim() === empEmail) ||
          (m.name && m.name.toLowerCase().trim() === empName)
      )
    ) {
      return true;
    }
  }

  // Check project members array (strings)
  if (Array.isArray(project.members)) {
    if (
      project.members.some(
        (m) =>
          (empName && (m.toLowerCase().trim() === empName || m.toLowerCase().includes(empName))) ||
          (empEmail && m.toLowerCase().trim() === empEmail)
      )
    ) {
      return true;
    }
  }

  // Check if employee has tasks in this project
  if (
    employeeTasks.some(
      (t) =>
        t.projectId === project.id ||
        (t.project && t.project.toLowerCase().trim() === project.name.toLowerCase().trim())
    )
  ) {
    return true;
  }

  return false;
};

// 5. PROJECT PROGRESS CALCULATION FORMULA
// Formula: Project Progress = (Completed Tasks / Total Eligible Project Tasks) * 100
// Completed tasks: Admin-approved only (completed === true || status === 'completed')
// Cancelled tasks: Excluded from both numerator and denominator
// If 0 eligible tasks: 0% (avoids division by zero)
export interface ProjectCalculationResult {
  totalEligible: number;
  completed: number;
  inProgress: number;
  pending: number;
  inReview: number;
  changesRequested: number;
  progress: number;
}

export const calculateProjectProgress = (
  tasks: Task[],
  projectId?: string,
  projectName?: string
): ProjectCalculationResult => {
  const projectTasks = tasks.filter((t) => {
    if (t.status === 'cancelled') return false; // Exclude cancelled
    if (projectId && t.projectId && t.projectId === projectId) return true;
    if (projectName && t.project && t.project.toLowerCase().trim() === projectName.toLowerCase().trim()) {
      return true;
    }
    if (projectId && (!t.projectId || t.projectId === '') && projectName && t.project) {
      return t.project.toLowerCase().trim() === projectName.toLowerCase().trim();
    }
    return false;
  });

  const totalEligible = projectTasks.length;
  const completed = projectTasks.filter((t) => t.completed || t.status === 'completed').length;
  const inProgress = projectTasks.filter((t) => t.status === 'in_progress').length;
  const inReview = projectTasks.filter((t) => t.status === 'in_review').length;
  const changesRequested = projectTasks.filter((t) => t.status === 'changes_requested').length;
  const pending = projectTasks.filter(
    (t) => (t.status || 'pending') === 'pending' && !t.completed && t.status !== 'completed'
  ).length;

  const progress = totalEligible > 0 ? Math.round((completed / totalEligible) * 100) : 0;

  return {
    totalEligible,
    completed,
    inProgress,
    pending,
    inReview,
    changesRequested,
    progress,
  };
};

// Overall progress across all projects (Admin Workspace Level)
export const calculateOverallProgress = (
  tasks: Task[]
): {
  totalEligible: number;
  completed: number;
  inProgress: number;
  pending: number;
  inReview: number;
  changesRequested: number;
  overallProgress: number;
} => {
  const eligibleTasks = tasks.filter((t) => t.status !== 'cancelled');
  const totalEligible = eligibleTasks.length;
  const completed = eligibleTasks.filter((t) => t.completed || t.status === 'completed').length;
  const inProgress = eligibleTasks.filter((t) => t.status === 'in_progress').length;
  const inReview = eligibleTasks.filter((t) => t.status === 'in_review').length;
  const changesRequested = eligibleTasks.filter((t) => t.status === 'changes_requested').length;
  const pending = eligibleTasks.filter(
    (t) => (t.status || 'pending') === 'pending' && !t.completed && t.status !== 'completed'
  ).length;

  const overallProgress = totalEligible > 0 ? Math.round((completed / totalEligible) * 100) : 0;

  return {
    totalEligible,
    completed,
    inProgress,
    pending,
    inReview,
    changesRequested,
    overallProgress,
  };
};

// 6. ONLINE PRESENCE TRACKING (5-MINUTE THRESHOLD)
export const isPersonOnline = (person: Person, thresholdMs: number = 5 * 60 * 1000): boolean => {
  if (!person) return false;
  if (person.status && person.status !== 'active') return false; // Exclude suspended / deactivated
  if (!person.lastSeenAt) return false;

  const time =
    typeof person.lastSeenAt === 'number'
      ? person.lastSeenAt
      : new Date(person.lastSeenAt).getTime();

  if (isNaN(time)) return false;
  return Date.now() - time <= thresholdMs;
};

// 7. UPCOMING DEADLINE FORMATTER
export interface UpcomingDeadlineItem {
  id: string;
  title: string;
  project: string;
  projectId?: string;
  assignedTo: string;
  dueDate: string;
  priority: string;
  status: string;
  dayNum: string;
  monthStr: string;
  remainingText: string;
  isOverdue: boolean;
  isDueSoon: boolean;
  daysDiff: number;
}

export const formatUpcomingDeadlines = (
  tasks: Task[],
  limit = 5
): UpcomingDeadlineItem[] => {
  const todayStr = getKolkataTodayString();
  const todayDate = new Date(`${todayStr}T00:00:00`);

  // Incomplete & non-cancelled tasks with a due date
  const eligible = tasks.filter(
    (t) => !t.completed && t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate
  );

  // Sort ascending by due date (earliest / most overdue first)
  const sorted = [...eligible].sort((a, b) => {
    return (a.dueDate || '').localeCompare(b.dueDate || '');
  });

  return sorted.slice(0, limit).map((t) => {
    const dStr = t.dueDate || todayStr;
    const taskDate = new Date(`${dStr}T00:00:00`);
    const diffTime = taskDate.getTime() - todayDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    let remainingText = '';
    let isOverdue = false;
    let isDueSoon = false;

    if (diffDays < 0) {
      remainingText = 'Overdue';
      isOverdue = true;
    } else if (diffDays === 0) {
      remainingText = 'Due Today';
      isDueSoon = true;
    } else if (diffDays === 1) {
      remainingText = 'Tomorrow';
      isDueSoon = true;
    } else if (diffDays <= 7) {
      remainingText = `${diffDays} days left`;
      isDueSoon = true;
    } else {
      remainingText = `${diffDays} days left`;
    }

    const dayNum = String(taskDate.getDate()).padStart(2, '0');
    const monthStr = taskDate
      .toLocaleString('en-US', { month: 'short', timeZone: 'Asia/Kolkata' })
      .toUpperCase();

    return {
      id: t.id,
      title: t.title,
      project: t.project,
      projectId: t.projectId,
      assignedTo: t.assignedTo || 'Unassigned',
      dueDate: dStr,
      priority: t.priority || 'medium',
      status: t.status || 'pending',
      dayNum,
      monthStr,
      remainingText,
      isOverdue,
      isDueSoon,
      daysDiff: diffDays,
    };
  });
};
