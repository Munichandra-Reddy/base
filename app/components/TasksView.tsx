'use client';

import React, { useState } from 'react';
import { Task } from '@/lib/types';
import { PlusIcon, CheckSquareIcon } from './Icons';

interface TasksViewProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onOpenAddTask: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ tasks, onToggleTask, onOpenAddTask }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTasks = tasks.filter((t) => {
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
    <div className="space-y-7 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-7 rounded-2xl border border-[#E2E8F0] shadow-micro">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F172A]">My Tasks & To-Dos</h1>
          <p className="text-[#64748B] text-base font-medium mt-1">
            Track, filter, and complete assigned tasks across all active Basecamp projects.
          </p>
        </div>
        <button
          onClick={onOpenAddTask}
          className="px-5 py-3 bg-[#0B192C] hover:bg-[#15293F] active:bg-[#0B192C] text-white font-bold text-base rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white p-4.5 rounded-2xl border border-[#E2E8F0] shadow-micro">
        <div className="flex items-center gap-1.5 bg-white border border-[#E2E8F0] p-1.5 rounded-xl shadow-2xs">
          {(['all', 'pending', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-[#0B192C] text-white shadow-xs font-extrabold'
                  : 'bg-white text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Filter tasks by name or project..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-base text-[#0F172A] font-medium focus:outline-none focus:ring-2 focus:ring-[#0B192C] w-full sm:w-72"
        />
      </div>

      {/* Tasks List Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-micro">
        <div className="divide-y divide-[#E2E8F0]">
          {filteredTasks.length === 0 ? (
            <div className="p-14 text-center text-[#64748B]">
              <CheckSquareIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-base font-semibold">No tasks found matching your filter criteria.</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onToggleTask(task.id)}
                className="flex items-center justify-between p-5 hover:bg-[#EBF0F5] transition-colors cursor-pointer gap-4"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                      task.completed
                        ? 'bg-[#10B981] border-[#10B981] text-white'
                        : 'border-[#CBD5E1] hover:border-[#0B192C] bg-white'
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
                      className={`text-lg font-bold transition-colors truncate ${
                        task.completed ? 'line-through text-[#64748B]' : 'text-[#0F172A]'
                      }`}
                    >
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs font-semibold text-[#64748B] mt-1">
                      <span>Due {task.dueDate || 'Soon'}</span>
                      <span>•</span>
                      <span>Assigned to {task.assignedTo}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {task.priority && (
                    <span
                      className={`w-20 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wider inline-flex items-center justify-center text-center ${
                        task.priority === 'high'
                          ? 'bg-[#FEF2F2] text-[#EF4444] border border-[#EF4444]/20'
                          : task.priority === 'medium'
                          ? 'bg-[#FFFBEB] text-[#F59E0B] border border-[#F59E0B]/20'
                          : 'bg-[#F0FDFA] text-[#0D9488] border border-[#0D9488]/20'
                      }`}
                    >
                      {task.priority}
                    </span>
                  )}
                  <span className="w-44 py-1.5 px-3 rounded-lg text-xs font-bold bg-[#EBF0F5] text-[#334155] border border-[#E2E8F0] inline-flex items-center justify-center text-center truncate">
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
