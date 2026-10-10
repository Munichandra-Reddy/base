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
    <div className="space-y-7">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-7 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Automatic Check-ins</h1>
          <p className="text-slate-500 text-base font-medium mt-1">Recurring questions that gather team status asynchronously.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-3 bg-slate-900 hover:bg-black text-white font-bold text-base rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Post Check-in</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-4.5">
          <h3 className="text-lg font-bold text-slate-900">What did you complete today?</h3>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            placeholder="Share your accomplishments and key milestones..."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl shadow-xs hover:bg-black transition-colors"
            >
              Submit Check-in
            </button>
          </div>
        </form>
      )}

      <div className="space-y-5">
        {checkins.map((chk) => (
          <div key={chk.id} className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3.5">
              <div className={`w-9 h-9 rounded-full ${chk.avatarBg} font-extrabold text-sm flex items-center justify-center shadow-xs shrink-0`}>
                {chk.authorAvatar}
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">{chk.question}</h4>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">Asked by {chk.author} • {chk.timeAgo}</p>
              </div>
            </div>
            <p className="text-base font-semibold italic text-slate-800 bg-slate-50 p-5 rounded-2xl border border-slate-100 leading-relaxed">
              "{chk.answer}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
