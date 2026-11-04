export interface Task {
  id: string;
  title: string;
  project: string;
  completed: boolean;
  dueDate?: string;
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high';
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'on_hold' | string;
  progress: number;
  openToDos: number;
  members: string[];
  description: string;
  updatedAt: string;
  startDate?: string;
  deadline?: string;
  currency?: string;
  priority?: 'high' | 'medium' | 'low';
  manager?: string;
  requiredDocuments?: string[];
}

export interface Activity {
  id: string;
  userName: string;
  userAvatar: string;
  avatarBg: string;
  action: string;
  target: string;
  timeAgo: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  senderAvatar: string;
  avatarBg: string;
  content: string;
  timestamp: string;
  channel: string;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  email: string;
  status: 'active' | 'away' | 'offline';
  avatar: string;
  avatarBg: string;
  projectsCount: number;
}

export interface CheckIn {
  id: string;
  question: string;
  author: string;
  authorAvatar: string;
  avatarBg: string;
  answer: string;
  timeAgo: string;
  responsesCount: number;
}

export interface FileItem {
  id: string;
  name: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  type: 'pdf' | 'image' | 'code' | 'document' | 'zip';
  project: string;
  fileUrl?: string;
}

export interface WorkspaceStats {
  projectsTotal: number;
  projectsActive: number;
  todosTotal: number;
  todosInProgress: number;
  dueSoon: number;
  teamOnline: number;
  storageUsedGB: number;
  storageTotalGB: number;
}

export type WhatsAppConnectionStatus = 'connected' | 'demo' | 'disconnected' | 'error';

export interface WhatsAppPreferences {
  taskAssignments: boolean;
  upcomingDeadlines: boolean;
  overdueTasks: boolean;
  projectUpdates: boolean;
  optInConfirmed: boolean;
  recipientPhone: string;
  selectedProjects: string[];
}

export interface WhatsAppConfig {
  status: WhatsAppConnectionStatus;
  isDemoMode: boolean;
  phoneNumberId?: string;
  businessAccountId?: string;
  displayPhoneNumber?: string;
  webhookUrl: string;
  webhookVerified: boolean;
  webhookVerifyToken: string;
  preferences: WhatsAppPreferences;
  lastConnectedAt?: string;
}

export interface WhatsAppMessageLog {
  id: string;
  wamid?: string;
  recipientPhone: string;
  eventType: 'task_assignment' | 'upcoming_deadline' | 'overdue_task' | 'project_update' | 'test_message';
  templateName: string;
  content: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'simulated';
  timestamp: string;
  errorMessage?: string;
  isDemo: boolean;
  metadata?: Record<string, any>;
}

