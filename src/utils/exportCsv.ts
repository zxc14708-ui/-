import type { StockWithStats, Account } from '../types';

export function exportPortfolioCSV(
  stocks: StockWithStats[],
  accounts: Account[],
  usdToKrw: number,
): void {
  const headers = [
    '계좌',
    '종목코드',
    '종목명',
    '시장',
    '통화',
    '수량',
    '평균단가',
    '현재가',
    '평가금액(원)',
    '평가손익(원)',
    '수익률(%)',
    '메모',
  ];

  function getAccountName(accountId: string): string {
    return accounts.find(a => a.id === accountId)?.name ?? accountId;
  }

  const rows = stocks.map(s => {
    const multiplier = s.currency === 'USD' ? usdToKrw : 1;
    const avgCostKrw = s.avgCost * multiplier;
    const currentPriceKrw = s.currentPrice * multiplier;

    return [
      getAccountName(s.accountId),
      s.ticker,
      s.nameKo,
      s.market,
      s.currency,
      String(s.quantity),
      avgCostKrw.toFixed(2),
      currentPriceKrw.toFixed(2),
      Math.round(s.marketValueKrw).toString(),
      Math.round(s.gainLossKrw).toString(),
      s.gainLossPct.toFixed(2),
      s.memo ?? '',
    ];
  });

  const BOM = '﻿';
  const csvContent =
    BOM +
    [headers, ...rows]
      .map(row =>
        row
          .map(cell => {
            const str = String(cell);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(','),
      )
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  link.href = url;
  link.download = `portfolio_${dateStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
