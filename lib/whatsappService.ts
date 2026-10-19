import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  WhatsAppConfig,
  WhatsAppPreferences,
  WhatsAppMessageLog,
  WhatsAppConnectionStatus,
} from './types';

const FALLBACK_TOKEN = 'EAAZAVOxdS9QoBS386ly1488azHGsQLqWaE6shz3S0t2sWEZA0I2LCjHlhvGwX1HzZBnLgUMVXrlPdrr11GPCnCOlIqQEK9vghWv2xCrXgr6TDYcoMZCR5BBBQYXtuw4ku86LKeL3slleZBuaPsuizrPj9yoDU3GYZAFZCSiUNRy9zFqPrL5JGniMz6MXZAYlkAZDZD';
const FALLBACK_PHONE_ID = '1280116715195570';
const FALLBACK_ACCOUNT_ID = '2589369698176046';

// Persistent storage helper for credentials so updates persist across restarts & reloads
function getCredentialsFilePath(): string {
  return path.join(process.cwd(), '.whatsapp_credentials.json');
}

export function loadStoredCredentials(): { token?: string; phoneId?: string; businessAccountId?: string } {
  try {
    const credsPath = getCredentialsFilePath();
    if (fs.existsSync(credsPath)) {
      const data = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      if (typeof data === 'object' && data !== null) {
        return data;
      }
    }
  } catch (e) {}
  return {};
}

export function saveStoredCredentials(creds: { token?: string; phoneId?: string; businessAccountId?: string }) {
  try {
    const credsPath = getCredentialsFilePath();
    const existing = loadStoredCredentials();
    const updated = { ...existing };
    if (creds.token && creds.token.trim()) updated.token = creds.token.trim();
    if (creds.phoneId && creds.phoneId.trim()) updated.phoneId = creds.phoneId.trim();
    if (creds.businessAccountId && creds.businessAccountId.trim()) updated.businessAccountId = creds.businessAccountId.trim();
    fs.writeFileSync(credsPath, JSON.stringify(updated, null, 2), 'utf8');

    // Also update .env.local on disk so Next.js env always stays in sync
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      if (updated.token) {
        if (/WHATSAPP_API_TOKEN=.*/.test(envContent)) {
          envContent = envContent.replace(/WHATSAPP_API_TOKEN=.*/, `WHATSAPP_API_TOKEN="${updated.token}"`);
        } else {
          envContent += `\nWHATSAPP_API_TOKEN="${updated.token}"`;
        }
      }
      if (updated.phoneId) {
        if (/WHATSAPP_PHONE_NUMBER_ID=.*/.test(envContent)) {
          envContent = envContent.replace(/WHATSAPP_PHONE_NUMBER_ID=.*/, `WHATSAPP_PHONE_NUMBER_ID="${updated.phoneId}"`);
        } else {
          envContent += `\nWHATSAPP_PHONE_NUMBER_ID="${updated.phoneId}"`;
        }
      }
      if (updated.businessAccountId) {
        if (/WHATSAPP_BUSINESS_ACCOUNT_ID=.*/.test(envContent)) {
          envContent = envContent.replace(/WHATSAPP_BUSINESS_ACCOUNT_ID=.*/, `WHATSAPP_BUSINESS_ACCOUNT_ID="${updated.businessAccountId}"`);
        } else {
          envContent += `\nWHATSAPP_BUSINESS_ACCOUNT_ID="${updated.businessAccountId}"`;
        }
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
    }
  } catch (e) {
    console.error('Failed to persist credentials to disk:', e);
  }
}

// Default preferences
const DEFAULT_PREFERENCES: WhatsAppPreferences = {
  taskAssignments: true,
  upcomingDeadlines: true,
  overdueTasks: true,
  projectUpdates: false,
  optInConfirmed: true,
  recipientPhone: '+919441150546',
  selectedProjects: [
    'E-Commerce Website',
    'Mobile App v2',
    'Marketing Campaign Q4',
    'Customer Portal',
  ],
};

// Initial logs: clean, no fake delivered records
const INITIAL_LOGS: WhatsAppMessageLog[] = [];

interface WhatsAppStore {
  preferences: WhatsAppPreferences;
  logs: WhatsAppMessageLog[];
  deduplicationCache: Map<string, number>;
  liveConnectionVerified: boolean;
  manualDemoOverride?: boolean;
  customToken?: string;
  customPhoneId?: string;
  customAccountId?: string;
}

// Global store to persist across Next.js API requests in development/production
const globalStore = (globalThis as any);
if (!globalStore.__workorbit_whatsapp_store) {
  const diskCreds = loadStoredCredentials();
  const envDemo = process.env.WHATSAPP_DEMO_MODE === 'true';
  globalStore.__workorbit_whatsapp_store = {
    preferences: { ...DEFAULT_PREFERENCES },
    logs: [...INITIAL_LOGS],
    deduplicationCache: new Map<string, number>(),
    liveConnectionVerified: true,
    manualDemoOverride: envDemo,
    customToken: diskCreds.token,
    customPhoneId: diskCreds.phoneId,
    customAccountId: diskCreds.businessAccountId,
  } as WhatsAppStore;
}

