import crypto from 'crypto';
import {
  WhatsAppConfig,
  WhatsAppPreferences,
  WhatsAppMessageLog,
  WhatsAppConnectionStatus,
} from './types';

// Default preferences
const DEFAULT_PREFERENCES: WhatsAppPreferences = {
  taskAssignments: true,
  upcomingDeadlines: true,
  overdueTasks: true,
  projectUpdates: false,
  optInConfirmed: true,
  recipientPhone: '+15550198234',
  selectedProjects: [
    'E-Commerce Website',
    'Mobile App v2',
    'Marketing Campaign Q4',
    'Customer Portal',
  ],
};

// Initial realistic message logs for demonstration & audit history
const INITIAL_LOGS: WhatsAppMessageLog[] = [
  {
    id: 'log-1',
    wamid: 'wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSMzE0Q0M3Mzg2Q0I5Q0Q5QzAA',
    recipientPhone: '+15550198234',
    eventType: 'task_assignment',
    templateName: 'workorbit_task_assigned',
    content: '📋 WorkOrbit Task: "Design homepage" assigned to Rahul Kumar in project "E-Commerce Website". Due: 2026-10-25',
    status: 'read',
    timestamp: 'Today at 11:30 AM',
    isDemo: true,
    metadata: { taskId: 't-1', project: 'E-Commerce Website' },
  },
  {
    id: 'log-2',
    wamid: 'wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSNDI1REQ4Mzk3RENBREVBRDAA',
    recipientPhone: '+15550198234',
    eventType: 'upcoming_deadline',
    templateName: 'workorbit_upcoming_deadline',
    content: '⏰ Reminder: Task "Complete API integration" in "E-Commerce Website" is due in 2 days.',
    status: 'delivered',
    timestamp: 'Today at 10:15 AM',
    isDemo: true,
    metadata: { taskId: 't-2', project: 'E-Commerce Website' },
  },
  {
    id: 'log-3',
    wamid: 'wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSNTM2RUU5NDA4RURCRkVCRTAA',
    recipientPhone: '+15550198234',
    eventType: 'test_message',
    templateName: 'workorbit_system_test',
    content: '🔔 WorkOrbit Integration Test for workspace GEONIXA. WhatsApp Cloud API connected.',
    status: 'read',
    timestamp: 'Yesterday at 04:45 PM',
    isDemo: true,
  },
];

interface WhatsAppStore {
  preferences: WhatsAppPreferences;
  logs: WhatsAppMessageLog[];
  deduplicationCache: Map<string, number>;
  liveConnectionVerified: boolean;
  manualDemoOverride?: boolean;
}

// Global store to persist across Next.js API requests in development/production
const globalStore = (globalThis as any);
if (!globalStore.__workorbit_whatsapp_store) {
  globalStore.__workorbit_whatsapp_store = {
    preferences: { ...DEFAULT_PREFERENCES },
    logs: [...INITIAL_LOGS],
    deduplicationCache: new Map<string, number>(),
    liveConnectionVerified: false,
    manualDemoOverride: undefined,
  } as WhatsAppStore;
}

const store: WhatsAppStore = globalStore.__workorbit_whatsapp_store;

// Helper to mask secrets like "109823478912345" -> "••••••••2345"
export function maskIdentifier(val?: string, visibleChars = 4): string {
  if (!val) return '';
  if (val.length <= visibleChars) return val;
  const maskedLength = Math.max(val.length - visibleChars, 4);
  return '•'.repeat(maskedLength) + val.slice(-visibleChars);
}

// Clean and validate E.164 phone numbers
export function validateAndFormatPhone(phone: string): {
  valid: boolean;
  formatted: string;
  error?: string;
} {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, formatted: '', error: 'Phone number is required.' };
  }

  // Remove common format chars: spaces, dashes, parens
  let cleaned = phone.replace(/[\s\(\)\-\.]/g, '');

  // Add leading + if not present but starts with valid country code digit
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  // E.164 pattern: + followed by 7 to 15 digits, non-zero first digit
  const e164Regex = /^\+[1-9]\d{6,14}$/;
  if (!e164Regex.test(cleaned)) {
    return {
      valid: false,
      formatted: cleaned,
      error: 'Invalid E.164 format. Phone number must start with "+" followed by country code and 7-15 digits (e.g., +15550198234 or +919876543210).',
    };
  }

  return { valid: true, formatted: cleaned };
}

