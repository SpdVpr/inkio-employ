'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NotepadText, Save, Check } from 'lucide-react';
import { subscribeToPersonalNotes, savePersonalNotes } from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardNotesWidget() {
  const { userProfile } = useAuth();
  const myName = userProfile?.displayName || '';
  
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!myName) return;
    const unsubscribe = subscribeToPersonalNotes(myName, (content) => {
      setNotes(content);
    });
    return () => unsubscribe();
  }, [myName]);

  const handleSave = useCallback(async (contentToSave: string) => {
    if (!myName) return;
    setIsSaving(true);
    try {
      await savePersonalNotes(myName, contentToSave);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setIsSaving(false);
    }
  }, [myName]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setNotes(newContent);
    
    // Auto-save delay
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      handleSave(newContent);
    }, 1000);
  };

  return (
    <div className="dashboard-widget flex flex-col h-full bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/30">
      <div className="dashboard-widget-header border-yellow-200/50 dark:border-yellow-800/50 bg-yellow-100/50 dark:bg-yellow-800/20">
        <h2 className="flex items-center gap-2 text-yellow-800 dark:text-yellow-500">
          <NotepadText size={16} className="text-yellow-600 dark:text-yellow-500" />
          Moje poznámky
        </h2>
        <div className="text-xs font-semibold px-2 py-1 flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
          {isSaving ? (
            <span className="flex items-center gap-1 opacity-70"><Save size={12} className="animate-pulse" /> Ukládám...</span>
          ) : saveSuccess ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500"><Check size={12} /> Uloženo</span>
          ) : null}
        </div>
      </div>
      <div className="dashboard-widget-content flex-1 p-0 relative">
        <textarea
          value={notes}
          onChange={handleChange}
          placeholder="Napiš si rychlou poznámku k dnešku..."
          className="w-full h-full min-h-[250px] resize-none outline-none bg-transparent p-5 text-sm"
          style={{ color: 'var(--text-primary)' }}
        />
        <div 
          className="absolute inset-x-0 bottom-0 pointer-events-none opacity-20" 
          style={{ 
            height: '100%',
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(234, 179, 8, 0.4) 27px, rgba(234, 179, 8, 0.4) 28px)', 
            backgroundPosition: '0 9px'
          }} 
        />
      </div>
    </div>
  );
}
