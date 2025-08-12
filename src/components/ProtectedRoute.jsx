"use client"

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (!loading && !user && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      router.replace('/login');
    }
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