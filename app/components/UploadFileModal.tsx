'use client';

import React, { useState, useRef } from 'react';
import { FileItem } from '@/lib/types';

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: FileItem) => void;
}

export const UploadFileModal: React.FC<UploadFileModalProps> = ({
  isOpen,
  onClose,
  onUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [fileType, setFileType] = useState<'pdf' | 'image' | 'code' | 'document' | 'zip'>('pdf');
  const [project, setProject] = useState('E-Commerce Website');
  const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileObj(file);
      setFileName(file.name);
      
      // Calculate file size
      let sizeStr = '';
      if (file.size >= 1024 * 1024) {
        sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      } else {
        sizeStr = `${Math.round(file.size / 1024)} KB`;
      }
      setFileSize(sizeStr);

      // Detect type
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
        setFileType('image');
      } else if (['pdf'].includes(ext)) {
        setFileType('pdf');
      } else if (['js', 'ts', 'jsx', 'tsx', 'json', 'py', 'css', 'html'].includes(ext)) {
        setFileType('code');
      } else if (['zip', 'rar', 'tar', 'gz'].includes(ext)) {
        setFileType('zip');
      } else {
        setFileType('document');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;

    const newFileItem: FileItem = {
      id: `f-${Date.now()}`,
      name: fileName.trim(),
      size: fileSize.trim() || '1.2 MB',
      uploadedBy: 'Rahul Kumar',
      uploadedAt: 'Just now',
      type: fileType,
      project: project,
    };

    onUpload(newFileItem);
    
    // Reset form & close
    setFileName('');
    setFileSize('');
    setSelectedFileObj(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-slate-900">Upload Project File</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 font-bold flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* File Picker Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 p-6 rounded-2xl text-center cursor-pointer transition-all space-y-2"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 font-extrabold flex items-center justify-center mx-auto text-xl">
              📁
            </div>
            {selectedFileObj ? (
              <div>
                <p className="text-sm font-bold text-slate-900">{selectedFileObj.name}</p>
                <p className="text-xs text-blue-600 font-semibold">{fileSize}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Click to browse or drop your file here
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  Supports PDF, Images, Code, Docs up to 50MB
                </p>
              </div>
            )}
          </div>

          {/* Manual Entry Inputs */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              File Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. design_specification_v3.pdf"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                File Type
              </label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value as any)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pdf">PDF</option>
                <option value="image">Image</option>
                <option value="code">Code</option>
                <option value="document">Document</option>
                <option value="zip">ZIP / Archive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Project Space
              </label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="E-Commerce Website">E-Commerce Website</option>
                <option value="Mobile App v2">Mobile App v2</option>
                <option value="Marketing Campaign">Marketing Campaign</option>
                <option value="Customer Portal">Customer Portal</option>
                <option value="Internal Ops">Internal Ops</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              File Size
            </label>
            <input
              type="text"
              placeholder="e.g. 2.4 MB"
              value={fileSize}
              onChange={(e) => setFileSize(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-xl shadow-xs transition-colors"
            >
              Upload File to Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
