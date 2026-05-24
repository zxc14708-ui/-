import { useState, useCallback, useEffect, useRef } from 'react';
import type { Stock } from '../types';
import { fetchLivePrices, type LivePrice } from '../utils/yahooFinance';

const INTERVAL_MS = 5 * 60 * 1000;

export function usePriceRefresher(
  stocks: Stock[],
  onUpdate: (data: Map<string, LivePrice>) => void,
) {
  const stocksRef = useRef(stocks);
  useEffect(() => { stocksRef.current = stocks; }, [stocks]);

  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const current = stocksRef.current;
    if (!current.length) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const data = await fetchLivePrices(current);
      onUpdateRef.current(data);
      if (data.size > 0) setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : '가격 조회 실패');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // initial fetch + periodic refresh
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  return { isRefreshing, lastUpdated, error, refresh };
}
