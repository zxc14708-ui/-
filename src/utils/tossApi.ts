/**
 * 토스증권 Open API 클라이언트 (집 PC 로컬 프록시 경유)
 *
 * 구조:
 *   브라우저 → http://localhost:3001/toss/api/...  → (집 고정 IP) → 토스 Open API
 *
 * 주의:
 *   - 토스 API는 "허용 IP 관리"에 등록된 집 IP에서만 호출을 받으므로
 *     로컬 프록시(proxy/server.js)가 실행 중일 때만 동작한다.
 *   - 프록시가 꺼져 있으면 호출이 실패하고, 호출부(yahooFinance.ts)에서
 *     Naver/Yahoo 로 자동 폴백한다.
 *   - client_id / client_secret 은 브라우저에 두지 않는다 (프록시 .env 에만).
 */

import type { LivePrice } from './yahooFinance';

const LOCAL_PROXY = 'http://localhost:3001/toss';

/** 토스 Open API 경로를 로컬 프록시 URL로 변환 (예: /api/v1/stocks?symbols=005930) */
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

/**
 * 연결 테스트 — 한 종목 시세를 원본 그대로 반환.
 * 브라우저 콘솔에서 `probeToss('005930').then(console.log)` 로 응답 구조 확인.
 * (개발 편의를 위해 window 에도 노출)
 */
export async function probeToss(symbol = '005930'): Promise<unknown> {
  return tossFetch(`/api/v1/stocks?symbols=${encodeURIComponent(symbol)}`);
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).probeToss = probeToss;
}

/**
 * 국내 주식 현재가/전일종가 조회.
 *
 * ⚠️ 응답 필드 매핑은 probeToss 로 실제 구조를 확인한 뒤 확정한다.
 *    아래 PRICE_FIELDS / PREV_FIELDS 는 흔한 후보 이름들이며, 실제 응답을
 *    보고 정확한 키만 남기면 된다. 후보 중 처음 발견되는 숫자 필드를 사용.
 */
const PRICE_FIELDS = ['currentPrice', 'closePrice', 'price', 'lastPrice', 'tradePrice'];
const PREV_FIELDS = ['previousClose', 'prevClose', 'basePrice', 'prevPrice', 'previousDayClose'];

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const raw = obj[k];
    if (raw == null) continue;
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/,/g, ''));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** 토스 응답 객체에서 종목 레코드 배열을 최대한 견고하게 추출 */
function extractRecords(json: unknown): Record<string, unknown>[] {
  if (Array.isArray(json)) return json as Record<string, unknown>[];
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    for (const key of ['stocks', 'data', 'results', 'items', 'result']) {
      if (Array.isArray(o[key])) return o[key] as Record<string, unknown>[];
    }
    // 단일 객체 응답
    return [o];
  }
  return [];
}

/**
 * 토스에서 국내 종목 시세를 가져와 LivePrice 로 변환.
 * 실패(프록시 꺼짐/필드 불일치) 시 null 반환 → 호출부에서 폴백.
 */
export async function fetchTossKrPrice(ticker: string): Promise<LivePrice | null> {
  try {
    const json = await tossFetch(`/api/v1/stocks?symbols=${encodeURIComponent(ticker)}`);
    const rec = extractRecords(json)[0];
    if (!rec) return null;
    const price = pickNumber(rec, PRICE_FIELDS);
    if (price == null) return null;
    const prevClose = pickNumber(rec, PREV_FIELDS) ?? price;
    return { price, prevClose };
  } catch {
    return null;
  }
}
