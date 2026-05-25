import { useState, useEffect, useRef, useCallback } from 'react';
import type { DailySnapshot } from '../types';
import type { StockWithStats, Account } from '../types';

const KEY = 'portfolio_snapshots_v1';

function loadSnapshots(): DailySnapshot[] {
  try {
    const v = localStorage.getItem(KEY);
    if (!v) return [];
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveSnapshots(snapshots: DailySnapshot[]) {
  try { localStorage.setItem(KEY, JSON.stringify(snapshots)); } catch {}
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function msUntilNext6AM() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0);
  if (now >= next) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

export function useSnapshots(
  stocks: StockWithStats[],
  accounts: Account[],
  usdToKrw: number,
  pricesReady: boolean,
) {
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>(loadSnapshots);

  const stocksRef = useRef(stocks);
  const accountsRef = useRef(accounts);
  const usdToKrwRef = useRef(usdToKrw);
  const snapshotsRef = useRef(snapshots);
  const pricesReadyRef = useRef(pricesReady);

  useEffect(() => { stocksRef.current = stocks; }, [stocks]);
  useEffect(() => { accountsRef.current = accounts; }, [accounts]);
  useEffect(() => { usdToKrwRef.current = usdToKrw; }, [usdToKrw]);
  useEffect(() => { snapshotsRef.current = snapshots; }, [snapshots]);
  useEffect(() => { pricesReadyRef.current = pricesReady; }, [pricesReady]);

  const takeSnapshot = useCallback(() => {
    const currentAccounts = accountsRef.current;
    if (currentAccounts.length === 0) return;

    const currentStocks = stocksRef.current;
    const date = todayStr();

    const accountSnaps = currentAccounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      color: acc.color,
      valueKrw: currentStocks
        .filter(s => s.accountId === acc.id)
        .reduce((sum, s) => sum + s.marketValueKrw, 0),
    }));

    const snapshot: DailySnapshot = {
      date,
      savedAt: Date.now(),
      accounts: accountSnaps,
      totalValueKrw: accountSnaps.reduce((sum, a) => sum + a.valueKrw, 0),
      usdToKrw: usdToKrwRef.current,
    };

    setSnapshots(prev => {
      const next = [...prev.filter(s => s.date !== date), snapshot]
        .sort((a, b) => a.date.localeCompare(b.date));
      saveSnapshots(next);
      return next;
    });
  }, []);

  // When prices first become ready: save today's snapshot if past 6am and not yet saved.
  useEffect(() => {
    if (!pricesReady) return;
    const now = new Date();
    const sixAM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0);
    if (now >= sixAM && !snapshotsRef.current.some(s => s.date === todayStr())) {
      takeSnapshot();
    }
  }, [pricesReady, takeSnapshot]);

  // Schedule future 6am auto-saves via recursive setTimeout.
  useEffect(() => {
    const timeoutRef = { id: 0 as ReturnType<typeof setTimeout> };
    function scheduleNext() {
      timeoutRef.id = setTimeout(() => {
        takeSnapshot();
        scheduleNext();
      }, msUntilNext6AM());
    }
    scheduleNext();
    return () => clearTimeout(timeoutRef.id);
  }, [takeSnapshot]);

  return { snapshots, takeSnapshot };
}
