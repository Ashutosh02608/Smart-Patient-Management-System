'use client';

import React from 'react';
import Link from 'next/link';

export default function Sidebar({ user, activeTab, onTabChange, badges = {} }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', badgeKey: null },
    ...(user?.role === 'admin' ? [{ id: 'staff', label: 'Staff', icon: '👥', badgeKey: null }] : []),
    { id: 'doctors', label: 'Doctors', icon: '🩺', badgeKey: null },
    ...(user?.role !== 'patient' ? [{ id: 'patients', label: 'Patients', icon: '👤', badgeKey: 'patients' }] : []),
    { id: 'appointments', label: 'Appointments', icon: '📅', badgeKey: 'appointments' },
    ...(user?.role !== 'patient' ? [{ id: 'calendar', label: 'Calendar', icon: '🗓️', badgeKey: null }] : []),
    { id: 'reports', label: 'Reports', icon: '📝', badgeKey: 'reports' },
    ...(user?.role === 'patient' ? [
      { id: 'billing', label: 'Billing', icon: '💳', badgeKey: null },
      { id: 'lab-reports', label: 'Lab Reports', icon: '🔬', badgeKey: null }
    ] : []),
    { id: 'messages', label: 'Messages', icon: '💬', badgeKey: null },
    { id: 'settings', label: 'Settings', icon: '⚙️', badgeKey: null },
  ];

  const getHref = (itemId) => {
    if (!user) return '#';
    if (itemId === 'dashboard') return `/${user.role}`;
    if (itemId === 'patients') return '/patients';
    if (itemId === 'doctors') return '/doctors';
    if (itemId === 'calendar') return '/calendar';
    return `/${user.role}?tab=${itemId}`;
  };

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800/80 flex flex-col justify-between shrink-0 font-sans">
      <div className="p-6">
        {/* Brand Header */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center font-bold text-sm text-zinc-950 shadow-md shadow-cyan-500/10">
            CP
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-300 to-indigo-200 bg-clip-text text-transparent">
            CarePulse
          </span>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            const badgeValue = item.badgeKey ? badges[item.badgeKey] : null;

            return (
              <Link
                key={item.id}
                href={getHref(item.id)}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer border ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 text-cyan-400 border-cyan-500/20 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40 border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {badgeValue > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-450/15 text-cyan-400 border border-cyan-400/20">
                    {badgeValue}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Info Tag at Sidebar Bottom */}
      <div className="p-4 border-t border-zinc-850 bg-zinc-900/40 text-center text-[10px] text-zinc-500">
        Clinical Space &bull; <span className="capitalize">{user?.role} Portal</span>
      </div>
    </aside>
  );
}
