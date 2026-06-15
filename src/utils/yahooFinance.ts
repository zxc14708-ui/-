import type { Stock } from '../types';
import { fetchTossLivePrices } from './tossApi';

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

  // 1차: v7 quote — regularMarketPreviousClose를 직접 제공하므로 등락률 정확
  try {
    const url = proxy(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&fields=regularMarketPrice,regularMarketPreviousClose`);
    const res = await fetch(url);
    if (!res.ok) { console.warn(`[yahoo] ${symbol} v7/quote → HTTP ${res.status}`); }
    else {
      const json = await res.json();
      const q = json.quoteResponse?.result?.[0];
      const price: number | undefined = q?.regularMarketPrice;
      if (price) return { id: stock.id, price, prevClose: q.regularMarketPreviousClose ?? price };
      console.warn(`[yahoo] ${symbol} v7/quote → no price, response:`, JSON.stringify(json).slice(0, 200));
    }
  } catch (e) { console.warn(`[yahoo] ${symbol} v7/quote → exception:`, e); }

  // 2차: v8 chart (query2 → query1) — chartPreviousClose는 차트 범위 직전 종가이므로 폴백용
  for (const host of ['query2', 'query1']) {
    try {
      const url = proxy(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`);
      const res = await fetch(url);
      if (!res.ok) { console.warn(`[yahoo] ${symbol} ${host} v8/chart → HTTP ${res.status}`); continue; }
      const json = await res.json();
      const result = json.chart?.result?.[0];
      const meta = result?.meta;
      const price: number | undefined = meta?.regularMarketPrice;
      if (!price) { console.warn(`[yahoo] ${symbol} ${host} v8/chart → no price, response:`, JSON.stringify(json).slice(0, 200)); continue; }
      // 바 데이터에서 직전 거래일 종가 추출 (chartPreviousClose보다 정확)
      const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
      const valid = closes.filter((c): c is number => c != null && isFinite(c));
      const barPrevClose = valid.length >= 2 ? valid[valid.length - 2] : null;
      return { id: stock.id, price, prevClose: barPrevClose ?? meta?.chartPreviousClose ?? price };
    } catch (e) { console.warn(`[yahoo] ${symbol} ${host} v8/chart → exception:`, e); }
  }

  // 3차: v8 quoteSummary
  try {
    const url = proxy(`https://query1.finance.yahoo.com/v8/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=price`);
    const res = await fetch(url);
    if (!res.ok) { console.warn(`[yahoo] ${symbol} v8/quoteSummary → HTTP ${res.status}`); }
    else {
      const json = await res.json();
      const p = json.quoteSummary?.result?.[0]?.price;
      const price: number | undefined = p?.regularMarketPrice?.raw;
      if (price) return { id: stock.id, price, prevClose: p.regularMarketPreviousClose?.raw ?? price };
      console.warn(`[yahoo] ${symbol} v8/quoteSummary → no price, response:`, JSON.stringify(json).slice(0, 200));
    }
  } catch (e) { console.warn(`[yahoo] ${symbol} v8/quoteSummary → exception:`, e); }

  console.error(`[yahoo] ${symbol} 모든 엔드포인트 실패`);
  return null;
}

