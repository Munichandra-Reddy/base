import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

const DEFAULT_DESIGNATIONS = [
  'Software Developer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Engineer',
  'UI/UX Designer',
  'Product Manager',
  'Project Manager',
  'Business Analyst',
  'HR Executive',
  'Marketing Executive',
  'Team Lead',
  'QA Engineer',
];

export async function GET() {
  try {
    const snap = await getDocs(collection(db, 'designations'));
    let designations: Array<{ id: string; name: string }> = [];

    if (snap.empty) {
      for (const name of DEFAULT_DESIGNATIONS) {
        const docId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        await setDoc(doc(db, 'designations', docId), {
          id: docId,
          name,
          createdAt: new Date().toISOString(),
        });
        designations.push({ id: docId, name });
      }
    } else {
      snap.docs.forEach((d) => {
        const data = d.data();
        designations.push({
          id: d.id,
          name: data.name || d.id,
        });
      });
    }

    designations.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ success: true, designations });
  } catch (error: any) {
    console.error('Error fetching designations:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch designations.' },
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
        { success: false, error: 'Designation name is required.' },
        { status: 400 }
      );
    }

    const docId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const desigRef = doc(db, 'designations', docId);
    const existing = await getDoc(desigRef);

    if (existing.exists()) {
      return NextResponse.json(
        { success: false, error: `Designation "${name}" already exists.` },
        { status: 400 }
      );
    }

    await setDoc(desigRef, {
      id: docId,
      name,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Designation "${name}" added successfully.`,
      designation: { id: docId, name },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add designation.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Designation ID is required.' },
        { status: 400 }
      );
    }

    await deleteDoc(doc(db, 'designations', id));

    return NextResponse.json({
      success: true,
      message: 'Designation deleted successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete designation.' },
      { status: 500 }
    );
  }
}
