'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, User } from 'lucide-react';
import { Employee, formatDateDisplay, formatDayName } from '@/lib/utils';

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
  employee: Employee;
  date: Date;
  initialContent: string;
}

export default function TaskEditModal({
  isOpen,
  onClose,
  onSave,
  employee,
  date,
  initialContent
}: TaskEditModalProps) {
  const [content, setContent] = useState(initialContent);

  // Aktualizuj obsah když se změní initialContent
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  // Zavři modal při ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Zablokuj scroll na pozadí
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleSave = () => {
    onSave(content);
    onClose();
  };

  const handleCancel = () => {
    setContent(initialContent); // Vrať původní obsah
    onClose();
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault();

    try {
      const clipboardData = e.clipboardData;
      let pastedText = '';

      // Priorita: HTML → plain text
      if (clipboardData.types.includes('text/html')) {
        const htmlContent = clipboardData.getData('text/html');
        // Konverze HTML na text s zachováním formátování
        pastedText = htmlContent
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<p[^>]*>/gi, '')
          .replace(/<\/div>/gi, '\n')
          .replace(/<div[^>]*>/gi, '')
          .replace(/<\/li>/gi, '\n')
          .replace(/<li[^>]*>/gi, '• ')
          .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1')
          .replace(/<b[^>]*>(.*?)<\/b>/gi, '$1')
          .replace(/<em[^>]*>(.*?)<\/em>/gi, '$1')
          .replace(/<i[^>]*>(.*?)<\/i>/gi, '$1')
          .replace(/<[^>]*>/g, '') // Odstraň všechny HTML tagy
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\n\s*\n\s*\n/g, '\n\n') // Max 2 prázdné řádky
          .trim();
      } else {
        pastedText = clipboardData.getData('text/plain');
      }

      if (pastedText) {
        // Získej pozici kurzoru
        const textarea = e.target as HTMLTextAreaElement;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        // Vlož text na pozici kurzoru
        const newContent = content.substring(0, start) + pastedText + content.substring(end);
        setContent(newContent);

        // Nastav kurzor za vložený text
        setTimeout(() => {
          const newPosition = start + pastedText.length;
          textarea.setSelectionRange(newPosition, newPosition);
        }, 0);
      }
    } catch (error) {
      console.error('Error pasting content:', error);
      // Fallback na standardní paste
      const pastedText = e.clipboardData.getData('text/plain');
      if (pastedText) {
        const textarea = e.target as HTMLTextAreaElement;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent = content.substring(0, start) + pastedText + content.substring(end);
        setContent(newContent);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div 
              className={`w-4 h-4 rounded-full ${
                employee.type === 'internal' ? 'bg-green-500' : 'bg-blue-500'
              }`}
            />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {employee.name}
              </h2>
              <p className="text-sm text-gray-500">{employee.position}</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Date info */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={16} />
            <span className="font-medium">
              {formatDayName(date)} {formatDateDisplay(date)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Úkoly a poznámky:
          </label>
          <textarea
            ref={(textarea) => {
              if (textarea) {
                // Nastav kurzor na konec textu
                const length = textarea.value.length;
                textarea.setSelectionRange(length, length);
                textarea.focus();
              }
            }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={handlePaste}
            className="w-full h-64 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            placeholder="Zadejte úkoly, poznámky nebo plány pro tento den..."
          />
          <p className="text-xs text-gray-500 mt-2">
            Tip: Můžete použít Enter pro nové řádky
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Zrušit
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium"
          >
            Uložit
          </button>
        </div>
      </div>
    </div>
  );
}
