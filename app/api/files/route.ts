import { NextResponse } from 'next/server';
import { initialFiles } from '@/lib/data';
import { FileItem } from '@/lib/types';

let files: FileItem[] = [...initialFiles];

export async function GET() {
  return NextResponse.json({ files });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newFile: FileItem = {
      id: `f-${Date.now()}`,
      name: body.name || 'document.pdf',
      size: body.size || '1.5 MB',
      uploadedBy: 'Rahul Kumar',
      uploadedAt: 'Just now',
      type: body.type || 'pdf',
      project: body.project || 'E-Commerce Website',
    };
    files.unshift(newFile);
    return NextResponse.json({ success: true, file: newFile, files });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to upload file' }, { status: 400 });
  }
}
