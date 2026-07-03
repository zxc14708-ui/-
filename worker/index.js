/**
 * my-stock-proxy — Cloudflare Worker
 *
 * 역할:
 *   1) CORS 우회 프록시 + Yahoo Finance crumb/cookie 자동 인증  (?url=...)
 *   2) 토스증권 Open API OAuth2 토큰 발급/캐싱 + 인증 프록시      (?toss=/api/...)
 *      - GET(읽기) 전용 → 이 경로로는 주문 실행 불가
 *      - 자격증명은 Worker secret(env)에서만 읽음
 *   3) 기기 간 동기화 저장소 (?action=sync&key=<sha256>)
 *      - PUT: 암호문 저장 / GET: 암호문 조회 (KV namespace 바인딩 필요)
 *
 * 필요한 Worker secret (Cloudflare Dashboard → Worker → Settings → Variables):
 *   TOSS_CLIENT_ID      (Encrypt)
 *   TOSS_CLIENT_SECRET  (Encrypt)
 *
 * 필요한 KV 바인딩 (Settings → Bindings → KV namespace):
 *   SYNC_KV  (다른 이름으로 이미 바인딩돼 있으면 아래 getSyncKV 후보 목록에 포함되면 자동 인식)
 *
 * 배포 방법:
 *   Cloudflare Dashboard → Workers & Pages → my-stock-proxy → Edit code
 *   → 이 파일 전체를 붙여넣기 → Save and deploy
 *
 * 연결 테스트(배포 후, 브라우저 주소창):
 *   https://my-stock-proxy.zxc14708.workers.dev/?toss=/api/v1/stocks?symbols=005930
 */

// Worker 인스턴스 메모리에 crumb 캐시 (최대 25분)
let yahooAuth = null; // { crumb, cookie, expiry }

// 토스증권 Open API access token 캐시 (instance memory)
let tossToken = null; // { token, expiry }

const TOSS_BASE = 'https://openapi.tossinvest.com';

// ---------------------------------------------------------------------------
// 토스증권 Open API 인증 (OAuth2 Client Credentials)
//   - client_id / client_secret 은 Worker secret(env)에서만 읽음 (코드에 하드코딩 금지)
//   - access token 을 instance 메모리에 캐시하고 만료 60초 전 갱신
// ---------------------------------------------------------------------------

async function fetchTossToken(env) {
  if (!env || !env.TOSS_CLIENT_ID || !env.TOSS_CLIENT_SECRET) {
    throw new Error('TOSS_CLIENT_ID / TOSS_CLIENT_SECRET 미설정 (Worker secret 등록 필요)');
  }

  // 토스 토큰 엔드포인트는 HTTP Basic 인증(Authorization: Basic base64(id:secret))을 요구.
  // grant_type 만 body 로 전달 (curl -u 'ID:SECRET' -d 'grant_type=client_credentials' 와 동일)
  const basic = btoa(`${env.TOSS_CLIENT_ID}:${env.TOSS_CLIENT_SECRET}`);
  const body = new URLSearchParams({ grant_type: 'client_credentials' });

  const res = await fetch(`${TOSS_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${basic}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`token HTTP ${res.status}: ${text.slice(0, 120)}`);
  }

  const data = await res.json();
  const token = data.access_token;
  if (!token) throw new Error('token 응답에 access_token 없음');

  // expires_in(초) - 60초 버퍼. 없으면 보수적으로 30분.
  const ttlMs = (Number(data.expires_in) > 0 ? Number(data.expires_in) - 60 : 30 * 60) * 1000;
  return { token, expiry: Date.now() + ttlMs };
}

async function getTossToken(env) {
  if (tossToken && Date.now() < tossToken.expiry) return tossToken.token;
  tossToken = await fetchTossToken(env);
  return tossToken.token;
}

/**
 * 토스 Open API 프록시 — GET 전용(읽기 전용)으로 제한해 주문 실행 경로를 차단.
 * 사용법: ?toss=/api/v1/stocks?symbols=005930
 */
async function handleToss(rawPath, env) {
  // GET 전용이므로 호출 시점에서 메서드 검증은 메인 핸들러가 수행
  let path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

  // 안전장치: openapi.tossinvest.com 외 호스트로의 우회 차단 (절대경로 입력 방지)
  if (/^https?:/i.test(rawPath)) {
    return jsonResponse({ error: 'toss 경로는 절대 URL이 아닌 경로(/api/...)만 허용' }, 400);
  }

  try {
    const token = await getTossToken(env);
    const res = await fetch(`${TOSS_BASE}${path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    // 401 → 토큰 만료 가능성, 1회 갱신 후 재시도
    let finalRes = res;
    if (res.status === 401) {
      tossToken = null;
      const fresh = await getTossToken(env);
      finalRes = await fetch(`${TOSS_BASE}${path}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${fresh}`, Accept: 'application/json' },
      });
    }

    const headers = { ...corsHeaders() };
    const ct = finalRes.headers.get('Content-Type');
    if (ct) headers['Content-Type'] = ct;
    return new Response(finalRes.body, { status: finalRes.status, headers });
  } catch (e) {
    return jsonResponse({ error: 'toss proxy 실패', message: e.message }, 502);
  }
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

