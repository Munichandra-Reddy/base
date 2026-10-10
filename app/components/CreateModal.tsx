'use client';

import React, { useState } from 'react';
import { Person, Project } from '@/lib/types';

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

  // Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskProject, setTaskProject] = useState(projectList[0] || 'E-Commerce Website');
  const [assignedMember, setAssignedMember] = useState(employeeList[0]?.name || 'Rahul Kumar');
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [taskDueDate, setTaskDueDate] = useState('2026-10-25');

  // Project Form State
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectManager, setProjectManager] = useState(employeeList[0]?.name || 'Rahul Kumar');
  const [projectMembers, setProjectMembers] = useState<string[]>([employeeList[0]?.name || 'Rahul Kumar']);
  const [projectDeadline, setProjectDeadline] = useState('2026-11-30');
  const [docInputText, setDocInputText] = useState('');
  const [requiredDocs, setRequiredDocs] = useState<string[]>(['PRD_Specification.pdf']);

  // Pop-up modals state inside CreateModal
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [showManagerPicker, setShowManagerPicker] = useState(false);
  const [showMultiMemberPicker, setShowMultiMemberPicker] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  if (!isOpen) return null;

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    onAddTask({
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      project: taskProject,
      assignedTo: assignedMember,
      priority: taskPriority,
      dueDate: taskDueDate,
    });

    setTaskTitle('');
    setTaskDesc('');
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
      manager: projectManager,
      members: projectMembers.length > 0 ? projectMembers : [projectManager],
      deadline: projectDeadline,
      requiredDocuments: finalDocs,
    });

    setProjectName('');
    setProjectDesc('');
    setDocInputText('');
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
      const newFileNames = Array.from(e.target.files).map(f => f.name);
      setRequiredDocs(prev => Array.from(new Set([...prev, ...newFileNames])));
    }
  };

  const toggleProjectMember = (memberName: string) => {
    if (projectMembers.includes(memberName)) {
      if (projectMembers.length > 1) {
        setProjectMembers(projectMembers.filter(m => m !== memberName));
      }
    } else {
      setProjectMembers([...projectMembers, memberName]);
    }
  };

  const filteredEmployees = employeeList.filter(emp =>
    emp.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchFilter.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchFilter.toLowerCase())
  );

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

              {/* 4. Team Member (Single Select Popup) */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">Team Member (Assignee)</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchFilter('');
                      setShowMemberPicker(true);
                    }}
                    className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-extrabold text-[10px] flex items-center justify-center">
                        {assignedMember[0]?.toUpperCase() || 'U'}
                      </span>
                      <span>{assignedMember}</span>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-200 text-slate-900 border border-slate-300">
                      Choose Member (Pop-up)
                    </span>
                  </button>
                </div>
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

              {/* 3. Project Manager */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">Manager</label>
                <button
                  type="button"
                  onClick={() => {
                    setSearchFilter('');
                    setShowManagerPicker(true);
                  }}
                  className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-extrabold text-[10px] flex items-center justify-center">
                      {projectManager[0]?.toUpperCase() || 'M'}
                    </span>
                    <span>{projectManager}</span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-200 text-slate-900 border border-slate-300">
                    Select Manager
                  </span>
                </button>
              </div>

              {/* 4. Team Members (Multi Select according to project requirement: 1, 2, or more) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-extrabold text-slate-800">
                    Team Members ({projectMembers.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchFilter('');
                      setShowMultiMemberPicker(true);
                    }}
                    className="text-xs font-extrabold text-slate-900 hover:underline cursor-pointer"
                  >
                    + Add / Select Members
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl min-h-[44px]">
                  {projectMembers.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold shadow-2xs"
                    >
                      <span className="w-4 h-4 rounded-full bg-slate-700 text-white text-[9px] flex items-center justify-center font-bold">
                        {m[0]}
                      </span>
                      <span>{m}</span>
                      {projectMembers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setProjectMembers(projectMembers.filter((item) => item !== m))}
                          className="hover:text-slate-300 text-xs ml-0.5"
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  ))}
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
                            className="text-slate-400 hover:text-slate-700"
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

        {/* POP-UP MODAL: Single Team Member Picker (For Task) */}
        {showMemberPicker && (
          <div className="absolute inset-0 z-20 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Select Team Member</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Choose 1 employee for this task</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMemberPicker(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 border-b border-slate-100">
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="p-2 overflow-y-auto space-y-1 divide-y divide-slate-100 max-h-60">
                {filteredEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => {
                      setAssignedMember(emp.name);
                      setShowMemberPicker(false);
                    }}
                    className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                      assignedMember === emp.name ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full font-extrabold text-xs flex items-center justify-center ${
                          assignedMember === emp.name ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {emp.avatar}
                      </div>
                      <div>
                        <div className="font-bold text-xs">{emp.name}</div>
                        <div className={`text-[10px] ${assignedMember === emp.name ? 'text-slate-300' : 'text-slate-500'}`}>
                          {emp.role}
                        </div>
                      </div>
                    </div>
                    {assignedMember === emp.name && <span className="font-bold text-xs">✓ Selected</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* POP-UP MODAL: Single Manager Picker (For Project) */}
        {showManagerPicker && (
          <div className="absolute inset-0 z-20 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Select Project Manager</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Choose manager for this project</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManagerPicker(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 border-b border-slate-100">
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="p-2 overflow-y-auto space-y-1 divide-y divide-slate-100 max-h-60">
                {filteredEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => {
                      setProjectManager(emp.name);
                      setShowManagerPicker(false);
                    }}
                    className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                      projectManager === emp.name ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full font-extrabold text-xs flex items-center justify-center ${
                          projectManager === emp.name ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {emp.avatar}
                      </div>
                      <div>
                        <div className="font-bold text-xs">{emp.name}</div>
                        <div className={`text-[10px] ${projectManager === emp.name ? 'text-slate-300' : 'text-slate-500'}`}>
                          {emp.role}
                        </div>
                      </div>
                    </div>
                    {projectManager === emp.name && <span className="font-bold text-xs">✓ Selected</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* POP-UP MODAL: Multi Team Members Picker (For Project) */}
        {showMultiMemberPicker && (
          <div className="absolute inset-0 z-20 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Select Team Members</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Add 1, 2, or more members to project</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMultiMemberPicker(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 border-b border-slate-100">
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="p-2 overflow-y-auto space-y-1 max-h-60">
                {filteredEmployees.map((emp) => {
                  const isChecked = projectMembers.includes(emp.name);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleProjectMember(emp.name)}
                      className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked ? 'bg-slate-100 border border-slate-300' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
                          {emp.avatar}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{emp.name}</div>
                          <div className="text-[10px] text-slate-500">{emp.role}</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 accent-slate-900 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowMultiMemberPicker(false)}
                  className="px-4 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Done ({projectMembers.length} Selected)
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
