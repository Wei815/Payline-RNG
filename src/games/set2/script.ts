import { DefaultScriptFormatter, type ComboDisplay, type ScriptCombination, type ScriptContext } from '../base/ScriptFormat';

/** 有消除（8 個以上）時，附加對應個數的掉落遞補 MathID */
const dropLine = (c: ScriptCombination) =>
  c.fullMathIds && c.length >= 8 ? `[${(c.dropMathIds || []).slice(0, c.length).join(',')}],` : '';

const fullIds = (c: ScriptCombination) => `[${c.fullMathIds!.slice(0, 30).join(',')}],`;

/** 決戰賽特2腳本格式：MathID 盤面 + 掉落遞補 MathID */
class Set2ScriptFormatter extends DefaultScriptFormatter {
  override copyAllLine(c: ScriptCombination): string {
    return (c.fullMathIds ? fullIds(c) : `[${c.rng?.join(',')}],`) + dropLine(c);
  }

  override clickCopy(c: ScriptCombination): string {
    return (c.fullMathIds ? fullIds(c) : '') + dropLine(c);
  }

  override dropPreview(targetComb: ScriptCombination | undefined, dropLength: number): string {
    if (!targetComb?.dropMathIds || dropLength <= 0) return '';
    return `[${targetComb.dropMathIds.slice(0, dropLength).map(id => String(id)).join(',')}],`;
  }

  override display(c: ScriptCombination, _ctx: ScriptContext, manual?: string): ComboDisplay {
    const ids = `[${c.fullMathIds?.slice(0, 30).join(',')}]`;
    const out: ComboDisplay = { kind: 'mathIds', main: manual ?? `${ids},`, mainTitle: manual ?? ids };
    if (c.dropMathIds && c.dropMathIds.length > 0) {
      const drop = `[${(c.dropMathIds || []).slice(0, c.length).join(',')}]`;
      out.drop = `${drop}, (自動複製)`;
      out.dropTitle = drop;
    } else {
      out.drop = '無消除 (自動複製)';
    }
    return out;
  }
}

export const set2ScriptFormatter = new Set2ScriptFormatter();
