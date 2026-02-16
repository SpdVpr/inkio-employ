'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, GripVertical, CornerUpRight, Copy, CopyPlus, CalendarDays } from 'lucide-react';
import { Employee, formatDateDisplay, formatDayName, getSubTaskIcon, getNextStatus, formatDate } from '@/lib/utils';
import { addDays } from 'date-fns';
import { SubTask, generateSubTaskId, calculateProgress, calculateOverallStatus, addSubTaskToEmployee, moveSubTaskCrossEmployee } from '@/lib/database';
import ProgressBar from './ProgressBar';

interface SubTaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subTasks: SubTask[]) => void;
  employee: Employee;
  date: Date;
  initialSubTasks: SubTask[];
  isAbsent: boolean;
  onAbsenceToggle: () => void;
  employees?: Employee[];
}

export default function SubTaskEditModal({
  isOpen,
  onClose,
  onSave,
  employee,
  date,
  initialSubTasks,
  isAbsent,
  onAbsenceToggle,
  employees = []
}: SubTaskEditModalProps) {
  const [subTasks, setSubTasks] = useState<SubTask[]>(initialSubTasks);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [movingTaskPosition, setMovingTaskPosition] = useState<{ top: number; right: number } | null>(null);
  const [datePickerTaskId, setDatePickerTaskId] = useState<string | null>(null);
  const [moveToDateValue, setMoveToDateValue] = useState<string>('');
  const moveMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSubTasks(initialSubTasks);
  }, [initialSubTasks]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moveMenuRef.current && !moveMenuRef.current.contains(event.target as Node)) {
        setMovingTaskId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleSave = () => {
    try {
      const updatedSubTasks = subTasks
        .filter(task => task && typeof task === 'object' && task.content && task.content.trim())
        .map((task, index) => ({
          id: task.id || generateSubTaskId(),
          content: (task.content || '').trim(),
          status: task.status || 'pending',
          order: index
        }));
      onSave(updatedSubTasks);
      onClose();
    } catch (error) {
      console.error('Error preparing sub-tasks for save:', error);
      alert('Chyba při ukládání úkolů. Zkuste to prosím znovu.');
    }
  };

  const handleCancel = () => {
    setSubTasks(initialSubTasks);
    onClose();
  };

  const addSubTask = () => {
    const newSubTask: SubTask = {
      id: generateSubTaskId(),
      content: '',
      status: 'pending',
      order: subTasks.length
    };
    setSubTasks([...subTasks, newSubTask]);
  };

  const updateSubTask = (id: string, updates: Partial<SubTask>) => {
    setSubTasks(prev => prev.map(task =>
      task.id === id ? { ...task, ...updates } : task
    ));
  };

  const deleteSubTask = (id: string) => {
    setSubTasks(prev => prev.filter(task => task.id !== id));
  };

  // ========== DUPLICATE ==========
  const duplicateSubTask = (task: SubTask) => {
    const duplicate: SubTask = {
      id: generateSubTaskId(),
      content: task.content,
      status: 'pending',
      order: subTasks.length
    };
    setSubTasks(prev => [...prev, duplicate]);
  };

  // ========== DUPLICATE TO NEXT DAY ==========
  const duplicateToNextDay = async (task: SubTask) => {
    try {
      const nextDay = addDays(date, 1);
      const nextDateStr = formatDate(nextDay);
      const newTask: SubTask = {
        id: generateSubTaskId(),
        content: task.content,
        status: 'pending',
        order: 999 // will be re-ordered by addSubTaskToEmployee
      };
      await addSubTaskToEmployee(employee.name, nextDateStr, newTask);
    } catch (error) {
      console.error('Error duplicating to next day:', error);
      alert('Nepodařilo se duplikovat úkol do dalšího dne.');
    }
  };

  const toggleSubTaskStatus = (id: string) => {
    setSubTasks(prev => prev.map(task =>
      task.id === id ? { ...task, status: getNextStatus(task.status) } : task
    ));
  };

  const handleMoveTask = async (task: SubTask, targetEmployee: Employee) => {
    try {
      const dateStr = formatDate(date);
      await addSubTaskToEmployee(targetEmployee.name, dateStr, task);
      const newSubTasks = subTasks.filter(t => t.id !== task.id);
      setSubTasks(newSubTasks);
      setMovingTaskId(null);
      const updatedSubTasks = newSubTasks.map((t, index) => ({ ...t, order: index }));
      onSave(updatedSubTasks);
    } catch (error) {
      console.error('Error moving task:', error);
      alert('Nepodařilo se přesunout úkol. Zkuste to prosím znovu.');
    }
  };

  // ========== MOVE TO DATE ==========
  const handleMoveToDate = async (task: SubTask, targetDate: string) => {
    try {
      const fromDateStr = formatDate(date);
      if (fromDateStr === targetDate) return;
      // Move to same employee but different date
      await moveSubTaskCrossEmployee(employee.name, fromDateStr, employee.name, targetDate, task.id);
      const newSubTasks = subTasks.filter(t => t.id !== task.id);
      setSubTasks(newSubTasks);
      setDatePickerTaskId(null);
      const updatedSubTasks = newSubTasks.map((t, index) => ({ ...t, order: index }));
      onSave(updatedSubTasks);
    } catch (error) {
      console.error('Error moving task to date:', error);
      alert('Nepodařilo se přesunout úkol na jiné datum.');
    }
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newSubTasks = [...subTasks];
    const draggedItem = newSubTasks[draggedIndex];
    newSubTasks.splice(draggedIndex, 1);
    newSubTasks.splice(index, 0, draggedItem);
    setSubTasks(newSubTasks);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => setDraggedIndex(null);

  const progress = calculateProgress(subTasks);
  const completedCount = subTasks.filter(t => t.status === 'completed').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col border border-slate-200/60 animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${employee.type === 'internal' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">{employee.name}</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5 capitalize">
                {formatDayName(date)} · {formatDateDisplay(date)}
              </p>
            </div>
          </div>
          <button onClick={handleCancel} className="action-btn">
            <X size={18} />
          </button>
        </div>

        {/* Absence toggle */}
        <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
          <button
            onClick={onAbsenceToggle}
            className={`w-full px-4 py-2 rounded-lg font-medium text-xs transition-all ${isAbsent
              ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
              : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 hover:border-slate-300'
              }`}
          >
            {isAbsent ? '✓ Označeno jako nepřítomen' : '🚫 Označit jako nepřítomen'}
          </button>
        </div>

        {/* Progress */}
        {subTasks.length > 0 && (
          <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-500">Pokrok</span>
              <span className="text-xs text-slate-400 font-medium tabular-nums">{completedCount}/{subTasks.length}</span>
            </div>
            <ProgressBar progress={progress} total={subTasks.length} completed={completedCount} showPercentage={true} showCounts={false} size="md" />
          </div>
        )}

        {/* Sub-tasks list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-1.5">
            {subTasks.map((task, index) => (
              <div
                key={task.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all border ${draggedIndex === index ? 'opacity-40 border-indigo-200 bg-indigo-50' : 'opacity-100 border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  } cursor-move relative group/task`}
              >
                <GripVertical size={14} className="text-slate-300 flex-shrink-0 group-hover/task:text-slate-400" />

                <button
                  onClick={() => toggleSubTaskStatus(task.id)}
                  className="flex-shrink-0 hover:scale-110 transition-transform"
                >
                  {getSubTaskIcon(task.status)}
                </button>

                <input
                  type="text"
                  value={task.content}
                  onChange={(e) => updateSubTask(task.id, { content: e.target.value })}
                  placeholder="Zadejte úkol..."
                  className={`flex-1 px-1.5 py-0 border-none outline-none bg-transparent text-sm text-slate-800 font-medium placeholder:text-slate-300 ${task.status === 'completed' ? 'line-through text-slate-400' : ''
                    }`}
                />

                <div className="flex items-center gap-0.5 opacity-0 group-hover/task:opacity-100 transition-opacity">
                  {/* Duplicate */}
                  <button
                    onClick={() => duplicateSubTask(task)}
                    className="action-btn primary"
                    title="Duplikovat úkol (stejný den)"
                  >
                    <Copy size={14} />
                  </button>

                  {/* Duplicate to next day */}
                  <button
                    onClick={() => duplicateToNextDay(task)}
                    className="action-btn primary"
                    title="Duplikovat do dalšího dne"
                  >
                    <CopyPlus size={14} />
                  </button>

                  {/* Move to employee */}
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMovingTaskId(movingTaskId === task.id ? null : task.id);
                      setMovingTaskPosition({ top: rect.bottom, right: window.innerWidth - rect.right });
                      setDatePickerTaskId(null);
                    }}
                    className="action-btn primary"
                    title="Přesunout na jiného zaměstnance"
                  >
                    <CornerUpRight size={14} />
                  </button>

                  {/* Move to date */}
                  <button
                    onClick={() => {
                      setDatePickerTaskId(datePickerTaskId === task.id ? null : task.id);
                      setMovingTaskId(null);
                    }}
                    className="action-btn primary"
                    title="Přesunout na jiný den"
                  >
                    <CalendarDays size={14} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteSubTask(task.id)}
                    className="action-btn danger"
                    title="Smazat úkol"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Date picker inline */}
          {datePickerTaskId && (
            <div className="mx-2 mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200 animate-fade-in">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Přesunout na datum
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={moveToDateValue}
                  onChange={(e) => setMoveToDateValue(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                />
                <button
                  onClick={() => {
                    if (moveToDateValue && moveToDateValue.length === 10) {
                      const task = subTasks.find(t => t.id === datePickerTaskId);
                      if (task) handleMoveToDate(task, moveToDateValue);
                    }
                  }}
                  disabled={!moveToDateValue || moveToDateValue.length !== 10}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Přesunout
                </button>
                <button
                  onClick={() => { setDatePickerTaskId(null); setMoveToDateValue(''); }}
                  className="px-3 py-2 text-slate-400 hover:text-slate-600 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Move menu portal */}
          {movingTaskId && movingTaskPosition && (
            <div
              ref={moveMenuRef}
              style={{ top: movingTaskPosition.top + 4, right: movingTaskPosition.right }}
              className="fixed w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-[100] py-1 max-h-60 overflow-y-auto animate-fade-in"
            >
              <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Přesunout na
              </div>
              {employees
                .filter(e => e.name !== employee.name)
                .map((targetEmp) => (
                  <button
                    key={targetEmp.name}
                    onClick={() => {
                      const task = subTasks.find(t => t.id === movingTaskId);
                      if (task) handleMoveTask(task, targetEmp);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full ${targetEmp.type === 'internal' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                    {targetEmp.name}
                  </button>
                ))
              }
            </div>
          )}

          <button
            onClick={addSubTask}
            className="w-full mt-4 p-3 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 text-sm font-medium"
          >
            <Plus size={16} />
            Přidat úkol
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/30">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium"
          >
            Zrušit
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors text-sm font-semibold shadow-sm hover:shadow"
          >
            Uložit
          </button>
        </div>
      </div>
    </div>
  );
}
