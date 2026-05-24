import type { Account, Stock } from '../types';

export const ACCOUNTS: Account[] = [
  { id: 'acc1', name: '미래에셋 주계좌', broker: '미래에셋증권', color: '#6366f1' },
  { id: 'acc2', name: '키움 ISA', broker: '키움증권', color: '#f59e0b' },
  { id: 'acc3', name: '토스 해외주식', broker: '토스증권', color: '#10b981' },
];

export const STOCKS: Stock[] = [
  // 국내주식 - 미래에셋
  {
    id: 's1', ticker: '005930', nameKo: '삼성전자', nameEn: 'Samsung Electronics',
    market: 'KRX', accountId: 'acc1', quantity: 100, avgCost: 68000,
    currentPrice: 72400, currency: 'KRW', sector: '반도체',
  },
  {
    id: 's2', ticker: '000660', nameKo: 'SK하이닉스', nameEn: 'SK Hynix',
    market: 'KRX', accountId: 'acc1', quantity: 30, avgCost: 155000,
    currentPrice: 198000, currency: 'KRW', sector: '반도체',
  },
  {
    id: 's3', ticker: '035420', nameKo: 'NAVER', nameEn: 'NAVER Corp',
    market: 'KRX', accountId: 'acc1', quantity: 15, avgCost: 185000,
    currentPrice: 172000, currency: 'KRW', sector: 'IT',
  },
  {
    id: 's4', ticker: '035720', nameKo: '카카오', nameEn: 'Kakao Corp',
    market: 'KRX', accountId: 'acc1', quantity: 50, avgCost: 52000,
    currentPrice: 41500, currency: 'KRW', sector: 'IT',
  },
  // 국내주식 - 키움 ISA
  {
    id: 's5', ticker: '005380', nameKo: '현대차', nameEn: 'Hyundai Motor',
    market: 'KRX', accountId: 'acc2', quantity: 20, avgCost: 215000,
    currentPrice: 238500, currency: 'KRW', sector: '자동차',
  },
  {
    id: 's6', ticker: '051910', nameKo: 'LG화학', nameEn: 'LG Chem',
    market: 'KRX', accountId: 'acc2', quantity: 10, avgCost: 420000,
    currentPrice: 389000, currency: 'KRW', sector: '화학',
  },
  {
    id: 's7', ticker: '373220', nameKo: 'LG에너지솔루션', nameEn: 'LG Energy Solution',
    market: 'KRX', accountId: 'acc2', quantity: 5, avgCost: 390000,
    currentPrice: 358000, currency: 'KRW', sector: '배터리',
  },
  {
    id: 's8', ticker: '207940', nameKo: '삼성바이오로직스', nameEn: 'Samsung Biologics',
    market: 'KRX', accountId: 'acc2', quantity: 3, avgCost: 780000,
    currentPrice: 912000, currency: 'KRW', sector: '바이오',
  },
  // 해외주식 - 토스
  {
    id: 's9', ticker: 'AAPL', nameKo: '애플', nameEn: 'Apple Inc.',
    market: 'NASDAQ', accountId: 'acc3', quantity: 10, avgCost: 160,
    currentPrice: 211.5, currency: 'USD', sector: 'Technology',
  },
  {
    id: 's10', ticker: 'NVDA', nameKo: '엔비디아', nameEn: 'NVIDIA Corp.',
    market: 'NASDAQ', accountId: 'acc3', quantity: 5, avgCost: 580,
    currentPrice: 1078.5, currency: 'USD', sector: 'Technology',
  },
  {
    id: 's11', ticker: 'MSFT', nameKo: '마이크로소프트', nameEn: 'Microsoft Corp.',
    market: 'NASDAQ', accountId: 'acc3', quantity: 8, avgCost: 340,
    currentPrice: 415.2, currency: 'USD', sector: 'Technology',
  },
  {
    id: 's12', ticker: 'TSLA', nameKo: '테슬라', nameEn: 'Tesla Inc.',
    market: 'NASDAQ', accountId: 'acc3', quantity: 12, avgCost: 220,
    currentPrice: 178.3, currency: 'USD', sector: 'EV',
  },
  {
    id: 's13', ticker: 'AMZN', nameKo: '아마존', nameEn: 'Amazon.com Inc.',
    market: 'NASDAQ', accountId: 'acc3', quantity: 6, avgCost: 145,
    currentPrice: 189.4, currency: 'USD', sector: 'E-Commerce',
  },
  {
    id: 's14', ticker: 'META', nameKo: '메타', nameEn: 'Meta Platforms Inc.',
    market: 'NASDAQ', accountId: 'acc3', quantity: 4, avgCost: 295,
    currentPrice: 519.8, currency: 'USD', sector: 'Technology',
  },
];

// simulated prev close (random ±3% from current)
export function getPrevClose(currentPrice: number, seed: number): number {
  const r = ((seed * 9301 + 49297) % 233280) / 233280;
  const pct = (r - 0.5) * 0.06;
  return currentPrice / (1 + pct);
}
