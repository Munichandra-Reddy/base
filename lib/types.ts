export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'in_review'
  | 'changes_requested'
  | 'completed'
  | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TaskAttachment {
  id: string;
  fileName: string;
  storagePath: string;
  fileType: string;
  fileSize: string;
  fileUrl?: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userRole: string;
  userAvatar?: string;
  avatarBg?: string;
  message: string;
  createdAt: string;
}

export interface TaskSubmission {
  id: string;
  submittedBy: string;
  submittedByName: string;
  summary: string;
  comment?: string;
  progress: number;
  attachmentIds?: string[];
  attachments?: TaskAttachment[];
  submittedAt: string;
  reviewStatus: 'pending' | 'approved' | 'changes_requested';
  reviewerId?: string;
  reviewerName?: string;
  reviewComment?: string;
  reviewedAt?: string;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  projectId?: string;
  performedBy: string;
  performedByName: string;
  activityType:
    | 'task_created'
    | 'task_assigned'
    | 'task_reassigned'
    | 'task_started'
    | 'progress_updated'
    | 'comment_added'
    | 'file_uploaded'
    | 'submitted_for_review'
    | 'review_approved'
    | 'changes_requested'
    | 'task_completed'
    | 'due_date_changed'
    | 'priority_changed'
    | 'task_cancelled'
    | 'task_edited';
  description: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
}

export type NotificationType =
  // Task events
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'task_approved'
  | 'changes_requested'
  | 'task_reassigned'
  // Project events
  | 'project_added'
  | 'project_updated'
  | 'project_deadline'
  // Chat events
  | 'chat_direct'
  | 'chat_group'
  | 'chat_project'
  // Calendar events
  | 'meeting_invite'
  | 'meeting_reminder'
  | 'meeting_updated'
  | 'meeting_cancelled'
  // File events
  | 'file_uploaded'
  | 'file_shared'
  // General / System
  | 'system';

export interface BasecampNotification {
  id: string;
  notificationId?: string;
  recipientUid: string;
  recipientEmail: string;
  actorUid?: string;
  actorName?: string;
  actorAvatar?: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: 'task' | 'project' | 'chat' | 'calendar' | 'file';
  relatedEntityId?: string;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
  conversationId?: string;
  conversationName?: string;
  eventId?: string;
  fileId?: string;
  fileName?: string;
  isRead: boolean;
  readAt?: number;
  createdAt: number;
  timestampStr?: string;
  deduplicationKey?: string;
  status?: 'active' | 'deleted';
  actionUrl?: string;
}

export type NotificationItem = BasecampNotification;

