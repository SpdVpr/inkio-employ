'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useChatNotificationContext } from '@/contexts/ChatNotificationContext';
import { 
  subscribeToTasks, 
  ScheduleTask, 
  SubTask, 
  updateSubTaskStatus,
  formatTimeMinutes
} from '@/lib/database';
import { subscribeToEmployees, EmployeeDocument } from '@/lib/employees';
import { 
  formatDate, 
  formatDayName, 
  formatDateDisplay, 
  isCurrentDay,
  Employee
} from '@/lib/utils';
import { showCompletionToast, showTimeWarningToast } from '@/components/CompletionToast';
import TimeReminderBanner from '@/components/TimeReminderBanner';
import { 
  CalendarDays, 
  CheckCircle, 
  Clock, 
  Timer, 
  MessageSquare, 
  AlertCircle, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { subDays } from 'date-fns';

export default function DashboardPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { totalUnread } = useChatNotificationContext();
  
  const [loading, setLoading] = useState(true);
  
  // Data pro dnešek a minulost
  const [todayTasks, setTodayTasks] = useState<SubTask[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<{date: string, task: SubTask}[]>([]);
  
  const myName = userProfile?.displayName || '';

  useEffect(() => {
    if (!myName) return;
    
    // Načteme úkoly za posledních 30 dní až do dneška
    const today = new Date();
    const pastDate = subDays(today, 30);
    
    const startDateStr = formatDate(pastDate);
    const endDateStr = formatDate(today);
    const todayStr = formatDate(today);
    
    setLoading(true);
    
    const unsubscribe = subscribeToTasks(startDateStr, endDateStr, (scheduleTasks: ScheduleTask[]) => {
      // Filtrujeme jen úkoly pro aktuálního zaměstnance
      const myScheduleTasks = scheduleTasks.filter(t => t.employeeName === myName);
      
      // Zpracujeme dnešní úkoly
      const todayData = myScheduleTasks.find(t => t.taskDate === todayStr);
      setTodayTasks(todayData?.subTasks || []);
      
      // Zpracujeme nedokončené z minulosti
      const pastUnfinished: {date: string, task: SubTask}[] = [];
      myScheduleTasks.forEach(st => {
        if (st.taskDate < todayStr && st.subTasks) {
          st.subTasks.forEach(sub => {
            if (sub.status !== 'completed' && sub.content.trim()) {
              pastUnfinished.push({ date: st.taskDate, task: sub });
            }
          });
        }
      });
      
      // Seřadíme od nejnovějších
      pastUnfinished.sort((a, b) => b.date.localeCompare(a.date));
      setOverdueTasks(pastUnfinished);
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [myName]);

  // Přepínání statusu
  const handleSubTaskStatusChange = async (dateStr: string, subTaskId: string, newStatus: 'pending' | 'in-progress' | 'completed') => {
    try {
      await updateSubTaskStatus(myName, dateStr, subTaskId, newStatus);
      if (newStatus === 'completed') {
        const targetList = dateStr === formatDate(new Date()) 
          ? todayTasks 
          : overdueTasks.filter(o => o.date === dateStr).map(o => o.task);
          
        const task = targetList.find(t => t.id === subTaskId);
        if (task) {
          showCompletionToast(task.content);
          if (!task.timeMinutes) {
            setTimeout(() => showTimeWarningToast(task.content), 400);
          }
        }
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner mb-4" />
      </div>
    );
  }

  const todayStr = formatDate(new Date());
  
  // Není nalezen zaměstnanec s mým jménem
  if (!myName) {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Nenalezen profil</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Váš profil nemá nastavené jméno, kontaktujte administrátora.</p>
        </div>
    )
  }

  // Odpracováno dnes
  const completedToday = todayTasks.filter(t => t.status === 'completed').length;
  const progressPercent = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0;

  return (
    <div className="p-[20px] max-w-6xl mx-auto pb-24">
      <TimeReminderBanner currentDate={new Date()} />
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          Ahoj, {myName.split(' ')[0]} 👋
        </h1>
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          Tady je tvůj rychlý přehled pro dnešní den.
        </p>
      </div>

      {/* ZÁKLADNÍ STATISTIKY - KARTY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {/* ZPRÁVY */}
        <Link href="/chat" className="dashboard-stat-card group">
           <div className="flex items-start justify-between">
              <div>
                <p className="dashboard-stat-label">Zprávy k přečtení</p>
                <div className="flex items-baseline gap-2 mt-1">
                   <h3 className="dashboard-stat-value" style={{ color: totalUnread > 0 ? '#ef4444' : 'var(--text-primary)' }}>
                      {totalUnread}
                   </h3>
                   <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>nepřečtené</span>
                </div>
              </div>
              <div className="dashboard-stat-icon-wrapper" style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#0ea5e9' }}>
                 <MessageSquare size={22} className="group-hover:scale-110 transition-transform"/>
              </div>
           </div>
           {totalUnread > 0 && (
             <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-rose-500 bg-rose-50/80 px-2.5 py-1.5 rounded-md dark:bg-rose-500/10">
               <AlertCircle size={14} /> Máš nové zprávy v chatu
             </div>
           )}
        </Link>
        
        {/* DNEŠEK - PROGRES */}
        <Link href="/calendar" className="dashboard-stat-card group relative overflow-hidden">
           <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="dashboard-stat-label">Pokrok dne ({completedToday}/{todayTasks.length})</p>
                <div className="flex items-baseline gap-2 mt-1">
                   <h3 className="dashboard-stat-value">{progressPercent}%</h3>
                </div>
              </div>
              <div className="dashboard-stat-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                 <TrendingUp size={22} className="group-hover:scale-110 transition-transform"/>
              </div>
           </div>
           <div className="mt-4 relative z-10">
             <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
               <div className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${progressPercent}%` }} />
             </div>
           </div>
        </Link>

        {/* RESTY */}
        <div className="dashboard-stat-card">
           <div className="flex items-start justify-between">
              <div>
                <p className="dashboard-stat-label">Nedokončené resty</p>
                <div className="flex items-baseline gap-2 mt-1">
                   <h3 className="dashboard-stat-value" style={{ color: overdueTasks.length > 0 ? '#f59e0b' : 'var(--text-primary)' }}>
                      {overdueTasks.length}
                   </h3>
                   <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>položek</span>
                </div>
              </div>
              <div className="dashboard-stat-icon-wrapper" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                 <CalendarDays size={22} />
              </div>
           </div>
           {overdueTasks.length > 0 ? (
             <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50/80 px-2.5 py-1.5 rounded-md dark:bg-amber-500/10">
               <AlertCircle size={14} /> Opomenuté úkoly z minula
             </div>
           ) : (
             <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50/80 px-2.5 py-1.5 rounded-md dark:bg-emerald-500/10">
               <CheckCircle size={14} /> Všechny resty máš hotové
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KARTA: MOJE DNEŠNÍ ÚKOLY */}
        <div className="dashboard-widget">
           <div className="dashboard-widget-header">
             <h2 className="flex items-center gap-2">
               <Clock size={16} className="text-blue-500" />
               Moje dnešní úkoly
             </h2>
             <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
               {formatDateDisplay(new Date())}
             </span>
           </div>
           
           <div className="dashboard-widget-content">
             {todayTasks.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-10 text-center">
                 <CalendarDays size={32} className="text-slate-300 dark:text-slate-600 mb-3" />
                 <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Zatím nemáš na dnešek nic v plánu</p>
                 <Link href="/calendar" className="text-xs font-semibold text-blue-500 hover:text-blue-600 mt-2">
                    Jít do kalendáře &rarr;
                 </Link>
               </div>
             ) : (
               <div className="flex flex-col gap-2">
                 {todayTasks.map((task) => (
                   <div key={task.id} className={`dashboard-task-item ${task.status === 'completed' ? 'completed' : task.status === 'in-progress' ? 'in-progress' : ''}`}>
                     <button
                        onClick={() => handleSubTaskStatusChange(todayStr, task.id, task.status === 'completed' ? 'pending' : task.status === 'in-progress' ? 'completed' : 'in-progress')}
                        className="dashboard-task-check"
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle size={20} className="text-emerald-500" />
                        ) : task.status === 'in-progress' ? (
                          <Timer size={20} className="text-amber-500" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                        )}
                      </button>
                      <div className="flex flex-col flex-1 min-w-0">
                         <span className={`text-sm font-semibold truncate ${task.status === 'completed' ? 'line-through opacity-50' : ''}`} style={{ color: 'var(--text-primary)' }}>
                            {task.content}
                         </span>
                         {task.timeMinutes > 0 && (
                            <span className="text-[10px] flex items-center gap-1 font-semibold mt-0.5 opacity-60" style={{ color: 'var(--text-muted)' }}>
                               <Clock size={10} /> {formatTimeMinutes(task.timeMinutes)}
                            </span>
                         )}
                      </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
           {todayTasks.length > 0 && (
             <div className="dashboard-widget-footer">
               <Link href="/calendar" className="dashboard-link-btn">
                  Zobrazit celý rozvrh <ArrowRight size={14} />
               </Link>
             </div>
           )}
        </div>

        {/* KARTA: NEDOKONČENÉ RESTY */}
        <div className="dashboard-widget">
           <div className="dashboard-widget-header">
             <h2 className="flex items-center gap-2">
               <AlertCircle size={16} className="text-amber-500" />
               Nedokončené resty
             </h2>
             <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
               Za posledních 30 dní
             </span>
           </div>
           
           <div className="dashboard-widget-content">
             {overdueTasks.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-10 text-center">
                 <CheckCircle size={32} className="text-emerald-400/50 mb-3" />
                 <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Paráda! Všechno máš hotové.</p>
                 <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Seznam tvých restů zeje prázdnotou.</p>
               </div>
             ) : (
               <div className="flex flex-col gap-2">
                 {overdueTasks.slice(0, 10).map(({ date, task }) => {
                   const [year, month, day] = date.split('-');
                   const formattedDate = `${day}.${month}.`;
                   
                   return (
                     <div key={`${date}-${task.id}`} className={`dashboard-task-item ${task.status === 'in-progress' ? 'in-progress' : ''}`}>
                       <button
                          onClick={() => handleSubTaskStatusChange(date, task.id, task.status === 'completed' ? 'pending' : task.status === 'in-progress' ? 'completed' : 'in-progress')}
                          className="dashboard-task-check"
                        >
                          {task.status === 'completed' ? (
                            <CheckCircle size={20} className="text-emerald-500" />
                          ) : task.status === 'in-progress' ? (
                            <Timer size={20} className="text-amber-500" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                          )}
                        </button>
                        <div className="flex flex-col flex-1 min-w-0">
                           <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                              {task.content}
                           </span>
                           <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">
                              Původně ze dne: {formattedDate}
                           </span>
                        </div>
                     </div>
                   );
                 })}
                 {overdueTasks.length > 10 && (
                   <p className="text-xs text-center font-medium mt-2" style={{ color: 'var(--text-muted)' }}>
                     ...a {overdueTasks.length - 10} dalších
                   </p>
                 )}
               </div>
             )}
           </div>
           {overdueTasks.length > 0 && (
             <div className="dashboard-widget-footer">
                <Link href="/calendar" className="dashboard-link-btn">
                  Přejít na plánování <ArrowRight size={14} />
               </Link>
             </div>
           )}
        </div>
      </div>
      
    </div>
  );
}
