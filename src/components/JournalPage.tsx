import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, X, Pencil, Trash2, BookOpen, Star } from 'lucide-react';
import type { JournalEntry, StockWithStats } from '../types';

const TYPE_CONFIG: Record<JournalEntry['type'], { label: string; cls: string }> = {
  buy:      { label: '매수', cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  sell:     { label: '매도', cls: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  analysis: { label: '분석', cls: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  watch:    { label: '관망', cls: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
};

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];
function getDayInfo(date: string) {
  const d = new Date(date + 'T00:00:00');
  const idx = d.getDay();
  return { day: DAYS_KO[idx], isWeekend: idx === 0 || idx === 6 };
}

const TODAY = new Date().toISOString().slice(0, 10);

interface FormState {
  date: string;
  ticker: string;
  nameKo: string;
  type: JournalEntry['type'];
  price: string;
  quantity: string;
  targetPrice: string;
  stopLoss: string;
  reason: string;
  confidence: number;
  review: string;
  tagInput: string;
  tags: string[];
}

function makeEmpty(): FormState {
  return {
    date: TODAY, ticker: '', nameKo: '', type: 'buy',
    price: '', quantity: '', targetPrice: '', stopLoss: '',
    reason: '', confidence: 3, review: '', tagInput: '', tags: [],
  };
}

function fromEntry(e: JournalEntry): FormState {
  return {
    date: e.date, ticker: e.ticker, nameKo: e.nameKo, type: e.type,
    price: e.price != null ? String(e.price) : '',
    quantity: e.quantity != null ? String(e.quantity) : '',
    targetPrice: e.targetPrice != null ? String(e.targetPrice) : '',
    stopLoss: e.stopLoss != null ? String(e.stopLoss) : '',
    reason: e.reason, confidence: e.confidence, review: e.review,
    tagInput: '', tags: [...e.tags],
  };
}

function StarsInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="focus:outline-none"
        >
          <Star
            size={22}
            className={`transition-colors ${n <= (hovered || value) ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`}
          />
        </button>
      ))}
      <span className="ml-2 text-gray-400 text-sm">{value} / 5</span>
    </div>
  );
}

const INPUT_CLS = 'w-full bg-[#0f1117] border border-[#2e3151] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500';
const LABEL_CLS = 'block text-xs text-gray-500 mb-1.5';

interface Props {
  entries: JournalEntry[];
  onAdd: (entry: JournalEntry) => void;
  onUpdate: (id: string, updates: Partial<JournalEntry>) => void;
  onDelete: (id: string) => void;
  stocks: StockWithStats[];
}

