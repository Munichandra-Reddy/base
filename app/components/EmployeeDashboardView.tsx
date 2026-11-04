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
  onViewEmployees?: () => void;
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
  onViewEmployees,
}) => {
  const employeeName = currentUser?.fullName || 'Priya Sharma';
  const employeeEmail = currentUser?.email || 'priya@abctech.com';

  const totalEmployeesCount = people?.length ?? 0;
  const activeEmployeesCount = people?.filter((p) => p.status === 'active').length ?? totalEmployeesCount;

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
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#222222] tracking-tight">
            Welcome back, {employeeName}!
          </h1>
          <p className="text-xs font-medium text-[#595959] mt-1">
            You have <strong className="text-[#222222] font-semibold">{myPendingTasks.length} pending tasks</strong> across <strong className="text-[#222222] font-semibold">{displayedProjects.length} active projects</strong> today.
          </p>
        </div>

        {/* Status Toggle & Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Work Status Selector */}
          <div className="flex items-center bg-[#F4F6F8] p-1 rounded-xl border border-[#E5E5E5] text-xs font-medium">
            <button
              onClick={() => setWorkStatus('available')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                workStatus === 'available' ? 'bg-white text-[#222222] shadow-2xs font-semibold' : 'text-[#595959] hover:text-[#222222]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
              <span>Available</span>
            </button>
            <button
              onClick={() => setWorkStatus('focus')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                workStatus === 'focus' ? 'bg-[#011826] text-white shadow-2xs font-semibold' : 'text-[#595959] hover:text-[#222222]'
              }`}
            >
              <span>Focus</span>
            </button>
            <button
              onClick={() => setWorkStatus('meeting')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                workStatus === 'meeting' ? 'bg-white text-[#222222] shadow-2xs font-semibold' : 'text-[#595959] hover:text-[#222222]'
              }`}
            >
              <span>Meeting</span>
            </button>
          </div>

          {/* Quick Check-in Button */}
          <button
            onClick={onViewCheckins}
            className="px-4 py-2 bg-[#049FD9] hover:bg-[#004BAF] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Daily Check-in</span>
          </button>
        </div>
      </div>

      {/* 2. EMPLOYEE PERSONAL KPI METRICS (6 Compact Cards Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 w-full">
        {/* Card 1: My Open Tasks */}
        <div
          onClick={onViewTasks}
          className="bg-white p-3 rounded-xl border border-[#E5E5E5] shadow-2xs hover:border-[#049FD9] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#595959] group-hover:text-[#222222] transition-colors truncate">
              My Tasks
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#F4F6F8] text-[#049FD9] border border-[#E5E5E5] flex items-center justify-center shrink-0">
              <CheckSquareIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#222222] leading-tight">
              {displayedTasks.length}
            </div>
            <div className="text-[11px] font-medium text-[#595959] mt-0.5 truncate">
              {myPendingTasks.length} in progress
            </div>
          </div>
        </div>

        {/* Card 2: Due Soon / Today */}
        <div
          onClick={onViewCalendar}
          className="bg-white p-3 rounded-xl border border-[#E5E5E5] shadow-2xs hover:border-[#049FD9] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#595959] group-hover:text-[#222222] transition-colors truncate">
              Due Soon
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#F4F6F8] text-[#D97706] border border-[#E5E5E5] flex items-center justify-center shrink-0">
              <ClockIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#222222] leading-tight">
              {myPendingTasks.slice(0, 2).length}
            </div>
            <div className="text-[11px] font-medium text-[#595959] mt-0.5 truncate">
              pending review
            </div>
          </div>
        </div>

        {/* Card 3: Finished This Week */}
        <div
          onClick={onViewTasks}
          className="bg-white p-3 rounded-xl border border-[#E5E5E5] shadow-2xs hover:border-[#049FD9] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#595959] group-hover:text-[#222222] transition-colors truncate">
              Finished
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#F4F6F8] text-[#16A34A] border border-[#E5E5E5] flex items-center justify-center shrink-0">
              <CheckCircleIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#222222] leading-tight">
              {myCompletedTasks.length}
            </div>
            <div className="text-[11px] font-medium text-[#595959] mt-0.5 truncate">
              completed
            </div>
          </div>
        </div>

        {/* Card 4: My Active Projects */}
        <div
          onClick={onViewProjects}
          className="bg-white p-3 rounded-xl border border-[#E5E5E5] shadow-2xs hover:border-[#049FD9] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#595959] group-hover:text-[#222222] transition-colors truncate">
              My Projects
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#F4F6F8] text-[#049FD9] border border-[#E5E5E5] flex items-center justify-center shrink-0">
              <FolderIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#222222] leading-tight">
              {displayedProjects.length}
            </div>
            <div className="text-[11px] font-medium text-[#595959] mt-0.5 truncate">
              active projects
            </div>
          </div>
        </div>

        {/* Card 5: Campfire Mentions */}
        <div
          onClick={onViewChat}
          className="bg-white p-3 rounded-xl border border-[#E5E5E5] shadow-2xs hover:border-[#049FD9] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#595959] group-hover:text-[#222222] transition-colors truncate">
              Campfire
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#F4F6F8] text-[#049FD9] border border-[#E5E5E5] flex items-center justify-center shrink-0">
              <ChatIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#222222] leading-tight">
              3
            </div>
            <div className="text-[11px] font-medium text-[#595959] mt-0.5 truncate">
              new messages
            </div>
          </div>
        </div>

        {/* Card 6: Total Employees */}
        <div
          onClick={onViewEmployees}
          className="bg-white p-3 rounded-xl border border-[#E5E5E5] shadow-2xs hover:border-[#049FD9] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#595959] group-hover:text-[#222222] transition-colors truncate">
              Employees
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#F4F6F8] text-[#049FD9] border border-[#E5E5E5] flex items-center justify-center shrink-0">
              <UsersIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#222222] leading-tight">
              {totalEmployeesCount}
            </div>
            <div className="text-[11px] font-medium text-[#595959] mt-0.5 truncate">
              {activeEmployeesCount} active
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSTATION (Split 2-Column + 1-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Today's Focus & Interactive To-Do Checklist */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E5]">
              <div>
                <h3 className="text-base font-bold text-[#222222]">My Focus Today & Tasks</h3>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-[#F4F6F8] p-1 rounded-xl border border-[#E5E5E5] text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setTaskFilter('pending')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    taskFilter === 'pending' ? 'bg-white text-[#222222] shadow-2xs font-semibold' : 'text-[#595959] hover:text-[#222222]'
                  }`}
                >
                  Pending ({myPendingTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    taskFilter === 'all' ? 'bg-white text-[#222222] shadow-2xs font-semibold' : 'text-[#595959] hover:text-[#222222]'
                  }`}
                >
                  All ({displayedTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('completed')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    taskFilter === 'completed' ? 'bg-white text-[#222222] shadow-2xs font-semibold' : 'text-[#595959] hover:text-[#222222]'
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
                className="flex-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-4 py-2.5 text-xs text-[#0F172A] placeholder:text-[#94A3B8] font-medium focus:outline-none focus:border-[#049FD9]"
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
                className="px-4 py-2.5 bg-[#011826] hover:bg-[#082236] text-white text-xs font-semibold rounded-lg shrink-0 cursor-pointer transition-colors"
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
                      className="p-3.5 rounded-xl border border-[#E5E5E5] bg-white hover:bg-[#F8FAFC] transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            task.completed
                              ? 'bg-[#049FD9] border-[#049FD9] text-white'
                              : 'border-[#CCCCCC] group-hover:border-[#049FD9] bg-white'
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
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
              <div>
                <h3 className="text-sm font-semibold text-[#111827]">My Active Projects</h3>
                <p className="text-xs text-[#595959] font-normal">Projects you are actively contributing to in this workspace.</p>
              </div>
              <button
                onClick={onViewProjects}
                className="text-xs font-medium text-[#049FD9] hover:text-[#004BAF] hover:underline cursor-pointer"
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
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
              <h3 className="font-semibold text-[#222222] text-sm">Today's Schedule</h3>
              <button onClick={onViewCalendar} className="text-xs font-medium text-[#049FD9] hover:underline cursor-pointer">
                Calendar
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[#F4F6F8] border border-[#E5E5E5] flex items-start gap-3">
                <div className="w-10 h-10 rounded-md bg-[#011826] text-white flex flex-col items-center justify-center font-bold text-[10px] shrink-0 shadow-2xs">
                  <span>10:00</span>
                  <span className="text-[8px] uppercase">AM</span>
                </div>
                <div>
                  <h5 className="font-semibold text-[#111827]">Sprint Daily Standup</h5>
                  <p className="text-[10px] text-[#595959] font-normal mt-0.5">Campfire Audio & Video Room</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#F4F6F8] border border-[#E5E5E5] flex items-start gap-3">
                <div className="w-10 h-10 rounded-md bg-white border border-[#E5E5E5] text-[#111827] flex flex-col items-center justify-center font-bold text-[10px] shrink-0">
                  <span>02:30</span>
                  <span className="text-[8px] uppercase">PM</span>
                </div>
                <div>
                  <h5 className="font-semibold text-[#111827]">UI / UX Design Review</h5>
                  <p className="text-[10px] text-[#595959] font-normal mt-0.5">E-Commerce Website wireframes</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#F4F6F8] border border-[#E5E5E5] flex items-start gap-3">
                <div className="w-10 h-10 rounded-md bg-white border border-[#E5E5E5] text-[#111827] flex flex-col items-center justify-center font-bold text-[10px] shrink-0">
                  <span>05:00</span>
                  <span className="text-[8px] uppercase">PM</span>
                </div>
                <div>
                  <h5 className="font-semibold text-[#111827]">Daily Check-in Due</h5>
                  <p className="text-[10px] text-[#595959] font-normal mt-0.5">Automated prompt in #checkins</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: My Project Collaborators (Online) */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[#111827] text-sm">Project Squad</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F4F6F8] text-[#595959] border border-[#E5E5E5]">
                  {totalEmployeesCount}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {onViewEmployees && (
                  <button onClick={onViewEmployees} className="text-xs font-medium text-[#049FD9] hover:underline cursor-pointer">
                    View All ({totalEmployeesCount})
                  </button>
                )}
                <button onClick={onViewChat} className="text-xs font-medium text-[#049FD9] hover:underline cursor-pointer">
                  Campfire
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {people && people.length > 0 ? (
                people.map((member) => (
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
