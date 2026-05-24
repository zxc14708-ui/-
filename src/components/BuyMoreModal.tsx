import { useState } from 'react';
import { X, PlusCircle } from 'lucide-react';
import type { StockWithStats } from '../types';

interface Props {
  stock: StockWithStats;
  onConfirm: (id: string, addQty: number, addPrice: number) => void;
  onClose: () => void;
}

export function BuyMoreModal({ stock, onConfirm, onClose }: Props) {
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');

  const isUSD = stock.currency === 'USD';
  const symbol = isUSD ? '$' : '₩';

  const addQty = Number(qty);
  const addPrice = Number(price);
  const valid = addQty > 0 && addPrice > 0;

  const newQty = stock.quantity + addQty;
  const newAvgCost = valid
    ? (stock.quantity * stock.avgCost + addQty * addPrice) / newQty
    : stock.avgCost;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    onConfirm(stock.id, addQty, addPrice);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e3151]">
          <div className="flex items-center gap-2">
            <PlusCircle size={16} className="text-blue-400" />
            <h2 className="text-white font-semibold">추가 매수</h2>
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

          {/* 입력 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs mb-1.5 block">추가 매수 수량 *</label>
              <input
                type="number"
                min="0"
                value={qty}
                onChange={e => setQty(e.target.value)}
                placeholder="0"
                autoFocus
                className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 placeholder:text-gray-700"
              />
            </div>
            <div>
              <label className="text-gray-500 text-xs mb-1.5 block">매수 단가 * ({symbol})</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0"
                className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 placeholder:text-gray-700"
              />
            </div>
          </div>

          {/* 반영 후 미리보기 */}
          {valid && (
            <div className="px-3 py-2.5 bg-blue-950/30 border border-blue-800/40 rounded-lg space-y-1.5 text-xs">
              <div className="text-blue-300 font-medium mb-1">반영 후 예상</div>
              <div className="flex justify-between text-gray-300">
                <span>총 수량</span>
                <span className="text-white tabular-nums">
                  {stock.quantity.toLocaleString()} → <span className="text-blue-300 font-semibold">{newQty.toLocaleString()}</span>
                </span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>평균단가</span>
                <span className="text-white tabular-nums">
                  {symbol}{isUSD ? stock.avgCost.toFixed(2) : stock.avgCost.toLocaleString()} → <span className="text-blue-300 font-semibold">{symbol}{isUSD ? newAvgCost.toFixed(2) : Math.round(newAvgCost).toLocaleString()}</span>
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
