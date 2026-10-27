'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Project, Task, FileItem } from '@/lib/types';
import {
  FolderIcon,
  FileIcon,
  ChatIcon,
  VideoIcon,
  CheckSquareIcon,
  ListIcon,
  GridIcon,
  KanbanIcon,
  UserPlusIcon,
  FilterIcon,
  CalendarIcon,
  ClockIcon,
  SearchIcon,
  PlusIcon,
} from './Icons';
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

  // Selected project for Details Page navigation ("next page")
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Active sub-tab inside Project Details Page: 'messages' | 'meetings' | 'tasks' | 'updates' | 'overview'
  const [activeProjectTab, setActiveProjectTab] = useState<'messages' | 'meetings' | 'tasks' | 'updates' | 'overview'>('messages');

  // Messages sub-tabs: 'chats' (Personal) | 'groups' (Group Chat)
  const [messagesTab, setMessagesTab] = useState<'chats' | 'groups'>('chats');
  const [activeChatMember, setActiveChatMember] = useState<string | null>(null);
  const [chatInputText, setChatInputText] = useState('');
  
  // Custom message logs per project & thread
  const [customMessages, setCustomMessages] = useState<Record<string, Array<{ id: string; sender: string; text: string; time: string }>>>({});

  // Work Updates post input state
  const [newUpdateText, setNewUpdateText] = useState('');
  const [customUpdates, setCustomUpdates] = useState<Array<{ id: string; project: string; author: string; role: string; timeAgo: string; text: string; category: string }>>([]);

  // BROWSER BACK (←) AND FORWARD (→) BUTTON NAVIGATION HANDLING
  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setActiveProjectTab('messages');
    if (typeof window !== 'undefined') {
      window.history.pushState({ tab: 'projects', projectId: project.id, view: 'project_details' }, '', `#project-${project.id}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
    setActiveProjectTab('messages');
    if (typeof window !== 'undefined') {
      window.history.pushState({ tab: 'projects', view: 'projects_list' }, '', '#projects');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.projectId) {
        const found = projects.find((p) => p.id === e.state.projectId);
        if (found) {
          setSelectedProject(found);
          return;
        }
      }

      if (typeof window !== 'undefined' && window.location.hash.includes('project-')) {
        const hashId = window.location.hash.replace('#project-', '');
        const found = projects.find((p) => p.id === hashId);
        if (found) {
          setSelectedProject(found);
          return;
        }
      }

      setSelectedProject(null);
    };

    window.addEventListener('popstate', handlePopState);

    // Initial check on mount if URL has #project-id
    if (typeof window !== 'undefined' && window.location.hash.includes('project-')) {
      const hashId = window.location.hash.replace('#project-', '');
      const found = projects.find((p) => p.id === hashId);
      if (found) {
        setSelectedProject(found);
      }
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [projects]);

  // Dynamically filter & sort projects
  const processedProjects = useMemo(() => {
    let result = [...projects];

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

  // Dynamic documents for the selected project
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

  const handleSendMessage = (threadKey: string) => {
    if (!chatInputText.trim()) return;
    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: selectedProject?.members[0] || 'Rahul Kumar',
      text: chatInputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setCustomMessages((prev) => ({
      ...prev,
      [threadKey]: [...(prev[threadKey] || []), newMsg],
    }));

    setChatInputText('');
  };

  const handlePostWorkUpdate = () => {
    if (!newUpdateText.trim() || !selectedProject) return;
    const author = selectedProject.members[0] || 'Rahul Kumar';
    const newUpdate = {
      id: `upd-${Date.now()}`,
      project: selectedProject.name,
      author,
      role: 'Project Lead',
      timeAgo: 'Just now',
      text: newUpdateText.trim(),
      category: 'Verified Submission',
    };

    setCustomUpdates((prev) => [newUpdate, ...prev]);
    setNewUpdateText('');
  };

  // IF A PROJECT IS CLICKED, RENDER DEDICATED PROJECT DETAILS PAGE ("NEXT PAGE")
  if (selectedProject) {
    const projectMembers = selectedProject.members || ['Rahul Kumar'];
    const projectLead = projectMembers[0] || 'Rahul Kumar';
    const otherMembers = projectMembers.filter((m) => m !== projectLead);
    const memberForPersonalChat = activeChatMember || (otherMembers[0] || projectMembers[0]);

    const projectTasks = (tasks || []).filter(
      (t) => t.project.toLowerCase().trim() === selectedProject.name.toLowerCase().trim()
    );

    const projectWorkUpdates = customUpdates.filter(
      (u) => u.project.toLowerCase().trim() === selectedProject.name.toLowerCase().trim()
    );

    return (
      <div className="space-y-6 font-sans animate-in fade-in duration-150 text-[#0F172A]">
        
        {/* Navigation Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#E2E8F0] shadow-micro">
          <div className="flex items-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={handleBackToProjects}
              className="px-4 py-2 bg-[#EBF0F5] hover:bg-slate-200 text-[#0F172A] font-bold text-xs rounded-lg border border-[#E2E8F0] shadow-micro flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span className="text-sm font-extrabold">←</span>
              <span>Back to Projects</span>
            </button>

            <div className="hidden sm:block h-6 w-px bg-[#E2E8F0]" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#6CC04A] text-white flex items-center justify-center shadow-micro">
                <FolderIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight">{selectedProject.name}</h2>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981] border border-emerald-200 uppercase tracking-wider">
                    {selectedProject.status || 'Active'}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] font-semibold mt-0.5">
                  Updated {selectedProject.updatedAt || 'Recently'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onOpenCreateProject}
              className="px-4 py-2 bg-[#6CC04A] hover:bg-[#5bb33b] active:bg-[#4ea230] text-white font-bold text-xs rounded-lg shadow-micro flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* 5 TOP SUB-TABS (Messages, Meetings, Tasks, Work Updates, Overview) */}
        <div className="bg-[#6CC04A] rounded-xl p-1.5 flex flex-wrap items-center gap-1.5 text-xs font-bold text-white shadow-micro">
          <button
            type="button"
            onClick={() => setActiveProjectTab('messages')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeProjectTab === 'messages'
                ? 'bg-white text-[#222222] shadow-micro font-black'
                : 'text-white/90 hover:bg-black/10 hover:text-white'
            }`}
          >
            <ChatIcon className="w-4 h-4" />
            <span>Messages</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveProjectTab('meetings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeProjectTab === 'meetings'
                ? 'bg-white text-[#222222] shadow-micro font-black'
                : 'text-white/90 hover:bg-black/10 hover:text-white'
            }`}
          >
            <VideoIcon className="w-4 h-4" />
            <span>Meetings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveProjectTab('tasks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeProjectTab === 'tasks'
                ? 'bg-white text-[#222222] shadow-micro font-black'
                : 'text-white/90 hover:bg-black/10 hover:text-white'
            }`}
          >
            <CheckSquareIcon className="w-4 h-4" />
            <span>Tasks</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveProjectTab('updates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeProjectTab === 'updates'
                ? 'bg-white text-[#222222] shadow-micro font-black'
                : 'text-white/90 hover:bg-black/10 hover:text-white'
            }`}
          >
            <FileIcon className="w-4 h-4" />
            <span>Work Updates</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveProjectTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeProjectTab === 'overview'
                ? 'bg-white text-[#222222] shadow-micro font-black'
                : 'text-white/90 hover:bg-black/10 hover:text-white'
            }`}
          >
            <FolderIcon className="w-4 h-4" />
            <span>Overview & Docs</span>
          </button>
        </div>

        {/* TAB CONTENT AREA */}
        
        {/* TAB 1: MESSAGES (PERSONAL & GROUP CHATS FOR PROJECT MEMBERS ONLY) */}
        {activeProjectTab === 'messages' && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-micro space-y-5 animate-in fade-in duration-150">
            {/* Sub-Switch: Chats / Groups */}
            <div className="flex items-center gap-3 pb-3 border-b border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setMessagesTab('chats')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  messagesTab === 'chats'
                    ? 'bg-[#6CC04A] text-white shadow-micro'
                    : 'bg-[#EBF0F5] text-[#334155] hover:bg-slate-200'
                }`}
              >
                Chats
              </button>
              <button
                type="button"
                onClick={() => setMessagesTab('groups')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  messagesTab === 'groups'
                    ? 'bg-[#6CC04A] text-white shadow-micro'
                    : 'bg-[#EBF0F5] text-[#334155] hover:bg-slate-200'
                }`}
              >
                <span>Groups</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${messagesTab === 'groups' ? 'bg-[#5bb33b] text-white' : 'bg-white text-[#0F172A]'}`}>
                  {projectMembers.length}
                </span>
              </button>
            </div>

            {/* 1A: PERSONAL CHATS (ONLY PROJECT TEAM MEMBERS) */}
            {messagesTab === 'chats' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[380px]">
                {/* Left: Members List */}
                <div className="space-y-2 border-r border-[#E2E8F0] pr-4">
                  <h4 className="font-extrabold text-xs text-[#64748B] uppercase tracking-wider mb-3">
                    Project Members ({otherMembers.length > 0 ? otherMembers.length : projectMembers.length})
                  </h4>
                  {(otherMembers.length > 0 ? otherMembers : projectMembers).map((memberName, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActiveChatMember(memberName)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        memberForPersonalChat === memberName
                          ? 'bg-[#6CC04A] text-white border-[#6CC04A] shadow-micro'
                          : 'bg-[#F1F3F6] hover:bg-[#EBF0F5] border-[#E2E8F0] text-[#0F172A]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs ${
                            memberForPersonalChat === memberName
                              ? 'bg-white text-[#238823]'
                              : 'bg-[#6CC04A] text-white'
                          }`}
                        >
                          {memberName[0]}
                        </div>
                        <div>
                          <div className="font-bold text-xs leading-snug">{memberName}</div>
                          <span
                            className={`text-[10px] font-semibold block ${
                              memberForPersonalChat === memberName ? 'text-white/90' : 'text-[#64748B]'
                            }`}
                          >
                            {idx === 0 ? 'Lead Dev' : 'Team Member'}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          memberForPersonalChat === memberName
                            ? 'bg-white text-[#238823]'
                            : 'bg-white text-[#334155] border border-[#E2E8F0]'
                        }`}
                      >
                        02 ›
                      </span>
                    </div>
                  ))}
                </div>

                {/* Right: Active Chat Conversation Box */}
                <div className="md:col-span-2 flex flex-col justify-between bg-[#F1F3F6] rounded-xl p-4 border border-[#E2E8F0]">
                  <div className="pb-3 border-b border-[#E2E8F0] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#6CC04A] text-white font-extrabold text-xs flex items-center justify-center">
                        {memberForPersonalChat[0]}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs text-[#0F172A]">{memberForPersonalChat}</h4>
                        <span className="text-[10px] text-[#64748B] font-semibold block">Direct Project Message</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#ECFDF5] text-[#10B981] border border-emerald-200">
                      Verified Member
                    </span>
                  </div>

                  {/* Messages Feed */}
                  <div className="py-4 space-y-3 overflow-y-auto max-h-[260px] text-xs">
                    <div className="bg-white p-3 rounded-xl border border-[#E2E8F0] text-[#334155] max-w-sm shadow-micro">
                      <p className="font-bold text-[#0F172A] text-[11px] mb-1">{memberForPersonalChat}</p>
                      <p>Reviewing milestone deliverables for <strong>{selectedProject.name}</strong>. Let me know when ready for review.</p>
                      <span className="text-[9px] text-[#64748B] block mt-1">9:41 AM</span>
                    </div>

                    <div className="bg-[#6CC04A] text-white p-3 rounded-xl ml-auto max-w-sm shadow-micro">
                      <p className="font-bold text-white text-[11px] mb-1">You ({projectLead})</p>
                      <p>Will push the updated benchmark & deliverables right away!</p>
                      <span className="text-[9px] text-white/80 block mt-1">9:45 AM</span>
                    </div>

                    {(customMessages[`personal-${selectedProject.id}-${memberForPersonalChat}`] || []).map((m) => (
                      <div
                        key={m.id}
                        className={`p-3 rounded-xl max-w-sm shadow-micro ${
                          m.sender === projectLead
                            ? 'bg-[#6CC04A] text-white ml-auto'
                            : 'bg-white text-[#334155] border border-[#E2E8F0]'
                        }`}
                      >
                        <p className="font-bold text-[11px] mb-1">{m.sender}</p>
                        <p>{m.text}</p>
                        <span className="text-[9px] opacity-70 block mt-1">{m.time}</span>
                      </div>
                    ))}
                  </div>

                  {/* Chat Input */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage(`personal-${selectedProject.id}-${memberForPersonalChat}`);
                    }}
                    className="flex gap-2 pt-2 border-t border-[#E2E8F0]"
                  >
                    <input
                      type="text"
                      placeholder={`Message ${memberForPersonalChat}...`}
                      value={chatInputText}
                      onChange={(e) => setChatInputText(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#6CC04A]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#6CC04A] hover:bg-[#5bb33b] text-white font-bold text-xs rounded-lg shadow-micro transition-colors cursor-pointer"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* 1B: GROUP CHAT (PROJECT TEAM MEMBERS GROUP) */}
            {messagesTab === 'groups' && (
              <div className="flex flex-col justify-between bg-[#F1F3F6] rounded-xl p-5 border border-[#E2E8F0] min-h-[360px]">
                <div className="pb-3 border-b border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-[#0F172A]">{selectedProject.name} Team Group</h4>
                    <p className="text-xs text-[#64748B] font-semibold mt-0.5">
                      Members: <strong>{projectMembers.join(', ')}</strong>
                    </p>
                  </div>
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#6CC04A] text-white shadow-micro">
                    {projectMembers.length} Members Active
                  </span>
                </div>

                {/* Group Feed */}
                <div className="py-4 space-y-3 overflow-y-auto max-h-[260px] text-xs">
                  <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] text-[#334155] max-w-md shadow-micro">
                    <p className="font-bold text-[#0F172A] text-xs mb-1">{projectMembers[1] || 'Priya Sharma'}</p>
                    <p>Updated base components and uploaded specs to the project workspace.</p>
                    <span className="text-[9px] text-[#64748B] block mt-1">10:15 AM</span>
                  </div>

                  <div className="bg-[#6CC04A] text-white p-3.5 rounded-xl ml-auto max-w-md shadow-micro">
                    <p className="font-bold text-white text-xs mb-1">{projectLead}</p>
                    <p>Great work! All deliverables confirmed for <strong>{selectedProject.name}</strong>.</p>
                    <span className="text-[9px] text-white/80 block mt-1">10:20 AM</span>
                  </div>

                  {(customMessages[`group-${selectedProject.id}`] || []).map((m) => (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-xl max-w-md shadow-micro ${
                        m.sender === projectLead
                          ? 'bg-[#6CC04A] text-white ml-auto'
                          : 'bg-white text-[#334155] border border-[#E2E8F0]'
                      }`}
                    >
                      <p className="font-bold text-xs mb-1">{m.sender}</p>
                      <p>{m.text}</p>
                      <span className="text-[9px] opacity-70 block mt-1">{m.time}</span>
                    </div>
                  ))}
                </div>

                {/* Group Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage(`group-${selectedProject.id}`);
                  }}
                  className="flex gap-2 pt-3 border-t border-[#E2E8F0]"
                >
                  <input
                    type="text"
                    placeholder={`Message ${selectedProject.name} group...`}
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#6CC04A]"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#6CC04A] hover:bg-[#5bb33b] text-white font-bold text-xs rounded-lg shadow-micro transition-colors cursor-pointer"
                  >
                    Send Group Message
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MEETINGS */}
        {activeProjectTab === 'meetings' && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-micro space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-lg font-black text-[#0F172A]">Upcoming Team Syncs</h3>
                <p className="text-xs text-[#64748B] font-semibold">Scheduled virtual meetings for {selectedProject.name}</p>
              </div>
              <button
                type="button"
                onClick={() => alert(`Launching virtual meeting room for ${selectedProject.name}...`)}
                className="px-4 py-2 bg-[#6CC04A] hover:bg-[#5bb33b] text-white font-bold text-xs rounded-lg shadow-micro flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <VideoIcon className="w-4 h-4" />
                <span>Schedule New Sync</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Meeting Card 1 */}
              <div className="bg-[#F1F3F6] p-5 rounded-2xl border border-[#E2E8F0] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-base font-extrabold text-[#0F172A]">
                    Weekly {selectedProject.name} Strategy & Sprint Sync
                  </h4>
                  <span className="text-xs font-bold text-[#334155] bg-white border border-[#E2E8F0] px-3 py-1 rounded-full self-start sm:self-auto shadow-micro">
                    {projectMembers.length} Attendees ({projectMembers.join(', ')})
                  </span>
                </div>

                <div className="text-xs text-[#64748B] font-semibold">
                  Host: <strong className="text-[#0F172A]">{projectLead}</strong>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-[#0F172A]">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-[#E2E8F0] shadow-micro">
                    <CalendarIcon className="w-3.5 h-3.5 text-[#64748B]" /> Today
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-[#E2E8F0] shadow-micro">
                    <ClockIcon className="w-3.5 h-3.5 text-[#64748B]" /> Today 2:00PM - 2:45PM
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] text-xs text-[#334155] leading-relaxed font-medium shadow-micro">
                  <strong>Meeting Agenda:</strong> To discuss weekly schedule deliverables, code reviews, and product strategy for <strong>{selectedProject.name}</strong>.
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => alert(`Joining Virtual Sync Room for ${selectedProject.name}!`)}
                    className="px-5 py-2.5 bg-[#6CC04A] hover:bg-[#5bb33b] text-white font-extrabold text-xs rounded-lg shadow-micro transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span>Join Virtual Room</span>
                    <span>→</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => alert('Meeting link copied to clipboard!')}
                    className="px-4 py-2.5 bg-white border border-[#E2E8F0] hover:bg-[#EBF0F5] text-[#334155] text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-micro"
                  >
                    <span>Copy Link</span>
                  </button>
                </div>
              </div>

              {/* Meeting Card 2 */}
              <div className="bg-[#F1F3F6] p-5 rounded-2xl border border-[#E2E8F0] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-base font-extrabold text-[#0F172A]">
                    Product Roadmap & Technical Deliverables Review
                  </h4>
                  <span className="text-xs font-bold text-[#334155] bg-white border border-[#E2E8F0] px-3 py-1 rounded-full self-start sm:self-auto shadow-micro">
                    {projectMembers.length} Attendees
                  </span>
                </div>

                <div className="text-xs text-[#64748B] font-semibold">
                  Host: <strong className="text-[#0F172A]">{projectMembers[1] || 'Priya Sharma'}</strong>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-[#0F172A]">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-[#E2E8F0] shadow-micro">
                    <CalendarIcon className="w-3.5 h-3.5 text-[#64748B]" /> Tomorrow
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-[#E2E8F0] shadow-micro">
                    <ClockIcon className="w-3.5 h-3.5 text-[#64748B]" /> Tomorrow 10:30AM - 11:15AM
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] text-xs text-[#334155] leading-relaxed font-medium shadow-micro">
                  <strong>Meeting Agenda:</strong> Finalize architecture specifications, API contracts, and team member sprint assignments.
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => alert('Joining Virtual Sync Room!')}
                    className="px-5 py-2.5 bg-[#6CC04A] hover:bg-[#5bb33b] text-white font-extrabold text-xs rounded-lg shadow-micro transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span>Join Virtual Room</span>
                    <span>→</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => alert('Meeting link copied!')}
                    className="px-4 py-2.5 bg-white border border-[#E2E8F0] hover:bg-[#EBF0F5] text-[#334155] text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-micro"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TASKS */}
        {activeProjectTab === 'tasks' && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-micro space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-lg font-black text-[#0F172A]">Work Posting & Sprints</h3>
                <p className="text-xs text-[#64748B] font-semibold">Active tasks & sprint metrics for {selectedProject.name}</p>
              </div>
              <button
                type="button"
                onClick={onOpenCreateProject}
                className="px-4 py-2 bg-[#6CC04A] hover:bg-[#5bb33b] text-white font-bold text-xs rounded-lg shadow-micro flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Post New Sprint Task</span>
              </button>
            </div>

            <div className="space-y-4">
              {projectTasks.length === 0 ? (
                <div className="p-8 text-center bg-[#F1F3F6] rounded-2xl border border-[#E2E8F0] space-y-3">
                  <p className="text-xs text-[#64748B] font-medium">No custom tasks posted for this project yet.</p>
                </div>
              ) : (
                projectTasks.map((t) => (
                  <div key={t.id} className="bg-[#F1F3F6] p-5 rounded-2xl border border-[#E2E8F0] space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-base font-extrabold text-[#0F172A] leading-snug">
                        {t.title}
                      </h4>
                      <span
                        className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                          t.completed
                            ? 'bg-[#ECFDF5] text-[#10B981] border border-emerald-200'
                            : 'bg-[#6CC04A] text-white shadow-micro'
                        }`}
                      >
                        {t.completed ? 'COMPLETED' : 'IN PROGRESS'}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-[#64748B]">
                      Assignee: <strong className="text-[#0F172A]">{t.assignedTo || projectLead}</strong>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] text-xs text-[#334155] font-semibold shadow-micro">
                      Metric: Scope deliverable target assigned for {selectedProject.name}
                    </div>
                  </div>
                ))
              )}

              {/* Default Sprint Items */}
              <div className="bg-[#F1F3F6] p-5 rounded-2xl border border-[#E2E8F0] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-base font-extrabold text-[#0F172A] leading-snug">
                    Implement dynamic memory fallback & node benchmarks for {selectedProject.name}
                  </h4>
                  <span className="text-[10px] font-black px-3 py-1 rounded-full bg-[#6CC04A] text-white uppercase tracking-wider shadow-micro">
                    IN PROGRESS
                  </span>
                </div>

                <div className="text-xs font-semibold text-[#64748B]">
                  Assignee: <strong className="text-[#0F172A]">{projectLead}</strong>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] text-xs text-[#334155] font-semibold shadow-micro">
                  Metric: OOM error rate &lt; 0.05% across 200 nodes
                </div>
              </div>

              <div className="bg-[#F1F3F6] p-5 rounded-2xl border border-[#E2E8F0] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-base font-extrabold text-[#0F172A] leading-snug">
                    Finalize Master Service Agreement (MSA) & scope specifications
                  </h4>
                  <span className="text-[10px] font-black px-3 py-1 rounded-full bg-[#ECFDF5] text-[#10B981] border border-emerald-200 uppercase tracking-wider">
                    COMPLETED
                  </span>
                </div>

                <div className="text-xs font-semibold text-[#64748B]">
                  Assignee: <strong className="text-[#0F172A]">{projectMembers[1] || 'Priya Sharma'}</strong>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] text-xs text-[#334155] font-semibold shadow-micro">
                  Metric: 3 Signed MSAs & deliverable docs verified
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: WORK UPDATES */}
        {activeProjectTab === 'updates' && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-micro space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-lg font-black text-[#0F172A]">Daily Work Updates</h3>
                <p className="text-xs text-[#64748B] font-semibold">Recent progress submissions from {selectedProject.name} team</p>
              </div>
            </div>

            {/* Post New Update Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePostWorkUpdate();
              }}
              className="p-4 bg-[#F1F3F6] rounded-2xl border border-[#E2E8F0] space-y-3"
            >
              <label className="block text-xs font-extrabold text-[#0F172A]">Post Daily Progress Update</label>
              <textarea
                rows={2}
                placeholder={`Share your daily work progress update for ${selectedProject.name}...`}
                value={newUpdateText}
                onChange={(e) => setNewUpdateText(e.target.value)}
                className="w-full p-3 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#6CC04A] resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#6CC04A] hover:bg-[#5bb33b] text-white font-extrabold text-xs rounded-lg shadow-micro transition-colors cursor-pointer"
                >
                  Post Work Update
                </button>
              </div>
            </form>

            {/* Updates Feed */}
            <div className="space-y-4">
              {projectWorkUpdates.map((u) => (
                <div key={u.id} className="bg-[#F1F3F6] p-5 rounded-2xl border border-[#E2E8F0] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#6CC04A] text-white font-extrabold text-xs flex items-center justify-center">
                        {u.author[0]}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-[#0F172A]">{u.author}</h4>
                        <p className="text-[11px] text-[#64748B] font-semibold">{u.role}</p>
                      </div>
                    </div>
                    <span className="text-xs text-[#64748B] font-semibold">{u.timeAgo}</span>
                  </div>

                  <p className="text-xs text-[#334155] leading-relaxed font-medium bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-micro">
                    {u.text}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-[#64748B] font-semibold">Assignee: <strong className="text-[#0F172A]">{selectedProject.name} Team</strong></span>
                    <span className="px-3 py-1 rounded-full bg-[#6CC04A] text-white font-extrabold text-[10px] uppercase tracking-wider shadow-micro">
                      {u.category}
                    </span>
                  </div>
                </div>
              ))}

              <div className="bg-[#F1F3F6] p-5 rounded-2xl border border-[#E2E8F0] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#6CC04A] text-white font-extrabold text-xs flex items-center justify-center">
                      {(projectMembers[1] || 'Priya Sharma')[0]}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-[#0F172A]">{projectMembers[1] || 'Priya Sharma'}</h4>
                      <p className="text-[11px] text-[#64748B] font-semibold">Lead Designer & Developer</p>
                    </div>
                  </div>
                  <span className="text-xs text-[#64748B] font-semibold">1 hr ago</span>
                </div>

                <p className="text-xs text-[#334155] leading-relaxed font-medium bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-micro">
                  Completed high-fidelity components, responsive grid architecture, and asset verification for <strong>{selectedProject.name}</strong>. All tests passing cleanly.
                </p>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[#64748B] font-semibold">Assignee: <strong className="text-[#0F172A]">Enterprise Scope & LOIs</strong></span>
                  <span className="px-3 py-1 rounded-full bg-[#6CC04A] text-white font-extrabold text-[10px] uppercase tracking-wider shadow-micro">
                    Verified Submission
                  </span>
                </div>
              </div>

              <div className="bg-[#F1F3F6] p-5 rounded-2xl border border-[#E2E8F0] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#6CC04A] text-white font-extrabold text-xs flex items-center justify-center">
                      {projectLead[0]}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-[#0F172A]">{projectLead}</h4>
                      <p className="text-[11px] text-[#64748B] font-semibold">Project Lead & Manager</p>
                    </div>
                  </div>
                  <span className="text-xs text-[#64748B] font-semibold">3 hrs ago</span>
                </div>

                <p className="text-xs text-[#334155] leading-relaxed font-medium bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-micro">
                  Configured API integrations, indexed storage subsystems, and data url blob handlers for project document streams.
                </p>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[#64748B] font-semibold">Assignee: <strong className="text-[#0F172A]">Core Infrastructure</strong></span>
                  <span className="px-3 py-1 rounded-full bg-[#6CC04A] text-white font-extrabold text-[10px] uppercase tracking-wider shadow-micro">
                    Verified Submission
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5 OVERVIEW & REQUIRED DOCUMENTS */}
        {(activeProjectTab === 'overview' || activeProjectTab === 'messages' || activeProjectTab === 'meetings' || activeProjectTab === 'tasks' || activeProjectTab === 'updates') && (
          <div className="space-y-6 pt-2 border-t border-[#E2E8F0]">
            <h3 className="font-black text-sm text-[#0F172A] uppercase tracking-wider pt-2">
              Project Overview & Required Documents
            </h3>
            
            {/* Project Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Main Content Area */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* 1. Progress & Key Metrics Box */}
                <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-micro space-y-4">
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span className="text-[#334155]">Overall Project Progress</span>
                    <span className="text-[#0F172A] text-base font-black">{selectedProject.progress}%</span>
                  </div>
                  <div className="w-full bg-[#EBF0F5] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-[#6CC04A] h-full rounded-full transition-all duration-500"
                      style={{ width: `${selectedProject.progress}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-[#E2E8F0] text-xs">
                    <div>
                      <span className="text-[#64748B] block font-medium">Open To-Dos</span>
                      <span className="font-extrabold text-[#0F172A] text-sm">{selectedProject.openToDos} Tasks</span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block font-medium">Project Manager</span>
                      <span className="font-bold text-[#0F172A] text-xs">{selectedProject.manager || selectedProject.members[0] || 'Rahul Kumar'}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block font-medium">Start Date</span>
                      <span className="font-semibold text-[#334155]">{selectedProject.startDate || '16/07/2024'}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block font-medium">Deadline</span>
                      <span className="font-semibold text-[#334155]">{selectedProject.deadline || '24/10/2024'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Project Description */}
                <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-micro space-y-3">
                  <h3 className="font-extrabold text-xs text-[#0F172A] uppercase tracking-wider">Project Description</h3>
                  <p className="text-[#334155] leading-relaxed text-xs bg-[#F1F3F6] p-4 rounded-xl border border-[#E2E8F0] font-medium">
                    {selectedProject.description || 'Comprehensive project scope and key milestones tracked for workspace optimization and delivery.'}
                  </p>
                </div>

                {/* 3. Project Tasks List */}
                <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-micro space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-xs text-[#0F172A] uppercase tracking-wider">
                      Project Tasks ({projectTasks.length})
                    </h3>
                  </div>

                  {projectTasks.length === 0 ? (
                    <div className="p-6 text-center bg-[#F1F3F6] rounded-xl border border-[#E2E8F0] text-[#64748B] font-medium text-xs">
                      No specific tasks assigned to this project yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl overflow-hidden">
                      {projectTasks.map((t) => (
                        <div key={t.id} className="p-3.5 bg-white hover:bg-[#EBF0F5] flex items-center justify-between gap-3 text-xs transition-colors">
                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full ${t.completed ? 'bg-[#10B981]' : 'bg-[#0B192C]'}`} />
                            <span className={`font-bold text-[#0F172A] ${t.completed ? 'line-through opacity-60' : ''}`}>
                              {t.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-[11px] text-[#64748B] font-semibold">
                            <span>Assigned: <strong className="text-[#0F172A]">{t.assignedTo || 'Unassigned'}</strong></span>
                            <span>Due: {t.dueDate || 'Soon'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Required Documents & Files */}
                <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-micro space-y-4">
                  <h3 className="font-extrabold text-xs text-[#0F172A] uppercase tracking-wider">
                    Required Documents & Files ({projectDocs.length})
                  </h3>
                  {projectDocs.length === 0 ? (
                    <div className="p-6 text-center bg-[#F1F3F6] rounded-xl border border-[#E2E8F0] text-[#64748B] font-medium text-xs">
                      No documents attached to this project.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2.5">
                      {projectDocs.map((doc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleViewDocument(doc)}
                          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#EBF0F5] hover:bg-slate-200 border border-[#E2E8F0] text-[#0F172A] font-bold text-xs shadow-micro transition-all cursor-pointer group"
                          title={`Click to open and view ${doc}`}
                        >
                          <FileIcon className="w-4 h-4 text-[#334155]" />
                          <span className="group-hover:underline truncate max-w-xs">{doc}</span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#6CC04A] text-white ml-1 shrink-0">
                            View / Open ↗
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                
                {/* Team Members List */}
                <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-micro space-y-4">
                  <h3 className="font-extrabold text-xs text-[#0F172A] uppercase tracking-wider">
                    Team Members ({selectedProject.members.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedProject.members.map((member, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#F1F3F6] border border-[#E2E8F0] text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#6CC04A] text-white font-extrabold text-xs flex items-center justify-center">
                            {member[0]}
                          </div>
                          <span className="font-bold text-[#0F172A]">{member}</span>
                        </div>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-white text-[#334155] border border-[#E2E8F0] uppercase">
                          {idx === 0 ? 'Lead' : 'Member'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Project Specifications */}
                <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-micro space-y-3 text-xs font-medium text-[#334155]">
                  <h3 className="font-extrabold text-xs text-[#0F172A] uppercase tracking-wider mb-2">Project Overview</h3>
                  <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
                    <span>Priority Level:</span>
                    <span className="font-bold uppercase text-[#0F172A]">{selectedProject.priority || 'Medium'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
                    <span>Currency:</span>
                    <span className="font-bold text-[#0F172A]">{selectedProject.currency || 'USD ($)'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span>Status:</span>
                    <span className="font-extrabold text-[#0F172A] uppercase">{selectedProject.status || 'Active'}</span>
                  </div>
                </div>

              </div>

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
        <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
          All Projects
        </h1>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Team Member Avatars Stack */}
          <div className="flex -space-x-2 mr-1">
            <div className="w-8 h-8 rounded-full bg-[#6CC04A] text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-micro">
              H
            </div>
            <div className="w-8 h-8 rounded-full bg-[#15293F] text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-micro">
              M
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-400 text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-micro">
              R
            </div>
          </div>

          {/* Invite Button */}
          <button
            type="button"
            onClick={() => alert('Invite feature active — workspace members updated!')}
            className="px-3.5 py-2 bg-white hover:bg-[#EBF0F5] border border-[#E2E8F0] text-[#334155] font-bold text-xs rounded-lg shadow-micro flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <UserPlusIcon className="w-4 h-4 text-[#334155]" />
            <span>Invite</span>
          </button>

          {/* New Project Button */}
          <button
            type="button"
            onClick={onOpenCreateProject}
            className="px-4 py-2 bg-[#6CC04A] hover:bg-[#5bb33b] active:bg-[#4ea230] text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Bar & Dropdown Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        {/* Left View Tabs */}
        <div className="flex items-center gap-6 text-xs font-bold text-[#64748B] overflow-x-auto">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 py-2 cursor-pointer transition-colors border-b-2 ${
              viewMode === 'list'
                ? 'text-[#6CC04A] border-[#6CC04A] font-bold'
                : 'border-transparent hover:text-[#6CC04A]'
            }`}
          >
            <ListIcon className="w-4 h-4" /> List
          </button>

          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1.5 py-2 cursor-pointer transition-colors border-b-2 ${
              viewMode === 'cards'
                ? 'text-[#6CC04A] border-[#6CC04A] font-bold'
                : 'border-transparent hover:text-[#6CC04A]'
            }`}
          >
            <GridIcon className="w-4 h-4" /> Cards
          </button>

          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 py-2 cursor-pointer transition-colors border-b-2 ${
              viewMode === 'kanban'
                ? 'text-[#6CC04A] border-[#6CC04A] font-bold'
                : 'border-transparent hover:text-[#6CC04A]'
            }`}
          >
            <KanbanIcon className="w-4 h-4" /> Kanban
          </button>
        </div>

        {/* Right Dropdowns & Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Show Filter Dropdown */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#334155] relative hover:bg-slate-50 transition-colors shadow-2xs">
            <span className="text-[#64748B] font-normal">Show:</span>
            <select
              value={showFilter}
              onChange={(e) => setShowFilter(e.target.value)}
              className="bg-transparent font-bold text-[#0F172A] focus:outline-none cursor-pointer appearance-none pr-3"
            >
              <option value="All Projects">All Projects</option>
              <option value="Active">Active</option>
              <option value="Design">Design</option>
              <option value="Brief">Brief</option>
              <option value="Completed">Completed</option>
            </select>
            <span className="text-[9px] text-[#64748B] pointer-events-none absolute right-2.5">▼</span>
          </div>

          {/* Sort Filter Dropdown */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#334155] relative hover:bg-slate-50 transition-colors shadow-2xs">
            <span className="text-[#64748B] font-normal">Sort:</span>
            <select
              value={sortFilter}
              onChange={(e) => setSortFilter(e.target.value)}
              className="bg-transparent font-bold text-[#0F172A] focus:outline-none cursor-pointer appearance-none pr-3"
            >
              <option value="Create Date">Create Date</option>
              <option value="Name">Name (A-Z)</option>
              <option value="Progress">Progress %</option>
              <option value="Priority">Priority</option>
              <option value="Deadline">Deadline</option>
            </select>
            <span className="text-[9px] text-[#64748B] pointer-events-none absolute right-2.5">▼</span>
          </div>

          {/* Group Filter Dropdown */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#334155] relative hover:bg-slate-50 transition-colors shadow-2xs">
            <span className="text-[#64748B] font-normal">Group:</span>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="bg-transparent font-bold text-[#0F172A] focus:outline-none cursor-pointer appearance-none pr-3"
            >
              <option value="All">All Groups</option>
              <option value="Design">Design</option>
              <option value="Active">Active</option>
              <option value="Brief">Brief</option>
              <option value="High Priority">High Priority</option>
              <option value="Medium Priority">Medium Priority</option>
              <option value="Low Priority">Low Priority</option>
            </select>
            <span className="text-[9px] text-[#64748B] pointer-events-none absolute right-2.5">▼</span>
          </div>

          {/* Add Filter & Search Button */}
          {isSearchOpen ? (
            <div className="flex items-center gap-2 bg-white border border-[#0B192C] rounded-lg px-2.5 py-1 text-xs shadow-micro">
              <SearchIcon className="w-3.5 h-3.5 text-[#64748B]" />
              <input
                type="text"
                autoFocus
                placeholder="Filter name or member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-[#0F172A] text-xs focus:outline-none w-36 sm:w-44"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[#64748B] hover:text-[#0F172A] font-bold text-xs"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-[#0F172A] hover:text-[#64748B] text-xs font-bold ml-1 cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-bold shadow-micro transition-colors cursor-pointer ${
                searchQuery
                  ? 'bg-[#EBF0F5] text-[#0F172A] border-[#CBD5E1]'
                  : 'bg-white hover:bg-[#EBF0F5] text-[#334155] border-[#E2E8F0]'
              }`}
            >
              <FilterIcon className="w-3.5 h-3.5 text-[#334155]" />
              <span>{searchQuery ? `Filter: "${searchQuery}"` : 'Add Filter'}</span>
            </button>
          )}

          {/* Reset Filters Option if any filter is active */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-[#64748B] hover:text-[#0F172A] underline px-1 transition-colors cursor-pointer ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* LIST VIEW TABLE */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-micro overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F1F3F6] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-bold text-[#64748B] whitespace-nowrap">PROJECT NAME</th>
                  <th className="py-3.5 px-4 font-bold text-[#64748B] whitespace-nowrap">START DATE</th>
                  <th className="py-3.5 px-4 font-bold text-[#64748B] whitespace-nowrap">DEADLINE</th>
                  <th className="py-3.5 px-4 font-bold text-[#64748B] whitespace-nowrap">CURRENCY</th>
                  <th className="py-3.5 px-4 font-bold text-[#64748B] whitespace-nowrap">STATUS</th>
                  <th className="py-3.5 px-4 font-bold text-[#64748B] whitespace-nowrap">PEOPLE</th>
                  <th className="py-3.5 px-4 font-bold text-[#64748B] whitespace-nowrap">PRIORITY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs font-medium text-[#334155]">
                {processedProjects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#64748B] font-medium">
                      No projects match your selected filter criteria.
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="block mx-auto mt-2 px-3 py-1 bg-[#EBF0F5] text-[#0F172A] font-bold rounded-lg border border-[#E2E8F0] hover:bg-slate-200 transition-colors cursor-pointer text-xs"
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
                    let statusStyle = 'bg-[#ECFDF5] text-[#10B981] border border-emerald-200';

                    if (rawStatus.toLowerCase().includes('design')) {
                      statusLabel = 'Design';
                      statusStyle = 'bg-[#EFF6FF] text-[#2563EB] border border-blue-200';
                    } else if (rawStatus.toLowerCase().includes('brief') || rawStatus.toLowerCase().includes('hold')) {
                      statusLabel = 'Brief';
                      statusStyle = 'bg-[#FFFBEB] text-[#F59E0B] border border-amber-200';
                    } else {
                      statusLabel = 'Active';
                      statusStyle = 'bg-[#ECFDF5] text-[#10B981] border border-emerald-200';
                    }

                    const priority = project.priority || (idx % 3 === 0 ? 'high' : idx % 3 === 1 ? 'medium' : 'low');
                    let prioStyle = 'bg-[#EBF0F5] text-[#334155] border border-[#E2E8F0]';
                    let prioDot = 'bg-slate-400';
                    let prioLabel = 'Low';

                    if (priority === 'high') {
                      prioStyle = 'bg-[#FEF2F2] text-[#EF4444] border border-rose-200';
                      prioDot = 'bg-[#EF4444]';
                      prioLabel = 'High';
                    } else if (priority === 'medium') {
                      prioStyle = 'bg-[#FFFBEB] text-[#F59E0B] border border-amber-200';
                      prioDot = 'bg-[#F59E0B]';
                      prioLabel = 'Medium';
                    }

                    return (
                      <tr
                        key={project.id}
                        onClick={() => handleSelectProject(project)}
                        className="hover:bg-[#EBF0F5] transition-colors cursor-pointer"
                        title="Click to view full project details"
                      >
                        <td className="py-3.5 px-4 font-bold text-[#0F172A] text-sm whitespace-nowrap">
                          {project.name}
                        </td>
                        <td className="py-3.5 px-4 text-[#334155] font-semibold whitespace-nowrap">{startDate}</td>
                        <td className="py-3.5 px-4 text-[#334155] font-semibold whitespace-nowrap">{deadline}</td>
                        <td className="py-3.5 px-4 font-medium text-[#64748B] whitespace-nowrap">{currency}</td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-block px-3 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap ${statusStyle}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex -space-x-1.5">
                            {project.members.map((m, mIdx) => (
                              <div
                                key={mIdx}
                                className="w-7 h-7 rounded-full bg-[#EBF0F5] border-2 border-white text-[#0F172A] font-extrabold text-[10px] flex items-center justify-center shadow-micro"
                                title={m}
                              >
                                {m[0]}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${prioStyle}`}>
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

          <div className="p-4 bg-[#F1F3F6] border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-[#64748B]">
            <div className="flex items-center gap-2">
              <select className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#0F172A] focus:outline-none cursor-pointer">
                <option>{processedProjects.length} Documents</option>
                <option>10 Documents</option>
                <option>25 Documents</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled
                className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#64748B] font-bold opacity-60 cursor-not-allowed"
              >
                ‹ Previous
              </button>
              <button className="w-8 h-8 bg-[#6CC04A] text-white font-extrabold rounded-lg border border-[#6CC04A] flex items-center justify-center shadow-micro">
                1
              </button>
              <button
                disabled
                className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#64748B] font-bold opacity-60 cursor-not-allowed"
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
            <div className="p-10 text-center bg-white rounded-2xl border border-[#E2E8F0] shadow-micro space-y-3 col-span-full">
              <p className="text-[#64748B] font-medium">No projects match your selected filter criteria.</p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 bg-[#EBF0F5] text-[#0F172A] font-bold rounded-lg border border-[#E2E8F0] hover:bg-slate-200 transition-colors cursor-pointer text-xs"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            processedProjects.map((project) => {
              const rawStatus = project.status || 'Active';
              let statusStyle = 'bg-[#ECFDF5] text-[#10B981] border-emerald-200';
              if (rawStatus.toLowerCase().includes('design')) {
                statusStyle = 'bg-[#EFF6FF] text-[#2563EB] border-blue-200';
              } else if (
                rawStatus.toLowerCase().includes('brief') ||
                rawStatus.toLowerCase().includes('hold')
              ) {
                statusStyle = 'bg-[#FFFBEB] text-[#F59E0B] border-amber-200';
              }

              return (
                <div
                  key={project.id}
                  onClick={() => handleSelectProject(project)}
                  className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 shadow-micro hover:shadow-card hover:border-[#CBD5E1] transition-all flex flex-col justify-between space-y-3 cursor-pointer group"
                  title="Click card to view details"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-lg bg-[#EBF0F5] group-hover:bg-[#6CC04A] group-hover:text-white text-[#6CC04A] flex items-center justify-center font-bold shadow-micro transition-colors">
                        <FolderIcon className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusStyle}`}
                      >
                        {rawStatus.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[#0F172A] leading-snug group-hover:underline">
                      {project.name}
                    </h3>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-[#334155] mb-1">
                        <span>Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="w-full bg-[#EBF0F5] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#6CC04A] h-full rounded-full transition-all duration-500"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-0.5 text-[10px] font-semibold text-[#64748B]">
                      <div>
                        <span className="font-extrabold text-[#0F172A]">{project.openToDos}</span> open to-dos
                      </div>
                      <div className="flex -space-x-1">
                        {project.members.map((m, idx) => (
                          <div
                            key={idx}
                            className="w-5.5 h-5.5 rounded-full bg-[#EBF0F5] border border-white text-[#0F172A] font-extrabold text-[8px] flex items-center justify-center shadow-micro"
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
              <div key={columnStatus} className="bg-[#F1F3F6] rounded-2xl p-4 border border-[#E2E8F0] space-y-3">
                <div className="flex items-center justify-between font-extrabold text-xs text-[#0F172A] uppercase tracking-wider pb-1 border-b border-[#E2E8F0]">
                  <span>{columnStatus} ({colProjects.length})</span>
                </div>

                <div className="space-y-2.5">
                  {colProjects.length === 0 ? (
                    <div className="p-4 text-center text-[#64748B] text-xs font-medium bg-white/50 rounded-xl border border-dashed border-[#E2E8F0]">
                      No {columnStatus} projects
                    </div>
                  ) : (
                    colProjects.map((project) => (
                      <div
                        key={project.id}
                        onClick={() => handleSelectProject(project)}
                        className="bg-white rounded-xl p-3 border border-[#E2E8F0] shadow-micro hover:shadow-card hover:border-[#CBD5E1] transition-all cursor-pointer space-y-2 group"
                      >
                        <h4 className="font-bold text-xs text-[#0F172A] group-hover:underline">{project.name}</h4>
                        <div className="flex justify-between items-center text-[10px] font-semibold text-[#64748B]">
                          <span>{project.progress}% completed</span>
                          <span className="font-bold text-[#0F172A]">{project.openToDos} to-dos</span>
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
