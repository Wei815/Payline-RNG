# RNG PAY - 系統架構、核心演算法與全方位開發指南 (交接白皮書)

> 本文件為 **RNG PAY** 系統的核心架構說明、各模組職責清冊、特殊遊戲規則、歷史踩坑防線與開發維護手冊。
> **所有接手本專案的 AI 助理或工程師，在進行任何開發、重構、新增遊戲或修復 Bug 前，必須完整閱讀並嚴格遵守本文件所列之規範與禁忌。**

---

## 1. 專案願景與核心價值 (Project Vision & Core Principles)

**RNG PAY** 是一個高精準度、高效能的老虎機 (Slot Machine) 數學模型驗證與測試輔助平台。主要服務於**老虎機數學設計師 (Math Designers)**、**前端/後端工程師**以及 **QA 測試工程師**：
1. **精準連線與贏分驗證**：支援經典連線 (Line Game)、多路連線 (Way Game / Megaways)、任意消除 (Pay Anywhere) 以及連線消除 (Line Cascade) 等多種數學模型。
2. **零干擾單一連線 RNG 自動產出**：能在毫秒級時間內，於數萬種排列組合中逆向搜尋出「剛好 N 連線」、「剛好特定百搭配對」，且**絕無額外符號干擾或多餘連線**的純淨盤面 RNG。
3. **消除型老虎機的雙重安全防線**：針對消除遞補機制，提供「掉落後零自連」與「新盤面遞補零消除（0 贏分）」的保證，產出 100% 乾淨的單次測試 RNG 數組。
4. **JIRA QA 測試報告與腳本庫一鍵生成**：支援自動將測試 RNG 格式化為自動化腳本、JIRA Bug 備註格式與全套測試案，大幅降低 QA 人工排查與重現問題的時間成本。

---

## 2. 完整目錄結構與模組職責清冊 (Full Directory & File Inventory)

