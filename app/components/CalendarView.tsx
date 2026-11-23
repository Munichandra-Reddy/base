'use client';

import React, { useState, useEffect } from 'react';
import { Task, Project } from '@/lib/types';
import { isTaskOverdue, isTaskAssignedToEmployee } from '@/lib/dashboardCalculations';
import { notifyMeetingInvited } from '@/lib/firebaseNotificationService';

export interface CalendarEvent {
  id?: string;
  title: string;
  time?: string;
  project?: string;
  status?: string;
  priority?: string;
  isTask?: boolean;
  isOverdue?: boolean;
}

interface CalendarViewProps {
  tasks?: Task[];
  projects?: Project[];
  currentUser?: { email: string; fullName: string; companyName: string } | null;
  isAdmin?: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks = [],
  projects = [],
  currentUser,
  isAdmin = false,
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Month navigation: default to October 2026 (matching system deliverable tasks and user screenshots)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(9); // 0-indexed: 9 = October

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[currentMonth];

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Days count for current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Week Days (Day 1 to Day 7 of selected month)
  const currentWeekDays = [
    { dayNumber: 1, dayName: 'Sun', dateStr: `${monthName.slice(0, 3)} 1` },
    { dayNumber: 2, dayName: 'Mon', dateStr: `${monthName.slice(0, 3)} 2` },
    { dayNumber: 3, dayName: 'Tue', dateStr: `${monthName.slice(0, 3)} 3` },
    { dayNumber: 4, dayName: 'Wed', dateStr: `${monthName.slice(0, 3)} 4` },
    { dayNumber: 5, dayName: 'Thu', dateStr: `${monthName.slice(0, 3)} 5` },
    { dayNumber: 6, dayName: 'Fri', dateStr: `${monthName.slice(0, 3)} 6` },
    { dayNumber: 7, dayName: 'Sat', dateStr: `${monthName.slice(0, 3)} 7` },
  ];

