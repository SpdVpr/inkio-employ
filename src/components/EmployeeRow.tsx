'use client';

import { useState, useEffect } from 'react';
import { Employee, formatDate, getCellClasses, getEmployeeRowClasses } from '@/lib/utils';
import { saveTask } from '@/lib/database';
import { Expand } from 'lucide-react';

interface EmployeeRowProps {
  employee: Employee;
  weekDays: Date[];
  tasks: Record<string, string>; // date -> task content
  onOpenModal: (employee: Employee, date: Date, currentContent: string) => void;
}

interface EditingCell {
  date: string;
  value: string;
}

export default function EmployeeRow({ employee, weekDays, tasks, onOpenModal }: EmployeeRowProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [localTasks, setLocalTasks] = useState<Record<string, string>>(tasks);

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
        
        return (
          <td
            key={dateStr}
            className={`${getCellClasses(date, isEditing)} relative group`}
            onClick={() => !isEditing && handleCellClick(date)}
            onDoubleClick={() => handleCellDoubleClick(date)}
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
                <div className="overflow-hidden h-full">
                  {taskContent || (
                    <span className="text-gray-300 italic text-xs sm:text-sm">
                      <span className="hidden sm:inline">Klikněte pro přidání úkolu</span>
                      <span className="sm:hidden">Klikněte</span>
                    </span>
                  )}
                </div>

                {/* Expand ikona - zobrazí se při hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCellDoubleClick(date);
                  }}
                  className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-all duration-200"
                  title="Rozbalit pro delší editaci (nebo dvojklik)"
                >
                  <Expand size={12} className="text-gray-500" />
                </button>
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
}
