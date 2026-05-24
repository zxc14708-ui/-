import { useState } from 'react';
import { X } from 'lucide-react';
import type { Stock, Account } from '../types';

interface Props {
  accounts: Account[];
  onAdd: (stock: Stock) => void;
  onClose: () => void;
}

export function AddStockModal({ accounts, onAdd, onClose }: Props) {
  const [form, setForm] = useState({
    ticker: '',
    nameKo: '',
    nameEn: '',
    market: 'KRX' as Stock['market'],
    accountId: accounts[0]?.id ?? '',
    quantity: '',
    avgCost: '',
    currentPrice: '',
    currency: 'KRW' as Stock['currency'],
    sector: '',
  });

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ticker || !form.nameKo || !form.quantity || !form.avgCost || !form.currentPrice) return;
    const stock: Stock = {
      id: 's' + Date.now(),
      ticker: form.ticker.toUpperCase(),
      nameKo: form.nameKo,
      nameEn: form.nameEn || form.nameKo,
      market: form.market,
      accountId: form.accountId,
      quantity: Number(form.quantity),
      avgCost: Number(form.avgCost),
      currentPrice: Number(form.currentPrice),
      currency: form.currency,
      sector: form.sector || undefined,
    };
    onAdd(stock);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e3151]">
          <h2 className="text-white font-semibold">종목 추가</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="종목코드 *" value={form.ticker} onChange={v => set('ticker', v)} placeholder="e.g. 005930" />
            <div>
              <label className="text-gray-500 text-xs mb-1 block">시장 *</label>
              <select
                value={form.market}
                onChange={e => {
                  const m = e.target.value as Stock['market'];
                  set('market', m);
                  set('currency', m === 'KRX' || m === 'KOSDAQ' ? 'KRW' : 'USD');
                }}
                className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              >
                <option value="KRX">KRX</option>
                <option value="KOSDAQ">KOSDAQ</option>
                <option value="NYSE">NYSE</option>
                <option value="NASDAQ">NASDAQ</option>
              </select>
            </div>
          </div>

          <Field label="한글명 *" value={form.nameKo} onChange={v => set('nameKo', v)} placeholder="삼성전자" />
          <Field label="영문명" value={form.nameEn} onChange={v => set('nameEn', v)} placeholder="Samsung Electronics" />

          <div>
            <label className="text-gray-500 text-xs mb-1 block">계좌 *</label>
            <select
              value={form.accountId}
              onChange={e => set('accountId', e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="수량 *" value={form.quantity} onChange={v => set('quantity', v)} placeholder="0" type="number" />
            <Field label="평균단가 *" value={form.avgCost} onChange={v => set('avgCost', v)} placeholder="0" type="number" />
            <Field label="현재가 *" value={form.currentPrice} onChange={v => set('currentPrice', v)} placeholder="0" type="number" />
          </div>

          <Field label="섹터" value={form.sector} onChange={v => set('sector', v)} placeholder="반도체, IT, ..." />

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-[#2e3151] rounded-xl text-gray-400 hover:text-white text-sm transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-sm font-semibold transition-colors"
            >
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-gray-500 text-xs mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 placeholder:text-gray-700"
      />
    </div>
  );
}
