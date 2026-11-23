import { NextResponse } from 'next/server';
import { getAttachmentCategory, formatFileSize } from '@/lib/firebaseChatService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const conversationId = (formData.get('conversationId') as string) || 'general';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds maximum allowable limit of 25MB' },
        { status: 400 }
      );
    }

    const fileId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fileCategory = getAttachmentCategory(file.type, file.name);

    // Convert file to base64 buffer URL for immediate universal preview
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || 'application/octet-stream';
    const base64Url = `data:${mimeType};base64,${buffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      attachment: {
        id: fileId,
        fileName: file.name,
        fileUrl: base64Url,
        fileType: fileCategory,
        fileSize: formatFileSize(file.size),
        bytes: file.size,
      },
    });
  } catch (error: any) {
    console.error('Chat Upload API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
