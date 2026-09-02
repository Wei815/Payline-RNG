import React, { useState } from 'react';
import { X, Play, AlertCircle, Square } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useMachineStore } from '../../store/useMachineStore';
import { SlotGridDisplay } from '../SlotGridDisplay';
import { evaluateGrid, getWinningPositions } from '../../utils/evaluation';
import { GameRegistry } from '../../core/GameRegistry';

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
    <div className="bg-[#0a192f] border border-gray-700/50 rounded-xl p-6 shadow-xl relative overflow-hidden">
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
      
      <div className="flex flex-col items-center gap-4 bg-[#112240] p-6 rounded-lg border border-gray-700/30 relative">
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
                {(gameType === 'waygame' || gameType === 'waygame_elephant' || gameType === 'waygame_qin') && (
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
        
        <div className="flex gap-2 justify-center">
          <SlotGridDisplay
            gridMode="custom"
            gridSymbols={currentDrop.grid}
            winningCoords={currentDrop.winningCoords}
            prevGridSymbols={previousDrop?.grid}
            prevWinningCoords={previousDrop?.winningCoords}
            hideEmptyCells={true}
            animationStage={animationStage}
          />
        </div>
        
        {step.drops.length > 0 && (
          <div className={`text-sm font-bold mt-2 px-4 py-2 rounded-full border text-center flex flex-col ${currentDrop.totalWin > 0 ? 'text-green-400 bg-green-900/20 border-green-500/30' : 'text-gray-400 bg-gray-800/50 border-gray-700/50'}`}>
            <span>該次掉落贏分</span>
            {(gameType === 'waygame' || gameType === 'waygame_elephant' || gameType === 'waygame_qin') ? (
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
    isProjectLoaded,
    isProjectLoading,
    projectName
  } = useGameStore();
  const { bet, coin, gameType, loadTemplateTrigger, setLoadTemplateTrigger } = useMachineStore();
  const betMultiplier = coin > 0 ? bet / coin : 1;

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

  const handleParse = () => {
    setErrorMsg('');
    try {
      const data = JSON.parse(jsonInput);
      if (!data?.QA || !data.QA[0] || !data.QA[0].RNGs) {
        throw new Error('無效的格式，找不到 QA[0].RNGs');
      }

      const rngSteps: number[][] = data.QA[0].RNGs;
      const classIds: number[][] = data.QA[0].ClassIDs || [];

      // Build MathID map
      const mathIdToSymbol: Record<number, string> = {};
      currentPaytable.forEach(r => {
        if (r.mathId !== undefined) {
          const ids = String(r.mathId).split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
          ids.forEach(id => {
            mathIdToSymbol[id] = r.symbolId;
          });
        }
      });

      const isCoordinateClassId = gameType === 'linegame_set2' || gameType === 'linegame';

      const newSteps = rngSteps.map((rngArray, stepIndex) => {
         const isMathId = isCoordinateClassId || rngArray.length > reelCount + 4;
         
         const emptyGrid = Array.from({ length: reelCount }, (_, c) => 
            Array(rowCounts[c] || 3).fill('-')
         );

         let classIdIndex = 0;
         const flatClassIds = classIds[stepIndex] || [];
         
         let currentGrid: string[][];
         let idIndex = 0;
         const currentTopCursors = [...rngArray];
         
         let activeStrips = currentStrips;
         if (!isMathId && rngArray.length > reelCount) {
            const stripId = rngArray[reelCount];
            const targetStripSets = isFreeGame && currentFreeStripSets.length > 0 ? currentFreeStripSets : currentStripSets;
            activeStrips = targetStripSets[stripId] || currentStrips;
         }

         if (isMathId) {
            currentGrid = emptyGrid.map(col => 
               col.map(cell => {
                  if (idIndex < rngArray.length) {
                    const val = rngArray[idIndex++];
                    let sym = mathIdToSymbol[val];
                    if (sym && !isCoordinateClassId && (sym.startsWith('F') || sym.startsWith('L'))) {
                      const mult = flatClassIds[classIdIndex++];
                      if (mult !== undefined) {
                         sym = `${sym}_${mult}X`;
                      }
                    }
                    return sym ? sym : '-';
                  }
                  return cell;
               })
            );
         } else {
            currentGrid = emptyGrid.map((col, c) => {
               const start = rngArray[c] || 0;
               const len = activeStrips[c]?.length || 1;
               const strip = activeStrips[c] || ['-'];
               return col.map((_, r) => strip[(start + r) % len]);
            });
         }

         let evWins = evaluateGrid(currentGrid, currentPaytable, gameType, undefined, false);
         let coords = getWinningPositions(currentGrid, evWins, currentPaytable, gameType);
         
         const gameInstance = GameRegistry.getGame(gameType);
         let initialTumbleMultiplier = gameInstance.getTumbleMultiplier(0, isFreeGame);
         
         let originalWinSum = evWins.reduce((sum, w) => sum + (w.totalWin * betMultiplier), 0);
         let winSum = originalWinSum * initialTumbleMultiplier;

         const drops = [{
            grid: currentGrid,
            totalWin: winSum,
            originalWin: originalWinSum,
            multiplier: initialTumbleMultiplier,
            winningCoords: coords
         }];

         // Simulate tumbling
         let hasWins = coords.size > 0;
         let dropCount = 0;
         let lastGrid = currentGrid;
         let lastCoords = coords;

         while (hasWins && dropCount < 30) {
            dropCount++;
            
            const gameInstance = GameRegistry.getGame(gameType);
            const nextGrid = gameInstance.calculateNextDropGrid(
               lastGrid,
               lastCoords,
               isFreeGame,
               (c, dropIndex, totalDropped) => {
                  const strip = activeStrips[c] || ['-'];
                  const stripLen = strip.length;
                  let sym = '-';
                  if (isMathId) {
                     if (idIndex < rngArray.length) {
                        const val = rngArray[idIndex++];
                        sym = mathIdToSymbol[val] || '-';
                        if (sym && !isCoordinateClassId && (sym.startsWith('F') || sym.startsWith('L'))) {
                           const mult = flatClassIds[classIdIndex++];
                           if (mult !== undefined) sym = `${sym}_${mult}X`;
                        }
                     } else {
                        sym = '0';
                     }
                  } else {
                     currentTopCursors[c] = (currentTopCursors[c] - 1 + stripLen) % stripLen;
                     sym = strip[currentTopCursors[c]];
                  }
                  return sym;
               }
            );

            // 如果是 Strip，因為 pullNextSymbol 是一次拿一個最新的頂端符號，
            // 拿到的是 [頂部1, 頂部2]，但實際上第一個拿到的應該是放在盤面最上面。
            // 剛剛的 strip 邏輯裡 currentTopCursors 一路往上減，代表最先拔出來的是原先盤面最上面的「上一格」。
            // 而計算 calculateNextDropGrid 時也是從 i=0 開始放到 newSymbols[0]，代表最先拔出來的在最上面，這是正確的。
            // Wait, 原版條帶的邏輯是: for(i=0) 拿出 top-1, push 到 newSymbols。然後 newSymbols.reverse()，再放到盤面上方。
            // 為什麼要 reverse？因為如果 top=10, 拿 top-1=9 (放 newSymbols[0])，拿 top-2=8 (放 newSymbols[1])。
            // 陣列看起來是 [9, 8]。然後 [...newSymbols, ...keptSymbols] 放到畫面上，9 在第一排(上)，8 在第二排(下)。
            // 但實際上條帶 index 越小，應該在畫面的越上方。
            // 所以 8 應該在 9 的上面！這就是原版為什麼 reverse 的原因！
            // 所以我們必須在 pull 的時候，直接把順序調對！
            // 當 i=0 (最上面的一格), 它應該拿到的是最遠的那個 cursor，也就是 (top - totalDropped + i)！
            
            if (!isMathId) {
               // 修正: 重新排列 newly generated Strip symbols, 由於 calculateNextDropGrid 會把
               // i=0 當作 newSymbols 的第0項 (盤面最上)，這格應該對應條帶最遠 (最小 index) 的那格。
               // 在迴圈外統一更新 cursor，迴圈內直接計算位置即可
               for (let c = 0; c < reelCount; c++) {
                  const strip = activeStrips[c] || ['-'];
                  const stripLen = strip.length;
                  const colWins = lastCoords.get(c.toString()) || [];
                  let keptCount = 0;
                  for (let r = 0; r < lastGrid[c].length; r++) {
                     if (!colWins.includes(r) || gameInstance.isSymbolUnremovable?.(lastGrid[c][r], isFreeGame)) {
                        keptCount++;
                     } else if ((gameInstance as any).isGoldSymbol?.(lastGrid[c][r])) {
                        keptCount++;
                     }
                  }
                  const removedCount = lastGrid[c].length - keptCount;
                  
                  if (removedCount > 0) {
                     // 顛倒新符號順序: i=0 (最上面) 應該拿 8, i=1 (下面) 應該拿 9
                     // 這在迴圈外無法對 nextGrid 作用，我們需要在 nextGrid 產生後，對每一軸前 removedCount 個符號做 reverse！
                     const newSymbols = nextGrid[c].slice(0, removedCount);
                     newSymbols.reverse();
                     nextGrid[c].splice(0, removedCount, ...newSymbols);
                  }
               }
            }
            
            const evWinsNext = evaluateGrid(nextGrid, currentPaytable, gameType, undefined, false);
            const coordsNext = getWinningPositions(nextGrid, evWinsNext, currentPaytable, gameType);
            
            let tumbleMultiplier = gameInstance.getTumbleMultiplier(dropCount, isFreeGame);
            
            const originalWinSumNext = evWinsNext.reduce((sum, w) => sum + (w.totalWin * betMultiplier), 0);
            const winSumNext = originalWinSumNext * tumbleMultiplier;
            
            drops.push({
               grid: nextGrid,
               totalWin: winSumNext,
               originalWin: originalWinSumNext,
               multiplier: tumbleMultiplier,
               winningCoords: coordsNext
            });
            
            lastGrid = nextGrid;
            lastCoords = coordsNext;
            hasWins = coordsNext.size > 0;
         }

         const stepTotalWin = drops.reduce((sum, drop) => sum + drop.totalWin, 0);

         return {
            drops,
            totalWin: stepTotalWin
         };
      });

      setParsedSteps(newSteps);
    } catch (err: any) {
      setErrorMsg(err.message || 'JSON 解析失敗');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-[#0a192f] border border-dashboard-accent/30 rounded-2xl w-full max-w-[90vw] h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-[#e6f1ff] flex items-center gap-2">
              <Play className="text-dashboard-accent" size={24} />
              RNG 腳本驗證 (RNG Validator)
            </h2>
            <div className="w-[1px] h-6 bg-gray-700/50"></div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">選擇遊戲範本:</span>
              <select 
                onChange={handleTemplateChange}
                className="bg-[#0a192f] border border-dashboard-accent text-[#e6f1ff] font-bold rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500 cursor-pointer shadow-lg hover:bg-[#112240] transition-colors"
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
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Input */}
          <div className="w-[350px] border-r border-gray-700/50 flex flex-col bg-[#0a192f] shrink-0">
            <div className="p-4 border-b border-gray-700/50 flex flex-col gap-2 relative">
              <span className="text-sm font-bold text-[#e6f1ff]">貼上 QA JSON 腳本</span>
              <span className="text-xs text-gray-400">請貼上包含 QA[0].RNGs 的腳本內容，系統會自動轉換為對應盤面。</span>
              
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="validator-freegame-toggle"
                  checked={isFreeGame}
                  onChange={(e) => setIsFreeGame(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 text-dashboard-accent focus:ring-dashboard-accent focus:ring-offset-gray-900 bg-gray-800"
                />
                <label htmlFor="validator-freegame-toggle" className="text-sm text-gray-300 font-bold cursor-pointer hover:text-white">
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
              className="flex-1 bg-[#112240] border border-gray-700 rounded-lg p-3 text-sm text-dashboard-text-primary font-mono focus:border-dashboard-accent focus:ring-1 focus:ring-dashboard-accent outline-none resize-none"
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
                  ? "bg-dashboard-accent text-[#0a192f] hover:bg-dashboard-accent/90" 
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                <Play size={18} />
                解析並生成盤面
              </button>
          </div>

          {/* Right Panel */}
          <div className="flex-1 bg-[#112240]/50 overflow-y-auto p-6">
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

        </div>
      </div>
    </div>
  );
};
