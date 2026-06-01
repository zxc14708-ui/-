import { useState, useEffect, useRef } from 'react';
import { Plus, RefreshCw, Download } from 'lucide-react';
import { useExchangeRate } from './hooks/useExchangeRate';
import { usePortfolio } from './hooks/usePortfolio';
import { usePriceRefresher } from './hooks/usePriceRefresher';
import { useSnapshots } from './hooks/useSnapshots';
import { useTrades } from './hooks/useTrades';
import { fetchKoreanName } from './utils/yahooFinance';
import { exportPortfolioCSV } from './utils/exportCsv';
import { ExchangeRateBar } from './components/ExchangeRateBar';
import { SummaryCards } from './components/SummaryCards';
import { AccountTabs } from './components/AccountTabs';
import { SearchBar } from './components/SearchBar';
import { StockTreemap } from './components/StockTreemap';
import { StockTable } from './components/StockTable';
import { HistoryPage } from './components/HistoryPage';
import { TradesPage } from './components/TradesPage';
import { RebalancePage } from './components/RebalancePage';
import { AllocationChart } from './components/AllocationChart';
import { AddStockModal } from './components/AddStockModal';
import { AddAccountModal } from './components/AddAccountModal';
import { BuyMoreModal } from './components/BuyMoreModal';
import { EditStockModal } from './components/EditStockModal';
import { SellStockModal } from './components/SellStockModal';
import type { DisplayCurrency } from './utils/currency';
import type { Stock, StockWithStats, Trade } from './types';
import './index.css';

