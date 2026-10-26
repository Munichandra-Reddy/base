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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-7 rounded-2xl border border-[#E5E5E5] shadow-micro">
        <div>
          <h1 className="text-3xl font-light text-[#222222]">My Tasks & To-Dos</h1>
          <p className="text-[#595959] text-base font-medium mt-1">
            Track, filter, and complete assigned tasks across all active Basecamp projects.
          </p>
        </div>
        <button
          onClick={onOpenAddTask}
          className="px-5 py-3 bg-[#6CC04A] hover:bg-[#5bb33b] active:bg-[#4ea230] text-white font-semibold text-base rounded-lg shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white p-4.5 rounded-2xl border border-[#E5E5E5] shadow-micro">
        <div className="flex items-center gap-1.5 bg-white border border-[#E5E5E5] p-1.5 rounded-xl shadow-2xs">
          {(['all', 'pending', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-[#011826] text-white shadow-xs font-extrabold'
                  : 'bg-white text-[#595959] hover:text-[#011826] hover:bg-[#F4F6F8]'
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
          className="px-4 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-sm text-[#222222] font-medium focus:outline-none focus:ring-2 focus:ring-[#049FD9] w-full sm:w-72"
        />
      </div>

      {/* Tasks List Table */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden shadow-micro">
        <div className="divide-y divide-[#E5E5E5]">
          {filteredTasks.length === 0 ? (
            <div className="p-14 text-center text-[#595959]">
              <CheckSquareIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-base font-semibold">No tasks found matching your filter criteria.</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onToggleTask(task.id)}
                className="flex items-center justify-between p-5 hover:bg-[#F4F6F8] transition-colors cursor-pointer gap-4"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                      task.completed
                        ? 'bg-[#6CC04A] border-[#6CC04A] text-white'
                        : 'border-[#CCCCCC] hover:border-[#011826] bg-white'
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
                        task.completed ? 'line-through text-[#595959]' : 'text-[#222222]'
                      }`}
                    >
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs font-semibold text-[#595959] mt-1">
                      <span>Due {task.dueDate || 'Soon'}</span>
                      <span>•</span>
                      <span>Assigned to {task.assignedTo}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`min-w-[130px] max-w-[190px] py-1.5 px-3 rounded-lg text-xs font-bold border inline-flex items-center justify-center text-center truncate transition-colors ${
                      task.priority === 'high'
                        ? 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]/25'
                        : task.priority === 'medium'
                        ? 'bg-[#FFFBEB] text-[#F59E0B] border-[#F59E0B]/25'
                        : task.priority === 'low'
                        ? 'bg-[#F0FDFA] text-[#0D9488] border-[#0D9488]/25'
                        : 'bg-[#F4F6F8] text-[#595959] border-[#E5E5E5]'
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
