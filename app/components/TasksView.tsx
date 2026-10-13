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
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-7 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">My Tasks & To-Dos</h1>
          <p className="text-slate-500 text-base font-medium mt-1">
            Track, filter, and complete assigned tasks across all active Basecamp projects.
          </p>
        </div>
        <button
          onClick={onOpenAddTask}
          className="px-5 py-3 bg-slate-900 hover:bg-black text-white font-bold text-base rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl">
          {(['all', 'pending', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                filter === tab ? 'bg-white text-slate-900 shadow-xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
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
          className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 w-full sm:w-72"
        />
      </div>

      {/* Tasks List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="divide-y divide-slate-100">
          {filteredTasks.length === 0 ? (
            <div className="p-14 text-center text-slate-400">
              <CheckSquareIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-base font-semibold">No tasks found matching your filter criteria.</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onToggleTask(task.id)}
                className="flex items-center justify-between p-5 hover:bg-slate-50/70 transition-colors cursor-pointer gap-4"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                      task.completed
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'border-slate-300 hover:border-slate-800 bg-white'
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
                        task.completed ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-400 mt-1">
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
                          ? 'bg-slate-900 text-white'
                          : task.priority === 'medium'
                          ? 'bg-slate-200 text-slate-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {task.priority}
                    </span>
                  )}
                  <span className="w-44 py-1.5 px-3 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 inline-flex items-center justify-center text-center truncate">
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
