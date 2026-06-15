/**
 * my-stock-proxy — Cloudflare Worker
 *
 * 역할: CORS 우회 프록시 + Yahoo Finance crumb/cookie 자동 인증
 *
 * 배포 방법:
 *   Cloudflare Dashboard → Workers & Pages → my-stock-proxy → Edit code
 *   → 이 파일 전체를 붙여넣기 → Save and deploy
 */

// Worker 인스턴스 메모리에 crumb 캐시 (최대 25분)
let yahooAuth = null; // { crumb, cookie, expiry }

// ---------------------------------------------------------------------------
// Yahoo Finance 인증 (crumb + cookie)
// ---------------------------------------------------------------------------

async function fetchYahooAuth() {
  // 1단계: finance.yahoo.com 에서 쿠키 취득
  const initRes = await fetch('https://finance.yahoo.com/', {
    headers: browserHeaders(),
    redirect: 'follow',
  });

  const rawCookie = initRes.headers.get('set-cookie') ?? '';
  const cookie = parseCookies(rawCookie);

  // 2단계: crumb 취득 (query1 → query2 순서로 시도)
  for (const host of ['query1', 'query2']) {
    const crumbRes = await fetch(`https://${host}.finance.yahoo.com/v1/test/getcrumb`, {
      headers: { ...browserHeaders(), Cookie: cookie },
    });

    if (!crumbRes.ok) continue;

    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.startsWith('<') || crumb.length > 100) continue;

    return { crumb, cookie, expiry: Date.now() + 25 * 60 * 1000 };
  }

  throw new Error('crumb 취득 실패 (query1, query2 모두 실패)');
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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
}

// ---------------------------------------------------------------------------
// 메인 핸들러
// ---------------------------------------------------------------------------

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const reqUrl = new URL(request.url);
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
