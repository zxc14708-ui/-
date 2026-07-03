import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Camera, TrendingUp, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { DailySnapshot, Account } from '../types';
import type { DisplayCurrency } from '../utils/currency';
import { fmtAmountFull } from '../utils/currency';
import { fetchSpxHistory, fetchKospiHistory, getIndexPrice } from '../utils/spxData';

type Period = 'day' | 'week' | 'month' | 'year';

const FIXED_HOLIDAYS: Record<string, string> = {
  '01-01': '신정',
  '03-01': '삼일절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '크리스마스',
};

const VARIABLE_HOLIDAYS: Record<string, string> = {
  // 2022
  '2022-01-31': '설날 연휴', '2022-02-01': '설날', '2022-02-02': '설날 연휴',
  '2022-03-09': '대통령선거일',
  '2022-05-08': '부처님오신날',
  '2022-06-01': '지방선거일',
  '2022-09-09': '추석 연휴', '2022-09-10': '추석', '2022-09-11': '추석 연휴', '2022-09-12': '대체공휴일',
  // 2023
  '2023-01-21': '설날 연휴', '2023-01-22': '설날', '2023-01-23': '설날 연휴', '2023-01-24': '대체공휴일',
  '2023-05-27': '부처님오신날', '2023-05-29': '대체공휴일',
  '2023-09-28': '추석 연휴', '2023-09-29': '추석', '2023-09-30': '추석 연휴', '2023-10-02': '임시공휴일',
  // 2024
  '2024-02-09': '설날 연휴', '2024-02-10': '설날', '2024-02-11': '설날 연휴', '2024-02-12': '대체공휴일',
  '2024-04-10': '국회의원선거일',
  '2024-05-06': '대체공휴일',
  '2024-05-15': '부처님오신날',
  '2024-09-16': '추석 연휴', '2024-09-17': '추석', '2024-09-18': '추석 연휴',
  // 2025
  '2025-01-28': '설날 연휴', '2025-01-29': '설날', '2025-01-30': '설날 연휴',
  '2025-05-05': '부처님오신날', '2025-05-06': '대체공휴일',
  '2025-10-05': '추석 연휴', '2025-10-06': '추석', '2025-10-07': '추석 연휴', '2025-10-08': '대체공휴일',
  // 2026
  '2026-02-17': '설날 연휴', '2026-02-18': '설날', '2026-02-19': '설날 연휴',
  '2026-05-24': '부처님오신날',
  '2026-09-24': '추석 연휴', '2026-09-25': '추석', '2026-09-26': '추석 연휴',
};

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

function DateCell({ date }: { date: string }) {
  const d = new Date(date + 'T00:00:00');
  const dayIdx = d.getDay();
  const day = DAYS_KO[dayIdx];
  const isWeekend = dayIdx === 0 || dayIdx === 6;
  const mmdd = date.slice(5);
  const holiday = VARIABLE_HOLIDAYS[date] ?? FIXED_HOLIDAYS[mmdd] ?? null;
  const isRed = isWeekend || holiday !== null;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={isRed ? 'text-red-400' : 'text-gray-300'}>{date}</span>
      <span className={`text-xs font-medium ${isRed ? 'text-red-400' : 'text-gray-500'}`}>({day})</span>
      {holiday && <span className="text-red-400 text-xs opacity-90">{holiday}</span>}
    </span>
  );
}

interface Props {
  snapshots: DailySnapshot[];
  accounts: Account[];
  onTakeSnapshot: () => void;
  displayCurrency: DisplayCurrency;
  usdToKrw: number;
}

function weekMondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon.toISOString().split('T')[0];
}

function isoWeekInfo(dateStr: string): { year: number; week: number } {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay() || 7;
  const thu = new Date(d);
  thu.setDate(d.getDate() + 4 - day);
  const year = thu.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const jan1Day = jan1.getDay() || 7;
  const firstThu = new Date(year, 0, 1 + (4 - jan1Day + 7) % 7);
  const week = Math.round((thu.getTime() - firstThu.getTime()) / 604_800_000) + 1;
  return { year, week };
}

