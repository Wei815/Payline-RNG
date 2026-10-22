import { BaseLineGame } from '../base/BaseLineGame';
import type { GameConfig, PaytableRule, ReelStrips, GameType } from '../../types';
import { getWinningPositions, isEliminatedCell, type WinResult } from '../../utils/evaluation';
import { RngSearchEngine } from '../base/RngSearchEngine';
import { getBaseSymbol } from '../../utils/evaluation/GameConstants';
import { isInterferingWin } from '../base/searchRules';

export class RomaGame extends BaseLineGame {
  readonly id: GameType = 'linegame_roma';
  readonly name = '羅馬競技場 (Roma)';
  private cachedStripSets?: Record<string, string[][]>;

  /**
   * 是否具備掉落消除特色
   * 羅馬競技場為 15-line 消除類連線遊戲，連線得分後會消除並進行符號掉落遞補。
   */
  public override hasCascadeFeature(): boolean {
    return true;
  }

  public override isPositionDependent(): boolean {
    return true;
  }

  /** B1 少於 3 顆時會隨贏分一起消除（由 validateCandidateRng 把關），搜尋時不需避開 B1 */
  public override blocksSearchDraw(sym: string, targetSymbol: string): boolean {
    if (sym === 'B1') return false;
    return super.blocksSearchDraw(sym, targetSymbol);
  }

  /**
   * 規則 8：若版面上的免費遊戲符號 B1 數量少於 3 顆時，若版面上有贏分出現時，會連同免費遊戲符號 B1 一起消除
   */
  public postProcessWinningPositions(grid: string[][], wins: WinResult[], winningCoords: Map<string, number[]>): void {
    const hasRealWin = wins.some(w => {
      if (w.symbolId === 'B1') return false;
      return (w.totalWin !== undefined ? w.totalWin > 0 : (w.payout !== undefined ? w.payout > 0 : false));
    });
    if (!hasRealWin) return;

    const b1Coords: string[] = [];
    for (let col = 0; col < grid.length; col++) {
      for (let row = 0; row < grid[col].length; row++) {
        if (getBaseSymbol(grid[col][row]) === 'B1') b1Coords.push(`${col}-${row}`);
      }
    }
    if (b1Coords.length > 0 && b1Coords.length < 3) {
      for (const coord of b1Coords) {
        if (!winningCoords.has(coord)) winningCoords.set(coord, []);
        winningCoords.get(coord)!.push(0);
      }
    }
  }

  getDefaultConfig(): GameConfig {
    return {
      gameType: this.id,
      paylines: [
        [1, 1, 1, 1, 1], // 線 1 (Line 0)
        [0, 0, 0, 0, 0], // 線 2 (Line 1)
        [2, 2, 2, 2, 2], // 線 3 (Line 2)
        [0, 1, 2, 1, 0], // 線 4 (Line 3)
        [2, 1, 0, 1, 2], // 線 5 (Line 4)
        [0, 0, 1, 0, 0], // 線 6 (Line 5)
        [2, 2, 1, 2, 2], // 線 7 (Line 6)
        [1, 2, 2, 2, 1], // 線 8 (Line 7)
        [1, 0, 0, 0, 1], // 線 9 (Line 8)
        [1, 0, 1, 0, 1], // 線 10 (Line 9)
        [1, 2, 1, 2, 1], // 線 11 (Line 10)
        [0, 1, 0, 1, 0], // 線 12 (Line 11)
        [2, 1, 2, 1, 2], // 線 13 (Line 12)
        [1, 1, 0, 1, 1], // 線 14 (Line 13)
        [1, 1, 2, 1, 1], // 線 15 (Line 14)
      ]
    };
  }

  getDefaultPaytable(): PaytableRule[] {
    return [
      {
        symbolId: 'WX',
        name: 'Wild',
        isWild: true,
        isScatter: false,
        mathId: 0,
        isEnabled: true,
        payouts: { match3: 0, match4: 0, match5: 0 }
      },
      {
        symbolId: 'B1',
        name: 'Bonus',
        isWild: false,
        isScatter: false, // B1 出現在連線上觸發獅子特色
        mathId: 1,
        isEnabled: true,
        payouts: { match3: 0, match4: 0, match5: 0 }
      },
      {
        symbolId: 'M1',
        name: 'M1',
        isWild: false,
        isScatter: false,
        mathId: 3,
        isEnabled: true,
        payouts: { match3: 15, match4: 150, match5: 1000 }
      },
      {
        symbolId: 'M2',
        name: 'M2',
        isWild: false,
        isScatter: false,
        mathId: 4,
        isEnabled: true,
        payouts: { match3: 15, match4: 100, match5: 500 }
      },
      {
        symbolId: 'M3',
        name: 'M3',
        isWild: false,
        isScatter: false,
        mathId: 5,
        isEnabled: true,
        payouts: { match3: 10, match4: 50, match5: 200 }
      },
      {
        symbolId: 'A',
        name: 'A',
        isWild: false,
        isScatter: false,
        mathId: 9,
        isEnabled: true,
        payouts: { match3: 10, match4: 30, match5: 120 }
      },
      {
        symbolId: 'K',
        name: 'K',
        isWild: false,
        isScatter: false,
        mathId: 10,
        isEnabled: true,
        payouts: { match3: 5, match4: 15, match5: 75 }
      },
      {
        symbolId: 'Q',
        name: 'Q',
        isWild: false,
        isScatter: false,
        mathId: 11,
        isEnabled: true,
        payouts: { match3: 5, match4: 10, match5: 30 }
      },
      {
        symbolId: 'J',
        name: 'J',
        isWild: false,
        isScatter: false,
        mathId: 12,
        isEnabled: true,
        payouts: { match3: 5, match4: 10, match5: 30 }
      }
    ];
  }

  getDefaultReelStrips(): ReelStrips {
    return [[], [], [], [], []];
  }

