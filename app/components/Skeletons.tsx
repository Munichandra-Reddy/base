'use client';

import React from 'react';

/**
 * 1. Employee Dashboard Skeleton
 * Mirrors EmployeeDashboardView: 6 compact KPI cards + Left 2 cols (Focus Tasks + Active Projects) + Right 1 col (Schedule + Squad)
 */
export const EmployeeDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 font-sans w-full animate-pulse">
      {/* 6 KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 w-full">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white p-3 rounded-xl border border-[#E5E5E5] shadow-2xs flex flex-col justify-between h-20">
            <div className="flex items-center justify-between mb-2">
              <div className="h-2.5 w-14 bg-[#E2E8F0] rounded" />
              <div className="w-7 h-7 rounded-lg bg-[#F1F5F9] border border-[#E5E5E5]" />
            </div>
            <div>
              <div className="h-5 w-8 bg-[#CBD5E1] rounded mb-1" />
              <div className="h-2 w-16 bg-[#F1F5F9] rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Workstation 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 w-full">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          {/* Card 1: Focus & Tasks */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E5]">
              <div className="h-4 w-44 bg-[#E2E8F0] rounded" />
              <div className="flex items-center gap-1 bg-[#F4F6F8] p-1 rounded-xl border border-[#E5E5E5]">
                <div className="h-6 w-20 bg-white rounded-lg shadow-2xs" />
                <div className="h-6 w-16 bg-[#E2E8F0] rounded-lg" />
                <div className="h-6 w-20 bg-[#E2E8F0] rounded-lg" />
              </div>
            </div>

            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-[#E5E5E5] bg-white flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-[#E2E8F0] shrink-0" />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="h-3.5 w-3/4 max-w-xs bg-[#CBD5E1] rounded" />
                      <div className="h-2.5 w-1/3 bg-[#E2E8F0] rounded" />
                    </div>
                  </div>
                  <div className="h-5 w-14 bg-[#F1F5F9] border border-[#E2E8F0] rounded-md shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Active Projects */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
              <div className="space-y-1">
                <div className="h-4 w-32 bg-[#E2E8F0] rounded" />
                <div className="h-2.5 w-48 bg-[#F1F5F9] rounded" />
              </div>
              <div className="h-3 w-12 bg-[#E2E8F0] rounded" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, pIdx) => (
                <div key={pIdx} className="p-4 rounded-xl border border-[#E5E5E5] bg-white space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-3.5 w-32 bg-[#CBD5E1] rounded" />
                    <div className="h-4 w-12 bg-[#F1F5F9] rounded-md" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-full bg-[#F1F5F9] rounded" />
                    <div className="h-2.5 w-4/5 bg-[#F1F5F9] rounded" />
                  </div>
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between">
                      <div className="h-2 w-16 bg-[#E2E8F0] rounded" />
                      <div className="h-2 w-8 bg-[#E2E8F0] rounded" />
                    </div>
                    <div className="w-full bg-[#F4F6F8] rounded-full h-1.5 overflow-hidden">
                      <div className="bg-[#CBD5E1] h-full rounded-full w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Column */}
        <div className="space-y-4 lg:space-y-6">
          {/* Card 3: Today's Schedule */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
              <div className="h-4 w-28 bg-[#E2E8F0] rounded" />
              <div className="h-3 w-12 bg-[#E2E8F0] rounded" />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, sIdx) => (
                <div key={sIdx} className="p-3 rounded-lg bg-[#F4F6F8] border border-[#E5E5E5] flex items-start gap-3">
                  <div className="w-10 h-10 rounded-md bg-[#CBD5E1] shrink-0" />
                  <div className="space-y-1.5 flex-1 min-w-0 pt-0.5">
                    <div className="h-3.5 w-36 bg-[#CBD5E1] rounded" />
                    <div className="h-2.5 w-48 bg-[#E2E8F0] rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Project Squad */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-2">
                <div className="h-4 w-24 bg-[#E2E8F0] rounded" />
                <div className="h-4 w-6 bg-[#E2E8F0] rounded" />
              </div>
              <div className="h-3 w-14 bg-[#E2E8F0] rounded" />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, mIdx) => (
                <div key={mIdx} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#CBD5E1] shrink-0" />
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="h-3 w-24 bg-[#CBD5E1] rounded" />
                      <div className="h-2 w-16 bg-[#E2E8F0] rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-12 bg-[#F1F5F9] rounded-full shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 2. Admin Dashboard Skeleton
 * Mirrors DashboardView: 6 KPI Cards + Left 2 cols (Quick Actions + Milestones Tasks) + Right 1 col (Campfire + Storage + Activity)
 */
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 font-sans w-full animate-pulse">
      {/* 6 Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 w-full">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white p-3 rounded-xl border border-[#E5E5E5] shadow-2xs flex flex-col justify-between h-20">
            <div className="flex items-center justify-between mb-2">
              <div className="h-2.5 w-16 bg-[#E2E8F0] rounded" />
              <div className="w-7 h-7 rounded-lg bg-[#F1F5F9] border border-[#E5E5E5]" />
            </div>
            <div>
              <div className="h-5 w-10 bg-[#CBD5E1] rounded mb-1" />
              <div className="h-2 w-14 bg-[#F1F5F9] rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 w-full">
        {/* Left 2 Cols */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          {/* Quick Actions Bar */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-4 shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-24 bg-[#CBD5E1] rounded-lg" />
              <div className="h-8 w-28 bg-[#E2E8F0] rounded-lg" />
            </div>
            <div className="h-8 w-20 bg-[#E2E8F0] rounded-lg" />
          </div>

          {/* Tasks & Milestones Card */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div className="h-4 w-40 bg-[#E2E8F0] rounded" />
              <div className="h-6 w-32 bg-[#E2E8F0] rounded-lg" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-[#E5E5E5] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-4 h-4 rounded bg-[#E2E8F0] shrink-0" />
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="h-3 w-40 bg-[#CBD5E1] rounded" />
                      <div className="h-2 w-20 bg-[#E2E8F0] rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-12 bg-[#F1F5F9] rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col */}
        <div className="space-y-4 lg:space-y-6">
          {/* Campfire Card */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
              <div className="h-4 w-28 bg-[#E2E8F0] rounded" />
              <div className="h-3 w-10 bg-[#E2E8F0] rounded" />
            </div>
            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((_, cIdx) => (
                <div key={cIdx} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#CBD5E1] shrink-0" />
                  <div className="space-y-1 flex-1">
                    <div className="h-2.5 w-20 bg-[#CBD5E1] rounded" />
                    <div className="h-2 w-48 bg-[#F1F5F9] rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 shadow-2xs space-y-3">
            <div className="h-4 w-24 bg-[#E2E8F0] rounded mb-2" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, aIdx) => (
                <div key={aIdx} className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#E2E8F0] shrink-0" />
                  <div className="space-y-1 flex-1">
                    <div className="h-2.5 w-32 bg-[#CBD5E1] rounded" />
                    <div className="h-2 w-16 bg-[#F1F5F9] rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 3. Tasks View Skeleton
 */
export const TasksSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 font-sans w-full animate-pulse">
      {/* Header Card */}
      <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-5 w-44 bg-[#CBD5E1] rounded" />
          <div className="h-3 w-72 bg-[#E2E8F0] rounded" />
        </div>
        <div className="h-8 w-28 bg-[#CBD5E1] rounded-lg" />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-[#E5E5E5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="h-7 w-56 bg-[#F4F6F8] rounded-lg border border-[#E5E5E5]" />
        <div className="h-7 w-48 bg-[#F4F6F8] rounded-md border border-[#E5E5E5]" />
      </div>

      {/* Task List Items */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-5 h-5 rounded-md bg-[#E2E8F0] shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="h-3.5 w-1/2 max-w-sm bg-[#CBD5E1] rounded" />
                <div className="h-2.5 w-32 bg-[#E2E8F0] rounded" />
              </div>
            </div>
            <div className="h-5 w-16 bg-[#F1F5F9] border border-[#E2E8F0] rounded-md shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * 4. Projects View Skeleton
 */
export const ProjectsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 font-sans w-full animate-pulse">
      {/* Header */}
      <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-5 w-36 bg-[#CBD5E1] rounded" />
          <div className="h-3 w-64 bg-[#E2E8F0] rounded" />
        </div>
        <div className="h-8 w-32 bg-[#CBD5E1] rounded-lg" />
      </div>

      {/* Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-[#E5E5E5] shadow-2xs flex items-center justify-between gap-3">
        <div className="h-7 w-36 bg-[#F4F6F8] rounded-md" />
        <div className="h-7 w-48 bg-[#F4F6F8] rounded-md" />
      </div>

      {/* Grid of Projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-[#E5E5E5] shadow-2xs space-y-4">
            <div className="flex items-start justify-between">
              <div className="h-4 w-32 bg-[#CBD5E1] rounded" />
              <div className="h-4 w-14 bg-[#F1F5F9] rounded-md" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2.5 w-full bg-[#F1F5F9] rounded" />
              <div className="h-2.5 w-3/4 bg-[#F1F5F9] rounded" />
            </div>
            <div className="space-y-1 pt-2">
              <div className="flex justify-between">
                <div className="h-2 w-16 bg-[#E2E8F0] rounded" />
                <div className="h-2 w-8 bg-[#E2E8F0] rounded" />
              </div>
              <div className="w-full bg-[#F4F6F8] rounded-full h-1.5">
                <div className="bg-[#CBD5E1] h-full rounded-full w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * 5. Calendar View Skeleton
 */
export const CalendarSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 font-sans w-full animate-pulse">
      {/* Header */}
      <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-5 w-44 bg-[#CBD5E1] rounded" />
          <div className="h-3 w-64 bg-[#E2E8F0] rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-28 bg-[#CBD5E1] rounded-lg" />
          <div className="h-8 w-32 bg-[#F4F6F8] border border-[#E5E5E5] rounded-lg" />
        </div>
      </div>

      {/* Month Calendar Grid */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-micro">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-[#E2E8F0] bg-[#F1F3F6] py-3 text-center">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex justify-center">
              <div className="h-3 w-8 bg-[#CBD5E1] rounded" />
            </div>
          ))}
        </div>
        {/* Calendar Cells */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[#E2E8F0] min-h-[420px]">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className="min-h-[90px] p-2.5 bg-white space-y-2">
              <div className="h-3 w-4 bg-[#E2E8F0] rounded" />
              {i % 4 === 1 && (
                <div className="h-5 w-full bg-[#F1F5F9] border border-[#E2E8F0] rounded" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * 6. Chat View Skeleton
 */
export const ChatSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs h-full min-h-[500px] flex flex-col font-sans w-full animate-pulse">
      {/* Header */}
      <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-5 w-32 bg-[#CBD5E1] rounded" />
          <div className="h-2.5 w-56 bg-[#E2E8F0] rounded" />
        </div>
        <div className="h-7 w-48 bg-[#F4F6F8] rounded-lg border border-[#E5E5E5]" />
      </div>

      {/* Messages */}
      <div className="flex-1 p-6 space-y-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`flex items-start gap-3 ${i % 2 === 1 ? 'flex-row-reverse' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-[#CBD5E1] shrink-0" />
            <div className={`space-y-1.5 max-w-sm ${i % 2 === 1 ? 'items-end' : ''}`}>
              <div className="h-2.5 w-24 bg-[#E2E8F0] rounded" />
              <div className="h-10 w-64 bg-[#F1F5F9] border border-[#E5E5E5] rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#E5E5E5] bg-[#F4F6F8]">
        <div className="h-10 w-full bg-white border border-[#E5E5E5] rounded-lg" />
      </div>
    </div>
  );
};

/**
 * 7. Files View Skeleton
 */
export const FilesSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 font-sans w-full animate-pulse">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs">
        <div className="space-y-1.5">
          <div className="h-5 w-44 bg-[#CBD5E1] rounded" />
          <div className="h-3 w-72 bg-[#E2E8F0] rounded" />
        </div>
        <div className="h-8 w-28 bg-[#CBD5E1] rounded-lg" />
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-[#E5E5E5] shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] border border-[#E5E5E5]" />
            <div className="space-y-1">
              <div className="h-3.5 w-3/4 bg-[#CBD5E1] rounded" />
              <div className="h-2.5 w-1/2 bg-[#E2E8F0] rounded" />
            </div>
            <div className="pt-2 border-t border-[#E5E5E5] space-y-2.5">
              <div className="flex justify-between">
                <div className="h-2 w-16 bg-[#F1F5F9] rounded" />
                <div className="h-2 w-10 bg-[#F1F5F9] rounded" />
              </div>
              <div className="h-7 w-20 bg-[#CBD5E1] rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * 8. People (Employees) View Skeleton
 */
export const PeopleSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 font-sans w-full animate-pulse">
      {/* Header */}
      <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-5 w-56 bg-[#CBD5E1] rounded" />
          <div className="h-3 w-72 bg-[#E2E8F0] rounded" />
        </div>
        <div className="h-8 w-32 bg-[#CBD5E1] rounded-lg" />
      </div>

      {/* Grid of People */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-[#E5E5E5] p-3.5 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#CBD5E1] shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="h-3 w-28 bg-[#CBD5E1] rounded" />
              <div className="h-2 w-36 bg-[#E2E8F0] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * 9. Check-ins View Skeleton
 */
export const CheckinsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 font-sans w-full animate-pulse">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs">
        <div className="space-y-1.5">
          <div className="h-5 w-48 bg-[#CBD5E1] rounded" />
          <div className="h-3 w-72 bg-[#E2E8F0] rounded" />
        </div>
        <div className="h-8 w-32 bg-[#CBD5E1] rounded-lg" />
      </div>

      {/* Checkin Cards */}
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-3">
            <div className="h-4 w-3/4 max-w-lg bg-[#CBD5E1] rounded" />
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[#CBD5E1] shrink-0" />
              <div className="h-3 w-28 bg-[#E2E8F0] rounded" />
            </div>
            <div className="p-3 bg-[#F9FAFB] rounded border border-[#E5E5E5] space-y-1.5">
              <div className="h-3 w-full bg-[#E2E8F0] rounded" />
              <div className="h-3 w-4/5 bg-[#E2E8F0] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * 10. Reports View Skeleton
 */
export const ReportsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 font-sans w-full animate-pulse">
      {/* Header */}
      <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-1.5">
        <div className="h-5 w-60 bg-[#CBD5E1] rounded" />
        <div className="h-3 w-80 bg-[#E2E8F0] rounded" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-4 w-40 bg-[#CBD5E1] rounded" />
            <div className="h-5 w-20 bg-[#F1F5F9] rounded" />
          </div>
          <div className="h-52 bg-[#F9FAFB] rounded-lg p-4 border border-[#E5E5E5] flex items-end justify-between gap-2.5">
            {[40, 65, 30, 85, 95, 70, 90].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full bg-[#CBD5E1] rounded-t-xs" style={{ height: `${val}%` }} />
                <div className="h-2 w-6 bg-[#E2E8F0] rounded" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-4">
          <div className="h-4 w-36 bg-[#CBD5E1] rounded" />
          <div className="space-y-4 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-3 w-32 bg-[#CBD5E1] rounded" />
                  <div className="h-3 w-8 bg-[#E2E8F0] rounded" />
                </div>
                <div className="w-full bg-[#F4F6F8] rounded-full h-2">
                  <div className="bg-[#CBD5E1] h-full rounded-full" style={{ width: `${(4 - i) * 25}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
