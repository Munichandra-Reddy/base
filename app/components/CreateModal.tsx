'use client';

import React, { useState } from 'react';
import { Person, Project } from '@/lib/types';
import { saveFileToDB } from '@/lib/fileUtils';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (taskData: {
    title: string;
    description?: string;
    project: string;
    assignedTo?: string;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string;
  } | string, projectArg?: string) => void;
  onAddProject: (projectData: {
    name: string;
    description: string;
    manager?: string;
    members?: string[];
    deadline?: string;
    requiredDocuments?: string[];
  } | string, descArg?: string) => void;
  people?: Person[];
  projects?: Project[];
  onAddEmployee?: (name: string, email: string, role?: string) => void;
}

const DEFAULT_EMPLOYEES: Person[] = [
  { id: 'usr-1', name: 'Rahul Kumar', role: 'Workspace Admin & Lead Dev', email: 'rahul@abctech.com', status: 'active', avatar: 'R', avatarBg: 'bg-slate-900 text-white', projectsCount: 5 },
  { id: 'usr-2', name: 'Priya Sharma', role: 'Product Designer', email: 'priya@abctech.com', status: 'active', avatar: 'P', avatarBg: 'bg-slate-700 text-white', projectsCount: 3 },
  { id: 'usr-3', name: 'Chandra Reddy', role: 'Backend Lead', email: 'chandra@abctech.com', status: 'active', avatar: 'C', avatarBg: 'bg-slate-800 text-white', projectsCount: 4 },
  { id: 'usr-4', name: 'Ananya Verma', role: 'Frontend Developer', email: 'ananya@abctech.com', status: 'active', avatar: 'A', avatarBg: 'bg-slate-600 text-white', projectsCount: 2 },
  { id: 'usr-5', name: 'Michael Chen', role: 'DevOps Engineer', email: 'michael@abctech.com', status: 'active', avatar: 'M', avatarBg: 'bg-slate-500 text-white', projectsCount: 3 },
  { id: 'usr-6', name: 'Suresh Patel', role: 'QA Lead', email: 'suresh@abctech.com', status: 'active', avatar: 'S', avatarBg: 'bg-slate-800 text-white', projectsCount: 2 },
  { id: 'usr-7', name: 'Muni', role: 'Software Developer', email: 'muni@abctech.com', status: 'active', avatar: 'M', avatarBg: 'bg-slate-900 text-white', projectsCount: 1 },
];

