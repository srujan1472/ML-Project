"use client"

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Mail, User, Ruler, Weight, AlertTriangle } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ full_name: '', height: '', weight: '', allergies: '' });

  useEffect(() => {
    let isCancelled = false;
    const fetchProfile = async () => {
      if (!user) return;
      try {
        // Try id column
        const byId = await supabase
          .from('profiles')
          .select('full_name, height, weight, allergies, email')
          .eq('id', user.id)
          .maybeSingle();
        if (!isCancelled && byId.data) {
          setProfile(byId.data);
          setLoading(false);
          return;
        }
        // Try user_id column
        const byUserId = await supabase
          .from('profiles')
          .select('full_name, height, weight, allergies, email')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!isCancelled && byUserId.data) {
          setProfile(byUserId.data);
          setLoading(false);
          return;
        }
      } catch (e) {}

      // Fallback to localStorage + auth metadata
      try {
        const saved = JSON.parse(localStorage.getItem('onboardingData') || 'null');
        const full_name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
        const email = user?.email || '';
        if (!isCancelled) {
          setProfile({
            full_name,
            email,
            height: saved?.height || '',
            weight: saved?.weight || '',
            allergies: saved?.allergies || '',
          });
          setLoading(false);
        }
      } catch {
        if (!isCancelled) setLoading(false);
      }
    };
    fetchProfile();
    return () => { isCancelled = true; };
  }, [user]);

  const displayName = profile.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const email = profile.email || user?.email || '';

  return (
    <ProtectedRoute>
      <AppShell title="Scanner App">
        <div className="max-w-3xl mx-auto grid gap-6">
          <div className="p-6 rounded-lg bg-white dark:bg-gray-800 shadow-lg">
            <h1 className="text-2xl font-semibold mb-1">Profile</h1>
            <p className="opacity-75 mb-6">Your account and health details</p>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
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
                    <p className="font-medium">{profile.height || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-md bg-gray-50 dark:bg-gray-700/50">
                  <Weight size={18} className="text-green-600" />
                  <div>
                    <p className="text-xs opacity-70">Weight (kg)</p>
                    <p className="font-medium">{profile.weight || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-md bg-gray-50 dark:bg-gray-700/50 sm:col-span-2">
                  <AlertTriangle size={18} className="text-orange-600" />
                  <div>
                    <p className="text-xs opacity-70">Allergies</p>
                    <p className="font-medium">{profile.allergies || '—'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="text-xs opacity-60">
            Changes made in Onboarding will reflect here automatically.
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}


