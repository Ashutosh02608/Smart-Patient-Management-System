'use client';

import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans relative overflow-hidden">
      {/* Abstract styling gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation bar */}
      <header className="h-20 border-b border-zinc-900 px-6 md:px-16 flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center font-bold text-md text-zinc-950 shadow-md shadow-cyan-500/10">
            CP
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-300 to-indigo-200 bg-clip-text text-transparent">
            CarePulse
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            href="/login"
            className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            id="register-cta-nav"
            href="/register"
            className="py-2 px-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 text-sm font-semibold text-white transition-all cursor-pointer"
          >
            Register
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 md:px-12 py-16 max-w-4xl mx-auto space-y-8 relative z-10">
        <div className="space-y-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            ✨ Smart Clinic Management Platform
          </span>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Advanced Clinical Operations. <br className="hidden md:inline" />
            <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              Simplified for Clinics.
            </span>
          </h1>

          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            CarePulse provides a secure, HIPAA-compliant patient management system designed for small clinics. Organize appointments, records, and staff schedules seamlessly.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-2">
          <Link
            id="get-started-cta"
            href="/login"
            className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold text-sm shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            Access Portal Workspace
          </Link>
          <Link
            href="/register"
            className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-750 text-sm font-semibold text-zinc-350 transition-all cursor-pointer"
          >
            Create Patient Account
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 text-left w-full">
          <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl space-y-2 hover:border-zinc-800 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-cyan-950 text-cyan-400 flex items-center justify-center font-bold text-lg mb-2">
              📅
            </div>
            <h3 className="font-bold text-white text-base">Smart Check-ins</h3>
            <p className="text-zinc-550 text-xs leading-relaxed">
              Queue management for receptionists. Live check-in flow from scheduled list into the waiting room.
            </p>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl space-y-2 hover:border-zinc-800 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold text-lg mb-2">
              🩺
            </div>
            <h3 className="font-bold text-white text-base">Physician Desk</h3>
            <p className="text-zinc-550 text-xs leading-relaxed">
              Complete patient medical record tracking, diagnosis records, and custom drug prescription lists.
            </p>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl space-y-2 hover:border-zinc-800 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-purple-950 text-purple-400 flex items-center justify-center font-bold text-lg mb-2">
              🔐
            </div>
            <h3 className="font-bold text-white text-base">RBAC Authorization</h3>
            <p className="text-zinc-550 text-xs leading-relaxed">
              Fine-grained workspace views for Admin, Doctor, Receptionist, and Patient roles.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="h-16 border-t border-zinc-900 px-6 md:px-16 flex items-center justify-between text-xs text-zinc-500 relative z-10 shrink-0">
        <span>&copy; {new Date().getFullYear()} CarePulse Healthcare Technologies, Inc. All rights reserved.</span>
        <span>Secure & HIPAA Compliant Portal</span>
      </footer>
    </main>
  );
}
