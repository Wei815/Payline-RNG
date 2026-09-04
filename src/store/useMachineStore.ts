import { create } from 'zustand';
import type { GameType } from '../types';

export interface JiraIssueDetail {
  issueKey: string;
  summary: string;
  assignee: string;
  reporter: string;
  status: string;
  projectName: string;
}

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
  jiraReportData: string[][] | null;
  jiraReportFileName: string | null;
  jiraIssuesByProject: Record<string, JiraIssueDetail[]> | null;
  setJiraReportData: (data: string[][] | null) => void;
  setJiraReportFileName: (name: string | null) => void;
  setJiraIssuesByProject: (data: Record<string, JiraIssueDetail[]> | null) => void;
  
  jiraReportWebData: string[][] | null;
  jiraReportWebFileName: string | null;
  jiraIssuesWebByProject: Record<string, JiraIssueDetail[]> | null;
  setJiraReportWebData: (data: string[][] | null) => void;
  setJiraReportWebFileName: (name: string | null) => void;
  setJiraIssuesWebByProject: (data: Record<string, JiraIssueDetail[]> | null) => void;
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
  jiraReportData: null,
  jiraReportFileName: null,
  jiraIssuesByProject: null,
  setJiraReportData: (data) => set({ jiraReportData: data }),
  setJiraReportFileName: (name) => set({ jiraReportFileName: name }),
  setJiraIssuesByProject: (data) => set({ jiraIssuesByProject: data }),
  
  jiraReportWebData: null,
  jiraReportWebFileName: null,
  jiraIssuesWebByProject: null,
  setJiraReportWebData: (data) => set({ jiraReportWebData: data }),
  setJiraReportWebFileName: (name) => set({ jiraReportWebFileName: name }),
  setJiraIssuesWebByProject: (data) => set({ jiraIssuesWebByProject: data }),
}));
