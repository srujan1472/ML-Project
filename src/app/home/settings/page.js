"use client"

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';

const SettingsPage = () => {
  return (
    <ProtectedRoute>
      <AppShell title="Scanner App">
        <div className="max-w-3xl mx-auto">
          <div className="p-6 rounded-lg bg-white dark:bg-gray-800 shadow-lg">
            <h1 className="text-2xl font-semibold mb-2">Settings</h1>
            <p className="opacity-75">This is a placeholder settings page.</p>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
};

export default SettingsPage;


