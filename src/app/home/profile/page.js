"use client"

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, User, Ruler, Weight, AlertTriangle } from 'lucide-react';

// Simple in-memory store as placeholder until backend is wired.
// In a real app, you'd persist to Supabase profile table and fetch here.
let lastOnboardingData = null;
if (typeof window !== 'undefined') {
  try { lastOnboardingData = JSON.parse(localStorage.getItem('onboardingData') || 'null'); } catch {}
}

export default function ProfilePage() {
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const email = user?.email || 'unknown@example.com';
  const data = lastOnboardingData || {};

  return (
    <ProtectedRoute>
      <AppShell title="Scanner App">
        <div className="max-w-3xl mx-auto grid gap-6">
          <div className="p-6 rounded-lg bg-white dark:bg-gray-800 shadow-lg">
            <h1 className="text-2xl font-semibold mb-1">Profile</h1>
            <p className="opacity-75 mb-6">Your account and health details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-md bg-gray-50 dark:bg-gray-700/50">
                <User size={18} className="text-blue-600" />
                <div>
                  <p className="text-xs opacity-70">Name</p>
                  <p className="font-medium">{displayName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-md bg-gray-50 dark:bg-gray-700/50">
                <Mail size={18} className="text-blue-600" />
                <div>
                  <p className="text-xs opacity-70">Email</p>
                  <p className="font-medium break-all">{email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-md bg-gray-50 dark:bg-gray-700/50">
                <Ruler size={18} className="text-green-600" />
                <div>
                  <p className="text-xs opacity-70">Height (cm)</p>
                  <p className="font-medium">{data?.height || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-md bg-gray-50 dark:bg-gray-700/50">
                <Weight size={18} className="text-green-600" />
                <div>
                  <p className="text-xs opacity-70">Weight (kg)</p>
                  <p className="font-medium">{data?.weight || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-md bg-gray-50 dark:bg-gray-700/50 sm:col-span-2">
                <AlertTriangle size={18} className="text-orange-600" />
                <div>
                  <p className="text-xs opacity-70">Allergies</p>
                  <p className="font-medium">{data?.allergies || '—'}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="text-xs opacity-60">
            Changes made in Onboarding will reflect here automatically.
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}


