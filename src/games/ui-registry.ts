/**
 * 遊戲專屬 UI 清單（只給 React 元件使用；Worker / 引擎層請用 registry.ts）
 * 遊戲有自己的 ui.tsx 時在此加一行。
 */
import type { GameType } from '../types';
import type { GameUi } from './base/GameUi';
import { godsUi } from './諸神之戰 God of WarsThor VS Seth/ui';
import { romaUi } from './羅馬競技場 Roma/ui';

const GAME_UI: Partial<Record<GameType, GameUi>> = {
  linegame_gods: godsUi,
  linegame_roma: romaUi,
};

const EMPTY: GameUi = {};

export const getGameUi = (id: GameType): GameUi => GAME_UI[id] ?? EMPTY;