```text
c:\github\Payline-RNG\
├── public/                     # 靜態資源（遊戲範本 Excel、圖示等）
├── src/
│   ├── App.tsx                 # 應用程式主進入點，定義 Dashboard Grid 佈局與全域 Modal 工具
│   ├── main.tsx                # React 渲染入口
│   ├── index.css               # 全域樣式與 Tailwind 載入
│   ├── core/
│   │   └── GameRegistry.ts     # 核心遊戲註冊表 (工廠模式)，依 GameType 派發各遊戲環境實例
│   ├── games/                  # 遊戲環境獨立隔離層 (Game Environment Isolation)
│   │   ├── base/               # 遊戲基礎抽象類別與通用演算法
│   │   │   ├── IGameEnvironment.ts # 所有遊戲必須實作的介面合約
│   │   │   ├── AbstractGame.ts     # 抽象基底類別 (提供通用滾輪、時間切片、消除掉落介面)
│   │   │   ├── BaseLineGame.ts     # 經典線遊戲基底 (15/20/50 lines 等)
│   │   │   ├── BaseWayGame.ts      # 243 ways / 多路連線遊戲基底
│   │   │   ├── BasePayAnywhere.ts  # 任意位置收集消除遊戲基底
│   │   │   └── RngSearchEngine.ts  # 通用 RNG 反向搜尋引擎 (包含爬山演算法與目標線路鎖定)
│   │   ├── Roma/               # 羅馬競技場 (RomaGame.ts) - 15-line 消除型老虎機核心
│   │   ├── God of WarsThor VS Seth/ # 諸神之戰 (GodsGame.ts) - 雷神VS塞特，WY展開與倍數
│   │   ├── The Luxe/           # 奢華 (LuxeGame.ts) - 金框翻倍、Jackpot 與 S1 幸運草
│   │   ├── Battle of Set 2Awakening/ # 決戰賽特2 (BattleSet2Game.ts) - PayAnywhere
│   │   ├── Chin Shi Huang/     # 秦皇傳說 (QinGame.ts) - 243 WayGame + 擴展消除
│   │   ├── Mermaid/            # 人魚傳說 (MermaidGame.ts) - WayGame
│   │   ├── Royal Ganesha/      # 皇家金象 (RoyalElephantGame.ts) - WayGame
│   │   ├── linegame/           # 經典通用線遊戲 (ClassicLineGame.ts)
│   │   └── payanywhere/        # 經典通用任意消除 (ClassicPayAnywhere.ts)
│   ├── components/             # UI 元件目錄
│   │   ├── Sidebar.tsx         # 左側選單欄（遊戲切換、範本載入、QA 工具入口）
│   │   ├── ConfigPanel.tsx     # 左側參數面板（滾輪表檢視、賠率表編輯、投注與機台狀態）
│   │   ├── SlotConsole.tsx     # 中央模擬盤面主容器（管理 5 大功能子分頁的切換與生命週期）
│   │   ├── SlotGridDisplay.tsx # 盤面符號格陣列渲染、金框/倍數球標記
│   │   ├── MetricsDashboard.tsx# 右側數據儀表板 (RTP 模擬與命中率，可依需求開啟)
│   │   ├── WelcomeScreen.tsx   # 首次進入或未載入遊戲時的引導畫面
│   │   ├── tabs/               # 中央主功能分頁
│   │   │   ├── SlotGeneratorTab.tsx  # ★核心：連線測試產生器 (單一連線測試、多連線組合清單、批次複製)
│   │   │   ├── SlotManualTab.tsx     # 手動輸入 RNG 檢視盤面與贏分連線
│   │   │   ├── LineViewerTab.tsx     # 贏分線路一覽 (逐線展開、高亮顯示)
│   │   │   ├── TumbleViewerTab.tsx   # 消除掉落詳細歷程檢視器
│   │   │   └── SlotCustomGridTab.tsx # 自定義任意符號擺盤與試算
│   │   └── tools/              # QA 輔助工具箱 (Modals)
│   │       ├── JiraReportGenerator.tsx    # JIRA 出詞 Bug List 產生器 (桌面版/標準版)
│   │       ├── JiraReportGeneratorWeb.tsx # JIRA 出詞 Bug List 產生器 (Web 優化版)
│   │       ├── JiraBugListGenerator.tsx   # JIRA 出詞 BUG 備註工具
│   │       ├── JiraLinkGenerator.tsx      # JIRA 連結自動生成
│   │       ├── RtpCalculator.tsx          # RTP 模擬計算機
│   │       ├── RngValidator.tsx           # RNG 合法性驗證工具
│   │       └── SnippetLibrary.tsx         # 測試腳本庫 (自訂與常用腳本管理)
│   ├── store/                  # 全域狀態管理 (Zustand)
│   │   ├── useMachineStore.ts  # 機台基礎狀態 (gameType, bet, coin, isRunning, JIRA 資料)
│   │   ├── useGameStore.ts     # 遊戲運算狀態 (滾輪表, 賠率表, 當前盤面, 金框, Jackpot, 幸運草)
│   │   └── useSnippetStore.ts  # 測試腳本庫持久化狀態
│   ├── hooks/                  # React Custom Hooks
│   │   ├── useRngSearch.ts     # 驅動連線測試產生器的非同步組合搜尋
│   │   ├── useSimulation.ts    # Web Worker 大量局數 RTP 模擬生命週期管理
│   │   └── useSymbolGrouping.ts# 符號分類群組 (高分符號/低分符號/特殊符號)
│   ├── utils/                  # 工具函式庫
│   │   ├── excelParser.ts      # 數學模型 Excel 檔解析 (滾輪表、賠率表、線路表、多Sheet)
│   │   ├── evaluation.ts       # 盤面評估進入點 (evaluateGrid) 與預設線路定義
│   │   ├── evaluation/         # 評估子模組與策略模式
│   │   │   ├── WinningPositions.ts # 計算中獎格子座標 (getWinningPositions)
│   │   │   ├── GameConstants.ts    # 符號常數與基礎工具
│   │   │   ├── GameIntervals.ts    # 大獎倍數區間定義
│   │   │   └── strategies/         # 各類型遊戲連線評估策略 (Line/Way/Scatter/PayAnywhere)
│   │   ├── svgPaths.ts         # ★動態繪製中獎折線 SVG 座標計算器 (高難度幾何演算法)
│   │   ├── rngSearch.ts        # 搜尋函式封裝與轉發
│   │   └── formatters.ts       # 數值、貨幣與字串格式化工具
│   ├── workers/
│   │   └── simulation.worker.ts# Web Worker 執行緒，隔離執行百萬轉 RTP 運算
│   ├── types/                  # 全域型別定義
│   │   ├── core.ts             # GameType, GameConfig, SpecialSymbolConfig 等
│   │   ├── evaluation.ts       # 評估與策略介面
│   │   ├── simulation.ts       # 模擬任務參數與結果資料結構
│   │   └── index.ts            # 型別匯出統一窗口
│   └── mocks/
│       └── defaultData.ts      # 預設 Mock 資料
├── scripts/                    # 工具腳本
│   └── parse-templates.cjs     # 預先解析遊戲範本的 Node.js 腳本
├── ARCHITECTURE.md             # ★本文件
└── package.json
```

