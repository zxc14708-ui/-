import { useState, useMemo } from 'react';
import { getPrevClose } from '../data/mockData';
import type { Stock, Account, StockWithStats } from '../types';

const ACCOUNT_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6',
];

export function usePortfolio(usdToKrw: number) {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const stocksWithStats = useMemo<StockWithStats[]>(() =>
    stocks.map((s, i) => {
      const prevClose = getPrevClose(s.currentPrice, i + 1);
      const changeRate = ((s.currentPrice - prevClose) / prevClose) * 100;
      const changeAmt = s.currentPrice - prevClose;
      const multiplier = s.currency === 'USD' ? usdToKrw : 1;
      const marketValueKrw = s.currentPrice * s.quantity * multiplier;
      const costKrw = s.avgCost * s.quantity * multiplier;
      const gainLossKrw = marketValueKrw - costKrw;
      const gainLossPct = (gainLossKrw / costKrw) * 100;
      return { ...s, prevClose, changeRate, changeAmt, marketValueKrw, gainLossKrw, gainLossPct };
    }),
  [stocks, usdToKrw]);

  function addStock(stock: Stock) {
    setStocks(prev => [...prev, stock]);
  }

  function updateStock(id: string, updates: Partial<Stock>) {
    setStocks(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }

  function deleteStock(id: string) {
    setStocks(prev => prev.filter(s => s.id !== id));
  }

  function addAccount(name: string, broker: string) {
    const color = ACCOUNT_COLORS[accounts.length % ACCOUNT_COLORS.length];
    const account: Account = { id: 'acc' + Date.now(), name, broker, color };
    setAccounts(prev => [...prev, account]);
    return account;
  }

  function deleteAccount(id: string) {
    setAccounts(prev => prev.filter(a => a.id !== id));
    setStocks(prev => prev.filter(s => s.accountId !== id));
  }

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
