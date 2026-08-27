import type { PaytableRule, GameType, MultiplierInterval } from '../types';
import { evaluateGrid, getWinningPositions } from './evaluation';

function createTimeSlicer(intervalMs: number = 16) {
  let lastYield = performance.now();
  return async function yieldIfNeeded() {
    if (performance.now() - lastYield > intervalMs) {
      await new Promise(r => setTimeout(r, 0));
      lastYield = performance.now();
    }
  };
}

// 輔助：判斷是否為黃金符號（G開頭且後面跟著數字或字母）
function isGoldSymbol(sym: string): boolean {
  return /^G[1-9A-Z]/.test(sym);
}

export async function findRngForCombination(
  targetSymbol: string,
  length: number,
  wildCount: number,
  currentStrips: string[][],
  rowCounts: number[],
  currentPaytable: PaytableRule[],
  reelCount: number,
  gameType: GameType,
  topTrackerOther?: string[],
  customPaylines?: number[][],
  isFreeGame: boolean = false,
  stripSets?: Record<string, string[][]>,
  requireGoldCascade: boolean = false
): Promise<{ rng: number[] | null; isInterfered: boolean; hasS1Drop?: boolean; stripId?: number }> {
  
  if (stripSets && Object.keys(stripSets).length > 0) {
    const stripIds = Object.keys(stripSets).map(Number);
    stripIds.sort(() => Math.random() - 0.5);
    let bestInterferred: { rng: number[] | null; isInterfered: boolean; hasS1Drop?: boolean; stripId?: number } | null = null;

    for (const sid of stripIds) {
      const res = await findRngForCombination(
        targetSymbol, length, wildCount, stripSets[sid], rowCounts,
        currentPaytable, reelCount, gameType, topTrackerOther, customPaylines,
        isFreeGame, undefined, requireGoldCascade
      );
      if (res.rng) {
        if (!res.isInterfered) {
          return { ...res, rng: [...res.rng, sid], stripId: sid };
        } else {
          if (!bestInterferred) {
            bestInterferred = { ...res, rng: res.rng ? [...res.rng, sid] : null, stripId: sid };
          }
        }
      }
    }
    return bestInterferred || { rng: null, isInterfered: false };
  }

  const yieldIfNeeded = createTimeSlicer(16);
  const wildSymbolSet = new Set<string>();
  currentPaytable.filter(p => p.isWild).forEach(p => wildSymbolSet.add(p.symbolId));
  wildSymbolSet.add('WILD');
  wildSymbolSet.add('W');
  wildSymbolSet.add('WX');
  for (const strip of currentStrips) {
    if (!strip) continue;
    for (const sym of strip) {
      if (sym === 'WILD' || sym === 'W' || sym === 'WX') wildSymbolSet.add(sym);
    }
  }

  const MAX_RANDOM_ATTEMPTS = 50000;
  
  let testCount = 0;
  const candidateRng = Array(reelCount).fill(0);

  const getGridFromRng = (rng: number[], strips: string[][]) => {
    return Array.from({ length: reelCount }, (_, cIdx) => {
      const r = rowCounts[cIdx] || 3;
      const s = strips[cIdx];
      const start = rng[cIdx];
      return Array.from({ length: r }).map((_, ri) => s[(start + ri) % s.length]);
    });
  };

  const getEvalGrid = (grid: string[][]) => {
    if (gameType === 'megaway') {
      return grid.map((col, colIdx) => {
        if (colIdx >= 1 && colIdx <= 4 && topTrackerOther) {
          const topSym = (length < 5 && colIdx >= length) ? '-' : (topTrackerOther[colIdx - 1] || 'WX');
          return [...col, topSym];
        }
        return col;
      });
    }
    return grid;
  };

  let bestCandidateRng: number[] | null = null;
  let minInterferenceCount = Infinity;
  let bestTargetPresence = Infinity;

  while (testCount < MAX_RANDOM_ATTEMPTS) {
    testCount++;
    if (testCount % 200 === 0) {
      await yieldIfNeeded();
    }

    let skipDraw = false;
    for (let c = 0; c < reelCount; c++) {
      const len = currentStrips[c]?.length || 1;
      const rows = rowCounts[c] || 3;
      const maxIdx = len > rows + 2 ? len - rows : 0;
      let chosenIdx = 0;
      if (maxIdx <= 2) {
        chosenIdx = Math.floor(Math.random() * len);
      } else {
        chosenIdx = Math.floor(Math.random() * (maxIdx - 2 + 1)) + 2;
      }
      candidateRng[c] = chosenIdx;
      
      let hasB1 = false;
      for (let r = 0; r < rows; r++) {
         if (currentStrips[c][(chosenIdx + r) % len] === 'B1') {
             hasB1 = true;
         }
      }
      if (hasB1) {
          skipDraw = true;
          break;
      }
    }
    
    if (skipDraw) continue;

    const initialGrid = getGridFromRng(candidateRng, currentStrips);
    const initialEvalGrid = getEvalGrid(initialGrid);
    const initialWins = evaluateGrid(initialEvalGrid, currentPaytable, gameType, customPaylines, true);
    
    if (requireGoldCascade) {
       // Mode B
       const initialTargetWin = initialWins.find(w => w.symbolId === targetSymbol);
       if (initialTargetWin && initialTargetWin.matchCount >= length) {
           continue; 
       }
       
       let hasGoldWin = false;
       const winningCoordsMap = getWinningPositions(initialEvalGrid, initialWins, currentPaytable, gameType, undefined, customPaylines);
       
       const eliminatedRowsMap: Record<number, number[]> = {};
       let initialTargetPresence = 0;
       
       // Count gold wins. We want a gold win, but we ALSO want to penalize non-gold wins in the initial grid to make it "cleaner".
       let nonGoldWinCount = 0;
       
       for (const win of initialWins) {
          if (win.payout > 0) {
             let thisWinHasGold = false;
             // Check if this specific win uses a gold symbol
             const winPositions = getWinningPositions(initialEvalGrid, [win], currentPaytable, gameType, undefined, customPaylines);
             for (let c = 0; c < reelCount; c++) {
                 if (winPositions.has(`${c}-0`) || winPositions.has(`${c}-1`) || winPositions.has(`${c}-2`) || winPositions.has(`${c}-3`) || winPositions.has(`${c}-4`) || winPositions.has(`${c}-5`)) {
                     const rows = rowCounts[c] || 3;
                     for (let r = 0; r < rows; r++) {
                         if (winPositions.has(`${c}-${r}`) && isGoldSymbol(initialEvalGrid[c][r])) {
                             thisWinHasGold = true;
                         }
                     }
                 }
             }
             if (!thisWinHasGold) {
                nonGoldWinCount++;
             }
          }
       }

       for (let c = 0; c < reelCount; c++) {
           const rows = rowCounts[c] || 3;
           eliminatedRowsMap[c] = [];
           for (let r = 0; r < rows; r++) {
               if (winningCoordsMap.has(`${c}-${r}`)) {
                   const winIndices = winningCoordsMap.get(`${c}-${r}`);
                   if (winIndices && winIndices.some(idx => idx !== 999)) {
                       eliminatedRowsMap[c].push(r);
                       if (isGoldSymbol(initialEvalGrid[c][r])) {
                           hasGoldWin = true;
                       }
                   }
               }
               // Try to keep initial grid free of target symbol to avoid the "M1+M1+M3" look
               if (initialEvalGrid[c][r] === targetSymbol) {
                   initialTargetPresence++;
               }
           }
       }
       
       if (!hasGoldWin) continue; 
       
       let nextGrid = initialGrid.map(col => [...col]);
       let drawIndices = [...candidateRng].map(idx => idx - 1);
       
       for (let c = 0; c < reelCount; c++) {
           const strip = currentStrips[c];
           const eliminatedRows = eliminatedRowsMap[c];
           if (eliminatedRows.length > 0) {
               eliminatedRows.sort((a, b) => b - a);
               for (const r of eliminatedRows) {
                   if (isGoldSymbol(nextGrid[c][r])) {
                       nextGrid[c][r] = 'WX';
                   } else {
                       const len = strip.length;
                       const drawIdx = (((drawIndices[c] % len) + len) % len);
                       nextGrid[c][r] = strip[drawIdx];
                       drawIndices[c]--;
                   }
               }
           }
       }
       
       const nextEvalGrid = getEvalGrid(nextGrid);
       const nextWins = evaluateGrid(nextEvalGrid, currentPaytable, gameType, customPaylines, true);
       const targetWin = nextWins.find(w => w.symbolId === targetSymbol);
       
       if (targetWin && targetWin.matchCount === length && (gameType.includes('waygame') || targetWin.ways === 1)) {
           const nextOtherWinsCount = nextWins.filter(w => w.symbolId !== targetSymbol && !wildSymbolSet.has(w.symbolId) && w.payout > 0).length;
           
           // Total interference is the extra wins on first grid PLUS extra wins on second grid
           const totalInterference = nonGoldWinCount + nextOtherWinsCount;

           if (totalInterference === 0 && initialTargetPresence === 0) {
               return { rng: [...candidateRng], isInterfered: false };
           }

           if (totalInterference < minInterferenceCount || (totalInterference === minInterferenceCount && initialTargetPresence < bestTargetPresence)) {
               minInterferenceCount = totalInterference;
               bestTargetPresence = initialTargetPresence;
               bestCandidateRng = [...candidateRng];
           }
       }
       
    } else {
       // Mode A
       const targetWin = initialWins.find(w => w.symbolId === targetSymbol);
       if (targetWin && targetWin.matchCount === length && (gameType.includes('waygame') || targetWin.ways === 1)) {
           const winningCoordsMap = getWinningPositions(initialEvalGrid, [targetWin], currentPaytable, gameType, undefined, customPaylines);
           const wildReels = new Set<number>();
           let hasGoldInWin = false;
           for (const key of winningCoordsMap.keys()) {
               const [cStr, rStr] = key.split('-');
               const col = parseInt(cStr, 10);
               const row = parseInt(rStr, 10);
               const sym = initialEvalGrid[col][row];
               if (wildSymbolSet.has(sym)) {
                   wildReels.add(col);
               }
               if (isGoldSymbol(sym)) {
                   hasGoldInWin = true;
               }
           }
           
           if (!hasGoldInWin && wildReels.size === wildCount) {
               const otherWinsCount = initialWins.filter(w => w.symbolId !== targetSymbol && !wildSymbolSet.has(w.symbolId) && w.payout > 0).length;
               
               if (otherWinsCount === 0) {
                   return { rng: [...candidateRng], isInterfered: false };
               }

               if (otherWinsCount < minInterferenceCount) {
                   minInterferenceCount = otherWinsCount;
                   bestCandidateRng = [...candidateRng];
               }
           }
       }
    }
  }

  if (bestCandidateRng) {
      return { rng: bestCandidateRng, isInterfered: minInterferenceCount > 0 };
  }

  return { rng: null, isInterfered: false };
}


