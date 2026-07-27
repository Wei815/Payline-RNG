import { create } from 'zustand';
import type { PaytableRule, ReelStrips, SpecialSymbolConfig } from '../types';

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

  resetGameSpecifics: () => void;
  clearProject: () => void;
}

const defaultSpecialSymbolConfig: SpecialSymbolConfig = {
  s1Enabled: false, s1Count: 0,
  s2Enabled: false, s2Count: 0,
  multipliersEnabled: false, multiplierCounts: {},
  luckyBallsEnabled: false, luckyCounts: {}
};

export const useGameStore = create<GameState>((set) => ({
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
