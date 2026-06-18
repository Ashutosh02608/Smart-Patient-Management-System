'use client';

import React from 'react';
import Breadcrumbs from './Breadcrumbs';
import NotificationsDropdown from './NotificationsDropdown';
import UserProfileDropdown from './UserProfileDropdown';

export default function Header({
  user,
  logout,
  roleTitle,
  activeTab,
  onSettingsClick,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search records, patients or schedules...'
}) {
  return (
    <header className="h-16 border-b border-zinc-800/80 bg-zinc-900/20 backdrop-blur-md flex items-center justify-between px-8 z-30 shrink-0">
      {/* Left side: Breadcrumbs */}
      <div className="flex items-center space-x-4">
        <Breadcrumbs roleTitle={roleTitle} activeTab={activeTab} />
      </div>

      {/* Center/Right side: Search and Actions */}
      <div className="flex items-center space-x-6 flex-1 max-w-2xl justify-end">
        {/* Search Bar */}
        {onSearchChange && (
          <div className="relative w-full max-w-xs hidden sm:block">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 focus:border-cyan-500/80 rounded-xl pl-9 pr-4 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none transition-all focus:ring-1 focus:ring-cyan-500/20"
            />
          </div>
        )}

        {/* Action Controls: Notifications + Profile Dropdown */}
        <div className="flex items-center space-x-3.5">
          <NotificationsDropdown user={user} />
          
          <div className="h-6 w-px bg-zinc-800"></div>

          <UserProfileDropdown
            user={user}
            logout={logout}
            onSettingsClick={onSettingsClick}
          />
        </div>
      </div>
    </header>
  );
}
