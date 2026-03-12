'use client';

import { useState, useEffect, useMemo } from 'react';
import WeekNavigation from '@/components/WeekNavigation';
import EmployeeRow from '@/components/EmployeeRow';
import DayView from '@/components/DayView';
import TaskEditModal from '@/components/TaskEditModal';
import SubTaskEditModal from '@/components/SubTaskEditModal';
import CompletionToast from '@/components/CompletionToast';
import TimeReminderBanner from '@/components/TimeReminderBanner';
import { useAuth } from '@/contexts/AuthContext';
import {
  defaultEmployees,
  getWeekDates,
  getNextWeek,
  getPreviousWeek,
  formatDate,
  formatDayName,
  formatDateDisplay,
  isCurrentDay,
  isWeekendDay,
  Employee
} from '@/lib/utils';
import {
  subscribeToTasks, ScheduleTask, saveTask, TaskStatus,
  updateTaskStatus, SubTask, saveSubTasks, toggleAbsent,
  moveSubTask, moveSubTaskCrossEmployee, WorkLocation,
  updateWorkLocation, WeeklyStats, subscribeToWeeklyStats,
  calculateProgress, updateSubTaskStatus, formatTimeMinutes
} from '@/lib/database';
import { subscribeToEmployees, EmployeeDocument } from '@/lib/employees';
import { showCompletionToast, showTimeWarningToast } from '@/components/CompletionToast';
import SubTaskList from '@/components/SubTaskList';
import ProgressBar from '@/components/ProgressBar';
import {
  CalendarDays, ChevronLeft, ChevronRight,
  Calendar, Clock, Users, User, Building2, Plus,
  MapPin, Home, XCircle, CheckCircle, Timer
} from 'lucide-react';
import { addDays, subDays } from 'date-fns';

type ViewMode = 'my-day' | 'my-week' | 'company';

interface ModalState {
  isOpen: boolean;
  employee: Employee | null;
  date: Date | null;
  initialContent: string;
}

interface SubTaskModalState {
  isOpen: boolean;
  employee: Employee | null;
  date: Date | null;
  initialSubTasks: SubTask[];
}

interface DragData {
  employeeName: string;
  date: string;
  subTaskId: string;
}

