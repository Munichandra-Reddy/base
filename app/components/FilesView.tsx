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
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-7 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Project Docs & Files</h1>
          <p className="text-slate-500 text-base font-medium mt-1">Centralized document repository and asset storage.</p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="px-5 py-3 bg-slate-900 hover:bg-black text-white font-bold text-base rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
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
            className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-400 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-colors flex items-center justify-center font-bold">
                <FileIcon className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 tracking-wider">
                {file.type}
              </span>
            </div>

            <div className="mb-3">
              <h4 className="text-base font-bold text-slate-900 group-hover:text-slate-900 transition-colors truncate mb-1" title={file.name}>
                {file.name}
              </h4>
              <p className="text-xs font-semibold text-slate-400">{file.project}</p>
            </div>

            <div className="flex items-center justify-between pt-3.5 border-t border-slate-100 text-xs font-bold text-slate-500">
              <span>{file.size}</span>
              <span className="text-slate-900 font-bold group-hover:underline">{file.uploadedAt}</span>
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
