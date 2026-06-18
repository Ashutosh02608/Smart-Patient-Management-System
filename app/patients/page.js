'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PatientsDirectory() {
  const { user } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState('');

  // Redirect patients away from the general clinical directory
  useEffect(() => {
    if (user && user.role === 'patient') {
      router.push('/patient');
    }
  }, [user, router]);

  const fetchData = useCallback(async () => {
    try {
      setLoadingData(true);
      const res = await fetch('/api/users?role=patient');
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (err) {
      console.error("Error fetching patients list:", err);
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

  const handleDeletePatient = async (id, name) => {
    if (!confirm(`Are you sure you want to delete the patient card for "${name}"? This will delete all their diagnostic login credentials.`)) return;
    
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete patient profile');
      }
    } catch (err) {
      console.error("Delete patient error:", err);
      alert('An error occurred while deleting the patient.');
    } finally {
      setActionLoadingId('');
    }
  };

  // Filter patients by name, email, phone, blood group, gender
  const filteredPatients = patients.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.profile?.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.profile?.bloodGroup?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.profile?.gender?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleTitle = () => {
    if (!user) return 'Workspace';
    if (user.role === 'admin') return 'Administrator';
    if (user.role === 'doctor') return 'Doctor Portal';
    if (user.role === 'receptionist') return 'Receptionist';
    return 'Patient Portal';
  };

  if (user && user.role === 'patient') {
    return null;
  }

  return (
    <DashboardLayout
      roleTitle={getRoleTitle()}
      activeTab="patients"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search patients by name, email, blood group..."
    >
      <div className="space-y-6">
        {/* Table/Directory Header Actions */}
        <div className="flex justify-between items-center bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl">
          <div>
            <h2 className="text-lg font-bold text-white">Clinic Patient Directory Records</h2>
            <p className="text-xs text-zinc-450 mt-1">Review health credentials, view history, or register new patients.</p>
          </div>
          {(user?.role === 'admin' || user?.role === 'receptionist') && (
            <Link
              href="/patients/new"
              className="py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all cursor-pointer"
            >
              ➕ Onboard New Patient
            </Link>
          )}
        </div>

        {/* Directory List Table */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/20">
            <h3 className="text-sm font-bold text-white">All Patients Electronic Medical Records</h3>
            <span className="text-xs text-zinc-550">{filteredPatients.length} patient(s) listed</span>
          </div>

          {loadingData ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
              <p className="text-zinc-500 text-xs">Pulling database medical directories...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-900/60 border-b border-zinc-850 text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                    <th className="p-4">Name</th>
                    <th className="p-4">Age / DOB</th>
                    <th className="p-4">Gender</th>
                    <th className="p-4">Contact Info</th>
                    <th className="p-4">Blood Group</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500 italic">
                        No patient records found.
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-900/20 transition-colors">
                        <td className="p-4 font-semibold text-white">
                          <Link href={`/patients/${p.id}`} className="hover:text-cyan-400 transition-colors block">
                            {p.name}
                          </Link>
                          <span className="text-[9px] text-zinc-550 block font-mono mt-0.5">{p.id}</span>
                        </td>
                        <td className="p-4 text-zinc-300">
                          {p.profile?.age ? `${p.profile.age} Years` : 'N/A'}
                          <span className="block text-[9px] text-zinc-500">{p.profile?.dob || 'DOB Not specified'}</span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold capitalize border ${
                            p.profile?.gender === 'Male' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                            p.profile?.gender === 'Female' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            'bg-zinc-850 text-zinc-400 border-zinc-800'
                          }`}>
                            {p.profile?.gender || 'Not Specified'}
                          </span>
                        </td>
                        <td className="p-4 font-mono">
                          <span className="text-zinc-200 block">{p.email}</span>
                          <span className="text-[10px] text-zinc-500 block">{p.profile?.phone || 'Phone: N/A'}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-cyan-400 font-bold font-mono">{p.profile?.bloodGroup || 'Not set'}</span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-2.5">
                            <Link
                              href={`/patients/${p.id}`}
                              className="py-1 px-2.5 rounded bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-[10px] font-semibold text-zinc-300 transition-colors"
                            >
                              Profile
                            </Link>
                            <Link
                              href={`/patients/${p.id}?edit=true`}
                              className="py-1 px-2.5 rounded bg-indigo-950/20 hover:bg-indigo-900/30 border border-indigo-900/30 text-[10px] font-semibold text-indigo-400 transition-colors"
                            >
                              Edit
                            </Link>
                            {(user?.role === 'admin' || user?.role === 'receptionist') && (
                              <button
                                onClick={() => handleDeletePatient(p.id, p.name)}
                                disabled={actionLoadingId === p.id}
                                className="py-1 px-2.5 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-[10px] font-bold text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {actionLoadingId === p.id ? 'Deleting...' : 'Delete'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
