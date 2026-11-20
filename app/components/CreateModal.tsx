'use client';

import React, { useState, useEffect } from 'react';
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
    managerEmail?: string;
    members?: string[];
    deadline?: string;
    startDate?: string;
    endDate?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
    category?: string;
    notes?: string;
    requiredDocuments?: string[];
  } | string, descArg?: string) => void;
  people?: Person[];
  projects?: Project[];
  onAddEmployee?: (employeeData: {
    fullName: string;
    email: string;
    accessRole: 'admin' | 'employee';
    designation: string;
    department: string;
    phone?: string;
    employeeId: string;
    joiningDate: string;
  }) => Promise<any> | void;
  initialType?: 'task' | 'project' | 'employee';
  isAdmin?: boolean;
}

export const CreateModal: React.FC<CreateModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  onAddProject,
  people,
  projects,
  onAddEmployee,
  initialType = 'task',
  isAdmin = false,
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

  const [activeType, setActiveType] = useState<'task' | 'project' | 'employee'>('task');

  // Employee Form State (Admin only)
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empAccessRole, setEmpAccessRole] = useState<'admin' | 'employee'>('employee');
  const [empDesignation, setEmpDesignation] = useState('');
  const [empDepartment, setEmpDepartment] = useState('Engineering');
  const [empPhone, setEmpPhone] = useState('');
  const [empId, setEmpId] = useState('');
  const [empJoiningDate, setEmpJoiningDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [empError, setEmpError] = useState<string | null>(null);
  const [empSuccess, setEmpSuccess] = useState<string | null>(null);
  const [isCreatingEmp, setIsCreatingEmp] = useState(false);

  // Auto-generate unique Employee ID
  const computeNextEmpId = () => {
    const existingNums = (people || [])
      .map((p) => p.employeeId || p.id || '')
      .filter((id) => id.toUpperCase().startsWith('EMP-'))
      .map((id) => {
        const num = parseInt(id.replace(/[^0-9]/g, ''), 10);
        return isNaN(num) ? 0 : num;
      });
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 1000;
    return `EMP-${Math.max(1001, maxNum + 1)}`;
  };

  // Sync initial activeType & auto-generate ID when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialType === 'employee' && isAdmin) {
        setActiveType('employee');
      } else if (initialType === 'project' && isAdmin) {
        setActiveType('project');
      } else {
        setActiveType('task');
      }
      setEmpError(null);
      setEmpSuccess(null);
      if (!empId) {
        setEmpId(computeNextEmpId());
      }
    }
  }, [isOpen, initialType, isAdmin, people]);

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
  const [projectCategory, setFormProjectCategory] = useState('Web Development');
  const [projectManager, setProjectManager] = useState('');
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const [projectStartDate, setProjectStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [projectDeadline, setProjectDeadline] = useState('');
  const [projectPriority, setProjectPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [projectStatus, setProjectStatus] = useState<'planning' | 'active'>('planning');
  const [projectNotes, setProjectNotes] = useState('');
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
    if (!isAdmin || !projectName.trim()) return;

    let finalDocs = [...requiredDocs];
    if (docInputText.trim() && !finalDocs.includes(docInputText.trim())) {
      finalDocs.push(docInputText.trim());
    }

    // Ensure PM is included in project members
    const membersSet = new Set<string>();
    if (projectManager.trim()) membersSet.add(projectManager.trim());
    projectMembers.forEach((m) => membersSet.add(m));

    onAddProject({
      name: projectName.trim(),
      description: projectDesc.trim(),
      category: projectCategory,
      manager: projectManager.trim() || undefined,
      members: Array.from(membersSet),
      startDate: projectStartDate,
      endDate: projectDeadline || undefined,
      deadline: projectDeadline || undefined,
      priority: projectPriority,
      status: projectStatus,
      notes: projectNotes,
      requiredDocuments: finalDocs,
    });

    setProjectName('');
    setProjectDesc('');
    setProjectManager('');
    setProjectMembers([]);
    setProjectDeadline('');
    setProjectNotes('');
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

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmpError(null);
    setEmpSuccess(null);
    if (!isAdmin) {
      setEmpError('Unauthorized: Only administrators can create new employees.');
      return;
    }

    const cleanName = empName.trim();
    const cleanEmail = empEmail.trim().toLowerCase();
    const cleanDesignation = empDesignation.trim();
    const cleanDept = empDepartment.trim();
    const cleanId = (empId.trim() || computeNextEmpId()).toUpperCase();
    const cleanJoining = empJoiningDate || new Date().toISOString().split('T')[0];

    // 1. Validate required fields
    if (!cleanName) {
      setEmpError('Employee Full Name is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setEmpError('Please enter a valid work email address (e.g. name@company.com).');
      return;
    }

    if (!cleanDesignation) {
      setEmpError('Designation (Job Title) is required.');
      return;
    }

    if (!cleanDept) {
      setEmpError('Department is required.');
      return;
    }

    // 2. Validate against duplicate email
    if (people?.some((p) => p.email && p.email.toLowerCase() === cleanEmail)) {
      setEmpError(`An employee with email "${cleanEmail}" already exists in the workspace.`);
      return;
    }

    // 3. Validate against duplicate employee ID
    if (people?.some((p) => (p.employeeId || p.id || '').toUpperCase() === cleanId)) {
      setEmpError(`Employee ID "${cleanId}" is already assigned. Please change it or use auto-generated ID.`);
      return;
    }

    setIsCreatingEmp(true);

    try {
      if (onAddEmployee) {
        await onAddEmployee({
          fullName: cleanName,
          email: cleanEmail,
          accessRole: empAccessRole,
          designation: cleanDesignation,
          department: cleanDept,
          phone: empPhone.trim() || undefined,
          employeeId: cleanId,
          joiningDate: cleanJoining,
        });
      }

      setEmpSuccess(`Employee "${cleanName}" created successfully! Invitation email has been sent.`);
      setTimeout(() => {
        setEmpName('');
        setEmpEmail('');
        setEmpDesignation('');
        setEmpDepartment('Engineering');
        setEmpPhone('');
        setEmpId(computeNextEmpId());
        setEmpJoiningDate(new Date().toISOString().split('T')[0]);
        setEmpError(null);
        setEmpSuccess(null);
        setIsCreatingEmp(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setIsCreatingEmp(false);
      setEmpError(err?.message || 'Failed to create employee. Please try again.');
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4 overflow-y-auto font-sans"
    >
      <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-lg overflow-hidden my-auto relative flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between bg-white shrink-0">
          <div>
            <h3 className="text-base font-semibold text-[#111827]">Create New</h3>
            <p className="text-xs text-[#595959] font-normal">Add {isAdmin ? 'tasks, projects, or employees' : 'tasks'} to your workspace</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md bg-[#F4F6F8] hover:bg-[#E5E5E5] text-[#595959] hover:text-[#111827] font-medium flex items-center justify-center text-xs transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-1.5 bg-[#F4F6F8] border-b border-[#E5E5E5] flex gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveType('task')}
            className={`flex-1 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
              activeType === 'task'
                ? 'bg-white text-[#111827] shadow-2xs font-semibold'
                : 'text-[#595959] hover:text-[#111827]'
            }`}
          >
            New Task
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveType('project')}
              className={`flex-1 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
                activeType === 'project'
                  ? 'bg-white text-[#111827] shadow-2xs font-semibold'
                  : 'text-[#595959] hover:text-[#111827]'
              }`}
            >
              New Project
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveType('employee')}
              className={`flex-1 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
                activeType === 'employee'
                  ? 'bg-white text-[#111827] shadow-2xs font-semibold'
                  : 'text-[#595959] hover:text-[#111827]'
              }`}
            >
              New Employee
            </button>
          )}
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeType === 'employee' && isAdmin ? (
            <form id="create-employee-form" onSubmit={handleEmployeeSubmit} className="space-y-3.5">
              {empError && (
                <div className="p-3 bg-[#FEF2F2] border border-[#EF4444]/30 text-[#EF4444] rounded-lg text-xs font-semibold flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{empError}</span>
                </div>
              )}

              {empSuccess && (
                <div className="p-3 bg-[#F0FDF4] border border-[#16A34A]/30 text-[#16A34A] rounded-lg text-xs font-semibold flex items-center gap-2">
                  <span>✓</span>
                  <span>{empSuccess}</span>
                </div>
              )}

              {/* 1. Employee Full Name */}
              <div>
                <label className="block text-xs font-extrabold text-[#0F172A] mb-1">
                  Employee Full Name <span className="text-[#EF4444] font-normal">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] transition-all"
                />
              </div>

              {/* 2. Work Email Address */}
              <div>
                <label className="block text-xs font-extrabold text-[#0F172A] mb-1">
                  Work Email Address <span className="text-[#EF4444] font-normal">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@company.com"
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] transition-all"
                />
              </div>

              {/* 3. Access Role & 4. Department (Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-[#0F172A] mb-1">
                    Access Role <span className="text-[#EF4444] font-normal">*</span>
                  </label>
                  <select
                    value={empAccessRole}
                    onChange={(e) => setEmpAccessRole(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-xs font-semibold text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] cursor-pointer"
                  >
                    <option value="employee">Employee (Default)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                  <p className="text-[10px] text-[#64748B] mt-0.5">Determines workspace permissions</p>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#0F172A] mb-1">
                    Department <span className="text-[#EF4444] font-normal">*</span>
                  </label>
                  <select
                    value={empDepartment}
                    onChange={(e) => setEmpDepartment(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-xs font-semibold text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] cursor-pointer"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Product">Product</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                    <option value="Customer Support">Customer Support</option>
                  </select>
                  <p className="text-[10px] text-[#64748B] mt-0.5">Organizational division</p>
                </div>
              </div>

              {/* 5. Designation / Job Title */}
              <div>
                <label className="block text-xs font-extrabold text-[#0F172A] mb-1">
                  Designation / Job Title <span className="text-[#EF4444] font-normal">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Software Engineer, UI/UX Designer"
                  value={empDesignation}
                  onChange={(e) => setEmpDesignation(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] transition-all"
                />
                <p className="text-[10px] text-[#64748B] mt-0.5">Describes the employee's job responsibilities</p>
              </div>

              {/* 6. Employee ID & 7. Joining Date (Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#222222]">
                      Employee ID <span className="text-[#EF4444] font-normal">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setEmpId(computeNextEmpId())}
                      className="text-[10px] font-semibold text-[#049FD9] hover:underline cursor-pointer"
                    >
                      Auto-generate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-1004"
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value.toUpperCase())}
                    className="w-full p-2.5 bg-[#F8FAFC] border border-[#CCCCCC] rounded-md text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] font-mono"
                  />
                  <p className="text-[10px] text-[#64748B] mt-0.5">Unique identifier across workspace</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#222222] mb-1">
                    Joining Date <span className="text-[#EF4444] font-normal">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={empJoiningDate}
                    onChange={(e) => setEmpJoiningDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-xs font-semibold text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] cursor-pointer"
                  />
                  <p className="text-[10px] text-[#64748B] mt-0.5">Official start date</p>
                </div>
              </div>

              {/* 8. Phone Number (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-[#222222] mb-1">
                  Phone Number <span className="text-[#64748B] font-normal">(Optional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +1 (555) 234-5678"
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] transition-all"
                />
              </div>

              {/* Notice */}
              <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[11px] text-[#64748B] leading-relaxed">
                ✉️ An invitation email will automatically be delivered to the employee with a secure link to set their confidential password.
              </div>
            </form>
          ) : activeType === 'task' ? (
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              {/* Category & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#222222] mb-1">Category</label>
                  <select
                    value={projectCategory}
                    onChange={(e) => setFormProjectCategory(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#222222] focus:outline-none focus:border-[#049FD9]"
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Mobile Apps">Mobile Apps</option>
                    <option value="UI/UX Design">UI/UX Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="DevOps & Cloud">DevOps & Cloud</option>
                    <option value="Internal Operations">Internal Operations</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#222222] mb-1">Priority</label>
                  <select
                    value={projectPriority}
                    onChange={(e) => setProjectPriority(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#222222] focus:outline-none focus:border-[#049FD9]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* 3. Project Manager - Direct Dropdown, Initially Empty */}
              <div>
                <label className="block text-xs font-semibold text-[#222222] mb-1">Project Manager <span className="text-red-500">*</span></label>
                <select
                  required
                  value={projectManager}
                  onChange={(e) => setProjectManager(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] transition-all cursor-pointer"
                >
                  <option value="">Select Manager...</option>
                  {employeeList.map((emp) => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name} ({emp.role || emp.designation} - {emp.department})
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
                          <span className="text-[10px] text-[#595959]">({emp.role || emp.designation})</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 5. Start Date & Deadline */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#222222] mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={projectStartDate}
                    onChange={(e) => setProjectStartDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-xs font-semibold text-[#222222] focus:outline-none focus:border-[#049FD9]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#222222] mb-1">End Date / Deadline</label>
                  <input
                    type="date"
                    required
                    value={projectDeadline}
                    onChange={(e) => setProjectDeadline(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-xs font-semibold text-[#222222] focus:outline-none focus:border-[#049FD9] cursor-pointer"
                  />
                </div>
              </div>

              {/* Status & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#222222] mb-1">Initial Status</label>
                  <select
                    value={projectStatus}
                    onChange={(e) => setProjectStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#222222] focus:outline-none focus:border-[#049FD9]"
                  >
                    <option value="planning">Planning (Default)</option>
                    <option value="active">Active</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#222222] mb-1">Project Notes</label>
                  <input
                    type="text"
                    placeholder="Confidential notes or details..."
                    value={projectNotes}
                    onChange={(e) => setProjectNotes(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#222222] focus:outline-none focus:border-[#049FD9]"
                  />
                </div>
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
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreatingEmp}
            form={
              activeType === 'employee' && isAdmin
                ? 'create-employee-form'
                : activeType === 'task'
                ? 'create-task-form'
                : 'create-project-form'
            }
            className="btn-primary"
          >
            {activeType === 'employee' && isAdmin
              ? isCreatingEmp
                ? 'Creating & Sending Invite...'
                : 'Create Employee'
              : `Create ${activeType === 'task' ? 'Task' : 'Project'}`}
          </button>
        </div>

      </div>
    </div>
  );
};
