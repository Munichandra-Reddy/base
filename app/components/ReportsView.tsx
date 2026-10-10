'use client';

import React from 'react';

export const ReportsView: React.FC = () => {
  return (
    <div className="space-y-7">
      <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-3xl font-extrabold text-slate-900">Workspace Productivity Reports</h1>
        <p className="text-slate-500 text-base font-medium mt-1">Task completion rates, velocity metrics, and project load analysis.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-slate-900">Task Completion Velocity</h3>
            <span className="text-xs font-extrabold text-slate-900 bg-slate-200 px-3 py-1 rounded-lg border border-slate-300">
              +18% vs last week
            </span>
          </div>
          <div className="h-52 bg-slate-50 rounded-2xl flex items-end justify-between p-5 gap-3 border border-slate-100">
            {[40, 65, 30, 85, 95, 70, 90].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className="w-full bg-slate-900 rounded-t-xl transition-all" style={{ height: `${val}%` }} />
                <span className="text-xs font-bold text-slate-500">Day {i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <h3 className="text-xl font-extrabold text-slate-900">Project Allocation</h3>
          <div className="space-y-4">
            {[
              { name: 'E-Commerce Website', pct: 40, color: 'bg-slate-900' },
              { name: 'Mobile App v2', pct: 25, color: 'bg-slate-700' },
              { name: 'Marketing Campaign', pct: 20, color: 'bg-slate-500' },
              { name: 'Internal Ops', pct: 15, color: 'bg-slate-300' },
            ].map((p, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-base font-bold text-slate-800">
                  <span>{p.name}</span>
                  <span className="font-extrabold text-slate-900">{p.pct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
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
