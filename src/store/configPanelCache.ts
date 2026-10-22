import type { PaytableRule } from '../types';

/**
 * 設定面板（ConfigPanel）的元件內狀態，依主畫面分頁保存。
 * 切換遊戲分頁時面板會以分頁 id 重新掛載，從這裡取回該分頁的滾輪表編輯內容與賠率表。
 */
export interface ConfigPanelLocalState {
  selectedTemplate: string;
  baseGridData: string[][];
  freeGridData: string[][];
  activeStripTab: 'base' | 'free';
  paytableMap: Record<string, PaytableRule>;
}

export const configPanelCache = new Map<string, ConfigPanelLocalState>();
