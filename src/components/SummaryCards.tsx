import type { StockWithStats } from '../types';
import type { DisplayCurrency } from '../utils/currency';
import { fmtAmountFull } from '../utils/currency';
import { Wallet, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';

interface Props {
  stocks: StockWithStats[];
  totalValueKrw: number;
  totalGainLossKrw: number;
  totalCostKrw: number;
  displayCurrency: DisplayCurrency;
  usdToKrw: number;
}

export function SummaryCards({ stocks, totalValueKrw, totalGainLossKrw, totalCostKrw, displayCurrency, usdToKrw }: Props) {
  const gainPct = totalCostKrw > 0 ? (totalGainLossKrw / totalCostKrw) * 100 : 0;
  const rising = stocks.filter(s => s.changeRate > 0).length;
  const falling = stocks.filter(s => s.changeRate < 0).length;
  const fmt = (n: number) => fmtAmountFull(n, displayCurrency, usdToKrw);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card
        icon={<Wallet size={18} className="text-blue-400" />}
        label="총 평가금액"
        value={fmt(totalValueKrw)}
        sub={`${stocks.length}개 종목`}
        color="blue"
      />
      <Card
        icon={totalGainLossKrw >= 0
          ? <TrendingUp size={18} className="text-emerald-400" />
          : <TrendingDown size={18} className="text-red-400" />}
        label="평가손익"
        value={`${totalGainLossKrw >= 0 ? '+' : ''}${fmt(totalGainLossKrw)}`}
        sub={`${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(2)}%`}
        color={totalGainLossKrw >= 0 ? 'green' : 'red'}
      />
      <Card
        icon={<TrendingUp size={18} className="text-emerald-400" />}
        label="당일 상승"
        value={`${rising}개`}
        sub="종목"
        color="green"
      />
      <Card
        icon={<BarChart2 size={18} className="text-rose-400" />}
        label="당일 하락"
        value={`${falling}개`}
        sub="종목"
        color="red"
      />
    </div>
  );
}

interface CardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: 'blue' | 'green' | 'red';
}

function Card({ icon, label, value, sub, color }: CardProps) {
  const accent = color === 'blue' ? 'text-blue-400' : color === 'green' ? 'text-emerald-400' : 'text-red-400';
  return (
    <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-gray-400 text-xs">{label}</span>
      </div>
      <div className={`text-xl font-bold tabular-nums ${accent}`}>{value}</div>
      <div className="text-gray-500 text-xs mt-1">{sub}</div>
    </div>
  );
}
