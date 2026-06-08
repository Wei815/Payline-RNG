# RNG PAY - 系統架構與開發規範

## 1. 專案願景
RNG PAY 是一個高效能的老虎機數學模型驗證平台，協助數學設計師與 QA 驗證滾輪表 (Reel Strips) 與賠率表 (Paytable)，精準計算 RTP 及連線命中頻率。

## 2. 目錄結構
```text
c:\github\Payline-RNG\
├── public/                 # 靜態資源
├── src/
│   ├── components/         # UI 元件目錄
│   │   ├── ConfigPanel.tsx       # 左側設定面板 (25%)
│   │   ├── SlotConsole.tsx       # 中央模擬盤面 (40%)
│   │   └── MetricsDashboard.tsx  # 右側數據儀表板 (35%)
│   ├── hooks/              # 自訂 React Hooks
│   │   └── useSimulation.ts      # 模擬狀態與非同步運算邏輯
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
1. **ConfigPanel**：使用者編輯 ReelStrips 與 PaytableRule (初期採用 JSON，後續可擴充表單 UI)，點擊「Run Simulation」時觸發模擬。
2. **useSimulation (Hook)**：接收設定資料，模擬非同步運算 (Mocking Web Worker)，發送更新狀態。
3. **SlotConsole**：訂閱 `useSimulation` 的進行狀態，展示老虎機盤面與進度條。
4. **MetricsDashboard**：在模擬完成後，接收 `SimulationResult` 並視覺化 RTP、命中率等 KPI 與 Symbol 統計數據。

## 4. 視覺設計系統 (Design System)
本專案採用 Dark Mode 儀表板科技風格，以下為 Tailwind 設定：
- **Background**: 深邃藍 (`#0a192f`) -> `bg-[#0a192f]`
- **Card**: 科技藍 (`#112240`) -> `bg-[#112240]`
- **Accent**: 霓虹綠 (`#64ffda`) -> `text-[#64ffda]`
- **Text Primary**: 白色 (`#e6f1ff`) -> `text-[#e6f1ff]`
- **Text Secondary**: 淺灰 (`#8892b0`) -> `text-[#8892b0]`

## 5. 開發規範 (AI 協作準則)
- 開發前必須參考此文件，確認元件所屬目錄。
- 若更換套件或架構變動，需同步更新此文件。
- 不重複解釋已在此文件定義的目錄結構。