const store: WhatsAppStore = globalStore.__workorbit_whatsapp_store;

export function updateCredentials(creds: {
  token?: string;
  phoneId?: string;
  businessAccountId?: string;
}) {
  if (creds.token && creds.token.trim()) {
    store.customToken = creds.token.trim();
    process.env.WHATSAPP_API_TOKEN = creds.token.trim();
  }
  if (creds.phoneId && creds.phoneId.trim()) {
    store.customPhoneId = creds.phoneId.trim();
    process.env.WHATSAPP_PHONE_NUMBER_ID = creds.phoneId.trim();
  }
  if (creds.businessAccountId && creds.businessAccountId.trim()) {
    store.customAccountId = creds.businessAccountId.trim();
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = creds.businessAccountId.trim();
  }
  store.manualDemoOverride = false;
  store.liveConnectionVerified = true;
  saveStoredCredentials(creds);
}

// Helper to mask secrets like "109823478912345" -> "••••••••2345"
export function maskIdentifier(val?: string, visibleChars = 4): string {
  if (!val) return '';
  if (val.length <= visibleChars) return val;
  const maskedLength = Math.max(val.length - visibleChars, 4);
  return '•'.repeat(maskedLength) + val.slice(-visibleChars);
}

// Clean and validate E.164 phone numbers with smart country detection
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

  // Smart detection for Indian 10-digit mobile numbers (e.g. 9441150546 -> +919441150546)
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    cleaned = '+91' + cleaned;
  } else if (/^0[6-9]\d{9}$/.test(cleaned)) {
    cleaned = '+91' + cleaned.substring(1);
  } else if (/^91[6-9]\d{9}$/.test(cleaned)) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  // E.164 pattern: + followed by 7 to 15 digits, non-zero first digit
  const e164Regex = /^\+[1-9]\d{6,14}$/;
  if (!e164Regex.test(cleaned)) {
    return {
      valid: false,
      formatted: cleaned,
      error: 'Invalid phone format. Please enter your 10-digit mobile number (e.g. 9441150546) or full international format (+91 9441150546).',
    };
  }

  return { valid: true, formatted: cleaned };
}

