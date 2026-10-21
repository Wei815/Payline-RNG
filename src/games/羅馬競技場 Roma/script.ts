import { DefaultScriptFormatter, type CurrentRngInput, type ScriptCombination, type ScriptContext } from '../base/ScriptFormat';

const line = (r: (number | string)[]) => `[${r.slice(0, 5).join(',')}],`;

/**
 * 羅馬競技場腳本格式：
 * - 一律純 5 碼，不帶 Strip ID
 * - 有消除時輸出 [初始 RNG] + [遞補 RNG] 多行序列
 * - 免遊模式前置 BaseGame 連鎖觸發序列
 */
class RomaScriptFormatter extends DefaultScriptFormatter {
  /** 連鎖序列；無任何 RNG 時回傳 null */
  private chain(c: ScriptCombination | undefined, ctx: ScriptContext): string | null {
    const fgRngs: number[][] = c?.allRngs || (c?.rng ? [c.rng] : []);
    if (ctx.isFreeGame && ctx.triggerRngSequence && ctx.triggerRngSequence.length > 0) {
      return `${ctx.triggerRngSequence.map(line).join('\n')}\n${fgRngs.map(line).join('\n')}`;
    }
    if (c?.allRngs) return c.allRngs.map(line).join('\n');
    if (c?.rng) return line(c.rng);
    return null;
  }

  override currentRng(input: CurrentRngInput, ctx: ScriptContext): string {
    if (input.isManualEdited) {
      const first = line(input.formattedRngArray);
      return input.manualSafeRng1 ? `${first}\n${line(input.manualSafeRng1)}` : first;
    }
    return this.chain(input.targetComb, ctx) ?? super.currentRng(input, ctx);
  }

  override copyAllLine(c: ScriptCombination, ctx: ScriptContext): string {
    return this.chain(c, ctx) ?? '';
  }

  protected override rngForOutput(c: ScriptCombination) {
    return c.rng ? c.rng.slice(0, 5) : c.rng;
  }

  override clickCopy(c: ScriptCombination, ctx: ScriptContext): string {
    return this.copyAllLine(c, ctx);
  }

  protected override displaySuffix(c: ScriptCombination, ctx: ScriptContext): string {
    if (ctx.isFreeGame && ctx.triggerRngSequence) {
      return ` (觸發${ctx.selectedTriggerCombo}連鎖+FG 共 ${ctx.triggerRngSequence.length + (c.allRngs?.length || 1)} 組)`;
    }
    if (!ctx.isFreeGame && (c.allRngs?.length ?? 0) > 1) return ' (+遞補 0 消除)';
    return '';
  }
}

export const romaScriptFormatter = new RomaScriptFormatter();
