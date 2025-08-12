"use client"

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    const maybeRedirect = async () => {
      if (loading || hasRedirectedRef.current) return;

      // Not authenticated -> go unauthorized
      if (!user) {
        // Double check session to avoid race
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
          hasRedirectedRef.current = true;
          router.replace('/unauthorized');
          return;
        }
      }

      // Authenticated: if onboarding not completed, redirect to onboarding (unless already there)
      if (user && pathname !== '/home/onboarding') {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();
        if (!error && (!data || data.onboarding_completed !== true)) {
          hasRedirectedRef.current = true;
          router.replace('/home/onboarding');
          return;
        }
      }
    };
    maybeRedirect();
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return null;

  return children;
}