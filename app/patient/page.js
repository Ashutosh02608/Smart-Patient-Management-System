'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';

const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM'
];

export default function PatientDashboard() {
  const { user, refresh } = useAuth();
  
  // Data States
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form States
  const [bookDoctorId, setBookDoctorId] = useState('');
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [bookReason, setBookReason] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Profile Edit States
  const [editPhone, setEditPhone] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editGender, setEditGender] = useState('Not Specified');
  const [editBloodGroup, setEditBloodGroup] = useState('Not Specified');
  const [editAllergies, setEditAllergies] = useState('');
  const [editEmergency, setEditEmergency] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Reschedule States
  const [reschedulingApt, setReschedulingApt] = useState(null);
  const [reschedDate, setReschedDate] = useState('');
  const [reschedTime, setReschedTime] = useState('');
  const [reschedError, setReschedError] = useState('');
  const [reschedSuccess, setReschedSuccess] = useState('');
  const [reschedLoading, setReschedLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const isSlotBooked = (date, time, doctorId) => {
    return appointments.some(a => a.date === date && a.time === time && a.doctorId === doctorId && a.status !== 'cancelled');
  };

  // Fetch Dashboard Data
  const fetchData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [aptRes, recRes, docRes] = await Promise.all([
        fetch('/api/appointments'),
        fetch('/api/records'),
        fetch('/api/users?role=doctor')
      ]);

      if (aptRes.ok && recRes.ok && docRes.ok) {
        const apts = await aptRes.json();
        const recs = await recRes.json();
        const docs = await docRes.json();
        
        // Sort appointments: Scheduled/Waiting first, then by date desc
        setAppointments(apts.sort((a, b) => new Date(b.date) - new Date(a.date)));
        setRecords(recs.sort((a, b) => new Date(b.date) - new Date(a.date)));
        setDoctors(docs);

        // Prepopulate profile edit form
        if (user && user.profile) {
          setEditPhone(user.profile.phone || '');
          setEditDob(user.profile.dob || '');
          setEditGender(user.profile.gender || 'Not Specified');
          setEditBloodGroup(user.profile.bloodGroup || 'Not Specified');
          setEditAllergies(user.profile.allergies || 'None');
          setEditEmergency(user.profile.emergencyContact || '');
        }
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoadingData(false);
    }
  }, [user]);

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

  // Book Appointment Submission
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setBookingError('');
    setBookingSuccess('');
    
    if (!bookDoctorId || !bookDate || !bookTime) {
      setBookingError('Doctor, date, and time are required.');
      return;
    }

    setBookingLoading(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: bookDoctorId,
          date: bookDate,
          time: bookTime,
          reason: bookReason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to book appointment');

      setBookingSuccess('Appointment booked successfully!');
      setBookDoctorId('');
      setBookDate('');
      setBookTime('');
      setBookReason('');
      
      // Refresh list
      fetchData();
      setTimeout(() => setActiveTab('dashboard'), 1500);
    } catch (err) {
      setBookingError(err.message || 'An error occurred.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Update Profile Submission
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setProfileLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          profile: {
            phone: editPhone,
            dob: editDob,
            gender: editGender,
            bloodGroup: editBloodGroup,
            allergies: editAllergies,
            emergencyContact: editEmergency
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setProfileSuccess('Profile updated successfully!');
      await refresh(); // refresh user context
      fetchData();
    } catch (err) {
      setProfileError(err.message || 'An error occurred.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Cancel Appointment handler
  const handleCancelAppointment = async (id) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'cancelled' })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to cancel appointment:", err);
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

      setReschedSuccess('Rescheduled successfully! Pending staff review.');
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

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'confirmed': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'scheduled': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'waiting': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'in-consultation': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'cancelled': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  // Filters based on searchQuery
  const filteredAppointments = appointments.filter(a =>
    a.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDoctors = doctors.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.profile?.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecords = records.filter(r =>
    r.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.doctorName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingAppointments = appointments.filter(a => ['scheduled', 'waiting', 'in-consultation'].includes(a.status));

  return (
    <DashboardLayout
      roleTitle="Patient Portal"
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        setSearchQuery('');
      }}
      badges={{ appointments: pendingAppointments.length }}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={
        activeTab === 'dashboard' ? 'Search scheduled slots...' :
        activeTab === 'patients' ? 'Search clinical doctors...' :
        activeTab === 'appointments' ? 'Search consultation logs...' :
        activeTab === 'reports' ? 'Search medical records...' :
        'Search workspace settings...'
      }
    >
      {loadingData ? (
        <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/40 rounded-2xl border border-zinc-800 space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          <p className="text-zinc-500 text-sm">Syncing clinic database records...</p>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Health Summary Card */}
              <div className="bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 border border-zinc-800 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <span className="text-xs text-zinc-550 uppercase tracking-wider block">Allergies Warning</span>
                  <span className={`text-sm font-semibold truncate block ${user?.profile?.allergies && user.profile.allergies !== 'None' ? 'text-rose-400' : 'text-zinc-400'}`}>
                    {user?.profile?.allergies || 'None recorded'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-zinc-550 uppercase tracking-wider block">Blood Group</span>
                  <span className="text-sm font-semibold text-white block">
                    {user?.profile?.bloodGroup || 'Not set'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-zinc-550 uppercase tracking-wider block">Emergency Contact</span>
                  <span className="text-sm font-semibold text-zinc-300 block truncate">
                    {user?.profile?.emergencyContact || 'Not configured'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-zinc-550 uppercase tracking-wider block">Quick Action</span>
                  <button
                    onClick={() => setActiveTab('appointments')}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <span>📅 Book Consultation</span>
                  </button>
                </div>
              </div>

              {/* Scheduled Appointments Table */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span>📅</span> <span>Upcoming Booked Appointments</span>
                  </h3>
                  <span className="text-xs text-zinc-550">{pendingAppointments.length} Active booking(s)</span>
                </div>

                {pendingAppointments.length === 0 ? (
                  <div className="p-12 text-center text-zinc-500 text-xs space-y-3">
                    <p>You have no pending appointments scheduled.</p>
                    <button
                      onClick={() => setActiveTab('appointments')}
                      className="py-1.5 px-4 rounded-xl bg-cyan-950 text-cyan-400 font-semibold border border-cyan-800 hover:bg-cyan-900 text-xs transition-colors cursor-pointer"
                    >
                      Book a Consultation Slot
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-zinc-900/60 border-b border-zinc-850 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                          <th className="p-4">Physician</th>
                          <th className="p-4">Schedule Date</th>
                          <th className="p-4">Time Slot</th>
                          <th className="p-4">Chief Complaint / Notes</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850">
                        {pendingAppointments.map((apt) => (
                          <tr key={apt.id} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="p-4 font-semibold text-white">Dr. {apt.doctorName}</td>
                            <td className="p-4 text-zinc-300 font-mono">{apt.date}</td>
                            <td className="p-4 text-zinc-300 font-mono">{apt.time}</td>
                            <td className="p-4 text-zinc-400 max-w-xs truncate">{apt.reason || 'General checkup'}</td>
                            <td className="p-4">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getStatusClass(apt.status)}`}>
                                {apt.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end space-x-3">
                                {['scheduled', 'waiting', 'pending', 'confirmed'].includes(apt.status) && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setReschedulingApt(apt);
                                        setReschedDate(apt.date || '');
                                        setReschedTime(apt.time || '');
                                      }}
                                      className="text-xs font-bold text-cyan-405 hover:text-cyan-300 transition-colors cursor-pointer"
                                    >
                                      Reschedule
                                    </button>
                                    <button
                                      onClick={() => handleCancelAppointment(apt.id)}
                                      className="text-xs font-bold text-rose-400 hover:text-rose-350 transition-colors cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'patients' && (
            <div className="space-y-6">
              {/* Doctor Directory */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
                  <h3 className="text-sm font-bold text-white">Available Consulting Doctors Directory</h3>
                  <span className="text-xs text-zinc-550">{filteredDoctors.length} Doctors(s) listed</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                  {filteredDoctors.length === 0 ? (
                    <p className="text-xs text-zinc-550 italic col-span-2 text-center p-4">No consulting physicians found.</p>
                  ) : (
                    filteredDoctors.map((doc) => (
                      <div key={doc.id} className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl flex items-center justify-between">
                        <div className="space-y-1">
                          <strong className="text-white text-xs block">Dr. {doc.name}</strong>
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold font-mono capitalize">
                            {doc.profile?.specialization || 'General Consultation'}
                          </span>
                          <span className="block text-[10px] text-zinc-500 mt-1">Room: {doc.profile?.room || 'Cabinet 101'}</span>
                        </div>
                        <button
                          onClick={() => {
                            setBookDoctorId(doc.id);
                            setActiveTab('appointments');
                          }}
                          className="py-1 px-3 bg-indigo-950 hover:bg-indigo-900 border border-indigo-850 text-indigo-305 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                        >
                          Book Slot
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="space-y-6">
              {/* Booking & history */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-md font-bold text-white">Schedule Doctor Appointment Booking</h3>
                    <p className="text-xs text-zinc-450">Select doctor, set dates/times slots and describe complaints.</p>
                  </div>

                  {bookingError && (
                    <div className="bg-rose-950/40 border border-rose-800 text-rose-200 p-4 rounded-xl text-xs">
                      {bookingError}
                    </div>
                  )}

                  {bookingSuccess && (
                    <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-305 p-4 rounded-xl text-xs">
                      {bookingSuccess}
                    </div>
                  )}

                  <form onSubmit={handleBookAppointment} className="space-y-4">
                    <div className="space-y-1">
                      <label htmlFor="book-doctor" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Select Consultant Physician *</label>
                      <select
                        id="book-doctor"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                        value={bookDoctorId}
                        onChange={(e) => setBookDoctorId(e.target.value)}
                      >
                        <option value="">-- Choose Consulting MD --</option>
                        {doctors.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            Dr. {doc.name} ({doc.profile?.specialization || 'General'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label htmlFor="book-date" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Consultation Date *</label>
                        <input
                          id="book-date"
                          type="date"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-100 text-xs focus:outline-none"
                          value={bookDate}
                          onChange={(e) => {
                            setBookDate(e.target.value);
                            setBookTime('');
                          }}
                        />
                      </div>
                    </div>

                    {bookDate && bookDoctorId && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Select Available Time Slot *</label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {TIME_SLOTS.map((slot) => {
                            const taken = isSlotBooked(bookDate, slot, bookDoctorId);
                            const selected = bookTime === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled={taken}
                                onClick={() => setBookTime(slot)}
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
                        {bookTime && (
                          <div className="text-[10px] text-cyan-400 font-semibold mt-1">
                            ✓ Selected Slot: {bookTime}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-1">
                      <label htmlFor="book-reason" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Chief Complaint Reason</label>
                      <input
                        id="book-reason"
                        type="text"
                        placeholder="e.g. Sore throat and persistent fever"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                        value={bookReason}
                        onChange={(e) => setBookReason(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={bookingLoading}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold text-xs shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {bookingLoading ? 'Submitting Booking Slot...' : 'Schedule Appointment'}
                    </button>
                  </form>
                </div>

                {/* Patient booking stats side card */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <h4 className="text-[10px] font-bold text-white uppercase tracking-wider text-indigo-400">Booking Summary</h4>
                  <div className="space-y-3.5 text-xs text-zinc-400">
                    <div className="flex justify-between border-b border-zinc-850 pb-2">
                      <span>Total Booked</span>
                      <span className="font-semibold text-white">{appointments.length}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-850 pb-2">
                      <span>Completed Consults</span>
                      <span className="font-semibold text-white">
                        {appointments.filter(a => a.status === 'completed').length}
                      </span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span>Cancelled Consults</span>
                      <span className="font-semibold text-white">
                        {appointments.filter(a => a.status === 'cancelled').length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Complete Booking History */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
                  <h3 className="text-sm font-bold text-white">All Booked Consultations History</h3>
                  <span className="text-xs text-zinc-550">{filteredAppointments.length} Booking(s) found</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-900/60 border-b border-zinc-850 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="p-4">Physician</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Time Slot</th>
                        <th className="p-4">Chief Complaint</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {filteredAppointments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-zinc-500 italic">
                            No appointments found matching search query.
                          </td>
                        </tr>
                      ) : (
                        filteredAppointments.map((apt) => (
                          <tr key={apt.id} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="p-4 font-semibold text-white">Dr. {apt.doctorName}</td>
                            <td className="p-4 text-zinc-300 font-mono">{apt.date}</td>
                            <td className="p-4 text-zinc-300 font-mono">{apt.time}</td>
                            <td className="p-4 text-zinc-450 truncate max-w-xs">{apt.reason || 'General checkup'}</td>
                            <td className="p-4">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getStatusClass(apt.status)}`}>
                                {apt.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end space-x-3">
                                {['scheduled', 'waiting', 'pending', 'confirmed'].includes(apt.status) && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setReschedulingApt(apt);
                                        setReschedDate(apt.date || '');
                                        setReschedTime(apt.time || '');
                                      }}
                                      className="text-xs font-bold text-cyan-405 hover:text-cyan-300 transition-colors cursor-pointer"
                                    >
                                      Reschedule
                                    </button>
                                    <button
                                      onClick={() => handleCancelAppointment(apt.id)}
                                      className="text-xs font-bold text-rose-400 hover:text-rose-350 transition-colors cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </>
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

          {activeTab === 'reports' && (
            <div className="space-y-6">
              {/* Health stats overview */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-4">Patient Health Profile Records</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                    <span className="text-[10px] text-zinc-550 font-bold uppercase block">Health Card Status</span>
                    <span className="text-lg font-extrabold text-emerald-400">Active</span>
                  </div>
                  <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                    <span className="text-[10px] text-zinc-550 font-bold uppercase block">Consultations Completed</span>
                    <span className="text-lg font-extrabold text-white">
                      {appointments.filter(a => a.status === 'completed').length} visits
                    </span>
                  </div>
                  <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                    <span className="text-[10px] text-zinc-550 font-bold uppercase block">Clinic Diagnoses</span>
                    <span className="text-lg font-extrabold text-cyan-400">{records.length} files</span>
                  </div>
                  <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                    <span className="text-[10px] text-zinc-550 font-bold uppercase block">Allergies Status</span>
                    <span className={`text-lg font-extrabold ${user?.profile?.allergies && user.profile.allergies !== 'None' ? 'text-rose-400' : 'text-zinc-400'}`}>
                      {user?.profile?.allergies && user.profile.allergies !== 'None' ? 'Restricted' : 'Safe'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Records Timeline */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white">Electronic Health Records & Diagnoses</h3>
                
                {filteredRecords.length === 0 ? (
                  <p className="text-xs text-zinc-550 italic p-4 text-center">No clinical diagnoses records on file.</p>
                ) : (
                  <div className="space-y-4">
                    {filteredRecords.map((rec) => (
                      <div key={rec.id} className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl space-y-3.5">
                        <div className="flex justify-between items-center text-xs">
                          <div>
                            <strong className="text-white text-xs block">{rec.diagnosis}</strong>
                            <span className="text-zinc-500 block text-[9px] mt-0.5">Consulted by {rec.doctorName} on {rec.date}</span>
                          </div>
                          <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                            ID: {rec.id.substring(0, 8)}...
                          </span>
                        </div>
                        <p className="text-xs text-zinc-350 leading-relaxed">{rec.notes}</p>
                        
                        {rec.prescription && rec.prescription.length > 0 && (
                          <div className="pt-2 border-t border-zinc-900 grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-zinc-400">
                            {rec.prescription.map((rx, idx) => (
                              <div key={idx} className="bg-zinc-900/50 p-2 rounded-lg border border-zinc-850/50">
                                <strong className="text-zinc-300">💊 {rx.drug}</strong> &mdash; <span className="font-mono text-cyan-400">{rx.dosage}</span>
                                <span className="block text-[9px] text-zinc-500 italic mt-0.5">{rx.instructions} ({rx.duration})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="md:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-md font-bold text-white">Edit Patient Clinical Profile</h3>
                  <p className="text-xs text-zinc-450 mt-1">Configure your clinical card data (Allergies, emergency contact) to help doctors analyze your file.</p>
                </div>

                {profileError && (
                  <div className="bg-rose-950/40 border border-rose-800 text-rose-205 p-4 rounded-xl text-xs">
                    {profileError}
                  </div>
                )}

                {profileSuccess && (
                  <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-305 p-4 rounded-xl text-xs">
                    {profileSuccess}
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="edit-phone" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Contact Phone Number</label>
                      <input
                        id="edit-phone"
                        type="text"
                        placeholder="+1 (555) 019-2834"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="edit-dob" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Date of Birth</label>
                      <input
                        id="edit-dob"
                        type="date"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none text-zinc-400"
                        value={editDob}
                        onChange={(e) => setEditDob(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="edit-gender" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Gender</label>
                      <select
                        id="edit-gender"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                        value={editGender}
                        onChange={(e) => setEditGender(e.target.value)}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-Binary">Non-Binary</option>
                        <option value="Not Specified">Not Specified</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="edit-blood" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Blood Group</label>
                      <select
                        id="edit-blood"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                        value={editBloodGroup}
                        onChange={(e) => setEditBloodGroup(e.target.value)}
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
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="edit-emergency" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Emergency Contact (Name & Phone)</label>
                    <input
                      id="edit-emergency"
                      type="text"
                      placeholder="e.g. Jane Doe (+1 555-019-2233)"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                      value={editEmergency}
                      onChange={(e) => setEditEmergency(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="edit-allergies" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Medical Allergies</label>
                    <input
                      id="edit-allergies"
                      type="text"
                      placeholder="e.g. Penicillin, Peanuts (If none, write 'None')"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                      value={editAllergies}
                      onChange={(e) => setEditAllergies(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold text-xs shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {profileLoading ? 'Updating Clinical Profile...' : 'Save Profile Changes'}
                  </button>
                </form>
              </div>

              {/* Warning box */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">⚠️ Clinical Safety Note</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Please verify that your allergies list and emergency contacts are correct. Doctors query this information dynamically during diagnosis session.
                </p>
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
              className="absolute top-4 right-4 text-zinc-505 hover:text-white transition-colors cursor-pointer text-lg"
            >
              ✕
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Reschedule Doctor Appointment</h3>
              <p className="text-xs text-zinc-450">Select a new date and available time slot for your consultation with Dr. {reschedulingApt.doctorName}.</p>
            </div>

            {reschedError && (
              <div className="bg-rose-950/40 border border-rose-800 text-rose-200 p-3 rounded-lg text-xs">
                {reschedError}
              </div>
            )}

            {reschedSuccess && (
              <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-305 p-3 rounded-lg text-xs">
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
