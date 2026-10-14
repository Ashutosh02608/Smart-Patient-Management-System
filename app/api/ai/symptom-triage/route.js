import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getUserById, getAllUsers } from '@/lib/db';
import { runGeminiTriage } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symptoms } = await request.json();
    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length === 0) {
      return NextResponse.json({ error: 'Symptoms description is required.' }, { status: 400 });
    }

    // Load full patient profile to pass allergies/demographics to AI
    let patientProfile = {};
    try {
      const patientUser = await getUserById(session.id);
      if (patientUser && patientUser.profile) {
        patientProfile = patientUser.profile;
      }
    } catch (e) {
      console.warn('Could not fetch patient profile for AI context:', e.message);
    }

    // Load registered clinic doctors
    let availableDoctors = [];
    try {
      availableDoctors = await getAllUsers('doctor');
    } catch (e) {
      console.warn('Could not fetch doctor list for AI context:', e.message);
    }

    const triageResult = await runGeminiTriage({
      symptoms: symptoms.trim(),
      patientProfile,
      availableDoctors
    });

    return NextResponse.json(triageResult);
  } catch (error) {
    console.error('AI Symptom Triage route error:', error);
    return NextResponse.json({ error: 'Failed to process AI symptom triage.' }, { status: 500 });
  }
}
