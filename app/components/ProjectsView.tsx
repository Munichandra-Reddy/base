'use client';

import React, { useState, useMemo } from 'react';
import { Project, Task, FileItem } from '@/lib/types';
import { FolderIcon } from './Icons';
import { getDirectFileBlobUrl } from '@/lib/fileUtils';

interface ProjectsViewProps {
  projects: Project[];
  tasks?: Task[];
  files?: FileItem[];
  onOpenCreateProject: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  tasks = [],
  files = [],
  onOpenCreateProject,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'cards' | 'kanban'>('cards');
  const [showFilter, setShowFilter] = useState('All Projects');
  const [sortFilter, setSortFilter] = useState('Create Date');
  const [groupFilter, setGroupFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Selected project for Next Page Navigation
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Top Tab inside Project Details Page: 'messages' | 'meetings' | 'tasks' | 'updates' | 'overview'
  const [projectTab, setProjectTab] = useState<'messages' | 'meetings' | 'tasks' | 'updates' | 'overview'>('messages');

  // Sub-tab inside Messages: 'chats' | 'groups'
  const [messageSubTab, setMessageSubTab] = useState<'chats' | 'groups'>('chats');
  const [activeChatTarget, setActiveChatTarget] = useState<string | null>('Elena Rostova');
  const [chatMessageText, setChatMessageText] = useState('');

  // Personal 1-on-1 & Group Chat Log State
  const [chatLogs, setChatLogs] = useState<Record<string, Array<{ sender: string; text: string; time: string }>>>({
    'Elena Rostova': [
      { sender: 'Elena Rostova', text: 'Reviewing node benchmark results and hardware specs for the upcoming release.', time: '9:41 AM' },
      { sender: 'Rahul Kumar', text: 'Looks good! Please push the latency report when complete.', time: '9:43 AM' },
    ],
    'Maya Chen': [
      { sender: 'Maya Chen', text: 'Update CA bundle in Alpine base images and invalidate old CDN credentials.', time: '9:35 AM' },
    ],
    'Daniel Park': [
      { sender: 'Daniel Park', text: 'Pushed the vLLM benchmark report to our shared repository.', time: '8:50 AM' },
    ],
    'Kai Takahashi': [
      { sender: 'Kai Takahashi', text: 'eBPF trace filter is capturing TCP buffer exhaustion correctly.', time: 'Yesterday' },
    ],
    'Sofia Reyes': [
      { sender: 'Sofia Reyes', text: '12 design partners confirmed for next week\'s alpha preview.', time: 'Yesterday' },
    ],
    'Core Team Sync': [
      { sender: 'Rahul Kumar', text: 'Welcome to the project core team chat. All group members are synced.', time: '10:00 AM' },
      { sender: 'Maya Chen', text: 'Ready for today\'s milestone deliverables.', time: '10:15 AM' },
    ],
    'Deliverables & QA': [
      { sender: 'Daniel Park', text: 'QA test suite passed with 100% coverage.', time: 'Yesterday' },
    ],
  });

  // State for Meetings (Image 2)
  const [meetings, setMeetings] = useState([
    {
      id: 'm1',
      title: 'Weekly Founder & Co-Founder Strategy Sync',
      host: 'Aarav Mehta',
      attendees: '9 Attendees',
      day: 'Today',
      time: 'Today 2:00PM - 2:45PM',
      agenda: 'To discuss the weekly schedule call for the strategy Sync and to keep the team updated with the product strategy and Keep the sales ........',
      isToday: true,
    },
    {
      id: 'm2',
      title: 'Product Roadmap & Launch Readiness Sync',
      host: 'Maya Chen',
      attendees: '8 Attendees',
      day: 'Tomorrow',
      time: 'Tomorrow 10:30AM - 11:15AM',
      agenda: 'Reviewing release candidates, milestone deliverables, and client feedback integration for final sign-off.',
      isToday: false,
    },
  ]);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingHost, setNewMeetingHost] = useState('Rahul Kumar');
  const [newMeetingTime, setNewMeetingTime] = useState('Tomorrow 3:00PM - 3:45PM');
  const [newMeetingAgenda, setNewMeetingAgenda] = useState('');

