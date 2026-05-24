import type { ExchangeRate } from '../types';
import { TrendingUp } from 'lucide-react';

interface Props {
  rate: ExchangeRate;
  loading: boolean;
  error: string | null;
  displayCurrency: 'KRW' | 'USD';
  onToggle: () => void;
}

export function ExchangeRateBar({ rate, loading, error, displayCurrency, onToggle }: Props) {
  const updatedAt = rate.updatedAt
    ? new Date(rate.updatedAt).toLocaleString('ko-KR', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    : '';

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[#1a1d2e] border-b border-[#2e3151] text-sm">
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

      {/* 통화 토글 */}
      <div className="ml-auto flex items-center gap-2">
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
  );
}
