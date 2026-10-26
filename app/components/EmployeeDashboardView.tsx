'use client';

import React, { useState } from 'react';
import { Task, Project, Activity, Person } from '@/lib/types';
import {
  CheckSquareIcon,
  ClockIcon,
  FolderIcon,
  ChatIcon,
  CheckCircleIcon,
  CalendarIcon,
  PlusIcon,
  UsersIcon,
} from './Icons';

interface EmployeeDashboardViewProps {
  tasks: Task[];
  projects: Project[];
  activities: Activity[];
  people?: Person[];
  currentUser?: { email: string; fullName: string; companyName: string } | null;
  onToggleTask: (id: string) => void;
  onAddTask: (taskData: { title: string; project: string; assignedTo?: string; priority?: 'low' | 'medium' | 'high'; dueDate?: string }) => void;
  onViewProjects: () => void;
  onViewTasks: () => void;
  onViewChat: () => void;
  onViewCalendar: () => void;
  onViewCheckins: () => void;
}

export const EmployeeDashboardView: React.FC<EmployeeDashboardViewProps> = ({
  tasks,
  projects,
  activities,
  people = [],
  currentUser,
  onToggleTask,
  onAddTask,
  onViewProjects,
  onViewTasks,
  onViewChat,
  onViewCalendar,
  onViewCheckins,
}) => {
  const employeeName = currentUser?.fullName || 'Priya Sharma';
  const employeeEmail = currentUser?.email || 'priya@abctech.com';

  // Work Status Toggle
  const [workStatus, setWorkStatus] = useState<'available' | 'focus' | 'meeting' | 'away'>('available');
  const [newQuickTaskTitle, setNewQuickTaskTitle] = useState('');
  const [newQuickTaskProject, setNewQuickTaskProject] = useState('E-Commerce Website');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  // Filter tasks belonging to this employee
  const myTasks = tasks.filter((t) => {
    if (!t.assignedTo) return false;
    const assigned = t.assignedTo.toLowerCase();
    const current = employeeName.toLowerCase();
    return assigned.includes(current) || current.includes(assigned) || assigned === 'you';
  });

  // Fallback to sample tasks if this user has none assigned yet
  const displayedTasks = myTasks.length > 0 ? myTasks : tasks.slice(0, 5);

  const myPendingTasks = displayedTasks.filter((t) => !t.completed);
  const myCompletedTasks = displayedTasks.filter((t) => t.completed);

  // Filter projects belonging to this employee
  const myProjects = projects.filter((p) => {
    if (!p.members || p.members.length === 0) return true;
    return p.members.some((m) => m.toLowerCase().includes(employeeName.toLowerCase()) || employeeName.toLowerCase().includes(m.toLowerCase()));
  });
  const displayedProjects = myProjects.length > 0 ? myProjects : projects.slice(0, 3);

  // Filter tasks based on selected filter tab
  const filteredTaskList = displayedTasks.filter((t) => {
    if (taskFilter === 'pending') return !t.completed;
    if (taskFilter === 'completed') return t.completed;
    return true;
  });

  const handleCreateQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuickTaskTitle.trim()) return;
    onAddTask({
      title: newQuickTaskTitle.trim(),
      project: newQuickTaskProject,
      assignedTo: employeeName,
      priority: 'medium',
      dueDate: new Date().toISOString().split('T')[0],
    });
    setNewQuickTaskTitle('');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. PERSONAL HERO BANNER & STATUS CONTROLS */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-micro flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#011826] text-white font-black text-2xl flex items-center justify-center shadow-xs shrink-0">
            {employeeName[0]?.toUpperCase() || 'P'}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-light text-[#222222] tracking-tight">
                Welcome back, {employeeName}!
              </h1>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#F0FDF4] text-[#238823] border border-[#238823]/20">
                Product Designer
              </span>
            </div>
            <p className="text-xs font-semibold text-[#595959] mt-1">
              You have <strong className="text-[#222222]">{myPendingTasks.length} pending tasks</strong> across <strong className="text-[#222222]">{displayedProjects.length} active projects</strong> today.
            </p>
          </div>
        </div>

        {/* Status Toggle & Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Work Status Selector */}
          <div className="flex items-center bg-[#F4F6F8] p-1 rounded-xl border border-[#E5E5E5] text-xs font-bold">
            <button
              onClick={() => setWorkStatus('available')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                workStatus === 'available' ? 'bg-white text-[#222222] shadow-xs' : 'text-[#595959] hover:text-[#222222]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#6CC04A] animate-pulse" />
              <span>Available</span>
            </button>
            <button
              onClick={() => setWorkStatus('focus')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                workStatus === 'focus' ? 'bg-[#011826] text-white shadow-xs' : 'text-[#595959] hover:text-[#222222]'
              }`}
            >
              <span>Focus</span>
            </button>
            <button
              onClick={() => setWorkStatus('meeting')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                workStatus === 'meeting' ? 'bg-white text-[#222222] shadow-xs' : 'text-[#595959] hover:text-[#222222]'
              }`}
            >
              <span>Meeting</span>
            </button>
          </div>

          {/* Quick Check-in Button */}
          <button
            onClick={onViewCheckins}
            className="px-4 py-2 bg-[#049FD9] hover:bg-[#004BAF] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Daily Check-in</span>
          </button>
        </div>
      </div>

      {/* 2. EMPLOYEE PERSONAL KPI METRICS (5 Compact Cards Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 w-full">
        {/* Card 1: My Open Tasks */}
        <div
          onClick={onViewTasks}
          className="bg-white p-2.5 rounded-xl border border-[#E2E8F0] shadow-2xs hover:shadow-micro hover:border-emerald-200 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-50 via-emerald-100/60 to-teal-100/70 text-emerald-600 border border-emerald-200/70 shadow-xs flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_4px_12px_rgba(16,185,129,0.25)] transition-all duration-300">
              <CheckSquareIcon className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-[#64748B] group-hover:text-emerald-600 transition-colors whitespace-nowrap">
                My Tasks
              </span>
              <span className="text-[10px] font-bold text-[#CBD5E1] group-hover:text-emerald-600 transition-all">→</span>
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-[#0F172A] leading-tight">
              {displayedTasks.length}
            </div>
            <div className="text-[9.5px] font-semibold text-[#334155] flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" />
              <span>{myPendingTasks.length} In Progress</span>
            </div>
          </div>
        </div>

        {/* Card 2: Due Soon / Today */}
        <div
          onClick={onViewCalendar}
          className="bg-white p-2.5 rounded-xl border border-[#E2E8F0] shadow-2xs hover:shadow-micro hover:border-amber-200 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-50 via-amber-100/60 to-orange-100/70 text-amber-600 border border-amber-200/70 shadow-xs flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_4px_12px_rgba(245,158,11,0.25)] transition-all duration-300">
              <ClockIcon className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-[#64748B] group-hover:text-amber-600 transition-colors whitespace-nowrap">
                Due Soon
              </span>
              <span className="text-[10px] font-bold text-[#CBD5E1] group-hover:text-amber-600 transition-all">→</span>
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-[#0F172A] leading-tight">
              {myPendingTasks.slice(0, 2).length}
            </div>
            <div className="text-[9.5px] font-semibold text-[#F59E0B] flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shrink-0" />
              <span>Needs Attention</span>
            </div>
          </div>
        </div>

        {/* Card 3: Finished This Week */}
        <div
          onClick={onViewTasks}
          className="bg-white p-2.5 rounded-xl border border-[#E2E8F0] shadow-2xs hover:shadow-micro hover:border-indigo-200 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-50 via-indigo-100/60 to-violet-100/70 text-indigo-600 border border-indigo-200/70 shadow-xs flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_4px_12px_rgba(99,102,241,0.25)] transition-all duration-300">
              <CheckCircleIcon className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-[#64748B] group-hover:text-indigo-600 transition-colors whitespace-nowrap">
                Finished
              </span>
              <span className="text-[10px] font-bold text-[#CBD5E1] group-hover:text-indigo-600 transition-all">→</span>
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-[#0F172A] leading-tight">
              {myCompletedTasks.length + 8}
            </div>
            <div className="text-[9.5px] font-semibold text-[#10B981] flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0" />
              <span>Great Velocity</span>
            </div>
          </div>
        </div>

        {/* Card 4: My Active Projects */}
        <div
          onClick={onViewProjects}
          className="bg-white p-2.5 rounded-xl border border-[#E2E8F0] shadow-2xs hover:shadow-micro hover:border-purple-200 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-50 via-purple-100/60 to-fuchsia-100/70 text-purple-600 border border-purple-200/70 shadow-xs flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_4px_12px_rgba(168,85,247,0.25)] transition-all duration-300">
              <FolderIcon className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-[#64748B] group-hover:text-purple-600 transition-colors whitespace-nowrap">
                My Projects
              </span>
              <span className="text-[10px] font-bold text-[#CBD5E1] group-hover:text-purple-600 transition-all">→</span>
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-[#0F172A] leading-tight">
              {displayedProjects.length}
            </div>
            <div className="text-[9.5px] font-semibold text-[#334155] flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] shrink-0" />
              <span>Active Contributor</span>
            </div>
          </div>
        </div>

        {/* Card 5: Campfire Mentions */}
        <div
          onClick={onViewChat}
          className="bg-white p-2.5 rounded-xl border border-[#E2E8F0] shadow-2xs hover:shadow-micro hover:border-sky-200 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-50 via-blue-100/60 to-cyan-100/70 text-sky-600 border border-sky-200/70 shadow-xs flex items-center justify-center group-hover:scale-110 group-hover:shadow-[0_4px_12px_rgba(14,165,233,0.25)] transition-all duration-300">
              <ChatIcon className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-[#64748B] group-hover:text-sky-600 transition-colors whitespace-nowrap">
                Campfire
              </span>
              <span className="text-[10px] font-bold text-[#CBD5E1] group-hover:text-sky-600 transition-all">→</span>
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-[#0F172A] leading-tight">
              3
            </div>
            <div className="text-[9.5px] font-semibold text-[#0284C7] flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7] shrink-0" />
              <span>New Mentions</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSTATION (Split 2-Column + 1-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Today's Focus & Interactive To-Do Checklist */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-micro space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-lg font-extrabold text-[#0F172A]">My Focus Today & Tasks</h3>
                <p className="text-xs text-[#64748B] font-medium">Click any checkbox to complete or update status instantly.</p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-[#F1F3F6] p-1 rounded-xl border border-[#E2E8F0] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setTaskFilter('pending')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    taskFilter === 'pending' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Pending ({myPendingTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    taskFilter === 'all' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  All ({displayedTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('completed')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    taskFilter === 'completed' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Completed ({myCompletedTasks.length})
                </button>
              </div>
            </div>

            {/* In-Place Quick Add Personal Task */}
            <form onSubmit={handleCreateQuickTask} className="flex items-center gap-2">
              <input
                type="text"
                value={newQuickTaskTitle}
                onChange={(e) => setNewQuickTaskTitle(e.target.value)}
                placeholder="+ Add personal to-do for today and press Enter..."
                className="flex-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-4 py-2.5 text-xs text-[#0F172A] placeholder:text-[#94A3B8] font-medium focus:outline-none focus:border-[#0B192C]"
              />
              <select
                value={newQuickTaskProject}
                onChange={(e) => setNewQuickTaskProject(e.target.value)}
                className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2.5 text-xs text-[#0F172A] font-semibold focus:outline-none"
              >
                {displayedProjects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#6CC04A] hover:bg-[#5bb33b] text-white text-xs font-semibold rounded-lg shrink-0 cursor-pointer transition-colors"
              >
                Add Task
              </button>
            </form>

            {/* Task Item List */}
            <div className="space-y-2.5">
              {filteredTaskList.length === 0 ? (
                <div className="text-center py-8 text-[#64748B] text-xs font-semibold bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0]">
                  All tasks completed in this view! Enjoy your productive day.
                </div>
              ) : (
                filteredTaskList.map((task) => {
                  const priority = task.priority || 'medium';
                  const priorityBadge =
                    priority === 'high'
                      ? 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]/20'
                      : priority === 'medium'
                      ? 'bg-[#FFFBEB] text-[#F59E0B] border-[#F59E0B]/20'
                      : 'bg-[#F0FDFA] text-[#0D9488] border-[#0D9488]/20';

                  return (
                    <div
                      key={task.id}
                      onClick={() => onToggleTask(task.id)}
                      className="p-3.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                            task.completed
                              ? 'bg-[#6CC04A] border-[#6CC04A] text-white'
                              : 'border-[#CCCCCC] group-hover:border-[#011826] bg-white'
                          }`}
                        >
                          {task.completed && (
                            <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4
                            className={`text-xs font-bold truncate transition-colors ${
                              task.completed ? 'line-through text-[#94A3B8]' : 'text-[#0F172A]'
                            }`}
                          >
                            {task.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] font-semibold text-[#64748B] mt-0.5">
                            <span>Due {task.dueDate || 'Today'}</span>
                            <span>•</span>
                            <span>{task.project}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${priorityBadge}`}>
                          {priority}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Card 2: My Projects & Active Sprint Deliverables */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-micro space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-lg font-extrabold text-[#0F172A]">My Active Projects</h3>
                <p className="text-xs text-[#64748B] font-medium">Projects you are actively contributing to in this workspace.</p>
              </div>
              <button
                onClick={onViewProjects}
                className="text-xs font-bold text-[#0B192C] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={onViewProjects}
                  className="p-4 rounded-xl border border-[#E5E5E5] bg-white hover:border-[#049FD9] hover:shadow-xs transition-all cursor-pointer space-y-3 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-extrabold text-xs text-[#222222] group-hover:underline">
                      {project.name}
                    </h4>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#F0FDF4] text-[#238823] border border-[#238823]/20 uppercase">
                      {project.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#595959] font-medium line-clamp-2">
                    {project.description || 'Sprint deliverables and active milestone tracking.'}
                  </p>

                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-[#595959] mb-1">
                      <span>Sprint Progress</span>
                      <span className="text-[#222222]">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-[#F4F6F8] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#049FD9] h-full rounded-full transition-all duration-500"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT 1 COLUMN */}
        <div className="space-y-6">
          {/* Card 3: Today's Schedule & Meetings */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-micro space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h3 className="font-extrabold text-[#0F172A] text-base">Today's Schedule</h3>
              <button onClick={onViewCalendar} className="text-xs font-bold text-[#0B192C] hover:underline cursor-pointer">
                Calendar
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0B192C] text-white flex flex-col items-center justify-center font-bold text-[10px] shrink-0">
                  <span>10:00</span>
                  <span className="text-[8px] uppercase">AM</span>
                </div>
                <div>
                  <h5 className="font-extrabold text-[#0F172A]">Sprint Daily Standup</h5>
                  <p className="text-[10px] text-[#64748B] font-medium mt-0.5">Campfire Audio & Video Room</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#E2E8F0] text-[#0F172A] flex flex-col items-center justify-center font-bold text-[10px] shrink-0">
                  <span>02:30</span>
                  <span className="text-[8px] uppercase">PM</span>
                </div>
                <div>
                  <h5 className="font-extrabold text-[#0F172A]">UI / UX Design Review</h5>
                  <p className="text-[10px] text-[#64748B] font-medium mt-0.5">E-Commerce Website wireframes</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#E2E8F0] text-[#0F172A] flex flex-col items-center justify-center font-bold text-[10px] shrink-0">
                  <span>05:00</span>
                  <span className="text-[8px] uppercase">PM</span>
                </div>
                <div>
                  <h5 className="font-extrabold text-[#0F172A]">Daily Check-in Due</h5>
                  <p className="text-[10px] text-[#64748B] font-medium mt-0.5">Automated prompt in #checkins</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: My Project Collaborators (Online) */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-micro space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h3 className="font-extrabold text-[#0F172A] text-base">Project Squad</h3>
              <button onClick={onViewChat} className="text-xs font-bold text-[#0B192C] hover:underline cursor-pointer">
                Campfire
              </button>
            </div>

            <div className="space-y-3">
              {people && people.length > 0 ? (
                people.slice(0, 4).map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full ${member.avatarBg || 'bg-slate-800 text-white'} flex items-center justify-center font-black text-xs shrink-0`}>
                        {member.avatar}
                      </div>
                      <div>
                        <div className="font-bold text-[#0F172A] leading-tight">{member.name}</div>
                        <div className="text-[10px] text-[#64748B] font-medium">{member.role}</div>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-[#10B981] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#10B981]/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                      Online
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-[11px] text-[#64748B] bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0]">
                  No other employees registered yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
