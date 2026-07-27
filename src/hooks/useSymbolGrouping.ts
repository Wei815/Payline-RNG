import { useMemo } from 'react';
import type { PaytableRule } from '../types';
import { GameTypes, SpecialSymbols, SymbolGroupOrder, SymbolCategories } from '../constants/GameConstants';

const SymbolGroupOrderMap = new Map<string, number>(
  SymbolGroupOrder.map((sym, idx) => [sym, idx])
);

interface SymbolGroup {
  id: string;
  title: string;
  list: string[];
}

export function useSymbolGrouping(
  currentStrips: string[][],
  currentPaytable: PaytableRule[],
  gameType: string
): SymbolGroup[] {
  return useMemo(() => {
    const disabledSymbols = new Set(
      currentPaytable.filter(r => r.isEnabled === false).map(r => r.symbolId)
    );
    
    const allSyms = new Set<string>();
    currentStrips.forEach(strip => {
      if (!strip) return;
      strip.forEach(s => {
        if (s && s !== '-' && s !== '' && !disabledSymbols.has(s)) {
          allSyms.add(s);
        }
      });
    });

    if (allSyms.size === 0) {
      currentPaytable.forEach(r => {
        if (r.symbolId && r.isEnabled !== false) {
          allSyms.add(r.symbolId);
        }
      });
    }

    const symList = Array.from(allSyms);

    const getBase = (sym: string): string => {
      const s = sym.toUpperCase();
      if (s === SpecialSymbols.WILD || s === SpecialSymbols.WX || s === SpecialSymbols.WW) return SpecialSymbols.WX;
      if (s === 'WT' || s === 'WTE') return SpecialSymbols.TE;
      if (s === 'WN' || s === 'WNI') return SpecialSymbols.NI;
      if (/^W\d+$/.test(s)) return `M${s.substring(1)}`;
      if (/^W[AKQJ]$/.test(s)) return s.substring(1);
      return s;
    };

    const getOrderScore = (sym: string): number => {
      const base = getBase(sym);
      const idx = SymbolGroupOrderMap.get(base);
      return idx !== undefined ? idx : 999;
    };

    const sorted = symList.sort((a, b) => getOrderScore(a) - getOrderScore(b));

    const others: string[] = [];
    const mnum: string[] = [];
    const mlet: string[] = [];

    sorted.forEach(sym => {
      const base = getBase(sym);
      const b = base.toUpperCase();
      
      if (
        b === SpecialSymbols.WX || 
        b === SpecialSymbols.WILD || 
        b === SpecialSymbols.WW || 
        b === SpecialSymbols.B1 || 
        b === SpecialSymbols.S1
      ) {
        others.push(sym);
      } else if (/^M\d+$/.test(b)) {
        mnum.push(sym);
      } else if (['A', 'K', 'Q', 'J', SpecialSymbols.TE, SpecialSymbols.NI, 'T', 'N'].includes(b)) {
        mlet.push(sym);
      } else {
        others.push(sym);
      }
    });

    if (gameType === GameTypes.PAY_ANYWHERE_SET2) {
      const hasB1 = others.includes(SpecialSymbols.B1);
      const hasB2 = others.includes(SpecialSymbols.B2);
      
      if (hasB1 || hasB2) {
        if (hasB1) others.splice(others.indexOf(SpecialSymbols.B1), 1);
        if (hasB2) others.splice(others.indexOf(SpecialSymbols.B2), 1);
        others.unshift('B1/B2');
      }
    }

    return [
      { id: SymbolCategories.OTHERS, title: '第一區塊 (其他)', list: others },
      { id: SymbolCategories.M_NUM, title: '第二區塊 (M數字)', list: mnum },
      { id: SymbolCategories.M_LET, title: '第三區塊 (M字母)', list: mlet }
    ].filter(g => g.list.length > 0);
  }, [currentStrips, currentPaytable, gameType]);
}