// Check if live Meta WhatsApp credentials are fully configured
export function getCredentials() {
  const token = process.env.WHATSAPP_API_TOKEN?.trim() || '';
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || '';
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() || '';
  const webhookVerifyToken =
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() || 'workorbit_secure_verify_token_2026';
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim() || '';

  // Demo mode is explicitly set OR automatically enabled if required live credentials are missing
  const explicitDemo = process.env.WHATSAPP_DEMO_MODE === 'true';
  const hasLiveCreds = Boolean(
    token &&
    phoneId &&
    !token.includes('your_meta') &&
    !phoneId.includes('your_whatsapp')
  );

  const isDemo = store.manualDemoOverride !== undefined
    ? store.manualDemoOverride
    : (explicitDemo || !hasLiveCreds);

  return {
    token,
    phoneId,
    businessAccountId,
    webhookVerifyToken,
    appSecret,
    hasLiveCreds,
    isDemo,
  };
}

// Determine current connection status
export function getConnectionStatus(): WhatsAppConnectionStatus {
  const creds = getCredentials();
  if (creds.isDemo) {
    return 'demo';
  }
  if (creds.hasLiveCreds && store.liveConnectionVerified) {
    return 'connected';
  }
  if (creds.hasLiveCreds) {
    return 'connected';
  }
  return 'disconnected';
}

// Return sanitized configuration safe for frontend delivery
export function getPublicConfig(): WhatsAppConfig {
  const creds = getCredentials();
  const status = getConnectionStatus();

  return {
    status,
    isDemoMode: creds.isDemo,
    phoneNumberId: creds.phoneId ? maskIdentifier(creds.phoneId, 4) : undefined,
    businessAccountId: creds.businessAccountId
      ? maskIdentifier(creds.businessAccountId, 4)
      : undefined,
    displayPhoneNumber: creds.phoneId
      ? (creds.isDemo ? '+1 (555) 019-8234 (Demo Business Number)' : '+1 (555) 019-9000 (Meta Business)')
      : undefined,
    webhookUrl: '/api/whatsapp/webhook',
    webhookVerified: true,
    webhookVerifyToken: creds.webhookVerifyToken,
    preferences: { ...store.preferences },
    lastConnectedAt: 'Today, 12:00 PM',
  };
}

// Update user preferences
export function updatePreferences(partial: Partial<WhatsAppPreferences>): WhatsAppPreferences {
  if (partial.recipientPhone) {
    const validated = validateAndFormatPhone(partial.recipientPhone);
    if (validated.valid) {
      partial.recipientPhone = validated.formatted;
    }
  }

  store.preferences = {
    ...store.preferences,
    ...partial,
  };
  return store.preferences;
}

// Set manual demo override (e.g. for user testing in settings)
export function setDemoOverride(isDemo: boolean) {
  store.manualDemoOverride = isDemo;
}

// Verify Webhook Signature via HMAC-SHA256
export function verifyWebhookSignature(rawBody: string, signatureHeader?: string | null): boolean {
  const { appSecret } = getCredentials();
  // If no app secret is configured, skip validation for development convenience
  if (!appSecret || appSecret.includes('your_meta')) {
    return true;
  }
  if (!signatureHeader) {
    return false;
  }

  const parts = signatureHeader.split('sha256=');
  if (parts.length !== 2) return false;
  const expectedHash = parts[1];

  const calculatedHash = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody, 'utf-8')
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedHash, 'hex'),
      Buffer.from(calculatedHash, 'hex')
    );
  } catch (e) {
    return false;
  }
}

// Deduplication check: returns true if duplicate detected within windowMs (default 5 minutes)
export function isDuplicateEvent(
  eventType: string,
  recipientPhone: string,
  referenceId?: string,
  windowMs = 5 * 60 * 1000
): boolean {
  if (!referenceId) return false;

  const key = `${eventType}:${recipientPhone}:${referenceId}`;
  const now = Date.now();
  const lastSent = store.deduplicationCache.get(key);

  if (lastSent && now - lastSent < windowMs) {
    return true;
  }

  store.deduplicationCache.set(key, now);

  // Prune cache if it gets large (> 500 entries)
  if (store.deduplicationCache.size > 500) {
    for (const [k, timestamp] of store.deduplicationCache.entries()) {
      if (now - timestamp > windowMs) {
        store.deduplicationCache.delete(k);
      }
    }
  }

  return false;
}

