'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, GripVertical, CornerUpRight } from 'lucide-react';
import { Employee, formatDateDisplay, formatDayName, getSubTaskIcon, getNextStatus, formatDate } from '@/lib/utils';
import { SubTask, generateSubTaskId, calculateProgress, calculateOverallStatus, addSubTaskToEmployee } from '@/lib/database';
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
  const moveMenuRef = useRef<HTMLDivElement>(null);

  // Aktualizuj sub-úkoly když se změní initialSubTasks
  useEffect(() => {
    setSubTasks(initialSubTasks);
  }, [initialSubTasks]);

  // Close move menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moveMenuRef.current && !moveMenuRef.current.contains(event.target as Node)) {
        setMovingTaskId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Zavři modal při ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
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
      // Aktualizuj order podle aktuálního pořadí a sanitizuj data
      const updatedSubTasks = subTasks
        .filter(task => task && typeof task === 'object' && task.content && task.content.trim()) // Pouze platné úkoly s obsahem
        .map((task, index) => ({
          id: task.id || generateSubTaskId(),
          content: (task.content || '').trim(),
          status: task.status || 'pending',
          order: index
        }));

      console.log('Saving sub-tasks:', updatedSubTasks);
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

  const toggleSubTaskStatus = (id: string) => {
    setSubTasks(prev => prev.map(task =>
      task.id === id ? { ...task, status: getNextStatus(task.status) } : task
    ));
  };

  const handleMoveTask = async (task: SubTask, targetEmployee: Employee) => {
    try {
      const dateStr = formatDate(date);

      // 1. Add to target employee
      await addSubTaskToEmployee(targetEmployee.name, dateStr, task);

      // 2. Remove from current list (local state)
      const newSubTasks = subTasks.filter(t => t.id !== task.id);
      setSubTasks(newSubTasks);
      setMovingTaskId(null);

      // 3. Save current employee's list (remove from DB)
      // Note: We need to re-index orders
      const updatedSubTasks = newSubTasks.map((t, index) => ({ ...t, order: index }));
      onSave(updatedSubTasks);

    } catch (error) {
      console.error('Error moving task:', error);
      alert('Nepodařilo se přesunout úkol. Zkuste to prosím znovu.');
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

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

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const progress = calculateProgress(subTasks);
  const overallStatus = calculateOverallStatus(subTasks);
  const completedCount = subTasks.filter(t => t.status === 'completed').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div
              className={`w-4 h-4 rounded-full ${employee.type === 'internal' ? 'bg-green-500' : 'bg-blue-500'
                }`}
            />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {employee.name}
              </h2>
              <p className="text-sm text-gray-500">
                {formatDayName(date)} {formatDateDisplay(date)}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Absence toggle button */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <button
            onClick={onAbsenceToggle}
            className={`w-full px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${isAbsent
              ? 'bg-red-100 text-red-700 hover:bg-red-200 border-2 border-red-300'
              : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-300'
              }`}
          >
            {isAbsent ? '✓ Označeno jako nepřítomen' : '🚫 Označit jako nepřítomen'}
          </button>
        </div>

        {/* Progress overview */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Celkový pokrok
            </span>
            <span className="text-sm text-gray-600">
              {completedCount}/{subTasks.length} úkolů
            </span>
          </div>
          <ProgressBar
            progress={progress}
            total={subTasks.length}
            completed={completedCount}
            showPercentage={true}
            showCounts={false}
            size="md"
          />
        </div>

        {/* Sub-tasks list */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {subTasks.map((task, index) => (
              <div
                key={task.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-3 border rounded-lg transition-all ${draggedIndex === index ? 'opacity-50' : 'opacity-100'
                  } hover:bg-gray-50 cursor-move relative`}
              >
                <GripVertical size={16} className="text-gray-400 flex-shrink-0" />

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
                  className={`flex-1 px-2 py-1 border-none outline-none bg-transparent text-black font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : ''
                    }`}
                />

                <div className="flex items-center gap-1">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMovingTaskId(movingTaskId === task.id ? null : task.id);
                        setMovingTaskPosition({ top: rect.bottom, right: window.innerWidth - rect.right });
                      }}
                      className="flex-shrink-0 p-1 hover:bg-blue-100 rounded transition-colors text-blue-500"
                      title="Přesunout úkol"
                    >
                      <CornerUpRight size={16} />
                    </button>
                  </div>

                  <button
                    onClick={() => deleteSubTask(task.id)}
                    className="flex-shrink-0 p-1 hover:bg-red-100 rounded transition-colors text-red-500"
                    title="Smazat úkol"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Fixed Position Move Menu */}
          {movingTaskId && movingTaskPosition && (
            <div
              ref={moveMenuRef}
              style={{
                top: movingTaskPosition.top + 4,
                right: movingTaskPosition.right,
              }}
              className="fixed w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] py-1 max-h-60 overflow-y-auto"
            >
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b bg-gray-50">
                Přesunout na:
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
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2"
                  >
                    <div className={`w-2 h-2 rounded-full ${targetEmp.type === 'internal' ? 'bg-green-500' : 'bg-blue-500'}`} />
                    {targetEmp.name}
                  </button>
                ))
              }
            </div>
          )}


          <button
            onClick={addSubTask}
            className="w-full mt-4 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
          >
            <Plus size={16} />
            Přidat nový úkol
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Zrušit
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
          >
            Uložit úkoly
          </button>
        </div>
      </div >
    </div >
  );
}
