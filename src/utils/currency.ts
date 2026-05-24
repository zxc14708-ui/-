export type DisplayCurrency = 'KRW' | 'USD';

export function fmtAmount(krwAmount: number, display: DisplayCurrency, usdToKrw: number): string {
  if (display === 'USD') {
    const usd = krwAmount / usdToKrw;
    if (Math.abs(usd) >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
    if (Math.abs(usd) >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
    return `$${usd.toFixed(2)}`;
  }
  if (Math.abs(krwAmount) >= 100_000_000) return `₩${(krwAmount / 100_000_000).toFixed(1)}억`;
  if (Math.abs(krwAmount) >= 10_000) return `₩${(krwAmount / 10_000).toFixed(0)}만`;
  return `₩${Math.round(krwAmount).toLocaleString('ko-KR')}`;
}

export function fmtAmountFull(krwAmount: number, display: DisplayCurrency, usdToKrw: number): string {
  if (display === 'USD') {
    const usd = krwAmount / usdToKrw;
    return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `₩${Math.round(krwAmount).toLocaleString('ko-KR')}`;
}
