import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, where } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

const DEFAULT_DEPARTMENTS = [
  'Engineering',
  'Design',
  'Product',
  'Marketing',
  'Sales',
  'Human Resources',
  'Finance',
  'Operations',
  'Customer Support',
  'General',
];

export async function GET() {
  try {
    const snap = await getDocs(collection(db, 'departments'));
    let depts: Array<{ id: string; name: string; employeeCount: number }> = [];

    // Get employee counts per department
    const empSnap = await getDocs(collection(db, 'employees'));
    const countMap: Record<string, number> = {};
    empSnap.docs.forEach((d) => {
      const data = d.data();
      const dept = (data.department || 'General').trim();
      countMap[dept] = (countMap[dept] || 0) + 1;
    });

    if (snap.empty) {
      // Auto-seed default departments
      for (const name of DEFAULT_DEPARTMENTS) {
        const docId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        await setDoc(doc(db, 'departments', docId), {
          id: docId,
          name,
          createdAt: new Date().toISOString(),
        });
        depts.push({
          id: docId,
          name,
          employeeCount: countMap[name] || 0,
        });
      }
    } else {
      snap.docs.forEach((d) => {
        const data = d.data();
        const name = data.name || d.id;
        depts.push({
          id: d.id,
          name,
          employeeCount: countMap[name] || 0,
        });
      });
    }

    // Sort alphabetically
    depts.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ success: true, departments: depts });
  } catch (error: any) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch departments.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || '').trim();

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Department name is required.' },
        { status: 400 }
      );
    }

    const docId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const deptRef = doc(db, 'departments', docId);
    const existing = await getDoc(deptRef);

    if (existing.exists()) {
      return NextResponse.json(
        { success: false, error: `Department "${name}" already exists.` },
        { status: 400 }
      );
    }

    await setDoc(deptRef, {
      id: docId,
      name,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Department "${name}" created successfully.`,
      department: { id: docId, name, employeeCount: 0 },
    });
  } catch (error: any) {
    console.error('Error creating department:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create department.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    const newName = String(body.newName || body.name || '').trim();

    if (!id || !newName) {
      return NextResponse.json(
        { success: false, error: 'Department ID and new name are required.' },
        { status: 400 }
      );
    }

    const deptRef = doc(db, 'departments', id);
    const existingSnap = await getDoc(deptRef);
    if (!existingSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Department not found.' },
        { status: 404 }
      );
    }

    const oldName = existingSnap.data()?.name || '';

    // Update department doc
    await setDoc(deptRef, { name: newName, updatedAt: new Date().toISOString() }, { merge: true });

    // Update employees assigned to oldName
    if (oldName && oldName !== newName) {
      const empSnap = await getDocs(collection(db, 'employees'));
      for (const d of empSnap.docs) {
        if (d.data()?.department === oldName) {
          await setDoc(doc(db, 'employees', d.id), { department: newName }, { merge: true });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Department renamed to "${newName}".`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update department.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';
    const name = searchParams.get('name') || '';

    if (!id && !name) {
      return NextResponse.json(
        { success: false, error: 'Department ID or name is required.' },
        { status: 400 }
      );
    }

    const docId = id || name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const deptRef = doc(db, 'departments', docId);
    const deptSnap = await getDoc(deptRef);
    const deptName = deptSnap.exists() ? deptSnap.data().name : name;

    // Check if any employee is currently assigned to this department
    const empSnap = await getDocs(collection(db, 'employees'));
    const assignedCount = empSnap.docs.filter((d) => d.data()?.department === deptName).length;

    if (assignedCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete "${deptName}": ${assignedCount} employee(s) are currently assigned to this department. Reassign them first.`,
        },
        { status: 400 }
      );
    }

    await deleteDoc(deptRef);

    return NextResponse.json({
      success: true,
      message: `Department "${deptName}" deleted successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete department.' },
      { status: 500 }
    );
  }
}