export default function DashboardPage() {
  const { user, userProfile, loading: authLoading } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [employees, setEmployees] = useState<Employee[]>(defaultEmployees);
  const [tasks, setTasks] = useState<Record<string, Record<string, string>>>({});
  const [taskStatuses, setTaskStatuses] = useState<Record<string, Record<string, TaskStatus>>>({});
  const [subTasks, setSubTasks] = useState<Record<string, Record<string, SubTask[]>>>({});
  const [absences, setAbsences] = useState<Record<string, Record<string, boolean>>>({});
  const [workLocations, setWorkLocations] = useState<Record<string, Record<string, WorkLocation>>>({});
  const [weeklyStats, setWeeklyStats] = useState<Record<string, WeeklyStats>>({});
  const [loading, setLoading] = useState(true);
  const [draggedCell, setDraggedCell] = useState<DragData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('inkio_view_mode_v2') as ViewMode) || 'my-day';
    }
    return 'my-day';
  });
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false, employee: null, date: null, initialContent: ''
  });
  const [subTaskModalState, setSubTaskModalState] = useState<SubTaskModalState>({
    isOpen: false, employee: null, date: null, initialSubTasks: []
  });

  // My employee name from profile
  const myName = userProfile?.displayName || '';

  // Subscribe to employees
  useEffect(() => {
    const unsubscribe = subscribeToEmployees((employeeList: EmployeeDocument[]) => {
      // Filter out system accounts (admin etc.) that are not real employees
      const employeesData: Employee[] = employeeList
        .filter(emp => emp.name.toLowerCase() !== 'admin' && emp.name.toLowerCase() !== 'administrator')
        .map(emp => ({
          name: emp.name, position: emp.position, type: emp.type, avatarId: emp.avatarId
        }));
      if (employeesData.length === 0) {
        setEmployees(defaultEmployees);
      } else {
        setEmployees(employeesData);
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to weekly tasks
  useEffect(() => {
    const weekData = getWeekDates(currentDate);
    const startDate = formatDate(weekData.start);
    const endDate = formatDate(weekData.end);
    setLoading(true);

    const unsubscribe = subscribeToTasks(startDate, endDate, (scheduleTasks: ScheduleTask[]) => {
      const tasksMap: Record<string, Record<string, string>> = {};
      const statusesMap: Record<string, Record<string, TaskStatus>> = {};
      const subTasksMap: Record<string, Record<string, SubTask[]>> = {};
      const absencesMap: Record<string, Record<string, boolean>> = {};
      const workLocationsMap: Record<string, Record<string, WorkLocation>> = {};

      scheduleTasks.forEach(task => {
        if (!tasksMap[task.employeeName]) {
          tasksMap[task.employeeName] = {};
          statusesMap[task.employeeName] = {};
          subTasksMap[task.employeeName] = {};
          absencesMap[task.employeeName] = {};
          workLocationsMap[task.employeeName] = {};
        }
        tasksMap[task.employeeName][task.taskDate] = task.taskContent;
        statusesMap[task.employeeName][task.taskDate] = task.status || 'pending';
        subTasksMap[task.employeeName][task.taskDate] = task.subTasks || [];
        absencesMap[task.employeeName][task.taskDate] = task.isAbsent || false;
        workLocationsMap[task.employeeName][task.taskDate] = task.workLocation || 'unset';
      });

      setTasks(tasksMap);
      setTaskStatuses(statusesMap);
      setSubTasks(subTasksMap);
      setAbsences(absencesMap);
      setWorkLocations(workLocationsMap);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentDate]);

  // Subscribe to weekly stats
  useEffect(() => {
    const week = getWeekDates(currentDate);
    const startDateStr = formatDate(week.days[0]);
    const endDateStr = formatDate(week.days[week.days.length - 1]);
    const unsubscribe = subscribeToWeeklyStats(startDateStr, endDateStr, (stats) => {
      setWeeklyStats(stats);
    });
    return () => unsubscribe();
  }, [currentDate]);

  const weekData = getWeekDates(currentDate);

  // Save view mode
  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('inkio_view_mode_v2', mode);
    if (mode === 'my-day') setSelectedDay(new Date());
  };

  const handlePreviousWeek = () => setCurrentDate(prev => getPreviousWeek(prev));
  const handleNextWeek = () => setCurrentDate(prev => getNextWeek(prev));

  const handleOpenModal = (employee: Employee, date: Date, currentContent: string) => {
    const dateStr = formatDate(date);
    const employeeSubTasks = subTasks[employee.name]?.[dateStr] || [];
    setSubTaskModalState({ isOpen: true, employee, date, initialSubTasks: employeeSubTasks });
  };

  const handleModalSave = async (content: string) => {
    if (modalState.employee && modalState.date) {
      const dateStr = formatDate(modalState.date);
      try { await saveTask(modalState.employee.name, dateStr, content); }
      catch (error) { console.error('Error saving task:', error); }
    }
  };

  const handleModalClose = () => {
    setModalState({ isOpen: false, employee: null, date: null, initialContent: '' });
  };

  const handleSubTaskModalSave = async (newSubTasks: SubTask[]) => {
    if (subTaskModalState.employee && subTaskModalState.date) {
      const dateStr = formatDate(subTaskModalState.date);
      try { await saveSubTasks(subTaskModalState.employee.name, dateStr, newSubTasks); }
      catch (error) {
        console.error('Error saving sub-tasks:', error);
        alert(`Chyba při ukládání úkolů: ${error instanceof Error ? error.message : 'Neznámá chyba'}`);
      }
    }
  };

  const handleSubTaskModalClose = () => {
    setSubTaskModalState({ isOpen: false, employee: null, date: null, initialSubTasks: [] });
  };

  const handleStatusChange = async (employee: Employee, date: Date, newStatus: TaskStatus) => {
    const dateStr = formatDate(date);
    setTaskStatuses(prev => ({
      ...prev,
      [employee.name]: { ...prev[employee.name], [dateStr]: newStatus }
    }));
    try { await updateTaskStatus(employee.name, dateStr, newStatus); }
    catch (error) { console.error('Error updating task status:', error); }
  };

  const handleAbsenceToggle = async (employee: Employee, date: Date) => {
    const dateStr = formatDate(date);
    const currentAbsence = absences[employee.name]?.[dateStr] || false;
    setAbsences(prev => ({
      ...prev,
      [employee.name]: { ...prev[employee.name], [dateStr]: !currentAbsence }
    }));
    try { await toggleAbsent(employee.name, dateStr, !currentAbsence); }
    catch (error) {
      console.error('Error toggling absence:', error);
      setAbsences(prev => ({
        ...prev,
        [employee.name]: { ...prev[employee.name], [dateStr]: currentAbsence }
      }));
    }
  };

  const handleWorkLocationChange = async (employee: Employee, date: Date, location: WorkLocation) => {
    const dateStr = formatDate(date);
    setWorkLocations(prev => ({
      ...prev,
      [employee.name]: { ...prev[employee.name], [dateStr]: location }
    }));
    try { await updateWorkLocation(employee.name, dateStr, location); }
    catch (error) { console.error('Error updating work location:', error); }
  };

  const handleSubTaskStatusChange = async (employeeName: string, dateStr: string, subTaskId: string, newStatus: TaskStatus) => {
    try {
      await updateSubTaskStatus(employeeName, dateStr, subTaskId, newStatus);
      if (newStatus === 'completed') {
        const dayTasks = subTasks[employeeName]?.[dateStr] || [];
        const task = dayTasks.find(t => t.id === subTaskId);
        if (task) {
          showCompletionToast(task.content);
          if (!task.timeMinutes) {
            setTimeout(() => showTimeWarningToast(task.content), 400);
          }
        }
      }
    } catch (error) { console.error('Error updating sub-task status:', error); }
  };

  // Drag and drop
  const handleDragStart = (employee: Employee, date: Date, subTaskId: string) => {
    setDraggedCell({ employeeName: employee.name, date: formatDate(date), subTaskId });
  };
  const handleDragEnd = () => setDraggedCell(null);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = async (employee: Employee, date: Date) => {
    if (!draggedCell) return;
    const targetDateStr = formatDate(date);
    if (draggedCell.employeeName === employee.name && draggedCell.date === targetDateStr) {
      setDraggedCell(null);
      return;
    }
    try {
      if (draggedCell.employeeName === employee.name) {
        await moveSubTask(employee.name, draggedCell.date, targetDateStr, draggedCell.subTaskId);
      } else {
        await moveSubTaskCrossEmployee(
          draggedCell.employeeName, draggedCell.date,
          employee.name, targetDateStr, draggedCell.subTaskId
        );
      }
    } catch (error) { console.error('Error moving sub-task:', error); }
    finally { setDraggedCell(null); }
  };

  // My employee object
  const myEmployee = useMemo(() =>
    employees.find(e => e.name === myName) || null,
    [employees, myName]
  );

  // Header cell classes for company table
  const getHeaderCellClasses = (date: Date) => {
    const today = isCurrentDay(date);
    const colWidth = today ? 'min-w-[300px] w-[300px]' : 'min-w-[190px] w-[190px]';
    let classes = `px-3 py-3 text-center font-medium text-xs border-r ${colWidth} align-top uppercase tracking-wider`;
    if (today) {
      classes += ' text-white bg-[#1765F2]';
    } else if (isWeekendDay(date)) {
      classes += ' text-slate-400 bg-gray-100 dark:bg-slate-800/60';
    } else {
      classes += ' text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900';
    }
    return classes;
  };

  const internalEmployees = employees.filter(e => e.type === 'internal');
  const externalEmployees = employees.filter(e => e.type === 'external');

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Načítání rozvrhu...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TimeReminderBanner currentDate={currentDate} />

      {/* ===== TOP BAR: View tabs + Navigation ===== */}
      <div className={`dash-toolbar ${viewMode === 'my-day' ? 'dash-toolbar-centered' : ''}`}>
        {/* View tabs */}
        <div className="dash-tabs">
          <button
            onClick={() => switchView('my-day')}
            className={`dash-tab ${viewMode === 'my-day' ? 'active' : ''}`}
          >
            <User size={14} /> Můj den
          </button>
          <button
            onClick={() => switchView('my-week')}
            className={`dash-tab ${viewMode === 'my-week' ? 'active' : ''}`}
          >
            <CalendarDays size={14} /> Můj týden
          </button>
          <button
            onClick={() => switchView('company')}
            className={`dash-tab ${viewMode === 'company' ? 'active' : ''}`}
          >
            <Users size={14} /> Firma
          </button>
        </div>

        {/* Navigation */}
        <div className="dash-nav">
          {viewMode === 'my-day' ? (
            <>
              <button onClick={() => setSelectedDay(subDays(selectedDay, 1))} className="action-btn">
                <ChevronLeft size={16} />
              </button>
              <span className="dash-nav-label">
                {isCurrentDay(selectedDay) && <span className="dash-today-dot" />}
                {formatDayName(selectedDay)} {formatDateDisplay(selectedDay)}
              </span>
              <button onClick={() => setSelectedDay(addDays(selectedDay, 1))} className="action-btn">
                <ChevronRight size={16} />
              </button>
            </>
          ) : (
            <WeekNavigation currentDate={currentDate} onPreviousWeek={handlePreviousWeek} onNextWeek={handleNextWeek} />
          )}
        </div>
      </div>

      {/* ===== MY DAY VIEW ===== */}
      {viewMode === 'my-day' && myEmployee && (() => {
        const dateStr = formatDate(selectedDay);
        const dayTasks = subTasks[myName]?.[dateStr] || [];
        const isAbsent = absences[myName]?.[dateStr] || false;
        const location = workLocations[myName]?.[dateStr] || 'unset';
        const progress = calculateProgress(dayTasks);
        const completed = dayTasks.filter(t => t.status === 'completed').length;
        const totalMin = dayTasks.reduce((s, t) => s + (t.timeMinutes || 0), 0);

        return (
          <div
            className="dash-myday"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(myEmployee, selectedDay)}
          >
            {/* Quick stats row */}
            <div className="dash-quick-stats">
              <div className="dash-stat-card">
                <CheckCircle size={16} style={{ color: '#22c55e' }} />
                <div>
                  <span className="dash-stat-value">{completed}/{dayTasks.length}</span>
                  <span className="dash-stat-label">Dokončeno</span>
                </div>
              </div>
              <div className="dash-stat-card">
                <Timer size={16} style={{ color: '#1765F2' }} />
                <div>
                  <span className="dash-stat-value">{totalMin > 0 ? formatTimeMinutes(totalMin) : '0m'}</span>
                  <span className="dash-stat-label">Čas</span>
                </div>
              </div>
              <div className="dash-stat-card">
                <MapPin size={16} style={{ color: location === 'office' ? '#22c55e' : location === 'homeoffice' ? '#1765F2' : '#94a3b8' }} />
                <div>
                  <span className="dash-stat-value">
                    {location === 'office' ? 'Kancelář' : location === 'homeoffice' ? 'Home' : '—'}
                  </span>
                  <span className="dash-stat-label">Lokace</span>
                </div>
              </div>
            </div>

            {/* Location quick toggle */}
            {!isAbsent && (
              <div className="dash-location-bar">
                <span className="dash-location-label">Dnes pracuji z:</span>
                <div className="dash-location-btns">
                  <button
                    onClick={() => handleWorkLocationChange(myEmployee, selectedDay, location === 'office' ? 'unset' : 'office')}
                    className={`dash-loc-btn ${location === 'office' ? 'active-office' : ''}`}
                  >
                    <Building2 size={13} /> Kancelář
                  </button>
                  <button
                    onClick={() => handleWorkLocationChange(myEmployee, selectedDay, location === 'homeoffice' ? 'unset' : 'homeoffice')}
                    className={`dash-loc-btn ${location === 'homeoffice' ? 'active-home' : ''}`}
                  >
                    <Home size={13} /> Homeoffice
                  </button>
                </div>
                <button
                  onClick={() => handleAbsenceToggle(myEmployee, selectedDay)}
                  className={`dash-absence-btn ${isAbsent ? 'active' : ''}`}
                >
                  <XCircle size={13} /> {isAbsent ? 'Přítomen' : 'Nepřítomen'}
                </button>
              </div>
            )}

            {/* Absent banner */}
            {isAbsent && (
              <div className="dash-absent-banner">
                <span>🚫 Dnes jste nepřítomný/á</span>
                <button onClick={() => handleAbsenceToggle(myEmployee, selectedDay)} className="dash-absent-undo">
                  Zrušit
                </button>
              </div>
            )}

            {/* Progress bar */}
            {dayTasks.length > 0 && !isAbsent && (
              <div className="dash-progress-section">
                <div className="dash-progress-header">
                  <span>Postup dne</span>
                  <span className="dash-progress-pct">{progress}%</span>
                </div>
                <div className="dash-progress-bar">
                  <div className="dash-progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {/* Task list — spacious cards */}
            <div className="dash-task-list">
              {!isAbsent && dayTasks.length === 0 && (
                <div className="dash-empty-state">
                  <Calendar size={32} />
                  <p>Žádné úkoly na dnes</p>
                  <button
                    onClick={() => handleOpenModal(myEmployee, selectedDay, '')}
                    className="dash-add-task-btn"
                  >
                    <Plus size={14} /> Přidat úkol
                  </button>
                </div>
              )}

              {!isAbsent && dayTasks.map((task) => {
                return (
                  <div
                    key={task.id}
                    className={`dash-task-card ${task.status === 'completed' ? 'completed' : task.status === 'in-progress' ? 'in-progress' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(myEmployee, selectedDay, task.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <button
                      onClick={() => handleSubTaskStatusChange(myName, dateStr, task.id, task.status === 'completed' ? 'pending' : task.status === 'in-progress' ? 'completed' : 'in-progress')}
                      className="dash-task-check"
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle size={20} className="text-emerald-500" />
                      ) : task.status === 'in-progress' ? (
                        <Timer size={20} className="text-amber-500" />
                      ) : (
                        <div className="dash-task-circle" />
                      )}
                    </button>
                    <div className="dash-task-content">
                      <span className={`dash-task-text ${task.status === 'completed' ? 'done' : ''}`}>
                        {task.content}
                      </span>
                      {task.timeMinutes > 0 && (
                        <span className="dash-task-time">
                          <Clock size={10} /> {formatTimeMinutes(task.timeMinutes)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add task button */}
              {!isAbsent && dayTasks.length > 0 && (
                <button
                  onClick={() => handleOpenModal(myEmployee, selectedDay, '')}
                  className="dash-add-inline"
                >
                  <Plus size={14} /> Přidat úkol
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ===== MY WEEK VIEW ===== */}
      {viewMode === 'my-week' && myEmployee && (
        <div className="dash-myweek">
          {weekData.days.filter(d => !isWeekendDay(d)).map((date) => {
            const dateStr = formatDate(date);
            const dayTasks = subTasks[myName]?.[dateStr] || [];
            const isAbsent = absences[myName]?.[dateStr] || false;
            const location = workLocations[myName]?.[dateStr] || 'unset';
            const progress = calculateProgress(dayTasks);
            const completed = dayTasks.filter(t => t.status === 'completed').length;
            const isToday = isCurrentDay(date);
            const totalMin = dayTasks.reduce((s, t) => s + (t.timeMinutes || 0), 0);

            return (
              <div
                key={dateStr}
                className={`dash-weekday-card ${isToday ? 'today' : ''} ${isAbsent ? 'absent' : ''}`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(myEmployee, date)}
              >
                {/* Day header */}
                <div className="dash-weekday-header">
                  <div className="dash-weekday-name">
                    {isToday && <span className="dash-today-dot" />}
                    <span>{formatDayName(date)}</span>
                    <span className="dash-weekday-date">{formatDateDisplay(date)}</span>
                  </div>
                  <div className="dash-weekday-meta">
                    {location === 'office' && <span className="dash-loc-badge office">🏢</span>}
                    {location === 'homeoffice' && <span className="dash-loc-badge home">🏠</span>}
                    {totalMin > 0 && (
                      <span className="dash-time-badge"><Clock size={10} /> {formatTimeMinutes(totalMin)}</span>
                    )}
                  </div>
                </div>

                {/* Location + absence toggles */}
                {!isAbsent && (
                  <div className="flex items-center gap-1 px-3 pb-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleWorkLocationChange(myEmployee, date, location === 'office' ? 'unset' : 'office')}
                      className={`flex-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all border ${location === 'office'
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                        : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-300 hover:text-emerald-500'
                      }`}
                    >
                      🏢 Kancelář
                    </button>
                    <button
                      onClick={() => handleWorkLocationChange(myEmployee, date, location === 'homeoffice' ? 'unset' : 'homeoffice')}
                      className={`flex-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all border ${location === 'homeoffice'
                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                        : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300 hover:text-blue-500'
                      }`}
                    >
                      🏠 Home
                    </button>
                    <button
                      onClick={() => handleAbsenceToggle(myEmployee, date)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500"
                      title="Nepřítomen"
                    >
                      🚫
                    </button>
                  </div>
                )}

                {/* Absent banner inline */}
                {isAbsent && (
                  <div className="px-3 pb-1" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between bg-red-50 rounded-lg px-2 py-1">
                      <span className="text-[10px] text-red-500 font-medium">🚫 Nepřítomen</span>
                      <button
                        onClick={() => handleAbsenceToggle(myEmployee, date)}
                        className="text-[10px] text-red-400 hover:text-red-600 font-medium underline"
                      >
                        Zrušit
                      </button>
                    </div>
                  </div>
                )}

                {/* Tasks */}
                <div className="dash-weekday-tasks" onClick={(e) => e.stopPropagation()}>
                  {isAbsent ? (
                    <div className="dash-weekday-empty" style={{ opacity: 0.5 }}>Úkoly skryté</div>
                  ) : dayTasks.length === 0 ? (
                    <div className="dash-weekday-empty">
                      Žádné úkoly
                      <button
                        onClick={() => handleOpenModal(myEmployee, date, '')}
                        className="ml-2 text-[10px] text-blue-500 hover:text-blue-700 font-semibold"
                      >
                        + Přidat
                      </button>
                    </div>
                  ) : (
                    <>
                      {dayTasks.map(task => (
                        <div
                          key={task.id}
                          className={`dash-mini-task ${task.status}`}
                          draggable
                          onDragStart={() => handleDragStart(myEmployee, date, task.id)}
                          onDragEnd={handleDragEnd}
                        >
                          <button
                            onClick={() => handleSubTaskStatusChange(myName, dateStr, task.id,
                              task.status === 'completed' ? 'pending' : task.status === 'in-progress' ? 'completed' : 'in-progress'
                            )}
                            className="dash-mini-check"
                          >
                            {task.status === 'completed' ? '✅' : task.status === 'in-progress' ? '⏳' : '⚪'}
                          </button>
                          <span className={`dash-mini-text ${task.status === 'completed' ? 'done' : ''}`}>
                            {task.content}
                          </span>
                          {task.timeMinutes > 0 && (
                            <span className="text-[9px] text-slate-400 ml-auto flex-shrink-0">
                              {formatTimeMinutes(task.timeMinutes)}
                            </span>
                          )}
                        </div>
                      ))}
                      {/* Add task inline */}
                      <button
                        onClick={() => handleOpenModal(myEmployee, date, '')}
                        className="w-full text-left px-2 py-1 text-[10px] text-blue-400 hover:text-blue-600 font-medium transition-colors"
                      >
                        + Přidat úkol
                      </button>
                    </>
                  )}
                </div>

                {/* Progress */}
                {dayTasks.length > 0 && !isAbsent && (
                  <div className="dash-weekday-progress">
                    <div className="dash-weekday-progress-bar">
                      <div className="dash-weekday-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="dash-weekday-progress-label">{completed}/{dayTasks.length}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== COMPANY VIEW (original table) ===== */}
      {viewMode === 'company' && (
        <div className="rounded-xl shadow-sm table-with-sticky-header"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <table className="w-full min-w-[1720px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="sticky-left px-2 py-3 text-left text-[10px] font-bold uppercase tracking-widest border-r min-w-[120px] w-[120px] align-middle"
                  style={{ background: 'var(--surface)', color: 'var(--text-muted)', borderColor: 'var(--border-light)' }}>
                  Zaměstnanec
                </th>
                {weekData.days.map((date) => (
                  <th key={formatDate(date)} className={getHeaderCellClasses(date)}
                    style={{
                      borderColor: 'var(--border-light)',
                      ...(isCurrentDay(date) ? { background: '#1765F2', color: '#ffffff' } : {})
                    }}>
                    <div className="font-bold text-xs tracking-wide" style={isCurrentDay(date) ? { color: '#ffffff' } : {}}>{formatDayName(date)}</div>
                    <div className="text-[11px] font-medium mt-0.5" style={isCurrentDay(date) ? { color: 'rgba(255,255,255,0.8)' } : { opacity: 0.75 }}>{formatDateDisplay(date)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {internalEmployees.length > 0 && (
                <tr>
                  <td colSpan={8} className="sticky-left sticky left-0 px-4 py-1.5" style={{ background: 'var(--success-bg)', borderBottom: '1px solid rgba(16,185,129,0.1)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Interní tým</span>
                      <span className="text-[10px] text-emerald-400 font-medium">{internalEmployees.length}</span>
                    </div>
                  </td>
                </tr>
              )}
              {internalEmployees.map((employee) => (
                <EmployeeRow
                  key={employee.name}
                  employee={employee}
                  weekDays={weekData.days}
                  tasks={tasks[employee.name] || {}}
                  taskStatuses={taskStatuses[employee.name] || {}}
                  subTasks={subTasks[employee.name] || {}}
                  absences={absences[employee.name] || {}}
                  workLocations={workLocations[employee.name] || {}}
                  onOpenModal={handleOpenModal}
                  onStatusChange={handleStatusChange}
                  onAbsenceToggle={handleAbsenceToggle}
                  onWorkLocationChange={handleWorkLocationChange}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  draggedCell={draggedCell}
                  yearlyStats={weeklyStats[employee.name]}
                  avatarId={employee.avatarId}
                />
              ))}
              {externalEmployees.length > 0 && (
                <tr>
                  <td colSpan={8} className="sticky-left sticky left-0 px-4 py-1.5"
                    style={{ background: 'var(--primary-bg)', borderBottom: '1px solid rgba(99,102,241,0.1)', borderTop: '1px solid var(--border-light)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Externí tým</span>
                      <span className="text-[10px] text-blue-400 font-medium">{externalEmployees.length}</span>
                    </div>
                  </td>
                </tr>
              )}
              {externalEmployees.map((employee) => (
                <EmployeeRow
                  key={employee.name}
                  employee={employee}
                  weekDays={weekData.days}
                  tasks={tasks[employee.name] || {}}
                  taskStatuses={taskStatuses[employee.name] || {}}
                  subTasks={subTasks[employee.name] || {}}
                  absences={absences[employee.name] || {}}
                  workLocations={workLocations[employee.name] || {}}
                  onOpenModal={handleOpenModal}
                  onStatusChange={handleStatusChange}
                  onAbsenceToggle={handleAbsenceToggle}
                  onWorkLocationChange={handleWorkLocationChange}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  draggedCell={draggedCell}
                  yearlyStats={weeklyStats[employee.name]}
                  avatarId={employee.avatarId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No employee match notice */}
      {(viewMode === 'my-day' || viewMode === 'my-week') && !myEmployee && (
        <div className="dash-empty-state" style={{ padding: '60px 20px' }}>
          <User size={40} />
          <h3 className="text-base font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
            Profil nenalezen
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Vaše jméno ({myName || 'nepřipojen'}) neodpovídá žádnému zaměstnanci.
            Přepněte na zobrazení „Firma" nebo kontaktujte admina.
          </p>
          <button onClick={() => switchView('company')} className="dash-add-task-btn mt-2">
            <Users size={14} /> Zobrazit firmu
          </button>
        </div>
      )}

      {/* Modals (shared) */}
      <TaskEditModal
        isOpen={modalState.isOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        employee={modalState.employee || employees[0]}
        date={modalState.date || new Date()}
        initialContent={modalState.initialContent}
        isAbsent={modalState.employee && modalState.date
          ? absences[modalState.employee.name]?.[formatDate(modalState.date)] || false : false}
        onAbsenceToggle={() => {
          if (modalState.employee && modalState.date) handleAbsenceToggle(modalState.employee, modalState.date);
        }}
      />

      <SubTaskEditModal
        isOpen={subTaskModalState.isOpen}
        onClose={handleSubTaskModalClose}
        onSave={handleSubTaskModalSave}
        employee={subTaskModalState.employee || employees[0]}
        date={subTaskModalState.date || new Date()}
        initialSubTasks={subTaskModalState.initialSubTasks}
        isAbsent={subTaskModalState.employee && subTaskModalState.date
          ? absences[subTaskModalState.employee.name]?.[formatDate(subTaskModalState.date)] || false : false}
        onAbsenceToggle={() => {
          if (subTaskModalState.employee && subTaskModalState.date) handleAbsenceToggle(subTaskModalState.employee, subTaskModalState.date);
        }}
        employees={employees}
      />

      <CompletionToast />
    </div>
  );
}
