import { create } from 'zustand';
import type { GameType } from '../types';

export interface MachineState {
  gameType: GameType;
  bet: number;
  coin: number;
  isRunning: boolean;
  setGameType: (type: GameType) => void;
  setBet: (bet: number) => void;
  setCoin: (coin: number) => void;
  setIsRunning: (isRunning: boolean) => void;
}

export const useMachineStore = create<MachineState>((set) => ({
  gameType: 'linegame_set2',
  bet: 50,
  coin: 1,
  isRunning: false,
  setGameType: (type) => set({ gameType: type }),
  setBet: (bet) => set({ bet }),
  setCoin: (coin) => set({ coin }),
  setIsRunning: (isRunning) => set({ isRunning }),
}));
