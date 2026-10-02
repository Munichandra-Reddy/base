import { NextResponse } from 'next/server';
import { initialChatMessages } from '@/lib/data';
import { ChatMessage } from '@/lib/types';

let chatMessages: ChatMessage[] = [...initialChatMessages];

export async function GET() {
  return NextResponse.json({ messages: chatMessages });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newMessage: ChatMessage = {
      id: `c-${Date.now()}`,
      sender: body.sender || 'Rahul Kumar',
      senderAvatar: 'R',
      avatarBg: 'bg-blue-100 text-blue-700',
      content: body.content || '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: body.channel || 'general',
    };
    chatMessages.push(newMessage);
    return NextResponse.json({ success: true, message: newMessage, messages: chatMessages });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to send chat message' }, { status: 400 });
  }
}
