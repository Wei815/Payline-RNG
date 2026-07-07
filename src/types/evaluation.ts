export interface PaytableRule {
  symbolId: string;
  name: string;
  payouts: { match2: number; match3: number; match4: number; match5: number; match6?: number; };
  isWild: boolean;
  isScatter: boolean;
  mathId?: string | number;
  isEnabled?: boolean;
}
