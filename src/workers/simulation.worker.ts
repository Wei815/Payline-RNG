import type { PaytableRule, ReelStrips, SymbolMetric, GameConfig } from '../types';
import { evaluateGrid, getWinningPositions, isEliminatedCell } from '../utils/evaluation';
import { getTraits } from '../games/registry';
import { GameRegistry } from '../core/GameRegistry';
import type { AbstractGame } from '../games/base/AbstractGame';
import type { IGameEnvironment } from '../games/base/IGameEnvironment';

export type WorkerMessageData = {
  mode?: 'base_only' | 'free_only' | 'full_game';
  strips: ReelStrips;
  freeStrips?: ReelStrips;
  /** 主遊戲 / 免遊的所有滾輪表組（遞補依 Combo 輪替滾輪表的遊戲需要，例：羅馬） */
  stripSets?: ReelStrips[];
  freeStripSets?: ReelStrips[];
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
/** 單次旋轉最多掉落次數（安全上限，避免盤面循環時卡死 Worker） */
const MAX_CASCADES = 100;

self.onmessage = (e: MessageEvent<WorkerMessageData>) => {
  const { mode = 'base_only', strips, freeStrips, stripSets, freeStripSets, paytable, totalSpins, rowCounts, gameConfig, coin, bet, isFreeGame } = e.data;
  
  const traits = getTraits(gameConfig.gameType);
  const game = GameRegistry.tryGetGame(gameConfig.gameType) as (AbstractGame & IGameEnvironment) | undefined;

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
    const isMegawayTop = traits.family === 'megaway' && c >= 1 && c <= 4;
    grid[c] = new Array(rows + (isMegawayTop ? 1 : 0)).fill('0');
  }

  const displayGrid: string[][] = new Array(maxCols);
  for (let c = 0; c < maxCols; c++) {
    const rows = rowCounts[c] || 3;
    displayGrid[c] = new Array(rows).fill('0');
  }

  const effectivePaylines = gameConfig.paylines;
  let lastReportTime = performance.now();
  const drawIndices: number[] = new Array(maxCols);

  const runSpin = (spinStrips: import('../types').ReelStrips, isFG: boolean) => {
    // 遞補由遊戲決定的遊戲（羅馬）：初始盤固定使用第 0 組滾輪表（Combo 0）
    const sets = isFG ? freeStripSets : stripSets;
    const currentStrips = game?.simulateRefill && sets && sets.length > 0 ? sets[0] : spinStrips;
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
      
      if (traits.family === 'megaway' && colIndex >= 1 && colIndex <= 4) {
        if (!strip || strip.length === 0) {
          grid[colIndex][writeIdx] = 'WX';
        } else {
          grid[colIndex][writeIdx] = strip[Math.floor(Math.random() * strip.length)];
        }
      }
    }

    let spinWin = 0;
    let keepCascading = true;
    let cascadeCount = 0;
    let scatterHits = 0;

    while (keepCascading) {
      const wins = evaluateGrid(grid, paytable, gameConfig, effectivePaylines);
      
      if (wins.length === 0) break;
      
      // 連續掉落倍數：traits.doublingTumbleMultiplier 的遊戲用遊戲類別的倍數（1、2、4、8…，免遊 8 起跳）
      const tumbleMultiplier = traits.doublingTumbleMultiplier && game ? game.getTumbleMultiplier(cascadeCount, isFG) : 1;
      
      let cascadeWin = 0;
      for (let wIdx = 0; wIdx < wins.length; wIdx++) {
        const win = wins[wIdx];
        const multipliedWin = win.totalWin * tumbleMultiplier;
        cascadeWin += multipliedWin;

        const metric = symbolMetrics[win.symbolId];
        if (metric) {
          metric.totalPayout += multipliedWin;

          if (traits.family === 'payanywhere') {
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

      if (traits.simulationCascade && game && cascadeWin > 0) {
        // 掉落改用遊戲類別的規則（與測案 Win=、搜尋引擎同一套）：
        // 不可消除符號、金框轉 WX（皇家金象只限第 3、4 軸）、平移掉落（決戰賽特2）都由遊戲決定
        // 曾經 Worker 自寫一套：中獎格原地換成滾輪表上一格、金框不分軸轉 WX、不可消除只看 S1 且只在免遊
        const winningCoordsMap = getWinningPositions(grid, wins, paytable, gameConfig.gameType, undefined, effectivePaylines);
        if (game.simulateRefill) {
          const next = game.simulateRefill(grid, winningCoordsMap, cascadeCount + 1, { stripSets: sets, fallbackStrips: currentStrips, rowCounts });
          for (let c = 0; c < grid.length; c++) grid[c] = next[c];
          cascadeCount++;
          if (cascadeCount >= MAX_CASCADES) keepCascading = false;
          continue;
        }
        const unremovable = gameConfig.specialRules?.unremovableSymbols || [];
        let eliminated = false;
        for (let colIndex = 0; colIndex < grid.length; colIndex++) {
          const strip = currentStrips[colIndex];
          if (!strip || strip.length === 0) continue;
          const rows: number[] = [];
          for (let r = 0; r < (rowCounts[colIndex] || 3); r++) {
            const sym = grid[colIndex][r];
            if (!isEliminatedCell(winningCoordsMap, `${colIndex}-${r}`)) continue;
            if (game.isSymbolUnremovable(sym, isFG) || (isFG && unremovable.includes(sym))) continue;
            rows.push(r);
          }
          if (rows.length > 0) {
            game.applyCascade(grid, colIndex, rows, strip, drawIndices, isFG, gameConfig.gameType);
            eliminated = true;
          }
        }
        // 全部中獎格都不可消除（例如免遊中的 S1）時盤面不變，再評估只會重複同樣的贏分
        if (!eliminated) keepCascading = false;
      } else {
        keepCascading = false;
      }
      
      cascadeCount++;
      if (cascadeCount >= MAX_CASCADES) keepCascading = false;
    }
    
    for (let c = 0; c < grid.length; c++) {
       const rows = rowCounts[c] || 3;
       for (let r = 0; r < rows; r++) {
         if (grid[c][r] === 'B1' || grid[c][r] === 'S1') scatterHits++;
       }
    }

    return { spinWin, scatterHits, cascades: cascadeCount };
  };

  for (let i = 0; i < totalSpins; i++) {

    // Keep track of the top-most draw index for each column (used for tumbling)
    
    
    const bgResult = runSpin(strips, mode === 'free_only' || !!isFreeGame);
    let totalWinForRound = bgResult.spinWin;
    
    if (bgResult.spinWin > 0) {
      winningSpins++;
      baseWinTotal += bgResult.spinWin;
    }

    // 依連續消除次數給免遊的遊戲（羅馬，無 Retrigger）
    const comboFreeSpins = mode === 'full_game' && game?.getFreeSpinsByCombo ? game.getFreeSpinsByCombo(bgResult.cascades) : 0;
    if (comboFreeSpins > 0 && freeStrips) {
      freeGameTriggers++;
      for (let f = 0; f < comboFreeSpins; f++) {
        const fgResult = runSpin(freeStrips, true);
        totalWinForRound += fgResult.spinWin;
        freeWinTotal += fgResult.spinWin;
      }
      freeSpinsPlayedTotal += comboFreeSpins;
    } else if (mode === 'full_game' && freeStrips && !game?.getFreeSpinsByCombo && bgResult.scatterHits >= 3) {
      freeGameTriggers++;
      let freeSpinsRemaining = 10 + (bgResult.scatterHits - 3) * 2;
      let totalFreeSpinsPlayed = 0;
      
      while (freeSpinsRemaining > 0 && totalFreeSpinsPlayed < 200) {
        freeSpinsRemaining--;
        totalFreeSpinsPlayed++;
        
        const fgResult = runSpin(freeStrips, true);
        totalWinForRound += fgResult.spinWin;
        freeWinTotal += fgResult.spinWin;
        
        if (fgResult.scatterHits >= 3) {
           freeGameRetriggers++;
           const additional = 10 + (fgResult.scatterHits - 3) * 2;
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

  const usedPaylines = effectivePaylines ? effectivePaylines.length : (traits.family === 'line' ? 20 : 0);

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
