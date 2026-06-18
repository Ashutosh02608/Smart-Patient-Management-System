import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getAppointments, createAppointment, updateAppointment, deleteAppointment, getUserById } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let appointments = [];

    if (session.role === 'patient') {
      appointments = await getAppointments({ patientId: session.id });
    } else if (session.role === 'doctor') {
      appointments = await getAppointments({ doctorId: session.id });
    } else {
      appointments = await getAppointments();
    }

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("GET appointments error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { patientId, doctorId, date, time, reason } = await request.json();
    if (!doctorId || !date || !time) {
      return NextResponse.json({ error: 'Doctor, date, and time are required' }, { status: 400 });
    }
    
    let finalPatientId = patientId;
    let finalPatientName = '';

    if (session.role === 'patient') {
      finalPatientId = session.id;
      finalPatientName = session.name;
    } else {
      const patient = await getUserById(patientId);
      if (!patient || patient.role !== 'patient') {
        return NextResponse.json({ error: 'Invalid patient selected' }, { status: 400 });
      }
      finalPatientName = patient.name;
    }

    const doctor = await getUserById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return NextResponse.json({ error: 'Invalid doctor selected' }, { status: 400 });
    }

    const initialStatus = session.role === 'patient' ? 'pending' : 'confirmed';

    const newAppointment = {
      id: `apt-${Math.random().toString(36).substring(2, 9)}`,
      patientId: finalPatientId,
      patientName: finalPatientName,
      doctorId,
      doctorName: doctor.name,
      date,
      time,
      status: initialStatus,
      reason: reason || ''
    };

    const created = await createAppointment(newAppointment);
    return NextResponse.json(created);
  } catch (error) {
    console.error("POST appointment error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, status, date, time, reason } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    // Load the appointments to find the active target
    const apts = await getAppointments();
    const apt = apts.find(a => a.id === id);
    if (!apt) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (session.role === 'patient' && apt.patientId !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (session.role === 'doctor' && apt.doctorId !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates = {};
    if (status) {
      if (session.role === 'patient' && status !== 'cancelled') {
        return NextResponse.json({ error: 'Patients can only cancel appointments' }, { status: 403 });
      }
      updates.status = status;
    }

    if (date) {
      if (session.role === 'patient') {
        updates.date = date;
        updates.status = 'pending'; // Reset to pending for staff approval on patient reschedule
      } else if (session.role === 'receptionist' || session.role === 'admin') {
        updates.date = date;
      }
    }

    if (time) {
      if (session.role === 'patient') {
        updates.time = time;
        updates.status = 'pending'; // Reset to pending for staff approval on patient reschedule
      } else if (session.role === 'receptionist' || session.role === 'admin') {
        updates.time = time;
      }
    }

    if (reason) {
      updates.reason = reason;
    }

    const updated = await updateAppointment(id, updates);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT appointment error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'receptionist')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
    }

    const deleted = await deleteAppointment(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE appointment error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
