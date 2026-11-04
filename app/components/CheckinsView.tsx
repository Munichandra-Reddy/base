'use client';

import React, { useState } from 'react';
import { CheckIn } from '@/lib/types';
import { PlusIcon } from './Icons';

interface CheckinsViewProps {
  checkins: CheckIn[];
  onAddCheckIn: (question: string, answer: string) => void;
}

export const CheckinsView: React.FC<CheckinsViewProps> = ({ checkins, onAddCheckIn }) => {
  const [showForm, setShowForm] = useState(false);
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    onAddCheckIn('What did you work on today?', answer);
    setAnswer('');
    setShowForm(false);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs">
        <div>
          <h1 className="text-xl font-semibold text-[#111827]">Automatic Check-ins</h1>
          <p className="text-[#595959] text-xs font-normal mt-0.5">Recurring questions that gather team status asynchronously.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3.5 py-2 bg-[#011826] hover:bg-[#082236] text-white font-medium text-xs rounded-md shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Post Check-in</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-4">
          <h3 className="text-base font-semibold text-[#111827]">What did you complete today?</h3>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            placeholder="Share your accomplishments and key milestones..."
            className="w-full p-3 bg-[#F9FAFB] border border-[#E5E5E5] rounded-md text-xs text-[#111827] font-medium focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9]"
          />
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs font-medium text-[#595959] hover:bg-[#F4F6F8] rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-[#011826] text-white font-medium text-xs rounded-md shadow-2xs hover:bg-[#082236] transition-colors"
            >
              Submit Check-in
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {checkins.map((chk) => (
          <div key={chk.id} className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-3">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full ${chk.avatarBg || 'bg-[#049FD9] text-white'} font-bold text-xs flex items-center justify-center shrink-0 mt-0.5`}>
                {chk.authorAvatar}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-[#111827] leading-snug">{chk.question}</h4>
                <p className="text-xs font-normal text-[#595959] mt-0.5">Asked by {chk.author} • {chk.timeAgo}</p>
              </div>
            </div>
            <p className="text-xs font-normal text-[#222222] bg-[#F4F6F8] p-3.5 rounded-md border border-[#E5E5E5] leading-relaxed">
              "{chk.answer}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