---

## 3. 雙 Store 狀態架構與資料流向 (Dual-Store & Data Flow Architecture)

專案採用 **Zustand** 進行狀態管理，將狀態嚴格劃分為兩層，避免資料污染：

```
                    ┌─────────────────────────┐
                    │   useMachineStore.ts    │
                    │   (機台層: 通用硬體設定)  │
                    │ - gameType (目前遊戲)   │
                    │ - bet / coin (投注額)    │
                    │ - isRunning             │
                    │ - JIRA 工具全域暫存資料  │
                    └────────────┬────────────┘
                                 │ 切換遊戲時派發 setGameType
                                 ▼
                    ┌─────────────────────────┐
                    │     useGameStore.ts     │
                    │   (遊戲層: 專屬數學資料)  │
                    │ - currentStrips (滾輪表)│
                    │ - currentPaytable (賠率)│
                    │ - currentGrid (盤面符號)│
                    │ - goldFrames (金框倍數) │
                    │ - jackpots / clovers    │
                    │ - manualIndices (RNG數組)│
                    └────────────┬────────────┘
                                 │
     ┌───────────────────────────┼───────────────────────────┐
     ▼                           ▼                           ▼
[ConfigPanel]             [SlotConsole]             [JIRA QA Tools]
(參數調整/Excel匯入)      (5大分頁切換/盤面運算)      (測試報告/Bug備註產出)
```

### 資料流轉規則：
1. **切換遊戲標準程序**：
   * 當在 `Sidebar.tsx` 切換遊戲時，先呼叫 `useMachineStore.setGameType(newType)`。
   * **必須立刻呼叫** `useGameStore.resetGameSpecifics()`，清空金框 (`goldFrames`)、大獎 (`jackpots`)、幸運草 (`clovers`) 與自訂盤面，避免上一款遊戲的專屬資料污染新遊戲。
   * 隨後從 `GameRegistry.getGame(newType)` 讀取該遊戲的 `getDefaultConfig()`, `getDefaultStrips()`, `getDefaultPaytable()` 並寫入 `useGameStore`。
2. **Tab 惰性運算 (Lazy Calculation)**：
   * `SlotConsole.tsx` 中的子分頁（如 `SlotGeneratorTab`, `SlotManualTab`）只有在被切換到當前 Active 時才進行高負載的 DOM 渲染與 SVG 路徑計算，節省記憶體與避免主執行緒卡頓。

---

## 4. 遊戲環境獨立隔離架構 (Game Environment Isolation)

所有遊戲均實作 `IGameEnvironment` 介面，並由 `GameRegistry` 統一管理：

