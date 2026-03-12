'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { subscribeToEmployees, EmployeeDocument, updateEmployeeHourlyRate } from '@/lib/employees';
import { getMonthlyEmployeeStats, MonthlyEmployeeStats } from '@/lib/database';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, Clock, Users, TrendingUp, ChevronLeft, ChevronRight, CheckCircle, DollarSign, Building2, Home } from 'lucide-react';

const CHART_COLORS = [
  '#1765F2', '#1765F2', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
];

const DEFAULT_RATE = 250;

export default function AdminStatisticsPage() {
  const [employees, setEmployees] = useState<EmployeeDocument[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyEmployeeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const unsubscribe = subscribeToEmployees(setEmployees);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [year, month] = selectedMonth.split('-').map(Number);
        const stats = await getMonthlyEmployeeStats(year, month);
        setMonthlyStats(stats);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [selectedMonth]);

  const monthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month - 1).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  const navigateMonth = (direction: -1 | 1) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + direction);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const barData = useMemo(() => monthlyStats
    .filter(s => s.totalHours > 0)
    .sort((a, b) => b.totalHours - a.totalHours)
    .map(s => ({
      name: s.employeeName,
      hours: Math.round(s.totalHours * 10) / 10,
      tasks: s.totalTasks,
    })), [monthlyStats]);

  const pieData = useMemo(() => monthlyStats
    .filter(s => s.totalHours > 0)
    .map(s => ({ name: s.employeeName, value: Math.round(s.totalHours * 10) / 10 })),
    [monthlyStats]);

  // Location bar chart data
  const locationBarData = useMemo(() => monthlyStats
    .filter(s => s.officeDays > 0 || s.homeofficeDays > 0)
    .sort((a, b) => (b.officeDays + b.homeofficeDays) - (a.officeDays + a.homeofficeDays))
    .map(s => ({
      name: s.employeeName,
      office: s.officeDays,
      home: s.homeofficeDays,
    })), [monthlyStats]);

  const totalHours = useMemo(() =>
    Math.round(monthlyStats.reduce((sum, s) => sum + s.totalHours, 0) * 10) / 10, [monthlyStats]);
  const totalTasks = useMemo(() =>
    monthlyStats.reduce((sum, s) => sum + s.totalTasks, 0), [monthlyStats]);
  const totalCompleted = useMemo(() =>
    monthlyStats.reduce((sum, s) => sum + s.completedTasks, 0), [monthlyStats]);
  const totalOfficeDays = useMemo(() =>
    monthlyStats.reduce((sum, s) => sum + s.officeDays, 0), [monthlyStats]);
  const totalHomeDays = useMemo(() =>
    monthlyStats.reduce((sum, s) => sum + s.homeofficeDays, 0), [monthlyStats]);
  const activeEmployees = monthlyStats.filter(s => s.totalHours > 0).length;
  const avgCompletionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  // Per-employee hourly rate lookup
  const getRate = useCallback((employeeName: string) => {
    const emp = employees.find(e => e.name === employeeName);
    return emp?.hourlyRate || DEFAULT_RATE;
  }, [employees]);

  const getEmployeeId = useCallback((employeeName: string) => {
    return employees.find(e => e.name === employeeName)?.id;
  }, [employees]);

  const totalSalary = useMemo(() =>
    monthlyStats.reduce((sum, s) => sum + Math.round(s.totalHours * getRate(s.employeeName)), 0),
    [monthlyStats, getRate]);

  const handleRateChange = async (employeeName: string, newRate: number) => {
    const empId = getEmployeeId(employeeName);
    if (!empId) return;
    try {
      await updateEmployeeHourlyRate(empId, newRate);
    } catch (error) {
      console.error('Failed to save rate:', error);
    }
  };

  return (
    <div className="w-full max-w-[1400px]">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Statistiky</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Přehled odpracovaných hodin, úkolů a mezd
        </p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigateMonth(-1)} className="action-btn"><ChevronLeft size={18} /></button>
        <h2 className="text-lg font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{monthLabel}</h2>
        <button onClick={() => navigateMonth(1)} className="action-btn"><ChevronRight size={18} /></button>
      </div>

      {/* Summary cards - top row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Hodiny</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalHours}</p>
            </div>
          </div>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Úkoly</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalTasks}</p>
            </div>
          </div>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Aktivních</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{activeEmployees}</p>
            </div>
          </div>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white">
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Dokončeno</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{avgCompletionRate}%</p>
            </div>
          </div>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Celk. mzdy</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalSalary.toLocaleString('cs-CZ')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Office / Home summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Dny v kanceláři</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalOfficeDays}</p>
            </div>
          </div>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white">
              <Home size={20} />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Dny homeoffice</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalHomeDays}</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="spinner" /></div>
      ) : (
        <>
          {/* Charts row - bar (2 cols) + pie (1 col) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {barData.length > 0 && (
              <div className="dashboard-card lg:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={18} style={{ color: 'var(--primary)' }} />
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Hodiny dle zaměstnance</h3>
                </div>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13 }}
                        formatter={(value) => [`${value} h`, 'Hodiny']} />
                      <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                        {barData.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {pieData.length > 0 && (
              <div className="dashboard-card">
                <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Rozložení práce</h3>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}
                        dataKey="value" label={({ name, value }) => `${name}: ${value}h`}>
                        {pieData.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13 }}
                        formatter={(value) => [`${value} h`, 'Hodiny']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Office vs Home chart */}
          {locationBarData.length > 0 && (
            <div className="dashboard-card mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 size={18} style={{ color: 'var(--primary)' }} />
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Kancelář vs. Homeoffice</h3>
              </div>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={locationBarData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13 }} />
                    <Bar dataKey="office" name="🏢 Kancelář" fill="#3b82f6" radius={[0, 0, 0, 0]} stackId="location" />
                    <Bar dataKey="home" name="🏠 Homeoffice" fill="#f59e0b" radius={[6, 6, 0, 0]} stackId="location" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ background: '#3b82f6' }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Kancelář</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ background: '#f59e0b' }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Homeoffice</span>
                </div>
              </div>
            </div>
          )}

          {/* Completion rate: full width */}
          <div className="dashboard-card mb-6">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              <CheckCircle size={16} className="inline mr-1.5" /> Míra dokončení dle zaměstnance
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-3">
              {monthlyStats
                .filter(s => s.totalTasks > 0)
                .sort((a, b) => (b.completedTasks / b.totalTasks) - (a.completedTasks / a.totalTasks))
                .map((stat) => {
                  const rate = Math.round((stat.completedTasks / stat.totalTasks) * 100);
                  return (
                    <div key={stat.employeeName}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                          {stat.employeeName}
                        </span>
                        <span className="text-[10px] font-bold" style={{
                          color: rate >= 80 ? '#22c55e' : rate >= 50 ? '#f97316' : '#ef4444'
                        }}>
                          {stat.completedTasks}/{stat.totalTasks} ({rate}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-hover)' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{
                          width: `${rate}%`,
                          background: rate >= 80 ? '#22c55e' : rate >= 50 ? '#f97316' : '#ef4444'
                        }} />
                      </div>
                    </div>
                  );
                })}
              {monthlyStats.filter(s => s.totalTasks > 0).length === 0 && (
                <p className="text-sm text-center py-8 col-span-2" style={{ color: 'var(--text-muted)' }}>Žádná data</p>
              )}
            </div>
          </div>

          {/* Payroll summary */}
          <div className="dashboard-card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <DollarSign size={16} /> Mzdový přehled
              </h3>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Hodinovou sazbu lze editovat u každého zaměstnance</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left py-2 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Zaměstnanec</th>
                    <th className="text-right py-2 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Hodiny</th>
                    <th className="text-right py-2 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Dny</th>
                    <th className="text-right py-2 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: '#3b82f6' }}>🏢</th>
                    <th className="text-right py-2 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: '#f59e0b' }}>🏠</th>
                    <th className="text-right py-2 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Úkoly</th>
                    <th className="text-right py-2 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Dokončeno</th>
                    <th className="text-right py-2 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sazba/h</th>
                    <th className="text-right py-2 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Mzda (Kč)</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyStats
                    .sort((a, b) => b.totalHours - a.totalHours)
                    .map((stat, i) => {
                    const rate = getRate(stat.employeeName);
                    const salary = Math.round(stat.totalHours * rate);
                    return (
                    <tr key={stat.employeeName} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                            style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}>
                            {stat.employeeName.charAt(0)}
                          </div>
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{stat.employeeName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {Math.round(stat.totalHours * 10) / 10}h
                      </td>
                      <td className="py-2.5 px-3 text-right" style={{ color: 'var(--text-secondary)' }}>
                        {stat.daysWorked}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium" style={{ color: '#3b82f6' }}>
                        {stat.officeDays || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium" style={{ color: '#f59e0b' }}>
                        {stat.homeofficeDays || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right" style={{ color: 'var(--text-secondary)' }}>
                        {stat.totalTasks}
                      </td>
                      <td className="py-2.5 px-3 text-right" style={{ color: stat.totalTasks > 0 && stat.completedTasks / stat.totalTasks >= 0.8 ? '#22c55e' : 'var(--text-secondary)' }}>
                        {stat.completedTasks}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          defaultValue={rate}
                          onBlur={(e) => {
                            const val = Number(e.target.value) || DEFAULT_RATE;
                            if (val !== rate) handleRateChange(stat.employeeName, val);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          }}
                          className="form-input"
                          style={{ width: 70, padding: '2px 6px', fontSize: 12, textAlign: 'right' }}
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold" style={{ color: 'var(--primary)' }}>
                        {salary.toLocaleString('cs-CZ')}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)' }}>
                    <td className="py-2.5 px-3 font-bold" style={{ color: 'var(--text-primary)' }}>Celkem</td>
                    <td className="py-2.5 px-3 text-right font-bold" style={{ color: 'var(--primary)' }}>{totalHours}h</td>
                    <td className="py-2.5 px-3 text-right" style={{ color: 'var(--text-muted)' }}>—</td>
                    <td className="py-2.5 px-3 text-right font-bold" style={{ color: '#3b82f6' }}>{totalOfficeDays}</td>
                    <td className="py-2.5 px-3 text-right font-bold" style={{ color: '#f59e0b' }}>{totalHomeDays}</td>
                    <td className="py-2.5 px-3 text-right font-bold" style={{ color: 'var(--text-primary)' }}>{totalTasks}</td>
                    <td className="py-2.5 px-3 text-right font-bold" style={{ color: 'var(--text-primary)' }}>{totalCompleted}</td>
                    <td className="py-2.5 px-3 text-right" style={{ color: 'var(--text-muted)' }}>—</td>
                    <td className="py-2.5 px-3 text-right font-bold text-base" style={{ color: 'var(--primary)' }}>
                      {totalSalary.toLocaleString('cs-CZ')} Kč
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && monthlyStats.length === 0 && (
        <div className="dashboard-card text-center py-16">
          <BarChart3 size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Žádná data</h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Pro vybraný měsíc nejsou k dispozici žádné statistiky
          </p>
        </div>
      )}
    </div>
  );
}
