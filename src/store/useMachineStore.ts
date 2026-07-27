import { create } from 'zustand';
import type { GameType } from '../types';

export interface MachineState {
  gameType: GameType;
  bet: number;
  coin: number;
  isRunning: boolean;
  loadTemplateTrigger: string | null;
  uploadedTemplateFile: File | null;
  activeModalTool: string | null;
  setGameType: (type: GameType) => void;
  setBet: (bet: number) => void;
  setCoin: (coin: number) => void;
  setIsRunning: (isRunning: boolean) => void;
  setLoadTemplateTrigger: (trigger: string | null) => void;
  setUploadedTemplateFile: (file: File | null) => void;
  setActiveModalTool: (tool: string | null) => void;
}

export const useMachineStore = create<MachineState>((set) => ({
  gameType: 'linegame_set2',
  bet: 50,
  coin: 1,
  isRunning: false,
  loadTemplateTrigger: null,
  uploadedTemplateFile: null,
  activeModalTool: null,
  setGameType: (type) => set({ gameType: type }),
  setBet: (bet) => set({ bet }),
  setCoin: (coin) => set({ coin }),
  setIsRunning: (isRunning) => set({ isRunning }),
  setLoadTemplateTrigger: (trigger) => set({ loadTemplateTrigger: trigger }),
  setUploadedTemplateFile: (file) => set({ uploadedTemplateFile: file }),
  setActiveModalTool: (tool) => set({ activeModalTool: tool }),
}));
