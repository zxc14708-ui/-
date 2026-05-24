import { useState, useMemo } from 'react';
import { STOCKS, ACCOUNTS, getPrevClose } from '../data/mockData';
import type { Stock, StockWithStats } from '../types';

export function usePortfolio(usdToKrw: number) {
  const [stocks, setStocks] = useState<Stock[]>(STOCKS);
  const accounts = ACCOUNTS;

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
    totalValueKrw,
    totalGainLossKrw,
    totalCostKrw,
  };
}
