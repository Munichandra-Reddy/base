'use client';

import React from 'react';
import { Task, Activity, WorkspaceStats } from '@/lib/types';
import { FolderIcon, CheckSquareIcon, ClockIcon, UsersIcon, PlusIcon } from './Icons';

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
  const userName = currentUser?.fullName || 'rahul';

  return (
    <div className="space-y-7">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-8 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">Good day, {userName}!</h1>
            <p className="text-blue-100 text-base font-medium">
              Here is what is happening across your workspace today.
            </p>
          </div>
          <button
            onClick={onOpenAddTask}
            className="px-6 py-3 bg-white text-blue-600 font-bold text-base rounded-full shadow-md hover:bg-blue-50 transition-all flex items-center justify-center gap-2 self-start md:self-auto cursor-pointer"
          >
            <PlusIcon className="w-5 h-5 text-blue-600 shrink-0" />
            <span>Add New Task</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* PROJECTS - Clickable to navigate to Projects view */}
        <div
          onClick={onViewProjects}
          className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div>
            <div className="text-xs font-black text-slate-400 tracking-wider uppercase mb-1 group-hover:text-blue-700 transition-colors">
              PROJECTS
            </div>
            <div className="text-4xl font-black text-slate-900 mb-1">{stats.projectsTotal}</div>
            <div className="text-sm font-bold text-emerald-600 flex items-center gap-1">
              <span>{stats.projectsActive} Active</span>
            </div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <FolderIcon className="w-7 h-7" />
          </div>
        </div>

        {/* TO-DOS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="text-xs font-black text-slate-400 tracking-wider uppercase mb-1">
              TO-DOS
            </div>
            <div className="text-4xl font-black text-slate-900 mb-1">{stats.todosTotal}</div>
            <div className="text-sm font-bold text-blue-600">{stats.todosInProgress} In Progress</div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <CheckSquareIcon className="w-7 h-7" />
          </div>
        </div>

        {/* DUE SOON */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="text-xs font-black text-slate-400 tracking-wider uppercase mb-1">
              DUE SOON
            </div>
            <div className="text-4xl font-black text-amber-600 mb-1">{stats.dueSoon}</div>
            <div className="text-sm font-bold text-amber-600">This Week</div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ClockIcon className="w-7 h-7" />
          </div>
        </div>

        {/* TEAM ONLINE - Clickable to navigate to Employees */}
        <div
          onClick={onViewEmployees}
          className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div>
            <div className="text-xs font-black text-slate-400 tracking-wider uppercase mb-1 group-hover:text-emerald-700 transition-colors">
              TEAM ONLINE
            </div>
            <div className="text-4xl font-black text-emerald-600 mb-1">{stats.teamOnline}</div>
            <div className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active Now</span>
            </div>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
            <UsersIcon className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Main Two-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: My Work / My To-dos (2 spans) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-7 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">My Work / My To-dos</h2>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                Tasks assigned specifically to you across all active projects.
              </p>
            </div>
            <button
              onClick={onViewAllTasks}
              className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
            >
              <span>View All Tasks</span>
              <span>↗</span>
            </button>
          </div>

          {/* Task Items List */}
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onToggleTask(task.id)}
                className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      task.completed
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 group-hover:border-blue-500 bg-white'
                    }`}
                  >
                    {task.completed && (
                      <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-base font-semibold transition-colors ${
                      task.completed ? 'line-through text-slate-400' : 'text-slate-900 group-hover:text-blue-600'
                    }`}
                  >
                    {task.title}
                  </span>
                </div>

                <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/70">
                  {task.project}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-7 shadow-xs">
          <h2 className="text-xl font-bold text-slate-900 mb-5">Recent Activity</h2>
          <div className="space-y-4.5">
            {activities.map((act) => (
              <div key={act.id} className="flex items-start gap-3.5 text-sm">
                <div
                  className={`w-9 h-9 rounded-full ${act.avatarBg} font-extrabold flex items-center justify-center shrink-0 shadow-xs text-base`}
                >
                  {act.userAvatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-slate-800 leading-snug break-words [overflow-wrap:anywhere]">
                    <span className="font-bold text-slate-900">{act.userName}</span>{' '}
                    <span className="text-slate-500">{act.action}</span>{' '}
                    <span className="font-semibold text-slate-800 break-all">"{act.target}"</span>
                  </div>
                  <div className="text-xs font-medium text-slate-400 mt-1">{act.timeAgo}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