export async function findRngForCombos(
  currentStrips: string[][],
  rowCounts: number[],
  currentPaytable: PaytableRule[],
  reelCount: number,
  gameType: GameType,
  topTrackerOther?: string[],
  customPaylines?: number[][],
  isFreeGame: boolean = false,
  _stripSets?: Record<string, string[][]>
): Promise<(number[] | null)[]> {
  // Line games do not cascade
  if (gameType === 'linegame' || gameType === 'linegame_set2') {
    return [];
  }

  const results: (number[] | null)[] = [];
  const ATTEMPTS = 10000;
  const yieldIfNeeded = createTimeSlicer(16);
  
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (attempt % 200 === 0) await yieldIfNeeded();
    
    const candidateRng = Array(reelCount).fill(0).map((_, c) => {
      const len = currentStrips[c]?.length || 1;
      const rows = rowCounts[c] || 3;
      const minIdx = 2;
      const maxIdx = len > rows + 2 ? len - rows : 0;
      if (maxIdx <= minIdx) return Math.floor(Math.random() * len);
      return Math.floor(Math.random() * (maxIdx - minIdx + 1)) + minIdx;
    });
    
    let currentGrid = candidateRng.map((start, cIdx) => {
      const r = rowCounts[cIdx] || 3;
      const s = currentStrips[cIdx] || ['-'];
      return Array.from({ length: r }).map((_, ri) => s[(start + ri) % s.length]);
    });
    
    let drawIndices = [...candidateRng].map(idx => idx - 1);
    let cascadeCount = 0;
    
    while (cascadeCount < 20) {
      let evalGrid = currentGrid;
      if (gameType === 'megaway' && topTrackerOther) {
        evalGrid = currentGrid.map((col, colIdx) => {
          if (colIdx >= 1 && colIdx <= 4) {
             const topSym = topTrackerOther[colIdx - 1] || 'WX';
             return [...col, topSym];
          }
          return col;
        });
      }
      
      const simWins = evaluateGrid(evalGrid, currentPaytable, gameType, customPaylines, false);
      const cascadeWins = simWins.filter(w => w.payout > 0);
      
      if (cascadeCount > 0 && simWins.some(w => w.symbolId === 'B1' && w.matchCount >= 6)) {
        cascadeCount = 0; // Invalidate this combo as it enters Free Game
        break;
      }
      
      if (cascadeWins.length === 0) break;
      
      const winningCoordsMap = getWinningPositions(evalGrid, cascadeWins, currentPaytable, gameType, undefined, customPaylines);
      let hasElimination = false;
      
      for (let c = 0; c < reelCount; c++) {
        const strip = currentStrips[c];
        const rows = rowCounts[c] || 3;
        const eliminatedRows: number[] = [];
        for (let r = 0; r < rows; r++) {
          if (winningCoordsMap.has(`${c}-${r}`)) {
            if (gameType === 'waygame_qin' && isFreeGame && currentGrid[c][r] === 'S1') continue;
            const winIndices = winningCoordsMap.get(`${c}-${r}`);
            if (winIndices && winIndices.some(idx => idx !== 999)) {
              eliminatedRows.push(r);
            }
          }
        }
        
        if (eliminatedRows.length > 0) {
          hasElimination = true;
          eliminatedRows.sort((a, b) => b - a);
          for (const r of eliminatedRows) {
            if (gameType === 'payanywhere_set2') {
              for (let shift = r; shift > 0; shift--) {
                currentGrid[c][shift] = currentGrid[c][shift - 1];
              }
              const len = strip.length;
              const drawIdx = (((drawIndices[c] % len) + len) % len);
              currentGrid[c][0] = strip[drawIdx];
              drawIndices[c]--;
            } else if (isGoldSymbol(currentGrid[c][r])) {
              // 黃金符號消除後原地轉為 WX
              currentGrid[c][r] = 'WX';
            } else {
              const len = strip.length;
              const drawIdx = (((drawIndices[c] % len) + len) % len);
              currentGrid[c][r] = strip[drawIdx];
              drawIndices[c]--;
            }
          }
        }
      }
      
      if (!hasElimination) break;
      cascadeCount++;
    }
    
    if (cascadeCount > 0) {
      while (results.length < cascadeCount) {
        results.push(null);
      }
      if (results[cascadeCount - 1] === null) {
        results[cascadeCount - 1] = candidateRng;
      }
    }
  }
  
  return results;
}

