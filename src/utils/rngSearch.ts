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
): Promise<{ rng: number[] | null; isInterfered: boolean }> {
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

  const runSearch = async (allowOtherWins: boolean): Promise<number[] | null> => {
    let bestCandidate: number[] | null = null;
    let minScore = Infinity;
    let bestDist = Infinity;
    let bestWildColIdx = Infinity;

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

        const visibleSymbols = new Set<string>();

        for (let c = 0; c < reelCount; c++) {
          let cands = validCandidates[c];

          // Smart heuristic from QA: If Reel 0 and Reel 1/2 don't share symbols, connections are impossible!
          if (!allowOtherWins && c > 0 && c <= 2 && (gameType.startsWith('way') || gameType.startsWith('line') || gameType === 'megaway')) {
             const safeCands = cands.filter(idx => {
                const strip = currentStrips[c];
                const rows = rowCounts[c] || 3;
                for (let r = 0; r < rows; r++) {
                   const sym = strip[(idx + r) % strip.length];
                   if (sym !== targetSymbol && !wildSymbolSet.has(sym) && visibleSymbols.has(sym)) return false;
                }
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

          // Add symbols of the first reel to visibleSymbols to filter the next reels
          if (!allowOtherWins && c === 0) {
             const strip = currentStrips[c];
             const rows = rowCounts[c] || 3;
             for (let r = 0; r < rows; r++) {
                visibleSymbols.add(strip[(chosenIdx + r) % strip.length]);
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
          ways = targetWin.ways;
        }

        if (gameType === 'waygame_qin') {
          if (evWins.some(w => w.symbolId === 'B1' && w.matchCount >= 5)) {
            if (targetSymbol !== 'B1' || length < 5) {
              isMatch = false;
            }
          }

          if (isFreeGame && evalGrid.some(col => col.includes('S1'))) {
            isMatch = false;
          }

          if (isMatch) {
            let currentGrid = testGrid.map(col => [...col]);
            let drawIndices = [...candidateRng].map(idx => idx - 1);
            let simWins = [...evWins];
            let cascadeSafe = true;
            let cascadeCount = 0;

            while (cascadeCount < 10) {
              const cascadeWins = simWins.filter(w => w.payout > 0 || ((w.symbolId === 'B1' || w.symbolId === 'S1') && w.matchCount >= 3));
              if (cascadeWins.length === 0) break;

              const winningCoordsMap = getWinningPositions(currentGrid, cascadeWins, currentPaytable, gameType);
              let hasElimination = false;

              for (let c = 0; c < reelCount; c++) {
                const strip = currentStrips[c];
                const rows = rowCounts[c] || 3;
                const eliminatedRows: number[] = [];
                for (let r = 0; r < rows; r++) {
                  if (winningCoordsMap.has(`${c}-${r}`)) {
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

              if (isFreeGame && currentGrid.some(col => col.includes('S1'))) {
                cascadeSafe = false;
                break;
              }
              cascadeCount++;
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
          if (otherWinsCount === 0 && ways === 1) {
            return [...candidateRng];
          }
        } else {
          let score = (ways - 1) * 10 + otherWinsCount * 20;

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
          } else if (score === minScore) {
            if (currentWildColIdx < bestWildColIdx) {
              bestCandidate = [...candidateRng];
              bestDist = totalDist;
              bestWildColIdx = currentWildColIdx;
            } else if (currentWildColIdx === bestWildColIdx) {
              if (totalDist < bestDist) {
                bestCandidate = [...candidateRng];
                bestDist = totalDist;
              }
            }
          }
        }
      }
    }

    return allowOtherWins ? bestCandidate : null;
  };

  const strictResult = await runSearch(false);
  if (strictResult) {
    return { rng: strictResult, isInterfered: false };
  }

  const fallbackResult = await runSearch(true);
  if (fallbackResult) {
    const testGrid = fallbackResult.map((start, cIdx) => {
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

    return { rng: fallbackResult, isInterfered: otherWinsCount > 0 };
  }

  return { rng: null, isInterfered: false };
}
