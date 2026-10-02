'use client';

import React from 'react';
import { FileItem } from '@/lib/types';
import { FileIcon } from './Icons';

interface FileViewerModalProps {
  file: FileItem | null;
  onClose: () => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ file, onClose }) => {
  if (!file) return null;

  const getFilePreviewContent = () => {
    switch (file.type) {
      case 'image':
        return (
          <div className="bg-slate-900 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[260px] text-white">
            <div className="w-full max-h-[300px] overflow-hidden rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 p-4">
              <img
                src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop"
                alt={file.name}
                className="max-h-[240px] w-auto object-contain rounded-lg shadow-md"
              />
            </div>
            <p className="text-xs text-slate-400 mt-3 font-medium">Image Preview • {file.name}</p>
          </div>
        );

      case 'code':
        return (
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 font-mono text-xs overflow-x-auto min-h-[240px] border border-slate-800">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-slate-400 text-[11px]">
              <span>{file.name}</span>
              <span>JSON / REST Spec</span>
            </div>
            <pre className="text-emerald-400">
{`{
  "api_version": "2.0",
  "endpoint": "/api/v2/ecommerce/checkout",
  "status": "active",
  "authenticated_by": "${file.uploadedBy}",
  "project": "${file.project}",
  "size": "${file.size}"
}`}
            </pre>
          </div>
        );

      case 'pdf':
        return (
          <div className="bg-slate-100 rounded-2xl p-6 min-h-[260px] border border-slate-200 flex flex-col justify-between">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  PDF
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{file.name}</h4>
                  <p className="text-xs text-slate-400">{file.project} Deliverable</p>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="h-3 bg-slate-100 rounded w-3/4 animate-pulse"></div>
                <div className="h-3 bg-slate-100 rounded w-full animate-pulse"></div>
                <div className="h-3 bg-slate-100 rounded w-5/6 animate-pulse"></div>
                <p className="text-xs text-slate-500 font-medium pt-2">
                  Document ready for download and team signoff.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-200 min-h-[220px] flex flex-col items-center justify-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-extrabold text-2xl">
              📄
            </div>
            <h4 className="text-base font-bold text-slate-900">{file.name}</h4>
            <p className="text-xs text-slate-500 font-medium">Standard Project Document</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <FileIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 truncate max-w-xs">{file.name}</h3>
              <span className="text-xs font-bold text-blue-600">{file.project}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 font-bold flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Content Viewer Body */}
        <div className="p-6 space-y-5">
          {getFilePreviewContent()}

          {/* File Metadata Details */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-semibold text-slate-600">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Size</span>
              <span className="text-slate-900 font-bold">{file.size}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Uploaded By</span>
              <span className="text-slate-900 font-bold">{file.uploadedBy}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Uploaded Date</span>
              <span className="text-slate-900 font-bold">{file.uploadedAt}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold uppercase px-3 py-1 rounded-md bg-blue-100 text-blue-700">
            {file.type}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl"
            >
              Close
            </button>

            <a
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(file.name)}`}
              download={file.name}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>📥 Download File</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
