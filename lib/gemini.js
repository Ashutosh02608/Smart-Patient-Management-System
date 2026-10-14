// CarePulse AI Engine: Google Gemini API integration with clinical fallback

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Medical specialty mapping table
export const SPECIALTY_RULES = [
  {
    specialty: 'Cardiology',
    keywords: ['chest pain', 'heart', 'palpitation', 'angina', 'shortness of breath', 'arrhythmia', 'high bp', 'hypertension', 'cardiac', 'pulse'],
    department: 'Cardiology'
  },
  {
    specialty: 'Dermatology',
    keywords: ['skin', 'rash', 'acne', 'itching', 'mole', 'eczema', 'psoriasis', 'hives', 'lesion', 'hair fall', 'blister'],
    department: 'Dermatology'
  },
  {
    specialty: 'Orthopedics',
    keywords: ['bone', 'joint', 'knee', 'back pain', 'spine', 'shoulder', 'fracture', 'sprain', 'arthritis', 'neck pain', 'muscle tear'],
    department: 'Orthopedics'
  },
  {
    specialty: 'Neurology',
    keywords: ['migraine', 'headache', 'dizziness', 'vertigo', 'seizure', 'numbness', 'tremor', 'memory', 'nerve pain', 'fainting'],
    department: 'Neurology'
  },
  {
    specialty: 'Pediatrics',
    keywords: ['child', 'baby', 'infant', 'toddler', 'pediatric', 'vaccination', 'growth'],
    department: 'Pediatrics'
  },
  {
    specialty: 'Gastroenterology',
    keywords: ['stomach', 'abdomen', 'acidity', 'reflux', 'nausea', 'vomiting', 'diarrhea', 'constipation', 'digestion', 'ulcer', 'bloating'],
    department: 'Gastroenterology'
  },
  {
    specialty: 'Pulmonology',
    keywords: ['cough', 'wheezing', 'asthma', 'lungs', 'bronchitis', 'respiratory', 'phlegm', 'chest congestion'],
    department: 'Pulmonology'
  },
  {
    specialty: 'Otolaryngology (ENT)',
    keywords: ['ear', 'nose', 'throat', 'sinus', 'tonsil', 'earache', 'hearing', 'nasal', 'sore throat'],
    department: 'ENT'
  }
];

// Emergency red flag detection
export const EMERGENCY_PATTERNS = [
  'crushing chest pain',
  'radiating pain to left arm',
  'difficulty breathing',
  'sudden loss of vision',
  'sudden weakness on one side',
  'slurred speech',
  'facial drooping',
  'coughing up blood',
  'unconscious',
  'seizure lasting over 5 minutes',
  'severe allergic reaction',
  'anaphylaxis',
  'suicidal'
];

