'use client';

import React, { useState } from 'react';

export const CalendarView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Month Days (1 to 30)
  const currentMonthDays = Array.from({ length: 30 }, (_, i) => i + 1);

  // Week Days (Oct 1 to Oct 7)
  const currentWeekDays = [
    { dayNumber: 1, dayName: 'Sun', dateStr: 'Oct 1' },
    { dayNumber: 2, dayName: 'Mon', dateStr: 'Oct 2' },
    { dayNumber: 3, dayName: 'Tue', dateStr: 'Oct 3' },
    { dayNumber: 4, dayName: 'Wed', dateStr: 'Oct 4' },
    { dayNumber: 5, dayName: 'Thu', dateStr: 'Oct 5' },
    { dayNumber: 6, dayName: 'Fri', dateStr: 'Oct 6' },
    { dayNumber: 7, dayName: 'Sat', dateStr: 'Oct 7' },
  ];

  const mockEvents: Record<number, { title: string; time?: string; color: string }[]> = {
    1: [{ title: 'Weekly Planning', time: '09:00 AM', color: 'bg-sky-100 text-sky-800 border border-sky-200' }],
    2: [{ title: 'Homepage Design Signoff', time: '11:00 AM', color: 'bg-blue-100 text-blue-800 border border-blue-200' }],
    3: [{ title: 'Client Onboarding Sync', time: '02:30 PM', color: 'bg-indigo-100 text-indigo-800 border border-indigo-200' }],
    4: [{ title: 'Database Migration Review', time: '04:00 PM', color: 'bg-violet-100 text-violet-800 border border-violet-200' }],
    5: [{ title: 'API Release v2.0', time: '10:00 AM', color: 'bg-purple-100 text-purple-800 border border-purple-200' }],
    6: [{ title: 'Frontend UI Polish', time: '01:00 PM', color: 'bg-teal-100 text-teal-800 border border-teal-200' }],
    7: [{ title: 'Team Catchup & QA', time: '05:00 PM', color: 'bg-slate-100 text-slate-800 border border-slate-200' }],
    12: [{ title: 'Sprint Demo & Retrospective', time: '03:00 PM', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200' }],
    18: [{ title: 'Q4 Strategy Sync', time: '10:30 AM', color: 'bg-amber-100 text-amber-800 border border-amber-200' }],
    25: [{ title: 'Infrastructure Maintenance', time: '11:00 PM', color: 'bg-red-100 text-red-800 border border-red-200' }],
  };

  return (
    <div className="space-y-7">
      <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Workspace Schedule</h1>
          <p className="text-slate-500 text-base font-medium mt-1">
            {viewMode === 'month'
              ? 'October 2026 Milestone & Deliverables Calendar'
              : 'Current Week (Oct 1 - Oct 7, 2026) Schedule'}
          </p>
        </div>

        {/* Month / Week View Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl select-none">
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              viewMode === 'month'
                ? 'bg-white shadow-xs text-slate-900 font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              viewMode === 'week'
                ? 'bg-white shadow-xs text-slate-900 font-extrabold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      {viewMode === 'month' ? (
        /* Month View Grid */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-sm font-bold text-slate-600 py-3.5">
            {days.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
            {currentMonthDays.map((day) => (
              <div key={day} className="min-h-[110px] p-2.5 bg-white hover:bg-slate-50/50 transition-colors">
                <div className="text-sm font-bold text-slate-800 mb-1.5">{day}</div>
                {mockEvents[day] &&
                  mockEvents[day].map((evt, idx) => (
                    <div
                      key={idx}
                      className={`text-xs font-bold p-2 rounded-lg mb-1 truncate shadow-2xs ${evt.color}`}
                    >
                      {evt.title}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Week View Grid */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-sm font-bold text-slate-600 py-3.5">
            {currentWeekDays.map((wDay) => (
              <div key={wDay.dayNumber} className="flex flex-col items-center">
                <span>{wDay.dayName}</span>
                <span className="text-xs font-semibold text-slate-400 mt-0.5">{wDay.dateStr}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-slate-100 bg-white min-h-[360px]">
            {currentWeekDays.map((wDay) => (
              <div key={wDay.dayNumber} className="p-3 bg-white hover:bg-slate-50/50 transition-colors space-y-2">
                <div className="text-xs font-extrabold text-slate-400 mb-2">{wDay.dayName}, {wDay.dateStr}</div>
                {mockEvents[wDay.dayNumber] && mockEvents[wDay.dayNumber].length > 0 ? (
                  mockEvents[wDay.dayNumber].map((evt, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl space-y-1 shadow-2xs ${evt.color}`}
                    >
                      {evt.time && <div className="text-[10px] font-extrabold opacity-75">{evt.time}</div>}
                      <div className="text-xs font-bold leading-tight">{evt.title}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] font-medium text-slate-300 italic pt-4 text-center">No events</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
