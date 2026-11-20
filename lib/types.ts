export interface Task {
  id: string;
  title: string;
  project: string;
  completed: boolean;
  dueDate?: string;
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high';
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed';
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ProjectMember {
  id?: string;
  employeeId?: string;
  name: string;
  email: string;
  designation?: string;
  department?: string;
  role?: 'manager' | 'member';
  avatar?: string;
  avatarBg?: string;
  addedAt?: string;
}

export interface Project {
  id: string;
  projectId?: string;
  name: string;
  status: ProjectStatus | string;
  progress: number;
  openToDos?: number;
  members: string[];
  memberDetails?: ProjectMember[];
  description: string;
  updatedAt: string;
  startDate?: string;
  endDate?: string;
  deadline?: string;
  category?: string;
  currency?: string;
  priority?: ProjectPriority | string;
  manager?: string;
  managerEmail?: string;
  managerId?: string;
  notes?: string;
  attachments?: string[];
  requiredDocuments?: string[];
  createdAt?: string;
  archived?: boolean;
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

export type EmployeeStatus = 'invited' | 'active' | 'inactive' | 'suspended' | 'away' | 'offline';
export type AccessRole = 'admin' | 'employee';

export interface Person {
  id: string;
  employeeId?: string;
  name: string;
  role: string; // Designation / Job title
  designation?: string;
  accessRole?: AccessRole;
  department?: string;
  phone?: string;
  joiningDate?: string;
  email: string;
  status: EmployeeStatus;
  avatar: string;
  avatarBg: string;
  projectsCount: number;
  createdAt?: string;
  invitedAt?: string;
  activatedAt?: string;
}

export interface InvitationRecord {
  token: string;
  email: string;
  employeeId: string;
  fullName: string;
  accessRole: AccessRole;
  designation: string;
  department: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  usedAt?: number;
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
  createdAt?: number;
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

export interface DepartmentRecord {
  id: string;
  name: string;
  description?: string;
  employeeCount?: number;
  createdAt?: string;
}

export interface DesignationRecord {
  id: string;
  name: string;
  departmentId?: string;
  department?: string;
  createdAt?: string;
}

export interface EmployeeActivityLog {
  id: string;
  employeeId?: string;
  employeeEmail?: string;
  employeeName?: string;
  type:
    | 'account_created'
    | 'invitation_sent'
    | 'invitation_resent'
    | 'activated'
    | 'deactivated'
    | 'reactivated'
    | 'profile_updated'
    | 'department_changed'
    | 'designation_changed'
    | 'role_changed'
    | 'project_assigned'
    | 'project_removed'
    | 'task_assigned'
    | 'task_completed';
  description: string;
  performedBy: string;
  timestamp: string;
  createdAt: number;
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