  /**
   * 羅馬競技場專用掉落遞補演算法：
   * 符號消除之後，還存在版面上的符號進行掉落（重力向下沉底），
   * 接著空缺的部分由另外產生的新盤面去填補空缺部分，位置對位置填補。
   *
   * 範例說明：
   * 盤面一：
   * M2  A   K   J   M2
   * M1  WX  M1  M1  M1  (M1 贏分消除)
   * A   K   M3  Q   K
   *
   * 符號消除並掉落後：
   * XX  XX  XX  XX  XX  (頂部產生空缺)
   * M2  A   K   J   M2  (原 Row 0 掉落至 Row 1)
   * A   K   M3  Q   K   (原 Row 2 保留)
   *
   * 新產生的遞補盤面：
   * M1  M2  M3  M2  WX  (Row 0)
   * M1  M3  M1  A   Q   (Row 1)
   * K   J   A   Q   J   (Row 2)
   *
   * 遞補之後的盤面 (XX 部分由新盤面相同座標位置填補)：
   * M1  M2  M3  M2  WX
   * M2  A   K   J   M2
   * A   K   M3  Q   K
   */
  public cascadeStep(
    grid: string[][],
    winningCoords: Set<string>,
    nextRng: number[],
    stripSet: string[][],
    rowCounts: number[]
  ): string[][] {
    const nextGrid: string[][] = [];
    const reelCount = grid.length;
    for (let c = 0; c < reelCount; c++) {
      const rows = rowCounts[c] || 3;
      const kept: string[] = [];
      for (let r = 0; r < rows; r++) {
        if (!winningCoords.has(`${c}-${r}`)) {
          kept.push(grid[c][r]);
        }
      }
      const removedCount = rows - kept.length;
      const strip = stripSet[c] || [];
      const stripLen = strip.length || 1;
      const start = nextRng[c] || 0;
      // 空缺部分由新盤面相同座標位置 (c, r) 填補
      const newSyms: string[] = [];
      for (let r = 0; r < removedCount; r++) {
        newSyms.push(strip[(start + r) % stripLen]);
      }
      nextGrid.push([...newSyms, ...kept]);
    }
    return nextGrid;
  }

  /**
   * 支援直接傳入完整新盤面物件 (newBoard) 進行位置對位置填補
   */
  public cascadeWithNewBoard(
    grid: string[][],
    winningCoords: Set<string>,
    newBoard: string[][],
    rowCounts: number[] = [3, 3, 3, 3, 3]
  ): string[][] {
    const nextGrid: string[][] = [];
    const reelCount = grid.length;
    for (let c = 0; c < reelCount; c++) {
      const rows = rowCounts[c] || 3;
      const kept: string[] = [];
      for (let r = 0; r < rows; r++) {
        if (!winningCoords.has(`${c}-${r}`)) {
          kept.push(grid[c][r]);
        }
      }
      const removedCount = rows - kept.length;
      const newSyms: string[] = [];
      for (let r = 0; r < removedCount; r++) {
        newSyms.push(newBoard[c][r]);
      }
      nextGrid.push([...newSyms, ...kept]);
    }
    return nextGrid;
  }

  /**
   * 從 RNG 與指定滾輪表建立 3x5 盤面
   */
  public buildGridFromRng(
    rng: number[],
    stripSet: string[][],
    rowCounts: number[],
    reelCount: number = 5
  ): string[][] {
    const grid: string[][] = [];
    for (let c = 0; c < reelCount; c++) {
      const rows = rowCounts[c] || 3;
      const strip = stripSet[c] || [];
      const len = strip.length || 1;
      const start = rng[c] || 0;
      const colArr: string[] = [];
      for (let r = 0; r < rows; r++) {
        colArr.push(strip[(start + r) % len]);
      }
      grid.push(colArr);
    }
    return grid;
  }

  /**
   * 掉落演算法 (相容基底 AbstractGame.applyCascade)
   */
  public override applyCascade(
    grid: string[][],
    colIndex: number,
    eliminatedRows: number[],
    strip: string[],
    drawIndices: number[],
    _isFreeGame: boolean,
    _gameType: GameType
  ): void {
    // 由上往下處理：消除第 r 列只會移動 r 以上的列，下方待消除的列位置不變
    // （由下往上處理時，第一次下移後下一個待消除的列已經換成別的符號）
    eliminatedRows.sort((a, b) => a - b);
    for (const r of eliminatedRows) {
      for (let shift = r; shift > 0; shift--) {
        grid[colIndex][shift] = grid[colIndex][shift - 1];
      }
      const len = strip.length;
      const drawIdx = (((drawIndices[colIndex] % len) + len) % len);
      grid[colIndex][0] = strip[drawIdx];
      drawIndices[colIndex]--;
    }
  }

  /**
   * BaseGame產生新版面的滾輪順序依序為 (規則 10):
   * Combo 0: 滾輪表1 (首次滾動用) -> index 0
   * Combo 1: 滾輪表2 (累積消除次數為奇數並且非3次) -> index 1
   * Combo 2: 滾輪表3 (累積消除次數為偶數) -> index 2
   * Combo 3: 滾輪表4 (累積消除次數為3次) -> index 3
   * Combo 4: 滾輪表3 (累積消除次數為偶數) -> index 2
   * Combo 5: 滾輪表2 (累積消除次數為奇數並且非3次) -> index 1
   * 接下來都是先滾輪表3再滾輪表2。
   */
  public getStripSetIndex(combo: number): number {
    if (combo === 0) return 0;
    if (combo === 3) return 3;
    if (combo % 2 === 0) return 2;
    return 1;
  }

  /**
   * 免費遊戲場數判定 (規則 6):
   * 在 BaseGame 連續消除次數累積達 4、5、6、7 次以上，
   * 分別可觸發 4、5、10、20 場 FreeGame。
   */
  public getFreeSpinsByCombo(combo: number): number {
    if (combo >= 7) return 20;
    if (combo === 6) return 10;
    if (combo === 5) return 5;
    if (combo === 4) return 4;
    return 0;
  }

