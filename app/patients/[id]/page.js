'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PatientProfilePage({ params }) {
  const { user } = useAuth();
  const router = useRouter();

  // Unwrap params safely (Next.js/React 19 App Router standard)
  const resolvedParams = params && typeof params.then === 'function' ? use(params) : params;
  const patientId = resolvedParams?.id;

  // Authorization Locks
  useEffect(() => {
    if (user && user.role === 'patient' && user.id !== patientId) {
      router.push('/patient');
    }
  }, [user, patientId, router]);

  // Tab State
  const [activeSubTab, setActiveSubTab] = useState('overview'); // overview | appointments | history | prescriptions | labs | billing

  // Data States
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Secure Messaging States
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await fetch(`/api/messages?recipientId=${patientId}`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  }, [patientId]);

  useEffect(() => {
    if (activeSubTab !== 'messages' || !patientId) return;

    setTimeout(() => {
      fetchMessages();
    }, 0);

    let interval;
    const startPolling = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        if (!document.hidden) {
          fetchMessages();
        }
      }, 3000);
    };

    startPolling();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(interval);
        interval = null;
      } else {
        fetchMessages();
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeSubTab, patientId, fetchMessages]);

  useEffect(() => {
    const container = document.getElementById('patient-detail-chat-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [chatMessages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !patientId || sendingMsg) return;

    setSendingMsg(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: patientId,
          content: newMessageText.trim()
        })
      });

      if (res.ok) {
        const newMsg = await res.json();
        setChatMessages(prev => [...prev, newMsg]);
        setNewMessageText('');
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSendingMsg(false);
    }
  };

  // Form States: New Medical Record
  const [diagFinding, setDiagFinding] = useState('');
  const [diagSymptoms, setDiagSymptoms] = useState('');
  const [diagTreatment, setDiagTreatment] = useState('');
  const [diagNotes, setDiagNotes] = useState('');
  const [rxList, setRxList] = useState([]);
  const [newDrug, setNewDrug] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [recordSuccess, setRecordSuccess] = useState('');
  const [recordError, setRecordError] = useState('');
  const [recordLoading, setRecordLoading] = useState(false);

  // Form States: Order Lab Test
  const [testName, setTestName] = useState('Complete Blood Count (CBC)');
  const [labSuccess, setLabSuccess] = useState('');
  const [labError, setLabError] = useState('');
  const [labLoading, setLabLoading] = useState(false);

  // Form States: Enter Lab Result
  const [updatingLabId, setUpdatingLabId] = useState('');
  const [labResult, setLabResult] = useState('');
  const [labNotes, setLabNotes] = useState('');
  const [updatingLabLoading, setUpdatingLabLoading] = useState(false);

  // Form States: Add Invoice
  const [invoiceDesc, setInvoiceDesc] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceSuccess, setInvoiceSuccess] = useState('');
  const [invoiceError, setInvoiceError] = useState('');
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // Print Prescription Prescription Modal Receipt simulation
  const [printingRx, setPrintingRx] = useState(null);

  const getRoleTitle = () => {
    if (!user) return 'Workspace';
    if (user.role === 'admin') return 'Administrator';
    if (user.role === 'doctor') return 'Doctor Portal';
    if (user.role === 'receptionist') return 'Receptionist';
    return 'Patient Portal';
  };

  const fetchData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [userRes, aptRes, recRes, labRes, invRes] = await Promise.all([
        fetch('/api/users'),
        fetch(`/api/appointments?patientId=${patientId}`),
        fetch(`/api/records?patientId=${patientId}`),
        fetch(`/api/lab-reports?patientId=${patientId}`),
        fetch(`/api/billing?patientId=${patientId}`)
      ]);

      if (userRes.ok && aptRes.ok && recRes.ok && labRes.ok && invRes.ok) {
        const allUsers = await userRes.json();
        const currentPat = allUsers.find(u => u.id === patientId && u.role === 'patient');
        if (!currentPat) {
          router.push('/patients');
          return;
        }
        setPatient(currentPat);
        setAppointments(await aptRes.json());
        setRecords(await recRes.json());
        setLabReports(await labRes.json());
        setInvoices(await invRes.json());
      }
    } catch (err) {
      console.error("EHR patient data load error:", err);
    } finally {
      setLoadingData(false);
    }
  }, [patientId, router]);

  useEffect(() => {
    let active = true;
    if (user && patientId) {
      setTimeout(() => {
        if (active) fetchData();
      }, 0);
    }
    return () => {
      active = false;
    };
  }, [user, patientId, fetchData]);

  // Record submission handlers
  const addRxItem = (e) => {
    e.preventDefault();
    if (!newDrug || !newDosage) return;
    setRxList([...rxList, {
      drug: newDrug,
      dosage: newDosage,
      duration: newDuration || 'As needed',
      instructions: newInstructions || 'Take with water'
    }]);
    setNewDrug('');
    setNewDosage('');
    setNewDuration('');
    setNewInstructions('');
  };

  const removeRxItem = (idx) => {
    setRxList(rxList.filter((_, i) => i !== idx));
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    setRecordSuccess('');
    setRecordError('');
    if (!diagFinding) {
      setRecordError('Diagnosis findings are required.');
      return;
    }

    setRecordLoading(true);
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          diagnosis: diagFinding,
          symptoms: diagSymptoms,
          treatment: diagTreatment,
          prescription: rxList,
          notes: diagNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit report');
      setRecordSuccess('Consultation record successfully saved to EHR history.');
      setDiagFinding('');
      setDiagSymptoms('');
      setDiagTreatment('');
      setDiagNotes('');
      setRxList([]);
      fetchData();
    } catch (err) {
      setRecordError(err.message || 'An error occurred.');
    } finally {
      setRecordLoading(false);
    }
  };

  // Lab test handlers
  const handleOrderLab = async (e) => {
    e.preventDefault();
    setLabSuccess('');
    setLabError('');
    setLabLoading(true);
    try {
      const res = await fetch('/api/lab-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, testName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to order lab');
      setLabSuccess('Laboratory test successfully ordered.');
      fetchData();
    } catch (err) {
      setLabError(err.message || 'An error occurred.');
    } finally {
      setLabLoading(false);
    }
  };

  const handleFillLabResult = async (e) => {
    e.preventDefault();
    setUpdatingLabLoading(true);
    try {
      const res = await fetch('/api/lab-reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: updatingLabId,
          result: labResult,
          notes: labNotes,
          status: 'completed'
        })
      });
      if (res.ok) {
        setUpdatingLabId('');
        setLabResult('');
        setLabNotes('');
        fetchData();
      }
    } catch (err) {
      console.error("Failed to update lab reports:", err);
    } finally {
      setUpdatingLabLoading(false);
    }
  };

  // Billing Invoice Handlers
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setInvoiceSuccess('');
    setInvoiceError('');
    if (!invoiceDesc || !invoiceAmount) {
      setInvoiceError('Description and Amount are required.');
      return;
    }

    setInvoiceLoading(true);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          description: invoiceDesc,
          amount: invoiceAmount
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create bill');
      setInvoiceSuccess('Billing invoice successfully generated.');
      setInvoiceDesc('');
      setInvoiceAmount('');
      fetchData();
    } catch (err) {
      setInvoiceError(err.message || 'An error occurred.');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handlePayInvoice = async (id) => {
    try {
      const res = await fetch('/api/billing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'paid' })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to process payment:", err);
    }
  };

  // Tab calculations
  const totalOutstanding = invoices
    .filter(i => i.status === 'unpaid')
    .reduce((sum, i) => sum + i.amount, 0);

  const recentRecord = records.sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  const activeMedications = records.reduce((arr, r) => {
    if (r.prescription) arr.push(...r.prescription);
    return arr;
  }, []);

  if (user && user.role === 'patient' && user.id !== patientId) {
    return null;
  }

  return (
    <DashboardLayout
      roleTitle={getRoleTitle()}
      activeTab="patients"
    >
      <div className="space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-2">
          {user?.role !== 'patient' ? (
            <Link
              href="/patients"
              className="flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <span>⬅️</span>
              <span>Back to Patients Registry</span>
            </Link>
          ) : (
            <span className="text-xs text-zinc-550">Electronic Health File Terminal</span>
          )}
        </div>

        {loadingData || !patient ? (
          <div className="flex flex-col items-center justify-center p-24 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
            <p className="text-zinc-555 text-xs font-mono">Loading patient electronic file...</p>
          </div>
        ) : (
          <>
            {/* Demographic Card Header */}
            <div className="bg-zinc-900/40 border border-zinc-850/80 p-6 rounded-2xl relative overflow-hidden flex flex-col md:flex-row md:justify-between items-start md:items-center gap-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center space-x-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-500 p-[1.5px] shadow-lg shadow-cyan-500/10">
                  <div className="h-full w-full bg-zinc-950 rounded-2xl flex items-center justify-center text-3xl">
                    👤
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{patient.name}</h2>
                  <span className="text-[10px] text-zinc-500 font-mono tracking-wider">File: {patient.id}</span>
                  <span className="block text-[11px] text-zinc-400 mt-1 font-semibold">Emergency: {patient.profile?.emergencyContact || 'None listed'}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-[10px] uppercase font-bold text-zinc-400">
                <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-850">
                  Gender: <span className="text-white">{patient.profile?.gender || 'Not Set'}</span>
                </div>
                <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-855">
                  Blood Group: <span className="text-cyan-400 font-mono font-extrabold">{patient.profile?.bloodGroup || 'Not Set'}</span>
                </div>
                <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-855">
                  DOB: <span className="text-indigo-400 font-mono">{patient.profile?.dob || 'Not Set'}</span>
                </div>
              </div>
            </div>
            {/* Profile sub tabs selector */}
            <div className="flex border-b border-zinc-850 overflow-x-auto space-x-1 pr-4">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'timeline', label: 'Timeline View', icon: '⏳' },
                { id: 'appointments', label: 'Appointments', icon: '📅' },
                { id: 'history', label: 'Medical History', icon: '📝' },
                { id: 'prescriptions', label: 'Prescriptions', icon: '💊' },
                { id: 'labs', label: 'Lab Reports', icon: '🔬' },
                { id: 'billing', label: 'Billing', icon: '💳' },
                { id: 'messages', label: 'Messages', icon: '💬' }
              ].map((subTab) => (
                <button
                  key={subTab.id}
                  onClick={() => setActiveSubTab(subTab.id)}
                  className={`px-4 py-2.5 border-b-2 font-bold text-xs whitespace-nowrap transition-colors flex items-center space-x-1.5 cursor-pointer ${
                    activeSubTab === subTab.id
                      ? 'border-cyan-400 text-cyan-400'
                      : 'border-transparent text-zinc-450 hover:text-white'
                  }`}
                >
                  <span>{subTab.icon}</span>
                  <span>{subTab.label}</span>
                </button>
              ))}
            </div>

            {/* SUB-TABS CONTENT WORKSPACE */}
            <div className="space-y-6 pt-2">
              
              {/* TAB 1: OVERVIEW */}
              {activeSubTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Stats items */}
                  <div className="bg-zinc-900/40 border border-zinc-805 p-5 rounded-2xl space-y-1">
                    <span className="block text-[10px] text-zinc-555 uppercase font-bold tracking-wider">Allergies Status</span>
                    <span className={`text-sm font-semibold block truncate ${patient.profile?.allergies && patient.profile.allergies !== 'None' ? 'text-rose-400' : 'text-zinc-400'}`}>
                      {patient.profile?.allergies || 'None recorded'}
                    </span>
                  </div>

                  <div className="bg-zinc-900/40 border border-zinc-805 p-5 rounded-2xl space-y-1">
                    <span className="block text-[10px] text-zinc-555 uppercase font-bold tracking-wider">Recent Diagnosis</span>
                    <span className="text-sm font-semibold text-white block truncate">
                      {recentRecord ? recentRecord.diagnosis : 'No clinical logs'}
                    </span>
                  </div>

                  <div className="bg-zinc-900/40 border border-zinc-805 p-5 rounded-2xl space-y-1">
                    <span className="block text-[10px] text-zinc-555 uppercase font-bold tracking-wider">Active Medications</span>
                    <span className="text-sm font-semibold text-cyan-400 block font-mono">
                      {activeMedications.length} items prescribed
                    </span>
                  </div>

                  <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-2xl space-y-1">
                    <span className="block text-[10px] text-zinc-555 uppercase font-bold tracking-wider">Outstanding Balance</span>
                    <span className={`text-sm font-semibold block font-mono ${totalOutstanding > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      ${totalOutstanding.toFixed(2)}
                    </span>
                  </div>

                  {/* Summary Demographics detail */}
                  <div className="md:col-span-4 bg-zinc-900/40 border border-zinc-850 p-6 rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider text-indigo-400">Electronic Health File Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs leading-normal">
                      <div className="space-y-1 bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                        <span className="text-zinc-550 block text-[10px] uppercase font-bold">Contact Email</span>
                        <span className="text-zinc-200 block truncate font-mono">{patient.email}</span>
                      </div>
                      <div className="space-y-1 bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                        <span className="text-zinc-550 block text-[10px] uppercase font-bold">Phone Number</span>
                        <span className="text-zinc-200 block font-mono">{patient.profile?.phone || 'Not Specified'}</span>
                      </div>
                      <div className="space-y-1 bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                        <span className="text-zinc-550 block text-[10px] uppercase font-bold">Cabinet DOB</span>
                        <span className="text-zinc-200 block font-mono">{patient.profile?.dob || 'Not Specified'}</span>
                      </div>
                      <div className="space-y-1 bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                        <span className="text-zinc-550 block text-[10px] uppercase font-bold">Emergency Contact</span>
                        <span className="text-zinc-200 block font-sans truncate">{patient.profile?.emergencyContact || 'Not Specified'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 1.5: TIMELINE VIEW */}
              {activeSubTab === 'timeline' && (
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider text-indigo-400">Consolidated Visit Timeline</h3>
                    <p className="text-xs text-zinc-450 mt-1">Review the historical progression of diagnoses, medical procedures, clinical visits, and laboratory panels.</p>
                  </div>

                  <div className="relative border-l border-zinc-800 ml-4 md:ml-6 space-y-8 py-4">
                    {(() => {
                      const timelineEvents = [];

                      appointments.forEach(apt => {
                        timelineEvents.push({
                          id: apt.id,
                          date: apt.date,
                          year: apt.date ? apt.date.split('-')[0] : 'Unknown',
                          type: 'Appointment',
                          icon: '📅',
                          title: 'Clinic Visit Appointment',
                          description: `Scheduled with Dr. ${apt.doctorName}`,
                          detail: `Reason: ${apt.reason || 'General checkup'}`,
                          badge: apt.status,
                          badgeColor: apt.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        });
                      });

                      records.forEach(rec => {
                        const isSurgery = rec.diagnosis?.toLowerCase().includes('surgery') || rec.notes?.toLowerCase().includes('surgery');
                        
                        // Add primary record (Diagnosis or Surgery)
                        timelineEvents.push({
                          id: rec.id,
                          date: rec.date,
                          year: rec.date ? rec.date.split('-')[0] : 'Unknown',
                          type: isSurgery ? 'Surgery' : 'Diagnosis',
                          icon: isSurgery ? '🩺' : '📝',
                          title: isSurgery ? 'Surgical Procedure' : 'Medical Diagnosis',
                          description: rec.diagnosis,
                          detail: rec.notes,
                          badge: isSurgery ? 'Surgery' : 'Diagnosis',
                          badgeColor: isSurgery ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        });

                        // If prescription exists, add a separate prescription event to match "2025 Prescription"
                        if (rec.prescription && rec.prescription.length > 0) {
                          timelineEvents.push({
                            id: `${rec.id}-rx`,
                            date: rec.date,
                            year: rec.date ? rec.date.split('-')[0] : 'Unknown',
                            type: 'Prescription',
                            icon: '💊',
                            title: 'Prescription Issued',
                            description: rec.prescription.map(p => `${p.drug} (${p.dosage})`).join(', '),
                            detail: rec.prescription.map(p => `Take: ${p.instructions} (${p.duration})`).join('; '),
                            badge: 'Prescription',
                            badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          });
                        }
                      });

                      labReports.forEach(lab => {
                        timelineEvents.push({
                          id: lab.id,
                          date: lab.date,
                          year: lab.date ? lab.date.split('-')[0] : 'Unknown',
                          type: 'Lab Report',
                          icon: '🔬',
                          title: `Laboratory Panel: ${lab.testName}`,
                          description: lab.result || 'Result pending...',
                          detail: lab.notes || 'Lab observations',
                          badge: `Lab - ${lab.status}`,
                          badgeColor: lab.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        });
                      });

                      const sortedTimeline = timelineEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

                      if (sortedTimeline.length === 0) {
                        return <p className="text-xs text-zinc-555 italic pl-6">No historical records registered to generate timeline view.</p>;
                      }

                      return sortedTimeline.map((evt) => (
                        <div key={evt.id} className="relative pl-8 md:pl-10 group">
                          {/* Timeline node icon */}
                          <div className="absolute -left-[14px] top-1.5 h-7 w-7 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-sm shadow-md group-hover:border-cyan-400/50 transition-colors duration-200">
                            {evt.icon}
                          </div>

                          {/* Event body card */}
                          <div className="bg-zinc-955/40 border border-zinc-900 rounded-xl p-4.5 hover:border-zinc-850 transition-all duration-200 space-y-2 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-zinc-800/10 rounded-full blur-xl pointer-events-none" />
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-indigo-400 font-mono tracking-wider">{evt.year}</span>
                                <span className="text-zinc-650 font-medium">|</span>
                                <span className="font-semibold text-zinc-300">{evt.title}</span>
                              </div>
                              <span className="text-[10px] text-zinc-550 font-mono sm:text-right">{evt.date}</span>
                            </div>

                            <p className="text-xs font-bold text-white font-sans">{evt.description}</p>
                            {evt.detail && <p className="text-[11px] text-zinc-450 leading-relaxed font-sans">{evt.detail}</p>}
                            
                            <div className="pt-1 flex items-center justify-between">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border capitalize ${evt.badgeColor}`}>
                                {evt.badge}
                              </span>
                              <span className="text-[9px] text-zinc-600 font-mono">ID: {evt.id.substring(0, 12)}</span>
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* TAB 2: APPOINTMENTS */}
              {activeSubTab === 'appointments' && (
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-zinc-800 bg-zinc-900/20 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">Historical Visit Registry</h3>
                    <span className="text-xs text-zinc-555">{appointments.length} visit(s) listed</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-zinc-900/60 border-b border-zinc-850 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                          <th className="p-4">Physician</th>
                          <th className="p-4">Date</th>
                          <th className="p-4">Time Slot</th>
                          <th className="p-4">Consultation Reason</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850">
                        {appointments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-zinc-555 italic">
                              No historical appointments recorded.
                            </td>
                          </tr>
                        ) : (
                          appointments.map((apt) => (
                            <tr key={apt.id} className="hover:bg-zinc-900/20 transition-colors">
                              <td className="p-4 font-semibold text-white">Dr. {apt.doctorName}</td>
                              <td className="p-4 text-zinc-300 font-mono">{apt.date}</td>
                              <td className="p-4 text-zinc-400 font-mono">{apt.time}</td>
                              <td className="p-4 text-zinc-455 truncate max-w-xs">{apt.reason || 'General checkup'}</td>
                              <td className="p-4">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                                  apt.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                  apt.status === 'waiting' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                  apt.status === 'cancelled' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                  'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                }`}>
                                  {apt.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: MEDICAL HISTORY */}
              {activeSubTab === 'history' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  
                  {/* Medical history timeline log */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider text-indigo-400">Diagnosis timeline</h3>
                    
                    {records.length === 0 ? (
                      <div className="p-12 text-center text-zinc-555 border border-zinc-800 bg-zinc-900/20 rounded-2xl italic text-xs">
                        No medical reports registered to EHR directory.
                      </div>
                    ) : (
                      records.sort((a, b) => new Date(b.date) - new Date(a.date)).map((rec) => (
                        <div key={rec.id} className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl space-y-3 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                          <div className="flex justify-between items-center text-xs">
                            <div>
                              <strong className="text-white text-xs block">{rec.diagnosis}</strong>
                              <span className="text-zinc-550 block text-[9.5px] mt-0.5 font-sans">Issued by Dr. {rec.doctorName} on {rec.date}</span>
                            </div>
                            <span className="text-[9px] font-mono text-zinc-555 bg-zinc-955 border border-zinc-850 px-2 py-0.5 rounded">
                              {rec.id}
                            </span>
                          </div>
                          {(rec.symptoms || rec.treatment) && (
                            <div className="flex flex-wrap gap-2 text-[10px] pt-1">
                              {rec.symptoms && (
                                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-medium">
                                  🤒 Symptoms: {rec.symptoms}
                                </span>
                              )}
                              {rec.treatment && (
                                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-medium">
                                  💊 Treatment: {rec.treatment}
                                </span>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-zinc-400 leading-relaxed font-sans">{rec.notes}</p>
                          
                          {rec.prescription && rec.prescription.length > 0 && (
                            <div className="pt-3 border-t border-zinc-850 grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-zinc-400 font-sans">
                              {rec.prescription.map((rx, idx) => (
                                <div key={idx} className="bg-zinc-950 p-2 rounded-lg border border-zinc-850 flex justify-between items-center">
                                  <div>
                                    <strong className="text-zinc-350">💊 {rx.drug}</strong> &mdash; <span className="font-mono text-cyan-400">{rx.dosage}</span>
                                    <span className="block text-[8.5px] text-zinc-500 italic mt-0.5">{rx.instructions} ({rx.duration})</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add record form (Admins/Doctors only) */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-6">
                    {user && (user.role === 'doctor' || user.role === 'admin') ? (
                      <>
                        <div className="space-y-1.5 border-b border-zinc-850 pb-3">
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400">Append Clinical Record</h3>
                          <p className="text-[10px] text-zinc-450">Record findings and immediately authorize Rx prescriptions.</p>
                        </div>

                        {recordError && (
                          <div className="bg-rose-955/40 border border-rose-800 text-rose-200 p-3 rounded-lg text-xs">
                            {recordError}
                          </div>
                        )}

                        {recordSuccess && (
                          <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 p-3 rounded-lg text-xs">
                            {recordSuccess}
                          </div>
                        )}

                        <form onSubmit={handleCreateRecord} className="space-y-4 text-xs font-sans">
                          <div className="space-y-1">
                            <label htmlFor="diag-finding" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Diagnosis Finding *</label>
                            <input
                              id="diag-finding"
                              type="text"
                              required
                              placeholder="e.g. Acute Gastroenteritis"
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4.5 py-2 text-zinc-100 text-xs focus:outline-none"
                              value={diagFinding}
                              onChange={(e) => setDiagFinding(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label htmlFor="diag-symptoms" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Symptoms</label>
                            <input
                              id="diag-symptoms"
                              type="text"
                              placeholder="e.g. Headache, Fever, Fatigue"
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4.5 py-2 text-zinc-100 text-xs focus:outline-none"
                              value={diagSymptoms}
                              onChange={(e) => setDiagSymptoms(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label htmlFor="diag-treatment" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Treatment</label>
                            <input
                              id="diag-treatment"
                              type="text"
                              placeholder="e.g. Paracetamol, Hydration"
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4.5 py-2 text-zinc-100 text-xs focus:outline-none"
                              value={diagTreatment}
                              onChange={(e) => setDiagTreatment(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label htmlFor="diag-notes" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Consultation Notes / Comments</label>
                            <textarea
                              id="diag-notes"
                              rows={3}
                              placeholder="Recommendations, clinical tests requested, lifestyle advice..."
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4.5 py-2 text-zinc-100 text-xs focus:outline-none"
                              value={diagNotes}
                              onChange={(e) => setDiagNotes(e.target.value)}
                            />
                          </div>

                          {/* Prescription Form Section */}
                          <div className="border border-zinc-850 rounded-xl bg-zinc-955/40 p-4 space-y-3">
                            <span className="block text-[10px] font-bold text-zinc-455 uppercase tracking-wider text-indigo-400">Add Medicine Prescription</span>
                            
                            {rxList.length > 0 && (
                              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                {rxList.map((rx, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-zinc-955 border border-zinc-850 p-2 rounded-lg text-[10.5px]">
                                    <span className="text-zinc-350 font-semibold truncate max-w-[130px]">{rx.drug} ({rx.dosage})</span>
                                    <button
                                      type="button"
                                      onClick={() => removeRxItem(idx)}
                                      className="text-[10px] text-rose-400 hover:text-rose-350 cursor-pointer font-bold"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              <input
                                type="text"
                                placeholder="Drug (e.g. Advil)"
                                value={newDrug}
                                onChange={(e) => setNewDrug(e.target.value)}
                                className="bg-zinc-900 border border-zinc-850 rounded-lg px-2 py-1.5 focus:outline-none text-zinc-205"
                              />
                              <input
                                type="text"
                                placeholder="Dosage (e.g. 200mg)"
                                value={newDosage}
                                onChange={(e) => setNewDosage(e.target.value)}
                                className="bg-zinc-900 border border-zinc-850 rounded-lg px-2 py-1.5 focus:outline-none text-zinc-205"
                              />
                              <input
                                type="text"
                                placeholder="Duration (e.g. 5 days)"
                                value={newDuration}
                                onChange={(e) => setNewDuration(e.target.value)}
                                className="bg-zinc-900 border border-zinc-850 rounded-lg px-2 py-1.5 focus:outline-none text-zinc-205"
                              />
                              <input
                                type="text"
                                placeholder="Intake (e.g. Twice daily)"
                                value={newInstructions}
                                onChange={(e) => setNewInstructions(e.target.value)}
                                className="bg-zinc-900 border border-zinc-850 rounded-lg px-2 py-1.5 focus:outline-none text-zinc-205"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={addRxItem}
                              className="w-full py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:text-white rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              + Add to Rx List
                            </button>
                          </div>

                          <button
                            type="submit"
                            disabled={recordLoading}
                            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-955 font-bold text-xs shadow-lg active:scale-95 transition-all cursor-pointer"
                          >
                            {recordLoading ? 'Saving File...' : 'Append EHR File'}
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="text-center text-zinc-555 text-xs italic py-6">
                        Clinical access restricted. Only physicians or medical administrators can append clinical diagnosis logs.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: PRESCRIPTIONS */}
              {activeSubTab === 'prescriptions' && (
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider text-indigo-400">Prescribed Medicine Registry</h3>
                  
                  {activeMedications.length === 0 ? (
                    <p className="text-xs text-zinc-555 italic py-6 text-center">No prescriptions found on record.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {records.filter(r => r.prescription && r.prescription.length > 0).map((rec) => (
                        <div key={rec.id} className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl space-y-4 relative overflow-hidden">
                          <div className="flex justify-between items-start border-b border-zinc-850/60 pb-2">
                            <div>
                              <span className="text-[10px] text-zinc-500 block font-mono">Report ID: {rec.id}</span>
                              <span className="text-zinc-350 block text-[10px] font-sans font-semibold mt-0.5">By Dr. {rec.doctorName} on {rec.date}</span>
                            </div>
                            <button
                              onClick={() => setPrintingRx(rec)}
                              className="text-[10px] text-cyan-400 hover:text-cyan-350 font-bold flex items-center space-x-1 cursor-pointer border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 rounded"
                            >
                              <span>🖨️</span> <span>Print Receipt</span>
                            </button>
                          </div>

                          <div className="space-y-2.5 text-xs font-sans">
                            {rec.prescription.map((rx, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-zinc-900/40 border border-zinc-900 px-3 py-2 rounded-xl">
                                <div>
                                  <strong className="text-white font-semibold block text-xs">💊 {rx.drug}</strong>
                                  <span className="text-[9.5px] text-zinc-505 block italic mt-0.5">Intake: {rx.instructions}</span>
                                </div>
                                <div className="text-right text-[10px]">
                                  <span className="text-cyan-400 font-mono font-bold block">{rx.dosage}</span>
                                  <span className="text-zinc-505 block font-mono">Duration: {rx.duration}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: LAB REPORTS */}
              {activeSubTab === 'labs' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  
                  {/* Tests List */}
                  <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-zinc-800 bg-zinc-900/20 flex justify-between items-center">
                      <h3 className="text-sm font-bold text-white">Diagnostic Laboratory Findings</h3>
                      <span className="text-xs text-zinc-550">{labReports.length} panels listed</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-zinc-900/60 border-b border-zinc-850 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                            <th className="p-4">Test Name</th>
                            <th className="p-4">Ordered Date</th>
                            <th className="p-4">Results</th>
                            <th className="p-4">Reference Range</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850">
                          {labReports.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-zinc-505 italic">
                                No lab findings recorded in clinical directory.
                              </td>
                            </tr>
                          ) : (
                            labReports.map((lab) => (
                              <tr key={lab.id} className="hover:bg-zinc-900/20 transition-colors">
                                <td className="p-4 font-semibold text-white">{lab.testName}</td>
                                <td className="p-4 text-zinc-300 font-mono">{lab.date}</td>
                                <td className="p-4 text-zinc-300 font-bold">{lab.result || 'Pending Result'}</td>
                                <td className="p-4 text-zinc-450 font-mono">{lab.referenceRange || 'N/A'}</td>
                                <td className="p-4">
                                  <span className={`inline-flex px-2 py-0.5 rounded text-[9.5px] font-bold border capitalize ${
                                    lab.status === 'completed' 
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  }`}>
                                    {lab.status}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  {lab.status === 'pending' && user && (user.role === 'doctor' || user.role === 'admin') && (
                                    <button
                                      onClick={() => {
                                        setUpdatingLabId(lab.id);
                                        setLabResult('');
                                        setLabNotes('');
                                      }}
                                      className="text-[10px] font-bold text-cyan-400 hover:text-cyan-350 cursor-pointer"
                                    >
                                      Enter Result
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Order lab panel (Admins/Receptionists/Doctors) */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-6">
                    {user && (user.role === 'admin' || user.role === 'receptionist' || user.role === 'doctor') ? (
                      <>
                        <div className="space-y-1.5 border-b border-zinc-850 pb-3">
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400">Order Lab Panel</h3>
                          <p className="text-[10px] text-zinc-450">Select medical tests to order for this patient.</p>
                        </div>

                        {labError && (
                          <div className="bg-rose-955/40 border border-rose-800 text-rose-200 p-3 rounded-lg text-xs">
                            {labError}
                          </div>
                        )}

                        {labSuccess && (
                          <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-305 p-3 rounded-lg text-xs">
                            {labSuccess}
                          </div>
                        )}

                        <form onSubmit={handleOrderLab} className="space-y-4 text-xs font-sans">
                          <div className="space-y-1">
                            <label htmlFor="lab-test" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Select Laboratory Panel *</label>
                            <select
                              id="lab-test"
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-100 text-xs focus:outline-none"
                              value={testName}
                              onChange={(e) => setTestName(e.target.value)}
                            >
                              <option value="Complete Blood Count (CBC)">Complete Blood Count (CBC)</option>
                              <option value="Lipid Profile Test">Lipid Profile Test</option>
                              <option value="Thyroid Function Test (TSH)">Thyroid Function Test (TSH)</option>
                              <option value="Basic Metabolic Panel (BMP)">Basic Metabolic Panel (BMP)</option>
                              <option value="Electrocardiogram (ECG / EKG)">Electrocardiogram (ECG / EKG)</option>
                              <option value="MRI Brain Scan">MRI Brain Scan</option>
                              <option value="Urinalysis Panel">Urinalysis Panel</option>
                            </select>
                          </div>

                          <button
                            type="submit"
                            disabled={labLoading}
                            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-955 font-bold text-xs shadow-lg active:scale-95 transition-all cursor-pointer"
                          >
                            {labLoading ? 'Ordering...' : 'Order Diagnostic Test'}
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="text-center text-zinc-555 text-xs italic py-6">
                        Lab order panel restricted. Only clinical staff can order panels.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: BILLING */}
              {activeSubTab === 'billing' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fadeIn">
                  {/* Transaction ledger list */}
                  <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-zinc-800 bg-zinc-900/20 flex justify-between items-center">
                      <h3 className="text-sm font-bold text-white">Clinical Transaction Ledger</h3>
                      <span className="text-xs text-zinc-550">{invoices.length} entries total</span>
                    </div>

                    <div className="overflow-x-auto">
                      {invoices.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic p-6 text-center">No billing transactions generated on record.</p>
                      ) : (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-850 text-[10px] uppercase text-zinc-500 font-bold tracking-wider">
                              <th className="p-4">Invoice ID</th>
                              <th className="p-4">Date</th>
                              <th className="p-4">Description</th>
                              <th className="p-4">Amount</th>
                              <th className="p-4">Status</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-850 text-zinc-300">
                            {invoices.map((inv) => (
                              <tr key={inv.id} className="hover:bg-zinc-900/10">
                                <td className="p-4 font-mono text-[11px] text-zinc-400">{inv.id}</td>
                                <td className="p-4">{inv.date}</td>
                                <td className="p-4">{inv.description}</td>
                                <td className="p-4 font-semibold text-white">${inv.amount.toFixed(2)}</td>
                                <td className="p-4">
                                  <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border capitalize ${
                                    inv.status === 'paid'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  }`}>
                                    {inv.status}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  {inv.status === 'unpaid' ? (
                                    <button
                                      onClick={() => handlePayInvoice(inv.id)}
                                      className="py-1 px-3 bg-cyan-500 hover:bg-cyan-400 text-zinc-955 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                                    >
                                      Collect Payment
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-zinc-500">None</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Create New Invoice panel */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white">Generate Consultation Charge</h3>
                    {['admin', 'receptionist'].includes(user?.role) ? (
                      <>
                        {invoiceError && (
                          <div className="bg-rose-950/40 border border-rose-800 text-rose-205 p-3 rounded-lg text-xs">
                            {invoiceError}
                          </div>
                        )}
                        {invoiceSuccess && (
                          <div className="bg-emerald-955/40 border border-emerald-800 text-emerald-300 p-3 rounded-lg text-xs">
                            {invoiceSuccess}
                          </div>
                        )}
                        <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs font-sans">
                          <div className="space-y-1">
                            <label htmlFor="inv-desc" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Billing Description *</label>
                            <input
                              id="inv-desc"
                              type="text"
                              required
                              placeholder="e.g. Consulting Fee / General Consultation"
                              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-200 focus:outline-none"
                              value={invoiceDesc}
                              onChange={(e) => setInvoiceDesc(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label htmlFor="inv-amount" className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Charge Amount ($) *</label>
                            <input
                              id="inv-amount"
                              type="number"
                              min="0.01"
                              step="0.01"
                              required
                              placeholder="e.g. 75.00"
                              className="w-full bg-zinc-955 border border-zinc-855 rounded-xl px-4 py-2.5 text-zinc-205 focus:outline-none font-mono"
                              value={invoiceAmount}
                              onChange={(e) => setInvoiceAmount(e.target.value)}
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={invoiceLoading}
                            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-955 font-bold text-xs shadow-lg active:scale-95 transition-all cursor-pointer"
                          >
                            {invoiceLoading ? 'Generating...' : 'Generate Invoice'}
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="text-center text-zinc-555 text-xs italic py-6">
                        Billing setup restricted. Only receptionist or clinical administrator roles can generate invoices.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSubTab === 'messages' && (
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden h-[500px] flex flex-col animate-fadeIn">
                  {/* Header */}
                  <div className="p-4 border-b border-zinc-800 bg-zinc-900/30 flex justify-between items-center font-sans">
                    <div>
                      <h4 className="text-xs font-bold text-white">Direct Chat Thread</h4>
                      <p className="text-[10px] text-zinc-500">Secure conversation history with {patient?.name}</p>
                    </div>
                    <button
                      onClick={fetchMessages}
                      className="py-1 px-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-cyan-400 font-bold rounded text-[9px] cursor-pointer"
                    >
                      🔄 Sync Chat
                    </button>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3" id="patient-detail-chat-container">
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2 font-sans">
                        <span className="text-3xl">💬</span>
                        <p className="text-xs text-zinc-550">No messages exchanged yet.</p>
                        <p className="text-[10px] text-zinc-600 max-w-xs">Ask a question or explain follow-up instructions to start your conversation thread.</p>
                      </div>
                    ) : (
                      chatMessages.map((msg) => {
                        const isMine = msg.senderId === user.id;
                        return (
                          <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] p-3 rounded-2xl text-xs space-y-1 ${
                              isMine
                                ? 'bg-gradient-to-br from-cyan-600/90 to-indigo-650/90 text-white rounded-tr-none'
                                : 'bg-zinc-800 text-zinc-200 rounded-tl-none border border-zinc-750'
                            }`}>
                              <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                              <span className="text-[8px] opacity-60 block text-right font-mono">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Input Form */}
                  <form onSubmit={sendMessage} className="p-4 border-t border-zinc-850 bg-zinc-950 flex items-center space-x-2 font-sans">
                    <input
                      type="text"
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder={`Send secure message to ${patient?.name}...`}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder-zinc-550"
                    />
                    <button
                      type="submit"
                      disabled={!newMessageText.trim() || sendingMsg}
                      className="py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      {sendingMsg ? '...' : 'Send'}
                    </button>
                  </form>
                </div>
              )}

            </div>
          </>
        )}
      </div>

      {/* RENDER DYNAMIC LAB RESULT ENTRY PANEL */}
      {updatingLabId && (
        <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full space-y-6 shadow-2xl relative font-sans">
            <button
              onClick={() => setUpdatingLabId('')}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer text-lg"
            >
              ✕
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Enter Laboratory Test Result</h3>
              <p className="text-xs text-zinc-455">Input diagnostic findings and values to complete this test panel.</p>
            </div>

            <form onSubmit={handleFillLabResult} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label htmlFor="lab-res-val" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Lab Result / Clinical Values *</label>
                <input
                  id="lab-res-val"
                  type="text"
                  required
                  placeholder="e.g. 14.5 g/dL (Hemoglobin)"
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 focus:outline-none"
                  value={labResult}
                  onChange={(e) => setLabResult(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="lab-res-notes" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Findings Notes</label>
                <textarea
                  id="lab-res-notes"
                  rows={3}
                  placeholder="Normal values, recommendations, critical alert highlights..."
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 focus:outline-none"
                  value={labNotes}
                  onChange={(e) => setLabNotes(e.target.value)}
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setUpdatingLabId('')}
                  className="py-2 px-4 border border-zinc-800 hover:border-zinc-750 text-zinc-450 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingLabLoading}
                  className="py-2 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-955 font-bold text-xs shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  {updatingLabLoading ? 'Saving...' : 'Submit Lab Findings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENDER SIMULATED PRESCRIPTION PRINT RECEIPT MODAL */}
      {printingRx && (
        <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-lg w-full space-y-6 shadow-2xl relative text-zinc-300 font-sans">
            <button
              onClick={() => setPrintingRx(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer text-lg print:hidden"
            >
              ✕
            </button>

            {/* Receipt layout */}
            <div className="space-y-4 border border-zinc-800 p-6 rounded-xl bg-zinc-950/60 font-mono text-xs relative">
              <div className="text-center border-b border-zinc-800 pb-3 space-y-1">
                <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">CarePulse Clinic</h2>
                <p className="text-[10px] text-zinc-555">100 Health Sciences Blvd, NY</p>
                <p className="text-[9.5px] text-zinc-555">Secure Prescription Log File</p>
              </div>

              <div className="space-y-1 text-[10.5px]">
                <p><span className="text-zinc-500">Date Issued:</span> {printingRx.date}</p>
                <p><span className="text-zinc-500">Physician  :</span> Dr. {printingRx.doctorName}</p>
                <p><span className="text-zinc-500">Patient    :</span> {patient.name}</p>
                <p><span className="text-zinc-500">Allergies  :</span> {patient.profile?.allergies || 'None recorded'}</p>
              </div>

              <div className="border-t border-b border-zinc-800 py-3 space-y-2">
                <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Prescribed Medicines</span>
                {printingRx.prescription.map((rx, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[11px] leading-relaxed pb-1.5 border-b border-zinc-900 last:border-0">
                    <div>
                      <strong className="text-white">💊 {rx.drug}</strong>
                      <span className="block text-[9px] text-zinc-505 font-sans italic mt-0.5">{rx.instructions}</span>
                    </div>
                    <div className="text-right font-bold text-cyan-400">
                      <span>{rx.dosage}</span>
                      <span className="block text-[9.5px] text-zinc-555 font-mono font-normal">Qty: {rx.duration}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center pt-2 text-[8.5px] text-zinc-555 font-sans">
                This document is a certified digital clinical copy. Valid only at cooperating local pharmacies.
              </div>
            </div>

            <div className="flex justify-end space-x-3 print:hidden">
              <button
                type="button"
                onClick={() => setPrintingRx(null)}
                className="py-2 px-4 border border-zinc-800 hover:border-zinc-750 text-zinc-455 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="py-2 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
