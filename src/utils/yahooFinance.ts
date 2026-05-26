import type { Stock } from '../types';

export interface LivePrice {
  price: number;
  prevClose: number;
}

export type StockEntry = Pick<Stock, 'ticker' | 'nameKo' | 'nameEn' | 'market' | 'currency'>;

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

  // 1차: v8 chart (query2 → query1 순서로 시도)
  for (const host of ['query2', 'query1']) {
    try {
      const url = proxy(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`);
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      const meta = json.chart?.result?.[0]?.meta;
      const price: number | undefined = meta?.regularMarketPrice;
      if (price) return { id: stock.id, price, prevClose: meta.chartPreviousClose ?? price };
    } catch {}
  }

  // 2차: v7 quote fallback (인증 없이도 비교적 안정적)
  try {
    const url = proxy(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&fields=regularMarketPrice,regularMarketPreviousClose`);
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const q = json.quoteResponse?.result?.[0];
    const price: number | undefined = q?.regularMarketPrice;
    if (!price) return null;
    return { id: stock.id, price, prevClose: q.regularMarketPreviousClose ?? price };
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

  // Try Naver first for Korean stocks; fall back to Yahoo if Naver fails
  const naverFailed: Stock[] = [];
  for (let i = 0; i < korean.length; i += CHUNK) {
    const chunk = korean.slice(i, i + CHUNK);
    const settled = await Promise.allSettled(chunk.map(fetchNaver));
    settled.forEach((r, idx) => {
      if (r.status === 'fulfilled' && r.value)
        result.set(r.value.id, { price: r.value.price, prevClose: r.value.prevClose });
      else
        naverFailed.push(chunk[idx]);
    });
  }

  // Yahoo fallback for Korean stocks Naver couldn't serve
  for (let i = 0; i < naverFailed.length; i += CHUNK) {
    const settled = await Promise.allSettled(naverFailed.slice(i, i + CHUNK).map(fetchYahoo));
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

// Yahoo Finance 거래소 코드 → market 매핑
const EXCHANGE_MAP: Record<string, Stock['market']> = {
  NMS: 'NASDAQ', // NASDAQ Global Select
  NGM: 'NASDAQ', // NASDAQ Global Market
  NCM: 'NASDAQ', // NASDAQ Capital Market
  NYQ: 'NYSE',   // NYSE
  ASE: 'NYSE',   // NYSE American (Amex)
  PCX: 'NYSE',   // NYSE Arca
  NYS: 'NYSE',
  KSC: 'KRX',    // Korea Stock Exchange (KOSPI)
  KOE: 'KOSDAQ', // KOSDAQ
};

export async function searchYahooFinance(query: string): Promise<StockEntry[]> {
  const url = proxy(
    `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=15&newsCount=0&enableFuzzyQuery=false`
  );
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const quotes: Array<Record<string, string>> = json.quotes ?? [];
    return quotes
      .filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
      .map(q => {
        const symbol = q.symbol ?? '';
        let ticker = symbol;
        let market: Stock['market'] = EXCHANGE_MAP[q.exchange] ?? 'NYSE';
        let currency: Stock['currency'] = 'USD';

        if (symbol.endsWith('.KS')) {
          ticker = symbol.replace('.KS', '');
          market = 'KRX';
          currency = 'KRW';
        } else if (symbol.endsWith('.KQ')) {
          ticker = symbol.replace('.KQ', '');
          market = 'KOSDAQ';
          currency = 'KRW';
        }

        const name = q.longname || q.shortname || symbol;
        return { ticker, nameKo: name, nameEn: name, market, currency };
      });
  } catch {
    return [];
  }
}

export function isKoreanQuery(query: string): boolean {
  return /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(query);
}

// 네이버 금융 자동완성 API — 한글 이름 검색용
export async function searchNaverFinance(query: string): Promise<StockEntry[]> {
  const url = proxy(
    `https://ac.finance.naver.com/ac?q=${encodeURIComponent(query)}&q_enc=UTF-8&st=111&r_format=json&r_enc=UTF-8&r_lt=111`
  );
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    // items[0]: 종목 목록, 각 항목 = [한글명, 종목코드, '', 타입, 시장, '']
    // 타입: '1'=주식, '2'=지수(제외), '3'=선물/옵션(제외), '4'=ETF 등
    const items: string[][] = json.items?.[0] ?? [];
    return items
      .filter(item => item[3] !== '2') // 지수 제외
      .map(item => {
        const nameKo = item[0] ?? '';
        const ticker = item[1] ?? '';
        const marketStr = (item[4] ?? '').toUpperCase();
        const market: Stock['market'] = marketStr.includes('KOSDAQ') ? 'KOSDAQ' : 'KRX';
        return { ticker, nameKo, nameEn: nameKo, market, currency: 'KRW' as const };
      })
      .filter(item => item.ticker);
  } catch {
    return [];
  }
}
