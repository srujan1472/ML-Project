"use client"

import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  X,
  User,
  Settings,
  Home,
  BarChart3,
  Moon,
  Sun,
  AlertTriangle,
  Save,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

const OnboardingPage = () => {
  // Auth
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || 'User';
  const userEmail = user?.email || 'user@example.com';

  // Form state
  const [formData, setFormData] = useState({
    age: '',
    height: '',
    weight: '',
    allergies: '',
  });

  const [validationErrors, setValidationErrors] = useState({});

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Refs
  const sidebarRef = useRef(null);

  // Handle clicks outside sidebar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target) && sidebarOpen) {
        const menuButton = document.querySelector('[data-testid="menu-button"]');
        if (menuButton && !menuButton.contains(event.target)) {
          setSidebarOpen(false);
        }
      }
    };

    if (sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [sidebarOpen]);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (validationErrors[field]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!formData.age || parseInt(formData.age) < 1 || parseInt(formData.age) > 120) {
      errors.age = 'Please enter a valid age between 1-120';
    }

    if (!formData.height || parseFloat(formData.height) < 50 || parseFloat(formData.height) > 300) {
      errors.height = 'Please enter a valid height between 50-300 cm';
    }

    if (!formData.weight || parseFloat(formData.weight) < 10 || parseFloat(formData.weight) > 500) {
      errors.weight = 'Please enter a valid weight between 10-500 kg';
    }

    if (!formData.allergies.trim()) {
      errors.allergies = 'Please specify allergies or type "None"';
    }

    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      alert('Profile completed successfully!');
      // Submit payload can include auth info if needed
      // console.log('Form submitted:', { ...formData, name: userName, email: userEmail });
    } catch (error) {
      alert('An error occurred. Please try again.');
      // console.error('Submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sidebar controls
  const toggleSidebar = () => setSidebarOpen((s) => !s);
  const handleSidebarItemClick = () => setSidebarOpen(false);

  return (
    <ProtectedRoute>
      <div
        className={`min-h-screen transition-colors duration-300 ${
          darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
        }`}
      >
        {/* Navbar (aligned with home page) */}
        <nav
          className={`border-b px-4 py-3 ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleSidebar}
                data-testid="menu-button"
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <Menu size={24} />
              </button>
              <h1 className="text-xl font-semibold">Scanner App</h1>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  <User size={18} />
                </div>
                <span className="font-medium">{userName}</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Sidebar (aligned with home page) */}
        <div className="relative">
          {sidebarOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={toggleSidebar}></div>
          )}

          <div
            ref={sidebarRef}
            className={`${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } fixed inset-y-0 left-0 z-50 w-80 ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            } border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} transform transition-transform duration-300 ease-in-out`}
          >
            <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className="text-lg font-semibold">Navigation</h2>
              <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={handleSidebarItemClick}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Home size={20} />
                    <span>Dashboard</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={handleSidebarItemClick}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <BarChart3 size={20} />
                    <span>Onboarding</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={handleSidebarItemClick}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Settings size={20} />
                    <span>Settings</span>
                  </button>
                </li>
              </ul>

              <div className={`mt-8 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h3 className="font-medium mb-2">Scanner App</h3>
                <p className="text-sm opacity-75">Version 1.0.0</p>
                <p className="text-sm opacity-75">© 2024 Scanner Inc.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Complete Your Profile</h2>
              <p className="opacity-75">Provide a few details to personalize your health analysis.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information */}
              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <User className="mr-2 text-blue-500" size={18} /> Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name</label>
                    <input
                      type="text"
                      value={userName}
                      disabled
                      className={`w-full px-3 py-2 rounded border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-50 border-gray-300 text-gray-500'
                      } cursor-not-allowed`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email Address</label>
                    <input
                      type="email"
                      value={userEmail}
                      disabled
                      className={`w-full px-3 py-2 rounded border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-50 border-gray-300 text-gray-500'
                      } cursor-not-allowed`}
                    />
                  </div>
                </div>
              </div>

              {/* Health Information */}
              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <BarChart3 className="mr-2 text-green-500" size={18} /> Health Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Age <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Enter your age"
                      value={formData.age}
                      onChange={(e) => handleInputChange('age', e.target.value)}
                      className={`w-full px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.age
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : darkMode
                          ? 'bg-gray-700 border-gray-600'
                          : 'bg-white border-gray-300'
                      }`}
                    />
                    {validationErrors.age && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <AlertTriangle size={14} className="mr-1" />
                        {validationErrors.age}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Height (cm) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Enter height in cm"
                      value={formData.height}
                      onChange={(e) => handleInputChange('height', e.target.value)}
                      className={`w-full px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.height
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : darkMode
                          ? 'bg-gray-700 border-gray-600'
                          : 'bg-white border-gray-300'
                      }`}
                    />
                    {validationErrors.height && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <AlertTriangle size={14} className="mr-1" />
                        {validationErrors.height}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Weight (kg) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Enter weight in kg"
                      value={formData.weight}
                      onChange={(e) => handleInputChange('weight', e.target.value)}
                      className={`w-full px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.weight
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : darkMode
                          ? 'bg-gray-700 border-gray-600'
                          : 'bg-white border-gray-300'
                      }`}
                    />
                    {validationErrors.weight && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <AlertTriangle size={14} className="mr-1" />
                        {validationErrors.weight}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Dietary Information */}
              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <AlertTriangle className="mr-2 text-orange-500" size={18} /> Dietary Information
                </h3>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Food Allergies <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    placeholder="List any food allergies or type 'None'"
                    value={formData.allergies}
                    onChange={(e) => handleInputChange('allergies', e.target.value)}
                    rows={4}
                    className={`w-full px-3 py-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                      validationErrors.allergies
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : darkMode
                        ? 'bg-gray-700 border-gray-600'
                        : 'bg-white border-gray-300'
                    }`}
                  />
                  {validationErrors.allergies && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertTriangle size={14} className="mr-1" />
                      {validationErrors.allergies}
                    </p>
                  )}
                  <p className="text-sm mt-2 opacity-75">
                    This helps us tailor health analysis for scanned products.
                  </p>
                </div>
              </div>

              {/* Submit */}
              <div className="flex flex-col items-center space-y-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex items-center justify-center px-4 py-2 rounded-lg text-white ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 transition-colors'
                  } min-w-64`}
                >
                  {isLoading ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Save size={18} className="mr-2" /> Complete Profile
                    </>
                  )}
                </button>
                <p className="text-sm opacity-75">
                  All fields marked with <span className="text-red-500 font-bold">*</span> are required
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default OnboardingPage;