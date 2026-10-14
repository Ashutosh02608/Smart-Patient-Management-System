import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { checkPrescriptionSafety, generateSoapNote } from '@/lib/gemini';
import { getUserById, getRecords } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'check_safety') {
      const { patientId, newPrescriptions, patientAllergies: inputAllergies } = body;

      let patientAllergies = inputAllergies || '';
      let currentMedications = [];

      // If patientId provided, load documented allergies and previous active medications
      if (patientId) {
        try {
          const patientUser = await getUserById(patientId);
          if (patientUser?.profile?.allergies) {
            patientAllergies = patientUser.profile.allergies;
          }

          const previousRecords = await getRecords({ patientId });
          if (previousRecords && previousRecords.length > 0) {
            currentMedications = previousRecords.flatMap(r => {
              if (Array.isArray(r.prescription)) return r.prescription;
              return [];
            });
          }
        } catch (dbErr) {
          console.warn('Could not fetch patient records for safety check:', dbErr.message);
        }
      }

      const safetyResult = await checkPrescriptionSafety({
        patientAllergies,
        currentMedications,
        newPrescriptions: newPrescriptions || []
      });

      return NextResponse.json(safetyResult);
    }

    if (action === 'generate_soap') {
      const {
        patientName,
        diagnosis,
        symptoms,
        treatment,
        doctorRoughNotes,
        prescriptions,
        allergies
      } = body;

      const soapResult = await generateSoapNote({
        patientName,
        diagnosis,
        symptoms,
        treatment,
        doctorRoughNotes,
        prescriptions,
        allergies
      });

      return NextResponse.json(soapResult);
    }

    return NextResponse.json({ error: 'Invalid copilot action specified.' }, { status: 400 });
  } catch (error) {
    console.error('Clinical Copilot API error:', error);
    return NextResponse.json({ error: 'Failed to process clinical copilot request.' }, { status: 500 });
  }
}
