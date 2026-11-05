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

        {/* Content Viewer Body - Single Box for all details */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          <div className="rounded-lg border border-[#E5E5E5] overflow-hidden bg-white shadow-2xs">
            {/* Top Row: File Details & View File Action */}
            <div className="p-4 sm:p-5 flex items-center justify-between gap-3 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-md bg-[#049FD9] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {file.type === 'pdf' ? 'PDF' : file.type === 'image' ? 'IMG' : file.type === 'code' ? 'CODE' : 'FILE'}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-[#111827] truncate" title={file.name}>{file.name}</h4>
                  <p className="text-xs text-[#595959] font-normal truncate">{file.project} Deliverable</p>
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

            {/* Optional preview snippet for image / code inside the same box */}
            {file.type === 'image' && (
              <div className="p-4 bg-[#082236] flex items-center justify-center border-b border-[#E5E5E5]">
                <img
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop"
                  alt={file.name}
                  className="max-h-[220px] w-auto object-contain rounded-md shadow-md"
                />
              </div>
            )}

            {file.type === 'code' && (
              <div className="p-4 bg-[#011826] text-slate-100 font-mono text-xs overflow-x-auto border-b border-[#E5E5E5]">
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
            )}

            {/* Bottom Row: File Metadata Details inside the same single box */}
            <div className="grid grid-cols-3 gap-3 p-3.5 sm:p-4 bg-[#F4F6F8] text-xs font-medium text-[#595959]">
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
