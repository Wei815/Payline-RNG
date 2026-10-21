import type { GameType } from '../../types';
import type { IGameEnvironment } from './IGameEnvironment';

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
  create(): IGameEnvironment;
}

export const defineGame = (m: GameManifest): GameManifest => m;
