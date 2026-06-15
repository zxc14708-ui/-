/**
 * toss-local-proxy — 집 PC에서 실행하는 토스증권 Open API 로컬 프록시
 *
 * 왜 필요한가:
 *   토스 Open API는 "허용 IP 관리"에 등록된 고정 IP에서만 호출을 받는다.
 *   Cloudflare Worker는 동적 IP라 등록이 불가능하므로, 집 IP에서 출발하는
 *   이 로컬 서버가 토스 호출을 대신 중계한다.
 *
 * 보안:
 *   - client_id / client_secret 은 .env 에서만 읽는다 (코드/깃 커밋 금지)
 *   - access token 발급/인증은 서버에서 처리, 브라우저로는 절대 노출하지 않음
 *   - GET(읽기) 전용 → 이 경로로는 주문 실행 불가
 *   - 토큰/secret 값은 로그에 찍지 않음
 *
 * 사용법:
 *   1) cp .env.example .env  후 client_id / client_secret 입력
 *   2) npm install
 *   3) npm start   (기본 http://localhost:3001)
 *   4) 브라우저 앱은 http://localhost:3001/toss/api/... 로 호출
 *
 * 연결 테스트(서버 실행 후 브라우저 주소창):
 *   http://localhost:3001/toss/api/v1/stocks?symbols=005930
 *   http://localhost:3001/health
 */

import http from 'node:http';
import 'dotenv/config';

const TOSS_BASE = 'https://openapi.tossinvest.com';
const PORT = Number(process.env.PORT) || 3001;
const CLIENT_ID = process.env.TOSS_CLIENT_ID;
const CLIENT_SECRET = process.env.TOSS_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('[toss-proxy] TOSS_CLIENT_ID / TOSS_CLIENT_SECRET 미설정. .env 를 확인하세요.');
  process.exit(1);
}

// access token 메모리 캐시 { token, expiry }
let tokenCache = null;

// ---------------------------------------------------------------------------
// OAuth2 Client Credentials (HTTP Basic 인증)
//   토스 토큰 엔드포인트는 Authorization: Basic base64(id:secret) 를 요구하고,
//   body 로는 grant_type 만 전달한다.
// ---------------------------------------------------------------------------
async function fetchToken() {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${TOSS_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`token HTTP ${res.status}: ${text.slice(0, 160)}`);
  }

  const data = await res.json();
  if (!data.access_token) throw new Error('token 응답에 access_token 없음');

  // expires_in(초) - 60초 버퍼. 없으면 보수적으로 30분.
  const ttlMs = (Number(data.expires_in) > 0 ? Number(data.expires_in) - 60 : 30 * 60) * 1000;
  return { token: data.access_token, expiry: Date.now() + ttlMs };
}

async function getToken() {
  if (tokenCache && Date.now() < tokenCache.expiry) return tokenCache.token;
  tokenCache = await fetchToken();
  return tokenCache.token;
}

// ---------------------------------------------------------------------------
// 토스 GET 프록시 (401 시 1회 토큰 갱신 재시도)
// ---------------------------------------------------------------------------
async function tossGet(path) {
  const url = `${TOSS_BASE}${path}`;
  const call = token =>
    fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });

  let res = await call(await getToken());
  if (res.status === 401) {
    tokenCache = null; // 만료 가능성 → 강제 갱신 후 재시도
    res = await call(await getToken());
  }
  return res;
}

// ---------------------------------------------------------------------------
// HTTP 서버
// ---------------------------------------------------------------------------
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
}

function sendJson(res, status, obj) {
  setCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);

  // 헬스체크 — secret 값은 노출하지 않고 주입 여부만 확인
  if (reqUrl.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      hasClientId: !!CLIENT_ID,
      hasClientSecret: !!CLIENT_SECRET,
      hasToken: !!tokenCache,
    });
    return;
  }

  // 토스 프록시: /toss/api/v1/stocks?symbols=005930 → /api/v1/stocks?symbols=005930
  if (reqUrl.pathname.startsWith('/toss/')) {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'GET(읽기)만 허용' });
      return;
    }
    const path = reqUrl.pathname.slice('/toss'.length) + reqUrl.search;
    try {
      const upstream = await tossGet(path);
      const body = await upstream.text();
      setCors(res);
      const ct = upstream.headers.get('Content-Type') || 'application/json';
      res.writeHead(upstream.status, { 'Content-Type': ct });
      res.end(body);
    } catch (e) {
      sendJson(res, 502, { error: 'toss proxy 실패', message: e.message });
    }
    return;
  }

  sendJson(res, 404, { error: 'not found', hint: '/toss/api/... 또는 /health 를 사용하세요' });
});

server.listen(PORT, () => {
  console.log(`[toss-proxy] http://localhost:${PORT} 에서 실행 중`);
  console.log(`[toss-proxy] 테스트: http://localhost:${PORT}/toss/api/v1/stocks?symbols=005930`);
});
