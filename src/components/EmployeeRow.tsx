'use client';

import { useState, useEffect } from 'react';
import { Employee, formatDate, getStatusIcon } from '@/lib/utils';
import { TaskStatus, SubTask, calculateProgress, updateSubTaskStatus, WorkLocation } from '@/lib/database';
import SubTaskList from './SubTaskList';
import ProgressBar from './ProgressBar';
import { showCompletionToast } from './CompletionToast';

interface DragData {
  employeeName: string;
  date: string;
  subTaskId: string;
}

interface EmployeeRowProps {
  employee: Employee;
  weekDays: Date[];
  tasks: Record<string, string>;
  taskStatuses: Record<string, TaskStatus>;
  subTasks: Record<string, SubTask[]>;
  absences: Record<string, boolean>;
  workLocations: Record<string, WorkLocation>;
  onOpenModal: (employee: Employee, date: Date, currentContent: string) => void;
  onStatusChange: (employee: Employee, date: Date, status: TaskStatus) => void;
  onAbsenceToggle: (employee: Employee, date: Date) => void;
  onWorkLocationChange: (employee: Employee, date: Date, location: WorkLocation) => void;
  onDragStart: (employee: Employee, date: Date, subTaskId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (employee: Employee, date: Date) => void;
  draggedCell: DragData | null;
  yearlyStats?: { totalTasks: number; completedTasks: number; completionRate: number };
}

export default function EmployeeRow({
  employee,
  weekDays,
  tasks,
  taskStatuses,
  subTasks,
  absences,
  workLocations,
  onOpenModal,
  onStatusChange,
  onAbsenceToggle,
  onWorkLocationChange,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  draggedCell,
  yearlyStats
}: EmployeeRowProps) {
  const [showStatusMenu, setShowStatusMenu] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setShowStatusMenu(null);
    if (showStatusMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showStatusMenu]);

  const handleContextMenu = (e: React.MouseEvent, date: Date) => {
    e.preventDefault();
    const dateStr = formatDate(date);
    setShowStatusMenu(showStatusMenu === dateStr ? null : dateStr);
  };

  const handleStatusChange = (date: Date, status: TaskStatus) => {
    onStatusChange(employee, date, status);
    setShowStatusMenu(null);
  };

  const handleSubTaskStatusChange = async (dateStr: string, subTaskId: string, newStatus: TaskStatus) => {
    try {
      await updateSubTaskStatus(employee.name, dateStr, subTaskId, newStatus);
      // Show toast when task is completed
      if (newStatus === 'completed') {
        const dayTasks = subTasks[dateStr] || [];
        const task = dayTasks.find(t => t.id === subTaskId);
        if (task) {
          showCompletionToast(task.content);
        }
      }
    } catch (error) {
      console.error('Error updating sub-task status:', error);
    }
  };

  const cycleLocation = (current: WorkLocation, date: Date) => {
    const order: WorkLocation[] = ['unset', 'office', 'homeoffice'];
    const idx = order.indexOf(current);
    const next = order[(idx + 1) % order.length];
    onWorkLocationChange(employee, date, next);
  };

