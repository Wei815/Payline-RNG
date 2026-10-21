import { DefaultScriptFormatter, mathIdsOrRng, type ComboDisplay, type ScriptCombination, type ScriptContext } from '../base/ScriptFormat';

/** 奢華腳本格式：MathID 盤面 + 金框 / Jackpot ClassID */
class LuxeScriptFormatter extends DefaultScriptFormatter {
  /** 組合自帶 ClassID，否則用 UI 上手動擺放的金框 / Jackpot */
  protected override classSuffix(c: ScriptCombination | undefined, ctx: ScriptContext): string {
    const classStr = c?.classStr || ctx.combinedClassIdStr;
    return classStr ? `\t${classStr},` : '';
  }

  override copyAllLine(c: ScriptCombination): string {
    return c.classStr ? `${mathIdsOrRng(c)},\t${c.classStr},` : `${mathIdsOrRng(c)},`;
  }

  override testCaseRng(c: ScriptCombination, ctx: ScriptContext): string {
    return `[${this.rngForOutput(c, ctx)?.join(',')}],${c.classStr ? `\t${c.classStr},` : ''}`;
  }

  override clickCopy(c: ScriptCombination, ctx: ScriptContext): string {
    return `${mathIdsOrRng(c)},${this.classSuffix(c, ctx)}`;
  }

  override display(c: ScriptCombination, _ctx: ScriptContext, manual?: string): ComboDisplay {
    const ids = `[${c.fullMathIds?.slice(0, 30).join(',')}]`;
    return { kind: 'mathIds', main: manual ?? `${ids},`, mainTitle: manual ?? ids };
  }
}

export const luxeScriptFormatter = new LuxeScriptFormatter();
