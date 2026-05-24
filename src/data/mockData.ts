export const ACCOUNTS: never[] = [];
export const STOCKS: never[] = [];

export function getPrevClose(currentPrice: number, seed: number): number {
  const r = ((seed * 9301 + 49297) % 233280) / 233280;
  const pct = (r - 0.5) * 0.06;
  return currentPrice / (1 + pct);
}
