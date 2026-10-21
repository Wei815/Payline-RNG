import { BaseWayGame } from '../base/BaseWayGame';
import type { GameConfig, PaytableRule, ReelStrips, GameType } from '../../types';

export class MermaidGame extends BaseWayGame {
  readonly id: GameType = 'waygame';
  readonly name = '美人魚 (Mermaid)';

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
    return [[], [], [], [], []];
  }
}
