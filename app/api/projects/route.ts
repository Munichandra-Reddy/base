import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, getDoc, setDoc } from 'firebase/firestore';
import { Project, ProjectPriority, ProjectStatus, Person } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email')?.toLowerCase().trim();
    const userRole = searchParams.get('role')?.toLowerCase().trim();

    const snap = await getDocs(collection(db, 'projects'));
    let projectList: Project[] = [];

    snap.docs.forEach((d) => {
      const data = d.data();
      projectList.push({
        id: d.id,
        projectId: data.projectId || d.id,
        name: data.name || 'Untitled Project',
        description: data.description || '',
        category: data.category || 'General',
        status: (data.status || 'planning').toLowerCase(),
        priority: (data.priority || 'medium').toLowerCase(),
        progress: typeof data.progress === 'number' ? data.progress : 0,
        manager: data.manager || 'Workspace Admin',
        managerEmail: data.managerEmail || '',
        managerId: data.managerId || '',
        members: Array.isArray(data.members) ? data.members : [],
        memberDetails: Array.isArray(data.memberDetails) ? data.memberDetails : [],
        startDate: data.startDate || '',
        endDate: data.endDate || data.deadline || '',
        deadline: data.deadline || data.endDate || '',
        notes: data.notes || '',
        attachments: Array.isArray(data.attachments) ? data.attachments : [],
        requiredDocuments: Array.isArray(data.requiredDocuments) ? data.requiredDocuments : [],
        createdAt: data.createdAt || '',
        updatedAt: data.updatedAt || '',
        archived: Boolean(data.archived),
      });
    });

    // If an employee is requesting (not admin), filter to projects they belong to
    if (userEmail && userRole !== 'admin') {
      projectList = projectList.filter((p) => {
        const isManager = (p.managerEmail && p.managerEmail.toLowerCase() === userEmail) ||
                          (p.manager && p.manager.toLowerCase().includes(userEmail));
        const isMember = (p.members || []).some((m) => m.toLowerCase().includes(userEmail));
        return isManager || isMember;
      });
    }

    // Dynamic Summary Metrics
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const metrics = {
      total: projectList.length,
      active: projectList.filter((p) => p.status === 'active').length,
      planning: projectList.filter((p) => p.status === 'planning').length,
      on_hold: projectList.filter((p) => p.status === 'on_hold' || p.status === 'on hold').length,
      completed: projectList.filter((p) => p.status === 'completed').length,
      cancelled: projectList.filter((p) => p.status === 'cancelled').length,
      overdue: projectList.filter((p) => {
        const d = p.endDate || p.deadline;
        if (!d) return false;
        return d < todayStr && p.status !== 'completed' && p.status !== 'cancelled';
      }).length,
    };

    return NextResponse.json({
      success: true,
      projects: projectList,
      metrics,
    });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch projects.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name || '').trim();
    const description = String(body.description || '').trim();
    let projectId = String(body.projectId || '').trim();
    const category = String(body.category || 'General').trim();
    const managerName = String(body.manager || '').trim();
    const managerEmail = String(body.managerEmail || '').toLowerCase().trim();
    const managerId = String(body.managerId || '').trim();
    const rawMembers: string[] = Array.isArray(body.members) ? body.members : [];
    const startDate = String(body.startDate || new Date().toISOString().split('T')[0]).trim();
    const endDate = String(body.endDate || body.deadline || '').trim();
    const priority: ProjectPriority = ['low', 'medium', 'high', 'critical'].includes(String(body.priority).toLowerCase())
      ? (String(body.priority).toLowerCase() as ProjectPriority)
      : 'medium';
    const status: ProjectStatus = ['planning', 'active', 'on_hold', 'completed', 'cancelled'].includes(String(body.status).toLowerCase())
      ? (String(body.status).toLowerCase() as ProjectStatus)
      : 'planning';
    const notes = String(body.notes || '').trim();
    const adminEmail = String(request.headers.get('x-admin-email') || body.adminEmail || 'Admin').toLowerCase().trim();

    // 1. Validation
    if (!name) {
      return NextResponse.json({ success: false, error: 'Project Name is required.' }, { status: 400 });
    }

    if (!description) {
      return NextResponse.json({ success: false, error: 'Project Description is required.' }, { status: 400 });
    }

    if (!managerName) {
      return NextResponse.json({ success: false, error: 'Project Manager is required.' }, { status: 400 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: 'Both Start Date and End Date are required.' }, { status: 400 });
    }

    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      return NextResponse.json({ success: false, error: 'Project End Date must be after the Start Date.' }, { status: 400 });
    }

    // 2. Auto-generate unique Project ID if not supplied
    if (!projectId) {
      const snap = await getDocs(collection(db, 'projects'));
      const count = snap.docs.length;
      let candidateNum = 1000 + count + 1;
      let candidateId = `PRJ-${candidateNum}`;
      const existingIds = new Set(snap.docs.map((d) => (d.data().projectId || d.id || '').toUpperCase()));

      while (existingIds.has(candidateId.toUpperCase())) {
        candidateNum++;
        candidateId = `PRJ-${candidateNum}`;
      }
      projectId = candidateId;
    }

    // 3. Guarantee PM is included in project membership
    const membersSet = new Set<string>();
    membersSet.add(managerName);
    if (managerEmail) membersSet.add(managerEmail);

    rawMembers.forEach((m) => {
      const clean = String(m || '').trim();
      if (clean) membersSet.add(clean);
    });

    const finalMembers = Array.from(membersSet);

    // 4. Create Project document
    const docId = `prj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newProject: Project = {
      id: docId,
      projectId,
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
      progress: 0,
      openToDos: 0,
      notes,
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archived: false,
    };

    await setDoc(doc(db, 'projects', docId), newProject);

    // 5. Record activity in Firestore activityLogs
    try {
      const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'activityLogs', actId), {
        id: actId,
        projectId: docId,
        projectDisplayId: projectId,
        projectName: name,
        type: 'project_created',
        description: `Project "${name}" (${projectId}) created with status "${status}" and manager ${managerName}.`,
        performedBy: adminEmail,
        timestamp: new Date().toISOString(),
        createdAt: Date.now(),
      });
    } catch (actErr) {
      console.warn('Activity logging warning:', actErr);
    }

    return NextResponse.json({
      success: true,
      message: `Project "${name}" has been created successfully.`,
      project: newProject,
    });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred while creating project.' },
      { status: 500 }
    );
  }
}
