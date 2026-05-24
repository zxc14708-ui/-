import { useState, useRef, useEffect } from 'react';
import { X, Search, ChevronDown, Loader2 } from 'lucide-react';
import type { Stock, Account } from '../types';
import { searchStocks } from '../data/stockDB';
import { searchYahooFinance, type StockEntry } from '../utils/yahooFinance';

interface Props {
  accounts: Account[];
  onAdd: (stock: Stock) => void;
  onClose: () => void;
}

export function AddStockModal({ accounts, onAdd, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<StockEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selected, setSelected] = useState<StockEntry | null>(null);
  const [isLiveSearching, setIsLiveSearching] = useState(false);
  const liveSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [quantity, setQuantity] = useState('');
  const [avgCost, setAvgCost] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleQueryChange(v: string) {
    setQuery(v);
    setSelected(null);

    if (liveSearchTimer.current) clearTimeout(liveSearchTimer.current);

    const localResults = searchStocks(v);
    setSuggestions(localResults);
    setShowSuggestions(true);

    if (v.trim().length < 2) {
      setIsLiveSearching(false);
      return;
    }

    setIsLiveSearching(true);
    liveSearchTimer.current = setTimeout(async () => {
      try {
        const liveResults = await searchYahooFinance(v);
        const localTickers = new Set(localResults.map(r => r.ticker.toLowerCase()));
        const extras = liveResults.filter(r => !localTickers.has(r.ticker.toLowerCase()));
        setSuggestions([...localResults, ...extras].slice(0, 15));
      } finally {
        setIsLiveSearching(false);
      }
    }, 400);
  }

  function handleSelect(item: ReturnType<typeof searchStocks>[0]) {
    setSelected(item);
    setQuery(`${item.ticker} · ${item.nameKo}`);
    setShowSuggestions(false);
  }

  function handleClear() {
    setSelected(null);
    setQuery('');
    setSuggestions([]);
    inputRef.current?.focus();
  }

  const currency = selected?.currency ?? 'KRW';
  const isUSD = currency === 'USD';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !quantity || !avgCost || !accountId) return;
    const stock: Stock = {
      id: 's' + Date.now(),
      ticker: selected.ticker,
      nameKo: selected.nameKo,
      nameEn: selected.nameEn,
      market: selected.market,
      accountId,
      quantity: Number(quantity),
      avgCost: Number(avgCost),
      currentPrice: Number(avgCost),
      currency: selected.currency,
    };
    onAdd(stock);
    onClose();
  }

  const canSubmit = selected && quantity && avgCost && accountId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e3151]">
          <h2 className="text-white font-semibold">종목 추가</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {/* 종목 검색 */}
          <div>
            <label className="text-gray-500 text-xs mb-1.5 block">종목 검색 *</label>
            <div ref={dropdownRef} className="relative">
              <div className={`flex items-center gap-2 bg-[#0f1117] border rounded-lg px-3 py-2 transition-colors ${
                showSuggestions ? 'border-blue-500' : 'border-[#2e3151]'
              }`}>
                <Search size={14} className="text-gray-500 flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  onFocus={() => query && setShowSuggestions(true)}
                  placeholder="종목코드, 한글명, 영문명으로 검색"
                  className="bg-transparent text-white text-sm outline-none flex-1 placeholder:text-gray-600"
                  autoFocus
                />
                {isLiveSearching && <Loader2 size={13} className="text-blue-400 animate-spin flex-shrink-0" />}
                {query && !isLiveSearching && (
                  <button type="button" onClick={handleClear} className="text-gray-500 hover:text-gray-300 flex-shrink-0">
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* 자동완성 드롭다운 */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full mt-1 w-full bg-[#0f1117] border border-[#2e3151] rounded-xl shadow-2xl z-50 overflow-hidden">
                  {suggestions.map((item, idx) => (
                    <button
                      key={item.ticker}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#1a1d2e] transition-colors ${
                        idx > 0 ? 'border-t border-[#1a1d2e]' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium">{item.nameKo}</span>
                          <span className="text-gray-500 text-xs font-mono">{item.ticker}</span>
                        </div>
                        <div className="text-gray-600 text-xs">{item.nameEn} · {item.market}</div>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                        item.currency === 'USD' ? 'bg-blue-900/50 text-blue-300' : 'bg-emerald-900/50 text-emerald-300'
                      }`}>
                        {item.currency}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {showSuggestions && query && suggestions.length === 0 && (
                <div className="absolute top-full mt-1 w-full bg-[#0f1117] border border-[#2e3151] rounded-xl shadow-2xl z-50 px-4 py-3 text-gray-500 text-sm flex items-center gap-2">
                  {isLiveSearching
                    ? <><Loader2 size={13} className="animate-spin text-blue-400" />검색 중...</>
                    : '검색 결과가 없습니다'}
                </div>
              )}
            </div>

            {/* 선택된 종목 정보 */}
            {selected && (
              <div className="mt-2 px-3 py-2 bg-blue-950/30 border border-blue-800/40 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-white text-sm font-medium">{selected.nameKo}</span>
                  <span className="text-gray-400 text-xs ml-2">{selected.ticker} · {selected.market}</span>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                  isUSD ? 'bg-blue-900/50 text-blue-300' : 'bg-emerald-900/50 text-emerald-300'
                }`}>
                  {currency}
                </span>
              </div>
            )}
          </div>

          {/* 계좌 선택 */}
          <div>
            <label className="text-gray-500 text-xs mb-1.5 block">계좌 *</label>
            <div className="relative">
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 appearance-none"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* 수량 / 단가 / 현재가 */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="수량 *" value={quantity} onChange={setQuantity} placeholder="0" type="number" />
            <Field
              label={`평균단가 * (${isUSD ? '$' : '₩'})`}
              value={avgCost} onChange={setAvgCost} placeholder="0" type="number" step="0.001"
            />
          </div>

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
              disabled={!canSubmit}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-sm font-semibold transition-colors"
            >
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', step }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; step?: string;
}) {
  return (
    <div>
      <label className="text-gray-500 text-xs mb-1.5 block leading-tight">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        min={type === 'number' ? '0' : undefined}
        step={step}
        className="w-full bg-[#0f1117] border border-[#2e3151] text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 placeholder:text-gray-700"
      />
    </div>
  );
}
