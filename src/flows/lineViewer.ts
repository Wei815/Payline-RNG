/**
 * 「贏分線路一覽」：為每一條線找出一組只在該線中獎的 RNG
 *
 * 逐字搬自 LineViewerTab.computedLines，改為純函式以便測試。元件目前仍使用內嵌版本（待 UI 重構完成後改為呼叫此檔）。
 */
import type { GameType, PaytableRule } from '../types';
import { evaluateGrid } from '../utils/evaluation';
import { GameRegistry } from '../core/GameRegistry';
import { getTraits } from '../games/registry';

export interface LineViewerParams {
  gameType: GameType;
  reelCount: number;
  rowCounts: number[];
  currentStrips: string[][];
  stripSets?: Record<string, string[][]>;
  currentPaytable: PaytableRule[];
  customPaylines?: number[][];
  linesToRender: number[][];
  activeLineViewerSymbol: string;
  useWxInLines: boolean;
  lineViewerPayout: number;
}

export interface LineViewerResult {
  line: number[];
  lineIdx: number;
  rng: number[] | null;
  allRngs?: number[][];
  actualTotalWin: number;
  mathIdRng: string[] | null;
}

export function computeLineViewerLines(p: LineViewerParams): LineViewerResult[] {
  const { gameType, reelCount, rowCounts, currentStrips, stripSets, currentPaytable, customPaylines, linesToRender, activeLineViewerSymbol, useWxInLines, lineViewerPayout } = p;
  // 需要「初始 + 遞補」連鎖腳本的遊戲（例如羅馬）
  const refillGame = GameRegistry.tryGetGame(gameType);
  return linesToRender.map((line, lineIdx) => {
    const { rng, allRngs, actualTotalWin, mathIdRng } = ((): {
      rng: number[] | null;
      allRngs?: number[][];
      actualTotalWin: number;
      mathIdRng: string[] | null;
    } => {
      if (getTraits(gameType).mathIdGenerator) {
        const grid: string[][] = Array.from({ length: reelCount }, (_, c) => Array(rowCounts[c] || 3).fill('-'));
        for (let c = 0; c < line.length; c++) {
          if (useWxInLines && (c === 1 || c === 3)) {
            grid[c][line[c]] = 'WX';
          } else {
            grid[c][line[c]] = activeLineViewerSymbol;
          }
        }

        const excludeSymbols = [activeLineViewerSymbol, 'WX', 'WY', 'WZ', 'NI', 'F1', 'F2', 'F3', 'F4', 'L1', 'L2'];
        const nonScatters = currentPaytable.filter(p => p.isEnabled !== false && !p.isScatter && !excludeSymbols.includes(p.symbolId)).map(p => p.symbolId);

        let nsIdx = 0;
        for (let c = 0; c < reelCount; c++) {
          for (let r = 0; r < grid[c].length; r++) {
            if (grid[c][r] === '-') {
              grid[c][r] = nonScatters.length > 0 ? nonScatters[nsIdx % nonScatters.length] : 'NI';
              nsIdx++;
            }
          }
        }

        const mathIdMap: Record<string, string> = {};
        currentPaytable.forEach(p => {
          if (p.mathId !== undefined) {
            const ids = String(p.mathId).split(',').map(s => s.trim());
            mathIdMap[p.symbolId] = ids[0];
          }
        });

        const columnStrings: string[] = [];
        for (let c = 0; c < reelCount; c++) {
          const colArr = [];
          for (let r = 0; r < grid[c].length; r++) {
            const s = grid[c][r];
            colArr.push(mathIdMap[s] || s);
          }
          columnStrings.push(colArr.join(','));
        }

        return { rng: null, actualTotalWin: lineViewerPayout, mathIdRng: columnStrings };
      }

      const candidatesPerReel: number[][] = [];
      for (let col = 0; col < reelCount; col++) {
        const strip = currentStrips[col];
        const candidates: number[] = [];
        if (strip && strip.length > 0) {
          for (let i = 0; i < strip.length; i++) {
            const sym = strip[(i + line[col]) % strip.length];
            if (sym === activeLineViewerSymbol || (useWxInLines && (sym === 'WX' || sym === 'WILD' || sym === 'W'))) {
              candidates.push(i);
            }
          }
        }
        if (candidates.length === 0) return { rng: null, actualTotalWin: 0, mathIdRng: null };
        candidatesPerReel.push(candidates);
      }

      let bestRng: number[] | null = null;
      let bestSafeRng1: number[] | null = null;
      let bestTotalWin = 0;
      let minInterference = Infinity;
      let foundPerfect = false;
      let searchCount = 0;
      const MAX_SEARCH = 2500;

      const search = (colIdx: number, currentRng: number[]) => {
        if (foundPerfect || searchCount >= MAX_SEARCH) return;

        if (colIdx === reelCount) {
          searchCount++;
          const testGrid = currentRng.map((start, cIdx) => {
            const r = rowCounts[cIdx] || 3;
            const s = currentStrips[cIdx];
            return Array.from({ length: r }).map((_, ri) => s[(start + ri) % s.length]);
          });

          const evWins = evaluateGrid(testGrid, currentPaytable, gameType, customPaylines, false);
          const payingWins = evWins.filter(w => w.payout > 0);
          const targetWin = payingWins.find(w => w.lineIndex === lineIdx);

          if (!targetWin) return;
          const interferenceWins = payingWins.filter(w => w.lineIndex !== lineIdx);
          const interference = interferenceWins.length;

          let currentSafeRng1: number[] | null = null;
          if (refillGame?.findRefillRng) {
            if (interference === 0) {
              currentSafeRng1 = refillGame.findRefillRng(testGrid, payingWins, currentPaytable, {
                stripSets, fallbackStrips: currentStrips, rowCounts, paylines: linesToRender, maxAttempts: 300,
              });
              if (currentSafeRng1) {
                foundPerfect = true;
                bestRng = [...currentRng];
                bestTotalWin = targetWin.totalWin;
                bestSafeRng1 = currentSafeRng1;
                return;
              }
            }
          } else {
            if (interference === 0) {
              foundPerfect = true;
              bestRng = [...currentRng];
              bestTotalWin = targetWin.totalWin;
              return;
            }
          }

          if (!foundPerfect && interference < minInterference) {
            minInterference = interference;
            bestRng = [...currentRng];
            bestTotalWin = targetWin.totalWin;
            bestSafeRng1 = currentSafeRng1;
          }
          return;
        }

        const cands = candidatesPerReel[colIdx];
        for (let i = 0; i < cands.length; i++) {
          currentRng.push(cands[i]);
          search(colIdx + 1, currentRng);
          currentRng.pop();
          if (foundPerfect || searchCount >= MAX_SEARCH) break;
        }
      };

      search(0, []);

      let finalRng: number[] | null = bestRng ? (bestRng as number[]).slice(0, 5) : null;
      let finalTotalWin = bestTotalWin;

      if (!finalRng) {
        const fallbackRng = candidatesPerReel.map(c => c[0]);
        const testGrid = fallbackRng.map((start, cIdx) => {
          const r = rowCounts[cIdx] || 3;
          const s = currentStrips[cIdx];
          return Array.from({ length: r }).map((_, ri) => s[(start + ri) % s.length]);
        });
        const evWins = evaluateGrid(testGrid, currentPaytable, gameType, customPaylines, false);
        finalRng = fallbackRng.slice(0, 5);
        finalTotalWin = evWins.reduce((sum, w) => sum + w.totalWin, 0);
      }

      let allRngs: number[][] | undefined = undefined;
      if (refillGame?.findRefillRng && finalRng && finalTotalWin > 0) {
        if (bestSafeRng1) {
          allRngs = [finalRng, (bestSafeRng1 as number[]).slice(0, 5)];
        } else {
          try {
            const testGrid = finalRng.map((start, cIdx) => {
              const r = rowCounts[cIdx] || 3;
              const s = currentStrips[cIdx];
              return Array.from({ length: r }).map((_, ri) => s[(start + ri) % s.length]);
            });
            const evWins = evaluateGrid(testGrid, currentPaytable, gameType, customPaylines, false);
            const safeRng1 = refillGame.findRefillRng(testGrid, evWins, currentPaytable, {
              stripSets, fallbackStrips: currentStrips, rowCounts, paylines: linesToRender, maxAttempts: 1500,
            });
            if (safeRng1) {
              allRngs = [finalRng, (safeRng1 as number[]).slice(0, 5)];
            }
          } catch {
            // ignore
          }
        }
      }

      return { rng: finalRng, allRngs, actualTotalWin: finalTotalWin, mathIdRng: null };
    })();

    return { line, lineIdx, rng, allRngs, actualTotalWin, mathIdRng };
  });
}
