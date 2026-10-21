/**
 * 已確認、尚未修正的流程問題（Finding 編號見 docs/flow-test-report.md）
 * 修正後請把對應筆數調低或刪除；測試會提示。
 */
import type { KnownIssues } from './knownIssues';

const F01 = 'F01 通用 Pay Anywhere 反向搜尋完全找不到（個數取自賠率表 match3 → 3 個，但評估要 8 個以上才中獎；引擎又以「軸數 < 個數」直接放棄）';
const F02 = 'F02 秦皇：+WX 要求金框但滾輪表沒有金框；4096 ways 下單一路徑組合多數找不到';
const F03 = 'F03 WX 當目標：通用 Line / Way 無法產生；「B1 + WX」不可能卻仍列出';
const F04 = 'F04 搜尋引擎不把「百搭自成連線」算干擾';
const F05 = 'F05 奢華 / 諸神 MathID 產生器以 WX 為目標時盤面錯誤（變成 M1 連線、多出干擾）';
const F06 = 'F06 2 連線（0 賠率）同時出現在多組格子';
const F07 = 'F07 測案 Win=：Way 遊戲遇到 0 賠率的目標就停止掉落，漏算目標贏分';
const F08 = 'F08 大獎區間：測案 Win= 與搜尋引擎的掉落模型不一致';
const F09 = 'F09 決戰賽特2 大獎區間找不到';
const F10 = 'F10 贏分線路一覽：30 線遊戲滿線幾乎必然與其他線重疊（結構性）／DFS 漏解';
const F11 = 'F11 諸神 贏分線路一覽：MathID 填充符號造成其他線中獎';
const F12 = 'F12 通用 Line Game：驗證工具 / 載入腳本把滾輪 RNG 當成 MathID';
const F13 = 'F13 驗證工具：羅馬未使用腳本第 2 行遞補，自行模擬掉落';
const F14 = 'F14 驗證工具的掉落模型（往下掉）與產生器（原位替換）不同';
const F15 = 'F15 反向搜尋漏解：存在零干擾解卻回傳「找不到」或「有干擾」';
const F17 = 'F17 消除掉落測試：掉落後留在盤面的符號被當成 MathID，全部變成 ?M2 / ?M3…';
const F16 = 'F16 皇家金象「×1 + WX」（2 連線含百搭）找不到';

export const GENERATOR_KNOWN: KnownIssues = {
  'payanywhere | N0 找不到組合（無可行滾輪位置）': { count: 116, finding: F01 },
  'waygame_qin | N0 找不到組合（無可行滾輪位置）': { count: 61, finding: F02 },
  'waygame_qin | N1 只找到有干擾的組合': { count: 4, finding: F15 },
  'linegame | N0 找不到組合（無可行滾輪位置）': { count: 6, finding: F03 },
  'linegame | N1 只找到有干擾的組合': { count: 6, finding: F15 },
  'linegame | R3 零干擾': { count: 1, finding: F04 },
  'linegame | R1 恰好一筆目標連線': { count: 4, finding: F06 },
  'linegame_roma | R1 恰好一筆目標連線': { count: 3, finding: F06 },
  'waygame | N0 找不到組合（無可行滾輪位置）': { count: 19, finding: `${F03}；${F15}` },
  'waygame | N1 只找到有干擾的組合': { count: 1, finding: F15 },
  'waygame_elephant | N0 找不到組合（無可行滾輪位置）': { count: 8, finding: F16 },
  'waygame_elephant | F1 測案贏分 = 規則重算': { count: 1, finding: F07 },
  'linegame_set2 | R1 恰好一筆目標連線': { count: 2, finding: F05 },
  'linegame_set2 | R2 百搭數量': { count: 2, finding: F05 },
  'linegame_set2 | R3 零干擾': { count: 2, finding: F05 },
  'linegame_gods | R1 恰好一筆目標連線': { count: 2, finding: F05 },
  'linegame_gods | R2 百搭數量': { count: 2, finding: F05 },
  'linegame_gods | R3 零干擾': { count: 2, finding: F05 },
};

export const SPECIAL_KNOWN: KnownIssues = {
  'payanywhere | W0 找不到大獎區間組合': { count: 5, finding: F01 },
  'payanywhere | C0 找不到任何連續消除組合': { count: 1, finding: F01 },
  'payanywhere_set2 | W0 找不到大獎區間組合': { count: 5, finding: F09 },
  'waygame | W2 測案 Win= 落在區間': { count: 1, finding: F08 },
  'waygame_qin | W2 測案 Win= 落在區間': { count: 3, finding: F08 },
  'waygame_elephant | W2 測案 Win= 落在區間': { count: 2, finding: F08 },
  'linegame_roma | W2 測案 Win= 落在區間': { count: 3, finding: F08 },
};

export const LINE_VIEWER_KNOWN: KnownIssues = {
  'linegame | L2 零干擾': { count: 104, finding: F10 },
  'linegame_gods | L2 零干擾': { count: 4, finding: F11 },
};

export const VALIDATOR_KNOWN: KnownIssues = {
  'linegame | V1 驗證工具贏分 = 規則重算': { count: 16, finding: F12 },
  'linegame_roma | V1 驗證工具贏分 = 規則重算': { count: 6, finding: F13 },
  'linegame_roma | V2 羅馬遞補應使用腳本下一行': { count: 18, finding: F13 },
  'waygame_qin | V1 驗證工具贏分 = 規則重算': { count: 1, finding: F14 },
};

export const SNIPPET_KNOWN: KnownIssues = {
  'linegame | S1 載入盤面 = 腳本盤面': { count: 13, finding: F12 },
};

export const TUMBLE_KNOWN: KnownIssues = {
  'payanywhere_set2 | T3 掉落後符號可辨識': { count: 8, finding: F17 },
};
