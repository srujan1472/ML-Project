"use client"

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

// Custom Food Scanner Icon Component
const FoodScannerIcon = ({ size = 80, isDark = false }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
  }, []);

  const ringColor = isDark ? '#ffffff' : '#0a7ea4';
  const iconBgColor = isDark ? '#ffffff' : '#0a7ea4';
  const iconColor = isDark ? '#000000' : '#ffffff';
  const scanLineColor = isDark ? '#ffffff' : '#0a7ea4';

  return (
    <div 
      className={`relative flex items-center justify-center transition-all duration-2000 ease-out ${
        isAnimating ? 'rotate-360 scale-100' : 'rotate-0 scale-75'
      }`}
      style={{ width: size, height: size }}
    >
      {/* Outer scanning ring */}
      <div
        className={`absolute border-2 rounded-full animate-pulse ${
          isDark ? 'border-white opacity-60' : 'border-blue-600 opacity-30'
        }`}
        style={{
          width: size,
          height: size,
          animation: 'pulse-ring 2s ease-out infinite alternate',
        }}
      />

      {/* Inner food icon */}
      <div
        className={`flex items-center justify-center rounded-full shadow-lg transition-all duration-500 delay-500 ${
          isAnimating ? 'scale-100' : 'scale-0'
        }`}
        style={{
          backgroundColor: iconBgColor,
          width: size * 0.6,
          height: size * 0.6,
          padding: size / 10,
        }}
      >
        <svg
          width={size / 2.5}
          height={size / 2.5}
          viewBox="0 0 24 24"
          fill="none"
          stroke={iconColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12V7a5 5 0 0 1 10 0v5" />
          <rect x="3" y="12" width="18" height="8" rx="2" />
          <path d="M8 12v2" />
          <path d="M12 12v2" />
          <path d="M16 12v2" />
        </svg>
      </div>

      {/* Scanning line */}
      <div
        className={`absolute w-4/5 h-0.5 opacity-80 shadow-lg ${
          isDark ? 'bg-white shadow-white' : 'bg-blue-600 shadow-blue-600'
        }`}
        style={{
          animation: 'scan-line 1.5s linear infinite alternate 1s',
        }}
      />
    </div>
  );
};

