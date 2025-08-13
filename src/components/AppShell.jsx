"use client"

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, User, Home, BarChart3, Moon, Sun, Laptop2, LogOut, Camera, UserRound } from 'lucide-react';

export default function AppShell({ children, title = 'Scanner App' }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const sidebarRef = useRef(null);
  const themeMenuRef = useRef(null);

  // Fetch profile name from Supabase (profiles.id as PK), with fallback
  useEffect(() => {
    let isCancelled = false;
    const fetchProfileName = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
        if (!isCancelled && data?.full_name) {
          setProfileName(data.full_name);
          return;
        }
        if (!isCancelled) {
          const metaName = user?.user_metadata?.full_name || '';
          const fallback = metaName || (user?.email ? user.email.split('@')[0] : 'User');
          setProfileName(fallback);
        }
      } catch {
        if (!isCancelled) {
          const metaName = user?.user_metadata?.full_name || '';
          const fallback = metaName || (user?.email ? user.email.split('@')[0] : 'User');
          setProfileName(fallback);
        }
      }
    };
    fetchProfileName();
    return () => {
      isCancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target) && sidebarOpen) {
        const menuButton = document.querySelector('[data-testid="menu-button"]');
        if (menuButton && !menuButton.contains(event.target)) {
          setSidebarOpen(false);
        }
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target) && themeMenuOpen) {
        setThemeMenuOpen(false);
      }
    };
    if (sidebarOpen || themeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [sidebarOpen, themeMenuOpen]);

  const handleLogout = async () => {
    try {
      // Revoke and clear the current session
      await supabase.auth.signOut({ scope: 'global' });

      // Clear app-local data that might persist user context
      try {
        localStorage.removeItem('onboardingData');
      } catch {}
      try {
        sessionStorage.removeItem('lastProduct');
      } catch {}
      try {
        sessionStorage.removeItem('lastWarnings');
      } catch {}

      // Navigate to login and force a reload to ensure full state reset
      router.replace('/login');
      router.refresh();
      setTimeout(() => {
        if (typeof window !== 'undefined') window.location.reload();
      }, 50);
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  const navigate = (to) => {
    setSidebarOpen(false);
    router.push(to);
  };

  const themeIcon = theme === 'system' ? <Laptop2 size={20} /> : isDark ? <Moon size={20} /> : <Sun size={20} />;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Top Navbar */}
      <nav className={`border-b px-4 py-3 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              data-testid="menu-button"
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>

          <div className="flex items-center space-x-3 relative" ref={themeMenuRef}>
            <button
              onClick={() => setThemeMenuOpen((v) => !v)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Theme"
            >
              {themeIcon}
            </button>
            {themeMenuOpen && (
              <div className={`absolute right-0 top-10 z-50 w-40 rounded-md shadow-lg ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                <button onClick={() => { setTheme('light'); setThemeMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                  <Sun size={16} /> Light
                </button>
                <button onClick={() => { setTheme('dark'); setThemeMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                  <Moon size={16} /> Dark
                </button>
                <button onClick={() => { setTheme('system'); setThemeMenuOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                  <Laptop2 size={16} /> System
                </button>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-red-100 text-red-600 flex items-center"
              title="Logout"
            >
              <LogOut size={18} />
              <span className="ml-2 hidden sm:inline">Logout</span>
            </button>
            <div className="flex items-center space-x-2 max-w-[180px]">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                <User size={18} />
              </div>
              <span className="font-medium truncate">{profileName || 'User'}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-80 ${isDark ? 'bg-gray-800' : 'bg-white'} border-r ${isDark ? 'border-gray-700' : 'border-gray-200'} transform transition-transform duration-300 ease-in-out`}
      >
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className="text-lg font-semibold">Navigation</h2>
          <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => navigate('/home')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${pathname === '/home' ? (isDark ? 'bg-gray-700' : 'bg-gray-100') : ''}`}
              >
                <Home size={20} />
                <span>Dashboard</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('/home')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <Camera size={20} />
                <span>Scanner</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('/home/onboarding')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${pathname === '/home/onboarding' ? (isDark ? 'bg-gray-700' : 'bg-gray-100') : ''}`}
              >
                <BarChart3 size={20} />
                <span>Onboarding</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('/home/profile')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${pathname === '/home/profile' ? (isDark ? 'bg-gray-700' : 'bg-gray-100') : ''}`}
              >
                <UserRound size={20} />
                <span>Profile</span>
              </button>
            </li>
          </ul>
          <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-100'} mt-8 p-4 rounded-lg`}>
            <h3 className="font-medium mb-2">Scanner App</h3>
            <p className="text-sm opacity-75">Version 1.0.0</p>
            <p className="text-sm opacity-75">© 2024 Scanner Inc.</p>
          </div>
        </div>
      </div>

      {/* Page content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}


