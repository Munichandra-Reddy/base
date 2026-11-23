'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { CreateModal } from './components/CreateModal';
import { NotificationPanel } from './components/NotificationPanel';
import { NotificationsView } from './components/NotificationsView';
import { ReportsView } from './components/ReportsView';
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
  updateEmployeePresence,
} from '@/lib/firebaseServices';
import { isPersonOnline, isTaskDueSoon } from '@/lib/dashboardCalculations';
import { BasecampNotification } from '@/lib/types';
import {
  subscribeToUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  notifyTaskAssigned,
  notifyTaskApproved,
  notifyTaskChangesRequested,
  notifyTaskReassigned,
  notifyProjectMemberAdded,
  notifyProjectUpdated,
  runScheduledReminderScan,
} from '@/lib/firebaseNotificationService';

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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#project-')) {
      return window.location.hash.replace('#project-', '');
    }
    return null;
  });
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

  const [campfireUnreadCount, setCampfireUnreadCount] = useState<number>(0);
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
  const [notifications, setNotifications] = useState<BasecampNotification[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workorbit_user_notifications');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }
    }
    return [];
  });

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead && n.status !== 'deleted').length;
  }, [notifications]);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [globalToast, setGlobalToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    if (globalToast) {
      const timer = setTimeout(() => {
        setGlobalToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [globalToast]);

  // Real-Time Employee Presence Heartbeat & Activity Tracking (5-Minute Threshold)
  useEffect(() => {
    if (!isLoggedIn || !currentUser || !currentUser.email) return;

    // 1. Immediate presence update
    updateEmployeePresence(currentUser);

    // 2. Periodic heartbeat every 2 minutes
    const heartbeat = setInterval(() => {
      updateEmployeePresence(currentUser);
    }, 120_000);

    // 3. User interaction listener (throttled to once per minute)
    let lastActivityTime = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastActivityTime > 60_000) {
        lastActivityTime = now;
        updateEmployeePresence(currentUser);
      }
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
    };
  }, [isLoggedIn, currentUser]);

  // Phase 9: Real-Time User Notifications Subscription & Reminder Scan
  useEffect(() => {
    const userEmail = currentUser?.email || (dashboardRole === 'admin' ? 'cr7156816@gmail.com' : '');
    if (!userEmail) return;

    const unsub = subscribeToUserNotifications(userEmail, (notifList) => {
      setNotifications(notifList);
    });

    runScheduledReminderScan(tasks, projects, userEmail).catch(() => {});

    const reminderInterval = setInterval(() => {
      runScheduledReminderScan(tasks, projects, userEmail).catch(() => {});
    }, 60000);

    return () => {
      unsub();
      clearInterval(reminderInterval);
    };
  }, [currentUser?.email, dashboardRole, tasks.length, projects.length]);

  const handleMarkNotificationAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: Date.now() } : n))
    );
    await markNotificationAsRead(id);
  };

  const handleMarkAllNotificationsAsRead = async () => {
    const userEmail = currentUser?.email || (dashboardRole === 'admin' ? 'cr7156816@gmail.com' : '');
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: Date.now() }))
    );
    if (userEmail) {
      await markAllNotificationsAsRead(userEmail);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(id);
  };

  const handleSelectNotification = (notif: BasecampNotification) => {
    if (!notif.isRead) {
      handleMarkNotificationAsRead(notif.id);
    }

    if (notif.relatedEntityType === 'task' || notif.taskId) {
      handleTabChange('tasks');
    } else if (notif.relatedEntityType === 'project' || notif.projectId) {
      if (notif.projectId) {
        handleOpenProject(notif.projectId);
      } else {
        handleTabChange('projects');
      }
    } else if (notif.relatedEntityType === 'chat' || notif.conversationId) {
      handleTabChange('chat');
    } else if (notif.relatedEntityType === 'calendar' || notif.eventId) {
      handleTabChange('calendar');
    } else if (notif.relatedEntityType === 'file' || notif.fileId) {
      handleTabChange('files');
    } else {
      handleTabChange('notifications');
    }
  };

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
          if (tasksList) {
            setTasks(tasksList);
            if (typeof window !== 'undefined') {
              localStorage.setItem('workorbit_tasks', JSON.stringify(tasksList));
            }
          }
        });
        const unsubProj = subscribeToProjects((projList) => {
          if (projList) {
            setProjects(projList);
            if (typeof window !== 'undefined') {
              localStorage.setItem('workorbit_projects', JSON.stringify(projList));
            }
          }
        });
        const unsubFiles = subscribeToFiles((filesList) => {
          if (filesList && filesList.length > 0) {
            setFiles(filesList);
            if (typeof window !== 'undefined') {
              localStorage.setItem('workorbit_files', JSON.stringify(filesList));
            }
          }
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
          unsubFiles();
        };
      } catch (err) {
        console.error('Firebase subscription error:', err);
      }
    }
  }, []);

  // BROWSER BACK (←) AND FORWARD (→) BUTTON NAVIGATION HANDLING FOR ALL MAIN TABS
  const handleTabChange = (tab: NavTab) => {
    setIsMobileSidebarOpen(false);
    if (tab === 'projects') {
      setSelectedProjectId(null);
    }
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const currentHash = window.location.hash.replace('#', '').trim();
      if (currentHash !== tab || (tab === 'projects' && selectedProjectId)) {
        window.history.pushState({ tab }, '', `#${tab}`);
      }
    }
  };

  const handleOpenProject = (projectIdOrName: string) => {
    const found = projects.find(
      (p) =>
        p.id === projectIdOrName ||
        p.name.toLowerCase().trim() === projectIdOrName.toLowerCase().trim()
    );
    const targetId = found ? found.id : projectIdOrName;
    setSelectedProjectId(targetId);
    setActiveTab('projects');
    if (typeof window !== 'undefined') {
      const currentHash = window.location.hash.replace('#', '').trim();
      if (currentHash !== `project-${targetId}`) {
        window.history.pushState(
          { tab: 'projects', projectId: targetId, view: 'project_details' },
          '',
          `#project-${targetId}`
        );
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const syncStateFromUrl = () => {
      if (typeof window === 'undefined') return;

      const hash = window.location.hash.replace('#', '').trim();
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
        'notifications',
      ];

      const state = window.history.state;

      if (state && state.projectId) {
        setSelectedProjectId(state.projectId);
        setActiveTab('projects');
      } else if (hash.startsWith('project-')) {
        const pId = hash.replace('project-', '');
        setSelectedProjectId(pId);
        setActiveTab('projects');
      } else if (state && state.tab && validTabs.includes(state.tab)) {
        if (state.tab === 'projects') setSelectedProjectId(null);
        setActiveTab(state.tab);
      } else if (validTabs.includes(hash as NavTab)) {
        if (hash === 'projects') setSelectedProjectId(null);
        setActiveTab(hash as NavTab);
      } else if (!hash) {
        setSelectedProjectId(null);
        setActiveTab('dashboard');
      }
    };

    window.addEventListener('popstate', syncStateFromUrl);
    window.addEventListener('hashchange', syncStateFromUrl);

    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash.startsWith('project-')) {
        const pId = hash.replace('project-', '');
        setSelectedProjectId(pId);
        setActiveTab('projects');
        window.history.replaceState(
          { tab: 'projects', projectId: pId, view: 'project_details' },
          '',
          `#${hash}`
        );
      } else if (hash) {
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
          'notifications',
        ];
        if (validTabs.includes(hash as NavTab)) {
          setActiveTab(hash as NavTab);
          window.history.replaceState({ tab: hash }, '', `#${hash}`);
        }
      } else {
        window.history.replaceState({ tab: 'dashboard' }, '', '#dashboard');
      }
    }

    return () => {
      window.removeEventListener('popstate', syncStateFromUrl);
      window.removeEventListener('hashchange', syncStateFromUrl);
    };
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

  const handleAddEmployee = async (employeeData: {
    fullName: string;
    email: string;
    accessRole: 'admin' | 'employee';
    designation: string;
    department: string;
    phone?: string;
    employeeId: string;
    joiningDate: string;
  }) => {
    const res = await fetch('/api/employees/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': currentUser?.email || 'cr7156816@gmail.com',
      },
      body: JSON.stringify({
        ...employeeData,
        adminEmail: currentUser?.email || 'cr7156816@gmail.com',
        isAdmin: dashboardRole === 'admin',
      }),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to create employee');
    }

    const createdPerson: Person = data.employee;

    setPeople((prev) => {
      const updated = deduplicateEmployees([...prev, createdPerson]);
      if (typeof window !== 'undefined') {
        localStorage.setItem('workorbit_people', JSON.stringify(updated));
      }
      return updated;
    });

    const newAct: Activity = {
      id: `act-${Date.now()}`,
      userName: currentUser?.fullName || 'Admin',
      userAvatar: (currentUser?.fullName || 'A')[0].toUpperCase(),
      avatarBg: 'bg-[#011826] text-white',
      action: 'invited employee',
      target: `${createdPerson.name} (${createdPerson.role})`,
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

    setGlobalToast({
      type: 'success',
      message: data.message || `Employee "${createdPerson.name}" created and invitation email sent!`,
    });

    return createdPerson;
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
          handleAddEmployee({
            fullName: userObj.fullName,
            email: cleanEmail,
            accessRole: 'employee',
            designation: userDesignation || 'Team Member',
            department: 'Engineering',
            employeeId: `EMP-${Date.now().toString().slice(-4)}`,
            joiningDate: new Date().toISOString().split('T')[0],
          });
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
      // Phase 9: Task approved notification if completed by Admin
      if (dashboardRole === 'admin' && newStatus === true && targetTask?.assignedToEmail) {
        notifyTaskApproved({
          taskId: id,
          taskTitle: targetTask.title,
          projectId: targetTask.projectId,
          projectName: targetTask.project,
          submitterEmail: targetTask.assignedToEmail,
          actorName: currentUser?.fullName || 'Workspace Admin',
        }).catch(() => {});
      }
    } catch (err) {}
  };

  const handleAddTask = async (
    taskData:
      | {
          title: string;
          description?: string;
          project: string;
          assignedTo?: string;
          priority?: 'low' | 'medium' | 'high' | 'critical';
          dueDate?: string;
          startDate?: string;
          instructions?: string;
          adminNotes?: string;
        }
      | string,
    projectArg?: string
  ) => {
    let title = '';
    let project = 'E-Commerce Website';
    let description = '';
    let assignedTo = currentUser?.fullName || 'Rahul Kumar';
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let dueDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    let startDate = new Date().toISOString().split('T')[0];
    let instructions = '';
    let adminNotes = '';

    if (typeof taskData === 'object') {
      title = taskData.title;
      project = taskData.project || project;
      description = taskData.description || '';
      assignedTo = taskData.assignedTo || assignedTo;
      priority = (taskData.priority as any) || priority;
      dueDate = taskData.dueDate || dueDate;
      startDate = taskData.startDate || startDate;
      instructions = taskData.instructions || '';
      adminNotes = taskData.adminNotes || '';
    } else {
      title = taskData;
      if (projectArg) project = projectArg;
    }

    const matchedProject = projects.find((p) => p.name === project || p.id === project);
    const matchedEmployee = people.find((p) => p.name === assignedTo || p.email === assignedTo);

    const docId = `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const candidateTaskId = `TSK-${String(1001 + tasks.length).padStart(4, '0')}`;
    const nowIso = new Date().toISOString();

    const newTask: Task = {
      id: docId,
      taskId: candidateTaskId,
      title,
      description,
      project,
      projectId: matchedProject ? matchedProject.id : '',
      completed: false,
      status: 'pending',
      priority,
      assignedTo,
      assignedToId: matchedEmployee ? matchedEmployee.id : '',
      assignedToEmail: matchedEmployee ? matchedEmployee.email : '',
      assignedToRole: matchedEmployee?.role || matchedEmployee?.designation || '',
      assignedToDept: matchedEmployee?.department || '',
      assignedBy: currentUser?.email || 'Admin',
      assignedByName: currentUser?.fullName || 'Workspace Administrator',
      startDate,
      dueDate,
      progress: 0,
      instructions,
      adminNotes,
      attachments: [],
      comments: [],
      submissions: [],
      activities: [
        {
          id: `act_${Date.now()}_1`,
          taskId: candidateTaskId,
          projectId: matchedProject ? matchedProject.id : '',
          performedBy: currentUser?.email || 'Admin',
          performedByName: currentUser?.fullName || 'Workspace Administrator',
          activityType: 'task_created',
          description: `Task "${title}" created and assigned to ${assignedTo}.`,
          timestamp: nowIso,
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
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
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
    } catch (err) {
      try {
        await addFirebaseTask(newTask);
      } catch (e) {}
    }

    // Phase 9: Trigger Task Assigned Notification
    const targetAssigneeEmail = matchedEmployee?.email || (assignedTo.includes('@') ? assignedTo : '');
    if (targetAssigneeEmail) {
      notifyTaskAssigned({
        taskId: newTask.id,
        taskTitle: title,
        projectId: matchedProject ? matchedProject.id : '',
        projectName: project,
        assigneeEmail: targetAssigneeEmail,
        assigneeName: assignedTo,
        actorName: currentUser?.fullName || 'Workspace Administrator',
        actorUid: currentUser?.email || 'Admin',
      }).catch(() => {});
    }

    setGlobalToast({
      message: `Task "${title}" has been assigned to ${assignedTo} successfully.`,
      type: 'success',
    });
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

  // Add Project with Firestore & Backend Persistence
  const handleAddProject = async (
    projectData:
      | {
          name: string;
          description: string;
          manager?: string;
          managerEmail?: string;
          members?: string[];
          startDate?: string;
          endDate?: string;
          deadline?: string;
          priority?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
          category?: string;
          notes?: string;
          requiredDocuments?: string[];
        }
      | string,
    descArg?: string
  ) => {
    let name = '';
    let description = '';
    let manager = currentUser?.fullName || 'Workspace Admin';
    let managerEmail = currentUser?.email || '';
    let members: string[] = [manager];
    const nowStr = new Date().toISOString().split('T')[0];
    const defaultEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    let startDate = nowStr;
    let endDate = defaultEnd;
    let priority = 'medium';
    let status = 'planning';
    let category = 'Web Development';
    let notes = '';
    let requiredDocuments: string[] = [];

    if (typeof projectData === 'object') {
      name = projectData.name;
      description = projectData.description || 'New project workspace.';
      manager = projectData.manager || manager;
      managerEmail = projectData.managerEmail || managerEmail;
      members = projectData.members && projectData.members.length > 0 ? projectData.members : [manager];
      startDate = projectData.startDate || startDate;
      endDate = projectData.endDate || projectData.deadline || endDate;
      priority = projectData.priority || priority;
      status = projectData.status || status;
      category = projectData.category || category;
      notes = projectData.notes || notes;
      requiredDocuments = projectData.requiredDocuments || [];
    } else {
      name = projectData;
      description = descArg || 'New project workspace.';
    }

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': currentUser?.email || 'admin@basecamp.com',
        },
        body: JSON.stringify({
          name,
          description,
          manager,
          managerEmail,
          members,
          startDate,
          endDate,
          priority,
          status,
          category,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success && data.project) {
        setProjects((prev) => [data.project, ...prev.filter((p) => p.id !== data.project.id)]);
        // Phase 9: Project member added notification
        (members || []).forEach((memberEmail) => {
          notifyProjectMemberAdded({
            projectId: data.project.id,
            projectName: name,
            memberEmail,
            managerName: manager,
            actorName: currentUser?.fullName || 'Workspace Admin',
          }).catch(() => {});
        });
      }
    } catch (e) {
      console.error('Error creating project via backend:', e);
    }
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
    handleMarkAllNotificationsAsRead();
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
        unreadNotifications={unreadNotificationsCount}
        onLogout={handleLogout}
        currentUser={currentUser}
        currentRole={dashboardRole}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      {/* Global Toast Alert */}
      {globalToast && (
        <div className="fixed top-4 right-4 z-50 max-w-md p-3.5 bg-white border border-[#E5E5E5] shadow-xl rounded-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="text-base">{globalToast.type === 'success' ? '✅' : '⚠️'}</span>
            <span className={`text-xs font-semibold ${globalToast.type === 'success' ? 'text-[#166534]' : 'text-[#991B1B]'}`}>
              {globalToast.message}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setGlobalToast(null)}
            className="text-xs text-gray-400 hover:text-gray-600 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Popover Notifications */}
      <NotificationPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onClear={handleMarkAllNotificationsAsRead}
        unreadCount={unreadNotificationsCount}
        items={notifications}
        onSelectNotification={handleSelectNotification}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onDeleteNotification={handleDeleteNotification}
        onViewAll={() => handleTabChange('notifications')}
      />

      {/* Main Container */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Left Sidebar - Fixed on desktop, Drawer on mobile/tablet */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          tasksCount={pendingTasksCount}
          chatCount={campfireUnreadCount}
          storageUsedGB={initialStats.storageUsedGB}
          storageTotalGB={initialStats.storageTotalGB}
          isAdmin={dashboardRole === 'admin'}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          currentUser={currentUser}
          currentRole={dashboardRole}
          onLogout={handleLogout}
        />

        {/* Right Main Content Area - Scrollable */}
        <main className="flex-1 h-full overflow-y-auto p-3 sm:p-5 lg:p-8 w-full min-w-0 bg-[#F4F6F8]">
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
            ) : activeTab === 'reports' ? (
              <ReportsSkeleton />
            ) : (
              <PeopleSkeleton />
            )
          ) : (
            <>
              {activeTab === 'dashboard' && dashboardRole === 'admin' && (
                <DashboardView
                  stats={{
                    projectsTotal: projects.length,
                    projectsActive: projects.filter(
                      (p) => (p.status || '').toLowerCase() === 'active'
                    ).length,
                    todosTotal: tasks.length,
                    todosInProgress: tasks.filter((t) => t.status === 'in_progress').length,
                    dueSoon: tasks.filter((t) => isTaskDueSoon(t)).length,
                    teamOnline: people.filter(
                      (p) => (p.status || 'active') === 'active' && isPersonOnline(p)
                    ).length,
                    employeesTotal: people.length,
                    storageUsedGB: 7.5,
                    storageTotalGB: 10,
                  }}
                  tasks={tasks}
                  activities={activities}
                  people={people}
                  projects={projects}
                  onToggleTask={handleToggleTask}
                  onOpenAddTask={() => setIsCreateModalOpen(true)}
                  onViewAllTasks={() => handleTabChange('tasks')}
                  onViewEmployees={() => handleTabChange('people')}
                  onViewProjects={() => {
                    setSelectedProjectId(null);
                    handleTabChange('projects');
                  }}
                  onSelectProject={handleOpenProject}
                  onViewCalendar={() => handleTabChange('calendar')}
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
                  onViewProjects={() => {
                    setSelectedProjectId(null);
                    handleTabChange('projects');
                  }}
                  onSelectProject={handleOpenProject}
                  onViewTasks={() => handleTabChange('tasks')}
                  onViewChat={() => handleTabChange('chat')}
                  onViewCalendar={() => handleTabChange('calendar')}
                  onViewEmployees={() => handleTabChange('people')}
                />
              )}

              {activeTab === 'tasks' && (
                <TasksView
                  tasks={tasks}
                  projects={projects}
                  people={people}
                  onToggleTask={handleToggleTask}
                  onOpenAddTask={() => {
                    setCreateModalType('task');
                    setIsCreateModalOpen(true);
                  }}
                  isAdmin={dashboardRole === 'admin'}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'projects' && (
                <ProjectsView
                  projects={projects}
                  tasks={tasks}
                  files={files}
                  people={people}
                  onOpenCreateProject={() => {
                    setCreateModalType('project');
                    setIsCreateModalOpen(true);
                  }}
                  isAdmin={dashboardRole === 'admin'}
                  currentUser={currentUser}
                  selectedProjectId={selectedProjectId}
                  onSelectProject={(proj) => {
                    if (proj) {
                      handleOpenProject(proj.id);
                    } else {
                      setSelectedProjectId(null);
                      if (typeof window !== 'undefined') {
                        const hash = window.location.hash.replace('#', '').trim();
                        if (hash.startsWith('project-')) {
                          window.history.pushState({ tab: 'projects' }, '', '#projects');
                        }
                      }
                    }
                  }}
                  onUpdateProject={(updatedProj) => {
                    setProjects((prev) =>
                      prev.map((p) => (p.id === updatedProj.id ? updatedProj : p))
                    );
                  }}
                  onDeleteProject={(projId) => {
                    setProjects((prev) => prev.filter((p) => p.id !== projId));
                  }}
                  onNavigateToEmployee={(email) => {
                    handleTabChange('people');
                  }}
                />
              )}

              {activeTab === 'calendar' && (
                <CalendarView
                  tasks={tasks}
                  projects={projects}
                  currentUser={currentUser}
                  isAdmin={dashboardRole === 'admin'}
                />
              )}

              {activeTab === 'chat' && (
                <ChatView
                  currentUser={currentUser}
                  isAdmin={dashboardRole === 'admin'}
                  people={people}
                  projects={projects}
                  onUpdateUnreadCount={(cnt) => setCampfireUnreadCount(cnt)}
                  messages={chatMessages}
                  onSendMessage={handleSendMessage}
                />
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
                  projects={projects}
                  tasks={tasks}
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
                  onNavigateToProjects={() => handleTabChange('projects')}
                />
              )}

              {activeTab === 'notifications' && (
                <NotificationsView
                  notifications={notifications}
                  onSelectNotification={handleSelectNotification}
                  onMarkAsRead={handleMarkNotificationAsRead}
                  onMarkAllAsRead={handleMarkAllNotificationsAsRead}
                  onDeleteNotification={handleDeleteNotification}
                  currentUser={currentUser}
                  isAdmin={dashboardRole === 'admin'}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsView
                  tasks={tasks}
                  projects={projects}
                  people={people}
                  activities={activities}
                  currentUser={currentUser}
                  isAdmin={dashboardRole === 'admin'}
                  onNavigateToProject={(pId) => handleOpenProject(pId)}
                  onNavigateToEmployee={() => handleTabChange('people')}
                  onNavigateToTasks={() => handleTabChange('tasks')}
                />
              )}
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
