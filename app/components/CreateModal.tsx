'use client';

import React, { useState } from 'react';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (title: string, project: string) => void;
  onAddProject: (name: string, description: string) => void;
  onAddEmployee?: (name: string, email: string, role?: string) => void;
}

export const CreateModal: React.FC<CreateModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  onAddProject,
  onAddEmployee,
}) => {
  const [activeType, setActiveType] = useState<'task' | 'project'>('task');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskProject, setTaskProject] = useState('E-Commerce Website');
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeType === 'task') {
      if (!taskTitle.trim()) return;
      onAddTask(taskTitle, taskProject);
      setTaskTitle('');
    } else if (activeType === 'project') {
      if (!projectName.trim()) return;
      onAddProject(projectName, projectDesc);
      setProjectName('');
      setProjectDesc('');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Create New</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg">
            ✕
          </button>
        </div>

        <div className="p-2 bg-slate-50 border-b border-slate-100 flex gap-1">
          <button
            onClick={() => setActiveType('task')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeType === 'task' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
            }`}
          >
            New Task
          </button>
          <button
            onClick={() => setActiveType('project')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeType === 'project' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
            }`}
          >
            New Project
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {activeType === 'task' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design homepage hero banner"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Project Space</label>
                <select
                  value={taskProject}
                  onChange={(e) => setTaskProject(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="E-Commerce Website">E-Commerce Website</option>
                  <option value="Mobile App v2">Mobile App v2</option>
                  <option value="Marketing Campaign">Marketing Campaign</option>
                  <option value="Customer Portal">Customer Portal</option>
                  <option value="Internal Ops">Internal Ops</option>
                </select>
              </div>
            </>
          )}

          {activeType === 'project' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Customer Service Agent"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Project scope and goals..."
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs"
            >
              Create {activeType === 'task' ? 'Task' : 'Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
