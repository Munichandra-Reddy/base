import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const projectId = String(body.projectId || body.id || '').trim();
    const action = String(body.action || '').trim(); // 'add_member' | 'remove_member' | 'change_manager' | 'update_members'
    const adminEmail = String(request.headers.get('x-admin-email') || body.adminEmail || 'Admin').toLowerCase().trim();

    if (!projectId) {
      return NextResponse.json({ success: false, error: 'Project ID is required.' }, { status: 400 });
    }

    const projRef = doc(db, 'projects', projectId);
    const snap = await getDoc(projRef);

    if (!snap.exists()) {
      return NextResponse.json({ success: false, error: 'Project not found.' }, { status: 404 });
    }

    const projectData = snap.data();
    let members: string[] = Array.isArray(projectData.members) ? [...projectData.members] : [];
    let currentPM: string = projectData.manager || 'Workspace Admin';
    let currentPMEmail: string = projectData.managerEmail || '';

    // Action 1: Add a member
    if (action === 'add_member') {
      const newMemberName = String(
        body.memberName ||
        body.name ||
        (typeof body.member === 'object' ? body.member?.name : '') ||
        (typeof body.member === 'string' ? body.member : '') ||
        ''
      ).trim();
      const newMemberEmail = String(
        body.memberEmail ||
        body.email ||
        (typeof body.member === 'object' ? body.member?.email : '') ||
        ''
      ).toLowerCase().trim();

      if (!newMemberName && !newMemberEmail) {
        return NextResponse.json({ success: false, error: 'Member name or email is required.' }, { status: 400 });
      }

      const identifier = newMemberName || newMemberEmail;
      if (members.some((m) => m.toLowerCase() === identifier.toLowerCase())) {
        return NextResponse.json({ success: false, error: `${identifier} is already a member of this project.` }, { status: 400 });
      }

      members.push(identifier);

      await setDoc(projRef, { members, updatedAt: new Date().toISOString() }, { merge: true });

      // Log activity
      try {
        const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await setDoc(doc(db, 'activityLogs', actId), {
          id: actId,
          projectId,
          projectName: projectData.name,
          type: 'team_member_added',
          description: `Added ${identifier} to project "${projectData.name}".`,
          performedBy: adminEmail,
          timestamp: new Date().toISOString(),
          createdAt: Date.now(),
        });
      } catch (e) {}

      return NextResponse.json({ success: true, message: `Added ${identifier} to project.`, members });
    }

    // Action 2: Remove a member
    if (action === 'remove_member') {
      const memberToRemove = String(
        body.memberToRemove ||
        body.member ||
        body.memberName ||
        body.email ||
        (typeof body.member === 'object' ? (body.member?.name || body.member?.email) : '') ||
        ''
      ).trim();

      if (!memberToRemove) {
        return NextResponse.json({ success: false, error: 'Member identifier to remove is required.' }, { status: 400 });
      }

      // Check if trying to remove the Project Manager
      if (
        memberToRemove.toLowerCase() === currentPM.toLowerCase() ||
        (currentPMEmail && memberToRemove.toLowerCase() === currentPMEmail.toLowerCase())
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot remove ${memberToRemove} because they are the current Project Manager. Please assign another Project Manager first.`,
          },
          { status: 400 }
        );
      }

      const toRemove = new Set<string>();
      toRemove.add(memberToRemove.toLowerCase());
      try {
        const empSnap = await getDocs(collection(db, 'employees'));
        const empDocs = empSnap.docs.map((d) => d.data());
        const matched = empDocs.find(
          (e) =>
            (e.name && e.name.toLowerCase() === memberToRemove.toLowerCase()) ||
            (e.fullName && e.fullName.toLowerCase() === memberToRemove.toLowerCase()) ||
            (e.email && e.email.toLowerCase() === memberToRemove.toLowerCase())
        );
        if (matched) {
          if (matched.name) toRemove.add(String(matched.name).toLowerCase().trim());
          if (matched.fullName) toRemove.add(String(matched.fullName).toLowerCase().trim());
          if (matched.email) toRemove.add(String(matched.email).toLowerCase().trim());
        }
      } catch (e) {}

      members = members.filter((m) => !toRemove.has(m.toLowerCase().trim()));

      await setDoc(projRef, { members, updatedAt: new Date().toISOString() }, { merge: true });

      // Log activity
      try {
        const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await setDoc(doc(db, 'activityLogs', actId), {
          id: actId,
          projectId,
          projectName: projectData.name,
          type: 'team_member_removed',
          description: `Removed ${memberToRemove} from project "${projectData.name}".`,
          performedBy: adminEmail,
          timestamp: new Date().toISOString(),
          createdAt: Date.now(),
        });
      } catch (e) {}

      return NextResponse.json({ success: true, message: `Removed ${memberToRemove} from project.`, members });
    }

    // Action 3: Change Project Manager
    if (action === 'change_manager') {
      const newPMName = String(body.newManagerName || body.manager || '').trim();
      const newPMEmail = String(body.newManagerEmail || body.managerEmail || '').toLowerCase().trim();
      const newPMId = String(body.newManagerId || body.managerId || '').trim();

      if (!newPMName) {
        return NextResponse.json({ success: false, error: 'New Project Manager name is required.' }, { status: 400 });
      }

      // PM must be in members list
      if (!members.includes(newPMName)) {
        members.push(newPMName);
      }
      if (newPMEmail && !members.includes(newPMEmail)) {
        members.push(newPMEmail);
      }

      await setDoc(
        projRef,
        {
          manager: newPMName,
          managerEmail: newPMEmail,
          managerId: newPMId,
          members,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Log activity
      try {
        const actId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await setDoc(doc(db, 'activityLogs', actId), {
          id: actId,
          projectId,
          projectName: projectData.name,
          type: 'project_manager_changed',
          description: `Project Manager changed from "${currentPM}" to "${newPMName}" for project "${projectData.name}".`,
          performedBy: adminEmail,
          timestamp: new Date().toISOString(),
          createdAt: Date.now(),
        });
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Project Manager updated to "${newPMName}".`,
        manager: newPMName,
        members,
      });
    }

    // Action 4: Update entire team membership array
    if (action === 'update_members') {
      const newMembers: string[] = Array.isArray(body.members) ? body.members : [];
      // Guarantee current PM is in newMembers
      const set = new Set<string>();
      set.add(currentPM);
      if (currentPMEmail) set.add(currentPMEmail);
      newMembers.forEach((m) => {
        const c = String(m || '').trim();
        if (c) set.add(c);
      });

      const updatedList = Array.from(set);

      await setDoc(projRef, { members: updatedList, updatedAt: new Date().toISOString() }, { merge: true });

      return NextResponse.json({
        success: true,
        message: 'Project team members updated successfully.',
        members: updatedList,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown team action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating project team:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update project team.' },
      { status: 500 }
    );
  }
}
