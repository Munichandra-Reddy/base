'use client';

import React from 'react';
import { FileItem } from '@/lib/types';
import { FileIcon, DownloadIcon } from './Icons';
import { getDirectFileBlobUrl, getDirectFileBlob } from '@/lib/fileUtils';

interface FileViewerModalProps {
  file: FileItem | null;
  onClose: () => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ file, onClose }) => {
  if (!file) return null;

  const handleOpenDocument = async () => {
    let fileUrl = file.fileUrl;
    const targetBlobUrl = await getDirectFileBlobUrl(file.name, fileUrl, file.project);
    window.open(targetBlobUrl, '_blank');
  };

  const handleDownloadFile = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (file.fileUrl && file.fileUrl.startsWith('http')) {
        try {
          const res = await fetch(file.fileUrl);
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          return;
        } catch {
          window.open(file.fileUrl, '_blank');
          return;
        }
      }

      const blob = await getDirectFileBlob(file.name, file.fileUrl, file.project);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const getFilePreviewContent = () => {
    switch (file.type) {
      case 'image':
        return (
          <div className="bg-[#011826] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[260px] text-white">
            <div className="w-full max-h-[300px] overflow-hidden rounded-xl bg-[#082236] flex items-center justify-center border border-[#0d314d] p-4">
              <img
                src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop"
                alt={file.name}
                className="max-h-[240px] w-auto object-contain rounded-lg shadow-md"
              />
            </div>
            <div className="flex items-center justify-between w-full mt-3">
              <p className="text-xs text-[#CBD5E1] font-medium">Image Preview • {file.name}</p>
              <button
                type="button"
                onClick={handleOpenDocument}
                className="btn-primary text-xs"
              >
                <span>View File ↗</span>
              </button>
            </div>
          </div>
        );

      case 'code':
        return (
          <div className="bg-[#011826] text-slate-100 rounded-2xl p-5 font-mono text-xs overflow-x-auto min-h-[240px] border border-[#0d314d]">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#0d314d] text-[#64748B] text-[11px]">
              <span>{file.name}</span>
              <button
                type="button"
                onClick={handleOpenDocument}
                className="btn-primary text-xs"
              >
                <span>View File ↗</span>
              </button>
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
          <div className="bg-[#F4F6F8] rounded-lg p-4 border border-[#E5E5E5]">
            <div className="bg-white p-4 rounded-md border border-[#E5E5E5] shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-[#049FD9] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  PDF
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#111827]">{file.name}</h4>
                  <p className="text-xs text-[#595959] font-normal">{file.project} Deliverable</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenDocument}
                className="btn-primary"
              >
                <span>View File ↗</span>
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-[#F1F3F6] rounded-2xl p-8 text-center border border-[#E2E8F0] min-h-[200px] flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#EBF0F5] text-[#0F172A] flex items-center justify-center">
              <FileIcon className="w-8 h-8 text-[#0F172A]" />
            </div>
            <h4 className="text-base font-bold text-[#0F172A]">{file.name}</h4>
            <p className="text-xs text-[#64748B] font-medium">Standard Project Document</p>
            <button
              type="button"
              onClick={handleOpenDocument}
              className="btn-primary mt-2"
            >
              <span>View File ↗</span>
            </button>
          </div>
        );
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4 overflow-y-auto font-sans"
    >
      <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#049FD9] text-white flex items-center justify-center font-bold">
              <FileIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#111827] truncate max-w-xs">{file.name}</h3>
              <span className="text-xs text-[#595959] font-normal">{file.project}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md bg-[#F4F6F8] hover:bg-[#E5E5E5] text-[#595959] hover:text-[#111827] font-medium flex items-center justify-center text-xs transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Viewer Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {getFilePreviewContent()}

          {/* File Metadata Details */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-[#F4F6F8] rounded-md border border-[#E5E5E5] text-xs font-medium text-[#595959]">
            <div>
              <span className="text-[10px] text-[#595959] block font-semibold uppercase">Size</span>
              <span className="text-[#111827] font-semibold">{file.size}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#595959] block font-semibold uppercase">Uploaded By</span>
              <span className="text-[#111827] font-semibold">{file.uploadedBy}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#595959] block font-semibold uppercase">Uploaded Date</span>
              <span className="text-[#111827] font-semibold">{file.uploadedAt}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-[#E5E5E5] flex items-center justify-end gap-2 bg-[#F4F6F8] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleDownloadFile}
            className="btn-primary"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            <span>Download File</span>
          </button>
        </div>
      </div>
    </div>
  );
};
