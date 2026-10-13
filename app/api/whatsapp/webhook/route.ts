import { NextResponse } from 'next/server';
import {
  getCredentials,
  verifyWebhookSignature,
  processWebhookPayload,
} from '@/lib/whatsappService';

// GET: Meta Webhook Handshake & Verification
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const { webhookVerifyToken } = getCredentials();

    if (mode === 'subscribe' && token === webhookVerifyToken) {
      // Respond with challenge token as raw text
      return new Response(challenge || '', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return new Response('Verification failed. Invalid verify token or mode.', {
      status: 403,
    });
  } catch (error: any) {
    return new Response(error?.message || 'Webhook verification error', {
      status: 500,
    });
  }
}

// POST: Meta WhatsApp Webhook Event Processing
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Verify webhook signature for security
    const isValidSignature = verifyWebhookSignature(rawBody, signature);
    if (!isValidSignature) {
      return NextResponse.json(
        { error: 'Invalid HMAC-SHA256 signature' },
        { status: 401 }
      );
    }

    let payload: any = {};
    if (rawBody) {
      try {
        payload = JSON.parse(rawBody);
      } catch (e) {
        return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
      }
    }

    // Process delivery status updates & incoming messages
    processWebhookPayload(payload);

    // Meta expects a quick 200 OK response with 'EVENT_RECEIVED'
    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
