import { BaseLineGame } from '../base/BaseLineGame';
import type { GameConfig, PaytableRule, ReelStrips, GameType } from '../../types';

export class ClassicLineGame extends BaseLineGame {
  readonly id: GameType = 'linegame';
  readonly name = '經典線遊戲 (Classic Line)';

  getDefaultConfig(): GameConfig {
    return {
      gameType: this.id,
      paylines: []
    };
  }

  getDefaultPaytable(): PaytableRule[] {
    return [];
  }

  getDefaultReelStrips(): ReelStrips {
    return {
      0: [], 1: [], 2: [], 3: [], 4: []
    };
  }
}
