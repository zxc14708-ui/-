const WORKER = 'https://my-stock-proxy.zxc14708.workers.dev/?url=';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

interface IndexCache {
  fetchedAt: number;
  data: Record<string, number>; // 'YYYY-MM-DD' → close price
}

async function fetchIndexHistory(yahooTicker: string, cacheKey: string): Promise<Record<string, number>> {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const c: IndexCache = JSON.parse(raw);
      if (Date.now() - c.fetchedAt < CACHE_TTL) return c.data;
    }
  } catch {}

  const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1d&range=5y`;
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

  try { localStorage.setItem(cacheKey, JSON.stringify({ fetchedAt: Date.now(), data })); } catch {}
  return data;
}

export const fetchSpxHistory = () => fetchIndexHistory('^GSPC', 'portfolio_spx_cache_v1');
export const fetchKospiHistory = () => fetchIndexHistory('^KS11', 'portfolio_kospi_cache_v1');

export function getIndexPrice(data: Record<string, number>, date: string): number | null {
  if (data[date]) return data[date];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(date);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (data[key]) return data[key];
  }
  return null;
}
