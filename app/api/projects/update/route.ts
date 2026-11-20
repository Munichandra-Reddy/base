import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Project, ProjectPriority, ProjectStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const id = String(body.id || body.projectId || '').trim();
    if (!id) {
      return NextResponse.json({ success: false, error: 'Project ID is required.' }, { status: 400 });
    }

    const projRef = doc(db, 'projects', id);
    const snap = await getDoc(projRef);

    if (!snap.exists()) {
      return NextResponse.json({ success: false, error: 'Project not found in database.' }, { status: 404 });
    }

    const existingData = snap.data() as Project;

    const name = body.name !== undefined ? String(body.name).trim() : existingData.name;
    const description = body.description !== undefined ? String(body.description).trim() : existingData.description;
    const category = body.category !== undefined ? String(body.category).trim() : (existingData.category || 'General');
    const managerName = body.manager !== undefined ? String(body.manager).trim() : existingData.manager;
    const managerEmail = body.managerEmail !== undefined ? String(body.managerEmail).toLowerCase().trim() : existingData.managerEmail;
    const managerId = body.managerId !== undefined ? String(body.managerId).trim() : existingData.managerId;
    const startDate = body.startDate !== undefined ? String(body.startDate).trim() : (existingData.startDate || '');
    const endDate = body.endDate !== undefined ? String(body.endDate).trim() : (existingData.endDate || existingData.deadline || '');
    const notes = body.notes !== undefined ? String(body.notes).trim() : (existingData.notes || '');
    const adminEmail = String(request.headers.get('x-admin-email') || body.adminEmail || 'Admin').toLowerCase().trim();

    if (!name) {
      return NextResponse.json({ success: false, error: 'Project Name cannot be empty.' }, { status: 400 });
    }

    if (!managerName) {
      return NextResponse.json(
        { success: false, error: 'A Project Manager must be assigned. You cannot remove the PM without assigning a replacement.' },
        { status: 400 }
      );
    }

    if (startDate && endDate && new Date(endDate).getTime() < new Date(startDate).getTime()) {
      return NextResponse.json({ success: false, error: 'Project End Date must be after the Start Date.' }, { status: 400 });
    }

    // Handle members update while ensuring PM is always included
    let finalMembers = existingData.members || [];
    if (Array.isArray(body.members)) {
      const set = new Set<string>();
      set.add(managerName);
      if (managerEmail) set.add(managerEmail);
      body.members.forEach((m: string) => {
        const c = String(m || '').trim();
        if (c) set.add(c);
      });
      finalMembers = Array.from(set);
    } else {
      // Ensure managerName is in members
      if (!finalMembers.includes(managerName)) {
        finalMembers.push(managerName);
      }
    }

    const priority: ProjectPriority = body.priority
      ? (String(body.priority).toLowerCase() as ProjectPriority)
      : (existingData.priority as ProjectPriority) || 'medium';

    const status: ProjectStatus = body.status
      ? (String(body.status).toLowerCase() as ProjectStatus)
      : (existingData.status as ProjectStatus) || 'planning';

    const progress = typeof body.progress === 'number' ? body.progress : (existingData.progress || 0);

    const updatedProject: Project = {
      ...existingData,
      id,
      name,
      description,
      category,
      manager: managerName,
      managerEmail,
      managerId,
      members: finalMembers,
      startDate,
      endDate,
      deadline: endDate,
      priority,
      status,
      progress,
      notes,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(projRef, updatedProject, { merge: true });

    // Record activity log
    try {
      const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'activityLogs', actId), {
        id: actId,
        projectId: id,
        projectDisplayId: updatedProject.projectId || id,
        projectName: name,
        type: 'project_updated',
        description: `Project "${name}" updated by ${adminEmail}. (PM: ${managerName}, Status: ${status}, Priority: ${priority})`,
        performedBy: adminEmail,
        timestamp: new Date().toISOString(),
        createdAt: Date.now(),
      });
    } catch (actErr) {
      console.warn('Activity logging warning:', actErr);
    }

    return NextResponse.json({
      success: true,
      message: `Project "${name}" updated successfully.`,
      project: updatedProject,
    });
  } catch (error: any) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update project.' },
      { status: 500 }
    );
  }
}
