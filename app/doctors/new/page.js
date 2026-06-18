'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateDoctorPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/doctors');
    }
  }, [user, router]);

  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('General Medicine');
  const [specialization, setSpecialization] = useState('');
  const [experience, setExperience] = useState('');
  const [fees, setFees] = useState('');
  const [room, setRoom] = useState('Cabinet 101');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !email || !password) {
      setError('Doctor Name, Email, and Password are required.');
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
          password,
          role: 'doctor',
          profile: {
            department,
            specialization: specialization || 'Clinical Generalist',
            experience: experience ? parseInt(experience) : 0,
            fees: fees ? parseFloat(fees) : 0,
            room: room || 'Cabinet 101',
            phone: phone || ''
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create doctor account');

      setSuccess(`Doctor account successfully onboarded! Redirecting...`);
      setTimeout(() => {
        router.push('/doctors');
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

  // Prevent flash content if unauthorized
  if (user && user.role !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout
      roleTitle={getRoleTitle()}
      activeTab="doctors"
    >
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Navigation Breadcrumb back link */}
        <div className="flex items-center justify-between pb-2">
          <Link
            href="/doctors"
            className="flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <span>⬅️</span>
            <span>Back to Doctors Directory</span>
          </Link>
        </div>

        {/* Form Container */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="space-y-1.5 border-b border-zinc-850 pb-4">
            <h2 className="text-xl font-bold text-white">Onboard Clinic Physician</h2>
            <p className="text-xs text-zinc-450">Register a new licensed medical professional directly into CarePulse database.</p>
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

          <form onSubmit={handleCreateDoctor} className="space-y-6">
            {/* Account Credentials */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Account Credentials</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label htmlFor="doc-name" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Doctor Name *</label>
                  <input
                    id="doc-name"
                    type="text"
                    required
                    placeholder="e.g. Dr. Helen Cho"
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="doc-email" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email Address *</label>
                  <input
                    id="doc-email"
                    type="email"
                    required
                    placeholder="dr.name@clinic.com"
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="doc-pass" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Temporary Password *</label>
                  <input
                    id="doc-pass"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Professional Profiles */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Professional Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label htmlFor="doc-dept" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Specialty Department *</label>
                  <select
                    id="doc-dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50 cursor-pointer"
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
                  <label htmlFor="doc-specialization" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Clinical Focus Specialty</label>
                  <input
                    id="doc-specialization"
                    type="text"
                    placeholder="e.g. Pediatric Surgeon"
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="doc-exp" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Experience (Years)</label>
                  <input
                    id="doc-exp"
                    type="number"
                    min="0"
                    placeholder="e.g. 12"
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50 font-mono"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label htmlFor="doc-fees" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Consultation Fees ($) *</label>
                  <input
                    id="doc-fees"
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 120"
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50 font-mono"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="doc-room" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Cabinet Room Number *</label>
                  <input
                    id="doc-room"
                    type="text"
                    required
                    placeholder="e.g. Cabinet 203"
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="doc-phone" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Contact Number</label>
                  <input
                    id="doc-phone"
                    type="text"
                    placeholder="+1 (555) 019-9400"
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50 font-mono"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end space-x-3">
              <Link
                href="/doctors"
                className="py-2.5 px-5 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold text-xs shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Creating Doctor Profile...' : 'Onboard Doctor'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