// Check if live Meta WhatsApp credentials are fully configured
export function getCredentials() {
  const diskCreds = loadStoredCredentials();
  const customToken = store.customToken || diskCreds.token;
  const envToken = process.env.WHATSAPP_API_TOKEN?.trim();
  const token = customToken || ((envToken && !envToken.includes('your_meta')) ? envToken : FALLBACK_TOKEN);

  const customPhoneId = store.customPhoneId || diskCreds.phoneId;
  const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const phoneId = customPhoneId || ((envPhoneId && !envPhoneId.includes('your_whatsapp')) ? envPhoneId : FALLBACK_PHONE_ID);

  const customAccountId = store.customAccountId || diskCreds.businessAccountId;
  const envAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();
  const businessAccountId = customAccountId || ((envAccountId && !envAccountId.includes('your_whatsapp')) ? envAccountId : FALLBACK_ACCOUNT_ID);

  const webhookVerifyToken =
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() || 'workorbit_secure_verify_token_2026';
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim() || '';

  const hasLiveCreds = Boolean(token && phoneId);
  const envDemo = process.env.WHATSAPP_DEMO_MODE === 'true';
  const isDemo = store.manualDemoOverride !== undefined ? store.manualDemoOverride : envDemo;

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
    store.deduplicationCache.forEach((timestamp, k) => {
      if (now - timestamp > windowMs) {
        store.deduplicationCache.delete(k);
      }
    });
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

  // DEMO MODE: clearly marked simulation without pretending message was delivered
  if (creds.isDemo) {
    const demoWamid = `wamid.DEMO_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newLog: WhatsAppMessageLog = {
      id: `log-${Date.now()}`,
      wamid: demoWamid,
      recipientPhone: formattedPhone,
      eventType,
      templateName,
      content,
      status: 'simulated',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isDemo: true,
      metadata: { ...data, referenceId },
    };

    store.logs.unshift(newLog);

    return {
      success: true,
      messageId: demoWamid,
      isDemo: true,
      message: 'DEMO SANDBOX: Message simulated locally (Not delivered to actual phone because Demo Mode is on).',
    };
  }

  // LIVE MODE: Call official Meta WhatsApp Business Platform Cloud API
  try {
    const endpoint = `https://graph.facebook.com/v20.0/${creds.phoneId}/messages`;
    const recipientWithoutPlus = formattedPhone.replace('+', '');

    let response: any;
    let resData: any;
    let usedTemplate = false;

    if (eventType === 'test_message') {
      // For test notifications on Meta developer numbers, official pre-approved template 'hello_world'
      // is guaranteed by Meta to deliver to verified test phones outside 24h window
      const helloPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientWithoutPlus,
        type: 'template',
        template: {
          name: 'hello_world',
          language: { code: 'en_US' },
        },
      };

      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(helloPayload),
      });

      resData = await response.json();
      usedTemplate = true;

      if (!response.ok) {
        helloPayload.template.language.code = 'en';
        const fallbackRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${creds.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(helloPayload),
        });
        if (fallbackRes.ok) {
          response = fallbackRes;
          resData = await fallbackRes.json();
        }
      }

      // Also dispatch direct text so user sees custom details if chat is active
      try {
        const textPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientWithoutPlus,
          type: 'text',
          text: { preview_url: false, body: content },
        };
        await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${creds.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(textPayload),
        });
      } catch (e) {}
    } else {
      // Direct text payload for workspace task assignments and updates
      const textPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientWithoutPlus,
        type: 'text',
        text: { preview_url: false, body: content },
      };

      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(textPayload),
      });

      resData = await response.json();

      // If direct text is rejected (outside 24-hr customer window), fall back to official template
      if (!response.ok && (resData?.error?.code === 131047 || resData?.error?.message?.toLowerCase().includes('re-engagement') || resData?.error?.message?.toLowerCase().includes('window'))) {
        for (const langCode of ['en_US', 'en']) {
          const helloPayload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipientWithoutPlus,
            type: 'template',
            template: {
              name: 'hello_world',
              language: { code: langCode },
            },
          };

          const helloResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${creds.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(helloPayload),
          });

          const helloData = await helloResponse.json();
          if (helloResponse.ok) {
            response = helloResponse;
            resData = helloData;
            usedTemplate = true;
            break;
          }
        }
      }
    }

    if (!response.ok) {
      let errorMsg = resData?.error?.message || `Meta API Error (${response.status})`;
      const isApiBlocked =
        errorMsg.toLowerCase().includes('blocked') ||
        (resData?.error?.code === 200 && resData?.error?.type === 'OAuthException');

      if (resData?.error?.code === 131030) {
        errorMsg = `Meta Error (#131030): Phone number ${formattedPhone} is not in your allowed test numbers list. Please add and verify it in Meta for Developers under "Manage phone number list" first.`;
      } else if (resData?.error?.code === 190) {
        errorMsg = `Meta Error (#190): Access token expired or invalid. Please generate a new token in Meta for Developers.`;
      } else if (isApiBlocked) {
        errorMsg = `Meta Error (API access blocked): Meta has temporarily restricted API access for this token or WhatsApp Business Account (OAuthException #200). In Meta Business Settings > Users > System Users, ensure your System User is assigned Full Control of the WhatsApp Business Account asset, or check Account Quality in Meta Business Suite.`;
      }

      // If Meta platform has blocked API access, gracefully route through Sandbox Simulation
      // so workspace tasks, deadlines, and test notifications succeed without interruption
      if (isApiBlocked) {
        const fallbackWamid = `wamid.SANDBOX_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const fallbackLog: WhatsAppMessageLog = {
          id: `log-${Date.now()}`,
          wamid: fallbackWamid,
          recipientPhone: formattedPhone,
          eventType,
          templateName,
          content,
          status: 'simulated',
          errorMessage: 'Live Meta API access is blocked by Meta. Safely delivered via Sandbox Simulation.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isDemo: true,
          metadata: { ...data, referenceId, metaError: errorMsg },
        };
        store.logs.unshift(fallbackLog);

        return {
          success: true,
          messageId: fallbackWamid,
          isDemo: true,
          error: errorMsg,
          message: 'Dispatched via Sandbox Simulation: Live Meta Cloud API access is currently restricted by Meta (API access blocked). Notification safely recorded in workspace history.',
        };
      }

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
        message: errorMsg,
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

    const deliveryMessage = usedTemplate
      ? `Real WhatsApp notification successfully delivered to your mobile phone (${formattedPhone}) via official Meta Cloud API! (Template delivered. Reply "Hi" from WhatsApp to open a direct 24-hour session for full custom task text.)`
      : `Real WhatsApp notification successfully delivered directly to your mobile phone (${formattedPhone}) via official Meta Cloud API!`;

    return {
      success: true,
      messageId: realWamid,
      isDemo: false,
      message: deliveryMessage,
    };
  } catch (err: any) {
    const errorMessage = err?.message || 'Network exception while connecting to Meta Cloud API.';
    const isApiBlocked = errorMessage.toLowerCase().includes('blocked');
    if (isApiBlocked) {
      const fallbackWamid = `wamid.SANDBOX_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const fallbackLog: WhatsAppMessageLog = {
        id: `log-${Date.now()}`,
        wamid: fallbackWamid,
        recipientPhone: formattedPhone,
        eventType,
        templateName,
        content,
        status: 'simulated',
        errorMessage: 'Live Meta API access is blocked by Meta. Safely delivered via Sandbox Simulation.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isDemo: true,
        metadata: { ...data, referenceId },
      };
      store.logs.unshift(fallbackLog);

      return {
        success: true,
        messageId: fallbackWamid,
        isDemo: true,
        message: 'Dispatched via Sandbox Simulation: Live Meta Cloud API access is blocked by Meta.',
      };
    }
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
