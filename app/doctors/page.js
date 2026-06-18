'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';

export default function DoctorsDirectory() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [actionLoadingId, setActionLoadingId] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoadingData(true);
      const res = await fetch('/api/users?role=doctor');
      if (res.ok) {
        const data = await res.json();
        setDoctors(data);
      }
    } catch (err) {
      console.error("Error fetching doctors list:", err);
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

  const handleDeleteDoctor = async (id, name) => {
    if (!confirm(`Are you sure you want to delete the doctor profile for "${name}"? This action cannot be undone.`)) return;

    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete doctor profile');
      }
    } catch (err) {
      console.error("Delete doctor error:", err);
      alert('An error occurred while deleting the doctor account.');
    } finally {
      setActionLoadingId('');
    }
  };

  // Extract unique departments for filtering dropdown
  const departments = ['All', ...new Set(doctors.map(d => d.profile?.department || 'General Medicine'))];

  // Filter doctors based on department and search query
  const filteredDoctors = doctors.filter(d => {
    const matchesDept = selectedDept === 'All' || (d.profile?.department === selectedDept);
    const matchesQuery = 
      d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.profile?.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.profile?.department?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesQuery;
  });

  const getRoleTitle = () => {
    if (!user) return 'Workspace';
    if (user.role === 'admin') return 'Administrator';
    if (user.role === 'doctor') return 'Doctor Portal';
    if (user.role === 'receptionist') return 'Receptionist';
    return 'Patient Portal';
  };

  return (
    <DashboardLayout
      roleTitle={getRoleTitle()}
      activeTab="doctors"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search doctors by name, specialty, department..."
    >
      <div className="space-y-6">
        {/* Table/Directory Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Clinic Physicians Registry</h2>
            <p className="text-xs text-zinc-450 mt-1">Review physician rates, specialty departments, and view active schedules.</p>
          </div>
          
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            {/* Department Filter Dropdown */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-350 px-3 py-2.5 rounded-xl focus:outline-none cursor-pointer transition-all hover:border-zinc-700"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === 'All' ? 'All Departments' : dept}
                </option>
              ))}
            </select>

            {user?.role === 'admin' && (
              <Link
                href="/doctors/new"
                className="py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all cursor-pointer inline-flex items-center"
              >
                ➕ Add New Doctor
              </Link>
            )}
          </div>
        </div>

        {/* Directory Grid */}
        {loadingData ? (
          <div className="flex flex-col items-center justify-center p-24 bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
            <p className="text-zinc-550 text-xs">Pulling database physician registries...</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="p-16 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl text-zinc-550 italic text-sm">
            No consulting doctors found matching your query.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doc) => (
              <div 
                key={doc.id}
                className="group bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700/80 p-6 rounded-2xl flex flex-col justify-between hover:bg-zinc-900/60 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-4">
                  {/* Avatar and Name */}
                  <div className="flex items-start space-x-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-cyan-500/10 to-indigo-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl text-cyan-400 group-hover:scale-105 transition-transform duration-300">
                      🩺
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white hover:text-cyan-400 transition-colors">
                        <Link href={`/doctors/${doc.id}`}>{doc.name}</Link>
                      </h3>
                      <span className="text-[10px] text-zinc-550 font-mono tracking-wider block mt-0.5">{doc.id}</span>
                    </div>
                  </div>

                  {/* Core details */}
                  <div className="space-y-2 border-t border-b border-zinc-850 py-3 text-xs text-zinc-400">
                    <div className="flex justify-between">
                      <span className="text-zinc-550">Department</span>
                      <span className="font-semibold text-zinc-200">{doc.profile?.department || 'General Medicine'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-550">Specialization</span>
                      <span className="font-semibold text-zinc-200 text-right max-w-[180px] truncate" title={doc.profile?.specialization}>
                        {doc.profile?.specialization || 'Clinical Generalist'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-550">Experience</span>
                      <span className="font-semibold text-cyan-400">{doc.profile?.experience ? `${doc.profile.experience} Year(s)` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-550">Consultation Fee</span>
                      <span className="font-semibold text-emerald-400 font-mono">${doc.profile?.fees || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-550">Room / Phone</span>
                      <span className="font-semibold text-zinc-350">{doc.profile?.room || 'Cabinet 101'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-6 flex items-center justify-between gap-3">
                  <Link
                    href={`/doctors/${doc.id}`}
                    className="flex-1 text-center py-2 px-3 bg-zinc-950 border border-zinc-850 hover:border-zinc-850 hover:bg-zinc-850 rounded-xl text-xs font-semibold text-zinc-350 hover:text-white transition-all cursor-pointer"
                  >
                    View Schedule
                  </Link>

                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                      disabled={actionLoadingId === doc.id}
                      className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-bold text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                      title="Remove doctor registry"
                    >
                      {actionLoadingId === doc.id ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
