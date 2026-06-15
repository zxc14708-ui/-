/**
 * 토스증권 Open API 클라이언트 (집 PC 로컬 프록시 경유)
 *
 * 구조:
 *   브라우저 → http://localhost:3001/toss/api/...  → (집 고정 IP) → 토스 Open API
 *
 * 주의:
 *   - 토스 API는 "허용 IP 관리"에 등록된 집 IP에서만 호출을 받으므로
 *     로컬 프록시(proxy/server.js)가 실행 중일 때만 동작한다.
 *   - 프록시가 꺼져 있으면 호출이 빠르게 실패하고, 호출부(yahooFinance.ts /
 *     useExchangeRate.ts)에서 Naver/Yahoo/er-api 로 자동 폴백한다.
 *   - client_id / client_secret 은 브라우저에 두지 않는다 (프록시 .env 에만).
 *
 * 확인된 응답 구조(2026-06):
 *   GET /api/v1/prices?symbols=005930
 *     → { result: [ { symbol, lastPrice:"341500", currency:"KRW", ... } ] }
 *   GET /api/v1/candles?symbol=005930&interval=1d   (최신순 정렬)
 *     → { result: { candles: [ { timestamp, closePrice:"341500", ... }, ... ] } }
 *   GET /api/v1/exchange-rate?baseCurrency=USD&quoteCurrency=KRW
 *     → { result: { rate:"1516.17", midRate:"1515.67", ... } }
 */

import type { LivePrice } from './yahooFinance';

const LOCAL_PROXY = 'http://localhost:3001/toss';

/** 토스 Open API 경로를 로컬 프록시 URL로 변환 (예: /api/v1/prices?symbols=005930) */
export function tossProxyUrl(path: string): string {
  return `${LOCAL_PROXY}${path.startsWith('/') ? path : `/${path}`}`;
}

/** 토스 Open API GET 호출 → JSON 반환 (프록시 미실행 시 빠르게 실패) */
export async function tossFetch<T = unknown>(path: string, timeoutMs = 2500): Promise<T> {
  const res = await fetch(tossProxyUrl(path), { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Toss API ${res.status}: ${text.slice(0, 160)}`);
  }
  return res.json() as Promise<T>;
}

/** 문자열/숫자 → 양수 number (콤마 제거). 실패 시 null */
function parseNum(raw: unknown): number | null {
  if (raw == null) return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface TossPriceResp {
  result?: Array<{ symbol?: string; lastPrice?: string | number }>;
}
interface TossCandle {
  timestamp?: string;
  closePrice?: string | number;
}
interface TossCandleResp {
  result?: { candles?: TossCandle[] };
}
interface TossRateResp {
  result?: { rate?: string | number; midRate?: string | number };
}

/**
 * 캔들 배열(최신순)에서 "직전 거래일 종가"를 고른다.
 *   - candles[0] 이 오늘이면 candles[1] = 전일종가
 *   - 오늘 캔들이 아직 없으면(장 시작 전) candles[0] = 전일종가
 *   → 한국 시각 기준 오늘보다 이전 날짜의 첫 캔들 종가를 사용
 */
function pickPrevClose(candles: TossCandle[]): number | null {
  if (!candles.length) return null;
  const todayKST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }); // YYYY-MM-DD
  for (const c of candles) {
    const d = (c.timestamp ?? '').slice(0, 10);
    if (d && d < todayKST) {
      const n = parseNum(c.closePrice);
      if (n != null) return n;
    }
  }
  // 폴백: 두 번째 캔들
  return parseNum(candles[1]?.closePrice);
}

/**
 * 국내 주식 현재가 + 전일종가 조회.
 *   - 현재가: /prices 의 lastPrice (실시간)
 *   - 전일종가: /candles(1d) 의 직전 거래일 종가
 * 둘 다 성공해야 LivePrice 반환. 실패 시 null → 호출부에서 Naver/Yahoo 폴백.
 */
export async function fetchTossKrPrice(ticker: string): Promise<LivePrice | null> {
  try {
    const [priceJson, candleJson] = await Promise.all([
      tossFetch<TossPriceResp>(`/api/v1/prices?symbols=${encodeURIComponent(ticker)}`),
      tossFetch<TossCandleResp>(`/api/v1/candles?symbol=${encodeURIComponent(ticker)}&interval=1d`),
    ]);
    const price = parseNum(priceJson?.result?.[0]?.lastPrice);
    if (price == null) return null;
    const prevClose = pickPrevClose(candleJson?.result?.candles ?? []) ?? price;
    return { price, prevClose };
  } catch {
    return null;
  }
}

/** USD→KRW 환율 (토스). 실패 시 null → 호출부에서 er-api 폴백. */
export async function fetchTossExchangeRate(): Promise<number | null> {
  try {
    const json = await tossFetch<TossRateResp>(
      '/api/v1/exchange-rate?baseCurrency=USD&quoteCurrency=KRW'
    );
    return parseNum(json?.result?.rate) ?? parseNum(json?.result?.midRate);
  } catch {
    return null;
  }
}

/**
 * 연결 테스트 — 한 종목 시세를 원본 그대로 반환.
 * 브라우저 콘솔에서 `probeToss('005930').then(console.log)` 로 응답 구조 확인.
 */
export async function probeToss(symbol = '005930'): Promise<unknown> {
  return tossFetch(`/api/v1/prices?symbols=${encodeURIComponent(symbol)}`);
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).probeToss = probeToss;
}
