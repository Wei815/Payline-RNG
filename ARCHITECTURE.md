# RNG PAY - 系統架構與開發規範

## 1. 專案願景
RNG PAY 是一個高效能的老虎機數學模型驗證平台，協助數學設計師與 QA 驗證滾輪表 (Reel Strips) 與賠率表 (Paytable)，精準計算 RTP 及連線命中頻率。

## 2. 目錄結構
```text
c:\github\Payline-RNG\
├── public/                 # 靜態資源
├── src/
│   ├── components/         # UI 元件目錄
│   │   ├── ConfigPanel.tsx       # 左側設定面板
│   │   ├── SlotConsole.tsx       # 中央模擬盤面主容器
│   │   ├── tabs/                 # SlotConsole 的各功能子分頁
│   │   │   ├── SlotManualTab.tsx     # 手動設定與連線顯示
│   │   │   ├── SlotGeneratorTab.tsx  # 連線測試產生器
│   │   │   ├── LineViewerTab.tsx     # 贏分線路一覽
│   │   │   ├── TumbleViewerTab.tsx   # 消除掉落測試
│   │   │   └── SlotCustomGridTab.tsx # 自定義盤面
│   │   └── MetricsDashboard.tsx  # 右側數據儀表板
│   ├── hooks/              # 自訂 React Hooks
│   │   ├── useSimulation.ts      # 負責維護 Web Worker 實例生命週期與非同步運算管理
│   │   └── useRngSearch.ts       # 負責透過 Web Worker/Async 尋找特定組合對應的 RNG
│   ├── mocks/              # Mock 測試資料
│   │   └── defaultData.ts        # 預設 ReelStrips 與 PaytableRule
│   ├── types/              # TypeScript 型別定義
│   │   └── index.ts              # 核心資料結構
│   ├── App.tsx             # 應用主進入點，定義 Dashboard Grid 佈局
│   ├── main.tsx            # React 渲染進入點
│   └── index.css           # 全域樣式與 Tailwind 載入
├── tailwind.config.js      # Tailwind CSS 配置與自訂主題色彩
└── ARCHITECTURE.md         # 專案系統架構與流程說明
```

## 3. 核心狀態流向
1. **ConfigPanel**：使用者編輯 ReelStrips 與 PaytableRule，進行參數調整。
2. **useSimulation (Hook)**：接收設定資料，透過實例化的 Web Worker 執行模擬以避免主執行緒阻塞，負責生命週期管理並發送更新狀態。
3. **SlotConsole**：作為各功能 Tab 的主容器。各子元件（如 SlotManualTab, SlotGeneratorTab）只在 Active 時 Mount，進行專屬盤面計算（如 useMemo 與 SVG 路徑產生），從而節省記憶體並避免無效運算。
4. **MetricsDashboard**：在模擬完成後，接收 SimulationResult 並視覺化 RTP、命中率等 KPI 與 Symbol 統計數據。

## 4. 視覺設計系統 (Design System)
本專案採用 Dark Mode 儀表板科技風格，以下為 Tailwind 設定：
- **Background**: 深邃藍 (`#0a192f`) -> `bg-[#0a192f]`
- **Card**: 科技藍 (`#112240`) -> `bg-[#112240]`
- **Accent**: 霓虹綠 (`#64ffda`) -> `text-[#64ffda]`
- **Text Primary**: 白色 (`#e6f1ff`) -> `text-[#e6f1ff]`
- **Text Secondary**: 淺灰 (`#8892b0`) -> `text-[#8892b0]`

## 5. 遊戲環境獨立與擴充規範 (SOP)
為了確保不同遊戲（如 linegame, payanywhere）的核心邏輯與設定不互相干擾，專案導入了 **Game Environment Isolation** 架構。

## 6. 狀態管理規範
- **`useMachineStore.ts`**：負責管理「基礎機台狀態」，包含：目前的 `gameType`、餘額 (`coin`)、投注額 (`bet`) 以及機台是否正在運轉 (`isRunning`)。
- **`useGameStore.ts`**：負責管理「遊戲特有狀態」，包含：滾輪表 (`currentStrips`)、賠率表 (`currentPaytable`)、動態盤面 (`currentGrid`) 以及特定遊戲的特殊規則設定（如 `specialSymbolConfig`, `goldFrames`）。切換遊戲時需呼叫 `resetGameSpecifics()` 重置特有狀態。

## 7. 開發規範 (AI 協作準則)
- 開發前必須參考此文件，確認元件所屬目錄。
- 若更換套件或架構變動，需同步更新此文件。
- 不重複解釋已在此文件定義的目錄結構。

## 8. 暫時隱藏 / 待後續開發功能紀錄 (Hidden & Backlog Features)
- **RTP 測試報告 (`MetricsDashboard.tsx` / `useSimulation.ts`)**
  - **位置與入口**：`src/App.tsx` 頂部 Header 右側按鈕 (`isMetricsOpen`)
  - **功能說明**：透過 Web Worker 執行大量局數模擬，統計整體 RTP、中獎率 (Hit Rate)、各符號貢獻度與賠率分佈。
  - **狀態**：暫時從 UI 隱藏（代碼與 Worker 完整保留），待後續需要 RTP 驗證時解除註解即可開放。
- **單次試轉功能 (Test Spin)**
  - **位置與入口**：`src/components/ConfigPanel.tsx` 底部按鈕 (`handleTestSpin`)
  - **功能說明**：依當前滾輪表隨機挑選各軸起始位置生成隨機盤面，並即時計算中獎結果。
  - **狀態**：暫時從 UI 隱藏（代碼與邏輯完整保留），後續需要時解除註解即可復原。
