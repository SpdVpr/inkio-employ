'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';

interface ToastItem {
    id: number;
    taskName: string;
    type: 'success' | 'warning';
}

let toastCounter = 0;
let addToastGlobal: ((taskName: string, type: 'success' | 'warning') => void) | null = null;

// Expose a global function to trigger the toast from anywhere
export const showCompletionToast = (taskName: string) => {
    if (addToastGlobal) {
        addToastGlobal(taskName, 'success');
    }
};

export const showTimeWarningToast = (taskName: string) => {
    if (addToastGlobal) {
        addToastGlobal(taskName, 'warning');
    }
};

export default function CompletionToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const addToast = useCallback((taskName: string, type: 'success' | 'warning') => {
        const id = ++toastCounter;
        setToasts(prev => [...prev, { id, taskName, type }]);

        // Auto-remove
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, type === 'warning' ? 5000 : 3500);
    }, []);

    // Register global callback
    useEffect(() => {
        addToastGlobal = addToast;
        return () => { addToastGlobal = null; };
    }, [addToast]);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-3 pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`pointer-events-auto animate-slide-down rounded-2xl shadow-2xl overflow-hidden flex items-center gap-4 px-5 py-3 ${
                        toast.type === 'warning'
                            ? 'bg-amber-50 border border-amber-300'
                            : 'bg-white border border-emerald-200'
                    }`}
                    style={{ width: '420px' }}
                >
                    {toast.type === 'warning' ? (
                        <>
                            <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                                <Clock size={28} className="text-amber-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-base font-bold text-amber-600">⏰ Doplň čas!</div>
                                <div className="text-sm text-slate-500 leading-snug truncate mt-0.5">{toast.taskName}</div>
                                <div className="text-xs text-amber-500 mt-0.5">Úkol nemá zadaný čas</div>
                            </div>
                        </>
                    ) : (
                        <>
                            <img
                                src="/bravo-gif.gif"
                                alt="Bravo!"
                                className="w-20 h-20 object-contain flex-shrink-0 rounded-lg"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-base font-bold text-emerald-600">Splněno! 🎉</div>
                                <div className="text-sm text-slate-500 leading-snug truncate mt-0.5">{toast.taskName}</div>
                            </div>
                        </>
                    )}
                </div>
            ))}
        </div>
    );
}
