import { useState, useMemo, useCallback, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Camera } from 'lucide-react';
import type { DailySnapshot, Account } from '../types';
import type { DisplayCurrency } from '../utils/currency';
import { fmtAmountFull } from '../utils/currency';

type Period = 'day' | 'month' | 'year';

interface Props {
  snapshots: DailySnapshot[];
  accounts: Account[];
  onTakeSnapshot: () => void;
  displayCurrency: DisplayCurrency;
  usdToKrw: number;
}

function aggregateByPeriod(snapshots: DailySnapshot[], period: 'month' | 'year'): DailySnapshot[] {
  const map = new Map<string, DailySnapshot>();
  for (const snap of snapshots) {
    const key = period === 'month' ? snap.date.slice(0, 7) : snap.date.slice(0, 4);
    map.set(key, snap); // keep latest per period (snapshots sorted asc)
  }
  return Array.from(map.values());
}

function dateLabel(date: string, period: Period): string {
  if (period === 'year') return `${date.slice(0, 4)}년`;
  if (period === 'month') {
    const [y, m] = date.split('-');
    return `${y}년 ${parseInt(m)}월`;
  }
  const [, m, d] = date.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

export function HistoryPage({ snapshots, accounts, onTakeSnapshot, displayCurrency, usdToKrw }: Props) {
  const [period, setPeriod] = useState<Period>('day');
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [savedMsg, setSavedMsg] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fmt = (v: number) => fmtAmountFull(v, displayCurrency, usdToKrw);

  const handleSave = useCallback(() => {
    onTakeSnapshot();
    setSavedMsg(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedMsg(false), 2000);
  }, [onTakeSnapshot]);

  function toggleAccount(id: string) {
    setHiddenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Collect all unique account metadata across all snapshots (prefer current accounts)
  const allAccountInfo = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const snap of snapshots) {
      for (const a of snap.accounts) {
        if (!map.has(a.id)) map.set(a.id, { name: a.name, color: a.color });
      }
    }
    for (const acc of accounts) {
      map.set(acc.id, { name: acc.name, color: acc.color });
    }
    return map;
  }, [snapshots, accounts]);

  const displaySnapshots = useMemo(
    () => (period === 'day' ? snapshots : aggregateByPeriod(snapshots, period)),
    [snapshots, period],
  );

  const chartAccountIds = useMemo(() => {
    const ids = new Set<string>();
    for (const snap of displaySnapshots) for (const a of snap.accounts) ids.add(a.id);
    return Array.from(ids);
  }, [displaySnapshots]);

  const visibleAccountIds = chartAccountIds.filter(id => !hiddenIds.has(id));

  const chartData = useMemo(() =>
    displaySnapshots.map(snap => {
      const point: Record<string, string | number> = { date: dateLabel(snap.date, period) };
      for (const id of chartAccountIds) {
        point[id] = snap.accounts.find(a => a.id === id)?.valueKrw ?? 0;
      }
      return point;
    }),
    [displaySnapshots, chartAccountIds, period],
  );

  const lastSnap = snapshots[snapshots.length - 1];
  const firstSnap = snapshots[0];
  const totalChange = lastSnap && firstSnap
    ? lastSnap.totalValueKrw - firstSnap.totalValueKrw
    : null;
  const totalChangePct = totalChange !== null && firstSnap!.totalValueKrw !== 0
    ? (totalChange / firstSnap!.totalValueKrw) * 100
    : null;

  if (snapshots.length === 0) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-white">(임시) 계좌 수익률</h2>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
          >
            <Camera size={14} />
            {savedMsg ? '저장됨 ✓' : '지금 저장'}
          </button>
        </div>
        <div className="bg-[#1a1d2e] border border-dashed border-[#2e3151] rounded-xl p-16 text-center">
          <Camera size={32} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 mb-1.5">저장된 데이터가 없습니다</p>
          <p className="text-gray-600 text-xs mb-5">
            매일 오전 6시에 자동 저장됩니다 (앱이 열려있을 때만 동작)
          </p>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-colors"
          >
            {savedMsg ? '저장됨 ✓' : '지금 저장해보기'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white">(임시) 계좌 수익률</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            {snapshots.length}개 기록 · 최근 저장{' '}
            {lastSnap
              ? new Date(lastSnap.savedAt).toLocaleString('ko-KR', {
                  month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                })
              : '—'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex bg-[#1a1d2e] border border-[#2e3151] rounded-xl p-0.5">
            {(['day', 'month', 'year'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  period === p ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {{ day: '일', month: '월', year: '년' }[p]}
              </button>
            ))}
          </div>
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1d2e] border rounded-lg text-xs transition-colors ${
              savedMsg
                ? 'border-emerald-600 text-emerald-400'
                : 'border-[#2e3151] hover:border-gray-500 text-gray-400 hover:text-white'
            }`}
          >
            <Camera size={12} />
            {savedMsg ? '저장됨 ✓' : '지금 저장'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {lastSnap && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl px-4 py-3">
            <p className="text-gray-500 text-xs mb-1">현재 평가금액</p>
            <p className="text-white font-semibold tabular-nums">{fmt(lastSnap.totalValueKrw)}</p>
          </div>
          {totalChange !== null && totalChangePct !== null && (
            <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl px-4 py-3">
              <p className="text-gray-500 text-xs mb-1">전체 기간 변동</p>
              <p className={`font-semibold tabular-nums ${totalChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalChange >= 0 ? '+' : ''}{fmt(totalChange)}
              </p>
              <p className={`text-xs tabular-nums ${totalChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {totalChangePct >= 0 ? '+' : ''}{totalChangePct.toFixed(2)}%
              </p>
            </div>
          )}
          <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl px-4 py-3">
            <p className="text-gray-500 text-xs mb-1">첫 기록</p>
            <p className="text-white text-sm tabular-nums">{firstSnap?.date}</p>
            <p className="text-gray-500 text-xs tabular-nums">{firstSnap ? fmt(firstSnap.totalValueKrw) : '—'}</p>
          </div>
          <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl px-4 py-3">
            <p className="text-gray-500 text-xs mb-1">기록 수</p>
            <p className="text-white font-semibold">{snapshots.length}일</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl p-5">
        <div className="h-64 min-h-0">
          {chartData.length < 2 ? (
            <div className="h-full flex items-center justify-center text-gray-600 text-sm">
              차트를 표시하려면 데이터가 2개 이상 필요합니다
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
                <defs>
                  {visibleAccountIds.map(id => {
                    const color = allAccountInfo.get(id)?.color ?? '#6366f1';
                    return (
                      <linearGradient key={id} id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.5} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e3151" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#2e3151' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => fmt(v)}
                  width={72}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f1117', border: '1px solid #2e3151',
                    borderRadius: 8, fontSize: 12,
                  }}
                  labelStyle={{ color: '#9ca3af', marginBottom: 4 }}
                  formatter={(value, name) => [
                    fmt(Number(value ?? 0)),
                    allAccountInfo.get(String(name ?? ''))?.name ?? String(name ?? ''),
                  ]}
                />
                {visibleAccountIds.map(id => {
                  const color = allAccountInfo.get(id)?.color ?? '#6366f1';
                  return (
                    <Area
                      key={id}
                      type="monotone"
                      dataKey={id}
                      stackId="1"
                      stroke={color}
                      fill={`url(#grad-${id})`}
                      strokeWidth={1.5}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* Legend with checkboxes */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[#2e3151]">
          {chartAccountIds.map(id => {
            const info = allAccountInfo.get(id);
            const visible = !hiddenIds.has(id);
            return (
              <button
                key={id}
                onClick={() => toggleAccount(id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors text-xs ${
                  visible
                    ? 'border-[#3e4265] bg-[#2a2d45] text-gray-200'
                    : 'border-[#2e3151] bg-transparent text-gray-600'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-opacity"
                  style={{ background: info?.color, opacity: visible ? 1 : 0.25 }}
                />
                <span>{info?.name}</span>
                <span className={`ml-0.5 transition-opacity ${visible ? 'opacity-60' : 'opacity-30'}`}>
                  {visible ? '✓' : '—'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2e3151]">
                <th className="text-left px-4 py-3 text-gray-500 font-normal text-xs">날짜</th>
                {visibleAccountIds.map(id => (
                  <th key={id} className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
                      style={{ background: allAccountInfo.get(id)?.color }}
                    />
                    {allAccountInfo.get(id)?.name ?? id}
                  </th>
                ))}
                <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs">합계</th>
                <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">
                  {{ day: '전일', month: '전월', year: '전년' }[period]}대비
                </th>
              </tr>
            </thead>
            <tbody>
              {[...displaySnapshots].reverse().map((snap, i, arr) => {
                const prev = arr[i + 1];
                const diff = prev != null ? snap.totalValueKrw - prev.totalValueKrw : null;
                const diffPct =
                  diff !== null && prev!.totalValueKrw !== 0
                    ? (diff / prev!.totalValueKrw) * 100
                    : null;
                return (
                  <tr
                    key={snap.date}
                    className={`border-b border-[#1a1d2e] hover:bg-[#2e3151]/40 transition-colors ${
                      i % 2 === 0 ? 'bg-[#1a1d2e]' : 'bg-[#1c2036]'
                    }`}
                  >
                    <td className="px-4 py-2.5 text-gray-300 text-xs tabular-nums whitespace-nowrap">
                      {period === 'day' ? snap.date : dateLabel(snap.date, period)}
                    </td>
                    {visibleAccountIds.map(id => {
                      const a = snap.accounts.find(x => x.id === id);
                      return (
                        <td key={id} className="px-4 py-2.5 text-right text-white text-xs tabular-nums">
                          {a ? fmt(a.valueKrw) : <span className="text-gray-600">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-right text-white text-xs tabular-nums font-medium">
                      {fmt(snap.totalValueKrw)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums">
                      {diff !== null && diffPct !== null ? (
                        <div className={diff >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          <div>{diff >= 0 ? '+' : ''}{fmt(diff)}</div>
                          <div className="opacity-70">{diffPct >= 0 ? '+' : ''}{diffPct.toFixed(2)}%</div>
                        </div>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
