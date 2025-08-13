"use client"

import React, { useState, useEffect, useMemo } from 'react';
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
  const [selectedAllergies, setSelectedAllergies] = useState([]);
  const [allergySearch, setAllergySearch] = useState('');
  const [noAllergies, setNoAllergies] = useState(false);

  const COMMON_ALLERGENS = useMemo(() => [
    'Milk', 'Eggs', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts', 'Wheat', 'Soy', 'Sesame',
    'Gluten', 'Mustard', 'Celery', 'Sulfites', 'Lupin', 'Molluscs', 'Corn', 'Coconut', 'Yeast',
    'Almond', 'Walnut', 'Hazelnut', 'Pistachio', 'Cashew', 'Pecan', 'Brazil Nut', 'Macadamia',
    'Crustaceans', 'Shrimp', 'Crab', 'Lobster', 'Oyster', 'Scallop'
  ], []);

  // Load saved data (local fallback)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('onboardingData');
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsed }));
        if (Array.isArray(parsed.allergiesSelected)) {
          setSelectedAllergies(parsed.allergiesSelected);
        } else if (typeof parsed.allergies === 'string' && parsed.allergies.trim()) {
          if (parsed.allergies.trim().toLowerCase() === 'none') {
            setNoAllergies(true);
            setSelectedAllergies([]);
          } else {
            setSelectedAllergies(parsed.allergies.split(',').map((s) => s.trim()).filter(Boolean));
          }
        }
        if (typeof parsed.noAllergies === 'boolean') setNoAllergies(parsed.noAllergies);
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

  const persistAllergies = (nextSelected, nextNoAllergies) => {
    const allergiesString = nextNoAllergies ? 'None' : nextSelected.join(', ');
    setFormData((prev) => {
      const next = { ...prev, allergies: allergiesString };
      try { localStorage.setItem('onboardingData', JSON.stringify({ ...next, allergiesSelected: nextSelected, noAllergies: nextNoAllergies })); } catch {}
      return next;
    });
  };

  const toggleAllergy = (name) => {
    if (noAllergies) return;
    setSelectedAllergies((prev) => {
      const exists = prev.includes(name);
      const next = exists ? prev.filter((a) => a !== name) : [...prev, name];
      persistAllergies(next, false);
      if (validationErrors.allergies) setValidationErrors((v) => ({ ...v, allergies: '' }));
      return next;
    });
  };

  const clearAllergies = () => {
    setSelectedAllergies([]);
    persistAllergies([], false);
  };

  const handleNoAllergiesChange = (checked) => {
    setNoAllergies(checked);
    if (checked) {
      setSelectedAllergies([]);
      persistAllergies([], true);
    } else {
      persistAllergies(selectedAllergies, false);
    }
    if (validationErrors.allergies) setValidationErrors((v) => ({ ...v, allergies: '' }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.age || parseInt(formData.age) < 1 || parseInt(formData.age) > 120) errors.age = 'Please enter a valid age between 1-120';
    if (!formData.height || parseFloat(formData.height) < 50 || parseFloat(formData.height) > 300) errors.height = 'Please enter a valid height between 50-300 cm';
    if (!formData.weight || parseFloat(formData.weight) < 10 || parseFloat(formData.weight) > 500) errors.weight = 'Please enter a valid weight between 10-500 kg';
    if (!noAllergies && selectedAllergies.length === 0) errors.allergies = 'Please select at least one allergen or choose "No known allergies"';
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
        allergies: noAllergies ? 'None' : selectedAllergies.join(', '),
        bmi: bmi,
        onboarding_completed: true,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });

      if (error) throw error;

      // Save local fallback including BMI
      saveToStorage({ ...formData, allergies: payload.allergies, allergiesSelected: selectedAllergies, noAllergies, bmi });

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
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      id="no-allergies"
                      type="checkbox"
                      checked={noAllergies}
                      onChange={(e) => handleNoAllergiesChange(e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="no-allergies" className="text-sm">No known allergies</label>
                  </div>

                  <div className={`border rounded-lg ${validationErrors.allergies ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} ${noAllergies ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                      <input
                        type="text"
                        value={allergySearch}
                        onChange={(e) => setAllergySearch(e.target.value)}
                        placeholder="Search allergens..."
                        className="w-full px-2 py-1 bg-transparent focus:outline-none text-sm"
                      />
                    </div>
                    <div className="max-h-40 overflow-auto">
                      {COMMON_ALLERGENS.filter((a) => a.toLowerCase().includes(allergySearch.toLowerCase())).map((name) => {
                        const selected = selectedAllergies.includes(name);
                        return (
                          <button type="button" key={name} onClick={() => toggleAllergy(name)} className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 ${selected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                            <span>{name}</span>
                            <span className={`inline-block w-3 h-3 rounded-full border ${selected ? 'bg-blue-500 border-blue-500' : 'border-gray-400'}`}></span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedAllergies.length > 0 && (
                      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex flex-wrap gap-2">
                          {selectedAllergies.map((a) => (
                            <span key={a} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                              {a}
                              <button type="button" onClick={() => toggleAllergy(a)} className="ml-1 text-blue-700 dark:text-blue-200">×</button>
                            </span>
                          ))}
                        </div>
                        <div className="mt-2">
                          <button type="button" onClick={clearAllergies} className="text-xs text-gray-600 dark:text-gray-300 underline">Clear selection</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {validationErrors.allergies && (
                    <p className="text-red-500 text-sm mt-1 flex items-center"><AlertTriangle size={14} className="mr-1" />{validationErrors.allergies}</p>
                  )}
                  <p className="text-sm opacity-75">Select one or more allergens, or choose "No known allergies".</p>
                </div>
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