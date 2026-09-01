import type { PaytableRule, ReelStrips, SymbolMetric, GameConfig } from '../types';
import { evaluateGrid, getWinningPositions } from '../utils/evaluation';
import { isGoldSymbol } from '../utils/evaluation/GameConstants';

export type WorkerMessageData = {
  mode?: 'base_only' | 'free_only' | 'full_game';
  strips: ReelStrips;
  freeStrips?: ReelStrips;
  paytable: PaytableRule[];
  totalSpins: number;
  rowCounts: number[];
  gameConfig: GameConfig;
  coin: number;
  bet: number;
  isFreeGame?: boolean;
};

export type WorkerResponse = {
  type: 'PROGRESS';
  spinsDone: number;
  currentGrid?: string[][];
} | {
  type: 'DONE';
  result: any;
};
const REPORT_INTERVAL_MS = 100;

self.onmessage = (e: MessageEvent<WorkerMessageData>) => {
  const { mode = 'base_only', strips, freeStrips, paytable, totalSpins, rowCounts, gameConfig, coin, bet, isFreeGame } = e.data;
  
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
  let baseWinTotal = 0;
  let freeWinTotal = 0;
  let freeGameTriggers = 0;
  let freeGameRetriggers = 0;
  let freeSpinsPlayedTotal = 0;

  // Pre-allocate the grid to avoid GC overhead
  
  const maxCols = strips.length;
  const grid: string[][] = new Array(maxCols);
  for (let c = 0; c < maxCols; c++) {
    const rows = rowCounts[c] || 3;
    const isMegawayTop = gameConfig.gameType === 'megaway' && c >= 1 && c <= 4;
    grid[c] = new Array(rows + (isMegawayTop ? 1 : 0)).fill('0');
  }

  const displayGrid: string[][] = new Array(maxCols);
  for (let c = 0; c < maxCols; c++) {
    const rows = rowCounts[c] || 3;
    displayGrid[c] = new Array(rows).fill('0');
  }

  let effectivePaylines = gameConfig.paylines;
  let lastReportTime = performance.now();
  const drawIndices: number[] = new Array(maxCols);

  const runSpin = (currentStrips: import('../types').ReelStrips, isFG: boolean) => {
    for (let colIndex = 0; colIndex < currentStrips.length; colIndex++) {
      const strip = currentStrips[colIndex];
      const rows = rowCounts[colIndex] || 3;
      let writeIdx = 0;

      if (!strip || strip.length === 0) {
        for (let r = 0; r < rows; r++) {
          grid[colIndex][writeIdx++] = 'WILD';
        }
        drawIndices[colIndex] = 0;
      } else {
        const startIndex = Math.floor(Math.random() * strip.length);
        drawIndices[colIndex] = startIndex - 1;
        for (let r = 0; r < rows; r++) {
          grid[colIndex][writeIdx++] = strip[(startIndex + r) % strip.length];
        }
      }
      
      if (gameConfig.gameType === 'megaway' && colIndex >= 1 && colIndex <= 4) {
        if (!strip || strip.length === 0) {
          grid[colIndex][writeIdx++] = 'WX';
        } else {
          grid[colIndex][writeIdx++] = strip[Math.floor(Math.random() * strip.length)];
        }
      }
    }

    let spinWin = 0;
    let keepCascading = true;
    let cascadeCount = 0;
    let scatterHits = 0;

    while (keepCascading) {
      const wins = evaluateGrid(grid, paytable, gameConfig, effectivePaylines);
      
      if (wins.length === 0) {
        keepCascading = false;
        break;
      }
      
      let tumbleMultiplier = 1;
      if (gameConfig.gameType === 'waygame' || gameConfig.gameType === 'waygame_elephant') {
        tumbleMultiplier = isFG 
          ? Math.min(1024, 8 * Math.pow(2, cascadeCount)) 
          : Math.min(1024, 1 * Math.pow(2, cascadeCount));
      }
      
      let cascadeWin = 0;
      for (let wIdx = 0; wIdx < wins.length; wIdx++) {
        const win = wins[wIdx];
        const multipliedWin = win.totalWin * tumbleMultiplier;
        cascadeWin += multipliedWin;

        const metric = symbolMetrics[win.symbolId];
        if (metric) {
          metric.totalPayout += multipliedWin;

          if (gameConfig.gameType === 'payanywhere' || gameConfig.gameType === 'payanywhere_set2') {
            if (win.matchCount >= 8 && win.matchCount <= 9) metric.hits3++;
            else if (win.matchCount >= 10 && win.matchCount <= 11) metric.hits4++;
            else if (win.matchCount >= 12) metric.hits5++;
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

      spinWin += cascadeWin;

      if ((gameConfig.gameType === 'waygame' || gameConfig.gameType === 'waygame_qin' || gameConfig.gameType === 'waygame_elephant' || gameConfig.gameType === 'payanywhere_set2') && cascadeWin > 0) {
        const winningCoordsMap = getWinningPositions(grid, wins, paytable, gameConfig.gameType, undefined, effectivePaylines);
        
        for (let colIndex = 0; colIndex < grid.length; colIndex++) {
          const strip = currentStrips[colIndex];
          if (!strip || strip.length === 0) continue;
          
          const rows = rowCounts[colIndex] || 3;

          for (let r = rows - 1; r >= 0; r--) {
            if (winningCoordsMap.has(`${colIndex}-${r}`)) {
              const unremovable = gameConfig.specialRules?.unremovableSymbols || [];
              const currentSym = grid[colIndex][r];
              if (isFG && unremovable.includes(currentSym)) {
                continue;
              }
              if (gameConfig.gameType === 'waygame_elephant' && isGoldSymbol(currentSym)) {
                grid[colIndex][r] = 'WX';
                continue;
              }

              const winIndices = winningCoordsMap.get(`${colIndex}-${r}`);
              const hasRealWin = winIndices && winIndices.some(idx => idx !== 999);
              if (hasRealWin) {
                const len = strip.length;
                const actualDrawIndex = (((drawIndices[colIndex] % len) + len) % len);
                
                grid[colIndex][r] = strip[actualDrawIndex];
                drawIndices[colIndex]--;
              }
            }
          }
        }
      } else {
        keepCascading = false;
      }
      
      cascadeCount++;
    }
    
    for (let c = 0; c < grid.length; c++) {
       const rows = rowCounts[c] || 3;
       for (let r = 0; r < rows; r++) {
         if (grid[c][r] === 'B1' || grid[c][r] === 'S1') scatterHits++;
       }
    }

    return { spinWin, scatterHits };
  };

  for (let i = 0; i < totalSpins; i++) {

    // Keep track of the top-most draw index for each column (used for tumbling)
    
    
    let bgResult = runSpin(strips, mode === 'free_only' || !!isFreeGame);
    let totalWinForRound = bgResult.spinWin;
    
    if (bgResult.spinWin > 0) {
      winningSpins++;
      baseWinTotal += bgResult.spinWin;
    }

    if (mode === 'full_game' && freeStrips && bgResult.scatterHits >= 3) {
      freeGameTriggers++;
      let freeSpinsRemaining = 10 + (bgResult.scatterHits - 3) * 2;
      let totalFreeSpinsPlayed = 0;
      
      while (freeSpinsRemaining > 0 && totalFreeSpinsPlayed < 200) {
        freeSpinsRemaining--;
        totalFreeSpinsPlayed++;
        
        let fgResult = runSpin(freeStrips, true);
        totalWinForRound += fgResult.spinWin;
        freeWinTotal += fgResult.spinWin;
        
        if (fgResult.scatterHits >= 3) {
           freeGameRetriggers++;
           let additional = 10 + (fgResult.scatterHits - 3) * 2;
           freeSpinsRemaining += additional;
           if (totalFreeSpinsPlayed + freeSpinsRemaining > 200) {
              freeSpinsRemaining = 200 - totalFreeSpinsPlayed;
           }
        }
      }
      freeSpinsPlayedTotal += totalFreeSpinsPlayed;
    }
    
    overallWin += totalWinForRound;


    

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
          currentGrid: displayGrid.map(col => [...col]) // Send a copy
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

  const usedPaylines = effectivePaylines ? effectivePaylines.length : ((gameConfig.gameType === 'linegame' || gameConfig.gameType === 'linegame_set2') ? 20 : 0);

  self.postMessage({
    type: 'DONE',
    result: {
      overallWin,
      totalSpins,
      overallRTP,
      hitFrequency,
      symbolMetrics,
      winningSpins,
      usedPaylines,
      baseWin: baseWinTotal,
      freeWin: freeWinTotal,
      freeGameTriggers,
      freeGameRetriggers,
      freeSpinsPlayed: freeSpinsPlayedTotal
    }
  } as WorkerResponse);
};
