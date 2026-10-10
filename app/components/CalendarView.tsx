'use client';

import React, { useState } from 'react';

interface CalendarEvent {
  title: string;
  time?: string;
  color: string;
}

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

  const initialMockEvents: Record<number, CalendarEvent[]> = {
    1: [{ title: 'Weekly Planning', time: '09:00 AM', color: 'bg-slate-100 text-slate-900 border border-slate-300' }],
    2: [{ title: 'Homepage Design Signoff', time: '11:00 AM', color: 'bg-slate-200 text-slate-900 border border-slate-300' }],
    3: [{ title: 'Client Onboarding Sync', time: '02:30 PM', color: 'bg-slate-100 text-slate-800 border border-slate-200' }],
    4: [{ title: 'Database Migration Review', time: '04:00 PM', color: 'bg-slate-300 text-slate-900 border border-slate-400' }],
    5: [{ title: 'API Release v2.0', time: '10:00 AM', color: 'bg-slate-200 text-slate-900 border border-slate-300' }],
    6: [{ title: 'Frontend UI Polish', time: '01:00 PM', color: 'bg-slate-100 text-slate-800 border border-slate-200' }],
    7: [{ title: 'Team Catchup & QA', time: '05:00 PM', color: 'bg-slate-100 text-slate-800 border border-slate-200' }],
    12: [{ title: 'Sprint Demo & Retrospective', time: '03:00 PM', color: 'bg-slate-800 text-white border border-slate-700' }],
    18: [{ title: 'Q4 Strategy Sync', time: '10:30 AM', color: 'bg-slate-200 text-slate-900 border border-slate-300' }],
    25: [{ title: 'Infrastructure Maintenance', time: '11:00 PM', color: 'bg-slate-900 text-white border border-black' }],
  };

  const [events, setEvents] = useState<Record<number, CalendarEvent[]>>(initialMockEvents);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for Date Pop-up / Add Event Modal
  const [targetDay, setTargetDay] = useState<number>(1);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('10:00 AM');

  // Submit handler for date pop-up form
  const handleAddEventForSelectedDay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay || !newEventTitle.trim()) return;

    const newEvt: CalendarEvent = {
      title: newEventTitle.trim(),
      time: newEventTime.trim() || '10:00 AM',
      color: 'bg-slate-200 text-slate-900 border border-slate-300',
    };

    setEvents((prev) => ({
      ...prev,
      [selectedDay]: [...(prev[selectedDay] || []), newEvt],
    }));

    setNewEventTitle('');
  };

  // Submit handler for standalone "+ Add Event" modal button
  const handleAddEventGlobal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    const newEvt: CalendarEvent = {
      title: newEventTitle.trim(),
      time: newEventTime.trim() || '10:00 AM',
      color: 'bg-slate-200 text-slate-900 border border-slate-300',
    };

    setEvents((prev) => ({
      ...prev,
      [targetDay]: [...(prev[targetDay] || []), newEvt],
    }));

    setNewEventTitle('');
    setIsAddModalOpen(false);
  };

  const selectedDayEvents = selectedDay ? events[selectedDay] || [] : [];

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Workspace Schedule</h1>
          <p className="text-slate-500 text-base font-medium mt-1">
            {viewMode === 'month'
              ? 'October 2026 Milestone & Deliverables Calendar (Click any date for details)'
              : 'Current Week (Oct 1 - Oct 7, 2026) Schedule'}
          </p>
        </div>

        {/* Right Header Actions: Add Event Button + Month / Week View Switcher */}
        <div className="flex items-center gap-3 select-none flex-wrap">
          <button
            type="button"
            onClick={() => {
              setTargetDay(1);
              setNewEventTitle('');
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="text-base leading-none">+</span>
            <span>Add Event</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl">
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
              <div
                key={day}
                onClick={() => setSelectedDay(day)}
                className="min-h-[110px] p-2.5 bg-white hover:bg-slate-100 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-slate-800 group-hover:text-slate-900">{day}</span>
                  {events[day] && events[day].length > 0 && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-900 text-white">
                      {events[day].length}
                    </span>
                  )}
                </div>
                {events[day] &&
                  events[day].map((evt, idx) => (
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
              <div
                key={wDay.dayNumber}
                onClick={() => setSelectedDay(wDay.dayNumber)}
                className="p-3 bg-white hover:bg-slate-100 transition-colors cursor-pointer space-y-2 group"
              >
                <div className="text-xs font-extrabold text-slate-400 group-hover:text-slate-900 mb-2">
                  {wDay.dayName}, {wDay.dateStr}
                </div>
                {events[wDay.dayNumber] && events[wDay.dayNumber].length > 0 ? (
                  events[wDay.dayNumber].map((evt, idx) => (
                    <div key={idx} className={`p-2.5 rounded-xl space-y-1 shadow-2xs ${evt.color}`}>
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

      {/* Date Details Pop-up Modal */}
      {selectedDay !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  October {selectedDay}, 2026 Schedule
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Milestones, events, and task deadlines for this day.
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 font-bold flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-96 overflow-y-auto">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Scheduled Events ({selectedDayEvents.length})
                </h4>
                {selectedDayEvents.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedDayEvents.map((evt, i) => (
                      <div
                        key={i}
                        className={`p-3.5 rounded-xl flex items-center justify-between shadow-2xs ${evt.color}`}
                      >
                        <div className="font-bold text-sm">{evt.title}</div>
                        {evt.time && (
                          <div className="text-xs font-extrabold px-2 py-1 bg-white/70 rounded-md shrink-0 ml-3">
                            {evt.time}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    <p className="text-sm font-semibold text-slate-400">
                      No events or deliverables scheduled for October {selectedDay}.
                    </p>
                  </div>
                )}
              </div>

              {/* Add New Event Form */}
              <form onSubmit={handleAddEventForSelectedDay} className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  + Add Event for Oct {selectedDay}
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Event title or milestone..."
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="10:00 AM"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="w-28 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedDay(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-2xs transition-all"
                  >
                    Add Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Global Add Event Modal (Triggered by + Add Event Header Button) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <h3 className="text-lg font-extrabold text-slate-900">Add New Calendar Event</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 font-bold flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEventGlobal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Select Date (October 2026)
                </label>
                <select
                  value={targetDay}
                  onChange={(e) => setTargetDay(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {currentMonthDays.map((d) => (
                    <option key={d} value={d}>
                      October {d}, 2026
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Event Title / Milestone Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Strategy Review & Release"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Time
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10:00 AM"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-2xs transition-all"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
