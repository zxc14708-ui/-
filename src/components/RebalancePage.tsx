import { useState, useMemo, useEffect, useCallback } from 'react';
import type { StockWithStats, Account } from '../types';
import type { DisplayCurrency } from '../utils/currency';
import { fmtAmountFull } from '../utils/currency';

const WEIGHTS_KEY = 'portfolio_rebalance_weights_v1';

interface Props {
  stocks: StockWithStats[];
  accounts: Account[];
  displayCurrency: DisplayCurrency;
  usdToKrw: number;
}

interface TradeAction {
  stock: StockWithStats;
  type: 'buy' | 'sell';
  shares: number;
  actualDiffKrw: number;
  accountName: string;
}

function emptyWeights(stocks: StockWithStats[]): Record<string, string> {
  const map: Record<string, string> = {};
  stocks.forEach(s => { map[s.id] = ''; });
  return map;
}

export function RebalancePage({ stocks, accounts, displayCurrency, usdToKrw }: Props) {
  const fmt = (n: number) => fmtAmountFull(n, displayCurrency, usdToKrw);

  // 계좌 필터 — null = 전체
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const filteredStocks = selectedAccountId
    ? stocks.filter(s => s.accountId === selectedAccountId)
    : stocks;

  const totalValueKrw = filteredStocks.reduce((sum, s) => sum + s.marketValueKrw, 0);

  const [targetWeights, setTargetWeights] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(WEIGHTS_KEY);
      if (saved) return JSON.parse(saved) as Record<string, string>;
    } catch {}
    return emptyWeights(stocks);
  });

  const [extraCash, setExtraCash] = useState('');

  // localStorage에 자동 저장
  useEffect(() => {
    try {
      localStorage.setItem(WEIGHTS_KEY, JSON.stringify(targetWeights));
    } catch {}
  }, [targetWeights]);

  const extraCashKrw = Number(extraCash) || 0;
  const totalTargetKrw = totalValueKrw + extraCashKrw;

  const weightSum = filteredStocks.reduce((sum, s) => sum + (Number(targetWeights[s.id]) || 0), 0);
  const weightValid = Math.abs(weightSum - 100) < 0.15;

  const setWeight = useCallback((id: string, value: string) => {
    setTargetWeights(prev => ({ ...prev, [id]: value }));
  }, []);

  function resetWeights() {
    setTargetWeights(prev => {
      const next = { ...prev };
      filteredStocks.forEach(s => {
        const w = totalValueKrw > 0 ? (s.marketValueKrw / totalValueKrw) * 100 : 0;
        next[s.id] = w.toFixed(1);
      });
      return next;
    });
  }

  function distributeEvenly() {
    const w = filteredStocks.length > 0 ? (100 / filteredStocks.length).toFixed(1) : '0';
    setTargetWeights(prev => {
      const next = { ...prev };
      filteredStocks.forEach(s => { next[s.id] = w; });
      return next;
    });
  }

  const trades = useMemo<TradeAction[]>(() => {
    if (!weightValid) return [];

    return filteredStocks
      .map(s => {
        const targetPct = Number(targetWeights[s.id]) || 0;
        const targetValueKrw = (targetPct / 100) * totalTargetKrw;
        const diffKrw = targetValueKrw - s.marketValueKrw;
        const currentPriceKrw = s.currency === 'USD' ? s.currentPrice * usdToKrw : s.currentPrice;
        const shares = currentPriceKrw > 0 ? Math.floor(Math.abs(diffKrw) / currentPriceKrw) : 0;
        if (shares === 0) return null;

        const actualDiffKrw = shares * currentPriceKrw * (diffKrw >= 0 ? 1 : -1);
        return {
          stock: s,
          type: (diffKrw >= 0 ? 'buy' : 'sell') as 'buy' | 'sell',
          shares,
          actualDiffKrw,
          accountName: accounts.find(a => a.id === s.accountId)?.name ?? s.accountId,
        };
      })
      .filter((t): t is TradeAction => t !== null);
  }, [filteredStocks, targetWeights, totalTargetKrw, usdToKrw, weightValid, accounts]);

  const sells = trades.filter(t => t.type === 'sell');
  const buys = trades.filter(t => t.type === 'buy');
  const cashFromSells = sells.reduce((sum, t) => sum + Math.abs(t.actualDiffKrw), 0);
  const cashForBuys = buys.reduce((sum, t) => sum + Math.abs(t.actualDiffKrw), 0);
  const remainingCash = extraCashKrw + cashFromSells - cashForBuys;

  // 계좌 탭 목록 — 보유 종목이 있는 계좌만
  const accountsWithStocks = accounts.filter(a => stocks.some(s => s.accountId === a.id));

  if (stocks.length === 0) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 py-6">
        <div className="bg-[#1a1d2e] border border-dashed border-[#2e3151] rounded-xl p-16 text-center">
          <p className="text-gray-500">보유 종목이 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white">리밸런싱 계산기</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            목표 비중을 설정하면 필요한 매매 액션을 계산합니다
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={distributeEvenly}
            className="px-3 py-1.5 text-xs bg-[#1a1d2e] border border-[#2e3151] hover:border-gray-500 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            균등 배분
          </button>
          <button
            onClick={resetWeights}
            className="px-3 py-1.5 text-xs bg-[#1a1d2e] border border-[#2e3151] hover:border-gray-500 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            현재 비중으로 초기화
          </button>
        </div>
      </div>

      {/* Account tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedAccountId(null)}
          className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            selectedAccountId === null
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-[#1a1d2e] border-[#2e3151] text-gray-400 hover:text-white'
          }`}
        >
          전체
          <span className="ml-1.5 text-xs opacity-70">{stocks.length}종목</span>
        </button>
        {accountsWithStocks.map(a => {
          const count = stocks.filter(s => s.accountId === a.id).length;
          const isSelected = selectedAccountId === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setSelectedAccountId(a.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isSelected
                  ? 'border-blue-600 text-white'
                  : 'bg-[#1a1d2e] border-[#2e3151] text-gray-400 hover:text-white'
              }`}
              style={isSelected ? { background: a.color + '33', borderColor: a.color } : {}}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: a.color }}
              />
              {a.name}
              <span className="opacity-70">{count}종목</span>
            </button>
          );
        })}
      </div>

      {/* Total amount bar */}
      <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl p-4 flex flex-wrap items-center gap-4">
        <div>
          <p className="text-gray-500 text-xs mb-0.5">
            {selectedAccountId ? accounts.find(a => a.id === selectedAccountId)?.name : '전체'} 평가금액
          </p>
          <p className="text-white font-semibold tabular-nums">{fmt(totalValueKrw)}</p>
        </div>
        <span className="text-gray-600 font-bold text-lg">+</span>
        <div>
          <p className="text-gray-500 text-xs mb-1">추가 투입 현금 (원)</p>
          <input
            type="number"
            min="0"
            value={extraCash}
            onChange={e => setExtraCash(e.target.value)}
            placeholder="0"
            className="w-36 bg-[#0f1117] border border-[#2e3151] focus:border-blue-500 text-white text-sm rounded-lg px-3 py-1.5 outline-none tabular-nums placeholder:text-gray-700"
          />
        </div>
        <span className="text-gray-600 font-bold text-lg">=</span>
        <div>
          <p className="text-gray-500 text-xs mb-0.5">총 운용금액</p>
          <p className="text-blue-400 font-bold tabular-nums text-lg">{fmt(totalTargetKrw)}</p>
        </div>
      </div>

      {/* Weight table */}
      <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2e3151]">
                <th className="text-left px-4 py-3 text-gray-500 font-normal text-xs w-full">종목</th>
                {!selectedAccountId && (
                  <th className="text-left px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">계좌</th>
                )}
                <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">현재금액</th>
                <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">현재비중</th>
                <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    목표비중
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        weightValid
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {weightSum.toFixed(1)}%
                    </span>
                  </div>
                </th>
                <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">목표금액</th>
                <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">차이</th>
              </tr>
            </thead>
            <tbody>
              {filteredStocks.map((stock, i) => {
                const currentWeight =
                  totalValueKrw > 0 ? (stock.marketValueKrw / totalValueKrw) * 100 : 0;
                const targetPct = Number(targetWeights[stock.id]) || 0;
                const targetValueKrw = (targetPct / 100) * totalTargetKrw;
                const diffKrw = targetValueKrw - stock.marketValueKrw;
                const accountColor =
                  accounts.find(a => a.id === stock.accountId)?.color ?? '#6366f1';
                const accountName =
                  accounts.find(a => a.id === stock.accountId)?.name ?? stock.accountId;

                return (
                  <tr
                    key={stock.id}
                    className={`border-b border-[#1a1d2e] ${i % 2 === 0 ? 'bg-[#1a1d2e]' : 'bg-[#1c2036]'}`}
                  >
                    <td className="px-4 py-3 max-w-0 w-full">
                      <div className="text-white font-medium truncate">{stock.nameKo}</div>
                      <div className="text-gray-500 text-xs font-mono">{stock.ticker} · {stock.market}</div>
                    </td>
                    {!selectedAccountId && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: accountColor }}
                          />
                          <span className="text-gray-400 text-xs">{accountName}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 text-right text-white tabular-nums whitespace-nowrap">
                      {fmt(stock.marketValueKrw)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 tabular-nums whitespace-nowrap">
                      {currentWeight.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={targetWeights[stock.id] ?? ''}
                          onChange={e => setWeight(stock.id, e.target.value)}
                          className="w-20 bg-[#0f1117] border border-[#2e3151] focus:border-blue-500 text-white text-sm rounded-lg px-2 py-1 outline-none tabular-nums text-right"
                        />
                        <span className="text-gray-500 text-xs">%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-white tabular-nums whitespace-nowrap">
                      {fmt(targetValueKrw)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap font-semibold">
                      <span className={diffKrw >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {diffKrw >= 0 ? '+' : ''}{fmt(diffKrw)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validation warning */}
      {!weightValid && (
        <div className="bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3 text-red-400 text-sm">
          목표 비중 합계가 100%가 되어야 합니다. 현재:{' '}
          <span className="font-semibold tabular-nums">{weightSum.toFixed(1)}%</span>
        </div>
      )}

      {/* Trade plan */}
      {weightValid && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
              📉 매도 먼저 실행
              <span className="text-gray-600 font-normal text-xs">{sells.length}건</span>
            </h4>
            {sells.length === 0 ? (
              <p className="text-gray-600 text-xs py-2">매도할 종목 없음</p>
            ) : (
              <>
                {sells.map(t => (
                  <div key={t.stock.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-white text-sm font-medium truncate">{t.stock.nameKo}</div>
                      <div className="text-gray-500 text-xs">{t.stock.ticker} · {t.accountName}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-red-400 font-semibold tabular-nums">
                        {t.shares.toLocaleString()}주 매도
                      </div>
                      <div className="text-gray-500 text-xs tabular-nums">
                        ≈ {fmt(Math.abs(t.actualDiffKrw))}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-[#2e3151] flex justify-between text-xs text-gray-500 tabular-nums">
                  <span>확보 현금</span>
                  <span className="text-white font-medium">+{fmt(cashFromSells)}</span>
                </div>
              </>
            )}
          </div>

          <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
              📈 매수 나중에 실행
              <span className="text-gray-600 font-normal text-xs">{buys.length}건</span>
            </h4>
            {buys.length === 0 ? (
              <p className="text-gray-600 text-xs py-2">매수할 종목 없음</p>
            ) : (
              <>
                {buys.map(t => (
                  <div key={t.stock.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-white text-sm font-medium truncate">{t.stock.nameKo}</div>
                      <div className="text-gray-500 text-xs">{t.stock.ticker} · {t.accountName}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-emerald-400 font-semibold tabular-nums">
                        {t.shares.toLocaleString()}주 매수
                      </div>
                      <div className="text-gray-500 text-xs tabular-nums">
                        ≈ {fmt(Math.abs(t.actualDiffKrw))}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-[#2e3151] flex justify-between text-xs text-gray-500 tabular-nums">
                  <span>필요 현금</span>
                  <span className="text-white font-medium">-{fmt(cashForBuys)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cash summary */}
      {weightValid && trades.length > 0 && (
        <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl px-5 py-4 flex flex-wrap gap-6">
          {extraCashKrw > 0 && (
            <div>
              <p className="text-gray-500 text-xs mb-0.5">추가 투입</p>
              <p className="text-blue-400 tabular-nums font-semibold">+{fmt(extraCashKrw)}</p>
            </div>
          )}
          <div>
            <p className="text-gray-500 text-xs mb-0.5">매도 확보</p>
            <p className="text-red-400 tabular-nums font-semibold">+{fmt(cashFromSells)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-0.5">매수 사용</p>
            <p className="text-emerald-400 tabular-nums font-semibold">-{fmt(cashForBuys)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-0.5">잔여 현금 (주수 반올림 오차)</p>
            <p className={`tabular-nums font-semibold ${remainingCash >= 0 ? 'text-white' : 'text-red-400'}`}>
              {remainingCash >= 0 ? '+' : ''}{fmt(remainingCash)}
            </p>
          </div>
        </div>
      )}

      {weightValid && trades.length === 0 && (
        <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl px-4 py-4 text-center">
          <p className="text-emerald-400 font-semibold">이미 목표 비중에 맞게 구성되어 있습니다</p>
          <p className="text-gray-500 text-xs mt-1">거래가 필요하지 않습니다</p>
        </div>
      )}
    </div>
  );
}
