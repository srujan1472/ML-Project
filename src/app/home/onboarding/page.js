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
  Camera,
  AlertTriangle,
  CheckCircle,
  Save,
  UserCheck
} from 'lucide-react';

const OnboardingPage = () => {
  // Form state
  const [formData, setFormData] = useState({
    age: '',
    height: '',
    weight: '',
    allergies: ''
  });
  
  // User data (simulated)
  const [userData, setUserData] = useState({
    email: 'john.doe@example.com',
    fullName: 'John Doe'
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  
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
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful submission
      alert('Profile completed successfully! Redirecting to dashboard...');
      console.log('Form submitted:', { ...formData, ...userData });
      
    } catch (error) {
      alert('An error occurred. Please try again.');
      console.error('Submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Handle sidebar item click
  const handleSidebarItemClick = (item) => {
    setSidebarOpen(false);
    console.log('Navigate to:', item);
  };
  
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-gray-900'
    }`}>
      {/* Navbar */}
      <nav className={`sticky top-0 z-30 border-b backdrop-blur-md ${
        darkMode 
          ? 'bg-gray-800/90 border-gray-700' 
          : 'bg-white/90 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button 
                onClick={toggleSidebar}
                data-testid="menu-button"
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'hover:bg-gray-700 text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Menu size={24} />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <UserCheck className="text-white" size={18} />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Profile Setup
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-full transition-colors ${
                  darkMode 
                    ? 'hover:bg-gray-700 text-yellow-400' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white">
                  <User size={18} />
                </div>
                <span className="font-medium hidden sm:block">{userData.fullName}</span>
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Sidebar */}
      <div className="relative">
        {/* Sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm"
            onClick={toggleSidebar}
          ></div>
        )}
        
        {/* Sidebar content */}
        <div 
          ref={sidebarRef}
          className={`fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } border-r ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          } shadow-2xl`}
        >
          <div className={`flex items-center justify-between p-6 border-b ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <UserCheck className="text-white" size={18} />
              </div>
              <h2 className="text-lg font-semibold">Navigation</h2>
            </div>
            <button
              onClick={toggleSidebar}
              className={`p-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'hover:bg-gray-700 text-gray-400' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6">
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => handleSidebarItemClick('dashboard')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                    darkMode 
                      ? 'hover:bg-gray-700 text-gray-300' 
                      : 'hover:bg-blue-50 hover:text-blue-700'
                  } group`}
                >
                  <Home size={20} className="group-hover:scale-110 transition-transform" />
                  <span className="font-medium">Dashboard</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleSidebarItemClick('scanner')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                    darkMode 
                      ? 'hover:bg-gray-700 text-gray-300' 
                      : 'hover:bg-blue-50 hover:text-blue-700'
                  } group`}
                >
                  <Camera size={20} className="group-hover:scale-110 transition-transform" />
                  <span className="font-medium">Scanner</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleSidebarItemClick('onboarding')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg`}
                >
                  <BarChart3 size={20} />
                  <span className="font-medium">Onboarding</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => handleSidebarItemClick('settings')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                    darkMode 
                      ? 'hover:bg-gray-700 text-gray-300' 
                      : 'hover:bg-blue-50 hover:text-blue-700'
                  } group`}
                >
                  <Settings size={20} className="group-hover:scale-110 transition-transform" />
                  <span className="font-medium">Settings</span>
                </button>
              </li>
            </ul>
            
            {/* App Info */}
            <div className={`mt-8 p-4 rounded-xl ${
              darkMode 
                ? 'bg-gradient-to-r from-gray-700 to-gray-600' 
                : 'bg-gradient-to-r from-blue-50 to-purple-50'
            } border ${
              darkMode ? 'border-gray-600' : 'border-blue-100'
            }`}>
              <h3 className="font-semibold mb-2 text-sm">Health Scanner App</h3>
              <p className="text-xs opacity-75 mb-1">Version 1.0.0</p>
              <p className="text-xs opacity-75">© 2024 HealthTech Inc.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6">
            <UserCheck className="text-white" size={32} />
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Complete Your Profile
          </h1>
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'} max-w-2xl mx-auto`}>
            We need some information to personalize your health analysis and provide better recommendations
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information Section */}
          <div className={`p-8 rounded-2xl shadow-xl backdrop-blur-sm border ${
            darkMode 
              ? 'bg-gray-800/50 border-gray-700' 
              : 'bg-white/80 border-gray-200'
          }`}>
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <User className="text-white" size={18} />
              </div>
              Personal Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name</label>
                <input
                  type="text"
                  value={userData.fullName}
                  disabled
                  className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-400' 
                      : 'bg-gray-50 border-gray-300 text-gray-500'
                  } cursor-not-allowed`}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <input
                  type="email"
                  value={userData.email}
                  disabled
                  className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-400' 
                      : 'bg-gray-50 border-gray-300 text-gray-500'
                  } cursor-not-allowed`}
                />
              </div>
            </div>
          </div>
          
          {/* Health Information Section */}
          <div className={`p-8 rounded-2xl shadow-xl backdrop-blur-sm border ${
            darkMode 
              ? 'bg-gray-800/50 border-gray-700' 
              : 'bg-white/80 border-gray-200'
          }`}>
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                <BarChart3 className="text-white" size={18} />
              </div>
              Health Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Age <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="Enter your age"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                  className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                  className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
          
          {/* Dietary Information Section */}
          <div className={`p-8 rounded-2xl shadow-xl backdrop-blur-sm border ${
            darkMode 
              ? 'bg-gray-800/50 border-gray-700' 
              : 'bg-white/80 border-gray-200'
          }`}>
            <h2 className="text-2xl font-semibold mb-6 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center mr-3">
                <AlertTriangle className="text-white" size={18} />
              </div>
              Dietary Information
            </h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Food Allergies <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="List any food allergies or dietary restrictions (or type 'None' if you have no allergies)"
                value={formData.allergies}
                onChange={(e) => handleInputChange('allergies', e.target.value)}
                rows={4}
                className={`w-full px-4 py-3 rounded-xl border transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
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
              <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                This information helps us provide personalized health analysis for scanned products.
              </p>
            </div>
          </div>
          
          {/* Submit Button */}
          <div className="flex flex-col items-center space-y-4">
            <button
              type="submit"
              disabled={isLoading}
              className={`px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 transform ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl'
              } text-white min-w-64`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Saving Profile...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Save size={20} />
                  <span>Complete Profile</span>
                </div>
              )}
            </button>
            
            <p className={`text-sm text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              All fields marked with <span className="text-red-500 font-bold">*</span> are required
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OnboardingPage;