import { NextResponse } from 'next/server';
import { initialCheckIns } from '@/lib/data';
import { CheckIn } from '@/lib/types';

let checkins: CheckIn[] = [...initialCheckIns];

export async function GET() {
  return NextResponse.json({ checkins });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newCheckIn: CheckIn = {
      id: `chk-${Date.now()}`,
      question: body.question || 'Daily Update',
      author: 'Rahul Kumar',
      authorAvatar: 'R',
      avatarBg: 'bg-blue-100 text-blue-700',
      answer: body.answer || 'Completed scheduled deliverables for today.',
      timeAgo: 'Just now',
      responsesCount: 1,
    };
    checkins.unshift(newCheckIn);
    return NextResponse.json({ success: true, checkin: newCheckIn, checkins });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to add check-in' }, { status: 400 });
  }
}
