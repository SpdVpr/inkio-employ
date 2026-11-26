'use client';

import { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react';
import { NotepadText, Save, Check } from 'lucide-react';
import { subscribeToPersonalNotes, savePersonalNotes } from '@/lib/database';
import { getEnvironmentName, getFirebaseProjectId } from '@/lib/environment';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardNotesWidget() {
  const { user } = useAuth();
  return user ? <PersonalNotes key={user.uid} userId={user.uid} /> : null;
}

type SaveStatus = 'loading' | 'idle' | 'saving' | 'saved' | 'load-error' | 'save-error';

function PersonalNotes({ userId }: { userId: string }) {
  const draftKey = `inkio-note-draft:${getFirebaseProjectId()}:${getEnvironmentName()}:${userId}`;
  const [restoredDraft] = useState(() => {
    try {
      return localStorage.getItem(draftKey);
    } catch {
      return null;
    }
  });
  const [notes, setNotes] = useState(restoredDraft ?? '');
  const [status, setStatus] = useState<SaveStatus>(restoredDraft === null ? 'loading' : 'saving');
  const draftRef = useRef(restoredDraft === null ? null : { content: restoredDraft, saving: false });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  const flushDraft = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const draft = draftRef.current;
    if (!draft || draft.saving) return;

    draft.saving = true;
    if (mountedRef.current) setStatus('saving');

    void savePersonalNotes(userId, draft.content).then(() => {
      if (draftRef.current !== draft) return;
      draftRef.current = null;
      try {
        if (localStorage.getItem(draftKey) === draft.content) localStorage.removeItem(draftKey);
      } catch {
        // Cloud storage is available even when browser storage is disabled.
      }
      if (mountedRef.current) setStatus('saved');
    }, (error) => {
      draft.saving = false;
      console.error('Failed to save notes:', error);
      if (mountedRef.current && draftRef.current === draft) setStatus('save-error');
    });
  }, [draftKey, userId]);

  useEffect(() => {
    mountedRef.current = true;
    const unsubscribe = subscribeToPersonalNotes(userId, (content) => {
      if (draftRef.current) return;
      setNotes(content);
      setStatus(current => current === 'loading' ? 'idle' : current);
    }, () => {
      setStatus(current => current === 'loading' ? 'load-error' : current);
    });

    if (draftRef.current) timeoutRef.current = setTimeout(flushDraft, 0);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushDraft();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      mountedRef.current = false;
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flushDraft();
    };
  }, [flushDraft, userId]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const content = event.target.value;
    draftRef.current = { content, saving: false };
    setNotes(content);
    setStatus('saving');
    try {
      localStorage.setItem(draftKey, content);
    } catch {
      // Continue to save directly to Firestore.
    }

    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(flushDraft, 1000);
  };

  return (
    <div className="dashboard-widget flex flex-col h-full bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900/30">
      <div className="dashboard-widget-header border-yellow-200/50 dark:border-yellow-800/50 bg-yellow-100/50 dark:bg-yellow-800/20">
        <h2 className="flex items-center gap-2 text-yellow-800 dark:text-yellow-500">
          <NotepadText size={16} className="text-yellow-600 dark:text-yellow-500" />
          Moje poznámky
        </h2>
        <div aria-live="polite" className="text-xs font-semibold px-2 py-1 flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
          {status === 'loading' && <span>Načítám...</span>}
          {status === 'load-error' && <span>Poznámky se nepodařilo načíst</span>}
          {status === 'saving' && (
            <span className="flex items-center gap-1 opacity-70"><Save size={12} className="animate-pulse" /> Ukládám...</span>
          )}
          {status === 'saved' && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500"><Check size={12} /> Uloženo</span>
          )}
          {status === 'save-error' && (
            <button type="button" onClick={flushDraft} className="underline">Uložení selhalo. Zkusit znovu</button>
          )}
        </div>
      </div>
      <div className="dashboard-widget-content flex-1 p-0 relative">
        <textarea
          value={notes}
          onChange={handleChange}
          onBlur={flushDraft}
          disabled={status === 'loading'}
          aria-label="Moje poznámky"
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
