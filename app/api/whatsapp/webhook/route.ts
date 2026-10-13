import { NextResponse } from 'next/server';

/**
 * WhatsApp Cloud API Webhook Verification (GET)
 * Meta checks this endpoint when configuring webhooks in Meta App Dashboard
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const EXPECTED_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'workorbit_secure_token_2026';

  if (mode && token) {
    if (mode === 'subscribe' && token === EXPECTED_TOKEN) {
      console.log('WhatsApp Webhook verified successfully.');
      return new Response(challenge, { status: 200 });
    } else {
      return new Response('Forbidden', { status: 403 });
    }
  }

  return NextResponse.json({
    status: 'active',
    endpoint: '/api/whatsapp/webhook',
    message: 'WorkOrbit WhatsApp Webhook Gateway is running.',
    instructions: 'Point Meta App Dashboard or Twilio Webhook to this URL.',
  });
}

/**
 * WhatsApp Cloud API Webhook Inbound Events (POST)
 * Handles incoming WhatsApp messages, replies, and status updates (sent, delivered, read)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Log incoming webhook payload
    console.log('Received WhatsApp Webhook event:', JSON.stringify(body, null, 2));

    // Handle Meta WhatsApp Cloud API entries
    if (body.object === 'whatsapp_business_account' || body.entry) {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      // Handle delivery status update
      if (value?.statuses && value.statuses.length > 0) {
        const statusObj = value.statuses[0];
        console.log(`WhatsApp Message Status Update: ${statusObj.id} -> ${statusObj.status}`);
      }

      // Handle incoming user reply (Two-way WhatsApp Bot)
      if (value?.messages && value.messages.length > 0) {
        const msg = value.messages[0];
        const from = msg.from; // Sender phone number
        const text = msg.text?.body?.trim() || '';

        console.log(`Incoming WhatsApp message from ${from}: "${text}"`);

        // Check for 2-way bot commands
        if (text.toUpperCase().startsWith('DONE')) {
          const taskId = text.split(' ')[1]?.replace('#', '');
          console.log(`WhatsApp Bot: Task ${taskId} marked done via WhatsApp command!`);
        } else if (text.toUpperCase() === 'STATUS') {
          console.log(`WhatsApp Bot: Status requested by ${from}`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling WhatsApp webhook:', error);
    return NextResponse.json({ received: true }, { status: 200 }); // Always 200 to prevent Meta retries
  }
}
