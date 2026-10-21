/**
 * 流程規則測試的「已知問題」清單
 *
 * 規則測試以固定種子執行，違規筆數是確定的。這裡列出目前已確認、尚未修正的問題與其筆數：
 * - 出現清單外的違規 → 測試失敗（新產生的問題）
 * - 筆數變多 → 測試失敗（問題擴大）
 * - 筆數變少 → 測試失敗並提示更新清單（問題已修正，請把數字調低或刪除該項）
 *
 * 每一項對應報告中的 Finding 編號（見 docs/flow-test-report.md）。
 * 以 FLOW_PRINT_KNOWN=1 執行可印出目前實際筆數，方便修正後更新。
 */
import { expect } from 'vitest';
import type { Violation } from './flowRules';

export type KnownIssues = Record<string, { count: number; finding: string }>;

/** scope = 遊戲 ID；只比對該遊戲的違規與已知項目 */
export function expectKnownIssues(scope: string, violations: Violation[], known: KnownIssues) {
  violations = violations.filter(v => v.game === scope);
  const actual: Record<string, number> = {};
  for (const v of violations) {
    const key = `${v.game} | ${v.rule}`;
    actual[key] = (actual[key] ?? 0) + 1;
  }
  if (process.env.FLOW_PRINT_KNOWN) {
    process.stdout.write(`\n[${scope}] 目前違規筆數：\n${Object.entries(actual).map(([k, n]) => `  '${k}': ${n}`).join('\n')}\n`);
    return;
  }
  const problems: string[] = [];
  known = Object.fromEntries(Object.entries(known).filter(([key]) => key.startsWith(`${scope} | `)));
  for (const [key, n] of Object.entries(actual)) {
    const k = known[key];
    if (!k) problems.push(`新的違規「${key}」×${n}：${violations.filter(v => `${v.game} | ${v.rule}` === key).slice(0, 3).map(v => `${v.comb} → ${v.detail}`).join('；')}`);
    else if (n > k.count) problems.push(`「${key}」違規增加 ${k.count} → ${n}（${k.finding}）`);
    else if (n < k.count) problems.push(`「${key}」違規減少 ${k.count} → ${n}：若已修正 ${k.finding}，請更新 knownIssues 筆數`);
  }
  for (const [key, k] of Object.entries(known)) {
    if (!actual[key]) problems.push(`「${key}」已不再出現：${k.finding} 已修正，請從 knownIssues 移除`);
  }
  expect(problems, problems.join('\n')).toEqual([]);
}
