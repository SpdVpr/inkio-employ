'use client';

import { useState, useEffect } from 'react';
import { Clock, X, AlertTriangle } from 'lucide-react';
import { subscribeToUnfilledTimeTasks } from '@/lib/database';
import { getWeekDates, formatDate } from '@/lib/utils';

interface TimeReminderBannerProps {
  currentDate: Date;
}

export default function TimeReminderBanner({ currentDate }: TimeReminderBannerProps) {
  const [unfilledCount, setUnfilledCount] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Check localStorage for dismiss state
  useEffect(() => {
    const dismissedAt = localStorage.getItem('time_reminder_dismissed_at');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const now = Date.now();
      // Show again after 24 hours
      if (now - dismissedTime < 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem('time_reminder_dismissed_at');
      }
    }
  }, []);

  // Subscribe to unfilled time tasks for current month
  useEffect(() => {
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const endOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const unsubscribe = subscribeToUnfilledTimeTasks(startOfMonth, endOfMonth, (count) => {
      setUnfilledCount(count);
      if (count > 0) {
        setIsVisible(true);
      }
    });

    return () => unsubscribe();
  }, [currentDate]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('time_reminder_dismissed_at', Date.now().toString());
  };

  if (isDismissed || unfilledCount === 0 || !isVisible) return null;

  return (
    <div className="mb-4 animate-fade-in">
      <div className="relative overflow-hidden rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50">
        {/* Animated pulse background */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-100/0 via-amber-100/40 to-amber-100/0 animate-pulse" />

        <div className="relative flex items-center gap-3 px-4 py-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle size={18} className="text-amber-600" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              Nezapomeň doplnit jak dlouho jsi na úkolech pracoval/a!
            </p>
            <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
              <Clock size={11} />
              <span className="font-medium">{unfilledCount} {unfilledCount === 1 ? 'dokončený úkol' : unfilledCount < 5 ? 'dokončené úkoly' : 'dokončených úkolů'}</span>
              {' '}bez vyplněného času tento měsíc
            </p>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 w-7 h-7 rounded-lg hover:bg-amber-200/50 flex items-center justify-center transition-colors"
            title="Skrýt na 24 hodin"
          >
            <X size={14} className="text-amber-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
