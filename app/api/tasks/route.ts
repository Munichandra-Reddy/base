import { NextResponse } from 'next/server';
import { initialTasks } from '@/lib/data';
import { Task } from '@/lib/types';

let tasks: Task[] = [...initialTasks];

export async function GET() {
  return NextResponse.json({ tasks, count: tasks.length });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newTask: Task = {
      id: `t-${Date.now()}`,
      title: body.title || 'New Task',
      project: body.project || 'E-Commerce Website',
      completed: false,
      dueDate: body.dueDate || new Date().toISOString().split('T')[0],
      assignedTo: body.assignedTo || 'Rahul Kumar',
      priority: body.priority || 'medium',
    };
    tasks.unshift(newTask);
    return NextResponse.json({ success: true, task: newTask, tasks });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, completed } = body;
    tasks = tasks.map((t) => (t.id === id ? { ...t, completed: typeof completed === 'boolean' ? completed : !t.completed } : t));
    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update task' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (id) {
    tasks = tasks.filter((t) => t.id !== id);
  }
  return NextResponse.json({ success: true, tasks });
}
