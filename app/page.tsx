'use client';

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { EmployeeDashboardView } from './components/EmployeeDashboardView';
import { TasksView } from './components/TasksView';
import { ProjectsView } from './components/ProjectsView';
import { CalendarView } from './components/CalendarView';
import { ChatView } from './components/ChatView';
import { FilesView } from './components/FilesView';
import { PeopleView } from './components/PeopleView';
import { CheckinsView } from './components/CheckinsView';
import { ReportsView } from './components/ReportsView';
import { CreateModal } from './components/CreateModal';
import { NotificationPanel } from './components/NotificationPanel';
import { AuthView } from './components/AuthView';
import {
  EmployeeDashboardSkeleton,
  DashboardSkeleton,
  TasksSkeleton,
  ProjectsSkeleton,
  CalendarSkeleton,
  ChatSkeleton,
  FilesSkeleton,
  PeopleSkeleton,
  CheckinsSkeleton,
  ReportsSkeleton,
} from './components/Skeletons';

import {
  initialStats,
  initialTasks,
  initialActivities,
  initialProjects,
  initialChatMessages,
  initialCheckIns,
  initialFiles,
} from '@/lib/data';

import { Task, Activity, Project, ChatMessage, CheckIn, FileItem, Person } from '@/lib/types';
import { getFileRelativeTime } from '@/lib/fileUtils';
import {
  subscribeToChatMessages,
  addFirebaseChatMessage,
  subscribeToEmployees,
  addFirebaseEmployee,
  addFirebaseUserAccount,
  subscribeToTasks,
  addFirebaseTask,
  toggleFirebaseTask,
  subscribeToProjects,
  addFirebaseProject,
  subscribeToCheckIns,
  addFirebaseCheckIn,
  subscribeToFiles,
  addFirebaseFile,
  seedInitialDataToFirebase,
  isRealEmployee,
  deduplicateEmployees,
  updateFirebaseEmployee,
  deleteFirebaseEmployee,
} from '@/lib/firebaseServices';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    email: string;
    fullName: string;
    companyName: string;
  } | null>(() => {
    if (typeof window !== 'undefined') {
      const sessionUser = sessionStorage.getItem('workorbit_current_user');
      if (sessionUser) {
        try {
          const parsed = JSON.parse(sessionUser);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch (e) {}
      }
      const savedRole = sessionStorage.getItem('workorbit_dashboard_role') || localStorage.getItem('workorbit_dashboard_role');
      const userKey = savedRole === 'employee' ? 'workorbit_employee_user' : 'workorbit_admin_user';
      const localUser = localStorage.getItem(userKey) || localStorage.getItem('workorbit_current_user');
      if (localUser) {
        try {
          const parsed = JSON.parse(localUser);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch (e) {}
      }
    }
    return null;
  });

  const [dashboardRole, setDashboardRole] = useState<'admin' | 'employee'>(() => {
    if (typeof window !== 'undefined') {
      const sessionRole = sessionStorage.getItem('workorbit_dashboard_role') as 'admin' | 'employee' | null;
      if (sessionRole === 'admin' || sessionRole === 'employee') return sessionRole;
      const localRole = localStorage.getItem('workorbit_dashboard_role') as 'admin' | 'employee' | null;
      if (localRole === 'admin' || localRole === 'employee') return localRole;
    }
    return 'admin';
  });

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workorbit_tasks');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return initialTasks;
  });

  const [activities, setActivities] = useState<Activity[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workorbit_activities');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return initialActivities;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workorbit_projects');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return initialProjects;
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workorbit_chat_messages');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return initialChatMessages;
  });

  const [checkins, setCheckins] = useState<CheckIn[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workorbit_checkins');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return initialCheckIns;
  });

  const [files, setFiles] = useState<FileItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workorbit_files');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return initialFiles;
  });

  const [people, setPeople] = useState<Person[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workorbit_people');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return deduplicateEmployees(parsed);
          }
        } catch (e) {}
      }
    }
    return [];
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalType, setCreateModalType] = useState<'task' | 'project' | 'employee'>('task');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  // Load persisted state from localStorage on mount so page refreshes don't lose data!
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Check sessionStorage first for strict per-tab isolation (prevents Admin and Employee tabs from exchanging on refresh)
      const sessionLoggedIn = sessionStorage.getItem('workorbit_logged_in');
      const sessionRole = sessionStorage.getItem('workorbit_dashboard_role') as 'admin' | 'employee' | null;
      const sessionUser = sessionStorage.getItem('workorbit_current_user');

      let savedLoggedIn = sessionLoggedIn === 'true';
      let savedRole = sessionRole;
      let savedUser = sessionUser;

      // 2. Fall back to localStorage if this is a fresh tab
      if (!savedLoggedIn && sessionLoggedIn === null) {
        savedLoggedIn = localStorage.getItem('workorbit_logged_in') === 'true';
      }
      if (!savedRole) {
        savedRole = localStorage.getItem('workorbit_dashboard_role') as 'admin' | 'employee' | null;
      }
      if (!savedUser) {
        if (savedRole === 'admin') {
          savedUser = localStorage.getItem('workorbit_admin_user') || localStorage.getItem('workorbit_current_user');
        } else if (savedRole === 'employee') {
          savedUser = localStorage.getItem('workorbit_employee_user') || localStorage.getItem('workorbit_current_user');
        } else {
          savedUser = localStorage.getItem('workorbit_current_user');
        }
      }

      if (savedLoggedIn && savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && typeof parsed === 'object') {
            const cleanRole: 'admin' | 'employee' =
              (savedRole === 'admin' || savedRole === 'employee')
                ? savedRole
                : (parsed.role === 'admin' || parsed.role === 'employee')
                ? parsed.role
                : parsed.email?.toLowerCase() === 'cr7156816@gmail.com'
                ? 'admin'
                : 'employee';

            const userWithRole = { ...parsed, role: cleanRole };

            setCurrentUser(userWithRole);
            setDashboardRole(cleanRole);
            setIsLoggedIn(true);

            // Persist strictly to this tab's sessionStorage
            sessionStorage.setItem('workorbit_logged_in', 'true');
            sessionStorage.setItem('workorbit_dashboard_role', cleanRole);
            sessionStorage.setItem('workorbit_current_user', JSON.stringify(userWithRole));
          }
        } catch (e) {
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
      }

      const savedPeople = localStorage.getItem('workorbit_people');
      if (savedPeople) {
        try {
          const parsed = JSON.parse(savedPeople);
          if (Array.isArray(parsed)) {
            const cleanPeople = deduplicateEmployees(parsed);
            setPeople(cleanPeople);
            localStorage.setItem('workorbit_people', JSON.stringify(cleanPeople));
          }
        } catch (e) {}
      }

      const savedProjects = localStorage.getItem('workorbit_projects');
      if (savedProjects) {
        try {
          const parsed = JSON.parse(savedProjects);
          if (Array.isArray(parsed) && parsed.length > 0) setProjects(parsed);
        } catch (e) {}
      }

      const savedFiles = localStorage.getItem('workorbit_files');
      if (savedFiles) {
        try {
          const parsed = JSON.parse(savedFiles);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const normalized = parsed.map((f: FileItem, idx: number) => {
              let createdAt = f.createdAt;
              if (!createdAt && f.id && f.id.startsWith('f-')) {
                const numericPart = Number(f.id.replace('f-', ''));
                if (!isNaN(numericPart) && numericPart > 1600000000000) {
                  createdAt = numericPart;
                }
              }
              if (!createdAt) {
                const lower = (f.uploadedAt || '').toLowerCase().trim();
                if (lower.includes('25 min')) {
                  createdAt = Date.now() - 25 * 60 * 1000;
                } else if (lower.includes('2 hour')) {
                  createdAt = Date.now() - 2 * 60 * 60 * 1000;
                } else if (lower.includes('1 day')) {
                  createdAt = Date.now() - 24 * 60 * 60 * 1000;
                } else if (lower.includes('3 day')) {
                  createdAt = Date.now() - 3 * 24 * 60 * 60 * 1000;
                } else if (lower === 'just now') {
                  createdAt = Date.now() - (idx + 1) * 4 * 60 * 1000;
                } else {
                  createdAt = Date.now();
                }
              }
              return {
                ...f,
                createdAt,
                uploadedAt: getFileRelativeTime({ ...f, createdAt }),
              };
            });
            setFiles(normalized);
            localStorage.setItem('workorbit_files', JSON.stringify(normalized));
          }
        } catch (e) {}
      }

      const savedTasks = localStorage.getItem('workorbit_tasks');
      if (savedTasks) {
        try {
          const parsed = JSON.parse(savedTasks);
          if (Array.isArray(parsed) && parsed.length > 0) setTasks(parsed);
        } catch (e) {}
      }

      const savedActivities = localStorage.getItem('workorbit_activities');
      if (savedActivities) {
        try {
          const parsed = JSON.parse(savedActivities);
          if (Array.isArray(parsed) && parsed.length > 0) setActivities(parsed);
        } catch (e) {}
      }

      const savedChatMessages = localStorage.getItem('workorbit_chat_messages');
      if (savedChatMessages) {
        try {
          const parsed = JSON.parse(savedChatMessages);
          if (Array.isArray(parsed) && parsed.length > 0) setChatMessages(parsed);
        } catch (e) {}
      }

      const savedCheckins = localStorage.getItem('workorbit_checkins');
      if (savedCheckins) {
        try {
          const parsed = JSON.parse(savedCheckins);
          if (Array.isArray(parsed) && parsed.length > 0) setCheckins(parsed);
        } catch (e) {}
      }

      const savedUnread = localStorage.getItem('workorbit_unread_count');
      if (savedUnread !== null) {
        try {
          const parsed = JSON.parse(savedUnread);
          if (typeof parsed === 'number') setUnreadCount(parsed);
        } catch (e) {}
      }

      // Live Firestore Subscriptions & Initial Seeding
      try {
        seedInitialDataToFirebase();

        const unsubChat = subscribeToChatMessages('general', (msgs) => {
          if (msgs && msgs.length > 0) setChatMessages(msgs);
        });
        const unsubEmp = subscribeToEmployees((peopleList) => {
          if (peopleList) {
            const realEmployees = deduplicateEmployees(peopleList);
            setPeople(realEmployees);
            if (typeof window !== 'undefined') {
              localStorage.setItem('workorbit_people', JSON.stringify(realEmployees));
            }
          }
        });
        const unsubTasks = subscribeToTasks((tasksList) => {
          if (tasksList && tasksList.length > 0) setTasks(tasksList);
        });
        const unsubProj = subscribeToProjects((projList) => {
          if (projList && projList.length > 0) setProjects(projList);
        });

        const loadingTimer = setTimeout(() => {
          setIsLoading(false);
        }, 220);

        return () => {
          clearTimeout(loadingTimer);
          unsubChat();
          unsubEmp();
          unsubTasks();
          unsubProj();
        };
      } catch (err) {
        console.error('Firebase subscription error:', err);
      }
    }
  }, []);

  // BROWSER BACK (←) AND FORWARD (→) BUTTON NAVIGATION HANDLING FOR ALL MAIN TABS
  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const currentHash = window.location.hash.replace('#', '');
      if (currentHash !== tab) {
        window.history.pushState({ tab }, '', `#${tab}`);
      }
    }
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (typeof window === 'undefined') return;

      const hash = window.location.hash.replace('#', '');
      const validTabs: NavTab[] = [
        'dashboard',
        'tasks',
        'projects',
        'calendar',
        'chat',
        'files',
        'people',
        'checkins',
        'reports',
      ];

      if (e.state && e.state.tab && validTabs.includes(e.state.tab)) {
        setActiveTab(e.state.tab);
      } else if (hash.startsWith('project-')) {
        setActiveTab('projects');
      } else if (validTabs.includes(hash as NavTab)) {
        setActiveTab(hash as NavTab);
      } else {
        setActiveTab('dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);

    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('project-')) {
        setActiveTab('projects');
      } else {
        const validTabs: NavTab[] = [
          'dashboard',
          'tasks',
          'projects',
          'calendar',
          'chat',
          'files',
          'people',
          'checkins',
          'reports',
        ];
        if (validTabs.includes(hash as NavTab)) {
          setActiveTab(hash as NavTab);
        }
      }
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);


  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('workorbit_logged_in');
      sessionStorage.removeItem('workorbit_current_user');
      sessionStorage.removeItem('workorbit_dashboard_role');
      localStorage.setItem('workorbit_logged_in', 'false');
      localStorage.removeItem('workorbit_current_user');
      localStorage.removeItem('workorbit_dashboard_role');
    }
  };

  const handleAddEmployee = async (name: string, email: string, role?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || cleanEmail === 'cr7156816@gmail.com' || cleanEmail.endsWith('@abctech.com')) return;

    const existing = people.find((p) => p.email && p.email.toLowerCase() === cleanEmail);
    if (existing) return existing;

    const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const colorOptions = [
      'bg-blue-100 text-blue-700',
      'bg-purple-100 text-purple-700',
      'bg-cyan-100 text-cyan-700',
      'bg-emerald-100 text-emerald-700',
      'bg-amber-100 text-amber-700',
      'bg-indigo-100 text-indigo-700',
      'bg-rose-100 text-rose-700',
    ];
    const randomBg = colorOptions[people.length % colorOptions.length];
    const formattedName = name.trim() || cleanEmail.split('@')[0];

    const newPerson: Person = {
      id: docId,
      name: formattedName,
      role: role?.trim() || 'Team Member',
      email: cleanEmail,
      status: 'active',
      avatar: formattedName[0].toUpperCase(),
      avatarBg: randomBg,
      projectsCount: 1,
    };

    setPeople((prev) => {
      const updated = deduplicateEmployees([...prev, newPerson]);
      if (typeof window !== 'undefined') {
        localStorage.setItem('workorbit_people', JSON.stringify(updated));
      }
      return updated;
    });

    const newAct: Activity = {
      id: `act-${Date.now()}`,
      userName: formattedName,
      userAvatar: newPerson.avatar,
      avatarBg: randomBg,
      action: 'joined as employee',
      target: 'Workspace Team',
      timeAgo: 'Just now',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setActivities((prev) => {
      const updated = [newAct, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('workorbit_activities', JSON.stringify(updated));
      }
      return updated;
    });

    if (typeof window !== 'undefined') {
      try {
        const regStr = localStorage.getItem('workorbit_registered_users');
        const regUsers = regStr ? JSON.parse(regStr) : [];
        if (!regUsers.some((u: any) => u.email?.toLowerCase() === cleanEmail)) {
          regUsers.push({
            email: cleanEmail,
            fullName: formattedName,
            companyName: 'GEONIXA',
            role: 'employee',
            designation: newPerson.role,
          });
          localStorage.setItem('workorbit_registered_users', JSON.stringify(regUsers));
        }
      } catch (e) {}
    }

    try {
      await addFirebaseEmployee(newPerson);
      await addFirebaseUserAccount({
        email: cleanEmail,
        password: 'Employee@123',
        fullName: formattedName,
        companyName: 'GEONIXA',
        role: 'employee',
        designation: newPerson.role,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {}

    return newPerson;
  };

  const handleLogin = (
    email?: string,
    fullName?: string,
    companyName?: string,
    role: 'admin' | 'employee' = 'employee'
  ) => {
    setIsLoggedIn(true);
    setDashboardRole(role);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('workorbit_logged_in', 'true');
      sessionStorage.setItem('workorbit_dashboard_role', role);
      localStorage.setItem('workorbit_logged_in', 'true');
      localStorage.setItem('workorbit_dashboard_role', role);

      const savedPeople = localStorage.getItem('workorbit_people');
      if (savedPeople) {
        try {
          const parsed = JSON.parse(savedPeople);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPeople(deduplicateEmployees(parsed));
          }
        } catch (e) {}
      }
      const savedActs = localStorage.getItem('workorbit_activities');
      if (savedActs) {
        try {
          const parsed = JSON.parse(savedActs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setActivities(parsed);
          }
        } catch (e) {}
      }
    }

    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      const userObj = {
        email: cleanEmail,
        fullName: fullName?.trim() || (role === 'admin' ? 'Muni' : cleanEmail.split('@')[0]),
        companyName: companyName?.trim() || 'GEONIXA',
        role,
      };
      setCurrentUser(userObj);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('workorbit_current_user', JSON.stringify(userObj));
        sessionStorage.setItem('workorbit_dashboard_role', role);
        localStorage.setItem('workorbit_current_user', JSON.stringify(userObj));
        localStorage.setItem('workorbit_dashboard_role', role);
        if (role === 'admin') {
          localStorage.setItem('workorbit_admin_user', JSON.stringify(userObj));
        } else {
          localStorage.setItem('workorbit_employee_user', JSON.stringify(userObj));
        }
      }

      if (role === 'employee' && cleanEmail !== 'cr7156816@gmail.com') {
        const existing = people.find((p) => p.email && p.email.toLowerCase() === cleanEmail);
        if (!existing) {
          let userDesignation: string | undefined;
          try {
            const savedReg = localStorage.getItem('workorbit_registered_users');
            if (savedReg) {
              const parsedReg = JSON.parse(savedReg);
              if (Array.isArray(parsedReg)) {
                const match = parsedReg.find((u: any) => u.email?.toLowerCase() === cleanEmail);
                if (match?.designation) userDesignation = match.designation;
              }
            }
          } catch (e) {}
          handleAddEmployee(userObj.fullName, cleanEmail, userDesignation);
        }
      }
    }

    setActiveTab('dashboard');
  };

  if (!isLoggedIn) {
    return <AuthView onLogin={handleLogin} people={people} />;
  }

  const handleToggleTask = async (id: string) => {
    const targetTask = tasks.find((t) => t.id === id);
    const newStatus = targetTask ? !targetTask.completed : true;

    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
      if (typeof window !== 'undefined') {
        localStorage.setItem('workorbit_tasks', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      await toggleFirebaseTask(id, newStatus);
    } catch (err) {}
  };

  const handleAddTask = async (
    taskData:
      | {
          title: string;
          description?: string;
          project: string;
          assignedTo?: string;
          priority?: 'low' | 'medium' | 'high';
          dueDate?: string;
        }
      | string,
    projectArg?: string
  ) => {
    let title = '';
    let project = 'E-Commerce Website';
    let description = '';
    let assignedTo = currentUser?.fullName || 'Rahul Kumar';
    let priority: 'low' | 'medium' | 'high' = 'medium';
    let dueDate = '2026-10-25';

    if (typeof taskData === 'object') {
      title = taskData.title;
      project = taskData.project || project;
      description = taskData.description || '';
      assignedTo = taskData.assignedTo || assignedTo;
      priority = taskData.priority || priority;
      dueDate = taskData.dueDate || dueDate;
    } else {
      title = taskData;
      if (projectArg) project = projectArg;
    }

    const newTask: Task = {
      id: `t-${Date.now()}`,
      title,
      project,
      completed: false,
      dueDate,
      assignedTo,
      priority,
      description,
    };

    setTasks((prev) => {
      const updated = [newTask, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('workorbit_tasks', JSON.stringify(updated));
      }
      return updated;
    });

    const newAct: Activity = {
      id: `act-${Date.now()}`,
      userName: assignedTo,
      userAvatar: assignedTo[0]?.toUpperCase() || 'R',
      avatarBg: 'bg-[#6CC04A] text-white',
      action: 'created task',
      target: title,
      timeAgo: 'Just now',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setActivities((prev) => {
      const updated = [newAct, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('workorbit_activities', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      await addFirebaseTask(newTask);
    } catch (err) {}
  };

  const handleUpdateEmployee = async (email: string, updates: Partial<Person>) => {
    const cleanEmail = email.toLowerCase().trim();
    setPeople((prev) => {
      const updated = prev.map((p) => (p.email.toLowerCase() === cleanEmail ? { ...p, ...updates } : p));
      if (typeof window !== 'undefined') {
        localStorage.setItem('workorbit_people', JSON.stringify(updated));
      }
      return updated;
    });
    try {
      await updateFirebaseEmployee(cleanEmail, updates);
    } catch (e) {}
  };

  const handleDeleteEmployee = async (email: string) => {
    const cleanEmail = email.toLowerCase().trim();
    setPeople((prev) => {
      const updated = prev.filter((p) => p.email.toLowerCase() !== cleanEmail);
      if (typeof window !== 'undefined') {
        localStorage.setItem('workorbit_people', JSON.stringify(updated));
      }
      return updated;
    });
    try {
      await deleteFirebaseEmployee(cleanEmail);
    } catch (e) {}
  };

  // Add Project with localStorage & Firebase Persistence
  const handleAddProject = async (
    projectData:
      | {
          name: string;
          description: string;
          manager?: string;
          members?: string[];
          deadline?: string;
          requiredDocuments?: string[];
        }
      | string,
    descArg?: string
  ) => {
    let name = '';
    let description = '';
    let manager = currentUser?.fullName || 'Rahul Kumar';
    let members: string[] = [manager];
    let deadline = '2026-11-30';
    let requiredDocuments: string[] = [];

    if (typeof projectData === 'object') {
      name = projectData.name;
      description = projectData.description || 'New project workspace.';
      manager = projectData.manager || manager;
      members = projectData.members && projectData.members.length > 0 ? projectData.members : [manager];
      deadline = projectData.deadline || deadline;
      requiredDocuments = projectData.requiredDocuments || [];
    } else {
      name = projectData;
      description = descArg || 'New project workspace.';
    }

    const newProj: Project = {
      id: `p-${Date.now()}`,
      name,
      status: 'active',
      progress: 0,
      openToDos: 5,
      members,
      description,
      updatedAt: 'Just now',
      deadline,
      manager,
      requiredDocuments,
    };

    setProjects((prev) => {
      const updated = [newProj, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('workorbit_projects', JSON.stringify(updated));
      }
      return updated;
    });

    // Record activity for new project creation
    const newAct: Activity = {
      id: `act-${Date.now()}`,
      userName: manager,
      userAvatar: manager[0]?.toUpperCase() || 'R',
      avatarBg: 'bg-[#6CC04A] text-white',
      action: 'created project',
      target: name,
      timeAgo: 'Just now',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setActivities((prev) => {
      const updated = [newAct, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('workorbit_activities', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      await addFirebaseProject(newProj);
    } catch (err) {}
  };

  const handleSendMessage = async (content: string, channel: string) => {
    const senderName = currentUser?.fullName || (dashboardRole === 'admin' ? 'Muni' : 'Team Member');
    const senderAvatar = senderName[0]?.toUpperCase() || 'U';
    const newMsg: ChatMessage = {
      id: `c-${Date.now()}`,
      sender: senderName,
      senderAvatar,
      avatarBg: dashboardRole === 'admin' ? 'bg-[#011826] text-white' : 'bg-blue-100 text-blue-700',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel,
    };
    setChatMessages((prev) => {
      const updated = [...prev, newMsg];
      if (typeof window !== 'undefined') {
        localStorage.setItem('workorbit_chat_messages', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      await addFirebaseChatMessage({
        sender: senderName,
        senderAvatar,
        avatarBg: dashboardRole === 'admin' ? 'bg-[#011826] text-white' : 'bg-blue-100 text-blue-700',
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        channel,
      });
    } catch (err) {}
  };

  const handleAddCheckIn = async (question: string, answer: string) => {
    const authorName = currentUser?.fullName || (dashboardRole === 'admin' ? 'Muni' : 'Team Member');
    const authorAvatar = authorName[0]?.toUpperCase() || 'U';
    const newChk: CheckIn = {
      id: `chk-${Date.now()}`,
      question,
      author: authorName,
      authorAvatar,
      avatarBg: dashboardRole === 'admin' ? 'bg-[#011826] text-white' : 'bg-blue-100 text-blue-700',
      answer,
      timeAgo: 'Just now',
      responsesCount: 1,
    };
    setCheckins((prev) => {
      const updated = [newChk, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('workorbit_checkins', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleUploadFile = async (newFile: FileItem) => {
    const uploaderName = currentUser?.fullName || (dashboardRole === 'admin' ? 'Muni' : 'Team Member');
    const uploaderAvatar = uploaderName[0]?.toUpperCase() || 'U';
    const fileWithTime: FileItem = {
      ...newFile,
      uploadedBy: uploaderName,
      createdAt: newFile.createdAt || Date.now(),
      uploadedAt: getFileRelativeTime(newFile),
    };

    setFiles((prev) => {
      const updated = [fileWithTime, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('workorbit_files', JSON.stringify(updated));
      }
      return updated;
    });

    const newAct: Activity = {
      id: `act-${Date.now()}`,
      userName: uploaderName,
      userAvatar: uploaderAvatar,
      avatarBg: 'bg-purple-100 text-purple-700',
      action: 'uploaded file',
      target: newFile.name,
      timeAgo: 'Just now',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setActivities((prev) => {
      const updated = [newAct, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('workorbit_activities', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFile),
      });
    } catch (err) {}
  };

  const handleClearNotifications = () => {
    setUnreadCount(0);
    if (typeof window !== 'undefined') {
      localStorage.setItem('workorbit_unread_count', '0');
    }
  };

  const pendingTasksCount = tasks.filter((t) => !t.completed).length;

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col bg-[#F4F6F8]">
      {/* Top Header - Fixed at Top */}
      <Header
        onOpenCreateModal={() => {
          setCreateModalType('task');
          setIsCreateModalOpen(true);
        }}
        onNavigate={handleTabChange}
        onToggleNotifications={() => setIsNotificationsOpen(!isNotificationsOpen)}
        unreadNotifications={unreadCount}
        onLogout={handleLogout}
        currentUser={currentUser}
        currentRole={dashboardRole}
      />

      {/* Popover Notifications */}
      <NotificationPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onClear={handleClearNotifications}
        unreadCount={unreadCount}
      />

      {/* Main Container */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Left Sidebar - Fixed */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          tasksCount={pendingTasksCount}
          chatCount={3}
          storageUsedGB={initialStats.storageUsedGB}
          storageTotalGB={initialStats.storageTotalGB}
          isAdmin={dashboardRole === 'admin'}
        />

        {/* Right Main Content Area - Scrollable */}
        <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 lg:p-8 w-full min-w-0 bg-[#F4F6F8]">
          {isLoading ? (
            activeTab === 'dashboard' && dashboardRole === 'employee' ? (
              <EmployeeDashboardSkeleton />
            ) : activeTab === 'dashboard' ? (
              <DashboardSkeleton />
            ) : activeTab === 'tasks' ? (
              <TasksSkeleton />
            ) : activeTab === 'projects' ? (
              <ProjectsSkeleton />
            ) : activeTab === 'calendar' ? (
              <CalendarSkeleton />
            ) : activeTab === 'chat' ? (
              <ChatSkeleton />
            ) : activeTab === 'files' ? (
              <FilesSkeleton />
            ) : activeTab === 'people' ? (
              <PeopleSkeleton />
            ) : activeTab === 'checkins' ? (
              <CheckinsSkeleton />
            ) : (
              <ReportsSkeleton />
            )
          ) : (
            <>
              {activeTab === 'dashboard' && dashboardRole === 'admin' && (
                <DashboardView
                  stats={{
                    ...initialStats,
                    projectsTotal: projects.length,
                    projectsActive: projects.filter((p) => p.status === 'active').length,
                    teamOnline: people.filter((p) => p.status === 'active').length,
                    employeesTotal: people.length,
                  }}
                  tasks={tasks}
                  activities={activities}
                  people={people}
                  onToggleTask={handleToggleTask}
                  onOpenAddTask={() => setIsCreateModalOpen(true)}
                  onViewAllTasks={() => handleTabChange('tasks')}
                  onViewEmployees={() => handleTabChange('people')}
                  onViewProjects={() => handleTabChange('projects')}
                  onViewCalendar={() => handleTabChange('calendar')}
                  onViewActivity={() => handleTabChange('reports')}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'dashboard' && dashboardRole === 'employee' && (
                <EmployeeDashboardView
                  tasks={tasks}
                  projects={projects}
                  activities={activities}
                  people={people}
                  currentUser={currentUser}
                  onToggleTask={handleToggleTask}
                  onAddTask={handleAddTask}
                  onViewProjects={() => handleTabChange('projects')}
                  onViewTasks={() => handleTabChange('tasks')}
                  onViewChat={() => handleTabChange('chat')}
                  onViewCalendar={() => handleTabChange('calendar')}
                  onViewCheckins={() => handleTabChange('checkins')}
                  onViewEmployees={() => handleTabChange('people')}
                />
              )}

              {activeTab === 'tasks' && (
                <TasksView
                  tasks={tasks}
                  onToggleTask={handleToggleTask}
                  onOpenAddTask={() => setIsCreateModalOpen(true)}
                  isAdmin={dashboardRole === 'admin'}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'projects' && (
                <ProjectsView
                  projects={projects}
                  tasks={tasks}
                  files={files}
                  onOpenCreateProject={() => setIsCreateModalOpen(true)}
                  isAdmin={dashboardRole === 'admin'}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'calendar' && <CalendarView />}

              {activeTab === 'chat' && (
                <ChatView messages={chatMessages} onSendMessage={handleSendMessage} />
              )}

              {activeTab === 'files' && (
                <FilesView
                  files={files}
                  onUploadFile={handleUploadFile}
                  isAdmin={dashboardRole === 'admin'}
                  currentUser={currentUser}
                  projects={projects}
                />
              )}

              {activeTab === 'people' && (
                <PeopleView
                  people={people}
                  isAdmin={dashboardRole === 'admin'}
                  onOpenAddEmployee={
                    dashboardRole === 'admin'
                      ? () => {
                          setCreateModalType('employee');
                          setIsCreateModalOpen(true);
                        }
                      : undefined
                  }
                  onUpdateEmployee={handleUpdateEmployee}
                  onDeleteEmployee={handleDeleteEmployee}
                />
              )}

              {activeTab === 'checkins' && (
                <CheckinsView checkins={checkins} onAddCheckIn={handleAddCheckIn} />
              )}

              {activeTab === 'reports' && <ReportsView activities={activities} />}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      <CreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onAddTask={handleAddTask}
        onAddProject={handleAddProject}
        onAddEmployee={handleAddEmployee}
        people={people}
        projects={projects}
        initialType={createModalType}
        isAdmin={dashboardRole === 'admin'}
      />

    </div>
  );
}
