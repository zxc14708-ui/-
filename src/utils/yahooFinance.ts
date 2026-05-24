import type { Stock } from '../types';

export interface LivePrice {
  price: number;
  prevClose: number;
}

const WORKER = 'https://my-stock-proxy.zxc14708.workers.dev/?url=';

function proxy(target: string): string {
  return WORKER + encodeURIComponent(target);
}

function toYahooTicker(ticker: string, market: string): string {
  if (market === 'KRX') return `${ticker}.KS`;
  if (market === 'KOSDAQ') return `${ticker}.KQ`;
  return ticker;
}

async function fetchNaver(stock: Stock): Promise<{ id: string; price: number; prevClose: number } | null> {
  const url = proxy(`https://m.stock.naver.com/api/stock/${stock.ticker}/basic`);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const d = await res.json();
    const price = parseFloat(String(d.closePrice).replace(/,/g, ''));
    const change = parseFloat(String(d.compareToPreviousClosePrice).replace(/,/g, ''));
    if (!price) return null;
    return { id: stock.id, price, prevClose: price - change };
  } catch {
    return null;
  }
}

async function fetchYahoo(stock: Stock): Promise<{ id: string; price: number; prevClose: number } | null> {
  const symbol = toYahooTicker(stock.ticker, stock.market);
  const url = proxy(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`);
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
  const korean = stocks.filter(s => s.market === 'KRX' || s.market === 'KOSDAQ');
  const us = stocks.filter(s => s.market === 'NYSE' || s.market === 'NASDAQ');
  const CHUNK = 5;

  for (let i = 0; i < korean.length; i += CHUNK) {
    const settled = await Promise.allSettled(korean.slice(i, i + CHUNK).map(fetchNaver));
    settled.forEach(r => {
      if (r.status === 'fulfilled' && r.value)
        result.set(r.value.id, { price: r.value.price, prevClose: r.value.prevClose });
    });
  }

  for (let i = 0; i < us.length; i += CHUNK) {
    const settled = await Promise.allSettled(us.slice(i, i + CHUNK).map(fetchYahoo));
    settled.forEach(r => {
      if (r.status === 'fulfilled' && r.value)
        result.set(r.value.id, { price: r.value.price, prevClose: r.value.prevClose });
    });
  }

  return result;
}
