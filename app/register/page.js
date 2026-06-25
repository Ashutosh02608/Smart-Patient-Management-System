'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export default function RegisterPage() {
  const { register, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [error, setError] = useState('');
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  // OTP Signup States
  const [step, setStep] = useState('form'); // 'form' or 'otp'
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSentCode, setOtpSentCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setOtpError('');

    if (!name.trim() || !email.trim() || !password || !role) {
      setError('Please fill in all fields.');
      return;
    }

    if (name.trim().length < 3) {
      setError('Full name must be at least 3 characters.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch('/api/auth/register/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP verification code.');
      }
      
      if (data.otp) {
        setOtpSentCode(data.otp);
      }
      setStep('otp');
      setResendCooldown(30);
    } catch (err) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setOtpError('');

    if (!otp || otp.length !== 6) {
      setOtpError('Please enter a valid 6-digit verification code.');
      return;
    }

    const res = await register(name, email, password, role, otp);
    if (!res.success) {
      setOtpError(res.error || 'Invalid verification code or registration failed.');
    } else if (res.pendingApproval) {
      setIsPendingApproval(true);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpError('');
    try {
      const res = await fetch('/api/auth/register/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend verification code.');
      }
      if (data.otp) {
        setOtpSentCode(data.otp);
      }
      setResendCooldown(30);
    } catch (err) {
      setOtpError(err.message || 'Failed to resend OTP.');
    }
  };

  if (isPendingApproval) {
    return (
      <main className="flex-1 flex justify-center items-center p-6 min-h-screen bg-zinc-950 text-zinc-100 font-sans relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/20 via-zinc-950 to-indigo-950/20 pointer-events-none" />
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center space-y-6 relative z-10">
          <div className="inline-flex h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 items-center justify-center font-bold text-xl mb-2">
            ✨
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Registration Submitted</h2>
          <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-350 p-4 rounded-xl text-sm leading-relaxed text-center">
            Your staff account (<strong>{email}</strong>) has been registered successfully!
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed text-center">
            Since you registered as a clinic staff role (<span className="text-cyan-400 font-semibold capitalize">{role}</span>), a clinic administrator must confirm your signup before you can sign in.
          </p>
          <div className="pt-4 border-t border-zinc-800">
            <Link
              id="pending-login-redirect"
              href="/login"
              className="block w-full text-center py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-655 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold text-sm shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col md:flex-row min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Decorative branding side pane (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-indigo-950 via-zinc-900 to-cyan-950 justify-center items-center p-12 border-r border-zinc-800/50 relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        
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
            Create Your Account to Join CarePulse.
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Get instant access to smart appointment scheduling, medical profile reports, and secure communication channels.
          </p>

          <div className="pt-4 border-t border-zinc-800 space-y-3">
            <div className="flex items-start space-x-3">
              <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400 mt-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Smart Patient Profiles</h4>
                <p className="text-xs text-zinc-500">Allergies, blood group, emergency contacts and medical history.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 mt-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Real-Time Calendars</h4>
                <p className="text-xs text-zinc-500">Check availability, book time slots, and receive auto notifications.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Register Form / OTP Pane */}
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

        <div className="w-full max-w-md space-y-6">
          {step === 'form' ? (
            <>
              <div className="space-y-2 text-center md:text-left">
                <h2 className="text-3xl font-bold tracking-tight text-white">Register</h2>
                <p className="text-sm text-zinc-400">
                  Create an account to begin using CarePulse.
                </p>
              </div>

              {error && (
                <div className="bg-rose-950/50 border border-rose-800 text-rose-200 p-4 rounded-xl text-sm" id="register-error">
                  {error}
                </div>
              )}

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-200"
                    placeholder="Dr. John Watson or Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-200"
                    placeholder="name@clinic.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-200"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      required
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-200"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800">
                  <label htmlFor="role" className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                    Account Role
                  </label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm"
                  >
                    <option value="patient">Patient (Manage your health & bookings)</option>
                    <option value="doctor">Doctor (Consultations & medical records)</option>
                    <option value="receptionist">Receptionist (Schedules & check-ins)</option>
                  </select>
                </div>

                <button
                  id="register-submit"
                  type="submit"
                  disabled={sendingOtp}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-650 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold text-sm shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  {sendingOtp ? 'Sending OTP Verification...' : 'Register'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="space-y-2 text-center md:text-left">
                <h2 className="text-3xl font-bold tracking-tight text-white font-sans">Verify Your Email</h2>
                <p className="text-sm text-zinc-400">
                  We have sent a 6-digit verification code to <strong className="text-zinc-200">{email}</strong>.
                </p>
              </div>

              {otpError && (
                <div className="bg-rose-950/50 border border-rose-800 text-rose-200 p-4 rounded-xl text-sm" id="otp-error">
                  {otpError}
                </div>
              )}



              <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="otp" className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                    Enter Verification Code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    required
                    maxLength={6}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 text-center text-xl tracking-widest font-bold font-mono transition-all duration-200"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  />
                </div>

                <button
                  id="otp-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-650 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-bold text-sm shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Verifying & Registering...' : 'Verify & Complete Registration'}
                </button>

                <div className="flex justify-between items-center text-xs pt-2">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0}
                    className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors disabled:text-zinc-650 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('form');
                      setError('');
                      setOtpError('');
                    }}
                    className="font-medium text-zinc-450 hover:text-zinc-200 transition-colors underline cursor-pointer"
                  >
                    Change Email / Go Back
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="text-center pt-2">
            <p className="text-sm text-zinc-400">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-4"
              >
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
