import type { PaytableRule, GameType } from '../types';
import { evaluateGrid, getWinningPositions } from './evaluation';

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
  isFreeGame: boolean = false
): Promise<{ rng: number[] | null; isInterfered: boolean; hasS1Drop?: boolean }> {
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

  const categories: {
    onlyOneTarget: number[];
    onlyOneWild: number[];
    anyTarget: number[];
    anyWild: number[];
    none: number[];
    preferredIndices: Set<number>;
  }[] = [];

  for (let col = 0; col < reelCount; col++) {
    const strip = currentStrips[col];
    const rows = rowCounts[col] || 3;
    const onlyOneTarget: number[] = [];
    const onlyOneWild: number[] = [];
    const anyTarget: number[] = [];
    const anyWild: number[] = [];
    const none: number[] = [];
    const preferredIndices = new Set<number>();

    if (!strip || strip.length === 0) {
      categories.push({ onlyOneTarget: [], onlyOneWild: [], anyTarget: [], anyWild: [], none: [], preferredIndices: new Set() });
      continue;
    }

    const maxIdx = strip.length - rows;
    // Start at 2 to reserve space for drops, end at maxIdx to prevent wrap around
    for (let i = 2; i <= maxIdx; i++) {
      const visible: string[] = [];
      for (let r = 0; r < rows; r++) {
        visible.push(strip[(i + r) % strip.length]);
      }

      const tCount = visible.filter(s => s === targetSymbol).length;
      const wCount = visible.filter(s => wildSymbolSet.has(s)).length;
      const preferredRow = 0; 
      const preferredSym = visible[preferredRow];
      const wPreferred = wildSymbolSet.has(preferredSym);
      const tPreferred = preferredSym === targetSymbol;

      if (tPreferred) preferredIndices.add(i);
      if (wPreferred) preferredIndices.add(i);

      if (tCount === 1 && wCount === 0) {
        onlyOneTarget.push(i);
      } else if (tCount === 0 && wCount === 1) {
        onlyOneWild.push(i);
      } else if (tCount === 0 && wCount === 0) {
        none.push(i);
      }

      if (tCount > 0) anyTarget.push(i);
      if (wCount > 0) anyWild.push(i);
    }
    categories.push({ onlyOneTarget, onlyOneWild, anyTarget, anyWild, none, preferredIndices });
  }

  const wildColCombinations: number[][] = [];
  if (wildCount === 0) {
    wildColCombinations.push([]);
  } else {
    for (let col = 1; col < length; col++) {
      wildColCombinations.push([col]);
    }
  }

  const runSearch = async (allowOtherWins: boolean): Promise<{ rng: number[] | null; hasS1Drop?: boolean } | null> => {
    let bestCandidate: number[] | null = null;
    let minScore = Infinity;
    let bestDist = Infinity;
    let bestWildColIdx = Infinity;
    let bestHasS1Drop = false;

    const MAX_RANDOM_ATTEMPTS = allowOtherWins ? 1000 : 3000;

    for (const wildCols of wildColCombinations) {
      const isWildCol = Array(length).fill(false);
      for (const c of wildCols) isWildCol[c] = true;

      const currentWildColIdx = wildCols[0] !== undefined ? wildCols[0] : Infinity;

      // Precompute candidates for each column
      const validCandidates: number[][] = [];
      let hasEmptyCandidate = false;
      for (let colIndex = 0; colIndex < reelCount; colIndex++) {
        let candidates: number[] = [];
        if (colIndex < length) {
          if (isWildCol[colIndex]) {
            candidates = categories[colIndex].onlyOneWild;
            if (candidates.length === 0) candidates = categories[colIndex].anyWild;
          } else {
            candidates = categories[colIndex].onlyOneTarget;
            if (allowOtherWins && candidates.length === 0) candidates = categories[colIndex].anyTarget;
          }
        } else {
          candidates = categories[colIndex].none;
        }

        if (candidates.length === 0) {
          if (allowOtherWins) {
            const maxSafeIdx = currentStrips[colIndex].length - (rowCounts[colIndex] || 3);
            candidates = Array.from({ length: maxSafeIdx - 1 }, (_, idx) => idx + 2);
          } else {
            hasEmptyCandidate = true;
            break;
          }
        }
        validCandidates.push(candidates);
      }

      if (hasEmptyCandidate) continue;

      let testCount = 0;
      const candidateRng = Array(reelCount).fill(0);

      while (testCount < MAX_RANDOM_ATTEMPTS) {
        testCount++;
        if (testCount % 500 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }



        let activeInterferences = new Set<string>();
        let r0HasWild = false;
        let r1HasWild = false;

        for (let c = 0; c < reelCount; c++) {
          let cands = validCandidates[c];
          // Smart heuristic: prevent 3-of-a-kind interference wins early!
          if (!allowOtherWins && c === 2) {
             const safeCands = cands.filter(idx => {
                const strip = currentStrips[c];
                const rows = rowCounts[c] || 3;
                let hasWild = false;
                let hasOverlap = false;
                
                for (let r = 0; r < rows; r++) {
                   const sym = strip[(idx + r) % strip.length];
                   if (wildSymbolSet.has(sym)) hasWild = true;
                   if (activeInterferences.has(sym)) hasOverlap = true;
                }
                
                // If this reel has a Wildcard, it will complete ANY active interference chain
                if (hasWild && activeInterferences.size > 0) return false;
                // If this reel contains a symbol that is already in an active chain
                if (hasOverlap) return false;
                
                return true;
             });
             
             // Fallback to all candidates if safeCands is empty to prevent infinite loops
             if (safeCands.length > 0) cands = safeCands;
          }

          const pref = cands.filter(x => categories[c].preferredIndices.has(x));
          let chosenIdx = 0;
          if (pref.length > 0 && Math.random() < 0.8) {
            chosenIdx = pref[Math.floor(Math.random() * pref.length)];
          } else {
            chosenIdx = cands[Math.floor(Math.random() * cands.length)];
          }
          candidateRng[c] = chosenIdx;

          // Update activeInterferences
          if (!allowOtherWins && c <= 1) {
             const strip = currentStrips[c];
             const rows = rowCounts[c] || 3;
             const currentSyms = new Set<string>();
             let hasWild = false;
             for (let r = 0; r < rows; r++) {
                const sym = strip[(chosenIdx + r) % strip.length];
                if (wildSymbolSet.has(sym)) hasWild = true;
                if (sym !== targetSymbol && !wildSymbolSet.has(sym)) {
                   currentSyms.add(sym);
                }
             }
             
             if (c === 0) {
                 activeInterferences = currentSyms;
                 r0HasWild = hasWild;
             } else if (c === 1) {
                 r1HasWild = hasWild;
                 const newActive = new Set<string>();
                 
                 for (const sym of currentSyms) {
                     if (activeInterferences.has(sym) || r0HasWild) {
                         newActive.add(sym);
                     }
                 }
                 if (r1HasWild) {
                     for (const sym of activeInterferences) {
                         newActive.add(sym);
                     }
                 }
                 
                 activeInterferences = newActive;
             }
          }
        }

        const testGrid = Array.from({ length: reelCount }, (_, cIdx) => {
          const r = rowCounts[cIdx] || 3;
          const s = currentStrips[cIdx];
          const start = candidateRng[cIdx];
          return Array.from({ length: r }).map((_, ri) => s[(start + ri) % s.length]);
        });

        let evalGrid = testGrid;
        if (gameType === 'megaway') {
          evalGrid = testGrid.map((col, colIdx) => {
            if (colIdx >= 1 && colIdx <= 4 && topTrackerOther) {
              const topSym = (length < 5 && colIdx >= length)
                ? '-'
                : (topTrackerOther[colIdx - 1] || 'WX');
              return [...col, topSym];
            }
            return col;
          });
        }

        const evWins = evaluateGrid(evalGrid, currentPaytable, gameType, customPaylines, true);
        const targetWin = evWins.find(w => w.symbolId === targetSymbol);
        let isMatch = false;
        let ways = 1;
        if (targetWin) {
          isMatch = (targetWin.matchCount >= length);
          
          if (isMatch) {
            const winningCoordsMap = getWinningPositions(evalGrid, [targetWin], currentPaytable, gameType, undefined, customPaylines);
            const wildReels = new Set<number>();
            
            for (const key of winningCoordsMap.keys()) {
               const [cStr, rStr] = key.split('-');
               const col = parseInt(cStr, 10);
               const row = parseInt(rStr, 10);
               if (wildSymbolSet.has(evalGrid[col][row])) {
                   wildReels.add(col);
               }
            }
            if (wildReels.size !== wildCount) {
               isMatch = false;
            }
          }

          ways = targetWin.ways;
        }

        let hasS1DropFlag = false;
        if (gameType === 'waygame_qin') {
          if (evWins.some(w => w.symbolId === 'B1' && w.matchCount >= 5)) {
            if (targetSymbol !== 'B1' || length < 5) {
              isMatch = false;
            }
          }

          if (isFreeGame && testGrid.some(col => col.includes('S1'))) {
            hasS1DropFlag = true;
            if (!allowOtherWins) isMatch = false;
          }

          if (isMatch) {
            let currentGrid = testGrid.map(col => [...col]);
            let drawIndices = [...candidateRng].map(idx => idx - 1);
            let simWins = [...evWins];
            let cascadeSafe = true;
            let cascadeCount = 0;

            while (cascadeCount < 10) {
              const cascadeWins = simWins.filter(w => w.payout > 0);
              
              if (cascadeCount > 0 && simWins.some(w => w.symbolId === 'B1' && w.matchCount >= 6)) {
                isMatch = false; // Invalidate this RNG as it enters Free Game during cascade
                break;
              }

              if (cascadeWins.length === 0) break;

              const winningCoordsMap = getWinningPositions(currentGrid, cascadeWins, currentPaytable, gameType);
              let hasElimination = false;

              for (let c = 0; c < reelCount; c++) {
                const strip = currentStrips[c];
                const rows = rowCounts[c] || 3;
                const eliminatedRows: number[] = [];
                for (let r = 0; r < rows; r++) {
                  if (winningCoordsMap.has(`${c}-${r}`)) {
                    if (isFreeGame && currentGrid[c][r] === 'S1') continue;
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
                    const len = strip.length;
                    const drawIdx = (((drawIndices[c] % len) + len) % len);
                    currentGrid[c][r] = strip[drawIdx];
                    drawIndices[c]--;
                  }
                }
              }

              if (!hasElimination) break;

              simWins = evaluateGrid(currentGrid, currentPaytable, gameType, customPaylines, true);
              if (simWins.some(w => w.symbolId === 'B1' && w.matchCount >= 5)) {
                if (targetSymbol !== 'B1' || length < 5) {
                  cascadeSafe = false;
                  break;
                }
              }
              cascadeCount++;
            }

            if (isFreeGame && currentGrid.some(col => col.includes('S1'))) {
              hasS1DropFlag = true;
              if (!allowOtherWins) cascadeSafe = false;
            }

            if (!cascadeSafe) {
              isMatch = false;
            }
          }
        }

        if (!isMatch) continue;

        const otherWinsCount = evWins.filter(w => {
          if (w.symbolId === targetSymbol || wildSymbolSet.has(w.symbolId)) return false;
          if (w.payout > 0) return true;
          if ((w.symbolId.startsWith('S') || w.symbolId.startsWith('B')) && w.matchCount >= 3) return true;
          return false;
        }).length;

        if (!allowOtherWins) {
          if (otherWinsCount === 0 && ways === 1 && !hasS1DropFlag) {
            return { rng: [...candidateRng], hasS1Drop: false };
          }
        } else {
          let score = (ways - 1) * 10 + otherWinsCount * 20 + (hasS1DropFlag ? 1000 : 0);

          let totalDist = 0;
          for (let c = 0; c < reelCount; c++) {
            const stripLen = currentStrips[c].length;
            const idx = candidateRng[c];
            const rows = rowCounts[c] || 3;
            let minD = Infinity;
            
            for (let r = 0; r < rows; r++) {
              const sym = currentStrips[c][(idx + r) % stripLen];
              if (sym === targetSymbol || wildSymbolSet.has(sym)) {
                const dist = Math.abs(r - 0);
                if (dist < minD) minD = dist;
              }
            }
            totalDist += (minD === Infinity ? 0 : minD);
          }

          score += totalDist;

          if (score < minScore) {
            minScore = score;
            bestCandidate = [...candidateRng];
            bestDist = totalDist;
            bestWildColIdx = currentWildColIdx;
            bestHasS1Drop = hasS1DropFlag;
          } else if (score === minScore) {
            if (currentWildColIdx < bestWildColIdx) {
              bestCandidate = [...candidateRng];
              bestDist = totalDist;
              bestWildColIdx = currentWildColIdx;
              bestHasS1Drop = hasS1DropFlag;
            } else if (currentWildColIdx === bestWildColIdx) {
              if (totalDist < bestDist) {
                bestCandidate = [...candidateRng];
                bestDist = totalDist;
                bestHasS1Drop = hasS1DropFlag;
              }
            }
          }
        }
      }
    }

    if (bestCandidate) {
      return { rng: bestCandidate, hasS1Drop: bestHasS1Drop };
    }
    return null;
  };

  const strictResult = await runSearch(false);
  if (strictResult) {
    return { rng: strictResult.rng, isInterfered: false, hasS1Drop: strictResult.hasS1Drop };
  }

  const fallbackResult = await runSearch(true);
  if (fallbackResult && fallbackResult.rng) {
    const testGrid = fallbackResult.rng.map((start, cIdx) => {
      const r = rowCounts[cIdx] || 3;
      const s = currentStrips[cIdx];
      return Array.from({ length: r }).map((_, ri) => s[(start + ri) % s.length]);
    });

    let evalGrid = testGrid;
    if (gameType === 'megaway' && topTrackerOther) {
      evalGrid = testGrid.map((col, colIdx) => {
        if (colIdx >= 1 && colIdx <= 4) {
          const topSym = (length < 5 && colIdx >= length)
            ? '-'
            : (topTrackerOther[colIdx - 1] || 'WX');
          return [...col, topSym];
        }
        return col;
      });
    }

    const evWins = evaluateGrid(evalGrid, currentPaytable, gameType, customPaylines, true);
    const otherWinsCount = evWins.filter(w => w.symbolId !== targetSymbol && !wildSymbolSet.has(w.symbolId) && w.payout > 0).length;

    return { rng: fallbackResult.rng, isInterfered: otherWinsCount > 0, hasS1Drop: fallbackResult.hasS1Drop };
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
  isFreeGame: boolean = false
): Promise<(number[] | null)[]> {
  const results: (number[] | null)[] = [];
  
  const ATTEMPTS = 20000;
  
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (attempt % 500 === 0) await new Promise(r => setTimeout(r, 0));
    
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
      
      const simWins = evaluateGrid(evalGrid, currentPaytable, gameType, customPaylines, true);
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
  intervals: import('../types').MultiplierInterval[],
  bet: number,
  currentStrips: string[][],
  rowCounts: number[],
  currentPaytable: import('../types').PaytableRule[],
  reelCount: number,
  gameType: import('../types').GameType,
  topTrackerOther?: string[],
  customPaylines?: number[][],
  isFreeGame: boolean = false
): Promise<Record<string, number[]>> {
  const results: Record<string, number[]> = {};
  const targets = new Set(intervals.map(i => i.id));
  const ATTEMPTS = 150000;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (targets.size === 0) break;
    if (attempt % 500 === 0) await new Promise(r => setTimeout(r, 0));

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
    let totalPayout = 0;
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
      const simWins = evaluateGrid(evalGrid, currentPaytable, config as any, undefined, true);
      const cascadeWins = simWins.filter(w => w.payout > 0);
      
      let cascadePayout = 0;
      for (const w of cascadeWins) cascadePayout += (w.totalWin || w.payout || 0);
      totalPayout += cascadePayout;

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

    const multiplier = totalPayout / bet;

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
