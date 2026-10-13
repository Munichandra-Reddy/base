import { NextResponse } from 'next/server';
import {
  getPublicConfig,
  updatePreferences,
  setDemoOverride,
  updateCredentials,
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
    if (body.token || body.phoneId || body.businessAccountId) {
      updateCredentials({
        token: body.token,
        phoneId: body.phoneId,
        businessAccountId: body.businessAccountId,
      });
    }
    const config = getPublicConfig();
    return NextResponse.json({
      success: true,
      message: body.token ? 'Live Meta credentials updated successfully' : 'Configuration updated',
      config,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update credentials' },
      { status: 400 }
    );
  }
}