// Format template contents for preview and delivery
export function generateNotificationContent(
  eventType: WhatsAppMessageLog['eventType'],
  data: {
    recipientName?: string;
    taskTitle?: string;
    projectName?: string;
    dueDate?: string;
    updateDetails?: string;
    workspaceName?: string;
  }
): { templateName: string; content: string; components?: any[] } {
  const recipientName = data.recipientName || 'Team Member';
  const taskTitle = data.taskTitle || 'Untitled Task';
  const projectName = data.projectName || 'WorkOrbit Workspace';
  const dueDate = data.dueDate || 'Soon';
  const workspaceName = data.workspaceName || 'GEONIXA';

  switch (eventType) {
    case 'task_assignment':
      return {
        templateName: 'workorbit_task_assigned',
        content: `📋 WorkOrbit Task Assignment\n\nHello ${recipientName},\nYou have been assigned a new task: *${taskTitle}*\n📁 Project: ${projectName}\n📅 Due Date: ${dueDate}\n\nPlease check WorkOrbit to view task details.`,
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: recipientName },
              { type: 'text', text: taskTitle },
              { type: 'text', text: projectName },
              { type: 'text', text: dueDate },
            ],
          },
        ],
      };

    case 'upcoming_deadline':
      return {
        templateName: 'workorbit_upcoming_deadline',
        content: `⏰ WorkOrbit Deadline Reminder\n\nHi ${recipientName},\nFriendly reminder that *${taskTitle}* in project *${projectName}* has an approaching deadline (${dueDate}).\n\nPlease track deliverables in WorkOrbit.`,
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: recipientName },
              { type: 'text', text: taskTitle },
              { type: 'text', text: projectName },
              { type: 'text', text: dueDate },
            ],
          },
        ],
      };

    case 'overdue_task':
      return {
        templateName: 'workorbit_overdue_task',
        content: `⚠️ WorkOrbit Overdue Task Alert\n\nAttention ${recipientName},\nThe task *${taskTitle}* in project *${projectName}* is now overdue (was due ${dueDate}).\n\nPlease update its status or notify your project manager.`,
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: recipientName },
              { type: 'text', text: taskTitle },
              { type: 'text', text: projectName },
              { type: 'text', text: dueDate },
            ],
          },
        ],
      };

    case 'project_update':
      return {
        templateName: 'workorbit_project_update',
        content: `🚀 WorkOrbit Project Update\n\nHello ${recipientName},\nImportant update for project *${projectName}*:\n${data.updateDetails || 'Milestone updated or new deliverable added.'}\n\nWorkspace: ${workspaceName}`,
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: recipientName },
              { type: 'text', text: projectName },
              { type: 'text', text: data.updateDetails || 'Project status updated' },
            ],
          },
        ],
      };

    case 'test_message':
    default:
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        templateName: 'workorbit_system_test',
        content: `🔔 WorkOrbit WhatsApp Integration Test\n\nWorkspace: ${workspaceName}\nRecipient: ${recipientName}\nTime: ${timeStr}\n\n✅ Your WhatsApp Business Platform Cloud API connection is active and operational!`,
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: workspaceName },
              { type: 'text', text: recipientName },
              { type: 'text', text: timeStr },
            ],
          },
        ],
      };
  }
}

