import type { GameConfig, PaytableRule, ReelStrips, GameType } from '../../types';
import type { WinResult } from '../../utils/evaluation';

export interface IGameEnvironment {
  readonly id: GameType;
  readonly name: string;
  getDefaultConfig(): GameConfig;
  getDefaultPaytable(): PaytableRule[];
  getDefaultReelStrips(): ReelStrips;
  evaluate(grid: string[][], paytable: PaytableRule[], config: GameConfig, customPaylines?: number[][]): WinResult[];
}