  // Custom User-Scheduled Events (persisted per workspace)
  const [customEvents, setCustomEvents] = useState<Record<string, CalendarEvent[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workorbit_calendar_custom_events');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch (e) {}
      }
    }
    return {};
  });

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for Date Pop-up / Add Event Modal
  const [targetDay, setTargetDay] = useState<number>(1);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('10:00 AM');

  // ==========================================
  // ROLE-BASED TASK FILTERING & CALENDAR MAPPING
  // Admin: Sees all workspace tasks & deliverables
  // Employee: Sees strictly tasks assigned to them
  // ==========================================
  const authorizedTasks = tasks.filter((t) => {
    if (t.status === 'cancelled') return false; // Exclude cancelled tasks
    if (isAdmin) return true;
    return isTaskAssignedToEmployee(t, currentUser);
  });

  // Build aggregated events map for the currently viewed month
  const eventsByDay: Record<number, CalendarEvent[]> = {};

  // 1. Map real tasks with dueDate to their respective calendar day
  authorizedTasks.forEach((task) => {
    if (!task.dueDate) return;
    const parts = task.dueDate.split('-');
    if (parts.length === 3) {
      const tYear = Number(parts[0]);
      const tMonth = Number(parts[1]) - 1; // 0-indexed
      const tDay = Number(parts[2]);

      if (tYear === currentYear && tMonth === currentMonth && tDay >= 1 && tDay <= daysInMonth) {
        if (!eventsByDay[tDay]) eventsByDay[tDay] = [];
        eventsByDay[tDay].push({
          id: task.id,
          title: task.title,
          project: task.project,
          time: task.dueDate,
          status: task.status,
          priority: task.priority,
          isTask: true,
          isOverdue: isTaskOverdue(task),
        });
      }
    }
  });

  // 2. Map custom events for the currently viewed month
  const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  Object.keys(customEvents).forEach((key) => {
    if (key.startsWith(monthKey)) {
      const dayPart = Number(key.split('-')[2]);
      if (dayPart >= 1 && dayPart <= daysInMonth) {
        if (!eventsByDay[dayPart]) eventsByDay[dayPart] = [];
        eventsByDay[dayPart].push(...customEvents[key]);
      }
    }
  });

  // Submit handler for date pop-up form
  const handleAddEventForSelectedDay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay || !newEventTitle.trim()) return;

    const newEvt: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title: newEventTitle.trim(),
      time: newEventTime.trim() || '10:00 AM',
      isTask: false,
    };

    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
      selectedDay
    ).padStart(2, '0')}`;

    setCustomEvents((prev) => {
      const updated = {
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), newEvt],
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('workorbit_calendar_custom_events', JSON.stringify(updated));
      }
      return updated;
    });

    // Phase 9: Meeting invitation notification
    const allMemberEmails = Array.from(
      new Set(
        projects.flatMap((p) => (p.members || []).map((m) => m.toLowerCase().trim()))
      )
    ).filter(Boolean);

    notifyMeetingInvited({
      eventId: newEvt.id || `evt-${Date.now()}`,
      eventTitle: newEvt.title,
      eventDate: dateKey,
      eventTime: newEvt.time || '10:00 AM',
      attendeeEmails: allMemberEmails,
      organizerName: currentUser?.fullName || 'Meeting Organizer',
      organizerEmail: currentUser?.email,
    }).catch(() => {});

    setNewEventTitle('');
  };

  // Submit handler for standalone "+ Add Event" modal button
  const handleAddEventGlobal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    const newEvt: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title: newEventTitle.trim(),
      time: newEventTime.trim() || '10:00 AM',
      isTask: false,
    };

    const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
      targetDay
    ).padStart(2, '0')}`;

    setCustomEvents((prev) => {
      const updated = {
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), newEvt],
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('workorbit_calendar_custom_events', JSON.stringify(updated));
      }
      return updated;
    });

    // Phase 9: Meeting invitation notification
    const allMemberEmails = Array.from(
      new Set(
        projects.flatMap((p) => (p.members || []).map((m) => m.toLowerCase().trim()))
      )
    ).filter(Boolean);

    notifyMeetingInvited({
      eventId: newEvt.id || `evt-${Date.now()}`,
      eventTitle: newEvt.title,
      eventDate: dateKey,
      eventTime: newEvt.time || '10:00 AM',
      attendeeEmails: allMemberEmails,
      organizerName: currentUser?.fullName || 'Meeting Organizer',
      organizerEmail: currentUser?.email,
    }).catch(() => {});

    setNewEventTitle('');
    setIsAddModalOpen(false);
  };

  const selectedDayEvents = selectedDay ? eventsByDay[selectedDay] || [] : [];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  return (
    <div className="space-y-6 font-sans w-full">
      {/* Header */}
      <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1
              className="text-xl font-semibold text-[#111827] leading-none !m-0 !p-0 inline-flex items-center"
              style={{ margin: 0, padding: 0 }}
            >
              Workspace Schedule
            </h1>
            <div className="inline-flex items-center gap-1 bg-[#F4F6F8] px-1.5 py-0.5 rounded-md border border-[#E2E8F0]">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-white text-[#595959] hover:text-[#111827] transition-all cursor-pointer"
                title="Previous Month"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-xs font-bold text-[#111827] px-1 select-none whitespace-nowrap leading-none">
                {monthName} {currentYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-white text-[#595959] hover:text-[#111827] transition-all cursor-pointer"
                title="Next Month"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          <p className="text-[#595959] text-xs font-normal mt-1.5">
            {viewMode === 'month'
              ? `${monthName} ${currentYear} Milestone & Deliverables Calendar (Click any date for details)`
              : `Current Week (${monthName.slice(0, 3)} 1 - ${monthName.slice(0, 3)} 7, ${currentYear}) Schedule`}
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
            className="btn-primary"
          >
            <span className="text-sm leading-none">+</span>
            <span>Add Event</span>
          </button>

          <div className="flex items-center gap-1 bg-[#F4F6F8] p-1 rounded-lg border border-[#E5E5E5] text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-white shadow-2xs text-[#111827] font-semibold'
                  : 'text-[#595959] hover:text-[#111827]'
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-white shadow-2xs text-[#111827] font-semibold'
                  : 'text-[#595959] hover:text-[#111827]'
              }`}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'month' ? (
        /* Month View Grid */
        <div className="overflow-x-auto w-full pb-2">
          <div className="min-w-[580px] sm:min-w-0 bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-micro">
            <div className="grid grid-cols-7 border-b border-[#E2E8F0] bg-[#F1F3F6] text-center text-xs sm:text-sm font-bold text-[#334155] py-3 sm:py-3.5">
              {days.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[#E2E8F0]">
              {currentMonthDays.map((day) => {
                const dayItems = eventsByDay[day] || [];

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className="min-h-[90px] sm:min-h-[110px] p-2 sm:p-2.5 bg-white hover:bg-[#EBF0F5] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs sm:text-sm font-bold text-[#334155] group-hover:text-[#0F172A]">
                        {day}
                      </span>
                      {dayItems.length > 0 && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-[#6CC04A] text-white">
                          {dayItems.length}
                        </span>
                      )}
                    </div>
                    {dayItems.map((evt, idx) => (
                      <div
                        key={idx}
                        title={`${evt.title}${evt.project ? ` (${evt.project})` : ''}`}
                        onClick={() => setSelectedDay(day)}
                        className={`text-xs font-bold p-1.5 sm:p-2 rounded-lg mb-1 truncate shadow-2xs transition-all duration-150 cursor-pointer ${
                          evt.isOverdue
                            ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                            : evt.status === 'completed'
                            ? 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]'
                            : 'bg-white text-[#111827] border border-[#E2E8F0] hover:bg-black hover:text-white hover:border-black active:bg-black active:text-white'
                        }`}
                      >
                        {evt.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Week View Grid */
        <div className="overflow-x-auto w-full pb-2">
          <div className="min-w-[580px] sm:min-w-0 bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-micro">
            <div className="grid grid-cols-7 border-b border-[#E2E8F0] bg-[#F1F3F6] text-center text-xs sm:text-sm font-bold text-[#334155] py-3 sm:py-3.5">
              {currentWeekDays.map((wDay) => (
                <div key={wDay.dayNumber} className="flex flex-col items-center">
                  <span>{wDay.dayName}</span>
                  <span className="text-[10px] sm:text-xs font-semibold text-[#64748B] mt-0.5">
                    {wDay.dateStr}
                  </span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 divide-x divide-[#E2E8F0] bg-white min-h-[340px] sm:min-h-[360px]">
              {currentWeekDays.map((wDay) => {
                const dayItems = eventsByDay[wDay.dayNumber] || [];

                return (
                  <div
                    key={wDay.dayNumber}
                    onClick={() => setSelectedDay(wDay.dayNumber)}
                    className="p-2 sm:p-3 bg-white hover:bg-[#EBF0F5] transition-colors cursor-pointer space-y-2 group"
                  >
                    <div className="text-xs font-extrabold text-[#64748B] group-hover:text-[#0F172A] mb-2 truncate">
                      {wDay.dayName}, {wDay.dateStr}
                    </div>
                    {dayItems.length > 0 ? (
                      dayItems.map((evt, idx) => (
                        <div
                          key={idx}
                          title={`${evt.title}${evt.project ? ` (${evt.project})` : ''}`}
                          onClick={() => setSelectedDay(wDay.dayNumber)}
                          className={`p-2 sm:p-2.5 rounded-xl space-y-1 shadow-2xs transition-all duration-150 cursor-pointer group/weekEvt ${
                            evt.isOverdue
                              ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                              : evt.status === 'completed'
                              ? 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]'
                              : 'bg-white text-[#111827] border border-[#E2E8F0] hover:bg-black hover:text-white hover:border-black active:bg-black active:text-white'
                          }`}
                        >
                          {evt.time && (
                            <div className="text-[10px] font-extrabold opacity-75 text-[#64748B] group-hover/weekEvt:text-white/80 transition-colors">
                              {evt.time}
                            </div>
                          )}
                          <div className="text-xs font-bold leading-tight">{evt.title}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-[11px] font-medium text-[#CBD5E1] italic pt-4 text-center">
                        No events
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Date Details Pop-up Modal */}
      {selectedDay !== null && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedDay(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4 overflow-y-auto font-sans"
        >
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F1F3F6]">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
                  {monthName} {selectedDay}, {currentYear} Schedule
                </h3>
                <p className="text-xs font-semibold text-[#64748B] mt-0.5">
                  Milestones, events, and task deliverables for this day.
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="w-8 h-8 rounded-full bg-[#EBF0F5] hover:bg-[#CBD5E1]/40 text-[#334155] font-bold flex items-center justify-center text-sm transition-colors cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">
                  Scheduled Deliverables & Events ({selectedDayEvents.length})
                </h4>
                {selectedDayEvents.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedDayEvents.map((evt, i) => (
                      <div
                        key={i}
                        className="p-3 sm:p-3.5 rounded-xl flex items-center justify-between shadow-2xs transition-all duration-150 cursor-pointer group/modalEvt bg-white text-[#111827] border border-[#E2E8F0] hover:bg-black hover:text-white hover:border-black active:bg-black active:text-white"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="font-bold text-xs sm:text-sm truncate">{evt.title}</div>
                          {evt.project && (
                            <div className="text-[10px] sm:text-[11px] text-[#64748B] group-hover/modalEvt:text-white/80 font-medium truncate mt-0.5">
                              {evt.project}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {evt.status && (
                            <span
                              className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                                evt.isOverdue
                                  ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                                  : evt.status === 'completed'
                                  ? 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]'
                                  : 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                              }`}
                            >
                              {evt.isOverdue ? 'Overdue' : evt.status}
                            </span>
                          )}
                          {evt.time && (
                            <div className="text-[10px] sm:text-xs font-extrabold px-2 py-1 bg-[#F1F3F6] text-[#334155] group-hover/modalEvt:bg-white/20 group-hover/modalEvt:text-white rounded-md shrink-0 transition-colors">
                              {evt.time}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-5 text-center bg-[#F1F3F6] border border-dashed border-[#CBD5E1] rounded-xl">
                    <p className="text-xs sm:text-sm font-semibold text-[#64748B]">
                      No events or deliverables scheduled for {monthName} {selectedDay}.
                    </p>
                  </div>
                )}
              </div>

              {/* Add New Event Form */}
              <form onSubmit={handleAddEventForSelectedDay} className="pt-4 border-t border-[#E5E5E5] space-y-3">
                <h4 className="text-xs font-semibold text-[#111827]">
                  + Add Event for {monthName.slice(0, 3)} {selectedDay}
                </h4>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Event title or milestone..."
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs text-[#222222] font-medium focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9]"
                  />
                  <input
                    type="text"
                    placeholder="10:00 AM"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="w-full sm:w-28 px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs text-[#222222] font-medium focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedDay(null)}
                    className="btn-secondary"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
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
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4 font-sans overflow-y-auto"
        >
          <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between bg-white">
              <div>
                <h3 className="text-sm font-semibold text-[#111827]">Add New Calendar Event</h3>
                <p className="text-xs text-[#595959] font-normal">Schedule milestone or team meeting</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-md bg-[#F4F6F8] hover:bg-[#E5E5E5] text-[#595959] hover:text-[#111827] font-medium flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEventGlobal} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#222222] mb-1">
                  Select Date ({monthName} {currentYear})
                </label>
                <select
                  value={targetDay}
                  onChange={(e) => setTargetDay(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs font-medium text-[#222222] focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9]"
                >
                  {currentMonthDays.map((d) => (
                    <option key={d} value={d}>
                      {monthName} {d}, {currentYear}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#222222] mb-1">
                  Event Title / Milestone Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Strategy Review & Release"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs text-[#222222] font-medium focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#222222] mb-1">
                  Time
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10:00 AM"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs text-[#222222] font-medium focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
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
