/**
 * my-stock-proxy — Cloudflare Worker
 *
 * 배포 방법:
 *   Cloudflare Dashboard → Workers & Pages → my-stock-proxy
 *   → Edit code → 전체 교체 → Save and deploy
 *
 * Finnhub API 키 설정:
 *   Workers & Pages → my-stock-proxy → Settings → Variables and Secrets
 *   → Add variable: FINNHUB_API_KEY = (발급받은 키)
 */

function browserHeaders(extra = {}) {
  return {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Origin: 'https://finance.yahoo.com',
    Referer: 'https://finance.yahoo.com/',
    ...extra,
  };
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
}

export default {
  async fetch(request, env) {
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

    const hostname = targetUrl.hostname;
    let fetchUrl = target;
    const headers = browserHeaders();

    // ── Finnhub: API 키 자동 추가 ─────────────────────────────────────────
    if (hostname === 'finnhub.io') {
      const key = env.FINNHUB_API_KEY || 'd88ljlhr01qq4343lde0';
      const sep = fetchUrl.includes('?') ? '&' : '?';
      fetchUrl = `${fetchUrl}${sep}token=${key}`;
    }

    // ── 네이버: Referer 교체 ──────────────────────────────────────────────
    if (hostname.endsWith('naver.com')) {
      headers['Referer'] = 'https://m.stock.naver.com/';
      headers['Origin'] = 'https://m.stock.naver.com';
    }

    // ── 요청 실행 ─────────────────────────────────────────────────────────
    let res;
    try {
      res = await fetch(fetchUrl, { headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'upstream fetch failed', message: String(e) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    const responseHeaders = { ...corsHeaders() };
    const ct = res.headers.get('Content-Type');
    if (ct) responseHeaders['Content-Type'] = ct;

    return new Response(res.body, { status: res.status, headers: responseHeaders });
  },
};
