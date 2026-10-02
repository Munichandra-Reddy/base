import { NextResponse } from 'next/server';
import { initialProjects } from '@/lib/data';
import { Project } from '@/lib/types';

let projects: Project[] = [...initialProjects];

export async function GET() {
  return NextResponse.json({ projects, count: projects.length });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newProject: Project = {
      id: `p-${Date.now()}`,
      name: body.name || 'Untitled Project',
      status: 'active',
      progress: 0,
      openToDos: body.openToDos || 5,
      members: body.members || ['Rahul Kumar'],
      description: body.description || 'New project workspace.',
      updatedAt: 'Just now',
    };
    projects.unshift(newProject);
    return NextResponse.json({ success: true, project: newProject, projects });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create project' }, { status: 400 });
  }
}
