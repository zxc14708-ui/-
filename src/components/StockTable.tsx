import { useState, Fragment } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Trash2, PlusCircle, GripVertical, Pencil, TrendingDown } from 'lucide-react';
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
  onEdit: (stock: StockWithStats) => void;
  onSell: (stock: StockWithStats) => void;
  displayCurrency: DisplayCurrency;
  usdToKrw: number;
}

type SortKey = 'nameKo' | 'ticker' | 'marketValueKrw' | 'changeRate' | 'gainLossKrw' | 'gainLossPct' | 'quantity' | 'weightPct';
type ColKey = 'quantity' | 'avgCost' | 'marketValueKrw' | 'weightPct' | 'gainLossKrw' | 'gainLossPct';
type Dir = 'asc' | 'desc';

const DEFAULT_COL_ORDER: ColKey[] = ['quantity', 'avgCost', 'marketValueKrw', 'weightPct', 'gainLossKrw', 'gainLossPct'];
const COL_ORDER_KEY = 'portfolio_col_order_v3';

function loadColOrder(): ColKey[] {
  try {
    const v = localStorage.getItem(COL_ORDER_KEY);
    if (!v) return DEFAULT_COL_ORDER;
    const parsed = JSON.parse(v);
    if (
      Array.isArray(parsed) &&
      parsed.length === DEFAULT_COL_ORDER.length &&
      parsed.every((k: unknown) => (DEFAULT_COL_ORDER as string[]).includes(k as string))
    ) return parsed as ColKey[];
  } catch {}
  return DEFAULT_COL_ORDER;
}

