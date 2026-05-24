export interface Stock {
  id: string;
  ticker: string;         // 종목코드 e.g. 005930, AAPL
  nameKo: string;         // 한글명
  nameEn: string;         // 영문명
  market: 'KRX' | 'NYSE' | 'NASDAQ' | 'KOSDAQ';
  accountId: string;
  quantity: number;
  avgCost: number;        // 평균매수가 (원화)
  currentPrice: number;   // 현재가
  currency: 'KRW' | 'USD';
  sector?: string;
}

export interface Account {
  id: string;
  name: string;
  broker: string;
  color: string;
}

export interface ExchangeRate {
  usdToKrw: number;
  updatedAt: string;
}

export interface StockWithStats extends Stock {
  prevClose: number;
  changeRate: number;     // % change from prev close
  changeAmt: number;
  marketValueKrw: number; // 평가금액 (원화)
  gainLossKrw: number;    // 평가손익 (원화)
  gainLossPct: number;
}
