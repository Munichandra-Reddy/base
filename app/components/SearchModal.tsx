'use client';

import React, { useState } from 'react';
import { SearchIcon } from './Icons';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: any) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const quickLinks = [
    { label: 'E-Commerce Homepage Design', type: 'Task', tab: 'tasks' },
    { label: 'Mobile App v2 Architecture', type: 'Project', tab: 'projects' },
    { label: 'Login API Endpoint Spec', type: 'File', tab: 'files' },
    { label: 'Workspace Employees Directory', type: 'People', tab: 'people' },
    { label: 'Daily Standup Campfire', type: 'Chat', tab: 'chat' },
  ];

  const filtered = quickLinks.filter((l) =>
    l.label.toLowerCase().includes(query.toLowerCase()) || l.type.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-[#011826]/60 backdrop-blur-xs p-4 font-sans">
      <div className="bg-white rounded-2xl border border-[#E5E5E5] shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-4 border-b border-[#E5E5E5] flex items-center gap-3">
          <SearchIcon className="w-5 h-5 text-[#595959]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, tasks, people, files..."
            className="flex-1 bg-transparent text-sm text-[#222222] focus:outline-none"
          />
          <button onClick={onClose} className="text-xs font-bold text-[#595959] hover:text-[#222222]">
            ESC
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                onNavigate(item.tab);
                onClose();
              }}
              className="w-full flex items-center justify-between p-3 hover:bg-[#F4F6F8] rounded-xl text-left transition-colors"
            >
              <span className="text-sm font-medium text-[#222222]">{item.label}</span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#F4F6F8] text-[#595959] border border-[#E5E5E5]">
                {item.type}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
