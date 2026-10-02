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

import { Task, Activity, Project, ChatMessage, CheckIn, FileItem } from '@/lib/types';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [checkins, setCheckins] = useState<CheckIn[]>(initialCheckIns);
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [people, setPeople] = useState(initialPeople);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  // Load persisted state from localStorage on mount so page refreshes don't lose data!
  useEffect(() => {
    if (typeof window !== 'undefined') {
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

  const handleLogin = () => {
    setIsLoggedIn(true);
    setActiveTab('dashboard');
  };

  if (!isLoggedIn) {
    return <AuthView onLogin={handleLogin} />;
  }

  const handleToggleTask = async (id: string) => {
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
      if (typeof window !== 'undefined') {
        localStorage.setItem('workorbit_tasks', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
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
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, project }),
      });
    } catch (err) {}
  };

  // Add Project with localStorage Persistence
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
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
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
    setChatMessages((prev) => [...prev, newMsg]);

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'Rahul Kumar', content, channel }),
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
    setCheckins((prev) => [newChk, ...prev]);
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
        onClear={() => setUnreadCount(0)}
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
              }}
              tasks={tasks}
              activities={activities}
              onToggleTask={handleToggleTask}
              onOpenAddTask={() => setIsCreateModalOpen(true)}
              onViewAllTasks={() => setActiveTab('tasks')}
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

          {activeTab === 'people' && <PeopleView people={people} />}

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
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onNavigate={(tab) => setActiveTab(tab)}
      />
    </div>
  );
}
