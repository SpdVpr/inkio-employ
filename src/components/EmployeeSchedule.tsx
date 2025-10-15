'use client';

import { useState, useEffect } from 'react';
import WeekNavigation from './WeekNavigation';
import EmployeeRow from './EmployeeRow';
import TaskEditModal from './TaskEditModal';
import SubTaskEditModal from './SubTaskEditModal';
import {
  employees,
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
import { subscribeToTasks, ScheduleTask, saveTask, TaskStatus, updateTaskStatus, SubTask, saveSubTasks, toggleAbsent, moveSubTask } from '@/lib/database';
import { isDevelopment, getEnvironmentName, getFirebaseProjectId } from '@/lib/environment';

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
  const [tasks, setTasks] = useState<Record<string, Record<string, string>>>({});
  const [taskStatuses, setTaskStatuses] = useState<Record<string, Record<string, TaskStatus>>>({});
  const [subTasks, setSubTasks] = useState<Record<string, Record<string, SubTask[]>>>({});
  const [absences, setAbsences] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [draggedCell, setDraggedCell] = useState<DragData | null>(null);
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

  // Přihlášení k odběru úkolů pro aktuální týden
  useEffect(() => {
    const weekData = getWeekDates(currentDate);
    const startDate = formatDate(weekData.start);
    const endDate = formatDate(weekData.end);

    setLoading(true);

    const unsubscribe = subscribeToTasks(startDate, endDate, (scheduleTasks: ScheduleTask[]) => {
      // Převedeme pole úkolů na strukturu pro rychlé vyhledávání
      const tasksMap: Record<string, Record<string, string>> = {};
      const statusesMap: Record<string, Record<string, TaskStatus>> = {};
      const subTasksMap: Record<string, Record<string, SubTask[]>> = {};
      const absencesMap: Record<string, Record<string, boolean>> = {};

      scheduleTasks.forEach(task => {
        if (!tasksMap[task.employeeName]) {
          tasksMap[task.employeeName] = {};
          statusesMap[task.employeeName] = {};
          subTasksMap[task.employeeName] = {};
          absencesMap[task.employeeName] = {};
        }
        tasksMap[task.employeeName][task.taskDate] = task.taskContent;
        statusesMap[task.employeeName][task.taskDate] = task.status || 'pending';
        subTasksMap[task.employeeName][task.taskDate] = task.subTasks || [];
        absencesMap[task.employeeName][task.taskDate] = task.isAbsent || false;
      });

      setTasks(tasksMap);
      setTaskStatuses(statusesMap);
      setSubTasks(subTasksMap);
      setAbsences(absencesMap);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentDate]); // Závislost pouze na currentDate, ne na weekData objektu

  const handlePreviousWeek = () => {
    setCurrentDate(prev => getPreviousWeek(prev));
  };

  const handleNextWeek = () => {
    setCurrentDate(prev => getNextWeek(prev));
  };

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
        console.log('Saving sub-tasks for:', subTaskModalState.employee.name, dateStr, newSubTasks);
        await saveSubTasks(subTaskModalState.employee.name, dateStr, newSubTasks);
        console.log('Sub-tasks saved successfully');
      } catch (error) {
        console.error('Error saving sub-tasks:', error);

        // Zobraz uživateli chybu
        const errorMessage = error instanceof Error ? error.message : 'Neznámá chyba';
        alert(`Chyba při ukládání úkolů: ${errorMessage}\n\nZkuste to prosím znovu nebo kontaktujte podporu.`);
      }
    } else {
      console.error('Missing employee or date for saving sub-tasks');
      alert('Chyba: Chybí informace o zaměstnanci nebo datu.');
    }
  };

  const handleSubTaskModalClose = () => {
    setSubTaskModalState({
      isOpen: false,
      employee: null,
      date: null,
      initialSubTasks: []
    });
  };

  const handleStatusChange = async (employee: Employee, date: Date, newStatus: TaskStatus) => {
    const dateStr = formatDate(date);

    // Optimistické update
    setTaskStatuses(prev => ({
      ...prev,
      [employee.name]: {
        ...prev[employee.name],
        [dateStr]: newStatus
      }
    }));

    try {
      await updateTaskStatus(employee.name, dateStr, newStatus);
    } catch (error) {
      console.error('Error updating task status:', error);
      // Vrať původní status při chybě
      setTaskStatuses(prev => ({
        ...prev,
        [employee.name]: {
          ...prev[employee.name],
          [dateStr]: prev[employee.name]?.[dateStr] || 'pending'
        }
      }));
    }
  };

  const handleAbsenceToggle = async (employee: Employee, date: Date) => {
    const dateStr = formatDate(date);
    const currentAbsence = absences[employee.name]?.[dateStr] || false;
    const newAbsence = !currentAbsence;

    // Optimistické update
    setAbsences(prev => ({
      ...prev,
      [employee.name]: {
        ...prev[employee.name],
        [dateStr]: newAbsence
      }
    }));

    try {
      await toggleAbsent(employee.name, dateStr, newAbsence);
    } catch (error) {
      console.error('Error toggling absence:', error);
      // Vrať původní stav při chybě
      setAbsences(prev => ({
        ...prev,
        [employee.name]: {
          ...prev[employee.name],
          [dateStr]: currentAbsence
        }
      }));
    }
  };

  // Drag and drop handlers for sub-tasks
  const handleDragStart = (employee: Employee, date: Date, subTaskId: string) => {
    const dateStr = formatDate(date);
    setDraggedCell({
      employeeName: employee.name,
      date: dateStr,
      subTaskId
    });
  };

  const handleDragEnd = () => {
    setDraggedCell(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Nutné pro povolení drop
  };

  const handleDrop = async (employee: Employee, date: Date) => {
    if (!draggedCell) return;

    const targetDateStr = formatDate(date);
    
    // Kontrola, zda se jedná o stejného zaměstnance
    if (draggedCell.employeeName !== employee.name) {
      console.log('Cannot move sub-tasks between different employees');
      setDraggedCell(null);
      return;
    }

    // Kontrola, zda se nejedná o stejnou buňku
    if (draggedCell.date === targetDateStr) {
      setDraggedCell(null);
      return;
    }

    try {
      await moveSubTask(employee.name, draggedCell.date, targetDateStr, draggedCell.subTaskId);
      console.log(`Sub-task ${draggedCell.subTaskId} moved from ${draggedCell.date} to ${targetDateStr}`);
    } catch (error) {
      console.error('Error moving sub-task:', error);
      alert('Chyba při přesunu úkolu. Zkuste to prosím znovu.');
    } finally {
      setDraggedCell(null);
    }
  };

  // Funkce pro přechod na další zaměstnance odstraněna - už není potřeba

  // Výpočet týdenních dat pro render
  const weekData = getWeekDates(currentDate);

  const getHeaderCellClasses = (date: Date) => {
    let classes = 'px-4 py-3 text-center border-r border-gray-300 w-[240px] min-w-[240px] max-w-[240px]';

    if (isCurrentDay(date)) {
      classes += ' bg-blue-200 font-semibold text-blue-900';
    } else if (isWeekendDay(date)) {
      classes += ' bg-gray-200 text-gray-700';
    } else {
      classes += ' bg-gray-50 text-gray-900';
    }

    return classes;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Načítání rozvrhu...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-[1920px] mx-auto">
        {/* Hlavička */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Rozvrh zaměstnanců Inkio
            </h1>
            {isDevelopment() && (
              <div className="px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-full">
                <span className="text-xs font-medium text-yellow-800">
                  🚧 {getEnvironmentName()} ({getFirebaseProjectId()})
                </span>
              </div>
            )}
          </div>
          <p className="text-gray-600">
            Týdenní plánování úkolů pro interní a externí zaměstnance
          </p>
        </div>

        {/* Navigace mezi týdny */}
        <WeekNavigation
          currentDate={currentDate}
          onPreviousWeek={handlePreviousWeek}
          onNextWeek={handleNextWeek}
        />

        {/* Hlavní tabulka */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1880px]">
              {/* Hlavička tabulky */}
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="sticky left-0 bg-gray-100 px-4 py-3 text-left font-semibold text-gray-900 border-r border-gray-300 min-w-[200px] w-[200px] z-10 h-[60px] align-top">
                    Zaměstnanec
                  </th>
                  {weekData.days.map((date) => (
                    <th key={formatDate(date)} className={getHeaderCellClasses(date)}>
                      <div className="space-y-1">
                        <div className="font-semibold text-sm">
                          {formatDayName(date)}
                        </div>
                        <div className="text-sm font-normal">
                          {formatDateDisplay(date)}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Tělo tabulky */}
              <tbody>
                {employees.map((employee) => (
                  <EmployeeRow
                    key={employee.name}
                    employee={employee}
                    weekDays={weekData.days}
                    tasks={tasks[employee.name] || {}}
                    taskStatuses={taskStatuses[employee.name] || {}}
                    subTasks={subTasks[employee.name] || {}}
                    absences={absences[employee.name] || {}}
                    onOpenModal={handleOpenModal}
                    onStatusChange={handleStatusChange}
                    onAbsenceToggle={handleAbsenceToggle}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    draggedCell={draggedCell}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legenda */}
        <div className="mt-6 bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-3">Legenda:</h3>
          <div className="flex flex-wrap gap-4 text-sm text-gray-900">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Interní zaměstnanci</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Externí zaměstnanci</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-blue-200 rounded"></div>
              <span>Dnešní den</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-gray-200 rounded"></div>
              <span>Víkend</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-green-100 rounded border border-green-300"></div>
              <span>✅ Hotovo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-orange-100 rounded border border-orange-300"></div>
              <span>⏳ Rozpracováno</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-red-100 rounded border border-red-300"></div>
              <span>🚫 Nepřítomen</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">💡 Tip: Klik na buňku pro editaci úkolů, pravý klik pro změnu statusu, přetáhněte jednotlivé úkoly mezi dny myší</span>
            </div>
          </div>
        </div>

        {/* Modal pro rozšířenou editaci */}
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

        {/* Modal pro editaci sub-úkolů */}
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
        />
      </div>
    </div>
  );
}
