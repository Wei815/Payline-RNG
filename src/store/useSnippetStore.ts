import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface QARecord {
  RNGs: number[][];
  ClassIDs: number[][];
  LuckySelects: number[][];
  Selection: number[][];
}

export interface QAData {
  QA: QARecord[];
}

export interface Snippet {
  id: string;
  title: string;
  gameType: string;
  projectName?: string;
  qaData: QAData;
  createdAt: number;
}

interface SnippetState {
  snippets: Snippet[];
  addSnippet: (snippet: Snippet) => void;
  updateSnippet: (id: string, partial: Partial<Snippet>) => void;
  removeSnippet: (id: string) => void;
  clearSnippets: () => void;
}

export const useSnippetStore = create<SnippetState>()(
  persist(
    (set) => ({
      snippets: [],
      addSnippet: (snippet) => set((state) => ({ snippets: [snippet, ...state.snippets] })),
      updateSnippet: (id, partial) => set((state) => ({
        snippets: state.snippets.map(s => s.id === id ? { ...s, ...partial } : s)
      })),
      removeSnippet: (id) => set((state) => ({ snippets: state.snippets.filter(s => s.id !== id) })),
      clearSnippets: () => set({ snippets: [] }),
    }),
    {
      name: 'snippet-storage',
    }
  )
);
