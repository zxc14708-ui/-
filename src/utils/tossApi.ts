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
 * 시장(국내/미국) 무관하게 동작하도록 시간대 비교 없이 둘째 캔들을 사용한다.
 *   - candles[0] = 현재(또는 가장 최근) 세션, candles[1] = 직전 세션 종가 = 전일종가
 *   - lastPrice 가 candles[0] 세션에 대응하므로 candles[1] 이 전일종가로 일관됨
 */
function pickPrevClose(candles: TossCandle[]): number | null {
  return parseNum(candles[1]?.closePrice) ?? parseNum(candles[0]?.closePrice);
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// 전일종가 캐시 — 하루에 한 번만 캔들을 받아 재사용 (key: `${symbol}|${YYYY-MM-DD}`)
const prevCloseCache = new Map<string, number>();

/**
 * 주식 시세 일괄 조회 (국내·미국 공통, 토스 레이트리밋 회피용 설계).
 *   1) 현재가: /prices?symbols=A,B,C  로 묶어서 호출 (20개씩) → 호출 수 최소화
 *   2) 전일종가: /candles 는 종목당 1회지만 하루 동안 캐시 → 첫 로드 후엔 재호출 없음
 *      (첫 로드 시에도 2개씩 끊어 250ms 간격으로 호출해 429 방지)
 * 반환: ticker → LivePrice (조회 성공한 종목만). 실패분은 호출부에서 Naver/Yahoo 폴백.
 */
export async function fetchTossLivePrices(tickers: string[]): Promise<Map<string, LivePrice>> {
  const out = new Map<string, LivePrice>();
  if (!tickers.length) return out;

  // 1) 현재가 배치 조회
  const priceMap = new Map<string, number>();
  const PRICE_BATCH = 20;
  for (let i = 0; i < tickers.length; i += PRICE_BATCH) {
    const batch = tickers.slice(i, i + PRICE_BATCH);
    try {
      const json = await tossFetch<TossPriceResp>(
        `/api/v1/prices?symbols=${batch.map(encodeURIComponent).join(',')}`
      );
      for (const r of json?.result ?? []) {
        const p = parseNum(r.lastPrice);
        if (p != null && r.symbol != null) priceMap.set(String(r.symbol), p);
      }
    } catch {
      /* 이 배치 실패(프록시 꺼짐/429 등) → 해당 종목은 폴백 대상 */
    }
  }
  if (!priceMap.size) return out; // 토스 전체 실패 → 폴백

  // 2) 전일종가: 캐시에 없는 종목만 캔들 조회 (소량씩 throttle)
  const todayKST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  const need = [...priceMap.keys()].filter(t => !prevCloseCache.has(`${t}|${todayKST}`));
  const CANDLE_CHUNK = 2;
  for (let i = 0; i < need.length; i += CANDLE_CHUNK) {
    const chunk = need.slice(i, i + CANDLE_CHUNK);
    await Promise.allSettled(
      chunk.map(async t => {
        try {
          const json = await tossFetch<TossCandleResp>(
            `/api/v1/candles?symbol=${encodeURIComponent(t)}&interval=1d`
          );
          const pc = pickPrevClose(json?.result?.candles ?? []);
          if (pc != null) prevCloseCache.set(`${t}|${todayKST}`, pc);
        } catch {
          /* 전일종가 실패 → 현재가로 대체(등락률 0%), 가격 표시는 유지 */
        }
      })
    );
    if (i + CANDLE_CHUNK < need.length) await sleep(250);
  }

  // 3) LivePrice 구성 (전일종가 없으면 현재가로 대체)
  for (const [ticker, price] of priceMap) {
    const prevClose = prevCloseCache.get(`${ticker}|${todayKST}`) ?? price;
    out.set(ticker, { price, prevClose });
  }
  return out;
}

/**
 * 종목명 조회 (토스). 국내는 한글명, 미국은 영문 약칭을 준다.
 *   예) 005930 → "삼성전자", TSM → "TSMC(ADR)"
 * 실패(프록시 꺼짐 등) 시 null → 호출부에서 보정 생략.
 */
export async function fetchTossStockName(ticker: string): Promise<string | null> {
  try {
    const json = await tossFetch<{ result?: Array<{ name?: string }> }>(
      `/api/v1/stocks?symbols=${encodeURIComponent(ticker)}`
    );
    const name = json?.result?.[0]?.name;
    return name && name.trim() ? name.trim() : null;
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
