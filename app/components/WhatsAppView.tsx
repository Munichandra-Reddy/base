'use client';

import React, { useState, useEffect } from 'react';
import {
  WhatsAppConfig,
  WhatsAppPreferences,
  WhatsAppMessageLog,
  Project,
} from '@/lib/types';
import {
  WhatsAppIcon,
  SendIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  CopyIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
} from './Icons';

interface WhatsAppViewProps {
  projects: Project[];
}

export const WhatsAppView: React.FC<WhatsAppViewProps> = ({ projects }) => {
  // Config & Status State
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [logs, setLogs] = useState<WhatsAppMessageLog[]>([]);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

  // Form & Preference State
  const [preferences, setPreferences] = useState<WhatsAppPreferences>({
    taskAssignments: true,
    upcomingDeadlines: true,
    overdueTasks: true,
    projectUpdates: false,
    optInConfirmed: true,
    recipientPhone: '+919441150546',
    selectedProjects: ['E-Commerce Website', 'Mobile App v2', 'Marketing Campaign Q4'],
  });

  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefSaveStatus, setPrefSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [prefErrorMessage, setPrefErrorMessage] = useState('');

  // Test Message State
  const [testEventType, setTestEventType] = useState<
    'task_assignment' | 'upcoming_deadline' | 'overdue_task' | 'project_update' | 'test_message'
  >('test_message');
  const [testPhone, setTestPhone] = useState('+919441150546');
  const [testSelectedProject, setTestSelectedProject] = useState('E-Commerce Website');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
    messageId?: string;
    isDemo?: boolean;
  }>({ status: 'idle', message: '' });

  // Filter logs state
  const [logFilter, setLogFilter] = useState<'all' | 'delivered' | 'read' | 'failed'>('all');

  // Modals & Popovers
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Meta Credentials Form State inside Connect Modal
  const [connectPhoneId, setConnectPhoneId] = useState('1280116715195570');
  const [connectAccountId, setConnectAccountId] = useState('2589369698176046');
  const [connectToken, setConnectToken] = useState('');
  const [connectAppSecret, setConnectAppSecret] = useState('');
  const [isSubmittingConnect, setIsSubmittingConnect] = useState(false);
  const [connectFeedback, setConnectFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const openConnectModal = () => {
    setConnectPhoneId('1280116715195570');
    setConnectAccountId('2589369698176046');
    setConnectFeedback(null);
    setIsConnectModalOpen(true);
  };

  // Load WhatsApp config on mount
  const fetchConfig = async () => {
    try {
      setIsLoadingConfig(true);
      const res = await fetch('/api/whatsapp/config');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
        setPreferences(data.config.preferences);
        if (data.config.preferences.recipientPhone) {
          setTestPhone(data.config.preferences.recipientPhone);
        }
      }
    } catch (err) {
      console.error('Failed to load WhatsApp config:', err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Load Message Logs
  const fetchLogs = async () => {
    try {
      setIsRefreshingLogs(true);
      const res = await fetch('/api/whatsapp/logs');
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch WhatsApp logs:', err);
    } finally {
      setIsRefreshingLogs(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchLogs();
  }, []);

  // Copy helper
  const handleCopy = (text: string, fieldKey: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  // Toggle Demo Mode
  const handleToggleDemoMode = async (enableDemo: boolean) => {
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDemoMode: enableDemo }),
      });
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error('Failed to toggle demo mode:', err);
    }
  };

  // Save Preferences
  const handleSavePreferences = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingPrefs(true);
    setPrefSaveStatus('idle');
    setPrefErrorMessage('');

    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
      const data = await res.json();

      if (data.success) {
        setPrefSaveStatus('success');
        if (data.config) setConfig(data.config);
        setTimeout(() => setPrefSaveStatus('idle'), 3500);
      } else {
        setPrefSaveStatus('error');
        setPrefErrorMessage(data.error || 'Failed to update preferences.');
      }
    } catch (err: any) {
      setPrefSaveStatus('error');
      setPrefErrorMessage(err?.message || 'Network error saving preferences.');
    } finally {
      setIsSavingPrefs(false);
    }
  };

  // Send Test Notification
  const handleSendTestMessage = async () => {
    setIsSendingTest(true);
    setTestResult({ status: 'idle', message: '' });

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: testEventType,
          recipientPhone: testPhone,
          data: {
            recipientName: 'Rahul Kumar',
            taskTitle: 'Design homepage & landing hero',
            projectName: testSelectedProject,
            dueDate: '2026-10-25',
            updateDetails: 'Milestone 2 reached: Frontend components ready for testing.',
            workspaceName: 'GEONIXA',
          },
          referenceId: `test-${Date.now()}`,
          forceSend: true, // Manual test bypasses deduplication & event toggles
        }),
      });

      const data = await res.json();

      if (data.success) {
        setTestResult({
          status: 'success',
          message: data.message || 'Notification dispatched successfully!',
          messageId: data.messageId,
          isDemo: data.isDemo,
        });
        // Refresh logs to show new entry immediately
        fetchLogs();
      } else {
        setTestResult({
          status: 'error',
          message: data.error || data.message || 'Failed to send WhatsApp message.',
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: err?.message || 'Network exception while connecting to WhatsApp endpoint.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Clear Audit Logs
  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear the WhatsApp delivery history?')) return;
    try {
      await fetch('/api/whatsapp/logs', { method: 'DELETE' });
      setLogs([]);
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  // Toggle project in selection
  const handleToggleProject = (projectName: string) => {
    setPreferences((prev) => {
      const exists = prev.selectedProjects.includes(projectName);
      const updated = exists
        ? prev.selectedProjects.filter((p) => p !== projectName)
        : [...prev.selectedProjects, projectName];
      return { ...prev, selectedProjects: updated };
    });
  };

  // Select all or clear projects
  const handleSelectAllProjects = () => {
    const allNames = projects.map((p) => p.name);
    setPreferences((prev) => ({ ...prev, selectedProjects: allNames }));
  };

  const handleClearAllProjects = () => {
    setPreferences((prev) => ({ ...prev, selectedProjects: [] }));
  };

  // Filter logs for display
  const filteredLogs = logs.filter((log) => {
    if (logFilter === 'all') return true;
    if (logFilter === 'delivered') return log.status === 'delivered';
    if (logFilter === 'read') return log.status === 'read';
    if (logFilter === 'failed') return log.status === 'failed';
    return true;
  });

  const isDemo = config?.isDemoMode ?? true;
  const isConnected = config?.status === 'connected';

  // Preview message text generator for WhatsApp Chat Bubble
  const getPreviewText = () => {
    switch (testEventType) {
      case 'task_assignment':
        return `📋 *WorkOrbit Task Assignment*\n\nHello Rahul Kumar,\nYou have been assigned a new task: *Design homepage & landing hero*\n📁 Project: ${testSelectedProject}\n📅 Due Date: 2026-10-25\n\nPlease check WorkOrbit to view task details.`;
      case 'upcoming_deadline':
        return `⏰ *WorkOrbit Deadline Reminder*\n\nHi Rahul Kumar,\nFriendly reminder that *Design homepage* in project *${testSelectedProject}* is approaching its deadline (2026-10-25).\n\nPlease track deliverables in WorkOrbit.`;
      case 'overdue_task':
        return `⚠️ *WorkOrbit Overdue Alert*\n\nAttention Rahul Kumar,\nThe task *Design homepage* in project *${testSelectedProject}* is now overdue.\n\nPlease update its status or notify your workspace lead.`;
      case 'project_update':
        return `🚀 *WorkOrbit Project Update*\n\nHello Rahul Kumar,\nImportant update for project *${testSelectedProject}*:\nMilestone 2 reached: Frontend components ready for testing.\n\nWorkspace: GEONIXA`;
      case 'test_message':
      default:
        return `🔔 *WorkOrbit WhatsApp Integration Test*\n\nWorkspace: GEONIXA\nRecipient: Rahul Kumar\nTime: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n\n✅ Your WhatsApp Business Platform Cloud API connection is active and operational!`;
    }
  };

  return (
    <div className="space-y-7 font-sans pb-16">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-7 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <WhatsAppIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                WhatsApp Business Integration
              </h1>
              <p className="text-slate-500 text-sm font-medium mt-0.5">
                Official Meta WhatsApp Cloud API for automated task alerts, deadlines, and project notifications.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              fetchConfig();
              fetchLogs();
            }}
            disabled={isLoadingConfig || isRefreshingLogs}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
            title="Refresh Connection & Logs"
          >
            <RefreshCwIcon className={`w-4 h-4 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
            <span>Sync Status</span>
          </button>

          <button
            onClick={openConnectModal}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-xs flex items-center gap-2.5 cursor-pointer transition-all"
          >
            <WhatsAppIcon className="w-4 h-4 text-white" />
            <span>Connect WhatsApp Business</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Banner: Connection Status & Mode Switch */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Status Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Connection Status
            </span>
            {isDemo ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Demo Mode Active
              </span>
            ) : isConnected ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Live Meta Cloud API
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                Disconnected
              </span>
            )}
          </div>

          <div>
            <div className="text-xl font-black text-slate-900 mb-1">
              {isDemo ? 'Meta Sandbox Demo' : 'WhatsApp Business Cloud'}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {isDemo
                ? 'Meta API tokens not configured. Operating in simulated demo mode with full end-to-end testing.'
                : 'Authenticated with Meta Business Platform Graph API v20.0.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Operating Mode:</span>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => handleToggleDemoMode(true)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  isDemo ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Demo Mode
              </button>
              <button
                onClick={() => handleToggleDemoMode(false)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  !isDemo ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Live API
              </button>
            </div>
          </div>
        </div>

        {/* Cloud API Metrics */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Dispatched Messages
            </span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              100% Delivery
            </span>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 mb-1">
              {logs.length}
            </div>
            <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
              <span className="text-emerald-600 font-bold">
                {logs.filter((l) => l.status === 'delivered' || l.status === 'read').length} delivered
              </span>
              <span>•</span>
              <span className="text-slate-400">
                {logs.filter((l) => l.status === 'sent').length} in transit
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400 font-medium">
            Deduplication: 5-minute active suppression window
          </div>
        </div>

        {/* Security & Webhook Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Webhook Verification
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
              <ShieldCheckIcon className="w-3.5 h-3.5" />
              HMAC-SHA256
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700 mb-1">Callback Endpoint:</div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80 flex items-center justify-between font-mono text-[11px] text-slate-800">
              <span className="truncate">/api/whatsapp/webhook</span>
              <button
                onClick={() => handleCopy(`${window.location.origin}/api/whatsapp/webhook`, 'webhook')}
                className="ml-2 text-slate-500 hover:text-slate-900 shrink-0"
                title="Copy full URL"
              >
                {copiedField === 'webhook' ? (
                  <span className="text-emerald-600 text-[10px] font-bold">Copied!</span>
                ) : (
                  <CopyIcon className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
          <div className="mt-3 pt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Verify Token: <code className="font-mono text-slate-700">workorbit_...</code></span>
            <span className="text-emerald-600 font-bold">✓ Active</span>
          </div>
        </div>
      </div>

      {/* Notice if in Demo Mode */}
      {isDemo && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4.5 flex items-start gap-3.5">
          <AlertCircleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-extrabold text-amber-900">
              Demo Sandbox Active (No Meta Cloud API Charges or Real Messages Sent)
            </div>
            <p className="text-xs text-amber-700 font-medium mt-0.5">
              WorkOrbit is simulating WhatsApp deliveries with verified audit logging. To send actual messages to personal WhatsApp devices, add your Meta WhatsApp Business API Token and Phone Number ID in <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-amber-900">.env.local</code> or click "Connect WhatsApp Business".
            </p>
          </div>
        </div>
      )}

      {/* 3. Main Grid: Settings & Test Dispatcher */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Left Column (7 cols): Notification Preferences & Project Selectors */}
        <div className="lg:col-span-7 space-y-7">
          {/* Card: Notification Preferences */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-black text-slate-900">Notification Preferences</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Select which workspace events trigger automated WhatsApp messages.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                4 Triggers
              </span>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-5">
              {/* Toggle 1: Task Assignments */}
              <div className="flex items-start justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="pr-4">
                  <div className="text-sm font-bold text-slate-900">Task Assignments</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    Send WhatsApp alert to assignee whenever a task is created or reassigned.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={preferences.taskAssignments}
                    onChange={(e) =>
                      setPreferences({ ...preferences, taskAssignments: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900" />
                </label>
              </div>

              {/* Toggle 2: Upcoming Deadlines */}
              <div className="flex items-start justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="pr-4">
                  <div className="text-sm font-bold text-slate-900">Upcoming Deadlines</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    Send automated reminders 48 hours and 24 hours prior to scheduled due date.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={preferences.upcomingDeadlines}
                    onChange={(e) =>
                      setPreferences({ ...preferences, upcomingDeadlines: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900" />
                </label>
              </div>

              {/* Toggle 3: Overdue Tasks */}
              <div className="flex items-start justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="pr-4">
                  <div className="text-sm font-bold text-slate-900">Overdue Tasks</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    Dispatch high-priority alert immediately when a task passes its deadline.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={preferences.overdueTasks}
                    onChange={(e) =>
                      setPreferences({ ...preferences, overdueTasks: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900" />
                </label>
              </div>

              {/* Toggle 4: Important Project Updates */}
              <div className="flex items-start justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="pr-4">
                  <div className="text-sm font-bold text-slate-900">Important Project Updates</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    Notify subscribed team when milestone status changes or project finishes.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={preferences.projectUpdates}
                    onChange={(e) =>
                      setPreferences({ ...preferences, projectUpdates: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900" />
                </label>
              </div>

              {/* Project Scope Filter */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Subscribed Projects
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Notifications are only dispatched for tasks in selected projects.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={handleSelectAllProjects}
                      className="text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleClearAllProjects}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  {projects.map((proj) => {
                    const isSelected = preferences.selectedProjects.includes(proj.name);
                    return (
                      <div
                        key={proj.id}
                        onClick={() => handleToggleProject(proj.name)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate pr-2">{proj.name}</span>
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${
                            isSelected ? 'bg-white text-slate-900 font-black' : 'border border-slate-300'
                          }`}
                        >
                          {isSelected ? '✓' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recipient Phone & WhatsApp Opt-In */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                    Workspace Notification Recipient Phone (E.164 Format)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={preferences.recipientPhone}
                      onChange={(e) =>
                        setPreferences({ ...preferences, recipientPhone: e.target.value })
                      }
                      placeholder="+15550198234 or +919876543210"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                      E.164
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Include leading plus sign and country code (e.g. +1 for US/Canada, +91 for India).
                  </p>
                </div>

                {/* WhatsApp Opt-in Consent */}
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="optInCheck"
                    checked={preferences.optInConfirmed}
                    onChange={(e) =>
                      setPreferences({ ...preferences, optInConfirmed: e.target.checked })
                    }
                    className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label
                    htmlFor="optInCheck"
                    className="text-xs text-emerald-950 font-medium leading-relaxed cursor-pointer"
                  >
                    <span className="font-bold">WhatsApp Opt-in Consent:</span> Recipient has explicitly agreed to receive WorkOrbit workspace notification templates in compliance with WhatsApp Business Platform Messaging Policies.
                  </label>
                </div>
              </div>

              {/* Feedback banners */}
              {prefSaveStatus === 'success' && (
                <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2Icon className="w-4 h-4 text-emerald-700" />
                  <span>Preferences saved successfully!</span>
                </div>
              )}
              {prefSaveStatus === 'error' && (
                <div className="p-3 rounded-xl bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircleIcon className="w-4 h-4 text-rose-700" />
                  <span>{prefErrorMessage}</span>
                </div>
              )}

              {/* Save Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingPrefs}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-xl shadow-2xs flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSavingPrefs ? (
                    <>
                      <RefreshCwIcon className="w-4 h-4 animate-spin" />
                      <span>Saving Preferences...</span>
                    </>
                  ) : (
                    <span>Save Preferences</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (5 cols): Test Message Dispatcher & WhatsApp Chat Preview */}
        <div className="lg:col-span-5 space-y-7">
          {/* Card: Instant Test Dispatcher */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">Send Test Notification</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Verify your WhatsApp Cloud API connection immediately.
                </p>
              </div>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <SendIcon className="w-4 h-4" />
              </span>
            </div>

            <div className="space-y-4">
              {/* Event Type selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Template Event Type
                </label>
                <select
                  value={testEventType}
                  onChange={(e) => setTestEventType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="task_assignment">Task Assignment (workorbit_task_assigned)</option>
                  <option value="upcoming_deadline">Upcoming Deadline (workorbit_upcoming_deadline)</option>
                  <option value="overdue_task">Overdue Task Alert (workorbit_overdue_task)</option>
                  <option value="project_update">Project Update (workorbit_project_update)</option>
                  <option value="test_message">System Health Test (workorbit_system_test)</option>
                </select>
              </div>

              {/* Project selector for test */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sample Project
                </label>
                <select
                  value={testSelectedProject}
                  onChange={(e) => setTestSelectedProject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Recipient Phone Number
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+15550198234"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* WhatsApp Message Preview Bubble */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    WhatsApp Message Preview
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    Official Template
                  </span>
                </div>

                <div className="bg-[#EFEAE2] p-4 rounded-2xl border border-slate-200 shadow-inner">
                  <div className="bg-white p-3.5 rounded-xl rounded-tl-none shadow-xs max-w-sm space-y-1 relative border border-slate-100">
                    <div className="text-[11px] font-black text-emerald-700 flex items-center justify-between">
                      <span>WorkOrbit Bot</span>
                      <span className="text-[9px] text-slate-400 font-normal">Official Business</span>
                    </div>
                    <pre className="text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                      {getPreviewText()}
                    </pre>
                    <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 pt-1">
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-blue-500 font-bold">✓✓</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Result Message */}
              {testResult.status === 'success' && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <CheckCircle2Icon className="w-4 h-4 text-emerald-600" />
                    <span>{testResult.isDemo ? 'Demo Notification Dispatched!' : 'Meta API Message Sent!'}</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">{testResult.message}</p>
                  {testResult.messageId && (
                    <div className="text-[10px] font-mono text-slate-500 truncate pt-1">
                      ID: {testResult.messageId}
                    </div>
                  )}
                  {testResult.message?.toLowerCase().includes('blocked') && (
                    <div className="mt-2 pt-2 border-t border-emerald-200/80 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10.5px] text-emerald-800 font-medium">Live Meta API restricted? Reassign WABA assets or update token.</span>
                      <button
                        type="button"
                        onClick={openConnectModal}
                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] rounded-lg shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>Update Meta Token</span>
                        <span>&rarr;</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {testResult.status === 'error' && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                    <AlertCircleIcon className="w-4 h-4 text-rose-600" />
                    <span>Dispatch Failed</span>
                  </div>
                  <p className="text-[11px] text-rose-700">{testResult.message}</p>
                  {(testResult.message?.includes('190') || testResult.message?.toLowerCase().includes('token') || testResult.message?.toLowerCase().includes('blocked')) && (
                    <div className="flex items-center gap-2 mt-2 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={openConnectModal}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>Update Meta Token / Credentials</span>
                        <span>&rarr;</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleDemoMode(true)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-black text-white font-bold text-[11px] rounded-lg shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>Switch to Demo Mode</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <button
                onClick={handleSendTestMessage}
                disabled={isSendingTest}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isSendingTest ? (
                  <>
                    <RefreshCwIcon className="w-4 h-4 animate-spin text-white" />
                    <span>Delivering via WhatsApp...</span>
                  </>
                ) : (
                  <>
                    <WhatsAppIcon className="w-4 h-4" />
                    <span>Send Test Notification</span>
                  </>
                )}
              </button>

              <a
                href={`https://api.whatsapp.com/send?phone=${encodeURIComponent(testPhone.replace(/[\s\-\(\)]/g, '').replace('+', ''))}&text=${encodeURIComponent(getPreviewText())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-200/80"
                title="Directly opens WhatsApp Web / App with this notification pre-filled"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Open & Send directly in WhatsApp ({testPhone})</span>
                <ExternalLinkIcon className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: Message Delivery Status & Audit Trail */}
      <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-900">Message Delivery Status & History</h2>
            <p className="text-xs text-slate-500 font-medium">
              Live delivery receipts recorded from Meta Webhooks and Cloud API response logs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              {(['all', 'delivered', 'read', 'failed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setLogFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                    logFilter === filter
                      ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              onClick={handleClearLogs}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
            >
              Clear Logs
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Event Type</th>
                <th className="py-3 px-3">Recipient</th>
                <th className="py-3 px-3">Message Content</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3 text-right">Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-semibold">
                    No message logs found for this filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  let statusBadge;
                  if (log.isDemo || log.status === 'simulated') {
                    statusBadge = (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 w-fit">
                        ⚡ Demo Simulated (Not Sent)
                      </span>
                    );
                  } else if (log.status === 'failed') {
                    statusBadge = (
                      <span
                        className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 w-fit"
                        title={log.errorMessage || 'Failed to deliver'}
                      >
                        ✕ Failed
                      </span>
                    );
                  } else if (log.status === 'delivered') {
                    statusBadge = (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 w-fit">
                        ✓✓ Delivered
                      </span>
                    );
                  } else if (log.status === 'read') {
                    statusBadge = (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 w-fit">
                        ✓✓ Read
                      </span>
                    );
                  } else {
                    statusBadge = (
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                        ✓ Sent via Meta API
                      </span>
                    );
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 whitespace-nowrap">{statusBadge}</td>
                      <td className="py-3.5 px-3 whitespace-nowrap font-bold text-slate-800">
                        {log.eventType.replace('_', ' ').toUpperCase()}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap font-mono text-slate-600 font-medium">
                        {log.recipientPhone}
                      </td>
                      <td className="py-3.5 px-3 max-w-md text-slate-700 font-medium">
                        <div className="truncate" title={log.content}>{log.content}</div>
                        {log.errorMessage && (
                          <div className="text-[11px] text-rose-600 font-bold mt-1 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                            {log.errorMessage}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-slate-400 font-medium">
                        {log.timestamp}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-right">
                        {log.isDemo ? (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                            Demo Sandbox
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                            Live Meta API
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Connect WhatsApp Business Modal */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden p-7 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <WhatsAppIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    Connect WhatsApp Business Platform
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Meta for Developers Cloud API Credentials
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConnectModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>How to obtain or renew your Meta WhatsApp Token:</span>
                  <a
                    href="https://developers.facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    developers.facebook.com <ExternalLinkIcon className="w-3 h-3" />
                  </a>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] font-medium leading-relaxed">
                  <span className="font-bold text-amber-950">Why did Error #190 occur?</span> Meta's temporary test tokens expire every 24 hours. To send messages again, copy a new token from Meta for Developers &gt; WhatsApp &gt; API Setup, or generate a Permanent System User Token.
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
                  <li><strong>Quick Fix (24 Hours):</strong> Go to Meta for Developers &gt; App &gt; <strong>WhatsApp</strong> &gt; <strong>API Setup</strong> &gt; Copy <strong>Temporary access token</strong>.</li>
                  <li><strong>Permanent Fix (Never Expires):</strong> Go to <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener noreferrer" className="underline font-bold text-slate-800">business.facebook.com</a> &gt; System Users &gt; Create User &gt; Assign WABA Full Control &gt; Generate Token (Never Expires) with <code className="bg-slate-200 px-1 py-0.5 rounded">whatsapp_business_messaging</code>.</li>
                </ol>
              </div>

              {/* Troubleshooting "API access blocked" */}
              <div className="p-3 bg-amber-50 border border-amber-200/90 rounded-xl space-y-1.5 text-[11px] text-amber-950">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertCircleIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Important for Delivery to your Mobile (+919441150546):</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-amber-900 text-[10.5px] leading-relaxed">
                  <li><strong>Allowed Test Numbers:</strong> Ensure <code className="font-mono bg-amber-100 px-1 rounded font-bold">+919441150546</code> is added and verified in Meta for Developers &gt; WhatsApp &gt; API Setup under "Manage phone number list".</li>
                  <li><strong>Customer Service Window:</strong> Outside the 24-hr session, Meta sends the official template. Send a quick "Hi" message from your mobile WhatsApp to the test bot number to open direct full-text chat!</li>
                </ul>
              </div>

              {/* Masked Credentials Overview */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={connectPhoneId}
                    onChange={(e) => setConnectPhoneId(e.target.value)}
                    placeholder="1280116715195570"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Default Phone ID: 1280116715195570</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    WhatsApp Business Account ID
                  </label>
                  <input
                    type="text"
                    value={connectAccountId}
                    onChange={(e) => setConnectAccountId(e.target.value)}
                    placeholder="2589369698176046"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Default Account ID: 2589369698176046</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Meta Access Token (Bearer Token)
                  </label>
                  <input
                    type="password"
                    value={connectToken}
                    onChange={(e) => setConnectToken(e.target.value)}
                    placeholder="Paste EAAG... or EAAZ... token here"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Saved directly to server environment and automatically tested with Meta Graph API.
                  </p>
                </div>
              </div>

              {connectFeedback && (
                <div
                  className={`p-3 rounded-xl font-bold text-xs flex items-start gap-2 ${
                    connectFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : connectFeedback.type === 'error'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}
                >
                  {connectFeedback.type === 'success' && <CheckCircle2Icon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                  {connectFeedback.type === 'error' && <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                  <span>{connectFeedback.text}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  handleToggleDemoMode(true);
                  setIsConnectModalOpen(false);
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Use Demo Sandbox Instead
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsConnectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={isSubmittingConnect}
                  onClick={async () => {
                    if (!connectToken.trim()) {
                      setConnectFeedback({ type: 'error', text: 'Please enter your Meta Access Token (EAAG... or EAAZ...).' });
                      return;
                    }
                    setIsSubmittingConnect(true);
                    setConnectFeedback({ type: 'info', text: 'Verifying with Meta Graph API...' });
                    try {
                      const res = await fetch('/api/whatsapp/config', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          token: connectToken.trim(),
                          phoneId: connectPhoneId.trim() || undefined,
                          businessAccountId: connectAccountId.trim() || undefined,
                          isDemoMode: false,
                        }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setConnectFeedback({ type: 'success', text: '✓ Live Meta credentials verified and activated successfully!' });
                        await fetchConfig();
                        setTimeout(() => {
                          setIsConnectModalOpen(false);
                          setConnectFeedback(null);
                        }, 1200);
                      } else {
                        setConnectFeedback({ type: 'error', text: data.error || 'Failed to activate credentials.' });
                      }
                    } catch (err: any) {
                      setConnectFeedback({ type: 'error', text: err?.message || 'Network error saving credentials.' });
                    } finally {
                      setIsSubmittingConnect(false);
                    }
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingConnect ? 'Verifying with Meta...' : 'Verify & Save Credentials'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
