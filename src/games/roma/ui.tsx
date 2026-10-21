import { useState } from 'react';
import type { CurrentRngPreviewProps, ExtraCopyButtonsProps, FreeGameToggleProps, GameUi, TriggerPanelProps } from '../base/GameUi';
import type { ScriptCombination } from '../base/ScriptFormat';

const FreeGameToggle: React.FC<FreeGameToggleProps> = ({ isFreeGame, setIsFreeGame }) => (
  <div className="flex items-center gap-1.5 bg-[#112240] p-1 rounded-lg border border-purple-500/40 shadow-sm">
    <button
      type="button"
      onClick={() => setIsFreeGame(false)}
      className={`px-3 py-1 rounded text-xs font-bold transition-all ${!isFreeGame ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
    >
      🛡️ 一般模式 (Base)
    </button>
    <button
      type="button"
      onClick={() => setIsFreeGame(true)}
      className={`px-3 py-1 rounded text-xs font-bold transition-all ${isFreeGame ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
    >
      ⚔️ 免遊模式 (Free Game)
    </button>
  </div>
);

const TriggerPanel: React.FC<TriggerPanelProps> = ({ selectedTriggerCombo, setSelectedTriggerCombo, triggerRngSequence, isGeneratingTrigger, regenerate }) => {
  const [isCopiedTrigger, setIsCopiedTrigger] = useState<boolean>(false);
  return (
    <div className="w-full max-w-3xl flex flex-col bg-[#0f172a] p-4 rounded-xl border border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)] gap-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-purple-500/30 pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">⚔️</span>
          <span className="text-sm font-bold text-purple-300">
            Free Game 觸發機制 (由 BaseGame 連鎖消除觸發)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={regenerate}
            disabled={isGeneratingTrigger}
            className="px-2.5 py-1 text-xs font-bold rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {isGeneratingTrigger ? '產生中...' : '🔄 換一組觸發 RNG'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (triggerRngSequence) {
                const text = triggerRngSequence.map(r => `[${r.join(',')}],`).join('\n');
                navigator.clipboard.writeText(text);
                setIsCopiedTrigger(true);
                setTimeout(() => setIsCopiedTrigger(false), 2000);
              }
            }}
            disabled={!triggerRngSequence}
            className="px-2.5 py-1 text-xs font-bold rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/30 hover:bg-[#64ffda]/20 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {isCopiedTrigger ? '✅ 已複製！' : '📋 僅複製觸發 RNG'}
          </button>
        </div>
      </div>

      {/* 4 5 6 7 選擇按鈕 */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-gray-300 font-bold">選擇觸發條件 (連續消除次數 / 獲得免遊場數)：</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { combo: 4, spins: 4, label: 'Combo 4', desc: '觸發 4 場 FG' },
            { combo: 5, spins: 5, label: 'Combo 5', desc: '觸發 5 場 FG' },
            { combo: 6, spins: 10, label: 'Combo 6', desc: '觸發 10 場 FG' },
            { combo: 7, spins: 20, label: 'Combo 7', desc: '觸發 20 場 FG' },
          ].map(item => (
            <button
              key={item.combo}
              type="button"
              onClick={() => setSelectedTriggerCombo(item.combo)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg border text-center transition-all cursor-pointer ${
                selectedTriggerCombo === item.combo
                  ? 'bg-purple-600/30 border-purple-400 text-white ring-2 ring-purple-500 shadow-md'
                  : 'bg-[#112240] border-gray-700/60 text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              <span className="text-xs font-bold">{item.label}</span>
              <span className="text-[11px] text-purple-300 font-mono mt-0.5">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 預覽觸發 RNG 序列 */}
      <div className="flex flex-col gap-1 bg-[#0a101f] p-2.5 rounded-lg border border-purple-900/40">
        <span className="text-[11px] text-gray-400 font-bold flex justify-between">
          <span>預先準備之 BaseGame 觸發序列 (共 {triggerRngSequence ? triggerRngSequence.length : 0} 組 RNG)：</span>
          <span className="text-yellow-400/80 font-mono text-[10px]">點擊卡片將自動包含下方測試連線一併輸出</span>
        </span>
        <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto font-mono text-xs text-yellow-300">
          {triggerRngSequence ? (
            triggerRngSequence.map((r, i) => (
              <span key={i} className="bg-[#112240] px-1.5 py-0.5 rounded border border-gray-700">
                Step {i === triggerRngSequence.length - 1 ? 'End' : i}: [{r.join(',')}]
              </span>
            ))
          ) : (
            <span className="text-gray-500 text-xs italic">正在生成觸發序列中...</span>
          )}
        </div>
      </div>
    </div>
  );
};

const ExtraCopyButtons: React.FC<ExtraCopyButtonsProps> = ({ combinations, isSearching, selectedSymbol }) => {
  const [isCopiedRomaChain, setIsCopiedRomaChain] = useState<boolean>(false);
  return (
    <button
      disabled={isSearching || combinations.length === 0}
      onClick={() => {
        // 真機實測精確對齊腳本：
        // 1. 官方進入 FG 固定範本：4 場消除（Line 2 J*3）+ 1 遞補無贏分
        const triggerLines = [
          '[13,0,0,0,0],',
          '[13,0,0,0,0],',
          '[13,0,0,0,0],',
          '[13,0,0,0,0],',
          '[0,0,0,0,0],'
        ].join('\n');

        // 2. 取出當前畫面上選中 Symbol 的純連線組（長度 2 ~ 5）
        const pureCombs = combinations
          .filter(c => c.wildCount === 0 && c.rng)
          .sort((a, b) => a.length - b.length);

        // 3. 取出當前畫面上選中 Symbol 的含 WX 連線組（長度 2 ~ 5）
        const wxCombs = combinations
          .filter(c => c.wildCount > 0 && c.rng)
          .sort((a, b) => a.length - b.length);

        // 格式化單一測案：若無消除（如 2 連線）僅輸出初始 1 行；若有消除輸出初始 + 遞補
        const formatCombBlock = (comb: ScriptCombination) => {
          const rngs: number[][] = (comb.allRngs && comb.allRngs.length > 0)
            ? comb.allRngs
            : (comb.rng ? [comb.rng] : []);
          return rngs.map(r => `[${r.slice(0, 5).join(',')}],`).join('\n');
        };

        const pureBlocks = pureCombs.map(formatCombBlock).join('\n\n');
        const wxBlocks = wxCombs.map(formatCombBlock).join('\n\n');

        let text = [
          triggerLines,
          pureBlocks,
          triggerLines,
          wxBlocks
        ].filter(Boolean).join('\n\n');

        // 移除最後一行的逗號以符合標準格式
        text = text.replace(/,$/, '');

        navigator.clipboard.writeText(text);
        setIsCopiedRomaChain(true);
        setTimeout(() => setIsCopiedRomaChain(false), 2000);
      }}
      className={`px-2 py-1 text-xs font-bold rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isCopiedRomaChain
          ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
          : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/30'
      }`}
      title={`一鍵複製「觸發免遊 (5組) + 4場純${selectedSymbol || ''}測案 + 觸發免遊 (5組) + 4場${selectedSymbol || ''}+WX測案」完整實測腳本`}
    >
      {isCopiedRomaChain ? '✅ 已複製免遊串接！' : '⚔️ 複製免遊連鎖實測腳本'}
    </button>
  );
};

/** 目前 RNG 預覽：分行顯示初始 / 遞補 / 免遊觸發序列 */
const CurrentRngPreview = ({ targetComb, formattedRngArray, isManualEdited, manualRefillRng, isFreeGame, triggerRngSequence, hasPayingWin }: CurrentRngPreviewProps) => {
  if (isManualEdited) {
    if (manualRefillRng) {
      return (
        <div className="flex flex-col text-[10.5px] leading-tight">
          <span className="text-yellow-400">初始: [{formattedRngArray.slice(0, 5).join(',')}],</span>
          <span className="text-[#64ffda]">遞補: [{manualRefillRng.slice(0, 5).join(',')}], <span className="text-green-400 font-bold">(0消除)</span></span>
        </div>
      );
    }
    return <span>[{formattedRngArray.slice(0, 5).join(',')}], <span className="text-gray-400 text-[10px]">{hasPayingWin ? '(掉落連線/無安全遞補)' : '(無消除)'}</span></span>;
  }
  const fgRngs: number[][] = targetComb?.allRngs || (targetComb?.rng ? [targetComb.rng] : []);
  if (isFreeGame && triggerRngSequence && triggerRngSequence.length > 0) {
    return (
      <div className="flex flex-col text-[10.5px] leading-tight">
        <span className="text-purple-300 font-bold">觸發免遊 ({triggerRngSequence.length}組):</span>
        {triggerRngSequence.map((r: number[], idx: number) => (
          <span key={`trig-${idx}`} className="opacity-90">[{r.slice(0, 5).join(',')}],</span>
        ))}
        <span className="text-[#64ffda] font-bold mt-1">FG測試 ({fgRngs.length}組):</span>
        {fgRngs.map((r: number[], idx: number) => (
          <span key={`fg-${idx}`}>[{r.slice(0, 5).join(',')}],</span>
        ))}
      </div>
    );
  } else if ((targetComb?.allRngs?.length ?? 0) > 1) {
    const all = targetComb!.allRngs!;
    return (
      <div className="flex flex-col text-[10.5px] leading-tight">
        <span className="text-yellow-400">初始: [{all[0].slice(0, 5).join(',')}],</span>
        <span className="text-[#64ffda]">遞補: [{all[1].slice(0, 5).join(',')}], <span className="text-green-400 font-bold">(0消除)</span></span>
      </div>
    );
  } else if (targetComb?.allRngs?.length === 1) {
    return <span>[{targetComb.allRngs[0].slice(0, 5).join(',')}], <span className="text-gray-400 text-[10px]">{hasPayingWin ? '(掉落連線/無安全遞補)' : '(無消除)'}</span></span>;
  }
  return null;
};

export const romaUi: GameUi = { FreeGameToggle, TriggerPanel, ExtraCopyButtons, CurrentRngPreview };
