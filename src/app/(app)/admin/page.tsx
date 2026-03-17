'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, updateUserRole } from '@/lib/auth';
import { Users, Building2, BarChart3, ClipboardList, Crown, Shield, ShieldCheck } from 'lucide-react';
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
    { label: 'Zaměstnanci', href: '/admin/employees', icon: <Users size={22} />, count: allUsers.length, gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)' },
    { label: 'Firmy', href: '/admin/companies', icon: <Building2 size={22} />, count: 0, gradient: 'linear-gradient(135deg, #10b981, #14b8a6)' },
    { label: 'Statistiky', href: '/admin/statistics', icon: <BarChart3 size={22} />, count: null, gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
    { label: 'Firmy - přehled', href: '/admin/company-stats', icon: <Building2 size={22} />, count: null, gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)' },
    { label: 'Plán úkolů', href: '/admin/tasks', icon: <ClipboardList size={22} />, count: null, gradient: 'linear-gradient(135deg, #f97316, #f59e0b)' },
  ];

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg, #1765F2, #6366f1)' }}>
            <Shield size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Administrace</h1>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Správa systému Inkio CRM</p>
          </div>
        </div>
      </div>

      {/* Quick cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {adminCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-2xl p-4 transition-all duration-200 hover:-translate-y-1"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--card-shadow)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)';
              e.currentTarget.style.borderColor = 'var(--primary-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'var(--card-shadow)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-3 shadow-md group-hover:scale-110 transition-transform"
              style={{ background: card.gradient }}
            >
              {card.icon}
            </div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{card.label}</h3>
            {card.count !== null && (
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{card.count}</p>
            )}
          </Link>
        ))}
      </div>

      {/* Registered users */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={18} style={{ color: 'var(--primary)' }} />
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Registrovaní uživatelé ({allUsers.length})
          </h3>
        </div>
        <div className="space-y-2">
          {allUsers.map((u) => (
            <div
              key={u.uid}
              className="flex items-center justify-between p-3 rounded-xl transition-colors"
              style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--border-light)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
                >
                  {u.displayName?.charAt(0) || '?'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {u.displayName}
                    </span>
                    {(u.role === 'admin' || u.role === 'payroll_admin') && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
                        style={{
                          background: u.role === 'payroll_admin'
                            ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(139, 92, 246, 0.15))'
                            : 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(234, 179, 8, 0.15))',
                          color: u.role === 'payroll_admin' ? '#9333ea' : '#d97706',
                          border: u.role === 'payroll_admin'
                            ? '1px solid rgba(124, 58, 237, 0.25)'
                            : '1px solid rgba(245, 158, 11, 0.25)',
                        }}
                      >
                        <Crown size={10} /> {u.role === 'payroll_admin' ? 'Mzdový admin' : 'Admin'}
                      </span>
                    )}
                    {u.isOnline && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" style={{ boxShadow: '0 0 6px rgba(16, 185, 129, 0.5)' }} />
                    )}
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{u.email}</span>
                </div>
              </div>
              {u.uid !== userProfile?.uid && (
                <button
                  onClick={() => updateUserRole(u.uid, u.role === 'admin' || u.role === 'payroll_admin' ? 'employee' : 'admin')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200"
                  style={{
                    background: 'var(--primary-bg)',
                    color: 'var(--primary)',
                    border: '1px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary)';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--primary-bg)';
                    e.currentTarget.style.color = 'var(--primary)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {u.role === 'admin' || u.role === 'payroll_admin' ? 'Odebrat admin' : 'Nastavit admin'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
