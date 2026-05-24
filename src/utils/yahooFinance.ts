import type { Stock } from '../types';

export interface LivePrice {
  price: number;
  prevClose: number;
}

function toYahooTicker(ticker: string, market: string): string {
  if (market === 'KRX') return `${ticker}.KS`;
  if (market === 'KOSDAQ') return `${ticker}.KQ`;
  return ticker;
}

async function fetchSingle(stock: Stock): Promise<{ id: string; price: number; prevClose: number } | null> {
  const symbol = toYahooTicker(stock.ticker, stock.market);
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json.chart?.result?.[0]?.meta;
    const price: number | undefined = meta?.regularMarketPrice;
    if (!price) return null;
    return { id: stock.id, price, prevClose: meta.chartPreviousClose ?? price };
  } catch {
    return null;
  }
}

export async function fetchLivePrices(stocks: Stock[]): Promise<Map<string, LivePrice>> {
  if (!stocks.length) return new Map();

  const result = new Map<string, LivePrice>();
  // 5개씩 병렬 처리 (rate limit 방지)
  const CHUNK = 5;

  for (let i = 0; i < stocks.length; i += CHUNK) {
    const chunk = stocks.slice(i, i + CHUNK);
    const settled = await Promise.allSettled(chunk.map(fetchSingle));
    settled.forEach(r => {
      if (r.status === 'fulfilled' && r.value) {
        result.set(r.value.id, { price: r.value.price, prevClose: r.value.prevClose });
      }
    });
  }

  return result;
}
