'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, loading, router]);

  if (loading) return null;

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="dashboard-card text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Přístup odepřen</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Tato sekce je přístupná pouze administrátorům</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
