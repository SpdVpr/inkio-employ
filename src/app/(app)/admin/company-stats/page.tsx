'use client';

import { useState, useEffect, useMemo } from 'react';
import { getMonthlyCompanyStats, MonthlyCompanyStats, formatTimeMinutes } from '@/lib/database';
import { subscribeToCompanies, Company } from '@/lib/companies';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Building2, Clock, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, CheckCircle, TrendingUp, Users, ListTodo } from 'lucide-react';

export default function CompanyStatsPage() {
  const [companyStats, setCompanyStats] = useState<MonthlyCompanyStats[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const unsub = subscribeToCompanies(setCompanies);
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [year, month] = selectedMonth.split('-').map(Number);
        const cStats = await getMonthlyCompanyStats(year, month);
        setCompanyStats(cStats);
      } catch (error) {
        console.error('Error fetching company stats:', error);
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

  // Totals
  const assignedStats = companyStats.filter(s => s.companyId !== '__unassigned__');
  const totalCompanyHours = useMemo(() => Math.round(assignedStats.reduce((s, c) => s + c.totalHours, 0) * 10) / 10, [assignedStats]);
  const totalCompanyTasks = useMemo(() => assignedStats.reduce((s, c) => s + c.totalTasks, 0), [assignedStats]);
  const totalCompanyCompleted = useMemo(() => assignedStats.reduce((s, c) => s + c.completedTasks, 0), [assignedStats]);
  const totalCompanyEmployees = useMemo(() => {
    const set = new Set<string>();
    assignedStats.forEach(s => s.employeeNames.forEach(n => set.add(n)));
    return set.size;
  }, [assignedStats]);
  const avgRate = totalCompanyTasks > 0 ? Math.round((totalCompanyCompleted / totalCompanyTasks) * 100) : 0;

  // Chart data
  const companyBarData = useMemo(() => assignedStats
    .sort((a, b) => b.totalHours - a.totalHours)
    .map(s => {
      const c = companies.find(co => co.id === s.companyId);
      return {
        name: c?.name || s.companyId,
        hours: Math.round(s.totalHours * 10) / 10,
        tasks: s.totalTasks,
        color: c?.color || '#64748b',
      };
    }), [assignedStats, companies]);

  const companyPieData = useMemo(() => assignedStats
    .filter(s => s.totalHours > 0)
    .map(s => {
      const c = companies.find(co => co.id === s.companyId);
      return {
        name: c?.name || s.companyId,
        value: Math.round(s.totalHours * 10) / 10,
        color: c?.color || '#64748b',
      };
    }), [assignedStats, companies]);

  const tasksPieData = useMemo(() => assignedStats
    .filter(s => s.totalTasks > 0)
    .map(s => {
      const c = companies.find(co => co.id === s.companyId);
      return {
        name: c?.name || s.companyId,
        value: s.totalTasks,
        color: c?.color || '#64748b',
      };
    }), [assignedStats, companies]);

  return (
    <div className="w-full max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Building2 size={24} /> Firmy — přehled
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Detailní statistiky úkolů, hodin a zaměstnanců dle firem
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigateMonth(-1)} className="action-btn"><ChevronLeft size={18} /></button>
          <h2 className="text-base font-semibold capitalize min-w-[140px] text-center" style={{ color: 'var(--text-primary)' }}>{monthLabel}</h2>
          <button onClick={() => navigateMonth(1)} className="action-btn"><ChevronRight size={18} /></button>
        </div>
      </div>

      {/* Summary cards - 5 columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Firem</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{assignedStats.length}</p>
            </div>
          </div>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Hodiny</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalCompanyHours}h</p>
            </div>
          </div>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
              <ListTodo size={20} />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Úkolů</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalCompanyTasks}</p>
            </div>
          </div>
        </div>
        <div className="dashboard-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Lidí</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalCompanyEmployees}</p>
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
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{avgRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="spinner" /></div>
      ) : (
        <>
          {/* Charts: bar (2cols) + 2 pies (1col each) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            {companyBarData.length > 0 && (
              <div className="dashboard-card lg:col-span-2">
                <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <TrendingUp size={16} /> Hodiny dle firmy
                </h3>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={companyBarData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13 }}
                        formatter={(value) => [`${value} h`, 'Hodiny']} />
                      <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                        {companyBarData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {companyPieData.length > 0 && (
              <div className="dashboard-card">
                <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Rozložení hodin</h3>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={companyPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}
                        dataKey="value" label={({ name, value }) => `${value}h`}>
                        {companyPieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13 }}
                        formatter={(value) => [`${value} h`, 'Hodiny']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {tasksPieData.length > 0 && (
              <div className="dashboard-card">
                <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Rozložení úkolů</h3>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={tasksPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}
                        dataKey="value" label={({ name, value }) => `${value}×`}>
                        {tasksPieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13 }}
                        formatter={(value) => [`${value} úkolů`]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* ====== Detailed company cards ====== */}
          <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Building2 size={18} /> Detailní přehled firem
          </h2>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
            {companyStats
              .sort((a, b) => b.totalHours - a.totalHours)
              .map((stat) => {
                const company = companies.find(c => c.id === stat.companyId);
                const isUnassigned = stat.companyId === '__unassigned__';
                const name = isUnassigned ? 'Bez přiřazené firmy' : (company?.name || stat.companyId);
                const color = isUnassigned ? '#94a3b8' : (company?.color || '#64748b');
                const icon = isUnassigned ? '📋' : (company?.icon || '🏢');
                const rate = stat.totalTasks > 0 ? Math.round((stat.completedTasks / stat.totalTasks) * 100) : 0;
                const hours = Math.round(stat.totalHours * 10) / 10;
                const isExpanded = expandedCompany === stat.companyId;

                // Group tasks by employee
                const tasksByEmployee: Record<string, typeof stat.tasks> = {};
                stat.tasks.forEach(t => {
                  if (!tasksByEmployee[t.employeeName]) tasksByEmployee[t.employeeName] = [];
                  tasksByEmployee[t.employeeName].push(t);
                });

                return (
                  <div key={stat.companyId} className="dashboard-card overflow-hidden" style={{ borderLeft: `4px solid ${color}` }}>
                    {/* Company header - clickable */}
                    <div
                      className="flex items-center justify-between cursor-pointer group"
                      onClick={() => setExpandedCompany(isExpanded ? null : stat.companyId)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-3xl w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: color + '15' }}>
                          {icon}
                        </div>
                        <div>
                          <h4 className="font-bold" style={{ color }}>{name}</h4>
                          <div className="flex items-center gap-3 mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            <span className="flex items-center gap-1"><Users size={11} /> {stat.employeeNames.length} pracovníků</span>
                            <span className="flex items-center gap-1"><ListTodo size={11} /> {stat.totalTasks} úkolů</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-5">
                        {/* Key metrics */}
                        <div className="text-right">
                          <p className="text-xl font-bold tabular-nums" style={{ color }}>{hours}h</p>
                          <p className="text-[11px] font-semibold" style={{
                            color: rate >= 80 ? '#22c55e' : rate >= 50 ? '#f97316' : '#ef4444'
                          }}>{stat.completedTasks}/{stat.totalTasks} ({rate}%)</p>
                        </div>
                        <div className="group-hover:scale-110 transition-transform">
                          {isExpanded
                            ? <ChevronUp size={20} style={{ color: 'var(--text-muted)' }} />
                            : <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} />}
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2.5 rounded-full overflow-hidden mt-4" style={{ background: color + '12' }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${rate}%`, background: color }} />
                    </div>

                    {/* Employee chips - always visible */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {stat.employeeNames.map(empName => {
                        const empTasks = tasksByEmployee[empName] || [];
                        const empMinutes = empTasks.reduce((s, t) => s + t.timeMinutes, 0);
                        const empCompleted = empTasks.filter(t => t.status === 'completed').length;
                        return (
                          <span key={empName} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={{ background: color + '10', color }}>
                            {empName}
                            <span className="opacity-60">{formatTimeMinutes(empMinutes)}</span>
                            <span className="opacity-40">{empCompleted}/{empTasks.length}✓</span>
                          </span>
                        );
                      })}
                    </div>

                    {/* ====== Expanded: detailed task breakdown ====== */}
                    {isExpanded && (
                      <div className="mt-5 space-y-4 animate-fade-in border-t pt-4" style={{ borderColor: color + '20' }}>
                        {Object.entries(tasksByEmployee)
                          .sort(([, a], [, b]) => b.reduce((s, t) => s + t.timeMinutes, 0) - a.reduce((s, t) => s + t.timeMinutes, 0))
                          .map(([empName, tasks]) => {
                            const empTotal = tasks.reduce((s, t) => s + t.timeMinutes, 0);
                            const empCompleted = tasks.filter(t => t.status === 'completed').length;
                            const empRate = tasks.length > 0 ? Math.round((empCompleted / tasks.length) * 100) : 0;

                            return (
                              <div key={empName} className="rounded-xl p-4" style={{ background: 'var(--surface-hover)' }}>
                                {/* Employee header */}
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ background: color }}>
                                      {empName.charAt(0)}
                                    </div>
                                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{empName}</span>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs">
                                    <span className="font-bold flex items-center gap-1" style={{ color }}>
                                      <Clock size={12} /> {formatTimeMinutes(empTotal)}
                                    </span>
                                    <span className="font-semibold" style={{
                                      color: empRate >= 80 ? '#22c55e' : empRate >= 50 ? '#f97316' : '#ef4444'
                                    }}>
                                      {empCompleted}/{tasks.length} ({empRate}%)
                                    </span>
                                  </div>
                                </div>

                                {/* Employee progress bar */}
                                <div className="w-full h-1.5 rounded-full overflow-hidden mb-3" style={{ background: color + '10' }}>
                                  <div className="h-full rounded-full" style={{ width: `${empRate}%`, background: color + '80' }} />
                                </div>

                                {/* Task table */}
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                                      <th className="text-left py-1.5 font-semibold uppercase tracking-wider text-[9px]" style={{ color: 'var(--text-muted)' }}>Status</th>
                                      <th className="text-left py-1.5 font-semibold uppercase tracking-wider text-[9px]" style={{ color: 'var(--text-muted)' }}>Úkol</th>
                                      <th className="text-right py-1.5 font-semibold uppercase tracking-wider text-[9px]" style={{ color: 'var(--text-muted)' }}>Datum</th>
                                      <th className="text-right py-1.5 font-semibold uppercase tracking-wider text-[9px]" style={{ color: 'var(--text-muted)' }}>Čas</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {tasks.map((task, i) => (
                                      <tr key={i} className="hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors" style={{ borderBottom: '1px solid var(--border-light)' }}>
                                        <td className="py-1.5 pr-2">
                                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                            task.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                            task.status === 'in-progress' ? 'bg-amber-100 text-amber-700' :
                                            'bg-slate-100 text-slate-500'
                                          }`}>
                                            {task.status === 'completed' ? '✅' : task.status === 'in-progress' ? '🔄' : '⬜'}
                                            {task.status === 'completed' ? 'Hotovo' : task.status === 'in-progress' ? 'Práce' : 'Čeká'}
                                          </span>
                                        </td>
                                        <td className={`py-1.5 ${task.status === 'completed' ? 'line-through opacity-50' : ''}`}
                                          style={{ color: 'var(--text-primary)' }}>
                                          {task.content}
                                        </td>
                                        <td className="py-1.5 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>
                                          {task.date.slice(5).replace('-', '.')}
                                        </td>
                                        <td className="py-1.5 text-right font-semibold tabular-nums" style={{ color: task.timeMinutes > 0 ? color : 'var(--text-muted)' }}>
                                          {task.timeMinutes > 0 ? formatTimeMinutes(task.timeMinutes) : '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Company comparison table */}
          <div className="dashboard-card mb-6">
            <h3 className="font-semibold flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
              <TrendingUp size={16} /> Srovnávací tabulka
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th className="text-left py-2.5 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Firma</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Hodiny</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Úkoly</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Dokončeno</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>%</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Pracovníků</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Tým</th>
                  </tr>
                </thead>
                <tbody>
                  {companyStats
                    .sort((a, b) => b.totalHours - a.totalHours)
                    .map((stat) => {
                      const company = companies.find(c => c.id === stat.companyId);
                      const isUnassigned = stat.companyId === '__unassigned__';
                      const name = isUnassigned ? 'Bez firmy' : (company?.name || stat.companyId);
                      const color = isUnassigned ? '#94a3b8' : (company?.color || '#64748b');
                      const icon = isUnassigned ? '📋' : (company?.icon || '🏢');
                      const rate = stat.totalTasks > 0 ? Math.round((stat.completedTasks / stat.totalTasks) * 100) : 0;

                      return (
                        <tr key={stat.companyId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span>{icon}</span>
                              <span className="font-bold text-sm" style={{ color }}>{name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold tabular-nums" style={{ color }}>
                            {Math.round(stat.totalHours * 10) / 10}h
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>
                            {stat.totalTasks}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>
                            {stat.completedTasks}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold tabular-nums" style={{
                            color: rate >= 80 ? '#22c55e' : rate >= 50 ? '#f97316' : '#ef4444'
                          }}>
                            {rate}%
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                            {stat.employeeNames.length}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap gap-1">
                              {stat.employeeNames.map(n => (
                                <span key={n} className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: color + '12', color }}>
                                  {n}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && companyStats.length === 0 && (
        <div className="dashboard-card text-center py-16">
          <Building2 size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Žádná data</h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Pro vybraný měsíc nejsou žádné úkoly s přiřazenými firmami
          </p>
        </div>
      )}
    </div>
  );
}
