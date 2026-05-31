import { useState } from 'react';
import { X, TrendingDown } from 'lucide-react';
import type { StockWithStats } from '../types';

interface Props {
  stock: StockWithStats;
  usdToKrw: number;
  onConfirm: (id: string, qty: number, price: number) => void;
  onClose: () => void;
}

export function SellStockModal({ stock, usdToKrw, onConfirm, onClose }: Props) {
  const isUSD = stock.currency === 'USD';
  const symbol = isUSD ? '$' : '₩';

  const [qty, setQty] = useState('');
  const [price, setPrice] = useState(String(stock.currentPrice));

  const sellQty = Number(qty);
  const sellPrice = Number(price);

  const valid = sellQty > 0 && sellQty <= stock.quantity && sellPrice > 0;

  const remainingQty = valid ? stock.quantity - sellQty : stock.quantity;
  const multiplier = isUSD ? usdToKrw : 1;
  const realizedPnlKrw = valid
    ? (sellPrice - stock.avgCost) * sellQty * multiplier
    : 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onConfirm(stock.id, sellQty, sellPrice);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e3151]">
          <div className="flex items-center gap-2">
            <TrendingDown size={16} className="text-red-400" />
            <h2 className="text-white font-semibold">매도</h2>
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
              <span>보유 수량 <span className="text-white tabular-nums">{stock.quantity.toLocaleString()}</span></span>
              <span>평균단가 <span className="text-white tabular-nums">{symbol}{isUSD ? stock.avgCost.toFixed(2) : stock.avgCost.toLocaleString()}</span></span>
            </div>
          </div>

          {/* 매도 수량 / 단가 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs mb-1.5 block">
                매도 수량 * <span className="text-gray-600">(최대 {stock.quantity.toLocaleString()})</span>
              </label>
              <input
                type="number"
                min="0"
                max={stock.quantity}
                step="0.00001"
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="0"
                autoFocus
                className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-red-500 placeholder:text-gray-700"
              />
            </div>
            <div>
              <label className="text-gray-500 text-xs mb-1.5 block">매도 단가 * ({symbol})</label>
              <input
                type="number"
                min="0"
                step="0.00001"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0"
                className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-red-500 placeholder:text-gray-700"
              />
            </div>
          </div>

          {/* 미리보기 */}
          {valid && (
            <div className="px-3 py-2.5 bg-red-950/20 border border-red-800/30 rounded-lg space-y-1.5 text-xs">
              <div className="text-red-300 font-medium mb-1">매도 예상</div>
              <div className="flex justify-between text-gray-300">
                <span>잔여 수량</span>
                <span className="text-white tabular-nums font-semibold">
                  {stock.quantity.toLocaleString()} → {remainingQty <= 0 ? <span className="text-red-400">전량 매도</span> : remainingQty.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>실현 손익</span>
                <span className={`font-semibold tabular-nums ${realizedPnlKrw >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {realizedPnlKrw >= 0 ? '+' : ''}
                  ₩{Math.round(realizedPnlKrw).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {sellQty > stock.quantity && (
            <div className="text-red-400 text-xs">보유 수량을 초과할 수 없습니다.</div>
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
              className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-sm font-semibold transition-colors"
            >
              매도
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
