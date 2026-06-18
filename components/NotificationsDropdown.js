'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function NotificationsDropdown({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRealNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load read status from localStorage
      const readIdsKey = `carepulse_read_notifs_${user.id}`;
      let readIds = [];
      try {
        const stored = localStorage.getItem(readIdsKey);
        if (stored) readIds = JSON.parse(stored);
      } catch (e) {
        console.error("Error parsing localStorage read IDs", e);
      }

      let users = [];
      let appointments = [];
      let records = [];

      // Fetch what is accessible or needed for the role
      if (user.role === 'admin' || user.role === 'receptionist') {
        const uRes = await fetch('/api/users');
        if (uRes.ok) users = await uRes.json();
      }

      const aptRes = await fetch('/api/appointments');
      if (aptRes.ok) appointments = await aptRes.json();

      // Only patients or doctors/admins can fetch records
      if (user.role !== 'receptionist') {
        const recRes = await fetch('/api/records');
        if (recRes.ok) records = await recRes.json();
      }

      const generatedNotifs = [];

      if (user.role === 'admin') {
        // 1. Pending approvals
        const pending = users.filter(u => !u.approved);
        pending.forEach(u => {
          generatedNotifs.push({
            id: `pending-${u.id}`,
            title: 'Staff Pending Approval',
            message: `${u.name} registered as ${u.role} and is waiting for activation.`,
            time: 'Pending',
            read: readIds.includes(`pending-${u.id}`),
            icon: '🛡️'
          });
        });

        // 2. Waiting room alerts
        appointments.filter(a => a.status === 'waiting').forEach(a => {
          generatedNotifs.push({
            id: `apt-wait-${a.id}`,
            title: 'Patient Checked In',
            message: `Patient ${a.patientName} has checked in and is waiting for Dr. ${a.doctorName}.`,
            time: a.time || 'Live',
            read: readIds.includes(`apt-wait-${a.id}`),
            icon: '⏰'
          });
        });

        // 3. New appointments scheduled
        appointments.filter(a => a.status === 'scheduled').forEach(a => {
          generatedNotifs.push({
            id: `apt-sched-${a.id}`,
            title: 'New Appointment Booked',
            message: `${a.patientName} scheduled with Dr. ${a.doctorName} for ${a.date} at ${a.time}.`,
            time: a.time,
            read: readIds.includes(`apt-sched-${a.id}`),
            icon: '📅'
          });
        });
      } else if (user.role === 'doctor') {
        // 1. Appointments waiting
        appointments.filter(a => a.status === 'waiting').forEach(a => {
          generatedNotifs.push({
            id: `apt-wait-${a.id}`,
            title: 'Patient Waiting',
            message: `Your patient, ${a.patientName}, has checked in and is waiting in the queue.`,
            time: a.time,
            read: readIds.includes(`apt-wait-${a.id}`),
            icon: '⏰'
          });
        });

        // 2. Scheduled appointments
        appointments.filter(a => a.status === 'scheduled').forEach(a => {
          generatedNotifs.push({
            id: `apt-sched-${a.id}`,
            title: 'Appointment Booked',
            message: `Upcoming session scheduled with ${a.patientName} on ${a.date} at ${a.time}.`,
            time: a.time,
            read: readIds.includes(`apt-sched-${a.id}`),
            icon: '📅'
          });
        });
      } else if (user.role === 'receptionist') {
        // 1. Pending user profiles alert
        const pending = users.filter(u => !u.approved);
        pending.forEach(u => {
          generatedNotifs.push({
            id: `pending-alert-${u.id}`,
            title: 'Pending Registration Alert',
            message: `${u.name} (${u.role}) registered and is awaiting admin approval.`,
            time: 'Alert',
            read: readIds.includes(`pending-alert-${u.id}`),
            icon: '🛡️'
          });
        });

        // 2. Appointments booked
        appointments.filter(a => a.status === 'scheduled').forEach(a => {
          generatedNotifs.push({
            id: `apt-booked-${a.id}`,
            title: 'Appointment Booked',
            message: `Patient ${a.patientName} is scheduled with Dr. ${a.doctorName} at ${a.time}.`,
            time: a.time,
            read: readIds.includes(`apt-booked-${a.id}`),
            icon: '📅'
          });
        });
      } else if (user.role === 'patient') {
        // 1. Upcoming or waiting appointment statuses
        appointments.forEach(a => {
          generatedNotifs.push({
            id: `apt-status-${a.id}-${a.status}`,
            title: a.status === 'completed' ? 'Consultation Completed' : a.status === 'waiting' ? 'Checked In' : 'Appointment Scheduled',
            message: `Your appointment with Dr. ${a.doctorName} on ${a.date} at ${a.time} is ${a.status}.`,
            time: a.time,
            read: readIds.includes(`apt-status-${a.id}-${a.status}`),
            icon: a.status === 'completed' ? '🩺' : a.status === 'waiting' ? '⏰' : '✅'
          });
        });

        // 2. New EMR medical records added for them
        records.forEach(r => {
          generatedNotifs.push({
            id: `rec-added-${r.id}`,
            title: 'Medical Record Added',
            message: `Dr. ${r.doctorName} added a clinical report. Diagnosis: ${r.diagnosis}.`,
            time: r.date,
            read: readIds.includes(`rec-added-${r.id}`),
            icon: '🩺'
          });
        });
      }

      setNotifications(generatedNotifs);
    } catch (err) {
      console.error("Error fetching notifications data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load real notifications on mount/user change
  useEffect(() => {
    let active = true;
    if (user) {
      setTimeout(() => {
        if (active) fetchRealNotifications();
      }, 0);
    }
    return () => {
      active = false;
    };
  }, [user, fetchRealNotifications]);

  // Refetch when dropdown opens
  useEffect(() => {
    if (isOpen && user) {
      const timer = setTimeout(() => {
        fetchRealNotifications();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, user, fetchRealNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id) => {
    if (!user) return;
    const readIdsKey = `carepulse_read_notifs_${user.id}`;
    let readIds = [];
    try {
      const stored = localStorage.getItem(readIdsKey);
      if (stored) readIds = JSON.parse(stored);
    } catch (e) {}

    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem(readIdsKey, JSON.stringify(readIds));
    }

    setNotifications(prev =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    if (!user) return;
    const readIdsKey = `carepulse_read_notifs_${user.id}`;
    const allIds = notifications.map(n => n.id);
    localStorage.setItem(readIdsKey, JSON.stringify(allIds));

    setNotifications(prev => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer focus:outline-none"
        aria-label="View notifications"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-zinc-950 ring-2 ring-zinc-950 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Container */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl z-50 overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/60 backdrop-blur">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold transition-colors cursor-pointer"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-zinc-850">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-xs">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-xs">
                No notifications to display
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkAsRead(notif.id)}
                  className={`p-4 flex space-x-3 hover:bg-zinc-850/40 transition-colors cursor-pointer ${
                    !notif.read ? 'bg-cyan-500/5' : ''
                  }`}
                >
                  <span className="text-xl shrink-0 mt-0.5">{notif.icon}</span>
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className={`text-xs font-semibold text-white truncate ${!notif.read ? 'text-cyan-400' : ''}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[9px] text-zinc-500 shrink-0 font-mono">{notif.time}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-normal line-clamp-2">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2.5 border-t border-zinc-800 bg-zinc-900/40 text-center">
            <span className="text-[10px] text-zinc-500">
              Logged in as <span className="capitalize text-zinc-400">{user?.role}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
