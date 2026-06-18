'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function UserProfileDropdown({ user, logout, onSettingsClick }) {
  const [isOpen, setIsOpen] = useState(false);
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

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 p-1 px-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all cursor-pointer focus:outline-none"
      >
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center font-bold text-zinc-950 text-sm">
          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="hidden md:block text-left">
          <h4 className="text-xs font-semibold text-white truncate max-w-[120px]">{user.name}</h4>
          <span className="block text-[9px] text-cyan-400 capitalize">{user.role}</span>
        </div>
        <span className="text-xs text-zinc-500">▼</span>
      </button>

      {/* Profile Dropdown List */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl z-50 overflow-hidden">
          <div className="p-4 border-b border-zinc-850 bg-zinc-900/60 backdrop-blur">
            <h4 className="text-sm font-semibold text-white truncate">{user.name}</h4>
            <span className="text-[10px] text-zinc-400 font-mono block truncate mt-0.5">{user.email}</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 capitalize mt-2">
              {user.role}
            </span>
          </div>

          <div className="p-1.5 space-y-1">
            <button
              onClick={() => {
                setIsOpen(false);
                if (onSettingsClick) onSettingsClick();
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer text-left"
            >
              <span>⚙️</span>
              <span>Workspace Settings</span>
            </button>
          </div>

          <div className="p-1.5 border-t border-zinc-850 bg-zinc-900/20">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
            >
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
