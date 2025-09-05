'use client';

import { SubTask, TaskStatus } from '@/lib/database';
import { getSubTaskIcon, truncateText, getNextStatus } from '@/lib/utils';

interface SubTaskListProps {
  subTasks: SubTask[];
  maxVisible?: number;
  onSubTaskClick?: (subTask: SubTask) => void;
  onStatusChange?: (subTaskId: string, status: TaskStatus) => void;
  isCompact?: boolean;
}

export default function SubTaskList({ 
  subTasks, 
  maxVisible = 3,
  onSubTaskClick,
  onStatusChange,
  isCompact = true
}: SubTaskListProps) {
  if (!subTasks || subTasks.length === 0) {
    return (
      <div className="text-gray-300 italic text-xs">
        <span className="hidden sm:inline">Klikněte pro přidání úkolu</span>
        <span className="sm:hidden">Klikněte</span>
      </div>
    );
  }

  const visibleTasks = subTasks.slice(0, maxVisible);
  const hiddenCount = Math.max(0, subTasks.length - maxVisible);

  const handleStatusClick = (e: React.MouseEvent, subTask: SubTask) => {
    e.stopPropagation();
    if (onStatusChange) {
      const nextStatus = getNextStatus(subTask.status);
      onStatusChange(subTask.id, nextStatus);
    }
  };

  const handleSubTaskClick = (e: React.MouseEvent, subTask: SubTask) => {
    e.stopPropagation();
    if (onSubTaskClick) {
      onSubTaskClick(subTask);
    }
  };

  return (
    <div className="space-y-0.5">
      {visibleTasks.map((task, index) => (
        <div
          key={task.id}
          className="flex items-start gap-1.5 text-xs group/subtask hover:bg-gray-50 rounded px-1 py-0.5 transition-colors min-h-[16px]"
        >
          <button
            onClick={(e) => handleStatusClick(e, task)}
            className="flex-shrink-0 hover:scale-110 transition-transform mt-0.5"
            title={`Klikněte pro změnu statusu (${task.status})`}
          >
            {getSubTaskIcon(task.status)}
          </button>
          <span
            className={`cursor-pointer flex-1 leading-tight break-words ${
              task.status === 'completed'
                ? 'line-through text-gray-500'
                : 'text-gray-900'
            }`}
            onClick={(e) => handleSubTaskClick(e, task)}
            title={task.content}
            style={{
              wordBreak: 'break-word',
              hyphens: 'auto',
              lineHeight: '1.2'
            }}
          >
            {isCompact ? truncateText(task.content, 35) : task.content}
          </span>
        </div>
      ))}

      {hiddenCount > 0 && (
        <div className="text-xs text-gray-400 px-1 mt-1">
          +{hiddenCount} dalších úkolů
        </div>
      )}
    </div>
  );
}
