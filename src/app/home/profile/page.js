"use client"

import React, { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Mail, User, Ruler, Weight, AlertTriangle, CheckCircle, Clock, HeartPulse } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ full_name: '', age: null, height: null, weight: null, allergies: '', email: '', onboarding_completed: false, created_at: '', bmi: null });

  useEffect(() => {
    let isCancelled = false;
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, age, height, weight, allergies, email, onboarding_completed, created_at, bmi')
          .eq('id', user.id)
          .maybeSingle();
        if (!isCancelled && data) {
          setProfile(data);
          setLoading(false);
          return;
        }
      } catch {}

      // Fallback to localStorage + auth metadata
      try {
        const saved = JSON.parse(localStorage.getItem('onboardingData') || 'null');
        const full_name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
        const email = user?.email || '';
        if (!isCancelled) {
          setProfile({
            full_name,
            email,
            age: saved?.age ? Number(saved.age) : null,
            height: saved?.height ? Number(saved.height) : null,
            weight: saved?.weight ? Number(saved.weight) : null,
            allergies: saved?.allergies || '',
            onboarding_completed: false,
            created_at: '',
            bmi: saved?.bmi ? Number(saved.bmi) : null,
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

  const computedBmi = useMemo(() => {
    if (profile.bmi) return Number(profile.bmi.toFixed(1));
    const h = Number(profile.height);
    const w = Number(profile.weight);
    if (!h || !w) return null;
    const hm = h / 100;
    if (hm <= 0) return null;
    return Number((w / (hm * hm)).toFixed(1));
  }, [profile.bmi, profile.height, profile.weight]);

  const bmiColorClass = useMemo(() => {
    const bmi = computedBmi;
    if (!bmi) return 'text-gray-500';
    if (bmi >= 18.5 && bmi <= 24.9) return 'text-green-600';
    if ((bmi >= 16 && bmi < 18.5) || (bmi > 24.9 && bmi <= 29.9)) return 'text-orange-500';
    return 'text-red-600';
  }, [computedBmi]);

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
              <>
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
                      <p className="font-medium">{profile.height ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-md bg-gray-50 dark:bg-gray-700/50">
                    <Weight size={18} className="text-green-600" />
                    <div>
                      <p className="text-xs opacity-70">Weight (kg)</p>
                      <p className="font-medium">{profile.weight ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-md bg-gray-50 dark:bg-gray-700/50">
                    <HeartPulse size={18} className="text-purple-600" />
                    <div>
                      <p className="text-xs opacity-70">BMI</p>
                      <p className={`font-semibold ${bmiColorClass}`}>{computedBmi ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-md bg-gray-50 dark:bg-gray-700/50">
                    <User size={18} className="text-teal-600" />
                    <div>
                      <p className="text-xs opacity-70">Age</p>
                      <p className="font-medium">{profile.age ?? '—'}</p>
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
                <div className="mt-4 flex items-center gap-4">
                  {profile.onboarding_completed ? (
                    <span className="inline-flex items-center gap-2 text-green-600"><CheckCircle size={16} /> Onboarding completed</span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-gray-500"><Clock size={16} /> Onboarding pending</span>
                  )}
                  {profile.created_at && (
                    <span className="text-xs opacity-70">Updated: {new Date(profile.created_at).toLocaleString()}</span>
                  )}
                </div>
              </>
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


