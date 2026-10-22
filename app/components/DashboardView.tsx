'use client';

import React, { useState } from 'react';
import { Task, Activity, WorkspaceStats } from '@/lib/types';
import {
  FolderIcon,
  CheckSquareIcon,
  ClockIcon,
  UsersIcon,
  CalendarIcon,
  ChatIcon,
  FileIcon,
  WhatsAppIcon,
} from './Icons';

interface DashboardViewProps {
  stats: WorkspaceStats;
  tasks: Task[];
  activities: Activity[];
  onToggleTask: (id: string) => void;
  onOpenAddTask: () => void;
  onViewAllTasks: () => void;
  onViewEmployees?: () => void;
  onViewProjects?: () => void;
  onViewCalendar?: () => void;
  currentUser?: { email: string; fullName: string; companyName: string } | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  tasks,
  activities,
  onToggleTask,
  onOpenAddTask,
  onViewAllTasks,
  onViewEmployees,
  onViewProjects,
  onViewCalendar,
  currentUser,
}) => {
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [sendingWhatsApp, setSendingWhatsApp] = useState<string | null>(null);
  const [sentWhatsApp, setSentWhatsApp] = useState<string | null>(null);

  const handleTriggerWhatsAppAlert = async (
    e: React.MouseEvent,
    title: string,
    project: string,
    date: string,
    isOverdue: boolean
  ) => {
    e.stopPropagation();
    const key = `${project}-${title}`;
    setSendingWhatsApp(key);
    try {
      await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: isOverdue ? 'overdue_task' : 'upcoming_deadline',
          data: {
            recipientName: currentUser?.fullName || 'Rahul Kumar',
            taskTitle: title,
            projectName: project,
            dueDate: date,
            workspaceName: currentUser?.companyName || 'GEONIXA',
          },
          referenceId: `dash-alert-${key}-${Date.now()}`,
          forceSend: true,
        }),
      });
      setSentWhatsApp(key);
      setTimeout(() => setSentWhatsApp(null), 3500);
    } catch (err) {
      console.error('Failed to trigger WhatsApp deadline alert:', err);
    } finally {
      setSendingWhatsApp(null);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'pending') return !t.completed;
    if (taskFilter === 'completed') return t.completed;
    return true;
  });

  return (
    <div className="space-y-6 font-sans">

      {/* 2. TOP METRICS CARDS BAR (5 Cards Grid - Compact Sleek Design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Total Projects */}
        <div
          onClick={onViewProjects}
          className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-micro hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#EBF0F5] text-[#0F172A] flex items-center justify-center group-hover:bg-[#CBD5E1]/40 transition-colors">
              <FolderIcon className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-[#64748B] group-hover:text-[#0F172A] transition-colors">
                Total Projects
              </span>
              <span className="text-[11px] font-bold text-[#CBD5E1]">→</span>
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-[#0F172A] mb-0.5">
              {stats.projectsTotal || 6}
            </div>
            <div className="text-[10.5px] font-bold text-[#334155] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span>{stats.projectsActive || 2} Active</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Tasks */}
        <div
          onClick={onViewAllTasks}
          className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-micro hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#EBF0F5] text-[#0F172A] flex items-center justify-center group-hover:bg-[#CBD5E1]/40 transition-colors">
              <CheckSquareIcon className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-[#64748B] group-hover:text-[#0F172A] transition-colors">
                Total Tasks
              </span>
              <span className="text-[11px] font-bold text-[#CBD5E1]">→</span>
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-[#0F172A] mb-0.5">
              {stats.todosTotal || 120}
            </div>
            <div className="text-[10.5px] font-bold text-[#334155] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
              <span>{stats.todosInProgress || 35} In Progress</span>
            </div>
          </div>
        </div>

        {/* Card 3: Due Soon */}
        <div
          onClick={onViewCalendar}
          className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-micro hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#EBF0F5] text-[#0F172A] flex items-center justify-center group-hover:bg-[#CBD5E1]/40 transition-colors">
              <ClockIcon className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-[#64748B] group-hover:text-[#0F172A] transition-colors">
                Due Soon
              </span>
              <span className="text-[11px] font-bold text-[#CBD5E1]">→</span>
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-[#0F172A] mb-0.5">
              {stats.dueSoon || 8}
            </div>
            <div className="text-[10.5px] font-bold text-[#334155] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
              <span>This Week</span>
            </div>
          </div>
        </div>

        {/* Card 4: Team Online */}
        <div
          onClick={onViewEmployees}
          className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-micro hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#EBF0F5] text-[#0F172A] flex items-center justify-center group-hover:bg-[#CBD5E1]/40 transition-colors">
              <UsersIcon className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-[#64748B] group-hover:text-[#0F172A] transition-colors">
                Team Online
              </span>
              <span className="text-[11px] font-bold text-[#CBD5E1]">→</span>
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-[#0F172A] mb-0.5">
              {stats.teamOnline || 7}
            </div>
            <div className="text-[10.5px] font-bold text-[#334155] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span>Active Now</span>
            </div>
          </div>
        </div>

        {/* Card 5: Overdue Tasks */}
        <div className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-micro hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#EBF0F5] text-[#0F172A] flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-[#64748B]">Overdue Tasks</span>
              <span className="text-[11px] font-bold text-[#CBD5E1]">→</span>
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-[#0F172A] mb-0.5">15</div>
            <div className="text-[10.5px] font-bold text-[#EF4444] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
              <span>Needs Attention</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD GRID (Split Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS */}
        <div className="lg:col-span-2 space-y-6">
          {/* ROW 1 CARDS: Project Progress & Upcoming Deadlines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Project Progress */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-micro flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-[#0F172A] text-base">Project Progress</h3>
                <button
                  onClick={onViewProjects}
                  className="text-xs font-bold text-[#0B192C] hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 py-2">
                {/* SVG Donut Chart */}
                <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-[#EBF0F5]"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#10B981]"
                      strokeDasharray="68, 100"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[#2563EB]"
                      strokeDasharray="25, 100"
                      strokeDashoffset="-68"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute text-center leading-tight">
                    <div className="text-xl font-black text-[#0F172A]">68%</div>
                    <div className="text-[10px] font-bold text-[#64748B]">Overall Progress</div>
                  </div>
                </div>

                {/* Legend List */}
                <div className="space-y-2 text-xs font-semibold text-[#334155] flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                      <span>Completed</span>
                    </div>
                    <span className="font-bold text-[#0F172A]">4</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                      <span>In Progress</span>
                    </div>
                    <span className="font-bold text-[#0F172A]">2</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#CBD5E1]" />
                      <span>Not Started</span>
                    </div>
                    <span className="font-bold text-[#0F172A]">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                      <span>On Hold</span>
                    </div>
                    <span className="font-bold text-[#0F172A]">0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Upcoming Deadlines */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-micro flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-[#0F172A] text-base">Upcoming Deadlines</h3>
                <button
                  type="button"
                  onClick={onViewCalendar}
                  className="text-xs font-bold text-[#0B192C] hover:underline cursor-pointer"
                >
                  View Calendar
                </button>
              </div>

              <div className="space-y-2.5">
                {/* Deadline Item 1 */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F1F3F6]/70 border border-[#E2E8F0]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#0B192C] text-white font-extrabold text-[11px] flex flex-col items-center justify-center leading-none shrink-0">
                      <span>10</span>
                      <span className="text-[9px] uppercase mt-0.5">Oct</span>
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#0F172A]">Mobile App v2</div>
                      <div className="text-[11px] text-[#64748B] font-medium">UI Design Review</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleTriggerWhatsAppAlert(e, 'UI Design Review', 'Mobile App v2', '2026-10-10', true)}
                      title="Dispatch WhatsApp Alert"
                      className="p-1.5 rounded-lg text-[#10B981] hover:bg-[#ECFDF5] transition-colors cursor-pointer"
                    >
                      {sentWhatsApp === 'Mobile App v2-UI Design Review' ? (
                        <span className="text-[10px] font-black text-[#10B981]">✓ Sent</span>
                      ) : (
                        <WhatsAppIcon className={`w-3.5 h-3.5 ${sendingWhatsApp === 'Mobile App v2-UI Design Review' ? 'animate-pulse' : ''}`} />
                      )}
                    </button>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#EF4444] border border-[#EF4444]/20">
                      Overdue
                    </span>
                  </div>
                </div>

                {/* Deadline Item 2 */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F1F3F6]/70 border border-[#E2E8F0]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#EBF0F5] text-[#0F172A] font-extrabold text-[11px] flex flex-col items-center justify-center leading-none shrink-0 border border-[#E2E8F0]">
                      <span>12</span>
                      <span className="text-[9px] uppercase mt-0.5">Oct</span>
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#0F172A]">Marketing Campaign Q4</div>
                      <div className="text-[11px] text-[#64748B] font-medium">Content Finalization</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleTriggerWhatsAppAlert(e, 'Content Finalization', 'Marketing Campaign Q4', '2026-10-12', false)}
                      title="Dispatch WhatsApp Alert"
                      className="p-1.5 rounded-lg text-[#10B981] hover:bg-[#ECFDF5] transition-colors cursor-pointer"
                    >
                      {sentWhatsApp === 'Marketing Campaign Q4-Content Finalization' ? (
                        <span className="text-[10px] font-black text-[#10B981]">✓ Sent</span>
                      ) : (
                        <WhatsAppIcon className={`w-3.5 h-3.5 ${sendingWhatsApp === 'Marketing Campaign Q4-Content Finalization' ? 'animate-pulse' : ''}`} />
                      )}
                    </button>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#F59E0B] border border-[#F59E0B]/20">
                      2 days left
                    </span>
                  </div>
                </div>

                {/* Deadline Item 3 */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F1F3F6]/70 border border-[#E2E8F0]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#EBF0F5] text-[#0F172A] font-extrabold text-[11px] flex flex-col items-center justify-center leading-none shrink-0 border border-[#E2E8F0]">
                      <span>15</span>
                      <span className="text-[9px] uppercase mt-0.5">Oct</span>
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#0F172A]">E-Commerce Website</div>
                      <div className="text-[11px] text-[#64748B] font-medium">Backend Development</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleTriggerWhatsAppAlert(e, 'Backend Development', 'E-Commerce Website', '2026-10-15', false)}
                      title="Dispatch WhatsApp Alert"
                      className="p-1.5 rounded-lg text-[#10B981] hover:bg-[#ECFDF5] transition-colors cursor-pointer"
                    >
                      {sentWhatsApp === 'E-Commerce Website-Backend Development' ? (
                        <span className="text-[10px] font-black text-[#10B981]">✓ Sent</span>
                      ) : (
                        <WhatsAppIcon className={`w-3.5 h-3.5 ${sendingWhatsApp === 'E-Commerce Website-Backend Development' ? 'animate-pulse' : ''}`} />
                      )}
                    </button>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#F59E0B] border border-[#F59E0B]/20">
                      5 days left
                    </span>
                  </div>
                </div>

                {/* Deadline Item 4 */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F1F3F6]/70 border border-[#E2E8F0]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#EBF0F5] text-[#0F172A] font-extrabold text-[11px] flex flex-col items-center justify-center leading-none shrink-0 border border-[#E2E8F0]">
                      <span>18</span>
                      <span className="text-[9px] uppercase mt-0.5">Oct</span>
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#0F172A]">Design homepage</div>
                      <div className="text-[11px] text-[#64748B] font-medium">Client Presentation</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleTriggerWhatsAppAlert(e, 'Client Presentation', 'Design homepage', '2026-10-18', false)}
                      title="Dispatch WhatsApp Alert"
                      className="p-1.5 rounded-lg text-[#10B981] hover:bg-[#ECFDF5] transition-colors cursor-pointer"
                    >
                      {sentWhatsApp === 'Design homepage-Client Presentation' ? (
                        <span className="text-[10px] font-black text-[#10B981]">✓ Sent</span>
                      ) : (
                        <WhatsAppIcon className={`w-3.5 h-3.5 ${sendingWhatsApp === 'Design homepage-Client Presentation' ? 'animate-pulse' : ''}`} />
                      )}
                    </button>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/20">
                      8 days left
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2 CARDS: Top Projects & Task Status / Team Workload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 3: Top Projects Table */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-micro">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-[#0F172A] text-base">Top Projects</h3>
                <button
                  onClick={onViewProjects}
                  className="text-xs font-bold text-[#0B192C] hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="text-[10px] font-bold text-[#64748B] uppercase border-b border-[#E2E8F0] pb-2">
                      <th className="pb-2 font-bold whitespace-nowrap pr-3">Project Name</th>
                      <th className="pb-2 font-bold whitespace-nowrap pr-3">Progress</th>
                      <th className="pb-2 font-bold whitespace-nowrap pr-3">Due Date</th>
                      <th className="pb-2 font-bold text-right whitespace-nowrap pl-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] font-medium text-[#334155]">
                    {/* Row 1 */}
                    <tr className="hover:bg-[#EBF0F5] transition-colors">
                      <td className="py-2.5 font-bold text-[#0F172A] whitespace-nowrap pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-[#EBF0F5] text-[#0F172A] flex items-center justify-center shrink-0">
                            <FolderIcon className="w-3.5 h-3.5 text-[#0F172A]" />
                          </div>
                          <span className="truncate max-w-[125px]">E-Commerce Website</span>
                        </div>
                      </td>
                      <td className="py-2.5 whitespace-nowrap pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#EBF0F5] rounded-full h-1.5 overflow-hidden shrink-0">
                            <div className="bg-[#0B192C] h-full rounded-full" style={{ width: '68%' }} />
                          </div>
                          <span className="text-[10px] font-bold text-[#64748B]">68%</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-[11px] text-[#64748B] font-semibold whitespace-nowrap pr-3">Oct 30, 2026</td>
                      <td className="py-2.5 text-right whitespace-nowrap pl-2">
                        <span className="inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981] border border-[#10B981]/20 whitespace-nowrap">
                          Active
                        </span>
                      </td>
                    </tr>

                    {/* Row 2 */}
                    <tr className="hover:bg-[#EBF0F5] transition-colors">
                      <td className="py-2.5 font-bold text-[#0F172A] whitespace-nowrap pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-[#EBF0F5] text-[#0F172A] flex items-center justify-center shrink-0">
                            <FolderIcon className="w-3.5 h-3.5 text-[#0F172A]" />
                          </div>
                          <span className="truncate max-w-[125px]">Mobile App v2</span>
                        </div>
                      </td>
                      <td className="py-2.5 whitespace-nowrap pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#EBF0F5] rounded-full h-1.5 overflow-hidden shrink-0">
                            <div className="bg-[#0B192C] h-full rounded-full" style={{ width: '45%' }} />
                          </div>
                          <span className="text-[10px] font-bold text-[#64748B]">45%</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-[11px] text-[#64748B] font-semibold whitespace-nowrap pr-3">Nov 15, 2026</td>
                      <td className="py-2.5 text-right whitespace-nowrap pl-2">
                        <span className="inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981] border border-[#10B981]/20 whitespace-nowrap">
                          Active
                        </span>
                      </td>
                    </tr>

                    {/* Row 3 */}
                    <tr className="hover:bg-[#EBF0F5] transition-colors">
                      <td className="py-2.5 font-bold text-[#0F172A] whitespace-nowrap pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-[#EBF0F5] text-[#0F172A] flex items-center justify-center shrink-0">
                            <FolderIcon className="w-3.5 h-3.5 text-[#0F172A]" />
                          </div>
                          <span className="truncate max-w-[125px]">Marketing Campaign Q4</span>
                        </div>
                      </td>
                      <td className="py-2.5 whitespace-nowrap pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#EBF0F5] rounded-full h-1.5 overflow-hidden shrink-0">
                            <div className="bg-[#0B192C] h-full rounded-full" style={{ width: '82%' }} />
                          </div>
                          <span className="text-[10px] font-bold text-[#64748B]">82%</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-[11px] text-[#64748B] font-semibold whitespace-nowrap pr-3">Oct 25, 2026</td>
                      <td className="py-2.5 text-right whitespace-nowrap pl-2">
                        <span className="inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981] border border-[#10B981]/20 whitespace-nowrap">
                          Active
                        </span>
                      </td>
                    </tr>

                    {/* Row 4 */}
                    <tr className="hover:bg-[#EBF0F5] transition-colors">
                      <td className="py-2.5 font-bold text-[#0F172A] whitespace-nowrap pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-[#EBF0F5] text-[#0F172A] flex items-center justify-center shrink-0">
                            <FolderIcon className="w-3.5 h-3.5 text-[#0F172A]" />
                          </div>
                          <span className="truncate max-w-[125px]">HR Management System</span>
                        </div>
                      </td>
                      <td className="py-2.5 whitespace-nowrap pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#EBF0F5] rounded-full h-1.5 overflow-hidden shrink-0">
                            <div className="bg-[#CBD5E1] h-full rounded-full" style={{ width: '32%' }} />
                          </div>
                          <span className="text-[10px] font-bold text-[#64748B]">32%</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-[11px] text-[#64748B] font-semibold whitespace-nowrap pr-3">Nov 10, 2026</td>
                      <td className="py-2.5 text-right whitespace-nowrap pl-2">
                        <span className="inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#F59E0B] border border-[#F59E0B]/20 whitespace-nowrap">
                          On Hold
                        </span>
                      </td>
                    </tr>

                    {/* Row 5 */}
                    <tr className="hover:bg-[#EBF0F5] transition-colors">
                      <td className="py-2.5 font-bold text-[#0F172A] whitespace-nowrap pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-[#EBF0F5] text-[#0F172A] flex items-center justify-center shrink-0">
                            <FolderIcon className="w-3.5 h-3.5 text-[#0F172A]" />
                          </div>
                          <span className="truncate max-w-[125px]">Cloud Migration</span>
                        </div>
                      </td>
                      <td className="py-2.5 whitespace-nowrap pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-[#EBF0F5] rounded-full h-1.5 overflow-hidden shrink-0">
                            <div className="bg-[#0B192C] h-full rounded-full" style={{ width: '60%' }} />
                          </div>
                          <span className="text-[10px] font-bold text-[#64748B]">60%</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-[11px] text-[#64748B] font-semibold whitespace-nowrap pr-3">Dec 05, 2026</td>
                      <td className="py-2.5 text-right whitespace-nowrap pl-2">
                        <span className="inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981] border border-[#10B981]/20 whitespace-nowrap">
                          Active
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card 4: Task Status & Team Workload */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-micro space-y-5">
              {/* Task Status */}
              <div>
                <h3 className="font-extrabold text-[#0F172A] text-base mb-3">Task Status</h3>
                <div className="flex items-center justify-between gap-3">
                  {/* SVG Donut */}
                  <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-[#EBF0F5]"
                        strokeWidth="4"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-[#10B981]"
                        strokeDasharray="43, 100"
                        strokeWidth="4"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-[#2563EB]"
                        strokeDasharray="29, 100"
                        strokeDashoffset="-43"
                        strokeWidth="4"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute text-center leading-tight">
                      <div className="text-base font-black text-[#0F172A]">120</div>
                      <div className="text-[9px] font-bold text-[#64748B]">Total Tasks</div>
                    </div>
                  </div>

                  {/* Legend list */}
                  <div className="space-y-1.5 text-xs font-semibold text-[#334155] flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                        <span>Completed</span>
                      </div>
                      <span className="font-bold text-[#0F172A]">52</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                        <span>In Progress</span>
                      </div>
                      <span className="font-bold text-[#0F172A]">35</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                        <span>Pending</span>
                      </div>
                      <span className="font-bold text-[#0F172A]">18</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                        <span>Overdue</span>
                      </div>
                      <span className="font-bold text-[#0F172A]">15</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Workload */}
              <div className="pt-3 border-t border-[#E2E8F0]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-xs text-[#0F172A] uppercase tracking-wider">Team Workload</h4>
                  <button
                    onClick={onViewEmployees}
                    className="text-[11px] font-bold text-[#0B192C] hover:underline cursor-pointer"
                  >
                    View Team
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Member 1 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="w-6 h-6 rounded-full bg-[#0B192C] text-white font-extrabold text-[10px] flex items-center justify-center">
                        R
                      </div>
                      <div>
                        <div className="font-bold text-[#0F172A] text-[11px] leading-tight">Raju</div>
                        <div className="text-[9px] text-[#64748B] font-medium">Project Manager</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                      <span className="text-[10px] font-medium text-[#64748B] whitespace-nowrap">12 tasks</span>
                      <div className="w-full bg-[#EBF0F5] rounded-full h-1.5 overflow-hidden">
                        <div className="bg-[#0B192C] h-full rounded-full" style={{ width: '80%' }} />
                      </div>
                      <span className="text-[10px] font-bold text-[#334155]">80%</span>
                    </div>
                  </div>

                  {/* Member 2 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="w-6 h-6 rounded-full bg-[#15293F] text-white font-extrabold text-[10px] flex items-center justify-center">
                        M
                      </div>
                      <div>
                        <div className="font-bold text-[#0F172A] text-[11px] leading-tight">Muni</div>
                        <div className="text-[9px] text-[#64748B] font-medium">Developer</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                      <span className="text-[10px] font-medium text-[#64748B] whitespace-nowrap">10 tasks</span>
                      <div className="w-full bg-[#EBF0F5] rounded-full h-1.5 overflow-hidden">
                        <div className="bg-[#0B192C] h-full rounded-full" style={{ width: '60%' }} />
                      </div>
                      <span className="text-[10px] font-bold text-[#334155]">60%</span>
                    </div>
                  </div>

                  {/* Member 3 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="w-6 h-6 rounded-full bg-[#334155] text-white font-extrabold text-[10px] flex items-center justify-center">
                        P
                      </div>
                      <div>
                        <div className="font-bold text-[#0F172A] text-[11px] leading-tight">Priya</div>
                        <div className="text-[9px] text-[#64748B] font-medium">Designer</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                      <span className="text-[10px] font-medium text-[#64748B] whitespace-nowrap">8 tasks</span>
                      <div className="w-full bg-[#EBF0F5] rounded-full h-1.5 overflow-hidden">
                        <div className="bg-[#0B192C] h-full rounded-full" style={{ width: '45%' }} />
                      </div>
                      <span className="text-[10px] font-bold text-[#334155]">45%</span>
                    </div>
                  </div>

                  {/* Member 4 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="w-6 h-6 rounded-full bg-[#64748B] text-white font-extrabold text-[10px] flex items-center justify-center">
                        S
                      </div>
                      <div>
                        <div className="font-bold text-[#0F172A] text-[11px] leading-tight">Suresh</div>
                        <div className="text-[9px] text-[#64748B] font-medium">Tester</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                      <span className="text-[10px] font-medium text-[#64748B] whitespace-nowrap">6 tasks</span>
                      <div className="w-full bg-[#EBF0F5] rounded-full h-1.5 overflow-hidden">
                        <div className="bg-[#0B192C] h-full rounded-full" style={{ width: '30%' }} />
                      </div>
                      <span className="text-[10px] font-bold text-[#334155]">30%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (1 SPAN): My Tasks & Recent Activity */}
        <div className="space-y-6">
          {/* Card 5: My Tasks Widget */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-micro space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-[#0F172A] text-base">My Tasks</h3>
              <button
                onClick={onViewAllTasks}
                className="text-xs font-bold text-[#0B192C] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-white border border-[#E2E8F0] p-1 rounded-xl text-xs font-bold shadow-2xs">
              <button
                onClick={() => setTaskFilter('all')}
                className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
                  taskFilter === 'all'
                    ? 'bg-[#0B192C] text-white shadow-2xs font-extrabold'
                    : 'bg-white text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTaskFilter('pending')}
                className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
                  taskFilter === 'pending'
                    ? 'bg-[#0B192C] text-white shadow-2xs font-extrabold'
                    : 'bg-white text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setTaskFilter('completed')}
                className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
                  taskFilter === 'completed'
                    ? 'bg-[#0B192C] text-white shadow-2xs font-extrabold'
                    : 'bg-white text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                }`}
              >
                Completed
              </button>
            </div>

            {/* Task Checklist Items */}
            <div className="space-y-2.5">
              {filteredTasks.slice(0, 5).map((task, index) => {
                const priority = task.priority || (index === 0 ? 'high' : index < 3 ? 'medium' : 'low');
                let prioBadge = 'bg-[#F0FDFA] text-[#0D9488] border-[#0D9488]/20';
                let prioLabel = 'Low';

                if (priority === 'high') {
                  prioBadge = 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]/20';
                  prioLabel = 'High';
                } else if (priority === 'medium') {
                  prioBadge = 'bg-[#FFFBEB] text-[#F59E0B] border-[#F59E0B]/20';
                  prioLabel = 'Medium';
                }

                const dueDateStr = task.dueDate || 'Oct 14, 2026';

                return (
                  <div
                    key={task.id}
                    onClick={() => onToggleTask(task.id)}
                    className="p-3 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#EBF0F5] transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          task.completed
                            ? 'bg-[#10B981] border-[#10B981] text-white'
                            : 'border-[#CBD5E1] group-hover:border-[#0B192C] bg-white'
                        }`}
                      >
                        {task.completed && (
                          <svg className="w-3 h-3 stroke-current" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div
                          className={`text-xs font-bold truncate transition-colors ${
                            task.completed ? 'line-through text-[#64748B]' : 'text-[#0F172A] group-hover:text-[#334155]'
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="text-[10px] font-medium text-[#64748B] truncate mt-0.5">
                          {task.project}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-semibold text-[#64748B] hidden sm:inline flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3 text-[#CBD5E1] inline" />
                        <span>{dueDateStr}</span>
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${prioBadge}`}>
                        {prioLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 6: Recent Activity Widget */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-micro space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-[#0F172A] text-base">Recent Activity</h3>
              <button className="text-xs font-bold text-[#0B192C] hover:underline cursor-pointer">
                View All
              </button>
            </div>

            <div className="space-y-3.5">
              {activities.slice(0, 5).map((act) => (
                <div key={act.id} className="flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full ${act.avatarBg} font-extrabold flex items-center justify-center shrink-0 shadow-2xs text-xs mt-0.5`}
                    >
                      {act.userAvatar}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[#334155] leading-snug break-words">
                        <span className="font-bold text-[#0F172A]">{act.userName}</span>{' '}
                        <span className="text-[#64748B]">{act.action}</span>{' '}
                        <span className="font-semibold text-[#0F172A]">"{act.target}"</span>
                      </div>
                      <div className="text-[10px] font-medium text-[#64748B] mt-0.5">
                        {act.timeAgo}
                      </div>
                    </div>
                  </div>
                  <span className="text-[#CBD5E1] shrink-0 mt-1">
                    {act.action.includes('completed') ? (
                      <CheckSquareIcon className="w-4 h-4 text-[#10B981]" />
                    ) : act.action.includes('comment') ? (
                      <ChatIcon className="w-4 h-4 text-[#2563EB]" />
                    ) : act.action.includes('file') || act.action.includes('uploaded') ? (
                      <FileIcon className="w-4 h-4 text-[#F59E0B]" />
                    ) : (
                      <FolderIcon className="w-4 h-4 text-[#334155]" />
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
