import { create } from 'zustand';
import type { PaytableRule, ReelStrips, ReelStripsList, SpecialSymbolConfig } from '../types';
import { useMachineStore } from './useMachineStore';
import type { Snippet } from './useSnippetStore';
import { isMathIdRng } from '../flows/rngFormat';
import { decodeCoordinateClassIds, decodeWyClassIds } from '../flows/classIds';
import { findTraits } from '../games/registry';

export interface GameState {
  currentStrips: ReelStrips;
  currentStripSets: ReelStripsList;
  currentFreeStripSets: ReelStripsList;
  activeStripId: number;
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
  customGridGoldFrames: Record<string, number>;
  customGridJackpots: Record<string, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'>;
  customGridClovers: Record<string, boolean>;
  customGridWyConfigs: Record<number, { a: number, b: number, z: 0 | 1 }>;

  manualIndices: string[];
  manualIndicesOther: string[];
  topTracker: string[];
  topTrackerOther: string[];
  activeTab: 'manual' | 'other' | 'lines' | 'customGrid';
  isFreeGame: boolean;
  isProjectLoaded: boolean;
  isProjectLoading: boolean;
  projectName: string;
  pendingSnippet: Snippet | null;
  
  setCurrentStrips: (strips: ReelStrips) => void;
  setCurrentStripSets: (stripSets: ReelStripsList) => void;
  setCurrentFreeStripSets: (freeStripSets: ReelStripsList) => void;
  setActiveStripId: (id: number) => void;
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
  setCustomGridGoldFrames: (frames: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  setCustomGridJackpots: (jackpots: Record<string, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'> | ((prev: Record<string, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'>) => Record<string, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'>)) => void;
  setCustomGridClovers: (clovers: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  setCustomGridWyConfigs: (configs: Record<number, { a: number, b: number, z: 0 | 1 }> | ((prev: Record<number, { a: number, b: number, z: 0 | 1 }>) => Record<number, { a: number, b: number, z: 0 | 1 }>)) => void;
  
  setManualIndices: (indices: string[]) => void;
  setManualIndicesOther: (indices: string[]) => void;
  setTopTracker: (tracker: string[]) => void;
  setTopTrackerOther: (tracker: string[]) => void;
  setActiveTab: (tab: 'manual' | 'other' | 'lines' | 'customGrid') => void;
  setIsFreeGame: (isFree: boolean) => void;
  setIsProjectLoaded: (loaded: boolean) => void;
  setIsProjectLoading: (loading: boolean) => void;
  setProjectName: (name: string) => void;
  setPendingSnippet: (val: Snippet | null) => void;
  applySnippet: (snippet: Snippet) => void;

  resetGameSpecifics: () => void;
  clearProject: () => void;
}

export const defaultSpecialSymbolConfig: SpecialSymbolConfig = {
  s1Enabled: false, s1Count: 0,
  s2Enabled: false, s2Count: 0,
  multipliersEnabled: false, multiplierCounts: {},
  luckyBallsEnabled: false, luckyCounts: {},
  wyEnabled: false
};

export const extractSpecialConfigFromGrid = (grid: string[][], baseConfig: SpecialSymbolConfig, gameType: string): SpecialSymbolConfig => {
  if (findTraits(gameType)?.specialConfigFromGrid === false) {
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
  currentStripSets: [],
  currentFreeStripSets: [],
  activeStripId: 0,
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
  customGridGoldFrames: {},
  customGridJackpots: {},
  customGridClovers: {},
  customGridWyConfigs: {},

  manualIndices: ['1', '1', '1', '1', '1'],
  manualIndicesOther: Array(5).fill(''),
  topTracker: Array(4).fill('WX'),
  topTrackerOther: Array(4).fill('WX'),
  activeTab: 'manual',
  isFreeGame: false,
  isProjectLoaded: false,
  isProjectLoading: false,
  projectName: '預設泛用',
  pendingSnippet: null,

  setCurrentStrips: (strips) => set({ currentStrips: strips }),
  setCurrentStripSets: (stripSets) => set({ currentStripSets: stripSets }),
  setCurrentFreeStripSets: (freeStripSets) => set({ currentFreeStripSets: freeStripSets }),
  setActiveStripId: (id) => set((state) => {
    const isFree = state.isFreeGame;
    const sets = isFree ? state.currentFreeStripSets : state.currentStripSets;
    if (sets && sets.length > id) {
      return { activeStripId: id, currentStrips: sets[id] };
    }
    return { activeStripId: id };
  }),
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
  setCustomGridGoldFrames: (frames) => set((state) => ({ customGridGoldFrames: typeof frames === 'function' ? frames(state.customGridGoldFrames) : frames })),
  setCustomGridJackpots: (jackpots) => set((state) => ({
    customGridJackpots: typeof jackpots === 'function' ? jackpots(state.customGridJackpots) : jackpots
  })),
  setCustomGridClovers: (clovers) => set((state) => ({
    customGridClovers: typeof clovers === 'function' ? clovers(state.customGridClovers) : clovers
  })),
  setCustomGridWyConfigs: (configs) => set((state) => ({
    customGridWyConfigs: typeof configs === 'function' ? configs(state.customGridWyConfigs) : configs
  })),
  
  setManualIndices: (indices) => set({ manualIndices: indices }),
  setManualIndicesOther: (indices) => set({ manualIndicesOther: indices }),
  setTopTracker: (tracker) => set({ topTracker: tracker }),
  setTopTrackerOther: (tracker) => set({ topTrackerOther: tracker }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setIsFreeGame: (isFree) => set({ isFreeGame: isFree }),
  setIsProjectLoaded: (loaded) => set({ isProjectLoaded: loaded }),
  setIsProjectLoading: (loading) => set({ isProjectLoading: loading }),
  setProjectName: (name) => set({ projectName: name }),
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
    const classIdMode = findTraits(gameType)?.snippetClassIds ?? 'symbolMultiplier';
    // 有 ClassID 座標意義的遊戲盤面一律以 MathID 解讀
    const isCoordinateClassId = classIdMode !== 'symbolMultiplier';
    const newGoldFrames: Record<string, number> = {};
    const newJackpots: Record<string, 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN'> = {};
    const newWyConfigs: Record<number, { a: number, b: number, z: 0 | 1 }> = {};

    if (classIdMode === 'wyConfig') {
      // classId 僅用於 WY 設定 (A, B, Z)，需在盤面產生後才解析
    } else if (classIdMode === 'coordinate' && flatClassIds.length > 0) {
      const decoded = decodeCoordinateClassIds(flatClassIds);
      Object.assign(newGoldFrames, decoded.goldFrames);
      Object.assign(newJackpots, decoded.jackpots);
    }
    
    const reelCount = store.reelCount;
    const rowCounts = store.rowCounts;
    const isMathId = isMathIdRng(gameType, flatIds, reelCount);
    const emptyGrid = Array.from({ length: reelCount }, (_, c) => 
      Array(rowCounts[c] || 3).fill('-')
    );

    let newGrid = emptyGrid;
    if (isMathId) {
      newGrid = emptyGrid.map((col) => 
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
    } else {
      // Strip index logic
      const currentStrips = store.currentStrips;
      newGrid = emptyGrid.map((col, c) => {
         const start = flatIds[c] || 0;
         const len = currentStrips[c]?.length || 1;
         const strip = currentStrips[c] || ['-'];
         return col.map((_, r) => strip[(start + r) % len]);
      });
    }
    
    // 解析 WY 設定 (A, B, Z)
    if (classIdMode === 'wyConfig' && flatClassIds.length > 0) {
      Object.assign(newWyConfigs, decodeWyClassIds(flatClassIds, newGrid));
    }
    
    let newTopTracker: string[] = [];
    if (flatIds.length > reelCount && !isMathId) {
       // Optional: populate top tracker if they provided it in flatIds
       newTopTracker = []; // simplified for now, as useGameStore might have more complex logic
    }
    
    // 依滾輪表產生盤面的遊戲沒有「自定義盤面」：改為帶入手動計算盤面的滾輪位置（多組滾輪表時第 reelCount+1 碼為 Strip ID）
    if (!findTraits(gameType)?.customGridTab && !isMathId) {
      const updates: Partial<GameState> = {
        manualIndices: flatIds.slice(0, reelCount).map(v => String(v)),
        activeTab: 'manual',
      };
      const stripId = Number(flatIds[reelCount]);
      const sets = store.isFreeGame ? store.currentFreeStripSets : store.currentStripSets;
      if (flatIds.length > reelCount && sets.length > 1 && stripId >= 0 && stripId < sets.length) {
        updates.activeStripId = stripId;
        updates.currentStrips = sets[stripId];
      }
      set(updates);
      return;
    }

    const newSpecialConfig = extractSpecialConfigFromGrid(newGrid, store.specialSymbolConfig, gameType);

    set({ customGridData: newGrid, activeTab: 'customGrid', goldFrames: newGoldFrames, jackpots: newJackpots, customGridWyConfigs: newWyConfigs, specialSymbolConfig: newSpecialConfig });
  },

  resetGameSpecifics: () => set({
    currentStripSets: [],
    currentFreeStripSets: [],
    activeStripId: 0,
    goldFrames: {},
    jackpots: {},
    specialSymbolConfig: defaultSpecialSymbolConfig,
    manualIndices: Array(5).fill(''),
    manualIndicesOther: Array(5).fill(''),
    topTracker: Array(4).fill('WX'),
    topTrackerOther: Array(4).fill('WX'),
    isFreeGame: false
  }),

  clearProject: () => set({
    isProjectLoaded: false,
    currentStrips: [],
    currentStripSets: [],
    currentFreeStripSets: [],
    activeStripId: 0,
    currentPaytable: [],
    currentGrid: []
  })
}));

// 切換遊戲時清掉上一款遊戲的專屬狀態（金框 / Jackpot / 免遊模式…），避免殘留到新遊戲。
// 所有切換入口（側邊欄、歡迎頁、遊戲種類下拉、載入範本）都先切遊戲再寫入滾輪表，所以在這裡統一處理即可。
useMachineStore.subscribe((state, prev) => {
  if (state.gameType !== prev.gameType) useGameStore.getState().resetGameSpecifics();
});
