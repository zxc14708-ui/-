import type { Account, StockWithStats } from '../types';

interface Props {
  accounts: Account[];
  stocks: StockWithStats[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export function AccountTabs({ accounts, stocks, selected, onSelect }: Props) {
  const totalValue = stocks.reduce((s, st) => s + st.marketValueKrw, 0);

  function accountValue(accountId: string) {
    return stocks.filter(s => s.accountId === accountId).reduce((s, st) => s + st.marketValueKrw, 0);
  }

  function accountGainLoss(accountId: string) {
    return stocks.filter(s => s.accountId === accountId).reduce((s, st) => s + st.gainLossKrw, 0);
  }

  function fmt(n: number) {
    if (Math.abs(n) >= 100_000_000) return (n / 100_000_000).toFixed(1) + '억';
    if (Math.abs(n) >= 10000) return (n / 10000).toFixed(0) + '만';
    return n.toLocaleString();
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {/* 전체 */}
      <button
        onClick={() => onSelect(null)}
        className={`flex-shrink-0 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
          selected === null
            ? 'bg-blue-600 border-blue-500 text-white'
            : 'bg-[#1a1d2e] border-[#2e3151] text-gray-400 hover:text-white'
        }`}
      >
        <div>전체 계좌</div>
        <div className="text-xs opacity-75 tabular-nums">₩{fmt(totalValue)}</div>
      </button>

      {accounts.map(acc => {
        const val = accountValue(acc.id);
        const gl = accountGainLoss(acc.id);
        const isSelected = selected === acc.id;
        return (
          <button
            key={acc.id}
            onClick={() => onSelect(acc.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl border text-sm font-medium transition-all text-left ${
              isSelected
                ? 'text-white border-opacity-80'
                : 'bg-[#1a1d2e] border-[#2e3151] text-gray-400 hover:text-white'
            }`}
            style={isSelected ? { background: acc.color + '33', borderColor: acc.color } : {}}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: acc.color }} />
              <span>{acc.name}</span>
            </div>
            <div className="flex gap-2 text-xs opacity-75 tabular-nums mt-0.5">
              <span>₩{fmt(val)}</span>
              <span className={gl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {gl >= 0 ? '+' : ''}{fmt(gl)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
