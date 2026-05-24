import { useMemo, useState } from 'react';
import type { StockWithStats, Account } from '../types';

interface Props {
  stocks: StockWithStats[];
  accounts: Account[];
  selectedAccountId: string | null;
}

interface TreemapCell {
  stock: StockWithStats;
  x: number;
  y: number;
  w: number;
  h: number;
}

// Squarified treemap algorithm
function squarify(
  items: { value: number; stock: StockWithStats }[],
  x: number, y: number, w: number, h: number
): TreemapCell[] {
  if (!items.length) return [];
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0 || w <= 0 || h <= 0) return [];

  const results: TreemapCell[] = [];
  let remaining = [...items];
  let rx = x, ry = y, rw = w, rh = h;

  while (remaining.length > 0) {
    const area = rw * rh;
    const rowTotal = remaining.reduce((s, i) => s + i.value, 0);
    const isWide = rw >= rh;
    const fixedDim = isWide ? rh : rw;

    // find best row
    let best: typeof remaining = [];
    let bestWorst = Infinity;
    for (let n = 1; n <= remaining.length; n++) {
      const row = remaining.slice(0, n);
      const rowSum = row.reduce((s, i) => s + i.value, 0);
      const scale = area / rowTotal;
      const rowLen = (rowSum / rowTotal) * (isWide ? rw : rh);
      const worst = row.reduce((m, i) => {
        const cellDim = (i.value / rowSum) * fixedDim;
        const r = cellDim === 0 ? Infinity : Math.max(rowLen / cellDim, cellDim / rowLen);
        return Math.max(m, r);
      }, 0);
      if (worst < bestWorst) { bestWorst = worst; best = row; }
      else break;
      void scale;
    }

    const rowSum = best.reduce((s, i) => s + i.value, 0);
    const rowFrac = rowSum / rowTotal;
    const rowLen = isWide ? rw * rowFrac : rh * rowFrac;
    let cursor = isWide ? ry : rx;

    best.forEach(item => {
      const cellFrac = item.value / rowSum;
      const cellDim = (isWide ? rh : rw) * cellFrac;
      const cell: TreemapCell = isWide
        ? { stock: item.stock, x: rx, y: cursor, w: rowLen, h: cellDim }
        : { stock: item.stock, x: cursor, y: ry, w: cellDim, h: rowLen };
      results.push(cell);
      cursor += cellDim;
    });

    remaining = remaining.slice(best.length);
    if (isWide) { rx += rowLen; rw -= rowLen; }
    else { ry += rowLen; rh -= rowLen; }
  }

  return results;
}

function changeColor(pct: number): string {
  if (pct > 3) return '#16a34a';
  if (pct > 1.5) return '#22c55e';
  if (pct > 0.3) return '#4ade80';
  if (pct > -0.3) return '#374151';
  if (pct > -1.5) return '#f87171';
  if (pct > -3) return '#ef4444';
  return '#dc2626';
}

const W = 800, H = 400;

