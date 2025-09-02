'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Pondělí
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Neděle

  return (
    <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-lg shadow-sm border">
      <button
        onClick={onPreviousWeek}
        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <ChevronLeft size={20} />
        <span className="hidden sm:inline">Předchozí týden</span>
      </button>
      
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          {formatDateDisplay(weekStart)} - {formatDateDisplay(weekEnd)}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Týden {weekInfo.weekNumber} z {weekInfo.totalWeeks} • {weekInfo.monthName}
        </p>
      </div>
      
      <button
        onClick={onNextWeek}
        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <span className="hidden sm:inline">Další týden</span>
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
