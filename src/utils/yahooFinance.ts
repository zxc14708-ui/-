import type { Stock } from '../types';

export interface LivePrice {
  price: number;
  prevClose: number;
}

function toYahooTicker(ticker: string, market: string): string {
  if (market === 'KRX') return `${ticker}.KS`;
  if (market === 'KOSDAQ') return `${ticker}.KQ`;
  return ticker; // NYSE, NASDAQ
}

export async function fetchLivePrices(stocks: Stock[]): Promise<Map<string, LivePrice>> {
  if (!stocks.length) return new Map();

  const result = new Map<string, LivePrice>();
  const BATCH = 20;

  for (let i = 0; i < stocks.length; i += BATCH) {
    const batch = stocks.slice(i, i + BATCH);
    const symbols = batch.map(s => toYahooTicker(s.ticker, s.market)).join(',');
    const url =
      `https://query1.finance.yahoo.com/v7/finance/quote` +
      `?symbols=${encodeURIComponent(symbols)}` +
      `&fields=regularMarketPrice,regularMarketPreviousClose`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status}`);

    const json = await res.json();
    const quotes: Record<string, number>[] = json.quoteResponse?.result ?? [];

    for (const q of quotes) {
      const yahooSym: string = q.symbol as unknown as string;
      const stock = batch.find(s => toYahooTicker(s.ticker, s.market) === yahooSym);
      if (!stock) continue;
      const price = q.regularMarketPrice as unknown as number;
      if (price == null) continue;
      result.set(stock.id, {
        price,
        prevClose: (q.regularMarketPreviousClose as unknown as number) ?? price,
      });
    }
  }

  return result;
}