  /**
   * 一般單一連線符號搜尋：
   * 1. 取得 RNG0 (滾輪表 0) 達成目標連線。
   * 2. 若初始盤面有連線贏分 (發生消除)，依規則需要第二筆 RNG1 (來自滾輪表 1) 進行遞補。
   * 3. 避免在一般 BG 測試中連鎖超過 3 次誤入免遊，主動搜尋遞補後安全不再中獎的 RNG1 (總 Combo = 1)。
   * 4. 回傳 allRngs: [rng0, rng1]，方便 QA 一鍵複製完整測試序列！
   */
  /**
   * 針對有消除的盤面，搜尋滾輪表 1 遞補後「100% 不再發生任何連線消除」的安全 RNG1
   * 同時嚴格把關兩道防線：
   * 1. Rule 3：盤面上 B1 小於 3 顆時，連同 B1 一起消除遞補
   * 2. 第一道防線：消除掉落後殘留符號自連線檢查。若殘留符號已在任何 payline 達成連線，直接返回 null
   * 3. 第二道防線：從滾輪表 1 尋找 0 消除的遞補 RNG1
   */
  public findSafeReplacementRng(
    initialGrid: string[][],
    initialWins: WinResult[],
    currentPaytable: PaytableRule[],
    strips1: string[][],
    rowCounts: number[],
    paylinesToUse?: number[][],
    maxAttempts: number = 3000
  ): number[] | null {
    const payingWins = (initialWins || []).filter(w => w.payout > 0);
    if (payingWins.length === 0) return null;

    const reelCount = initialGrid.length;
    const lines = (paylinesToUse && paylinesToUse.length > 0) ? paylinesToUse : this.getDefaultConfig().paylines;
    const winningCoordsMap = getWinningPositions(
      initialGrid, payingWins, currentPaytable, 'linegame_roma', undefined, lines
    );
    const winningCoords = new Set(winningCoordsMap.keys());

    // 規則 3：版面上的免費遊戲符號 B1 數量少於 3 顆時，若版面上有贏分出現時，會連同免費遊戲符號 B1 一起消除
    let b1Count = 0;
    const b1Coords: string[] = [];
    for (let c = 0; c < reelCount; c++) {
      const rows = rowCounts[c] || 3;
      for (let r = 0; r < rows; r++) {
        if (initialGrid[c][r] === 'B1') {
          b1Count++;
          b1Coords.push(`${c}-${r}`);
        }
      }
    }
    if (b1Count > 0 && b1Count < 3) {
      for (const coord of b1Coords) {
        winningCoords.add(coord);
      }
    }

    // 第一道防線（規則 2A）：消除掉落後殘留符號自連線檢查
    // 讓保留的符號向下沉底，空缺部分以不匹配的標記 '__VACANT__' 填充
    const droppedResidualGrid: string[][] = [];
    for (let c = 0; c < reelCount; c++) {
      const rows = rowCounts[c] || 3;
      const kept: string[] = [];
      for (let r = 0; r < rows; r++) {
        if (!winningCoords.has(`${c}-${r}`)) {
          kept.push(initialGrid[c][r]);
        }
      }
      const removedCount = rows - kept.length;
      droppedResidualGrid.push([...Array(removedCount).fill('__VACANT__'), ...kept]);
    }

    const residualWins = this.evaluate(
      droppedResidualGrid,
      currentPaytable,
      { gameType: 'linegame_roma', paylines: lines },
      lines,
      false
    );
    const residualPayingWins = residualWins.filter(w => w.payout > 0);
    if (residualPayingWins.length > 0) {
      // 殘留符號自身就連線了，任何上方遞補都無法阻擋再次消除，直接判定無解
      return null;
    }

    // 第二道防線（規則 2B）：尋找遞補後 100% 0 消除的安全 RNG1 (nextPayingWins.length === 0)
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidateRng = Array.from({ length: reelCount }, (_, c) => {
        const len = strips1[c]?.length || 1;
        return Math.floor(Math.random() * len);
      });

      const nextGrid = this.cascadeStep(initialGrid, winningCoords, candidateRng, strips1, rowCounts);
      const nextWins = this.evaluate(nextGrid, currentPaytable, { gameType: 'linegame_roma', paylines: lines }, lines, false);
      const nextPayingWins = nextWins.filter(w => w.payout > 0);

      if (nextPayingWins.length === 0) {
        return candidateRng.slice(0, 5);
      }
    }

    // Systematic fallback if random search exhausted
    for (let attempt = 0; attempt < 500; attempt++) {
      const candidateRng = Array.from({ length: reelCount }, (_, c) => {
        const len = strips1[c]?.length || 1;
        return (attempt * 7 + c * 13) % len;
      });
      const nextGrid = this.cascadeStep(initialGrid, winningCoords, candidateRng, strips1, rowCounts);
      const nextWins = this.evaluate(nextGrid, currentPaytable, { gameType: 'linegame_roma', paylines: lines }, lines, false);
      const nextPayingWins = nextWins.filter(w => w.payout > 0);
      if (nextPayingWins.length === 0) {
        return candidateRng.slice(0, 5);
      }
    }

