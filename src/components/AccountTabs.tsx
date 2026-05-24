import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Pencil, AlertTriangle, GripVertical, Check } from 'lucide-react';
import type { Account, StockWithStats } from '../types';
import type { DisplayCurrency } from '../utils/currency';
import { fmtAmount } from '../utils/currency';

const COLOR_PALETTE = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#3b82f6', '#0ea5e9', '#64748b',
];

interface Props {
  accounts: Account[];
  stocks: StockWithStats[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onAddAccount: () => void;
  onDeleteAccount: (id: string) => void;
  onUpdateAccount: (id: string, updates: { name?: string; color?: string }) => void;
  onReorderAccounts: (orderedIds: string[]) => void;
  displayCurrency: DisplayCurrency;
  usdToKrw: number;
}

export function AccountTabs({
  accounts, stocks, selected, onSelect,
  onAddAccount, onDeleteAccount, onUpdateAccount, onReorderAccounts,
  displayCurrency, usdToKrw,
}: Props) {
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // drag state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const totalValue = stocks.reduce((s, st) => s + st.marketValueKrw, 0);
  const fmt = (n: number) => fmtAmount(n, displayCurrency, usdToKrw);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  function accountValue(id: string) {
    return stocks.filter(s => s.accountId === id).reduce((s, st) => s + st.marketValueKrw, 0);
  }
  function accountGainLoss(id: string) {
    return stocks.filter(s => s.accountId === id).reduce((s, st) => s + st.gainLossKrw, 0);
  }
  function accountStockCount(id: string) {
    return stocks.filter(s => s.accountId === id).length;
  }

  function startEdit(e: React.MouseEvent, acc: Account) {
    e.stopPropagation();
    setEditingId(acc.id);
    setEditingName(acc.name);
    setEditingColor(acc.color);
  }

  function commitEdit() {
    if (!editingId) return;
    const name = editingName.trim();
    if (name) onUpdateAccount(editingId, { name, color: editingColor });
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  // drag handlers
  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== draggedId) setDragOverId(id);
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) { clearDrag(); return; }
    const ids = accounts.map(a => a.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    const reordered = [...ids];
    reordered.splice(from, 1);
    reordered.splice(to, 0, draggedId);
    onReorderAccounts(reordered);
    clearDrag();
  }

  function clearDrag() {
    setDraggedId(null);
    setDragOverId(null);
  }

  const deleteStockCount = deleteTarget ? accountStockCount(deleteTarget.id) : 0;

