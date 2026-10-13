import { NextResponse } from 'next/server';
import {
  sendWhatsAppNotification,
  validateAndFormatPhone,
} from '@/lib/whatsappService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventType, recipientPhone, data, referenceId, forceSend } = body;

    if (!eventType) {
      return NextResponse.json(
        { success: false, error: 'eventType is required (e.g., task_assignment, upcoming_deadline, overdue_task, project_update, test_message)' },
        { status: 400 }
      );
    }

    // Optional phone number validation if provided directly
    if (recipientPhone) {
      const phoneVal = validateAndFormatPhone(recipientPhone);
      if (!phoneVal.valid) {
        return NextResponse.json(
          { success: false, error: phoneVal.error },
          { status: 400 }
        );
      }
    }

    const result = await sendWhatsAppNotification({
      eventType,
      recipientPhone,
      data: data || {},
      referenceId,
      forceSend: Boolean(forceSend),
    });

    if (!result.success && result.error) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: result.message,
          isDemo: result.isDemo,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      isDemo: result.isDemo,
      message: result.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to dispatch notification' },
      { status: 500 }
    );
  }
}