    return null;
  }

  /** 遞補一律使用滾輪表 1（Combo 1），沒有時使用目前滾輪表 */
  /** RTP 模擬遞補：第 combo 次消除使用 getStripSetIndex(combo) 的滾輪表，隨機停點覆蓋空缺 */
  public simulateRefill(
    grid: string[][],
    winningCoords: Map<string, number[]>,
    combo: number,
    opts: { stripSets?: string[][][]; fallbackStrips: string[][]; rowCounts: number[] },
  ): string[][] {
    const strips = opts.stripSets?.[this.getStripSetIndex(combo)] ?? opts.fallbackStrips;
    const rng = strips.map(s => Math.floor(Math.random() * (s.length || 1)));
    const eliminated = new Set([...winningCoords.keys()].filter(k => isEliminatedCell(winningCoords, k)));
    return this.cascadeStep(grid, eliminated, rng, strips, opts.rowCounts);
  }

  /** 重播「初始 + 遞補」連鎖：第 n 次遞補使用 getStripSetIndex(n) 的滾輪表，空缺由該行 RNG 覆蓋填補 */
  public replayRefillChain(
    rngLines: number[][],
    opts: { stripSets: string[][][]; fallbackStrips: string[][]; rowCounts: number[]; paytable: PaytableRule[]; paylines?: number[][]; config: GameConfig },
  ): { grid: string[][]; wins: WinResult[]; winningCoords: Map<string, number[]> }[] {
    const { stripSets, fallbackStrips, rowCounts, paytable, paylines, config } = opts;
    const reelCount = rowCounts.length;
    const setFor = (combo: number) => stripSets[this.getStripSetIndex(combo)] ?? fallbackStrips;
    const out: { grid: string[][]; wins: WinResult[]; winningCoords: Map<string, number[]> }[] = [];
    let grid = this.buildGridFromRng(rngLines[0], stripSets[0] ?? fallbackStrips, rowCounts, reelCount);
    for (let step = 0; step < rngLines.length; step++) {
      const wins = this.evaluate(grid, paytable, config, paylines, false);
      const winningCoords = getWinningPositions(grid, wins, paytable, this.id, undefined, paylines);
      out.push({ grid, wins, winningCoords });
      if (step === rngLines.length - 1) break;
      const eliminated = new Set([...winningCoords.keys()].filter(k => isEliminatedCell(winningCoords, k)));
      grid = this.cascadeStep(grid, eliminated, rngLines[step + 1], setFor(step + 1), rowCounts);
    }
    return out;
  }

  public findRefillRng(
    grid: string[][],
    wins: WinResult[],
    paytable: PaytableRule[],
    opts: {
      stripSets?: Record<string, string[][]> | string[][][];
      fallbackStrips: string[][];
      rowCounts: number[];
      paylines?: number[][];
      maxAttempts?: number;
    }
  ): number[] | null {
    const sets = opts.stripSets as Record<number, string[][]> | undefined;
    const strips1 = (sets && sets[1]) ? sets[1] : opts.fallbackStrips;
    return this.findSafeReplacementRng(grid, wins, paytable, strips1, opts.rowCounts, opts.paylines, opts.maxAttempts);
  }

  /**
   * 羅馬競技場專屬候選 RNG 驗證：
   * 1. 若有贏分消除，檢查消除掉落後殘留符號自連線。
   * 2. 若殘留符號無連線，搜尋滾輪表 1 遞補後 100% 不再連線的安全 RNG1。
   * 3. 確保回傳完整的 [rng0, safeRng1]。
   */
  public override validateCandidateRng(
    candidateRng: number[],
    initialGrid: string[][],
    initialWins: WinResult[],
    currentPaytable: PaytableRule[],
    customPaylines?: number[][],
    stripSets?: Record<string, string[][]>,
    isFreeGame?: boolean
  ): { valid: boolean; allRngs?: number[][] } | boolean {
    if (isFreeGame) return true;
    const cleanCandidateRng = candidateRng.slice(0, 5);
    if (!initialWins || initialWins.length === 0) {
      return { valid: true, allRngs: [cleanCandidateRng] };
    }

    const sets = stripSets || this.cachedStripSets;
    const strips1 = (sets && sets[1]) ? sets[1] : undefined;
    if (!strips1 || strips1.length === 0) return true;

    const rowCounts = initialGrid.map(col => col.length);
    const paylinesToUse = (customPaylines && customPaylines.length > 0) ? customPaylines : this.getDefaultConfig().paylines;

    const safeRng1 = this.findSafeReplacementRng(
      initialGrid,
      initialWins,
      currentPaytable,
      strips1,
      rowCounts,
      paylinesToUse,
      800
    );

    if (!safeRng1) {
      return { valid: false };
    }

    return {
      valid: true,
      allRngs: [cleanCandidateRng, safeRng1.slice(0, 5)]
    };
  }

  /**
   * 羅馬競技場專屬純淨單一連線搜尋 (100% 遵守三大鐵律):
   * 1. 規則 1: 單筆消除只能有選定目標，全盤總贏分嚴格等於目標賠率，絕無其他干擾。
   * 2. 規則 2A: 消除掉落後殘留符號 100% 零自連。
   * 3. 規則 2B: 滾輪表 2 遞補後 100% 零消除，絕不引發二次 Combo。
   * 4. 優先直觀水平直線 (Line 1/2/3)。
   * 5. 輸出保證純 5 碼 [cleanRng, safeRng1]。
   */
  public searchPureCombination(
    targetSymbol: string,
    length: number,
    wildCount: number,
    strips0: string[][],
    strips1: string[][],
    currentPaytable: PaytableRule[],
    rowCounts: number[],
    paylinesToUse: number[][]
  ): { rng: number[]; safeRng1: number[]; line: number[] } | null {
    const straightLines = paylinesToUse.filter(l => l.every(r => r === l[0]));
    const candidateLines = [...straightLines, ...paylinesToUse.filter(l => !straightLines.includes(l))];
    const reelCount = strips0.length;

    for (let attempt = 0; attempt < 25000; attempt++) {
      const line = Math.random() < 0.85 && straightLines.length > 0
        ? straightLines[Math.floor(Math.random() * straightLines.length)]
        : candidateLines[Math.floor(Math.random() * candidateLines.length)];

      const wildCols = new Set<number>();
      if (wildCount > 0) {
        const available: number[] = [];
        for (let c = 0; c < length; c++) available.push(c);
        for (let w = 0; w < wildCount && available.length > 0; w++) {
          const pickIdx = Math.floor(Math.random() * available.length);
          wildCols.add(available[pickIdx]);
          available.splice(pickIdx, 1);
        }
      }

      const cand: number[] = [];
      let possible = true;
      for (let c = 0; c < reelCount; c++) {
        const row = line[c];
        const strip = strips0[c];
        const len = strip.length;
        if (c < length) {
          const wantWild = wildCols.has(c);
          const valids: number[] = [];
          for (let i = 0; i < len; i++) {
            const sym = strip[(i + row) % len];
            if (wantWild && (sym === 'WX' || sym === 'WILD' || sym === 'W')) valids.push(i);
            if (!wantWild && sym === targetSymbol) valids.push(i);
          }
          if (valids.length === 0) { possible = false; break; }
          cand.push(valids[Math.floor(Math.random() * valids.length)]);
        } else {
          const valids: number[] = [];
          for (let i = 0; i < len; i++) {
            const sym = strip[(i + row) % len];
            if (sym !== targetSymbol && sym !== 'WX' && sym !== 'WILD' && sym !== 'W') valids.push(i);
          }
          if (valids.length === 0) { possible = false; break; }
          cand.push(valids[Math.floor(Math.random() * valids.length)]);
        }
      }
      if (!possible) continue;

      const grid = this.buildGridFromRng(cand, strips0, rowCounts, reelCount);
      const wins = this.evaluate(grid, currentPaytable, { gameType: this.id, paylines: paylinesToUse }, paylinesToUse, false);
      // 有贏分、或 B1 / S1 達 3 顆（0 賠率也會觸發特色）都算干擾
      const payingWins = wins.filter(w => isInterferingWin(w, currentPaytable));

      // 鐵律一：單筆消除只能有選定目標，絕無干擾！
      if (payingWins.length !== 1) continue;
      const w = payingWins[0];
      if (w.symbolId !== targetSymbol || w.matchCount !== length) continue;

      let actualWild = 0;
      for (let c = 0; c < length; c++) {
        const sym = grid[c][line[c]];
        if (sym === 'WX' || sym === 'WILD' || sym === 'W') actualWild++;
      }
      if (actualWild !== wildCount) continue;

      // 鐵律二：掉落殘留 0 自連 + 滾輪表 2 遞補 100% 0 消除！
      const safeRng1 = this.findSafeReplacementRng(
        grid, payingWins, currentPaytable, strips1, rowCounts, paylinesToUse, 3000
      );
      if (!safeRng1) continue;

      return { rng: cand, safeRng1: safeRng1.slice(0, 5), line };
    }
    return null;
  }

  /**
   * 羅馬競技場專屬百搭 (WX) 連線搜尋：
   * 根據官方規則：
   * - WX 5連線：給予 M1 5連線分數
   * - WX 4連線/3連線/2連線：看後面接的是什麼符號，給該符號的 5/4/3 連線分數（絕不會是 M1 短連線分數）
   * 並且確保掉落殘留零自連，配對 0 消除安全遞補。
   */
  public searchWxCombination(
    length: number,
    strips0: string[][],
    strips1: string[][],
    currentPaytable: PaytableRule[],
    rowCounts: number[],
    paylinesToUse: number[][]
  ): { rng: number[]; allRngs: number[][] } | null {
    const reelCount = strips0.length;
    const expectedMatch = length === 5 ? 5 : (length + 1);

    for (let lineIdx = 0; lineIdx < paylinesToUse.length; lineIdx++) {
      const line = paylinesToUse[lineIdx];
      const starts = strips0.map((s, c) => {
        const row = line[c];
        const res: number[] = [];
        for (let i = 0; i < s.length; i++) {
          const isWx = s[(i + row) % s.length] === 'WX';
          if (c < length && isWx) res.push(i);
          if (c >= length && !isWx) res.push(i);
        }
        return res;
      });

      if (starts.some(a => a.length === 0)) continue;

      for (let att = 0; att < 2000; att++) {
        const cand = starts.map(arr => arr[Math.floor(Math.random() * arr.length)]);
        const grid = this.buildGridFromRng(cand, strips0, rowCounts, reelCount);

        // 檢查該線路開頭連續 WX 是否恰好為 length
        let actualWx = 0;
        for (let c = 0; c < 5; c++) {
          if (grid[c][line[c]] === 'WX') actualWx++; else break;
        }
        if (actualWx !== length) continue;

        const wins = this.evaluate(grid, currentPaytable, { gameType: this.id, paylines: paylinesToUse }, paylinesToUse, false);
        const payingWins = wins.filter(w => w.payout > 0);

        // 目標線路必須在此贏分清單中，且連線數恰好為 expectedMatch
        const targetWin = payingWins.find(w => w.lineIndex === lineIdx && w.matchCount === expectedMatch);
        if (!targetWin) continue;

        // 檢查掉落殘留自連
        const winCoords = new Set<string>();
        for (const w of payingWins) for (const c of (w as any).winCoords || []) winCoords.add(c);
        
        const keptGrid: string[][] = [];
        for (let c = 0; c < reelCount; c++) {
          const col: string[] = [];
          for (let r = 0; r < rowCounts[c]; r++) {
            if (!winCoords.has(`${c}-${r}`)) col.push(grid[c][r]);
          }
          while (col.length < rowCounts[c]) col.unshift('DUMMY');
          keptGrid.push(col);
        }

        const selfWins = this.evaluate(keptGrid, currentPaytable, { gameType: this.id, paylines: paylinesToUse }, paylinesToUse, false);
        if (selfWins.some(w => w.payout > 0)) continue;

        // 尋找 100% 零消除 safe 遞補
        const safeRng1 = this.findSafeReplacementRng(
          grid, payingWins, currentPaytable, strips1, rowCounts, paylinesToUse, 1500
        );
        if (safeRng1) {
          return {
            rng: cand,
            allRngs: [cand, safeRng1.slice(0, 5)]
          };
        }
      }
    }

    return null;
  }

  public override async findRngForCombination(
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
  ): Promise<{
    rng: number[] | null;
    isInterfered: boolean;
    hasS1Drop?: boolean;
    stripId?: number;
    allRngs?: number[][];
  }> {
    this.cachedStripSets = stripSets;
    // 規則明確：Combo 0 (初始旋轉 / 無 Combo) 永遠固定使用滾輪表 1 (ID 0)！
    // 絕不輪替其他滾輪表，也絕對不加 Strip ID (Strip 不需要給，純 5 碼)
    const strips0 = (!isFreeGame && stripSets && stripSets[0]) ? stripSets[0] : currentStrips;
    const strips1 = (!isFreeGame && stripSets && stripSets[1]) ? stripSets[1] : currentStrips;
    const paylinesToUse: number[][] = (customPaylines && customPaylines.length > 0) ? customPaylines : (this.getDefaultConfig().paylines || []);

    // 若目標符號為百搭 (WX)，使用專屬百搭連線搜尋
    const isTargetWx = targetSymbol.toUpperCase() === 'WX' || targetSymbol.toUpperCase() === 'WILD' || targetSymbol.toUpperCase() === 'WW';
    if (isTargetWx) {
      const wxResult = this.searchWxCombination(
        length, strips0, strips1, currentPaytable, rowCounts, paylinesToUse
      );
      if (wxResult) {
        return {
          rng: wxResult.rng.slice(0, 5),
          isInterfered: false,
          stripId: undefined,
          allRngs: wxResult.allRngs
        };
      }
    }

    // 凡 length >= 3（有贏分消除需求），優先使用 100% 零干擾純淨搜尋（驗證殘留零自連與遞補零消除）
    if (length >= 3) {
      const pureResult = this.searchPureCombination(
        targetSymbol, length, wildCount, strips0, strips1, currentPaytable, rowCounts, paylinesToUse
      );
      if (pureResult) {
        return {
          rng: pureResult.rng.slice(0, 5),
          isInterfered: false,
          stripId: undefined,
          allRngs: [pureResult.rng.slice(0, 5), pureResult.safeRng1.slice(0, 5)]
        };
      }
    }

    const engine = new RngSearchEngine(this);
    const res = await engine.findRngForCombination(
      targetSymbol, length, wildCount, strips0, rowCounts, currentPaytable,
      reelCount, gameType, topTrackerOther, paylinesToUse, isFreeGame, undefined, false
    );

    if (!res.rng) {
      return { ...res, stripId: undefined, allRngs: undefined };
    }

    const cleanRng = res.rng.slice(0, 5);

    if (res.allRngs && res.allRngs.length >= 2) {
      return {
        ...res,
        rng: cleanRng,
        stripId: undefined,
        allRngs: res.allRngs.map(r => r.slice(0, 5))
      };
    }

    const initialGrid = this.buildGridFromRng(cleanRng, strips0, rowCounts, reelCount);
    const evalGrid = this.getEvalGrid(initialGrid, gameType, length, topTrackerOther);
    const initialWins = this.evaluate(evalGrid, currentPaytable, { gameType, paylines: paylinesToUse }, paylinesToUse, false);

    if (initialWins.length > 0) {
      const safeRng1 = this.findSafeReplacementRng(
        initialGrid, initialWins, currentPaytable, strips1, rowCounts, paylinesToUse, 3000
      );

      if (safeRng1) {
        return {
          ...res,
          rng: cleanRng,
          stripId: undefined,
          allRngs: [cleanRng, safeRng1.slice(0, 5)]
        };
      }
    }

    return {
      ...res,
      rng: cleanRng,
      stripId: undefined,
      allRngs: [cleanRng]
    };
  }

  /**
   * 連續消除 (Combo 1 ~ 7+) 搜尋實作：
   * 1. 嚴格依照規則 10 選用 4 組滾輪表 (0:一般, 1:奇數非3, 2:偶數, 3:3次)。
   * 2. 空缺由下一個盤面相同座標覆蓋遞補。
   * 3. 搜尋指定 Combo 次數 (例如 4 Combo 需依序中獎 4 次，第 5 步不中獎終止)。
   * 4. 回傳各 Combo 的完整多步 RNG 序列 [rng0, rng1, ...]。
   */
  public override async findRngForCombos(
    currentStrips: string[][],
    rowCounts: number[],
    currentPaytable: PaytableRule[],
    reelCount: number,
    gameType: GameType,
    topTrackerOther?: string[],
    customPaylines?: number[][],
    isFreeGame: boolean = false,
    stripSets?: Record<string, string[][]>
  ): Promise<(number[] | null)[]> {
    const { getWinningPositions } = await import('../../utils/evaluation');
    const paylinesToUse = (customPaylines && customPaylines.length > 0) ? customPaylines : this.getDefaultConfig().paylines;
    const yieldIfNeeded = this.createTimeSlicer(16);

    // 取得 4 組滾輪表
    const allSets: string[][][] = [];
    for (let i = 0; i < 4; i++) {
      if (stripSets && stripSets[i] && stripSets[i].length >= reelCount) {
        allSets.push(stripSets[i]);
      } else {
        allSets.push(currentStrips);
      }
    }

    const maxTargetCombo = 7;
    const results: (number[] | null)[] = Array(maxTargetCombo).fill(null);

    for (let targetCombo = 1; targetCombo <= maxTargetCombo; targetCombo++) {
      let foundSequence: number[][] | null = null;
      const MAX_ATTEMPTS = 5000;

      for (let gAttempt = 0; gAttempt < MAX_ATTEMPTS; gAttempt++) {
        if (gAttempt % 200 === 0) await yieldIfNeeded();

        const rngSequence: number[][] = [];
        const strips0 = allSets[0];

        // Step 0: 滾輪表 0 隨機起點
        const rng0 = Array.from({ length: reelCount }, (_, c) => {
          const len = strips0[c]?.length || 1;
          return Math.floor(Math.random() * len);
        });

        let currentGrid = this.buildGridFromRng(rng0, strips0, rowCounts, reelCount);
        let evalGrid = this.getEvalGrid(currentGrid, gameType, 3, topTrackerOther);
        let currentWins = this.evaluate(evalGrid, currentPaytable, { gameType, paylines: paylinesToUse }, paylinesToUse, false);

        if (currentWins.length === 0) continue;

        rngSequence.push(rng0);
        let success = true;

        for (let step = 1; step <= targetCombo; step++) {
          const winningCoordsMap = getWinningPositions(
            evalGrid, currentWins, currentPaytable, gameType, undefined, paylinesToUse
          );
          const winningCoords = new Set(winningCoordsMap.keys());
          const isLastStep = (step === targetCombo);
          const stripSetIdx = this.getStripSetIndex(step);
          const targetStripSet = allSets[stripSetIdx];

          let foundStepRng: number[] | null = null;
          let nextStepGrid: string[][] | null = null;
          let nextStepWins: WinResult[] | null = null;

          for (let sAttempt = 0; sAttempt < 150; sAttempt++) {
            const candidateRng = Array.from({ length: reelCount }, (_, c) => {
              const len = targetStripSet[c]?.length || 1;
              return Math.floor(Math.random() * len);
            });

            const testGrid = this.cascadeStep(currentGrid, winningCoords, candidateRng, targetStripSet, rowCounts);
            const testEvalGrid = this.getEvalGrid(testGrid, gameType, 3, topTrackerOther);
            const testWins = this.evaluate(testEvalGrid, currentPaytable, { gameType, paylines: paylinesToUse }, paylinesToUse, false);

            if (isLastStep) {
              // 最後一步：必須無中獎，結束連鎖
              if (testWins.length === 0) {
                foundStepRng = candidateRng;
                nextStepGrid = testGrid;
                nextStepWins = testWins;
                break;
              }
            } else {
              // 中間步驟：必須有中獎，延續連鎖
              if (testWins.length > 0) {
                foundStepRng = candidateRng;
                nextStepGrid = testGrid;
                nextStepWins = testWins;
                break;
              }
            }
          }

          if (!foundStepRng) {
            success = false;
            break;
          }

          rngSequence.push(foundStepRng);
          currentGrid = nextStepGrid!;
          currentWins = nextStepWins!;
          evalGrid = this.getEvalGrid(currentGrid, gameType, 3, topTrackerOther);
        }

        if (success) {
          foundSequence = rngSequence;
          break;
        }
      }

      if (foundSequence) {
        // 第一個 RNG 作為主要 rng，並附帶完整 allRngs 數組
        const mainRng = [...foundSequence[0]];
        (mainRng as any).allRngs = foundSequence;
        results[targetCombo - 1] = mainRng;
      }
    }

    return results;
  }

  /**
   * 生成指定 Combo (4, 5, 6, 7) 的 BaseGame 免遊觸發序列
   * @param targetCombo 目標消除次數 (4 -> 4場, 5 -> 5場, 6 -> 10場, 7 -> 20場)
   * @param baseStripSets 4 組 Base 滾輪表
   * @param rowCounts 盤面各軸列數 (預設 [3, 3, 3, 3, 3])
   * @param currentPaytable 賠率表
   * @param customPaylines 自訂線路
   * @returns 完整的觸發 RNG 序列 (包含 targetCombo 次中獎消除與第 targetCombo+1 步終止消除的 RNG)
   */
  public async generateTriggerSequence(
    targetCombo: number,
    baseStripSets?: string[][][],
    rowCounts: number[] = [3, 3, 3, 3, 3],
    currentPaytable?: PaytableRule[],
    customPaylines?: number[][]
  ): Promise<number[][] | null> {
    const { getWinningPositions } = await import('../../utils/evaluation');
    const paylinesToUse = (customPaylines && customPaylines.length > 0) ? customPaylines : this.getDefaultConfig().paylines;
    const ptable = (currentPaytable && currentPaytable.length > 0) ? currentPaytable : this.getDefaultPaytable();
    const reelCount = 5;

    // 取得 4 組 Base 滾輪表
    const allSets: string[][][] = [];
    for (let i = 0; i < 4; i++) {
      if (baseStripSets && baseStripSets[i] && baseStripSets[i].length >= reelCount) {
        allSets.push(baseStripSets[i]);
      } else {
        allSets.push(this.getDefaultReelStrips());
      }
    }

    const MAX_ATTEMPTS = 5000;
    for (let gAttempt = 0; gAttempt < MAX_ATTEMPTS; gAttempt++) {
      const rngSequence: number[][] = [];
      const strips0 = allSets[0];

      // Step 0: 滾輪表 0 隨機起點
      const rng0 = Array.from({ length: reelCount }, (_, c) => {
        const len = strips0[c]?.length || 1;
        return Math.floor(Math.random() * len);
      });

      let currentGrid = this.buildGridFromRng(rng0, strips0, rowCounts, reelCount);
      let evalGrid = this.getEvalGrid(currentGrid, this.id, 3);
      let currentWins = this.evaluate(evalGrid, ptable, { gameType: this.id, paylines: paylinesToUse }, paylinesToUse, false);

      if (currentWins.length === 0) continue;

      rngSequence.push(rng0);
      let success = true;

      for (let step = 1; step <= targetCombo; step++) {
        const winningCoordsMap = getWinningPositions(
          evalGrid, currentWins, ptable, this.id, undefined, paylinesToUse
        );
        const winningCoords = new Set(winningCoordsMap.keys());
        const isLastStep = (step === targetCombo);
        const stripSetIdx = this.getStripSetIndex(step);
        const targetStripSet = allSets[stripSetIdx];

        let foundStepRng: number[] | null = null;
        let nextStepGrid: string[][] | null = null;
        let nextStepWins: WinResult[] | null = null;

        for (let sAttempt = 0; sAttempt < 150; sAttempt++) {
          const candidateRng = Array.from({ length: reelCount }, (_, c) => {
            const len = targetStripSet[c]?.length || 1;
            return Math.floor(Math.random() * len);
          });

          const testGrid = this.cascadeStep(currentGrid, winningCoords, candidateRng, targetStripSet, rowCounts);
          const testEvalGrid = this.getEvalGrid(testGrid, this.id, 3);
          const testWins = this.evaluate(testEvalGrid, ptable, { gameType: this.id, paylines: paylinesToUse }, paylinesToUse, false);

          if (isLastStep) {
            if (testWins.length === 0) {
              foundStepRng = candidateRng;
              nextStepGrid = testGrid;
              nextStepWins = testWins;
              break;
            }
          } else {
            if (testWins.length > 0) {
              foundStepRng = candidateRng;
              nextStepGrid = testGrid;
              nextStepWins = testWins;
              break;
            }
          }
        }

        if (!foundStepRng) {
          success = false;
          break;
        }

        rngSequence.push(foundStepRng);
        currentGrid = nextStepGrid!;
        currentWins = nextStepWins!;
        evalGrid = this.getEvalGrid(currentGrid, this.id, 3);
      }

      if (success) {
        return rngSequence;
      }
    }

    return null;
  }

  public override evaluate(
    grid: string[][],
    paytable: PaytableRule[],
    config: GameConfig,
    customPaylines?: number[][],
    includeZeroPayout: boolean = false
  ): WinResult[] {
    if (!grid || grid.length === 0 || !paytable || paytable.length === 0) return [];

    const effectivePaylines = (customPaylines && customPaylines.length > 0)
      ? customPaylines
      : (config.paylines && config.paylines.length > 0)
        ? config.paylines
        : (this.getDefaultConfig().paylines || []);

    const results: WinResult[] = [];
    const paytableMap = new Map<string, PaytableRule>();
    for (const r of paytable) paytableMap.set(r.symbolId, r);

    // M1 規則（用於 WX 5 連線比照 M1 5 連線派彩）
    const m1Rule = paytableMap.get('M1');

    effectivePaylines.forEach((line, lineIdx) => {
      // 提取該線路上的 5 個符號
      const lineSyms: string[] = [];
      const lineCells: string[] = [];
      for (let c = 0; c < grid.length; c++) {
        const r = line[c];
        if (r === undefined || r < 0 || r >= grid[c].length) break;
        const cell = grid[c][r];
        lineCells.push(cell);
        lineSyms.push((cell || '').split('_')[0]);
      }

      if (lineSyms.length < grid.length) return;

      // 檢查金框倍數
      const getMultiplier = (count: number) => {
        let goldFrameMultipliers = 0;
        for (let c = 0; c < count; c++) {
          const r = line[c];
          const posKey = `${c}-${r}`;
          const cell = lineCells[c];
          if (config.goldFrames && config.goldFrames[posKey]) {
            goldFrameMultipliers += config.goldFrames[posKey];
          }
          if (cell && cell.includes('_') && cell.match(/^[F|L][1-4]_/)) {
            const valStr = cell.split('_')[1];
            const num = parseInt(valStr.replace('X', ''), 10);
            if (!isNaN(num)) goldFrameMultipliers += num;
          }
        }
        return goldFrameMultipliers;
      };

      // 1. 特色符號 B1（獅子）：WX 不能代替 B1，需自第 0 輪開始連續 B1
      if (lineSyms[0] === 'B1') {
        let b1Count = 0;
        for (let c = 0; c < lineSyms.length; c++) {
          if (lineSyms[c] === 'B1') b1Count++;
          else break;
        }
        if (b1Count >= 3) {
          const coords = line.slice(0, b1Count).map((r, c) => `${c}-${r}`);
          results.push({
            symbolId: 'B1',
            matchCount: b1Count,
            ways: 1,
            payout: 0,
            totalWin: 0,
            lineIndex: lineIdx,
            winCoords: coords
          } as any);
        }
        return; // B1 該線不再判定其他普通符號
      }

      // 2. 計算開頭連續 WX 數量
      let wxPrefix = 0;
      for (let c = 0; c < lineSyms.length; c++) {
        if (lineSyms[c] === 'WX') wxPrefix++;
        else break;
      }

      // 情況 A：整條線 5 顆都是 WX -> 官方規格給予 M1 5 連線分數
      if (wxPrefix === 5) {
        const payout = m1Rule?.payouts?.match5 || 1000;
        const mult = getMultiplier(5);
        const totalWin = mult > 0 ? payout * mult : payout;
        const coords = line.map((r, c) => `${c}-${r}`);
        results.push({
          symbolId: 'M1', // 以 M1 5 連線計
          matchCount: 5,
          ways: 1,
          payout,
          totalWin,
          lineIndex: lineIdx,
          multiplier: mult > 0 ? mult : undefined,
          winCoords: coords
        } as any);
        return;
      }

      // 情況 B：前 1~4 顆是 WX，看後面接什麼符號（給該符號連線分數，絕非 M1 短連線）
      let targetSym = '';
      let matchCount = 0;

      if (wxPrefix > 0) {
        const nextSym = lineSyms[wxPrefix];
        if (nextSym === 'B1') {
          // WX 不能代替 B1，且未達 5 顆 WX，無法成線
          return;
        }
        targetSym = nextSym;
        matchCount = wxPrefix + 1;
        // 繼續檢查後續符號是否為 targetSym 或 WX
        for (let c = wxPrefix + 1; c < lineSyms.length; c++) {
          if (lineSyms[c] === targetSym || lineSyms[c] === 'WX') {
            matchCount++;
          } else {
            break;
          }
        }
      } else {
        // 情況 C：開頭第 0 顆不是 WX
        targetSym = lineSyms[0];
        matchCount = 1;
        for (let c = 1; c < lineSyms.length; c++) {
          if (lineSyms[c] === targetSym || lineSyms[c] === 'WX') {
            matchCount++;
          } else {
            break;
          }
        }
      }

      // 判斷 targetSym 連線是否達有效連線數 (一般中獎 >= 3，若 includeZeroPayout 則涵蓋未達中獎之 2 連線)
      if (matchCount >= 3 || (includeZeroPayout && matchCount >= 2)) {
        const rule = paytableMap.get(targetSym);
        const payout = matchCount >= 3 ? (rule?.payouts?.[`match${matchCount}` as keyof typeof rule.payouts] || 0) : 0;
        if (payout > 0 || includeZeroPayout) {
          const mult = getMultiplier(matchCount);
          const totalWin = mult > 0 ? payout * mult : payout;
          const coords = line.slice(0, matchCount).map((r, c) => `${c}-${r}`);
          results.push({
            symbolId: targetSym,
            matchCount,
            ways: 1,
            payout,
            totalWin,
            lineIndex: lineIdx,
            multiplier: mult > 0 ? mult : undefined,
            winCoords: coords
          } as any);
        }
      }
    });

    return results;
  }
}
