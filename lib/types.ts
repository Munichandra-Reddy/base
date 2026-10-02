export interface Task {
  id: string;
  title: string;
  project: string;
  completed: boolean;
  dueDate?: string;
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface Project {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'on_hold';
  progress: number;
  openToDos: number;
  members: string[];
  description: string;
  updatedAt: string;
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
