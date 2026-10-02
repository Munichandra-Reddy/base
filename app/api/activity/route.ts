import { NextResponse } from 'next/server';
import { initialActivities } from '@/lib/data';
import { Activity } from '@/lib/types';

let activities: Activity[] = [...initialActivities];

export async function GET() {
  return NextResponse.json({ activities });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      userName: body.userName || 'Rahul Kumar',
      userAvatar: body.userName ? body.userName[0].toUpperCase() : 'R',
      avatarBg: 'bg-blue-100 text-blue-700',
      action: body.action || 'updated',
      target: body.target || 'Workspace Task',
      timeAgo: 'Just now',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    activities.unshift(newActivity);
    return NextResponse.json({ success: true, activity: newActivity, activities });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to record activity' }, { status: 400 });
  }
}
