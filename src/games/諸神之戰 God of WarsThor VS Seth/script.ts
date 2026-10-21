import { DefaultScriptFormatter, mathIdsOrRng, type ScriptCombination, type ScriptContext } from '../base/ScriptFormat';

/** 免遊 (WY) 模式的預設 WY ClassID */
const FG_CLASS_ID = '\t[2,10,0],';

/** 諸神之戰腳本格式：免遊模式輸出 MathID 盤面並附加 WY ClassID */
class GodsScriptFormatter extends DefaultScriptFormatter {
  protected override classSuffix(_c: ScriptCombination | undefined, ctx: ScriptContext): string {
    return ctx.isFreeGame ? FG_CLASS_ID : '';
  }

  override copyAllLine(c: ScriptCombination, ctx: ScriptContext): string {
    return ctx.isFreeGame ? `${mathIdsOrRng(c)},${FG_CLASS_ID}` : super.copyAllLine(c, ctx);
  }

  override clickCopy(c: ScriptCombination, ctx: ScriptContext): string {
    return this.copyAllLine(c, ctx);
  }

  protected override displayBody(c: ScriptCombination, ctx: ScriptContext): string {
    return `${super.displayBody(c, ctx)}${ctx.isFreeGame ? `,${FG_CLASS_ID}` : ''}`;
  }
}

export const godsScriptFormatter = new GodsScriptFormatter();
