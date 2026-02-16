'use client';

import { useState, useEffect } from 'react';
import WeekNavigation from './WeekNavigation';
import EmployeeRow from './EmployeeRow';
import TaskEditModal from './TaskEditModal';
import SubTaskEditModal from './SubTaskEditModal';
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
import { subscribeToTasks, ScheduleTask, saveTask, TaskStatus, updateTaskStatus, SubTask, saveSubTasks, toggleAbsent, moveSubTask, moveSubTaskCrossEmployee, WorkLocation, updateWorkLocation, WeeklyStats, subscribeToWeeklyStats } from '@/lib/database';
import { isDevelopment, getEnvironmentName, getFirebaseProjectId } from '@/lib/environment';
import { subscribeToEmployees, EmployeeDocument } from '@/lib/employees';
import { Settings, Keyboard } from 'lucide-react';
import CompletionToast from './CompletionToast';

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

export default function EmployeeSchedule() {
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
  const [showHelp, setShowHelp] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    employee: null,
    date: null,
    initialContent: ''
  });
  const [subTaskModalState, setSubTaskModalState] = useState<SubTaskModalState>({
    isOpen: false,
    employee: null,
    date: null,
    initialSubTasks: []
  });

  // Subscribe to employees
  useEffect(() => {
    const unsubscribe = subscribeToEmployees((employeeList: EmployeeDocument[]) => {
      const employeesData: Employee[] = employeeList.map(emp => ({
        name: emp.name,
        position: emp.position,
        type: emp.type
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

  // Subscribe to weekly stats (re-subscribe when week changes)
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

  const handlePreviousWeek = () => setCurrentDate(prev => getPreviousWeek(prev));
  const handleNextWeek = () => setCurrentDate(prev => getNextWeek(prev));

  const handleOpenModal = (employee: Employee, date: Date, currentContent: string) => {
    const dateStr = formatDate(date);
    const employeeSubTasks = subTasks[employee.name]?.[dateStr] || [];
    setSubTaskModalState({
      isOpen: true,
      employee,
      date,
      initialSubTasks: employeeSubTasks
    });
  };

  const handleModalSave = async (content: string) => {
    if (modalState.employee && modalState.date) {
      const dateStr = formatDate(modalState.date);
      try {
        await saveTask(modalState.employee.name, dateStr, content);
      } catch (error) {
        console.error('Error saving task:', error);
      }
    }
  };

  const handleModalClose = () => {
    setModalState({ isOpen: false, employee: null, date: null, initialContent: '' });
  };

  const handleSubTaskModalSave = async (newSubTasks: SubTask[]) => {
    if (subTaskModalState.employee && subTaskModalState.date) {
      const dateStr = formatDate(subTaskModalState.date);
      try {
        await saveSubTasks(subTaskModalState.employee.name, dateStr, newSubTasks);
      } catch (error) {
        console.error('Error saving sub-tasks:', error);
        const errorMessage = error instanceof Error ? error.message : 'Neznámá chyba';
        alert(`Chyba při ukládání úkolů: ${errorMessage}\n\nZkuste to prosím znovu.`);
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
    try {
      await updateTaskStatus(employee.name, dateStr, newStatus);
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleAbsenceToggle = async (employee: Employee, date: Date) => {
    const dateStr = formatDate(date);
    const currentAbsence = absences[employee.name]?.[dateStr] || false;
    setAbsences(prev => ({
      ...prev,
      [employee.name]: { ...prev[employee.name], [dateStr]: !currentAbsence }
    }));
    try {
      await toggleAbsent(employee.name, dateStr, !currentAbsence);
    } catch (error) {
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
    try {
      await updateWorkLocation(employee.name, dateStr, location);
    } catch (error) {
      console.error('Error updating work location:', error);
      setWorkLocations(prev => ({
        ...prev,
        [employee.name]: { ...prev[employee.name], [dateStr]: prev[employee.name]?.[dateStr] || 'unset' }
      }));
    }
  };

  // Drag and drop
  const handleDragStart = (employee: Employee, date: Date, subTaskId: string) => {
    const dateStr = formatDate(date);
    setDraggedCell({ employeeName: employee.name, date: dateStr, subTaskId });
  };
  const handleDragEnd = () => setDraggedCell(null);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = async (employee: Employee, date: Date) => {
    if (!draggedCell) return;
    const targetDateStr = formatDate(date);

    // Same employee, same date — nothing to do
    if (draggedCell.employeeName === employee.name && draggedCell.date === targetDateStr) {
      setDraggedCell(null);
      return;
    }

    try {
      if (draggedCell.employeeName === employee.name) {
        // Same employee, different date
        await moveSubTask(employee.name, draggedCell.date, targetDateStr, draggedCell.subTaskId);
      } else {
        // Different employee (and possibly different date)
        await moveSubTaskCrossEmployee(
          draggedCell.employeeName,
          draggedCell.date,
          employee.name,
          targetDateStr,
          draggedCell.subTaskId
        );
      }
    } catch (error) {
      console.error('Error moving sub-task:', error);
    } finally {
      setDraggedCell(null);
    }
  };

  // Header cell classes
  const getHeaderCellClasses = (date: Date) => {
    let classes = 'px-3 py-3 text-center font-medium text-xs border-r border-slate-100 min-w-[220px] w-[220px] align-top uppercase tracking-wider';
    if (isCurrentDay(date)) {
      classes += ' bg-indigo-600 text-white';
    } else if (isWeekendDay(date)) {
      classes += ' bg-slate-50 text-slate-400';
    } else {
      classes += ' bg-white text-slate-500';
    }
    return classes;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-400 font-medium">Načítání...</p>
        </div>
      </div>
    );
  }

  const internalEmployees = employees.filter(e => e.type === 'internal');
  const externalEmployees = employees.filter(e => e.type === 'external');

  return (
    <div className="min-h-screen bg-slate-50/80">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">I</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">Inkio Schedule</h1>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Týdenní plánování úkolů</p>
              </div>
              {isDevelopment() && (
                <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold rounded-md">
                  DEV
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="action-btn"
                title="Nápověda"
              >
                <Keyboard size={16} />
              </button>
              <button
                onClick={() => window.location.href = '/admin'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all"
              >
                <Settings size={14} />
                Admin
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-4">
        {/* Help banner */}
        {showHelp && (
          <div className="mb-4 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-start gap-3 animate-fade-in">
            <span className="text-sm">💡</span>
            <div className="flex-1 text-xs text-indigo-700 space-y-1">
              <p><strong>Klik</strong> na buňku → editace úkolů · <strong>Pravý klik</strong> → status + lokace · <strong>Drag</strong> → přesun úkolů mezi dny</p>
            </div>
            <button onClick={() => setShowHelp(false)} className="text-indigo-400 hover:text-indigo-600 text-xs font-bold">✕</button>
          </div>
        )}

        {/* Week navigation */}
        <div className="mb-4">
          <WeekNavigation currentDate={currentDate} onPreviousWeek={handlePreviousWeek} onNextWeek={handleNextWeek} />
        </div>

        {/* Main table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 table-with-sticky-header">
          <table className="w-full min-w-[1720px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="sticky-left bg-white px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 border-r border-slate-100 min-w-[180px] w-[180px] align-middle">
                  Zaměstnanec
                </th>
                {weekData.days.map((date) => (
                  <th key={formatDate(date)} className={getHeaderCellClasses(date)}>
                    <div className="font-bold text-xs tracking-wide">{formatDayName(date)}</div>
                    <div className="text-[11px] font-medium mt-0.5 opacity-75">{formatDateDisplay(date)}</div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Internal employees */}
              {internalEmployees.length > 0 && (
                <tr>
                  <td colSpan={8} className="sticky-left sticky left-0 px-4 py-1.5 bg-emerald-50/50 border-b border-emerald-100/50">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Interní tým</span>
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
                />
              ))}

              {/* External employees */}
              {externalEmployees.length > 0 && (
                <tr>
                  <td colSpan={8} className="sticky-left sticky left-0 px-4 py-1.5 bg-blue-50/50 border-b border-blue-100/50 border-t border-t-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Externí tým</span>
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
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Compact footer legend */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400 font-medium px-1">
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span> Interní</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span> Externí</span>
          <span>·</span>
          <span>🏢 Kancelář</span>
          <span>🏠 Homeoffice</span>
          <span>🚫 Nepřítomen</span>
          <span>·</span>
          <span>✅ Hotovo</span>
          <span>⏳ Rozpracováno</span>
          <span>⚪ Čeká</span>
        </div>
      </div>

      {/* Modals */}
      <TaskEditModal
        isOpen={modalState.isOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        employee={modalState.employee || employees[0]}
        date={modalState.date || new Date()}
        initialContent={modalState.initialContent}
        isAbsent={modalState.employee && modalState.date
          ? absences[modalState.employee.name]?.[formatDate(modalState.date)] || false
          : false}
        onAbsenceToggle={() => {
          if (modalState.employee && modalState.date) {
            handleAbsenceToggle(modalState.employee, modalState.date);
          }
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
          ? absences[subTaskModalState.employee.name]?.[formatDate(subTaskModalState.date)] || false
          : false}
        onAbsenceToggle={() => {
          if (subTaskModalState.employee && subTaskModalState.date) {
            handleAbsenceToggle(subTaskModalState.employee, subTaskModalState.date);
          }
        }}
        employees={employees}
      />

      <CompletionToast />
    </div>
  );
}
