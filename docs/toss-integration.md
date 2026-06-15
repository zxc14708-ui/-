# 토스증권 Open API 연동 메모

> 이 문서는 작업 맥락을 영구 보존하기 위한 기록입니다. (대화 컨텍스트가 사라져도 여기 남습니다)

## 1. 목적
국내·미국 주식 시세와 USD/KRW 환율을 **토스증권 Open API**로 가져온다.
기존 소스(Yahoo/Naver/open.er-api)는 폴백으로 유지한다.

## 2. 아키텍처 — 집 PC 로컬 프록시
```
앱(GitHub Pages, HTTPS) → http://localhost:3001 (집 PC Node 프록시) → 집 고정 IP → 토스 Open API
프록시가 꺼져 있으면 → Naver / Yahoo / open.er-api 로 자동 폴백
```
- **왜 로컬 프록시?** 토스는 "허용 IP 관리"에 등록된 고정 IP에서만 호출을 받는다.
  Cloudflare Worker는 동적 IP라 등록 불가 → 집 PC에서 프록시를 돌려 집 IP로 호출한다.
- 브라우저는 `http://localhost` 를 안전 출처로 취급하므로 HTTPS 앱에서도 호출 가능(Chrome 기준).
- client_id / client_secret 은 **프록시 `.env` 에만** 둔다. 코드/깃/브라우저에 절대 노출 금지.

## 3. 프록시 실행 (집 PC, Windows 기준)
```powershell
cd <프로젝트>\proxy
npm install
copy .env.example .env      # .env 에 TOSS_CLIENT_ID / TOSS_CLIENT_SECRET 입력
node server.js              # http://localhost:3001 (창 켜둔 채 유지)
```
헬스체크: <http://localhost:3001/health> → `{"ok":true,...}`

## 4. 확정된 엔드포인트·응답 필드 (2026-06 확인)
| 용도 | 호출 | 필드 |
|---|---|---|
| 현재가(국내+미국 공통) | `GET /api/v1/prices?symbols=A,B,C` | `result[].lastPrice` (문자열), `result[].symbol`, `currency` |
| 전일종가 | `GET /api/v1/candles?symbol=X&interval=1d` | `result.candles[]` (최신순), `candles[1].closePrice` = 직전 세션 종가 |
| 환율 | `GET /api/v1/exchange-rate?baseCurrency=USD&quoteCurrency=KRW` | `result.rate` (≈5분 갱신), `result.midRate` |
| (참고)휴장일 | `GET /api/v1/market-calendar/KR` | 영업일/장시간만 제공, 공휴일 "이름"은 없음 |

- `prices` 는 국내(6자리 코드)·미국(티커 그대로, 예: `TSM`) 모두 동작. 혼합·다건(10개+) 배치 OK.
- `candles` interval 허용값: `1m`, `1d`.

## 5. 코드 위치
- `proxy/server.js` — 로컬 프록시(OAuth2 Basic 토큰 발급·캐싱, GET 전용, 401 재시도)
- `src/utils/tossApi.ts` — `fetchTossLivePrices(tickers)` (현재가 배치 + 전일종가 캐시/throttle),
  `fetchTossExchangeRate()`, `probeToss()`
- `src/utils/yahooFinance.ts` — `fetchLivePrices()`: 토스(시장별 분리 배치) → 국내 Naver→Yahoo / 미국 Yahoo 폴백
- `src/hooks/useExchangeRate.ts` — 토스 환율 우선, 실패 시 open.er-api

## 6. 레이트리밋(429) 회피 설계
- 현재가: `/prices?symbols=` 로 **20개씩 묶어** 호출.
- 전일종가: 종목당 캔들 1회지만 **하루 단위 캐시**(`prevCloseCache`) → 첫 로드 후 재호출 없음.
  첫 로드 시에도 **2개씩 250ms 간격** throttle.
- 전일종가 조회 실패 시 현재가로 대체(등락률 0%), **가격 표시는 유지**.

## 7. 운영 주의사항
- **프록시가 켜져 있어야** 토스 데이터가 들어온다. 끄면 자동 폴백(앱은 정상 작동).
- **집 IP가 바뀌면**(공유기 재부팅 등) 토스가 `IP address not allowed 403` 을 낸다.
  → <https://ifconfig.me> 로 현재 IP 확인 후 토스 WTS → 설정 → Open API → 허용 IP 관리에 재등록.
- 트러블슈팅 에러 의미: `unidentified-client`/`invalid_client`=인증키 문제, `403 IP not allowed`=IP 미등록,
  `429`=호출 과다.

## 8. 브랜치/배포
- 개발 브랜치: `claude/gracious-davinci-bjUHr`
- 배포 브랜치: `claude/focused-bardeen-fVaud` (push 시 GitHub Pages 자동 배포)
- 배포 URL: <https://zxc14708-ui.github.io/-/>

## 9. 범위 밖(미진행)
- 잔고 자동 동기화(`/api/v1/holdings`), 주문 기능, PyKRX, 휴장일명 자동화(현재 하드코딩 유지), VPS 외부 접근.
