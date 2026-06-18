'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [simulatedLink, setSimulatedLink] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSimulatedLink('');
    setLoading(true);

    if (!email) {
      setError('Please enter your email.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process request');
      }

      setSuccess(true);
      setMessage(data.message);
      if (data.resetLink) {
        setSimulatedLink(data.resetLink);
      }
    } catch (err) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex justify-center items-center p-6 min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/20 via-zinc-950 to-indigo-950/20 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative z-10 space-y-6">
        <div className="space-y-2 text-center">
          <div className="inline-flex h-12 w-12 rounded-xl bg-cyan-500/10 text-cyan-400 items-center justify-center font-bold text-xl mb-2">
            🔑
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Reset Password</h2>
          <p className="text-sm text-zinc-400">
            Enter your clinic email and we&apos;ll help you generate a reset token.
          </p>
        </div>

        {error && (
          <div className="bg-rose-950/50 border border-rose-800 text-rose-200 p-4 rounded-xl text-sm" id="forgot-error">
            {error}
          </div>
        )}

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-650 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-200"
                placeholder="name@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              id="forgot-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold text-sm shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Processing Request...' : 'Send Password Reset Link'}
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="bg-cyan-950/20 border border-cyan-900 text-cyan-200 p-4 rounded-xl text-sm leading-relaxed" id="forgot-success-msg">
              {message}
            </div>

            {simulatedLink && (
              <div className="bg-zinc-950 border border-cyan-500/30 rounded-xl p-4 space-y-3 shadow-inner">
                <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  <span>Simulated Mailbox Notification</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  CarePulse has generated a reset link for your account. You can click it directly to perform the reset:
                </p>
                <Link
                  id="simulated-reset-link"
                  href={simulatedLink}
                  className="block text-center py-2.5 px-4 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 font-medium text-xs transition-colors"
                >
                  Reset Password Now &rarr;
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                setSimulatedLink('');
                setEmail('');
              }}
              className="w-full text-center text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              &larr; Try another email
            </button>
          </div>
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
    </main>
  );
}
