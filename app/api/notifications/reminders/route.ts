import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Task, Project } from '@/lib/types';
import { runScheduledReminderScan } from '@/lib/firebaseNotificationService';

export const dynamic = 'force-dynamic';

/**
 * Scheduled reminder scan endpoint
 * Can be triggered via cron, Cloud Scheduler, or workspace interval
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetEmail = body.userEmail;

    // 1. Fetch active tasks
    const tasksSnap = await getDocs(collection(db, 'tasks'));
    const tasks: Task[] = [];
    tasksSnap.forEach((d) => {
      const data = d.data();
      tasks.push({ id: d.id, ...data } as Task);
    });

    // 2. Fetch active projects
    const projectsSnap = await getDocs(collection(db, 'projects'));
    const projects: Project[] = [];
    projectsSnap.forEach((d) => {
      const data = d.data();
      projects.push({ id: d.id, ...data } as Project);
    });

    // 3. Scan for target user or unique assignees
    if (targetEmail) {
      await runScheduledReminderScan(tasks, projects, targetEmail);
    } else {
      const emailSet = new Set<string>();
      tasks.forEach((t) => {
        if (t.assignedToEmail) emailSet.add(t.assignedToEmail.toLowerCase().trim());
      });
      projects.forEach((p) => {
        (p.members || []).forEach((m) => emailSet.add(m.toLowerCase().trim()));
      });

      for (const email of Array.from(emailSet)) {
        await runScheduledReminderScan(tasks, projects, email);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduled reminder scan executed successfully.',
    });
  } catch (error: any) {
    console.error('Error running scheduled reminder scan:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to run scheduled reminder scan' },
      { status: 500 }
    );
  }
}