// ---------------------------------------------------------------------------
// Yahoo Finance 인증 (crumb + cookie)
// ---------------------------------------------------------------------------

async function fetchYahooAuth() {
  // 1단계: fc.yahoo.com 에서 쿠키 취득
  const initRes = await fetch('https://fc.yahoo.com', {
    headers: browserHeaders(),
    redirect: 'follow',
  });

  // set-cookie 헤더에서 쿠키 추출 (Cloudflare Workers는 복수 Set-Cookie를 하나로 합칠 수 있음)
  const rawCookie = initRes.headers.get('set-cookie') ?? '';
  const cookie = parseCookies(rawCookie);

  // 2단계: crumb 취득
  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { ...browserHeaders(), Cookie: cookie },
  });

  if (!crumbRes.ok) {
    throw new Error(`crumb HTTP ${crumbRes.status}`);
  }

  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.startsWith('<') || crumb.length > 100) {
    throw new Error(`invalid crumb: ${crumb.slice(0, 40)}`);
  }

  return { crumb, cookie, expiry: Date.now() + 25 * 60 * 1000 };
}

async function getYahooAuth() {
  if (yahooAuth && Date.now() < yahooAuth.expiry) return yahooAuth;
  yahooAuth = await fetchYahooAuth();
  return yahooAuth;
}

// ---------------------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------------------

function browserHeaders() {
  return {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    Origin: 'https://finance.yahoo.com',
    Referer: 'https://finance.yahoo.com/',
  };
}

/**
 * set-cookie 헤더 문자열에서 name=value 쌍만 추출하여 Cookie 헤더 형식으로 반환
 */
