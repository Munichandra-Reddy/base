import { Task, Project, Activity, ChatMessage, Person, CheckIn, FileItem, WorkspaceStats } from './types';

export const initialStats: WorkspaceStats = {
  projectsTotal: 0,
  projectsActive: 0,
  todosTotal: 0,
  todosInProgress: 0,
  dueSoon: 0,
  teamOnline: 0,
  storageUsedGB: 0,
  storageTotalGB: 10,
};

// No hardcoded tasks - tasks are created by Admin/Mentors and assigned to real employees
export const initialTasks: Task[] = [];

// No hardcoded activities - populated from live database actions
export const initialActivities: Activity[] = [];

// No hardcoded projects - projects are created dynamically by Admin
export const initialProjects: Project[] = [];

// No hardcoded chat messages - synced live via Firebase Campfire
export const initialChatMessages: ChatMessage[] = [];

// Real registered employees only
export const initialPeople: Person[] = [];

// Real checkins only
export const initialCheckIns: CheckIn[] = [];

// Real user files only
export const initialFiles: FileItem[] = [];
