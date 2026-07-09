export interface PaytableRule {
  symbolId: string;
  name: string;
  payouts: Record<string, number>;
  isWild: boolean;
  isScatter: boolean;
  mathId?: string | number;
  isEnabled?: boolean;
}
