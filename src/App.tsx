import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useExchangeRate } from './hooks/useExchangeRate';
import { usePortfolio } from './hooks/usePortfolio';
import { usePriceRefresher } from './hooks/usePriceRefresher';
import { useSnapshots } from './hooks/useSnapshots';
import { ExchangeRateBar } from './components/ExchangeRateBar';
import { SummaryCards } from './components/SummaryCards';
import { AccountTabs } from './components/AccountTabs';
import { SearchBar } from './components/SearchBar';
import { StockTreemap } from './components/StockTreemap';
import { StockTable } from './components/StockTable';
import { HistoryPage } from './components/HistoryPage';
import { AddStockModal } from './components/AddStockModal';
import { AddAccountModal } from './components/AddAccountModal';
import { BuyMoreModal } from './components/BuyMoreModal';
import type { DisplayCurrency } from './utils/currency';
import type { Stock, StockWithStats } from './types';
import './index.css';

type Page = 'portfolio' | 'history';

export default function App() {
  const [refreshIntervalMs, setRefreshIntervalMs] = useState<number | null>(() => {
    const saved = localStorage.getItem('portfolio_refresh_interval');
    if (saved === 'null') return null;
    const n = Number(saved);
    return isNaN(n) || n <= 0 ? 5 * 60 * 1000 : n;
  });

  function handleSetInterval(ms: number | null) {
    setRefreshIntervalMs(ms);
    localStorage.setItem('portfolio_refresh_interval', ms === null ? 'null' : String(ms));
  }

  const { rate, loading: rateLoading, isRefreshing: rateRefreshing, error: rateError, refresh: refreshRate } =
    useExchangeRate(refreshIntervalMs);
  const {
    stocks, rawStocks, accounts,
    addStock, updateStock, deleteStock,
    addAccount, updateAccount, reorderAccounts, deleteAccount,
    bulkUpdateLiveData,
    totalValueKrw, totalGainLossKrw, totalCostKrw,
  } = usePortfolio(rate.usdToKrw);

  const { isRefreshing, lastUpdated, error: priceError, refresh: refreshPrices } =
    usePriceRefresher(rawStocks, bulkUpdateLiveData, refreshIntervalMs);

  const { snapshots, takeSnapshot } = useSnapshots(stocks, accounts, rate.usdToKrw);

  const [page, setPage] = useState<Page>('portfolio');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [buyMoreTarget, setBuyMoreTarget] = useState<StockWithStats | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('KRW');

  function handleSearchSelect(id: string) {
    const stock = stocks.find(s => s.id === id);
    if (!stock) return;
    setPage('portfolio');
    setSelectedAccountId(null);
    setHighlightId(id);
    setTimeout(() => setHighlightId(null), 3000);
    document.getElementById('stock-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleAddStock(stock: Stock) {
    addStock(stock);
    setSelectedAccountId(stock.accountId);
    setTimeout(refreshPrices, 200);
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

  const SUB_PAGES: { id: Page; label: string }[] = [
    { id: 'portfolio', label: '보유현황' },
    { id: 'history', label: '(임시) 계좌 수익률' },
  ];

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <ExchangeRateBar
        rate={rate}
        loading={rateLoading}
        rateRefreshing={rateRefreshing}
        error={rateError}
        displayCurrency={displayCurrency}
        onToggle={() => setDisplayCurrency(c => c === 'KRW' ? 'USD' : 'KRW')}
        refreshIntervalMs={refreshIntervalMs}
        onSetInterval={handleSetInterval}
        onRefreshRate={refreshRate}
      />

      {/* Primary navigation - main sections */}
      <nav className="bg-[#1a1d2e] border-b border-[#2e3151]">
        <div className="max-w-7xl mx-auto px-4 flex">
          <button className="px-5 py-3 text-sm font-semibold border-b-2 border-blue-500 text-white whitespace-nowrap">
            포트폴리오
          </button>
        </div>
      </nav>

      {/* Secondary navigation - sub pages */}
      <nav className="bg-[#0f1117] border-b border-[#2e3151]">
        <div className="max-w-7xl mx-auto px-4 flex">
          {SUB_PAGES.map(tab => (
            <button
              key={tab.id}
              onClick={() => setPage(tab.id)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                page === tab.id
                  ? 'border-blue-400 text-blue-300'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Portfolio page */}
      {page === 'portfolio' && (
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

          <SummaryCards
            stocks={stocks}
            totalValueKrw={totalValueKrw}
            totalGainLossKrw={totalGainLossKrw}
            totalCostKrw={totalCostKrw}
            displayCurrency={displayCurrency}
            usdToKrw={rate.usdToKrw}
          />

          <AccountTabs
            accounts={accounts}
            stocks={stocks}
            selected={selectedAccountId}
            onSelect={setSelectedAccountId}
            onAddAccount={() => setShowAddAccountModal(true)}
            onDeleteAccount={handleDeleteAccount}
            onUpdateAccount={updateAccount}
            onReorderAccounts={reorderAccounts}
            displayCurrency={displayCurrency}
            usdToKrw={rate.usdToKrw}
          />

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

          {accounts.length > 0 && (
            <StockTreemap
              stocks={stocks}
              accounts={accounts}
              selectedAccountId={selectedAccountId}
            />
          )}

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
                  <div className="flex items-center gap-1.5 text-xs">
                    {isRefreshing ? (
                      <span className="text-blue-400 flex items-center gap-1">
                        <RefreshCw size={11} className="animate-spin" />
                        업데이트 중
                      </span>
                    ) : priceError ? (
                      <span className="text-red-400 flex items-center gap-1" title={priceError}>
                        가격 조회 실패
                        <button onClick={refreshPrices} className="hover:text-red-300 transition-colors">
                          <RefreshCw size={11} />
                        </button>
                      </span>
                    ) : lastUpdated ? (
                      <span className="text-gray-600 flex items-center gap-1">
                        {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준
                        <button onClick={refreshPrices} className="hover:text-gray-400 transition-colors">
                          <RefreshCw size={11} />
                        </button>
                      </span>
                    ) : null}
                  </div>
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
      )}

      {/* History page */}
      {page === 'history' && (
        <HistoryPage
          snapshots={snapshots}
          accounts={accounts}
          onTakeSnapshot={takeSnapshot}
          displayCurrency={displayCurrency}
          usdToKrw={rate.usdToKrw}
        />
      )}

      {showAddStockModal && (
        <AddStockModal
          accounts={accounts}
          defaultAccountId={selectedAccountId ?? undefined}
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
