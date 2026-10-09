'use client';

import React, { useState } from 'react';
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
  const [groupFilter, setGroupFilter] = useState('Design');

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

        {/* Right Dropdowns & Filter Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-700">
            <span className="text-slate-400 font-normal">Show:</span>
            <span className="font-bold">{showFilter}</span>
            <span className="text-[9px] text-slate-400 ml-1">▼</span>
          </div>

          <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-700">
            <span className="text-slate-400 font-normal">Sort:</span>
            <span className="font-bold">{sortFilter}</span>
            <span className="text-[9px] text-slate-400 ml-1">▼</span>
          </div>

          <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-700">
            <span className="text-slate-400 font-normal">Group:</span>
            <span className="font-bold">{groupFilter}</span>
            <span className="text-[9px] text-slate-400 ml-1">▼</span>
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <span>⚙️</span>
            <span>Add Filter</span>
          </button>
        </div>
      </div>

      {/* LIST VIEW TABLE (Matches Image 1 Exactly) */}
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
                  <th className="py-3.5 px-4 text-center font-bold text-slate-400 text-base">
                    +
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {projects.map((project, idx) => {
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

                      {/* Action Menu */}
                      <td className="py-3.5 px-4 text-center">
                        <button className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-md text-base">
                          ⋮
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer Pagination */}
          <div className="p-4 bg-slate-50/40 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer">
                <option>{projects.length} Documents</option>
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

      {/* CARDS VIEW GRID (Original Cards Layout Option) */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <FolderIcon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                    {project.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1.5">{project.name}</h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed line-clamp-2">
                  {project.description}
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm font-bold text-slate-700 mb-1.5">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Footer Meta: Open To-Dos & Team Avatars */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-sm font-semibold text-slate-600">
                    <span className="font-extrabold text-slate-900">{project.openToDos}</span> open
                    to-dos
                  </div>
                  <div className="flex -space-x-2">
                    {project.members.map((m, idx) => (
                      <div
                        key={idx}
                        className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white text-blue-700 font-extrabold text-xs flex items-center justify-center shadow-2xs"
                        title={m}
                      >
                        {m[0]}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CALENDAR & KANBAN PLACEHOLDERS */}
      {(viewMode === 'calendar' || viewMode === 'kanban') && (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="text-4xl">
            {viewMode === 'calendar' ? '📅' : '📋'}
          </div>
          <h3 className="text-lg font-bold text-slate-800 capitalize">
            {viewMode} View for {projects.length} Projects
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Switch back to <span className="font-bold text-fuchsia-600">List</span> or <span className="font-bold text-fuchsia-600">Cards</span> view to inspect project deliverables.
          </p>
        </div>
      )}
    </div>
  );
};
