'use client';

import { SubTask, TaskStatus } from '@/lib/database';
import { getSubTaskIcon, truncateText, getNextStatus } from '@/lib/utils';

interface SubTaskListProps {
  subTasks: SubTask[];
  maxVisible?: number;
  onSubTaskClick?: (subTask: SubTask) => void;
  onStatusChange?: (subTaskId: string, status: TaskStatus) => void;
  isCompact?: boolean;
  onDragStart?: (subTaskId: string) => void;
  onDragEnd?: () => void;
  draggedSubTaskId?: string;
}

export default function SubTaskList({
  subTasks,
  maxVisible = 4,
  onSubTaskClick,
  onStatusChange,
  isCompact = true,
  onDragStart,
  onDragEnd,
  draggedSubTaskId
}: SubTaskListProps) {
  if (!subTasks || subTasks.length === 0) {
    return (
      <div className="text-slate-300 italic text-[11px] py-2">
        Klikněte pro přidání úkolů
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

  // Don't stop propagation! Let click bubble up to the cell
  // so the edit modal opens when clicking anywhere on the subtask text
  const handleSubTaskClick = (e: React.MouseEvent, subTask: SubTask) => {
    if (onSubTaskClick) {
      e.stopPropagation();
      onSubTaskClick(subTask);
    }
    // If no onSubTaskClick handler, let it bubble up to the cell onClick
  };

  const handleDragStart = (e: React.DragEvent, subTask: SubTask) => {
    e.stopPropagation();
    if (onDragStart) {
      onDragStart(subTask.id);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    if (onDragEnd) {
      onDragEnd();
    }
  };

  return (
    <div className="space-y-0.5">
      {visibleTasks.map((task) => {
        const isDragging = draggedSubTaskId === task.id;

        return (
          <div
            key={task.id}
            draggable={!!onDragStart}
            onDragStart={(e) => handleDragStart(e, task)}
            onDragEnd={handleDragEnd}
            className={`flex items-start gap-1.5 text-xs group/subtask hover:bg-slate-50 rounded px-1 py-0.5 transition-colors min-h-[18px] ${isDragging ? 'opacity-30' : ''
              }`}
          >
            <button
              onClick={(e) => handleStatusClick(e, task)}
              className="flex-shrink-0 hover:scale-110 transition-transform mt-0.5"
              title={`Klikněte pro změnu statusu (${task.status})`}
            >
              {getSubTaskIcon(task.status)}
            </button>
            <span
              className={`flex-1 leading-snug break-words cursor-pointer ${task.status === 'completed'
                  ? 'line-through text-slate-400'
                  : 'text-slate-700'
                }`}
              onClick={(e) => handleSubTaskClick(e, task)}
              title={task.content}
              style={{
                wordBreak: 'break-word',
                hyphens: 'auto',
                lineHeight: '1.3'
              }}
            >
              {isCompact ? truncateText(task.content, 40) : task.content}
            </span>
          </div>
        );
      })}

      {hiddenCount > 0 && (
        <div className="text-[10px] text-slate-400 px-1 mt-0.5 font-medium">
          +{hiddenCount} dalších
        </div>
      )}
    </div>
  );
}
