'use client';

import React, { useState } from 'react';
import { Person, Project } from '@/lib/types';
import { saveFileToDB } from '@/lib/fileUtils';
import { FolderIcon, FileIcon } from './Icons';

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

export const CreateModal: React.FC<CreateModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  onAddProject,
  people,
  projects,
}) => {
  const employeeList = (people && people.length > 0) ? people : [];
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B192C]/50 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg overflow-hidden my-6 relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-white shrink-0">
          <div>
            <h3 className="text-xl font-extrabold text-[#0F172A]">Create New</h3>
            <p className="text-xs text-[#64748B] font-medium">Add tasks or projects to your workspace</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#EBF0F5] hover:bg-[#CBD5E1]/40 text-[#64748B] hover:text-[#0F172A] font-bold flex items-center justify-center text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-2 bg-[#EBF0F5] border-b border-[#E2E8F0] flex gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveType('task')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeType === 'task'
                ? 'bg-[#6CC04A] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#CBD5E1]/30'
            }`}
          >
            New Task
          </button>
          <button
            type="button"
            onClick={() => setActiveType('project')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeType === 'project'
                ? 'bg-[#6CC04A] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#CBD5E1]/30'
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
                <label className="block text-xs font-extrabold text-[#0F172A] mb-1">
                  Task Title <span className="text-[#64748B] font-normal">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design homepage hero banner"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] transition-all"
                />
              </div>

              {/* 2. Task Description */}
              <div>
                <label className="block text-xs font-semibold text-[#222222] mb-1">Task Description</label>
                <textarea
                  rows={2}
                  placeholder="Provide task details, instructions, or scope..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] transition-all resize-none"
                />
              </div>

              {/* 3. Project Space */}
              <div>
                <label className="block text-xs font-semibold text-[#222222] mb-1">Project Space</label>
                <select
                  value={taskProject}
                  onChange={(e) => setTaskProject(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] transition-all cursor-pointer"
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
                <label className="block text-xs font-semibold text-[#222222] mb-1">Team Member (Assignee)</label>
                <select
                  value={assignedMember}
                  onChange={(e) => setAssignedMember(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] transition-all cursor-pointer"
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
                  <label className="block text-xs font-semibold text-[#222222] mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-xs font-semibold text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] cursor-pointer"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#222222] mb-1">Deadline / Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-xs font-semibold text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] cursor-pointer"
                  />
                </div>
              </div>
            </form>
          ) : (
            <form id="create-project-form" onSubmit={handleProjectSubmit} className="space-y-4">
              {/* 1. Project Title */}
              <div>
                <label className="block text-xs font-semibold text-[#222222] mb-1">
                  Project Title <span className="text-[#595959] font-normal">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Customer Service Agent"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] transition-all"
                />
              </div>

              {/* 2. Project Description */}
              <div>
                <label className="block text-xs font-extrabold text-[#0F172A] mb-1">Project Description</label>
                <textarea
                  rows={2}
                  placeholder="Project scope, objectives, key deliverables..."
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] transition-all resize-none"
                />
              </div>

              {/* 3. Project Manager - Direct Dropdown, Initially Empty */}
              <div>
                <label className="block text-xs font-semibold text-[#222222] mb-1">Manager</label>
                <select
                  value={projectManager}
                  onChange={(e) => setProjectManager(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] transition-all cursor-pointer"
                >
                  <option value="">Select Manager...</option>
                  {employeeList.map((emp) => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Team Members Checklist */}
              <div>
                <label className="block text-xs font-semibold text-[#222222] mb-1">Assign Team Members</label>
                <div className="p-3 bg-white border border-[#CCCCCC] rounded-md max-h-36 overflow-y-auto space-y-1.5">
                  {employeeList.map((emp) => {
                    const isChecked = projectMembers.includes(emp.name);
                    return (
                      <label
                        key={emp.id}
                        className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked ? 'bg-[#F4F6F8] font-bold text-[#222222]' : 'hover:bg-[#F8FAFC] text-[#595959]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleProjectMember(emp.name)}
                            className="w-4 h-4 rounded text-[#049FD9] focus:ring-[#049FD9] accent-[#049FD9] cursor-pointer"
                          />
                          <span className="text-xs font-semibold">{emp.name}</span>
                          <span className="text-[10px] text-[#595959]">({emp.role})</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 5. Deadline */}
              <div>
                <label className="block text-xs font-semibold text-[#222222] mb-1">Deadline</label>
                <input
                  type="date"
                  value={projectDeadline}
                  onChange={(e) => setProjectDeadline(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-xs font-semibold text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] cursor-pointer"
                />
              </div>

              {/* 6. Required Documents */}
              <div>
                <label className="block text-xs font-semibold text-[#222222] mb-1">Required Documents</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Doc name (e.g. PRD.pdf, Design_Spec.fig)"
                      value={docInputText}
                      onChange={(e) => setDocInputText(e.target.value)}
                      className="flex-1 p-2 bg-white border border-[#CCCCCC] rounded-md text-xs text-[#222222] font-medium focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9]"
                    />
                    <button
                      type="button"
                      onClick={handleAddDoc}
                      className="btn-login py-1 px-3 text-xs"
                    >
                      Add
                    </button>
                  </div>

                  <div className="relative">
                    <label className="w-full p-2.5 bg-[#F1F3F6] hover:bg-[#EBF0F5] border border-dashed border-[#CBD5E1] rounded-xl text-xs font-bold text-[#334155] flex items-center justify-center gap-2 cursor-pointer transition-colors">
                      <FolderIcon className="w-4 h-4 text-[#334155]" />
                      <span>Upload Document Files</span>
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
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EBF0F5] border border-[#E2E8F0] text-[#334155] text-[11px] font-semibold"
                        >
                          <FileIcon className="w-3.5 h-3.5 text-[#334155]" />
                          <span>{doc}</span>
                          <button
                            type="button"
                            onClick={() => setRequiredDocs(requiredDocs.filter((_, i) => i !== idx))}
                            className="text-[#64748B] hover:text-[#0F172A] cursor-pointer"
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
        <div className="p-4 border-t border-[#E5E5E5] bg-[#F4F6F8] flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-login text-xs py-2 px-4"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={activeType === 'task' ? 'create-task-form' : 'create-project-form'}
            className="btn-signup text-xs py-2 px-5"
          >
            Create {activeType === 'task' ? 'Task' : 'Project'}
          </button>
        </div>

      </div>
    </div>
  );
};
