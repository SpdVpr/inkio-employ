'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import ChatWidget from '@/components/ChatWidget';
import { ChatNotificationProvider, useChatNotificationContext } from '@/contexts/ChatNotificationContext';
import ChatNotificationToast from '@/components/ChatNotificationToast';

function AppLayoutInner({ children }: { children: ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { incomingMessage, dismissToast, totalUnread } = useChatNotificationContext();

  // Update browser tab title with unread count
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) Inkio CRM` : 'Inkio CRM';
  }, [totalUnread]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Force unpaired users to pair-account page (except admins and the pair-account page itself)
  useEffect(() => {
    if (!loading && user && userProfile && pathname !== '/pair-account') {
      const isPaired = userProfile.pairedEmployeeId && userProfile.pairedEmployeeId !== '';
      const isAdmin = userProfile.role === 'admin';
      if (!isPaired && !isAdmin) {
        router.push('/pair-account');
      }
    }
  }, [user, userProfile, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0a0f]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-blue-200 dark:border-blue-900 rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: '#1765F2' }} />
          <p className="text-sm text-slate-400 font-medium">Načítání...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // If on pair-account page, render without sidebar/topbar
  if (pathname === '/pair-account') {
    return <>{children}</>;
  }

  // Pages that need full width (e.g. calendar with many columns)
  const fullWidth = pathname === '/dashboard';

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main className={`app-content ${fullWidth ? 'app-content-full' : ''}`}>
          {children}
        </main>
      </div>
      <ChatWidget />
      {/* Don't show toast when user is already on the chat page */}
      {pathname !== '/chat' && (
        <ChatNotificationToast message={incomingMessage} onDismiss={dismissToast} />
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ChatNotificationProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </ChatNotificationProvider>
  );
}
