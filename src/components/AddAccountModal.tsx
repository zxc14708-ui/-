import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  onAdd: (name: string, broker: string) => void;
  onClose: () => void;
}

const BROKERS = ['미래에셋증권', '키움증권', '토스증권', '삼성증권', 'KB증권', '신한투자증권', '한국투자증권', '대신증권', '직접입력'];

export function AddAccountModal({ onAdd, onClose }: Props) {
  const [name, setName] = useState('');
  const [broker, setBroker] = useState(BROKERS[0]);
  const [customBroker, setCustomBroker] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const finalBroker = broker === '직접입력' ? customBroker : broker;
    if (!name.trim() || !finalBroker.trim()) return;
    onAdd(name.trim(), finalBroker.trim());
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e3151]">
          <h2 className="text-white font-semibold">계좌 추가</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="text-gray-500 text-xs mb-1 block">계좌명 *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="예) 미래에셋 주계좌"
              className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 placeholder:text-gray-700"
            />
          </div>

          <div>
            <label className="text-gray-500 text-xs mb-1 block">증권사 *</label>
            <select
              value={broker}
              onChange={e => setBroker(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            >
              {BROKERS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {broker === '직접입력' && (
            <div>
              <label className="text-gray-500 text-xs mb-1 block">증권사명 직접입력 *</label>
              <input
                value={customBroker}
                onChange={e => setCustomBroker(e.target.value)}
                placeholder="증권사명 입력"
                className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 placeholder:text-gray-700"
              />
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
