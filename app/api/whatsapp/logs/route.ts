import { NextResponse } from 'next/server';
import { getMessageLogs, clearMessageLogs } from '@/lib/whatsappService';

export async function GET() {
  try {
    const logs = getMessageLogs();
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    clearMessageLogs();
    return NextResponse.json({ success: true, message: 'Message delivery history cleared.' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to clear logs' },
      { status: 500 }
    );
  }
}
