'use client';

import { useState, useEffect, useCallback } from 'react';

interface ToastItem {
    id: number;
    taskName: string;
}

let toastCounter = 0;
let addToastGlobal: ((taskName: string) => void) | null = null;

// Expose a global function to trigger the toast from anywhere
export const showCompletionToast = (taskName: string) => {
    if (addToastGlobal) {
        addToastGlobal(taskName);
    }
};

export default function CompletionToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const addToast = useCallback((taskName: string) => {
        const id = ++toastCounter;
        setToasts(prev => [...prev, { id, taskName }]);

        // Auto-remove after 3.5s
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3500);
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
                    className="pointer-events-auto animate-slide-down bg-white rounded-2xl shadow-2xl border border-emerald-200 overflow-hidden flex items-center gap-4 px-5 py-3"
                    style={{ width: '420px' }}
                >
                    {/* GIF */}
                    <img
                        src="/bravo-gif.gif"
                        alt="Bravo!"
                        className="w-20 h-20 object-contain flex-shrink-0 rounded-lg"
                    />
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                        <div className="text-base font-bold text-emerald-600">Splněno! 🎉</div>
                        <div className="text-sm text-slate-500 leading-snug truncate mt-0.5">{toast.taskName}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
