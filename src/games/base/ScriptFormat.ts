/**
 * QA 測試腳本 (RNG 字串) 格式化
 *
 * 「連線測試產生器」複製出去的 RNG 腳本格式因遊戲而異（MathID、ClassID、Strip ID、連鎖遞補序列…）。
 * 共用的 DefaultScriptFormatter 只處理通用格式；遊戲專屬格式寫在 src/games/<遊戲>/script.ts，
 * 透過 manifest.script 掛上。修改某遊戲的腳本格式只需動該遊戲自己的檔案。
 */
import type { GameFamily } from './GameManifest';

/** 產生器搜尋出的單一組合（useRngSearch 產出） */
export interface ScriptCombination {
  name: string;
  length: number;
  wildCount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rng: any[] | null;
  isInterfered: boolean;
  stripId?: number;
  hasS1Drop?: boolean;
  /** MathID 盤面（決戰賽特2 / 奢華 / 諸神） */
  fullMathIds?: number[];
  /** 決戰賽特2 掉落遞補 MathID */
  dropMathIds?: (number | string)[];
  /** 奢華金框 / Jackpot ClassID 字串 */
  classStr?: string;
  /** 連鎖序列（羅馬：初始 + 遞補） */
  allRngs?: number[][];
}

export interface ScriptContext {
  family: GameFamily;
  isFreeGame: boolean;
  /** 羅馬免遊觸發序列 */
  triggerRngSequence: number[][] | null;
  selectedTriggerCombo: number;
  /** 奢華：UI 上手動擺放的金框 / Jackpot 轉成的 ClassID 字串 */
  combinedClassIdStr: string;
  /** 組合未指定 stripId 時使用的目前滾輪表編號 */
  defaultStripId: number;
}

export interface CurrentRngInput {
  targetComb?: ScriptCombination;
  /** 目前盤面每軸 RNG（或 MathID 欄位字串） */
  formattedRngArray: string[];
  isManualEdited: boolean;
  /** 羅馬：手動編輯盤面後自動找出的安全遞補 RNG */
  manualSafeRng1: number[] | null;
}

export type ComboDisplay =
  | { kind: 'raw'; raw: string }
  | { kind: 'mathIds'; main: string; mainTitle: string; drop?: string; dropTitle?: string };

export interface ScriptFormatter {
  /** 目前盤面的 RNG 字串（手動編輯 / 選取組合時複製用） */
  currentRng(input: CurrentRngInput, ctx: ScriptContext): string;
  /** 「複製全部腳本」中的單一組合 */
  copyAllLine(c: ScriptCombination, ctx: ScriptContext): string;
  /** 「複製全部測案」中的 RNG 欄位 */
  testCaseRng(c: ScriptCombination, ctx: ScriptContext): string;
  /** 點擊組合按鈕時複製的內容 */
  clickCopy(c: ScriptCombination, ctx: ScriptContext): string;
  /** 組合按鈕上的 RNG 顯示；manual 為此組合手動編輯後的 currentRng */
  display(c: ScriptCombination, ctx: ScriptContext, manual?: string): ComboDisplay;
  /** 目前盤面消除 dropLength 格時的遞補 MathID 腳本（無則回傳空字串） */
  dropPreview(targetComb: ScriptCombination | undefined, dropLength: number): string;
}

const isWayLike = (ctx: ScriptContext) => ctx.family === 'way' || ctx.family === 'megaway';

export class DefaultScriptFormatter implements ScriptFormatter {
  protected stripIdOf(c: ScriptCombination | undefined, ctx: ScriptContext): number {
    return c?.stripId !== undefined ? Number(c.stripId) : ctx.defaultStripId;
  }

  /** Way 遊戲：前 6 軸 RNG + Strip ID；其他遊戲：原始 RNG */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected rngForOutput(c: ScriptCombination, ctx: ScriptContext): any[] | null {
    if (!isWayLike(ctx)) return c.rng;
    // 搜尋引擎在多組滾輪表時已把 Strip ID 附在停點後（rng 最後一碼），先去掉再附加，
    // 否則 5 軸遊戲取前 6 碼會連 Strip ID 一起取到，輸出 [停點×5, ID, ID]
    const stops = c.stripId !== undefined ? (c.rng || []).slice(0, -1) : (c.rng || []);
    return [...stops.slice(0, 6), this.stripIdOf(c, ctx)];
  }

  /** 腳本行尾附加的 ClassID（例如 `\t[2,10,0],`），預設無 */
  protected classSuffix(_c: ScriptCombination | undefined, _ctx: ScriptContext): string {
    return '';
  }

  currentRng(input: CurrentRngInput, ctx: ScriptContext): string {
    if (isWayLike(ctx)) {
      const extraId = input.targetComb?.stripId !== undefined && !input.isManualEdited
        ? Number(input.targetComb.stripId)
        : ctx.defaultStripId;
      return `[${[...input.formattedRngArray, extraId].join(',')}],`;
    }
    return `[${input.formattedRngArray.join(',')}],${this.classSuffix(input.targetComb, ctx)}`;
  }

  copyAllLine(c: ScriptCombination, ctx: ScriptContext): string {
    return `[${this.rngForOutput(c, ctx)?.join(',')}],`;
  }

  testCaseRng(c: ScriptCombination, ctx: ScriptContext): string {
    return `[${this.rngForOutput(c, ctx)?.join(',')}],${this.classSuffix(c, ctx)}`;
  }

  clickCopy(c: ScriptCombination, ctx: ScriptContext): string {
    return this.copyAllLine(c, ctx);
  }

  dropPreview(_targetComb: ScriptCombination | undefined, _dropLength: number): string {
    return '';
  }

  /** 顯示用 RNG 本體（不含行尾逗號） */
  protected displayBody(c: ScriptCombination, ctx: ScriptContext): string {
    return `[${this.rngForOutput(c, ctx)!.join(',')}]`;
  }

  /** 顯示於 RNG 後方的補充說明 */
  protected displaySuffix(_c: ScriptCombination, _ctx: ScriptContext): string {
    return '';
  }

  display(c: ScriptCombination, ctx: ScriptContext, manual?: string): ComboDisplay {
    const body = manual !== undefined ? manual : this.displayBody(c, ctx);
    return {
      kind: 'raw',
      raw: `RNG: ${body}${this.displaySuffix(c, ctx)} ${c.isInterfered ? '(有干擾)' : ''} ${c.hasS1Drop ? '(有S1掉落)' : ''}`,
    };
  }
}

/** MathID 盤面字串（取前 30 碼），沒有 MathID 時退回原始 RNG */
export const mathIdsOrRng = (c: ScriptCombination) =>
  c.fullMathIds ? `[${c.fullMathIds.slice(0, 30).join(',')}]` : `[${c.rng?.join(',')}]`;

export const defaultScriptFormatter = new DefaultScriptFormatter();
