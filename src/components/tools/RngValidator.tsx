import React, { useState } from 'react';
import { X, Play, AlertCircle } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useMachineStore } from '../../store/useMachineStore';
import { SlotGridDisplay } from '../SlotGridDisplay';
import { evaluateGrid, getWinningPositions } from '../../utils/evaluation';

const templateFiles = import.meta.glob('/templates/*.{xlsx,xls}', { query: '?url', eager: true, import: 'default' }) as Record<string, string>;
const getTemplateName = (path: string) => {
  const parts = path.split('/');
  const filename = parts[parts.length - 1];
  return filename.replace(/\.(xlsx|xls)$/, '').replace('範本-', '');
};

interface RngValidatorProps {
  onClose: () => void;
}

const StepCard = ({ step, idx }: { step: any, idx: number }) => {
  const [activeDrop, setActiveDrop] = useState(0);
  const currentDrop = step.drops[activeDrop];

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
        {step.drops.length > 1 && (
          <div className="flex w-full justify-between items-center px-2 mb-2">
            <button 
              onClick={() => setActiveDrop(Math.max(0, activeDrop - 1))}
              disabled={activeDrop === 0}
              className="p-2 bg-gray-700 rounded-full disabled:opacity-30 hover:bg-gray-600 transition-colors shadow-lg border border-gray-600"
            >
              ◀ 
            </button>
            <span className="text-gray-400 font-bold text-sm bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
              Drop {activeDrop + 1}
            </span>
            <button 
              onClick={() => setActiveDrop(Math.min(step.drops.length - 1, activeDrop + 1))}
              disabled={activeDrop === step.drops.length - 1}
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
          />
        </div>
        
        {step.drops.length > 1 && currentDrop.totalWin > 0 && (
          <div className="text-sm font-bold text-green-400 mt-2 bg-green-900/20 px-4 py-2 rounded-full border border-green-500/30">
            該次掉落贏分: {currentDrop.totalWin}
          </div>
        )}
      </div>
    </div>
  );
};

export const RngValidator: React.FC<RngValidatorProps> = ({ onClose }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [parsedSteps, setParsedSteps] = useState<{
    totalWin: number;
    drops: {
      grid: string[][];
      totalWin: number;
      winningCoords: Map<string, number[]>;
    }[];
  }[]>([]);

  const {
    currentStrips,
    currentStripSets,
    rowCounts,
    reelCount,
    currentPaytable,
    specialSymbolConfig,
    isProjectLoaded
  } = useGameStore();
  const { bet, coin, gameType, setLoadTemplateTrigger } = useMachineStore();
  const betMultiplier = bet * coin;

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
            if (currentStripSets[stripId]) {
               activeStrips = currentStripSets[stripId];
            }
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
         let winSum = evWins.reduce((sum, w) => sum + (w.totalWin * betMultiplier), 0);

         const drops = [{
            grid: currentGrid,
            totalWin: winSum,
            winningCoords: coords
         }];

         // Simulate tumbling
         let hasWins = coords.size > 0;
         let dropCount = 0;
         let lastGrid = currentGrid;
         let lastCoords = coords;

         while (hasWins && dropCount < 30) {
            dropCount++;
            const nextGrid = Array.from({ length: reelCount }, () => [] as string[]);
            
            for (let c = 0; c < reelCount; c++) {
               const colLen = rowCounts[c] || 3;
               const strip = activeStrips[c] || ['-'];
               const stripLen = strip.length;
               
               const keptSymbols: string[] = [];
               for (let r = 0; r < colLen; r++) {
                  if (!lastCoords.has(`${c}-${r}`)) {
                     keptSymbols.push(lastGrid[c][r]);
                  } else {
                     const symId = lastGrid[c][r];
                     if ((gameType === 'waygame' || gameType === 'waygame_qin' || gameType === 'waygame_elephant') && symId.startsWith('G') && symId !== 'G') {
                        keptSymbols.push('WX');
                     }
                  }
               }
               
               const removedCount = colLen - keptSymbols.length;
               const newSymbols: string[] = [];
               
               if (isMathId) {
                  for (let i = 0; i < removedCount; i++) {
                     if (idIndex < rngArray.length) {
                        const val = rngArray[idIndex++];
                        let sym = mathIdToSymbol[val];
                        if (sym && !isCoordinateClassId && (sym.startsWith('F') || sym.startsWith('L'))) {
                           const mult = flatClassIds[classIdIndex++];
                           if (mult !== undefined) sym = `${sym}_${mult}X`;
                        }
                        newSymbols.push(sym || '-');
                     } else {
                        newSymbols.push('0');
                     }
                  }
               } else {
                  for (let i = 0; i < removedCount; i++) {
                     currentTopCursors[c] = (currentTopCursors[c] - 1 + stripLen) % stripLen;
                     newSymbols.push(strip[currentTopCursors[c]]);
                  }
                  newSymbols.reverse();
               }
               
               nextGrid[c] = [...newSymbols, ...keptSymbols];
            }
            
            const evWinsNext = evaluateGrid(nextGrid, currentPaytable, gameType, undefined, false);
            const coordsNext = getWinningPositions(nextGrid, evWinsNext, currentPaytable, gameType);
            const winSumNext = evWinsNext.reduce((sum, w) => sum + (w.totalWin * betMultiplier), 0);
            
            drops.push({
               grid: nextGrid,
               totalWin: winSumNext,
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
                value={isProjectLoaded ? "loaded" : ""}
              >
                <option value="" disabled>-- 請選擇 --</option>
                <option value="loaded" disabled className="text-dashboard-accent">{isProjectLoaded ? "✅ 已載入當前專案" : "-- 請選擇 --"}</option>
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
              
              {!isProjectLoaded && (
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
                  <StepCard key={idx} step={step} idx={idx} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
