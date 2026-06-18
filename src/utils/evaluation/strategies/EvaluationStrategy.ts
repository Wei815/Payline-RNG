import type { PaytableRule, GameConfig } from '../../../types';
import type { WinResult } from '../../evaluation';

export interface EvaluationContext {
  grid: string[][];
  paytable: PaytableRule[];
  gameConfig: GameConfig;
  wildSymbols: Set<string>;
  includeZeroPayout: boolean;
}

export interface EvaluationStrategy {
  evaluate(context: EvaluationContext, rule: PaytableRule): WinResult[];
}
