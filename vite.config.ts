import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { gameEntryProxy, gameEntryPlugin } from './vite.gameEntryProxy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), gameEntryPlugin()],
  // 側欄「遊戲入口」的內嵌瀏覽器靠此代理（dev 與 preview 皆可用；純靜態部署時無代理）
  server: { proxy: gameEntryProxy() },
  preview: { proxy: gameEntryProxy() },
})
