import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Trade, Account } from '../types';
import type { DisplayCurrency } from '../utils/currency';
import { fmtAmountFull } from '../utils/currency';

interface Props {
  trades: Trade[];
  accounts: Account[];
  onDeleteTrade: (id: string) => void;
  onUpdateTrade: (id: string, updates: Partial<Trade>) => void;
  displayCurrency: DisplayCurrency;
  usdToKrw: number;
}

type FilterType = '전체' | '매수' | '매도';

function MemoCell({ trade, onUpdate }: { trade: Trade; onUpdate: (memo: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(trade.memo ?? '');

  function handleBlur() {
    setEditing(false);
    if (value !== (trade.memo ?? '')) onUpdate(value);
  }

  if (editing) {
    return (
      <td className="px-4 py-2 min-w-[140px]">
        <input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setValue(trade.memo ?? ''); setEditing(false); } }}
          className="w-full bg-[#0f1117] border border-blue-500 text-white text-xs rounded px-2 py-1 outline-none"
          placeholder="코멘트 입력..."
        />
      </td>
    );
  }

  return (
    <td
      className="px-4 py-3 min-w-[120px] cursor-pointer group"
      onClick={() => setEditing(true)}
      title="클릭하여 편집"
    >
      {value ? (
        <span className="text-gray-400 text-xs group-hover:text-gray-200 transition-colors">{value}</span>
      ) : (
        <span className="text-gray-700 text-xs group-hover:text-gray-500 transition-colors">—</span>
      )}
    </td>
  );
}

export function TradesPage({ trades, accounts: _accounts, onDeleteTrade, onUpdateTrade, displayCurrency, usdToKrw }: Props) {
  const [filter, setFilter] = useState<FilterType>('전체');
  const fmt = (n: number) => fmtAmountFull(n, displayCurrency, usdToKrw);

  const filtered = trades.filter(t => {
    if (filter === '매수') return t.type === 'buy';
    if (filter === '매도') return t.type === 'sell';
    return true;
  });

  const totalRealizedPnlKrw = trades
    .filter(t => t.type === 'sell')
    .reduce((sum, t) => sum + (t.realizedPnlKrw ?? 0), 0);

  function handleDelete(id: string) {
    if (window.confirm('거래 기록을 삭제하시겠습니까?')) {
      onDeleteTrade(id);
    }
  }

  function formatDate(ms: number) {
    const d = new Date(ms);
    return d.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white">거래 내역</h2>
          <p className="text-gray-500 text-xs mt-0.5">{trades.length}건의 거래 기록</p>
        </div>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl px-4 py-3">
          <p className="text-gray-500 text-xs mb-1">실현손익 합계</p>
          <p className={`font-semibold tabular-nums text-lg ${totalRealizedPnlKrw >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalRealizedPnlKrw >= 0 ? '+' : ''}{fmt(totalRealizedPnlKrw)}
          </p>
          <p className="text-gray-600 text-xs mt-0.5">
            매도 거래 {trades.filter(t => t.type === 'sell').length}건
          </p>
        </div>
        <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl px-4 py-3">
          <p className="text-gray-500 text-xs mb-1">거래 통계</p>
          <div className="flex gap-4 mt-1">
            <div>
              <p className="text-blue-400 font-semibold tabular-nums">{trades.filter(t => t.type === 'buy').length}건</p>
              <p className="text-gray-600 text-xs">매수</p>
            </div>
            <div>
              <p className="text-red-400 font-semibold tabular-nums">{trades.filter(t => t.type === 'sell').length}건</p>
              <p className="text-gray-600 text-xs">매도</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(['전체', '매수', '매도'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
              filter === f
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-[#1a1d2e] border-[#2e3151] text-gray-400 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-[#1a1d2e] border border-dashed border-[#2e3151] rounded-xl p-16 text-center">
          <p className="text-gray-500">거래 내역이 없습니다</p>
          <p className="text-gray-600 text-xs mt-1">
            종목을 매수하거나 매도하면 여기에 기록됩니다
          </p>
        </div>
      ) : (
        <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2e3151]">
                  <th className="text-left px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">날짜/시간</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-normal text-xs w-full">종목</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">코멘트</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">계좌</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">유형</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">수량</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">단가</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">실현손익</th>
                  <th className="px-4 py-3 w-1" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((trade, i) => (
                  <tr
                    key={trade.id}
                    className={`border-b border-[#1a1d2e] hover:bg-[#2e3151]/40 transition-colors ${
                      i % 2 === 0 ? 'bg-[#1a1d2e]' : 'bg-[#1c2036]'
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-400 text-xs tabular-nums whitespace-nowrap">
                      {formatDate(trade.createdAt)}
                    </td>
                    <td className="px-4 py-3 max-w-0 w-full">
                      <div className="text-white font-medium truncate">{trade.nameKo}</div>
                      <div className="text-gray-500 text-xs font-mono truncate">
                        {trade.ticker} · {trade.market}
                      </div>
                    </td>
                    <MemoCell
                      trade={trade}
                      onUpdate={memo => onUpdateTrade(trade.id, { memo })}
                    />
                    <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">
                      {trade.accountName}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${
                          trade.type === 'buy'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {trade.type === 'buy' ? '매수' : '매도'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300 text-xs tabular-nums whitespace-nowrap">
                      {trade.quantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300 text-xs tabular-nums whitespace-nowrap">
                      {trade.currency === 'USD'
                        ? `$${trade.price.toFixed(2)}`
                        : `₩${Math.round(trade.price).toLocaleString()}`}
                    </td>
                    <td className="px-4 py-3 text-right text-xs tabular-nums whitespace-nowrap">
                      {trade.type === 'sell' && trade.realizedPnlKrw !== undefined ? (
                        <span className={trade.realizedPnlKrw >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                          {trade.realizedPnlKrw >= 0 ? '+' : ''}{fmt(trade.realizedPnlKrw)}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(trade.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors p-1 rounded"
                        title="삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
