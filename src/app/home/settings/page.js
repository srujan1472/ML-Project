"use client"

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

const SettingsPage = () => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="p-6 rounded-lg bg-white shadow-lg">
              <h1 className="text-2xl font-semibold mb-2">Settings</h1>
              <p className="opacity-75">This is a placeholder settings page.</p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default SettingsPage;


