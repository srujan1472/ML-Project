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
          setUser(session.user);
          
          // Check if session is about to expire (within 5 minutes)
          const expiresAt = session.expires_at * 1000; // Convert to milliseconds
          const now = Date.now();
          const fiveMinutes = 5 * 60 * 1000;
          
          if (expiresAt - now < fiveMinutes) {
            console.log('Session expiring soon, refreshing...');
            try {
              const { data, error } = await supabase.auth.refreshSession();
              if (error) {
                console.error('Error refreshing session:', error);
                setUser(null);
              } else if (data.session) {
                setUser(data.session.user);
              }
            } catch (refreshError) {
              console.error('Session refresh failed:', refreshError);
              setUser(null);
            }
          }
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
          console.log('Auth state change:', event, session ? 'session exists' : 'no session');
          
          if (session && session.user) {
            setUser(session.user);
          } else {
            setUser(null);
            // Clear all local data when session is lost
            try { 
              localStorage.clear(); 
              sessionStorage.clear(); 
            } catch {}
            
            // If we're on a protected page and session is lost, redirect to login
            const protectedPages = ['/home', '/products', '/analysis', '/home/onboarding', '/home/profile'];
            if (protectedPages.some(page => pathname.startsWith(page))) {
              router.replace('/login');
            }
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
          setUser(null);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Periodic session check to prevent expiration issues
  useEffect(() => {
    if (!user) return;

    const sessionCheckInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('Session lost during periodic check');
          setUser(null);
          router.replace('/login');
        }
      } catch (error) {
        console.error('Error in periodic session check:', error);
      }
    }, 60000); // Check every minute

    return () => clearInterval(sessionCheckInterval);
  }, [user, router]);

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