import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from './firebase';
import { ProjectFile, FileTypeCategory } from './types';
import { saveFileToDB, getDirectFileBlob } from './fileUtils';
import { notifyFileUploaded } from './firebaseNotificationService';

// Supported file extension mappings
export const SUPPORTED_FILE_EXTENSIONS: Record<string, FileTypeCategory> = {
  // PDF
  pdf: 'pdf',

  // Images
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  bmp: 'image',
  ico: 'image',

  // Word Documents
  doc: 'document',
  docx: 'document',
  rtf: 'document',
  odt: 'document',

  // Excel / Spreadsheets
  xls: 'sheet',
  xlsx: 'sheet',
  csv: 'sheet',
  tsv: 'sheet',
  ods: 'sheet',

  // PowerPoint / Presentations
  ppt: 'presentation',
  pptx: 'presentation',
  odp: 'presentation',

  // Archives
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  tar: 'archive',
  gz: 'archive',

  // Text & Code
  txt: 'code',
  md: 'code',
  json: 'code',
  js: 'code',
  jsx: 'code',
  ts: 'code',
  tsx: 'code',
  py: 'code',
  html: 'code',
  css: 'code',
  sql: 'code',
};

// Detect File Type Category from file name & mime
export const detectFileTypeCategory = (fileName: string, mimeType?: string): FileTypeCategory => {
  const lowerName = (fileName || '').toLowerCase();
  const ext = lowerName.split('.').pop() || '';
  if (SUPPORTED_FILE_EXTENSIONS[ext]) {
    return SUPPORTED_FILE_EXTENSIONS[ext];
  }

  const lowerMime = (mimeType || '').toLowerCase();
  if (lowerMime.includes('pdf')) return 'pdf';
  if (lowerMime.startsWith('image/')) return 'image';
  if (lowerMime.includes('word') || lowerMime.includes('document')) return 'document';
  if (lowerMime.includes('excel') || lowerMime.includes('spreadsheet') || lowerMime.includes('csv')) return 'sheet';
  if (lowerMime.includes('powerpoint') || lowerMime.includes('presentation')) return 'presentation';
  if (lowerMime.includes('zip') || lowerMime.includes('compressed') || lowerMime.includes('archive')) return 'archive';
  if (lowerMime.startsWith('text/')) return 'code';

  return 'file';
};

