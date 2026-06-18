import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getLabReports, createLabReport, updateLabReport, getUserById } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    let reports = [];

    if (session.role === 'patient') {
      reports = await getLabReports({ patientId: session.id });
    } else if (patientId) {
      reports = await getLabReports({ patientId });
    } else {
      reports = await getLabReports();
    }

    return NextResponse.json(reports);
  } catch (error) {
    console.error("GET lab-reports error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'receptionist' && session.role !== 'doctor')) {
      return NextResponse.json({ error: 'Forbidden: Only staff and doctors can order lab tests' }, { status: 403 });
    }

    const { patientId, testName } = await request.json();
    if (!patientId || !testName) {
      return NextResponse.json({ error: 'Patient ID and test name are required' }, { status: 400 });
    }

    const patient = await getUserById(patientId);
    if (!patient || patient.role !== 'patient') {
      return NextResponse.json({ error: 'Invalid patient selected' }, { status: 400 });
    }

    const newReport = {
      id: `lab-${Math.random().toString(36).substring(2, 9)}`,
      patientId,
      patientName: patient.name,
      testName,
      date: new Date().toISOString().split('T')[0],
      result: '',
      referenceRange: 'See laboratory findings',
      notes: '',
      status: 'pending'
    };

    const created = await createLabReport(newReport);
    return NextResponse.json(created);
  } catch (error) {
    console.error("POST lab-report error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden: Only doctors or admins can enter lab results' }, { status: 403 });
    }

    const { id, result, referenceRange, notes, status } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Lab report ID is required' }, { status: 400 });
    }

    const updates = {};
    if (result !== undefined) updates.result = result;
    if (referenceRange !== undefined) updates.referenceRange = referenceRange;
    if (notes !== undefined) updates.notes = notes;
    if (status !== undefined) updates.status = status;

    const updated = await updateLabReport(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Lab report not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT lab-report error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
