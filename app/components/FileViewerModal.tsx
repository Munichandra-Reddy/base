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

        {/* Content Viewer Body - Clean, simple content without inner borders, divider lines, card boxes, or background containers */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 font-sans">
          {/* Main File Header & View File Action */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-lg bg-[#049FD9] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {file.type === 'pdf' ? 'PDF' : file.type === 'image' ? 'IMG' : file.type === 'code' ? 'CODE' : 'FILE'}
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-semibold text-[#111827] truncate" title={file.name}>
                  {file.name}
                </h4>
                <p className="text-xs text-[#595959] mt-0.5 truncate">
                  {file.project}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenDocument}
              className="btn-primary shrink-0"
            >
              <span>View File ↗</span>
            </button>
          </div>

          {/* Clean Content Details Grid with proper spacing and alignment */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-6 text-xs">
            <div>
              <span className="text-[11px] font-medium text-[#595959] block mb-1 uppercase tracking-wider">
                File Type
              </span>
              <span className="font-semibold text-[#111827] uppercase">
                {file.type}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-[#595959] block mb-1 uppercase tracking-wider">
                Project Name
              </span>
              <span className="font-semibold text-[#111827] truncate block" title={file.project}>
                {file.project}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-[#595959] block mb-1 uppercase tracking-wider">
                File Size
              </span>
              <span className="font-semibold text-[#111827]">
                {file.size}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-[#595959] block mb-1 uppercase tracking-wider">
                Uploaded By
              </span>
              <span className="font-semibold text-[#111827]">
                {file.uploadedBy}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-[#595959] block mb-1 uppercase tracking-wider">
                Upload Date
              </span>
              <span className="font-semibold text-[#111827]">
                {file.uploadedAt}
              </span>
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
