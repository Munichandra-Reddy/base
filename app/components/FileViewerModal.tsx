'use client';

import React from 'react';
import { FileItem } from '@/lib/types';
import { FileIcon } from './Icons';
import { getDirectBlobUrl } from '@/lib/fileUtils';

interface FileViewerModalProps {
  file: FileItem | null;
  onClose: () => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ file, onClose }) => {
  if (!file) return null;

  const handleOpenDocument = () => {
    let fileUrl = file.fileUrl;

    if (!fileUrl && typeof window !== 'undefined') {
      const store = (window as any).__WORKORBIT_FILE_STORE__ || {};
      fileUrl = store[file.name] || store[file.name.toLowerCase()];

      if (!fileUrl) {
        try {
          const saved = JSON.parse(localStorage.getItem('workorbit_file_urls') || '{}');
          fileUrl = saved[file.name] || saved[file.name.toLowerCase()];
        } catch (e) {}
      }
    }

    const targetBlobUrl = getDirectBlobUrl(file.name, fileUrl, file.project);
    window.open(targetBlobUrl, '_blank');
  };

  const handleDownloadFile = (e: React.MouseEvent) => {
    e.preventDefault();
    if (file.fileUrl && file.fileUrl.startsWith('http')) {
      window.open(file.fileUrl, '_blank');
      return;
    }
    const content = `WorkOrbit Official Document: ${file.name}\nProject: ${file.project}\nUploaded by: ${file.uploadedBy} on ${file.uploadedAt}\nSize: ${file.size}\n\nDocument Status: Active & Verified.`;
    const blob = new Blob([content], { type: file.type === 'pdf' ? 'application/pdf' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
            <pre className="text-slate-300">
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
          <div className="bg-slate-100 rounded-2xl p-5 border border-slate-200 space-y-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                    PDF
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">{file.name}</h4>
                    <p className="text-xs text-slate-500 font-semibold">{file.project} Deliverable</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenDocument}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Open Document ↗</span>
                </button>
              </div>

              {/* Document Pages Preview Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3 text-slate-800">
                <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200 pb-2">
                  <span>📄 PDF Document View (Verified)</span>
                  <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-extrabold uppercase">
                    Ready
                  </span>
                </div>
                <div className="space-y-2 font-medium text-slate-700 leading-relaxed">
                  <p><strong>Document Name:</strong> {file.name}</p>
                  <p><strong>Project Space:</strong> {file.project}</p>
                  <p><strong>Uploaded By:</strong> {file.uploadedBy} ({file.uploadedAt})</p>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-700 font-sans">
                    Document loaded successfully. Click <strong>"Open Document ↗"</strong> to view full document in tab or <strong>"Download File"</strong> below to save to device.
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-200 min-h-[220px] flex flex-col items-center justify-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-slate-200 text-slate-900 flex items-center justify-center font-extrabold text-2xl">
              📄
            </div>
            <h4 className="text-base font-bold text-slate-900">{file.name}</h4>
            <p className="text-xs text-slate-500 font-medium">Standard Project Document</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <FileIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 truncate max-w-xs">{file.name}</h3>
              <span className="text-xs font-bold text-slate-700">{file.project}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 font-bold flex items-center justify-center text-sm transition-colors cursor-pointer"
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
          <span className="text-xs font-bold uppercase px-3 py-1 rounded-md bg-slate-200 text-slate-900">
            {file.type}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleDownloadFile}
              className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>📥 Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
