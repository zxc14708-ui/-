import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { StockWithStats, Account } from '../types';
import type { DisplayCurrency } from '../utils/currency';
import { fmtAmountFull } from '../utils/currency';

interface Props {
  stocks: StockWithStats[];
  accounts: Account[];
  displayCurrency: DisplayCurrency;
  usdToKrw: number;
}

type TabType = '계좌별' | '시장별' | '통화별';

const MARKET_COLORS: Record<string, string> = {
  KRX: '#10b981',
  NASDAQ: '#6366f1',
  NYSE: '#f59e0b',
  KOSDAQ: '#ec4899',
};

const CURRENCY_COLORS: Record<string, string> = {
  KRW: '#10b981',
  USD: '#6366f1',
};

interface PieEntry {
  name: string;
  value: number;
  color: string;
}

export function AllocationChart({ stocks, accounts, displayCurrency, usdToKrw }: Props) {
  const [tab, setTab] = useState<TabType>('계좌별');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const fmt = (n: number) => fmtAmountFull(n, displayCurrency, usdToKrw);

  const totalValueKrw = useMemo(
    () => stocks.reduce((sum, s) => sum + s.marketValueKrw, 0),
    [stocks],
  );

  const pieData = useMemo<PieEntry[]>(() => {
    if (tab === '계좌별') {
      const map = new Map<string, number>();
      for (const s of stocks) {
        map.set(s.accountId, (map.get(s.accountId) ?? 0) + s.marketValueKrw);
      }
      return accounts
        .filter(a => (map.get(a.id) ?? 0) > 0)
        .map(a => ({ name: a.name, value: map.get(a.id) ?? 0, color: a.color }));
    }

    if (tab === '시장별') {
      const map = new Map<string, number>();
      for (const s of stocks) {
        map.set(s.market, (map.get(s.market) ?? 0) + s.marketValueKrw);
      }
      return Array.from(map.entries()).map(([market, value]) => ({
        name: market,
        value,
        color: MARKET_COLORS[market] ?? '#6b7280',
      }));
    }

    // 통화별
    const map = new Map<string, number>();
    for (const s of stocks) {
      map.set(s.currency, (map.get(s.currency) ?? 0) + s.marketValueKrw);
    }
    return Array.from(map.entries()).map(([currency, value]) => ({
      name: currency,
      value,
      color: CURRENCY_COLORS[currency] ?? '#6b7280',
    }));
  }, [tab, stocks, accounts]);

  const tabs: TabType[] = ['계좌별', '시장별', '통화별'];

  return (
    <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm">포트폴리오 비중</h3>
        <div className="flex bg-[#0f1117] border border-[#2e3151] rounded-lg p-0.5">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Donut chart */}
        <div className="relative flex-shrink-0" style={{ width: 200, height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart onMouseLeave={() => setActiveIndex(null)}>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.45}
                    style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center label — shows hovered slice info, else total */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center px-2">
              {activeIndex !== null && pieData[activeIndex] ? (
                <>
                  <div className="text-white font-bold text-sm tabular-nums leading-tight">
                    {fmt(pieData[activeIndex].value)}
                  </div>
                  <div className="text-xs tabular-nums" style={{ color: pieData[activeIndex].color }}>
                    {totalValueKrw > 0
                      ? ((pieData[activeIndex].value / totalValueKrw) * 100).toFixed(1)
                      : '0'}%
                  </div>
                  <div className="text-gray-400 text-xs truncate max-w-[90px]">
                    {pieData[activeIndex].name}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-white font-bold text-sm tabular-nums">{fmt(totalValueKrw)}</div>
                  <div className="text-gray-500 text-xs">총 평가</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 min-w-0 w-full space-y-1.5">
          {pieData
            .slice()
            .sort((a, b) => b.value - a.value)
            .map((entry, i) => {
              const pct = totalValueKrw > 0 ? (entry.value / totalValueKrw) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="flex-shrink-0 w-3 h-3 rounded-full"
                    style={{ background: entry.color }}
                  />
                  <span className="text-gray-300 text-sm flex-1 truncate">{entry.name}</span>
                  <span className="text-white text-sm tabular-nums font-medium">{fmt(entry.value)}</span>
                  <span className="text-gray-500 text-sm tabular-nums w-12 text-right">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
