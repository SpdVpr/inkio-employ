'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, updateUserRole } from '@/lib/auth';
import { Users, Building2, BarChart3, ClipboardList, Crown } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { userProfile } = useAuth();
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((doc) => users.push(doc.data() as UserProfile));
      setAllUsers(users);
    });
    return () => unsubscribe();
  }, []);

  const adminCards = [
    { label: 'Zaměstnanci', href: '/admin/employees', icon: <Users size={24} />, count: allUsers.length, color: 'from-blue-500 to-cyan-500' },
    { label: 'Firmy', href: '/admin/companies', icon: <Building2 size={24} />, count: 0, color: 'from-emerald-500 to-teal-500' },
    { label: 'Statistiky', href: '/admin/statistics', icon: <BarChart3 size={24} />, count: null, color: 'from-blue-500 to-purple-500' },
    { label: 'Firmy - přehled', href: '/admin/company-stats', icon: <Building2 size={24} />, count: null, color: 'from-pink-500 to-rose-500' },
    { label: 'Plán úkolů', href: '/admin/tasks', icon: <ClipboardList size={24} />, count: null, color: 'from-orange-500 to-amber-500' },
  ];

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Administrace</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Správa systému Inkio CRM</p>
      </div>

      {/* Quick cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {adminCards.map((card) => (
          <Link key={card.href} href={card.href} className="dashboard-card group">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
              {card.icon}
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{card.label}</h3>
            {card.count !== null && (
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{card.count}</p>
            )}
          </Link>
        ))}
      </div>

      {/* Registered users */}
      <div className="dashboard-card">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
          Registrovaní uživatelé ({allUsers.length})
        </h3>
        <div className="space-y-2">
          {allUsers.map((u) => (
            <div key={u.uid} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                  {u.displayName?.charAt(0) || '?'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{u.displayName}</span>
                    {u.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-[10px] font-bold">
                        <Crown size={10} /> Admin
                      </span>
                    )}
                    {u.isOnline && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{u.email}</span>
                </div>
              </div>
              {u.uid !== userProfile?.uid && (
                <button
                  onClick={() => updateUserRole(u.uid, u.role === 'admin' ? 'employee' : 'admin')}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  {u.role === 'admin' ? 'Odebrat admin' : 'Nastavit admin'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