export interface TaskNotification {
  id: string;
  recipientUid: string;
  taskId: string;
  projectId?: string;
  notificationType: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export type WorkStream = 'ui_ux' | 'frontend' | 'backend' | 'database_cloud' | string;

export interface Task {
  id: string;
  taskId?: string; // TSK-XXXX
  title: string;
  description?: string;
  project: string; // Project Name (backwards-compatible)
  projectId?: string; // Project document ID
  completed: boolean; // Backwards-compatible (true if status === 'completed')
  status?: TaskStatus;
  priority?: TaskPriority | string;
  assignedTo?: string; // Full Name
  assignedToId?: string; // Firebase UID / Employee ID
  assignedToEmail?: string;
  assignedToRole?: string;
  assignedToDept?: string;
  assignedBy?: string; // Admin UID or Name
  assignedByName?: string;
  startDate?: string;
  dueDate?: string;
  progress?: number; // 0-100
  instructions?: string; // Employee-facing instructions
  adminNotes?: string; // Internal Admin notes (hidden from employees)
  stream?: WorkStream; // 'ui_ux' | 'frontend' | 'backend' | 'database_cloud'
  streamName?: string; // e.g. "UI/UX [Brand Kit]", "Frontend", "Backend", "Database Cloud"
  sprintWeek?: string; // e.g. "Sprint 1 (Week 1)"
  weekendMeetingReview?: boolean;
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
  submissions?: TaskSubmission[];
  activities?: TaskActivity[];
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string;
  submittedAt?: string;
  completedAt?: string;
}

export const isTaskOverdue = (task: Task): boolean => {
  if (task.status === 'completed' || task.status === 'cancelled' || task.completed) return false;
  if (!task.dueDate) return false;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return task.dueDate < today;
};

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

export interface ProjectLearningPlan {
  teamName?: string; // e.g. "Kaling"
  projectType?: 'website' | 'app' | string; // Software Development (Website) or App
  mentorName?: string; // Admin acts as Project Mentor
  mentorEmail?: string;
  scopeOfDocument?: {
    submitted: boolean;
    submittedBy?: string;
    submittedByName?: string;
    submittedAt?: string;
    objectives?: string;
    deliverables?: string;
    proposedTechStack?: string;
    documentUrl?: string;
    content?: string;
    status: 'pending' | 'submitted' | 'approved' | 'revisions_requested';
    mentorFeedback?: string;
    reviewedAt?: string;
  };
  techStackLocked: boolean;
  techStack?: {
    uiUx?: string; // e.g. Brand Kit, Figma
    frontend?: string; // e.g. React.js
    backend?: string; // e.g. Node.js / APIs
    databaseCloud?: string; // e.g. PostgreSQL / Firebase Cloud
    database?: string;
    notes?: string;
  };
  workDivisionStatus?: 'pending' | 'in_progress' | 'completed';
  currentSprint?: string; // e.g. "Sprint 1 (Week 1)"
  weekendMeeting?: {
    scheduledDate?: string;
    agenda?: string;
    meetingNotes?: string;
    link?: string;
    status?: 'scheduled' | 'completed' | 'rescheduled';
  };
  stage?: 'scope_pending' | 'scope_submitted' | 'tech_stack_locked' | 'development_sprints' | 'testing' | 'final_report' | 'live';
  testingReport?: {
    status?: 'pending' | 'in_progress' | 'passed';
    testCasesCount?: number;
    notes?: string;
  };
  finalDocumentReport?: {
    submitted?: boolean;
    reportUrl?: string;
    summary?: string;
  };
  liveUrl?: string;
  resources?: { title: string; url: string; type?: string }[];
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
  // Project Based Learning Fields
  teamName?: string; // Team/Group Name e.g. "Kaling"
  projectType?: 'website' | 'app' | string;
  mentorName?: string; // Admin acts as Mentor
  mentorEmail?: string;
  learningPlan?: ProjectLearningPlan;
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

export type ConversationType = 'direct' | 'group' | 'project';

export interface ChatAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  storagePath?: string;
  fileType: 'image' | 'pdf' | 'doc' | 'sheet' | 'archive' | 'file';
  fileSize: string;
  bytes?: number;
}

export interface CampfireMessage {
  id: string;
  conversationId: string;
  senderUid: string;
  senderName: string;
  senderEmail: string;
  senderAvatar?: string;
  senderAvatarBg?: string;
  messageType: 'text' | 'file' | 'image';
  text: string;
  attachments?: ChatAttachment[];
  createdAt: number;
  timestampStr?: string;
  dateStr?: string;
  readBy?: string[];
  status?: 'sent' | 'delivered' | 'read';
  failed?: boolean;
}

export interface ConversationParticipant {
  uid: string;
  name: string;
  email: string;
  avatar?: string;
  avatarBg?: string;
  role?: string;
  designation?: string;
  isOnline?: boolean;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string;
  description?: string;
  projectId?: string;
  projectName?: string;
  memberUids: string[];
  memberDetails?: Record<string, ConversationParticipant>;
  createdBy: string;
  createdByName?: string;
  createdAt: number;
  updatedAt: number;
  lastMessage?: {
    text: string;
    senderUid: string;
    senderName: string;
    timestamp: string;
    createdAt: number;
    messageType?: 'text' | 'file' | 'image';
  };
  lastMessageAt: number;
  unreadCount?: number;
  unreadCounts?: Record<string, number>;
  readReceipts?: Record<string, { lastReadAt: number; lastReadMessageId?: string }>;
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
  lastSeenAt?: string | number;
  lastSeenMs?: number;
  isOnline?: boolean;
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

export type FileTypeCategory =
  | 'pdf'
  | 'image'
  | 'code'
  | 'document'
  | 'sheet'
  | 'presentation'
  | 'archive'
  | 'file'
  | 'zip';

export interface FileItem {
  id: string;
  fileId?: string;
  name: string;
  originalFileName?: string;
  storagePath?: string;
  size: string;
  bytes?: number;
  contentType?: string;
  uploadedBy: string;
  uploadedByEmail?: string;
  uploadedByUid?: string;
  uploadedAt: string;
  createdAt?: number;
  updatedAt?: number;
  type: FileTypeCategory;
  project: string;
  projectId?: string;
  fileUrl?: string;
  downloadUrl?: string;
  url?: string;
  description?: string;
  accessScope?: 'project' | 'workspace' | 'restricted';
  status?: 'active' | 'deleted';
  deletedAt?: number;
  deletedByUid?: string;
  deletedByName?: string;
}

export type ProjectFile = FileItem;

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

