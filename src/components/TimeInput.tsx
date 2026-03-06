'use client';

import { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { formatTimeMinutes, parseTimeString } from '@/lib/database';

interface TimeInputProps {
  timeMinutes: number;
  onChange: (minutes: number) => void;
  compact?: boolean;
  showWarning?: boolean; // Highlight if completed but time is 0
}

export default function TimeInput({ timeMinutes, onChange, compact = false, showWarning = false }: TimeInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(formatTimeMinutes(timeMinutes));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setInputValue(formatTimeMinutes(timeMinutes));
    }
  }, [timeMinutes, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseTimeString(inputValue);
    onChange(parsed);
    setInputValue(formatTimeMinutes(parsed));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue(formatTimeMinutes(timeMinutes));
    }
  };

  // Handle raw input - allow digits and colon only
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d:]/g, '');
    // Auto-insert colon after hours digits
    if (val.length === 2 && !val.includes(':') && inputValue.length < val.length) {
      setInputValue(val + ':');
    } else {
      setInputValue(val);
    }
  };

  if (compact) {
    // Compact version for table cells
    const displayTime = formatTimeMinutes(timeMinutes);
    if (timeMinutes === 0) return null;
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 font-medium tabular-nums">
        <Clock size={9} className="text-slate-300" />
        {displayTime}
      </span>
    );
  }

  const warningActive = showWarning && timeMinutes === 0;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg transition-all cursor-pointer ${
        isEditing
          ? 'ring-2 ring-indigo-300 bg-white'
          : warningActive
            ? 'bg-amber-50 border border-amber-200 hover:border-amber-300'
            : 'bg-slate-50 border border-slate-200 hover:border-slate-300'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      <Clock
        size={14}
        className={`ml-2 flex-shrink-0 ${
          warningActive ? 'text-amber-400' : isEditing ? 'text-indigo-400' : 'text-slate-400'
        }`}
      />

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="w-14 px-1 py-1.5 text-sm font-medium text-slate-800 bg-transparent outline-none tabular-nums text-center"
          placeholder="0:00"
          maxLength={5}
        />
      ) : (
        <span
          className={`px-1 py-1.5 text-sm font-medium tabular-nums ${
            warningActive ? 'text-amber-600' : timeMinutes > 0 ? 'text-slate-700' : 'text-slate-400'
          }`}
        >
          {formatTimeMinutes(timeMinutes)}
        </span>
      )}
    </div>
  );
}
