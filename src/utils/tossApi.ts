/**
 * 토스증권 Open API 클라이언트 (Cloudflare Worker 프록시 경유)
 *
 * 주의: client_id / client_secret 은 브라우저에 두지 않습니다.
 *       OAuth 토큰 발급·인증은 Worker(서버)에서 처리하고, 여기서는
 *       Worker의 ?toss= 경로(GET 전용)로 읽기 요청만 보냅니다.
 *
 * 상태: 연결 계층 완료. 시세/환율 응답 필드 매핑은 실제 응답 구조
 *       확인 후 추가 예정(probeToss 로 원본 JSON 확인).
 */

const WORKER = 'https://my-stock-proxy.zxc14708.workers.dev';

/** 토스 Open API 경로를 Worker 프록시 URL로 변환 (예: /api/v1/stocks?symbols=005930) */
export function tossProxyUrl(path: string): string {
  return `${WORKER}/?toss=${encodeURIComponent(path)}`;
}

/** 토스 Open API GET 호출 → JSON 반환 */
export async function tossFetch<T = unknown>(path: string): Promise<T> {
  const res = await fetch(tossProxyUrl(path), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Toss API ${res.status}: ${text.slice(0, 160)}`);
  }
  return res.json() as Promise<T>;
}

/**
 * 연결 테스트 — 한 종목 시세를 원본 그대로 반환.
 * 콘솔에서 `probeToss('005930').then(console.log)` 로 응답 구조를 확인하세요.
 */
export async function probeToss(symbol = '005930'): Promise<unknown> {
  return tossFetch(`/api/v1/stocks?symbols=${encodeURIComponent(symbol)}`);
}
