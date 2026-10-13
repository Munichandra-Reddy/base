'use client';

import React, { useState, useEffect } from 'react';
import { Task, Person, Project, WhatsAppMessage, WhatsAppConfig } from '@/lib/types';
import { WhatsAppIcon, CheckSquareIcon, UsersIcon, CheckCircleIcon, ClockIcon } from './Icons';
import {
  buildWhatsAppLink,
  generateTaskAssignmentMessage,
  generateTaskReminderMessage,
  generateStandupMessage,
  getSavedWhatsAppConfig,
  saveWhatsAppConfig,
  getSavedWhatsAppLogs,
  appendWhatsAppLog,
} from '@/lib/whatsappUtils';

interface WhatsAppViewProps {
  tasks: Task[];
  people: Person[];
  projects: Project[];
  currentUser?: { email: string; fullName: string; companyName: string } | null;
}

export const WhatsAppView: React.FC<WhatsAppViewProps> = ({
  tasks,
  people,
  projects,
  currentUser,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'broadcast' | 'automations' | 'config' | 'logs'>('broadcast');

  // Form states for Quick Send
  const [selectedPersonId, setSelectedPersonId] = useState<string>(people[0]?.id || 'custom');
  const [recipientPhone, setRecipientPhone] = useState<string>(people[0]?.phone || '+91 98765 43210');
  const [recipientName, setRecipientName] = useState<string>(people[0]?.name || 'Rahul Kumar');
  const [templateType, setTemplateType] = useState<
    'task_assigned' | 'deadline_reminder' | 'checkin_request' | 'announcement' | 'custom'
  >('task_assigned');
  const [selectedTaskId, setSelectedTaskId] = useState<string>(tasks[0]?.id || '');
  const [announcementText, setAnnouncementText] = useState<string>('Please note that the sprint demo is scheduled for tomorrow at 4:00 PM IST.');
  const [messageBody, setMessageBody] = useState<string>('');

  // Config & Logs
  const [config, setConfig] = useState<WhatsAppConfig>(getSavedWhatsAppConfig);
  const [logs, setLogs] = useState<WhatsAppMessage[]>(getSavedWhatsAppLogs);
  const [isSending, setIsSending] = useState(false);
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Sync recipient selection
  const handleSelectPerson = (id: string) => {
    setSelectedPersonId(id);
    if (id === 'custom') {
      setRecipientName('Custom Contact');
      setRecipientPhone('');
    } else {
      const p = people.find((item) => item.id === id);
      if (p) {
        setRecipientName(p.name);
        setRecipientPhone(p.phone || '+91 98765 43210');
      }
    }
  };

  // Re-compute template message body whenever templateType, selectedTask, or recipient changes
  useEffect(() => {
    const curTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0];

    if (templateType === 'task_assigned' && curTask) {
      setMessageBody(generateTaskAssignmentMessage(curTask, recipientName));
    } else if (templateType === 'deadline_reminder' && curTask) {
      setMessageBody(generateTaskReminderMessage(curTask, recipientName));
    } else if (templateType === 'checkin_request') {
      setMessageBody(generateStandupMessage(recipientName));
    } else if (templateType === 'announcement') {
      setMessageBody(`📢 *WorkOrbit Announcement*\nFrom: ${currentUser?.fullName || 'Workspace Admin'}\n\n${announcementText}\n\n👉 View Workspace: https://workorbit.app`);
    } else if (templateType === 'custom' && !messageBody) {
      setMessageBody(`Hi ${recipientName}, sharing an update regarding our WorkOrbit projects.`);
    }
  }, [templateType, selectedTaskId, recipientName, announcementText]);

  // Load config & logs on mount
  useEffect(() => {
    setConfig(getSavedWhatsAppConfig());
    setLogs(getSavedWhatsAppLogs());
  }, []);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveWhatsAppConfig(config);
    setNotificationBanner('WhatsApp configuration saved successfully!');
    setTimeout(() => setNotificationBanner(null), 3000);
  };

  const handleOpenWhatsAppWeb = () => {
    if (!recipientPhone) {
      setNotificationBanner('Please provide a valid recipient WhatsApp phone number.');
      setTimeout(() => setNotificationBanner(null), 3000);
      return;
    }

    const waLink = buildWhatsAppLink(recipientPhone, messageBody);
    window.open(waLink, '_blank', 'noopener,noreferrer');

    const newLog: WhatsAppMessage = {
      id: `wa-${Date.now()}`,
      recipientName,
      recipientPhone,
      message: messageBody,
      templateType,
      status: 'delivered',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      relatedTaskId: selectedTaskId || undefined,
    };

    const updated = appendWhatsAppLog(newLog);
    setLogs(updated);

    setNotificationBanner('Opened in WhatsApp Web! Message logged.');
    setTimeout(() => setNotificationBanner(null), 3000);
  };

  const handleSendViaAPI = async () => {
    if (!recipientPhone) {
      setNotificationBanner('Please provide a valid recipient WhatsApp phone number.');
      setTimeout(() => setNotificationBanner(null), 3000);
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone,
          recipientName,
          message: messageBody,
          templateType,
          relatedTaskId: selectedTaskId || undefined,
          config,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const updated = appendWhatsAppLog(data.log);
        setLogs(updated);
        setNotificationBanner(`Message sent successfully via ${data.provider === 'cloud_api' ? 'Meta Cloud API' : data.provider === 'twilio' ? 'Twilio' : 'WhatsApp Gateway'}!`);
      } else {
        setNotificationBanner(data.error || 'Failed to dispatch WhatsApp message.');
      }
    } catch (err) {
      setNotificationBanner('Error communicating with WhatsApp API. Opening WhatsApp Web instead.');
      handleOpenWhatsAppWeb();
    } finally {
      setIsSending(false);
      setTimeout(() => setNotificationBanner(null), 4000);
    }
  };

  const handleTestRule = (ruleName: string, sampleText: string) => {
    const demoLog: WhatsAppMessage = {
      id: `wa-${Date.now()}`,
      recipientName: 'Rahul Kumar',
      recipientPhone: '+91 98765 43210',
      message: sampleText,
      templateType: 'task_assigned',
      status: 'delivered',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const updated = appendWhatsAppLog(demoLog);
    setLogs(updated);
    setNotificationBanner(`Test trigger simulated for: ${ruleName}! Logged in Activity.`);
    setTimeout(() => setNotificationBanner(null), 3000);
  };

  const handleCopyWebhookUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://workorbit.app';
    const webhookUrl = `${origin}/api/whatsapp/webhook`;
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Card */}
      <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/20">
            <WhatsAppIcon className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-extrabold text-slate-900">WhatsApp Integration Hub</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                Live Gateway
              </span>
            </div>
            <p className="text-slate-500 text-base font-medium">
              Send instant WhatsApp reminders for tasks, automate deadline warnings, broadcast team alerts, and connect Meta WhatsApp Cloud API or Twilio.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveSubTab('config')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm shadow-xs cursor-pointer transition-colors"
          >
            ⚙️ Configure API
          </button>
          <button
            onClick={() => setActiveSubTab('broadcast')}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 cursor-pointer transition-all flex items-center gap-2"
          >
            <WhatsAppIcon className="w-4 h-4 text-white" />
            <span>Send WhatsApp Alert</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notificationBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-bold rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600">✓</span>
            <span>{notificationBanner}</span>
          </div>
          <button onClick={() => setNotificationBanner(null)} className="text-emerald-700 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {/* Metric Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <WhatsAppIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Mode</div>
            <div className="text-lg font-black text-slate-900 capitalize">
              {config.provider === 'cloud_api' ? 'Meta Cloud API' : config.provider === 'twilio' ? 'Twilio API' : 'Direct (wa.me)'}
            </div>
            <div className="text-[11px] font-bold text-emerald-600">Connected & Ready</div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ClockIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dispatched Alerts</div>
            <div className="text-lg font-black text-slate-900">{logs.length} Messages</div>
            <div className="text-[11px] font-bold text-slate-500">100% Delivery Rate</div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <CheckCircleIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Automation Rules</div>
            <div className="text-lg font-black text-slate-900">
              {[config.enableTaskAlerts, config.enableDeadlineReminders, config.enableCheckinPings, config.enableTaskCompletionAlerts].filter(Boolean).length} / 4 Active
            </div>
            <div className="text-[11px] font-bold text-purple-600">Background Triggers</div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <UsersIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team Synced</div>
            <div className="text-lg font-black text-slate-900">{people.length} Employees</div>
            <div className="text-[11px] font-bold text-amber-600">WhatsApp Verified</div>
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={() => setActiveSubTab('broadcast')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === 'broadcast'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <WhatsAppIcon className="w-4 h-4" />
          <span>Quick Send & Broadcast</span>
        </button>

        <button
          onClick={() => setActiveSubTab('automations')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === 'automations'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <span>⚡ Automated Alert Rules</span>
        </button>

        <button
          onClick={() => setActiveSubTab('config')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === 'config'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <span>⚙️ API & Webhook Setup</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeSubTab === 'logs'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <span>📋 Message History & Logs ({logs.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: QUICK SEND & BROADCAST */}
      {activeSubTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Message Composer (7 cols) */}
          <div className="lg:col-span-7 bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Compose WhatsApp Notification</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Dispatch personalized alerts directly to team members' WhatsApp accounts.
              </p>
            </div>

            {/* Recipient Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                1. Select Recipient
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <select
                    value={selectedPersonId}
                    onChange={(e) => handleSelectPerson(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.role})
                      </option>
                    ))}
                    <option value="custom">+ Enter Custom Phone Number</option>
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                2. Notification Template
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'task_assigned', label: '📌 Task Assigned' },
                  { id: 'deadline_reminder', label: '⏰ Deadline Warning' },
                  { id: 'checkin_request', label: '☀️ Standup Ping' },
                  { id: 'announcement', label: '📢 Announcement' },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setTemplateType(tpl.id as any)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      templateType === tpl.id
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-extrabold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Task context picker if task template */}
            {(templateType === 'task_assigned' || templateType === 'deadline_reminder') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Attach Workspace Task
                </label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} — ({t.project}) [Due: {t.dueDate || 'Soon'}]
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Announcement custom text */}
            {templateType === 'announcement' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Announcement Message
                </label>
                <input
                  type="text"
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="Type workspace broadcast announcement..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {/* Editable Message Body */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  3. Message Body (Markdown Supported)
                </label>
                <span className="text-[11px] text-slate-400 font-medium">*bold*, _italic_</span>
              </div>
              <textarea
                rows={6}
                value={messageBody}
                onChange={(e) => {
                  setMessageBody(e.target.value);
                  setTemplateType('custom');
                }}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleOpenWhatsAppWeb}
                className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <WhatsAppIcon className="w-5 h-5 text-white" />
                <span>Open & Send in WhatsApp Web</span>
              </button>

              <button
                type="button"
                disabled={isSending}
                onClick={handleSendViaAPI}
                className="w-full sm:w-auto py-3 px-5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 font-extrabold text-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {isSending ? (
                  <span>Sending via API...</span>
                ) : (
                  <span>Send via API Gateway</span>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Live WhatsApp Screen Simulator Preview (5 cols) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-extrabold text-slate-900">Live WhatsApp Chat Preview</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Recipient View
                </span>
              </div>

              {/* Phone Frame Mockup */}
              <div className="w-full max-w-sm mx-auto rounded-3xl border-4 border-slate-800 overflow-hidden shadow-xl bg-slate-800">
                {/* WhatsApp Chat App Bar */}
                <div className="bg-[#075e54] text-white p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center border border-white/20">
                      W
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">WorkOrbit Workspace</div>
                      <div className="text-[10px] text-emerald-200 leading-tight">Official Bot • Online</div>
                    </div>
                  </div>
                  <div className="text-white/80 text-xs font-bold">⋮</div>
                </div>

                {/* WhatsApp Chat Area */}
                <div className="bg-[#efeae2] p-4 min-h-[340px] flex flex-col justify-end space-y-3">
                  <div className="text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/70 text-slate-600 shadow-2xs">
                      TODAY
                    </span>
                  </div>

                  {/* Outgoing WhatsApp Bubble */}
                  <div className="bg-[#d9fdd3] p-3 rounded-xl rounded-tr-none shadow-xs text-xs text-slate-900 font-sans leading-relaxed border border-emerald-200/80 max-w-[92%] ml-auto">
                    <p className="whitespace-pre-wrap font-medium">{messageBody}</p>
                    <div className="text-[10px] text-slate-400 text-right mt-1.5 flex items-center justify-end gap-1 font-semibold">
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-blue-500 font-black">✓✓</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Input Mock */}
                <div className="bg-slate-100 p-2 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-400">
                  <div className="flex-1 bg-white px-3 py-1.5 rounded-full border border-slate-200 text-[11px]">
                    Message
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#075e54] text-white flex items-center justify-center text-xs">
                    ➤
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 text-center">
              <p className="text-xs text-slate-400 font-medium">
                Clicking "Open in WhatsApp" uses official WhatsApp deep links to open chat instantly on WhatsApp Web or mobile app.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: AUTOMATED ALERT RULES */}
      {activeSubTab === 'automations' && (
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Automated WhatsApp Workflows</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Toggle automatic alerts for your team. When events occur in WorkOrbit, WhatsApp messages are automatically dispatched.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {/* Rule 1: Task Assignment */}
            <div className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckSquareIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Task Assigned Alert</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Whenever a new task is assigned to an employee, automatically send them task title, project, and due date.
                  </p>
                  <div className="mt-2 text-xs font-mono bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-700 max-w-lg">
                    "📌 WorkOrbit: You have a new task 'Design homepage' in E-Commerce Website. Due: Oct 25."
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() =>
                    handleTestRule(
                      'Task Assigned Alert',
                      '📌 *WorkOrbit Alert*: Task *Design homepage* has been assigned to you. Due: Oct 25, 2026.'
                    )
                  }
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Test Rule
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enableTaskAlerts}
                    onChange={(e) => {
                      const updated = { ...config, enableTaskAlerts: e.target.checked };
                      setConfig(updated);
                      saveWhatsAppConfig(updated);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>
            </div>

            {/* Rule 2: Deadline Warning */}
            <div className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                  <ClockIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">24h Deadline Warning</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Automatically pings the assignee 24 hours prior to a task's due date to avoid overdue work.
                  </p>
                  <div className="mt-2 text-xs font-mono bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-700 max-w-lg">
                    "⏰ WorkOrbit Reminder: Task 'Complete API integration' is due tomorrow!"
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() =>
                    handleTestRule(
                      'Deadline Warning',
                      '⏰ *WorkOrbit Deadline Reminder*: Friendly reminder, task *Complete API integration* is due tomorrow.'
                    )
                  }
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Test Rule
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enableDeadlineReminders}
                    onChange={(e) => {
                      const updated = { ...config, enableDeadlineReminders: e.target.checked };
                      setConfig(updated);
                      saveWhatsAppConfig(updated);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>
            </div>

            {/* Rule 3: Task Completion */}
            <div className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircleIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Task Completed Confirmation</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Notifies project manager when an employee marks a milestone or task as completed.
                  </p>
                  <div className="mt-2 text-xs font-mono bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-700 max-w-lg">
                    "✅ Task Completed: 'Set up CI/CD pipeline' was marked done by Rahul Kumar."
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() =>
                    handleTestRule(
                      'Task Completed Confirmation',
                      '✅ *WorkOrbit Update*: Task *Set up CI/CD pipeline* was marked complete.'
                    )
                  }
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Test Rule
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enableTaskCompletionAlerts}
                    onChange={(e) => {
                      const updated = { ...config, enableTaskCompletionAlerts: e.target.checked };
                      setConfig(updated);
                      saveWhatsAppConfig(updated);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>
            </div>

            {/* Rule 4: Daily Standup Ping */}
            <div className="py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                  <UsersIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Daily Standup / Check-in Request</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Pings all active employees at 9:00 AM asking them to post their daily check-in response.
                  </p>
                  <div className="mt-2 text-xs font-mono bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-700 max-w-lg">
                    "☀️ Good morning! Please submit your daily standup update on WorkOrbit."
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() =>
                    handleTestRule(
                      'Daily Standup Request',
                      '☀️ *WorkOrbit Daily Check-in*: Good morning! Please submit your daily standup update.'
                    )
                  }
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Test Rule
                </button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enableCheckinPings}
                    onChange={(e) => {
                      const updated = { ...config, enableCheckinPings: e.target.checked };
                      setConfig(updated);
                      saveWhatsAppConfig(updated);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: API & WEBHOOK SETUP */}
      {activeSubTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Settings Form (7 cols) */}
          <div className="lg:col-span-7 bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">WhatsApp Gateway Configuration</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Choose how WorkOrbit dispatches WhatsApp messages. You can use direct click-to-chat links (zero config) or connect official Meta WhatsApp Cloud API credentials.
              </p>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-5">
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Dispatch Provider
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'direct', label: 'Direct wa.me (Free)', desc: 'Zero API key required' },
                    { id: 'cloud_api', label: 'Meta Cloud API', desc: 'Official WhatsApp Business' },
                    { id: 'twilio', label: 'Twilio WhatsApp', desc: 'Twilio Programmable SMS' },
                  ].map((prov) => (
                    <div
                      key={prov.id}
                      onClick={() => setConfig({ ...config, provider: prov.id as any })}
                      className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                        config.provider === prov.id
                          ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="font-extrabold text-xs text-slate-900">{prov.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{prov.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Meta Cloud API Fields */}
              {config.provider === 'cloud_api' && (
                <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-900">Meta Cloud API Credentials</div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number ID</label>
                    <input
                      type="text"
                      value={config.phoneNumberId || ''}
                      onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                      placeholder="e.g. 10482910492810"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">WhatsApp Business Account ID (WABA)</label>
                    <input
                      type="text"
                      value={config.businessAccountId || ''}
                      onChange={(e) => setConfig({ ...config, businessAccountId: e.target.value })}
                      placeholder="e.g. 10928471928374"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Permanent System User Token</label>
                    <input
                      type="password"
                      value={config.apiAccessToken || ''}
                      onChange={(e) => setConfig({ ...config, apiAccessToken: e.target.value })}
                      placeholder="EAAG... (Meta Graph Access Token)"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Twilio Fields */}
              {config.provider === 'twilio' && (
                <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-900">Twilio WhatsApp Credentials</div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Account SID</label>
                    <input
                      type="text"
                      value={config.twilioAccountSid || ''}
                      onChange={(e) => setConfig({ ...config, twilioAccountSid: e.target.value })}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Auth Token</label>
                    <input
                      type="password"
                      value={config.twilioAuthToken || ''}
                      onChange={(e) => setConfig({ ...config, twilioAuthToken: e.target.value })}
                      placeholder="Twilio Auth Token"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Twilio WhatsApp Number</label>
                    <input
                      type="text"
                      value={config.twilioFromNumber || '+14155238886'}
                      onChange={(e) => setConfig({ ...config, twilioFromNumber: e.target.value })}
                      placeholder="+14155238886"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Webhook Verification Token */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Webhook Verify Token (Secret)
                </label>
                <input
                  type="text"
                  value={config.webhookVerifyToken || 'workorbit_secure_token_2026'}
                  onChange={(e) => setConfig({ ...config, webhookVerifyToken: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter this same token in Meta App Dashboard &gt; WhatsApp &gt; Configuration &gt; Webhook Verify Token.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-6 py-3 bg-slate-900 hover:bg-black text-white font-extrabold text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save WhatsApp Configuration
                </button>
              </div>
            </form>
          </div>

          {/* Webhook Endpoint & Two-Way Commands Guide (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Webhook Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-extrabold text-slate-900">Webhook Endpoint URL</h3>
              <p className="text-xs text-slate-500 font-medium">
                Copy this URL and paste it into Meta Business Developer Console to enable 2-way sync and delivery receipts.
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                <code className="text-xs font-mono text-emerald-800 font-bold truncate">
                  /api/whatsapp/webhook
                </code>
                <button
                  type="button"
                  onClick={handleCopyWebhookUrl}
                  className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shrink-0 cursor-pointer transition-colors"
                >
                  {copiedWebhook ? 'Copied! ✓' : 'Copy URL'}
                </button>
              </div>

              <div className="text-[11px] text-slate-400 space-y-1">
                <div>• HTTP Method: <span className="font-bold text-slate-600">GET (Verify) & POST (Events)</span></div>
                <div>• Webhook fields: <span className="font-bold text-slate-600">messages, message_deliveries</span></div>
              </div>
            </div>

            {/* 2-Way Bot Commands Reference */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-base font-extrabold text-slate-900">2-Way WhatsApp Bot Commands</h3>
              <p className="text-xs text-slate-500 font-medium">
                Team members can reply directly on WhatsApp to perform workspace actions!
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <code className="font-bold text-emerald-700">DONE #t-1</code>
                  <span className="text-slate-500 text-[11px]">Marks task completed</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <code className="font-bold text-emerald-700">STATUS</code>
                  <span className="text-slate-500 text-[11px]">Returns pending task count</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <code className="font-bold text-emerald-700">LIST</code>
                  <span className="text-slate-500 text-[11px]">Replies with tasks due today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: MESSAGE HISTORY & LOGS */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">WhatsApp Dispatch Logs</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Audit trail of outgoing WhatsApp task reminders, standup pings, and announcements.
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('workorbit_whatsapp_logs');
                setLogs([]);
              }}
              className="text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Clear Logs
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-medium text-sm">
                No WhatsApp messages logged yet. Compose your first message above!
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-sm flex items-center justify-center shrink-0">
                      {log.recipientName[0] || 'W'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{log.recipientName}</span>
                        <span className="text-xs font-semibold text-slate-400 font-mono">{log.recipientPhone}</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-1 line-clamp-2 max-w-xl">
                        {log.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[11px] font-bold text-slate-400">{log.timestamp}</span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        log.status === 'read'
                          ? 'bg-blue-100 text-blue-800'
                          : log.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {log.status}
                    </span>
                    <button
                      onClick={() => {
                        const link = buildWhatsAppLink(log.recipientPhone, log.message);
                        window.open(link, '_blank', 'noopener,noreferrer');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-white hover:border-emerald-500 hover:text-emerald-700 cursor-pointer transition-all"
                    >
                      Open in WA
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
