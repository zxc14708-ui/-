import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Trash2, PlusCircle } from 'lucide-react';
import type { StockWithStats, Account } from '../types';
import type { DisplayCurrency } from '../utils/currency';
import { fmtAmountFull } from '../utils/currency';

interface Props {
  stocks: StockWithStats[];
  accounts: Account[];
  selectedAccountId: string | null;
  highlightId: string | null;
  onDelete: (id: string) => void;
  onBuyMore: (stock: StockWithStats) => void;
  displayCurrency: DisplayCurrency;
  usdToKrw: number;
}

type SortKey = 'nameKo' | 'ticker' | 'marketValueKrw' | 'changeRate' | 'gainLossKrw' | 'gainLossPct' | 'quantity' | 'weightPct';
type Dir = 'asc' | 'desc';

export function StockTable({ stocks, accounts, selectedAccountId, highlightId, onDelete, onBuyMore, displayCurrency, usdToKrw }: Props) {
  const fmtVal = (krw: number) => fmtAmountFull(krw, displayCurrency, usdToKrw);
  const [sortKey, setSortKey] = useState<SortKey>('marketValueKrw');
  const [sortDir, setSortDir] = useState<Dir>('desc');

  const filtered = selectedAccountId
    ? stocks.filter(s => s.accountId === selectedAccountId)
    : stocks;

  const totalFilteredValue = filtered.reduce((sum, s) => sum + s.marketValueKrw, 0);

  const sorted = [...filtered].sort((a, b) => {
    const av = sortKey === 'weightPct' ? a.marketValueKrw : a[sortKey] as number | string;
    const bv = sortKey === 'weightPct' ? b.marketValueKrw : b[sortKey] as number | string;
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronsUpDown size={12} className="text-gray-600" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-blue-400" />
      : <ChevronDown size={12} className="text-blue-400" />;
  }

  function accountColor(id: string) {
    return accounts.find(a => a.id === id)?.color ?? '#6366f1';
  }

  function accountName(id: string) {
    return accounts.find(a => a.id === id)?.name ?? id;
  }

  return (
    <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2e3151]">
              {!selectedAccountId && (
                <th className="text-left px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">계좌</th>
              )}
              <th className="text-left px-4 py-3 text-gray-500 font-normal text-xs w-full">
                <button onClick={() => toggleSort('nameKo')} className="flex items-center gap-1 hover:text-gray-300">
                  종목명 <SortIcon k="nameKo" />
                </button>
              </th>
              <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">수량</th>
              <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">평균금액</th>
              <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">
                <button onClick={() => toggleSort('changeRate')} className="flex items-center gap-1 hover:text-gray-300 ml-auto">
                  등락률 <SortIcon k="changeRate" />
                </button>
              </th>
              <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">
                <button onClick={() => toggleSort('marketValueKrw')} className="flex items-center gap-1 hover:text-gray-300 ml-auto">
                  평가금액 <SortIcon k="marketValueKrw" />
                </button>
              </th>
              <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">
                <button onClick={() => toggleSort('weightPct')} className="flex items-center gap-1 hover:text-gray-300 ml-auto">
                  비중 <SortIcon k="weightPct" />
                </button>
              </th>
              <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">
                <button onClick={() => toggleSort('gainLossKrw')} className="flex items-center gap-1 hover:text-gray-300 ml-auto">
                  평가손익 <SortIcon k="gainLossKrw" />
                </button>
              </th>
              <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">
                <button onClick={() => toggleSort('gainLossPct')} className="flex items-center gap-1 hover:text-gray-300 ml-auto">
                  수익률 <SortIcon k="gainLossPct" />
                </button>
              </th>
              <th className="px-4 py-3 w-1"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((stock, i) => {
              const isHighlighted = stock.id === highlightId;
              return (
                <tr
                  key={stock.id}
                  className={`border-b border-[#1a1d2e] transition-colors ${
                    isHighlighted
                      ? 'bg-blue-950/40 border-blue-800/40'
                      : i % 2 === 0 ? 'bg-[#1a1d2e]' : 'bg-[#1c2036]'
                  } hover:bg-[#2e3151]/60`}
                >
                  {!selectedAccountId && (
                    <td className="px-4 py-3">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: accountColor(stock.accountId) }}
                        title={accountName(stock.accountId)}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 max-w-0 w-full">
                    <div className="overflow-hidden">
                      <div className="text-white font-medium truncate">{stock.nameKo}</div>
                      <div className="text-gray-500 text-xs font-mono truncate">{stock.ticker} · {stock.market}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300 tabular-nums whitespace-nowrap">
                    {stock.quantity.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-white tabular-nums whitespace-nowrap">
                    {fmtVal(stock.currency === 'USD' ? stock.avgCost * usdToKrw : stock.avgCost)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                    <span className={`inline-flex items-center gap-0.5 font-semibold ${stock.changeRate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {stock.changeRate >= 0 ? '▲' : '▼'}
                      {Math.abs(stock.changeRate).toFixed(2)}%
                    </span>
                    <div className="text-xs text-gray-600 tabular-nums">
                      {stock.changeAmt >= 0 ? '+' : ''}
                      {stock.currency === 'USD'
                        ? `$${stock.changeAmt.toFixed(2)}`
                        : `₩${Math.round(stock.changeAmt).toLocaleString()}`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-white tabular-nums whitespace-nowrap">
                    {fmtVal(stock.marketValueKrw)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                    {totalFilteredValue > 0 ? (
                      <>
                        <div className="text-gray-300 text-sm">
                          {((stock.marketValueKrw / totalFilteredValue) * 100).toFixed(1)}%
                        </div>
                        <div className="mt-1 h-1 w-16 ml-auto bg-[#2e3151] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500 opacity-70"
                            style={{ width: `${Math.min((stock.marketValueKrw / totalFilteredValue) * 100, 100)}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                    <span className={`font-semibold ${stock.gainLossKrw >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {stock.gainLossKrw >= 0 ? '+' : ''}{fmtVal(stock.gainLossKrw)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                    <span className={`font-semibold ${stock.gainLossPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {stock.gainLossPct >= 0 ? '+' : ''}{stock.gainLossPct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onBuyMore(stock)}
                        className="text-gray-600 hover:text-blue-400 transition-colors p-1 rounded"
                        title="추가 매수"
                      >
                        <PlusCircle size={13} />
                      </button>
                      <button
                        onClick={() => onDelete(stock.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors p-1 rounded"
                        title="삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="py-12 text-center text-gray-600">보유 종목이 없습니다</div>
        )}
      </div>
    </div>
  );
}
