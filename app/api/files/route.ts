import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { FileItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const userEmail = searchParams.get('userEmail')?.toLowerCase().trim();
    const userRole = searchParams.get('role')?.toLowerCase().trim();

    const snap = await getDocs(collection(db, 'files'));
    let fileList: FileItem[] = [];

    snap.docs.forEach((d) => {
      const data = d.data();
      fileList.push({
        id: d.id,
        fileId: data.fileId || d.id,
        name: data.name || data.originalFileName || 'Untitled',
        originalFileName: data.originalFileName || data.name || 'Untitled',
        size: data.size || '0 KB',
        bytes: typeof data.bytes === 'number' ? data.bytes : 0,
        uploadedBy: data.uploadedBy || 'Anonymous',
        uploadedByEmail: data.uploadedByEmail || '',
        uploadedByUid: data.uploadedByUid || '',
        uploadedAt: data.uploadedAt || data.createdAt || 'Just now',
        type: data.type || 'document',
        contentType: data.contentType || 'application/octet-stream',
        project: data.project || '',
        projectId: data.projectId || '',
        downloadUrl: data.downloadUrl || data.url || '',
        storagePath: data.storagePath || '',
        description: data.description || '',
        accessScope: data.accessScope || 'project',
        createdAt: data.createdAt || '',
        updatedAt: data.updatedAt || '',
      });
    });

    if (projectId) {
      fileList = fileList.filter((f) => f.projectId === projectId || f.project === projectId);
    }

    return NextResponse.json({ success: true, files: fileList });
  } catch (error: any) {
    console.error('Error fetching files:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch files' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId') || searchParams.get('id');
    const userRole = searchParams.get('role')?.toLowerCase().trim();
    const userUid = searchParams.get('uid');

    if (!fileId) {
      return NextResponse.json({ success: false, error: 'File ID is required' }, { status: 400 });
    }

    const fileDocRef = doc(db, 'files', fileId);
    const fileDoc = await getDoc(fileDocRef);
    if (!fileDoc.exists()) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    const fileData = fileDoc.data();
    const isOwner = userUid && fileData.uploadedByUid === userUid;
    const isAdmin = userRole === 'admin';

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ success: false, error: 'Unauthorized to delete this file' }, { status: 403 });
    }

    await deleteDoc(fileDocRef);
    return NextResponse.json({ success: true, message: 'File deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete file' }, { status: 500 });
  }
}
