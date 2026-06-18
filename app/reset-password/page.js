'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!email || !token) {
      setTimeout(() => {
        setError('Invalid reset link parameters. Please request a new password reset link.');
      }, 0);
    }
  }, [email, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative z-10 space-y-6">
      <div className="space-y-2 text-center">
        <div className="inline-flex h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-400 items-center justify-center font-bold text-xl mb-2">
          🔄
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white font-sans">Set New Password</h2>
        <p className="text-sm text-zinc-400">
          Enter a secure password for <span className="text-cyan-400">{email || 'your account'}</span>
        </p>
      </div>

      {error && (
        <div className="bg-rose-950/50 border border-rose-800 text-rose-200 p-4 rounded-xl text-sm" id="reset-error">
          {error}
        </div>
      )}

      {success ? (
        <div className="space-y-5">
          <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 p-4 rounded-xl text-sm text-center leading-relaxed">
            ✨ Password updated successfully! Your new credentials are ready.
          </div>
          <Link
            id="login-redirect-btn"
            href="/login"
            className="block w-full text-center py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold text-sm shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all duration-200"
          >
            Sign In Now
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              New Password
            </label>
            <input
              id="password"
              type="password"
              required
              disabled={!email || !token}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-200 disabled:opacity-50"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              disabled={!email || !token}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-200 disabled:opacity-50"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            id="reset-submit"
            type="submit"
            disabled={loading || !email || !token}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold text-sm shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Updating Password...' : 'Reset Password'}
          </button>
        </form>
      )}

      <div className="text-center pt-2 border-t border-zinc-800">
        <Link
          href="/login"
          className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex-1 flex justify-center items-center p-6 min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/20 via-zinc-950 to-indigo-950/20 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <Suspense fallback={
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="text-zinc-400 text-sm">Loading security parameters...</p>
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
