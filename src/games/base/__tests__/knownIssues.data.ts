/**
 * 已確認、尚未修正的流程問題（Finding 編號見 docs/flow-test-report.md）
 * 修正後請把對應筆數調低或刪除；測試會提示。
 */
import type { KnownIssues } from './knownIssues';

const F03 = 'F03 WX 當目標：通用 Line / Way 無法產生（Scatter + WX 已不再列出）';
const F05 = 'F05 奢華 / 諸神 WX × 4、WX × 5 結構上無乾淨解：全百搭 4 連依規則算成 M1 × 4；5 連時共用前兩格的其他線必與第 3 軸填充符號成 3 連（已如實標為有干擾）';
const F08 = 'F08 羅馬大獎區間：搜尋引擎用通用掉落模型找大獎，但羅馬實際遞補由下一筆 RNG 決定（測案 Win= 已改用遊戲規則）';
const F09 = 'F09 決戰賽特2 大獎區間找不到';
const F10 = 'F10 贏分線路一覽：30 線遊戲滿線幾乎必然與其他線重疊（結構性）／DFS 漏解';
const F11 = 'F11 諸神 贏分線路一覽：MathID 填充符號造成其他線中獎';
const F13 = 'F13 驗證工具：羅馬未使用腳本第 2 行遞補，自行模擬掉落';
const F15 = 'F15 線遊戲反向搜尋偶爾只回傳有干擾的解（Way 類已改為建構式搜尋修正）';
const F16 = 'F16 皇家金象「×1 + WX」（2 連線含百搭）找不到';
const F18 = 'F18 Scatter 目標沒有建構式搜尋：要求掉落後零中獎後，人魚 B1 × 5 在隨機預算內只找到有干擾的解';

export const GENERATOR_KNOWN: KnownIssues = {
  'linegame | N0 找不到組合（無可行滾輪位置）': { count: 5, finding: F03 },
  'linegame | N1 只找到有干擾的組合': { count: 5, finding: F15 },
  'waygame | N1 只找到有干擾的組合': { count: 1, finding: F18 },
  'waygame | N0 找不到組合（無可行滾輪位置）': { count: 5, finding: F03 },
  'waygame_elephant | N0 找不到組合（無可行滾輪位置）': { count: 8, finding: F16 },
  'linegame_set2 | N1 只找到有干擾的組合': { count: 2, finding: F05 },
  'linegame_gods | N1 只找到有干擾的組合': { count: 2, finding: F05 },
};

export const SPECIAL_KNOWN: KnownIssues = {
  'payanywhere_set2 | W0 找不到大獎區間組合': { count: 5, finding: F09 },
  'linegame_roma | W2 測案 Win= 落在區間': { count: 3, finding: F08 },
};

export const LINE_VIEWER_KNOWN: KnownIssues = {
  'linegame | L2 零干擾': { count: 104, finding: F10 },
  'linegame_gods | L2 零干擾': { count: 4, finding: F11 },
};

export const VALIDATOR_KNOWN: KnownIssues = {
  'linegame_roma | V1 驗證工具贏分 = 規則重算': { count: 6, finding: F13 },
  'linegame_roma | V2 羅馬遞補應使用腳本下一行': { count: 18, finding: F13 },
};

export const SNIPPET_KNOWN: KnownIssues = {
};

export const TUMBLE_KNOWN: KnownIssues = {};
