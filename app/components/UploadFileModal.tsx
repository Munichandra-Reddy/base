'use client';

import React, { useState, useRef } from 'react';
import { FileItem } from '@/lib/types';
import { saveFileToDB } from '@/lib/fileUtils';

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
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileObj(file);
      setFileName(file.name);

      if (typeof window !== 'undefined') {
        (window as any).__WORKORBIT_FILE_STORE__ = (window as any).__WORKORBIT_FILE_STORE__ || {};
        (window as any).__WORKORBIT_FILE_STORE__[file.name] = file;
        (window as any).__WORKORBIT_FILE_STORE__[file.name.toLowerCase()] = file;
        saveFileToDB(file.name, file);
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setFileDataUrl(dataUrl);

        if (typeof window !== 'undefined') {
          (window as any).__WORKORBIT_FILE_STORE__[file.name + '_dataurl'] = dataUrl;
          (window as any).__WORKORBIT_FILE_STORE__[file.name.toLowerCase() + '_dataurl'] = dataUrl;

          try {
            const saved = JSON.parse(localStorage.getItem('workorbit_file_urls') || '{}');
            saved[file.name] = dataUrl;
            saved[file.name.toLowerCase()] = dataUrl;
            localStorage.setItem('workorbit_file_urls', JSON.stringify(saved));
          } catch (err) {}
        }
      };
      reader.readAsDataURL(file);
      
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

    const trimmedName = fileName.trim();

    if (selectedFileObj && typeof window !== 'undefined') {
      (window as any).__WORKORBIT_FILE_STORE__ = (window as any).__WORKORBIT_FILE_STORE__ || {};
      (window as any).__WORKORBIT_FILE_STORE__[trimmedName] = selectedFileObj;
      (window as any).__WORKORBIT_FILE_STORE__[trimmedName.toLowerCase()] = selectedFileObj;
      saveFileToDB(trimmedName, selectedFileObj);
    }

    const uploadTimestamp = Date.now();
    const newFileItem: FileItem = {
      id: `f-${uploadTimestamp}`,
      name: trimmedName,
      size: fileSize.trim() || '1.2 MB',
      uploadedBy: 'Rahul Kumar',
      uploadedAt: 'Just now',
      createdAt: uploadTimestamp,
      type: fileType,
      project: project,
      fileUrl: fileDataUrl || (selectedFileObj ? URL.createObjectURL(selectedFileObj) : undefined),
    };

    onUpload(newFileItem);
    
    // Reset form & close
    setFileName('');
    setFileSize('');
    setSelectedFileObj(null);
    setFileDataUrl(null);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4 overflow-y-auto font-sans"
    >
      <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-semibold text-[#111827]">Upload Project File</h3>
            <p className="text-xs text-[#595959] font-normal">Add assets, specifications, or docs to project</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md bg-[#F4F6F8] hover:bg-[#E5E5E5] text-[#595959] hover:text-[#111827] font-medium flex items-center justify-center text-xs transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* File Picker Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-[#CBD5E1] hover:border-[#049FD9] bg-[#F4F6F8] hover:bg-[#EBF0F5] p-5 rounded-lg text-center cursor-pointer transition-colors space-y-2"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-10 h-10 rounded-lg bg-[#049FD9] text-white font-bold flex items-center justify-center mx-auto text-base">
              📁
            </div>
            {selectedFileObj ? (
              <div>
                <p className="text-sm font-semibold text-[#111827]">{selectedFileObj.name}</p>
                <p className="text-xs text-[#049FD9] font-medium">{fileSize}</p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-[#111827]">
                  Click to browse or drop your file here
                </p>
                <p className="text-[11px] text-[#595959] font-normal">
                  Supports PDF, Images, Code, Docs up to 50MB
                </p>
              </div>
            )}
          </div>

          {/* Manual Entry Inputs */}
          <div>
            <label className="block text-xs font-semibold text-[#222222] mb-1">
              File Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. design_specification_v3.pdf"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-sm text-[#222222] font-medium focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#222222] mb-1">
                File Type
              </label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs text-[#222222] font-medium focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9]"
              >
                <option value="pdf">PDF</option>
                <option value="image">Image</option>
                <option value="code">Code</option>
                <option value="document">Document</option>
                <option value="zip">ZIP / Archive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#222222] mb-1">
                Project Space
              </label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs text-[#222222] font-medium focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9]"
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
            <label className="block text-xs font-semibold text-[#222222] mb-1">
              File Size
            </label>
            <input
              type="text"
              placeholder="e.g. 2.4 MB"
              value={fileSize}
              onChange={(e) => setFileSize(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#CCCCCC] rounded-md text-xs text-[#222222] font-medium focus:outline-none focus:border-[#049FD9] focus:ring-1 focus:ring-[#049FD9]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Upload File
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
