'use client';

import React, { useState } from 'react';
import { Task, Activity, WorkspaceStats } from '@/lib/types';
import {
  FolderIcon,
  CheckSquareIcon,
  ClockIcon,
  UsersIcon,
  CalendarIcon,
  PlusIcon,
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
  currentUser,
}) => {
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const rawName = currentUser?.fullName || 'RAJU';
  const displayGreetingName = rawName.toUpperCase();
  const avatarInitial = (rawName[0] || 'R').toUpperCase();

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'pending') return !t.completed;
    if (taskFilter === 'completed') return t.completed;
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* 1. TOP WELCOME BANNER (Monochrome Black/Slate Banner) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-black p-6 sm:p-7 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-1 text-white">
              Good day, {displayGreetingName}!
            </h1>
            <p className="text-slate-300 text-sm sm:text-base font-medium">
              Here is what is happening across your workspace today.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAddTask}
            className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer self-start md:self-auto shrink-0"
          >
            <PlusIcon className="w-4 h-4 text-slate-900 stroke-[3]" />
            <span>Add New Task</span>
          </button>
        </div>
      </div>

      {/* 2. TOP METRICS CARDS BAR (5 Cards Grid Monochrome) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Projects */}
        <div
          onClick={onViewProjects}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
              <FolderIcon className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-400 group-hover:text-slate-900 transition-colors">
                Total Projects
              </span>
              <span className="text-xs font-bold text-slate-300">→</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 mb-0.5">
              {stats.projectsTotal || 6}
            </div>
            <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
              <span>{stats.projectsActive || 2} Active</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Tasks */}
        <div
          onClick={onViewAllTasks}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
              <CheckSquareIcon className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-400 group-hover:text-slate-900 transition-colors">
                Total Tasks
              </span>
              <span className="text-xs font-bold text-slate-300">→</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 mb-0.5">
              {stats.todosTotal || 120}
            </div>
            <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              <span>{stats.todosInProgress || 35} In Progress</span>
            </div>
          </div>
        </div>

        {/* Card 3: Due Soon */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center">
              <ClockIcon className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-400">Due Soon</span>
              <span className="text-xs font-bold text-slate-300">→</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 mb-0.5">
              {stats.dueSoon || 8}
            </div>
            <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
              <span>This Week</span>
            </div>
          </div>
        </div>

        {/* Card 4: Team Online */}
        <div
          onClick={onViewEmployees}
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
              <UsersIcon className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-400 group-hover:text-slate-900 transition-colors">
                Team Online
              </span>
              <span className="text-xs font-bold text-slate-300">→</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 mb-0.5">
              {stats.teamOnline || 7}
            </div>
            <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse" />
              <span>Active Now</span>
            </div>
          </div>
        </div>

        {/* Card 5: Overdue Tasks */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-400">Overdue Tasks</span>
              <span className="text-xs font-bold text-slate-300">→</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 mb-0.5">15</div>
            <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
              <span>Needs Attention</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN DASHBOARD GRID (Split Layout Monochrome) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS */}
        <div className="lg:col-span-2 space-y-6">
          {/* ROW 1 CARDS: Project Progress & Upcoming Deadlines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Project Progress */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-slate-900 text-base">Project Progress</h3>
                <button
                  onClick={onViewProjects}
                  className="text-xs font-bold text-slate-900 hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 py-2">
                {/* SVG Donut Chart */}
                <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-100"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-slate-900"
                      strokeDasharray="68, 100"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-slate-400"
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
                    <div className="text-xl font-black text-slate-900">68%</div>
                    <div className="text-[10px] font-bold text-slate-400">Overall Progress</div>
                  </div>
                </div>

                {/* Legend List */}
                <div className="space-y-2 text-xs font-semibold text-slate-600 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                      <span>Completed</span>
                    </div>
                    <span className="font-bold text-slate-900">4</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                      <span>In Progress</span>
                    </div>
                    <span className="font-bold text-slate-900">2</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                      <span>Not Started</span>
                    </div>
                    <span className="font-bold text-slate-900">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                      <span>On Hold</span>
                    </div>
                    <span className="font-bold text-slate-900">0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Upcoming Deadlines */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-slate-900 text-base">Upcoming Deadlines</h3>
                <button className="text-xs font-bold text-slate-900 hover:underline cursor-pointer">
                  View Calendar
                </button>
              </div>

              <div className="space-y-2.5">
                {/* Deadline Item 1 */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-extrabold text-[11px] flex flex-col items-center justify-center leading-none shrink-0">
                      <span>10</span>
                      <span className="text-[9px] uppercase mt-0.5">Oct</span>
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">Mobile App v2</div>
                      <div className="text-[11px] text-slate-400 font-medium">UI Design Review</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-900">
                    Overdue
                  </span>
                </div>

                {/* Deadline Item 2 */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-900 font-extrabold text-[11px] flex flex-col items-center justify-center leading-none shrink-0">
                      <span>12</span>
                      <span className="text-[9px] uppercase mt-0.5">Oct</span>
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">Marketing Campaign Q4</div>
                      <div className="text-[11px] text-slate-400 font-medium">Content Finalization</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    2 days left
                  </span>
                </div>

                {/* Deadline Item 3 */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-900 font-extrabold text-[11px] flex flex-col items-center justify-center leading-none shrink-0">
                      <span>15</span>
                      <span className="text-[9px] uppercase mt-0.5">Oct</span>
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">E-Commerce Website</div>
                      <div className="text-[11px] text-slate-400 font-medium">Backend Development</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    5 days left
                  </span>
                </div>

                {/* Deadline Item 4 */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-900 font-extrabold text-[11px] flex flex-col items-center justify-center leading-none shrink-0">
                      <span>18</span>
                      <span className="text-[9px] uppercase mt-0.5">Oct</span>
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">Design homepage</div>
                      <div className="text-[11px] text-slate-400 font-medium">Client Presentation</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    8 days left
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2 CARDS: Top Projects & Task Status / Team Workload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 3: Top Projects Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-slate-900 text-base">Top Projects</h3>
                <button
                  onClick={onViewProjects}
                  className="text-xs font-bold text-slate-900 hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 pb-2">
                      <th className="pb-2 font-bold">Project Name</th>
                      <th className="pb-2 font-bold">Progress</th>
                      <th className="pb-2 font-bold">Due Date</th>
                      <th className="pb-2 font-bold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {/* Row 1 */}
                    <tr>
                      <td className="py-2.5 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-100 text-slate-800 flex items-center justify-center text-[10px]">📁</span>
                        <span className="truncate max-w-[110px]">E-Commerce Website</span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-slate-900 h-full rounded-full" style={{ width: '68%' }} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">68%</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-[11px] text-slate-500">Oct 30, 2026</td>
                      <td className="py-2.5 text-right">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-900">
                          Active
                        </span>
                      </td>
                    </tr>

                    {/* Row 2 */}
                    <tr>
                      <td className="py-2.5 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-100 text-slate-800 flex items-center justify-center text-[10px]">📁</span>
                        <span className="truncate max-w-[110px]">Mobile App v2</span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-slate-900 h-full rounded-full" style={{ width: '45%' }} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">45%</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-[11px] text-slate-500">Nov 15, 2026</td>
                      <td className="py-2.5 text-right">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-900">
                          Active
                        </span>
                      </td>
                    </tr>

                    {/* Row 3 */}
                    <tr>
                      <td className="py-2.5 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-100 text-slate-800 flex items-center justify-center text-[10px]">📁</span>
                        <span className="truncate max-w-[110px]">Marketing Campaign Q4</span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-slate-900 h-full rounded-full" style={{ width: '82%' }} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">82%</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-[11px] text-slate-500">Oct 25, 2026</td>
                      <td className="py-2.5 text-right">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-900">
                          Active
                        </span>
                      </td>
                    </tr>

                    {/* Row 4 */}
                    <tr>
                      <td className="py-2.5 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-100 text-slate-800 flex items-center justify-center text-[10px]">📁</span>
                        <span className="truncate max-w-[110px]">HR Management System</span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-slate-500 h-full rounded-full" style={{ width: '32%' }} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">32%</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-[11px] text-slate-500">Nov 10, 2026</td>
                      <td className="py-2.5 text-right">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          On Hold
                        </span>
                      </td>
                    </tr>

                    {/* Row 5 */}
                    <tr>
                      <td className="py-2.5 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-100 text-slate-800 flex items-center justify-center text-[10px]">📁</span>
                        <span className="truncate max-w-[110px]">Cloud Migration</span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-slate-900 h-full rounded-full" style={{ width: '60%' }} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">60%</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-[11px] text-slate-500">Dec 05, 2026</td>
                      <td className="py-2.5 text-right">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-900">
                          Active
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card 4: Task Status & Team Workload */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-5">
              {/* Task Status */}
              <div>
                <h3 className="font-extrabold text-slate-900 text-base mb-3">Task Status</h3>
                <div className="flex items-center justify-between gap-3">
                  {/* SVG Donut */}
                  <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-100"
                        strokeWidth="4"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-slate-900"
                        strokeDasharray="43, 100"
                        strokeWidth="4"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-slate-500"
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
                      <div className="text-base font-black text-slate-900">120</div>
                      <div className="text-[9px] font-bold text-slate-400">Total Tasks</div>
                    </div>
                  </div>

                  {/* Legend list */}
                  <div className="space-y-1.5 text-xs font-semibold text-slate-600 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-900" />
                        <span>Completed</span>
                      </div>
                      <span className="font-bold text-slate-900">52</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-500" />
                        <span>In Progress</span>
                      </div>
                      <span className="font-bold text-slate-900">35</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                        <span>Pending</span>
                      </div>
                      <span className="font-bold text-slate-900">18</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-700" />
                        <span>Overdue</span>
                      </div>
                      <span className="font-bold text-slate-900">15</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Workload */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Team Workload</h4>
                  <button
                    onClick={onViewEmployees}
                    className="text-[11px] font-bold text-slate-900 hover:underline cursor-pointer"
                  >
                    View Team
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Member 1 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-extrabold text-[10px] flex items-center justify-center">
                        R
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-[11px] leading-tight">Raju</div>
                        <div className="text-[9px] text-slate-400 font-medium">Project Manager</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                      <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">12 tasks</span>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-slate-900 h-full rounded-full" style={{ width: '80%' }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600">80%</span>
                    </div>
                  </div>

                  {/* Member 2 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="w-6 h-6 rounded-full bg-slate-700 text-white font-extrabold text-[10px] flex items-center justify-center">
                        M
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-[11px] leading-tight">Muni</div>
                        <div className="text-[9px] text-slate-400 font-medium">Developer</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                      <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">10 tasks</span>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-slate-700 h-full rounded-full" style={{ width: '60%' }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600">60%</span>
                    </div>
                  </div>

                  {/* Member 3 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="w-6 h-6 rounded-full bg-slate-500 text-white font-extrabold text-[10px] flex items-center justify-center">
                        P
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-[11px] leading-tight">Priya</div>
                        <div className="text-[9px] text-slate-400 font-medium">Designer</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                      <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">8 tasks</span>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-slate-500 h-full rounded-full" style={{ width: '45%' }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600">45%</span>
                    </div>
                  </div>

                  {/* Member 4 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="w-6 h-6 rounded-full bg-slate-400 text-white font-extrabold text-[10px] flex items-center justify-center">
                        S
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-[11px] leading-tight">Suresh</div>
                        <div className="text-[9px] text-slate-400 font-medium">Tester</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                      <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">6 tasks</span>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-slate-400 h-full rounded-full" style={{ width: '30%' }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600">30%</span>
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
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">My Tasks</h3>
              <button
                onClick={onViewAllTasks}
                className="text-xs font-bold text-slate-900 hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setTaskFilter('all')}
                className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
                  taskFilter === 'all' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTaskFilter('pending')}
                className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
                  taskFilter === 'pending' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setTaskFilter('completed')}
                className={`flex-1 py-1 rounded-lg transition-all cursor-pointer ${
                  taskFilter === 'completed' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Completed
              </button>
            </div>

            {/* Task Checklist Items */}
            <div className="space-y-2.5">
              {filteredTasks.slice(0, 5).map((task, index) => {
                const priority = task.priority || (index === 0 ? 'high' : index < 3 ? 'medium' : 'low');
                let prioBadge = 'bg-slate-100 text-slate-700 border-slate-200';
                let prioLabel = 'Low';

                if (priority === 'high') {
                  prioBadge = 'bg-slate-900 text-white border-slate-800';
                  prioLabel = 'High';
                } else if (priority === 'medium') {
                  prioBadge = 'bg-slate-200 text-slate-800 border-slate-300';
                  prioLabel = 'Medium';
                }

                const dueDateStr = task.dueDate || 'Oct 14, 2026';

                return (
                  <div
                    key={task.id}
                    onClick={() => onToggleTask(task.id)}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          task.completed
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'border-slate-300 group-hover:border-slate-800 bg-white'
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
                            task.completed ? 'line-through text-slate-400' : 'text-slate-900 group-hover:text-slate-700'
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="text-[10px] font-medium text-slate-400 truncate mt-0.5">
                          {task.project}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">
                        📅 {dueDateStr}
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
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Recent Activity</h3>
              <button className="text-xs font-bold text-slate-900 hover:underline cursor-pointer">
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
                      <div className="text-slate-800 leading-snug break-words">
                        <span className="font-bold text-slate-900">{act.userName}</span>{' '}
                        <span className="text-slate-500">{act.action}</span>{' '}
                        <span className="font-semibold text-slate-800">"{act.target}"</span>
                      </div>
                      <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                        {act.timeAgo}
                      </div>
                    </div>
                  </div>
                  <span className="text-slate-400 text-xs shrink-0 mt-1">
                    {act.action.includes('completed') ? '☑️' : act.action.includes('comment') ? '💬' : act.action.includes('file') || act.action.includes('uploaded') ? '📄' : '📝'}
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