export function JournalPage({ entries, onAdd, onUpdate, onDelete, stocks }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(makeEmpty);
  const [filterType, setFilterType] = useState<JournalEntry['type'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<StockWithStats[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  // Ticker autocomplete
  useEffect(() => {
    const q = form.ticker.trim().toLowerCase();
    if (!q) { setSuggestions([]); setShowSuggestions(false); return; }
    const matches = stocks
      .filter(s => s.ticker.toLowerCase().includes(q) || s.nameKo.toLowerCase().includes(q))
      .slice(0, 6);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  }, [form.ticker, stocks]);

  // Close suggestions on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    let result = [...entries];
    if (filterType !== 'all') result = result.filter(e => e.type === filterType);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(e =>
        e.ticker.toLowerCase().includes(q) ||
        e.nameKo.toLowerCase().includes(q) ||
        e.reason.toLowerCase().includes(q) ||
        e.review.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [entries, filterType, searchQuery]);

  const counts = useMemo(() => ({
    buy:      entries.filter(e => e.type === 'buy').length,
    sell:     entries.filter(e => e.type === 'sell').length,
    analysis: entries.filter(e => e.type === 'analysis').length,
    watch:    entries.filter(e => e.type === 'watch').length,
  }), [entries]);

  function openNew() {
    setForm(makeEmpty());
    setEditingId(null);
    setShowModal(true);
  }

  function openEdit(entry: JournalEntry) {
    setForm(fromEntry(entry));
    setEditingId(entry.id);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setShowSuggestions(false);
  }

  function addTag(raw: string) {
    const t = raw.trim().replace(/^#/, '');
    if (!t || form.tags.includes(t)) return;
    setForm(f => ({ ...f, tags: [...f.tags, t], tagInput: '' }));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(form.tagInput);
    } else if (e.key === 'Backspace' && !form.tagInput && form.tags.length > 0) {
      setForm(f => ({ ...f, tags: f.tags.slice(0, -1) }));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date || !form.reason.trim()) return;

    const now = Date.now();
    const existing = editingId ? entries.find(x => x.id === editingId) : null;

    const entry: JournalEntry = {
      id: editingId ?? ('jnl_' + now + '_' + Math.random().toString(36).slice(2, 6)),
      date: form.date,
      ticker: form.ticker.trim().toUpperCase(),
      nameKo: form.nameKo.trim(),
      type: form.type,
      price:       form.price       ? Number(form.price)       : undefined,
      quantity:    form.quantity    ? Number(form.quantity)    : undefined,
      targetPrice: form.targetPrice ? Number(form.targetPrice) : undefined,
      stopLoss:    form.stopLoss    ? Number(form.stopLoss)    : undefined,
      reason: form.reason.trim(),
      confidence: form.confidence,
      review: form.review.trim(),
      tags: form.tags,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (editingId) onUpdate(editingId, entry);
    else onAdd(entry);
    closeModal();
  }

  const hasPriceFields = form.type === 'buy' || form.type === 'sell';

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white">매매일지</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            총 {entries.length}개 · 매수 {counts.buy} · 매도 {counts.sell} · 분석 {counts.analysis} · 관망 {counts.watch}
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          새 일지 작성
        </button>
      </div>

      {/* Filter + Search */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-[#1a1d2e] border border-[#2e3151] rounded-lg p-0.5">
          {(['all', 'buy', 'sell', 'analysis', 'watch'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filterType === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'all' ? '전체' : TYPE_CONFIG[t].label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="종목, 내용, 태그 검색"
            className="w-full bg-[#1a1d2e] border border-[#2e3151] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="bg-[#1a1d2e] border border-dashed border-[#2e3151] rounded-xl p-16 text-center">
          <BookOpen size={32} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 mb-1.5">작성된 매매일지가 없습니다</p>
          <p className="text-gray-600 text-xs mb-5">매매 근거와 결과를 기록해 투자 실력을 키워보세요</p>
          <button
            onClick={openNew}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-colors"
          >
            첫 일지 작성하기
          </button>
        </div>
      )}

      {entries.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 text-gray-600 text-sm">검색 결과가 없습니다</div>
      )}

      {/* Cards grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(entry => {
            const { day, isWeekend } = getDayInfo(entry.date);
            const tc = TYPE_CONFIG[entry.type];
            return (
              <div
                key={entry.id}
                className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl p-4 flex flex-col gap-3 hover:border-[#3e4265] transition-colors"
              >
                {/* Date + type + actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs tabular-nums ${isWeekend ? 'text-red-400' : 'text-gray-400'}`}>
                      {entry.date} ({day})
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tc.cls}`}>
                      {tc.label}
                    </span>
                  </div>
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => openEdit(entry)}
                      className="text-gray-600 hover:text-blue-400 transition-colors p-1 rounded"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(entry.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors p-1 rounded"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Ticker + name */}
                <div>
                  {entry.ticker ? (
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-white font-bold text-base">{entry.ticker}</span>
                      {entry.nameKo && <span className="text-gray-400 text-sm">{entry.nameKo}</span>}
                    </div>
                  ) : (
                    <span className="text-gray-600 text-sm italic">종목 미입력</span>
                  )}
                  {(entry.price != null || entry.quantity != null) && (
                    <div className="flex gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                      {entry.price != null && <span>진입가 {entry.price.toLocaleString()}</span>}
                      {entry.quantity != null && <span>수량 {entry.quantity.toLocaleString()}</span>}
                      {entry.targetPrice != null && <span className="text-emerald-500/70">목표 {entry.targetPrice.toLocaleString()}</span>}
                      {entry.stopLoss != null && <span className="text-red-500/70">손절 {entry.stopLoss.toLocaleString()}</span>}
                    </div>
                  )}
                </div>

                {/* Reason */}
                <p className="text-gray-300 text-sm leading-relaxed flex-1" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {entry.reason}
                </p>

                {/* Review */}
                {entry.review && (
                  <p className="text-gray-500 text-xs border-t border-[#2e3151] pt-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    복기: {entry.review}
                  </p>
                )}

                {/* Stars + tags */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star key={n} size={12} className={n <= entry.confidence ? 'text-amber-400 fill-amber-400' : 'text-gray-700'} />
                    ))}
                  </div>
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.tags.map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 bg-[#2a2d45] text-gray-400 text-xs rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl p-6 max-w-sm w-full">
            <p className="text-white font-medium mb-1.5">일지를 삭제하시겠습니까?</p>
            <p className="text-gray-500 text-sm mb-5">삭제된 일지는 복구할 수 없습니다.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-[#2e3151] hover:bg-[#3e4265] rounded-lg text-sm transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => { onDelete(deleteConfirm); setDeleteConfirm(null); }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl w-full max-w-2xl my-6">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2e3151]">
              <h3 className="text-white font-semibold">{editingId ? '매매일지 수정' : '새 매매일지'}</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* 날짜 + 티커 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>날짜 *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => set('date', e.target.value)}
                    required
                    className={INPUT_CLS}
                  />
                </div>
                <div className="relative" ref={suggestRef}>
                  <label className={LABEL_CLS}>티커</label>
                  <input
                    value={form.ticker}
                    onChange={e => set('ticker', e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="예: AAPL, 005930"
                    className={INPUT_CLS}
                  />
                  {showSuggestions && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#13162a] border border-[#2e3151] rounded-lg shadow-xl z-20 overflow-hidden">
                      {suggestions.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={() => {
                            setForm(f => ({ ...f, ticker: s.ticker, nameKo: s.nameKo }));
                            setShowSuggestions(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-[#2e3151] transition-colors flex items-center gap-2"
                        >
                          <span className="text-white font-medium w-20 shrink-0">{s.ticker}</span>
                          <span className="text-gray-400 flex-1 truncate">{s.nameKo}</span>
                          <span className="text-gray-600 text-xs">{s.market}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 종목명 */}
              <div>
                <label className={LABEL_CLS}>종목명</label>
                <input
                  value={form.nameKo}
                  onChange={e => set('nameKo', e.target.value)}
                  placeholder="한글 종목명 (선택)"
                  className={INPUT_CLS}
                />
              </div>

              {/* 매매 유형 */}
              <div>
                <label className={LABEL_CLS}>매매 유형 *</label>
                <div className="flex gap-2 flex-wrap">
                  {(['buy', 'sell', 'analysis', 'watch'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set('type', t)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        form.type === t
                          ? TYPE_CONFIG[t].cls
                          : 'bg-[#0f1117] border border-[#2e3151] text-gray-500 hover:text-white'
                      }`}
                    >
                      {TYPE_CONFIG[t].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 진입가 / 수량 (매수·매도만) */}
              {hasPriceFields && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLS}>진입가</label>
                    <input
                      type="number" min={0} value={form.price}
                      onChange={e => set('price', e.target.value)}
                      placeholder="0"
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>수량</label>
                    <input
                      type="number" min={0} value={form.quantity}
                      onChange={e => set('quantity', e.target.value)}
                      placeholder="0"
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
              )}

              {/* 목표가 / 손절가 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>목표가</label>
                  <input
                    type="number" min={0} value={form.targetPrice}
                    onChange={e => set('targetPrice', e.target.value)}
                    placeholder="선택"
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLS}>손절가</label>
                  <input
                    type="number" min={0} value={form.stopLoss}
                    onChange={e => set('stopLoss', e.target.value)}
                    placeholder="선택"
                    className={INPUT_CLS}
                  />
                </div>
              </div>

              {/* 매매 이유 */}
              <div>
                <label className={LABEL_CLS}>매매 이유 / 근거 *</label>
                <textarea
                  value={form.reason}
                  onChange={e => set('reason', e.target.value)}
                  required rows={4}
                  placeholder="이 종목을 매매하는 이유, 핵심 논리, 전략을 작성해주세요"
                  className={INPUT_CLS + ' resize-none'}
                />
              </div>

              {/* 확신도 */}
              <div>
                <label className={LABEL_CLS}>확신도</label>
                <StarsInput value={form.confidence} onChange={v => set('confidence', v)} />
              </div>

              {/* 결과 메모 */}
              <div>
                <label className={LABEL_CLS}>결과 메모 / 복기</label>
                <textarea
                  value={form.review}
                  onChange={e => set('review', e.target.value)}
                  rows={3}
                  placeholder="매매 후 결과, 배운 점, 개선할 점 (선택)"
                  className={INPUT_CLS + ' resize-none'}
                />
              </div>

              {/* 태그 */}
              <div>
                <label className={LABEL_CLS}>태그</label>
                <div
                  className="flex flex-wrap gap-1.5 bg-[#0f1117] border border-[#2e3151] rounded-lg px-3 py-2 min-h-[42px] cursor-text focus-within:border-blue-500 transition-colors"
                  onClick={() => tagInputRef.current?.focus()}
                >
                  {form.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-[#2a2d45] text-gray-300 text-xs rounded">
                      #{tag}
                      <button type="button" onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))}>
                        <X size={10} className="text-gray-500 hover:text-white" />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={tagInputRef}
                    value={form.tagInput}
                    onChange={e => set('tagInput', e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    onBlur={() => { if (form.tagInput.trim()) addTag(form.tagInput); }}
                    placeholder={form.tags.length === 0 ? 'Enter나 쉼표로 추가 (예: 기술적분석, 실적)' : ''}
                    className="flex-1 min-w-[120px] bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 justify-end pt-2 border-t border-[#2e3151]">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-[#2e3151] hover:bg-[#3e4265] rounded-lg text-sm transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
                >
                  {editingId ? '수정 완료' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
