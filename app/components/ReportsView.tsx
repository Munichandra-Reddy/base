'use client';

import React from 'react';

export const ReportsView: React.FC = () => {
  return (
    <div className="space-y-7 font-sans">
      <div className="bg-white p-7 rounded-2xl border border-[#E2E8F0] shadow-micro">
        <h1 className="text-3xl font-extrabold text-[#0F172A]">Workspace Productivity Reports</h1>
        <p className="text-[#64748B] text-base font-medium mt-1">Task completion rates, velocity metrics, and project load analysis.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-7 rounded-2xl border border-[#E2E8F0] shadow-micro space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-[#0F172A]">Task Completion Velocity</h3>
            <span className="text-xs font-extrabold text-[#10B981] bg-[#ECFDF5] px-3 py-1 rounded-lg border border-[#10B981]/25">
              +18% vs last week
            </span>
          </div>
          <div className="h-52 bg-[#F1F3F6] rounded-2xl flex items-end justify-between p-5 gap-3 border border-[#E2E8F0]">
            {[40, 65, 30, 85, 95, 70, 90].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className="w-full bg-[#0B192C] hover:bg-[#15293F] rounded-t-xl transition-all" style={{ height: `${val}%` }} />
                <span className="text-xs font-bold text-[#64748B]">Day {i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-7 rounded-2xl border border-[#E2E8F0] shadow-micro space-y-5">
          <h3 className="text-xl font-extrabold text-[#0F172A]">Project Allocation</h3>
          <div className="space-y-4">
            {[
              { name: 'E-Commerce Website', pct: 40, color: 'bg-[#0B192C]' },
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
    </div>
  );
};
