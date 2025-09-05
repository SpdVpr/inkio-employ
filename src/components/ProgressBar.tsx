'use client';

import { formatProgress, getProgressBarClasses } from '@/lib/utils';

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

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Progress bar */}
      <div className={`flex-1 bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div 
          className={`${getProgressBarClasses(progress)} ${sizeClasses[size]} transition-all duration-300 ease-out`}
          style={{ width: `${progress}%` }}
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