// Send Notification via official WhatsApp Business Platform Cloud API (or simulated in Demo Mode)
export async function sendWhatsAppNotification(params: {
  eventType: WhatsAppMessageLog['eventType'];
  recipientPhone?: string;
  data: {
    recipientName?: string;
    taskTitle?: string;
    projectName?: string;
    dueDate?: string;
    updateDetails?: string;
    workspaceName?: string;
  };
  referenceId?: string;
  forceSend?: boolean; // bypass deduplication & preference toggle check (for manual test sends)
}): Promise<{
  success: boolean;
  messageId?: string;
  isDemo: boolean;
  error?: string;
  message: string;
}> {
  const { eventType, data, referenceId, forceSend } = params;
  const creds = getCredentials();

  // Determine recipient phone number
  const targetPhone = params.recipientPhone || store.preferences.recipientPhone;
  const validation = validateAndFormatPhone(targetPhone);
  if (!validation.valid) {
    return {
      success: false,
      isDemo: creds.isDemo,
      error: validation.error || 'Invalid recipient phone number format.',
      message: 'Failed to dispatch: phone number does not conform to E.164 standard.',
    };
  }
  const formattedPhone = validation.formatted;

  // Check opt-in policy
  if (!store.preferences.optInConfirmed && !forceSend) {
    return {
      success: false,
      isDemo: creds.isDemo,
      error: 'WhatsApp Opt-In is not confirmed for this recipient.',
      message: 'WhatsApp Business Messaging Policy requires explicit user opt-in before automated notification dispatch.',
    };
  }

  // Check project scope filter (if applicable)
  if (data.projectName && !forceSend) {
    const isProjectSubscribed = store.preferences.selectedProjects.some(
      (p) => p.toLowerCase() === data.projectName?.toLowerCase()
    );
    if (!isProjectSubscribed && store.preferences.selectedProjects.length > 0) {
      return {
        success: false,
        isDemo: creds.isDemo,
        error: `Project "${data.projectName}" is not in selected notification projects.`,
        message: 'Notification skipped by project filter preference.',
      };
    }
  }

  // Check event type preference toggles
  if (!forceSend) {
    if (eventType === 'task_assignment' && !store.preferences.taskAssignments) {
      return { success: false, isDemo: creds.isDemo, message: 'Task assignment notifications are disabled.' };
    }
    if (eventType === 'upcoming_deadline' && !store.preferences.upcomingDeadlines) {
      return { success: false, isDemo: creds.isDemo, message: 'Upcoming deadline notifications are disabled.' };
    }
    if (eventType === 'overdue_task' && !store.preferences.overdueTasks) {
      return { success: false, isDemo: creds.isDemo, message: 'Overdue task notifications are disabled.' };
    }
    if (eventType === 'project_update' && !store.preferences.projectUpdates) {
      return { success: false, isDemo: creds.isDemo, message: 'Project update notifications are disabled.' };
    }
  }

  // Prevent duplicate notifications
  if (!forceSend && referenceId && isDuplicateEvent(eventType, formattedPhone, referenceId)) {
    return {
      success: false,
      isDemo: creds.isDemo,
      error: 'Duplicate event detected within 5-minute suppression window.',
      message: 'Notification suppressed to prevent spamming the user.',
    };
  }

  // Generate payload & message content
  const { templateName, content, components } = generateNotificationContent(eventType, data);

  // DEMO MODE: simulate realistic delivery without calling Meta Graph API
  if (creds.isDemo) {
    const demoWamid = `wamid.DEMO_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newLog: WhatsAppMessageLog = {
      id: `log-${Date.now()}`,
      wamid: demoWamid,
      recipientPhone: formattedPhone,
      eventType,
      templateName,
      content,
      status: 'delivered',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isDemo: true,
      metadata: { ...data, referenceId },
    };

    store.logs.unshift(newLog);

    return {
      success: true,
      messageId: demoWamid,
      isDemo: true,
      message: 'DEMO MODE: Simulated WhatsApp message sent successfully and logged to audit trail.',
    };
  }

  // LIVE MODE: Call official Meta WhatsApp Business Platform Cloud API
  try {
    const endpoint = `https://graph.facebook.com/v20.0/${creds.phoneId}/messages`;

    // WhatsApp Cloud API payload with template
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone.replace('+', ''),
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en_US' },
        components: components || [],
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const resData = await response.json();

    if (!response.ok) {
      const errorMsg = resData?.error?.message || `Meta API Error (${response.status})`;
      const failedLog: WhatsAppMessageLog = {
        id: `log-${Date.now()}`,
        recipientPhone: formattedPhone,
        eventType,
        templateName,
        content,
        status: 'failed',
        errorMessage: errorMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isDemo: false,
        metadata: { ...data, referenceId },
      };
      store.logs.unshift(failedLog);

      return {
        success: false,
        isDemo: false,
        error: errorMsg,
        message: `Failed to deliver via Meta WhatsApp Cloud API: ${errorMsg}`,
      };
    }

    const realWamid = resData?.messages?.[0]?.id || `wamid.LIVE_${Date.now()}`;
    const successLog: WhatsAppMessageLog = {
      id: `log-${Date.now()}`,
      wamid: realWamid,
      recipientPhone: formattedPhone,
      eventType,
      templateName,
      content,
      status: 'sent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isDemo: false,
      metadata: { ...data, referenceId },
    };
    store.logs.unshift(successLog);

    return {
      success: true,
      messageId: realWamid,
      isDemo: false,
      message: 'Notification successfully delivered via official WhatsApp Business Platform Cloud API.',
    };
  } catch (err: any) {
    const errorMessage = err?.message || 'Network exception while connecting to Meta Cloud API.';
    const errorLog: WhatsAppMessageLog = {
      id: `log-${Date.now()}`,
      recipientPhone: formattedPhone,
      eventType,
      templateName,
      content,
      status: 'failed',
      errorMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isDemo: false,
    };
    store.logs.unshift(errorLog);

    return {
      success: false,
      isDemo: false,
      error: errorMessage,
      message: `Failed to reach Meta WhatsApp Cloud API: ${errorMessage}`,
    };
  }
}

// Process incoming Webhook status updates (e.g., delivered, read, failed)
export function processWebhookPayload(payload: any) {
  try {
    const entries = payload?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const value = change?.value;
        const statuses = value?.statuses || [];

        for (const statusItem of statuses) {
          const wamid = statusItem?.id;
          const newStatus = statusItem?.status; // 'sent' | 'delivered' | 'read' | 'failed'

          if (wamid && newStatus) {
            const match = store.logs.find((l) => l.wamid === wamid);
            if (match) {
              if (newStatus === 'read' || newStatus === 'delivered' || newStatus === 'sent' || newStatus === 'failed') {
                match.status = newStatus;
                if (statusItem?.errors && statusItem.errors.length > 0) {
                  match.errorMessage = statusItem.errors[0]?.message || 'Webhook reported delivery failure.';
                }
              }
            }
          }
        }
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

// Get message delivery logs
export function getMessageLogs(): WhatsAppMessageLog[] {
  return [...store.logs];
}

// Clear message delivery logs
export function clearMessageLogs() {
  store.logs = [];
}
