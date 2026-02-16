'use client';

import { formatProgress } from '@/lib/utils';

const getProgressColor = (progress: number): string => {
  const p = Math.min(100, Math.max(0, progress));
  if (p === 0) return '#e2e8f0';
  if (p === 100) return '#10b981';
  if (p <= 50) {
    const ratio = p / 50;
    const r = 239;
    const g = Math.round(68 + (200 - 68) * ratio);
    const b = 68;
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const ratio = (p - 50) / 50;
    const r = Math.round(234 - (234 - 16) * ratio);
    const g = Math.round(179 + (185 - 179) * ratio);
    const b = Math.round(20 + (129 - 20) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  }
};

interface ProgressBarProps {
  progress: number;
  total: number;
  completed: number;
  showPercentage?: boolean;
  showCounts?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function ProgressBar({
  progress,
  total,
  completed,
  showPercentage = true,
  showCounts = false,
  size = 'sm',
  className = ''
}: ProgressBarProps) {
  const sizeClasses = { sm: 'h-1', md: 'h-1.5', lg: 'h-2' };
  const textSizes = { sm: 'text-[10px]', md: 'text-xs', lg: 'text-sm' };

  if (total === 0) return null;

  const color = getProgressColor(progress);
  const width = Math.min(100, Math.max(0, progress));

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 bg-slate-100 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      <div className={`flex-shrink-0 ${textSizes[size]} text-slate-400 font-medium tabular-nums`}>
        {showCounts && <span>{completed}/{total}</span>}
        {showCounts && showPercentage && <span className="mx-0.5">·</span>}
        {showPercentage && <span>{formatProgress(progress)}</span>}
      </div>
    </div>
  );
}
