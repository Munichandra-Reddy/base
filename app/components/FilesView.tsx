'use client';

import React, { useState, useEffect } from 'react';
import { FileItem } from '@/lib/types';
import { FileIcon, PlusIcon } from './Icons';
import { UploadFileModal } from './UploadFileModal';
import { getDirectFileBlobUrl, getFileRelativeTime } from '@/lib/fileUtils';

interface FilesViewProps {
  files: FileItem[];
  onUploadFile: (file: FileItem) => void;
}

export const FilesView: React.FC<FilesViewProps> = ({ files, onUploadFile }) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Live timer so relative upload times automatically update (e.g. Just now -> 1 min ago)
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 15000); // Check and re-render every 15 seconds
    return () => clearInterval(timer);
  }, []);

  const handleOpenFile = async (file: FileItem) => {
    try {
      const targetBlobUrl = await getDirectFileBlobUrl(file.name, file.fileUrl, file.project);
      window.open(targetBlobUrl, '_blank');
    } catch (e) {
      if (file.fileUrl) {
        window.open(file.fileUrl, '_blank');
      }
    }
  };

  return (
    <div className="space-y-6 font-sans w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E5E5E5] shadow-2xs">
        <div>
          <h1 className="text-xl font-semibold text-[#111827]">Project Docs & Files</h1>
          <p className="text-[#595959] text-xs font-normal mt-0.5">Central repository for project assets, documents, and deliverables.</p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="btn-primary"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Upload File</span>
        </button>
      </div>

      {/* Files Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {files.map((file) => (
          <div
            key={file.id}
            className="group bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs hover:border-[#049FD9] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#F4F6F8] text-[#049FD9] border border-[#E5E5E5] flex items-center justify-center font-bold">
                  <FileIcon className="w-5 h-5" />
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenFile(file)}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  View File
                </button>
              </div>

              <div className="mb-3">
                <h4
                  onClick={() => handleOpenFile(file)}
                  className="text-sm font-semibold text-[#111827] group-hover:text-[#049FD9] transition-colors truncate mb-0.5 cursor-pointer"
                  title={file.name}
                >
                  {file.name}
                </h4>
                <p className="text-xs font-medium text-[#6B7280]">{file.project}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E5E5E5]">
              <div className="flex items-center justify-between text-[11px] font-medium text-[#6B7280]">
                <span>{file.size}</span>
                <span className="text-[#111827] font-semibold">{getFileRelativeTime(file)}</span>
              </div>
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
    </div>
  );
};