export function StockTreemap({ stocks, selectedAccountId }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const filtered = useMemo(() =>
    selectedAccountId ? stocks.filter(s => s.accountId === selectedAccountId) : stocks,
  [stocks, selectedAccountId]);

  const cells = useMemo(() => {
    const items = filtered
      .map(s => ({ value: s.marketValueKrw, stock: s }))
      .sort((a, b) => b.value - a.value);
    return squarify(items, 0, 0, W, H);
  }, [filtered]);

  if (!cells.length) {
    return (
      <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl p-6 flex items-center justify-center h-40 text-gray-500">
        표시할 종목이 없습니다
      </div>
    );
  }

  const hoveredStock = hovered ? filtered.find(s => s.id === hovered) : null;

  return (
    <div className="bg-[#1a1d2e] border border-[#2e3151] rounded-xl p-4 relative">
      <h3 className="text-white font-semibold mb-3 text-sm">스톡맵</h3>
      <div className="relative" style={{ paddingBottom: `${(H / W) * 100}%` }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 w-full h-full rounded-lg overflow-hidden"
          style={{ display: 'block' }}
        >
          <defs>
            {cells.map(({ stock, x, y, w, h }) => {
              const PAD = 3;
              const cellW = Math.max(0, w - PAD * 2);
              const cellH = Math.max(0, h - PAD * 2);
              return (
                <clipPath key={`clip-${stock.id}`} id={`clip-${stock.id}`}>
                  <rect x={x + PAD} y={y + PAD} width={cellW} height={cellH} rx={4} />
                </clipPath>
              );
            })}
          </defs>
          {cells.map(({ stock, x, y, w, h }) => {
            const bg = changeColor(stock.changeRate);
            const PAD = 3;
            const isHov = hovered === stock.id;
            const cellW = Math.max(0, w - PAD * 2);
            const cellH = Math.max(0, h - PAD * 2);

            // 셀 크기의 기하평균 기반 폰트 크기 계산
            const cellSize = Math.sqrt(cellW * cellH);
            const tickerFs = Math.min(Math.max(8, cellSize / 6), 22);
            const rateFs   = Math.min(Math.max(7, cellSize / 8), 16);
            const nameFs   = Math.min(Math.max(7, cellSize / 11), 13);
            const lineGap  = Math.max(2, tickerFs * 0.25);

            // 공간에 따라 표시 여부 결정
            const showTicker = cellW > 30 && cellH > tickerFs + 4;
            const showRate   = showTicker && cellH > tickerFs + rateFs + lineGap + 6;
            const showName   = showRate   && cellW > 55 && cellH > tickerFs + rateFs + nameFs + lineGap * 2 + 6;

            // 표시할 텍스트 라인 구성 (ticker → name → rate 순)
            type Line = { text: string; fs: number; fw: number; alpha: number };
            const lines: Line[] = [];
            if (showTicker) lines.push({ text: stock.ticker, fs: tickerFs, fw: 700, alpha: 0.95 });
            if (showName) {
              // 너비에 맞게 한글명 자르기 (한글 1자 ≈ 1em)
              const maxChars = Math.floor(cellW / (nameFs * 0.95));
              const name = stock.nameKo.length > maxChars
                ? stock.nameKo.slice(0, Math.max(1, maxChars - 1)) + '…'
                : stock.nameKo;
              lines.push({ text: name, fs: nameFs, fw: 400, alpha: 0.70 });
            }
            if (showRate) {
              const sign = stock.changeRate >= 0 ? '+' : '';
              lines.push({ text: `${sign}${stock.changeRate.toFixed(2)}%`, fs: rateFs, fw: 600, alpha: 0.90 });
            }

            // 텍스트 블록 전체 높이로 세로 중앙 정렬
            const totalTextH = lines.reduce((s, l, i) => s + l.fs + (i > 0 ? lineGap : 0), 0);
            let curTop = y + (h - totalTextH) / 2;
            const lineYs: number[] = lines.map(l => {
              const cy = curTop + l.fs / 2;
              curTop += l.fs + lineGap;
              return cy;
            });

            return (
              <g
                key={stock.id}
                className="treemap-cell cursor-pointer"
                onMouseEnter={() => setHovered(stock.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <rect
                  x={x + PAD} y={y + PAD}
                  width={cellW} height={cellH}
                  fill={bg} rx={4}
                  stroke={isHov ? '#fff' : 'transparent'}
                  strokeWidth={isHov ? 1.5 : 0}
                  style={{ transition: 'stroke 0.15s' }}
                />
                <g clipPath={`url(#clip-${stock.id})`}>
                  {lines.map((line, i) => (
                    <text
                      key={i}
                      x={x + w / 2} y={lineYs[i]}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={`rgba(255,255,255,${line.alpha})`}
                      fontSize={line.fs}
                      fontWeight={line.fw}
                    >
                      {line.text}
                    </text>
                  ))}
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltip */}
      {hoveredStock && (
        <div className="mt-3 p-3 bg-[#0f1117] border border-[#2e3151] rounded-lg flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-gray-500 text-xs">종목</span>
            <div className="text-white font-semibold">{hoveredStock.nameKo} ({hoveredStock.ticker})</div>
          </div>
          <div>
            <span className="text-gray-500 text-xs">현재가</span>
            <div className="text-white tabular-nums">
              {hoveredStock.currency === 'USD'
                ? `$${hoveredStock.currentPrice.toFixed(2)}`
                : `₩${hoveredStock.currentPrice.toLocaleString()}`}
            </div>
          </div>
          <div>
            <span className="text-gray-500 text-xs">당일변동</span>
            <div className={`tabular-nums font-semibold ${hoveredStock.changeRate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {hoveredStock.changeRate >= 0 ? '+' : ''}{hoveredStock.changeRate.toFixed(2)}%
            </div>
          </div>
          <div>
            <span className="text-gray-500 text-xs">평가금액</span>
            <div className="text-white tabular-nums">
              ₩{Math.round(hoveredStock.marketValueKrw).toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-gray-500 text-xs">평가손익</span>
            <div className={`tabular-nums font-semibold ${hoveredStock.gainLossKrw >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {hoveredStock.gainLossKrw >= 0 ? '+' : ''}₩{Math.round(hoveredStock.gainLossKrw).toLocaleString()}
              {' '}({hoveredStock.gainLossPct >= 0 ? '+' : ''}{hoveredStock.gainLossPct.toFixed(2)}%)
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-3 mt-3 text-xs text-gray-400 items-center flex-wrap">
        {[
          { color: '#16a34a', label: '+3% 이상' },
          { color: '#4ade80', label: '+0.3~3%' },
          { color: '#374151', label: '보합' },
          { color: '#f87171', label: '-0.3~3%' },
          { color: '#dc2626', label: '-3% 이하' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