```typescript
export interface IGameEnvironment {
  readonly id: GameType;
  readonly name: string;
  getDefaultConfig(): GameConfig;
  getDefaultStrips(): ReelStrips;
  getDefaultPaytable(): PaytableRule[];
  getGridFromRng(rng: number[], strips: ReelStrips, rowCounts: number[], reelCount: number): string[][];
  getEvalGrid(grid: string[][], gameType: GameType, length?: number, topTracker?: string[]): string[][];
  evaluate(grid: string[][], paytable: PaytableRule[], config: GameConfig, customPaylines?: number[][], includeZeroPayout?: boolean): WinResult[];
  applyCascade(...): void;
  findRngForCombination(...): Promise<{ rng: number[] | null; isInterfered: boolean; ... }>;
}
```

### 已實作的 9 款遊戲環境：
1. **`RomaGame` (`linegame_roma`)**：羅馬競技場。15-line 消除型老虎機，具備覆蓋遞補與 4 組滾輪表輪替機制。
2. **`GodsGame` (`linegame_gods`)**：諸神之戰（雷神VS塞特）。支援整軸滿版 WY 展開、金框累加倍數。
3. **`LuxeGame` (`linegame_set2`)**：奢華。支援金框翻倍（F1~F4）、Jackpot 符號判定與 S1 幸運草收集。
4. **`ClassicLineGame` (`linegame`)**：經典通用線路遊戲（支援 20 paylines、水平/V字/倒V等）。
5. **`ClassicPayAnywhere` (`payanywhere`)**：經典任意消除（達指定顆數即可消除並掉落）。
6. **`BattleSet2Game` (`payanywhere_set2`)**：決戰賽特2。包含特殊消除與加成規則。
7. **`QinGame` (`waygame_qin`)**：秦皇傳說。243 ways 擴展與掉落消除。
8. **`MermaidGame` (`waygame`)**：人魚傳說。經典 243 ways 老虎機。
9. **`RoyalElephantGame` (`waygame_elephant`)**：皇家金象。大象特色消除機制。

---

## 5. 核心演算法與重點遊戲深層解析 (Deep Dive into Algorithms)

### 5.1 羅馬競技場 (`RomaGame.ts`) - 最複雜的核心遊戲

羅馬競技場是一台結合了「固定 15 線路」與「寶石消消樂覆蓋式掉落」的混合型老虎機，包含許多極度嚴苛的數學規格：

#### (1) 線路規則與 Paytable 映射
* **15 條中獎線**：線 0~14（包含三條水平線、V 字、倒 V、W 字等）。
* **判定方向**：自第 0 軸（最左軸）開始由左至右連續相連。

#### (2) 滾輪表輪替機制 (Strip Sets ID 0 ~ 3)
* 羅馬擁有 4 組滾輪表（Strip ID 0, 1, 2, 3）。
* **極重要規格**：**Combo 0（初始第一轉）永遠固定使用滾輪表 1（ID 0）**！絕對不可以加隨機 Strip ID 輪替。
* 消除第 1 次後的遞補（Combo 1）使用滾輪表 2（ID 1）。
* 消除第 2 次後的遞補（Combo 2）使用滾輪表 3（ID 2）。
* 消除第 3 次後的遞補（Combo 3）使用滾輪表 4（ID 3）。
* 後續若繼續消除，則依奇偶數輪替。

#### (3) 獨創的覆蓋式遞補演算法 (`cascadeWithNewBoard`)
與傳統由上方往下自然墜落不同，羅馬實體機的邏輯是：**空缺位置由下一盤 RNG 所對應的滾輪符號直接覆蓋原位遞補**。
```typescript
// 消除後保留未中獎符號，消除空位由 newBoard 的對應行位置填入
public cascadeWithNewBoard(grid: string[][], winningCoords: Set<string>, newBoard: string[][]): string[][]
```

