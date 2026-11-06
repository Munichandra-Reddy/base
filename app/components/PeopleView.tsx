'use client';

import React, { useMemo } from 'react';
import { Person } from '@/lib/types';
import { deduplicateEmployees } from '@/lib/firebaseServices';
import { UsersIcon, PlusIcon } from './Icons';

interface PeopleViewProps {
  people: Person[];
  onOpenAddEmployee?: () => void;
  isAdmin?: boolean;
  onUpdateEmployee?: (email: string, updates: Partial<Person>) => void;
  onDeleteEmployee?: (email: string) => void;
}

export const PeopleView: React.FC<PeopleViewProps> = ({
  people,
  onOpenAddEmployee,
  isAdmin = false,
  onUpdateEmployee,
  onDeleteEmployee,
}) => {
  const [editingPerson, setEditingPerson] = React.useState<Person | null>(null);
  const [newRole, setNewRole] = React.useState('');
  const [deletingPerson, setDeletingPerson] = React.useState<Person | null>(null);

  const displayPeople = useMemo(() => {
    return deduplicateEmployees(people || []);
  }, [people]);

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerson || !newRole.trim()) return;
    if (onUpdateEmployee) {
      onUpdateEmployee(editingPerson.email, { role: newRole.trim() });
    }
    setEditingPerson(null);
    setNewRole('');
  };

  const handleConfirmDelete = () => {
    if (!deletingPerson) return;
    if (onDeleteEmployee) {
      onDeleteEmployee(deletingPerson.email);
    }
    setDeletingPerson(null);
  };

  return (
    <div className="space-y-6 font-sans w-full">
      <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#111827]">Workspace Employees Directory</h1>
          <p className="text-[#595959] text-xs font-normal mt-0.5">Employees, administrators, and team members in your workspace.</p>
        </div>
        {isAdmin && onOpenAddEmployee && (
          <button
            onClick={onOpenAddEmployee}
            className="btn-primary shrink-0 self-start md:self-auto"
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
                  <span className={`w-1.5 h-1.5 rounded-full ${person.status === 'offline' ? 'bg-[#94A3B8]' : 'bg-[#16A34A]'}`} />
                  <span className="text-[10px] font-medium text-[#595959]">{person.projectsCount || 1} active projects</span>
                </div>
                {isAdmin && (
                  <div className="pt-2 mt-1.5 border-t border-[#E5E5E5] flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPerson(person);
                        setNewRole(person.role || 'Team Member');
                      }}
                      className="text-[#049FD9] hover:underline font-semibold cursor-pointer"
                    >
                      Edit Role
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingPerson(person)}
                      className="text-[#EF4444] hover:underline font-semibold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
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

      {/* Edit Role Modal (Admin Only) */}
      {editingPerson && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingPerson(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div>
                <h3 className="text-base font-semibold text-[#111827]">Edit Employee Designation</h3>
                <p className="text-xs text-[#595959]">{editingPerson.name} ({editingPerson.email})</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPerson(null)}
                className="w-7 h-7 rounded-md bg-[#F4F6F8] text-[#595959] hover:text-[#111827] flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Role / Designation</label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer, Product Designer"
                  className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs font-medium text-[#111827] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9]"
                  required
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPerson(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Admin Only) */}
      {deletingPerson && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingPerson(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 font-sans"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="pb-2 border-b border-[#E5E5E5]">
              <h3 className="text-base font-semibold text-[#EF4444]">Remove Employee Account</h3>
              <p className="text-xs text-[#595959] mt-0.5">Are you sure you want to remove this employee from the workspace?</p>
            </div>
            <div className="p-3 bg-[#FEF2F2] rounded-lg border border-[#FCA5A5] text-xs text-[#991B1B]">
              <strong>{deletingPerson.name}</strong> ({deletingPerson.email}) will lose access to WorkOrbit workspace projects and tasks.
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPerson(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#EF4444] text-white hover:bg-[#DC2626] transition-colors cursor-pointer"
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
