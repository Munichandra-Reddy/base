'use client';

import React from 'react';
import { Activity } from '@/lib/types';
import { initialActivities } from '@/lib/data';

interface ReportsViewProps {
  activities?: Activity[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ activities }) => {
  const activityList = activities && activities.length > 0 ? activities : initialActivities;

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs">
        <h1 className="text-xl font-semibold text-[#111827]">Workspace Productivity Reports</h1>
        <p className="text-[#595959] text-xs font-normal mt-0.5">Task completion rates, velocity metrics, and project load analysis.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#111827]">Task Completion Velocity</h3>
            <span className="text-xs font-semibold text-[#16A34A] bg-[#F0FDF4] px-2.5 py-0.5 rounded-md border border-[#BBF7D0]">
              +18% vs last week
            </span>
          </div>
          <div className="h-52 bg-[#F9FAFB] rounded-lg flex items-end justify-between p-4 gap-2.5 border border-[#E5E5E5]">
            {[40, 65, 30, 85, 95, 70, 90].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full bg-[#049FD9] hover:bg-[#004BAF] rounded-t-xs transition-all" style={{ height: `${val}%` }} />
                <span className="text-[10px] font-medium text-[#6B7280]">Day {i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-4">
          <h3 className="text-base font-semibold text-[#111827]">Project Allocation</h3>
          <div className="space-y-3.5">
            {[
              { name: 'E-Commerce Website', pct: 40, color: 'bg-[#049FD9]' },
              { name: 'Mobile App v2', pct: 25, color: 'bg-[#004BAF]' },
              { name: 'Marketing Campaign', pct: 20, color: 'bg-[#0284C7]' },
              { name: 'Internal Ops', pct: 15, color: 'bg-[#D97706]' },
            ].map((p, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-[#374151]">
                  <span>{p.name}</span>
                  <span className="font-semibold text-[#111827]">{p.pct}%</span>
                </div>
                <div className="w-full bg-[#F3F4F6] rounded-full h-2 overflow-hidden">
                  <div className={`${p.color} h-full rounded-full`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All Workspace Activities Stream */}
      <div className="bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
          <div>
            <h3 className="text-base font-semibold text-[#111827]">All Workspace Activity</h3>
            <p className="text-xs text-[#595959] font-normal mt-0.5">
              Complete timeline of tasks, projects, employees, and team actions
            </p>
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#F4F6F8] text-[#595959] border border-[#E5E5E5]">
            {activityList.length} Total Activities
          </span>
        </div>

        <div className="divide-y divide-[#E5E5E5]">
          {activityList.map((act) => (
            <div key={act.id} className="py-3 flex items-start gap-3 text-xs">
              <div
                className={`w-8 h-8 rounded-full ${act.avatarBg} font-bold flex items-center justify-center shrink-0 text-xs mt-0.5`}
              >
                {act.userAvatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[#595959] leading-snug break-words">
                  <span className="font-semibold text-[#111827] text-xs">{act.userName}</span>{' '}
                  <span className="text-[#595959]">{act.action}</span>{' '}
                  <span className="font-medium text-[#111827]">"{act.target}"</span>
                </div>
                <div className="text-[10px] font-normal text-[#595959] mt-0.5 flex items-center gap-2">
                  <span>{act.timeAgo}</span>
                  {act.timestamp && (
                    <>
                      <span>•</span>
                      <span>{act.timestamp}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
