import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, X, Pencil } from 'lucide-react';
import type { Account, StockWithStats } from '../types';
import type { DisplayCurrency } from '../utils/currency';
import { fmtAmount } from '../utils/currency';

interface Props {
  accounts: Account[];
  stocks: StockWithStats[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onAddAccount: () => void;
  onDeleteAccount: (id: string) => void;
  onRenameAccount: (id: string, name: string) => void;
  displayCurrency: DisplayCurrency;
  usdToKrw: number;
}

export function AccountTabs({ accounts, stocks, selected, onSelect, onAddAccount, onDeleteAccount, onRenameAccount, displayCurrency, usdToKrw }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const totalValue = stocks.reduce((s, st) => s + st.marketValueKrw, 0);
  const fmt = (n: number) => fmtAmount(n, displayCurrency, usdToKrw);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  function startEdit(e: React.MouseEvent, acc: Account) {
    e.stopPropagation();
    setConfirmDelete(null);
    setEditingId(acc.id);
    setEditingName(acc.name);
  }

  function commitEdit() {
    if (editingId && editingName.trim()) {
      onRenameAccount(editingId, editingName.trim());
    }
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function accountValue(accountId: string) {
    return stocks.filter(s => s.accountId === accountId).reduce((s, st) => s + st.marketValueKrw, 0);
  }

  function accountGainLoss(accountId: string) {
    return stocks.filter(s => s.accountId === accountId).reduce((s, st) => s + st.gainLossKrw, 0);
  }

  function accountStockCount(accountId: string) {
    return stocks.filter(s => s.accountId === accountId).length;
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (confirmDelete === id) {
      onDeleteAccount(id);
      if (selected === id) onSelect(null);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  }

  function cancelDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDelete(null);
  }

  return (
    <div className="flex gap-2 flex-wrap items-start">
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
        const isConfirming = confirmDelete === acc.id;
        const isEditing = editingId === acc.id;

        return (
          <div key={acc.id} className="relative group">
            <button
              onClick={() => { onSelect(acc.id); setConfirmDelete(null); }}
              className={`flex-shrink-0 pl-4 pr-8 py-2 rounded-xl border text-sm font-medium transition-all text-left ${
                isSelected ? 'text-white' : 'bg-[#1a1d2e] border-[#2e3151] text-gray-400 hover:text-white'
              }`}
              style={isSelected ? { background: acc.color + '33', borderColor: acc.color } : {}}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: acc.color }} />
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

            {isConfirming ? (
              <div className="absolute top-1 right-1 flex gap-0.5">
                <button
                  onClick={e => handleDelete(e, acc.id)}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs px-1.5 py-0.5 rounded transition-colors"
                >
                  삭제
                </button>
                <button onClick={cancelDelete} className="text-gray-400 hover:text-white p-0.5 rounded transition-colors">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => startEdit(e, acc)}
                  className="text-gray-600 hover:text-blue-400 transition-colors p-0.5 rounded"
                  title="계좌명 수정"
                >
                  <Pencil size={11} />
                </button>
                <button
                  onClick={e => handleDelete(e, acc.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors p-0.5 rounded"
                  title="계좌 삭제"
                >
                  <Trash2 size={11} />
                </button>
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
  );
}