export function StockTable({ stocks, accounts, selectedAccountId, highlightId, onDelete, onBuyMore, onEdit, onSell, displayCurrency, usdToKrw }: Props) {
  const fmtVal = (krw: number) => fmtAmountFull(krw, displayCurrency, usdToKrw);
  const [sortKey, setSortKey] = useState<SortKey>('marketValueKrw');
  const [sortDir, setSortDir] = useState<Dir>('desc');
  const [colOrder, setColOrder] = useState<ColKey[]>(loadColOrder);
  const [dragCol, setDragCol] = useState<ColKey | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ColKey | null>(null);

  const filtered = selectedAccountId
    ? stocks.filter(s => s.accountId === selectedAccountId)
    : stocks;

  const filteredAccounts = selectedAccountId
    ? accounts.filter(a => a.id === selectedAccountId)
    : accounts;

  // Build cash entries: one per (account, currency) pair where amount > 0
  type CashEntry = { key: string; accountId: string; accountName: string; accountColor: string; currency: 'KRW' | 'USD'; amount: number; amountKrw: number };
  const cashEntries: CashEntry[] = [];
  for (const a of filteredAccounts) {
    if ((a.cashKrw ?? 0) > 0) cashEntries.push({ key: `cash-krw-${a.id}`, accountId: a.id, accountName: a.name, accountColor: a.color, currency: 'KRW', amount: a.cashKrw!, amountKrw: a.cashKrw! });
    if ((a.cashUsd ?? 0) > 0) cashEntries.push({ key: `cash-usd-${a.id}`, accountId: a.id, accountName: a.name, accountColor: a.color, currency: 'USD', amount: a.cashUsd!, amountKrw: a.cashUsd! * usdToKrw });
  }

  const totalCashKrw = cashEntries.reduce((sum, e) => sum + e.amountKrw, 0);
  const totalFilteredValue = filtered.reduce((sum, s) => sum + s.marketValueKrw, 0) + totalCashKrw;

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

  function handleColDragStart(e: React.DragEvent, col: ColKey) {
    setDragCol(col);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleColDragOver(e: React.DragEvent, col: ColKey) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (col !== dragCol) setDragOverCol(col);
  }

  function handleColDrop(e: React.DragEvent, targetCol: ColKey) {
    e.preventDefault();
    if (!dragCol || dragCol === targetCol) { clearColDrag(); return; }
    const next = [...colOrder];
    next.splice(next.indexOf(dragCol), 1);
    next.splice(next.indexOf(targetCol), 0, dragCol);
    setColOrder(next);
    localStorage.setItem(COL_ORDER_KEY, JSON.stringify(next));
    clearColDrag();
  }

  function clearColDrag() {
    setDragCol(null);
    setDragOverCol(null);
  }

  type ColDef = {
    label: string;
    sortKey?: SortKey;
    renderCell: (stock: StockWithStats) => React.ReactNode;
  };

  const colDefs: Record<ColKey, ColDef> = {
    quantity: {
      label: '수량',
      renderCell: stock => (
        <td className="px-4 py-3 text-right text-gray-300 tabular-nums whitespace-nowrap">
          {stock.quantity.toLocaleString()}
        </td>
      ),
    },
    avgCost: {
      label: '평균금액',
      renderCell: stock => (
        <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
          <div className="text-white">{fmtVal(stock.currency === 'USD' ? stock.avgCost * usdToKrw : stock.avgCost)}</div>
          <div className="text-gray-500 text-xs mt-0.5">{fmtVal(stock.currency === 'USD' ? stock.currentPrice * usdToKrw : stock.currentPrice)}</div>
        </td>
      ),
    },
    marketValueKrw: {
      label: '평가금액',
      sortKey: 'marketValueKrw',
      renderCell: stock => (
        <td className="px-4 py-3 text-right text-white tabular-nums whitespace-nowrap">
          {fmtVal(stock.marketValueKrw)}
        </td>
      ),
    },
    weightPct: {
      label: '비중',
      sortKey: 'weightPct',
      renderCell: stock => (
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
      ),
    },
    gainLossKrw: {
      label: '평가손익',
      sortKey: 'gainLossKrw',
      renderCell: stock => (
        <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
          <span className={`font-semibold ${stock.gainLossKrw >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stock.gainLossKrw >= 0 ? '+' : ''}{fmtVal(stock.gainLossKrw)}
          </span>
        </td>
      ),
    },
    gainLossPct: {
      label: '수익률',
      sortKey: 'gainLossPct',
      renderCell: stock => (
        <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
          <span className={`font-semibold ${stock.gainLossPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stock.gainLossPct >= 0 ? '+' : ''}{stock.gainLossPct.toFixed(2)}%
          </span>
        </td>
      ),
    },
  };

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
              <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">
                <button onClick={() => toggleSort('changeRate')} className="flex items-center gap-1 hover:text-gray-300 ml-auto">
                  등락률 <SortIcon k="changeRate" />
                </button>
              </th>
              {colOrder.map(col => {
                const def = colDefs[col];
                const isDragging = dragCol === col;
                const isDragOver = dragOverCol === col;
                return (
                  <th
                    key={col}
                    draggable
                    onDragStart={e => handleColDragStart(e, col)}
                    onDragOver={e => handleColDragOver(e, col)}
                    onDrop={e => handleColDrop(e, col)}
                    onDragEnd={clearColDrag}
                    className={`relative text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap select-none transition-opacity ${
                      isDragging ? 'opacity-30' : ''
                    } ${isDragOver ? 'bg-blue-500/10' : ''}`}
                  >
                    {isDragOver && (
                      <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-blue-400 rounded-full" />
                    )}
                    <div className="flex items-center justify-end gap-1 group">
                      <GripVertical
                        size={11}
                        className="text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0"
                      />
                      {def.sortKey ? (
                        <button
                          onClick={() => def.sortKey && toggleSort(def.sortKey)}
                          className="flex items-center gap-1 hover:text-gray-300"
                        >
                          {def.label} <SortIcon k={def.sortKey} />
                        </button>
                      ) : (
                        <span>{def.label}</span>
                      )}
                    </div>
                  </th>
                );
              })}
              <th className="px-4 py-3 w-1" />
            </tr>
          </thead>
          <tbody>
            {/* Cash rows pinned at top — styled identical to stock rows */}
            {cashEntries.map((entry, i) => {
              const weight = totalFilteredValue > 0 ? (entry.amountKrw / totalFilteredValue) * 100 : 0;
              return (
                <tr key={entry.key} className={`border-b border-[#1a1d2e] transition-colors ${i % 2 === 0 ? 'bg-[#1a1d2e]' : 'bg-[#1c2036]'} hover:bg-[#2e3151]/60`}>
                  {!selectedAccountId && (
                    <td className="px-4 py-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: entry.accountColor }} title={entry.accountName} />
                    </td>
                  )}
                  <td className="px-4 py-3 max-w-0 w-full">
                    <div className="text-white font-medium flex items-center gap-1.5">
                      {entry.currency === 'KRW' ? '현금 (원화)' : '현금 (달러)'}
                    </div>
                    <div className="text-gray-500 text-xs font-mono">{entry.accountName} · {entry.currency}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums whitespace-nowrap">—</td>
                  {colOrder.map(col => {
                    if (col === 'quantity') return (
                      <td key={col} className="px-4 py-3 text-right text-gray-600 tabular-nums">—</td>
                    );
                    if (col === 'avgCost') return (
                      <td key={col} className="px-4 py-3 text-right text-gray-600 tabular-nums">—</td>
                    );
                    if (col === 'marketValueKrw') return (
                      <td key={col} className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                        <div className="text-white">
                          {entry.currency === 'KRW'
                            ? `₩${entry.amount.toLocaleString()}`
                            : `$${entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </div>
                        {entry.currency === 'USD' && (
                          <div className="text-gray-500 text-xs mt-0.5">{fmtVal(entry.amountKrw)}</div>
                        )}
                      </td>
                    );
                    if (col === 'weightPct') return (
                      <td key={col} className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                        <div className="text-gray-300 text-sm">{weight.toFixed(1)}%</div>
                        <div className="mt-1 h-1 w-16 ml-auto bg-[#2e3151] rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500 opacity-70" style={{ width: `${Math.min(weight, 100)}%` }} />
                        </div>
                      </td>
                    );
                    if (col === 'gainLossKrw') return (
                      <td key={col} className="px-4 py-3 text-right text-gray-600 tabular-nums">—</td>
                    );
                    if (col === 'gainLossPct') return (
                      <td key={col} className="px-4 py-3 text-right text-gray-600 tabular-nums">—</td>
                    );
                    return <td key={col} className="px-4 py-3 text-right text-gray-600">—</td>;
                  })}
                  <td className="px-4 py-3" />
                </tr>
              );
            })}
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
                    <a
                      href={`https://finance.yahoo.com/quote/${
                        stock.market === 'KRX' ? `${stock.ticker}.KS` :
                        stock.market === 'KOSDAQ' ? `${stock.ticker}.KQ` :
                        stock.ticker
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden group"
                    >
                      <div className="text-white font-medium truncate group-hover:text-blue-400 transition-colors">{stock.nameKo}</div>
                      <div className="text-gray-500 text-xs font-mono truncate">{stock.ticker} · {stock.market}</div>
                      {stock.memo && (
                        <div className="text-gray-600 text-xs truncate mt-0.5" title={stock.memo}>
                          {stock.memo.length > 30 ? stock.memo.slice(0, 30) + '…' : stock.memo}
                        </div>
                      )}
                    </a>
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
                  {colOrder.map(col => (
                    <Fragment key={col}>
                      {colDefs[col].renderCell(stock)}
                    </Fragment>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEdit(stock)}
                        className="text-gray-600 hover:text-blue-400 transition-colors p-1 rounded"
                        title="수정"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => onSell(stock)}
                        className="text-gray-600 hover:text-orange-400 transition-colors p-1 rounded"
                        title="매도"
                      >
                        <TrendingDown size={13} />
                      </button>
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
          {sorted.length === 0 && cashEntries.length === 0 && (
            <div className="py-12 text-center text-gray-600">보유 종목이 없습니다</div>
          )}
      </div>
    </div>
  );
}
