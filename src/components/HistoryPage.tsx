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
    map.set(key, snap);
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

function pctColor(v: number | null) {
  if (v === null) return 'text-gray-400';
  return v >= 0 ? 'text-emerald-400' : 'text-red-400';
}

function pctStr(v: number | null) {
  if (v === null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

export function HistoryPage({ snapshots, accounts, onTakeSnapshot, displayCurrency, usdToKrw }: Props) {
  const [period, setPeriod] = useState<Period>('day');
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [savedMsg, setSavedMsg] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
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

  // All account IDs that appear in any snapshot (for selector tabs)
  const snapshotAccountIds = useMemo(() => {
    const ids = new Set<string>();
    for (const snap of snapshots) for (const a of snap.accounts) ids.add(a.id);
    return Array.from(ids);
  }, [snapshots]);

  const lastSnap = snapshots[snapshots.length - 1];
  const firstSnap = snapshots[0];

  function getSnapVal(snap: DailySnapshot, accountId: string | null): number {
    if (accountId === null) return snap.totalValueKrw;
    return snap.accounts.find(a => a.id === accountId)?.valueKrw ?? 0;
  }

  const currentValue = lastSnap ? getSnapVal(lastSnap, selectedAccountId) : null;
  const firstValue = firstSnap ? getSnapVal(firstSnap, selectedAccountId) : null;
  const totalChange = currentValue !== null && firstValue !== null ? currentValue - firstValue : null;
  const totalChangePct =
    totalChange !== null && firstValue !== null && firstValue !== 0
      ? (totalChange / firstValue) * 100
      : null;

  const selectedAccountColor = selectedAccountId
    ? (allAccountInfo.get(selectedAccountId)?.color ?? '#6366f1')
    : '#6366f1';

  // Chart data: per-account keys when 전체, single `value` key when individual
  const chartData = useMemo(() => {
    if (selectedAccountId === null) {
      return displaySnapshots.map(snap => {
        const point: Record<string, string | number> = { date: dateLabel(snap.date, period) };
        for (const id of chartAccountIds) {
          point[id] = snap.accounts.find(a => a.id === id)?.valueKrw ?? 0;
        }
        return point;
      });
    }
    return displaySnapshots.map(snap => ({
      date: dateLabel(snap.date, period),
      value: snap.accounts.find(a => a.id === selectedAccountId)?.valueKrw ?? 0,
    }));
  }, [displaySnapshots, chartAccountIds, period, selectedAccountId]);

  const periodLabel = { day: '전일', month: '전월', year: '전년' }[period];

  if (snapshots.length === 0) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-white">계좌 수익률</h2>
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
            매일 22:00에 자동 저장됩니다 (앱이 열려있을 때만 동작)
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
          <h2 className="text-lg font-semibold text-white">계좌 수익률</h2>
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

      {/* Account selector tabs */}
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        <button
          onClick={() => setSelectedAccountId(null)}
          className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
            selectedAccountId === null
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-[#1a1d2e] border-[#2e3151] text-gray-400 hover:text-white'
          }`}
        >
          전체
        </button>
        {snapshotAccountIds.map(id => {
          const info = allAccountInfo.get(id);
          const isSelected = selectedAccountId === id;
          return (
            <button
              key={id}
              onClick={() => setSelectedAccountId(id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                isSelected
                  ? 'bg-[#1a1d2e] border-gray-400 text-white'
                  : 'bg-[#1a1d2e] border-[#2e3151] text-gray-400 hover:text-white'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: info?.color ?? '#6366f1', opacity: isSelected ? 1 : 0.5 }}
              />
              {info?.name ?? id}
            </button>
          );
        })}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl px-4 py-3">
          <p className="text-gray-500 text-xs mb-1">현재 평가금액</p>
          <p className="text-white font-semibold tabular-nums">
            {currentValue !== null ? fmt(currentValue) : '—'}
          </p>
        </div>
        {totalChange !== null && totalChangePct !== null && (
          <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl px-4 py-3">
            <p className="text-gray-500 text-xs mb-1">전체 기간 변동</p>
            <p className={`font-semibold tabular-nums ${pctColor(totalChange)}`}>
              {totalChange >= 0 ? '+' : ''}{fmt(totalChange)}
            </p>
            <p className={`text-xs tabular-nums ${pctColor(totalChangePct)}`}>
              {pctStr(totalChangePct)}
            </p>
          </div>
        )}
        <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl px-4 py-3">
          <p className="text-gray-500 text-xs mb-1">첫 기록</p>
          <p className="text-white text-sm tabular-nums">{firstSnap?.date}</p>
          <p className="text-gray-500 text-xs tabular-nums">
            {firstValue !== null ? fmt(firstValue) : '—'}
          </p>
        </div>
        <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl px-4 py-3">
          <p className="text-gray-500 text-xs mb-1">기록 수</p>
          <p className="text-white font-semibold">{snapshots.length}일</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl p-5">
        <div className="h-64 min-h-0">
          {chartData.length < 2 ? (
            <div className="h-full flex items-center justify-center text-gray-600 text-sm">
              차트를 표시하려면 데이터가 2개 이상 필요합니다
            </div>
          ) : selectedAccountId === null ? (
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
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2e3151' }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmt(v)} width={72} />
                <Tooltip
                  contentStyle={{ background: '#0f1117', border: '1px solid #2e3151', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#9ca3af', marginBottom: 4 }}
                  formatter={(value, name) => [
                    fmt(Number(value ?? 0)),
                    allAccountInfo.get(String(name ?? ''))?.name ?? String(name ?? ''),
                  ]}
                />
                {visibleAccountIds.map(id => {
                  const color = allAccountInfo.get(id)?.color ?? '#6366f1';
                  return (
                    <Area key={id} type="monotone" dataKey={id} stackId="1" stroke={color} fill={`url(#grad-${id})`} strokeWidth={1.5} />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
                <defs>
                  <linearGradient id="grad-single" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={selectedAccountColor} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={selectedAccountColor} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e3151" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2e3151' }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => fmt(v)} width={72} />
                <Tooltip
                  contentStyle={{ background: '#0f1117', border: '1px solid #2e3151', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#9ca3af', marginBottom: 4 }}
                  formatter={(value) => [
                    fmt(Number(value ?? 0)),
                    allAccountInfo.get(selectedAccountId!)?.name ?? '',
                  ]}
                />
                <Area type="monotone" dataKey="value" stroke={selectedAccountColor} fill="url(#grad-single)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend — 전체 모드에서만 표시 */}
        {selectedAccountId === null && (
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
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-opacity" style={{ background: info?.color, opacity: visible ? 1 : 0.25 }} />
                  <span>{info?.name}</span>
                  <span className={`ml-0.5 transition-opacity ${visible ? 'opacity-60' : 'opacity-30'}`}>{visible ? '✓' : '—'}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {selectedAccountId === null ? (
            // 전체 테이블
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2e3151]">
                  <th className="text-left px-4 py-3 text-gray-500 font-normal text-xs">날짜</th>
                  {visibleAccountIds.map(id => (
                    <th key={id} className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: allAccountInfo.get(id)?.color }} />
                      {allAccountInfo.get(id)?.name ?? id}
                    </th>
                  ))}
                  <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs">합계</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">{periodLabel}대비</th>
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
                          <div className={pctColor(diff)}>
                            <div>{diff >= 0 ? '+' : ''}{fmt(diff)}</div>
                            <div className="opacity-70">{pctStr(diffPct)}</div>
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
          ) : (
            // 개별 계좌 테이블
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2e3151]">
                  <th className="text-left px-4 py-3 text-gray-500 font-normal text-xs">날짜</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs">평가금액</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">{periodLabel}대비</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">첫 기록 대비</th>
                </tr>
              </thead>
              <tbody>
                {[...displaySnapshots].reverse().map((snap, i, arr) => {
                  const prev = arr[i + 1];
                  const val = snap.accounts.find(a => a.id === selectedAccountId)?.valueKrw ?? 0;
                  const prevVal = prev?.accounts.find(a => a.id === selectedAccountId)?.valueKrw ?? null;
                  const diff = prevVal !== null ? val - prevVal : null;
                  const diffPct = diff !== null && prevVal !== null && prevVal !== 0 ? (diff / prevVal) * 100 : null;

                  const baseVal = firstSnap?.accounts.find(a => a.id === selectedAccountId)?.valueKrw ?? null;
                  const sinceFirst = baseVal !== null ? val - baseVal : null;
                  const sinceFirstPct = sinceFirst !== null && baseVal !== null && baseVal !== 0 ? (sinceFirst / baseVal) * 100 : null;

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
                      <td className="px-4 py-2.5 text-right text-white text-xs tabular-nums font-medium">
                        {fmt(val)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums">
                        {diff !== null && diffPct !== null ? (
                          <div className={pctColor(diff)}>
                            <div>{diff >= 0 ? '+' : ''}{fmt(diff)}</div>
                            <div className="opacity-70">{pctStr(diffPct)}</div>
                          </div>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums">
                        {sinceFirst !== null && sinceFirstPct !== null ? (
                          <div className={pctColor(sinceFirst)}>
                            <div>{sinceFirst >= 0 ? '+' : ''}{fmt(sinceFirst)}</div>
                            <div className="opacity-70">{pctStr(sinceFirstPct)}</div>
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
          )}
        </div>
      </div>
    </div>
  );
}
