'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreatePatientPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect if not admin or receptionist
  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'receptionist') {
      router.push(`/${user.role}`);
    }
  }, [user, router]);

  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Not Specified');
  const [bloodGroup, setBloodGroup] = useState('Not Specified');
  const [address, setAddress] = useState('');
  const [allergies, setAllergies] = useState('None');
  const [emergencyContact, setEmergencyContact] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !email) {
      setError('Patient Name and Email are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password: 'patient123', // default clinical authentication password
          role: 'patient',
          profile: {
            phone,
            age: age ? parseInt(age) : '',
            dob,
            gender,
            bloodGroup,
            address,
            allergies,
            emergencyContact
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create patient card');

      setSuccess(`Patient profile created successfully! (Default Password: patient123)`);
      setTimeout(() => {
        router.push('/patients');
      }, 1500);
    } catch (err) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleTitle = () => {
    if (!user) return 'Workspace';
    if (user.role === 'admin') return 'Administrator';
    if (user.role === 'doctor') return 'Doctor Portal';
    if (user.role === 'receptionist') return 'Receptionist';
    return 'Patient Portal';
  };

  if (user && user.role !== 'admin' && user.role !== 'receptionist') {
    return null;
  }

  return (
    <DashboardLayout
      roleTitle={getRoleTitle()}
      activeTab="patients"
    >
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Navigation Breadcrumb back link */}
        <div className="flex items-center justify-between pb-2">
          <Link
            href="/patients"
            className="flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <span>⬅️</span>
            <span>Back to Patients Directory</span>
          </Link>
        </div>

        {/* Onboarding Panel */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="space-y-1 border-b border-zinc-850 pb-4">
            <h2 className="text-lg font-bold text-white">Register Clinical Patient File</h2>
            <p className="text-xs text-zinc-450">Create a new electronic health record. Patients are auto-approved to authenticate.</p>
          </div>

          {error && (
            <div className="bg-rose-950/40 border border-rose-800 text-rose-200 p-4 rounded-xl text-xs">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 p-4 rounded-xl text-xs">
              {success}
            </div>
          )}

          <form onSubmit={handleCreatePatient} className="space-y-5">
            {/* Primary Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="patient-name" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Patient Full Name *</label>
                <input
                  id="patient-name"
                  type="text"
                  required
                  placeholder="e.g. Eleanor Vance"
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="patient-email" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email Address *</label>
                <input
                  id="patient-email"
                  type="email"
                  required
                  placeholder="eleanor@vance.com"
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Demographics & Contact */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label htmlFor="patient-age" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Age</label>
                <input
                  id="patient-age"
                  type="number"
                  placeholder="e.g. 34"
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="patient-dob" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">DOB</label>
                <input
                  id="patient-dob"
                  type="date"
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none text-zinc-400"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="patient-gender" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Gender</label>
                <select
                  id="patient-gender"
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-Binary">Non-Binary</option>
                  <option value="Not Specified">Not Specified</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="patient-phone" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Phone</label>
                <input
                  id="patient-phone"
                  type="text"
                  placeholder="+1 (555) 018-2938"
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Medical Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor="patient-blood" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Blood Group</label>
                <select
                  id="patient-blood"
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
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
                <label htmlFor="patient-emergency" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Emergency Contact</label>
                <input
                  id="patient-emergency"
                  type="text"
                  placeholder="e.g. Luke Vance (+1 555-018-2931)"
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <label htmlFor="patient-address" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Resident Address</label>
              <input
                id="patient-address"
                type="text"
                placeholder="e.g. 102 Hill House Road, Massachusetts, USA"
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            {/* Allergies */}
            <div className="space-y-1">
              <label htmlFor="patient-allergies" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Medical Allergies</label>
              <input
                id="patient-allergies"
                type="text"
                placeholder="e.g. Penicillin, Peanuts (If none, write 'None')"
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-zinc-100 text-xs focus:outline-none"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold text-xs shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Submitting Registry Profile...' : 'Complete Patient Registry'}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
