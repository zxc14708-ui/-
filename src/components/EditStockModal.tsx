import { useState } from 'react';
import { X, Pencil } from 'lucide-react';
import type { StockWithStats, Stock } from '../types';

interface Props {
  stock: StockWithStats;
  onConfirm: (id: string, updates: Partial<Stock>) => void;
  onClose: () => void;
}

export function EditStockModal({ stock, onConfirm, onClose }: Props) {
  const isUSD = stock.currency === 'USD';
  const symbol = isUSD ? '$' : '₩';

  const [nameKo, setNameKo] = useState(stock.nameKo);
  const [quantity, setQuantity] = useState(String(stock.quantity));
  const [avgCost, setAvgCost] = useState(String(stock.avgCost));
  const [currentPrice, setCurrentPrice] = useState(String(stock.currentPrice));
  const [memo, setMemo] = useState(stock.memo ?? '');

  const newQty = Number(quantity);
  const newAvgCost = Number(avgCost);
  const newCurrentPrice = Number(currentPrice);

  const valid =
    nameKo.trim().length > 0 &&
    newQty > 0 &&
    newAvgCost > 0;

  const previewCurrentPrice = newCurrentPrice > 0 ? newCurrentPrice : stock.currentPrice;
  const multiplier = isUSD ? 1 : 1; // avgCost and currentPrice are in native currency
  const previewGainLoss = (previewCurrentPrice - newAvgCost) * newQty * multiplier;
  const previewGainLossPct = newAvgCost > 0 ? ((previewCurrentPrice - newAvgCost) / newAvgCost) * 100 : 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const updates: Partial<Stock> = {
      nameKo: nameKo.trim(),
      quantity: newQty,
      avgCost: newAvgCost,
      memo: memo.trim() || undefined,
    };
    if (newCurrentPrice > 0) {
      updates.currentPrice = newCurrentPrice;
    }
    onConfirm(stock.id, updates);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e3151]">
          <div className="flex items-center gap-2">
            <Pencil size={16} className="text-blue-400" />
            <h2 className="text-white font-semibold">종목 수정</h2>
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
          </div>

          {/* 종목명 */}
          <div>
            <label className="text-gray-500 text-xs mb-1.5 block">종목명 *</label>
            <input
              type="text"
              value={nameKo}
              onChange={e => setNameKo(e.target.value)}
              autoFocus
              className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 placeholder:text-gray-700"
            />
          </div>

          {/* 수량 / 평균단가 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-500 text-xs mb-1.5 block">수량 *</label>
              <input
                type="number"
                min="0"
                step="0.00001"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 placeholder:text-gray-700"
              />
            </div>
            <div>
              <label className="text-gray-500 text-xs mb-1.5 block">평균단가 * ({symbol})</label>
              <input
                type="number"
                min="0"
                step="0.00001"
                value={avgCost}
                onChange={e => setAvgCost(e.target.value)}
                className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 placeholder:text-gray-700"
              />
            </div>
          </div>

          {/* 현재가 수동입력 */}
          <div>
            <label className="text-gray-500 text-xs mb-1.5 block">
              현재가 수동입력 ({symbol})
              <span className="ml-1 text-gray-600">0이면 자동조회</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.00001"
              value={currentPrice}
              onChange={e => setCurrentPrice(e.target.value)}
              placeholder="0"
              className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 placeholder:text-gray-700"
            />
          </div>

          {/* 메모 */}
          <div>
            <label className="text-gray-500 text-xs mb-1.5 block">메모 (최대 200자)</label>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value.slice(0, 200))}
              rows={2}
              placeholder="투자 메모를 입력하세요..."
              className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 placeholder:text-gray-700 resize-none"
            />
            <div className="text-right text-xs text-gray-600 mt-0.5">{memo.length}/200</div>
          </div>

          {/* 미리보기 */}
          {valid && (
            <div className="px-3 py-2.5 bg-blue-950/30 border border-blue-800/40 rounded-lg space-y-1.5 text-xs">
              <div className="text-blue-300 font-medium mb-1">반영 후 예상 손익</div>
              <div className="flex justify-between text-gray-300">
                <span>평가손익</span>
                <span className={`font-semibold tabular-nums ${previewGainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {previewGainLoss >= 0 ? '+' : ''}
                  {isUSD
                    ? `$${previewGainLoss.toFixed(2)}`
                    : `₩${Math.round(previewGainLoss).toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>수익률</span>
                <span className={`font-semibold tabular-nums ${previewGainLossPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {previewGainLossPct >= 0 ? '+' : ''}{previewGainLossPct.toFixed(2)}%
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
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