  // State for Sprint Tasks (Image 3)
  const [sprintTasks, setSprintTasks] = useState([
    {
      id: 'st1',
      title: 'Implement dynamic CUDA memory fallback for 8GB consumer GPUs',
      status: 'IN PROGRESS',
      assignee: 'Aarav Mehta',
      metric: 'Metric: OOM error rate < 0.05% across 200 nodes',
    },
    {
      id: 'st2',
      title: 'Finalize Master Service Agreement (MSA) template with counsel',
      status: 'COMPLETED',
      assignee: 'Elena Rostova',
      metric: 'Metric: 3 Signed MSAs by Friday',
    },
  ]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('Rahul Kumar');
  const [newTaskMetric, setNewTaskMetric] = useState('');

  // State for Work Updates (Image 4)
  const [workUpdates, setWorkUpdates] = useState([
    {
      id: 'wu1',
      author: 'Elena Rostova',
      role: 'Co-Founder & COO',
      avatar: 'E',
      timeAgo: '1 hr ago',
      content: 'Decentralized Neural Compute Grid for Edge AI Training on Consumer GPUs - Empowering millions of independent nodes to form the world\'s largest distributed super computer with zero data center locked in.',
      assigneeCategory: 'Assignee: Enterprise Revenue & LOIs',
      statusBadge: 'Verified Submission',
    },
    {
      id: 'wu2',
      author: 'Maya Chen',
      role: 'Eng Lead',
      avatar: 'M',
      timeAgo: '3 hrs ago',
      content: 'Completed frontend component migration and integrated direct binary blob reader for PDF deliverables. Performance benchmarks improved by 40%.',
      assigneeCategory: 'Assignee: Core Infrastructure',
      statusBadge: 'Verified Submission',
    },
  ]);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [newUpdateContent, setNewUpdateContent] = useState('');
  const [newUpdateCategory, setNewUpdateCategory] = useState('Assignee: General Progress');

  // Dynamically filter & sort projects
  const processedProjects = useMemo(() => {
    let result = [...projects];

    // 1. Show Filter (Status Filter)
    if (showFilter !== 'All Projects') {
      result = result.filter((p) => {
        const s = (p.status || '').toLowerCase();
        const target = showFilter.toLowerCase();
        if (target === 'active') return s.includes('active');
        if (target === 'design') return s.includes('design');
        if (target === 'brief') return s.includes('brief') || s.includes('hold');
        if (target === 'completed') return s.includes('completed');
        return true;
      });
    }

    // 2. Group Filter
    if (groupFilter !== 'All') {
      result = result.filter((p) => {
        const s = (p.status || '').toLowerCase();
        const prio = (p.priority || '').toLowerCase();
        const target = groupFilter.toLowerCase();

        if (target === 'design') return s.includes('design');
        if (target === 'active') return s.includes('active');
        if (target === 'brief') return s.includes('brief') || s.includes('hold');
        if (target === 'high priority') return prio === 'high';
        if (target === 'medium priority') return prio === 'medium';
        if (target === 'low priority') return prio === 'low';
        return true;
      });
    }

    // 3. Search Query Filter (Add Filter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.status || '').toLowerCase().includes(q) ||
          (p.priority || '').toLowerCase().includes(q) ||
          p.members.some((m) => m.toLowerCase().includes(q))
      );
    }

    // 4. Sort Projects
    result.sort((a, b) => {
      if (sortFilter === 'Name') {
        return a.name.localeCompare(b.name);
      }
      if (sortFilter === 'Progress') {
        return b.progress - a.progress;
      }
      if (sortFilter === 'Priority') {
        const weight: Record<string, number> = { high: 3, medium: 2, low: 1 };
        const wA = weight[a.priority || 'low'] || 1;
        const wB = weight[b.priority || 'low'] || 1;
        return wB - wA;
      }
      if (sortFilter === 'Deadline') {
        return (a.deadline || '').localeCompare(b.deadline || '');
      }
      return 0;
    });

    return result;
  }, [projects, showFilter, groupFilter, searchQuery, sortFilter]);

  // Dynamic calculation of documents for the selected project details view
  const projectDocs = useMemo(() => {
    if (!selectedProject) return [];
    const fromProject = selectedProject.requiredDocuments || [];
    const fromFiles = (files || [])
      .filter((f) => f.project.toLowerCase().trim() === selectedProject.name.toLowerCase().trim())
      .map((f) => f.name);
    return Array.from(new Set([...fromProject, ...fromFiles]));
  }, [selectedProject, files]);

  const handleViewDocument = async (docName: string) => {
    let fileUrl: string | undefined;

    const existingFile = (files || []).find(
      (f) => f.name.toLowerCase().trim() === docName.toLowerCase().trim()
    );
    if (existingFile && existingFile.fileUrl) {
      fileUrl = existingFile.fileUrl;
    }

    const targetBlobUrl = await getDirectFileBlobUrl(docName, fileUrl, selectedProject?.name || 'Workspace');
    window.open(targetBlobUrl, '_blank');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessageText.trim() || !activeChatTarget) return;

    const newMsg = {
      sender: 'Rahul Kumar',
      text: chatMessageText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatLogs((prev) => ({
      ...prev,
      [activeChatTarget]: [...(prev[activeChatTarget] || []), newMsg],
    }));

    setChatMessageText('');
  };

  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingTitle.trim()) return;

    const newM = {
      id: `m-${Date.now()}`,
      title: newMeetingTitle.trim(),
      host: newMeetingHost.trim() || 'Rahul Kumar',
      attendees: `${selectedProject?.members.length || 5} Attendees`,
      day: 'Upcoming',
      time: newMeetingTime,
      agenda: newMeetingAgenda.trim() || 'Team sync and milestone review.',
      isToday: false,
    };

    setMeetings((prev) => [newM, ...prev]);
    setNewMeetingTitle('');
    setNewMeetingAgenda('');
    setIsMeetingModalOpen(false);
  };

  const handleCreateSprintTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newSt = {
      id: `st-${Date.now()}`,
      title: newTaskTitle.trim(),
      status: 'IN PROGRESS',
      assignee: newTaskAssignee,
      metric: newTaskMetric.trim() ? `Metric: ${newTaskMetric.trim()}` : 'Metric: Delivery on schedule',
    };

    setSprintTasks((prev) => [newSt, ...prev]);
    setNewTaskTitle('');
    setNewTaskMetric('');
    setIsTaskModalOpen(false);
  };

  const handleCreateWorkUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdateContent.trim()) return;

    const newWu = {
      id: `wu-${Date.now()}`,
      author: 'Rahul Kumar',
      role: 'Project Lead',
      avatar: 'R',
      timeAgo: 'Just now',
      content: newUpdateContent.trim(),
      assigneeCategory: newUpdateCategory.trim(),
      statusBadge: 'Verified Submission',
    };

    setWorkUpdates((prev) => [newWu, ...prev]);
    setNewUpdateContent('');
    setIsUpdateModalOpen(false);
  };

  const hasActiveFilters =
    showFilter !== 'All Projects' ||
    groupFilter !== 'All' ||
    sortFilter !== 'Create Date' ||
    searchQuery !== '';

  const handleResetFilters = () => {
    setShowFilter('All Projects');
    setGroupFilter('All');
    setSortFilter('Create Date');
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  // IF A PROJECT IS CLICKED, RENDER DEDICATED PROJECT DETAILS PAGE ("NEXT PAGE")
  if (selectedProject) {
    const projectTasks = (tasks || []).filter(
      (t) => t.project.toLowerCase().trim() === selectedProject.name.toLowerCase().trim()
    );

    // List of personal chats & group chats
    const personalChats = [
      { name: 'Elena Rostova', role: 'Co-Founder', badgeBg: 'bg-emerald-100 text-emerald-800', preview: 'Reviewing node benchmark results and hardware spe...', time: '9:41 AM', unread: '02 >' },
      { name: 'Maya Chen', role: 'Eng Lead', badgeBg: 'bg-emerald-100 text-emerald-800', preview: 'Update CA bundle in Alpine base images and invalida...', time: '9:35 AM', unread: '02 >' },
      { name: 'Daniel Park', role: 'AI Lead', badgeBg: 'bg-emerald-100 text-emerald-800', preview: 'Pushed the vLLM benchmark report to our shared re...', time: '8:50 AM', unread: '02 >' },
      { name: 'Kai Takahashi', role: 'Kernel Lead', badgeBg: 'bg-emerald-100 text-emerald-800', preview: 'eBPF trace filter is capturing TCP buffer exhaustion c...', time: 'Yesterday', unread: '02 >' },
      { name: 'Sofia Reyes', role: 'Growth', badgeBg: 'bg-emerald-100 text-emerald-800', preview: '12 design partners confirmed for next week\'s alpha p...', time: 'Yesterday', unread: '02 >' },
    ];

    const groupChats = [
      { name: 'Core Team Sync', membersCount: selectedProject.members.length, preview: `Group members: ${selectedProject.members.join(', ')}`, time: '10:15 AM' },
      { name: 'Deliverables & QA', membersCount: selectedProject.members.length, preview: `Testing & verification group for ${selectedProject.name}`, time: 'Yesterday' },
    ];

    return (
      <div className="space-y-6 font-sans animate-in fade-in duration-150">
        
        {/* Top Back Navigation Bar */}
        <div className="flex items-center justify-between bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSelectedProject(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span className="text-sm font-extrabold">←</span>
              <span>Back to Projects</span>
            </button>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                📁
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">{selectedProject.name}</h2>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-900 text-white uppercase tracking-wider">
                    {selectedProject.status || 'Active'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Updated {selectedProject.updatedAt || 'Recently'}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenCreateProject}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="text-sm font-extrabold">+</span>
            <span>New Project</span>
          </button>
        </div>

        {/* BLUE MAIN TOP TAB NAVIGATION BAR (As seen in Images 1, 2, 3, 4) */}
        <div className="bg-blue-600 rounded-2xl p-2 sm:p-3 shadow-md flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setProjectTab('messages')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
              projectTab === 'messages'
                ? 'bg-white text-blue-600 font-extrabold shadow-sm'
                : 'text-white/90 hover:text-white hover:bg-blue-700/50'
            }`}
          >
            <span>💬</span>
            <span>Messages</span>
          </button>

          <button
            type="button"
            onClick={() => setProjectTab('meetings')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
              projectTab === 'meetings'
                ? 'bg-white text-blue-600 font-extrabold shadow-sm'
                : 'text-white/90 hover:text-white hover:bg-blue-700/50'
            }`}
          >
            <span>🎥</span>
            <span>Meetings</span>
          </button>

          <button
            type="button"
            onClick={() => setProjectTab('tasks')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
              projectTab === 'tasks'
                ? 'bg-white text-blue-600 font-extrabold shadow-sm'
                : 'text-white/90 hover:text-white hover:bg-blue-700/50'
            }`}
          >
            <span>☑️</span>
            <span>Tasks</span>
          </button>

          <button
            type="button"
            onClick={() => setProjectTab('updates')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
              projectTab === 'updates'
                ? 'bg-white text-blue-600 font-extrabold shadow-sm'
                : 'text-white/90 hover:text-white hover:bg-blue-700/50'
            }`}
          >
            <span>📄</span>
            <span>Work Updates</span>
          </button>

          <button
            type="button"
            onClick={() => setProjectTab('overview')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
              projectTab === 'overview'
                ? 'bg-white text-blue-600 font-extrabold shadow-sm'
                : 'text-white/90 hover:text-white hover:bg-blue-700/50'
            }`}
          >
            <span>📋</span>
            <span>Overview</span>
          </button>
        </div>

        {/* TAB 1: MESSAGES (IMAGE 1) */}
        {projectTab === 'messages' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 animate-in fade-in duration-150">
            {/* Sub-tabs: Chats vs Groups 02 */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMessageSubTab('chats')}
                className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  messageSubTab === 'chats'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                Chats
              </button>

              <button
                type="button"
                onClick={() => setMessageSubTab('groups')}
                className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                  messageSubTab === 'groups'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Groups</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black">
                  02
                </span>
              </button>
            </div>

            {/* Content for Personal Direct DMs (Chats) */}
            {messageSubTab === 'chats' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left List of Personal Chats */}
                <div className="lg:col-span-1 border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                  {personalChats.map((c) => (
                    <div
                      key={c.name}
                      onClick={() => setActiveChatTarget(c.name)}
                      className={`p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        activeChatTarget === c.name ? 'bg-blue-50/70 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-extrabold flex items-center justify-center text-sm shrink-0">
                          {c.name[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-slate-900 truncate">{c.name}</h4>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${c.badgeBg}`}>
                              {c.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{c.preview}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 font-semibold block">{c.time}</span>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-full">
                          {c.unread}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right Interactive DM Box */}
                <div className="lg:col-span-2 border border-slate-200 rounded-2xl flex flex-col h-[480px] bg-slate-50/50 overflow-hidden">
                  <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                        {activeChatTarget ? activeChatTarget[0] : 'U'}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">{activeChatTarget || 'Select a chat'}</h4>
                        <span className="text-[10px] text-emerald-600 font-bold">● Active Workspace Member</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 p-4 overflow-y-auto space-y-3">
                    {activeChatTarget && (chatLogs[activeChatTarget] || []).map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${msg.sender === 'Rahul Kumar' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-md p-3 rounded-2xl text-xs font-medium ${
                            msg.sender === 'Rahul Kumar'
                              ? 'bg-blue-600 text-white rounded-br-none'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-2xs'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-slate-400 font-semibold mt-1 px-1">{msg.time}</span>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
                    <input
                      type="text"
                      placeholder={`Message ${activeChatTarget || 'team member'}...`}
                      value={chatMessageText}
                      onChange={(e) => setChatMessageText(e.target.value)}
                      className="flex-1 px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Send ➔
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Content for Group Chats (Project Group Members ONLY) */}
            {messageSubTab === 'groups' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                  {groupChats.map((g) => (
                    <div
                      key={g.name}
                      onClick={() => setActiveChatTarget(g.name)}
                      className={`p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        activeChatTarget === g.name ? 'bg-blue-50/70 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm shrink-0">
                          👥
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 truncate">#{g.name}</h4>
                          <span className="text-[10px] text-blue-700 font-extrabold bg-blue-50 px-2 py-0.5 rounded border border-blue-100 block w-max mt-0.5">
                            {g.membersCount} Group People
                          </span>
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-1">{g.preview}</p>
                        </div>
                      </div>

                      <span className="text-[10px] text-slate-400 font-semibold shrink-0">{g.time}</span>
                    </div>
                  ))}
                </div>

                <div className="lg:col-span-2 border border-slate-200 rounded-2xl flex flex-col h-[480px] bg-slate-50/50 overflow-hidden">
                  <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">#{activeChatTarget || 'Group Chat'}</h4>
                      <p className="text-[10px] text-slate-500 font-bold">
                        Group Members ({selectedProject.members.length}): {selectedProject.members.join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 p-4 overflow-y-auto space-y-3">
                    {activeChatTarget && (chatLogs[activeChatTarget] || []).map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${msg.sender === 'Rahul Kumar' ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[10px] font-bold text-slate-600 mb-0.5">{msg.sender}</span>
                        <div
                          className={`max-w-md p-3 rounded-2xl text-xs font-medium ${
                            msg.sender === 'Rahul Kumar'
                              ? 'bg-blue-600 text-white rounded-br-none'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-2xs'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-slate-400 font-semibold mt-1 px-1">{msg.time}</span>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
                    <input
                      type="text"
                      placeholder="Message group team members..."
                      value={chatMessageText}
                      onChange={(e) => setChatMessageText(e.target.value)}
                      className="flex-1 px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Group Send ➔
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MEETINGS (IMAGE 2) */}
        {projectTab === 'meetings' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">Upcoming Team Syncs</h3>
              <button
                type="button"
                onClick={() => setIsMeetingModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                + Schedule Meeting
              </button>
            </div>

            <div className="space-y-4">
              {meetings.map((m) => (
                <div key={m.id} className="bg-white rounded-2xl border border-slate-200/90 p-6 space-y-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <h4 className="text-base font-extrabold text-slate-900">{m.title}</h4>
                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                      <span>Host: <strong className="text-slate-800">{m.host}</strong></span>
                      <span>•</span>
                      <span>{m.attendees}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 font-extrabold text-xs flex items-center gap-1.5">
                      <span>📅</span> {m.day}
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 font-extrabold text-xs flex items-center gap-1.5">
                      <span>⏰</span> {m.time}
                    </span>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-slate-800 mb-1">Meeting Agenda:</h5>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {m.agenda}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => alert(`Launching virtual meeting room for "${m.title}"`)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <span>Join Virtual Room</span>
                      <span>→</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => alert('Meeting room link copied to clipboard!')}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 cursor-pointer transition-colors"
                      title="Copy meeting link"
                    >
                      📋
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: TASKS (IMAGE 3) */}
        {projectTab === 'tasks' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">Work Posting & Sprints</h3>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                + Add Sprint Task
              </button>
            </div>

            <div className="space-y-4">
              {sprintTasks.map((st) => (
                <div key={st.id} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="text-base font-extrabold text-slate-900 leading-snug">{st.title}</h4>
                    <span
                      className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-wider shrink-0 ${
                        st.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}
                    >
                      {st.status}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-500">
                    Assignee: <strong className="text-slate-800">{st.assignee}</strong>
                  </p>

                  <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-xs font-semibold text-slate-700">
                    {st.metric}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: WORK UPDATES (IMAGE 4) */}
        {projectTab === 'updates' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">Daily Work Updates</h3>
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                + Post Work Update
              </button>
            </div>

            <div className="space-y-4">
              {workUpdates.map((wu) => (
                <div key={wu.id} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-extrabold flex items-center justify-center text-sm">
                        {wu.avatar}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">{wu.author}</h4>
                        <span className="text-xs text-slate-500 font-semibold">{wu.role}</span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{wu.timeAgo}</span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                    {wu.content}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="font-bold text-slate-700">{wu.assigneeCategory}</span>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-full">
                      {wu.statusBadge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: OVERVIEW (Original Project Overview) */}
        {projectTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
            {/* Main Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Progress & Key Metrics */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex items-center justify-between font-bold text-xs">
                  <span className="text-slate-700">Overall Project Progress</span>
                  <span className="text-slate-900 text-base font-black">{selectedProject.progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-slate-900 h-full rounded-full transition-all duration-500"
                    style={{ width: `${selectedProject.progress}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Open To-Dos</span>
                    <span className="font-extrabold text-slate-900 text-sm">{selectedProject.openToDos} Tasks</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Project Manager</span>
                    <span className="font-bold text-slate-900 text-xs">{selectedProject.manager || selectedProject.members[0] || 'Rahul Kumar'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Start Date</span>
                    <span className="font-semibold text-slate-800">{selectedProject.startDate || '16/07/2024'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Deadline</span>
                    <span className="font-semibold text-slate-800">{selectedProject.deadline || '24/10/2024'}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">Project Description</h3>
                <p className="text-slate-700 leading-relaxed text-xs bg-slate-50 p-4 rounded-xl border border-slate-100 font-medium">
                  {selectedProject.description || 'Comprehensive project scope and key milestones tracked for workspace optimization and delivery.'}
                </p>
              </div>

              {/* Tasks List */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                  Project Tasks ({projectTasks.length})
                </h3>
                {projectTasks.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-100 text-slate-500 font-medium text-xs">
                    No specific tasks assigned to this project yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                    {projectTasks.map((t) => (
                      <div key={t.id} className="p-3.5 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${t.completed ? 'bg-emerald-500' : 'bg-slate-900'}`} />
                          <span className={`font-bold text-slate-900 ${t.completed ? 'line-through opacity-60' : ''}`}>
                            {t.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[11px] text-slate-500 font-semibold">
                          <span>Assigned: <strong className="text-slate-800">{t.assignedTo || 'Unassigned'}</strong></span>
                          <span>Due: {t.dueDate || 'Soon'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Required Documents & Files */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                  Required Documents & Files ({projectDocs.length})
                </h3>
                {projectDocs.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-100 text-slate-500 font-medium text-xs">
                    No documents attached to this project.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {projectDocs.map((doc, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleViewDocument(doc)}
                        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 font-bold text-xs shadow-2xs transition-all cursor-pointer group"
                        title={`Click to open and view ${doc}`}
                      >
                        <span className="text-base">📄</span>
                        <span className="group-hover:underline truncate max-w-xs">{doc}</span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-900 text-white ml-1 shrink-0">
                          View / Open ↗
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Right Column */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                  Team Members ({selectedProject.members.length})
                </h3>
                <div className="space-y-2">
                  {selectedProject.members.map((member, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
                          {member[0]}
                        </div>
                        <span className="font-bold text-slate-900">{member}</span>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-200 text-slate-800 uppercase">
                        {idx === 0 ? 'Lead' : 'Member'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-3 text-xs font-medium text-slate-600">
                <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider mb-2">Project Overview</h3>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span>Priority Level:</span>
                  <span className="font-bold uppercase text-slate-900">{selectedProject.priority || 'Medium'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span>Currency:</span>
                  <span className="font-bold text-slate-900">{selectedProject.currency || 'USD ($)'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span>Status:</span>
                  <span className="font-extrabold text-slate-900 uppercase">{selectedProject.status || 'Active'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Schedule Meeting */}
        {isMeetingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="font-extrabold text-base text-slate-900">Schedule Team Sync Meeting</h4>
                <button type="button" onClick={() => setIsMeetingModalOpen(false)} className="text-slate-400 font-bold">✕</button>
              </div>

              <form onSubmit={handleCreateMeeting} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Meeting Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sprint Review & Architecture Sync"
                    value={newMeetingTitle}
                    onChange={(e) => setNewMeetingTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Host Name</label>
                  <input
                    type="text"
                    value={newMeetingHost}
                    onChange={(e) => setNewMeetingHost(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Date & Time</label>
                  <input
                    type="text"
                    value={newMeetingTime}
                    onChange={(e) => setNewMeetingTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Agenda</label>
                  <textarea
                    rows={2}
                    placeholder="Describe meeting objective..."
                    value={newMeetingAgenda}
                    onChange={(e) => setNewMeetingAgenda(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:bg-white text-slate-900 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setIsMeetingModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl"
                  >
                    Create Meeting
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Add Sprint Task */}
        {isTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="font-extrabold text-base text-slate-900">Add Sprint Task</h4>
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 font-bold">✕</button>
              </div>

              <form onSubmit={handleCreateSprintTask} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Optimize SQL indexing for high load"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl focus:outline-none text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Assignee</label>
                  <input
                    type="text"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl focus:outline-none text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Target Metric</label>
                  <input
                    type="text"
                    placeholder="e.g. Latency < 20ms across 100 requests"
                    value={newTaskMetric}
                    onChange={(e) => setNewTaskMetric(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl focus:outline-none text-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl"
                  >
                    Save Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Post Work Update */}
        {isUpdateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="font-extrabold text-base text-slate-900">Post Daily Work Update</h4>
                <button type="button" onClick={() => setIsUpdateModalOpen(false)} className="text-slate-400 font-bold">✕</button>
              </div>

              <form onSubmit={handleCreateWorkUpdate} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Work Update Content *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe today's deliverables, achievements, and blockers..."
                    value={newUpdateContent}
                    onChange={(e) => setNewUpdateContent(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl focus:outline-none text-slate-900 resize-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Category / Area</label>
                  <input
                    type="text"
                    value={newUpdateCategory}
                    onChange={(e) => setNewUpdateCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl focus:outline-none text-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setIsUpdateModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl"
                  >
                    Publish Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // STANDARD ALL PROJECTS GRID / CARDS / KANBAN VIEW
  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          All Projects
        </h1>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Team Member Avatars Stack */}
          <div className="flex -space-x-2 mr-1">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-2xs">
              H
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-900 font-bold text-xs flex items-center justify-center border-2 border-white shadow-2xs">
              M
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-400 text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-2xs">
              R
            </div>
          </div>

          {/* Invite Button */}
          <button
            type="button"
            onClick={() => alert('Invite feature active — workspace members updated!')}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="text-sm">👤+</span>
            <span>Invite</span>
          </button>

          {/* New Project Button */}
          <button
            type="button"
            onClick={onOpenCreateProject}
            className="px-4 py-2 bg-slate-900 hover:bg-black active:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="text-sm font-extrabold">+</span>
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Bar & Dropdown Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        {/* Left View Tabs */}
        <div className="flex items-center gap-6 text-xs font-bold text-slate-500 overflow-x-auto">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 py-2 cursor-pointer transition-colors border-b-2 ${
              viewMode === 'list'
                ? 'text-slate-900 border-slate-900 font-extrabold'
                : 'border-transparent hover:text-slate-800'
            }`}
          >
            <span>📑</span> List
          </button>

          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1.5 py-2 cursor-pointer transition-colors border-b-2 ${
              viewMode === 'cards'
                ? 'text-slate-900 border-slate-900 font-extrabold'
                : 'border-transparent hover:text-slate-800'
            }`}
          >
            <span>🔲</span> Cards
          </button>

          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 py-2 cursor-pointer transition-colors border-b-2 ${
              viewMode === 'kanban'
                ? 'text-slate-900 border-slate-900 font-extrabold'
                : 'border-transparent hover:text-slate-800'
            }`}
          >
            <span>📋</span> Kanban
          </button>
        </div>

        {/* Right Dropdowns & Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Show Filter Dropdown */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-700 relative hover:bg-slate-200/60 transition-colors">
            <span className="text-slate-400 font-normal">Show:</span>
            <select
              value={showFilter}
              onChange={(e) => setShowFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer appearance-none pr-3"
            >
              <option value="All Projects">All Projects</option>
              <option value="Active">Active</option>
              <option value="Design">Design</option>
              <option value="Brief">Brief</option>
              <option value="Completed">Completed</option>
            </select>
            <span className="text-[9px] text-slate-400 pointer-events-none absolute right-2.5">▼</span>
          </div>

          {/* Sort Filter Dropdown */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-700 relative hover:bg-slate-200/60 transition-colors">
            <span className="text-slate-400 font-normal">Sort:</span>
            <select
              value={sortFilter}
              onChange={(e) => setSortFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer appearance-none pr-3"
            >
              <option value="Create Date">Create Date</option>
              <option value="Name">Name (A-Z)</option>
              <option value="Progress">Progress %</option>
              <option value="Priority">Priority</option>
              <option value="Deadline">Deadline</option>
            </select>
            <span className="text-[9px] text-slate-400 pointer-events-none absolute right-2.5">▼</span>
          </div>

          {/* Group Filter Dropdown */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-700 relative hover:bg-slate-200/60 transition-colors">
            <span className="text-slate-400 font-normal">Group:</span>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer appearance-none pr-3"
            >
              <option value="All">All Groups</option>
              <option value="Design">Design</option>
              <option value="Active">Active</option>
              <option value="Brief">Brief</option>
              <option value="High Priority">High Priority</option>
              <option value="Medium Priority">Medium Priority</option>
              <option value="Low Priority">Low Priority</option>
            </select>
            <span className="text-[9px] text-slate-400 pointer-events-none absolute right-2.5">▼</span>
          </div>

          {/* Add Filter & Search Button */}
          {isSearchOpen ? (
            <div className="flex items-center gap-2 bg-white border border-slate-400 rounded-xl px-2.5 py-1 text-xs shadow-2xs">
              <span className="text-slate-400">🔍</span>
              <input
                type="text"
                autoFocus
                placeholder="Filter name or member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-slate-800 text-xs focus:outline-none w-36 sm:w-44"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 font-bold text-xs"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-slate-900 hover:text-slate-700 text-xs font-bold ml-1 cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer ${
                searchQuery
                  ? 'bg-slate-200 text-slate-900 border-slate-300'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <span>⚙️</span>
              <span>{searchQuery ? `Filter: "${searchQuery}"` : 'Add Filter'}</span>
            </button>
          )}

          {/* Reset Filters Option if any filter is active */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-900 underline px-1 transition-colors cursor-pointer ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* LIST VIEW TABLE */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-bold text-slate-500">PROJECT NAME</th>
                  <th className="py-3.5 px-4 font-bold text-slate-500">START DATE</th>
                  <th className="py-3.5 px-4 font-bold text-slate-500">DEADLINE</th>
                  <th className="py-3.5 px-4 font-bold text-slate-500">
                    CURRENCY <span className="text-slate-400">✏️</span>
                  </th>
                  <th className="py-3.5 px-4 font-bold text-slate-500">
                    STATUS <span className="text-slate-400">✏️</span>
                  </th>
                  <th className="py-3.5 px-4 font-bold text-slate-500">PEOPLE</th>
                  <th className="py-3.5 px-4 font-bold text-slate-500">
                    PRIORITY <span className="text-slate-400">✏️</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {processedProjects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500 font-medium">
                      No projects match your selected filter criteria.
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="block mx-auto mt-2 px-3 py-1 bg-slate-100 text-slate-900 font-bold rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer text-xs"
                      >
                        Reset All Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  processedProjects.map((project, idx) => {
                    const startDate = project.startDate || '16/07/2024';
                    const deadline = project.deadline || '24/10/2024';
                    const currency = project.currency || (idx % 2 === 0 ? '$$$' : '---');

                    const rawStatus = project.status || 'Active';
                    let statusLabel = 'Active';
                    let statusStyle = 'bg-slate-900 text-white';

                    if (rawStatus.toLowerCase().includes('design')) {
                      statusLabel = 'Design';
                      statusStyle = 'bg-slate-200 text-slate-900';
                    } else if (rawStatus.toLowerCase().includes('brief') || rawStatus.toLowerCase().includes('hold')) {
                      statusLabel = 'Brief';
                      statusStyle = 'bg-slate-100 text-slate-700 border border-slate-200';
                    } else {
                      statusLabel = 'Active';
                      statusStyle = 'bg-slate-900 text-white';
                    }

                    const priority = project.priority || (idx % 3 === 0 ? 'high' : idx % 3 === 1 ? 'medium' : 'low');
                    let prioStyle = 'bg-slate-100 text-slate-700';
                    let prioDot = 'bg-slate-500';
                    let prioLabel = 'Low';

                    if (priority === 'high') {
                      prioStyle = 'bg-slate-900 text-white';
                      prioDot = 'bg-white';
                      prioLabel = 'High';
                    } else if (priority === 'medium') {
                      prioStyle = 'bg-slate-200 text-slate-800';
                      prioDot = 'bg-slate-800';
                      prioLabel = 'Medium';
                    }

                    return (
                      <tr
                        key={project.id}
                        onClick={() => setSelectedProject(project)}
                        className="hover:bg-slate-100/70 transition-colors cursor-pointer"
                        title="Click to view full project details"
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                          {project.name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-semibold">{startDate}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-semibold">{deadline}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-500">{currency}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-3 py-1 rounded-lg font-bold text-[11px] ${statusStyle}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex -space-x-1.5">
                            {project.members.map((m, mIdx) => (
                              <div
                                key={mIdx}
                                className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white text-slate-900 font-extrabold text-[10px] flex items-center justify-center shadow-2xs"
                                title={m}
                              >
                                {m[0]}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${prioStyle}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${prioDot}`} />
                            <span>{prioLabel}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50/40 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer">
                <option>{processedProjects.length} Documents</option>
                <option>10 Documents</option>
                <option>25 Documents</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-400 font-bold opacity-60 cursor-not-allowed"
              >
                ‹ Previous
              </button>
              <button className="w-8 h-8 bg-slate-900 text-white font-extrabold rounded-xl border border-slate-900 flex items-center justify-center">
                1
              </button>
              <button
                disabled
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-400 font-bold opacity-60 cursor-not-allowed"
              >
                Next ›
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CARDS VIEW GRID */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {processedProjects.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 col-span-full">
              <p className="text-slate-500 font-medium">No projects match your selected filter criteria.</p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 bg-slate-200 text-slate-900 font-bold rounded-xl border border-slate-300 hover:bg-slate-300 transition-colors cursor-pointer text-xs"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            processedProjects.map((project) => {
              const rawStatus = project.status || 'Active';
              let statusStyle = 'bg-slate-900 text-white border-slate-800';
              if (rawStatus.toLowerCase().includes('design')) {
                statusStyle = 'bg-slate-200 text-slate-900 border-slate-300';
              } else if (
                rawStatus.toLowerCase().includes('brief') ||
                rawStatus.toLowerCase().includes('hold')
              ) {
                statusStyle = 'bg-slate-100 text-slate-700 border-slate-200';
              }

              return (
                <div
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs hover:shadow-md hover:border-slate-400 transition-all flex flex-col justify-between space-y-3 cursor-pointer group"
                  title="Click card to view details"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-slate-900 flex items-center justify-center font-bold shadow-2xs transition-colors">
                        <FolderIcon className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusStyle}`}
                      >
                        {rawStatus.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:underline">
                      {project.name}
                    </h3>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-700 mb-1">
                        <span>Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-slate-900 h-full rounded-full transition-all duration-500"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-0.5 text-[10px] font-semibold text-slate-600">
                      <div>
                        <span className="font-extrabold text-slate-900">{project.openToDos}</span> open to-dos
                      </div>
                      <div className="flex -space-x-1">
                        {project.members.map((m, idx) => (
                          <div
                            key={idx}
                            className="w-5.5 h-5.5 rounded-full bg-slate-200 border border-white text-slate-900 font-extrabold text-[8px] flex items-center justify-center shadow-2xs"
                            title={m}
                          >
                            {m[0]}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* KANBAN VIEW GRID */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['Active', 'Design', 'Brief'].map((columnStatus) => {
            const colProjects = processedProjects.filter((p) => {
              const s = (p.status || '').toLowerCase();
              if (columnStatus === 'Active') return s.includes('active');
              if (columnStatus === 'Design') return s.includes('design');
              return s.includes('brief') || s.includes('hold');
            });

            return (
              <div key={columnStatus} className="bg-slate-100/70 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between font-extrabold text-xs text-slate-900 uppercase tracking-wider pb-1 border-b border-slate-200">
                  <span>{columnStatus} ({colProjects.length})</span>
                </div>

                <div className="space-y-2.5">
                  {colProjects.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs font-medium bg-white/50 rounded-xl border border-dashed border-slate-200">
                      No {columnStatus} projects
                    </div>
                  ) : (
                    colProjects.map((project) => (
                      <div
                        key={project.id}
                        onClick={() => setSelectedProject(project)}
                        className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-2 group"
                      >
                        <h4 className="font-bold text-xs text-slate-900 group-hover:underline">{project.name}</h4>
                        <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                          <span>{project.progress}% completed</span>
                          <span className="font-bold text-slate-800">{project.openToDos} to-dos</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