#### (4) 雙重安全防線 (Zero-Interference Cascade Defense)
在連線產生器與贏分線路一覽中，若產出一個 3 連線中獎盤面，為了給 QA 一個乾淨、不連鎖跳動的測試 RNG：
* **第一道防線**：檢查第一轉消除後，盤面上留下的殘留符號（未消除符號掉落重新對齊後）是否會「自己連成新線路」。若會自連，直接捨棄該候選 RNG。
* **第二道防線**：從滾輪表 1 進行安全抽樣，尋找一組「遞補進來後完全不產生任何中獎連線（0 贏分）」的安全遞補 RNG（例如全盤雜湊低分符號），保證連鎖消除只發生剛好 1 次即停止。

#### (5) WX (Wild) 官方特殊派彩規則 (絕不可改錯！)
1. **全軸皆有 WX**（第 0 ~ 4 軸都有可能出現 WX）。
2. **WX 5 連線**：整條線路 5 顆都是 WX 時，**官方規格給予 M1 5 連線分數（1000 倍）**。
3. **開頭 WX 1~4 顆（前綴）**：如果是 `WX - WX - A - A - A`，派彩看後面接續的第一個普通符號（此例為 A），給予 **A 5 連線分數**，**絕不可給 M1 短連線分數**！
4. **WX 目標符號組合**：WX 自身只會有 `WX * 2 連線`, `WX * 3 連線`, `WX * 4 連線`, `WX * 5 連線`，**絕對不會有 `WX * 1 + WX` 這種冗餘組合**。

#### (6) B1 (獅子 Bonus) 特色符號
* **WX 不可代替 B1**。
* B1 必須自第 0 輪開始連續相連。
* 當連線數量 `< 3` 時，B1 視為一般消除符號進行消除，無贏分派彩；當連線數量 `>= 3` 時，觸發進入羅馬競技場獅子戰鬥特色遊戲。

#### (7) 免費遊戲 (Free Game) 觸發與格式
* **觸發條件**：Base Game 連續消除 4、5、6、7 次以上，分別獲得 4、5、10、20 場 Free Game（無 Retrigger）。
* **FG 專屬模式**：在產生器切換為「免遊模式 (Free Game)」時，系統提供固定觸發範本 `[13,0,0,0,0]`（代表 4 場觸發 + 1 遞補無贏分）。
* **複製免遊連鎖實測腳本**：一鍵將 Combo 0~4 觸發序列與後續 FG 連線 RNG 自動組裝輸出為標準測試指令。

---

### 5.2 諸神之戰 (`GodsGame.ts`)
* **WY 展開機制**：在第 2、3、4 軸若出現特定百搭，會整軸展開為滿版 `WY`。
* **WY 參數配置**：每個展開軸帶有 `{ a: 基礎乘數, b: 最大乘數, z: 啟動標記 }`。
* **金框與倍數球**：支援金框加成倍數與畫面左側/上方雷神與塞特之累積乘數運算。

---

### 5.3 奢華 (`LuxeGame.ts`)
* **金框符號 (Gold Frames)**：特定符號外帶金框（如 `F1_2X` ~ `F4_10X`），中獎時該格倍數累加進總得分。
* **Jackpot 判定**：盤面上出現滿版或特定條件觸發 `MINI`, `MAJOR`, `MEGA`, `MAXWIN`。
* **S1 (幸運草) 特色**：S1 出現在盤面上時，不參與普通連線消除，但會單獨計算顆數（收集滿指定數量進入彩蛋遊戲）。

---

## 6. 歷史踩坑實錄與「絕對不可改壞」的禁忌防線 (DO NOT BREAK!)

以下是開發過程中真實踩過、被使用者指出的嚴重 Bug。**任何未來的修改都必須維持以下保護機制**：