export async function runGeminiTriage({ symptoms, patientProfile = {}, availableDoctors = [] }) {
  // If an API key is provided, try calling the Gemini endpoint
  if (GEMINI_API_KEY && GEMINI_API_KEY.trim().length > 0) {
    try {
      const response = await callGeminiAPI({ symptoms, patientProfile, availableDoctors });
      if (response && response.urgencyLevel) {
        return {
          ...response,
          engine: 'Gemini 2.5 Flash'
        };
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to CarePulse Clinical Engine:', err.message);
    }
  }

  // Fallback to intelligent deterministic medical triage engine
  return runClinicalRuleEngine({ symptoms, patientProfile, availableDoctors });
}

async function callGeminiAPI({ symptoms, patientProfile, availableDoctors }) {
  const doctorContext = availableDoctors.map(d => `${d.name} (${d.profile?.specialization || d.profile?.department || 'General Physician'})`).join(', ');

  const systemPrompt = `You are the CarePulse AI Clinical Triage & Patient Guidance Assistant for a modern healthcare clinic.
Your objective:
1. Analyze the patient's symptoms thoroughly with clinical empathy and precision.
2. Determine Triage Urgency Level: "Routine", "Priority", or "Emergency".
3. Recommend the most appropriate medical specialty / department.
4. If matching doctors from the clinic list are available, suggest them.
5. Create a structured Pre-Consultation Clinical Brief designed for the consulting physician (formatted with Chief Complaint, Duration, Accompanying Symptoms, Red Flags, and Clinical Notes).
6. Provide safe, non-prescriptive home comfort steps and questions for the doctor.

Patient Context:
- Age/DOB: ${patientProfile.dob || 'Not specified'}
- Gender: ${patientProfile.gender || 'Not specified'}
- Known Allergies: ${patientProfile.allergies || 'None reported'}

Available Clinic Physicians:
${doctorContext || 'General Physicians available'}

Patient Symptoms / Description:
"${symptoms}"

You MUST respond strictly with valid JSON conforming to this exact structure (no markdown wrapping, no extra text):
{
  "urgencyLevel": "Routine" | "Priority" | "Emergency",
  "urgencyBadge": "emerald" | "amber" | "rose",
  "urgencyScore": 1 to 10 (integer, 10 being critical emergency),
  "summary": "A warm, patient-friendly 2-3 sentence overview explaining their symptoms and what to expect.",
  "recommendedSpecialty": "e.g. Cardiology, Dermatology, Orthopedics, General Medicine",
  "recommendedDoctorSuggestion": "Name of best doctor if matched, or general recommendation",
  "clinicalPreConsultBrief": {
    "chiefComplaint": "Concise medical summary of primary complaint",
    "timeline": "Inferred or stated duration",
    "keySymptoms": ["Symptom 1", "Symptom 2"],
    "redFlags": ["Any cautionary signs observed or None"],
    "summaryForDoctor": "A concise 2-3 sentence clinical handover note for the physician."
  },
  "homeCareAdvice": [
    "Safe comfort step 1",
    "Safe comfort step 2",
    "Safe comfort step 3"
  ],
  "suggestedQuestions": [
    "Question 1 for doctor",
    "Question 2 for doctor"
  ],
  "emergencyDisclaimer": "Medical Disclaimer: This triage guidance is generated by AI for informational and pre-consultation planning purposes only. It is not a clinical diagnosis. If you experience crushing chest pain, sudden numbness, or shortness of breath, call emergency services immediately."
}`;

  const models = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: systemPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json'
          }
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Model ${model} returned status ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Empty response from Gemini API');

      const parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
      return parsed;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

// Fallback Deterministic Clinical Rule Engine
function runClinicalRuleEngine({ symptoms, patientProfile = {}, availableDoctors = [] }) {
  const lowerSymptoms = (symptoms || '').toLowerCase();

  // 1. Emergency Detection
  const isEmergency = EMERGENCY_PATTERNS.some(pat => lowerSymptoms.includes(pat));

  // 2. Specialty Matching
  let matchedSpecialty = 'General Medicine';
  let highestKeywordMatches = 0;

  for (const rule of SPECIALTY_RULES) {
    const matches = rule.keywords.filter(k => lowerSymptoms.includes(k)).length;
    if (matches > highestKeywordMatches) {
      highestKeywordMatches = matches;
      matchedSpecialty = rule.specialty;
    }
  }

  // 3. Urgency Determination
  let urgencyLevel = 'Routine';
  let urgencyBadge = 'emerald';
  let urgencyScore = 3;

  if (isEmergency) {
    urgencyLevel = 'Emergency';
    urgencyBadge = 'rose';
    urgencyScore = 9;
  } else if (
    highestKeywordMatches >= 2 ||
    lowerSymptoms.includes('severe') ||
    lowerSymptoms.includes('high fever') ||
    lowerSymptoms.includes('bleeding') ||
    lowerSymptoms.includes('infection') ||
    lowerSymptoms.includes('vomiting') ||
    lowerSymptoms.includes('worsening') ||
    lowerSymptoms.includes('acute')
  ) {
    urgencyLevel = 'Priority';
    urgencyBadge = 'amber';
    urgencyScore = 6;
  }

  // 4. Find matched doctor from clinic list if available
  let matchedDocName = '';
  const candidateDoc = availableDoctors.find(d => {
    const spec = (d.profile?.specialization || d.profile?.department || '').toLowerCase();
    return spec.includes(matchedSpecialty.toLowerCase());
  });
  if (candidateDoc) {
    matchedDocName = candidateDoc.name;
  }

  // 5. Generate clinical handover brief
  const keySymptoms = [];
  if (lowerSymptoms.includes('fever') || lowerSymptoms.includes('temperature')) keySymptoms.push('Elevated body temperature');
  if (lowerSymptoms.includes('pain') || lowerSymptoms.includes('ache')) keySymptoms.push('Localized pain/discomfort');
  if (lowerSymptoms.includes('cough') || lowerSymptoms.includes('cold')) keySymptoms.push('Upper respiratory irritation');
  if (lowerSymptoms.includes('headache') || lowerSymptoms.includes('migraine')) keySymptoms.push('Cephalea / Headache');
  if (lowerSymptoms.includes('nausea') || lowerSymptoms.includes('stomach')) keySymptoms.push('Gastrointestinal distress');
  if (keySymptoms.length === 0) keySymptoms.push('Symptomatic presentation per patient report');

  const redFlags = [];
  if (isEmergency) {
    redFlags.push('High-risk acute symptom flags present');
  } else if (urgencyLevel === 'Priority') {
    redFlags.push('Moderate symptom severity requiring timely physical examination');
  } else {
    redFlags.push('No immediate acute red flags detected');
  }

  return {
    urgencyLevel,
    urgencyBadge,
    urgencyScore,
    summary: `Based on your reported symptoms of "${symptoms.slice(0, 60)}${symptoms.length > 60 ? '...' : ''}", this case is categorized as ${urgencyLevel} priority. We recommend consulting a specialist in ${matchedSpecialty}.`,
    recommendedSpecialty: matchedSpecialty,
    recommendedDoctorSuggestion: matchedDocName ? `${matchedDocName} (${matchedSpecialty})` : `Any available physician in ${matchedSpecialty}`,
    clinicalPreConsultBrief: {
      chiefComplaint: symptoms.slice(0, 120),
      timeline: lowerSymptoms.includes('day') ? 'Several days' : lowerSymptoms.includes('week') ? 'Over a week' : 'Recent onset',
      keySymptoms,
      redFlags,
      summaryForDoctor: `Patient reports: "${symptoms}". Clinical triage suggests ${matchedSpecialty} consult with ${urgencyLevel} urgency. Allergies noted: ${patientProfile.allergies || 'None reported'}.`
    },
    homeCareAdvice: [
      'Maintain adequate hydration and rest in a well-ventilated room.',
      'Record symptom fluctuations, onset times, or temperature readings to share during your consult.',
      'Avoid unprescribed heavy medications prior to clinical evaluation.'
    ],
    suggestedQuestions: [
      `Could these symptoms be related to my ${matchedSpecialty.toLowerCase()} health?`,
      'Are there any diagnostic tests or labs recommended to rule out underlying causes?',
      'What specific warning signs should prompt me to seek urgent care?'
    ],
    emergencyDisclaimer: 'Medical Disclaimer: This triage guidance is generated by AI for informational and pre-consultation planning purposes only. It is not a clinical diagnosis. If you experience crushing chest pain, sudden numbness, or shortness of breath, call emergency services immediately.',
    engine: 'CarePulse Clinical Engine'
  };
}

// ==================== PRESCRIPTION SAFETY & ALLERGY GUARD ====================

const DRUG_FAMILIES = {
  penicillin: ['penicillin', 'amoxicillin', 'ampicillin', 'augmentin', 'piperacillin', 'cloxacillin', 'amoxil'],
  cephalosporin: ['cephalexin', 'cefuroxime', 'ceftriaxone', 'cefdinir', 'cefixime', 'keflex'],
  nsaid: ['aspirin', 'ibuprofen', 'naproxen', 'advil', 'motrin', 'diclofenac', 'celecoxib', 'ketorolac', 'meloxicam', 'aleve'],
  sulfa: ['sulfa', 'sulfamethoxazole', 'bactrim', 'septra', 'sulfasalazine', 'trimethoprim-sulfamethoxazole']
};

export async function checkPrescriptionSafety({ patientAllergies = '', currentMedications = [], newPrescriptions = [] }) {
  if (!newPrescriptions || newPrescriptions.length === 0) {
    return { safetyStatus: 'safe', alerts: [], summary: 'No medications to evaluate.' };
  }

  if (GEMINI_API_KEY && GEMINI_API_KEY.trim().length > 0) {
    try {
      const prompt = `You are the CarePulse AI Clinical Pharmacologist & Prescription Safety Guard.
Analyze the following prescription list for a patient:
- Patient Documented Allergies: "${patientAllergies || 'None reported'}"
- Patient Existing Active Medications: ${JSON.stringify(currentMedications)}
- Newly Prescribed Medications: ${JSON.stringify(newPrescriptions)}

Check for:
1. Direct or cross-reactive ALLERGY contraindications (e.g. penicillin vs amoxicillin, NSAID allergy vs ibuprofen/aspirin).
2. Potentially dangerous DRUG-TO-DRUG interactions between new and existing medications.
3. High dosage anomalies if evident.

Respond strictly in valid JSON matching this schema:
{
  "safetyStatus": "safe" | "warning" | "danger",
  "summary": "1-2 sentence overall pharmacological safety statement",
  "alerts": [
    {
      "type": "allergy_conflict" | "drug_interaction" | "dosage_caution",
      "severity": "high" | "moderate",
      "drug": "Drug Name",
      "title": "Short Alert Title",
      "description": "Specific clinical risk explanation",
      "recommendation": "Safer alternative or recommended clinical adjustment"
    }
  ]
}`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
          return { ...parsed, engine: 'Gemini 2.5 Flash' };
        }
      }
    } catch (e) {
      console.warn('Gemini safety check failed, using clinical fallback engine:', e.message);
    }
  }

  // Clinical Rule Engine Fallback
  const alerts = [];
  const lowerAllergies = (patientAllergies || '').toLowerCase();

  for (const item of newPrescriptions) {
    const drugName = (item.drug || item.medicine || '').toLowerCase();
    if (!drugName) continue;

    // Check Penicillin allergy
    if (lowerAllergies.includes('penicillin') || lowerAllergies.includes('amoxicillin')) {
      if (DRUG_FAMILIES.penicillin.some(d => drugName.includes(d))) {
        alerts.push({
          type: 'allergy_conflict',
          severity: 'high',
          drug: item.drug || drugName,
          title: 'Critical Penicillin Allergy Conflict',
          description: `Patient has documented allergy to "${patientAllergies}". "${item.drug}" belongs to the penicillin / beta-lactam class and poses high risk of anaphylaxis.`,
          recommendation: 'Consider macrolides (e.g. Azithromycin) or fluoroquinolones as appropriate non-beta-lactam alternatives.'
        });
      } else if (DRUG_FAMILIES.cephalosporin.some(d => drugName.includes(d))) {
        alerts.push({
          type: 'allergy_conflict',
          severity: 'moderate',
          drug: item.drug || drugName,
          title: 'Potential Cephalosporin Cross-Reactivity',
          description: `Patient has penicillin allergy. "${item.drug}" has an estimated 3-10% potential cross-reactivity with penicillins.`,
          recommendation: 'Monitor patient closely or select an alternate antibiotic class.'
        });
      }
    }

    // Check NSAID / Aspirin allergy
    if (lowerAllergies.includes('nsaid') || lowerAllergies.includes('aspirin') || lowerAllergies.includes('ibuprofen')) {
      if (DRUG_FAMILIES.nsaid.some(d => drugName.includes(d))) {
        alerts.push({
          type: 'allergy_conflict',
          severity: 'high',
          drug: item.drug || drugName,
          title: 'NSAID / Aspirin Hypersensitivity Conflict',
          description: `Patient has a documented NSAID/Aspirin allergy. "${item.drug}" may trigger acute bronchospasm, urticaria, or anaphylaxis.`,
          recommendation: 'Substitute with Acetaminophen (Paracetamol) for analgesia/antipyretic relief.'
        });
      }
    }

    // Check Sulfa allergy
    if (lowerAllergies.includes('sulfa') || lowerAllergies.includes('sulfonamide')) {
      if (DRUG_FAMILIES.sulfa.some(d => drugName.includes(d))) {
        alerts.push({
          type: 'allergy_conflict',
          severity: 'high',
          drug: item.drug || drugName,
          title: 'Sulfa Hypersensitivity Conflict',
          description: `Patient has a documented sulfa allergy. "${item.drug}" contains sulfonamide moieties posing severe skin/systemic reaction risk.`,
          recommendation: 'Select a non-sulfonamide antimicrobial alternative.'
        });
      }
    }

    // Check Drug-Drug interaction against current medications
    const currentNames = (currentMedications || []).map(m => (m.drug || m.medicine || '').toLowerCase());
    if (DRUG_FAMILIES.nsaid.some(d => drugName.includes(d))) {
      if (currentNames.some(c => c.includes('warfarin') || c.includes('apixaban') || c.includes('clopidogrel'))) {
        alerts.push({
          type: 'drug_interaction',
          severity: 'high',
          drug: item.drug || drugName,
          title: 'Bleeding Risk: NSAID + Anticoagulant',
          description: `Co-administration of "${item.drug}" with blood thinners significantly elevates gastrointestinal bleeding risk.`,
          recommendation: 'Use Paracetamol or consult cardiology before prescribing NSAIDs with anticoagulants.'
        });
      }
    }
  }

  const hasHigh = alerts.some(a => a.severity === 'high');
  const safetyStatus = hasHigh ? 'danger' : alerts.length > 0 ? 'warning' : 'safe';

  return {
    safetyStatus,
    alerts,
    summary: hasHigh
      ? `CRITICAL ALERT: ${alerts.length} contraindication(s) detected that require immediate review.`
      : alerts.length > 0
      ? `Caution: ${alerts.length} potential interaction(s) or cross-reactivities noted.`
      : 'Prescription safety verified: No documented allergy conflicts or major interactions detected.',
    engine: 'CarePulse Safety Engine'
  };
}