  return (
    <tr className="group/row border-b border-slate-100 last:border-b-0">
      {/* Employee name column */}
      <th
        className="sticky-left sticky left-0 z-5 w-[180px] min-w-[180px] max-w-[180px] px-3 py-2.5 text-left align-middle bg-white border-r border-slate-100 group-hover/row:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${employee.type === 'internal' ? 'bg-emerald-400' : 'bg-blue-400'
            }`} />

          <div className="min-w-0 flex-1">
            <div className="font-bold text-[15px] text-slate-900 leading-tight truncate">
              {employee.name}
            </div>
            {employee.position && (
              <div className="text-[10px] text-slate-400 mt-0.5 truncate leading-tight">
                {employee.position}
              </div>
            )}
          </div>

          {/* Yearly stats — compact, only show rate */}
          {yearlyStats && yearlyStats.totalTasks > 0 && (
            <div
              className="flex-shrink-0"
              title={`Tento týden: ${yearlyStats.completedTasks} hotových z ${yearlyStats.totalTasks} (${yearlyStats.completionRate}%)`}
            >
              <span className={`text-[10px] font-bold tabular-nums ${yearlyStats.completionRate >= 75
                ? 'text-emerald-500'
                : yearlyStats.completionRate >= 40
                  ? 'text-amber-500'
                  : 'text-slate-300'
                }`}>
                {yearlyStats.completionRate}%
              </span>
            </div>
          )}
        </div>
      </th>

      {/* Day cells */}
      {weekDays.map((date) => {
        const dateStr = formatDate(date);
        const taskContent = tasks[dateStr] || '';
        const daySubTasks = subTasks[dateStr] || [];
        const progress = calculateProgress(daySubTasks);
        const isAbsent = absences[dateStr] || false;
        const workLocation = workLocations[dateStr] || 'unset';
        const isMenuOpen = showStatusMenu === dateStr;


        const completedCount = daySubTasks.filter(t => t.status === 'completed').length;
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isToday = new Date().toDateString() === date.toDateString();

        // Cell background — very subtle
        let cellBg = 'bg-white';
        if (isAbsent) {
          cellBg = 'bg-red-50/60';
        } else if (progress === 100) {
          cellBg = 'bg-emerald-50/40';
        } else if (isToday) {
          cellBg = 'bg-indigo-50/30';
        } else if (isWeekend) {
          cellBg = 'bg-slate-50/40';
        }

        // Left accent based on location (only if set)
        const locationAccent = workLocation === 'office'
          ? 'border-l-2 border-l-emerald-400'
          : workLocation === 'homeoffice'
            ? 'border-l-2 border-l-violet-400'
            : '';

        return (
          <td
            key={dateStr}
            className={`${cellBg} ${locationAccent} border-r border-slate-100 w-[220px] min-w-[220px] max-w-[220px] align-top cursor-pointer transition-all hover:bg-slate-50/50 relative`}
            onClick={() => onOpenModal(employee, date, taskContent)}
            onContextMenu={(e) => handleContextMenu(e, date)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(employee, date)}
          >
            <div className="h-[180px] px-2.5 py-1.5 text-sm text-slate-800 relative overflow-hidden flex flex-col">

              {/* Absent — centered in the full cell */}
              {isAbsent && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-red-50/50">
                  <span className="px-3 py-1 bg-red-100 text-red-500 text-xs font-semibold rounded-lg">
                    🚫 Nepřítomen
                  </span>
                </div>
              )}

              {/* Location toggle — always visible */}
              {!isAbsent && (
                <div className="flex-shrink-0 mb-2.5 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onWorkLocationChange(employee, date, workLocation === 'office' ? 'unset' : 'office'); }}
                    className={`flex-1 px-1 py-0.5 rounded text-[10px] font-semibold transition-all border ${workLocation === 'office'
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-300 hover:text-emerald-500'
                      }`}
                  >
                    🏢 Kancelář
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onWorkLocationChange(employee, date, workLocation === 'homeoffice' ? 'unset' : 'homeoffice'); }}
                    className={`flex-1 px-1 py-0.5 rounded text-[10px] font-semibold transition-all border ${workLocation === 'homeoffice'
                      ? 'bg-violet-100 text-violet-700 border-violet-300'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-violet-300 hover:text-violet-500'
                      }`}
                  >
                    🏠 Home
                  </button>
                </div>
              )}

              {/* Sub-task list — main content area */}
              <div className="flex-1 overflow-hidden">
                {!isAbsent && (
                  <SubTaskList
                    subTasks={daySubTasks}
                    maxVisible={5}
                    onStatusChange={(subTaskId, status) => handleSubTaskStatusChange(dateStr, subTaskId, status)}
                    isCompact={true}
                    onDragStart={(subTaskId) => onDragStart(employee, date, subTaskId)}
                    onDragEnd={onDragEnd}
                    draggedSubTaskId={draggedCell?.employeeName === employee.name ? draggedCell?.subTaskId : undefined}
                  />
                )}
              </div>

              {/* Bottom: progress bar — only when there are tasks */}
              {daySubTasks.length > 0 && !isAbsent && (
                <div className="flex-shrink-0 mt-auto pt-1">
                  <ProgressBar
                    progress={progress}
                    total={daySubTasks.length}
                    completed={completedCount}
                    showPercentage={false}
                    showCounts={true}
                    size="sm"
                  />
                </div>
              )}

            </div>

            {/* Context menu */}
            {isMenuOpen && (
              <div className="absolute bottom-1 left-1 right-1 bg-white rounded-lg shadow-lg border border-slate-200 z-30 animate-fade-in overflow-hidden">
                {/* Location options */}
                <div className="border-b border-slate-100 px-3 py-1.5">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lokace</div>
                  <div className="flex gap-1">
                    {(['unset', 'office', 'homeoffice'] as WorkLocation[]).map(loc => (
                      <button
                        key={loc}
                        onClick={(e) => { e.stopPropagation(); onWorkLocationChange(employee, date, loc); }}
                        className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors ${workLocation === loc
                          ? loc === 'office' ? 'bg-emerald-100 text-emerald-700'
                            : loc === 'homeoffice' ? 'bg-violet-100 text-violet-700'
                              : 'bg-slate-100 text-slate-500'
                          : 'text-slate-400 hover:bg-slate-50'
                          }`}
                      >
                        {loc === 'office' ? '🏢' : loc === 'homeoffice' ? '🏠' : '—'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status options */}
                {(['pending', 'in-progress', 'completed'] as TaskStatus[]).map(status => (
                  <button
                    key={status}
                    onClick={(e) => { e.stopPropagation(); handleStatusChange(date, status); }}
                    className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                  >
                    <span>{status === 'completed' ? '✅' : status === 'in-progress' ? '⏳' : '⚪'}</span>
                    <span>{status === 'completed' ? 'Hotovo' : status === 'in-progress' ? 'Rozpracováno' : 'Čeká'}</span>
                  </button>
                ))}
                <div className="border-t border-slate-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); onAbsenceToggle(employee, date); setShowStatusMenu(null); }}
                    className="w-full text-left px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <span>🚫</span>
                    <span>{isAbsent ? 'Zrušit nepřítomnost' : 'Nepřítomen'}</span>
                  </button>
                </div>
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
}
