import type { IGameEnvironment } from '../base/IGameEnvironment';
import type { GameConfig, PaytableRule, ReelStrips } from '../../types';
import { evaluateGrid } from '../../utils/evaluation';
import type { WinResult } from '../../utils/evaluation';

export const LineGameEnvironment: IGameEnvironment = {
  id: 'linegame',
  name: 'Line Game Default',
  getDefaultConfig: (): GameConfig => ({ gameType: 'linegame' }),
  getDefaultPaytable: (): PaytableRule[] => [],
  getDefaultReelStrips: (): ReelStrips => [],
  evaluate: (grid: string[][], paytable: PaytableRule[], config: GameConfig, customPaylines?: number[][]): WinResult[] => {
    return evaluateGrid(grid, paytable, config, customPaylines);
  }
};
