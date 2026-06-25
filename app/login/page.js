'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    const res = await login(email, password);
    if (!res.success) {
      setError(res.error || 'Invalid email or password.');
    }
  };

  return (
    <main className="flex-1 flex flex-col md:flex-row min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Decorative branding side pane (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-tr from-cyan-950 via-zinc-900 to-indigo-950 justify-center items-center p-12 border-r border-zinc-800/50 relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        
        <div className="max-w-md space-y-6 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center font-bold text-xl text-zinc-950 shadow-lg shadow-cyan-500/20">
              CP
            </div>
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-cyan-300 to-indigo-200 bg-clip-text text-transparent">
              CarePulse
            </span>
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
            Integrated Clinic Management Made Simpler.
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Manage appointments, review patient records, coordinate staff calendars, and optimize workflows in one unified, real-time interface.
          </p>

          <div className="pt-4 border-t border-zinc-800 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Clinic Status Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900/60 backdrop-blur-sm p-4 rounded-xl border border-zinc-800">
                <span className="block text-2xl font-bold text-white">99.8%</span>
                <span className="text-xs text-zinc-500">Uptime SLA</span>
              </div>
              <div className="bg-zinc-900/60 backdrop-blur-sm p-4 rounded-xl border border-zinc-800">
                <span className="block text-2xl font-bold text-white">SSL</span>
                <span className="text-xs text-zinc-500">End-to-End Encrypted</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form Pane */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-16 relative">
        <div className="absolute top-6 left-6 md:top-8 md:left-8">
          <Link
            href="/"
            className="flex items-center space-x-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors py-2 px-3 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/50 border border-zinc-800/80 hover:border-zinc-700/80 backdrop-blur-sm"
          >
            <span>←</span>
            <span>Back to Homepage</span>
          </Link>
        </div>

        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-white">Sign In</h2>
            <p className="text-sm text-zinc-400">
              Enter your credentials to access your workspace.
            </p>
          </div>

          {error && (
            <div className="bg-rose-950/50 border border-rose-800 text-rose-200 p-4 rounded-xl text-sm leading-relaxed" id="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-200"
                placeholder="name@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-200"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold text-sm shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-sm text-zinc-400">
              New to CarePulse?{' '}
              <Link
                href="/register"
                className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-4"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