function aggregateByPeriod(snapshots: DailySnapshot[], period: 'week' | 'month' | 'year'): DailySnapshot[] {
  const map = new Map<string, DailySnapshot>();
  for (const snap of snapshots) {
    const key = period === 'week' ? weekMondayOf(snap.date)
              : period === 'month' ? snap.date.slice(0, 7)
              : snap.date.slice(0, 4);
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
  if (period === 'week') {
    const { year, week } = isoWeekInfo(weekMondayOf(date));
    return `${year}년 ${week}주차`;
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

/**
 * 등락 크기별 셀 배경 — 좌→우 그라데이션.
 *   |pct| < 1%  : 배경 없음
 *   1% ~ 5%    : 연하게
 *   5% ~ 10%   : 진하게
 *   10% 이상   : 더 진하게
 * +는 초록(emerald), -는 붉은색(red).
 */
function diffCellBg(pct: number | null): React.CSSProperties | undefined {
  if (pct === null) return undefined;
  const a = Math.abs(pct);
  if (a < 1) return undefined;
  const alpha = a >= 10 ? 0.5 : a >= 5 ? 0.3 : 0.15;
  const rgb = pct >= 0 ? '16,185,129' : '239,68,68';
  return { background: `linear-gradient(90deg, transparent 0%, rgba(${rgb},${alpha}) 100%)` };
}

export function HistoryPage({ snapshots, accounts, onTakeSnapshot, displayCurrency, usdToKrw }: Props) {
  const [period, setPeriod] = useState<Period>('day');
  // 일 단위 뷰에서 보여줄 월 ('YYYY-MM'). null = 가장 최근 데이터가 있는 달
  const [dayMonth, setDayMonth] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [savedMsg, setSavedMsg] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [benchmarkOn, setBenchmarkOn] = useState(false);
  const [spxData, setSpxData] = useState<Record<string, number> | null>(null);
  const [kospiData, setKospiData] = useState<Record<string, number> | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState('');
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fmt = (v: number) => fmtAmountFull(v, displayCurrency, usdToKrw);

  useEffect(() => {
    if (!benchmarkOn || (spxData && kospiData)) return;
    setBenchmarkLoading(true);
    setBenchmarkError('');
    Promise.allSettled([
      spxData ? Promise.resolve(spxData) : fetchSpxHistory(),
      kospiData ? Promise.resolve(kospiData) : fetchKospiHistory(),
    ]).then(([spxResult, kospiResult]) => {
      if (spxResult.status === 'fulfilled') setSpxData(spxResult.value);
      if (kospiResult.status === 'fulfilled') setKospiData(kospiResult.value);
      if (spxResult.status === 'rejected' && kospiResult.status === 'rejected')
        setBenchmarkError('벤치마크 데이터를 불러오지 못했습니다');
    }).finally(() => setBenchmarkLoading(false));
  }, [benchmarkOn, spxData, kospiData]);

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

  // 데이터가 있는 달 목록 (오름차순 'YYYY-MM')
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const s of snapshots) set.add(s.date.slice(0, 7));
    return Array.from(set).sort();
  }, [snapshots]);

  // 선택한 달이 없거나 데이터에서 사라졌으면 가장 최근 달로
  const latestMonth = availableMonths[availableMonths.length - 1] ?? null;
  const effectiveDayMonth =
    dayMonth && availableMonths.includes(dayMonth) ? dayMonth : latestMonth;
  const monthIdx = effectiveDayMonth ? availableMonths.indexOf(effectiveDayMonth) : -1;

  // 일 단위: 선택한 달의 스냅샷만 표시 (데이터가 늘어나도 차트·테이블 과밀 방지)
  const displaySnapshots = useMemo(() => {
    if (period !== 'day') return aggregateByPeriod(snapshots, period);
    if (!effectiveDayMonth) return snapshots;
    return snapshots.filter(s => s.date.startsWith(effectiveDayMonth));
  }, [snapshots, period, effectiveDayMonth]);

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

  // 개별 계좌 '대비' 기준 — 일 단위는 선택한 달의 첫 기록(월초), 그 외는 전체 첫 기록
  const compareBaseSnap = period === 'day' ? displaySnapshots[0] : firstSnap;
  const compareBaseLabel = period === 'day' ? '월초 대비' : '첫 기록 대비';

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

  const periodLabel = { day: '전일', week: '전주', month: '전월', year: '전년' }[period];

  // 벤치마크: 정규화된 수익률 % (첫 스냅샷 기준)
  const benchmarkChartData = useMemo(() => {
    if (!benchmarkOn || displaySnapshots.length < 2) return null;
    const basePortfolio = getSnapVal(displaySnapshots[0], selectedAccountId);
    if (!basePortfolio) return null;

    const baseSpx = spxData ? getIndexPrice(spxData, displaySnapshots[0].date) : null;
    const baseKospi = kospiData ? getIndexPrice(kospiData, displaySnapshots[0].date) : null;

    return displaySnapshots.map(snap => {
      const portVal = getSnapVal(snap, selectedAccountId);
      const spxVal = spxData ? getIndexPrice(spxData, snap.date) : null;
      const kospiVal = kospiData ? getIndexPrice(kospiData, snap.date) : null;
      return {
        date: dateLabel(snap.date, period),
        portfolio: basePortfolio > 0 ? parseFloat(((portVal / basePortfolio - 1) * 100).toFixed(2)) : 0,
        sp500: spxVal && baseSpx ? parseFloat(((spxVal / baseSpx - 1) * 100).toFixed(2)) : null,
        kospi: kospiVal && baseKospi ? parseFloat(((kospiVal / baseKospi - 1) * 100).toFixed(2)) : null,
      };
    });
  }, [benchmarkOn, spxData, kospiData, displaySnapshots, selectedAccountId, period]);

  const benchmarkSummary = useMemo(() => {
    if (!benchmarkChartData || benchmarkChartData.length < 2) return null;
    const last = benchmarkChartData[benchmarkChartData.length - 1];
    return { portfolio: last.portfolio, sp500: last.sp500, kospi: last.kospi };
  }, [benchmarkChartData]);

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
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setBenchmarkOn(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
              benchmarkOn
                ? 'bg-amber-600/20 border-amber-600/60 text-amber-400'
                : 'bg-[#1a1d2e] border-[#2e3151] text-gray-400 hover:text-white hover:border-gray-500'
            }`}
          >
            {benchmarkLoading ? <Loader2 size={12} className="animate-spin" /> : <TrendingUp size={12} />}
            벤치마크
          </button>
          <div className="flex bg-[#1a1d2e] border border-[#2e3151] rounded-xl p-0.5">
            {(['day', 'week', 'month', 'year'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  period === p ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {{ day: '일', week: '주', month: '월', year: '년' }[p]}
              </button>
            ))}
          </div>
          {/* 일 단위: 월 선택 네비게이터 — 선택한 달만 차트·테이블에 표시 */}
          {period === 'day' && effectiveDayMonth && (
            <div className="flex items-center bg-[#1a1d2e] border border-[#2e3151] rounded-xl p-0.5">
              <button
                onClick={() => setDayMonth(availableMonths[monthIdx - 1])}
                disabled={monthIdx <= 0}
                className="px-1.5 py-1.5 text-gray-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                title="이전 달"
              >
                <ChevronLeft size={14} />
              </button>
              <select
                value={effectiveDayMonth.slice(0, 4)}
                onChange={e => {
                  // 연도 변경: 같은 월이 그 해에 있으면 유지, 없으면 그 해의 마지막 달로
                  const y = e.target.value;
                  const inYear = availableMonths.filter(m => m.startsWith(`${y}-`));
                  const sameMonth = `${y}-${effectiveDayMonth.slice(5)}`;
                  setDayMonth(inYear.includes(sameMonth) ? sameMonth : inYear[inYear.length - 1]);
                }}
                className="bg-transparent text-white text-xs font-medium outline-none cursor-pointer px-1 py-1.5 appearance-none text-center"
              >
                {Array.from(new Set(availableMonths.map(m => m.slice(0, 4)))).map(y => (
                  <option key={y} value={y} className="bg-[#1a1d2e]">{y}년</option>
                ))}
              </select>
              <select
                value={effectiveDayMonth}
                onChange={e => setDayMonth(e.target.value)}
                className="bg-transparent text-white text-xs font-medium outline-none cursor-pointer px-1 py-1.5 appearance-none text-center"
              >
                {availableMonths
                  .filter(m => m.startsWith(effectiveDayMonth.slice(0, 4)))
                  .map(m => (
                    <option key={m} value={m} className="bg-[#1a1d2e]">
                      {parseInt(m.slice(5))}월
                    </option>
                  ))}
              </select>
              <button
                onClick={() => setDayMonth(availableMonths[monthIdx + 1])}
                disabled={monthIdx < 0 || monthIdx >= availableMonths.length - 1}
                className="px-1.5 py-1.5 text-gray-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                title="다음 달"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
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

      {/* 벤치마크 요약 */}
      {benchmarkOn && benchmarkSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#1a1d2e] border border-indigo-800/40 rounded-xl px-4 py-3">
            <p className="text-gray-500 text-xs mb-1 flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500" /> 내 포트폴리오
            </p>
            <p className={`font-semibold tabular-nums text-lg ${pctColor(benchmarkSummary.portfolio)}`}>
              {pctStr(benchmarkSummary.portfolio)}
            </p>
            <p className="text-gray-600 text-xs mt-0.5">첫 기록 기준</p>
          </div>
          <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl px-4 py-3">
            <p className="text-gray-500 text-xs mb-1 flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" /> S&P500
            </p>
            <p className={`font-semibold tabular-nums text-lg ${pctColor(benchmarkSummary.sp500 ?? 0)}`}>
              {pctStr(benchmarkSummary.sp500)}
            </p>
            {benchmarkSummary.sp500 !== null && (
              <p className={`text-xs mt-0.5 ${pctColor(benchmarkSummary.portfolio - benchmarkSummary.sp500)}`}>
                초과 {pctStr(benchmarkSummary.portfolio - benchmarkSummary.sp500)}
              </p>
            )}
          </div>
          <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl px-4 py-3">
            <p className="text-gray-500 text-xs mb-1 flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" /> KOSPI
            </p>
            <p className={`font-semibold tabular-nums text-lg ${pctColor(benchmarkSummary.kospi ?? 0)}`}>
              {pctStr(benchmarkSummary.kospi)}
            </p>
            {benchmarkSummary.kospi !== null && (
              <p className={`text-xs mt-0.5 ${pctColor(benchmarkSummary.portfolio - benchmarkSummary.kospi)}`}>
                초과 {pctStr(benchmarkSummary.portfolio - benchmarkSummary.kospi)}
              </p>
            )}
          </div>
          <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl px-4 py-3">
            <p className="text-gray-500 text-xs mb-1">비교 기간</p>
            <p className="text-white text-sm font-medium">{displaySnapshots[0]?.date}</p>
            <p className="text-gray-600 text-xs mt-0.5">~ {displaySnapshots[displaySnapshots.length - 1]?.date}</p>
          </div>
        </div>
      )}
      {benchmarkOn && benchmarkError && (
        <p className="text-red-400 text-xs">{benchmarkError}</p>
      )}

      {/* Chart */}
      <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl p-5">
        <div className="h-64 min-h-0">
          {benchmarkOn && benchmarkChartData && benchmarkChartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={benchmarkChartData} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e3151" />
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#2e3151' }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`} width={60} />
                <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="4 4" />
                <Tooltip
                  contentStyle={{ background: '#0f1117', border: '1px solid #2e3151', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#9ca3af', marginBottom: 4 }}
                  formatter={(value, name) => {
                    const v = Number(value ?? 0);
                    const label = name === 'portfolio' ? '내 포트폴리오' : name === 'sp500' ? 'S&P500' : 'KOSPI';
                    return [`${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, label];
                  }}
                />
                <Line type="monotone" dataKey="portfolio" stroke="#6366f1" strokeWidth={2} dot={false} name="portfolio" />
                <Line type="monotone" dataKey="sp500" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="5 3" name="sp500" connectNulls />
                <Line type="monotone" dataKey="kospi" stroke="#34d399" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name="kospi" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          ) : benchmarkOn && benchmarkLoading ? (
            <div className="h-full flex items-center justify-center gap-2 text-gray-500 text-sm">
              <Loader2 size={16} className="animate-spin" /> S&P500 데이터 로딩 중...
            </div>
          ) : chartData.length < 2 ? (
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

        {/* 벤치마크 범례 */}
        {benchmarkOn && benchmarkChartData && (
          <div className="flex gap-4 mt-3 pt-3 border-t border-[#2e3151] text-xs flex-wrap">
            <span className="flex items-center gap-1.5 text-gray-300">
              <span className="inline-block w-4 h-0.5 bg-indigo-400 rounded" /> 내 포트폴리오
            </span>
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="inline-block w-4 h-px bg-amber-400" style={{ backgroundImage: 'repeating-linear-gradient(90deg,#f59e0b 0 5px,transparent 5px 8px)' }} /> S&P500
            </span>
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="inline-block w-4 h-px bg-emerald-400" style={{ backgroundImage: 'repeating-linear-gradient(90deg,#34d399 0 3px,transparent 3px 6px)' }} /> KOSPI
            </span>
          </div>
        )}

        {/* Legend — 전체 모드에서만 표시 */}
        {!benchmarkOn && selectedAccountId === null && (
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
                  <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">{compareBaseLabel}</th>
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
                  const baseTotal = compareBaseSnap?.totalValueKrw ?? null;
                  const sinceBase = baseTotal !== null ? snap.totalValueKrw - baseTotal : null;
                  const sinceBasePct =
                    sinceBase !== null && baseTotal !== null && baseTotal !== 0
                      ? (sinceBase / baseTotal) * 100
                      : null;
                  return (
                    <tr
                      key={snap.date}
                      className={`border-b border-[#1a1d2e] hover:bg-[#2e3151]/40 transition-colors ${
                        i % 2 === 0 ? 'bg-[#1a1d2e]' : 'bg-[#1c2036]'
                      }`}
                    >
                      <td className="px-4 py-2.5 text-xs tabular-nums whitespace-nowrap">
                        {period === 'day' ? <DateCell date={snap.date} /> : <span className="text-gray-300">{dateLabel(snap.date, period)}</span>}
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
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums" style={diffCellBg(diffPct)}>
                        {diff !== null && diffPct !== null ? (
                          <div className={pctColor(diff)}>
                            <div>{diff >= 0 ? '+' : ''}{fmt(diff)}</div>
                            <div className="opacity-70">{pctStr(diffPct)}</div>
                          </div>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums" style={diffCellBg(sinceBasePct)}>
                        {sinceBase !== null && sinceBasePct !== null ? (
                          <div className={pctColor(sinceBase)}>
                            <div>{sinceBase >= 0 ? '+' : ''}{fmt(sinceBase)}</div>
                            <div className="opacity-70">{pctStr(sinceBasePct)}</div>
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
                  <th className="text-right px-4 py-3 text-gray-500 font-normal text-xs whitespace-nowrap">{compareBaseLabel}</th>
                </tr>
              </thead>
              <tbody>
                {[...displaySnapshots].reverse().map((snap, i, arr) => {
                  const prev = arr[i + 1];
                  const val = snap.accounts.find(a => a.id === selectedAccountId)?.valueKrw ?? 0;
                  const prevVal = prev?.accounts.find(a => a.id === selectedAccountId)?.valueKrw ?? null;
                  const diff = prevVal !== null ? val - prevVal : null;
                  const diffPct = diff !== null && prevVal !== null && prevVal !== 0 ? (diff / prevVal) * 100 : null;

                  const baseVal = compareBaseSnap?.accounts.find(a => a.id === selectedAccountId)?.valueKrw ?? null;
                  const sinceFirst = baseVal !== null ? val - baseVal : null;
                  const sinceFirstPct = sinceFirst !== null && baseVal !== null && baseVal !== 0 ? (sinceFirst / baseVal) * 100 : null;

                  return (
                    <tr
                      key={snap.date}
                      className={`border-b border-[#1a1d2e] hover:bg-[#2e3151]/40 transition-colors ${
                        i % 2 === 0 ? 'bg-[#1a1d2e]' : 'bg-[#1c2036]'
                      }`}
                    >
                      <td className="px-4 py-2.5 text-xs tabular-nums whitespace-nowrap">
                        {period === 'day' ? <DateCell date={snap.date} /> : <span className="text-gray-300">{dateLabel(snap.date, period)}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-white text-xs tabular-nums font-medium">
                        {fmt(val)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums" style={diffCellBg(diffPct)}>
                        {diff !== null && diffPct !== null ? (
                          <div className={pctColor(diff)}>
                            <div>{diff >= 0 ? '+' : ''}{fmt(diff)}</div>
                            <div className="opacity-70">{pctStr(diffPct)}</div>
                          </div>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums" style={diffCellBg(sinceFirstPct)}>
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
