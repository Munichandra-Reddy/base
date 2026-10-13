import { NextResponse } from 'next/server';
import {
  getPublicConfig,
  updatePreferences,
  setDemoOverride,
  validateAndFormatPhone,
} from '@/lib/whatsappService';

export async function GET() {
  try {
    const config = getPublicConfig();
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to retrieve WhatsApp configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // If updating phone number, validate E.164 format
    if (body.recipientPhone) {
      const validation = validateAndFormatPhone(body.recipientPhone);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }
      body.recipientPhone = validation.formatted;
    }

    const updated = updatePreferences(body);
    const config = getPublicConfig();

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully.',
      preferences: updated,
      config,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update preferences' },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.isDemoMode === 'boolean') {
      setDemoOverride(body.isDemoMode);
    }
    const config = getPublicConfig();
    return NextResponse.json({
      success: true,
      message: body.isDemoMode ? 'Switched to Demo Mode' : 'Switched to Live Mode',
      config,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update connection mode' },
      { status: 400 }
    );
  }
}
