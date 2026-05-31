import { useState, useCallback } from 'react';
import type { Trade } from '../types';

const TRADES_KEY = 'portfolio_trades_v1';

function loadTrades(): Trade[] {
  try {
    const v = localStorage.getItem(TRADES_KEY);
    if (!v) return [];
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? (parsed as Trade[]) : [];
  } catch {
    return [];
  }
}

function saveTrades(trades: Trade[]) {
  try {
    localStorage.setItem(TRADES_KEY, JSON.stringify(trades));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>(() =>
    loadTrades().sort((a, b) => b.createdAt - a.createdAt),
  );

  const addTrade = useCallback((trade: Trade) => {
    setTrades(prev => {
      const next = [trade, ...prev].sort((a, b) => b.createdAt - a.createdAt);
      saveTrades(next);
      return next;
    });
  }, []);

  const deleteTrade = useCallback((id: string) => {
    setTrades(prev => {
      const next = prev.filter(t => t.id !== id);
      saveTrades(next);
      return next;
    });
  }, []);

  return { trades, addTrade, deleteTrade };
}