  return (
    <>
      <div className="flex gap-2 flex-wrap items-start">
        {/* 전체 계좌 탭 */}
        <button
          onClick={() => onSelect(null)}
          className={`flex-shrink-0 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
            selected === null
              ? 'bg-blue-600 border-blue-500 text-white'
              : 'bg-[#1a1d2e] border-[#2e3151] text-gray-400 hover:text-white'
          }`}
        >
          <div>전체 계좌</div>
          <div className="text-xs opacity-75 tabular-nums">{fmt(totalValue)}</div>
        </button>

        {accounts.map(acc => {
          const val = accountValue(acc.id);
          const gl = accountGainLoss(acc.id);
          const cnt = accountStockCount(acc.id);
          const isSelected = selected === acc.id;
          const isEditing = editingId === acc.id;
          const isDragging = draggedId === acc.id;
          const isDragOver = dragOverId === acc.id;

          return (
            <div
              key={acc.id}
              className={`relative group transition-all ${isDragging ? 'opacity-40' : ''} ${isDragOver ? 'scale-105' : ''}`}
              draggable
              onDragStart={e => handleDragStart(e, acc.id)}
              onDragOver={e => handleDragOver(e, acc.id)}
              onDrop={e => handleDrop(e, acc.id)}
              onDragEnd={clearDrag}
            >
              {/* 드롭 인디케이터 */}
              {isDragOver && (
                <div className="absolute -left-1.5 top-1 bottom-1 w-0.5 bg-blue-400 rounded-full" />
              )}

              <button
                onClick={() => { if (!isEditing) onSelect(acc.id); }}
                className={`flex-shrink-0 pl-7 pr-8 py-2 rounded-xl border text-sm font-medium transition-all text-left w-full ${
                  isSelected ? 'text-white' : 'bg-[#1a1d2e] border-[#2e3151] text-gray-400 hover:text-white'
                }`}
                style={isSelected ? { background: acc.color + '33', borderColor: acc.color } : {}}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isEditing ? editingColor : acc.color }} />
                  {isEditing ? (
                    <input
                      ref={editInputRef}
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
                      onBlur={commitEdit}
                      onClick={e => e.stopPropagation()}
                      className="bg-transparent text-white outline-none border-b border-blue-400 w-28 text-sm"
                    />
                  ) : (
                    <span>{acc.name}</span>
                  )}
                </div>
                <div className="flex gap-2 text-xs opacity-75 tabular-nums mt-0.5">
                  <span>{fmt(val)}</span>
                  {cnt > 0 && (
                    <span className={gl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {gl >= 0 ? '+' : ''}{fmt(gl)}
                    </span>
                  )}
                  <span className="text-gray-600">{cnt}종목</span>
                </div>
              </button>

              {/* 드래그 핸들 */}
              <div className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                <GripVertical size={12} />
              </div>

              {/* 편집/삭제 버튼 */}
              {!isEditing && (
                <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => startEdit(e, acc)}
                    className="text-gray-600 hover:text-blue-400 transition-colors p-0.5 rounded"
                    title="계좌 수정"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteTarget(acc); }}
                    className="text-gray-600 hover:text-red-400 transition-colors p-0.5 rounded"
                    title="계좌 삭제"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )}

              {/* 색상 팔레트 (편집 중) */}
              {isEditing && (
                <div
                  className="absolute top-full left-0 mt-1.5 z-30 bg-[#0f1117] border border-[#2e3151] rounded-xl p-2.5 shadow-2xl"
                  onMouseDown={e => e.preventDefault()}
                >
                  <p className="text-gray-500 text-xs mb-2">색상 선택</p>
                  <div className="grid grid-cols-8 gap-1">
                    {COLOR_PALETTE.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={e => { e.stopPropagation(); setEditingColor(color); }}
                        className="w-6 h-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                        style={{ background: color }}
                        title={color}
                      >
                        {editingColor === color && <Check size={12} className="text-white drop-shadow" />}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2.5 pt-2 border-t border-[#2e3151]">
                    <button
                      onClick={e => { e.stopPropagation(); cancelEdit(); }}
                      className="flex-1 py-1 text-xs text-gray-400 hover:text-white border border-[#2e3151] rounded-lg transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); commitEdit(); }}
                      className="flex-1 py-1 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-medium"
                    >
                      저장
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <button
          onClick={onAddAccount}
          className="flex-shrink-0 px-4 py-2 rounded-xl border border-dashed border-[#2e3151] text-gray-600 hover:text-gray-300 hover:border-gray-500 text-sm transition-all flex items-center gap-1.5"
        >
          <Plus size={14} />
          계좌 추가
        </button>
      </div>

      {/* 계좌 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-900/40 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">계좌 삭제</h3>
                  <p className="text-gray-500 text-xs mt-0.5">이 작업은 되돌릴 수 없습니다</p>
                </div>
              </div>

              <div className="bg-[#0f1117] rounded-xl px-4 py-3 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: deleteTarget.color }} />
                  <span className="text-white font-medium text-sm">{deleteTarget.name}</span>
                </div>
                {deleteStockCount > 0 ? (
                  <p className="text-red-400 text-xs">
                    포함된 종목 <span className="font-semibold">{deleteStockCount}개</span>가 함께 삭제됩니다
                  </p>
                ) : (
                  <p className="text-gray-500 text-xs">보유 종목 없음</p>
                )}
              </div>

              <p className="text-gray-400 text-sm mb-5">
                <span className="font-medium text-white">"{deleteTarget.name}"</span> 계좌를 정말 삭제하시겠습니까?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 border border-[#2e3151] rounded-xl text-gray-400 hover:text-white text-sm transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    onDeleteAccount(deleteTarget.id);
                    if (selected === deleteTarget.id) onSelect(null);
                    setDeleteTarget(null);
                  }}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-white text-sm font-semibold transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
