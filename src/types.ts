export interface Stock {
  id: string;
  ticker: string;         // 종목코드 e.g. 005930, AAPL
  nameKo: string;         // 한글명
  nameEn: string;         // 영문명
  market: 'KRX' | 'NYSE' | 'NASDAQ' | 'KOSDAQ';
  accountId: string;
  quantity: number;
  avgCost: number;        // 평균매수가 (종목 통화)
  avgFxRate?: number;     // USD 종목 평균 매수환율 (₩/$) — 환차익 계산용
  currentPrice: number;   // 현재가
  currency: 'KRW' | 'USD';
  sector?: string;
  memo?: string;
}


export interface Account {
  id: string;
  name: string;
  broker: string;
  color: string;
  cashKrw?: number;
  cashUsd?: number;
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

export interface JournalEntry {
  id: string;
  date: string;           // YYYY-MM-DD
  ticker: string;
  nameKo: string;
  type: 'buy' | 'sell' | 'analysis' | 'watch';
  price?: number;
  quantity?: number;
  targetPrice?: number;
  stopLoss?: number;
  reason: string;
  confidence: number;     // 1–5
  review: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
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

