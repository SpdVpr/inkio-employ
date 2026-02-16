'use client';

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { getWeekInfo, formatDateDisplay } from '@/lib/utils';

interface WeekNavigationProps {
  currentDate: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
}

export default function WeekNavigation({
  currentDate,
  onPreviousWeek,
  onNextWeek
}: WeekNavigationProps) {
  const weekInfo = getWeekInfo(currentDate);
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onPreviousWeek}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 hover:shadow-sm"
      >
        <ChevronLeft size={16} />
        <span className="hidden sm:inline">Předchozí</span>
      </button>

      <div className="text-center flex items-center gap-3">
        <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600">
          <Calendar size={18} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
            {formatDateDisplay(weekStart)} – {formatDateDisplay(weekEnd)}
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Týden {weekInfo.weekNumber} · {weekInfo.monthName}
          </p>
        </div>
      </div>

      <button
        onClick={onNextWeek}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 hover:shadow-sm"
      >
        <span className="hidden sm:inline">Další</span>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
