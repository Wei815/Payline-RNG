import { create } from 'zustand';
import type { PaytableRule, ReelStrips, SpecialSymbolConfig } from '../types';
import { useMachineStore } from './useMachineStore';

export interface GameState {
  currentStrips: ReelStrips;
  currentPaytable: PaytableRule[];
  currentGrid: string[][];
  rowCounts: number[];
  reelCount: number;
  customPaylines: number[][];
  specialSymbolConfig: SpecialSymbolConfig;
  goldFrames: Record<string, number>;
  jackpots: Record<string, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'>;
  clovers: Record<string, boolean>;
  customGridData: string[][];

  manualIndices: string[];
  manualIndicesOther: string[];
  topTracker: string[];
  topTrackerOther: string[];
  activeTab: 'manual' | 'other' | 'lines' | 'customGrid';
  isFreeGame: boolean;
  isProjectLoaded: boolean;
  projectName: string;
  pendingSnippet: any;
  
  setCurrentStrips: (strips: ReelStrips) => void;
  setCurrentPaytable: (paytable: PaytableRule[]) => void;
  setCurrentGrid: (grid: string[][]) => void;
  setRowCounts: (counts: number[]) => void;
  setReelCount: (count: number) => void;
  setCustomPaylines: (paylines: number[][]) => void;
  setSpecialSymbolConfig: (config: SpecialSymbolConfig | ((prev: SpecialSymbolConfig) => SpecialSymbolConfig)) => void;
  setGoldFrames: (frames: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  setJackpots: (jackpots: Record<string, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'> | ((prev: Record<string, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'>) => Record<string, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'>)) => void;
  setClovers: (clovers: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  setCustomGridData: (grid: string[][] | ((prev: string[][]) => string[][])) => void;
  
  setManualIndices: (indices: string[]) => void;
  setManualIndicesOther: (indices: string[]) => void;
  setTopTracker: (tracker: string[]) => void;
  setTopTrackerOther: (tracker: string[]) => void;
  setActiveTab: (tab: 'manual' | 'other' | 'lines' | 'customGrid') => void;
  setIsFreeGame: (val: boolean) => void;
  setIsProjectLoaded: (val: boolean) => void;
  setProjectName: (val: string) => void;
  setPendingSnippet: (val: any) => void;
  applySnippet: (snippet: any) => void;

  resetGameSpecifics: () => void;
  clearProject: () => void;
}

export const defaultSpecialSymbolConfig: SpecialSymbolConfig = {
  s1Enabled: false, s1Count: 0,
  s2Enabled: false, s2Count: 0,
  multipliersEnabled: false, multiplierCounts: {},
  luckyBallsEnabled: false, luckyCounts: {}
};

export const extractSpecialConfigFromGrid = (grid: string[][], baseConfig: SpecialSymbolConfig, gameType: string): SpecialSymbolConfig => {
  if (gameType === 'linegame' || gameType === 'waygame' || gameType === 'megaway') {
    return baseConfig;
  }
  
  const newConfig = { ...defaultSpecialSymbolConfig };
  let s1Count = 0;
  let s2Count = 0;
  const multiplierCounts: Record<string, number> = {};
  const luckyCounts: Record<string, number> = {};
  
  grid.forEach(col => {
    col.forEach(cell => {
      if (cell === 'S1' || cell.startsWith('S1_')) s1Count++;
      if (cell === 'S2' || cell.startsWith('S2_')) s2Count++;
      
      if (cell.match(/^[F|L][1-4]_/)) {
        if (cell.startsWith('F')) {
          multiplierCounts[cell] = (multiplierCounts[cell] || 0) + 1;
        } else if (cell.startsWith('L')) {
          luckyCounts[cell] = (luckyCounts[cell] || 0) + 1;
        }
      }
    });
  });
  
  if (s1Count > 0) {
    newConfig.s1Enabled = true;
    newConfig.s1Count = Math.min(s1Count, 3);
  }
  if (s2Count > 0) {
    newConfig.s2Enabled = true;
    newConfig.s2Count = Math.min(s2Count, 3);
  }
  if (Object.keys(multiplierCounts).length > 0) {
    newConfig.multipliersEnabled = true;
    newConfig.multiplierCounts = multiplierCounts;
  }
  if (Object.keys(luckyCounts).length > 0) {
    newConfig.luckyBallsEnabled = true;
    newConfig.luckyCounts = luckyCounts;
  }
  
  return newConfig;
};

export const useGameStore = create<GameState>((set, get) => ({
  currentStrips: [],
  currentPaytable: [],
  currentGrid: [],
  rowCounts: [3, 3, 3, 3, 3],
  reelCount: 5,
  customPaylines: [],
  specialSymbolConfig: defaultSpecialSymbolConfig,
  goldFrames: {},
  jackpots: {},
  clovers: {},
  customGridData: [],

  manualIndices: ['1', '1', '1', '1', '1'],
  manualIndicesOther: Array(5).fill(''),
  topTracker: Array(4).fill('WX'),
  topTrackerOther: Array(4).fill('WX'),
  activeTab: 'manual',
  isFreeGame: false,
  isProjectLoaded: false,
  projectName: '',
  pendingSnippet: null,

  setCurrentStrips: (strips) => set({ currentStrips: strips }),
  setCurrentPaytable: (paytable) => set({ currentPaytable: paytable }),
  setCurrentGrid: (grid) => set({ currentGrid: grid }),
  setRowCounts: (counts) => set((state) => {
    // Also reset customGridData to match new rowCounts if length differs
    let newCustomGridData = state.customGridData;
    if (!newCustomGridData || newCustomGridData.length !== counts.length || newCustomGridData.some((col, i) => col.length !== counts[i])) {
      newCustomGridData = counts.map(rows => Array(rows).fill(''));
    }
    return { rowCounts: counts, customGridData: newCustomGridData };
  }),
  setReelCount: (count) => set({ reelCount: count }),
  setCustomPaylines: (paylines) => set({ customPaylines: paylines }),
  setSpecialSymbolConfig: (config) => set((state) => ({ specialSymbolConfig: typeof config === 'function' ? config(state.specialSymbolConfig) : config })),
  setGoldFrames: (frames) => set((state) => ({ goldFrames: typeof frames === 'function' ? frames(state.goldFrames) : frames })),
  setJackpots: (jackpots) => set((state) => ({
    jackpots: typeof jackpots === 'function' ? jackpots(state.jackpots) : jackpots
  })),
  setClovers: (clovers) => set((state) => ({
    clovers: typeof clovers === 'function' ? clovers(state.clovers) : clovers
  })),
  setCustomGridData: (grid) => set((state) => ({
    customGridData: typeof grid === 'function' ? grid(state.customGridData) : grid
  })),
  
  setManualIndices: (indices) => set({ manualIndices: indices }),
  setManualIndicesOther: (indices) => set({ manualIndicesOther: indices }),
  setTopTracker: (tracker) => set({ topTracker: tracker }),
  setTopTrackerOther: (tracker) => set({ topTrackerOther: tracker }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setIsFreeGame: (val) => set({ isFreeGame: val }),
  setIsProjectLoaded: (val) => set({ isProjectLoaded: val }),
  setProjectName: (val) => set({ projectName: val }),
  setPendingSnippet: (val) => set({ pendingSnippet: val }),

  applySnippet: (snippet) => {
    const store = get();
    if (!snippet?.qaData?.QA || snippet.qaData.QA.length === 0) return;
    const qa = snippet.qaData.QA[0];
    if (!qa.RNGs || qa.RNGs.length === 0) return;
    const flatIds = qa.RNGs[0];
    
    const paytable = store.currentPaytable;
    const mathIdToSymbol: Record<number, string> = {};
    paytable.forEach(r => {
      if (r.mathId !== undefined) {
        const ids = String(r.mathId).split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        ids.forEach(id => {
          mathIdToSymbol[id] = r.symbolId;
        });
      }
    });

    let idIndex = 0;
    let classIdIndex = 0;
    const flatClassIds = (qa.ClassIDs && qa.ClassIDs.length > 0) ? qa.ClassIDs[0] : [];
    
    const gameType = snippet.gameType || useMachineStore.getState().gameType || '';
    const isCoordinateClassId = gameType === 'linegame_set2' || gameType === 'linegame';
    const newGoldFrames: Record<string, number> = {};
    const newJackpots: Record<string, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'> = {};

    if (isCoordinateClassId && flatClassIds.length > 0) {
      const poolIndexToMultiplier: Record<number, number> = {
        0: 2, 1: 3, 2: 4, 3: 5, 4: 6, 5: 7, 6: 8, 7: 9, 8: 10, 9: 25, 10: 50, 11: 100
      };
      const idToType: Record<number, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'> = {
        12: 'MINI', 13: 'MAJOR', 14: 'MEGA', 15: 'MAXWIN'
      };

      for (let i = 0; i < flatClassIds.length; i += 3) {
        const c = flatClassIds[i];
        const r = flatClassIds[i+1];
        const v = flatClassIds[i+2];
        if (v !== undefined) {
          const key = `${c}-${r}`;
          if (v >= 0 && v <= 11) {
            newGoldFrames[key] = poolIndexToMultiplier[v];
          } else if (v >= 12 && v <= 15) {
            newJackpots[key] = idToType[v];
          }
        }
      }
    }
    
    const reelCount = store.reelCount;
    const rowCounts = store.rowCounts;
    const emptyGrid = Array.from({ length: reelCount }, (_, c) => 
      Array(rowCounts[c] || 3).fill('-')
    );

    const newGrid = emptyGrid.map((col) => 
      col.map((cell) => {
        if (idIndex < flatIds.length) {
          const val = flatIds[idIndex++];
          let sym = mathIdToSymbol[val];
          if (sym && !isCoordinateClassId && sym.match(/^[F|L][1-4]/)) {
            const mult = flatClassIds[classIdIndex++];
            if (mult !== undefined) {
              sym = `${sym}_${mult}X`;
            }
          }
          return sym ? sym : '-';
        }
        return cell;
      })
    );
    
    const newSpecialConfig = extractSpecialConfigFromGrid(newGrid, store.specialSymbolConfig, gameType);

    set({ customGridData: newGrid, activeTab: 'customGrid', goldFrames: newGoldFrames, jackpots: newJackpots, specialSymbolConfig: newSpecialConfig });
  },

  resetGameSpecifics: () => set({
    goldFrames: {},
    jackpots: {},
    specialSymbolConfig: defaultSpecialSymbolConfig,
    manualIndices: Array(5).fill(''),
    manualIndicesOther: Array(5).fill(''),
    topTracker: Array(4).fill('WX'),
    topTrackerOther: Array(4).fill('WX')
  }),

  clearProject: () => set({
    isProjectLoaded: false,
    currentStrips: [],
    currentPaytable: [],
    currentGrid: []
  })
}));
