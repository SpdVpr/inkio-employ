'use client';

import { useState, useRef, useEffect } from 'react';
import { AbsenceType, AbsenceHalf } from '@/lib/database';

type Kind = 'vacation' | 'absent';

interface Props {
  kind: Kind;
  currentType: AbsenceType | null;
  currentHalf: AbsenceHalf;
  onSelect: (type: AbsenceType | null, half: AbsenceHalf) => void;
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  buttonContent: React.ReactNode;
  buttonTitle?: string;
  align?: 'left' | 'right';
}

export default function AbsenceButton({
  kind,
  currentType,
  currentHalf,
  onSelect,
  buttonClassName,
  buttonStyle,
  buttonContent,
  buttonTitle,
  align = 'left',
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = currentType === kind;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const pick = (half: AbsenceHalf) => {
    onSelect(kind, half);
    setOpen(false);
  };

  const clear = () => {
    onSelect(null, 'full');
    setOpen(false);
  };

  const activeBg = kind === 'vacation' ? 'bg-amber-200 text-amber-900' : 'bg-red-200 text-red-900';
  const icon = kind === 'vacation' ? '🏖️' : '🚫';

  const halfClass = (h: AbsenceHalf) =>
    `w-full px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-left flex items-center gap-1.5 transition-colors ${
      isActive && currentHalf === h
        ? activeBg
        : 'text-slate-700 hover:bg-slate-100'
    }`;

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={buttonClassName}
        style={buttonStyle}
        title={buttonTitle}
      >
        {buttonContent}
      </button>
      {open && (
        <div
          className={`absolute z-50 top-full mt-1 ${align === 'right' ? 'right-0' : 'left-0'} bg-white rounded-lg shadow-xl border border-slate-200 p-1 min-w-[150px]`}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" onClick={() => pick('full')} className={halfClass('full')}>
            <span>{icon}</span>
            <span>Celý den</span>
          </button>
          <button type="button" onClick={() => pick('am')} className={halfClass('am')}>
            <span>½</span>
            <span>Dopoledne</span>
          </button>
          <button type="button" onClick={() => pick('pm')} className={halfClass('pm')}>
            <span>½</span>
            <span>Odpoledne</span>
          </button>
          {isActive && (
            <>
              <div className="my-1 h-px bg-slate-100" />
              <button
                type="button"
                onClick={clear}
                className="w-full px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-slate-500 hover:bg-slate-100 text-left flex items-center gap-1.5"
              >
                <span>✕</span>
                <span>Zrušit</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
