import { useState, useEffect, useCallback, useRef } from 'react';
import type { ExchangeRate } from '../types';

const FALLBACK_RATE = 1380;
// open.er-api.com free plan: 1,500 req/month, data updates daily.
// Enforce a minimum 10-minute auto-refresh to avoid exhausting the quota.
const RATE_MIN_INTERVAL = 10 * 60 * 1000;

export function useExchangeRate(intervalMs: number | null) {
  const [rate, setRate] = useState<ExchangeRate>({
    usdToKrw: FALLBACK_RATE,
    updatedAt: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const fetchRate = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsRefreshing(true);
    try {
      const res = await fetch(
        'https://open.er-api.com/v6/latest/USD',
        { signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) throw new Error('Network response not ok');
      const data = await res.json();
      if (data.rates?.KRW) {
        setRate({ usdToKrw: data.rates.KRW, updatedAt: data.time_last_update_utc });
        setError(null);
      }
    } catch {
      setError('환율 로드 실패 (기본값 사용)');
    } finally {
      inFlight.current = false;
      setIsRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRate(); }, [fetchRate]);

  useEffect(() => {
    if (intervalMs === null) return;
    // Clamp to minimum to protect free API quota
    const effectiveMs = Math.max(intervalMs, RATE_MIN_INTERVAL);
    const id = setInterval(fetchRate, effectiveMs);
    return () => clearInterval(id);
  }, [intervalMs, fetchRate]);

  return { rate, loading, isRefreshing, error, refresh: fetchRate };
}
