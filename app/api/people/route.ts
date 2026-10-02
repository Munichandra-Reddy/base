import { NextResponse } from 'next/server';
import { initialPeople, initialCheckIns, initialFiles } from '@/lib/data';

export async function GET(request: Request) {
  const { pathname } = new URL(request.url);
  if (pathname.includes('checkins')) {
    return NextResponse.json({ checkins: initialCheckIns });
  }
  if (pathname.includes('files')) {
    return NextResponse.json({ files: initialFiles });
  }
  return NextResponse.json({ people: initialPeople });
}
