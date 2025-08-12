"use client"

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    const maybeRedirect = async () => {
      if (loading || user || hasRedirectedRef.current) return;
      // Double check session to avoid redirect race after fresh login
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        hasRedirectedRef.current = true;
        router.replace('/unauthorized');
      }
    };
    maybeRedirect();
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If we're redirecting due to no user, render nothing to avoid flicker
  if (!user) return null;

  return children;
}