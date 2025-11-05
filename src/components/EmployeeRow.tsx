'use client';

import { useState, useEffect } from 'react';
import { Employee, formatDate, getCellClasses, getEmployeeRowClasses, getStatusIcon } from '@/lib/utils';
import { TaskStatus, SubTask, calculateProgress, updateSubTaskStatus } from '@/lib/database';
import { MoreVertical } from 'lucide-react';
import SubTaskList from './SubTaskList';
import ProgressBar from './ProgressBar';

interface DragData {
  employeeName: string;
  date: string;
  subTaskId: string;
}

interface EmployeeRowProps {
  employee: Employee;
  weekDays: Date[];
  tasks: Record<string, string>; // date -> task content
  taskStatuses: Record<string, TaskStatus>; // date -> task status
  subTasks: Record<string, SubTask[]>; // date -> sub tasks
  absences: Record<string, boolean>; // date -> is absent
  onOpenModal: (employee: Employee, date: Date, currentContent: string) => void;
  onStatusChange: (employee: Employee, date: Date, status: TaskStatus) => void;
  onAbsenceToggle: (employee: Employee, date: Date) => void;
  onDragStart: (employee: Employee, date: Date, subTaskId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (employee: Employee, date: Date) => void;
  draggedCell: DragData | null;
}

export default function EmployeeRow({ 
  employee, 
  weekDays, 
  tasks, 
  taskStatuses, 
  subTasks, 
  absences, 
  onOpenModal, 
  onStatusChange, 
  onAbsenceToggle,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  draggedCell
}: EmployeeRowProps) {
  const [showStatusMenu, setShowStatusMenu] = useState<string | null>(null);

  const handleCellClick = (date: Date) => {
    // Otevři modal pro editaci sub-úkolů
    const dateStr = formatDate(date);
    const currentContent = tasks[dateStr] || '';
    onOpenModal(employee, date, currentContent);
  };

  const handleContextMenu = (e: React.MouseEvent, date: Date) => {
    e.preventDefault();
    const dateStr = formatDate(date);
    setShowStatusMenu(showStatusMenu === dateStr ? null : dateStr);
  };

  const handleStatusSelect = (date: Date, status: TaskStatus) => {
    onStatusChange(employee, date, status);
    setShowStatusMenu(null);
  };

  const handleSubTaskStatusChange = async (date: Date, subTaskId: string, newStatus: TaskStatus) => {
    const dateStr = formatDate(date);
    try {
      await updateSubTaskStatus(employee.name, dateStr, subTaskId, newStatus);
    } catch (error) {
      console.error('Error updating sub-task status:', error);
    }
  };

  // Zavři status menu při kliku mimo
  useEffect(() => {
    const handleClickOutside = () => setShowStatusMenu(null);
    if (showStatusMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showStatusMenu]);

  return (
    <tr className={getEmployeeRowClasses(employee)}>
      {/* Jméno zaměstnance */}
      <th className="sticky-left sticky left-0 bg-white border-r border-gray-200 p-3 w-[200px] min-w-[200px] max-w-[200px] h-[120px] align-top text-left font-normal">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full flex-shrink-0 ${
              employee.type === 'internal' ? 'bg-green-500' : 'bg-blue-500'
            }`}
          />
          <div className="flex-1 min-w-0">
            <div className="text-base font-medium text-gray-900 truncate">
              {employee.name}
            </div>
            <div className="text-sm text-gray-500 truncate">
              {employee.position}
            </div>
          </div>
        </div>
      </th>

      {/* Buňky pro jednotlivé dny - pouze náhled */}
      {weekDays.map((date) => {
        const dateStr = formatDate(date);
        const taskContent = tasks[dateStr] || '';
        const taskStatus = taskStatuses[dateStr] || 'pending';
        const daySubTasks = subTasks[dateStr] || [];
        const progress = calculateProgress(daySubTasks);
        const isAbsent = absences[dateStr] || false;
        const isMenuOpen = showStatusMenu === dateStr;
        const isDragTarget = draggedCell && draggedCell.employeeName === employee.name && draggedCell.date !== dateStr;

        return (
          <td
            key={dateStr}
            className={`${getCellClasses(date, false, taskStatus, progress, isAbsent)} relative group ${
              isDragTarget ? 'ring-2 ring-blue-400 ring-inset' : ''
            }`}
            data-employee={employee.name}
            data-date={dateStr}
            onDragOver={onDragOver}
            onDrop={() => onDrop(employee, date)}
            onClick={() => handleCellClick(date)}
            onContextMenu={(e) => handleContextMenu(e, date)}
          >
            {/* Obsah buňky - pouze náhled */}
            <div className="h-[116px] p-3 text-sm text-gray-900 relative overflow-hidden flex flex-col">
              {/* Indikátor nepřítomnosti */}
              {isAbsent && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-90">
                  <div className="text-center">
                    <div className="text-3xl mb-1">🚫</div>
                    <div className="text-sm font-semibold text-red-700">Nepřítomen</div>
                  </div>
                </div>
              )}

              {/* Sub-úkoly náhled */}
              <div className="flex-1 overflow-hidden pr-6 pb-6">
                <SubTaskList
                  subTasks={daySubTasks}
                  maxVisible={5}
                  onStatusChange={(subTaskId, newStatus) => 
                    handleSubTaskStatusChange(date, subTaskId, newStatus)
                  }
                  onSubTaskClick={(subTask) => {
                    // Otevři modal při kliku na sub-úkol
                    handleCellClick(date);
                  }}
                  onDragStart={(subTaskId) => onDragStart(employee, date, subTaskId)}
                  onDragEnd={onDragEnd}
                  draggedSubTaskId={draggedCell?.subTaskId}
                />
              </div>

              {/* Progress bar - zobrazí se pouze pokud jsou sub-úkoly */}
              {daySubTasks.length > 0 && (
                <div className="absolute bottom-1 left-3 right-8">
                  <ProgressBar
                    progress={progress}
                    total={daySubTasks.length}
                    completed={daySubTasks.filter(st => st.status === 'completed').length}
                    showPercentage={true}
                    showCounts={false}
                    size="md"
                  />
                </div>
              )}

              {/* Status ikona - pouze pokud nejsou sub-úkoly */}
              {daySubTasks.length === 0 && taskStatus !== 'pending' && (
                <div className="absolute bottom-1 right-1 text-sm">
                  {getStatusIcon(taskStatus)}
                </div>
              )}

              {/* Hover efekt pro editaci */}
              <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none" />
              
              {/* Edit indikátor */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="text-xs text-blue-600 bg-blue-100 px-1 py-0.5 rounded">
                  Klik pro editaci
                </div>
              </div>

              {/* Drag target indikátor */}
              {isDragTarget && (
                <div className="absolute inset-0 bg-blue-100 opacity-50 pointer-events-none flex items-center justify-center">
                  <div className="text-blue-700 font-semibold text-sm bg-white px-2 py-1 rounded shadow">
                    Přesunout sem
                  </div>
                </div>
              )}
            </div>

            {/* Context menu pro status a absenci */}
            {isMenuOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusSelect(date, 'pending');
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  ⚪ Čeká
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusSelect(date, 'in-progress');
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  ⏳ Rozpracováno
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusSelect(date, 'completed');
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  ✅ Hotovo
                </button>
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
}
