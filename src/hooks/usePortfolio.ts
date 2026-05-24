import { useState, useMemo, useEffect, useCallback } from 'react';
import { getPrevClose } from '../data/mockData';
import type { Stock, Account, StockWithStats } from '../types';

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

  // 단일 persist 함수로 항상 최신 stocks+accounts를 함께 저장
  useEffect(() => {
    persist(stocks, accounts);
  }, [stocks, accounts]);

  const stocksWithStats = useMemo<StockWithStats[]>(() =>
    stocks.map((s, i) => {
      const prevClose = getPrevClose(s.currentPrice, i + 1);
      const changeRate = ((s.currentPrice - prevClose) / prevClose) * 100;
      const changeAmt = s.currentPrice - prevClose;
      const multiplier = s.currency === 'USD' ? usdToKrw : 1;
      const marketValueKrw = s.currentPrice * s.quantity * multiplier;
      const costKrw = s.avgCost * s.quantity * multiplier;
      const gainLossKrw = marketValueKrw - costKrw;
      const gainLossPct = costKrw !== 0 ? (gainLossKrw / costKrw) * 100 : 0;
      return { ...s, prevClose, changeRate, changeAmt, marketValueKrw, gainLossKrw, gainLossPct };
    }),
  [stocks, usdToKrw]);

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
    accounts,
    addStock,
    updateStock,
    deleteStock,
    addAccount,
    deleteAccount,
    totalValueKrw,
    totalGainLossKrw,
    totalCostKrw,
  };
}
