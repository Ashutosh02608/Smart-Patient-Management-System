'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { useSearchParams } from 'next/navigation';

function AdminDashboardContent() {
  const { user } = useAuth();

  // Data States
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form States - Add Staff member
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState('doctor');
  const [docSpecialty, setDocSpecialty] = useState('General Medicine');
  const [docRoom, setDocRoom] = useState('Cabinet 101');
  const [docPhone, setDocPhone] = useState('');
  const [staffSuccess, setStaffSuccess] = useState('');
  const [staffError, setStaffError] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);

  // Approval States
  const [actionLoadingId, setActionLoadingId] = useState('');

  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (tabParam) {
      const timer = setTimeout(() => {
        setActiveTab(tabParam);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [tabParam]);

  const pendingUsers = users.filter(u => u.approved === false);

  const fetchData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [userRes, aptRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/appointments')
      ]);

      if (userRes.ok && aptRes.ok) {
        const userData = await userRes.json();
        const aptData = await aptRes.json();
        
        setUsers(userData);
        setAppointments(aptData);
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
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

  // Submit Staff Creation Form
  const handleAddStaff = async (e) => {
    e.preventDefault();
    setStaffSuccess('');
    setStaffError('');

    if (!staffName || !staffEmail || !staffPassword) {
      setStaffError('Name, email and password are required.');
      return;
    }

    setStaffLoading(true);
    try {
      const profile = staffRole === 'doctor' ? {
        specialization: docSpecialty,
        room: docRoom,
        phone: docPhone
      } : {};

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: staffName,
          email: staffEmail,
          password: staffPassword,
          role: staffRole,
          profile
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add staff member');

      setStaffSuccess(`Successfully onboarded ${data.name} as ${data.role}!`);
      
      setStaffName('');
      setStaffEmail('');
      setStaffPassword('');
      setDocPhone('');
      setDocSpecialty('General Medicine');
      setDocRoom('Cabinet 101');

      fetchData();
    } catch (err) {
      setStaffError(err.message || 'An error occurred.');
    } finally {
      setStaffLoading(false);
    }
  };

  // Handle Account Approval click
  const handleApproveUser = async (userId) => {
    setActionLoadingId(userId);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          approved: true
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to approve account.');
      }

      fetchData();
    } catch (err) {
      console.error("Approval error:", err);
      alert(err.message || "An error occurred during account confirmation.");
    } finally {
      setActionLoadingId('');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: newRole })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update user role');
      }
      fetchData();
    } catch (err) {
      console.error("Role update error:", err);
      alert(err.message || 'Error updating user role');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`Are you sure you want to delete the user account "${userName}" permanently? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      fetchData();
    } catch (err) {
      console.error("User deletion error:", err);
      alert(err.message || 'Error deleting user account');
    }
  };

  // Quick statistics calculations
  const patientsCount = users.filter(u => u.role === 'patient').length;
  const doctorsCount = users.filter(u => u.role === 'doctor').length;
  const receptsCount = users.filter(u => u.role === 'receptionist').length;
  const activeApts = appointments.filter(a => ['scheduled', 'waiting', 'in-consultation'].includes(a.status)).length;
  const completedApts = appointments.filter(a => a.status === 'completed').length;

  // Filtering data based on searchQuery
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allPatients = users.filter(u => u.role === 'patient');
  const filteredPatients = allPatients.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allStaff = users.filter(u => u.role !== 'patient');
  const filteredStaff = allStaff.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAppointments = appointments.filter(a =>
    a.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout
      roleTitle="Administrator"
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        setSearchQuery(''); // clear search on tab switch
      }}
      badges={{ appointments: pendingUsers.length }}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={
        activeTab === 'dashboard' ? 'Search user accounts...' :
        activeTab === 'patients' ? 'Search patient records...' :
        activeTab === 'staff' ? 'Search staff directory...' :
        activeTab === 'appointments' ? 'Search approvals & appointments...' :
        'Search workspace logs...'
      }
    >
      {loadingData ? (
        <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/40 rounded-2xl border border-zinc-800 space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          <p className="text-zinc-500 text-sm">Collating system metrics and directories...</p>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl space-y-1">
                  <span className="block text-xs text-zinc-550 uppercase font-bold tracking-wider">Patients Registered</span>
                  <span className="block text-3xl font-extrabold text-white">{patientsCount}</span>
                  <span className="text-[10px] text-cyan-400 block font-semibold">&bull; Clinical records active</span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl space-y-1">
                  <span className="block text-xs text-zinc-550 uppercase font-bold tracking-wider">Active Doctors</span>
                  <span className="block text-3xl font-extrabold text-white">{doctorsCount}</span>
                  <span className="text-[10px] text-cyan-400 block font-semibold">&bull; Consulting departments</span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl space-y-1">
                  <span className="block text-xs text-zinc-550 uppercase font-bold tracking-wider">Active Queue</span>
                  <span className="block text-3xl font-extrabold text-white">{activeApts}</span>
                  <span className="text-[10px] text-indigo-400 block font-semibold">&bull; Live check-ins</span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl space-y-1">
                  <span className="block text-xs text-zinc-550 uppercase font-bold tracking-wider">Completed Consults</span>
                  <span className="block text-3xl font-extrabold text-white">{completedApts}</span>
                  <span className="text-[10px] text-emerald-400 block font-semibold">&bull; Archive directories</span>
                </div>
              </div>

              {/* Quick Admin Actions Grid */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider text-cyan-400">Quick Administrator Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Manage Staff Card */}
                  <Link 
                    href="/admin?tab=staff"
                    className="group bg-zinc-900/40 border border-zinc-800 hover:border-cyan-500/30 p-5 rounded-2xl flex flex-col justify-between hover:bg-zinc-900/60 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/5 cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all duration-300 pointer-events-none" />
                    <div className="space-y-4">
                      <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-xl text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform duration-300">
                        👥
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">Manage Staff</h4>
                        <p className="text-xs text-zinc-450 leading-relaxed">Manage system logins, receptionists and other personnel profiles.</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-[10px] font-bold text-cyan-400 uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                      Open Staff panel &rarr;
                    </div>
                  </Link>

                  {/* Manage Doctors Card */}
                  <Link 
                    href="/doctors"
                    className="group bg-zinc-900/40 border border-zinc-800 hover:border-cyan-400/30 p-5 rounded-2xl flex flex-col justify-between hover:bg-zinc-900/60 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/5 cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/5 rounded-full blur-2xl group-hover:bg-cyan-400/10 transition-all duration-300 pointer-events-none" />
                    <div className="space-y-4">
                      <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-xl text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform duration-300">
                        🩺
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">Manage Doctors</h4>
                        <p className="text-xs text-zinc-450 leading-relaxed">Update experience, consulting fees, department registries, and schedules.</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-[10px] font-bold text-cyan-400 uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                      Open Doctors registry &rarr;
                    </div>
                  </Link>

                  {/* Manage Patients Card */}
                  <Link 
                    href="/patients"
                    className="group bg-zinc-900/40 border border-zinc-800 hover:border-indigo-500/30 p-5 rounded-2xl flex flex-col justify-between hover:bg-zinc-900/60 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all duration-300 pointer-events-none" />
                    <div className="space-y-4">
                      <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-xl text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                        👤
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">Manage Patients</h4>
                        <p className="text-xs text-zinc-450 leading-relaxed">Search profiles, view diagnostic timelines, and onboard new patients.</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-[10px] font-bold text-indigo-400 uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                      Open Patients directory &rarr;
                    </div>
                  </Link>

                  {/* Manage Appointments Card */}
                  <Link 
                    href="/admin?tab=appointments"
                    className="group bg-zinc-900/40 border border-zinc-800 hover:border-purple-500/30 p-5 rounded-2xl flex flex-col justify-between hover:bg-zinc-900/60 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5 cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all duration-300 pointer-events-none" />
                    <div className="space-y-4">
                      <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-xl text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                        📅
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">Appointments</h4>
                        <p className="text-xs text-zinc-450 leading-relaxed">Approve pending staff registration requests and monitor active queue bookings.</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-[10px] font-bold text-purple-400 uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                      Open Bookings panel &rarr;
                    </div>
                  </Link>

                  {/* Manage Reports Card */}
                  <Link 
                    href="/admin?tab=reports"
                    className="group bg-zinc-900/40 border border-zinc-800 hover:border-emerald-500/30 p-5 rounded-2xl flex flex-col justify-between hover:bg-zinc-900/60 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-300 pointer-events-none" />
                    <div className="space-y-4">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-xl text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                        📝
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">System Reports</h4>
                        <p className="text-xs text-zinc-450 leading-relaxed">Review clinic-wide statistics, audit system logs, and fetch census reports.</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-[10px] font-bold text-emerald-400 uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                      Open Reports panel &rarr;
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'patients' && (
            <div className="space-y-6">
              {/* Patient Directory */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
                  <h3 className="text-sm font-bold text-white">Clinic Patient Directory</h3>
                  <span className="text-xs text-zinc-550">{filteredPatients.length} Patient(s) registered</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-900/60 border-b border-zinc-850 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="p-4">Patient Name</th>
                        <th className="p-4">Email Address</th>
                        <th className="p-4">Date of Birth</th>
                        <th className="p-4">Blood Group</th>
                        <th className="p-4">Allergies Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {filteredPatients.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-zinc-500 italic">
                            No patient records found matching search query.
                          </td>
                        </tr>
                      ) : (
                        filteredPatients.map((p) => (
                          <tr key={p.id} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="p-4 font-semibold text-white">{p.name}</td>
                            <td className="p-4 text-zinc-300 font-mono text-xs">{p.email}</td>
                            <td className="p-4 text-zinc-400">{p.profile?.dob || 'Not specified'}</td>
                            <td className="p-4 font-bold text-cyan-400">{p.profile?.bloodGroup || 'N/A'}</td>
                            <td className="p-4 text-zinc-400">
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                p.profile?.allergies && p.profile?.allergies !== 'None'
                                  ? 'bg-rose-500/10 text-rose-400'
                                  : 'bg-zinc-850 text-zinc-500'
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

          {activeTab === 'staff' && (
            <div className="space-y-6">
              {/* Form & census */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-md font-bold text-white">Onboard Clinic Staff Member</h3>
                    <p className="text-xs text-zinc-450">Add a new licensed Doctor or Receptionist directly with automatic approval.</p>
                  </div>

                  {staffError && (
                    <div className="bg-rose-950/40 border border-rose-800 text-rose-200 p-4 rounded-xl text-xs">
                      {staffError}
                    </div>
                  )}

                  {staffSuccess && (
                    <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 p-4 rounded-xl text-xs">
                      {staffSuccess}
                    </div>
                  )}

                  <form onSubmit={handleAddStaff} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label htmlFor="staff-name" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Full Name *</label>
                        <input
                          id="staff-name"
                          type="text"
                          required
                          placeholder="e.g. Dr. John Watson"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                          value={staffName}
                          onChange={(e) => setStaffName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="staff-email" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email Address *</label>
                        <input
                          id="staff-email"
                          type="email"
                          required
                          placeholder="name@clinic.com"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                          value={staffEmail}
                          onChange={(e) => setStaffEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label htmlFor="staff-password" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Initial Password *</label>
                        <input
                          id="staff-password"
                          type="password"
                          required
                          placeholder="••••••••"
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                          value={staffPassword}
                          onChange={(e) => setStaffPassword(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="staff-role" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Staff Work Role *</label>
                        <select
                          id="staff-role"
                          value={staffRole}
                          onChange={(e) => setStaffRole(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                        >
                          <option value="doctor">Doctor (Consultations & Prescriptions)</option>
                          <option value="receptionist">Receptionist (Schedules & Check-ins)</option>
                          <option value="admin">Administrator (Clinic-wide configurations & staff)</option>
                        </select>
                      </div>
                    </div>

                    {staffRole === 'doctor' && (
                      <div className="border border-zinc-850 rounded-xl bg-zinc-950/20 p-4 space-y-3">
                        <span className="block text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Doctor Clinical Information</span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label htmlFor="doc-spec" className="text-[9px] font-semibold text-zinc-400">Specialization</label>
                            <input
                              id="doc-spec"
                              type="text"
                              placeholder="e.g. Cardiology"
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-100 text-[11px] focus:outline-none"
                              value={docSpecialty}
                              onChange={(e) => setDocSpecialty(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label htmlFor="doc-room" className="text-[9px] font-semibold text-zinc-400">Consultation Room</label>
                            <input
                              id="doc-room"
                              type="text"
                              placeholder="e.g. Cabinet 104"
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-100 text-[11px] focus:outline-none"
                              value={docRoom}
                              onChange={(e) => setDocRoom(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1">
                            <label htmlFor="doc-phone" className="text-[9px] font-semibold text-zinc-400">Contact Number</label>
                            <input
                              id="doc-phone"
                              type="text"
                              placeholder="+1 (555) 012-3499"
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-zinc-100 text-[11px] focus:outline-none"
                              value={docPhone}
                              onChange={(e) => setDocPhone(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={staffLoading}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold text-xs shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {staffLoading ? 'Registering Staff Account...' : 'Onboard Staff Member'}
                    </button>
                  </form>
                </div>

                {/* Census breakdown card */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <h4 className="text-[10px] font-bold text-white uppercase tracking-wider text-indigo-400">Staff Census Summary</h4>
                  <div className="space-y-3 text-xs text-zinc-400">
                    <div className="flex justify-between border-b border-zinc-850 pb-2">
                      <span>Active Physicians</span>
                      <span className="font-semibold text-white">{doctorsCount}</span>
                    </div>
                    <div className="flex justify-between border-b border-zinc-850 pb-2">
                      <span>Front Desk Receptionists</span>
                      <span className="font-semibold text-white">{receptsCount}</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span>System Administrators</span>
                      <span className="font-semibold text-white">{users.filter(u => u.role === 'admin').length}</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-zinc-850 text-[10px] text-zinc-500 leading-relaxed">
                    ⚠️ Note: Onboarding staff accounts through this panel auto-approves their profiles instantly.
                  </div>
                </div>
              </div>

              {/* Staff directory list */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
                  <h3 className="text-sm font-bold text-white">Clinic Staff Registry Directory</h3>
                  <span className="text-xs text-zinc-550">{filteredStaff.length} Staff Member(s) active</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-900/60 border-b border-zinc-850 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="p-4">Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Role Badge</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Specialization / Metadata</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {filteredStaff.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-zinc-500 italic">
                            No staff members found matching search query.
                          </td>
                        </tr>
                      ) : (
                        filteredStaff.map((u) => (
                          <tr key={u.id} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="p-4 font-semibold text-white">
                              {u.name}
                              {user?.id === u.id && <span className="text-[10px] text-cyan-400 font-normal ml-1.5">(You)</span>}
                            </td>
                            <td className="p-4 text-zinc-300 font-mono text-xs">{u.email}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${
                                u.role === 'admin' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                u.role === 'doctor' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                                u.role === 'receptionist' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                'bg-zinc-850 text-zinc-450 border-zinc-800'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                u.approved ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {u.approved ? 'Approved' : 'Pending Approval'}
                              </span>
                            </td>
                            <td className="p-4 text-zinc-400 text-[11px]">
                              {u.role === 'doctor' && (
                                <span>Room: {u.profile?.room || 'Cabinet 101'} | Specialty: {u.profile?.specialization || 'N/A'}</span>
                              )}
                              {u.role === 'receptionist' && <span className="italic">Front Desk Specialist</span>}
                              {u.role === 'admin' && <span className="italic">System Administrator</span>}
                            </td>
                            <td className="p-4 text-right">
                              {u.id === user?.id ? (
                                <span className="text-[10px] text-zinc-500 font-semibold mr-2">Active Session</span>
                              ) : (
                                <div className="flex items-center justify-end space-x-3">
                                  {/* Change Role Selector */}
                                  <select
                                    value={u.role}
                                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                    className="bg-zinc-950 border border-zinc-850 hover:border-zinc-800 text-[10px] text-zinc-300 font-semibold px-2 py-1 rounded focus:outline-none cursor-pointer transition-all"
                                  >
                                    <option value="admin">Admin</option>
                                    <option value="doctor">Doctor</option>
                                    <option value="receptionist">Receptionist</option>
                                    <option value="patient">Patient</option>
                                  </select>
                                  
                                  {/* Delete Button */}
                                  <button
                                    onClick={() => handleDeleteUser(u.id, u.name)}
                                    className="py-1 px-2.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-350 text-[10px] font-bold border border-rose-500/20 transition-all cursor-pointer"
                                    title="Delete user data"
                                  >
                                    Delete
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
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="space-y-6">
              {/* Approvals Panel */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
                  <div>
                    <h3 className="text-sm font-bold text-white">Pending Staff Account Confirmations</h3>
                    <p className="text-xs text-zinc-450 mt-0.5">Approve new clinical staff profiles before they can authenticate.</p>
                  </div>
                  <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {pendingUsers.length} Pending
                  </span>
                </div>

                {pendingUsers.length === 0 ? (
                  <div className="p-8 text-center text-zinc-550 italic text-xs">
                    ✨ No staff registrations pending confirmation. Everything is up-to-date!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-zinc-900/60 border-b border-zinc-850 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                          <th className="p-4">Name</th>
                          <th className="p-4">Email Address</th>
                          <th className="p-4">Requested Role</th>
                          <th className="p-4">Date Registered</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850">
                        {pendingUsers.map((pending) => (
                          <tr key={pending.id} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="p-4 font-semibold text-white">{pending.name}</td>
                            <td className="p-4 text-zinc-300 font-mono text-xs">{pending.email}</td>
                            <td className="p-4">
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 capitalize">
                                {pending.role}
                              </span>
                            </td>
                            <td className="p-4 text-zinc-500 text-xs font-mono">{pending.createdAt ? pending.createdAt.split('T')[0] : 'N/A'}</td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleApproveUser(pending.id)}
                                disabled={actionLoadingId === pending.id}
                                className="py-1 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-[10px] shadow-md transition-colors cursor-pointer"
                              >
                                {actionLoadingId === pending.id ? 'Approving...' : 'Confirm Account'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Clinic Appointments Register */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
                  <h3 className="text-sm font-bold text-white">Clinic Consultation Bookings Registry</h3>
                  <span className="text-xs text-zinc-550">{filteredAppointments.length} Appointment(s) registered</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-900/60 border-b border-zinc-850 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="p-4">Patient Name</th>
                        <th className="p-4">Consulting Physician</th>
                        <th className="p-4">Schedule Date & Time</th>
                        <th className="p-4">Reason / Notes</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {filteredAppointments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-zinc-500 italic">
                            No appointments found matching your search.
                          </td>
                        </tr>
                      ) : (
                        filteredAppointments.map((apt) => (
                          <tr key={apt.id} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="p-4 font-semibold text-white">{apt.patientName || 'Unknown Patient'}</td>
                            <td className="p-4 text-zinc-300">Dr. {apt.doctorName || 'General Staff'}</td>
                            <td className="p-4 font-mono text-[11px]">
                              <span>📅 {apt.date}</span>
                              <span className="block text-zinc-550 text-[10px]">{apt.time}</span>
                            </td>
                            <td className="p-4 text-zinc-400 truncate max-w-xs">{apt.reason || 'Routine consultation'}</td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                apt.status === 'scheduled' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                                apt.status === 'waiting' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                apt.status === 'in-consultation' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                apt.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                'bg-zinc-850 text-zinc-500 border-zinc-800'
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
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              {/* Reports dashboard details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-6">
                  <div>
                    <h3 className="text-md font-bold text-white">Monthly Consultation Analytics</h3>
                    <p className="text-xs text-zinc-450 mt-1">Breakdown of clinic visits and complete records volume.</p>
                  </div>

                  {/* Simple CSS Chart */}
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-450">Cardiology Dept (Dr. Gregory House)</span>
                        <span className="font-semibold text-white">78 Consults &bull; 40%</span>
                      </div>
                      <div className="h-2.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded-full" style={{ width: '40%' }}></div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-450">General Medicine (Dr. John Watson)</span>
                        <span className="font-semibold text-white">92 Consults &bull; 55%</span>
                      </div>
                      <div className="h-2.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full" style={{ width: '55%' }}></div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-450">Pediatrics Department</span>
                        <span className="font-semibold text-white">41 Consults &bull; 25%</span>
                      </div>
                      <div className="h-2.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: '25%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Ratios card */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Clinical Efficiency Ratios</h4>
                  <div className="space-y-4.5 pt-2">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-md text-cyan-400">📈</div>
                      <div>
                        <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Patient / MD Ratio</span>
                        <span className="text-lg font-bold text-white">{(doctorsCount > 0 ? (patientsCount / doctorsCount).toFixed(1) : 0)} : 1</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-md text-emerald-400">✅</div>
                      <div>
                        <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Consultation Success Rate</span>
                        <span className="text-lg font-bold text-white">
                          {appointments.length > 0 ? Math.round((completedApts / appointments.length) * 100) : 100}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Audit log */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white">Clinical Audit Events Trail</h3>
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase px-2 py-0.5 bg-emerald-550/10 border border-emerald-500/20 rounded-full">Systems Online</span>
                </div>
                <div className="space-y-3 font-mono text-[10.5px] text-zinc-400 pt-2 leading-relaxed">
                  <div className="flex space-x-4 border-b border-zinc-850 pb-2">
                    <span className="text-zinc-550">[{new Date().toLocaleDateString()}] 19:24:36</span>
                    <span className="text-cyan-400">[AUTH]</span>
                    <span>Admin session verified via email token.</span>
                  </div>
                  <div className="flex space-x-4 border-b border-zinc-850 pb-2">
                    <span className="text-zinc-550">[{new Date().toLocaleDateString()}] 13:45:59</span>
                    <span className="text-emerald-400">[DATABASE]</span>
                    <span>Approved admin ashutosh.sharma2608@gmail.com successfully.</span>
                  </div>
                  <div className="flex space-x-4">
                    <span className="text-zinc-550">[{new Date().toLocaleDateString()}] 13:41:14</span>
                    <span className="text-indigo-400">[SCHEMA]</span>
                    <span>Disabling RLS tags on core tables.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="md:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-md font-bold text-white">Clinic Profile & Service Configuration</h3>
                  <p className="text-xs text-zinc-450 mt-1">Configure general clinic information displayed on records and patients portals.</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Clinic Display Name</label>
                      <input
                        type="text"
                        defaultValue="CarePulse General Clinic"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Support Contact Phone</label>
                      <input
                        type="text"
                        defaultValue="+1 (555) 987-6543"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Clinic Address</label>
                    <input
                      type="text"
                      defaultValue="742 Evergreen Terrace, Sector 4, Metro City"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => alert('Settings simulation saved successfully!')}
                      className="py-2 px-4 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                    >
                      Save Configuration
                    </button>
                  </div>
                </div>
              </div>

              {/* Preferences side card */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">System Control Policies</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-white block">Auto-Approve Patients</span>
                      <span className="text-[10px] text-zinc-550">Allow patients instant sign-in</span>
                    </div>
                    <div className="h-5 w-9 bg-cyan-500/10 border border-cyan-400/35 rounded-full flex items-center justify-end px-0.5 cursor-pointer">
                      <div className="h-4 w-4 bg-cyan-400 rounded-full"></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs border-t border-zinc-850 pt-3">
                    <div>
                      <span className="font-semibold text-white block">Enforce Approval Email</span>
                      <span className="text-[10px] text-zinc-550">Verify admin approvals via email</span>
                    </div>
                    <div className="h-5 w-9 bg-zinc-850 border border-zinc-750 rounded-full flex items-center px-0.5 cursor-pointer">
                      <div className="h-4 w-4 bg-zinc-600 rounded-full"></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs border-t border-zinc-850 pt-3">
                    <div>
                      <span className="font-semibold text-white block">Developer Diagnostic Mode</span>
                      <span className="text-[10px] text-zinc-550">Debug database transactions logs</span>
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
    </DashboardLayout>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/40 rounded-2xl border border-zinc-800 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
        <p className="text-zinc-500 text-sm">Collating system metrics and directories...</p>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}
