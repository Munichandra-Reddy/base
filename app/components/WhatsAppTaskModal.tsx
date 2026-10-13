'use client';

import React, { useState } from 'react';
import { Task, Person } from '@/lib/types';
import { WhatsAppIcon } from './Icons';
import {
  formatPhoneForWhatsApp,
  buildWhatsAppLink,
  generateTaskReminderMessage,
  generateTaskAssignmentMessage,
  appendWhatsAppLog,
  getSavedWhatsAppConfig,
} from '@/lib/whatsappUtils';

interface WhatsAppTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  people: Person[];
}

export const WhatsAppTaskModal: React.FC<WhatsAppTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  people,
}) => {
  if (!isOpen || !task) return null;

  // Find matching employee by name
  const assignedPerson = people.find(
    (p) => p.name.toLowerCase() === (task.assignedTo || '').toLowerCase()
  );

  const defaultPhone = assignedPerson?.phone || '+91 98765 43210';
  const [recipientPhone, setRecipientPhone] = useState(defaultPhone);
  const [templateType, setTemplateType] = useState<'reminder' | 'assigned' | 'custom'>('reminder');
  const [customMessage, setCustomMessage] = useState(() =>
    generateTaskReminderMessage(task, assignedPerson?.name)
  );
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleTemplateChange = (type: 'reminder' | 'assigned' | 'custom') => {
    setTemplateType(type);
    if (type === 'reminder') {
      setCustomMessage(generateTaskReminderMessage(task, assignedPerson?.name));
    } else if (type === 'assigned') {
      setCustomMessage(generateTaskAssignmentMessage(task, assignedPerson?.name));
    }
  };

  const handleOpenWhatsAppWeb = () => {
    const waLink = buildWhatsAppLink(recipientPhone, customMessage);
    window.open(waLink, '_blank', 'noopener,noreferrer');

    // Record log
    appendWhatsAppLog({
      id: `wa-${Date.now()}`,
      recipientName: assignedPerson?.name || task.assignedTo || 'Team Member',
      recipientPhone,
      message: customMessage,
      templateType: templateType === 'assigned' ? 'task_assigned' : 'deadline_reminder',
      status: 'delivered',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      relatedTaskId: task.id,
    });

    setStatusMessage('Opened in WhatsApp! Log recorded.');
    setTimeout(() => {
      setStatusMessage(null);
      onClose();
    }, 1500);
  };

  const handleSendViaAPI = async () => {
    setIsSending(true);
    setStatusMessage(null);

    const config = getSavedWhatsAppConfig();

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone,
          recipientName: assignedPerson?.name || task.assignedTo || 'Team Member',
          message: customMessage,
          templateType: templateType === 'assigned' ? 'task_assigned' : 'deadline_reminder',
          relatedTaskId: task.id,
          config,
        }),
      });

      const data = await res.json();
      if (data.success) {
        appendWhatsAppLog(data.log);
        setStatusMessage('WhatsApp notification dispatched successfully!');
        setTimeout(() => {
          setStatusMessage(null);
          onClose();
        }, 1500);
      } else {
        setStatusMessage(data.error || 'Failed to dispatch via API');
      }
    } catch (err) {
      // Fallback
      handleOpenWhatsAppWeb();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <WhatsAppIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold leading-tight">Send WhatsApp Task Alert</h3>
              <p className="text-xs text-emerald-100 font-medium">
                Notify assignee directly on WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors text-xl font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Task Info Pill */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Selected Task
            </div>
            <div className="font-extrabold text-slate-900 text-sm truncate">{task.title}</div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 font-medium">
              <span className="font-bold text-slate-700">{task.project}</span>
              <span>•</span>
              <span>Due: {task.dueDate || 'Soon'}</span>
              <span>•</span>
              <span className="font-bold text-emerald-700">Assignee: {task.assignedTo || 'Unassigned'}</span>
            </div>
          </div>

          {/* Recipient Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Recipient WhatsApp Number
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {assignedPerson && (
                <div className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 flex items-center">
                  {assignedPerson.name}
                </div>
              )}
            </div>
          </div>

          {/* Template Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Template Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleTemplateChange('reminder')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  templateType === 'reminder'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                ⏰ Reminder
              </button>
              <button
                type="button"
                onClick={() => handleTemplateChange('assigned')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  templateType === 'assigned'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                📌 Task Assignment
              </button>
              <button
                type="button"
                onClick={() => handleTemplateChange('custom')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  templateType === 'custom'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                ✏️ Custom
              </button>
            </div>
          </div>

          {/* WhatsApp Message Preview / Edit */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                WhatsApp Message Preview
              </label>
              <span className="text-[11px] text-slate-400 font-medium">WhatsApp Markdown supported (*bold*)</span>
            </div>
            <div className="relative bg-[#efeae2] p-4 rounded-xl border border-slate-200">
              <div className="bg-[#d9fdd3] p-3.5 rounded-lg rounded-tr-none shadow-xs text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed max-w-[95%] ml-auto border border-emerald-200">
                <textarea
                  rows={6}
                  value={customMessage}
                  onChange={(e) => {
                    setCustomMessage(e.target.value);
                    setTemplateType('custom');
                  }}
                  className="w-full bg-transparent resize-none focus:outline-none text-xs text-slate-800 font-medium"
                />
                <div className="text-[10px] text-slate-400 text-right mt-1 flex items-center justify-end gap-1">
                  <span>Just now</span>
                  <span className="text-emerald-600 font-bold">✓✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl text-center">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSending}
              onClick={handleSendViaAPI}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs transition-colors cursor-pointer shadow-xs"
            >
              Send via API
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsAppWeb}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <WhatsAppIcon className="w-4 h-4 text-white" />
              <span>Open in WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
