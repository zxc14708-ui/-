import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Stock, Account, StockWithStats } from '../types';
import type { LivePrice } from '../utils/yahooFinance';

const ACCOUNT_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6',
];

const KEYS = { stocks: 'portfolio_stocks_v2', accounts: 'portfolio_accounts_v2' };

function load<T extends unknown[]>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed as T : fallback;
  } catch {
    return fallback;
  }
}

function persist(stocks: Stock[], accounts: Account[]) {
  try {
    localStorage.setItem(KEYS.stocks, JSON.stringify(stocks));
    localStorage.setItem(KEYS.accounts, JSON.stringify(accounts));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

export function usePortfolio(usdToKrw: number) {
  const [stocks, setStocks] = useState<Stock[]>(() => load(KEYS.stocks, []));
  const [accounts, setAccounts] = useState<Account[]>(() => load(KEYS.accounts, []));
  // volatile live price cache — not persisted
  const [liveData, setLiveData] = useState<Record<string, { price: number; prevClose: number }>>({});

  // 단일 persist 함수로 항상 최신 stocks+accounts를 함께 저장
  useEffect(() => {
    persist(stocks, accounts);
  }, [stocks, accounts]);

  const stocksWithStats = useMemo<StockWithStats[]>(() =>
    stocks.map((s, i) => {
      const live = liveData[s.id];
      const currentPrice = live?.price ?? s.currentPrice;
      const prevClose = live?.prevClose ?? currentPrice;
      const changeRate = prevClose !== 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;
      const changeAmt = currentPrice - prevClose;
      const multiplier = s.currency === 'USD' ? usdToKrw : 1;
      const costKrw = s.avgCost * s.quantity * multiplier;
      const marketValueKrw = currentPrice * s.quantity * multiplier;
      const gainLossKrw = marketValueKrw - costKrw;
      const gainLossPct = costKrw !== 0 ? (gainLossKrw / costKrw) * 100 : 0;
      return { ...s, currentPrice, prevClose, changeRate, changeAmt, costKrw, marketValueKrw, gainLossKrw, gainLossPct };
    }),
  [stocks, liveData, usdToKrw]);

  const bulkUpdateLiveData = useCallback((data: Map<string, LivePrice>) => {
    setLiveData(prev => {
      const next = { ...prev };
      data.forEach((v, id) => { next[id] = v; });
      return next;
    });
  }, []);

  const addStock = useCallback((stock: Stock) => {
    setStocks(prev => [...prev, stock]);
  }, []);

  const updateStock = useCallback((id: string, updates: Partial<Stock>) => {
    setStocks(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteStock = useCallback((id: string) => {
    setStocks(prev => prev.filter(s => s.id !== id));
  }, []);

  const addAccount = useCallback((name: string, broker: string) => {
    const account: Account = {
      id: 'acc' + Date.now(),
      name,
      broker,
      color: ACCOUNT_COLORS[Math.floor(Math.random() * ACCOUNT_COLORS.length)],
    };
    setAccounts(prev => [...prev, account]);
    return account;
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    setStocks(prev => prev.filter(s => s.accountId !== id));
  }, []);

  const updateAccount = useCallback((id: string, updates: { name?: string; color?: string }) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const reorderAccounts = useCallback((orderedIds: string[]) => {
    setAccounts(prev => {
      const map = new Map(prev.map(a => [a.id, a]));
      return orderedIds.map(id => map.get(id)).filter((a): a is Account => !!a);
    });
  }, []);

  const totalValueKrw = useMemo(() =>
    stocksWithStats.reduce((sum, s) => sum + s.marketValueKrw, 0),
  [stocksWithStats]);

  const totalGainLossKrw = useMemo(() =>
    stocksWithStats.reduce((sum, s) => sum + s.gainLossKrw, 0),
  [stocksWithStats]);

  const totalCostKrw = useMemo(() =>
    totalValueKrw - totalGainLossKrw,
  [totalValueKrw, totalGainLossKrw]);

  return {
    stocks: stocksWithStats,
    rawStocks: stocks,
    accounts,
    addStock,
    updateStock,
    deleteStock,
    addAccount,
    updateAccount,
    reorderAccounts,
    deleteAccount,
    bulkUpdateLiveData,
    totalValueKrw,
    totalGainLossKrw,
    totalCostKrw,
  };
}