// Format bytes into clean human-readable size
export const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${val} ${sizes[i]}`;
};

// Configurable maximum file size (Default: 50MB)
export const DEFAULT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

// ============================================================================
// 1. REAL-TIME SUBSCRIPTION TO FILES
// ============================================================================
export const subscribeToProjectFiles = (
  callback: (files: ProjectFile[]) => void,
  projectId?: string | null
) => {
  if (typeof window === 'undefined') return () => {};

  try {
    const filesCol = collection(db, 'files');
    const q = query(filesCol, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const fileList: ProjectFile[] = [];

        snapshot.forEach((d) => {
          const data = d.data() as ProjectFile;
          // Ignore soft-deleted files
          if (data.status === 'deleted') return;

          // If projectId filter specified, check matching project
          if (
            projectId &&
            data.projectId !== projectId &&
            data.project?.toLowerCase() !== projectId.toLowerCase()
          ) {
            return;
          }

          fileList.push({
            ...data,
            id: d.id,
            fileId: d.id,
          });
        });

        callback(fileList);
      },
      (error) => {
        if (error?.code !== 'unavailable') {
          console.warn('Files snapshot notice:', error?.message || error);
        }
      }
    );
  } catch (e) {
    console.error('Error subscribing to files:', e);
    return () => {};
  }
};

// ============================================================================
// 2. UPLOAD PROJECT FILE (Firebase Storage + Firestore Metadata + Activity)
// ============================================================================
export interface UploadProjectFileParams {
  file: File;
  projectId: string;
  projectName: string;
  uploaderName: string;
  uploaderEmail: string;
  uploaderUid?: string;
  description?: string;
  onProgress?: (percent: number) => void;
  maxSizeBytes?: number;
}

export const uploadProjectFile = async (
  params: UploadProjectFileParams
): Promise<ProjectFile> => {
  const {
    file,
    projectId,
    projectName,
    uploaderName,
    uploaderEmail,
    uploaderUid = uploaderEmail,
    description = '',
    onProgress,
    maxSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
  } = params;

  if (!file) throw new Error('No file provided for upload.');
  if (!projectId || !projectName) throw new Error('Project association is required.');

  // Validate File Size
  if (file.size > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    throw new Error(`File "${file.name}" exceeds the maximum allowed size of ${maxMb} MB.`);
  }

  const fileId = `f_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `projects/${projectId}/files/${fileId}/${cleanFileName}`;
  const fileCategory = detectFileTypeCategory(file.name, file.type);
  const sizeFormatted = formatBytes(file.size);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  let downloadUrl: string | undefined = undefined;

  // Attempt Firebase Storage Upload with resumable task and progress
  if (storage) {
    try {
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type || 'application/octet-stream',
        customMetadata: {
          originalName: file.name,
          projectId,
          projectName,
          uploaderEmail,
        },
      });

      downloadUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snap) => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            if (onProgress) onProgress(pct);
          },
          (err) => {
            console.warn('Firebase Storage upload notice, using resilient fallback:', err);
            // Fallback to local data URL on network restrictions
            fallbackDataUrl(file).then(resolve).catch(reject);
          },
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              if (onProgress) onProgress(100);
              resolve(url);
            } catch (e) {
              fallbackDataUrl(file).then(resolve).catch(reject);
            }
          }
        );
      });
    } catch (err) {
      console.warn('Direct storage error, falling back to local file store:', err);
    }
  }

  // Resilient fallback if direct storage is unreachable in sandbox
  if (!downloadUrl) {
    downloadUrl = await fallbackDataUrl(file);
    if (onProgress) onProgress(100);
  }

  // Cache in IndexedDB for instant offline preview & resilience
  try {
    await saveFileToDB(cleanFileName, file);
    await saveFileToDB(file.name, file);
    if (typeof window !== 'undefined') {
      (window as any).__WORKORBIT_FILE_STORE__ = (window as any).__WORKORBIT_FILE_STORE__ || {};
      (window as any).__WORKORBIT_FILE_STORE__[file.name] = file;
      (window as any).__WORKORBIT_FILE_STORE__[cleanFileName] = file;
    }
  } catch {}

  // Construct complete file metadata
  const newFileRecord: ProjectFile = {
    id: fileId,
    fileId: fileId,
    name: file.name,
    originalFileName: file.name,
    storagePath,
    fileUrl: downloadUrl,
    contentType: file.type || 'application/octet-stream',
    size: sizeFormatted,
    bytes: file.size,
    projectId,
    project: projectName,
    uploadedBy: uploaderName,
    uploadedByEmail: uploaderEmail.toLowerCase().trim(),
    uploadedByUid: uploaderUid,
    uploadedAt: 'Just now',
    createdAt: now,
    updatedAt: now,
    description: description.trim(),
    accessScope: 'project',
    status: 'active',
    type: fileCategory,
  };

  // Save to Firestore 'files' collection
  const fileDocRef = doc(db, 'files', fileId);
  await setDoc(fileDocRef, newFileRecord);

  // Record audit activity event
  try {
    const actRef = doc(collection(db, 'activities'));
    await setDoc(actRef, {
      id: actRef.id,
      userName: uploaderName,
      userAvatar: uploaderName[0]?.toUpperCase() || 'U',
      avatarBg: 'bg-[#049FD9] text-white',
      action: 'uploaded',
      target: `${file.name} to ${projectName}`,
      timeAgo: 'Just now',
      timestamp: nowIso,
      createdAt: now,
      projectId,
      fileId,
      type: 'file_uploaded',
    });
  } catch (actErr) {
    console.warn('Activity logging notice:', actErr);
  }

  // Phase 9: Trigger Project File Notification
  try {
    const projSnap = await getDoc(doc(db, 'projects', projectId));
    if (projSnap.exists()) {
      const projData = projSnap.data();
      const members: string[] = Array.isArray(projData.members) ? projData.members : [];
      notifyFileUploaded({
        fileId,
        fileName: file.name,
        projectId,
        projectName,
        uploaderEmail,
        uploaderName,
        projectMembers: members,
      }).catch(() => {});
    }
  } catch (notifErr) {
    console.warn('File notification notice:', notifErr);
  }

  return newFileRecord;
};

// Fallback helper to convert file to data URL
const fallbackDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// ============================================================================
// 3. DELETE PROJECT FILE (Permission verified + Storage cleanup)
// ============================================================================
export interface DeleteProjectFileParams {
  fileId: string;
  userEmail: string;
  userName: string;
  isAdmin: boolean;
}