type Page = 'portfolio' | 'history' | 'trades' | 'rebalance';

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

  const { trades, addTrade, updateTrade, deleteTrade } = useTrades();

  // 한글명 없는 US 종목 자동 보정 (앱 로드 시 1회)
  const enrichedRef = useRef(false);
  useEffect(() => {
    if (enrichedRef.current || !rawStocks.length) return;
    enrichedRef.current = true;
    rawStocks
      .filter(s => (s.market === 'NYSE' || s.market === 'NASDAQ') && !/[가-힣]/.test(s.nameKo))
      .forEach(async stock => {
        const nameKo = await fetchKoreanName(stock.ticker);
        if (nameKo) updateStock(stock.id, { nameKo });
      });
  }, [rawStocks, updateStock]);

  const { snapshots, takeSnapshot } = useSnapshots(stocks, accounts, rate.usdToKrw, lastUpdated !== null);

  const [page, setPage] = useState<Page>('portfolio');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [buyMoreTarget, setBuyMoreTarget] = useState<StockWithStats | null>(null);
  const [editTarget, setEditTarget] = useState<StockWithStats | null>(null);
  const [sellTarget, setSellTarget] = useState<StockWithStats | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('KRW');

  // Today's gain/loss across all stocks
  const todayGainLossKrw = stocks.reduce((sum, s) => {
    const mult = s.currency === 'USD' ? rate.usdToKrw : 1;
    return sum + s.changeAmt * s.quantity * mult;
  }, 0);

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

    const account = accounts.find(a => a.id === stock.accountId);
    const trade: Trade = {
      id: 'trade_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      stockId: stock.id,
      ticker: stock.ticker,
      nameKo: stock.nameKo,
      market: stock.market,
      currency: stock.currency,
      accountId: stock.accountId,
      accountName: account?.name ?? stock.accountId,
      type: 'buy',
      quantity: addQty,
      price: addPrice,
      usdToKrw: rate.usdToKrw,
      createdAt: Date.now(),
    };
    addTrade(trade);
  }

  function handleSell(id: string, qty: number, price: number) {
    const stock = stocks.find(s => s.id === id);
    if (!stock) return;

    const remainingQty = stock.quantity - qty;
    if (remainingQty <= 0) {
      deleteStock(id);
    } else {
      updateStock(id, { quantity: remainingQty });
    }

    const multiplier = stock.currency === 'USD' ? rate.usdToKrw : 1;
    const realizedPnlKrw = (price - stock.avgCost) * qty * multiplier;

    const account = accounts.find(a => a.id === stock.accountId);
    const trade: Trade = {
      id: 'trade_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      stockId: stock.id,
      ticker: stock.ticker,
      nameKo: stock.nameKo,
      market: stock.market,
      currency: stock.currency,
      accountId: stock.accountId,
      accountName: account?.name ?? stock.accountId,
      type: 'sell',
      quantity: qty,
      price: price,
      usdToKrw: rate.usdToKrw,
      createdAt: Date.now(),
      realizedPnlKrw,
    };
    addTrade(trade);
  }

  function handleEditStock(id: string, updates: Partial<Stock>) {
    updateStock(id, updates);
  }

  function handleDeleteAccount(id: string) {
    deleteAccount(id);
    if (selectedAccountId === id) setSelectedAccountId(null);
  }

  const SUB_PAGES: { id: Page; label: string }[] = [
    { id: 'portfolio', label: '보유현황' },
    { id: 'history', label: '계좌 수익률' },
    { id: 'trades', label: '거래 내역' },
    { id: 'rebalance', label: '리밸런싱' },
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

      {/* Primary navigation */}
      <div className="bg-[#0b0e1a] border-b border-[#1e2240]">
        <div className="max-w-screen-2xl mx-auto px-4 flex items-center h-11">
          <span className="inline-flex items-center gap-2 px-4 h-full text-sm font-bold text-white border-b-2 border-blue-500">
            📊 포트폴리오
          </span>
        </div>
      </div>

      {/* Secondary navigation */}
      <div className="bg-[#13162a] border-b border-[#2e3151]">
        <div className="max-w-screen-2xl mx-auto px-4 flex items-center gap-1 h-10">
          {SUB_PAGES.map(tab => (
            <button
              key={tab.id}
              onClick={() => setPage(tab.id)}
              className={`px-4 h-full text-xs font-medium transition-all border-b-2 whitespace-nowrap ${
                page === tab.id
                  ? 'border-blue-400 text-white bg-blue-500/10'
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Portfolio page */}
      {page === 'portfolio' && (
        <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-white">보유현황</h1>
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
            todayGainLossKrw={todayGainLossKrw}
            displayCurrency={displayCurrency}
            usdToKrw={rate.usdToKrw}
          />

          {accounts.length > 0 && stocks.length > 0 && (
            <AllocationChart
              stocks={stocks}
              accounts={accounts}
              displayCurrency={displayCurrency}
              usdToKrw={rate.usdToKrw}
            />
          )}

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
                    onClick={() => exportPortfolioCSV(stocks, accounts, rate.usdToKrw)}
                    disabled={stocks.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1d2e] border border-[#2e3151] hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                    title="CSV 내보내기"
                  >
                    <Download size={13} />
                    CSV
                  </button>
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
                onEdit={s => setEditTarget(s)}
                onSell={s => setSellTarget(s)}
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

      {/* Trades page */}
      {page === 'trades' && (
        <TradesPage
          trades={trades}
          accounts={accounts}
          onDeleteTrade={deleteTrade}
          onUpdateTrade={updateTrade}
          displayCurrency={displayCurrency}
          usdToKrw={rate.usdToKrw}
        />
      )}

      {/* Rebalance page */}
      {page === 'rebalance' && (
        <RebalancePage
          stocks={stocks}
          accounts={accounts}
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

      {editTarget && (
        <EditStockModal
          stock={editTarget}
          onConfirm={handleEditStock}
          onClose={() => setEditTarget(null)}
        />
      )}

      {sellTarget && (
        <SellStockModal
          stock={sellTarget}
          usdToKrw={rate.usdToKrw}
          onConfirm={handleSell}
          onClose={() => setSellTarget(null)}
        />
      )}
    </div>
  );
}
