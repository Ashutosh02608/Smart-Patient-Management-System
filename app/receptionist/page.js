'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { useSearchParams } from 'next/navigation';

const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM'
];

function ReceptionistDashboardContent() {
  const { user } = useAuth();

  // Data States
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form States - Schedule Appointment
  const [schedPatientId, setSchedPatientId] = useState('');
  const [schedDoctorId, setSchedDoctorId] = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [schedReason, setSchedReason] = useState('');
  const [schedSuccess, setSchedSuccess] = useState('');
  const [schedError, setSchedError] = useState('');
  const [schedLoading, setSchedLoading] = useState(false);

  // Form States - Register Patient
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regGender, setRegGender] = useState('Not Specified');
  const [regBlood, setRegBlood] = useState('Not Specified');
  const [regAllergies, setRegAllergies] = useState('None');
  const [regEmergency, setRegEmergency] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Reschedule States
  const [reschedulingApt, setReschedulingApt] = useState(null);
  const [reschedDate, setReschedDate] = useState('');
  const [reschedTime, setReschedTime] = useState('');
  const [reschedError, setReschedError] = useState('');
  const [reschedSuccess, setReschedSuccess] = useState('');
  const [reschedLoading, setReschedLoading] = useState(false);

  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const isSlotBooked = (date, time, doctorId) => {
    return appointments.some(a => a.date === date && a.time === time && a.doctorId === doctorId && a.status !== 'cancelled');
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
      const [aptRes, patRes, docRes] = await Promise.all([
        fetch('/api/appointments'),
        fetch('/api/users?role=patient'),
        fetch('/api/users?role=doctor')
      ]);

      if (aptRes.ok && patRes.ok && docRes.ok) {
        const apts = await aptRes.json();
        const pats = await patRes.json();
        const docs = await docRes.json();

        // Sort appointments: today's first, date descending
        setAppointments(apts.sort((a, b) => new Date(b.date) - new Date(a.date)));
        setPatients(pats);
        setDoctors(docs);
      }
    } catch (err) {
      console.error("Error loading receptionist data:", err);
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

  // Appointment Status Updates (e.g. Check-in, Cancel)
  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Reschedule Appointment handler
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    setReschedError('');
    setReschedSuccess('');

    if (!reschedulingApt || !reschedDate || !reschedTime) {
      setReschedError('Date and time slot are required.');
      return;
    }

    setReschedLoading(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reschedulingApt.id,
          date: reschedDate,
          time: reschedTime
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reschedule appointment');

      setReschedSuccess('Appointment rescheduled successfully!');
      setTimeout(() => {
        setReschedulingApt(null);
        setReschedDate('');
        setReschedTime('');
        setReschedSuccess('');
        fetchData();
      }, 1500);
    } catch (err) {
      setReschedError(err.message || 'An error occurred.');
    } finally {
      setReschedLoading(false);
    }
  };

  // Delete/Remove Appointment
  const handleDeleteAppointment = async (id) => {
    if (!confirm('Are you sure you want to delete this appointment slot permanently?')) return;
    try {
      const res = await fetch(`/api/appointments?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Error deleting appointment:", err);
    }
  };

  // Schedule Appointment Submission
  const handleScheduleAppointment = async (e) => {
    e.preventDefault();
    setSchedSuccess('');
    setSchedError('');

    if (!schedPatientId || !schedDoctorId || !schedDate || !schedTime) {
      setSchedError('Patient, doctor, date and time slots are required.');
      return;
    }

    setSchedLoading(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: schedPatientId,
          doctorId: schedDoctorId,
          date: schedDate,
          time: schedTime,
          reason: schedReason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule appointment');

      setSchedSuccess('Appointment scheduled successfully!');
      setSchedPatientId('');
      setSchedDoctorId('');
      setSchedDate('');
      setSchedTime('');
      setSchedReason('');

      fetchData();
    } catch (err) {
      setSchedError(err.message || 'An error occurred.');
    } finally {
      setSchedLoading(false);
    }
  };

  // Register Patient Submission
  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setRegSuccess('');
    setRegError('');

    if (!regName || !regEmail) {
      setRegError('Name and email are required.');
      return;
    }

    setRegLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: 'patient123', // default credentials
          role: 'patient',
          profile: {
            phone: regPhone,
            dob: regDob,
            gender: regGender,
            bloodGroup: regBlood,
            allergies: regAllergies,
            emergencyContact: regEmergency
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register patient');

      setRegSuccess(`Patient ${data.name} registered successfully! (Default Password: patient123)`);
      
      // Clear inputs
      setRegName('');
      setRegEmail('');
      setRegPhone('');
      setRegDob('');
      setRegGender('Not Specified');
      setRegBlood('Not Specified');
      setRegAllergies('None');
      setRegEmergency('');

      fetchData();
      
      // Auto prepopulate the scheduler with this new patient!
      setSchedPatientId(data.id);
      setTimeout(() => setActiveTab('appointments'), 1500);
    } catch (err) {
      setRegError(err.message || 'An error occurred.');
    } finally {
      setRegLoading(false);
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
      default: return 'bg-zinc-850 text-zinc-400 border-zinc-700';
    }
  };

  // Filters based on searchQuery
  const filteredAppointments = appointments.filter(a =>
    a.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const queueCheckins = appointments.filter(a => ['confirmed', 'scheduled', 'waiting', 'in-consultation'].includes(a.status));
  const filteredCheckins = queueCheckins.filter(a =>
    a.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.doctorName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout
      roleTitle="Receptionist"
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        setSearchQuery('');
      }}
      badges={{ appointments: appointments.filter(a => a.status === 'pending').length }}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={
        activeTab === 'dashboard' ? 'Search check-in queue...' :
        activeTab === 'patients' ? 'Search registered patients...' :
        activeTab === 'appointments' ? 'Search schedules...' :
        'Search clinical events...'
      }
    >
      {loadingData ? (
        <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/40 rounded-2xl border border-zinc-800 space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          <p className="text-zinc-500 text-sm">Syncing clinic registry systems...</p>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl space-y-1">
                  <span className="block text-xs text-zinc-550 uppercase font-bold tracking-wider">Scheduled Today</span>
                  <span className="block text-3xl font-extrabold text-white">{appointments.length}</span>
                  <span className="text-[10px] text-cyan-400 block font-semibold">&bull; Active time-slots</span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl space-y-1">
                  <span className="block text-xs text-zinc-550 uppercase font-bold tracking-wider">Checked-In Queue</span>
                  <span className="block text-3xl font-extrabold text-white">
                    {appointments.filter(a => a.status === 'waiting').length}
                  </span>
                  <span className="text-[10px] text-amber-400 block font-semibold animate-pulse">&bull; In waiting room</span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl space-y-1">
                  <span className="block text-xs text-zinc-550 uppercase font-bold tracking-wider">Consulting Rooms</span>
                  <span className="block text-3xl font-extrabold text-white">
                    {appointments.filter(a => a.status === 'in-consultation').length}
                  </span>
                  <span className="text-[10px] text-indigo-400 block font-semibold">&bull; Doctor sessions live</span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl space-y-1">
                  <span className="block text-xs text-zinc-550 uppercase font-bold tracking-wider">Patients Archive</span>
                  <span className="block text-3xl font-extrabold text-white">{patients.length}</span>
                  <span className="text-[10px] text-emerald-400 block font-semibold">&bull; Registered profiles</span>
                </div>
              </div>

              {/* Check-In Queue Directory */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
                  <h3 className="text-sm font-bold text-white">Daily Check-In & Waiting Room Queue</h3>
                  <span className="text-xs text-zinc-550">{filteredCheckins.length} Patient(s) in queue</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-900/60 border-b border-zinc-850 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="p-4">Patient Name</th>
                        <th className="p-4">Consulting Physician</th>
                        <th className="p-4">Scheduled Slot</th>
                        <th className="p-4">Consultation Status</th>
                        <th className="p-4 text-right">Queue Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {filteredCheckins.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-zinc-500 italic">
                            No active patients found in today&apos;s check-in queue.
                          </td>
                        </tr>
                      ) : (
                        filteredCheckins.map((apt) => (
                          <tr key={apt.id} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="p-4">
                              <span className="font-semibold text-white block">{apt.patientName}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">ID: {apt.patientId}</span>
                            </td>
                            <td className="p-4 text-zinc-300 font-semibold">Dr. {apt.doctorName}</td>
                            <td className="p-4 text-zinc-300 font-mono">{apt.time} ({apt.date})</td>
                            <td className="p-4">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getStatusClass(apt.status)}`}>
                                {apt.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end space-x-2.5 text-xs font-semibold">
                                {['confirmed', 'scheduled'].includes(apt.status) && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateStatus(apt.id, 'waiting')}
                                      className="text-cyan-400 hover:text-cyan-350 cursor-pointer"
                                    >
                                      Check In
                                    </button>
                                    <span className="text-zinc-800">|</span>
                                    <button
                                      onClick={() => handleUpdateStatus(apt.id, 'cancelled')}
                                      className="text-rose-400 hover:text-rose-350 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}
                                {apt.status === 'waiting' && (
                                  <span className="text-zinc-500 font-normal italic">Waiting Area</span>
                                )}
                                {apt.status === 'in-consultation' && (
                                  <span className="text-purple-400 font-bold animate-pulse">In Session</span>
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
            <div className="space-y-6">
              {/* Form & census */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-md font-bold text-white">Register Clinic Patient Profile</h3>
                    <p className="text-xs text-zinc-450">Add new patient health file to database with immediate consultation scheduling authorization.</p>
                  </div>

                  {regError && (
                    <div className="bg-rose-950/40 border border-rose-800 text-rose-200 p-4 rounded-xl text-xs">
                      {regError}
                    </div>
                  )}

                  {regSuccess && (
                    <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 p-4 rounded-xl text-xs">
                      {regSuccess}
                    </div>
                  )}

                  <form onSubmit={handleRegisterPatient} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label htmlFor="reg-name" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Patient Full Name *</label>
                        <input
                          id="reg-name"
                          type="text"
                          required
                          placeholder="e.g. John Doe"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="reg-email" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Patient Email Address *</label>
                        <input
                          id="reg-email"
                          type="email"
                          required
                          placeholder="john.doe@gmail.com"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label htmlFor="reg-phone" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Phone Number</label>
                        <input
                          id="reg-phone"
                          type="text"
                          placeholder="+1 (555) 019-2834"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="reg-dob" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Date of Birth</label>
                        <input
                          id="reg-dob"
                          type="date"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none text-zinc-400"
                          value={regDob}
                          onChange={(e) => setRegDob(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="reg-gender" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Biological Gender</label>
                        <select
                          id="reg-gender"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                          value={regGender}
                          onChange={(e) => setRegGender(e.target.value)}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Non-Binary">Non-Binary</option>
                          <option value="Not Specified">Not Specified</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label htmlFor="reg-blood" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Blood Group</label>
                        <select
                          id="reg-blood"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                          value={regBlood}
                          onChange={(e) => setRegBlood(e.target.value)}
                        >
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                          <option value="Not Specified">Not Specified</option>
                        </select>
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label htmlFor="reg-emergency" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Emergency Contact (Name & Phone)</label>
                        <input
                          id="reg-emergency"
                          type="text"
                          placeholder="e.g. Jane Doe (+1 555-019-2233)"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                          value={regEmergency}
                          onChange={(e) => setRegEmergency(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="reg-allergies" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Known Medical Allergies</label>
                      <input
                        id="reg-allergies"
                        type="text"
                        placeholder="e.g. Penicillin, Pollen, Peanuts (If none, write 'None')"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                        value={regAllergies}
                        onChange={(e) => setRegAllergies(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={regLoading}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold text-xs shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {regLoading ? 'Registering Patient Profile...' : 'Complete Patient Registry'}
                    </button>
                  </form>
                </div>

                {/* Patient summary details side card */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <h4 className="text-[10px] font-bold text-white uppercase tracking-wider text-indigo-400">Default Auth Policy</h4>
                  <p className="text-xs text-zinc-400 leading-normal">
                    Patients are immediately approved to log in upon signup. 
                  </p>
                  <p className="text-xs text-zinc-500 leading-normal">
                    Initial patient login credentials are set automatically:
                    <span className="block font-mono bg-zinc-950 border border-zinc-850 p-2 rounded text-[10px] text-cyan-400 mt-2">
                      Username: [Patient Email]<br />
                      Password: patient123
                    </span>
                  </p>
                </div>
              </div>

              {/* Patient registry table */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
                  <h3 className="text-sm font-bold text-white">Clinic Patients Registry Directory</h3>
                  <span className="text-xs text-zinc-550">{filteredPatients.length} Patient(s) registered</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-900/60 border-b border-zinc-850 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="p-4">Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Contact Phone</th>
                        <th className="p-4">Blood group</th>
                        <th className="p-4">Known Allergies</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {filteredPatients.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-zinc-500 italic">
                            No patient accounts found matching search query.
                          </td>
                        </tr>
                      ) : (
                        filteredPatients.map((p) => (
                          <tr key={p.id} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="p-4 font-semibold text-white">{p.name}</td>
                            <td className="p-4 text-zinc-300 font-mono">{p.email}</td>
                            <td className="p-4 text-zinc-400">{p.profile?.phone || 'Not specified'}</td>
                            <td className="p-4 font-bold text-cyan-400">{p.profile?.bloodGroup || 'Not specified'}</td>
                            <td className="p-4 text-zinc-400">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                p.profile?.allergies && p.profile?.allergies !== 'None'
                                  ? 'bg-rose-500/10 text-rose-400'
                                  : 'bg-zinc-850 text-zinc-550'
                              }`}>
                                {p.profile?.allergies || 'None'}
                              </span>
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

          {activeTab === 'appointments' && (
            <div className="space-y-6">
              {/* Form & bookings breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Book appointment form panel */}
                <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-md font-bold text-white">Schedule Patient Consultation Booking</h3>
                    <p className="text-xs text-zinc-450">Assign checked-in or newly registered patients to available consulting physicians.</p>
                  </div>

                  {schedError && (
                    <div className="bg-rose-950/40 border border-rose-800 text-rose-200 p-4 rounded-xl text-xs">
                      {schedError}
                    </div>
                  )}

                  {schedSuccess && (
                    <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 p-4 rounded-xl text-xs">
                      {schedSuccess}
                    </div>
                  )}

                  <form onSubmit={handleScheduleAppointment} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label htmlFor="sched-patient" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Select Patient *</label>
                        <select
                          id="sched-patient"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                          value={schedPatientId}
                          onChange={(e) => setSchedPatientId(e.target.value)}
                        >
                          <option value="">-- Choose Registered Patient --</option>
                          {patients.map((pat) => (
                            <option key={pat.id} value={pat.id}>
                              {pat.name} ({pat.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="sched-doctor" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Select Physician *</label>
                        <select
                          id="sched-doctor"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                          value={schedDoctorId}
                          onChange={(e) => {
                            setSchedDoctorId(e.target.value);
                            setSchedTime('');
                          }}
                        >
                          <option value="">-- Choose Consulting MD --</option>
                          {doctors.map((doc) => (
                            <option key={doc.id} value={doc.id}>
                              Dr. {doc.name} ({doc.profile?.specialization || 'General'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label htmlFor="sched-date" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Date *</label>
                        <input
                          id="sched-date"
                          type="date"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none text-zinc-400"
                          value={schedDate}
                          onChange={(e) => {
                            setSchedDate(e.target.value);
                            setSchedTime('');
                          }}
                        />
                      </div>
                    </div>

                    {schedDate && schedDoctorId && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block font-sans">Select Available Time Slot *</label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {TIME_SLOTS.map((slot) => {
                            const taken = isSlotBooked(schedDate, slot, schedDoctorId);
                            const selected = schedTime === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled={taken}
                                onClick={() => setSchedTime(slot)}
                                className={`py-2 px-1 text-center rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                                  selected 
                                    ? 'bg-cyan-500 text-zinc-950 border-cyan-400 shadow-sm'
                                    : taken
                                    ? 'bg-zinc-900/40 text-zinc-550 border-zinc-900/60 line-through cursor-not-allowed opacity-40'
                                    : 'bg-zinc-950 text-zinc-300 border-zinc-850 hover:border-zinc-700 hover:text-white'
                                }`}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                        {schedTime && (
                          <div className="text-[10px] text-cyan-400 font-semibold mt-1">
                            ✓ Selected Slot: {schedTime}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-1">
                      <label htmlFor="sched-reason" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Consultation Reason / Chief Complaint</label>
                      <input
                        id="sched-reason"
                        type="text"
                        placeholder="e.g. Annual physical exam, severe sore throat, fever"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                        value={schedReason}
                        onChange={(e) => setSchedReason(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={schedLoading}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold text-xs shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {schedLoading ? 'Scheduling Consultation Booking...' : 'Schedule Appointment'}
                    </button>
                  </form>
                </div>

                {/* MD office census summary side card */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <h4 className="text-[10px] font-bold text-white uppercase tracking-wider text-indigo-400">Active MD Directory</h4>
                  <div className="space-y-3.5 text-[11px] text-zinc-400">
                    {doctors.length === 0 ? (
                      <p className="italic text-zinc-550">No doctors onboarded.</p>
                    ) : (
                      doctors.map((doc) => (
                        <div key={doc.id} className="flex justify-between border-b border-zinc-850 pb-2">
                          <span>Dr. {doc.name}</span>
                          <span className="font-semibold text-cyan-455 text-[10px] uppercase">
                            Room {doc.profile?.room || '101'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Consultation register directory table */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
                  <h3 className="text-sm font-bold text-white">Clinic Consultations Register</h3>
                  <span className="text-xs text-zinc-550">{filteredAppointments.length} Booking(s) found</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-900/60 border-b border-zinc-850 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="p-4">Patient</th>
                        <th className="p-4">Assigned Doctor</th>
                        <th className="p-4">Consultation Date & Slot</th>
                        <th className="p-4">Chief Complaint</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {filteredAppointments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-zinc-500 italic">
                            No appointments scheduled matching search.
                          </td>
                        </tr>
                      ) : (
                        filteredAppointments.map((apt) => (
                          <tr key={apt.id} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="p-4 font-semibold text-white">{apt.patientName}</td>
                            <td className="p-4 text-zinc-300">Dr. {apt.doctorName}</td>
                            <td className="p-4 font-mono text-[11px]">
                              <span>📅 {apt.date}</span>
                              <span className="block text-zinc-550 text-[10px]">{apt.time}</span>
                            </td>
                            <td className="p-4 text-zinc-450 truncate max-w-xs">{apt.reason || 'General check-in'}</td>
                            <td className="p-4">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getStatusClass(apt.status)}`}>
                                {apt.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end items-center space-x-2.5 text-xs font-semibold">
                                {apt.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleUpdateStatus(apt.id, 'confirmed')}
                                      className="text-emerald-400 hover:text-emerald-355 cursor-pointer"
                                    >
                                      Approve
                                    </button>
                                    <span className="text-zinc-800">|</span>
                                  </>
                                )}
                                {['pending', 'confirmed', 'scheduled', 'waiting'].includes(apt.status) && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setReschedulingApt(apt);
                                        setReschedDate(apt.date || '');
                                        setReschedTime(apt.time || '');
                                      }}
                                      className="text-cyan-400 hover:text-cyan-350 cursor-pointer"
                                    >
                                      Reschedule
                                    </button>
                                    <span className="text-zinc-800">|</span>
                                    <button
                                      onClick={() => handleUpdateStatus(apt.id, 'cancelled')}
                                      className="text-rose-400 hover:text-rose-350 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <span className="text-zinc-800">|</span>
                                  </>
                                )}
                                <button
                                  onClick={() => handleDeleteAppointment(apt.id)}
                                  className="text-zinc-500 hover:text-rose-500 font-bold transition-colors cursor-pointer"
                                >
                                  Delete
                                </button>
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

          {activeTab === 'reports' && (
            <div className="space-y-6">
              {/* Daily analytics reports */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">Front Desk Performance Logs</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                    <span className="text-[10px] text-zinc-550 font-bold uppercase block">Token printer queue</span>
                    <span className="text-2xl font-extrabold text-white">Online</span>
                  </div>
                  <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                    <span className="text-[10px] text-zinc-550 font-bold uppercase block">Check-ins Completed</span>
                    <span className="text-2xl font-extrabold text-cyan-400">
                      {appointments.filter(a => a.status === 'completed').length} patients
                    </span>
                  </div>
                  <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                    <span className="text-[10px] text-zinc-550 font-bold uppercase block">Avg check-in time</span>
                    <span className="text-2xl font-extrabold text-indigo-400">1.8 mins</span>
                  </div>
                  <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                    <span className="text-[10px] text-zinc-550 font-bold uppercase block">Cancellation rate</span>
                    <span className="text-2xl font-extrabold text-rose-400">
                      {appointments.length > 0
                        ? Math.round((appointments.filter(a => a.status === 'cancelled').length / appointments.length) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Logs */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white">Daily Check-In Event Streams</h3>
                  <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">Front desk sync active</span>
                </div>

                <div className="space-y-3 font-mono text-[10.5px] text-zinc-400 pt-2 leading-relaxed">
                  <div className="flex space-x-4 border-b border-zinc-850 pb-2">
                    <span className="text-zinc-550">[{new Date().toLocaleDateString()}] 19:25:30</span>
                    <span className="text-cyan-400">[CHECK-IN]</span>
                    <span>Patient checked in successfully at front desk terminal.</span>
                  </div>
                  <div className="flex space-x-4 border-b border-zinc-850 pb-2">
                    <span className="text-zinc-550">[{new Date().toLocaleDateString()}] 12:10:45</span>
                    <span className="text-indigo-400">[SCHEDULE]</span>
                    <span>New consultation scheduled with Dr. Watson.</span>
                  </div>
                  <div className="flex space-x-4">
                    <span className="text-zinc-550">[{new Date().toLocaleDateString()}] 09:15:22</span>
                    <span className="text-emerald-400">[PATIENT]</span>
                    <span>Patient profile registered successfully. Default password: patient123</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="md:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-md font-bold text-white">Front Desk Workspace Settings</h3>
                  <p className="text-xs text-zinc-450 mt-1">Configure front desk ticket printers, scheduling blocks, and token display.</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Ticket Number Prefix</label>
                      <input
                        type="text"
                        defaultValue="CP-TICK"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Queue refresh interval</label>
                      <select className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none">
                        <option>30 Seconds (Live Refresh)</option>
                        <option>1 Minute</option>
                        <option>5 Minutes</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => alert('Front desk workspace configuration simulated saved!')}
                      className="py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                    >
                      Save Workspace Configuration
                    </button>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-bold">Front Desk Hardware Policies</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-white block">Auto-Print Token Slips</span>
                      <span className="text-[10px] text-zinc-550">Print ticket immediately on check-in</span>
                    </div>
                    <div className="h-5 w-9 bg-cyan-500/10 border border-cyan-400/35 rounded-full flex items-center justify-end px-0.5 cursor-pointer">
                      <div className="h-4 w-4 bg-cyan-400 rounded-full"></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs border-t border-zinc-850 pt-3">
                    <div>
                      <span className="font-semibold text-white block">Sound Notification Alert</span>
                      <span className="text-[10px] text-zinc-550">Play chime when MD calls patient in</span>
                    </div>
                    <div className="h-5 w-9 bg-cyan-500/10 border border-cyan-400/35 rounded-full flex items-center justify-end px-0.5 cursor-pointer">
                      <div className="h-4 w-4 bg-cyan-400 rounded-full"></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs border-t border-zinc-850 pt-3">
                    <div>
                      <span className="font-semibold text-white block">Token Board Display sync</span>
                      <span className="text-[10px] text-zinc-550">Cast wait queue to wall display monitor</span>
                    </div>
                    <div className="h-5 w-9 bg-zinc-850 border border-zinc-750 rounded-full flex items-center px-0.5 cursor-pointer">
                      <div className="h-4 w-4 bg-zinc-600 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Reschedule Modal Overlay */}
      {reschedulingApt && (
        <div className="fixed inset-0 z-50 bg-zinc-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full space-y-6 shadow-2xl relative">
            <button
              onClick={() => setReschedulingApt(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors cursor-pointer text-lg"
            >
              ✕
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Reschedule Appointment (Staff Override)</h3>
              <p className="text-xs text-zinc-450">Select a new date and available time slot for Dr. {reschedulingApt.doctorName}.</p>
            </div>

            {reschedError && (
              <div className="bg-rose-950/40 border border-rose-800 text-rose-200 p-3 rounded-lg text-xs">
                {reschedError}
              </div>
            )}

            {reschedSuccess && (
              <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 p-3 rounded-lg text-xs">
                {reschedSuccess}
              </div>
            )}

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="resched-date" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Choose New Date *</label>
                <input
                  id="resched-date"
                  type="date"
                  required
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                  value={reschedDate}
                  onChange={(e) => {
                    setReschedDate(e.target.value);
                    setReschedTime('');
                  }}
                />
              </div>

              {reschedDate && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block font-sans">Available Slots *</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                    {TIME_SLOTS.map((slot) => {
                      const taken = isSlotBooked(reschedDate, slot, reschedulingApt.doctorId);
                      const selected = reschedTime === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={taken}
                          onClick={() => setReschedTime(slot)}
                          className={`py-2 px-1 text-center rounded-lg text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                            selected 
                              ? 'bg-cyan-500 text-zinc-950 border-cyan-400 shadow-sm'
                              : taken
                              ? 'bg-zinc-900/40 text-zinc-550 border-zinc-900/60 line-through cursor-not-allowed opacity-40'
                              : 'bg-zinc-950 text-zinc-300 border-zinc-850 hover:border-zinc-700 hover:text-white'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                  {reschedTime && (
                    <div className="text-[10px] text-cyan-400 font-semibold mt-1">
                      ✓ Rescheduled Slot: {reschedTime}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setReschedulingApt(null)}
                  className="py-2 px-4 border border-zinc-800 hover:border-zinc-750 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reschedLoading}
                  className="py-2 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold text-xs shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  {reschedLoading ? 'Saving...' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function ReceptionistDashboard() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/40 rounded-2xl border border-zinc-800 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
        <p className="text-zinc-500 text-sm">Collating front desk operations...</p>
      </div>
    }>
      <ReceptionistDashboardContent />
    </Suspense>
  );
}
