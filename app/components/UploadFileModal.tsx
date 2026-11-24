'use client';

import React, { useState, useRef, useMemo } from 'react';
import { ProjectFile } from '@/lib/types';
import {
  uploadProjectFile,
  detectFileTypeCategory,
  formatBytes,
  DEFAULT_MAX_FILE_SIZE_BYTES,
} from '@/lib/firebaseFilesService';

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload?: (file: ProjectFile) => void;
  onUploadSuccess?: (file: ProjectFile) => void;
  projects?: { id?: string; name: string; members?: string[]; manager?: string }[];
  defaultProjectId?: string;
  preselectedProjectId?: string;
  currentUser?: { email: string; fullName: string; role?: string; uid?: string } | null;
  isAdmin?: boolean;
}

interface StagedFile {
  id: string;
  file: File;
  name: string;
  sizeFormatted: string;
  category: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  errorMessage?: string;
}

export const UploadFileModal: React.FC<UploadFileModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  onUploadSuccess,
  projects = [],
  defaultProjectId,
  preselectedProjectId,
  currentUser,
  isAdmin = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const effectiveDefaultProject = preselectedProjectId || defaultProjectId;

  // Accessible projects for the current user
  const accessibleProjects = useMemo(() => {
    if (isAdmin || !currentUser) return projects;
    const nameLower = (currentUser.fullName || '').toLowerCase().trim();
    const emailLower = (currentUser.email || '').toLowerCase().trim();

    return projects.filter((p) => {
      const members = (p.members || []).map((m) => m.toLowerCase());
      const manager = (p.manager || '').toLowerCase();
      return (
        members.some((m) => m.includes(nameLower) || (emailLower && m.includes(emailLower))) ||
        manager.includes(nameLower)
      );
    });
  }, [projects, isAdmin, currentUser]);

  // Selected project state
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    if (effectiveDefaultProject) return effectiveDefaultProject;
    if (accessibleProjects.length > 0) return accessibleProjects[0].id || accessibleProjects[0].name;
    return '';
  });

  const [description, setDescription] = useState('');
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [overallError, setOverallError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentProjectObj =
    accessibleProjects.find(
      (p) => p.id === selectedProjectId || p.name.toLowerCase() === selectedProjectId.toLowerCase()
    ) || accessibleProjects[0];

  const handleStageFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setOverallError(null);

    const newStaged: StagedFile[] = [];
    const maxBytes = DEFAULT_MAX_FILE_SIZE_BYTES;

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];

      // Validate size limit (50MB)
      if (f.size > maxBytes) {
        setOverallError(`"${f.name}" exceeds the maximum 50 MB limit.`);
        continue;
      }

      const cat = detectFileTypeCategory(f.name, f.type);
      newStaged.push({
        id: `staged_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`,
        file: f,
        name: f.name,
        sizeFormatted: formatBytes(f.size),
        category: cat,
        status: 'pending',
        progress: 0,
      });
    }

    setStagedFiles((prev) => [...prev, ...newStaged]);
  };

  const handleRemoveStaged = (id: string) => {
    setStagedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleStartUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stagedFiles.length === 0) {
      setOverallError('Please select at least one file to upload.');
      return;
    }

    const projId = currentProjectObj?.id || selectedProjectId;
    const projName = currentProjectObj?.name || selectedProjectId;
    const uploaderName = currentUser?.fullName || (isAdmin ? 'Workspace Admin' : 'Employee');
    const uploaderEmail = (currentUser?.email || 'admin@workorbit.com').toLowerCase().trim();

    setIsUploading(true);
    setOverallError(null);

    for (let i = 0; i < stagedFiles.length; i++) {
      const item = stagedFiles[i];
      if (item.status === 'completed') continue;

      setStagedFiles((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, status: 'uploading', progress: 10 } : s))
      );

      try {
        const uploadedFile = await uploadProjectFile({
          file: item.file,
          projectId: projId,
          projectName: projName,
          uploaderName,
          uploaderEmail,
          uploaderUid: uploaderEmail,
          description: description.trim(),
          onProgress: (pct) => {
            setStagedFiles((prev) =>
              prev.map((s) => (s.id === item.id ? { ...s, progress: pct } : s))
            );
          },
        });

        setStagedFiles((prev) =>
          prev.map((s) => (s.id === item.id ? { ...s, status: 'completed', progress: 100 } : s))
        );

        if (onUpload) {
          onUpload(uploadedFile);
        }
        if (onUploadSuccess) {
          onUploadSuccess(uploadedFile);
        }
      } catch (err: any) {
        setStagedFiles((prev) =>
          prev.map((s) =>
            s.id === item.id
              ? { ...s, status: 'error', errorMessage: err.message || 'Upload failed' }
              : s
          )
        );
      }
    }

    setIsUploading(false);

    // If all completed successfully, close modal after short delay
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto font-sans"
    >
      <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between shrink-0 bg-white">
          <div>
            <h3 className="text-base font-bold text-[#111827]">Upload Project Files</h3>
            <p className="text-xs text-[#595959]">
              Store documents, specs, and deliverables in Firebase Storage
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="w-7 h-7 rounded-md bg-[#F4F6F8] hover:bg-[#E5E5E5] text-[#595959] hover:text-[#111827] font-medium flex items-center justify-center text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleStartUpload} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Target Project Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-[#111827] uppercase tracking-wider mb-1">
              Select Destination Project *
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={isUploading}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E5E5E5] rounded-md text-[#111827] font-medium focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9]"
            >
              {accessibleProjects.map((p) => (
                <option key={p.id || p.name} value={p.id || p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleStageFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed p-5 rounded-lg text-center cursor-pointer transition-all space-y-2 ${
              isDragging
                ? 'border-[#049FD9] bg-[#F0F9FF]'
                : 'border-[#CBD5E1] hover:border-[#049FD9] bg-[#F8FAFC] hover:bg-[#F0F9FF]/30'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={(e) => handleStageFiles(e.target.files)}
              className="hidden"
            />
            <div className="w-10 h-10 rounded-lg bg-[#049FD9] text-white font-bold flex items-center justify-center mx-auto text-base shadow-2xs">
              📁
            </div>
            <div>
              <p className="text-xs font-semibold text-[#111827]">
                Click to browse or drag & drop files here
              </p>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                PDFs, Word, Excel, PowerPoint, Images, Code, and ZIP archives (Max 50 MB)
              </p>
            </div>
          </div>

          {/* Error Notice */}
          {overallError && (
            <div className="p-2.5 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] font-medium flex items-center justify-between">
              <span>{overallError}</span>
              <button
                type="button"
                onClick={() => setOverallError(null)}
                className="font-bold hover:underline"
              >
                ✕
              </button>
            </div>
          )}

          {/* Staged Files List */}
          {stagedFiles.length > 0 && (
            <div className="space-y-2 border border-[#E5E5E5] rounded-lg p-3 bg-[#FAFAFA] max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#595959] uppercase">
                <span>Selected Files ({stagedFiles.length})</span>
                {!isUploading && (
                  <button
                    type="button"
                    onClick={() => setStagedFiles([])}
                    className="text-[#EF4444] hover:underline normal-case font-semibold"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {stagedFiles.map((item) => (
                <div
                  key={item.id}
                  className="p-2 bg-white rounded border border-[#E5E5E5] flex flex-col gap-1 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">📄</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#111827] truncate">{item.name}</p>
                        <p className="text-[10px] text-[#64748B]">{item.sizeFormatted}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'completed' && (
                        <span className="text-[10px] text-[#16A34A] font-bold">✓ Uploaded</span>
                      )}
                      {item.status === 'error' && (
                        <span className="text-[10px] text-[#DC2626] font-bold">✕ Failed</span>
                      )}
                      {item.status === 'pending' && !isUploading && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveStaged(item.id);
                          }}
                          className="text-[#94A3B8] hover:text-[#DC2626] font-bold p-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar if uploading */}
                  {item.status === 'uploading' && (
                    <div className="w-full bg-[#E0F2FE] h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-[#0284C7] h-full transition-all duration-150"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Optional File Description */}
          <div>
            <label className="block text-[11px] font-bold text-[#111827] uppercase tracking-wider mb-1">
              Description / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Approved wireframes, Q4 financial report"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUploading}
              className="w-full px-3 py-1.5 text-xs bg-white border border-[#E5E5E5] rounded-md text-[#111827] focus:outline-none focus:border-[#049FD9]"
            />
          </div>

          {/* Actions Bar */}
          <div className="pt-3 border-t border-[#E5E5E5] flex items-center justify-end gap-2 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="btn-secondary text-xs py-1.5 px-3 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || stagedFiles.length === 0}
              className="btn-primary text-xs py-1.5 px-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isUploading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <span>Upload {stagedFiles.length > 0 ? `(${stagedFiles.length})` : ''}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