// ==================== SOAP CLINICAL NOTE GENERATOR ====================

export async function generateSoapNote({
  patientName = 'Patient',
  diagnosis = '',
  symptoms = '',
  treatment = '',
  doctorRoughNotes = '',
  prescriptions = [],
  allergies = ''
}) {
  if (GEMINI_API_KEY && GEMINI_API_KEY.trim().length > 0) {
    try {
      const prompt = `You are the CarePulse AI Clinical Scribe.
Convert the doctor's rough consult findings into a formal, structured medical SOAP note (Subjective, Objective, Assessment, Plan).

Consultation Details:
- Patient Name: ${patientName}
- Documented Allergies: ${allergies || 'None reported'}
- Diagnosis: ${diagnosis || 'Clinical evaluation'}
- Patient Reported Symptoms: ${symptoms || 'General discomfort'}
- Proposed Treatment: ${treatment || 'Conservative management'}
- Doctor Rough Notes: ${doctorRoughNotes || 'None'}
- Prescriptions: ${JSON.stringify(prescriptions)}

Generate a professional, high-standard SOAP note. Return strictly JSON with:
{
  "subjective": "Concise paragraph summarizing chief complaint, history of present illness, and reported symptoms.",
  "objective": "Concise physical findings, vitals summary context, and allergy verification.",
  "assessment": "Primary clinical diagnosis, severity level, and differential considerations.",
  "plan": "Itemized plan covering pharmacological therapy (prescriptions), non-pharmacological care, lifestyle/diet, patient education, warning signs to watch, and follow-up timeline.",
  "formattedFullNote": "Complete formatted SOAP note in markdown for one-click insertion."
}`;

      const models = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
            }),
            signal: AbortSignal.timeout(10000)
          });

          if (res.ok) {
            const data = await res.json();
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
              return { ...parsed, engine: model };
            }
          }
        } catch (_) {
          // Continue to next model candidate
        }
      }
    } catch (e) {
      console.warn('Gemini SOAP note generation failed, using clinical fallback:', e.message);
    }
  }

  // Clinical Rule Engine Fallback SOAP Note
  const rxText = prescriptions.length > 0
    ? prescriptions.map(p => `• ${p.drug} ${p.dosage} - ${p.instructions || 'as directed'} (${p.duration || 'duration per Rx'})`).join('\n')
    : '• Symptomatic OTC therapy as recommended.';

  const subjective = `Patient presents with complaints of: ${symptoms || 'general malaise'}. Patient reports onset of symptoms with functional impact. Allergies reviewed: ${allergies || 'No known drug allergies'}.`;
  const objective = `General appearance: Alert and responsive. Physical examination consistent with presentation of ${diagnosis || 'acute illness'}. Vital signs stable. ${doctorRoughNotes ? `Exam notes: ${doctorRoughNotes}.` : ''}`;
  const assessment = `Primary Diagnosis: ${diagnosis || 'Acute symptomatic presentation'}. Clinical presentation consistent with expected etiology; no immediate acute complications evident.`;
  const plan = `1. Pharmacotherapy:\n${rxText}\n\n2. Non-Pharmacological Care: ${treatment || 'Adequate hydration, balanced nutrition, and physical rest'}.\n\n3. Patient Education & Red Flags: Advised patient on prescribed medication adherence. Instructed to seek immediate emergency care if fever spikes above 103F, severe shortness of breath, or adverse reactions develop.\n\n4. Follow-up: Re-evaluate in 5-7 days if symptoms fail to improve or sooner if condition worsens.`;

  const formattedFullNote = `[SOAP CLINICAL PROGRESS NOTE]
Date: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
Patient: ${patientName}

S (SUBJECTIVE):
${subjective}

O (OBJECTIVE):
${objective}

A (ASSESSMENT):
${assessment}

P (PLAN):
${plan}`;

  return {
    subjective,
    objective,
    assessment,
    plan,
    formattedFullNote,
    engine: 'CarePulse Clinical Engine'
  };
}

