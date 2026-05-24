import type { ExchangeRate } from '../types';
import { TrendingUp } from 'lucide-react';

interface Props {
  rate: ExchangeRate;
  loading: boolean;
  error: string | null;
}

export function ExchangeRateBar({ rate, loading, error }: Props) {
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
        <span className="text-gray-600 text-xs ml-auto">기준 {updatedAt}</span>
      )}
    </div>
  );
}
