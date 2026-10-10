'use client';

import React, { useState, useMemo } from 'react';
import { Project, Task, FileItem } from '@/lib/types';
import { PlusIcon, FolderIcon } from './Icons';
import { FileViewerModal } from './FileViewerModal';

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

  // Selected project for Details Pop-up Modal
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Document Viewer modal state
  const [activeViewFile, setActiveViewFile] = useState<FileItem | null>(null);

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

  // Dynamic calculation of documents for the selected project details popup
  const projectDocs = useMemo(() => {
    if (!selectedProject) return [];
    const fromProject = selectedProject.requiredDocuments || [];
    const fromFiles = (files || [])
      .filter((f) => f.project.toLowerCase().trim() === selectedProject.name.toLowerCase().trim())
      .map((f) => f.name);
    return Array.from(new Set([...fromProject, ...fromFiles]));
  }, [selectedProject, files]);

  const handleViewDocument = (docName: string) => {
    const existingFile = (files || []).find(
      (f) => f.name.toLowerCase().trim() === docName.toLowerCase().trim()
    );

    const isPdf = docName.toLowerCase().endsWith('.pdf');
    const isImage =
      docName.toLowerCase().endsWith('.png') ||
      docName.toLowerCase().endsWith('.jpg') ||
      docName.toLowerCase().endsWith('.svg');

    const fileToView: FileItem = existingFile || {
      id: `file-doc-${Date.now()}`,
      name: docName,
      size: '1.2 MB',
      uploadedBy: selectedProject?.manager || selectedProject?.members[0] || 'Workspace Admin',
      uploadedAt: 'Oct 10, 2026',
      type: isPdf ? 'pdf' : isImage ? 'image' : 'document',
      project: selectedProject?.name || 'Project Workspace',
      fileUrl: isPdf
        ? 'data:application/pdf;base64,JVBERi0xLjQNJSVPRkYNCjEgMCBvYmoNPDwvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFI+Pg1lbmRvYmoNCjIgMCBvYmoNPDwvVHlwZSAvUGFnZXMgL0tpZHMgWzMgMCBSXSAvQ291bnQgMT4+DWVuZG9iag0KMyAwIG9iaiA8PC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgNjEyIDc5MlIgL0NvbnRlbnRzIDQgMCBSL1Jlc291cmNlcyA8PD4+PjANZW5kb2JqDTQgMCBvYmoNPDwvTGVuZ3RoIDU+PnN0cmVhbQ0KICANCmVuZHN0cmVhbQ1lbmRvYmoNCnhyZWYNCjAgNQ0KMDAwMDAwMDAwMCA2NTUzNSBmDQowMDAwMDAwMDE2IDAwMDAwIG4NCjDAwMDAwMDA2OCAwMDAwMCBuDQowMDAwMDAwMTI1IDAwMDAwIG4NCjDAwMDAwMDAyMzEgMDAwMDAgbg0KdHJhaWxlcg0KPDwvU2l6ZSA1IC9Sb290IDEgMCBSPj4NCnN0YXJ0eHJlZg0KMjg4DQolJUVPRg=='
        : undefined,
    };

    setActiveViewFile(fileToView);
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

      {/* PROJECT DETAILS POP-UP MODAL */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  📁
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold text-slate-900">{selectedProject.name}</h3>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-900 text-white uppercase tracking-wider">
                      {selectedProject.status || 'Active'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    Updated {selectedProject.updatedAt || 'Recently'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs">
              
              {/* 1. Progress & Key Metrics Bar */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between font-bold text-xs">
                  <span className="text-slate-700">Project Progress</span>
                  <span className="text-slate-900 text-sm font-black">{selectedProject.progress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-slate-900 h-full rounded-full transition-all duration-500"
                    style={{ width: `${selectedProject.progress}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[11px] border-t border-slate-200/60">
                  <div>
                    <span className="text-slate-400 block font-medium">Open To-Dos</span>
                    <span className="font-extrabold text-slate-900 text-sm">{selectedProject.openToDos} Tasks</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Manager</span>
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

              {/* 2. Project Description */}
              <div>
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider mb-1.5">Description</h4>
                <p className="text-slate-700 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100 font-medium">
                  {selectedProject.description || 'Comprehensive project scope and key milestones tracked for workspace optimization and delivery.'}
                </p>
              </div>

              {/* 3. Team Members */}
              <div>
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider mb-2">
                  Team Members ({selectedProject.members.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.members.map((member, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 font-bold text-slate-900 text-xs"
                    >
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-extrabold text-[10px] flex items-center justify-center">
                        {member[0]}
                      </span>
                      <span>{member}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Required Documents & Files */}
              <div>
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider mb-2">
                  Required Documents & Files ({projectDocs.length})
                </h4>
                {projectDocs.length === 0 ? (
                  <div className="p-3 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 font-medium">
                    No documents attached yet.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {projectDocs.map((doc, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleViewDocument(doc)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 font-bold text-xs shadow-2xs transition-all cursor-pointer group"
                        title={`Click to open and view ${doc}`}
                      >
                        <span className="text-sm">📄</span>
                        <span className="group-hover:underline truncate max-w-xs">{doc}</span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-900 text-white ml-1 shrink-0">
                          View / Open ↗
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DOCUMENT VIEWER MODAL */}
      <FileViewerModal
        file={activeViewFile}
        onClose={() => setActiveViewFile(null)}
      />
    </div>
  );
};
