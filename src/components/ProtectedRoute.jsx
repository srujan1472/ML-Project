"use client"

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    const performRedirects = async () => {
      // Not authenticated -> redirect based on context
      if (!user) {
        let shouldGoLogin = false;
        try {
          const ts = Number(sessionStorage.getItem('recentLogout') || '0');
          if (ts && Date.now() - ts < 30_000) {
            shouldGoLogin = true;
            sessionStorage.removeItem('recentLogout');
          }
        } catch {}
        router.replace(shouldGoLogin ? '/login' : '/unauthorized');
        return;
      }

      // Authenticated: ensure onboarding is completed
      if (pathname !== '/home/onboarding') {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();
        if (!error && (!data || data.onboarding_completed !== true)) {
          router.replace('/home/onboarding');
          return;
        }
      }
    };

    performRedirects();
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