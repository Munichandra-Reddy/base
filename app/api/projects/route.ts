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
      // Skip all legacy, automated testing, and dummy projects
      const id = String(d.id || '').trim();
      const pName = String(data.name || '').trim();
      const prjId = String(data.projectId || '').trim();
      if (['p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'prj_1795169922693_z6wz', 'prj_1795170215729_ie8a', 'prj_1795170328299_vjn1', 'p-1791616801241', 'p-1791624872977', 'p-1791618846792'].includes(id)) return;
      if (['E-Commerce Website', 'Cloud Infrastructure Migration', 'AI Customer Assistant', 'Global Inventory Sync (Production Scale)', 'Global Inventory Sync', 'kalinq', 'muni', 'anurag 2'].includes(pName)) return;
      if (['PRJ-1010', 'PRJ-1011', 'PRJ-1012'].includes(prjId)) return;

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
        // Project Based Learning Fields
        teamName: data.teamName || '',
        projectType: data.projectType || 'website',
        mentorName: data.mentorName || data.manager || 'Workspace Admin',
        mentorEmail: data.mentorEmail || data.managerEmail || '',
        learningPlan: data.learningPlan || undefined,
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

    // 4. Project-Based Learning Plan & Metadata
    const teamName = String(body.teamName || '').trim() || 'Team';
    const projectType = String(body.projectType || 'website').trim();
    const mentorName = String(body.mentorName || managerName || 'Admin Mentor').trim();
    const mentorEmail = String(body.mentorEmail || managerEmail || '').trim();

    const targetTechStack = body.targetTechStack || body.techStack || {
      uiUx: body.techStackUiUx || 'Brand Kit, Figma Design System',
      frontend: body.techStackFrontend || (projectType === 'app' ? 'React Native / Flutter' : 'React.js / Next.js, Tailwind CSS'),
      backend: body.techStackBackend || 'Node.js, Express, REST APIs',
      databaseCloud: body.techStackDatabase || 'PostgreSQL / Firebase Cloud, Vercel',
      notes: body.techStackNotes || '',
    };

    const learningPlan: any = body.learningPlan || {
      teamName,
      projectType,
      mentorName,
      mentorEmail,
      scopeOfDocument: {
        submitted: false,
        status: 'pending',
        objectives: '',
        deliverables: '',
        proposedTechStack: '',
        documentUrl: '',
        content: '',
      },
      techStackLocked: false,
      techStack: targetTechStack,
      stage: 'scope_pending',
      workDivisionStatus: 'pending',
      currentSprint: 'Sprint 1 (Week 1)',
      weekendMeeting: {
        scheduledDate: body.weekendMeetingDate || '',
        agenda: 'Weekly Sprint Kickoff & Scope Alignment',
        meetingNotes: '',
        status: 'scheduled',
      },
      testingReport: {
        status: 'pending',
        testCasesCount: 0,
        notes: '',
      },
      finalDocumentReport: {
        submitted: false,
        reportUrl: '',
        summary: '',
      },
      liveUrl: '',
      resources: [],
    };

    // 5. Create Project document
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
      // Project Based Learning
      teamName,
      projectType,
      mentorName,
      mentorEmail,
      learningPlan,
    };

    await setDoc(doc(db, 'projects', docId), newProject);

    // 6. Create Dedicated Team Group Chat Conversation for Project
    try {
      const convId = `project_${docId}`;
      const memberUids = finalMembers.map((m) => m.toLowerCase().replace(/[^a-z0-9]/g, '_'));
      const memberDetails: Record<string, any> = {};
      finalMembers.forEach((m) => {
        const u = m.toLowerCase().replace(/[^a-z0-9]/g, '_');
        memberDetails[u] = {
          uid: u,
          name: m,
          email: m.includes('@') ? m : '',
          role: m === managerName || m === managerEmail ? 'admin' : 'member',
          avatar: m[0].toUpperCase(),
          avatarBg: 'bg-emerald-100 text-emerald-800',
        };
      });

      await setDoc(
        doc(db, 'conversations', convId),
        {
          id: convId,
          type: 'project',
          projectId: docId,
          projectName: name,
          name: `${teamName ? `${teamName} - ` : ''}${name}`,
          description: `Project team discussion for ${name} (${teamName}) with Mentor ${mentorName}.`,
          memberUids,
          memberDetails,
          createdBy: {
            uid: adminEmail.replace(/[^a-z0-9]/g, '_'),
            name: managerName,
            email: adminEmail,
            role: 'admin',
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          unreadCountByMember: {},
        },
        { merge: true }
      );
    } catch (chatErr) {
      console.warn('Project team conversation creation warning:', chatErr);
    }

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
