'use client';

import React, { useState } from 'react';
import { Task } from '@/lib/types';
import { PlusIcon, CheckSquareIcon } from './Icons';

interface TasksViewProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onOpenAddTask: () => void;
  isAdmin?: boolean;
  currentUser?: { email: string; fullName: string; companyName: string; role?: string } | null;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onToggleTask,
  onOpenAddTask,
  isAdmin = false,
  currentUser,
}) => {
  const [scope, setScope] = useState<'my' | 'all'>('all');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleTaskClick = (task: Task) => {
    if (!isAdmin && task.assignedTo && currentUser?.fullName) {
      const isAssignedToMe =
        task.assignedTo.toLowerCase().includes(currentUser.fullName.toLowerCase()) ||
        currentUser.fullName.toLowerCase().includes(task.assignedTo.toLowerCase());
      if (!isAssignedToMe) {
        alert(`This task is assigned to ${task.assignedTo}. Only the assigned employee or an administrator can update its status.`);
        return;
      }
    }
    onToggleTask(task.id);
  };

  const filteredTasks = tasks.filter((t) => {
    if (!isAdmin && scope === 'my' && currentUser?.fullName) {
      const isMine =
        t.assignedTo &&
        (t.assignedTo.toLowerCase().includes(currentUser.fullName.toLowerCase()) ||
          currentUser.fullName.toLowerCase().includes(t.assignedTo.toLowerCase()));
      if (!isMine) return false;
    }
    if (filter === 'pending' && t.completed) return false;
    if (filter === 'completed' && !t.completed) return false;
    if (searchQuery.trim() !== '') {
      return (
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.project.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 font-sans w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-lg border border-[#E5E5E5] shadow-2xs">
        <div>
          <h1 className="text-xl font-semibold text-[#111827]">My Tasks & To-Dos</h1>
          <p className="text-[#595959] text-xs font-normal mt-0.5">
            Track, filter, and complete assigned tasks across all active Basecamp projects.
          </p>
        </div>
        <button
          onClick={onOpenAddTask}
          className="btn-primary shrink-0 self-start sm:self-auto"
        >
          <PlusIcon className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-3.5 rounded-lg border border-[#E5E5E5] shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          {!isAdmin && (
            <div className="flex items-center gap-1 bg-[#F4F6F8] p-1 rounded-lg text-xs font-medium overflow-x-auto scrollbar-none whitespace-nowrap">
              <button
                type="button"
                onClick={() => setScope('my')}
                className={`px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer whitespace-nowrap ${
                  scope === 'my'
                    ? 'bg-white text-[#111827] shadow-2xs font-semibold'
                    : 'text-[#595959] hover:text-[#111827]'
                }`}
              >
                Assigned to Me
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer whitespace-nowrap ${
                  scope === 'all'
                    ? 'bg-white text-[#111827] shadow-2xs font-semibold'
                    : 'text-[#595959] hover:text-[#111827]'
                }`}
              >
                All Tasks
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 bg-[#F4F6F8] p-1 rounded-lg text-xs font-medium overflow-x-auto scrollbar-none whitespace-nowrap">
            {(['all', 'pending', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-md text-xs capitalize transition-all cursor-pointer whitespace-nowrap ${
                  filter === tab
                    ? 'bg-white text-[#111827] shadow-2xs font-semibold'
                    : 'text-[#595959] hover:text-[#111827]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <input
          type="text"
          placeholder="Filter tasks by name or project..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-[4px] text-xs text-[#111827] font-medium focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] w-full sm:w-72"
        />
      </div>

      {/* Tasks List Table */}
      <div className="bg-white rounded-lg border border-[#E5E5E5] overflow-hidden shadow-2xs">
        <div className="divide-y divide-[#E5E5E5]">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-[#595959]">
              <CheckSquareIcon className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#595959]" />
              <p className="text-xs font-medium">No tasks found matching your filter criteria.</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => handleTaskClick(task)}
                className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-[#F9FAFB] transition-colors cursor-pointer gap-2.5 sm:gap-4"
              >
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                      task.completed
                        ? 'bg-black border-black text-white'
                        : 'border-[#CCCCCC] hover:border-black bg-white'
                    }`}
                  >
                    {task.completed && (
                      <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4
                      className={`text-xs sm:text-sm font-semibold transition-colors truncate ${
                        task.completed ? 'line-through text-[#9CA3AF]' : 'text-[#111827]'
                      }`}
                    >
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-medium text-[#6B7280] mt-0.5 flex-wrap">
                      <span className="whitespace-nowrap">Due {task.dueDate || 'Soon'}</span>
                      <span>•</span>
                      <span className="truncate max-w-[140px] sm:max-w-none">Assigned to {task.assignedTo}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[11px] font-medium border inline-flex items-center justify-center text-center truncate max-w-[120px] sm:max-w-none ${
                      task.priority === 'high'
                        ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FCA5A5]'
                        : task.priority === 'medium'
                        ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                        : task.priority === 'low'
                        ? 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]'
                        : 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]'
                    }`}
                  >
                    {task.project}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
