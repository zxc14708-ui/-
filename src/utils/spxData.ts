const WORKER = 'https://my-stock-proxy.zxc14708.workers.dev/?url=';
const CACHE_KEY = 'portfolio_spx_cache_v1';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

interface SpxCache {
  fetchedAt: number;
  data: Record<string, number>; // 'YYYY-MM-DD' → close price
}

export async function fetchSpxHistory(): Promise<Record<string, number>> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const c: SpxCache = JSON.parse(raw);
      if (Date.now() - c.fetchedAt < CACHE_TTL) return c.data;
    }
  } catch {}

  const apiUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=5y';
  const res = await fetch(WORKER + encodeURIComponent(apiUrl));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  const result = json.chart?.result?.[0];
  const timestamps: number[] = result?.timestamp ?? [];
  const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];

  const data: Record<string, number> = {};
  timestamps.forEach((ts, i) => {
    const c = closes[i];
    if (c != null && isFinite(c)) {
      data[new Date(ts * 1000).toISOString().slice(0, 10)] = c;
    }
  });

  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), data })); } catch {}
  return data;
}

export function getSpxPrice(data: Record<string, number>, date: string): number | null {
  if (data[date]) return data[date];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(date);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (data[key]) return data[key];
  }
  return null;
}
