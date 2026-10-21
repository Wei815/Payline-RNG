/**
 * ★ 唯一的遊戲清單
 *
 * 新增遊戲只需：建立 src/games/<id>/（遊戲類別 + manifest.ts + __tests__/），並在下方陣列加一行。
 * Sidebar / 歡迎頁 / 遊戲種類下拉選單 / GameRegistry 全部由此清單產生。
 * 陣列順序 = 選單顯示順序。
 */
import type { GameType } from '../types';
import type { GameFamily, GameManifest, GameTraits } from './base/GameManifest';
import { defaultScriptFormatter, type ScriptFormatter } from './base/ScriptFormat';

import classicLine from './classic-line/manifest';
import mermaid from './mermaid/manifest';
import classicPayAnywhere from './classic-payanywhere/manifest';
import set2 from './set2/manifest';
import qin from './qin/manifest';
import luxe from './luxe/manifest';
import elephant from './elephant/manifest';
import gods from './gods/manifest';
import roma from './roma/manifest';

export const GAMES: readonly GameManifest[] = [
  classicLine,
  mermaid,
  classicPayAnywhere,
  set2,
  qin,
  luxe,
  elephant,
  gods,
  roma,
];

/** App 開啟時預設選取的遊戲 */
export const DEFAULT_GAME_ID: GameType = luxe.id;

/** Megaway 尚無遊戲實作，只保留在選單中 */
const MEGAWAY: { id: GameType; label: string; engineName: string; traits: GameTraits } = {
  id: 'megaway',
  label: 'Megaway (測試中)',
  engineName: 'Megaway',
  traits: { family: 'megaway', searchPositionDependent: false, mathIdGenerator: false, specialConfigFromGrid: false },
};

const byId = new Map<GameType, GameManifest>(GAMES.map(g => [g.id, g]));

export function getManifest(id: GameType): GameManifest | undefined {
  return byId.get(id);
}

/** 取得遊戲能力宣告（含 megaway）；未知 id 回傳 undefined，供舊資料（如舊腳本的 gameType）容錯使用 */
export function findTraits(id: string): GameTraits | undefined {
  if (id === MEGAWAY.id) return MEGAWAY.traits;
  return byId.get(id as GameType)?.traits;
}

/** 取得遊戲能力宣告；未註冊的 gameType 直接拋錯 */
export function getTraits(id: GameType): GameTraits {
  const t = findTraits(id);
  if (!t) throw new Error(`Game manifest for ${id} not found.`);
  return t;
}

export const getFamily = (id: GameType): GameFamily => getTraits(id).family;

/** 側邊欄 / 歡迎頁「遊戲基底」 */
export const ENGINE_MENU: { name: string; id: GameType }[] = [
  ...GAMES.filter(g => g.engineName).map(g => ({ name: g.engineName!, id: g.id })),
  { name: MEGAWAY.engineName, id: MEGAWAY.id },
];

/** 側邊欄 / 歡迎頁「遊戲範本」 */
export const TEMPLATE_MENU: { name: string; id: GameType }[] =
  GAMES.filter(g => g.templateName).map(g => ({ name: g.templateName!, id: g.id }));

/** 遊戲種類下拉選單（依家族分組） */
const FAMILY_GROUPS: { family: GameFamily; label: string }[] = [
  { family: 'way', label: '路徑機台 (Way Game)' },
  { family: 'megaway', label: 'Megaway 系統' },
  { family: 'payanywhere', label: '隨處支付 (Pay Anywhere)' },
  { family: 'line', label: '連線機台 (Line Game)' },
];

export const GAME_SELECT_GROUPS: { label: string; options: { id: GameType; label: string }[] }[] =
  FAMILY_GROUPS.map(({ family, label }) => ({
    label,
    options: [...GAMES, MEGAWAY].filter(g => g.traits.family === family).map(g => ({ id: g.id, label: g.label })),
  }));

/**
 * 側邊欄 / 歡迎頁點擊名稱 → 切換遊戲並觸發範本載入
 * 回傳 [gameType, loadTemplateTrigger]
 */
export function resolveMenuSelection(name: string): [GameType | undefined, string] {
  const engine = ENGINE_MENU.find(e => e.name === name);
  if (engine) return [engine.id, '預設泛用'];
  return [TEMPLATE_MENU.find(t => t.name === name)?.id, name];
}

/** 依上傳的 Excel 檔名辨識遊戲；可限定家族（例如有 Line Table 時只找線遊戲） */
export function detectGameByFileName(fileName: string, family?: GameFamily): GameManifest | undefined {
  return GAMES.find(g =>
    (!family || g.traits.family === family) &&
    g.fileNameKeywords?.some(k => fileName.includes(k)),
  );
}

/** 依範本 Overview 的 Way 數辨識遊戲 */
export function detectGameByWays(ways: number): GameManifest | undefined {
  return GAMES.find(g => g.templateWays === ways);
}

/** 取得遊戲的 QA 腳本格式化器 */
export function getScriptFormatter(id: GameType): ScriptFormatter {
  return byId.get(id)?.script ?? defaultScriptFormatter;
}
