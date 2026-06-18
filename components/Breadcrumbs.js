'use client';

import React from 'react';

export default function Breadcrumbs({ roleTitle, activeTab }) {
  // Capitalize active tab name
  const formattedTab = activeTab
    ? activeTab.charAt(0).toUpperCase() + activeTab.slice(1)
    : 'Dashboard';

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs font-medium text-zinc-500">
      <span className="hover:text-zinc-350 transition-colors">Home</span>
      <span className="text-zinc-700">/</span>
      <span className="hover:text-zinc-350 transition-colors capitalize">{roleTitle || 'Workspace'}</span>
      <span className="text-zinc-700">/</span>
      <span className="text-cyan-400 font-semibold">{formattedTab}</span>
    </nav>
  );
}
