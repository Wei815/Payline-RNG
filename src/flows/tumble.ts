/**
 * 「消除掉落測試」(TumbleViewer)：載入 MathID 盤面、計算贏分、執行一次掉落
 *
 * 逐字搬自 TumbleViewerTab（handleLoadInitialGrid / currentGridSymbols / wins / handleTumble），
 * 狀態改為參數與回傳值。元件目前仍使用內嵌版本（待 UI 重構完成後改為呼叫此檔）。
 */
import type { GameType, PaytableRule } from '../types';
import { evaluateGrid, getWinningPositions, type WinResult } from '../utils/evaluation';
import { GameRegistry } from '../core/GameRegistry';

/** 幸運球升級階梯（與 TumbleViewerTab 相同） */
export const MULTIPLIER_LEVELS = [2, 3, 4, 6, 8, 10, 12, 15, 18, 25, 55, 65, 80, 100, 150, 200, 250, 500];

export interface TumbleState {
  currentGridIds: string[][];
  mathIdSequence: number[];
  remainingClassIds: number[];
  remainingLuckySelects: number[];
  accumulatedWin: number;
  tumbleCount: number;
}

export interface TumbleEnv {
  gameType: GameType;
  reelCount: number;
  rowCounts: number[];
  currentPaytable: PaytableRule[];
  isFreeGame: boolean;
}

const parseNums = (s: string) => s.replace(/[^0-9, \t\n]/g, ',').split(/[,\s]+/).map(x => parseInt(x.trim())).filter(n => !isNaN(n));

export function buildReverseMap(currentPaytable: PaytableRule[]): Record<number, string> {
  const map: Record<number, string> = {};
  currentPaytable.forEach(rule => {
    const idsStr = String(rule.mathId ?? '');
    if (!idsStr) return;
    const ids = idsStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    for (const id of ids) {
      map[id] = rule.symbolId;
    }
  });
  return map;
}

/** 載入初始盤面；輸入不足時回傳 error 訊息 */
export function loadInitialGrid(env: TumbleEnv, inputArrayStr: string, classIdsStr: string, luckySelectsStr: string): TumbleState | { error: string } {
  const { reelCount, rowCounts, currentPaytable } = env;
  const reverseMap = buildReverseMap(currentPaytable);
  const totalCells = rowCounts.reduce((acc, curr) => acc + curr, 0);
  const ids = parseNums(inputArrayStr);
  const cIds = parseNums(classIdsStr);
  const lSelects = parseNums(luckySelectsStr);
  if (ids.length < totalCells) {
    return { error: `請至少輸入 ${totalCells} 個數字來填滿盤面！目前只有 ${ids.length} 個。` };
  }
  let classPtr = 0;
  const gridIds: string[][] = [];
  let ptr = 0;
  for (let c = 0; c < reelCount; c++) {
    const rows = rowCounts[c] || 3;
    const colIds = [];
    for (let r = 0; r < rows; r++) {
      const idVal = ids[ptr++];
      let symStr = String(idVal);
      const mappedSym = reverseMap[idVal];
      if (mappedSym && mappedSym.match(/^[F|L][1-4]/)) {
        const mult = cIds[classPtr++];
        if (mult) symStr = `${idVal}_${mult}X`;
      }
      colIds.push(symStr);
    }
    gridIds.push(colIds);
  }
  return {
    currentGridIds: gridIds,
    mathIdSequence: ids.slice(totalCells),
    remainingClassIds: cIds.slice(classPtr),
    remainingLuckySelects: lSelects,
    accumulatedWin: 0,
    tumbleCount: 0,
  };
}

/** MathID 盤面 → 符號盤面 */
export function gridSymbols(env: TumbleEnv, currentGridIds: string[][]): string[][] {
  const reverseMap = buildReverseMap(env.currentPaytable);
  return currentGridIds.map(col => col.map(strId => {
    if (strId === 'WX') return 'WX';
    if (typeof strId === 'string' && strId.includes('_')) {
      const [baseId, mult] = strId.split('_');
      const sym = reverseMap[parseInt(baseId)] || `?${baseId}`;
      return `${sym.split('_')[0]}_${mult}`;
    }
    return reverseMap[parseInt(String(strId))] || `?${strId}`;
  }));
}

export function evaluateTumble(env: TumbleEnv, state: TumbleState): { wins: WinResult[]; winningCoords: Map<string, number[]>; totalWin: number; currentMultiplier: number } {
  const { gameType, currentPaytable, isFreeGame } = env;
  const symbols = gridSymbols(env, state.currentGridIds);
  if (symbols.length === 0) return { wins: [], winningCoords: new Map(), totalWin: 0, currentMultiplier: 1 };
  const evWins = evaluateGrid(symbols, currentPaytable, gameType, undefined, false);
  const coords = getWinningPositions(symbols, evWins, currentPaytable, gameType);
  const mult = GameRegistry.getGame(gameType).getTumbleMultiplier(state.tumbleCount, isFreeGame);
  const winSum = evWins.reduce((sum, w) => sum + (w.totalWin * mult), 0);
  return { wins: evWins, winningCoords: coords, totalWin: winSum, currentMultiplier: mult };
}

/** 「掉落」按鈕：回傳下一個狀態；無贏分時回傳原狀態 */
export function tumbleOnce(env: TumbleEnv, state: TumbleState): TumbleState {
  const { gameType, isFreeGame, currentPaytable } = env;
  const reverseMap = buildReverseMap(currentPaytable);
  const { wins, winningCoords, totalWin } = evaluateTumble(env, state);
  if (wins.length === 0) return state;

  const newSequence = [...state.mathIdSequence];
  const newClassSeq = [...state.remainingClassIds];
  const newLuckySelects = [...state.remainingLuckySelects];

  const currentGridSymbols = gridSymbols(env, state.currentGridIds);
  const upgradeCount = newLuckySelects.length > 0 ? newLuckySelects.shift()! : 0;
  const upgradedGridSymbols = currentGridSymbols.map((col, c) => col.map((symId, r) => {
    if (!winningCoords.has(`${c}-${r}`) && upgradeCount > 0 && symId.startsWith('L') && symId.includes('_')) {
      let val = parseInt(symId.split('_')[1].replace('X', ''), 10);
      let currentIndex = MULTIPLIER_LEVELS.indexOf(val);
      if (currentIndex === -1) currentIndex = MULTIPLIER_LEVELS.indexOf(2);
      const nextIndex = Math.min(MULTIPLIER_LEVELS.length - 1, currentIndex + upgradeCount);
      val = MULTIPLIER_LEVELS[nextIndex];
      return `${symId.split('_')[0]}_${val}X`;
    }
    return symId;
  }));

  const nextGrid = GameRegistry.getGame(gameType).calculateNextDropGrid(
    upgradedGridSymbols,
    winningCoords,
    isFreeGame,
    () => {
      if (newSequence.length > 0) {
        const idVal = newSequence.shift()!;
        let symStr = String(idVal);
        const mappedSym = reverseMap[idVal];
        if (mappedSym && mappedSym.match(/^[F|L][1-4]/)) {
          const mult = newClassSeq.shift();
          if (mult) symStr = `${idVal}_${mult}X`;
        }
        return symStr;
      }
      return "0";
    }
  );

  return {
    currentGridIds: nextGrid,
    mathIdSequence: newSequence,
    remainingClassIds: newClassSeq,
    remainingLuckySelects: newLuckySelects,
    accumulatedWin: state.accumulatedWin + totalWin,
    tumbleCount: state.tumbleCount + 1,
  };
}
