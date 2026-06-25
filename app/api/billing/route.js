import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getInvoices, createInvoice, updateInvoice, getUserById } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    let invoices = [];

    if (session.role === 'patient') {
      invoices = await getInvoices({ patientId: session.id });
    } else if (patientId) {
      invoices = await getInvoices({ patientId });
    } else {
      invoices = await getInvoices();
    }

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("GET billing error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'receptionist')) {
      return NextResponse.json({ error: 'Forbidden: Only administrators or receptionists can generate invoices' }, { status: 403 });
    }

    const { patientId, description, amount } = await request.json();
    if (!patientId || !description || amount === undefined) {
      return NextResponse.json({ error: 'Patient ID, description, and amount are required' }, { status: 400 });
    }

    const patient = await getUserById(patientId);
    if (!patient || patient.role !== 'patient') {
      return NextResponse.json({ error: 'Invalid patient selected' }, { status: 400 });
    }

    const newInvoice = {
      id: `inv-${Math.random().toString(36).substring(2, 9)}`,
      patientId,
      patientName: patient.name,
      date: new Date().toISOString().split('T')[0],
      description,
      amount: parseFloat(amount),
      status: 'unpaid'
    };

    const created = await createInvoice(newInvoice);
    return NextResponse.json(created);
  } catch (error) {
    console.error("POST billing error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, status } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'Invoice ID and status are required' }, { status: 400 });
    }

    // Role check: admin/receptionist can do any status change.
    // Patient can only change their own invoice status to 'paid'.
    if (session.role !== 'admin' && session.role !== 'receptionist') {
      if (session.role === 'patient') {
        if (status !== 'paid') {
          return NextResponse.json({ error: 'Forbidden: Patients can only mark invoices as paid' }, { status: 403 });
        }
        // Verify ownership
        const patientInvoices = await getInvoices({ patientId: session.id });
        const belongsToPatient = patientInvoices.some(inv => inv.id === id);
        if (!belongsToPatient) {
          return NextResponse.json({ error: 'Forbidden: You do not own this invoice' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const updates = { status };
    const updated = await updateInvoice(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Invoice record not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT billing error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
