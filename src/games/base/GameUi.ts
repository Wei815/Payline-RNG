/**
 * 遊戲專屬 UI 擴充點
 *
 * 共用的 SlotGeneratorTab 只負責通用流程，遊戲專屬的面板 / 按鈕寫在 src/games/<遊戲>/ui.tsx，
 * 並在 src/games/ui-registry.ts 登記。（與 registry.ts 分開，避免 Worker 載入 React。）
 */
import type React from 'react';
import type { ScriptCombination } from './ScriptFormat';

export interface FreeGameToggleProps {
  isFreeGame: boolean;
  setIsFreeGame: (v: boolean) => void;
}

export interface TriggerPanelProps {
  selectedTriggerCombo: number;
  setSelectedTriggerCombo: (combo: number) => void;
  triggerRngSequence: number[][] | null;
  isGeneratingTrigger: boolean;
  regenerate: () => void;
}

export interface ExtraCopyButtonsProps {
  combinations: ScriptCombination[];
  isSearching: boolean;
  selectedSymbol: string;
}

export interface CurrentRngPreviewProps {
  targetComb?: ScriptCombination;
  formattedRngArray: string[];
  isManualEdited: boolean;
  manualRefillRng: number[] | null;
  isFreeGame: boolean;
  triggerRngSequence: number[][] | null;
  hasPayingWin: boolean;
}

export interface GameUi {
  /** 產生器右上角的 BG / FG 模式切換 */
  FreeGameToggle?: React.FC<FreeGameToggleProps>;
  /** 免遊模式下的觸發序列設定面板（遊戲需實作 generateTriggerSequence） */
  TriggerPanel?: React.FC<TriggerPanelProps>;
  /** 「連線組合清單」標題列的額外複製按鈕 */
  ExtraCopyButtons?: React.FC<ExtraCopyButtonsProps>;
  /** 目前 RNG 預覽；回傳 null 時使用通用顯示 */
  CurrentRngPreview?: (props: CurrentRngPreviewProps) => React.ReactNode | null;
}
