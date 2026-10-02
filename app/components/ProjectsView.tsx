'use client';

import React from 'react';
import { Project } from '@/lib/types';
import { PlusIcon, FolderIcon } from './Icons';

interface ProjectsViewProps {
  projects: Project[];
  onOpenCreateProject: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ projects, onOpenCreateProject }) => {
  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-7 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Active Projects</h1>
          <p className="text-slate-500 text-base font-medium mt-1">
            Manage your project spaces, team collaboration boards, and open deliverables.
          </p>
        </div>
        <button
          onClick={onOpenCreateProject}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <PlusIcon className="w-5 h-5" />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects Grid */}
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
              <p className="text-sm font-medium text-slate-500 leading-relaxed line-clamp-2">{project.description}</p>
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
                  <span className="font-extrabold text-slate-900">{project.openToDos}</span> open to-dos
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
    </div>
  );
};
