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
  memo?: string;
}

export interface Trade {
  id: string;
  stockId: string;
  ticker: string;
  nameKo: string;
  market: 'KRX' | 'NYSE' | 'NASDAQ' | 'KOSDAQ';
  currency: 'KRW' | 'USD';
  accountId: string;
  accountName: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;        // in stock's native currency
  usdToKrw: number;
  createdAt: number;    // Unix ms
  realizedPnlKrw?: number; // only for sells
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
  changeRate: number;
  changeAmt: number;
  costKrw: number;        // 매수금액 = avgCost × 수량 (원화)
  marketValueKrw: number; // 시장가치 = currentPrice × 수량 (원화)
  gainLossKrw: number;    // 평가손익 (원화)
  gainLossPct: number;
}

export interface AccountSnapshot {
  id: string;
  name: string;
  color: string;
  valueKrw: number;
}

export interface DailySnapshot {
  date: string;        // 'YYYY-MM-DD'
  savedAt: number;     // Unix ms
  accounts: AccountSnapshot[];
  totalValueKrw: number;
  usdToKrw: number;
}

