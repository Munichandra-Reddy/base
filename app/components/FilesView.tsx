'use client';

import React, { useState } from 'react';
import { FileItem } from '@/lib/types';
import { FileIcon, PlusIcon } from './Icons';
import { UploadFileModal } from './UploadFileModal';
import { FileViewerModal } from './FileViewerModal';

interface FilesViewProps {
  files: FileItem[];
  onUploadFile: (file: FileItem) => void;
}

export const FilesView: React.FC<FilesViewProps> = ({ files, onUploadFile }) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewingFile, setViewingFile] = useState<FileItem | null>(null);

  return (
    <div className="space-y-7 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-7 rounded-2xl border border-[#E5E5E5] shadow-micro">
        <div>
          <h1 className="text-3xl font-light text-[#222222]">Project Docs & Files</h1>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="px-5 py-3 bg-[#6CC04A] hover:bg-[#5bb33b] active:bg-[#4ea230] text-white font-semibold text-base rounded-lg shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Upload File</span>
        </button>
      </div>

      {/* Files Grid - Clicking any file card opens FileViewerModal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {files.map((file) => (
          <div
            key={file.id}
            onClick={() => setViewingFile(file)}
            className="group bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-micro hover:shadow-md hover:border-[#CBD5E1] transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EBF0F5] text-[#0F172A] group-hover:bg-[#0B192C] group-hover:text-white transition-colors flex items-center justify-center font-bold">
                <FileIcon className="w-6 h-6" />
              </div>
            </div>

            <div className="mb-3">
              <h4 className="text-base font-bold text-[#0F172A] group-hover:text-[#0B192C] transition-colors truncate mb-1" title={file.name}>
                {file.name}
              </h4>
              <p className="text-xs font-semibold text-[#64748B]">{file.project}</p>
            </div>

            <div className="flex items-center justify-between pt-3.5 border-t border-[#E2E8F0] text-xs font-bold text-[#64748B]">
              <span>{file.size}</span>
              <span className="text-[#0F172A] font-bold group-hover:underline">{file.uploadedAt}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Manual Upload File Modal */}
      <UploadFileModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={(newFile) => onUploadFile(newFile)}
      />

      {/* File Viewer Modal on Click */}
      <FileViewerModal
        file={viewingFile}
        onClose={() => setViewingFile(null)}
      />
    </div>
  );
};
