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
      const token = body.token?.trim();
      const phoneId = body.phoneId?.trim() || process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || '1280116715195570';

      // Live verification with Meta if a new token was submitted
      if (token) {
        try {
          const testRes = await fetch(`https://graph.facebook.com/v20.0/${phoneId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const testData = await testRes.json();
          if (!testRes.ok) {
            const errCode = testData?.error?.code;
            const errMsg = testData?.error?.message || 'Invalid Meta token';
            if (errCode === 190) {
              return NextResponse.json(
                {
                  success: false,
                  error: 'Meta Verification Failed: The provided token is expired or invalid (Error #190). Please generate a fresh token in Meta for Developers.',
                },
                { status: 400 }
              );
            }
            return NextResponse.json(
              { success: false, error: `Meta Verification Failed (${errCode || testRes.status}): ${errMsg}` },
              { status: 400 }
            );
          }
        } catch (netErr: any) {
          // If network check fails, proceed with update
        }
      }

      updateCredentials({
        token: body.token,
        phoneId: body.phoneId,
        businessAccountId: body.businessAccountId,
      });
    }

    const config = getPublicConfig();
    return NextResponse.json({
      success: true,
      message: body.token ? 'Live Meta credentials verified and activated successfully!' : 'Configuration updated',
      config,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update credentials' },
      { status: 400 }
    );
  }
}