export const deleteProjectFile = async (params: DeleteProjectFileParams): Promise<void> => {
  const { fileId, userEmail, userName, isAdmin } = params;
  if (!fileId) throw new Error('File ID is required.');

  const fileDocRef = doc(db, 'files', fileId);
  const snap = await getDoc(fileDocRef);
  if (!snap.exists()) throw new Error('File not found.');

  const fileData = snap.data() as ProjectFile;
  const cleanUserEmail = (userEmail || '').toLowerCase().trim();
  const fileUploaderEmail = (fileData.uploadedByEmail || '').toLowerCase().trim();

  // Permission check: Admin can delete any file; Employees can only delete their own files
  if (!isAdmin && fileUploaderEmail && fileUploaderEmail !== cleanUserEmail) {
    throw new Error('Permission denied. You can only delete files that you uploaded.');
  }

  // 1. Delete actual object from Firebase Storage if storagePath exists
  if (storage && fileData.storagePath) {
    try {
      const storageRef = ref(storage, fileData.storagePath);
      await deleteObject(storageRef);
    } catch (storageErr: any) {
      // If object already removed or missing, proceed with metadata cleanup
      console.warn('Storage deletion notice:', storageErr?.message || storageErr);
    }
  }

  // 2. Soft-delete or remove record in Firestore
  const now = Date.now();
  await updateDoc(fileDocRef, {
    status: 'deleted',
    deletedAt: now,
    deletedByUid: cleanUserEmail,
    deletedByName: userName,
  });

  // 3. Record audit activity event
  try {
    const actRef = doc(collection(db, 'activities'));
    await setDoc(actRef, {
      id: actRef.id,
      userName,
      userAvatar: userName[0]?.toUpperCase() || 'U',
      avatarBg: isAdmin ? 'bg-[#011826] text-white' : 'bg-red-100 text-red-800',
      action: 'deleted file',
      target: `${fileData.name} from ${fileData.project || 'Project'}`,
      timeAgo: 'Just now',
      timestamp: new Date().toISOString(),
      createdAt: now,
      projectId: fileData.projectId,
      fileId,
      type: 'file_deleted',
    });
  } catch (actErr) {}
};

// ============================================================================
// 4. UPDATE FILE METADATA (Description & Display Name)
// ============================================================================
export const updateProjectFileMetadata = async (
  fileId: string,
  updates: { description?: string; name?: string }
): Promise<void> => {
  if (!fileId) return;
  const fileDocRef = doc(db, 'files', fileId);
  const patch: Partial<ProjectFile> = {
    updatedAt: Date.now(),
  };

  if (updates.description !== undefined) {
    patch.description = updates.description.trim();
  }
  if (updates.name && updates.name.trim()) {
    patch.name = updates.name.trim();
  }

  await updateDoc(fileDocRef, patch);
};

// ============================================================================
// 5. SECURE FILE DOWNLOAD TRIGGER
// ============================================================================
export const downloadProjectFile = async (
  file: ProjectFile,
  userName?: string
): Promise<void> => {
  if (!file) return;

  const fileName = file.originalFileName || file.name || 'downloaded-file';

  try {
    // If URL is direct download URL or data URL
    let blob: Blob | null = null;
    if (file.fileUrl) {
      if (file.fileUrl.startsWith('data:')) {
        const res = await fetch(file.fileUrl);
        blob = await res.blob();
      } else {
        // Direct storage or web URL
        const link = document.createElement('a');
        link.href = file.fileUrl;
        link.download = fileName;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
    }

    if (!blob) {
      blob = await getDirectFileBlob(file.name, file.fileUrl, file.project);
    }

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

    // Record audit event for file download
    if (userName && file.projectId) {
      try {
        const actRef = doc(collection(db, 'activities'));
        await setDoc(actRef, {
          id: actRef.id,
          userName,
          userAvatar: userName[0]?.toUpperCase() || 'U',
          avatarBg: 'bg-[#049FD9] text-white',
          action: 'downloaded file',
          target: `${fileName} from ${file.project || 'Project'}`,
          timeAgo: 'Just now',
          timestamp: new Date().toISOString(),
          createdAt: Date.now(),
          projectId: file.projectId,
          fileId: file.id,
          type: 'file_downloaded',
        });
      } catch (e) {}
    }
  } catch (err) {
    console.warn('Direct download error, opening document preview:', err);
    if (file.fileUrl) {
      window.open(file.fileUrl, '_blank');
    }
  }
};
