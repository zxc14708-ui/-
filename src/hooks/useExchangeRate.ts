import { useState, useEffect } from 'react';
import type { ExchangeRate } from '../types';

const FALLBACK_RATE = 1380;

export function useExchangeRate() {
  const [rate, setRate] = useState<ExchangeRate>({
    usdToKrw: FALLBACK_RATE,
    updatedAt: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchRate() {
      try {
        // Free open API — no key required
        const res = await fetch(
          'https://open.er-api.com/v6/latest/USD',
          { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) throw new Error('Network response not ok');
        const data = await res.json();
        if (!cancelled && data.rates?.KRW) {
          setRate({ usdToKrw: data.rates.KRW, updatedAt: data.time_last_update_utc });
          setError(null);
        }
      } catch {
        if (!cancelled) setError('환율 로드 실패 (기본값 사용)');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRate();
    const timer = setInterval(fetchRate, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  return { rate, loading, error };
}