export async function fetchLivePrices(stocks: Stock[]): Promise<Map<string, LivePrice>> {
  if (!stocks.length) return new Map();

  const result = new Map<string, LivePrice>();
  const CHUNK = 5;

  // 1) 토스(로컬 프록시)로 국내+미국 시세를 한 번에 배치 조회.
  //    현재가는 묶어서 호출하고 전일종가는 캐싱해 레이트리밋(429)을 피한다.
  //    프록시가 꺼져 있으면 빈 Map 이 반환돼 전부 폴백으로 넘어간다.
  const tossFailed: Stock[] = [];
  const tossPrices = await fetchTossLivePrices(stocks.map(s => s.ticker));
  for (const s of stocks) {
    const lp = tossPrices.get(s.ticker);
    if (lp) result.set(s.id, lp);
    else tossFailed.push(s);
  }

  // 2) 국내 폴백: 토스 실패분 → Naver → Yahoo
  const koreanFailed = tossFailed.filter(s => s.market === 'KRX' || s.market === 'KOSDAQ');
  const naverFailed: Stock[] = [];
  for (let i = 0; i < koreanFailed.length; i += CHUNK) {
    const chunk = koreanFailed.slice(i, i + CHUNK);
    const settled = await Promise.allSettled(chunk.map(fetchNaver));
    settled.forEach((r, idx) => {
      if (r.status === 'fulfilled' && r.value)
        result.set(r.value.id, { price: r.value.price, prevClose: r.value.prevClose });
      else
        naverFailed.push(chunk[idx]);
    });
  }

  // 3) 미국 폴백 + 국내 Naver 실패분 → Yahoo
  const yahooTargets = [
    ...tossFailed.filter(s => s.market === 'NYSE' || s.market === 'NASDAQ'),
    ...naverFailed,
  ];
  for (let i = 0; i < yahooTargets.length; i += CHUNK) {
    const settled = await Promise.allSettled(yahooTargets.slice(i, i + CHUNK).map(fetchYahoo));
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

// Naver 모바일에서 US 종목 한글명 조회
export async function fetchKoreanName(ticker: string): Promise<string | null> {
  try {
    const res = await fetch(proxy(`https://m.stock.naver.com/api/search/all?keyword=${encodeURIComponent(ticker)}`));
    if (!res.ok) return null;
    const json = await res.json();
    const stocks: Record<string, unknown>[] = json.stocks ?? [];
    const norm = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const match = stocks.find(s => {
      const code = String(s.symbolCode ?? s.itemCode ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      return code === norm;
    }) ?? (stocks.length === 1 ? stocks[0] : null);
    if (!match) return null;
    const name = String(match.name ?? '');
    return /[가-힣]/.test(name) ? name : null;
  } catch {
    return null;
  }
}

export async function searchYahooFinance(query: string): Promise<StockEntry[]> {
  const url = proxy(
    `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=15&newsCount=0&enableFuzzyQuery=false`
  );
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const quotes: Array<Record<string, string>> = json.quotes ?? [];
    const results = quotes
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

    // US 종목 한글명 보강
    return Promise.all(results.map(async stock => {
      if (stock.market === 'NYSE' || stock.market === 'NASDAQ') {
        const nameKo = await fetchKoreanName(stock.ticker);
        if (nameKo) return { ...stock, nameKo };
      }
      return stock;
    }));
  } catch {
    return [];
  }
}

export function isKoreanQuery(query: string): boolean {
  return /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(query);
}

// 한글 종목 검색 — 3단계 폴백 체인
export async function searchNaverFinance(query: string): Promise<StockEntry[]> {
  // 1차: Naver 모바일 검색 (가격 조회와 동일 호스트, 안정적)
  try {
    const res = await fetch(proxy(`https://m.stock.naver.com/api/search/all?keyword=${encodeURIComponent(query)}`));
    if (res.ok) {
      const json = await res.json();
      const stocks: Record<string, unknown>[] = json.stocks ?? [];
      const mapped = stocks.map(item => {
        const ticker = String(item.itemCode ?? '');
        const nameKo = String(item.name ?? '');
        const code = String((item.stockExchangeType as Record<string, unknown>)?.code ?? '');
        const market: Stock['market'] = code.toUpperCase().includes('KOSDAQ') ? 'KOSDAQ' : 'KRX';
        return { ticker, nameKo, nameEn: nameKo, market, currency: 'KRW' as const };
      }).filter(item => item.ticker);
      if (mapped.length > 0) return mapped;
    }
  } catch { /* fallthrough */ }

  // 2차: Naver 자동완성 API
  try {
    const res = await fetch(proxy(
      `https://ac.finance.naver.com/ac?q=${encodeURIComponent(query)}&q_enc=UTF-8&st=111&r_format=json&r_enc=UTF-8&r_lt=111`
    ));
    if (res.ok) {
      const json = await res.json();
      const items: string[][] = json.items?.[0] ?? [];
      const mapped = items
        .filter(item => item[3] !== '2')
        .map(item => {
          const nameKo = item[0] ?? '';
          const ticker = item[1] ?? '';
          const market: Stock['market'] = (item[4] ?? '').toUpperCase().includes('KOSDAQ') ? 'KOSDAQ' : 'KRX';
          return { ticker, nameKo, nameEn: nameKo, market, currency: 'KRW' as const };
        })
        .filter(item => item.ticker);
      if (mapped.length > 0) return mapped;
    }
  } catch { /* fallthrough */ }

  return [];
}
