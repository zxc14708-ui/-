import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useExchangeRate } from './hooks/useExchangeRate';
import { usePortfolio } from './hooks/usePortfolio';
import { ExchangeRateBar } from './components/ExchangeRateBar';
import { SummaryCards } from './components/SummaryCards';
import { AccountTabs } from './components/AccountTabs';
import { SearchBar } from './components/SearchBar';
import { StockTreemap } from './components/StockTreemap';
import { StockTable } from './components/StockTable';
import { AddStockModal } from './components/AddStockModal';
import { AddAccountModal } from './components/AddAccountModal';
import { BuyMoreModal } from './components/BuyMoreModal';
import type { DisplayCurrency } from './utils/currency';
import type { Stock, StockWithStats } from './types';
import './index.css';

export default function App() {
  const { rate, loading: rateLoading, error: rateError } = useExchangeRate();
  const {
    stocks, accounts,
    addStock, updateStock, deleteStock,
    addAccount, deleteAccount,
    totalValueKrw, totalGainLossKrw, totalCostKrw,
  } = usePortfolio(rate.usdToKrw);

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [buyMoreTarget, setBuyMoreTarget] = useState<StockWithStats | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('KRW');

  function handleSearchSelect(id: string) {
    const stock = stocks.find(s => s.id === id);
    if (!stock) return;
    setSelectedAccountId(null);
    setHighlightId(id);
    setTimeout(() => setHighlightId(null), 3000);
    document.getElementById('stock-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleAddStock(stock: Stock) {
    addStock(stock);
    setSelectedAccountId(stock.accountId);
  }

  function handleBuyMore(id: string, addQty: number, addPrice: number) {
    const stock = stocks.find(s => s.id === id);
    if (!stock) return;
    const newQty = stock.quantity + addQty;
    const newAvgCost = (stock.quantity * stock.avgCost + addQty * addPrice) / newQty;
    updateStock(id, { quantity: newQty, avgCost: newAvgCost });
  }

  function handleDeleteAccount(id: string) {
    deleteAccount(id);
    if (selectedAccountId === id) setSelectedAccountId(null);
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <ExchangeRateBar
        rate={rate}
        loading={rateLoading}
        error={rateError}
        displayCurrency={displayCurrency}
        onToggle={() => setDisplayCurrency(c => c === 'KRW' ? 'USD' : 'KRW')}
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-white">자산관리 포트폴리오</h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SearchBar stocks={stocks} onSelect={handleSearchSelect} />
          </div>
        </div>

        {/* Summary */}
        <SummaryCards
          stocks={stocks}
          totalValueKrw={totalValueKrw}
          totalGainLossKrw={totalGainLossKrw}
          totalCostKrw={totalCostKrw}
          displayCurrency={displayCurrency}
          usdToKrw={rate.usdToKrw}
        />

        {/* Account Tabs */}
        <AccountTabs
          accounts={accounts}
          stocks={stocks}
          selected={selectedAccountId}
          onSelect={setSelectedAccountId}
          onAddAccount={() => setShowAddAccountModal(true)}
          onDeleteAccount={handleDeleteAccount}
          displayCurrency={displayCurrency}
          usdToKrw={rate.usdToKrw}
        />

        {/* 계좌 없을 때 안내 */}
        {accounts.length === 0 && (
          <div className="bg-[#1a1d2e] border border-dashed border-[#2e3151] rounded-xl p-10 text-center">
            <p className="text-gray-500 mb-3">등록된 계좌가 없습니다</p>
            <button
              onClick={() => setShowAddAccountModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-colors"
            >
              + 계좌 추가하기
            </button>
          </div>
        )}

        {/* Treemap */}
        {accounts.length > 0 && (
          <StockTreemap
            stocks={stocks}
            accounts={accounts}
            selectedAccountId={selectedAccountId}
          />
        )}

        {/* Table */}
        {accounts.length > 0 && (
          <div id="stock-table">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold text-sm">
                보유 종목
                {selectedAccountId && (
                  <span className="text-gray-500 font-normal ml-2 text-xs">
                    · {accounts.find(a => a.id === selectedAccountId)?.name}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-xs">
                  {selectedAccountId
                    ? stocks.filter(s => s.accountId === selectedAccountId).length
                    : stocks.length}개 종목
                </span>
                <button
                  onClick={() => setShowAddStockModal(true)}
                  disabled={accounts.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus size={14} />
                  종목 추가
                </button>
              </div>
            </div>
            <StockTable
              stocks={stocks}
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              highlightId={highlightId}
              onDelete={deleteStock}
              onBuyMore={setBuyMoreTarget}
              displayCurrency={displayCurrency}
              usdToKrw={rate.usdToKrw}
            />
          </div>
        )}
      </div>

      {showAddStockModal && (
        <AddStockModal
          accounts={accounts}
          onAdd={handleAddStock}
          onClose={() => setShowAddStockModal(false)}
        />
      )}

      {showAddAccountModal && (
        <AddAccountModal
          onAdd={(name, broker) => addAccount(name, broker)}
          onClose={() => setShowAddAccountModal(false)}
        />
      )}

      {buyMoreTarget && (
        <BuyMoreModal
          stock={buyMoreTarget}
          onConfirm={handleBuyMore}
          onClose={() => setBuyMoreTarget(null)}
        />
      )}

    </div>
  );
}
