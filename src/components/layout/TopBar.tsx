'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useChatNotificationContext } from '@/contexts/ChatNotificationContext';
import NotificationBell from '@/components/NotificationBell';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/chat': 'Chat',
  '/profile': 'Můj profil',
  '/admin': 'Admin panel',
  '/admin/employees': 'Zaměstnanci',
  '/admin/companies': 'Firmy',
  '/admin/statistics': 'Statistiky',
  '/admin/company-stats': 'Firmy - přehled',
  '/admin/tasks': 'Plánování úkolů',
};

export default function TopBar() {
  const { userProfile } = useAuth();
  const pathname = usePathname();
  const { totalUnread } = useChatNotificationContext();

  const title = PAGE_TITLES[pathname] || 'Inkio CRM';

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Chat shortcut */}
          <Link
            href="/chat"
            className="topbar-btn relative"
            title="Chat"
          >
            <MessageSquare size={18} />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </Link>

          {/* Notifications */}
          <NotificationBell />

          {/* User avatar */}
          {userProfile && (
            <Link href="/profile" className="flex items-center gap-2 ml-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {userProfile.photoURL ? (
                  <img src={userProfile.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  userProfile.displayName?.charAt(0) || '?'
                )}
              </div>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
