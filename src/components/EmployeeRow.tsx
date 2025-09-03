'use client';

import { useState, useEffect } from 'react';
import { Employee, formatDate, getCellClasses, getEmployeeRowClasses, getStatusIcon } from '@/lib/utils';
import { saveTask, TaskStatus } from '@/lib/database';
import { Expand, MoreVertical } from 'lucide-react';

interface EmployeeRowProps {
  employee: Employee;
  weekDays: Date[];
  tasks: Record<string, string>; // date -> task content
  taskStatuses: Record<string, TaskStatus>; // date -> task status
  onOpenModal: (employee: Employee, date: Date, currentContent: string) => void;
  onStatusChange: (employee: Employee, date: Date, status: TaskStatus) => void;
}

interface EditingCell {
  date: string;
  value: string;
}

export default function EmployeeRow({ employee, weekDays, tasks, taskStatuses, onOpenModal, onStatusChange }: EmployeeRowProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [localTasks, setLocalTasks] = useState<Record<string, string>>(tasks);
  const [showStatusMenu, setShowStatusMenu] = useState<string | null>(null);

  // Synchronizace s props když se změní tasks z Firebase
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const handleCellClick = (date: Date) => {
    const dateStr = formatDate(date);
    const currentValue = localTasks[dateStr] || '';

    setEditingCell({
      date: dateStr,
      value: currentValue
    });
  };

  const handleCellDoubleClick = (date: Date) => {
    // Zavři rychlou editaci pokud je otevřená
    setEditingCell(null);

    // Otevři modal přes callback
    const dateStr = formatDate(date);
    const currentContent = localTasks[dateStr] || '';
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

  // Zavři status menu při kliku mimo
  useEffect(() => {
    const handleClickOutside = () => setShowStatusMenu(null);
    if (showStatusMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showStatusMenu]);

  const handleInputChange = (value: string) => {
    if (editingCell) {
      setEditingCell({
        ...editingCell,
        value
      });
      
      // Optimistické update - okamžitě aktualizujeme UI
      setLocalTasks(prev => ({
        ...prev,
        [editingCell.date]: value
      }));
    }
  };

  const handleInputBlur = async () => {
    if (editingCell) {
      try {
        // Uložíme do Firebase
        await saveTask(employee.name, editingCell.date, editingCell.value);
      } catch (error) {
        console.error('Error saving task:', error);
        // V případě chyby vrátíme původní hodnotu
        setLocalTasks(prev => ({
          ...prev,
          [editingCell.date]: tasks[editingCell.date] || ''
        }));
      }
      
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInputBlur();
    } else if (e.key === 'Escape') {
      if (editingCell) {
        // Zrušíme editaci a vrátíme původní hodnotu
        setLocalTasks(prev => ({
          ...prev,
          [editingCell.date]: tasks[editingCell.date] || ''
        }));
        setEditingCell(null);
      }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault();

    try {
      // Zkus získat formátovaný text
      const clipboardData = e.clipboardData;
      let pastedText = '';

      // Priorita: HTML → plain text
      if (clipboardData.types.includes('text/html')) {
        const htmlContent = clipboardData.getData('text/html');
        // Jednoduchá konverze HTML na text s zachováním základního formátování
        pastedText = htmlContent
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<p[^>]*>/gi, '')
          .replace(/<\/div>/gi, '\n')
          .replace(/<div[^>]*>/gi, '')
          .replace(/<[^>]*>/g, '') // Odstraň všechny HTML tagy
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
      } else {
        pastedText = clipboardData.getData('text/plain');
      }

      if (editingCell && pastedText) {
        handleInputChange(editingCell.value + pastedText);
      }
    } catch (error) {
      console.error('Error pasting content:', error);
      // Fallback na standardní paste
      const pastedText = e.clipboardData.getData('text/plain');
      if (editingCell && pastedText) {
        handleInputChange(editingCell.value + pastedText);
      }
    }
  };

  return (
    <tr className={getEmployeeRowClasses(employee)}>
      {/* Sloupec s jménem zaměstnance */}
      <td className="sticky left-0 bg-inherit px-2 sm:px-4 py-3 font-medium text-gray-900 border-r border-gray-300 min-w-[160px] sm:min-w-[200px] z-10">
        <div className="flex items-center gap-1 sm:gap-2">
          <div
            className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${
              employee.type === 'internal' ? 'bg-green-500' : 'bg-blue-500'
            }`}
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs sm:text-sm font-semibold truncate">{employee.name}</div>
            <div className="text-xs text-gray-500 truncate">{employee.position}</div>
          </div>
        </div>
      </td>
      
      {/* Buňky pro jednotlivé dny */}
      {weekDays.map((date) => {
        const dateStr = formatDate(date);
        const isEditing = editingCell?.date === dateStr;
        const taskContent = localTasks[dateStr] || '';
        const taskStatus = taskStatuses[dateStr] || 'pending';
        const isMenuOpen = showStatusMenu === dateStr;

        return (
          <td
            key={dateStr}
            className={`${getCellClasses(date, isEditing, taskStatus)} relative group`}
            onClick={() => !isEditing && handleCellClick(date)}
            onDoubleClick={() => handleCellDoubleClick(date)}
            onContextMenu={(e) => handleContextMenu(e, date)}
          >
            {isEditing ? (
              <textarea
                ref={(textarea) => {
                  if (textarea) {
                    // Nastav kurzor na konec textu
                    const length = textarea.value.length;
                    textarea.setSelectionRange(length, length);
                    textarea.focus();
                  }
                }}
                value={editingCell.value}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={handleInputBlur}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                className="w-full h-[56px] sm:h-[66px] p-1 border-none outline-none resize-none bg-transparent text-xs sm:text-sm text-gray-900 placeholder-gray-400 overflow-hidden"
                placeholder="Zadejte úkol..."
              />
            ) : (
              <div className="h-[56px] sm:h-[66px] p-1 whitespace-pre-wrap text-xs sm:text-sm text-gray-900 relative overflow-hidden break-words">
                {/* Status ikona */}
                {taskStatus !== 'pending' && (
                  <div className="absolute bottom-1 right-1 text-sm">
                    {getStatusIcon(taskStatus)}
                  </div>
                )}

                <div className="overflow-hidden h-full pr-6 pb-5">
                  {taskContent || (
                    <span className="text-gray-300 italic text-xs sm:text-sm">
                      <span className="hidden sm:inline">Klikněte pro přidání úkolu</span>
                      <span className="sm:hidden">Klikněte</span>
                    </span>
                  )}
                </div>

                {/* Toolbar - zobrazí se při hover */}
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  {/* Status menu button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextMenu(e, date);
                    }}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Změnit status (nebo pravý klik)"
                  >
                    <MoreVertical size={12} className="text-gray-500" />
                  </button>

                  {/* Expand button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCellDoubleClick(date);
                    }}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Rozbalit pro delší editaci (nebo dvojklik)"
                  >
                    <Expand size={12} className="text-gray-500" />
                  </button>
                </div>

                {/* Status menu */}
                {isMenuOpen && (
                  <div
                    className="fixed bg-white border border-gray-300 rounded-lg shadow-2xl z-[9999] min-w-[140px]"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusSelect(date, 'pending');
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 rounded flex items-center gap-2 text-gray-700"
                      >
                        <span className="text-gray-400">⚪</span>
                        Čeká
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusSelect(date, 'in-progress');
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 rounded flex items-center gap-2 text-gray-700"
                      >
                        <span>⏳</span>
                        Rozpracováno
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusSelect(date, 'completed');
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 rounded flex items-center gap-2 text-gray-700"
                      >
                        <span>✅</span>
                        Hotovo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
}
