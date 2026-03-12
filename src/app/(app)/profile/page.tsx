'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { signOut, updateUserProfile, markUserAsUnpaired } from '@/lib/auth';
import { getMonthlyEmployeeStats, MonthlyEmployeeStats } from '@/lib/database';
import { saveEmployee, getEmployees, subscribeToEmployees, EmployeeDocument, unpairEmployee } from '@/lib/employees';
import AvatarPicker from '@/components/AvatarPicker';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
  Sun, Moon, LogOut, Mail, Briefcase, Shield, Clock,
  TrendingUp, Calendar, CheckCircle, ChevronLeft, ChevronRight, Link2Off, UserCheck,
  Pencil, Check, X
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, userProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [monthlyStats, setMonthlyStats] = useState<MonthlyEmployeeStats | null>(null);
  const [last6MonthsData, setLast6MonthsData] = useState<{ month: string; hours: number; tasks: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [unpairing, setUnpairing] = useState(false);
  const [pairedEmployee, setPairedEmployee] = useState<EmployeeDocument | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Fetch personal stats for current and last 6 months
  useEffect(() => {
    if (!userProfile?.displayName) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        // Current month
        const [year, month] = selectedMonth.split('-').map(Number);
        const allStats = await getMonthlyEmployeeStats(year, month);
        const myStats = allStats.find(s => s.employeeName === userProfile.displayName) || null;
        setMonthlyStats(myStats);

        // Last 6 months trend
        const trendData: { month: string; hours: number; tasks: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(year, month - 1 - i);
          const m = d.getMonth() + 1;
          const y = d.getFullYear();
          const stats = await getMonthlyEmployeeStats(y, m);
          const my = stats.find(s => s.employeeName === userProfile.displayName);
          trendData.push({
            month: d.toLocaleDateString('cs-CZ', { month: 'short' }),
            hours: my ? Math.round(my.totalHours * 10) / 10 : 0,
            tasks: my?.totalTasks || 0,
          });
        }
        setLast6MonthsData(trendData);
      } catch (err) {
        console.error('Error fetching profile stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userProfile?.displayName, selectedMonth]);


  // Find paired employee — check both by pairedEmployeeId AND by linkedUid (orphaned state)
  useEffect(() => {
    if (!user) {
      setPairedEmployee(null);
      return;
    }
    const unsub = subscribeToEmployees((emps) => {
      // 1. Try by pairedEmployeeId
      const pid = userProfile?.pairedEmployeeId;
      if (pid && pid !== '__none__' && pid !== '') {
        const matched = emps.find(e => e.id === pid);
        if (matched) {
          setPairedEmployee(matched);
          return;
        }
      }
      // 2. Fallback: find any employee whose linkedUid matches this user (orphaned state)
      const linkedToMe = emps.find(e => e.linkedUid === user.uid);
      setPairedEmployee(linkedToMe || null);
    });
    return () => unsub();
  }, [userProfile?.pairedEmployeeId, user]);

  const handleUnpair = async () => {
    if (!user) return;
    if (!confirm('Opravdu se chcete odpárovat od zaměstnance? Budete přesměrováni na stránku párování.')) return;
    setUnpairing(true);
    try {
      // 1. Clear employee's linkedUid — try by pairedEmployeeId first, then by pairedEmployee state
      const empId = userProfile?.pairedEmployeeId && userProfile.pairedEmployeeId !== '__none__' && userProfile.pairedEmployeeId !== ''
        ? userProfile.pairedEmployeeId
        : pairedEmployee?.id;
      if (empId) {
        await unpairEmployee(empId);
      }
      // 2. Clear user's pairedEmployeeId
      const { doc: firestoreDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db: firestore } = await import('@/lib/firebase');
      const userRef = firestoreDoc(firestore, 'users', user.uid);
      await updateDoc(userRef, { pairedEmployeeId: '', updatedAt: serverTimestamp() });
      // 3. Redirect to pairing page
      router.push('/pair-account?from=unpair');
    } catch (err) {
      console.error('Error unpairing:', err);
    } finally {
      setUnpairing(false);
    }
  };

  const monthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month - 1).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  const navigateMonth = (dir: -1 | 1) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month - 1 + dir);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleAvatarChange = async (avatarId: number) => {
    if (!user) return;
    try {
      // Save to user profile
      await updateUserProfile(user.uid, { avatarId });
      // Also update matching employee document — only if it already exists
      if (userProfile?.displayName) {
        const employees = await getEmployees();
        const match = employees.find(e => e.name === userProfile.displayName);
        if (match) {
          await saveEmployee({
            ...match,
            avatarId,
          });
        }
      }
    } catch (err) {
      console.error('Error saving avatar:', err);
    }
  };

  const handleStartEditName = () => {
    setNameValue(displayName);
    setEditingName(true);
  };

  const handleSaveName = async () => {
    if (!user || !nameValue.trim() || nameValue.trim() === displayName) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const newName = nameValue.trim();
      // 1. Update Firestore user profile
      await updateUserProfile(user.uid, { displayName: newName });
      // 2. Update Firebase Auth displayName
      const { updateProfile } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: newName });
      }
      // 3. Update matching employee document if exists
      const employees = await getEmployees();
      const match = employees.find(e => e.name === displayName);
      if (match) {
        await saveEmployee({ ...match, name: newName });
      }
      setEditingName(false);
    } catch (err) {
      console.error('Error saving name:', err);
    } finally {
      setSavingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName();
    if (e.key === 'Escape') setEditingName(false);
  };

  if (!user) return null;

  // Determine display info — use userProfile if available, otherwise fallback to Firebase auth user
  const displayName = userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Uživatel';
  const displayEmail = userProfile?.email || user.email || '';
  const displayRole = userProfile?.role || 'employee';
  const displayPosition = userProfile?.position || '';
  const hasStats = !!userProfile?.displayName;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Profile card */}
      <div className="dashboard-card mb-6">
        <div className="flex items-start gap-4">
          <AvatarPicker
            name={displayName}
            currentAvatarId={userProfile?.avatarId}
            onSelect={handleAvatarChange}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {editingName ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    className="form-input"
                    style={{ fontSize: 16, fontWeight: 700, padding: '6px 12px' }}
                    autoFocus
                    disabled={savingName}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName || !nameValue.trim()}
                    className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
                    style={{ background: '#22c55e', color: '#fff' }}
                    title="Uložit"
                  >
                    {savingName ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
                    style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}
                    title="Zrušit"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {displayName}
                  </h1>
                  <button
                    onClick={handleStartEditName}
                    className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.color = 'var(--primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                    title="Upravit jméno"
                  >
                    <Pencil size={14} />
                  </button>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Mail size={12} /> {displayEmail}
              </span>
              {displayPosition && (
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <Briefcase size={12} /> {displayPosition}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                displayRole === 'admin'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                <Shield size={10} className="inline mr-0.5" />
                {displayRole}
              </span>
            </div>
          </div>
        </div>

        {/* Actions — proper styled buttons */}
        <div className="flex items-center gap-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-light)' }}>
          <button
            onClick={toggleTheme}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: theme === 'dark' ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'linear-gradient(135deg, #1765F2, #1765F2)',
              color: '#fff',
              boxShadow: theme === 'dark' ? '0 2px 8px rgba(245,158,11,0.3)' : '0 2px 8px rgba(99,102,241,0.3)',
            }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? 'Světlý režim' : 'Tmavý režim'}
          </button>
          <button
            onClick={handleSignOut}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border-2"
            style={{
              borderColor: 'var(--border)',
              color: '#ef4444',
              background: 'var(--surface)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = '#ef4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <LogOut size={16} /> Odhlásit se
          </button>
        </div>
      </div>

      {/* Employee pairing section */}
      <div className="dashboard-card mb-6">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <UserCheck size={16} className="text-blue-500" />
          Spárovaný zaměstnanec
        </h3>
        {pairedEmployee ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold ${
                pairedEmployee.type === 'internal'
                  ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                  : 'bg-gradient-to-br from-blue-400 to-blue-600'
              }`}>
                {pairedEmployee.name.charAt(0)}
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{pairedEmployee.name}</div>
                <div className="flex items-center gap-2">
                  {pairedEmployee.position && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{pairedEmployee.position}</span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    pairedEmployee.type === 'internal'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {pairedEmployee.type === 'internal' ? '🏢 Interní' : '🌐 Externí'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleUnpair}
              disabled={unpairing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-all"
            >
              {unpairing ? (
                <div className="w-3.5 h-3.5 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
              ) : (
                <Link2Off size={14} />
              )}
              Odpárovat
            </button>
          </div>
        ) : userProfile?.pairedEmployeeId === '__none__' ? (
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nejste spárováni s žádným zaměstnancem</p>
            <button
              onClick={() => router.push('/pair-account?from=unpair')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all"
            >
              <UserCheck size={14} />
              Spárovat
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Párování nebylo provedeno</p>
            <button
              onClick={() => router.push('/pair-account?from=unpair')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all"
            >
              <UserCheck size={14} />
              Spárovat nyní
            </button>
          </div>
        )}
      </div>

      {/* Month navigation — only show stats when we have an employee name */}
      {hasStats && (
        <>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigateMonth(-1)} className="action-btn"><ChevronLeft size={18} /></button>
            <h2 className="text-sm font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
              <Calendar size={14} className="inline mr-1.5" />
              {monthLabel}
            </h2>
            <button onClick={() => navigateMonth(1)} className="action-btn"><ChevronRight size={18} /></button>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="dashboard-card py-3 px-4 text-center">
              <Clock size={18} className="mx-auto mb-1" style={{ color: '#1765F2' }} />
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {monthlyStats ? Math.round(monthlyStats.totalHours * 10) / 10 : 0}
              </p>
              <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Hodiny</p>
            </div>
            <div className="dashboard-card py-3 px-4 text-center">
              <CheckCircle size={18} className="mx-auto mb-1" style={{ color: '#22c55e' }} />
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {monthlyStats?.completedTasks || 0}
              </p>
              <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Dokončeno</p>
            </div>
            <div className="dashboard-card py-3 px-4 text-center">
              <TrendingUp size={18} className="mx-auto mb-1" style={{ color: '#f97316' }} />
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {monthlyStats?.totalTasks || 0}
              </p>
              <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Celkem úkolů</p>
            </div>
            <div className="dashboard-card py-3 px-4 text-center">
              <Calendar size={18} className="mx-auto mb-1" style={{ color: '#06b6d4' }} />
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {monthlyStats?.daysWorked || 0}
              </p>
              <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Pracovní dny</p>
            </div>
            <div className="dashboard-card py-3 px-4 text-center">
              <span className="text-lg block mb-1">🏢</span>
              <p className="text-lg font-bold" style={{ color: '#3b82f6' }}>
                {monthlyStats?.officeDays || 0}
              </p>
              <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Kancelář</p>
            </div>
            <div className="dashboard-card py-3 px-4 text-center">
              <span className="text-lg block mb-1">🏠</span>
              <p className="text-lg font-bold" style={{ color: '#f59e0b' }}>
                {monthlyStats?.homeofficeDays || 0}
              </p>
              <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Homeoffice</p>
            </div>
          </div>

          {/* Completion rate */}
          {monthlyStats && monthlyStats.totalTasks > 0 && (
            <div className="dashboard-card mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Míra dokončení</span>
                <span className="text-xs font-bold" style={{ color: 'var(--primary)' }}>
                  {Math.round((monthlyStats.completedTasks / monthlyStats.totalTasks) * 100)}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--surface-hover)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(monthlyStats.completedTasks / monthlyStats.totalTasks) * 100}%`,
                    background: 'linear-gradient(90deg, #1765F2, #22c55e)',
                  }}
                />
              </div>
            </div>
          )}

          {/* 6-month trend chart */}
          {last6MonthsData.length > 0 && (
            <div className="dashboard-card mb-6">
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                📈 Trend za posledních 6 měsíců
              </h3>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <AreaChart data={last6MonthsData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1765F2" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1765F2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        fontSize: 12,
                        color: 'var(--text-primary)'
                      }}
                    />
                    <Area type="monotone" dataKey="hours" name="Hodiny" stroke="#1765F2" strokeWidth={2}
                      fill="url(#colorHours)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Tasks bar chart */}
          {last6MonthsData.length > 0 && (
            <div className="dashboard-card">
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                📋 Počet úkolů za měsíc
              </h3>
              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer>
                  <BarChart data={last6MonthsData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="tasks" name="Úkoly" fill="#1765F2" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="spinner" />
            </div>
          )}
        </>
      )}

      {/* If no stats - show hint */}
      {!hasStats && !loading && (
        <div className="dashboard-card text-center py-8">
          <Calendar size={32} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Statistiky budou dostupné po spárování s&nbsp;účtem zaměstnance
          </p>
        </div>
      )}
    </div>
  );
}
