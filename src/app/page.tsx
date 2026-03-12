'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-blue-200 rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: '#1765F2' }} />
        <p className="text-sm text-slate-400 font-medium">Přesměrování...</p>
      </div>
    </div>
  );
}
