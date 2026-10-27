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
    <div className="space-y-7 font-sans">
      <div className="bg-white p-7 rounded-2xl border border-[#E5E5E5] shadow-micro">
        <h1 className="text-3xl font-light text-[#222222]">Workspace Productivity Reports</h1>
        <p className="text-[#595959] text-base font-medium mt-1">Task completion rates, velocity metrics, and project load analysis.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-7 rounded-2xl border border-[#E5E5E5] shadow-micro space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-[#222222]">Task Completion Velocity</h3>
            <span className="text-xs font-extrabold text-[#238823] bg-[#F0FDF4] px-3 py-1 rounded-lg border border-[#238823]/25">
              +18% vs last week
            </span>
          </div>
          <div className="h-52 bg-[#F4F6F8] rounded-2xl flex items-end justify-between p-5 gap-3 border border-[#E5E5E5]">
            {[40, 65, 30, 85, 95, 70, 90].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className="w-full bg-[#049FD9] hover:bg-[#004BAF] rounded-t-xl transition-all" style={{ height: `${val}%` }} />
                <span className="text-xs font-bold text-[#595959]">Day {i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-7 rounded-2xl border border-[#E2E8F0] shadow-micro space-y-5">
          <h3 className="text-xl font-extrabold text-[#0F172A]">Project Allocation</h3>
          <div className="space-y-4">
            {[
              { name: 'E-Commerce Website', pct: 40, color: 'bg-[#6CC04A]' },
              { name: 'Mobile App v2', pct: 25, color: 'bg-[#2563EB]' },
              { name: 'Marketing Campaign', pct: 20, color: 'bg-[#0D9488]' },
              { name: 'Internal Ops', pct: 15, color: 'bg-[#F59E0B]' },
            ].map((p, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-base font-bold text-[#334155]">
                  <span>{p.name}</span>
                  <span className="font-extrabold text-[#0F172A]">{p.pct}%</span>
                </div>
                <div className="w-full bg-[#EBF0F5] rounded-full h-2.5 overflow-hidden">
                  <div className={`${p.color} h-full rounded-full`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All Workspace Activities Stream */}
      <div className="bg-white p-7 rounded-2xl border border-[#E2E8F0] shadow-micro space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div>
            <h3 className="text-xl font-extrabold text-[#0F172A]">All Workspace Activity</h3>
            <p className="text-xs text-[#64748B] font-medium mt-0.5">
              Complete timeline of tasks, projects, employees, and team actions
            </p>
          </div>
          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-[#EBF0F5] text-[#334155] border border-[#E2E8F0]">
            {activityList.length} Total Activities
          </span>
        </div>

        <div className="divide-y divide-[#E2E8F0]">
          {activityList.map((act) => (
            <div key={act.id} className="py-3.5 flex items-start gap-3.5 text-xs">
              <div
                className={`w-9 h-9 rounded-full ${act.avatarBg} font-extrabold flex items-center justify-center shrink-0 shadow-2xs text-xs mt-0.5`}
              >
                {act.userAvatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[#334155] leading-snug break-words">
                  <span className="font-bold text-[#0F172A] text-sm">{act.userName}</span>{' '}
                  <span className="text-[#64748B]">{act.action}</span>{' '}
                  <span className="font-semibold text-[#0F172A]">"{act.target}"</span>
                </div>
                <div className="text-[11px] font-medium text-[#64748B] mt-1 flex items-center gap-2">
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
