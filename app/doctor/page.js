'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { useSearchParams } from 'next/navigation';

function DoctorDashboardContent() {
  const { user } = useAuth();

  // Data States
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [records, setRecords] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Consulting States
  const [activeConsultation, setActiveConsultation] = useState(null); // appointment details
  const [selectedPatientForConsult, setSelectedPatientForConsult] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [treatment, setTreatment] = useState('');
  const [notes, setNotes] = useState('');
  const [prescriptionList, setPrescriptionList] = useState([]);
  const [newDrug, setNewDrug] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [consultationError, setConsultationError] = useState('');
  const [consultationSuccess, setConsultationSuccess] = useState('');
  const [savingConsultation, setSavingConsultation] = useState(false);

  // Patient Explorer States
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientHistory, setPatientHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Secure Messaging States
  const [receptionists, setReceptionists] = useState([]);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Patient Explorer Tabs (Doctor POV)
  const [subTab, setSubTab] = useState('history'); // 'history' | 'labs' | 'billing' | 'messages'
  const [patientLabs, setPatientLabs] = useState([]);
  const [patientInvoices, setPatientInvoices] = useState([]);
  const [patientDetailsCache, setPatientDetailsCache] = useState({});

  // Lab Test Ordering States
  const [newLabTestName, setNewLabTestName] = useState('');
  const [newLabRefRange, setNewLabRefRange] = useState('');
  const [orderingLab, setOrderingLab] = useState(false);

  // Lab Result Update States
  const [editingLabReportId, setEditingLabReportId] = useState(null);
  const [labResultValue, setLabResultValue] = useState('');
  const [labResultStatus, setLabResultStatus] = useState('Normal');
  const [labResultNotes, setLabResultNotes] = useState('');
  const [updatingLab, setUpdatingLab] = useState(false);

  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMessages = useCallback(async (patId) => {
    if (!patId) return;
    try {
      const res = await fetch(`/api/messages?recipientId=${patId}`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  }, []);

  useEffect(() => {
    let recipientId = null;
    if (activeTab === 'messages' && selectedChatUser) {
      recipientId = selectedChatUser.id;
    } else if (activeTab === 'patients' && subTab === 'messages' && selectedPatientId) {
      recipientId = selectedPatientId;
    }

    if (!recipientId) return;

    setTimeout(() => {
      fetchMessages(recipientId);
    }, 0);

    let interval;
    const startPolling = () => {
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        if (!document.hidden) {
          fetchMessages(recipientId);
        }
      }, 3000);
    };

    startPolling();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(interval);
        interval = null;
      } else {
        fetchMessages(recipientId);
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTab, subTab, selectedChatUser, selectedPatientId, fetchMessages]);

  useEffect(() => {
    const container = document.getElementById('doctor-chat-messages-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [chatMessages]);

  const selectUserChat = (user) => {
    setSelectedChatUser(user);
    setChatMessages([]);
    fetchMessages(user.id);
  };

  const refreshMessages = () => {
    let recipientId = null;
    if (activeTab === 'messages' && selectedChatUser) {
      recipientId = selectedChatUser.id;
    } else if (activeTab === 'patients' && subTab === 'messages' && selectedPatientId) {
      recipientId = selectedPatientId;
    }
    if (recipientId) fetchMessages(recipientId);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    let recipientId = null;
    if (activeTab === 'messages' && selectedChatUser) {
      recipientId = selectedChatUser.id;
    } else if (activeTab === 'patients' && subTab === 'messages' && selectedPatientId) {
      recipientId = selectedPatientId;
    }

    if (!newMessageText.trim() || !recipientId || sendingMsg) return;

    setSendingMsg(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: recipientId,
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

  useEffect(() => {
    if (tabParam) {
      const timer = setTimeout(() => {
        setActiveTab(tabParam);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [tabParam]);

  const fetchData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [aptRes, patRes, recRes, recepRes] = await Promise.all([
        fetch('/api/appointments'),
        fetch('/api/users?role=patient'),
        fetch('/api/records'),
        fetch('/api/users?role=receptionist')
      ]);

      if (aptRes.ok && patRes.ok && recRes.ok && recepRes.ok) {
        const apts = await aptRes.json();
        const pats = await patRes.json();
        const recs = await recRes.json();
        const receps = await recepRes.json();

        // Sort by today's date & time (or simply date descending)
        setAppointments(apts.sort((a, b) => new Date(b.date) - new Date(a.date)));
        setPatients(pats);
        setRecords(recs);
        setReceptionists(receps);
      }
    } catch (err) {
      console.error("Error loading doctor data:", err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (user) {
      setTimeout(() => {
        if (active) fetchData();
      }, 0);
    }
    return () => {
      active = false;
    };
  }, [user, fetchData]);

  // Load Patient clinical history, labs, and invoices when clicked
  const handleSelectPatient = async (patId) => {
    setSelectedPatientId(patId);
    setEditingLabReportId(null);

    const cached = patientDetailsCache[patId];
    if (cached) {
      setPatientHistory(cached.history);
      setPatientLabs(cached.labs);
      setPatientInvoices(cached.invoices);
      setLoadingHistory(false);
    } else {
      setLoadingHistory(true);
      setPatientHistory([]);
      setPatientLabs([]);
      setPatientInvoices([]);
    }

    try {
      const [recRes, labRes, billRes] = await Promise.all([
        fetch(`/api/records?patientId=${patId}`),
        fetch(`/api/lab-reports?patientId=${patId}`),
        fetch(`/api/billing?patientId=${patId}`)
      ]);

      let historyData = [];
      let labsData = [];
      let billingData = [];

      if (recRes.ok) {
        const data = await recRes.json();
        historyData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      }
      if (labRes.ok) {
        const data = await labRes.json();
        labsData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      }
      if (billRes.ok) {
        const data = await billRes.json();
        billingData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      }

      setPatientHistory(historyData);
      setPatientLabs(labsData);
      setPatientInvoices(billingData);

      setPatientDetailsCache(prev => ({
        ...prev,
        [patId]: {
          history: historyData,
          labs: labsData,
          invoices: billingData
        }
      }));
    } catch (err) {
      console.error("Error loading patient details:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Order Lab Test Handler
  const handleOrderLabTest = async (e) => {
    e.preventDefault();
    if (!newLabTestName.trim() || !selectedPatientId) return;

    setOrderingLab(true);
    try {
      const res = await fetch('/api/lab-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatientId,
          testName: newLabTestName.trim(),
          referenceRange: newLabRefRange.trim() || 'Pending verification'
        })
      });

      if (res.ok) {
        const newReport = await res.json();
        setPatientLabs(prev => {
          const next = [newReport, ...prev];
          setPatientDetailsCache(cache => {
            if (!cache[selectedPatientId]) return cache;
            return {
              ...cache,
              [selectedPatientId]: { ...cache[selectedPatientId], labs: next }
            };
          });
          return next;
        });
        setNewLabTestName('');
        setNewLabRefRange('');
        alert('Lab test successfully ordered!');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to order lab test.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to server.');
    } finally {
      setOrderingLab(false);
    }
  };

  // Update Lab Findings Handler
  const handleUpdateLabResult = async (e) => {
    e.preventDefault();
    if (!editingLabReportId) return;

    setUpdatingLab(true);
    try {
      const res = await fetch('/api/lab-reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingLabReportId,
          result: labResultValue.trim(),
          status: labResultStatus,
          notes: labResultNotes.trim()
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setPatientLabs(prev => {
          const next = prev.map(l => l.id === updated.id ? updated : l);
          setPatientDetailsCache(cache => {
            if (!cache[selectedPatientId]) return cache;
            return {
              ...cache,
              [selectedPatientId]: { ...cache[selectedPatientId], labs: next }
            };
          });
          return next;
        });
        setEditingLabReportId(null);
        setLabResultValue('');
        setLabResultStatus('Normal');
        setLabResultNotes('');
        alert('Lab findings updated successfully!');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update lab findings.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to server.');
    } finally {
      setUpdatingLab(false);
    }
  };

  // Status transitions
  const handleUpdateStatus = async (aptId, newStatus) => {
    try {
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: aptId, status: newStatus })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Error updating appointment status:", err);
    }
  };

  // Consultation prescription adding
  const addPrescriptionItem = (e) => {
    e.preventDefault();
    if (!newDrug || !newDosage) return;
    setPrescriptionList([...prescriptionList, {
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

  const removePrescriptionItem = (idx) => {
    setPrescriptionList(prescriptionList.filter((_, i) => i !== idx));
  };

  // Submit Consultation Form
  const handleSubmitConsultation = async (e) => {
    e.preventDefault();
    setConsultationError('');
    setConsultationSuccess('');

    if (!diagnosis) {
      setConsultationError('Diagnosis is required.');
      return;
    }

    setSavingConsultation(true);
    try {
      // 1. Post Medical Record
      const recordRes = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: activeConsultation.patientId,
          diagnosis,
          symptoms,
          treatment,
          prescription: prescriptionList,
          notes
        })
      });

      if (!recordRes.ok) {
        const recordData = await recordRes.json();
        throw new Error(recordData.error || 'Failed to save medical record.');
      }

      // 2. Mark Appointment as Completed
      const aptRes = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeConsultation.id,
          status: 'completed'
        })
      });

      if (!aptRes.ok) {
        throw new Error('Record saved, but failed to complete appointment status.');
      }

      setConsultationSuccess('Consultation saved and appointment marked complete!');
      setDiagnosis('');
      setSymptoms('');
      setTreatment('');
      setNotes('');
      setPrescriptionList([]);
      
      // Refresh database
      fetchData();
      
      setTimeout(() => {
        setActiveConsultation(null);
        setConsultationSuccess('');
        setActiveTab('dashboard');
      }, 1500);
    } catch (err) {
      setConsultationError(err.message || 'An error occurred.');
    } finally {
      setSavingConsultation(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'confirmed': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'scheduled': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'waiting': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'in-consultation': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'cancelled': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-750';
    }
  };

  // Filtering arrays based on searchQuery
  const filteredAppointments = appointments.filter(a =>
    a.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecords = records.filter(r =>
    r.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics
  const waitingApts = appointments.filter(a => a.status === 'waiting');
  const completedConsultsCount = appointments.filter(a => a.status === 'completed').length;
  const scheduledCount = appointments.filter(a => ['confirmed', 'scheduled', 'pending'].includes(a.status)).length;

  return (
    <DashboardLayout
      roleTitle="Doctor Portal"
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        setSearchQuery('');
      }}
      badges={{ appointments: waitingApts.length }}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={
        activeTab === 'dashboard' ? "Search today's agenda..." :
        activeTab === 'patients' ? 'Search patient directory...' :
        activeTab === 'appointments' ? 'Search consultation queue...' :
        activeTab === 'reports' ? 'Search diagnosis history...' :
        activeTab === 'messages' ? 'Search directory to chat...' :
        'Search workspace settings...'
      }
    >
      {activeConsultation ? (
        /* Consultation form screen overriding normal tabs */
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-850 pb-4">
            <div>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Active Consultation Session</span>
              <h2 className="text-xl font-bold text-white">Patient: {activeConsultation.patientName}</h2>
              <span className="text-xs text-zinc-550">Appointment ID: {activeConsultation.id}</span>
            </div>
            <button
              onClick={() => {
                if (confirm('Cancel consulting entry? Form details will be lost.')) {
                  setActiveConsultation(null);
                }
              }}
              className="py-1.5 px-3 rounded-lg border border-zinc-800 hover:bg-zinc-855 text-zinc-400 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Close Consultation
            </button>
          </div>

          {consultationError && (
            <div className="bg-rose-950/40 border border-rose-800 text-rose-200 p-4 rounded-xl text-xs">
              {consultationError}
            </div>
          )}

          {consultationSuccess && (
            <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 p-4 rounded-xl text-xs">
              {consultationSuccess}
            </div>
          )}

          <form onSubmit={handleSubmitConsultation} className="space-y-6">
            <div className="space-y-1.5">
              <label htmlFor="diagnosis" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Diagnosis Findings *</label>
              <input
                id="diagnosis"
                type="text"
                required
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                placeholder="e.g. Chronic Sinusitis, Mild Gastroesophageal Reflux"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="symptoms" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Symptoms</label>
              <input
                id="symptoms"
                type="text"
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                placeholder="e.g. Headache, Fever, Fatigue"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="treatment" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Treatment</label>
              <input
                id="treatment"
                type="text"
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                placeholder="e.g. Paracetamol, Hydration"
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="notes" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Consultation Comments / Notes</label>
              <textarea
                id="notes"
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-100 text-sm placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                placeholder="Details of physical exam, recommended lifestyle adjustments, etc..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Prescription List Section */}
            <div className="border border-zinc-850 rounded-2xl bg-zinc-950/30 p-5 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Medication Prescription List</h3>
              
              {/* Added items list */}
              {prescriptionList.length === 0 ? (
                <p className="text-xs text-zinc-550 italic">No prescriptions added for this consultation yet.</p>
              ) : (
                <div className="space-y-2">
                  {prescriptionList.map((item, index) => (
                    <div key={index} className="flex justify-between items-center bg-zinc-950 border border-zinc-850 px-4 py-2 rounded-xl text-xs">
                      <div>
                        <strong className="text-white">💊 {item.drug}</strong> &bull; <span className="text-cyan-400">{item.dosage}</span>
                        <span className="block text-[10px] text-zinc-500 mt-0.5">
                          Duration: {item.duration} | Instructions: {item.instructions}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePrescriptionItem(index)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add items panel */}
              <div className="bg-zinc-950 border border-zinc-855 p-4 rounded-xl space-y-3">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Add Medication Item</span>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <input
                    type="text"
                    placeholder="Drug Name (e.g. Amoxicillin)"
                    value={newDrug}
                    onChange={(e) => setNewDrug(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Dosage (e.g. 500mg)"
                    value={newDosage}
                    onChange={(e) => setNewDosage(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Duration (e.g. 7 days)"
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Instructions (e.g. Twice daily)"
                    value={newInstructions}
                    onChange={(e) => setNewInstructions(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={addPrescriptionItem}
                  className="py-1.5 px-3 rounded-lg bg-indigo-950 border border-indigo-850 text-indigo-300 font-semibold text-xs hover:bg-indigo-900 transition-colors cursor-pointer"
                >
                  Add Medicine to Prescription
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingConsultation}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold text-xs shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              {savingConsultation ? 'Writing Clinical Record...' : 'Complete Consultation & Save Record'}
            </button>
          </form>
        </div>
      ) : (
        /* Standard Tabs */
        <>
          {loadingData ? (
            <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/40 rounded-2xl border border-zinc-800 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
              <p className="text-zinc-500 text-sm">Syncing clinic databases...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Doctor Quick Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl space-y-1">
                      <span className="block text-xs text-zinc-550 uppercase font-bold tracking-wider">Today&apos;s Appointments</span>
                      <span className="block text-3xl font-extrabold text-white">{appointments.length}</span>
                      <span className="text-[10px] text-cyan-400 block font-semibold">&bull; Total bookings assigned</span>
                    </div>

                    <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl space-y-1">
                      <span className="block text-xs text-zinc-550 uppercase font-bold tracking-wider">Scheduled Queue</span>
                      <span className="block text-3xl font-extrabold text-white">{scheduledCount}</span>
                      <span className="text-[10px] text-indigo-400 block font-semibold">&bull; Awaiting check-in</span>
                    </div>

                    <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl space-y-1">
                      <span className="block text-xs text-zinc-550 uppercase font-bold tracking-wider">Waiting Room</span>
                      <span className="block text-3xl font-extrabold text-white">{waitingApts.length}</span>
                      <span className="text-[10px] text-amber-400 block font-semibold animate-pulse">&bull; Patients called in</span>
                    </div>

                    <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl space-y-1">
                      <span className="block text-xs text-zinc-550 uppercase font-bold tracking-wider">Completed Consultations</span>
                      <span className="block text-3xl font-extrabold text-white">{completedConsultsCount}</span>
                      <span className="text-[10px] text-emerald-400 block font-semibold">&bull; Archives created today</span>
                    </div>
                  </div>

                  {/* Calendar Agenda */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
                      <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                        <span>📅</span> <span>Clinical Consulting Agenda</span>
                      </h3>
                      <span className="text-xs text-zinc-550">{filteredAppointments.length} Bookings displayed</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-zinc-900/60 border-b border-zinc-850 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                            <th className="p-4">Patient</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Time</th>
                            <th className="p-4">Reason / Notes</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Consultation Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850">
                          {filteredAppointments.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-zinc-500 italic">
                                No appointments on record.
                              </td>
                            </tr>
                          ) : (
                            filteredAppointments.map((apt) => (
                              <tr key={apt.id} className="hover:bg-zinc-900/20 transition-colors">
                                <td className="p-4">
                                  <span className="font-semibold text-white block">{apt.patientName}</span>
                                  <span className="text-[10px] text-zinc-500 font-mono">ID: {apt.patientId}</span>
                                </td>
                                <td className="p-4 text-zinc-300">{apt.date}</td>
                                <td className="p-4 text-zinc-300">{apt.time}</td>
                                <td className="p-4 text-zinc-400 max-w-xs truncate">{apt.reason || 'General Checkup'}</td>
                                <td className="p-4">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getStatusClass(apt.status)}`}>
                                    {apt.status}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex justify-end space-x-2">
                                    {['confirmed', 'scheduled'].includes(apt.status) && (
                                      <button
                                        onClick={() => handleUpdateStatus(apt.id, 'waiting')}
                                        className="py-1 px-2.5 rounded-lg bg-cyan-950 text-cyan-400 font-semibold border border-cyan-800 hover:bg-cyan-900 text-[10px] transition-colors cursor-pointer"
                                      >
                                        Call In
                                      </button>
                                    )}
                                    {apt.status === 'waiting' && (
                                      <button
                                        onClick={() => handleUpdateStatus(apt.id, 'in-consultation')}
                                        className="py-1 px-2.5 rounded-lg bg-amber-950 text-amber-400 font-semibold border border-amber-800 hover:bg-amber-900 text-[10px] transition-colors cursor-pointer"
                                      >
                                        Start Consultation
                                      </button>
                                    )}
                                    {apt.status === 'in-consultation' && (
                                      <div className="flex justify-end space-x-1.5">
                                        <button
                                          onClick={() => setActiveConsultation(apt)}
                                          className="py-1 px-2.5 rounded-lg bg-purple-950 text-purple-400 font-semibold border border-purple-800 hover:bg-purple-900 text-[10px] transition-colors cursor-pointer animate-pulse"
                                        >
                                          Consult Patient
                                        </button>
                                        <button
                                          onClick={() => handleUpdateStatus(apt.id, 'completed')}
                                          className="py-1 px-2.5 rounded-lg bg-emerald-950 text-emerald-400 font-semibold border border-emerald-800 hover:bg-emerald-900 text-[10px] transition-colors cursor-pointer"
                                        >
                                          Complete
                                        </button>
                                      </div>
                                    )}
                                    {apt.status === 'completed' && (
                                      <span className="text-zinc-500 text-[11px] italic">Completed</span>
                                    )}
                                    {apt.status === 'cancelled' && (
                                      <span className="text-zinc-600 text-[11px] italic">Cancelled</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'patients' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Patient list directory */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider text-indigo-400">Clinic Patient Directory</h3>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                      {filteredPatients.length === 0 ? (
                        <p className="text-xs text-zinc-550 italic p-4 text-center">No patients found</p>
                      ) : (
                        filteredPatients.map((pat) => (
                          <button
                            key={pat.id}
                            onClick={() => handleSelectPatient(pat.id)}
                            className={`w-full text-left p-3.5 rounded-xl border flex flex-col justify-start transition-all cursor-pointer ${
                              selectedPatientId === pat.id
                                ? 'bg-cyan-950/20 border-cyan-800/60 text-white shadow-md'
                                : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800 text-zinc-400'
                            }`}
                          >
                            <strong className="text-zinc-200 text-xs font-semibold">{pat.name}</strong>
                            <span className="text-[10px] text-zinc-500 mt-0.5 font-mono truncate w-full">{pat.email}</span>
                            {pat.profile?.phone && (
                              <span className="text-[10px] text-zinc-500 font-mono">Phone: {pat.profile.phone}</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Patient History panel */}
                  <div className="md:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 min-h-[400px]">
                    {!selectedPatientId ? (
                      <div className="h-full flex items-center justify-center text-zinc-500 text-xs italic">
                        Select a patient from the directory to review clinical file history.
                      </div>
                    ) : loadingHistory ? (
                      <div className="h-full flex flex-col items-center justify-center space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
                        <p className="text-zinc-500 text-xs">Pulling electronic health records...</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Summary details card */}
                        <div className="border-b border-zinc-850 pb-4">
                          {patients.filter(p => p.id === selectedPatientId).map((pat) => (
                            <div key={pat.id} className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
                              <div>
                                <span className="text-zinc-500 block uppercase font-bold text-[9px]">Full Name</span>
                                <span className="font-semibold text-white">{pat.name}</span>
                              </div>
                              <div>
                                <span className="text-zinc-500 block uppercase font-bold text-[9px]">DOB / Blood Type</span>
                                <span className="font-semibold text-zinc-200">
                                  {pat.profile?.dob || 'Not set'} ({pat.profile?.bloodGroup || '?'})
                                </span>
                              </div>
                              <div>
                                <span className="text-rose-500 block uppercase font-bold text-[9px]">Allergies</span>
                                <span className="font-semibold text-rose-400">{pat.profile?.allergies || 'None'}</span>
                              </div>
                              <div>
                                <span className="text-zinc-500 block uppercase font-bold text-[9px]">Emergency contact</span>
                                <span className="font-semibold text-zinc-400 block truncate">{pat.profile?.emergencyContact || 'None'}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Internal Sub-navigation Tabs */}
                        <div className="flex space-x-2 border-b border-zinc-800 pb-2">
                          <button
                            type="button"
                            onClick={() => setSubTab('history')}
                            className={`py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              subTab === 'history'
                                ? 'bg-zinc-800 text-cyan-400 border border-zinc-700 shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-350'
                            }`}
                          >
                            📝 Medical History
                          </button>
                          <button
                            type="button"
                            onClick={() => setSubTab('labs')}
                            className={`py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              subTab === 'labs'
                                ? 'bg-zinc-800 text-cyan-400 border border-zinc-700 shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-350'
                            }`}
                          >
                            🔬 Lab Reports ({patientLabs.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSubTab('billing')}
                            className={`py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              subTab === 'billing'
                                ? 'bg-zinc-800 text-cyan-400 border border-zinc-700 shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-350'
                            }`}
                          >
                            💳 Billing Ledger ({patientInvoices.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSubTab('messages')}
                            className={`py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              subTab === 'messages'
                                ? 'bg-zinc-800 text-cyan-400 border border-zinc-700 shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-350'
                            }`}
                          >
                            💬 Secure Chat
                          </button>
                        </div>

                        {/* SUBTAB 1: MEDICAL HISTORY */}
                        {subTab === 'history' && (
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider text-indigo-400">Diagnosis Timeline</h4>
                            {patientHistory.length === 0 ? (
                              <p className="text-xs text-zinc-550 italic">No past consultation records on record.</p>
                            ) : (
                              <div className="space-y-3">
                                {patientHistory.map((rec) => (
                                  <div key={rec.id} className="bg-zinc-950 border border-zinc-850 p-5 rounded-xl space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                      <div>
                                        <strong className="text-white text-xs block">{rec.diagnosis}</strong>
                                        <span className="text-zinc-550 block text-[9px] mt-0.5">Consulted by {rec.doctorName} on {rec.date}</span>
                                      </div>
                                      <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
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
                                    <p className="text-xs text-zinc-350 leading-normal">{rec.notes}</p>
                                    
                                    {rec.prescription && rec.prescription.length > 0 && (
                                      <div className="pt-2 border-t border-zinc-900 grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-zinc-400">
                                        {rec.prescription.map((rx, idx) => (
                                          <div key={idx} className="bg-zinc-900/50 p-2 rounded-lg border border-zinc-850/50">
                                            <strong className="text-zinc-300">💊 {rx.drug}</strong> &mdash; <span className="font-mono text-cyan-400">{rx.dosage}</span>
                                            <span className="block text-[9px] text-zinc-505 italic mt-0.5">{rx.instructions} ({rx.duration})</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* SUBTAB 2: LAB REPORTS */}
                        {subTab === 'labs' && (
                          <div className="space-y-6">
                            {/* Order Lab Form */}
                            <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl space-y-4 font-sans">
                              <h4 className="text-xs font-bold text-white">Order New Laboratory Test</h4>
                              <form onSubmit={handleOrderLabTest} className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Test Name *</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. Lipid Profile, Complete Blood Count"
                                    value={newLabTestName}
                                    onChange={(e) => setNewLabTestName(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Reference Range (Optional)</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. 13.5 - 17.5 g/dL"
                                    value={newLabRefRange}
                                    onChange={(e) => setNewLabRefRange(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                                  />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                  <button
                                    type="submit"
                                    disabled={orderingLab}
                                    className="py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                                  >
                                    {orderingLab ? 'Ordering...' : 'Order Test'}
                                  </button>
                                </div>
                              </form>
                            </div>

                            {/* Lab Edit Result Form */}
                            {editingLabReportId && (
                              <div className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-2xl space-y-4 font-sans animate-fadeIn">
                                <div className="flex justify-between items-center">
                                  <h4 className="text-xs font-bold text-cyan-405">Enter Lab Results & Findings</h4>
                                  <button
                                    onClick={() => setEditingLabReportId(null)}
                                    className="text-zinc-500 hover:text-white text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                <form onSubmit={handleUpdateLabResult} className="space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-405">Measured Value *</label>
                                      <input
                                        type="text"
                                        required
                                        placeholder="e.g. 14.2 g/dL or Positive"
                                        value={labResultValue}
                                        onChange={(e) => setLabResultValue(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-405">Diagnosis Status *</label>
                                      <select
                                        value={labResultStatus}
                                        onChange={(e) => setLabResultStatus(e.target.value)}
                                        className="w-full bg-zinc-955 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                                      >
                                        <option value="Normal">Normal</option>
                                        <option value="High">High</option>
                                        <option value="Low">Low</option>
                                        <option value="Pending">Pending</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-405">Pathologist Comments / Notes</label>
                                    <textarea
                                      placeholder="Explain diagnostic deviations or follow-up suggestions..."
                                      value={labResultNotes}
                                      onChange={(e) => setLabResultNotes(e.target.value)}
                                      className="w-full bg-zinc-950 border border-zinc-855 rounded-xl px-3 py-2 text-xs text-white h-20 focus:outline-none resize-none font-sans"
                                    />
                                  </div>
                                  <div className="flex justify-end">
                                    <button
                                      type="submit"
                                      disabled={updatingLab}
                                      className="py-2 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                                    >
                                      {updatingLab ? 'Publishing...' : 'Publish Findings'}
                                    </button>
                                  </div>
                                </form>
                              </div>
                            )}

                            {/* Reports List */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider text-indigo-400">Lab Test History</h4>
                              {patientLabs.length === 0 ? (
                                <p className="text-xs text-zinc-550 italic">No lab findings ordered for this patient.</p>
                              ) : (
                                patientLabs.map((lab) => {
                                  const statusColors = {
                                    normal: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                                    high: 'bg-rose-500/10 text-rose-455 border-rose-500/20',
                                    low: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                                    pending: 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                  };
                                  return (
                                    <div key={lab.id} className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl space-y-2 font-sans hover:border-zinc-800 transition-colors">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <strong className="text-white text-xs block">{lab.testName}</strong>
                                          <span className="text-[9px] text-zinc-550 mt-0.5 block">Ordered on {lab.date} &bull; ID: {lab.id}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <button
                                            onClick={() => {
                                              setEditingLabReportId(lab.id);
                                              setLabResultValue(lab.result || '');
                                              setLabResultStatus(lab.status || 'Normal');
                                              setLabResultNotes(lab.notes || '');
                                            }}
                                            className="py-0.5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-cyan-405 font-bold rounded text-[9px] cursor-pointer"
                                          >
                                            Update Results
                                          </button>
                                          <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border capitalize ${
                                            statusColors[lab.status?.toLowerCase()] || statusColors.pending
                                          }`}>
                                            {lab.status}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 bg-zinc-900/30 p-2.5 rounded-lg border border-zinc-850/50 text-[10px]">
                                        <div>
                                          <span className="text-zinc-550 block">Result</span>
                                          <strong className="text-white text-xs font-mono">{lab.result || 'Pending Result'}</strong>
                                        </div>
                                        <div>
                                          <span className="text-zinc-550 block">Reference Range</span>
                                          <span className="text-zinc-300 font-mono">{lab.referenceRange}</span>
                                        </div>
                                      </div>
                                      {lab.notes && (
                                        <p className="text-[10px] text-zinc-400 bg-zinc-900/10 p-2 rounded border border-zinc-900 italic">
                                          Notes: {lab.notes}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}

                        {/* SUBTAB 3: BILLING */}
                        {subTab === 'billing' && (
                          <div className="space-y-4">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider text-indigo-400">Account Billing Invoices</h4>
                            <div className="grid grid-cols-2 gap-4 bg-zinc-950 p-4 border border-zinc-850 rounded-xl text-center text-xs">
                              <div>
                                <span className="text-[9px] text-zinc-500 font-bold uppercase block">Outstanding Balance</span>
                                <span className="text-sm font-extrabold text-amber-400 font-sans">
                                  ${patientInvoices.filter(i => i.status === 'unpaid').reduce((acc, i) => acc + i.amount, 0).toFixed(2)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-zinc-500 font-bold uppercase block">Total Paid Consultation Fees</span>
                                <span className="text-sm font-extrabold text-emerald-450 font-sans">
                                  ${patientInvoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.amount, 0).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {patientInvoices.length === 0 ? (
                                <p className="text-xs text-zinc-550 italic">No billing history recorded for this patient.</p>
                              ) : (
                                patientInvoices.map((inv) => (
                                  <div key={inv.id} className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl flex justify-between items-center text-xs font-sans hover:border-zinc-800 transition-colors">
                                    <div className="space-y-0.5">
                                      <strong className="text-white block">{inv.description}</strong>
                                      <span className="text-[9px] text-zinc-500 block">Date: {inv.date} &bull; ID: {inv.id}</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      <span className="font-mono text-zinc-200 font-bold">${inv.amount.toFixed(2)}</span>
                                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border capitalize ${
                                        inv.status === 'paid'
                                          ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20'
                                          : 'bg-amber-500/10 text-amber-455 border-amber-500/20'
                                      }`}>
                                        {inv.status}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        {/* SUBTAB 4: SECURE MESSAGING */}
                        {subTab === 'messages' && (
                          <div className="space-y-4 font-sans">
                            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                              <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider text-indigo-400">Direct Secure Chat</h4>
                                <p className="text-[10px] text-zinc-500 mt-0.5">Consultation chat history with patient</p>
                              </div>
                              <button
                                type="button"
                                onClick={refreshMessages}
                                className="py-1 px-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-350 hover:text-white rounded-lg text-[9px] font-bold transition-all cursor-pointer"
                              >
                                🔄 Sync Chat
                              </button>
                            </div>

                            {/* Chat Messages Log */}
                            <div 
                              className="h-[350px] overflow-y-auto p-4 space-y-3 bg-zinc-950/80 border border-zinc-850 rounded-2xl"
                              id="doctor-chat-messages-container"
                            >
                              {chatMessages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                                  <span className="text-2xl">💬</span>
                                  <p className="text-xs text-zinc-500">No messages exchanged yet.</p>
                                  <p className="text-[9px] text-zinc-650 max-w-xs">Send a direct message below to start the conversation.</p>
                                </div>
                              ) : (
                                chatMessages.map((msg) => {
                                  const isMine = msg.senderId === user.id;
                                  return (
                                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                      <div className={`max-w-[75%] p-3 rounded-2xl text-xs space-y-1 ${
                                        isMine
                                          ? 'bg-gradient-to-br from-cyan-600/90 to-indigo-650/90 text-white rounded-tr-none'
                                          : 'bg-zinc-800 text-zinc-250 rounded-tl-none border border-zinc-750'
                                      }`}>
                                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                        <span className="text-[8px] opacity-65 block text-right font-mono">
                                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* Input Form */}
                            <form onSubmit={sendMessage} className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={newMessageText}
                                onChange={(e) => setNewMessageText(e.target.value)}
                                placeholder="Type your secure message here..."
                                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder-zinc-550"
                              />
                              <button
                                type="submit"
                                disabled={!newMessageText.trim() || sendingMsg}
                                className="py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-955 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                              >
                                {sendingMsg ? '...' : 'Send'}
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'appointments' && (
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
                    <div>
                      <h3 className="text-sm font-bold text-white">Clinical Waiting Room & Check-In Queue</h3>
                      <p className="text-xs text-zinc-450 mt-0.5">Manage live consult transitions for called-in patients.</p>
                    </div>
                    <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      {waitingApts.length} Waiting
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-zinc-900/60 border-b border-zinc-850 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                          <th className="p-4">Patient Name</th>
                          <th className="p-4">Registered Date</th>
                          <th className="p-4">Scheduled Slot</th>
                          <th className="p-4">Consulting Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850">
                        {appointments.filter(a => ['confirmed', 'scheduled', 'waiting', 'in-consultation'].includes(a.status)).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-zinc-500 italic">
                              No active patients in the queue.
                            </td>
                          </tr>
                        ) : (
                          appointments.filter(a => ['confirmed', 'scheduled', 'waiting', 'in-consultation'].includes(a.status)).map((apt) => (
                            <tr key={apt.id} className="hover:bg-zinc-900/20 transition-colors">
                              <td className="p-4 font-semibold text-white">{apt.patientName}</td>
                              <td className="p-4 text-zinc-300 font-mono text-[11px]">{apt.date}</td>
                              <td className="p-4 text-zinc-400 font-mono text-[11px]">{apt.time}</td>
                              <td className="p-4">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getStatusClass(apt.status)}`}>
                                  {apt.status}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                {['confirmed', 'scheduled'].includes(apt.status) && (
                                  <button
                                    onClick={() => handleUpdateStatus(apt.id, 'waiting')}
                                    className="py-1 px-3 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded text-[10px] cursor-pointer shadow"
                                  >
                                    Call In
                                  </button>
                                )}
                                {apt.status === 'waiting' && (
                                  <button
                                    onClick={() => handleUpdateStatus(apt.id, 'in-consultation')}
                                    className="py-1 px-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded text-[10px] cursor-pointer shadow"
                                  >
                                    Start Consult
                                  </button>
                                )}
                                {apt.status === 'in-consultation' && (
                                  <div className="flex justify-end space-x-1.5">
                                    <button
                                      onClick={() => setActiveConsultation(apt)}
                                      className="py-1 px-3 bg-purple-500 hover:bg-purple-400 text-zinc-950 font-bold rounded text-[10px] cursor-pointer shadow"
                                    >
                                      Consult
                                    </button>
                                    <button
                                      onClick={() => handleUpdateStatus(apt.id, 'completed')}
                                      className="py-1 px-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded text-[10px] cursor-pointer shadow"
                                    >
                                      Complete
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'reports' && (
                <div className="space-y-6">
                  {/* Dynamic diagnosis stats */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-white mb-4">Physician Diagnostic Performance</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                        <span className="text-[10px] text-zinc-550 font-bold uppercase block">Monthly Capacity</span>
                        <span className="text-2xl font-extrabold text-white">180 slots</span>
                      </div>
                      <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                        <span className="text-[10px] text-zinc-550 font-bold uppercase block">Records Written</span>
                        <span className="text-2xl font-extrabold text-cyan-400">{records.length} files</span>
                      </div>
                      <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                        <span className="text-[10px] text-zinc-550 font-bold uppercase block">Avg Session Time</span>
                        <span className="text-2xl font-extrabold text-indigo-400">12.5 mins</span>
                      </div>
                      <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                        <span className="text-[10px] text-zinc-550 font-bold uppercase block">Referral Rate</span>
                        <span className="text-2xl font-extrabold text-emerald-400">4.2%</span>
                      </div>
                    </div>
                  </div>

                  {/* Diagnosis registry table */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
                      <h3 className="text-sm font-bold text-white">Clinical Diagnosis Records Written</h3>
                      <span className="text-xs text-zinc-550">{filteredRecords.length} Record(s) found</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-zinc-900/60 border-b border-zinc-850 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                            <th className="p-4">Record ID</th>
                            <th className="p-4">Diagnosis Findings</th>
                            <th className="p-4">Date Issued</th>
                            <th className="p-4">Prescription written</th>
                            <th className="p-4">Comments / Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850">
                          {filteredRecords.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-zinc-500 italic">
                                No clinical records found.
                              </td>
                            </tr>
                          ) : (
                            filteredRecords.map((rec) => (
                              <tr key={rec.id} className="hover:bg-zinc-900/20 transition-colors">
                                <td className="p-4 font-mono text-zinc-450">{rec.id.substring(0, 8)}...</td>
                                <td className="p-4 font-semibold text-white">
                                  {rec.diagnosis}
                                  {(rec.symptoms || rec.treatment) && (
                                    <div className="flex flex-col gap-1 mt-1 text-[9px] font-normal text-zinc-400">
                                      {rec.symptoms && <span>🤒 Symptoms: {rec.symptoms}</span>}
                                      {rec.treatment && <span>💊 Treatment: {rec.treatment}</span>}
                                    </div>
                                  )}
                                </td>
                                <td className="p-4 text-zinc-300 font-mono">{rec.date}</td>
                                <td className="p-4">
                                  <span className="text-cyan-400 font-bold">
                                    💊 {rec.prescription?.length || 0} items
                                  </span>
                                </td>
                                <td className="p-4 text-zinc-450 truncate max-w-xs">{rec.notes || 'N/A'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  <div className="md:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-6">
                    <div>
                      <h3 className="text-md font-bold text-white">Physician Consulting Profile</h3>
                      <p className="text-xs text-zinc-450 mt-1">Configure your clinical availability, office settings, and contacts.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Office consultation room</label>
                          <input
                            type="text"
                            defaultValue={user.profile?.room || 'Cabinet 101'}
                            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Clinical Specialization</label>
                          <input
                            type="text"
                            defaultValue={user.profile?.specialization || 'General Medicine'}
                            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Consultation Contact Phone</label>
                          <input
                            type="text"
                            defaultValue={user.profile?.phone || '+1 (555) 012-3499'}
                            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Session Time Duration Slot</label>
                          <select className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none">
                            <option>15 Minutes per patient</option>
                            <option>30 Minutes per patient</option>
                            <option>45 Minutes per patient</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => alert('Consulting settings simulated saved successfully!')}
                          className="py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                        >
                          Update Consulting Profile
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Consultation schedule settings side card */}
                  <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Active Clinical Days</h4>
                    <div className="space-y-3.5 text-xs">
                      <label className="flex items-center space-x-2 text-zinc-350 cursor-pointer">
                        <input type="checkbox" defaultChecked className="accent-cyan-400" />
                        <span>Monday Consultation Hours</span>
                      </label>
                      <label className="flex items-center space-x-2 text-zinc-350 cursor-pointer">
                        <input type="checkbox" defaultChecked className="accent-cyan-400" />
                        <span>Tuesday Consultation Hours</span>
                      </label>
                      <label className="flex items-center space-x-2 text-zinc-350 cursor-pointer">
                        <input type="checkbox" defaultChecked className="accent-cyan-400" />
                        <span>Wednesday Consultation Hours</span>
                      </label>
                      <label className="flex items-center space-x-2 text-zinc-350 cursor-pointer">
                        <input type="checkbox" defaultChecked className="accent-cyan-400" />
                        <span>Thursday Consultation Hours</span>
                      </label>
                      <label className="flex items-center space-x-2 text-zinc-350 cursor-pointer">
                        <input type="checkbox" defaultChecked className="accent-cyan-400" />
                        <span>Friday Consultation Hours</span>
                      </label>
                      <label className="flex items-center space-x-2 text-zinc-550 cursor-pointer">
                        <input type="checkbox" className="accent-cyan-400" />
                        <span>Saturday Consultation Hours (Off)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'messages' && (
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden h-[600px] flex animate-fadeIn">
                  {/* Left Clinic Directory Panel */}
                  <div className="w-1/3 border-r border-zinc-800 flex flex-col h-full bg-zinc-950/20">
                    <div className="p-4 border-b border-zinc-800">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider text-indigo-400">Clinic Directory</h3>
                      <p className="text-[9px] text-zinc-500 mt-0.5">Select a staff member or patient to chat</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-4">
                      {/* Receptionists (Front Desk) Section */}
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-cyan-400/80 px-2 block">🔔 Front Desk Staff</span>
                        <div className="space-y-0.5">
                          {receptionists.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).map((recep) => {
                            const isSelected = selectedChatUser?.id === recep.id;
                            return (
                              <button
                                key={recep.id}
                                onClick={() => selectUserChat(recep)}
                                className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border-cyan-500/30 text-cyan-400 font-semibold shadow-sm'
                                    : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-800/40 hover:text-white'
                                }`}
                              >
                                <strong className="text-xs block font-bold">{recep.name}</strong>
                                <span className="text-[9px] text-zinc-555 block mt-0.5">{recep.email}</span>
                              </button>
                            );
                          })}
                          {receptionists.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                            <span className="text-[9px] text-zinc-600 px-2 block italic">No front desk staff found</span>
                          )}
                        </div>
                      </div>

                      {/* Patients Section */}
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-400/80 px-2 block">👤 Patients</span>
                        <div className="space-y-0.5">
                          {patients.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((pat) => {
                            const isSelected = selectedChatUser?.id === pat.id;
                            return (
                              <button
                                key={pat.id}
                                onClick={() => selectUserChat(pat)}
                                className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border-cyan-500/30 text-cyan-400 font-semibold shadow-sm'
                                    : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-800/40 hover:text-white'
                                }`}
                              >
                                <strong className="text-xs block font-bold">{pat.name}</strong>
                                <span className="text-[9px] font-mono text-zinc-555 block mt-0.5">ID: {pat.id.substring(0, 8)}...</span>
                              </button>
                            );
                          })}
                          {patients.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                            <span className="text-[9px] text-zinc-600 px-2 block italic">No patients found</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Chat Panel */}
                  <div className="flex-1 flex flex-col h-full bg-zinc-950/40">
                    {selectedChatUser ? (
                      <>
                        {/* Header */}
                        <div className="p-4 border-b border-zinc-800 bg-zinc-900/30 flex justify-between items-center font-sans">
                          <div>
                            <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                              <span>{selectedChatUser.role === 'receptionist' ? '🔔' : '👤'}</span>
                              <span>{selectedChatUser.name}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-850 text-zinc-400 capitalize font-medium">{selectedChatUser.role === 'receptionist' ? 'Front Desk' : 'Patient'}</span>
                            </h4>
                            <p className="text-[10px] text-zinc-550 mt-0.5 font-sans">Secure messaging thread &bull; {selectedChatUser.email}</p>
                          </div>
                          <button
                            onClick={refreshMessages}
                            className="py-1.5 px-3 bg-zinc-900 hover:bg-zinc-855 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg text-[9px] font-bold cursor-pointer transition-all"
                          >
                            🔄 Sync Chat
                          </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3" id="doctor-chat-messages-container">
                          {chatMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2 font-sans">
                              <span className="text-3xl">💬</span>
                              <p className="text-xs text-zinc-500">No messages exchanged yet.</p>
                              <p className="text-[10px] text-zinc-650 max-w-xs">Send a secure message below to initiate communication.</p>
                            </div>
                          ) : (
                            chatMessages.map((msg) => {
                              const isMine = msg.senderId === user.id;
                              return (
                                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[70%] p-3 rounded-2xl text-xs space-y-1 ${
                                    isMine
                                      ? 'bg-gradient-to-br from-cyan-600/90 to-indigo-650/90 text-white rounded-tr-none'
                                      : 'bg-zinc-800 text-zinc-250 rounded-tl-none border border-zinc-750'
                                  }`}>
                                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                    <span className="text-[8px] opacity-65 block text-right font-mono">
                                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={sendMessage} className="p-4 border-t border-zinc-850 bg-zinc-950 flex items-center space-x-2 font-sans">
                          <input
                            type="text"
                            value={newMessageText}
                            onChange={(e) => setNewMessageText(e.target.value)}
                            placeholder={`Send secure message to ${selectedChatUser.name}...`}
                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder-zinc-550"
                          />
                          <button
                            type="submit"
                            disabled={!newMessageText.trim() || sendingMsg}
                            className="py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-955 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                          >
                            {sendingMsg ? '...' : 'Send'}
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 font-sans">
                        <div className="h-16 w-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl text-zinc-500 shadow-inner">
                          💬
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Clinic Secure Messaging</h4>
                          <p className="text-xs text-zinc-550 max-w-sm mt-1">Select a patient or front desk receptionist from the list to start a secure chat thread.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

export default function DoctorDashboard() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/40 rounded-2xl border border-zinc-800 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
        <p className="text-zinc-500 text-sm">Collating doctor workspace records...</p>
      </div>
    }>
      <DoctorDashboardContent />
    </Suspense>
  );
}
