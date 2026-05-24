import { useState, useCallback, useEffect, useRef } from 'react';
import type { Stock } from '../types';
import { fetchLivePrices, type LivePrice } from '../utils/yahooFinance';

export function usePriceRefresher(
  stocks: Stock[],
  onUpdate: (data: Map<string, LivePrice>) => void,
  intervalMs: number | null,
) {
  const stocksRef = useRef(stocks);
  useEffect(() => { stocksRef.current = stocks; }, [stocks]);

  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    const current = stocksRef.current;
    if (!current.length) return;
    inFlight.current = true;
    setIsRefreshing(true);
    setError(null);
    try {
      const data = await fetchLivePrices(current);
      onUpdateRef.current(data);
      if (data.size > 0) {
        setLastUpdated(new Date());
      } else {
        setError('CORS 차단 또는 API 응답 없음');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '가격 조회 실패');
    } finally {
      inFlight.current = false;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (intervalMs === null) return;
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, refresh]);

  return { isRefreshing, lastUpdated, error, refresh };
}
