'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, GripVertical, CornerUpRight, Copy, CopyPlus, CalendarDays, Clock, MoreHorizontal, Building2 } from 'lucide-react';
import { Employee, formatDateDisplay, formatDayName, getSubTaskIcon, getNextStatus, formatDate } from '@/lib/utils';
import { addDays } from 'date-fns';
import { SubTask, generateSubTaskId, calculateProgress, calculateOverallStatus, addSubTaskToEmployee, moveSubTaskCrossEmployee, formatTimeMinutes } from '@/lib/database';
import ProgressBar from './ProgressBar';
import TimeInput from './TimeInput';
import { showCompletionToast, showTimeWarningToast } from './CompletionToast';
import { createNotification, createBroadcastNotification } from '@/lib/notifications';
import { Company, subscribeToCompanies } from '@/lib/companies';

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
  const [actionsMenuTaskId, setActionsMenuTaskId] = useState<string | null>(null);
  const [actionsMenuPosition, setActionsMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [companyPickerTaskId, setCompanyPickerTaskId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const moveMenuRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Subscribe to companies
  useEffect(() => {
    const unsub = subscribeToCompanies(setCompanies);
    return () => unsub();
  }, []);

  useEffect(() => {
    setSubTasks(initialSubTasks);
  }, [initialSubTasks]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moveMenuRef.current && !moveMenuRef.current.contains(event.target as Node)) {
        setMovingTaskId(null);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setActionsMenuTaskId(null);
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
          order: index,
          timeMinutes: typeof task.timeMinutes === 'number' ? task.timeMinutes : 0,
          ...(task.companyId ? { companyId: task.companyId } : {})
        }));

      // Check for new tasks added
      const newTasks = updatedSubTasks.filter(
        t => !initialSubTasks.some(init => init.id === t.id)
      );
      if (newTasks.length > 0) {
        createBroadcastNotification({
          type: 'new_task',
          title: `${newTasks.length > 1 ? 'Nové úkoly' : 'Nový úkol'} pro ${employee.name}`,
          message: newTasks.map(t => t.content).join(', '),
          link: '/dashboard'
        });
      }

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
      order: subTasks.length,
      timeMinutes: 0
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
      order: subTasks.length,
      timeMinutes: task.timeMinutes || 0
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
        order: 999, // will be re-ordered by addSubTaskToEmployee
        timeMinutes: task.timeMinutes || 0
      };
      await addSubTaskToEmployee(employee.name, nextDateStr, newTask);
    } catch (error) {
      console.error('Error duplicating to next day:', error);
      alert('Nepodařilo se duplikovat úkol do dalšího dne.');
    }
  };

  const toggleSubTaskStatus = (id: string) => {
    const task = subTasks.find(t => t.id === id);
    if (task) {
      const newStatus = getNextStatus(task.status);
      if (newStatus === 'completed') {
        showCompletionToast(task.content);
        if (!task.timeMinutes) {
          setTimeout(() => showTimeWarningToast(task.content), 400);
        }
      }
    }
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
  const totalTimeMinutes = subTasks.reduce((sum, t) => sum + (t.timeMinutes || 0), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4 animate-fade-in">
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl sm:mx-4 max-h-[95vh] sm:max-h-[85vh] min-h-[60vh] flex flex-col border border-slate-200/60 animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-5 border-b border-slate-100">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${employee.type === 'internal' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">{employee.name}</h2>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5 capitalize">
                {formatDayName(date)} · {formatDateDisplay(date)}
              </p>
            </div>
          </div>
          <button onClick={handleCancel} className="action-btn flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Absence toggle */}
        <div className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-50/50 border-b border-slate-100">
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
          <div className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-500">Pokrok</span>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium tabular-nums">
                  <Clock size={12} className="text-slate-300" />
                  {formatTimeMinutes(totalTimeMinutes)}
                </span>
                <span className="text-xs text-slate-400 font-medium tabular-nums">{completedCount}/{subTasks.length}</span>
              </div>
            </div>
            <ProgressBar progress={progress} total={subTasks.length} completed={completedCount} showPercentage={true} showCounts={false} size="md" />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="space-y-1.5">
            {subTasks.map((task, index) => (
              <div
                key={task.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-all border ${draggedIndex === index ? 'opacity-40 border-blue-200 bg-blue-50' : 'opacity-100 border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  } cursor-move relative group/task`}
              >
                {/* Top row: drag + checkbox + text */}
                <div className="flex items-start sm:items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                  <GripVertical size={14} className="text-slate-300 flex-shrink-0 group-hover/task:text-slate-400 mt-1 sm:mt-0 hidden sm:block" />

                  <button
                    onClick={() => toggleSubTaskStatus(task.id)}
                    className="flex-shrink-0 hover:scale-110 transition-transform mt-0.5 sm:mt-0"
                  >
                    {getSubTaskIcon(task.status)}
                  </button>

                  <textarea
                    value={task.content}
                    onChange={(e) => updateSubTask(task.id, { content: e.target.value })}
                    placeholder="Zadejte úkol..."
                    rows={1}
                    onInput={(e) => {
                      const el = e.currentTarget;
                      el.style.height = 'auto';
                      el.style.height = el.scrollHeight + 'px';
                    }}
                    ref={(el) => {
                      if (el) {
                        el.style.height = 'auto';
                        el.style.height = el.scrollHeight + 'px';
                      }
                    }}
                    className={`flex-1 px-1 sm:px-1.5 py-0 border-none outline-none bg-transparent text-sm text-slate-800 font-medium placeholder:text-slate-300 min-w-0 resize-none overflow-hidden ${task.status === 'completed' ? 'line-through text-slate-400' : ''
                      }`}
                  />
                </div>

                {/* Bottom row on mobile / inline on desktop: time + company + actions */}
                <div className="flex items-center gap-1.5 sm:gap-2 pl-6 sm:pl-0 flex-shrink-0">
                  {/* Time input */}
                  <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <TimeInput
                      timeMinutes={task.timeMinutes || 0}
                      onChange={(minutes) => updateSubTask(task.id, { timeMinutes: minutes })}
                      showWarning={task.status === 'completed'}
                    />
                  </div>

                  {/* Company tag */}
                  <div className="flex-shrink-0 relative" onClick={(e) => e.stopPropagation()}>
                    {task.companyId ? (
                      <button
                        onClick={() => setCompanyPickerTaskId(companyPickerTaskId === task.id ? null : task.id)}
                        className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all hover:opacity-80 shadow-sm"
                        style={{
                          background: (companies.find(c => c.id === task.companyId)?.color || '#64748b') + '20',
                          color: companies.find(c => c.id === task.companyId)?.color || '#64748b',
                          border: `1.5px solid ${(companies.find(c => c.id === task.companyId)?.color || '#64748b')}50`
                        }}
                      >
                        <span>{companies.find(c => c.id === task.companyId)?.icon || '🏢'}</span>
                        <span className="max-w-[60px] sm:max-w-[100px] truncate">{companies.find(c => c.id === task.companyId)?.name || 'Firma'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setCompanyPickerTaskId(companyPickerTaskId === task.id ? null : task.id)}
                        className="inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-medium text-slate-400 hover:text-blue-600 hover:bg-blue-50 border-2 border-dashed border-slate-200 hover:border-blue-300 transition-all"
                        title="Přidat firmu"
                      >
                        <Building2 size={11} />
                        <span className="hidden sm:inline">Firma</span>
                      </button>
                    )}

                    {/* Company picker dropdown */}
                    {companyPickerTaskId === task.id && (
                      <div className="absolute bottom-full right-0 mb-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-[60] py-1 max-h-60 overflow-y-auto animate-fade-in">
                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          Vyberte firmu
                        </div>
                        {task.companyId && (
                          <button
                            onClick={() => { updateSubTask(task.id, { companyId: undefined }); setCompanyPickerTaskId(null); }}
                            className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
                          >
                            ✕ Odebrat firmu
                          </button>
                        )}
                        {companies.map(company => (
                          <button
                            key={company.id}
                            onClick={() => { updateSubTask(task.id, { companyId: company.id }); setCompanyPickerTaskId(null); }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 transition-colors ${task.companyId === company.id ? 'bg-blue-50 font-semibold' : 'text-slate-600'}`}
                          >
                            <span>{company.icon}</span>
                            <span style={{ color: company.color }}>{company.name}</span>
                          </button>
                        ))}
                        {companies.length === 0 && (
                          <div className="px-3 py-3 text-xs text-slate-400 text-center">
                            Žádné firmy.<br />Přidejte je v Adminu.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions menu (⋯) */}
                  <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      ref={(el) => { if (el && actionsMenuTaskId === task.id) { el.dataset.menuAnchor = 'true'; } }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setActionsMenuPosition({ top: rect.top, right: window.innerWidth - rect.right });
                        setActionsMenuTaskId(actionsMenuTaskId === task.id ? null : task.id);
                        setMovingTaskId(null);
                        setDatePickerTaskId(null);
                      }}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-500 hover:text-blue-700 transition-all"
                      title="Akce"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {actionsMenuTaskId === task.id && actionsMenuPosition && (
                      <div
                        ref={actionsMenuRef}
                        className="fixed w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1"
                        style={{ bottom: window.innerHeight - actionsMenuPosition.top + 4, right: actionsMenuPosition.right, zIndex: 9999 }}
                      >
                        <button
                          onClick={() => { duplicateSubTask(task); setActionsMenuTaskId(null); }}
                          className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                        >
                          <Copy size={13} /> Duplikovat (stejný den)
                        </button>
                        <button
                          onClick={() => { duplicateToNextDay(task); setActionsMenuTaskId(null); }}
                          className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                        >
                          <CopyPlus size={13} /> Duplikovat do dalšího dne
                        </button>
                        <button
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMovingTaskId(movingTaskId === task.id ? null : task.id);
                            setMovingTaskPosition({ top: rect.bottom, right: window.innerWidth - rect.right });
                            setDatePickerTaskId(null);
                            setActionsMenuTaskId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                        >
                          <CornerUpRight size={13} /> Přesunout na zaměstnance
                        </button>
                        <button
                          onClick={() => {
                            setDatePickerTaskId(datePickerTaskId === task.id ? null : task.id);
                            setMovingTaskId(null);
                            setActionsMenuTaskId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                        >
                          <CalendarDays size={13} /> Přesunout na jiný den
                        </button>
                        <div className="border-t border-slate-100 mt-1 pt-1">
                          <button
                            onClick={() => { deleteSubTask(task.id); setActionsMenuTaskId(null); }}
                            className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 size={13} /> Smazat úkol
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                />
                <button
                  onClick={() => {
                    if (moveToDateValue && moveToDateValue.length === 10) {
                      const task = subTasks.find(t => t.id === datePickerTaskId);
                      if (task) handleMoveToDate(task, moveToDateValue);
                    }
                  }}
                  disabled={!moveToDateValue || moveToDateValue.length !== 10}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                    className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 transition-colors"
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
            className="w-full mt-4 p-3 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 text-sm font-medium"
          >
            <Plus size={16} />
            Přidat úkol
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50/30">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium"
          >
            Zrušit
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors text-sm font-semibold shadow-sm hover:shadow"
          >
            Uložit
          </button>
        </div>
      </div>
    </div>
  );
}
