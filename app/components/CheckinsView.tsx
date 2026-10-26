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
    <div className="space-y-7 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-7 rounded-2xl border border-[#E5E5E5] shadow-micro">
        <div>
          <h1 className="text-3xl font-light text-[#222222]">Automatic Check-ins</h1>
          <p className="text-[#595959] text-base font-medium mt-1">Recurring questions that gather team status asynchronously.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-3 bg-[#6CC04A] hover:bg-[#5bb33b] active:bg-[#4ea230] text-white font-semibold text-base rounded-lg shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Post Check-in</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-7 rounded-tl-2xl rounded-br-2xl rounded-tr-md rounded-bl-md border border-[#E5E5E5] shadow-micro space-y-4.5">
          <h3 className="text-lg font-bold text-[#222222]">What did you complete today?</h3>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            placeholder="Share your accomplishments and key milestones..."
            className="w-full p-4 bg-white border border-[#CCCCCC] rounded-xl text-base text-[#222222] font-medium focus:outline-none focus:ring-2 focus:ring-[#049FD9]"
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-login text-sm py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-signup text-sm py-2 px-5"
            >
              Submit Check-in
            </button>
          </div>
        </form>
      )}

      <div className="space-y-5">
        {checkins.map((chk) => (
          <div key={chk.id} className="bg-white p-7 rounded-tl-2xl rounded-br-2xl rounded-tr-md rounded-bl-md border border-[#E5E5E5] shadow-micro space-y-4">
            <div className="flex items-center gap-3.5">
              <div className={`w-9 h-9 rounded-full ${chk.avatarBg || 'bg-[#011826] text-white'} font-bold text-sm flex items-center justify-center shadow-xs shrink-0`}>
                {chk.authorAvatar}
              </div>
              <div>
                <h4 className="text-lg font-bold text-[#222222]">{chk.question}</h4>
                <p className="text-xs font-semibold text-[#595959] mt-0.5">Asked by {chk.author} • {chk.timeAgo}</p>
              </div>
            </div>
            <p className="text-base font-semibold italic text-[#595959] bg-[#F4F6F8] p-5 rounded-2xl border border-[#E5E5E5] leading-relaxed">
              "{chk.answer}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
