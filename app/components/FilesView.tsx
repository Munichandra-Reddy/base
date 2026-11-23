'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ProjectFile, FileTypeCategory } from '@/lib/types';
import {
  FileIcon,
  PlusIcon,
  EyeIcon,
  SearchIcon,
  DownloadIcon,
  FilterIcon,
  UsersIcon,
} from './Icons';
import { UploadFileModal } from './UploadFileModal';
import {
  subscribeToProjectFiles,
  deleteProjectFile,
  updateProjectFileMetadata,
  downloadProjectFile,
  formatBytes,
} from '@/lib/firebaseFilesService';
import { getFileRelativeTime } from '@/lib/fileUtils';

interface FilesViewProps {
  files: ProjectFile[];
  onUploadFile?: (file: ProjectFile) => void;
  isAdmin?: boolean;
  currentUser?: { email: string; fullName: string; companyName?: string; role?: string } | null;
  projects?: { id?: string; name: string; members?: string[]; manager?: string; memberDetails?: any[] }[];
}

export const FilesView: React.FC<FilesViewProps> = ({
  files: initialFilesProp = [],
  onUploadFile,
  isAdmin = false,
  currentUser,
  projects = [],
}) => {
  // Real-time files state from Firestore
  const [liveFiles, setLiveFiles] = useState<ProjectFile[]>(initialFilesProp);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [fileScope, setFileScope] = useState<'my' | 'all'>(!isAdmin ? 'my' : 'all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals state
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [detailsFile, setDetailsFile] = useState<ProjectFile | null>(null);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState('');
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // User credentials
  const userEmail = (currentUser?.email || 'admin@workorbit.com').toLowerCase().trim();
  const userName = currentUser?.fullName || (isAdmin ? 'Workspace Admin' : 'Employee');

  // 1. Subscribe to files in real-time from Firestore
  useEffect(() => {
    const unsub = subscribeToProjectFiles((filesList) => {
      if (filesList && filesList.length > 0) {
        setLiveFiles(filesList);
      } else if (initialFilesProp.length > 0) {
        setLiveFiles(initialFilesProp);
      }
    });
    return () => unsub();
  }, [initialFilesProp]);

  // Sync initialFilesProp if liveFiles is empty
  useEffect(() => {
    if (initialFilesProp && initialFilesProp.length > 0 && liveFiles.length === 0) {
      setLiveFiles(initialFilesProp);
    }
  }, [initialFilesProp, liveFiles.length]);

  // Live timer for relative times
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Names of projects the current user belongs to
  const myProjectNames = useMemo(() => {
    if (isAdmin || !currentUser) return [];
    const nameLower = (currentUser.fullName || '').toLowerCase().trim();
    const emailLower = (currentUser.email || '').toLowerCase().trim();

    return projects
      .filter((p) => {
        const mems = (p.members || []).map((m) => m.toLowerCase());
        const mgr = (p.manager || '').toLowerCase();
        return (
          mems.some((m) => m.includes(nameLower) || (emailLower && m.includes(emailLower))) ||
          mgr.includes(nameLower)
        );
      })
      .map((p) => p.name.toLowerCase().trim());
  }, [isAdmin, currentUser, projects]);

  // Filtered & Sorted Files
  const filteredFiles = useMemo(() => {
    return liveFiles
      .filter((f) => {
        // Exclude soft-deleted
        if (f.status === 'deleted') return false;

        // Scope filter for non-admins
        if (!isAdmin && fileScope === 'my' && myProjectNames.length > 0) {
          const pName = (f.project || '').toLowerCase().trim();
          if (!myProjectNames.includes(pName)) return false;
        }

        // Project filter dropdown
        if (selectedProjectFilter !== 'all') {
          const matchProj =
            f.projectId === selectedProjectFilter ||
            f.project.toLowerCase() === selectedProjectFilter.toLowerCase();
          if (!matchProj) return false;
        }

        // Type Category filter
        if (selectedTypeFilter !== 'all') {
          if (f.type !== selectedTypeFilter) return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = f.name.toLowerCase().includes(q);
          const matchProj = f.project.toLowerCase().includes(q);
          const matchUploader = (f.uploadedBy || '').toLowerCase().includes(q);
          const matchDesc = (f.description || '').toLowerCase().includes(q);
          if (!matchName && !matchProj && !matchUploader && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return (b.createdAt || 0) - (a.createdAt || 0);
        if (sortBy === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0);
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'size') return (b.bytes || 0) - (a.bytes || 0);
        return 0;
      });
  }, [
    liveFiles,
    isAdmin,
    fileScope,
    myProjectNames,
    selectedProjectFilter,
    selectedTypeFilter,
    searchQuery,
    sortBy,
  ]);

  // Show toast notification
  const showNotice = (type: 'success' | 'error', message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Handle Delete
  const handleDeleteFile = async (file: ProjectFile) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return;

    try {
      await deleteProjectFile({
        fileId: file.id,
        userEmail,
        userName,
        isAdmin,
      });
      setLiveFiles((prev) => prev.filter((f) => f.id !== file.id));
      if (detailsFile?.id === file.id) setDetailsFile(null);
      if (previewFile?.id === file.id) setPreviewFile(null);
      showNotice('success', `File "${file.name}" deleted successfully.`);
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to delete file.');
    }
  };

  // Handle Save Description
  const handleSaveDescription = async () => {
    if (!detailsFile) return;
    try {
      await updateProjectFileMetadata(detailsFile.id, { description: descInput.trim() });
      setDetailsFile((prev) => (prev ? { ...prev, description: descInput.trim() } : null));
      setLiveFiles((prev) =>
        prev.map((f) => (f.id === detailsFile.id ? { ...f, description: descInput.trim() } : f))
      );
      setIsEditingDesc(false);
      showNotice('success', 'File description updated.');
    } catch (err: any) {
      showNotice('error', 'Failed to update description.');
    }
  };

  // Helper for Category Icons - Uniform Document Icon (Image 2) for all
  const renderCategoryIcon = (_type?: FileTypeCategory) => {
    return <span className="text-xl">📄</span>;
  };

  return (
    <div className="space-y-6 font-sans w-full">
      {/* Toast Notice */}
      {actionNotice && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-[#E5E5E5] shadow-xl animate-in slide-in-from-top-3 duration-200">
          <span className="text-base">{actionNotice.type === 'success' ? '✅' : '⚠️'}</span>
          <span
            className={`text-xs font-semibold ${
              actionNotice.type === 'success' ? 'text-[#166534]' : 'text-[#991B1B]'
            }`}
          >
            {actionNotice.message}
          </span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-lg border border-[#E5E5E5] shadow-2xs">
        <div>
          <h1
            className="text-xl font-semibold text-[#111827] leading-none !m-0 !p-0"
            style={{ margin: 0, padding: 0 }}
          >
            Project Docs & Files
          </h1>
          <p className="text-[#595959] text-xs font-normal mt-1.5">
            Centralized workspace asset repository organized by project with Firebase Storage
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isAdmin && (
            <div className="flex items-center gap-1 bg-[#F4F6F8] p-1 rounded-lg border border-[#E5E5E5] text-xs font-medium overflow-x-auto scrollbar-none whitespace-nowrap">
              <button
                type="button"
                onClick={() => setFileScope('my')}
                className={`px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer whitespace-nowrap ${
                  fileScope === 'my'
                    ? 'bg-white text-[#111827] shadow-2xs font-semibold'
                    : 'text-[#595959] hover:text-[#111827]'
                }`}
              >
                My Project Files
              </button>
              <button
                type="button"
                onClick={() => setFileScope('all')}
                className={`px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer whitespace-nowrap ${
                  fileScope === 'all'
                    ? 'bg-white text-[#111827] shadow-2xs font-semibold'
                    : 'text-[#595959] hover:text-[#111827]'
                }`}
              >
                All Workspace Files
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="btn-primary shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Search, Project Filter, Type Filter, Sort, View Mode */}
      <div className="bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C]" />
            <input
              type="text"
              placeholder="Search by file name, project, or uploader..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F4F6F8] border border-[#E5E5E5] rounded-md pl-9 pr-3 py-2 text-xs text-[#111827] placeholder-[#8C8C8C] focus:outline-none focus:border-[#049FD9] focus:bg-white"
            />
          </div>

          {/* Project & Sort Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Project Filter */}
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-[#F4F6F8] border border-[#E5E5E5] rounded-md text-[#111827] font-medium focus:outline-none focus:border-[#049FD9]"
            >
              <option value="all">All Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id || p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-xs bg-[#F4F6F8] border border-[#E5E5E5] rounded-md text-[#111827] font-medium focus:outline-none focus:border-[#049FD9]"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="name">Sort: Name (A-Z)</option>
              <option value="size">Sort: Size (Largest)</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#F4F6F8] p-1 rounded-md border border-[#E5E5E5]">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 text-xs rounded transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#111827] font-bold shadow-2xs'
                    : 'text-[#595959] hover:text-[#111827]'
                }`}
                title="Grid View"
              >
                Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 text-xs rounded transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-[#111827] font-bold shadow-2xs'
                    : 'text-[#595959] hover:text-[#111827]'
                }`}
                title="Table View"
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
          {[
            { key: 'all', label: 'All Types' },
            { key: 'pdf', label: 'PDF Documents' },
            { key: 'image', label: 'Images' },
            { key: 'document', label: 'Word Docs' },
            { key: 'sheet', label: 'Spreadsheets' },
            { key: 'presentation', label: 'Presentations' },
            { key: 'archive', label: 'ZIP Archives' },
            { key: 'code', label: 'Code & Text' },
          ].map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedTypeFilter(cat.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                selectedTypeFilter === cat.key
                  ? 'bg-[#049FD9] text-white border-[#049FD9]'
                  : 'bg-[#F4F6F8] text-[#595959] border-[#E5E5E5] hover:bg-[#E5E5E5]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Files Content Area */}
      {filteredFiles.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-[#F4F6F8] text-[#049FD9] flex items-center justify-center mx-auto text-2xl">
            📁
          </div>
          <h3 className="font-bold text-base text-[#111827]">No files found</h3>
          <p className="text-xs text-[#595959] max-w-sm mx-auto">
            {searchQuery || selectedProjectFilter !== 'all' || selectedTypeFilter !== 'all'
              ? 'No files matched your active filters. Try adjusting your search query.'
              : 'Upload project specifications, designs, or documents to get started.'}
          </p>
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="btn-primary text-xs py-2 px-4 cursor-pointer inline-flex items-center gap-1.5"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Upload First File</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredFiles.map((file) => {
            const canDelete =
              isAdmin ||
              file.uploadedByEmail?.toLowerCase() === userEmail ||
              file.uploadedByUid === userEmail;

            return (
              <div
                key={file.id}
                className="group bg-white p-4 rounded-lg border border-[#E5E5E5] shadow-2xs hover:border-[#049FD9] transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Icon + Quick Actions */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[#F4F6F8] border border-[#E5E5E5] flex items-center justify-center shadow-2xs shrink-0">
                      {renderCategoryIcon(file.type)}
                    </div>
                    <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => setPreviewFile(file)}
                        className="p-1 rounded hover:bg-[#F4F6F8] text-[#595959] hover:text-[#049FD9] transition-colors cursor-pointer"
                        title="Preview File"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Project Name */}
                  <div className="mb-3">
                    <h4
                      onClick={() => setPreviewFile(file)}
                      className="text-xs sm:text-sm font-bold text-[#111827] group-hover:text-[#049FD9] transition-colors truncate mb-0.5 cursor-pointer"
                      title={file.name}
                    >
                      {file.name}
                    </h4>
                    <p className="text-[11px] font-medium text-[#049FD9] truncate">
                      {file.project}
                    </p>
                    {file.description && (
                      <p className="text-[10px] text-[#6B7280] line-clamp-1 mt-0.5">
                        {file.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#6B7280]">
                  <span>{file.size}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#111827]">
                      {getFileRelativeTime(file)}
                    </span>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteFile(file)}
                        className="text-[#EF4444] hover:underline text-[10px] font-bold cursor-pointer"
                        title="Delete file"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E5E5E5] text-[11px] font-bold text-[#595959] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Uploaded By</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredFiles.map((file) => {
                  const canDelete =
                    isAdmin ||
                    file.uploadedByEmail?.toLowerCase() === userEmail ||
                    file.uploadedByUid === userEmail;

                  return (
                    <tr key={file.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#111827] max-w-xs truncate">
                        <div className="flex items-center gap-2">
                          {renderCategoryIcon(file.type)}
                          <span
                            onClick={() => setPreviewFile(file)}
                            className="cursor-pointer hover:text-[#049FD9] truncate"
                            title={file.name}
                          >
                            {file.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#049FD9] font-medium">{file.project}</td>
                      <td className="py-3 px-4 text-[#64748B]">{file.size}</td>
                      <td className="py-3 px-4 text-[#111827]">{file.uploadedBy}</td>
                      <td className="py-3 px-4 text-[#64748B]">{getFileRelativeTime(file)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewFile(file)}
                            className="p-1 text-[#049FD9] hover:bg-[#F0F9FF] rounded cursor-pointer"
                            title="Preview"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteFile(file)}
                              className="p-1 text-[#EF4444] hover:bg-[#FEF2F2] rounded cursor-pointer text-xs font-bold"
                              title="Delete"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: UPLOAD FILE MODAL (Multi-file Drag & Drop) */}
      {/* ========================================================================= */}
      <UploadFileModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        projects={projects}
        currentUser={currentUser}
        isAdmin={isAdmin}
        onUpload={(newFile) => {
          setLiveFiles((prev) => [newFile, ...prev]);
          if (onUploadFile) onUploadFile(newFile);
          showNotice('success', `File "${newFile.name}" uploaded successfully.`);
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 2: IN-APP FILE PREVIEW MODAL */}
      {/* ========================================================================= */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-white rounded-xl border border-[#E5E5E5] shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview Header */}
            <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded bg-[#F4F6F8] flex items-center justify-center shrink-0">
                  {renderCategoryIcon(previewFile.type)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-[#111827] truncate">
                    {previewFile.name}
                  </h3>
                  <p className="text-[11px] text-[#595959]">
                    {previewFile.project} • {previewFile.size} • Uploaded by {previewFile.uploadedBy}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => downloadProjectFile(previewFile, userName)}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="w-8 h-8 rounded-md bg-[#F4F6F8] hover:bg-[#E5E5E5] text-[#111827] font-bold flex items-center justify-center text-sm transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div className="flex-1 bg-[#F8FAFC] overflow-auto flex items-center justify-center p-4">
              {previewFile.type === 'pdf' ? (
                <iframe
                  src={`${previewFile.fileUrl}#toolbar=1`}
                  className="w-full h-full rounded border border-[#CBD5E1] bg-white shadow-xs"
                  title={previewFile.name}
                />
              ) : previewFile.type === 'image' ? (
                <div className="max-h-full max-w-full flex items-center justify-center">
                  <img
                    src={previewFile.fileUrl}
                    alt={previewFile.name}
                    className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : (
                <div className="text-center space-y-3 p-8 bg-white rounded-xl border border-[#E2E8F0] shadow-sm max-w-md">
                  <div className="w-16 h-16 rounded-full bg-[#F0F9FF] text-[#049FD9] flex items-center justify-center mx-auto text-3xl">
                    {renderCategoryIcon(previewFile.type)}
                  </div>
                  <h4 className="font-bold text-sm text-[#111827]">{previewFile.name}</h4>
                  <p className="text-xs text-[#64748B]">
                    In-browser interactive preview is not available for this format. You can download the file directly to open it on your device.
                  </p>
                  <button
                    type="button"
                    onClick={() => downloadProjectFile(previewFile, userName)}
                    className="btn-primary text-xs py-2 px-4 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    <span>Download File ({previewFile.size})</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: FILE DETAILS & SHARING DRAWER */}
      {/* ========================================================================= */}
      {detailsFile && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
          onClick={() => setDetailsFile(null)}
        >
          <div
            className="bg-white rounded-xl border border-[#E5E5E5] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl">{renderCategoryIcon(detailsFile.type)}</span>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-[#111827] truncate">
                    {detailsFile.name}
                  </h3>
                  <p className="text-[11px] text-[#595959]">File Metadata & Project Access</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailsFile(null)}
                className="w-7 h-7 rounded hover:bg-[#F4F6F8] text-[#8C8C8C] hover:text-[#111827] font-bold flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Details Content */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Properties Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <div>
                  <span className="text-[10px] text-[#94A3B8] uppercase block font-bold">Project</span>
                  <span className="font-semibold text-[#049FD9]">{detailsFile.project}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#94A3B8] uppercase block font-bold">File Size</span>
                  <span className="font-semibold text-[#111827]">{detailsFile.size}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#94A3B8] uppercase block font-bold">Uploaded By</span>
                  <span className="font-semibold text-[#111827]">{detailsFile.uploadedBy}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#94A3B8] uppercase block font-bold">Uploaded Date</span>
                  <span className="font-semibold text-[#111827]">
                    {detailsFile.createdAt
                      ? new Date(detailsFile.createdAt).toLocaleString()
                      : detailsFile.uploadedAt}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-[#94A3B8] uppercase block font-bold">Storage Path</span>
                  <span className="font-mono text-[11px] text-[#475569] break-all">
                    {detailsFile.storagePath || `projects/${detailsFile.project}/files/${detailsFile.name}`}
                  </span>
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#111827] uppercase">Description</span>
                  {!isEditingDesc ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingDesc(true)}
                      className="text-[#049FD9] hover:underline text-[11px] font-semibold cursor-pointer"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingDesc(false)}
                        className="text-[#595959] hover:underline text-[11px]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDescription}
                        className="text-[#16A34A] hover:underline text-[11px] font-bold"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>

                {isEditingDesc ? (
                  <textarea
                    value={descInput}
                    onChange={(e) => setDescInput(e.target.value)}
                    placeholder="Enter file description or notes..."
                    rows={3}
                    className="w-full p-2 border border-[#CBD5E1] rounded-md text-xs text-[#111827] focus:outline-none focus:border-[#049FD9]"
                  />
                ) : (
                  <p className="text-[#475569] italic bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0]">
                    {detailsFile.description || 'No description provided for this file.'}
                  </p>
                )}
              </div>

              {/* Project Members Access List */}
              <div className="space-y-2 pt-2 border-t border-[#E5E5E5]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#111827] uppercase flex items-center gap-1.5">
                    <UsersIcon className="w-3.5 h-3.5 text-[#049FD9]" />
                    <span>Authorized Project Access</span>
                  </span>
                  <span className="text-[10px] bg-[#ECFDF5] text-[#065F46] px-2 py-0.5 rounded font-bold">
                    Project Members Only
                  </span>
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-2 max-h-36 overflow-y-auto">
                  {(() => {
                    const matchedProj = projects.find(
                      (p) =>
                        p.name.toLowerCase() === detailsFile.project.toLowerCase() ||
                        p.id === detailsFile.projectId
                    );
                    const members = matchedProj?.members || [];

                    if (members.length === 0) {
                      return (
                        <p className="text-[11px] text-[#64748B]">
                          All authorized workspace project contributors have read access.
                        </p>
                      );
                    }

                    return members.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[#111827]">{m}</span>
                        <span className="text-[10px] text-[#64748B]">Project Contributor</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-[#E5E5E5] bg-[#F8FAFC] flex items-center justify-between shrink-0">
              {(isAdmin ||
                detailsFile.uploadedByEmail?.toLowerCase() === userEmail ||
                detailsFile.uploadedByUid === userEmail) && (
                <button
                  type="button"
                  onClick={() => handleDeleteFile(detailsFile)}
                  className="px-3 py-1.5 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] rounded-md font-semibold text-xs border border-[#FECACA] cursor-pointer"
                >
                  Delete File
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewFile(detailsFile);
                    setDetailsFile(null);
                  }}
                  className="btn-secondary text-xs py-1.5 px-3 cursor-pointer"
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => downloadProjectFile(detailsFile, userName)}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
