import { BasePayAnywhere } from '../base/BasePayAnywhere';
import type { GameConfig, PaytableRule, ReelStrips, GameType } from '../../types';

export class ClassicPayAnywhere extends BasePayAnywhere {
  readonly id: GameType = 'payanywhere';
  readonly name = '全盤掉落 (Classic Pay Anywhere)';

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
      0: [], 1: [], 2: [], 3: [], 4: [], 5: []
    };
  }
}
