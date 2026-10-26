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
      <div className="bg-white p-7 rounded-2xl border border-[#E5E5E5] shadow-micro flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-[#222222]">Workspace Employees Directory</h1>
          <p className="text-[#595959] text-base font-medium mt-1">Employees, administrators, and team members in your workspace.</p>
        </div>
        {onOpenAddEmployee && (
          <button
            onClick={onOpenAddEmployee}
            className="btn-signup"
          >
            + Add Employee
          </button>
        )}
      </div>

      {people && people.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {people.map((person) => (
            <div
              key={person.id}
              className="bg-white rounded-tl-2xl rounded-br-2xl rounded-tr-md rounded-bl-md border border-[#E5E5E5] p-4 shadow-micro flex items-center gap-3.5 hover:border-[#049FD9] transition-all"
            >
              <div
                className={`w-11 h-11 rounded-full ${person.avatarBg || 'bg-[#011826] text-white'} font-bold text-base flex items-center justify-center shadow-xs shrink-0`}
              >
                {person.avatar}
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <h3 className="text-sm font-bold text-[#222222] truncate">{person.name}</h3>
                <p className="text-xs font-semibold text-[#595959] truncate">{person.role}</p>
                <p className="text-[11px] font-medium text-[#595959] truncate">{person.email}</p>
                <div className="pt-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#6CC04A]" />
                  <span className="text-[11px] font-bold text-[#222222]">{person.projectsCount || 1} active projects</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-12 text-center space-y-3 shadow-micro">
          <div className="w-14 h-14 rounded-2xl bg-[#F4F6F8] flex items-center justify-center text-2xl mx-auto shadow-2xs">
            👥
          </div>
          <h3 className="text-base font-bold text-[#222222]">No registered employee accounts yet</h3>
          <p className="text-xs text-[#595959] max-w-md mx-auto">
            When employees create an account using Employee Sign Up, their profiles will automatically be stored in Firebase and displayed here.
          </p>
        </div>
      )}
    </div>
  );
};
