'use client';

import React, { useState } from 'react';

const QUICK_PROMPTS = [
  { label: 'Persistent Cough & Fever', text: 'Dry cough for 3 days with intermittent fever reaching 101F, mild chest tightness and fatigue.' },
  { label: 'Severe Migraine', text: 'Throbbing headache behind right eye since yesterday, light sensitivity, and mild nausea.' },
  { label: 'Lower Back & Leg Pain', text: 'Sharp lower back pain for 4 days radiating down the left leg, aggravated by sitting.' },
  { label: 'Spreading Skin Rash', text: 'Red itchy rash on both forearms appearing over the last 48 hours, slightly raised and warm to touch.' },
  { label: 'Stomach Acid & Indigestion', text: 'Burning stomach pain and acid reflux after meals for 2 weeks, accompanied by bloating.' },
  { label: 'Chest Tightness on Exertion', text: 'Mild tightness in center of chest when climbing stairs, resolving after resting for 5 minutes.' }
];

export default function AiSymptomTriage({ user, doctors = [], onSelectDoctorForBooking }) {
  const [symptomsInput, setSymptomsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [triageData, setTriageData] = useState(null);
  const [error, setError] = useState('');

  const handleRunTriage = async (textToAnalyze) => {
    const text = (typeof textToAnalyze === 'string' ? textToAnalyze : symptomsInput).trim();
    if (!text) {
      setError('Please provide a description of your symptoms.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/symptom-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: text })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete AI triage analysis.');
      }

      setTriageData(data);
    } catch (err) {
      console.error('AI Triage error:', err);
      setError(err.message || 'Network error occurred during AI analysis. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPromptClick = (text) => {
    setSymptomsInput(text);
    handleRunTriage(text);
  };

  // Find a matching doctor from clinic doctors list
  const getMatchedDoctor = () => {
    if (!triageData?.recommendedSpecialty) return null;
    const recSpec = triageData.recommendedSpecialty.toLowerCase();
    
    // Exact or partial specialty / department match
    const matched = doctors.find((doc) => {
      const spec = (doc.profile?.specialization || '').toLowerCase();
      const dept = (doc.profile?.department || '').toLowerCase();
      return spec.includes(recSpec) || dept.includes(recSpec) || recSpec.includes(spec) || recSpec.includes(dept);
    });

    return matched || (doctors.length > 0 ? doctors[0] : null);
  };

  const matchedDoctor = getMatchedDoctor();

  const handleBookWithDoctor = () => {
    if (!triageData) return;
    
    // Formulate a clean, structured booking reason containing the patient's complaint and AI handover summary
    const brief = triageData.clinicalPreConsultBrief?.summaryForDoctor || triageData.summary;
    const formattedReason = `${symptomsInput}\n\n[AI Triage - ${triageData.urgencyLevel} Priority]: ${brief}`;

    if (onSelectDoctorForBooking) {
      onSelectDoctorForBooking(matchedDoctor?.id || '', formattedReason);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-cyan-950/60 via-zinc-900 to-indigo-950/60 border border-cyan-500/20 rounded-3xl p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-52 h-52 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-3">
              <span className="animate-pulse">✨</span>
              <span>CarePulse AI Clinical Assistant</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Pre-Consultation Symptom Triage & Guidance
            </h2>
            <p className="text-xs md:text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Describe your symptoms in your own words. CarePulse AI evaluates clinical urgency, matches the appropriate medical specialty, and prepares a structured handover brief for your physician.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-[11px] text-zinc-400 bg-zinc-950/60 border border-zinc-800 px-3 py-1.5 rounded-xl font-mono">
              Engine: <span className="text-cyan-400 font-semibold">{triageData?.engine || 'Gemini 2.5 Flash'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Input & Analysis Section */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6">
        <div>
          <label htmlFor="symptoms-input" className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
            Describe What You Are Feeling *
          </label>
          <div className="relative">
            <textarea
              id="symptoms-input"
              rows={4}
              value={symptomsInput}
              onChange={(e) => setSymptomsInput(e.target.value)}
              placeholder="e.g. I have had a continuous throbbing headache on one side of my forehead for the last 3 days, worse when looking at bright screens, along with mild nausea..."
              className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-cyan-500 rounded-2xl p-4 text-xs md:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all resize-y"
            />
            <div className="absolute bottom-3 right-4 text-[10px] text-zinc-500 font-mono">
              {symptomsInput.length} chars
            </div>
          </div>
        </div>

        {/* Quick Symptom Starter Chips */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
            Or Click a Sample Symptom Presentation:
          </span>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                onClick={() => handleQuickPromptClick(prompt.text)}
                className="text-xs bg-zinc-950 border border-zinc-850 hover:border-cyan-500/50 hover:text-cyan-300 text-zinc-400 px-3 py-1.5 rounded-xl transition-all cursor-pointer text-left"
              >
                + {prompt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-rose-950/40 border border-rose-800 text-rose-300 p-4 rounded-2xl text-xs flex items-center space-x-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-zinc-850">
          <div className="text-[11px] text-zinc-500 flex items-center space-x-2">
            <span>🛡️</span>
            <span>All reported symptoms are encrypted & analyzed strictly for pre-consult preparation.</span>
          </div>

          <button
            type="button"
            onClick={() => handleRunTriage(symptomsInput)}
            disabled={loading || !symptomsInput.trim()}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold text-xs tracking-wide shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-zinc-950" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Evaluating Clinical Context...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>Evaluate Symptoms with AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Triage Output Dashboard */}
      {triageData && (
        <div className="space-y-6 animate-fadeIn">
          {/* Urgency Alert Header */}
          <div className={`p-6 rounded-3xl border transition-all ${
            triageData.urgencyLevel === 'Emergency'
              ? 'bg-rose-950/40 border-rose-600 text-rose-100 shadow-xl shadow-rose-900/20'
              : triageData.urgencyLevel === 'Priority'
              ? 'bg-amber-950/30 border-amber-600/50 text-amber-100'
              : 'bg-emerald-950/30 border-emerald-600/50 text-emerald-100'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0 ${
                  triageData.urgencyLevel === 'Emergency'
                    ? 'bg-rose-500 text-white animate-bounce'
                    : triageData.urgencyLevel === 'Priority'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {triageData.urgencyLevel === 'Emergency' ? '🚨' : triageData.urgencyLevel === 'Priority' ? '⚠️' : '✅'}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs uppercase font-extrabold tracking-widest opacity-80">
                      Triage Urgency Rating
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-black/40 border border-white/10">
                      Score: {triageData.urgencyScore || 3}/10
                    </span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight mt-0.5">
                    {triageData.urgencyLevel} Care Recommended
                  </h3>
                </div>
              </div>

              {/* Specialty Recommendation Tag */}
              <div className="bg-black/30 border border-white/10 px-4 py-2.5 rounded-2xl text-left md:text-right">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Recommended Specialty</span>
                <span className="text-sm font-bold text-cyan-300">
                  🩺 {triageData.recommendedSpecialty || 'General Medicine'}
                </span>
              </div>
            </div>

            <p className="mt-4 text-xs md:text-sm text-zinc-200 leading-relaxed border-t border-white/10 pt-3">
              {triageData.summary}
            </p>

            {triageData.urgencyLevel === 'Emergency' && (
              <div className="mt-4 p-3 bg-rose-600/30 border border-rose-500/40 rounded-xl text-xs font-semibold text-rose-200 flex items-center space-x-2">
                <span>⚠️</span>
                <span>Immediate Attention: If experiencing crushing chest pain, difficulty breathing, or sudden numbness, contact local emergency services immediately (911 / 112).</span>
              </div>
            )}
          </div>

          {/* Specialty & Doctor Match Card */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-cyan-950/30 border border-zinc-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                Clinic Physician Matching
              </span>
              <h4 className="text-base md:text-lg font-bold text-white">
                {matchedDoctor ? `Consult with Dr. ${matchedDoctor.name}` : `Specialist in ${triageData.recommendedSpecialty}`}
              </h4>
              <p className="text-xs text-zinc-400 max-w-xl">
                {matchedDoctor ? (
                  <>
                    Specialized in <strong className="text-zinc-200">{matchedDoctor.profile?.specialization || matchedDoctor.profile?.department || 'General Practice'}</strong>. Pre-filling your booking automatically attaches this AI Clinical Brief so the doctor can review your symptoms before you arrive.
                  </>
                ) : (
                  <>
                    No dedicated physician in {triageData.recommendedSpecialty} found. You can book a consultation with our General Physicians for initial assessment.
                  </>
                )}
              </p>
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={handleBookWithDoctor}
                className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-extrabold text-xs shadow-xl shadow-cyan-500/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>📅</span>
                <span>Book Appointment & Attach AI Brief</span>
              </button>
            </div>
          </div>

          {/* Two-Column Grid: Doctor Pre-Consult Handover Brief & Patient Advice */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Doctor Handover Brief */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📋</span>
                  <h4 className="text-sm font-bold text-white">Clinical Pre-Consult Brief</h4>
                </div>
                <span className="text-[10px] text-cyan-400 bg-cyan-950 border border-cyan-800 px-2.5 py-0.5 rounded-full font-mono">
                  For Physician
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">Chief Complaint</span>
                  <p className="text-zinc-200 mt-0.5 font-medium">
                    {triageData.clinicalPreConsultBrief?.chiefComplaint || symptomsInput}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">Reported Timeline</span>
                  <p className="text-zinc-300 mt-0.5">
                    {triageData.clinicalPreConsultBrief?.timeline || 'Acute / Recent presentation'}
                  </p>
                </div>

                {triageData.clinicalPreConsultBrief?.keySymptoms?.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Identified Clinical Signs</span>
                    <div className="flex flex-wrap gap-1.5">
                      {triageData.clinicalPreConsultBrief.keySymptoms.map((sym, idx) => (
                        <span key={idx} className="bg-zinc-950 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg text-[11px]">
                          • {sym}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {triageData.clinicalPreConsultBrief?.redFlags?.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Risk Factors & Flags</span>
                    <div className="flex flex-wrap gap-1.5">
                      {triageData.clinicalPreConsultBrief.redFlags.map((flag, idx) => (
                        <span key={idx} className="bg-zinc-950 border border-amber-900/40 text-amber-300 px-2.5 py-1 rounded-lg text-[11px]">
                          ⚠️ {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-zinc-950 border border-zinc-850 p-3.5 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-cyan-400 block mb-1">Doctor Handover Summary</span>
                  <p className="text-zinc-300 text-xs italic leading-relaxed">
                    &ldquo;{triageData.clinicalPreConsultBrief?.summaryForDoctor || triageData.summary}&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* Patient Home Care & Questions for Doctor */}
            <div className="space-y-6">
              {/* Home Comfort Steps */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-3">
                <div className="flex items-center space-x-2 border-b border-zinc-850 pb-3">
                  <span className="text-lg">🌿</span>
                  <h4 className="text-sm font-bold text-white">Safe Comfort & Pre-Care Steps</h4>
                </div>
                <ul className="space-y-2 text-xs text-zinc-300">
                  {(triageData.homeCareAdvice || [
                    'Maintain adequate hydration and rest in a well-ventilated room.',
                    'Keep a record of your symptom changes or temperature readings.',
                    'Avoid taking unprescribed heavy medications before clinical evaluation.'
                  ]).map((tip, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-cyan-400 font-bold shrink-0">{idx + 1}.</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Questions for Doctor */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-3">
                <div className="flex items-center space-x-2 border-b border-zinc-850 pb-3">
                  <span className="text-lg">💬</span>
                  <h4 className="text-sm font-bold text-white">Questions to Ask Your Doctor</h4>
                </div>
                <div className="space-y-2">
                  {(triageData.suggestedQuestions || [
                    'What could be the primary cause of these symptoms?',
                    'Are there any diagnostic tests or labs recommended to rule out underlying conditions?',
                    'What warning signs should prompt me to seek immediate care?'
                  ]).map((q, idx) => (
                    <div key={idx} className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-xs text-zinc-300 flex items-start space-x-2">
                      <span className="text-indigo-400 font-bold shrink-0">Q:</span>
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Medical Disclaimer */}
          <div className="p-4 bg-zinc-950/80 border border-zinc-850 rounded-2xl text-[11px] text-zinc-500 leading-relaxed text-center">
            {triageData.emergencyDisclaimer || 'Medical Disclaimer: This triage guidance is generated by AI for informational and pre-consultation planning purposes only. It is not a clinical diagnosis. Always consult a licensed healthcare professional for medical emergencies.'}
          </div>
        </div>
      )}
    </div>
  );
}
