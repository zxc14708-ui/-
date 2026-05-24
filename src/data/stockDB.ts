import type { Stock } from '../types';

type StockEntry = Pick<Stock, 'ticker' | 'nameKo' | 'nameEn' | 'market' | 'currency'>;

export const STOCK_DB: StockEntry[] = [
  // 코스피 대형주
  { ticker: '005930', nameKo: '삼성전자', nameEn: 'Samsung Electronics', market: 'KRX', currency: 'KRW' },
  { ticker: '000660', nameKo: 'SK하이닉스', nameEn: 'SK Hynix', market: 'KRX', currency: 'KRW' },
  { ticker: '005380', nameKo: '현대차', nameEn: 'Hyundai Motor', market: 'KRX', currency: 'KRW' },
  { ticker: '005490', nameKo: 'POSCO홀딩스', nameEn: 'POSCO Holdings', market: 'KRX', currency: 'KRW' },
  { ticker: '051910', nameKo: 'LG화학', nameEn: 'LG Chem', market: 'KRX', currency: 'KRW' },
  { ticker: '006400', nameKo: '삼성SDI', nameEn: 'Samsung SDI', market: 'KRX', currency: 'KRW' },
  { ticker: '035420', nameKo: 'NAVER', nameEn: 'NAVER Corp', market: 'KRX', currency: 'KRW' },
  { ticker: '035720', nameKo: '카카오', nameEn: 'Kakao Corp', market: 'KRX', currency: 'KRW' },
  { ticker: '207940', nameKo: '삼성바이오로직스', nameEn: 'Samsung Biologics', market: 'KRX', currency: 'KRW' },
  { ticker: '068270', nameKo: '셀트리온', nameEn: 'Celltrion', market: 'KRX', currency: 'KRW' },
  { ticker: '105560', nameKo: 'KB금융', nameEn: 'KB Financial', market: 'KRX', currency: 'KRW' },
  { ticker: '055550', nameKo: '신한지주', nameEn: 'Shinhan Financial', market: 'KRX', currency: 'KRW' },
  { ticker: '086790', nameKo: '하나금융지주', nameEn: 'Hana Financial', market: 'KRX', currency: 'KRW' },
  { ticker: '003550', nameKo: 'LG', nameEn: 'LG Corp', market: 'KRX', currency: 'KRW' },
  { ticker: '066570', nameKo: 'LG전자', nameEn: 'LG Electronics', market: 'KRX', currency: 'KRW' },
  { ticker: '012330', nameKo: '현대모비스', nameEn: 'Hyundai Mobis', market: 'KRX', currency: 'KRW' },
  { ticker: '028260', nameKo: '삼성물산', nameEn: 'Samsung C&T', market: 'KRX', currency: 'KRW' },
  { ticker: '096770', nameKo: 'SK이노베이션', nameEn: 'SK Innovation', market: 'KRX', currency: 'KRW' },
  { ticker: '017670', nameKo: 'SK텔레콤', nameEn: 'SK Telecom', market: 'KRX', currency: 'KRW' },
  { ticker: '030200', nameKo: 'KT', nameEn: 'KT Corp', market: 'KRX', currency: 'KRW' },
  { ticker: '032830', nameKo: '삼성생명', nameEn: 'Samsung Life Insurance', market: 'KRX', currency: 'KRW' },
  { ticker: '373220', nameKo: 'LG에너지솔루션', nameEn: 'LG Energy Solution', market: 'KRX', currency: 'KRW' },
  { ticker: '000270', nameKo: '기아', nameEn: 'Kia Corp', market: 'KRX', currency: 'KRW' },
  { ticker: '010950', nameKo: 'S-Oil', nameEn: 'S-Oil Corp', market: 'KRX', currency: 'KRW' },
  { ticker: '034730', nameKo: 'SK', nameEn: 'SK Inc.', market: 'KRX', currency: 'KRW' },
  { ticker: '011200', nameKo: '현대글로비스', nameEn: 'Hyundai Glovis', market: 'KRX', currency: 'KRW' },
  { ticker: '047050', nameKo: '포스코인터내셔널', nameEn: 'POSCO International', market: 'KRX', currency: 'KRW' },
  { ticker: '316140', nameKo: '우리금융지주', nameEn: 'Woori Financial', market: 'KRX', currency: 'KRW' },
  { ticker: '018260', nameKo: '삼성에스디에스', nameEn: 'Samsung SDS', market: 'KRX', currency: 'KRW' },
  { ticker: '009150', nameKo: '삼성전기', nameEn: 'Samsung Electro-Mechanics', market: 'KRX', currency: 'KRW' },
  // 코스닥
  { ticker: '247540', nameKo: '에코프로비엠', nameEn: 'EcoPro BM', market: 'KOSDAQ', currency: 'KRW' },
  { ticker: '086520', nameKo: '에코프로', nameEn: 'EcoPro', market: 'KOSDAQ', currency: 'KRW' },
  { ticker: '196170', nameKo: '알테오젠', nameEn: 'Alteogen', market: 'KOSDAQ', currency: 'KRW' },
  { ticker: '091990', nameKo: '셀트리온헬스케어', nameEn: 'Celltrion Healthcare', market: 'KOSDAQ', currency: 'KRW' },
  { ticker: '041510', nameKo: 'SM엔터테인먼트', nameEn: 'SM Entertainment', market: 'KOSDAQ', currency: 'KRW' },
  { ticker: '035900', nameKo: 'JYP엔터테인먼트', nameEn: 'JYP Entertainment', market: 'KOSDAQ', currency: 'KRW' },
  { ticker: '352820', nameKo: '하이브', nameEn: 'HYBE', market: 'KRX', currency: 'KRW' },
  { ticker: '112040', nameKo: '위메이드', nameEn: 'Wemade', market: 'KOSDAQ', currency: 'KRW' },
  { ticker: '263750', nameKo: '펄어비스', nameEn: 'Pearl Abyss', market: 'KOSDAQ', currency: 'KRW' },
  { ticker: '036570', nameKo: 'NCsoft', nameEn: 'NCSoft', market: 'KRX', currency: 'KRW' },
  { ticker: '251270', nameKo: '넷마블', nameEn: 'Netmarble', market: 'KRX', currency: 'KRW' },
  { ticker: '293490', nameKo: '카카오게임즈', nameEn: 'Kakao Games', market: 'KOSDAQ', currency: 'KRW' },
  // 미국 빅테크
  { ticker: 'AAPL', nameKo: '애플', nameEn: 'Apple Inc.', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'MSFT', nameKo: '마이크로소프트', nameEn: 'Microsoft Corp.', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'NVDA', nameKo: '엔비디아', nameEn: 'NVIDIA Corp.', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'GOOGL', nameKo: '알파벳(구글)', nameEn: 'Alphabet Inc.', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'AMZN', nameKo: '아마존', nameEn: 'Amazon.com Inc.', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'META', nameKo: '메타', nameEn: 'Meta Platforms Inc.', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'TSLA', nameKo: '테슬라', nameEn: 'Tesla Inc.', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'AVGO', nameKo: '브로드컴', nameEn: 'Broadcom Inc.', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'ORCL', nameKo: '오라클', nameEn: 'Oracle Corp.', market: 'NYSE', currency: 'USD' },
  { ticker: 'AMD', nameKo: 'AMD', nameEn: 'Advanced Micro Devices', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'INTC', nameKo: '인텔', nameEn: 'Intel Corp.', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'QCOM', nameKo: '퀄컴', nameEn: 'Qualcomm Inc.', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'NFLX', nameKo: '넷플릭스', nameEn: 'Netflix Inc.', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'DIS', nameKo: '디즈니', nameEn: 'Walt Disney Co.', market: 'NYSE', currency: 'USD' },
  { ticker: 'PYPL', nameKo: '페이팔', nameEn: 'PayPal Holdings', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'SHOP', nameKo: '쇼피파이', nameEn: 'Shopify Inc.', market: 'NYSE', currency: 'USD' },
  { ticker: 'SPOT', nameKo: '스포티파이', nameEn: 'Spotify Technology', market: 'NYSE', currency: 'USD' },
  { ticker: 'UBER', nameKo: '우버', nameEn: 'Uber Technologies', market: 'NYSE', currency: 'USD' },
  { ticker: 'ABNB', nameKo: '에어비앤비', nameEn: 'Airbnb Inc.', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'COIN', nameKo: '코인베이스', nameEn: 'Coinbase Global', market: 'NASDAQ', currency: 'USD' },
  // 미국 금융/전통
  { ticker: 'JPM', nameKo: 'JP모건', nameEn: 'JPMorgan Chase', market: 'NYSE', currency: 'USD' },
  { ticker: 'BAC', nameKo: '뱅크오브아메리카', nameEn: 'Bank of America', market: 'NYSE', currency: 'USD' },
  { ticker: 'WMT', nameKo: '월마트', nameEn: 'Walmart Inc.', market: 'NYSE', currency: 'USD' },
  { ticker: 'JNJ', nameKo: '존슨앤존슨', nameEn: 'Johnson & Johnson', market: 'NYSE', currency: 'USD' },
  { ticker: 'V', nameKo: '비자', nameEn: 'Visa Inc.', market: 'NYSE', currency: 'USD' },
  { ticker: 'MA', nameKo: '마스터카드', nameEn: 'Mastercard Inc.', market: 'NYSE', currency: 'USD' },
  { ticker: 'XOM', nameKo: '엑슨모빌', nameEn: 'ExxonMobil Corp.', market: 'NYSE', currency: 'USD' },
  { ticker: 'BRK.B', nameKo: '버크셔해서웨이', nameEn: 'Berkshire Hathaway', market: 'NYSE', currency: 'USD' },
  // ETF
  { ticker: 'SPY', nameKo: 'S&P500 ETF', nameEn: 'SPDR S&P 500 ETF', market: 'NYSE', currency: 'USD' },
  { ticker: 'QQQ', nameKo: '나스닥100 ETF', nameEn: 'Invesco QQQ Trust', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'VOO', nameKo: 'Vanguard S&P500', nameEn: 'Vanguard S&P 500 ETF', market: 'NYSE', currency: 'USD' },
  { ticker: 'SOXL', nameKo: '반도체3배 ETF', nameEn: 'Direxion Semiconductor Bull 3X', market: 'NYSE', currency: 'USD' },
  { ticker: 'TQQQ', nameKo: '나스닥3배 ETF', nameEn: 'ProShares UltraPro QQQ', market: 'NASDAQ', currency: 'USD' },
];

export function searchStocks(query: string): StockEntry[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  const scored = STOCK_DB.map(s => {
    const fields = [s.ticker.toLowerCase(), s.nameKo.toLowerCase(), s.nameEn.toLowerCase()];
    if (fields.some(f => f === q)) return { s, score: 100 };
    if (fields.some(f => f.startsWith(q))) return { s, score: 80 };
    if (fields.some(f => f.includes(q))) return { s, score: 60 };
    return { s, score: 0 };
  }).filter(r => r.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, 8).map(r => r.s);
}
