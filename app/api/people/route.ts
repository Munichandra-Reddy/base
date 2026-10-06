import { NextResponse } from 'next/server';
import { initialPeople, initialCheckIns, initialFiles } from '@/lib/data';
import { Person } from '@/lib/types';

let peopleStore: Person[] = [...initialPeople];

export async function GET(request: Request) {
  const { pathname } = new URL(request.url);
  if (pathname.includes('checkins')) {
    return NextResponse.json({ checkins: initialCheckIns });
  }
  if (pathname.includes('files')) {
    return NextResponse.json({ files: initialFiles });
  }
  return NextResponse.json({ people: peopleStore, count: peopleStore.length });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newPerson: Person = {
      id: body.id || `usr-${Date.now()}`,
      name: body.name || 'New Employee',
      role: body.role || 'Team Member',
      email: body.email || 'employee@abctech.com',
      status: body.status || 'active',
      avatar: body.avatar || (body.name ? body.name[0].toUpperCase() : 'E'),
      avatarBg: body.avatarBg || 'bg-indigo-100 text-indigo-700',
      projectsCount: body.projectsCount || 1,
    };
    peopleStore.push(newPerson);
    return NextResponse.json({ success: true, person: newPerson, people: peopleStore, count: peopleStore.length });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
