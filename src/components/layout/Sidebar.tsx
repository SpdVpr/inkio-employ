'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { signOut, UserProfile } from '@/lib/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useChatNotificationContext } from '@/contexts/ChatNotificationContext';
import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  Users,
  Building2,
  ClipboardList,
  UserCircle,
  Settings,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Circle
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
  { label: 'Chat', href: '/chat', icon: <MessageSquare size={20} /> },
  { label: 'Profil', href: '/profile', icon: <UserCircle size={20} /> },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Zaměstnanci', href: '/admin/employees', icon: <Users size={20} />, adminOnly: true },
  { label: 'Firmy', href: '/admin/companies', icon: <Building2 size={20} />, adminOnly: true },
  { label: 'Statistiky', href: '/admin/statistics', icon: <BarChart3 size={20} />, adminOnly: true },
  { label: 'Firmy - přehled', href: '/admin/company-stats', icon: <Building2 size={20} />, adminOnly: true },
  { label: 'Plán úkolů', href: '/admin/tasks', icon: <ClipboardList size={20} />, adminOnly: true },
  { label: 'Nastavení', href: '/admin', icon: <Settings size={20} />, adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { userProfile, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<UserProfile[]>([]);
  const { totalUnread } = useChatNotificationContext();

  // Subscribe to online users
  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('isOnline', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((doc) => {
        users.push(doc.data() as UserProfile);
      });
      setOnlineUsers(users);
    }, (error) => {
      console.error('Error subscribing to online users:', error);
    });

    return () => unsubscribe();
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Persist collapsed state
  useEffect(() => {
    const stored = localStorage.getItem('inkio_sidebar_collapsed');
    if (stored === 'true') setCollapsed(true);
  }, []);

  const handleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('inkio_sidebar_collapsed', String(next));
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      className={`sidebar-nav-item ${isActive(item.href) ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`}
      title={collapsed ? item.label : undefined}
    >
      <span className="sidebar-nav-icon relative">
        {item.icon}
        {/* Mini badge on collapsed sidebar for Chat */}
        {collapsed && item.href === '/chat' && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </span>
      {!collapsed && <span className="sidebar-nav-label">{item.label}</span>}
      {!collapsed && item.href === '/chat' && totalUnread > 0 && (
        <span className="nav-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
      )}
    </Link>
  );

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={`sidebar-header ${collapsed ? 'justify-center' : ''}`}>
        <div className="sidebar-logo">
          <span className="text-sm font-black text-white">I</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate">Inkio CRM</h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Management systém</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(renderNavItem)}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className={`sidebar-section-label ${collapsed ? 'text-center' : ''}`}>
              {collapsed ? '—' : 'Administrace'}
            </div>
            {ADMIN_ITEMS.map(renderNavItem)}
          </>
        )}
      </nav>

      {/* Online users */}
      {!collapsed && onlineUsers.length > 0 && (
        <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-800">
          <div className="sidebar-section-label mb-2">
            Online ({onlineUsers.length})
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {onlineUsers.map((u) => (
              <div key={u.uid} className="flex items-center gap-2 px-2 py-1 rounded-lg">
                <div className="relative">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white text-[10px] font-bold">
                    {u.displayName?.charAt(0) || '?'}
                  </div>
                  <Circle size={8} className="absolute -bottom-0.5 -right-0.5 text-emerald-500 fill-emerald-500" />
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-300 truncate font-medium">{u.displayName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User profile + theme + collapse */}
      <div className="sidebar-footer">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="sidebar-footer-btn"
          title={theme === 'light' ? 'Tmavý režim' : 'Světlý režim'}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* User */}
        {!collapsed && userProfile && (
          <div className="flex-1 min-w-0 px-1">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
              {userProfile.displayName}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
              {userProfile.role === 'admin' ? 'Admin' : userProfile.position || 'Zaměstnanec'}
            </p>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={() => signOut()}
          className="sidebar-footer-btn text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          title="Odhlásit"
        >
          <LogOut size={16} />
        </button>

        {/* Collapse button (desktop only) */}
        <button
          onClick={handleCollapse}
          className="sidebar-footer-btn hidden lg:flex"
          title={collapsed ? 'Rozbalit' : 'Sbalit'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="sidebar-mobile-trigger lg:hidden"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - mobile */}
      <aside className={`sidebar-mobile lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <X size={20} />
        </button>
        {sidebarContent}
      </aside>

      {/* Sidebar - desktop */}
      <aside className={`sidebar-desktop hidden lg:flex ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {sidebarContent}
      </aside>
    </>
  );
}
