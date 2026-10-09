'use client';

import React, { useState, useMemo } from 'react';
import { Project } from '@/lib/types';
import { PlusIcon, FolderIcon } from './Icons';

interface ProjectsViewProps {
  projects: Project[];
  onOpenCreateProject: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ projects, onOpenCreateProject }) => {
  const [viewMode, setViewMode] = useState<'list' | 'cards' | 'calendar' | 'kanban'>('list');
  const [showFilter, setShowFilter] = useState('All Projects');
  const [sortFilter, setSortFilter] = useState('Create Date');
  const [groupFilter, setGroupFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
      return 0; // Default: Create Date (initial order)
    });

    return result;
  }, [projects, showFilter, groupFilter, searchQuery, sortFilter]);

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
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center border-2 border-white shadow-2xs">
              H
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center border-2 border-white shadow-2xs">
              M
            </div>
            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center border-2 border-white shadow-2xs">
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
            className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 active:bg-fuchsia-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
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
                ? 'text-fuchsia-600 border-fuchsia-600 font-extrabold'
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
                ? 'text-fuchsia-600 border-fuchsia-600 font-extrabold'
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
                ? 'text-fuchsia-600 border-fuchsia-600 font-extrabold'
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
            <div className="flex items-center gap-2 bg-white border border-fuchsia-300 rounded-xl px-2.5 py-1 text-xs shadow-2xs">
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
                className="text-fuchsia-600 hover:text-fuchsia-700 text-xs font-bold ml-1 cursor-pointer"
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
                  ? 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200'
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
              className="text-[11px] font-bold text-slate-500 hover:text-red-600 underline px-1 transition-colors cursor-pointer ml-1"
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
                        className="block mx-auto mt-2 px-3 py-1 bg-fuchsia-50 text-fuchsia-700 font-bold rounded-lg border border-fuchsia-200 hover:bg-fuchsia-100 transition-colors cursor-pointer text-xs"
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

                    // Normalize Status badge
                    const rawStatus = project.status || 'Active';
                    let statusLabel = 'Active';
                    let statusStyle = 'bg-emerald-100/90 text-emerald-700';

                    if (rawStatus.toLowerCase().includes('design')) {
                      statusLabel = 'Design';
                      statusStyle = 'bg-purple-100/90 text-purple-700';
                    } else if (rawStatus.toLowerCase().includes('brief') || rawStatus.toLowerCase().includes('hold')) {
                      statusLabel = 'Brief';
                      statusStyle = 'bg-amber-100/90 text-amber-700';
                    } else {
                      statusLabel = 'Active';
                      statusStyle = 'bg-emerald-100/90 text-emerald-700';
                    }

                    // Priority pill style
                    const priority = project.priority || (idx % 3 === 0 ? 'high' : idx % 3 === 1 ? 'medium' : 'low');
                    let prioStyle = 'bg-blue-50 text-blue-600';
                    let prioDot = 'bg-blue-500';
                    let prioLabel = 'Low';

                    if (priority === 'high') {
                      prioStyle = 'bg-red-50 text-red-600';
                      prioDot = 'bg-red-500';
                      prioLabel = 'High';
                    } else if (priority === 'medium') {
                      prioStyle = 'bg-amber-50 text-amber-600';
                      prioDot = 'bg-amber-500';
                      prioLabel = 'Medium';
                    }

                    return (
                      <tr
                        key={project.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Project Name */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                          {project.name}
                        </td>

                        {/* Start Date */}
                        <td className="py-3.5 px-4 text-slate-600 font-semibold">{startDate}</td>

                        {/* Deadline */}
                        <td className="py-3.5 px-4 text-slate-600 font-semibold">{deadline}</td>

                        {/* Currency */}
                        <td className="py-3.5 px-4 font-medium text-slate-500">{currency}</td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span className={`px-3 py-1 rounded-lg font-bold text-[11px] ${statusStyle}`}>
                            {statusLabel}
                          </span>
                        </td>

                        {/* People (Avatars) */}
                        <td className="py-3.5 px-4">
                          <div className="flex -space-x-1.5">
                            {project.members.map((m, mIdx) => (
                              <div
                                key={mIdx}
                                className="w-7 h-7 rounded-full bg-blue-100 border-2 border-white text-blue-700 font-extrabold text-[10px] flex items-center justify-center shadow-2xs"
                                title={m}
                              >
                                {m[0]}
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Priority */}
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

          {/* Table Footer Pagination */}
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
              <button className="w-8 h-8 bg-fuchsia-50 text-fuchsia-700 font-extrabold rounded-xl border border-fuchsia-200 flex items-center justify-center">
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

      {/* CARDS VIEW GRID (Small Compact Cards Layout without descriptions) */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {processedProjects.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 col-span-full">
              <p className="text-slate-500 font-medium">No projects match your selected filter criteria.</p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 bg-fuchsia-50 text-fuchsia-700 font-bold rounded-xl border border-fuchsia-200 hover:bg-fuchsia-100 transition-colors cursor-pointer text-xs"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            processedProjects.map((project) => {
              const rawStatus = project.status || 'Active';
              let statusStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              if (rawStatus.toLowerCase().includes('design')) {
                statusStyle = 'bg-purple-50 text-purple-700 border-purple-200';
              } else if (
                rawStatus.toLowerCase().includes('brief') ||
                rawStatus.toLowerCase().includes('hold')
              ) {
                statusStyle = 'bg-amber-50 text-amber-700 border-amber-200';
              }

              return (
                <div
                  key={project.id}
                  className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-2"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-2xs">
                        <FolderIcon className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusStyle}`}
                      >
                        {rawStatus.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      {project.name}
                    </h3>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-700 mb-1">
                        <span>Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer Meta: Open To-Dos & Team Avatars */}
                    <div className="flex items-center justify-between pt-0.5 text-[10px] font-semibold text-slate-600">
                      <div>
                        <span className="font-extrabold text-slate-900">{project.openToDos}</span> open to-dos
                      </div>
                      <div className="flex -space-x-1">
                        {project.members.map((m, idx) => (
                          <div
                            key={idx}
                            className="w-5.5 h-5.5 rounded-full bg-blue-100 border border-white text-blue-700 font-extrabold text-[8px] flex items-center justify-center shadow-2xs"
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

      {/* CALENDAR & KANBAN PLACEHOLDERS */}
      {(viewMode === 'calendar' || viewMode === 'kanban') && (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="text-4xl">
            {viewMode === 'calendar' ? '📅' : '📋'}
          </div>
          <h3 className="text-lg font-bold text-slate-800 capitalize">
            {viewMode} View for {processedProjects.length} Projects
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Switch back to <span className="font-bold text-fuchsia-600">List</span> or <span className="font-bold text-fuchsia-600">Cards</span> view to inspect project deliverables.
          </p>
        </div>
      )}
    </div>
  );
};
