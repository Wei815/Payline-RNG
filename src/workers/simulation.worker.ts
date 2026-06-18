import type { PaytableRule, ReelStrips, SymbolMetric, GameConfig } from '../types';
import { evaluateGrid } from '../utils/evaluation';

export type WorkerMessageData = {
  strips: ReelStrips;
  paytable: PaytableRule[];
  totalSpins: number;
  rowCounts: number[];
  gameConfig: GameConfig;
  coin: number;
  bet: number;
};

export type WorkerResponse = {
  type: 'PROGRESS';
  spinsDone: number;
  currentGrid?: string[][];
} | {
  type: 'DONE';
  result: any;
};

self.onmessage = (e: MessageEvent<WorkerMessageData>) => {
  const { strips, paytable, totalSpins, rowCounts, gameConfig, coin, bet } = e.data;
  
  const symbolMetrics: Record<string, SymbolMetric> = {};
  paytable.forEach(rule => {
    symbolMetrics[rule.symbolId] = {
      symbolId: rule.symbolId,
      hits2: 0,
      hits3: 0,
      hits4: 0,
      hits5: 0,
      hits6: 0,
      totalPayout: 0,
      contributionRTP: 0
    };
  });

  let overallWin = 0;
  let winningSpins = 0;

  // Pre-allocate the grid to avoid GC overhead
  const maxCols = strips.length;
  const grid: string[][] = new Array(maxCols);
  for (let c = 0; c < maxCols; c++) {
    // Determine max rows for this column (including possible megaways top row slot)
    const rows = rowCounts[c] || 3;
    const isMegawayTop = gameConfig.gameType === 'megaway' && c >= 1 && c <= 4;
    grid[c] = new Array(rows + (isMegawayTop ? 1 : 0)).fill('0');
  }

  // Pre-allocate a grid for display without the megaway top tracker (if needed)
  const displayGrid: string[][] = new Array(maxCols);
  for (let c = 0; c < maxCols; c++) {
    const rows = rowCounts[c] || 3;
    displayGrid[c] = new Array(rows).fill('0');
  }

  const effectivePaylines = (gameConfig.gameType === 'linegame' && gameConfig.paylines && gameConfig.paylines.length === 0)
    ? undefined
    : gameConfig.paylines;

  // Optimize batch size and progress reporting
  // Avoid postMessage too often.
  const REPORT_INTERVAL_MS = 200;
  let lastReportTime = performance.now();

  for (let i = 0; i < totalSpins; i++) {
    // Overwrite the pre-allocated grid
    for (let colIndex = 0; colIndex < strips.length; colIndex++) {
      const strip = strips[colIndex];
      const rows = rowCounts[colIndex] || 3;
      let writeIdx = 0;

      for (let r = 0; r < rows; r++) {
        if (!strip || strip.length === 0) {
          grid[colIndex][writeIdx++] = 'WILD';
        } else {
          grid[colIndex][writeIdx++] = strip[Math.floor(Math.random() * strip.length)];
        }
      }
      
      // Megaways top row
      if (gameConfig.gameType === 'megaway' && colIndex >= 1 && colIndex <= 4) {
        if (!strip || strip.length === 0) {
          grid[colIndex][writeIdx++] = 'WX';
        } else {
          grid[colIndex][writeIdx++] = strip[Math.floor(Math.random() * strip.length)];
        }
      }
    }

    const wins = evaluateGrid(grid, paytable, gameConfig, effectivePaylines);
    
    let spinWin = 0;
    for (let wIdx = 0; wIdx < wins.length; wIdx++) {
      const win = wins[wIdx];
      spinWin += win.totalWin;

      const metric = symbolMetrics[win.symbolId];
      if (metric) {
        metric.totalPayout += win.totalWin;

        if (gameConfig.gameType === 'payanywhere' || gameConfig.gameType === 'payanywhere_set2') {
          if (win.matchCount >= 8 && win.matchCount <= 9) {
            metric.hits3++;
          } else if (win.matchCount >= 10 && win.matchCount <= 11) {
            metric.hits4++;
          } else if (win.matchCount >= 12) {
            metric.hits5++;
          }
        } else {
          const matches = Math.min(win.matchCount, 6);
          if (matches === 2) metric.hits2++;
          else if (matches === 3) metric.hits3++;
          else if (matches === 4) metric.hits4++;
          else if (matches === 5) metric.hits5++;
          else if (matches === 6) metric.hits6 = (metric.hits6 || 0) + 1;
        }
      }
    }

    if (spinWin > 0) {
      winningSpins++;
      overallWin += spinWin;
    }

    // Report progress periodically
    if ((i + 1) % 1000 === 0) {
      const now = performance.now();
      if (now - lastReportTime > REPORT_INTERVAL_MS || i + 1 === totalSpins) {
        lastReportTime = now;
        
        for (let c = 0; c < maxCols; c++) {
          const rows = rowCounts[c] || 3;
          for (let r = 0; r < rows; r++) {
            displayGrid[c][r] = grid[c][r];
          }
        }

        self.postMessage({
          type: 'PROGRESS',
          spinsDone: i + 1,
          currentGrid: JSON.parse(JSON.stringify(displayGrid)) // Send a copy
        } as WorkerResponse);
      }
    }
  }

  const effectiveBet = bet > 0 ? bet : coin;
  const overallRTP = (overallWin / (totalSpins * effectiveBet)) * 100;
  const hitFrequency = (winningSpins / totalSpins) * 100;

  Object.keys(symbolMetrics).forEach(symId => {
    const metric = symbolMetrics[symId];
    metric.contributionRTP = (metric.totalPayout / (totalSpins * effectiveBet)) * 100;
  });

  const usedPaylines = effectivePaylines ? effectivePaylines.length : (gameConfig.gameType === 'linegame' ? 20 : 0);

  self.postMessage({
    type: 'DONE',
    result: {
      totalSpins,
      overallRTP,
      hitFrequency,
      symbolMetrics,
      paylineCount: usedPaylines,
      effectiveBet,
      gameType: gameConfig.gameType
    }
  } as WorkerResponse);
};
