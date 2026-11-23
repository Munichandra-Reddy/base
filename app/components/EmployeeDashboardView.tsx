'use client';

import React, { useState } from 'react';
import { Task, Project, Activity, Person } from '@/lib/types';
import {
  isTaskOverdue,
  isTaskDueSoon,
  isPersonOnline,
  calculateProjectProgress,
  isTaskAssignedToEmployee,
  isEmployeeInProject,
} from '@/lib/dashboardCalculations';
import {
  CheckSquareIcon,
  ClockIcon,
  FolderIcon,
  ChatIcon,
  CheckCircleIcon,
  UsersIcon,
  AlertCircleIcon,
} from './Icons';

interface EmployeeDashboardViewProps {
  tasks: Task[];
  projects: Project[];
  activities: Activity[];
  people?: Person[];
  currentUser?: { email: string; fullName: string; companyName: string } | null;
  onToggleTask: (id: string) => void;
  onAddTask: (taskData: {
    title: string;
    project: string;
    assignedTo?: string;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string;
  }) => void;
  onViewProjects: () => void;
  onSelectProject?: (projectId: string) => void;
  onViewTasks: () => void;
  onViewChat: () => void;
  onViewCalendar: () => void;
  onViewCheckins?: () => void;
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
  onSelectProject,
  onViewTasks,
  onViewChat,
  onViewCalendar,
  onViewCheckins,
  onViewEmployees,
}) => {
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  const totalEmployeesCount = people?.length ?? 0;

  // ==========================================
  // REAL-TIME FIRESTORE DATA FOR CURRENT EMPLOYEE
  // Filter tasks strictly belonging to currently authenticated employee
  // ==========================================
  const myTasks = tasks.filter((t) => isTaskAssignedToEmployee(t, currentUser));

  const myTotalTasks = myTasks.length;
  const myPendingTasks = myTasks.filter(
    (t) => (t.status || 'pending') === 'pending' && !t.completed && t.status !== 'completed'
  );
  const myInProgressTasks = myTasks.filter((t) => t.status === 'in_progress');
  const myInReviewTasks = myTasks.filter((t) => t.status === 'in_review');
  const myChangesRequestedTasks = myTasks.filter((t) => t.status === 'changes_requested');
  const myCompletedTasks = myTasks.filter((t) => t.status === 'completed' || t.completed);
  const myOverdueTasks = myTasks.filter((t) => isTaskOverdue(t));
  const myDueSoonTasks = myTasks.filter((t) => isTaskDueSoon(t));

  // Filter projects belonging to this employee (strictly authorized projects)
  const myProjects = projects.filter((p) => isEmployeeInProject(p, currentUser, myTasks));

  // Filter tasks based on selected filter tab
  const filteredTaskList = myTasks.filter((t) => {
    if (taskFilter === 'pending') return !t.completed && t.status !== 'completed';
    if (taskFilter === 'completed') return t.completed || t.status === 'completed';
    return true;
  });

  return (
    <div className="space-y-6 font-sans w-full">
      {/* EMPLOYEE PERSONAL KPI METRICS (6 Dynamic Task Cards Grid: Responsive 1-2 Mobile, 2-3 Tablet, 6 Desktop) */}
      <div className="grid grid-cols-1 min-[340px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3 lg:gap-4 w-full">
        {/* Card 1: My Tasks */}
        <div
          onClick={onViewTasks}
          className="bg-white p-3 rounded-[4px] border border-[#E5E5E5] shadow-2xs hover:border-[#049FD9] transition-all cursor-pointer group flex flex-col justify-between min-h-[82px]"
        >
          <div className="flex items-center justify-between mb-2 gap-1.5">
            <span className="text-xs font-semibold text-[#595959] group-hover:text-[#222222] transition-colors truncate">
              My Tasks
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#F4F6F8] text-[#049FD9] border border-[#E5E5E5] flex items-center justify-center shrink-0">
              <CheckSquareIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#222222] leading-tight">
              {myTotalTasks}
            </div>
            <div className="text-[11px] font-medium text-[#595959] mt-0.5 truncate">
              {myInProgressTasks.length} in progress
            </div>
          </div>
        </div>

        {/* Card 2: Pending Tasks */}
        <div
          onClick={onViewTasks}
          className="bg-white p-3 rounded-[4px] border border-[#E5E5E5] shadow-2xs hover:border-[#049FD9] transition-all cursor-pointer group flex flex-col justify-between min-h-[82px]"
        >
          <div className="flex items-center justify-between mb-2 gap-1.5">
            <span className="text-xs font-semibold text-[#595959] group-hover:text-[#222222] transition-colors truncate">
              Pending
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] flex items-center justify-center shrink-0">
              <ClockIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#222222] leading-tight">
              {myPendingTasks.length}
            </div>
            <div className="text-[11px] font-medium text-[#595959] mt-0.5 truncate">
              ready to start
            </div>
          </div>
        </div>

        {/* Card 3: In Progress Tasks */}
        <div
          onClick={onViewTasks}
          className="bg-white p-3 rounded-[4px] border border-[#E5E5E5] shadow-2xs hover:border-[#049FD9] transition-all cursor-pointer group flex flex-col justify-between min-h-[82px]"
        >
          <div className="flex items-center justify-between mb-2 gap-1.5">
            <span className="text-xs font-semibold text-[#595959] group-hover:text-[#222222] transition-colors truncate">
              In Progress
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] flex items-center justify-center shrink-0">
              <CheckSquareIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#222222] leading-tight">
              {myInProgressTasks.length}
            </div>
            <div className="text-[11px] font-medium text-[#595959] mt-0.5 truncate">
              active work
            </div>
          </div>
        </div>

        {/* Card 4: In Review / Changes Requested */}
        <div
          onClick={onViewTasks}
          className={`bg-white p-3 rounded-[4px] border shadow-2xs transition-all cursor-pointer group flex flex-col justify-between min-h-[82px] ${
            myChangesRequestedTasks.length > 0
              ? 'border-[#FECDD3] bg-[#FFF1F2]/30'
              : 'border-[#E5E5E5] hover:border-[#049FD9]'
          }`}
        >
          <div className="flex items-center justify-between mb-2 gap-1.5">
            <span
              className={`text-xs font-semibold truncate ${
                myChangesRequestedTasks.length > 0 ? 'text-[#E11D48]' : 'text-[#595959]'
              }`}
            >
              {myChangesRequestedTasks.length > 0 ? 'Changes Needed' : 'In Review'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3] flex items-center justify-center shrink-0">
              <AlertCircleIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#222222] leading-tight">
              {myChangesRequestedTasks.length > 0
                ? myChangesRequestedTasks.length
                : myInReviewTasks.length}
            </div>
            <div className="text-[11px] font-medium text-[#595959] mt-0.5 truncate">
              {myChangesRequestedTasks.length > 0 ? 'revisions required' : 'awaiting approval'}
            </div>
          </div>
        </div>

        {/* Card 5: Completed Tasks */}
        <div
          onClick={onViewTasks}
          className="bg-white p-3 rounded-[4px] border border-[#E5E5E5] shadow-2xs hover:border-[#049FD9] transition-all cursor-pointer group flex flex-col justify-between min-h-[82px]"
        >
          <div className="flex items-center justify-between mb-2 gap-1.5">
            <span className="text-xs font-semibold text-[#595959] group-hover:text-[#222222] transition-colors truncate">
              Completed
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] flex items-center justify-center shrink-0">
              <CheckCircleIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#222222] leading-tight">
              {myCompletedTasks.length}
            </div>
            <div className="text-[11px] font-medium text-[#595959] mt-0.5 truncate">
              100% verified
            </div>
          </div>
        </div>

        {/* Card 6: Overdue Tasks */}
        <div
          onClick={onViewTasks}
          className={`bg-white p-3 rounded-[4px] border shadow-2xs transition-all cursor-pointer group flex flex-col justify-between min-h-[82px] ${
            myOverdueTasks.length > 0
              ? 'border-[#FCA5A5] bg-[#FEF2F2]/30'
              : 'border-[#E5E5E5] hover:border-[#049FD9]'
          }`}
        >
          <div className="flex items-center justify-between mb-2 gap-1.5">
            <span className="text-xs font-semibold text-[#DC2626] truncate">
              Overdue
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] flex items-center justify-center shrink-0">
              <AlertCircleIcon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-[#DC2626] leading-tight">
              {myOverdueTasks.length}
            </div>
            <div className="text-[11px] font-medium text-[#B91C1C] mt-0.5 truncate">
              {myOverdueTasks.length > 0 ? 'deadline passed' : 'all on schedule'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSTATION (Split 2-Column + 1-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 w-full">
        {/* LEFT 2 COLUMNS */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          {/* Card 1: Today's Focus & Interactive To-Do Checklist */}
          <div className="bg-white rounded-[4px] border border-[#E5E5E5] p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E5]">
              <div>
                <h3 className="text-base font-bold text-[#222222]">My Focus Today & Tasks</h3>
              </div>

              {/* Filter Tabs - Horizontally scrollable on mobile */}
              <div className="flex items-center gap-1 bg-[#F4F6F8] p-1 rounded-lg text-xs font-medium overflow-x-auto max-w-full scrollbar-none whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setTaskFilter('pending')}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    taskFilter === 'pending'
                      ? 'bg-white text-[#222222] shadow-2xs font-semibold'
                      : 'text-[#595959] hover:text-[#222222]'
                  }`}
                >
                  Pending ({myPendingTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('all')}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    taskFilter === 'all'
                      ? 'bg-white text-[#222222] shadow-2xs font-semibold'
                      : 'text-[#595959] hover:text-[#222222]'
                  }`}
                >
                  All ({myTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('completed')}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    taskFilter === 'completed'
                      ? 'bg-white text-[#222222] shadow-2xs font-semibold'
                      : 'text-[#595959] hover:text-[#222222]'
                  }`}
                >
                  Completed ({myCompletedTasks.length})
                </button>
              </div>
            </div>

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
                    priority === 'high' || priority === 'critical'
                      ? 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]/20'
                      : priority === 'medium'
                      ? 'bg-[#FFFBEB] text-[#F59E0B] border-[#F59E0B]/20'
                      : 'bg-[#F0FDFA] text-[#0D9488] border-[#0D9488]/20';

                  return (
                    <div
                      key={task.id}
                      onClick={() => onToggleTask(task.id)}
                      className="py-2.5 px-2 rounded-lg hover:bg-[#F8FAFC] transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            task.completed
                              ? 'bg-black border-black text-white'
                              : 'border-[#CCCCCC] group-hover:border-black bg-white'
                          }`}
                        >
                          {task.completed && (
                            <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="3"
                                d="M5 13l4 4L19 7"
                              />
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
                            <span>Due {task.dueDate || 'No deadline'}</span>
                            <span>•</span>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSelectProject) {
                                  const p = projects.find(
                                    (proj) =>
                                      proj.name.toLowerCase().trim() ===
                                      task.project.toLowerCase().trim()
                                  );
                                  onSelectProject(p ? p.id : task.project);
                                } else {
                                  onViewProjects();
                                }
                              }}
                              className="hover:underline hover:text-[#049FD9] cursor-pointer"
                              title={`View ${task.project}`}
                            >
                              {task.project}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${priorityBadge}`}
                        >
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
          <div className="bg-white rounded-[4px] border border-[#E5E5E5] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
              <div>
                <h3 className="text-sm font-semibold text-[#111827]">My Active Projects</h3>
                <p className="text-xs text-[#595959] font-normal">
                  Projects you are actively contributing to in this workspace.
                </p>
              </div>
              <button
                onClick={onViewProjects}
                className="text-xs font-medium text-[#049FD9] hover:text-[#004BAF] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            {myProjects.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-lg border border-dashed border-[#E2E8F0]">
                You are not currently assigned to any active projects.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myProjects.map((project) => {
                  const pCalc = calculateProjectProgress(tasks, project.id, project.name);

                  return (
                    <div
                      key={project.id}
                      onClick={() => {
                        if (onSelectProject) {
                          onSelectProject(project.id);
                        } else {
                          onViewProjects();
                        }
                      }}
                      className="p-4 rounded-[4px] border border-[#E5E5E5] bg-white hover:border-[#049FD9] hover:shadow-xs transition-all cursor-pointer space-y-3 group"
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <h4
                          className="font-extrabold text-xs text-[#222222] group-hover:underline truncate"
                          title={project.name}
                        >
                          {project.name}
                        </h4>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#F0FDF4] text-[#238823] border border-[#238823]/20 uppercase shrink-0">
                          {project.status || 'Active'}
                        </span>
                      </div>

                      <p
                        className="text-[11px] text-[#595959] font-medium truncate cursor-default"
                        title={project.description || 'Sprint deliverables and active milestone tracking.'}
                      >
                        {project.description || 'Sprint deliverables and active milestone tracking.'}
                      </p>

                      <div>
                        <div className="flex items-center justify-between text-[10px] font-bold text-[#595959] mb-1">
                          <span>Sprint Progress</span>
                          <span
                            className="text-[#222222]"
                            title={`${pCalc.completed} / ${pCalc.totalEligible} tasks completed`}
                          >
                            {pCalc.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-[#F4F6F8] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#049FD9] h-full rounded-full transition-all duration-500"
                            style={{ width: `${pCalc.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT 1 COLUMN */}
        <div className="space-y-4 lg:space-y-6">
          {/* Card 3: Today's Schedule & Meetings */}
          <div className="bg-white rounded-[4px] border border-[#E5E5E5] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
              <h3 className="font-semibold text-[#222222] text-sm">Today's Schedule</h3>
              <button
                onClick={onViewCalendar}
                className="text-xs font-medium text-[#049FD9] hover:underline cursor-pointer"
              >
                Calendar
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="py-1 px-1 flex items-start gap-3 rounded-lg hover:bg-[#F8FAFC] transition-colors">
                <div className="w-10 h-10 rounded-lg bg-[#F4F6F8] text-[#111827] flex flex-col items-center justify-center font-bold text-[10px] shrink-0">
                  <span>10:00</span>
                  <span className="text-[8px] uppercase">AM</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="font-semibold text-[#111827] truncate" title="Sprint Daily Standup">
                    Sprint Daily Standup
                  </h5>
                  <p
                    className="text-[10px] text-[#595959] font-normal mt-0.5 truncate"
                    title="Campfire Audio & Video Room"
                  >
                    Campfire Audio & Video Room
                  </p>
                </div>
              </div>

              <div className="py-1 px-1 flex items-start gap-3 rounded-lg hover:bg-[#F8FAFC] transition-colors">
                <div className="w-10 h-10 rounded-lg bg-[#F4F6F8] text-[#111827] flex flex-col items-center justify-center font-bold text-[10px] shrink-0">
                  <span>02:30</span>
                  <span className="text-[8px] uppercase">PM</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="font-semibold text-[#111827] truncate" title="UI / UX Design Review">
                    UI / UX Design Review
                  </h5>
                  <p
                    className="text-[10px] text-[#595959] font-normal mt-0.5 truncate"
                    title="E-Commerce Website wireframes"
                  >
                    E-Commerce Website wireframes
                  </p>
                </div>
              </div>

              <div className="py-1 px-1 flex items-start gap-3 rounded-lg hover:bg-[#F8FAFC] transition-colors">
                <div className="w-10 h-10 rounded-lg bg-[#F4F6F8] text-[#111827] flex flex-col items-center justify-center font-bold text-[10px] shrink-0">
                  <span>05:00</span>
                  <span className="text-[8px] uppercase">PM</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="font-semibold text-[#111827] truncate" title="Daily Sprint Wrap-up">
                    Daily Sprint Wrap-up
                  </h5>
                  <p
                    className="text-[10px] text-[#595959] font-normal mt-0.5 truncate"
                    title="Team sync & milestone progress review"
                  >
                    Team sync & milestone progress review
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Project Squad with Real Online Presence */}
          <div className="bg-white rounded-[4px] border border-[#E5E5E5] p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5] flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[#111827] text-sm">Project Squad</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F4F6F8] text-[#595959] border border-[#E5E5E5]">
                  {totalEmployeesCount}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {onViewEmployees && (
                  <button
                    onClick={onViewEmployees}
                    className="text-xs font-medium text-[#049FD9] hover:underline cursor-pointer"
                  >
                    View All ({totalEmployeesCount})
                  </button>
                )}
                <button
                  onClick={onViewChat}
                  className="text-xs font-medium text-[#049FD9] hover:underline cursor-pointer"
                >
                  Campfire
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {people && people.length > 0 ? (
                people.map((member) => {
                  const online = isPersonOnline(member);

                  return (
                    <div key={member.id} className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-7 h-7 rounded-full ${
                            member.avatarBg || 'bg-slate-800 text-white'
                          } flex items-center justify-center font-black text-xs shrink-0`}
                        >
                          {member.avatar}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className="font-bold text-[#0F172A] leading-tight truncate cursor-default"
                            title={member.name}
                          >
                            {member.name}
                          </div>
                          <div
                            className="text-[10px] text-[#64748B] font-medium truncate cursor-default"
                            title={member.role}
                          >
                            {member.role}
                          </div>
                        </div>
                      </div>

                      {online ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[#10B981] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#10B981]/20 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                          Online
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full border border-[#E2E8F0] shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
                          Offline
                        </span>
                      )}
                    </div>
                  );
                })
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
