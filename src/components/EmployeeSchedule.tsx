'use client';

import { useState, useEffect } from 'react';
import WeekNavigation from './WeekNavigation';
import EmployeeRow from './EmployeeRow';
import TaskEditModal from './TaskEditModal';
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
import { subscribeToTasks, ScheduleTask, saveTask, TaskStatus, updateTaskStatus } from '@/lib/database';

interface ModalState {
  isOpen: boolean;
  employee: Employee | null;
  date: Date | null;
  initialContent: string;
}

export default function EmployeeSchedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Record<string, Record<string, string>>>({});
  const [taskStatuses, setTaskStatuses] = useState<Record<string, Record<string, TaskStatus>>>({});
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    employee: null,
    date: null,
    initialContent: ''
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

      scheduleTasks.forEach(task => {
        if (!tasksMap[task.employeeName]) {
          tasksMap[task.employeeName] = {};
          statusesMap[task.employeeName] = {};
        }
        tasksMap[task.employeeName][task.taskDate] = task.taskContent;
        statusesMap[task.employeeName][task.taskDate] = task.status || 'pending';
      });

      setTasks(tasksMap);
      setTaskStatuses(statusesMap);
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
    setModalState({
      isOpen: true,
      employee,
      date,
      initialContent: currentContent
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

  // Výpočet týdenních dat pro render
  const weekData = getWeekDates(currentDate);

  const getHeaderCellClasses = (date: Date) => {
    let classes = 'px-2 sm:px-4 py-3 text-center border-r border-gray-300 w-[120px] sm:w-[150px] max-w-[120px] sm:max-w-[150px]';

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
        <div className="max-w-7xl mx-auto">
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
      <div className="max-w-7xl mx-auto">
        {/* Hlavička */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Rozvrh zaměstnanců Inkio
          </h1>
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
            <table className="w-full min-w-[800px]">
              {/* Hlavička tabulky */}
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="sticky left-0 bg-gray-100 px-2 sm:px-4 py-3 text-left font-semibold text-gray-900 border-r border-gray-300 min-w-[160px] sm:min-w-[200px] z-10">
                    <span className="hidden sm:inline">Zaměstnanec</span>
                    <span className="sm:hidden">Jméno</span>
                  </th>
                  {weekData.days.map((date) => (
                    <th key={formatDate(date)} className={getHeaderCellClasses(date)}>
                      <div className="space-y-1">
                        <div className="font-semibold text-xs sm:text-sm">
                          <span className="hidden sm:inline">{formatDayName(date)}</span>
                          <span className="sm:hidden">{formatDayName(date).substring(0, 2)}</span>
                        </div>
                        <div className="text-xs sm:text-sm font-normal">
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
                    onOpenModal={handleOpenModal}
                    onStatusChange={handleStatusChange}
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
              <span className="text-xs">💡 Tip: Dvojklik pro editaci, pravý klik pro status</span>
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
        />
      </div>
    </div>
  );
}