function parseCookies(raw) {
  return raw
    .split(/,(?=\s*\w+=)/) // 각 쿠키를 분리
    .map(c => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

function addCrumb(url, crumb) {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}crumb=${encodeURIComponent(crumb)}`;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
}

// ---------------------------------------------------------------------------
// 기기 간 동기화 (?action=sync&key=<sha256 hex>)
//   - 클라이언트가 AES-256-GCM으로 암호화한 blob 을 KV 에 저장/조회만 한다.
//   - 서버(Worker)는 비밀번호를 모르므로 내용 해독 불가.
// ---------------------------------------------------------------------------

function getSyncKV(env) {
  // 기존 배포에서 쓰던 바인딩 이름이 다를 수 있어 흔한 후보를 순서대로 탐색
  const candidates = ['SYNC_KV', 'KV', 'PORTFOLIO_KV', 'STOCK_KV', 'SYNC', 'DATA'];
  for (const name of candidates) {
    const kv = env && env[name];
    if (kv && typeof kv.get === 'function' && typeof kv.put === 'function') return kv;
  }
  return null;
}

async function handleSync(request, reqUrl, env) {
  const key = reqUrl.searchParams.get('key') || '';
  // hashUserId(sha256) 결과인 64자리 hex 만 허용 — KV 키 오염 방지
  if (!/^[a-f0-9]{64}$/i.test(key)) {
    return jsonResponse({ error: 'invalid key' }, 400);
  }
  const kv = getSyncKV(env);
  if (!kv) {
    return jsonResponse(
      { error: 'KV 바인딩 없음 — Worker Settings → Bindings 에서 KV namespace 를 SYNC_KV 이름으로 연결하세요' },
      500,
    );
  }

  if (request.method === 'GET') {
    const data = await kv.get(key);
    if (data === null) return jsonResponse({ error: 'not found' }, 404);
    return new Response(data, {
      status: 200,
      headers: { 'Content-Type': 'text/plain', ...corsHeaders() },
    });
  }

  if (request.method === 'PUT') {
    const body = await request.text();
    // 암호화 blob 크기 상한 5MB — 비정상 요청 차단
    if (!body || body.length > 5_000_000) {
      return jsonResponse({ error: 'invalid body' }, 400);
    }
    await kv.put(key, body);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: 'method not allowed' }, 405);
}

// ---------------------------------------------------------------------------
// 메인 핸들러
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const reqUrl = new URL(request.url);

    // 기기 간 동기화: ?action=sync&key=<sha256>  (GET=조회 / PUT=저장)
    if (reqUrl.searchParams.get('action') === 'sync') {
      return handleSync(request, reqUrl, env);
    }

    // 토스증권 Open API 경로: ?toss=/api/v1/stocks?symbols=005930  (GET 전용)
    const tossPath = reqUrl.searchParams.get('toss');
    if (tossPath !== null) {
      if (request.method !== 'GET') {
        return jsonResponse({ error: 'toss 프록시는 GET(읽기)만 허용' }, 405);
      }
      // 진단: secret 주입 상태만 확인 (값은 노출하지 않음)
      if (tossPath === '__debug') {
        const id = (env && env.TOSS_CLIENT_ID) || '';
        const secret = (env && env.TOSS_CLIENT_SECRET) || '';
        return jsonResponse({
          hasClientId: !!id,
          clientIdLen: id.length,
          clientIdTrimmedLen: id.trim().length,
          clientIdPrefix: id.slice(0, 5),
          hasClientSecret: !!secret,
          clientSecretLen: secret.length,
          clientSecretTrimmedLen: secret.trim().length,
          idEqualsSecret: !!id && id === secret,
        });
      }
      // searchParams.get 은 첫 '?' 이후 한 토큰만 디코딩하므로, 원본에서 toss= 이후 전체를 추출
      const rawQuery = reqUrl.search; // e.g. ?toss=/api/v1/stocks?symbols=005930
      const tossRaw = rawQuery.slice(rawQuery.indexOf('toss=') + 'toss='.length);
      return handleToss(decodeURIComponent(tossRaw), env);
    }

    const target = reqUrl.searchParams.get('url');

    if (!target) {
      return new Response(JSON.stringify({ error: 'missing url param' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response(JSON.stringify({ error: 'invalid url' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    const isYahoo =
      targetUrl.hostname.endsWith('yahoo.com') &&
      (targetUrl.pathname.includes('/finance/') || targetUrl.pathname.includes('/v1/'));

    const isNaver = targetUrl.hostname.endsWith('naver.com');

    // 요청 헤더 구성
    const headers = { ...browserHeaders() };
    if (isNaver) {
      headers['Referer'] = 'https://m.stock.naver.com/';
    }

    let fetchUrl = target;

    // Yahoo Finance → crumb 인증 추가
    if (isYahoo) {
      try {
        const auth = await getYahooAuth();
        headers['Cookie'] = auth.cookie;
        fetchUrl = addCrumb(target, auth.crumb);
      } catch (e) {
        console.error('[proxy] Yahoo auth 실패, crumb 없이 시도:', e.message);
      }
    }

    // 실제 요청
    let res = await doFetch(fetchUrl, headers);

    // 401/403 → crumb 재취득 후 1회 재시도
    if (isYahoo && (res.status === 401 || res.status === 403)) {
      try {
        console.log('[proxy] 401/403 → crumb 갱신 후 재시도');
        yahooAuth = null;
        const auth = await fetchYahooAuth();
        yahooAuth = auth;
        headers['Cookie'] = auth.cookie;
        res = await doFetch(addCrumb(target, auth.crumb), headers);
      } catch (e) {
        console.error('[proxy] crumb 갱신 실패:', e.message);
      }
    }

    // 응답 반환
    const responseHeaders = {
      ...corsHeaders(),
    };
    const ct = res.headers.get('Content-Type');
    if (ct) responseHeaders['Content-Type'] = ct;

    return new Response(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  },
};

async function doFetch(url, headers) {
  try {
    return await fetch(url, { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'upstream fetch failed', message: e.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
