import { useState } from 'react';
import { X, Pencil } from 'lucide-react';
import type { StockWithStats } from '../types';

interface Props {
  stock: StockWithStats;
  onConfirm: (id: string, newPrice: number) => void;
  onClose: () => void;
}

export function EditPriceModal({ stock, onConfirm, onClose }: Props) {
  const [price, setPrice] = useState(String(stock.currentPrice));
  const isUSD = stock.currency === 'USD';
  const symbol = isUSD ? '$' : '₩';
  const newPrice = Number(price);
  const valid = newPrice > 0;

  const changeRate = valid
    ? ((newPrice - stock.avgCost) / stock.avgCost) * 100
    : 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onConfirm(stock.id, newPrice);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e3151]">
          <div className="flex items-center gap-2">
            <Pencil size={15} className="text-blue-400" />
            <h2 className="text-white font-semibold">현재가 수정</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {/* 종목 정보 */}
          <div className="px-3 py-2.5 bg-[#0f1117] rounded-lg">
            <div className="text-white font-medium">{stock.nameKo}</div>
            <div className="text-gray-500 text-xs font-mono mt-0.5">{stock.ticker} · {stock.market}</div>
            <div className="flex gap-4 mt-2 text-xs text-gray-400">
              <span>평균단가 <span className="text-white tabular-nums">{symbol}{isUSD ? stock.avgCost.toFixed(2) : stock.avgCost.toLocaleString()}</span></span>
              <span>기존 현재가 <span className="text-white tabular-nums">{symbol}{isUSD ? stock.currentPrice.toFixed(2) : stock.currentPrice.toLocaleString()}</span></span>
            </div>
          </div>

          {/* 현재가 입력 */}
          <div>
            <label className="text-gray-500 text-xs mb-1.5 block">현재가 ({symbol}) *</label>
            <input
              type="number"
              name="current-price"
              min="0"
              step="any"
              value={price}
              onChange={e => setPrice(e.target.value)}
              autoFocus
              className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          {/* 미리보기 */}
          {valid && (
            <div className="px-3 py-2.5 bg-[#0f1117] border border-[#2e3151] rounded-lg space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>평가손익률</span>
                <span className={`font-semibold tabular-nums ${changeRate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {changeRate >= 0 ? '+' : ''}{changeRate.toFixed(2)}%
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-[#2e3151] rounded-xl text-gray-400 hover:text-white text-sm transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!valid}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-sm font-semibold transition-colors"
            >
              반영
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
