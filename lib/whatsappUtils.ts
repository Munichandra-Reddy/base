import { Task, Person, WhatsAppMessage, WhatsAppConfig } from './types';

export const DEFAULT_WHATSAPP_CONFIG: WhatsAppConfig = {
  provider: 'direct',
  phoneNumberId: '',
  businessAccountId: '',
  apiAccessToken: '',
  webhookVerifyToken: 'workorbit_secure_token_2026',
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioFromNumber: '+14155238886',
  enableTaskAlerts: true,
  enableDeadlineReminders: true,
  enableCheckinPings: true,
  enableTaskCompletionAlerts: true,
};

export const initialWhatsAppLogs: WhatsAppMessage[] = [
  {
    id: 'wa-1',
    recipientName: 'Rahul Kumar',
    recipientPhone: '+91 98765 43210',
    message: '📌 *WorkOrbit Task Assignment*\nHi Rahul, task *Design homepage* has been assigned to you in project *E-Commerce Website*. Due: Oct 25, 2026.',
    templateType: 'task_assigned',
    status: 'read',
    timestamp: '10:45 AM',
    relatedTaskId: 't-1',
  },
  {
    id: 'wa-2',
    recipientName: 'Priya Sharma',
    recipientPhone: '+91 98765 43211',
    message: '⏰ *WorkOrbit Deadline Reminder*\nHi Priya, task *Review brand guidelines* is due tomorrow. Please update your status.',
    templateType: 'deadline_reminder',
    status: 'delivered',
    timestamp: '09:30 AM',
    relatedTaskId: 't-3',
  },
  {
    id: 'wa-3',
    recipientName: 'Chandra Reddy',
    recipientPhone: '+91 98765 43212',
    message: '🚀 *WorkOrbit Daily Check-in*\nGood morning Chandra! Please submit your daily standup update on WorkOrbit.',
    templateType: 'checkin_request',
    status: 'sent',
    timestamp: '09:00 AM',
  },
];

/**
 * Clean and format phone number for WhatsApp wa.me links
 * Strips out +, spaces, dashes, parentheses
 */
export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Builds direct WhatsApp click-to-chat URL (works seamlessly across mobile and desktop)
 */
export function buildWhatsAppLink(phone: string, text: string): string {
  const cleanPhone = formatPhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(text);
  if (cleanPhone) {
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

/**
 * Generate task assignment WhatsApp text
 */
export function generateTaskAssignmentMessage(task: Task, recipientName?: string): string {
  const name = recipientName || task.assignedTo || 'Team Member';
  return `📌 *WorkOrbit - Task Assigned*\n\nHi ${name},\nYou have been assigned a new task:\n• *Task:* ${task.title}\n• *Project:* ${task.project}\n• *Due Date:* ${task.dueDate || 'Pending'}\n• *Priority:* ${(task.priority || 'Medium').toUpperCase()}\n\n👉 Open Workspace: https://workorbit.app/#tasks`;
}

/**
 * Generate task deadline reminder WhatsApp text
 */
export function generateTaskReminderMessage(task: Task, recipientName?: string): string {
  const name = recipientName || task.assignedTo || 'Team Member';
  return `⏰ *WorkOrbit - Deadline Reminder*\n\nHi ${name},\nFriendly reminder regarding your upcoming deadline:\n• *Task:* ${task.title}\n• *Project:* ${task.project}\n• *Due Date:* ${task.dueDate || 'Due Soon'}\n\nPlease check in or complete the task when ready.\n\n👉 View Task: https://workorbit.app/#tasks`;
}

/**
 * Generate daily standup WhatsApp text
 */
export function generateStandupMessage(name: string): string {
  return `☀️ *WorkOrbit - Daily Standup Check-in*\n\nGood morning ${name}!\nPlease take 1 minute to submit your daily check-in:\n1. What did you complete yesterday?\n2. What will you work on today?\n3. Any blockers?\n\n👉 Submit Check-in: https://workorbit.app/#checkins`;
}

/**
 * Retrieve saved WhatsApp config from localStorage
 */
export function getSavedWhatsAppConfig(): WhatsAppConfig {
  if (typeof window === 'undefined') return DEFAULT_WHATSAPP_CONFIG;
  const saved = localStorage.getItem('workorbit_whatsapp_config');
  if (saved) {
    try {
      return { ...DEFAULT_WHATSAPP_CONFIG, ...JSON.parse(saved) };
    } catch (e) {}
  }
  return DEFAULT_WHATSAPP_CONFIG;
}

/**
 * Save WhatsApp config to localStorage
 */
export function saveWhatsAppConfig(config: WhatsAppConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('workorbit_whatsapp_config', JSON.stringify(config));
}

/**
 * Retrieve WhatsApp message logs from localStorage
 */
export function getSavedWhatsAppLogs(): WhatsAppMessage[] {
  if (typeof window === 'undefined') return initialWhatsAppLogs;
  const saved = localStorage.getItem('workorbit_whatsapp_logs');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  return initialWhatsAppLogs;
}

/**
 * Append new WhatsApp log to localStorage
 */
export function appendWhatsAppLog(log: WhatsAppMessage): WhatsAppMessage[] {
  const existing = getSavedWhatsAppLogs();
  const updated = [log, ...existing];
  if (typeof window !== 'undefined') {
    localStorage.setItem('workorbit_whatsapp_logs', JSON.stringify(updated));
  }
  return updated;
}
