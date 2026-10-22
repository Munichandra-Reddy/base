'use client';

import React from 'react';
import { Person } from '@/lib/types';

interface PeopleViewProps {
  people: Person[];
  onOpenAddEmployee?: () => void;
}

export const PeopleView: React.FC<PeopleViewProps> = ({ people, onOpenAddEmployee }) => {
  return (
    <div className="space-y-7 font-sans">
      <div className="bg-white p-7 rounded-2xl border border-[#E2E8F0] shadow-micro flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F172A]">Workspace Employees Directory</h1>
          <p className="text-[#64748B] text-base font-medium mt-1">Employees, administrators, and team members in your ABC Technologies workspace.</p>
        </div>
        {onOpenAddEmployee && (
          <button
            onClick={onOpenAddEmployee}
            className="px-5 py-2.5 bg-[#0B192C] hover:bg-[#15293F] active:bg-[#0B192C] text-white font-bold text-sm rounded-xl shadow-xs transition-all shrink-0 self-start md:self-auto cursor-pointer"
          >
            + Add Employee
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {people.map((person) => (
          <div
            key={person.id}
            className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-micro flex items-center gap-5 hover:shadow-md transition-shadow"
          >
            <div
              className={`w-14 h-14 rounded-full ${person.avatarBg} font-extrabold text-xl flex items-center justify-center shadow-xs shrink-0`}
            >
              {person.avatar}
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <h3 className="text-lg font-bold text-[#0F172A] truncate">{person.name}</h3>
              <p className="text-sm font-bold text-[#334155]">{person.role}</p>
              <p className="text-xs font-semibold text-[#64748B] truncate">{person.email}</p>
              <div className="pt-2 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                <span className="text-xs font-bold text-[#334155]">{person.projectsCount} active projects</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