### 🚫 禁忌 1：未選目標 Symbol 時，預覽盤面絕對不得渲染 SVG 連線！
* **痛點現象**：使用者一開起「連線測試產生器」，還沒在下拉選單選擇任何目標 Symbol，盤面上就預先畫出了密集青綠色滿版交叉幾何線路（多達 15 條線全部亮起）。
* **根本原因**：`SlotGeneratorTab.tsx` 中的 `winsOther` 在初始 RNG `[0,0,0,0,0]` 下評估出中獎線路，而 `calculateSVGPaths` 與 JSX 渲染層先前沒有加上 `selectedSymbol` 的防護檢查。
* **鐵律防線**：
  ```typescript
  // SlotGeneratorTab.tsx - updatePaths
  if (!selectedSymbol) {
    setLinePathsOther([]);
    return;
  }
  // SlotGeneratorTab.tsx - JSX
  {Boolean(selectedSymbol && linePathsOther.length > 0) && (
    <svg className="...">...</svg>
  )}
  ```

### 🚫 禁忌 2：連線評估函式絕不能擅自過濾 2 連線 (否則 M1\*2, M2\*2 全部報廢)！
* **痛點現象**：使用者選擇 M1 或 M2 時，清單中的 `* 2 連線` 與 `* 1 + WX` 全部顯示紅色「無可行滾輪位置」。
* **根本原因**：羅馬競技場等遊戲的 2 連線在 Paytable 中賠率為 0（3 連線才有錢）。而反向搜尋引擎在找「長度 2 的安全無贏分盤面」時，會傳入 `includeZeroPayout: true`。若遊戲的 `evaluate()` 函式內部寫死了 `if (matchCount >= 3)`，就會直接把 2 連線丟棄，導致搜尋器永遠收不到結果回傳 `null`。
* **鐵律防線**：
  ```typescript
  // RomaGame.ts - evaluate
  if (matchCount >= 3 || (includeZeroPayout && matchCount >= 2)) {
    const rule = paytableMap.get(targetSym);
    const payout = matchCount >= 3 ? (rule?.payouts?.[`match${matchCount}` as keyof typeof rule.payouts] || 0) : 0;
    if (payout > 0 || includeZeroPayout) {
      // 必須正確 push 進 results，讓搜尋引擎比對到 matchCount === 2！
    }
  }
  ```

### 🚫 禁忌 3：判斷 LineGame 時，必須使用 `startsWith('linegame')`，不可遺漏！
* **痛點現象**：切換到羅馬競技場或奢華時，點擊連線產生器，瀏覽器直接卡死 100% CPU，GPU 渲染崩潰。
* **根本原因**：`svgPaths.ts` 與部分評估邏輯中，若只判斷 `if (gameType === 'linegame')`，就會把 `linegame_roma`、`linegame_gods`、`linegame_set2` 誤判為 `waygame`，進而觸發多路連線的「笛卡兒積路徑生成演算法（數千條路徑乘積）」，導致主執行緒無限迴圈卡死！
* **鐵律防線**：
  ```typescript
  // svgPaths.ts
  if (gameType.startsWith('linegame')) {
    // 走單一 Payline 循線繪製，絕不可進入 WayGame 笛卡兒積！
  }
  ```

### 🚫 禁忌 4：切換遊戲時，必須呼叫 `resetGameSpecifics()` 清空專屬狀態！
* **痛點現象**：在「奢華」設定了金框倍數，切換到「羅馬競技場」後，盤面上莫名其妙殘留奢華的金框或 Jackpot 標籤，甚至導致連線計算乘數錯亂。
* **鐵律防線**：
  * 在 `Sidebar.tsx` 或任何切換 `gameType` 的地方，切換後務必調用 `useGameStore.getState().resetGameSpecifics()`。

### 🚫 禁忌 5：Excel 匯入的容錯與符號大小寫相容
* **痛點現象**：使用者上傳不同版本的數學 Excel 檔時，程式報錯白畫面。
* **鐵律防線**：
  * `excelParser.ts` 必須容許 Sheet 名稱大小寫不一（如 `linetable`, `LineTable`, `Line Table`）。
  * 必須容許符號名稱中的空白與前後引號（如 `" WX "` 需轉為 `WX`）。
  * 支援將舊版 `W` 自動標準化映射為 `WX`。

