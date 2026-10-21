import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  // ★ 遊戲隔離防線：共用程式碼不得出現具體遊戲 ID，請改用 manifest 的 traits / 擴充點（見 ARCHITECTURE.md）
  {
    files: ['src/**/*.{ts,tsx}', 'src/games/base/**/*.{ts,tsx}'],
    ignores: ['src/games/**', 'src/types/core.ts', '**/__tests__/**'],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: 'Literal[value=/^(linegame|waygame|payanywhere)_/]',
        message: '共用程式碼不得判斷具體遊戲。請在 src/games/<遊戲>/manifest.ts 宣告 traits 或實作擴充點。',
      }],
    },
  },
  {
    files: ['src/games/base/**/*.{ts,tsx}'],
    ignores: ['**/__tests__/**'],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: 'Literal[value=/^(linegame|waygame|payanywhere)_/]',
        message: '共用基底不得判斷具體遊戲。請在 src/games/<遊戲>/ 覆寫方法或宣告 traits。',
      }],
    },
  },
])
