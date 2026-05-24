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
  // 국내 ETF — KODEX (삼성자산운용)
  { ticker: '069500', nameKo: 'KODEX 200', nameEn: 'KODEX 200 ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '229200', nameKo: 'KODEX 코스닥150', nameEn: 'KODEX KOSDAQ150 ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '278540', nameKo: 'KODEX MSCI Korea TR', nameEn: 'KODEX MSCI Korea TR ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '122630', nameKo: 'KODEX 레버리지', nameEn: 'KODEX Leverage ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '114800', nameKo: 'KODEX 인버스', nameEn: 'KODEX Inverse ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '252670', nameKo: 'KODEX 200선물인버스2X', nameEn: 'KODEX 200 Futures Inverse 2X ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '251340', nameKo: 'KODEX 코스닥150레버리지', nameEn: 'KODEX KOSDAQ150 Leverage ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '091160', nameKo: 'KODEX 반도체', nameEn: 'KODEX Semiconductor ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '091180', nameKo: 'KODEX 자동차', nameEn: 'KODEX Automobile ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '148020', nameKo: 'KODEX 은행', nameEn: 'KODEX Bank ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '139220', nameKo: 'KODEX IT', nameEn: 'KODEX IT ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '117460', nameKo: 'KODEX 배당가치', nameEn: 'KODEX Dividend Value ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '132030', nameKo: 'KODEX 골드선물(H)', nameEn: 'KODEX Gold Futures ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '261220', nameKo: 'KODEX WTI원유선물(H)', nameEn: 'KODEX WTI Crude Oil Futures ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '379800', nameKo: 'KODEX 미국S&P500TR', nameEn: 'KODEX US S&P500 TR ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '379810', nameKo: 'KODEX 미국나스닥100', nameEn: 'KODEX US NASDAQ100 ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '367380', nameKo: 'KODEX 미국나스닥100TR', nameEn: 'KODEX US NASDAQ100 TR ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '304660', nameKo: 'KODEX 미국채울트라30년선물(H)', nameEn: 'KODEX US Treasury Ultra 30Y ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '385560', nameKo: 'KODEX 글로벌전기차&배터리', nameEn: 'KODEX Global EV & Battery ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '441680', nameKo: 'KODEX 인도Nifty50', nameEn: 'KODEX India Nifty50 ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '449450', nameKo: 'KODEX 미국반도체MV', nameEn: 'KODEX US Semiconductor MV ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '468380', nameKo: 'KODEX 미국AI테크TOP10', nameEn: 'KODEX US AI Tech TOP10 ETF', market: 'KRX', currency: 'KRW' },
  // 국내 ETF — TIGER (미래에셋자산운용)
  { ticker: '102110', nameKo: 'TIGER 200', nameEn: 'TIGER 200 ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '143460', nameKo: 'TIGER 코스닥150', nameEn: 'TIGER KOSDAQ150 ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '133690', nameKo: 'TIGER 미국나스닥100', nameEn: 'TIGER US NASDAQ100 ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '143850', nameKo: 'TIGER 미국S&P500', nameEn: 'TIGER US S&P500 ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '360750', nameKo: 'TIGER 미국S&P500TR', nameEn: 'TIGER US S&P500 TR ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '381170', nameKo: 'TIGER 미국나스닥100TR', nameEn: 'TIGER US NASDAQ100 TR ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '305720', nameKo: 'TIGER 2차전지테마', nameEn: 'TIGER Secondary Battery Theme ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '139270', nameKo: 'TIGER 200 IT', nameEn: 'TIGER 200 IT ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '266160', nameKo: 'TIGER 코스피고배당', nameEn: 'TIGER KOSPI High Dividend ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '195930', nameKo: 'TIGER 해외선진국MSCI World', nameEn: 'TIGER MSCI World ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '329200', nameKo: 'TIGER 미국채10년선물', nameEn: 'TIGER US 10Y Treasury Futures ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '364970', nameKo: 'TIGER 미국테크TOP10INDXX', nameEn: 'TIGER US Tech TOP10 INDXX ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '441640', nameKo: 'TIGER 인도니프티50', nameEn: 'TIGER India Nifty50 ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '426410', nameKo: 'TIGER 차이나항셍테크', nameEn: 'TIGER China Hang Seng Tech ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '445090', nameKo: 'TIGER 미국반도체(SOXX)MV', nameEn: 'TIGER US Semiconductor SOXX MV ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '459580', nameKo: 'TIGER 미국AI빅테크10', nameEn: 'TIGER US AI Big Tech 10 ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '0183J0', nameKo: 'TIGER 미국우주테크', nameEn: 'TIGER US Space Tech ETF', market: 'KRX', currency: 'KRW' },
  // 국내 ETF — ACE (한국투자신탁운용)
  { ticker: '280940', nameKo: 'ACE 200', nameEn: 'ACE 200 ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '371460', nameKo: 'ACE 미국S&P500', nameEn: 'ACE US S&P500 ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '411060', nameKo: 'ACE 미국나스닥100', nameEn: 'ACE US NASDAQ100 ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '448290', nameKo: 'ACE 미국빅테크TOP7Plus', nameEn: 'ACE US Big Tech TOP7 Plus ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '449180', nameKo: 'ACE 미국반도체(필라델피아)', nameEn: 'ACE US Semiconductor Philadelphia ETF', market: 'KRX', currency: 'KRW' },
  // 국내 ETF — SOL (신한자산운용)
  { ticker: '445260', nameKo: 'SOL 미국S&P500', nameEn: 'SOL US S&P500 ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '445280', nameKo: 'SOL 미국나스닥100', nameEn: 'SOL US NASDAQ100 ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '466920', nameKo: 'SOL 미국AI소프트웨어', nameEn: 'SOL US AI Software ETF', market: 'KRX', currency: 'KRW' },
  // 국내 ETF — HANARO (NH아문디자산운용)
  { ticker: '292150', nameKo: 'HANARO 200', nameEn: 'HANARO 200 ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '367750', nameKo: 'HANARO 미국S&P500', nameEn: 'HANARO US S&P500 ETF', market: 'KRX', currency: 'KRW' },
  // 국내 ETF — ARIRANG (한화자산운용)
  { ticker: '182480', nameKo: 'ARIRANG 고배당주', nameEn: 'ARIRANG High Dividend ETF', market: 'KRX', currency: 'KRW' },
  { ticker: '140570', nameKo: 'ARIRANG 200', nameEn: 'ARIRANG 200 ETF', market: 'KRX', currency: 'KRW' },
  // 국내 ETF — KINDEX (한국투자증권)
  { ticker: '278420', nameKo: 'KINDEX 미국S&P500', nameEn: 'KINDEX US S&P500 ETF', market: 'KRX', currency: 'KRW' },
  // 미국 ETF — 지수
  { ticker: 'SPY', nameKo: 'SPDR S&P500 ETF', nameEn: 'SPDR S&P 500 ETF Trust', market: 'NYSE', currency: 'USD' },
  { ticker: 'QQQ', nameKo: '인베스코 나스닥100 ETF', nameEn: 'Invesco QQQ Trust', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'VOO', nameKo: '뱅가드 S&P500 ETF', nameEn: 'Vanguard S&P 500 ETF', market: 'NYSE', currency: 'USD' },
  { ticker: 'VTI', nameKo: '뱅가드 전체주식시장 ETF', nameEn: 'Vanguard Total Stock Market ETF', market: 'NYSE', currency: 'USD' },
  { ticker: 'IVV', nameKo: '아이셰어즈 S&P500 ETF', nameEn: 'iShares Core S&P 500 ETF', market: 'NYSE', currency: 'USD' },
  { ticker: 'VEA', nameKo: '뱅가드 선진국 ETF', nameEn: 'Vanguard FTSE Developed Markets ETF', market: 'NYSE', currency: 'USD' },
  { ticker: 'VWO', nameKo: '뱅가드 신흥국 ETF', nameEn: 'Vanguard FTSE Emerging Markets ETF', market: 'NYSE', currency: 'USD' },
  { ticker: 'EWY', nameKo: '아이셰어즈 한국 ETF', nameEn: 'iShares MSCI South Korea ETF', market: 'NYSE', currency: 'USD' },
  // 미국 ETF — 섹터
  { ticker: 'SOXX', nameKo: '아이셰어즈 반도체 ETF', nameEn: 'iShares Semiconductor ETF', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'SMH', nameKo: 'VanEck 반도체 ETF', nameEn: 'VanEck Semiconductor ETF', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'XLK', nameKo: 'SPDR 기술섹터 ETF', nameEn: 'Technology Select Sector SPDR ETF', market: 'NYSE', currency: 'USD' },
  { ticker: 'XLF', nameKo: 'SPDR 금융섹터 ETF', nameEn: 'Financial Select Sector SPDR ETF', market: 'NYSE', currency: 'USD' },
  { ticker: 'XLE', nameKo: 'SPDR 에너지섹터 ETF', nameEn: 'Energy Select Sector SPDR ETF', market: 'NYSE', currency: 'USD' },
  { ticker: 'XLV', nameKo: 'SPDR 헬스케어섹터 ETF', nameEn: 'Health Care Select Sector SPDR ETF', market: 'NYSE', currency: 'USD' },
  { ticker: 'ARKK', nameKo: 'ARK 이노베이션 ETF', nameEn: 'ARK Innovation ETF', market: 'NYSE', currency: 'USD' },
  { ticker: 'ARKG', nameKo: 'ARK 유전체혁명 ETF', nameEn: 'ARK Genomic Revolution ETF', market: 'NYSE', currency: 'USD' },
  // 미국 ETF — 레버리지/인버스
  { ticker: 'TQQQ', nameKo: '나스닥100 3배 ETF', nameEn: 'ProShares UltraPro QQQ', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'SQQQ', nameKo: '나스닥100 인버스3배 ETF', nameEn: 'ProShares UltraPro Short QQQ', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'SOXL', nameKo: '반도체 3배 ETF', nameEn: 'Direxion Daily Semiconductor Bull 3X ETF', market: 'NYSE', currency: 'USD' },
  { ticker: 'SOXS', nameKo: '반도체 인버스3배 ETF', nameEn: 'Direxion Daily Semiconductor Bear 3X ETF', market: 'NYSE', currency: 'USD' },
  { ticker: 'UPRO', nameKo: 'S&P500 3배 ETF', nameEn: 'ProShares UltraPro S&P500', market: 'NYSE', currency: 'USD' },
  { ticker: 'SPXS', nameKo: 'S&P500 인버스3배 ETF', nameEn: 'Direxion Daily S&P500 Bear 3X ETF', market: 'NYSE', currency: 'USD' },
  { ticker: 'LABU', nameKo: '바이오테크 3배 ETF', nameEn: 'Direxion Daily S&P Biotech Bull 3X ETF', market: 'NYSE', currency: 'USD' },
  // 미국 ETF — 채권/원자재
  { ticker: 'TLT', nameKo: '미국장기국채 ETF', nameEn: 'iShares 20+ Year Treasury Bond ETF', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'IEF', nameKo: '미국중기국채 ETF', nameEn: 'iShares 7-10 Year Treasury Bond ETF', market: 'NASDAQ', currency: 'USD' },
  { ticker: 'LQD', nameKo: '투자등급회사채 ETF', nameEn: 'iShares iBoxx Investment Grade Corp Bond ETF', market: 'NYSE', currency: 'USD' },
  { ticker: 'HYG', nameKo: '하이일드채권 ETF', nameEn: 'iShares iBoxx High Yield Corp Bond ETF', market: 'NYSE', currency: 'USD' },
  { ticker: 'GLD', nameKo: '금 ETF', nameEn: 'SPDR Gold Shares ETF', market: 'NYSE', currency: 'USD' },
  { ticker: 'SLV', nameKo: '은 ETF', nameEn: 'iShares Silver Trust ETF', market: 'NYSE', currency: 'USD' },
  { ticker: 'USO', nameKo: '원유 ETF', nameEn: 'United States Oil Fund ETF', market: 'NYSE', currency: 'USD' },
  { ticker: 'DBC', nameKo: '원자재 ETF', nameEn: 'Invesco DB Commodity Index Tracking Fund', market: 'NYSE', currency: 'USD' },
];

export function searchStocks(query: string): StockEntry[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  const scored = STOCK_DB.map(s => {
    const fields = [s.ticker.toLowerCase(), s.nameKo.toLowerCase(), s.nameEn.toLowerCase()];
    if (fields.some(f => f === q)) return { s, score: 100 };
    if (fields.some(f => f.startsWith(q))) return { s, score: 80 };
    if (fields.some(f => f.includes(q))) return { s, score: 60 };
    // 퍼지: 모든 글자가 순서대로 포함
    const fuzzy = (str: string) => {
      let qi = 0;
      for (let i = 0; i < str.length && qi < q.length; i++) {
        if (str[i] === q[qi]) qi++;
      }
      return qi === q.length;
    };
    if (fields.some(fuzzy)) return { s, score: 30 };
    return { s, score: 0 };
  }).filter(r => r.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, 10).map(r => r.s);
}
