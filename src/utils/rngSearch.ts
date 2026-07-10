import type { PaytableRule, GameType } from '../types';
import { evaluateGrid } from './evaluation';

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
  customPaylines?: number[][]
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

    for (let i = 0; i < strip.length; i++) {
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

    let dfsAttempts = 0;
    const MAX_DFS_ATTEMPTS = 5000;

    for (const wildCols of wildColCombinations) {
      const isWildCol = Array(length).fill(false);
      for (const c of wildCols) isWildCol[c] = true;

      const currentWildColIdx = wildCols[0] !== undefined ? wildCols[0] : Infinity;

      const candidateRng = Array(reelCount).fill(0);
      let testCount = 0;

      const search = async (colIndex: number): Promise<number[] | null> => {
        testCount++;
        if (testCount % 1000 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        if (testCount > 50000) return null;

        if (colIndex === reelCount) {
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

          const otherWinsCount = evWins.filter(w => {
            if (w.symbolId === targetSymbol || wildSymbolSet.has(w.symbolId)) return false;
            if (w.payout > 0) return true;
            if ((w.symbolId.startsWith('S') || w.symbolId.startsWith('B')) && w.matchCount >= 3) return true;
            return false;
          }).length;

          if (isMatch) {
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

              if (categories[colIndex] && categories[colIndex].preferredIndices.has(candidateRng[colIndex])) {
                score -= 5;
              }

              // Add totalDist to the score so it heavily prefers symbols on row 0!
              // Since otherWinsCount is * 20, a totalDist of 5 is still less impactful than 1 other win.
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

          return null;
        }

        if (!allowOtherWins) {
          dfsAttempts++;
          if (dfsAttempts > MAX_DFS_ATTEMPTS) return null;
        }

        let candidates: number[] = [];
        if (colIndex < length) {
          if (isWildCol[colIndex]) {
            candidates = categories[colIndex].onlyOneWild;
            if (candidates.length === 0) {
              candidates = categories[colIndex].anyWild;
            }
            if (candidates.length === 0) return null;
          } else {
            candidates = categories[colIndex].onlyOneTarget;
            if (allowOtherWins && candidates.length === 0) {
              candidates = categories[colIndex].anyTarget;
            }
          }
        } else {
          candidates = categories[colIndex].none;
        }

        if (candidates.length === 0) {
          if (allowOtherWins) {
            candidates = Array.from({ length: currentStrips[colIndex].length }, (_, idx) => idx);
          } else {
            return null;
          }
        }

        const stripLen = currentStrips[colIndex].length;
        const mid = Math.floor(stripLen / 2);
        const cp = categories[colIndex].preferredIndices;
        const sortedCandidates = [...candidates].sort((a, b) => {
          const aCenter = cp.has(a) ? 0 : 1;
          const bCenter = cp.has(b) ? 0 : 1;
          if (aCenter !== bCenter) return aCenter - bCenter;
          return Math.abs(a - mid) - Math.abs(b - mid);
        });

        const limit = allowOtherWins ? Math.min(sortedCandidates.length, 5) : Math.min(sortedCandidates.length, 25);
        for (let attempt = 0; attempt < limit; attempt++) {
          candidateRng[colIndex] = sortedCandidates[attempt];
          const res = await search(colIndex + 1);
          if (res && !allowOtherWins) return res;
        }
        return null;
      };

      const res = await search(0);
      if (res && !allowOtherWins) return res;
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
