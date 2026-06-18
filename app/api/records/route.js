import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getRecords, createRecord, getUserById } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    let records = [];

    if (session.role === 'patient') {
      records = await getRecords({ patientId: session.id });
    } else if (patientId) {
      records = await getRecords({ patientId });
    } else {
      records = await getRecords();
    }

    return NextResponse.json(records);
  } catch (error) {
    console.error("GET records error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'doctor' && session.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden: Only doctors or admins can add medical records' }, { status: 403 });
    }

    const { patientId, diagnosis, symptoms, treatment, prescription, notes } = await request.json();
    if (!patientId || !diagnosis) {
      return NextResponse.json({ error: 'Patient ID and diagnosis are required' }, { status: 400 });
    }

    const patient = await getUserById(patientId);
    if (!patient || patient.role !== 'patient') {
      return NextResponse.json({ error: 'Invalid patient selected' }, { status: 400 });
    }

    const newRecord = {
      id: `rec-${Math.random().toString(36).substring(2, 9)}`,
      patientId,
      patientName: patient.name,
      doctorId: session.id,
      doctorName: session.name,
      date: new Date().toISOString().split('T')[0],
      diagnosis,
      symptoms: symptoms || '',
      treatment: treatment || '',
      prescription: prescription || [],
      notes: notes || ''
    };

    const created = await createRecord(newRecord);
    return NextResponse.json(created);
  } catch (error) {
    console.error("POST record error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
