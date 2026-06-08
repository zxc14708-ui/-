import { useState, useCallback } from 'react';
import type { JournalEntry } from '../types';

const KEY = 'portfolio_journal_v1';

function load(): JournalEntry[] {
  try {
    const v = localStorage.getItem(KEY);
    if (!v) return [];
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(entries: JournalEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {}
}

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>(() => load());

  const addEntry = useCallback((entry: JournalEntry) => {
    setEntries(prev => {
      const next = [entry, ...prev];
      persist(next);
      return next;
    });
  }, []);

  const updateEntry = useCallback((id: string, updates: Partial<JournalEntry>) => {
    setEntries(prev => {
      const next = prev.map(e => e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e);
      persist(next);
      return next;
    });
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => {
      const next = prev.filter(e => e.id !== id);
      persist(next);
      return next;
    });
  }, []);

  return { entries, addEntry, updateEntry, deleteEntry };
}
