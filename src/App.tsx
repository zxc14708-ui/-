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
import type { Stock } from './types';
import './index.css';

export default function App() {
  const { rate, loading: rateLoading, error: rateError } = useExchangeRate();
  const {
    stocks, accounts,
    addStock, deleteStock,
    totalValueKrw, totalGainLossKrw, totalCostKrw,
  } = usePortfolio(rate.usdToKrw);

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  function handleSearchSelect(id: string) {
    const stock = stocks.find(s => s.id === id);
    if (!stock) return;
    setSelectedAccountId(null); // show all to make stock visible
    setHighlightId(id);
    // clear highlight after 3s
    setTimeout(() => setHighlightId(null), 3000);
    // scroll table into view
    document.getElementById('stock-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleAdd(stock: Stock) {
    addStock(stock);
    setSelectedAccountId(stock.accountId);
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <ExchangeRateBar rate={rate} loading={rateLoading} error={rateError} />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">자산관리 포트폴리오</h1>
            <p className="text-gray-500 text-xs mt-0.5">
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SearchBar stocks={stocks} onSelect={handleSearchSelect} />
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-colors flex-shrink-0"
            >
              <Plus size={15} />
              종목 추가
            </button>
          </div>
        </div>

        {/* Summary */}
        <SummaryCards
          stocks={stocks}
          totalValueKrw={totalValueKrw}
          totalGainLossKrw={totalGainLossKrw}
          totalCostKrw={totalCostKrw}
        />

        {/* Account Tabs */}
        <AccountTabs
          accounts={accounts}
          stocks={stocks}
          selected={selectedAccountId}
          onSelect={setSelectedAccountId}
        />

        {/* Treemap */}
        <StockTreemap
          stocks={stocks}
          accounts={accounts}
          selectedAccountId={selectedAccountId}
        />

        {/* Table */}
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
            <span className="text-gray-500 text-xs">
              {selectedAccountId
                ? stocks.filter(s => s.accountId === selectedAccountId).length
                : stocks.length}개 종목
            </span>
          </div>
          <StockTable
            stocks={stocks}
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            highlightId={highlightId}
            onDelete={deleteStock}
          />
        </div>
      </div>

      {showAddModal && (
        <AddStockModal
          accounts={accounts}
          onAdd={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
