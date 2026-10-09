'use client';

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TasksView } from './components/TasksView';
import { ProjectsView } from './components/ProjectsView';
import { CalendarView } from './components/CalendarView';
import { ChatView } from './components/ChatView';
import { FilesView } from './components/FilesView';
import { PeopleView } from './components/PeopleView';
import { CheckinsView } from './components/CheckinsView';
import { ReportsView } from './components/ReportsView';
import { CreateModal } from './components/CreateModal';
import { SearchModal } from './components/SearchModal';
import { NotificationPanel } from './components/NotificationPanel';
import { AuthView } from './components/AuthView';

import {
  initialStats,
  initialTasks,
  initialActivities,
  initialProjects,
  initialChatMessages,
  initialPeople,
  initialCheckIns,
  initialFiles,
} from '@/lib/data';

import { Task, Activity, Project, ChatMessage, CheckIn, FileItem, Person } from '@/lib/types';
import {
  subscribeToChatMessages,
  addFirebaseChatMessage,
  subscribeToEmployees,
  addFirebaseEmployee,
  subscribeToTasks,
  addFirebaseTask,
  toggleFirebaseTask,
  subscribeToProjects,
  addFirebaseProject,
  subscribeToCheckIns,
  addFirebaseCheckIn,
  subscribeToFiles,
  addFirebaseFile,
} from '@/lib/firebaseServices';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [checkins, setCheckins] = useState<CheckIn[]>(initialCheckIns);
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [people, setPeople] = useState<Person[]>(initialPeople);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  // Load persisted state from localStorage on mount so page refreshes don't lose data!
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPeople = localStorage.getItem('workorbit_people');
      if (savedPeople) {
        try {
          const parsed = JSON.parse(savedPeople);
          if (Array.isArray(parsed) && parsed.length > 0) setPeople(parsed);
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
          if (Array.isArray(parsed) && parsed.length > 0) setFiles(parsed);
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

      // Live Firestore Subscriptions
      try {
        const unsubChat = subscribeToChatMessages('general', (msgs) => {
          if (msgs && msgs.length > 0) setChatMessages(msgs);
        });
        const unsubEmp = subscribeToEmployees((peopleList) => {
          if (peopleList && peopleList.length > 0) setPeople(peopleList);
        });
        const unsubTasks = subscribeToTasks((tasksList) => {
          if (tasksList && tasksList.length > 0) setTasks(tasksList);
        });
        const unsubProj = subscribeToProjects((projList) => {
          if (projList && projList.length > 0) setProjects(projList);
        });

        return () => {
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

  // Keyboard shortcut for Cmd+F / Ctrl+K search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  const handleAddEmployee = async (name: string, email: string, role?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const existing = people.find((p) => p.email.toLowerCase() === cleanEmail);
    if (existing) return existing;

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
      id: `usr-${Date.now()}`,
      name: formattedName,
      role: role?.trim() || 'Team Member',
      email: cleanEmail,
      status: 'active',
      avatar: formattedName[0].toUpperCase(),
      avatarBg: randomBg,
      projectsCount: 1,
    };

    setPeople((prev) => {
      const updated = [...prev, newPerson];
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

    try {
      await addFirebaseEmployee(newPerson);
    } catch (err) {}

    return newPerson;
  };

  const handleLogin = (email?: string, fullName?: string) => {
    setIsLoggedIn(true);
    setActiveTab('dashboard');

    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      const existing = people.find((p) => p.email.toLowerCase() === cleanEmail);
      if (!existing) {
        handleAddEmployee(fullName || email.split('@')[0], cleanEmail);
      }
    }
  };

  if (!isLoggedIn) {
    return <AuthView onLogin={handleLogin} />;
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

  const handleAddTask = async (title: string, project: string) => {
    const newTask: Task = {
      id: `t-${Date.now()}`,
      title,
      project,
      completed: false,
      dueDate: '2026-10-05',
      assignedTo: 'Rahul Kumar',
      priority: 'high',
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
      userName: 'Rahul Kumar',
      userAvatar: 'R',
      avatarBg: 'bg-blue-100 text-blue-700',
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

  // Add Project with localStorage & Firebase Persistence
  const handleAddProject = async (name: string, description: string) => {
    const newProj: Project = {
      id: `p-${Date.now()}`,
      name,
      status: 'active',
      progress: 10,
      openToDos: 6,
      members: ['Rahul Kumar'],
      description: description || 'New project workspace.',
      updatedAt: 'Just now',
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
      userName: 'Rahul Kumar',
      userAvatar: 'R',
      avatarBg: 'bg-cyan-100 text-cyan-700',
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
    const newMsg: ChatMessage = {
      id: `c-${Date.now()}`,
      sender: 'Rahul Kumar',
      senderAvatar: 'R',
      avatarBg: 'bg-blue-100 text-blue-700',
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
        sender: 'Rahul Kumar',
        senderAvatar: 'R',
        avatarBg: 'bg-blue-100 text-blue-700',
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        channel,
      });
    } catch (err) {}
  };

  const handleAddCheckIn = async (question: string, answer: string) => {
    const newChk: CheckIn = {
      id: `chk-${Date.now()}`,
      question,
      author: 'Rahul Kumar',
      authorAvatar: 'R',
      avatarBg: 'bg-blue-100 text-blue-700',
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
    setFiles((prev) => {
      const updated = [newFile, ...prev];
      if (typeof window !== 'undefined') {
        localStorage.setItem('workorbit_files', JSON.stringify(updated));
      }
      return updated;
    });

    const newAct: Activity = {
      id: `act-${Date.now()}`,
      userName: 'Rahul Kumar',
      userAvatar: 'R',
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
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-50">
      {/* Top Header - Fixed at Top */}
      <Header
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenSearchModal={() => setIsSearchModalOpen(true)}
        onToggleNotifications={() => setIsNotificationsOpen(!isNotificationsOpen)}
        unreadNotifications={unreadCount}
        onLogout={handleLogout}
      />

      {/* Popover Notifications */}
      <NotificationPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onClear={handleClearNotifications}
        unreadCount={unreadCount}
      />

      {/* Main Container */}
      <div className="flex flex-1 h-[calc(100vh-4rem)] overflow-hidden">
        {/* Left Sidebar - Fixed */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tasksCount={pendingTasksCount}
          chatCount={3}
          storageUsedGB={initialStats.storageUsedGB}
          storageTotalGB={initialStats.storageTotalGB}
        />

        {/* Right Main Content Area - Scrollable */}
        <main className="flex-1 h-full overflow-y-auto p-6 md:p-8 max-w-7xl">
          {activeTab === 'dashboard' && (
            <DashboardView
              stats={{
                ...initialStats,
                projectsTotal: projects.length,
                projectsActive: projects.filter((p) => p.status === 'active').length,
                teamOnline: people.length,
              }}
              tasks={tasks}
              activities={activities}
              onToggleTask={handleToggleTask}
              onOpenAddTask={() => setIsCreateModalOpen(true)}
              onViewAllTasks={() => setActiveTab('tasks')}
              onViewEmployees={() => setActiveTab('people')}
              onViewProjects={() => setActiveTab('projects')}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksView
              tasks={tasks}
              onToggleTask={handleToggleTask}
              onOpenAddTask={() => setIsCreateModalOpen(true)}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsView
              projects={projects}
              onOpenCreateProject={() => setIsCreateModalOpen(true)}
            />
          )}

          {activeTab === 'calendar' && <CalendarView />}

          {activeTab === 'chat' && (
            <ChatView messages={chatMessages} onSendMessage={handleSendMessage} />
          )}

          {activeTab === 'files' && (
            <FilesView files={files} onUploadFile={handleUploadFile} />
          )}

          {activeTab === 'people' && (
            <PeopleView
              people={people}
              onOpenAddEmployee={() => setIsCreateModalOpen(true)}
            />
          )}

          {activeTab === 'checkins' && (
            <CheckinsView checkins={checkins} onAddCheckIn={handleAddCheckIn} />
          )}

          {activeTab === 'reports' && <ReportsView />}
        </main>
      </div>

      {/* Modals */}
      <CreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onAddTask={handleAddTask}
        onAddProject={handleAddProject}
        onAddEmployee={handleAddEmployee}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onNavigate={(tab) => setActiveTab(tab)}
      />
    </div>
  );
}
