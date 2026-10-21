import React, { useState } from 'react';
import { X, Play, AlertCircle, Square, Bookmark } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useMachineStore } from '../../store/useMachineStore';
import { useSnippetStore } from '../../store/useSnippetStore';
import { SlotGridDisplay } from '../SlotGridDisplay';
import { findTraits } from '../../games/registry';
import { GameRegistry } from '../../core/GameRegistry';
import { parseQaSteps } from '../../flows/rngValidator';

const templateFiles = import.meta.glob('/templates/*.{xlsx,xls}', { query: '?url', eager: true, import: 'default' }) as Record<string, string>;
const getTemplateName = (path: string) => {
  const parts = path.split('/');
  const filename = parts[parts.length - 1];
  return filename.replace(/\.(xlsx|xls)$/, '').replace('範本-', '');
};

interface RngValidatorProps {
  onClose: () => void;
}

const StepCard = ({ step, idx, gameType }: { step: any, idx: number, gameType: string }) => {
  const [activeDrop, setActiveDrop] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationStage, setAnimationStage] = useState<'idle' | 'eliminating' | 'dropping'>('idle');
  const currentDrop = step.drops[activeDrop];
  const previousDrop = activeDrop > 0 ? step.drops[activeDrop - 1] : undefined;

  React.useEffect(() => {
    if (!isPlaying) return;

    let t: NodeJS.Timeout;

    if (animationStage === 'idle') {
      if (activeDrop >= step.drops.length - 1) {
        setIsPlaying(false);
        return;
      }
      t = setTimeout(() => setAnimationStage('eliminating'), 500);
    } else if (animationStage === 'eliminating') {
      t = setTimeout(() => {
        setActiveDrop(prev => prev + 1);
        setAnimationStage('dropping');
      }, 600);
    } else if (animationStage === 'dropping') {
      t = setTimeout(() => {
        setAnimationStage('idle');
      }, 850);
    }

    return () => clearTimeout(t);
  }, [isPlaying, animationStage, activeDrop, step.drops.length]);

  const togglePlay = () => {
    if (activeDrop >= step.drops.length - 1 && !isPlaying) {
      setActiveDrop(0);
      setAnimationStage('idle');
      setTimeout(() => setIsPlaying(true), 50);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="bg-dashboard-bg border border-gray-700/50 rounded-xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 bg-dashboard-accent h-full"></div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-dashboard-text-primary flex items-center gap-2">
          <span className="bg-dashboard-accent/10 text-dashboard-accent px-2 py-1 rounded text-sm">
            Step {idx + 1}
          </span>
          {step.drops.length > 1 && (
            <span className="text-sm text-gray-400">
              (消除掉落: {activeDrop + 1} / {step.drops.length})
            </span>
          )}
        </h3>
        <div className="text-right">
          <p className="text-sm text-gray-400">Total Win</p>
          <p className={`text-2xl font-black font-mono ${step.totalWin > 0 ? 'text-green-400' : 'text-gray-500'}`}>
            {step.totalWin > 0 ? '+' : ''}{step.totalWin}
          </p>
        </div>
      </div>
      
      <div className="flex flex-col items-center gap-4 bg-dashboard-card p-6 rounded-lg border border-gray-700/30 relative">
        {step.drops.length > 0 && (
          <div className="flex w-full justify-between items-center px-2 mb-2">
            <button 
              onClick={() => setActiveDrop(Math.max(0, activeDrop - 1))}
              disabled={activeDrop === 0 || isPlaying}
              className="p-2 bg-gray-700 rounded-full disabled:opacity-30 hover:bg-gray-600 transition-colors shadow-lg border border-gray-600"
            >
              ◀ 
            </button>
            
            <div className="flex items-center gap-3">
              <span className="text-gray-400 font-bold text-sm bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
                Drop {activeDrop + 1}
                {findTraits(gameType)?.family === 'way' && (
                  <span className="text-yellow-400 ml-2">X{currentDrop.multiplier}</span>
                )}
              </span>
              
              <button
                onClick={togglePlay}
                className={`p-1.5 rounded-full shadow-lg border transition-all ${
                  isPlaying 
                    ? 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30' 
                    : 'bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30'
                }`}
                title={isPlaying ? '暫停播放' : '自動播放所有掉落'}
              >
                {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              </button>
            </div>

            <button 
              onClick={() => setActiveDrop(Math.min(step.drops.length - 1, activeDrop + 1))}
              disabled={activeDrop === step.drops.length - 1 || isPlaying}
              className="p-2 bg-gray-700 rounded-full disabled:opacity-30 hover:bg-gray-600 transition-colors shadow-lg border border-gray-600"
            >
              ▶
            </button>
          </div>
        )}
        
        <div className="slot-board flex gap-2 justify-center">
          <SlotGridDisplay
            gridMode="custom"
            gridSymbols={currentDrop.grid}
            winningCoords={currentDrop.winningCoords}
            prevGridSymbols={previousDrop?.grid}
            prevWinningCoords={previousDrop?.winningCoords}
            hideEmptyCells={true}
            animationStage={animationStage}
            goldFrames={currentDrop.goldFrames}
            jackpots={currentDrop.jackpots}
            renderCellInner={(symbol, _colIndex, _rowIndex, displaySymbol, hasGoldFrame, goldMultiplier, hasJackpot, jackpotValue) => (
              <div className="flex flex-col items-center justify-center pointer-events-none w-full h-full relative">
                <span>{displaySymbol}</span>
                {symbol.match(/^[F|L][1-4]_/) && (
                   <span className="text-[10px] text-gray-500 font-mono mt-1 leading-none">{symbol.split('_')[0]}</span>
                )}
                {hasGoldFrame && (
                  <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-dashboard-bg text-[10px] font-black px-1 rounded-sm shadow border border-yellow-600 z-10">
                    {goldMultiplier}
                  </div>
                )}
                {hasJackpot && (
                  <div className="absolute -bottom-1 left-0 right-0 mx-1 bg-red-500 text-dashboard-on-accent text-[9px] font-black px-1 rounded-sm shadow border border-red-700 z-10 truncate text-center">
                    {jackpotValue}
                  </div>
                )}
              </div>
            )}
          />
        </div>
        
        {step.drops.length > 0 && (
          <div className={`text-sm font-bold mt-2 px-4 py-2 rounded-full border text-center flex flex-col ${currentDrop.totalWin > 0 ? 'text-green-400 bg-green-900/20 border-green-500/30' : 'text-gray-400 bg-gray-800/50 border-gray-700/50'}`}>
            <span>{(GameRegistry.getGame(gameType as any)?.hasCascadeFeature?.() ?? true) ? '該次掉落贏分' : '連線贏分'}</span>
            {findTraits(gameType)?.family === 'way' ? (
              <span className="text-lg">
                {currentDrop.originalWin} <span className="text-gray-500 text-sm mx-1">×</span> {currentDrop.multiplier} <span className="text-gray-500 text-sm mx-1">=</span> {currentDrop.totalWin}
              </span>
            ) : (
              <span className="text-lg">{currentDrop.totalWin}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const RngValidator: React.FC<RngValidatorProps> = ({ onClose }) => {
  const [jsonInput, setJsonInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isFreeGame, setIsFreeGame] = useState<boolean>(false);
  const [parsedSteps, setParsedSteps] = useState<{
    totalWin: number;
    drops: {
      grid: string[][];
      totalWin: number;
      originalWin: number;
      multiplier: number;
      winningCoords: Map<string, number[]>;
    }[];
  }[]>([]);

  const {
    currentStrips,
    currentStripSets,
    currentFreeStripSets,
    rowCounts,
    reelCount,
    currentPaytable,
    specialSymbolConfig,
    customPaylines,
    isProjectLoaded,
    isProjectLoading,
    projectName
  } = useGameStore();
  const { bet, coin, gameType, loadTemplateTrigger, setLoadTemplateTrigger } = useMachineStore();
  const betMultiplier = coin > 0 ? bet / coin : 1;

  const snippets = useSnippetStore(state => state.snippets);
  const projectSnippets = snippets.filter(s => (s.projectName || s.gameType) === projectName);

  const format2DArray = (arr: number[][]) => {
    if (!arr || arr.length === 0) return '[]';
    return `[\n${arr.map(subArr => `[${subArr.join(',')}]`).join(',\n')}\n]`;
  };

  const stringifyQA = (qaData: any) => {
    if (!qaData.QA || qaData.QA.length === 0) return JSON.stringify(qaData, null, 2);
    const qa = qaData.QA[0];
    return `{
 "QA":[
 {
 "RNGs":
${format2DArray(qa.RNGs)},
 "ClassIDs":
${format2DArray(qa.ClassIDs)},
 "LuckySelects":
${format2DArray(qa.LuckySelects)},
 "Selection":
${format2DArray(qa.Selection)}
 }
 ]
}`;
  };

  const [loadStatus, setLoadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  React.useEffect(() => {
    if (isProjectLoading) {
      setLoadStatus('loading');
    } else if (loadStatus === 'loading') {
      if (isProjectLoaded) {
        setLoadStatus('success');
        setTimeout(() => setLoadStatus('idle'), 2000);
      } else {
        setLoadStatus('error');
        setTimeout(() => setLoadStatus('idle'), 2000);
      }
    }
  }, [isProjectLoading, isProjectLoaded]);

  const templatesList = Object.keys(templateFiles).map(path => ({
    path,
    name: getTemplateName(path)
  }));

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      setLoadTemplateTrigger(val);
    }
  };

  // 解析 / 盤面 / 掉落模擬邏輯在 src/flows/rngValidator.ts（有流程規則測試）
  const handleParse = () => {
    setErrorMsg('');
    try {
      setParsedSteps(parseQaSteps({
        jsonInput, gameType, reelCount, rowCounts, currentStrips, currentStripSets, currentFreeStripSets,
        currentPaytable, customPaylines, isFreeGame, bet, betMultiplier,
      }));
    } catch (err: any) {
      setErrorMsg(err.message || 'JSON 解析失敗');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-dashboard-bg border border-dashboard-accent/30 rounded-2xl w-full max-w-[90vw] h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-dashboard-text-primary flex items-center gap-2">
              <Play className="text-dashboard-accent" size={24} />
              RNG 腳本驗證 (RNG Validator)
            </h2>
            <div className="w-[1px] h-6 bg-gray-700/50"></div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">選擇遊戲範本:</span>
              <select 
                onChange={handleTemplateChange}
                className="bg-dashboard-bg border border-dashboard-accent text-dashboard-text-primary font-bold rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500 cursor-pointer shadow-lg hover:bg-dashboard-card transition-colors"
                value={isProjectLoaded || loadStatus !== 'idle' ? "loaded" : ""}
              >
                <option value="" disabled hidden>-- 請選擇 --</option>
                <option value="loaded" disabled hidden className={loadStatus === 'error' ? "text-red-400" : "text-dashboard-accent"}>
                  {loadStatus === 'loading' ? '⏳ 載入中...' :
                   loadStatus === 'success' ? '✅ 載入專案成功' :
                   loadStatus === 'error' ? '❌ 載入專案失敗' :
                   isProjectLoaded ? projectName : "-- 請選擇 --"}
                </option>
                {templatesList.map(tmpl => (
                  <option key={tmpl.path} value={tmpl.path}>{tmpl.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-dashboard-text-primary transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Input */}
          <div className="w-[350px] border-r border-gray-700/50 flex flex-col bg-dashboard-bg shrink-0">
            <div className="p-4 border-b border-gray-700/50 flex flex-col gap-2 relative">
              <span className="text-sm font-bold text-dashboard-text-primary">貼上 QA JSON 腳本</span>
              <span className="text-xs text-gray-400">請貼上包含 QA[0].RNGs 的腳本內容，系統會自動轉換為對應盤面。</span>
              
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="validator-freegame-toggle"
                  checked={isFreeGame}
                  onChange={(e) => setIsFreeGame(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 text-dashboard-accent focus:ring-dashboard-accent focus:ring-offset-gray-900 bg-gray-800"
                />
                <label htmlFor="validator-freegame-toggle" className="text-sm text-gray-300 font-bold cursor-pointer hover:text-dashboard-text-primary">
                  使用 Free Game 滾輪表 (免遊模式)
                </label>
              </div>
              
              {!isProjectLoaded && !isProjectLoading && (
                <div className="mt-2 p-3 bg-red-900/20 border border-red-500/50 rounded-lg flex flex-col items-center justify-center text-center">
                  <AlertCircle size={20} className="text-red-500 mb-1" />
                  <span className="text-red-400 text-xs font-bold">尚未載入專案，請先在上方選擇遊戲範本！</span>
                </div>
              )}
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="flex-1 bg-dashboard-card border border-gray-700 rounded-lg p-3 text-sm text-dashboard-text-primary font-mono focus:border-dashboard-accent focus:ring-1 focus:ring-dashboard-accent outline-none resize-none"
              placeholder={'{\n "QA": [\n  {\n   "RNGs": [\n    [22, 31, 9, 0, 0, 0, 0]\n   ]\n  }\n ]\n}'}
            />
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg flex items-start gap-2 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}
            <button
                onClick={handleParse}
                disabled={!isProjectLoaded}
                className={`w-full py-3 flex items-center justify-center gap-2 font-bold rounded-lg transition-colors shadow-lg ${
                  isProjectLoaded 
                  ? "bg-dashboard-accent text-dashboard-bg hover:bg-dashboard-accent/90" 
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                <Play size={18} />
                解析並生成盤面
              </button>
          </div>

          {/* Right Panel */}
          <div className="flex-1 bg-dashboard-card/50 overflow-y-auto p-6">
            {parsedSteps.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                <Play size={48} className="opacity-20" />
                <p>尚無資料，請在左側貼上腳本並點擊解析</p>
              </div>
            ) : (
              <div className="flex flex-col gap-10 max-w-4xl mx-auto pb-10">
              {parsedSteps.map((step, idx) => (
                <StepCard key={idx} step={step} idx={idx} gameType={gameType} />
              ))}
            </div>
            )}
          </div>

          {/* Far Right Panel: Saved Scripts */}
          {isProjectLoaded && (
            <div className="w-[300px] border-l border-gray-700/50 flex flex-col bg-dashboard-bg shrink-0">
              <div className="p-4 border-b border-gray-700/50">
                <h3 className="text-sm font-bold text-dashboard-text-primary flex items-center gap-2">
                  <Bookmark size={18} className="text-dashboard-accent" />
                  已儲存腳本
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  點擊快速載入腳本內容至左側
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
                {projectSnippets.length === 0 ? (
                  <div className="text-gray-500 text-sm text-center py-8">
                    目前專案沒有儲存的腳本
                  </div>
                ) : (
                  projectSnippets.map(snippet => (
                    <button
                      key={snippet.id}
                      onClick={() => setJsonInput(stringifyQA(snippet.qaData))}
                      className="text-left bg-dashboard-card hover:bg-dashboard-hover border border-gray-700 hover:border-dashboard-accent rounded-lg p-3 transition-colors flex flex-col gap-2 shadow-sm"
                    >
                      <div className="text-sm font-bold text-blue-300 w-full whitespace-normal break-words leading-tight">
                        {snippet.title}
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-3 font-mono leading-tight">
                        {JSON.stringify(snippet.qaData).substring(0, 150)}...
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
