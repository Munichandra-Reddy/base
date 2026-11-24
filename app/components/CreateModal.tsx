'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
    teamName?: string;
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
  const cleanProjects = useMemo(() => {
    return (projects || []).filter((p) => {
      const id = String(p.id || '').trim();
      const pName = String(p.name || '').trim();
      const prjId = String(p.projectId || '').trim();
      if (['p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'prj_1795169922693_z6wz', 'prj_1795170215729_ie8a', 'prj_1795170328299_vjn1'].includes(id)) return false;
      if (['E-Commerce Website', 'Cloud Infrastructure Migration', 'AI Customer Assistant', 'Global Inventory Sync (Production Scale)', 'Global Inventory Sync'].includes(pName)) return false;
      if (['PRJ-1010', 'PRJ-1011', 'PRJ-1012'].includes(prjId)) return false;
      return true;
    });
  }, [projects]);
  const projectList = cleanProjects.map((p) => p.name);

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
  const [taskProject, setTaskProject] = useState('');
  const [assignedMember, setAssignedMember] = useState('');
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Task Project and Assignee Dropdown states (Strictly Opens Below with Search)
  const [isTaskProjectDropdownOpen, setIsTaskProjectDropdownOpen] = useState(false);
  const [taskProjectSearch, setTaskProjectSearch] = useState('');
  const taskProjectRef = useRef<HTMLDivElement>(null);

  const [isTaskAssigneeDropdownOpen, setIsTaskAssigneeDropdownOpen] = useState(false);
  const [taskAssigneeSearch, setTaskAssigneeSearch] = useState('');
  const taskAssigneeRef = useRef<HTMLDivElement>(null);

  const matchedTaskProject = useMemo(() => {
    if (!taskProject.trim()) return null;
    const q = taskProject.toLowerCase().trim();
    return projects?.find((p) => (p.name || '').toLowerCase().trim() === q || p.id.toLowerCase() === q);
  }, [taskProject, projects]);

  const eligibleTaskEmployees = useMemo(() => {
    const activeEmps = employeeList.filter((e) => {
      const email = (e.email || '').toLowerCase().trim();
      const name = (e.name || '').toLowerCase().trim();
      if (email === 'cr7156816@gmail.com') return false;
      if (name === 'rahul kumar' || email.includes('rahul@')) return false;
      if (e.id?.startsWith('dummy-') || e.id?.startsWith('emp-dummy')) return false;
      return (e.status || 'active') === 'active';
    });

    if (matchedTaskProject && matchedTaskProject.members && matchedTaskProject.members.length > 0) {
      const memberSet = new Set(matchedTaskProject.members.map((m) => m.toLowerCase().trim()));
      const teamEmps = activeEmps.filter(
        (e) => memberSet.has(e.name.toLowerCase().trim()) || memberSet.has(e.email.toLowerCase().trim())
      );
      if (teamEmps.length > 0) return teamEmps;
    }

    return activeEmps;
  }, [matchedTaskProject, employeeList]);

  // Close task dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (taskProjectRef.current && !taskProjectRef.current.contains(event.target as Node)) {
        setIsTaskProjectDropdownOpen(false);
      }
      if (taskAssigneeRef.current && !taskAssigneeRef.current.contains(event.target as Node)) {
        setIsTaskAssigneeDropdownOpen(false);
      }
    };
    if (isTaskProjectDropdownOpen || isTaskAssigneeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTaskProjectDropdownOpen, isTaskAssigneeDropdownOpen]);

  // Reset task dropdown and search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsTaskProjectDropdownOpen(false);
      setTaskProjectSearch('');
      setIsTaskAssigneeDropdownOpen(false);
      setTaskAssigneeSearch('');
    }
  }, [isOpen]);

  const selectedAssigneeEmp = employeeList.find(
    (emp) => emp.name.toLowerCase() === assignedMember.toLowerCase()
  );

  const filteredTaskProjectList = projectList.filter((p) => {
    if (!taskProjectSearch.trim()) return true;
    return p.toLowerCase().includes(taskProjectSearch.toLowerCase().trim());
  });

  const filteredTaskAssigneeList = eligibleTaskEmployees.filter((emp) => {
    if (!taskAssigneeSearch.trim()) return true;
    const q = taskAssigneeSearch.toLowerCase().trim();
    const nameMatch = (emp.name || '').toLowerCase().includes(q);
    const roleMatch = (emp.role || emp.designation || '').toLowerCase().includes(q);
    const deptMatch = (emp.department || '').toLowerCase().includes(q);
    return nameMatch || roleMatch || deptMatch;
  });

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
  const [projectTeamName, setProjectTeamName] = useState('Kaling');
  const [docInputText, setDocInputText] = useState('');
  const [requiredDocs, setRequiredDocs] = useState<string[]>([]);
  const [isPMDropdownOpen, setIsPMDropdownOpen] = useState(false);
  const [pmSearchQuery, setPmSearchQuery] = useState('');
  const [teamMemberSearch, setTeamMemberSearch] = useState('');
  const [projectError, setProjectError] = useState<string | null>(null);
  const pmDropdownRef = useRef<HTMLDivElement>(null);

  // Close PM dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pmDropdownRef.current && !pmDropdownRef.current.contains(event.target as Node)) {
        setIsPMDropdownOpen(false);
      }
    };
    if (isPMDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPMDropdownOpen]);

  // Reset dropdown and search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsPMDropdownOpen(false);
      setPmSearchQuery('');
      setTeamMemberSearch('');
      setProjectError(null);
    }
  }, [isOpen]);

  const selectedManagerEmp = employeeList.find(
    (emp) => emp.name.toLowerCase() === projectManager.toLowerCase()
  );

  const filteredManagerList = employeeList.filter((emp) => {
    if (!pmSearchQuery.trim()) return true;
    const q = pmSearchQuery.toLowerCase().trim();
    const nameMatch = (emp.name || '').toLowerCase().includes(q);
    const roleMatch = (emp.role || emp.designation || '').toLowerCase().includes(q);
    const deptMatch = (emp.department || '').toLowerCase().includes(q);
    const emailMatch = (emp.email || '').toLowerCase().includes(q);
    return nameMatch || roleMatch || deptMatch || emailMatch;
  });

  const filteredTeamEmployees = employeeList.filter((emp) => {
    if (!teamMemberSearch.trim()) return true;
    const q = teamMemberSearch.toLowerCase().trim();
    const nameMatch = (emp.name || '').toLowerCase().includes(q);
    const roleMatch = (emp.role || emp.designation || '').toLowerCase().includes(q);
    const deptMatch = (emp.department || '').toLowerCase().includes(q);
    const emailMatch = (emp.email || '').toLowerCase().includes(q);
    return nameMatch || roleMatch || deptMatch || emailMatch;
  });

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
    setIsTaskProjectDropdownOpen(false);
    setTaskProjectSearch('');
    setIsTaskAssigneeDropdownOpen(false);
    setTaskAssigneeSearch('');
    onClose();
  };

  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !projectName.trim()) return;

    let finalDocs = [...requiredDocs];
    if (docInputText.trim() && !finalDocs.includes(docInputText.trim())) {
      finalDocs.push(docInputText.trim());
    }

    const defaultManager = projectManager.trim() || 'Workspace Admin';
    const membersSet = new Set<string>();
    if (defaultManager) membersSet.add(defaultManager);
    projectMembers.forEach((m) => membersSet.add(m));

    onAddProject({
      name: projectName.trim(),
      description: projectDesc.trim(),
      category: projectCategory,
      teamName: projectTeamName.trim() || 'Team',
      manager: defaultManager,
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
    setIsPMDropdownOpen(false);
    setTeamMemberSearch('');
    setProjectError(null);
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

              {/* 3. Project Name */}
              <div>
                <label className="block text-xs font-semibold text-[#222222] mb-1">
                  Project Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  list="create-modal-project-suggestions"
                  required
                  placeholder="Type or select project name..."
                  value={taskProject}
                  onChange={(e) => setTaskProject(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] placeholder-[#888888] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] transition-all"
                />
                <datalist id="create-modal-project-suggestions">
                  {(projects || []).map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
                {matchedTaskProject && (
                  <div className="mt-1.5 p-2 bg-[#E0F2FE] border border-[#BAE6FD] rounded text-xs text-[#0369A1] flex items-center justify-between">
                    <span>👥 <strong>Dedicated Team:</strong> {matchedTaskProject.teamName || 'Team'} ({eligibleTaskEmployees.length} members)</span>
                    <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-[#BAE6FD] font-semibold">
                      {matchedTaskProject.learningPlan?.scopeOfDocument?.status === 'approved' ? '✓ Scope Approved' : '⏳ Scope Pending'}
                    </span>
                  </div>
                )}
              </div>

              {/* 4. Team Member (Assignee) - Single Searchable Box (Strictly Opens Below) */}
              <div className="relative" ref={taskAssigneeRef}>
                <label className="block text-xs font-semibold text-[#222222] mb-1">Team Member (Assignee)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={
                      isTaskAssigneeDropdownOpen
                        ? taskAssigneeSearch
                        : assignedMember
                        ? `${assignedMember}${
                            selectedAssigneeEmp
                              ? ` (${selectedAssigneeEmp.role || selectedAssigneeEmp.designation || 'Employee'})`
                              : ''
                          }`
                        : ''
                    }
                    onChange={(e) => {
                      setTaskAssigneeSearch(e.target.value);
                      if (!isTaskAssigneeDropdownOpen) setIsTaskAssigneeDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setIsTaskAssigneeDropdownOpen(true);
                      setTaskAssigneeSearch('');
                    }}
                    placeholder="Search team member by name, role, dept..."
                    className={`w-full p-2.5 pr-14 bg-white border rounded-md text-sm font-medium text-[#222222] placeholder-[#888888] focus:outline-none transition-all cursor-pointer ${
                      isTaskAssigneeDropdownOpen
                        ? 'border-[#049FD9] ring-1 ring-[#049FD9]'
                        : 'border-[#CCCCCC] hover:border-[#999999]'
                    }`}
                  />
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
                    {assignedMember && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssignedMember('');
                          setTaskAssigneeSearch('');
                        }}
                        className="text-[#888888] hover:text-[#222222] text-xs p-0.5 cursor-pointer"
                        title="Clear assignee"
                      >
                        ✕
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsTaskAssigneeDropdownOpen((prev) => !prev);
                        if (!isTaskAssigneeDropdownOpen) setTaskAssigneeSearch('');
                      }}
                      className="text-[#888888] hover:text-[#222222] p-0.5 cursor-pointer"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform duration-150 ${
                          isTaskAssigneeDropdownOpen ? 'rotate-180 text-[#049FD9]' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Dropdown Menu - Strictly Opens Below */}
                {isTaskAssigneeDropdownOpen && (
                  <div
                    className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-[#CCCCCC] rounded-md shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-[#F1F5F9] font-sans animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: '100%' }}
                  >
                    {filteredTaskAssigneeList.length === 0 ? (
                      <div className="p-3 text-center text-xs text-[#888888]">
                        No matching team members found
                      </div>
                    ) : (
                      filteredTaskAssigneeList.map((emp) => {
                        const isSelected = emp.name === assignedMember;
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setAssignedMember(emp.name);
                              setIsTaskAssigneeDropdownOpen(false);
                              setTaskAssigneeSearch('');
                            }}
                            className={`w-full text-left px-3 py-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#EBF7FD] text-[#049FD9]'
                                : 'hover:bg-[#F8FAFC] text-[#222222]'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-semibold truncate">{emp.name}</div>
                              <div className="text-[11px] text-[#64748B] truncate">
                                {emp.role || emp.designation || 'Team Member'}
                                {emp.department ? ` • ${emp.department}` : ''}
                              </div>
                            </div>
                            {isSelected && <span className="text-[#049FD9] font-bold">✓</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
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
              {projectError && (
                <div className="p-3 bg-[#FEF2F2] border border-[#EF4444]/30 text-[#EF4444] rounded-lg text-xs font-semibold flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{projectError}</span>
                </div>
              )}

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

              {/* Dedicated Team Name */}
              <div>
                <label className="block text-xs font-semibold text-[#222222] mb-1">
                  Dedicated Team Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kaling, Alpha Squad, Core Engineers..."
                  value={projectTeamName}
                  onChange={(e) => setProjectTeamName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#CCCCCC] rounded-md text-sm font-medium text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] transition-all"
                />
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Only employees assigned to this dedicated team will be able to access and view the project.
                </p>
              </div>

              {/* 4. Team Members Checklist with Search Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#222222]">
                    Assign Team Members {projectMembers.length > 0 && (
                      <span className="text-[#049FD9] font-bold ml-1">({projectMembers.length} selected)</span>
                    )}
                  </label>
                  {projectMembers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setProjectMembers([])}
                      className="text-[11px] text-[#888888] hover:text-red-500 font-medium transition-colors cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                {/* Team Search Box */}
                <div className="relative mb-2">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#888888]">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={teamMemberSearch}
                    onChange={(e) => setTeamMemberSearch(e.target.value)}
                    placeholder="Search employees by name, role, department..."
                    className="w-full pl-8 pr-7 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#222222] placeholder-[#888888] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9] transition-all"
                  />
                  {teamMemberSearch && (
                    <button
                      type="button"
                      onClick={() => setTeamMemberSearch('')}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#888888] hover:text-[#222222] text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filtered Team List */}
                <div className="p-2.5 bg-white border border-[#CCCCCC] rounded-md max-h-36 overflow-y-auto space-y-1">
                  {filteredTeamEmployees.length === 0 ? (
                    <div className="py-4 text-center text-xs text-[#888888]">
                      No employees match &ldquo;{teamMemberSearch}&rdquo;
                    </div>
                  ) : (
                    filteredTeamEmployees.map((emp) => {
                      const isChecked = projectMembers.includes(emp.name);
                      const isPM = projectManager && emp.name.toLowerCase() === projectManager.toLowerCase();
                      return (
                        <label
                          key={emp.id}
                          className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                            isChecked ? 'bg-[#F0F9FF] font-semibold text-[#0284C7]' : 'hover:bg-[#F8FAFC] text-[#595959]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleProjectMember(emp.name)}
                              className="w-4 h-4 rounded text-[#049FD9] focus:ring-[#049FD9] accent-[#049FD9] cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-[#111827]">{emp.name}</span>
                            <span className="text-[10px] text-[#64748B]">
                              ({emp.role || emp.designation}{emp.department ? ` • ${emp.department}` : ''})
                            </span>
                          </div>
                          {isPM && (
                            <span className="text-[9px] font-bold text-[#0284C7] bg-[#E0F2FE] px-1.5 py-0.5 rounded">
                              PM
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
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