---

## 7. 新遊戲擴充開發標準作業程序 (SOP for Adding New Games)

若後續需要新增一款全新的老虎機（例如全新遊戲 `linegame_dragon`）：

```
[Step 1: 定義型別]
在 src/types/core.ts 中的 GameType 聯集加入 'linegame_dragon'

[Step 2: 建立遊戲類別]
在 src/games/ 建立目錄 Dragon/，並實作 DragonGame.ts
繼承 BaseLineGame (或 BaseWayGame / BasePayAnywhere)
實作 getDefaultConfig(), getDefaultStrips(), getDefaultPaytable()
若有特殊消除或倍數，覆寫 evaluate() 與 applyCascade()

[Step 3: 註冊遊戲]
在 src/core/GameRegistry.ts 的 init() 中加入：
this.register(new DragonGame());

[Step 4: UI 選單新增]
在 src/components/Sidebar.tsx 的遊戲清單中加入新遊戲按鈕
在 src/components/ConfigPanel.tsx 的遊戲下拉選單中加入新遊戲選項

[Step 5: 驗證型別與編譯]
執行指令：npx tsc --noEmit
確保 0 型別錯誤

[Step 6: 瀏覽器與產生器驗證]
啟動 npm run dev，至連線測試產生器驗證各符號連線是否能正常產出 RNG
```

---

## 8. 開發環境、驗證指令與除錯工具箱 (Playbook & Tooling)

### 常用命令列指令 (Windows PowerShell)
```powershell
# 1. 啟動本機開發伺服器 (Vite)
npm run dev

# 2. 執行全專案 TypeScript 靜態型別檢查 (重構後必跑)
npx tsc --noEmit

# 3. 執行生產環境編譯打包 (驗證打包是否正常)
npm run build

# 4. 執行 ESLint 程式碼風格與語法檢查
npm run lint

# 5. 快速執行單一 TypeScript 測試腳本 (需使用 tsx)
npx tsx <path-to-script>.ts
```

### 必備除錯心法：
1. **連線算不出來時**：
   * 先至 `src/games/<GameName>/<GameName>.ts` 檢查 `evaluate()` 函式。
   * 印出 `includeZeroPayout` 是否為 true，並確認是否有 `matchCount >= 2` 的通道。
2. **連線產生器搜尋逾時 / 顯示無可行滾輪位置時**：
   * 檢查滾輪表（Reel Strips）各軸是否真的存在該符號或 Wild。
   * 若長度為 5，檢查第 4 軸是否有目標符號。
   * 檢查 `RngSearchEngine.ts` 是否在某個條件下進入了 `skipDraw = true`。
3. **SVG 線路畫不出來或錯位時**：
   * 檢查 `src/utils/svgPaths.ts` 中的軸寬 (`cellWidth`)、列高 (`cellHeight`) 與間距 (`gap`) 是否與 `SlotGridDisplay.tsx` 的 CSS 樣式一致。
   * 檢查 `gridContainerRef` 是否正確綁定到盤面容器 DOM 上。

---

## 9. AI 協作執行規則 (Rules for AI Assistants)

1. **語言規範**：始終使用 **繁體中文（台灣習慣用語）** 進行所有回應與程式碼註解（如「滾輪表」、「賠率表」、「連線」、「中獎線路」、「盤面」、「伺服器」）。
2. **參考基準**：進行任何開發、重構或問題排查前，必須優先檢索本 `ARCHITECTURE.md` 文件。
3. **架構同步**：若後續開發涉及新增目錄、更換核心套件或重大演算法修改，**必須主動更新本文件**，確保後續接手者擁有最新資訊。
4. **精準切入與不破壞舊有功能**：修改任何遊戲邏輯前，先確認是否影響其他已上線的遊戲模組（善用獨立繼承與策略模式，切忌直接在共用 Base 類別中硬寫特定遊戲的特例判斷）。
