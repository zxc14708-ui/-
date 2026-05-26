import { useState } from 'react';
import { TrendingUp, RefreshCw } from 'lucide-react';
import type { ExchangeRate } from '../types';

const PRESETS = [
  { label: '수동', ms: null },
  { label: '1분', ms: 60_000 },
  { label: '5분', ms: 300_000 },
  { label: '10분', ms: 600_000 },
] as const;

interface Props {
  rate: ExchangeRate;
  loading: boolean;
  rateRefreshing: boolean;
  error: string | null;
  displayCurrency: 'KRW' | 'USD';
  onToggle: () => void;
  refreshIntervalMs: number | null;
  onSetInterval: (ms: number | null) => void;
  onRefreshRate: () => void;
}

export function ExchangeRateBar({
  rate, loading, rateRefreshing, error,
  displayCurrency, onToggle,
  refreshIntervalMs, onSetInterval, onRefreshRate,
}: Props) {
  const [customMode, setCustomMode] = useState(false);
  const [customVal, setCustomVal] = useState('');

  const updatedAt = rate.updatedAt
    ? new Date(rate.updatedAt).toLocaleString('ko-KR', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    : '';

  const isPreset = refreshIntervalMs === null || PRESETS.some(p => p.ms === refreshIntervalMs);

  function getSelectValue() {
    if (refreshIntervalMs === null) return 'manual';
    const preset = PRESETS.find(p => p.ms === refreshIntervalMs);
    return preset ? String(preset.ms) : 'custom';
  }

  function handleSelect(val: string) {
    if (val === 'custom') {
      setCustomMode(true);
      setCustomVal(refreshIntervalMs ? String(refreshIntervalMs / 60000) : '');
    } else if (val === 'manual') {
      onSetInterval(null);
      setCustomMode(false);
    } else {
      onSetInterval(Number(val));
      setCustomMode(false);
    }
  }

  function commitCustom(e: React.FormEvent) {
    e.preventDefault();
    const mins = parseFloat(customVal);
    if (!isNaN(mins) && mins > 0) {
      onSetInterval(Math.round(Math.max(0.5, mins) * 60_000));
      setCustomMode(false);
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[#1a1d2e] border-b border-[#2e3151] text-sm flex-wrap gap-y-1.5">
      {/* 환율 */}
      <TrendingUp size={14} className="text-blue-400 flex-shrink-0" />
      <span className="text-gray-400">USD/KRW</span>
      {loading ? (
        <span className="text-gray-500">로딩 중...</span>
      ) : (
        <span className="text-white font-semibold tabular-nums">
          ₩{rate.usdToKrw.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )}
      {error && <span className="text-yellow-500 text-xs">{error}</span>}
      {!loading && !error && updatedAt && (
        <span className="text-gray-600 text-xs">기준 {updatedAt}</span>
      )}
      <button
        onClick={onRefreshRate}
        disabled={rateRefreshing}
        className="text-gray-600 hover:text-gray-300 transition-colors disabled:opacity-40"
        title="환율 새로고침"
      >
        <RefreshCw size={11} className={rateRefreshing ? 'animate-spin' : ''} />
      </button>

      <div className="ml-auto flex items-center gap-4">
        {/* 자동 갱신 설정 */}
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 text-xs whitespace-nowrap">자동 갱신</span>
          {customMode ? (
            <form onSubmit={commitCustom} className="flex items-center gap-1">
              <input
                type="number"
                name="refresh-interval"
                min="0.5"
                step="0.5"
                value={customVal}
                onChange={e => setCustomVal(e.target.value)}
                placeholder="분"
                autoFocus
                className="w-14 px-1.5 py-0.5 bg-[#0f1117] border border-[#2e3151] focus:border-blue-500 rounded text-xs text-white text-center outline-none"
              />
              <span className="text-gray-500 text-xs">분</span>
              <button type="submit" className="text-xs text-blue-400 hover:text-blue-300 px-1 py-0.5">확인</button>
              <button
                type="button"
                onClick={() => setCustomMode(false)}
                className="text-xs text-gray-600 hover:text-gray-400 px-1 py-0.5"
              >✕</button>
            </form>
          ) : (
            <select
              name="refresh-preset"
              value={isPreset ? getSelectValue() : 'custom'}
              onChange={e => handleSelect(e.target.value)}
              className="bg-[#0f1117] border border-[#2e3151] rounded-lg px-2 py-0.5 text-xs text-gray-300 cursor-pointer outline-none hover:border-gray-500 transition-colors"
            >
              <option value="manual">수동</option>
              <option value="60000">1분</option>
              <option value="300000">5분</option>
              <option value="600000">10분</option>
              {!isPreset && refreshIntervalMs !== null && (
                <option value="custom">{(refreshIntervalMs / 60000).toLocaleString()}분</option>
              )}
              <option value="custom">직접입력</option>
            </select>
          )}
          {refreshIntervalMs !== null && refreshIntervalMs < 600_000 && (
            <span
              className="text-yellow-600 text-xs cursor-default"
              title="open.er-api.com 무료 환율 API는 월 1,500건 제한입니다. 환율은 10분 간격으로 자동 조정됩니다."
            >⚠</span>
          )}
        </div>

        {/* 표시 통화 토글 */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">표시 통화</span>
          <button
            onClick={onToggle}
            className={`relative inline-flex h-6 w-12 items-center rounded-full border transition-colors ${
              displayCurrency === 'USD'
                ? 'bg-blue-600 border-blue-500'
                : 'bg-[#2e3151] border-[#3d4166]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                displayCurrency === 'USD' ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-xs font-semibold w-7 tabular-nums ${
            displayCurrency === 'USD' ? 'text-blue-400' : 'text-emerald-400'
          }`}>
            {displayCurrency}
          </span>
        </div>
      </div>
    </div>
  );
}
