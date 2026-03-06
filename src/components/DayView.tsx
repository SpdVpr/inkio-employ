'use client';

import { Employee, formatDate, formatDayName, formatDateDisplay } from '@/lib/utils';
import { TaskStatus, SubTask, calculateProgress, updateSubTaskStatus, WorkLocation, formatTimeMinutes } from '@/lib/database';
import SubTaskList from './SubTaskList';
import ProgressBar from './ProgressBar';
import { showCompletionToast } from './CompletionToast';
import { Clock } from 'lucide-react';

interface DayViewProps {
  employees: Employee[];
  selectedDate: Date;
  tasks: Record<string, Record<string, string>>;
  taskStatuses: Record<string, Record<string, TaskStatus>>;
  subTasks: Record<string, Record<string, SubTask[]>>;
  absences: Record<string, Record<string, boolean>>;
  workLocations: Record<string, Record<string, WorkLocation>>;
  onOpenModal: (employee: Employee, date: Date, currentContent: string) => void;
  onStatusChange: (employee: Employee, date: Date, status: TaskStatus) => void;
  onAbsenceToggle: (employee: Employee, date: Date) => void;
  onWorkLocationChange: (employee: Employee, date: Date, location: WorkLocation) => void;
  onDragStart: (employee: Employee, date: Date, subTaskId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (employee: Employee, date: Date) => void;
  draggedCell: { employeeName: string; date: string; subTaskId: string } | null;
}

export default function DayView({
  employees,
  selectedDate,
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
  draggedCell
}: DayViewProps) {
  const dateStr = formatDate(selectedDate);
  const internalEmployees = employees.filter(e => e.type === 'internal');
  const externalEmployees = employees.filter(e => e.type === 'external');

  const handleSubTaskStatusChange = async (employeeName: string, subTaskId: string, newStatus: TaskStatus) => {
    try {
      await updateSubTaskStatus(employeeName, dateStr, subTaskId, newStatus);
      if (newStatus === 'completed') {
        showCompletionToast('Úkol dokončen! 🎉');
      }
    } catch (error) {
      console.error('Error updating sub-task status:', error);
    }
  };

  const renderEmployeeCard = (employee: Employee) => {
    const daySubTasks = subTasks[employee.name]?.[dateStr] || [];
    const isAbsent = absences[employee.name]?.[dateStr] || false;
    const workLocation = workLocations[employee.name]?.[dateStr];
    const progress = calculateProgress(daySubTasks);
    const completedCount = daySubTasks.filter(t => t.status === 'completed').length;
    const dailyTotalMinutes = daySubTasks.reduce((sum, t) => sum + (t.timeMinutes || 0), 0);
    const isDragTarget = draggedCell && draggedCell.employeeName !== employee.name;

    return (
      <div
        key={employee.name}
        className={`bg-white rounded-xl border transition-all ${
          isAbsent
            ? 'border-red-200 bg-red-50/30'
            : isDragTarget
              ? 'border-indigo-300 ring-1 ring-indigo-200'
              : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
        }`}
        onDragOver={(e) => { e.preventDefault(); onDragOver(e); }}
        onDrop={() => onDrop(employee, selectedDate)}
      >
        {/* Header with name + controls */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${employee.type === 'internal' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
            <div>
              <h3 className="font-semibold text-slate-900 text-sm leading-tight">{employee.name}</h3>
              {employee.position && (
                <p className="text-[10px] text-slate-400 leading-tight">{employee.position}</p>
              )}
            </div>
          </div>

          {/* Time badge */}
          {dailyTotalMinutes > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-semibold tabular-nums bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
              <Clock size={11} className="text-slate-400" />
              {formatTimeMinutes(dailyTotalMinutes)}
            </span>
          )}
        </div>

        {/* Controls bar: Location + Absence */}
        <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
          {/* Location toggle */}
          <div className="flex gap-1 flex-1">
            <button
              onClick={(e) => { e.stopPropagation(); onWorkLocationChange(employee, selectedDate, workLocation === 'office' ? 'unset' : 'office'); }}
              className={`flex-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all border ${
                workLocation === 'office'
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                  : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-300 hover:text-emerald-500'
              }`}
            >
              🏢 Kancelář
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onWorkLocationChange(employee, selectedDate, workLocation === 'homeoffice' ? 'unset' : 'homeoffice'); }}
              className={`flex-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all border ${
                workLocation === 'homeoffice'
                  ? 'bg-violet-100 text-violet-700 border-violet-300'
                  : 'bg-white text-slate-400 border-slate-200 hover:border-violet-300 hover:text-violet-500'
              }`}
            >
              🏠 Home
            </button>
          </div>

          {/* Absence toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); onAbsenceToggle(employee, selectedDate); }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all border ${
              isAbsent
                ? 'bg-red-100 text-red-600 border-red-300'
                : 'bg-white text-slate-400 border-slate-200 hover:border-red-300 hover:text-red-500'
            }`}
          >
            🚫 {isAbsent ? 'Přítomen' : 'Nepřítomen'}
          </button>
        </div>

        {/* Content area - click to open modal */}
        <div
          className="px-4 py-3 cursor-pointer min-h-[80px]"
          onClick={() => onOpenModal(employee, selectedDate, tasks[employee.name]?.[dateStr] || '')}
        >
          {isAbsent ? (
            <div className="flex items-center justify-center h-16 text-red-400 text-sm font-medium">
              🚫 Nepřítomen/a
            </div>
          ) : daySubTasks.length === 0 ? (
            <div className="flex items-center justify-center h-16 text-slate-300 italic text-sm">
              Klikněte pro přidání úkolů
            </div>
          ) : (
            <div className="space-y-1">
              <SubTaskList
                subTasks={daySubTasks}
                maxVisible={20}
                isCompact={false}
                onStatusChange={(subTaskId, status) => handleSubTaskStatusChange(employee.name, subTaskId, status)}
                onDragStart={(subTaskId) => onDragStart(employee, selectedDate, subTaskId)}
                onDragEnd={onDragEnd}
                draggedSubTaskId={draggedCell?.employeeName === employee.name ? draggedCell?.subTaskId : undefined}
              />
            </div>
          )}
        </div>

        {/* Progress bar */}
        {daySubTasks.length > 0 && !isAbsent && (
          <div className="px-4 pb-3">
            <ProgressBar
              progress={progress}
              total={daySubTasks.length}
              completed={completedCount}
              showPercentage={true}
              showCounts={true}
              size="sm"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Internal employees */}
      {internalEmployees.length > 0 && (
        <>
          <div className="flex items-center gap-2 px-1 pt-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Interní tým</span>
            <span className="text-[10px] text-emerald-400 font-medium">{internalEmployees.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {internalEmployees.map(renderEmployeeCard)}
          </div>
        </>
      )}

      {/* External employees */}
      {externalEmployees.length > 0 && (
        <>
          <div className="flex items-center gap-2 px-1 pt-3">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Externí tým</span>
            <span className="text-[10px] text-blue-400 font-medium">{externalEmployees.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {externalEmployees.map(renderEmployeeCard)}
          </div>
        </>
      )}
    </div>
  );
}
