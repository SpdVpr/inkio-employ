'use client';

import { formatProgress } from '@/lib/utils';

// Funkce pro výpočet barvy podle pokroku (červená -> žlutá -> zelená)
const getProgressColor = (progress: number): string => {
  // Omez progress na 0-100
  const clampedProgress = Math.min(100, Math.max(0, progress));

  if (clampedProgress === 0) return '#e5e7eb'; // gray-200
  if (clampedProgress === 100) return '#10b981'; // green-500

  // Interpolace mezi červenou (0%) a zelenou (100%)
  // 0-50%: červená -> žlutá
  // 50-100%: žlutá -> zelená

  if (clampedProgress <= 50) {
    // Červená -> Žlutá
    const ratio = clampedProgress / 50;
    const red = 239; // ef4444 (red-500)
    const green = Math.round(68 + (234 - 68) * ratio); // 68 -> 234
    const blue = 68; // zůstává stejné
    return `rgb(${red}, ${green}, ${blue})`;
  } else {
    // Žlutá -> Zelená
    const ratio = (clampedProgress - 50) / 50;
    const red = Math.round(234 - (234 - 16) * ratio); // 234 -> 16
    const green = Math.round(179 + (185 - 179) * ratio); // 179 -> 185
    const blue = Math.round(20 + (129 - 20) * ratio); // 20 -> 129
    return `rgb(${red}, ${green}, ${blue})`;
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
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  if (total === 0) {
    return null;
  }

  const progressColor = getProgressColor(progress);
  const progressWidth = Math.min(100, Math.max(0, progress));

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Progress bar */}
      <div className={`flex-1 bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} transition-all duration-300 ease-out rounded-full`}
          style={{
            width: `${progressWidth}%`,
            backgroundColor: progressColor
          }}
        />
      </div>
      
      {/* Text info */}
      <div className={`flex-shrink-0 ${textSizeClasses[size]} text-gray-600`}>
        {showCounts && (
          <span className="font-medium">
            {completed}/{total}
          </span>
        )}
        {showCounts && showPercentage && <span className="mx-1">•</span>}
        {showPercentage && (
          <span>
            {formatProgress(progress)}
          </span>
        )}
      </div>
    </div>
  );
}