// Floating particles component
const FloatingParticle = ({ delay = 0, x = 0, y = 0, isDark = false }) => {
  return (
    <div
      className={`absolute w-1.5 h-1.5 rounded-full ${
        isDark ? 'bg-white opacity-70' : 'bg-blue-600'
      }`}
      style={{
        left: x,
        top: y,
        animation: `float-particle 3s ease-out infinite ${delay}ms`,
      }}
    />
  );
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');

  const passwordRef = useRef(null);
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    setMounted(true);
    const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(darkMode);
  }, []);

  // If already authenticated, skip login
  useEffect(() => {
    if (!loading && user) {
      router.replace('/home');
    }
  }, [user, loading, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) {
        throw signInError;
      }
      
      router.replace('/home');
      
    } catch (error) {
      setError(error.message || 'An unexpected error occurred. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToSignup = () => {
    router.push('/signup');
  };

  const navigateToForgotPassword = () => {
    router.push('/forgot-password');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <>
      <Head>
        <title>Food Scanner - Login</title>
        <meta name="description" content="Scan. Check. Eat Safe." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div className={`min-h-screen relative overflow-hidden ${
        isDark 
          ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
          : 'bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50'
      }`}>
        
        {/* Floating particles background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <FloatingParticle
              key={i}
              delay={i * 400}
              x={Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200)}
              y={Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800)}
              isDark={isDark}
            />
          ))}
        </div>

        {/* Main content */}
        <div className="flex items-center justify-center min-h-screen p-4 relative z-10">
          <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl">
            <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-8 lg:gap-16">
              
              {/* Left side - Branding (hidden on mobile) */}
              <div className="hidden lg:flex flex-col items-center lg:items-start text-center lg:text-left lg:flex-1">
                <div className="animate-fade-in-up">
                  <FoodScannerIcon size={120} isDark={isDark} />
                </div>
                <h1 className={`text-4xl xl:text-6xl font-bold mb-4 animate-fade-in-up animation-delay-200 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Food Scanner
                </h1>
                <p className={`text-xl xl:text-2xl mb-8 animate-fade-in-up animation-delay-400 ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Scan. Check. Eat Safe.
                </p>
                <div className={`text-lg animate-fade-in-up animation-delay-600 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <p>✓ Instant nutritional analysis</p>
                  <p>✓ Allergen detection</p>
                  <p>✓ Health recommendations</p>
                </div>
              </div>

              {/* Right side - Login form */}
              <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl lg:flex-1">
                <div className={`backdrop-blur-sm rounded-3xl p-8 sm:p-10 shadow-2xl border animate-fade-in-up animation-delay-800 ${
                  isDark 
                    ? 'bg-gray-800/80 border-gray-700/50' 
                    : 'bg-white/90 border-white/20'
                }`}>
                  
                  {/* Mobile logo */}
                  <div className="lg:hidden flex flex-col items-center mb-8">
                    <FoodScannerIcon size={80} isDark={isDark} />
                    <h1 className={`text-3xl font-bold mb-2 mt-4 ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      Food Scanner
                    </h1>
                    <p className={`text-lg ${
                      isDark ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      Scan. Check. Eat Safe.
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                      <div className={`p-3 rounded-lg text-sm ${isDark ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-600'}`}>
                        {error}
                      </div>
                    )}
                    
                    {/* Email input */}
                    <div className="relative">
                      <div className={`flex items-center rounded-2xl transition-all duration-200 ${
                        emailFocused 
                          ? `ring-2 ring-blue-500 scale-102 ${isDark ? 'bg-gray-700/80' : 'bg-white'}` 
                          : `${isDark ? 'bg-gray-700/60' : 'bg-gray-50'}`
                      }`}>
                        <div className={`p-4 transition-transform duration-200 ${
                          emailFocused ? 'scale-110' : 'scale-100'
                        }`}>
                          <svg
                            className={`w-5 h-5 ${
                              emailFocused 
                                ? 'text-blue-500' 
                                : isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email"
                          className={`flex-1 px-4 py-4 bg-transparent text-base font-medium focus:outline-none ${
                            isDark ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
                          }`}
                          onFocus={() => setEmailFocused(true)}
                          onBlur={() => setEmailFocused(false)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              passwordRef.current?.focus();
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Password input */}
                    <div className="relative">
                      <div className={`flex items-center rounded-2xl transition-all duration-200 ${
                        passwordFocused 
                          ? `ring-2 ring-blue-500 scale-102 ${isDark ? 'bg-gray-700/80' : 'bg-white'}` 
                          : `${isDark ? 'bg-gray-700/60' : 'bg-gray-50'}`
                      }`}>
                        <div className={`p-4 transition-transform duration-200 ${
                          passwordFocused ? 'scale-110' : 'scale-100'
                        }`}>
                          <svg
                            className={`w-5 h-5 ${
                              passwordFocused 
                                ? 'text-blue-500' 
                                : isDark ? 'text-gray-400' : 'text-gray-600'
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <input
                          ref={passwordRef}
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password"
                          className={`flex-1 px-4 py-4 bg-transparent text-base font-medium focus:outline-none ${
                            isDark ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
                          }`}
                          onFocus={() => setPasswordFocused(true)}
                          onBlur={() => setPasswordFocused(false)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-4 hover:scale-110 transition-transform duration-200"
                        >
                          <svg
                            className={`w-5 h-5 transition-transform duration-200 ${
                              showPassword ? 'rotate-180' : 'rotate-0'
                            } ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            {showPassword ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464m1.414 1.414L8.464 8.464m5.656 5.656l1.415 1.415m-1.415-1.415l-2.829-2.829m0 0a3 3 0 01-4.243-4.243m4.243 4.243L8.464 8.464" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.275 4.057-5.065 7-9.543 7-4.477 0-8.268-2.943-9.542-7z" />
                            )}
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Forgot password */}
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => router.push('/forgot-password')}
                        className={`text-sm font-medium hover:underline transition-colors duration-200 ${
                          isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Forgot Password?
                      </button>
                    </div>

                    {/* Login button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full rounded-2xl py-4 px-6 font-bold text-base transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl ${
                        isLoading 
                          ? 'opacity-80 cursor-not-allowed' 
                          : 'hover:shadow-blue-500/25'
                      } ${
                        isDark 
                          ? 'bg-gradient-to-r from-white to-gray-100 text-black hover:from-gray-100 hover:to-white' 
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                      }`}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-3"></div>
                          Logging in...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                          </svg>
                          Login
                        </div>
                      )}
                    </button>

                    {/* Sign up link */}
                    <div className="text-center pt-4">
                      <span className={`text-base font-medium ${
                        isDark ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        Don't have an account?{' '}
                      </span>
                      <button
                        type="button"
                        onClick={() => router.push('/signup')}
                        className={`font-bold text-base hover:underline transition-colors duration-200 ${
                          isDark ? 'text-white hover:text-gray-200' : 'text-blue-600 hover:text-blue-700'
                        }`}
                      >
                        Sign Up
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.6; }
            100% { transform: scale(1.2); opacity: 0.2; }
          }
          @keyframes scan-line {
            0% { transform: translateY(-40px); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateY(40px); opacity: 0; }
          }
          @keyframes float-particle {
            0% { transform: translateY(100px) translateX(0px); opacity: 0; transform: scale(0); }
            50% { opacity: 0.6; transform: scale(1); }
            100% { transform: translateY(-100px) translateX(25px); opacity: 0; transform: scale(0); }
          }
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(50px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
          .animation-delay-200 { animation-delay: 200ms; }
          .animation-delay-400 { animation-delay: 400ms; }
          .animation-delay-600 { animation-delay: 600ms; }
          .animation-delay-800 { animation-delay: 800ms; }
          .rotate-360 { transform: rotate(360deg); }
          .scale-102 { transform: scale(1.02); }
        `}</style>
      </div>
    </>
  );
}