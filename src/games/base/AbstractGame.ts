import type {
  GameConfig,
  PaytableRule,
  ReelStrips,
  GameType,
  MultiplierInterval,
} from "../../types";
import type { WinResult } from "../../utils/evaluation";
import type { IGameEnvironment } from "./IGameEnvironment";
import { RngSearchEngine } from "./RngSearchEngine";

export abstract class AbstractGame implements IGameEnvironment {
  abstract readonly id: GameType;
  abstract readonly name: string;

  abstract getDefaultConfig(): GameConfig;
  abstract getDefaultPaytable(): PaytableRule[];
  abstract getDefaultReelStrips(): ReelStrips;
  abstract evaluate(
    grid: string[][],
    paytable: PaytableRule[],
    config: GameConfig,
    customPaylines?: number[][],
    includeZeroPayout?: boolean,
  ): WinResult[];

  public createTimeSlicer(intervalMs: number = 16) {
    let lastYield = performance.now();
    return async function yieldIfNeeded() {
      if (performance.now() - lastYield > intervalMs) {
        await new Promise((r) => setTimeout(r, 0));
        lastYield = performance.now();
      }
    };
  }

  public isGoldSymbol(sym: string): boolean {
    return /^G[1-9A-Z]/.test(sym);
  }

  // ==========================================
  // OCP Virtual Methods (Template Method Hooks)
  // ==========================================

  /** 判斷該符號在盤面消除時是否保留 (例如秦皇傳說 S1 在免費遊戲中不消除) */
  public isSymbolUnremovable(sym: string, isFreeGame: boolean): boolean {
    return false;
  }

  /** 取得連續掉落時的倍數乘數 (例如 WayGame 預設的 1, 2, 4, 8 翻倍) */
  public getTumbleMultiplier(cascadeCount: number, isFreeGame: boolean): number {
    return 1;
  }

  /** 是否啟用掉落機制 (LineGame 可覆寫為 false) */
  public hasCascadeFeature(): boolean {
    return true;
  }

  /** 遊戲是否依賴位置 (LineGame 通常為 true，PayAnywhere / WayGame 可覆寫為 false) */
  public isPositionDependent(): boolean {
    return true;
  }

  /** 搜尋 RNG 隨機生成的最大嘗試次數 */
  public getMaxRandomAttempts(): number {
    return 1000;
  }

  /**
   * 掉落演算法，供子類別覆寫 (例如決戰賽特2的平移掉落)
   */
  public applyCascade(
    grid: string[][],
    colIndex: number,
    eliminatedRows: number[],
    strip: string[],
    drawIndices: number[],
    _isFreeGame: boolean,
    _gameType: GameType,
  ): void {
    eliminatedRows.sort((a, b) => b - a);
    for (const r of eliminatedRows) {
      const len = strip.length;
      const drawIdx = ((drawIndices[colIndex] % len) + len) % len;
      grid[colIndex][r] = strip[drawIdx];
      drawIndices[colIndex]--;
    }
  }

  /**
   * UI 層專用的不可變掉落邏輯 (Immutable Tumbling)
   * 給 RngValidator / TumbleViewer 使用，取代 UI 內的邏輯耦合。
   * 會遍歷每一軸，將沒有消除的符號往下沉，並利用 pullNextSymbol 取出新符號放上方。
   */
  public calculateNextDropGrid(
    currentGrid: string[][],
    winningCoords: Map<string, number[]>,
    isFreeGame: boolean,
    pullNextSymbol: (colIndex: number, dropIndex: number, totalDropped: number) => string
  ): string[][] {
    const nextGrid: string[][] = [];
    const reelCount = currentGrid.length;

    for (let c = 0; c < reelCount; c++) {
      const colLen = currentGrid[c].length;
      const keptSymbols: string[] = [];

      for (let r = 0; r < colLen; r++) {
        const symId = currentGrid[c][r];
        const isUnremovable = this.isSymbolUnremovable(symId, isFreeGame);

        if (!winningCoords.has(`${c}-${r}`) || isUnremovable) {
          keptSymbols.push(symId);
        }
      }

      const removedCount = colLen - keptSymbols.length;
      const newSymbols: string[] = [];
      for (let i = 0; i < removedCount; i++) {
        newSymbols.push(pullNextSymbol(c, i, removedCount));
      }

      nextGrid.push([...newSymbols, ...keptSymbols]);
    }

    return nextGrid;
  }

  /**
   * 產生計算用盤面 (如 Megaway 需要額外的 TopTracker)
   */
  public getEvalGrid(
    grid: string[][],
    _gameType: GameType,
    length: number,
    topTrackerOther?: string[],
  ): string[][] {
    return grid;
  }

  public getEvalGridForCombos(
    grid: string[][],
    topTrackerOther?: string[],
  ): string[][] {
    return grid;
  }

  public getGridFromRng(
    rng: number[],
    strips: string[][],
    rowCounts: number[],
    reelCount: number,
  ): string[][] {
    return Array.from({ length: reelCount }, (_, cIdx) => {
      const r = rowCounts[cIdx] || 3;
      const s = strips[cIdx];
      const start = rng[cIdx];
      return Array.from({ length: r }).map(
        (_, ri) => s[(start + ri) % s.length],
      );
    });
  }

  // ==========================================
  // Delegation to RngSearchEngine
  // ==========================================

  async findRngForCombination(
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
    requireGoldCascade: boolean = false,
  ): Promise<{
    rng: number[] | null;
    isInterfered: boolean;
    hasS1Drop?: boolean;
    stripId?: number;
  }> {
    const engine = new RngSearchEngine(this);
    return engine.findRngForCombination(
      targetSymbol, length, wildCount, currentStrips, rowCounts, currentPaytable,
      reelCount, gameType, topTrackerOther, customPaylines, isFreeGame, stripSets, requireGoldCascade
    );
  }

  async findRngForCombos(
    currentStrips: string[][],
    rowCounts: number[],
    currentPaytable: PaytableRule[],
    reelCount: number,
    gameType: GameType,
    topTrackerOther?: string[],
    customPaylines?: number[][],
    isFreeGame: boolean = false,
    stripSets?: Record<string, string[][]>,
  ): Promise<(number[] | null)[]> {
    const engine = new RngSearchEngine(this);
    return engine.findRngForCombos(
      currentStrips, rowCounts, currentPaytable, reelCount, gameType, topTrackerOther,
      customPaylines, isFreeGame, stripSets
    );
  }

  async findRngForMultiplierIntervals(
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
    stripSets?: Record<string, string[][]>,
  ): Promise<Record<string, number[]>> {
    const engine = new RngSearchEngine(this);
    return engine.findRngForMultiplierIntervals(
      intervals, bet, currentStrips, rowCounts, currentPaytable, reelCount, gameType,
      topTrackerOther, customPaylines, isFreeGame, stripSets
    );
  }
}
