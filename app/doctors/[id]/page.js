'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DoctorProfileDetail({ params, searchParams }) {
  const { user } = useAuth();
  const router = useRouter();

  // Unwrap params safely (Next.js/React 19 App Router standard)
  const resolvedParams = params && typeof params.then === 'function' ? use(params) : params;
  const resolvedSearchParams = searchParams && typeof searchParams.then === 'function' ? use(searchParams) : searchParams;
  const doctorId = resolvedParams?.id;
  const isEditModeInitially = resolvedSearchParams?.edit === 'true';

  // State
  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(isEditModeInitially);

  // Form Edit States
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDepartment, setEditDepartment] = useState('General Medicine');
  const [editSpecialization, setEditSpecialization] = useState('');
  const [editExperience, setEditExperience] = useState('');
  const [editFees, setEditFees] = useState('');
  const [editRoom, setEditRoom] = useState('Cabinet 101');
  const [editPhone, setEditPhone] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch specific user data
      const userRes = await fetch(`/api/users`);
      if (!userRes.ok) throw new Error('Failed to load clinic directory');
      
      const allUsers = await userRes.json();
      const currentDoctor = allUsers.find(u => u.id === doctorId && u.role === 'doctor');
      
      if (!currentDoctor) {
        throw new Error('Doctor record not found in system database');
      }

      setDoctor(currentDoctor);

      // Prepopulate form
      setEditName(currentDoctor.name || '');
      setEditEmail(currentDoctor.email || '');
      if (currentDoctor.profile) {
        setEditDepartment(currentDoctor.profile.department || 'General Medicine');
        setEditSpecialization(currentDoctor.profile.specialization || '');
        setEditExperience(currentDoctor.profile.experience || '');
        setEditFees(currentDoctor.profile.fees || '');
        setEditRoom(currentDoctor.profile.room || 'Cabinet 101');
        setEditPhone(currentDoctor.profile.phone || '');
      }

      // Fetch appointments for this specific doctor
      const aptRes = await fetch('/api/appointments');
      if (aptRes.ok) {
        const allApts = await aptRes.json();
        const docApts = allApts.filter(a => a.doctorId === doctorId);
        setAppointments(docApts.sort((a, b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time)));
      }

    } catch (err) {
      console.error("Error loading doctor profile details:", err);
      setError(err.message || 'An error occurred loading physician details');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    let active = true;
    if (user && doctorId) {
      setTimeout(() => {
        if (active) fetchData();
      }, 0);
    }
    return () => {
      active = false;
    };
  }, [user, doctorId, fetchData]);

  const handleUpdateDoctor = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!editName || !editEmail) {
      setError('Doctor Name and Email are required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: doctorId,
          name: editName,
          email: editEmail,
          profile: {
            department: editDepartment,
            specialization: editSpecialization || 'Clinical Generalist',
            experience: editExperience ? parseInt(editExperience) : 0,
            fees: editFees ? parseFloat(editFees) : 0,
            room: editRoom,
            phone: editPhone
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update doctor profile');

      setSuccess('Doctor profile successfully updated!');
      setIsEditMode(false);
      fetchData();
    } catch (err) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const getRoleTitle = () => {
    if (!user) return 'Workspace';
    if (user.role === 'admin') return 'Administrator';
    if (user.role === 'doctor') return 'Doctor Portal';
    if (user.role === 'receptionist') return 'Receptionist';
    return 'Patient Portal';
  };

  const canEdit = user && (user.role === 'admin' || user.id === doctorId);

  return (
    <DashboardLayout
      roleTitle={getRoleTitle()}
      activeTab="doctors"
    >
      <div className="space-y-6">
        {/* Navigation Breadcrumbs back link */}
        <div className="flex items-center justify-between pb-2">
          <Link
            href="/doctors"
            className="flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <span>⬅️</span>
            <span>Back to Doctors Directory</span>
          </Link>

          {canEdit && !isEditMode && (
            <button
              onClick={() => setIsEditMode(true)}
              className="py-1.5 px-3.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/20 rounded-xl text-xs transition-all cursor-pointer"
            >
              ⚙️ Edit Details
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
            <p className="text-zinc-550 text-xs font-mono">Querying physician clinical records...</p>
          </div>
        ) : error && !doctor ? (
          <div className="bg-rose-950/40 border border-rose-800 text-rose-200 p-6 rounded-2xl text-center text-sm">
            ⚠️ {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* LEFT COLUMN: Profile Card OR Edit Form */}
            <div className="lg:col-span-1 space-y-6">
              {isEditMode ? (
                /* EDIT DETAILS FORM */
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-5">
                  <div className="space-y-1 border-b border-zinc-850 pb-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400">Edit Physician Record</h3>
                    <p className="text-[10px] text-zinc-500">Modify professional details and consultation rates.</p>
                  </div>

                  {error && (
                    <div className="bg-rose-950/40 border border-rose-800 text-rose-200 p-3 rounded-lg text-xs">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleUpdateDoctor} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label htmlFor="edit-name" className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Doctor Name</label>
                      <input
                        id="edit-name"
                        type="text"
                        required
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="edit-email" className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Email Address</label>
                      <input
                        id="edit-email"
                        type="email"
                        required
                        disabled={user?.role !== 'admin'}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none disabled:opacity-50"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="edit-dept" className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Department</label>
                      <select
                        id="edit-dept"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none"
                        value={editDepartment}
                        onChange={(e) => setEditDepartment(e.target.value)}
                      >
                        <option value="General Medicine">General Medicine</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Pediatrics">Pediatrics</option>
                        <option value="Neurology">Neurology</option>
                        <option value="Orthopedics">Orthopedics</option>
                        <option value="Dermatology">Dermatology</option>
                        <option value="Oncology">Oncology</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="edit-specialization" className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Specialization</label>
                      <input
                        id="edit-specialization"
                        type="text"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none"
                        value={editSpecialization}
                        onChange={(e) => setEditSpecialization(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label htmlFor="edit-exp" className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Experience (Yrs)</label>
                        <input
                          id="edit-exp"
                          type="number"
                          min="0"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none"
                          value={editExperience}
                          onChange={(e) => setEditExperience(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="edit-fees" className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Consultation Fee ($)</label>
                        <input
                          id="edit-fees"
                          type="number"
                          min="0"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none"
                          value={editFees}
                          onChange={(e) => setEditFees(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label htmlFor="edit-room" className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Cabinet Room</label>
                        <input
                          id="edit-room"
                          type="text"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none"
                          value={editRoom}
                          onChange={(e) => setEditRoom(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="edit-phone" className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Phone</label>
                        <input
                          id="edit-phone"
                          type="text"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end space-x-2.5">
                      <button
                        type="button"
                        onClick={() => setIsEditMode(false)}
                        className="py-2 px-3 border border-zinc-800 hover:border-zinc-750 text-zinc-400 hover:text-white rounded-lg transition-all cursor-pointer font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="py-2 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold rounded-lg shadow-md active:scale-95 transition-all cursor-pointer"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* DOCTOR PROFILE CARD */
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden space-y-6">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
                  
                  {/* Summary Demographics */}
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-500 p-[1.5px] shadow-lg shadow-cyan-500/10">
                      <div className="h-full w-full bg-zinc-950 rounded-2xl flex items-center justify-center text-3xl">
                        🩺
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white leading-tight">{doctor.name}</h3>
                      <span className="text-[10px] text-zinc-550 font-mono tracking-wider">{doctor.id}</span>
                    </div>
                    <span className="inline-flex px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold capitalize">
                      {doctor.profile?.department || 'General Medicine'}
                    </span>
                  </div>

                  {/* Professional Demographics Metadata */}
                  <div className="space-y-3 border-t border-zinc-850 pt-5 text-xs text-zinc-400">
                    <div className="flex justify-between">
                      <span className="text-zinc-550">Specialty</span>
                      <span className="font-semibold text-zinc-200">{doctor.profile?.specialization || 'Clinical Generalist'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-550">Experience Rank</span>
                      <span className="font-semibold text-cyan-400">{doctor.profile?.experience ? `${doctor.profile.experience} Year(s)` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-550">Consulting Cabinet</span>
                      <span className="font-semibold text-zinc-200 font-mono">{doctor.profile?.room || 'Cabinet 101'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-550">Contact Phone</span>
                      <span className="font-semibold text-zinc-350 font-mono">{doctor.profile?.phone || 'Not Specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-550">Secure Email</span>
                      <span className="font-semibold text-zinc-350 font-mono">{doctor.email}</span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-850/60 pt-3">
                      <span className="text-zinc-550">Consultation Rate</span>
                      <span className="font-extrabold text-emerald-400 font-mono text-sm">${doctor.profile?.fees || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Ratings / Badges */}
                  <div className="bg-zinc-950/40 border border-zinc-850/80 p-4 rounded-xl flex items-center justify-between text-center">
                    <div>
                      <span className="block text-[10px] text-zinc-550 font-bold uppercase tracking-wider">Feedback</span>
                      <span className="text-xs font-extrabold text-white">4.9 ★</span>
                    </div>
                    <div className="h-6 w-[1px] bg-zinc-850" />
                    <div>
                      <span className="block text-[10px] text-zinc-550 font-bold uppercase tracking-wider">Completed</span>
                      <span className="text-xs font-extrabold text-cyan-400">{appointments.filter(a => a.status === 'completed').length} Logged</span>
                    </div>
                    <div className="h-6 w-[1px] bg-zinc-850" />
                    <div>
                      <span className="block text-[10px] text-zinc-550 font-bold uppercase tracking-wider">Status</span>
                      <span className="text-xs font-extrabold text-emerald-400">Online</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Doctor's Schedule / Appointments */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
                  <div>
                    <h3 className="text-sm font-bold text-white">Consultation Booking Schedule Log</h3>
                    <p className="text-[10px] text-zinc-450 mt-0.5">Clinical queues and scheduled patient appointments.</p>
                  </div>
                  <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold px-2.5 py-0.5 rounded-full font-mono">
                    {appointments.filter(a => ['scheduled', 'waiting'].includes(a.status)).length} Active
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-900/60 border-b border-zinc-850 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="p-4">Patient</th>
                        <th className="p-4">Schedule Date & Time</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Reason / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {appointments.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-12 text-center text-zinc-500 italic">
                            No appointments assigned to this physician schedule.
                          </td>
                        </tr>
                      ) : (
                        appointments.map((a) => (
                          <tr key={a.id} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="p-4 font-semibold text-white">
                              <Link href={`/patients/${a.patientId}`} className="hover:text-cyan-400 transition-colors block">
                                {a.patientName}
                              </Link>
                              <span className="text-[9px] text-zinc-550 block font-mono">{a.patientId}</span>
                            </td>
                            <td className="p-4 font-mono text-zinc-300">
                              <span className="block text-zinc-200">{a.date}</span>
                              <span className="text-[10px] text-zinc-500 block">{a.time}</span>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border capitalize ${
                                a.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                a.status === 'waiting' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                a.status === 'cancelled' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                              }`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="p-4 text-zinc-400 max-w-[200px] truncate" title={a.reason}>
                              {a.reason || 'General medical inquiry'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
