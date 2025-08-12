"use client"

import React, { useState, useEffect } from 'react';
import { User, BarChart3, AlertTriangle, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/AppShell';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

const OnboardingPage = () => {
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || 'User';
  const userEmail = user?.email || 'user@example.com';
  const router = useRouter();

  const [formData, setFormData] = useState({ age: '', height: '', weight: '', allergies: '' });
  const [validationErrors, setValidationErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Load saved data (local fallback)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('onboardingData');
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  const saveToStorage = (data) => {
    try { localStorage.setItem('onboardingData', JSON.stringify(data)); } catch {}
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      saveToStorage(next);
      return next;
    });
    if (validationErrors[field]) setValidationErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.age || parseInt(formData.age) < 1 || parseInt(formData.age) > 120) errors.age = 'Please enter a valid age between 1-120';
    if (!formData.height || parseFloat(formData.height) < 50 || parseFloat(formData.height) > 300) errors.height = 'Please enter a valid height between 50-300 cm';
    if (!formData.weight || parseFloat(formData.weight) < 10 || parseFloat(formData.weight) > 500) errors.weight = 'Please enter a valid weight between 10-500 kg';
    if (!formData.allergies.trim()) errors.allergies = 'Please specify allergies or type "None"';
    return errors;
  };

  const computeBmi = (heightCm, weightKg) => {
    const h = Number(heightCm);
    const w = Number(weightKg);
    if (!h || !w) return null;
    const heightM = h / 100;
    if (heightM <= 0) return null;
    const bmi = w / (heightM * heightM);
    return Number(bmi.toFixed(1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setIsLoading(true);
    try {
      const bmi = computeBmi(formData.height, formData.weight);

      const payload = {
        id: user?.id,             // PK per schema
        email: userEmail,
        full_name: userName,
        age: formData.age ? Number(formData.age) : null,
        height: formData.height ? Number(formData.height) : null,
        weight: formData.weight ? Number(formData.weight) : null,
        allergies: formData.allergies,
        bmi: bmi,
        onboarding_completed: true,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;

      // Save local fallback including BMI
      saveToStorage({ ...formData, bmi });

      router.replace('/home/profile');
      router.refresh();
    } catch (error) {
      console.error('Onboarding save error:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <AppShell title="Scanner App">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Complete Your Profile</h2>
            <p className="opacity-75">Provide a few details to personalize your health analysis.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Information */}
            <div className="p-6 rounded-lg bg-white dark:bg-gray-800 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <User className="mr-2 text-blue-500" size={18} /> Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <input type="text" value={userName} disabled className="w-full px-3 py-2 rounded border bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address</label>
                  <input type="email" value={userEmail} disabled className="w-full px-3 py-2 rounded border bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed" />
                </div>
              </div>
            </div>

            {/* Health Information */}
            <div className="p-6 rounded-lg bg-white dark:bg-gray-800 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <BarChart3 className="mr-2 text-green-500" size={18} /> Health Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Age <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    placeholder="Enter your age"
                    value={formData.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    className={`w-full px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 ${validationErrors.age ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'}`}
                  />
                  {validationErrors.age && (
                    <p className="text-red-500 text-sm mt-1 flex items-center"><AlertTriangle size={14} className="mr-1" />{validationErrors.age}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Height (cm) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Enter height in cm"
                    value={formData.height}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                    className={`w-full px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 ${validationErrors.height ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'}`}
                  />
                  {validationErrors.height && (
                    <p className="text-red-500 text-sm mt-1 flex items-center"><AlertTriangle size={14} className="mr-1" />{validationErrors.height}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Weight (kg) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Enter weight in kg"
                    value={formData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                    className={`w-full px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 ${validationErrors.weight ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'}`}
                  />
                  {validationErrors.weight && (
                    <p className="text-red-500 text-sm mt-1 flex items-center"><AlertTriangle size={14} className="mr-1" />{validationErrors.weight}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Dietary Information */}
            <div className="p-6 rounded-lg bg-white dark:bg-gray-800 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <AlertTriangle className="mr-2 text-orange-500" size={18} /> Dietary Information
              </h3>
              <div>
                <label className="block text-sm font-medium mb-2">Food Allergies <span className="text-red-500">*</span></label>
                <textarea
                  placeholder="List any food allergies or type 'None'"
                  value={formData.allergies}
                  onChange={(e) => handleInputChange('allergies', e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${validationErrors.allergies ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'}`}
                />
                {validationErrors.allergies && (
                  <p className="text-red-500 text-sm mt-1 flex items-center"><AlertTriangle size={14} className="mr-1" />{validationErrors.allergies}</p>
                )}
                <p className="text-sm mt-2 opacity-75">This helps us tailor health analysis for scanned products.</p>
              </div>
            </div>

            {/* Submit */}
            <div className="flex flex-col items-center space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className={`flex items-center justify-center px-4 py-2 rounded-lg text-white ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 transition-colors'} min-w-64`}
              >
                {isLoading ? <span>Saving...</span> : (<><Save size={18} className="mr-2" /> Complete Profile</>)}
              </button>
              <p className="text-sm opacity-75">All fields marked with <span className="text-red-500 font-bold">*</span> are required</p>
            </div>
          </form>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
};

export default OnboardingPage;