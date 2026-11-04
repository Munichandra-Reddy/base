'use client';

import React, { useMemo } from 'react';
import { Person } from '@/lib/types';
import { deduplicateEmployees } from '@/lib/firebaseServices';
import { UsersIcon, PlusIcon } from './Icons';

interface PeopleViewProps {
  people: Person[];
  onOpenAddEmployee?: () => void;
  isAdmin?: boolean;
}

export const PeopleView: React.FC<PeopleViewProps> = ({ people, onOpenAddEmployee, isAdmin = false }) => {
  const displayPeople = useMemo(() => {
    return deduplicateEmployees(people || []);
  }, [people]);

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#111827]">Workspace Employees Directory</h1>
          <p className="text-[#595959] text-xs font-normal mt-0.5">Employees, administrators, and team members in your workspace.</p>
        </div>
        {isAdmin && onOpenAddEmployee && (
          <button
            onClick={onOpenAddEmployee}
            className="px-3.5 py-2 bg-[#011826] hover:bg-[#082236] text-white font-medium text-xs rounded-md shadow-2xs transition-all shrink-0 self-start md:self-auto cursor-pointer flex items-center gap-1.5"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        )}
      </div>

      {displayPeople && displayPeople.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayPeople.map((person) => (
            <div
              key={person.id || person.email}
              className="bg-white rounded-lg border border-[#E5E5E5] p-3.5 shadow-2xs flex items-center gap-3 hover:border-[#049FD9] transition-all"
            >
              <div
                className={`w-9 h-9 rounded-full ${person.avatarBg || 'bg-[#049FD9] text-white'} font-bold text-xs flex items-center justify-center shrink-0`}
              >
                {person.avatar}
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <h3 className="text-xs font-semibold text-[#111827] truncate">{person.name}</h3>
                <p className="text-[11px] font-medium text-[#595959] truncate">{person.role}</p>
                <p className="text-[10px] text-[#6B7280] truncate">{person.email}</p>
                <div className="pt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                  <span className="text-[10px] font-medium text-[#595959]">{person.projectsCount || 1} active projects</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E5E5E5] p-10 text-center space-y-2 shadow-2xs">
          <div className="w-10 h-10 rounded-lg bg-[#F4F6F8] text-[#595959] flex items-center justify-center mx-auto">
            <UsersIcon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-[#111827]">No registered employee accounts yet</h3>
          <p className="text-xs text-[#6B7280] max-w-md mx-auto">
            When employees create an account using Employee Sign Up, their profiles will automatically be stored in Firebase and displayed here.
          </p>
        </div>
      )}
    </div>
  );
};