export async function findRngForMultiplierIntervals(
  intervals: MultiplierInterval[],
  bet: number,
  currentStrips: string[][],
  rowCounts: number[],
  currentPaytable: PaytableRule[],
  reelCount: number,
  gameType: GameType,
  topTrackerOther?: string[],
  customPaylines?: number[][],
  isFreeGame: boolean = false,
  _stripSets?: Record<string, string[][]>
): Promise<Record<string, number[]>> {
  const results: Record<string, number[]> = {};
  const targets = new Set(intervals.map(i => i.id));
  const hasCascade = gameType !== 'linegame' && gameType !== 'linegame_set2';
  const ATTEMPTS = 35000;
  const yieldIfNeeded = createTimeSlicer(16);

  // Pre-calculate top-paying non-scatter symbols and wilds for guided sampling
  const topSymbols = currentPaytable
    .filter(p => !p.isScatter && p.payouts && Object.values(p.payouts).some(v => v > 0))
    .sort((a, b) => {
      const maxA = Math.max(...Object.values(a.payouts || {}));
      const maxB = Math.max(...Object.values(b.payouts || {}));
      return maxB - maxA;
    });
  
  // For each reel, map rowIndex -> stopIndices where top symbol or wild lands on that specific row
  const topSymbolStopsByRow: Record<number, number[]>[] = [];
  if (topSymbols.length > 0) {
    const highSymIds = new Set([topSymbols[0].symbolId, topSymbols[1]?.symbolId, 'WX', 'WILD', 'W'].filter(Boolean));
    for (let c = 0; c < reelCount; c++) {
      const strip = currentStrips[c] || [];
      const rows = rowCounts[c] || 3;
      const rowMap: Record<number, number[]> = {};
      for (let r = 0; r < rows; r++) rowMap[r] = [];
      for (let i = 0; i < strip.length; i++) {
        for (let r = 0; r < rows; r++) {
          if (highSymIds.has(strip[(i + r) % strip.length])) {
            rowMap[r].push(i);
          }
        }
      }
      topSymbolStopsByRow.push(rowMap);
    }
  }

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (targets.size === 0) break;
    if (attempt % 200 === 0) await yieldIfNeeded();

    // Check if remaining targets are only high multipliers (min >= 30) and we've done some initial random attempts
    const remainingIntervals = intervals.filter(i => targets.has(i.id));
    const onlyHighRemaining = remainingIntervals.every(i => i.min >= 30);
    const useGuided = (attempt > 1000 && onlyHighRemaining) || (attempt > 4000 && Math.random() < 0.6);
    const alignRow = Math.floor(Math.random() * 3);

    const candidateRng = Array(reelCount).fill(0).map((_, c) => {
      const len = currentStrips[c]?.length || 1;
      const rows = rowCounts[c] || 3;
      const minIdx = 2;
      const maxIdx = len > rows + 2 ? len - rows : 0;
      
      if (useGuided && topSymbolStopsByRow[c] && topSymbolStopsByRow[c][alignRow] && topSymbolStopsByRow[c][alignRow].length > 0 && Math.random() < 0.85) {
        const list = topSymbolStopsByRow[c][alignRow];
        return list[Math.floor(Math.random() * list.length)];
      }

      if (maxIdx <= minIdx) return Math.floor(Math.random() * len);
      return Math.floor(Math.random() * (maxIdx - minIdx + 1)) + minIdx;
    });
    
    let currentGrid = candidateRng.map((start, cIdx) => {
      const r = rowCounts[cIdx] || 3;
      const s = currentStrips[cIdx] || ['-'];
      return Array.from({ length: r }).map((_, ri) => s[(start + ri) % s.length]);
    });

    let totalPayout = 0;

    if (!hasCascade) {
      // Fast path for linegame / linegame_set2 (no cascade/elimination needed)
      const config = { gameType, paylines: customPaylines, effectiveBet: bet };
      const simWins = evaluateGrid(currentGrid, currentPaytable, config as any, undefined, false);
      for (let i = 0; i < simWins.length; i++) {
        totalPayout += (simWins[i].totalWin || simWins[i].payout || 0);
      }
    } else {
      // Cascade path for games with tumble
      let drawIndices = [...candidateRng].map(idx => idx - 1);
      let cascadeCount = 0;
      let b1Count = 0;

      while (cascadeCount < 20) {
        let evalGrid = currentGrid;
        if (gameType === 'megaway' && topTrackerOther) {
          evalGrid = currentGrid.map((col, colIdx) => {
            if (colIdx >= 1 && colIdx <= 4) {
               const topSym = topTrackerOther[colIdx - 1] || 'WX';
               return [...col, topSym];
            }
            return col;
          });
        }
        
        const config = { gameType, paylines: customPaylines, effectiveBet: bet };
        const simWins = evaluateGrid(evalGrid, currentPaytable, config as any, undefined, false);
        const cascadeWins = simWins.filter(w => w.payout > 0);
        
        let cascadePayout = 0;
        let cascadeMultiplier = 1;
        if (gameType === 'waygame' || gameType === 'waygame_qin') {
          // Waygame cascade multiplier: 1, 2, 4, 8, ... (free game starts at 8)
          cascadeMultiplier = isFreeGame
            ? Math.pow(2, Math.min(3 + cascadeCount, 10))
            : Math.pow(2, Math.min(cascadeCount, 10));
        }
        for (const w of cascadeWins) cascadePayout += (w.totalWin || w.payout || 0);
        totalPayout += cascadePayout * cascadeMultiplier;

        const b1Win = simWins.find(w => w.symbolId === 'B1');
        if (b1Win) b1Count = Math.max(b1Count, b1Win.matchCount);

        if (cascadeWins.length === 0) break;
        
        const winningCoordsMap = getWinningPositions(evalGrid, cascadeWins, currentPaytable, gameType, undefined, customPaylines);
        let hasElimination = false;
        
        for (let c = 0; c < reelCount; c++) {
          const strip = currentStrips[c];
          const rows = rowCounts[c] || 3;
          const eliminatedRows: number[] = [];
          for (let r = 0; r < rows; r++) {
            if (winningCoordsMap.has(`${c}-${r}`)) {
              if (gameType === 'waygame_qin' && isFreeGame && currentGrid[c][r] === 'S1') continue;
              const winIndices = winningCoordsMap.get(`${c}-${r}`);
              if (winIndices && winIndices.some(idx => idx !== 999)) {
                eliminatedRows.push(r);
              }
            }
          }
          
          if (eliminatedRows.length > 0) {
            hasElimination = true;
            eliminatedRows.sort((a, b) => b - a);
            for (const r of eliminatedRows) {
              if (gameType === 'payanywhere_set2') {
                for (let shift = r; shift > 0; shift--) {
                  currentGrid[c][shift] = currentGrid[c][shift - 1];
                }
                const len = strip.length;
                const drawIdx = (((drawIndices[c] % len) + len) % len);
                currentGrid[c][0] = strip[drawIdx];
                drawIndices[c]--;
              } else if (isGoldSymbol(currentGrid[c][r])) {
                // 黃金符號消除後原地轉為 WX
                currentGrid[c][r] = 'WX';
              } else {
                const len = strip.length;
                const drawIdx = (((drawIndices[c] % len) + len) % len);
                currentGrid[c][r] = strip[drawIdx];
                drawIndices[c]--;
              }
            }
          }
        }
        
        if (!hasElimination) break;
        cascadeCount++;
      }

      if (!isFreeGame && b1Count >= 6) {
        continue;
      }
    }

    const multiplier = totalPayout / (bet || 1);

    for (const interval of intervals) {
      if (targets.has(interval.id)) {
        const maxVal = interval.max ?? Infinity;
        if (multiplier >= interval.min && multiplier < maxVal) {
          results[interval.id] = [...candidateRng];
          targets.delete(interval.id);
        }
      }
    }
  }

  return results;
}
