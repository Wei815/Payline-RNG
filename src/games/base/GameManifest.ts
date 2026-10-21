import type { GameType, MultiplierInterval } from '../../types';
import type { IGameEnvironment } from './IGameEnvironment';
import type { ScriptFormatter } from './ScriptFormat';

/** 遊戲家族：決定共用層使用哪一套連線判定 / SVG 繪線 / 顯示文字 */
export type GameFamily = 'line' | 'way' | 'payanywhere' | 'megaway';

/**
 * 能力宣告 (Traits)
 *
 * 共用程式碼（搜尋引擎、UI、Worker）只能讀這裡的旗標，
 * 禁止再寫 `gameType === 'linegame_xxx'` 之類的具體遊戲判斷。
 * 新遊戲需要新行為時：在此新增旗標（預設值 = 舊行為），只在自己的 manifest 打開。
 */
export interface GameTraits {
  family: GameFamily;
  /**
   * RNG 反向搜尋時是否依位置判定（線路 / 路徑必須從第 0 軸起連續）。
   * 注意：與 AbstractGame.isPositionDependent() 意義不同，這裡完全沿用 RngSearchEngine 既有的名單。
   */
  searchPositionDependent: boolean;
  /**
   * 以 MathID 參數驅動、無需滾輪表即可直接產生盤面（決戰賽特2 / 奢華 / 諸神）。
   * ConfigPanel 顯示「參數設定」而非滾輪表，產生器使用即時產生器。
   */
  mathIdGenerator: boolean;
  /** 連續掉落倍數 1,2,4,8...（FG 由 8 起跳，上限 1024）；UI 顯示倍數與 RTP 模擬共用 */
  doublingTumbleMultiplier?: boolean;
  /** 搜尋含百搭的組合時，要求盤面有金框可轉 WX（秦皇 / 皇家金象） */
  goldCascadeSearch?: boolean;
  /** 「贏分線路一覽」分頁改為「消除掉落測試」(TumbleViewer) */
  tumbleViewerTab?: boolean;
  /** ConfigPanel 顯示線路規則表格 */
  showPaylineTable?: boolean;
  /** RTP 儀表板顯示使用條線數（否則顯示遊戲類型） */
  metricsPaylineCount?: boolean;
  /** 賠率表 match3/4/5 代表個數區間（8-9 / 10-11 / 12+），而非連線數 */
  rangedPayouts?: boolean;
  /** 符號選單將 B1、B2 合併為單一「B1/B2」選項 */
  combinedBonusSymbol?: boolean;
  // ---- 可重用的遊戲機制（產生器 / 自訂盤面依此顯示對應編輯器） ----
  /** 金框倍數與 Jackpot（奢華）：取代一般 Scatter 設定，輸出座標式 ClassID */
  goldFramesAndJackpots?: boolean;
  /** S1 幸運草收集（奢華）：S1 顯示為 🍀，取代倍數球 / 幸運球設定 */
  cloverCollection?: boolean;
  /** F1~F4 倍數球設定面板 */
  multiplierBalls?: boolean;
  /** WY 整軸百搭與 (a,b,z) 倍數設定（諸神） */
  wyReels?: boolean;
  /** 盤面格子下方顯示 MathID；MathID 15 / 19 對應 F1 / L1 倍數球 */
  cellMathIdLabel?: boolean;
  /** MathID 15 / 19 解讀為 F1 / L1 倍數球 */
  ballMathIds?: boolean;
  /** 腳本 RNG 直接使用搜尋結果的 30 碼 MathID 盤面 */
  flatMathIdRng?: boolean;
  /**
   * 測試腳本 (Snippet) ClassIDs 的意義：
   * - 'coordinate'：每 3 碼 (col,row,值) 表示金框倍數 / Jackpot（奢華、通用線遊戲）
   * - 'wyConfig'：每 3 碼 (a,b,z) 依序對應盤面上出現 WY 的軸（諸神）
   * - 'symbolMultiplier'（預設）：依序作為 F/L 倍數球的倍數
   */
  snippetClassIds?: 'coordinate' | 'wyConfig' | 'symbolMultiplier';
  /** 套用腳本 / 自訂盤面時是否從盤面推導 S1/S2/倍數球設定（預設 true） */
  specialConfigFromGrid?: boolean;
  /** RTP 模擬 Worker 中獎後進行消除掉落（Worker 的掉落為獨立的簡化實作） */
  simulationCascade?: boolean;
  /** 中獎的金框符號轉為 WX 留在盤面（RTP 模擬 / 產生器試算） */
  goldToWild?: boolean;
}

export interface GameManifest {
  id: GameType;
  /** 遊戲種類下拉選單顯示文字 */
  label: string;
  /** 側邊欄 / 歡迎頁「遊戲範本」名稱；對應 templates/ 內 Excel 檔名 */
  templateName?: string;
  /** 側邊欄 / 歡迎頁「遊戲基底」名稱（通用基底才有） */
  engineName?: string;
  traits: GameTraits;
  /** 上傳 Excel 時依檔名辨識為本遊戲的關鍵字 */
  fileNameKeywords?: string[];
  /** 範本 Overview 的 Way 數等於此值時判定為本遊戲 */
  templateWays?: number;
  /** 只靠檔名辨識時套用的固定盤面配置 */
  templateLayout?: { reelCount: number; rowCounts: number[] };
  /** QA 測試腳本格式（未設定則使用 DefaultScriptFormatter） */
  script?: ScriptFormatter;
  /** 大獎倍數區間（未設定則使用 DEFAULT_MULTIPLIER_INTERVALS） */
  multiplierIntervals?: MultiplierInterval[];
  create(): IGameEnvironment;
}

export const defineGame = (m: GameManifest): GameManifest => m;
