# 토스 로컬 프록시 (toss-local-proxy)

토스증권 Open API는 "허용 IP 관리"에 등록된 **고정 IP에서만** 호출을 받습니다.
Cloudflare Worker는 동적 IP라 불가능하므로, **집 PC에서 이 프록시를 실행**해
토스 호출이 집 IP에서 나가도록 합니다.

```
브라우저(앱) → http://localhost:3001/toss/api/...  → (집 IP) → 토스 Open API
```

## 실행 방법

```bash
cd proxy
cp .env.example .env      # 그리고 .env 에 client_id / client_secret 입력
npm install
npm start                 # http://localhost:3001
```

> `.env` 의 값은 이전에 Cloudflare Worker secret 에 넣었던
> `TOSS_CLIENT_ID` / `TOSS_CLIENT_SECRET` 과 동일한 값을 쓰면 됩니다.
> `.env` 는 git 에 커밋되지 않습니다(.gitignore 처리됨).

## 동작 확인

서버를 켠 뒤 브라우저 주소창에서:

- 헬스체크: <http://localhost:3001/health>
- 시세 원본: <http://localhost:3001/toss/api/v1/stocks?symbols=005930>

앱(개발: `npm run dev` 또는 배포본)을 열고 브라우저 콘솔에서:

```js
probeToss('005930').then(console.log)
```

→ 출력된 JSON 의 **현재가 / 전일종가 필드 이름**을 확인하세요.
필드 이름이 `src/utils/tossApi.ts` 의 `PRICE_FIELDS` / `PREV_FIELDS`
후보에 없다면, 그 파일에 정확한 키를 추가하면 됩니다.

## 폴백 동작

- 프록시가 켜져 있으면 국내 주식 시세를 **토스 → (실패 시) Naver → Yahoo** 순으로 가져옵니다.
- 프록시가 **꺼져 있으면** 토스 호출이 빠르게 실패하고 기존처럼 Naver/Yahoo 로 자동 폴백합니다.
- 즉 외부(모바일 등)에서 앱을 열 때는 토스 없이도 기존대로 동작합니다.

## 보안

- `client_id` / `client_secret` 은 `.env` 에만 두고 코드/깃에 넣지 않습니다.
- 프록시는 **GET(읽기) 전용** 이라 이 경로로 주문 실행은 불가능합니다.
- 토큰/secret 값은 로그에 출력하지 않습니다.
