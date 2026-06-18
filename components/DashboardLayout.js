'use client';

import React from 'react';
import { useAuth } from '@/components/AuthProvider';
import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardLayout({
  children,
  roleTitle = 'Portal',
  activeTab = 'dashboard',
  onTabChange = () => {},
  badges = {},
  searchQuery = '',
  onSearchChange,
  searchPlaceholder
}) {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-zinc-100 font-sans">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="text-zinc-400 text-sm">Securing workspace session...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* 1. Sidebar Component */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={onTabChange}
        badges={badges}
      />

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 2. Top Header Component */}
        <Header
          user={user}
          logout={logout}
          roleTitle={roleTitle}
          activeTab={activeTab}
          onSettingsClick={() => onTabChange('settings')}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
        />

        {/* 3. Main Content Pane */}
        <main className="flex-1 overflow-y-auto p-8 bg-zinc-950 relative">
          {/* Neon background blurs for modern aesthetics */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-6xl mx-auto space-y-6 relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
