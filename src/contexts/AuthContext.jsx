"use client"

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    // Check active session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: { user } } = await supabase.auth.getUser();
          setUser(user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking auth session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (session) {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
          } else {
            setUser(null);
            try { localStorage.removeItem('onboardingData'); } catch {}
            try { sessionStorage.removeItem('lastProduct'); } catch {}
            try { sessionStorage.removeItem('lastWarnings'); } catch {}
          }
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Post-auth navigation smoothing: when user becomes available on login pages, go to /home
  useEffect(() => {
    if (loading) return;
    if (hasNavigatedRef.current) return;

    const onLoginPage = pathname === '/' || pathname === '/login';
    if (user && onLoginPage) {
      hasNavigatedRef.current = true;
      router.replace('/home');
      router.refresh();
    }
  }, [user, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}