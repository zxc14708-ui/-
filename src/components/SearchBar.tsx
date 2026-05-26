import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import type { StockWithStats } from '../types';

interface Props {
  stocks: StockWithStats[];
  onSelect: (id: string) => void;
}

function score(stock: StockWithStats, q: string): number {
  const ql = q.toLowerCase();
  const fields = [
    stock.ticker.toLowerCase(),
    stock.nameKo.toLowerCase(),
    stock.nameEn.toLowerCase(),
    (stock.sector ?? '').toLowerCase(),
  ];
  // exact match
  if (fields.some(f => f === ql)) return 100;
  // starts with
  if (fields.some(f => f.startsWith(ql))) return 80;
  // contains
  if (fields.some(f => f.includes(ql))) return 60;
  // fuzzy: all chars of query appear in order
  const fuzzyMatch = (s: string) => {
    let qi = 0;
    for (let i = 0; i < s.length && qi < ql.length; i++) {
      if (s[i] === ql[qi]) qi++;
    }
    return qi === ql.length;
  };
  if (fields.some(fuzzyMatch)) return 30;
  return 0;
}

export function SearchBar({ stocks, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return stocks
      .map(s => ({ stock: s, score: score(s, query.trim()) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(r => r.stock);
  }, [query, stocks]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(id: string) {
    onSelect(id);
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 bg-[#1a1d2e] border border-[#2e3151] rounded-xl px-3 py-2 focus-within:border-blue-500 transition-colors">
        <Search size={16} className="text-gray-500 flex-shrink-0" />
        <input
          ref={inputRef}
          name="stock-search"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="종목명, 코드, 영문명으로 검색..."
          className="bg-transparent text-white text-sm outline-none flex-1 placeholder:text-gray-600"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }} className="text-gray-500 hover:text-gray-300">
            <X size={14} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-[#1a1d2e] border border-[#2e3151] rounded-xl shadow-xl z-50 overflow-hidden">
          {results.map((stock, idx) => (
            <button
              key={stock.id}
              onClick={() => handleSelect(stock.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#2e3151] transition-colors ${idx > 0 ? 'border-t border-[#1f2340]' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium truncate">{stock.nameKo}</span>
                  <span className="text-gray-500 text-xs font-mono">{stock.ticker}</span>
                  <span className="text-gray-600 text-xs">{stock.market}</span>
                </div>
                <div className="text-gray-500 text-xs truncate">{stock.nameEn}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-white text-sm tabular-nums">
                  {stock.currency === 'USD' ? `$${stock.currentPrice.toFixed(2)}` : `₩${stock.currentPrice.toLocaleString()}`}
                </div>
                <div className={`text-xs tabular-nums font-semibold ${stock.changeRate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stock.changeRate >= 0 ? '▲' : '▼'} {Math.abs(stock.changeRate).toFixed(2)}%
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query.trim() && results.length === 0 && (
        <div className="absolute top-full mt-1 w-full bg-[#1a1d2e] border border-[#2e3151] rounded-xl shadow-xl z-50 px-4 py-3 text-gray-500 text-sm">
          "{query}"에 해당하는 종목이 없습니다
        </div>
      )}
    </div>
  );
}
