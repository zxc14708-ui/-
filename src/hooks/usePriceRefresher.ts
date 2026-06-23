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
    let partialFired = false;
    try {
      const data = await fetchLivePrices(current, partial => {
        // 가격 조회 완료 시 즉시 UI 업데이트 (등락률은 캔들 완료 후 갱신)
        onUpdateRef.current(partial);
        setLastUpdated(new Date());
        setIsRefreshing(false);
        partialFired = true;
      });
      // 캔들 완료 후 최종 업데이트 (등락률 정확한 값으로 교체)
      if (data.size > 0) {
        onUpdateRef.current(data);
        setLastUpdated(new Date());
      } else if (!partialFired) {
        setError('시세 조회 실패 — 프록시 및 네트워크 확인 필요');
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