export const CreateModal: React.FC<CreateModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  onAddProject,
  people,
  projects,
}) => {
  const employeeList = (people && people.length > 0) ? people : DEFAULT_EMPLOYEES;
  const projectList = (projects && projects.length > 0) ? projects.map(p => p.name) : [
    'E-Commerce Website',
    'Mobile App v2',
    'Marketing Campaign Q4',
    'Customer Portal',
    'Internal Ops & Automation',
    'Brand Identity Refresh'
  ];

  const [activeType, setActiveType] = useState<'task' | 'project'>('task');

  // Task Form State (Initially Empty)
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskProject, setTaskProject] = useState(projectList[0] || 'E-Commerce Website');
  const [assignedMember, setAssignedMember] = useState('');
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Project Form State (Initially Empty)
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectManager, setProjectManager] = useState('');
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const [projectDeadline, setProjectDeadline] = useState('');
  const [docInputText, setDocInputText] = useState('');
  const [requiredDocs, setRequiredDocs] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    onAddTask({
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      project: taskProject,
      assignedTo: assignedMember.trim() || undefined,
      priority: taskPriority,
      dueDate: taskDueDate || undefined,
    });

    setTaskTitle('');
    setTaskDesc('');
    setAssignedMember('');
    setTaskDueDate('');
    onClose();
  };

  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    let finalDocs = [...requiredDocs];
    if (docInputText.trim() && !finalDocs.includes(docInputText.trim())) {
      finalDocs.push(docInputText.trim());
    }

    onAddProject({
      name: projectName.trim(),
      description: projectDesc.trim(),
      manager: projectManager.trim() || undefined,
      members: projectMembers,
      deadline: projectDeadline || undefined,
      requiredDocuments: finalDocs,
    });

    setProjectName('');
    setProjectDesc('');
    setProjectManager('');
    setProjectMembers([]);
    setProjectDeadline('');
    setDocInputText('');
    setRequiredDocs([]);
    onClose();
  };

  const handleAddDoc = () => {
    if (!docInputText.trim()) return;
    if (!requiredDocs.includes(docInputText.trim())) {
      setRequiredDocs([...requiredDocs, docInputText.trim()]);
    }
    setDocInputText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const newFileNames: string[] = [];

      filesArray.forEach((file) => {
        newFileNames.push(file.name);

        if (typeof window !== 'undefined') {
          (window as any).__WORKORBIT_FILE_STORE__ = (window as any).__WORKORBIT_FILE_STORE__ || {};
          (window as any).__WORKORBIT_FILE_STORE__[file.name] = file;
          (window as any).__WORKORBIT_FILE_STORE__[file.name.toLowerCase()] = file;
          saveFileToDB(file.name, file);
        }

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          if (typeof window !== 'undefined') {
            (window as any).__WORKORBIT_FILE_STORE__[file.name + '_dataurl'] = dataUrl;
            (window as any).__WORKORBIT_FILE_STORE__[file.name.toLowerCase() + '_dataurl'] = dataUrl;

            try {
              const saved = JSON.parse(localStorage.getItem('workorbit_file_urls') || '{}');
              saved[file.name] = dataUrl;
              saved[file.name.toLowerCase()] = dataUrl;
              localStorage.setItem('workorbit_file_urls', JSON.stringify(saved));
            } catch (err) {}
          }
        };
        reader.readAsDataURL(file);
      });

      setRequiredDocs((prev) => Array.from(new Set([...prev, ...newFileNames])));
    }
  };

  const toggleProjectMember = (memberName: string) => {
    if (projectMembers.includes(memberName)) {
      setProjectMembers(projectMembers.filter(m => m !== memberName));
    } else {
      setProjectMembers([...projectMembers, memberName]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden my-6 relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">Create New</h3>
            <p className="text-xs text-slate-500 font-medium">Add tasks or projects to your workspace</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 font-bold flex items-center justify-center text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-2 bg-slate-100/70 border-b border-slate-200/80 flex gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveType('task')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeType === 'task' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            New Task
          </button>
          <button
            type="button"
            onClick={() => setActiveType('project')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeType === 'project' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            New Project
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeType === 'task' ? (
            <form id="create-task-form" onSubmit={handleTaskSubmit} className="space-y-4">
              {/* 1. Task Title */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  Task Title <span className="text-slate-400 font-normal">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design homepage hero banner"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                />
              </div>

              {/* 2. Task Description */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">Task Description</label>
                <textarea
                  rows={2}
                  placeholder="Provide task details, instructions, or scope..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all resize-none"
                />
              </div>

              {/* 3. Project Space */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">Project Space</label>
                <select
                  value={taskProject}
                  onChange={(e) => setTaskProject(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all cursor-pointer"
                >
                  {projectList.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Team Member (Assignee) - Direct Dropdown, Initially Empty */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">Team Member (Assignee)</label>
                <select
                  value={assignedMember}
                  onChange={(e) => setAssignedMember(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">Select Team Member...</option>
                  {employeeList.map((emp) => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Priority & 6. Deadline (Grid) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1">Deadline / Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                  />
                </div>
              </div>
            </form>
          ) : (
            <form id="create-project-form" onSubmit={handleProjectSubmit} className="space-y-4">
              {/* 1. Project Title */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  Project Title <span className="text-slate-400 font-normal">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Customer Service Agent"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                />
              </div>

              {/* 2. Project Description */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">Project Description</label>
                <textarea
                  rows={2}
                  placeholder="Project scope, objectives, key deliverables..."
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all resize-none"
                />
              </div>

              {/* 3. Project Manager - Direct Dropdown, Initially Empty */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">Manager</label>
                <select
                  value={projectManager}
                  onChange={(e) => setProjectManager(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">Select Manager...</option>
                  {employeeList.map((emp) => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Team Members - Checkable List, Initially Empty */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  Team Members {projectMembers.length > 0 ? `(${projectMembers.length})` : ''}
                </label>

                {/* Selected Member Badges Display */}
                {projectMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl mb-2">
                    {projectMembers.map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold shadow-2xs"
                      >
                        <span className="w-4 h-4 rounded-full bg-slate-700 text-white text-[9px] flex items-center justify-center font-bold">
                          {m[0]}
                        </span>
                        <span>{m}</span>
                        <button
                          type="button"
                          onClick={() => setProjectMembers(projectMembers.filter((item) => item !== m))}
                          className="hover:text-slate-300 text-xs ml-0.5 cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Inline Employee Checklist */}
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto space-y-1">
                  {employeeList.map((emp) => {
                    const isChecked = projectMembers.includes(emp.name);
                    return (
                      <label
                        key={emp.id}
                        className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked ? 'bg-slate-200/90 font-bold text-slate-900' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleProjectMember(emp.name)}
                            className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 accent-slate-900 cursor-pointer"
                          />
                          <span className="text-xs font-semibold">{emp.name}</span>
                          <span className="text-[10px] text-slate-400">({emp.role})</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 5. Deadline */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">Deadline</label>
                <input
                  type="date"
                  value={projectDeadline}
                  onChange={(e) => setProjectDeadline(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                />
              </div>

              {/* 6. Required Documents */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">Required Documents</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Doc name (e.g. PRD.pdf, Design_Spec.fig)"
                      value={docInputText}
                      onChange={(e) => setDocInputText(e.target.value)}
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleAddDoc}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                  </div>

                  <div className="relative">
                    <label className="w-full p-2.5 bg-slate-100 hover:bg-slate-200 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                      <span>📁 Upload Document Files</span>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {requiredDocs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {requiredDocs.map((doc, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-semibold"
                        >
                          <span>📄 {doc}</span>
                          <button
                            type="button"
                            onClick={() => setRequiredDocs(requiredDocs.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={activeType === 'task' ? 'create-task-form' : 'create-project-form'}
            className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            Create {activeType === 'task' ? 'Task' : 'Project'}
          </button>
        </div>

      </div>
    </div>
  );
};
