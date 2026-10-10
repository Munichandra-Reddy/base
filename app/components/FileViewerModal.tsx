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
          <div className="bg-slate-100 rounded-2xl p-6 min-h-[260px] border border-slate-200 flex flex-col justify-between">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                    PDF
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">{file.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">{file.project} Document</p>
                  </div>
                </div>
                <a
                  href={getDownloadHref()}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  Open Document ↗
                </a>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 text-slate-700">
                <p className="font-bold text-slate-900">📄 PDF Document Viewer:</p>
                <p className="leading-relaxed">
                  Document <strong>{file.name}</strong> is loaded and ready. Click <strong>"Open Document ↗"</strong> or <strong>"Download File"</strong> to view full pages and inspect content.
                </p>
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

  const getDownloadHref = () => {
    if (file.fileUrl) {
      return file.fileUrl;
    }
    if (file.type === 'pdf') {
      return 'data:application/pdf;base64,JVBERi0xLjQNJSVPRkYNCjEgMCBvYmoNPDwvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFI+Pg1lbmRvYmoNCjIgMCBvYmoNPDwvVHlwZSAvUGFnZXMgL0tpZHMgWzMgMCBSXSAvQ291bnQgMT4+DWVuZG9iag0KMyAwIG9iaiA8PC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgNjEyIDc5MlIgL0NvbnRlbnRzIDQgMCBSL1Jlc291cmNlcyA8PD4+PjANZW5kb2JqDTQgMCBvYmoNPDwvTGVuZ3RoIDU+PnN0cmVhbQ0KICANCmVuZHN0cmVhbQ1lbmRvYmoNCnhyZWYNCjAgNQ0KMDAwMDAwMDAwMCA2NTUzNSBmDQowMDAwMDAwMDE2IDAwMDAwIG4NCjDAwMDAwMDA2OCAwMDAwMCBuDQowMDAwMDAwMTI1IDAwMDAwIG4NCjDAwMDAwMDAyMzEgMDAwMDAgbg0KdHJhaWxlcg0KPDwvU2l6ZSA1IC9Sb290IDEgMCBSPj4NCnN0YXJ0eHJlZg0KMjg4DQolJUVPRg==';
    }
    if (file.type === 'image') {
      return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%232563eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-size="20">Project Image Asset</text></svg>';
    }
    return `data:text/plain;charset=utf-8,${encodeURIComponent(`WorkOrbit Project File: ${file.name}\nProject: ${file.project}\nUploaded by: ${file.uploadedBy}`)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
          <span className="text-xs font-bold uppercase px-3 py-1 rounded-md bg-slate-200 text-slate-900">
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
              href={getDownloadHref()}
              download={file.name}
              className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>📥 Download File</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
