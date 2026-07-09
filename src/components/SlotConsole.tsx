import React, { useState, useEffect, useMemo } from 'react';
import { defaultPaylines } from '../utils/evaluation';
import { useMachineStore } from '../store/useMachineStore';
import { useGameStore } from '../store/useGameStore';

export interface SlotConsoleProps {
  currentGrid: string[][];
}

import { parsePasteRng } from '../utils/formatters';
import { SlotManualTab } from './tabs/SlotManualTab';
import { SlotGeneratorTab } from './tabs/SlotGeneratorTab';
import { LineViewerTab } from './tabs/LineViewerTab';
import { TumbleViewerTab } from './tabs/TumbleViewerTab';
import { SlotCustomGridTab } from './tabs/SlotCustomGridTab';

export const SlotConsole: React.FC<SlotConsoleProps> = ({ currentGrid }) => {
  const isRunning = useMachineStore(state => state.isRunning);
  const bet = useMachineStore(state => state.bet);
  const coin = useMachineStore(state => state.coin);
  const gameType = useMachineStore(state => state.gameType);

  const reelCount = useGameStore(state => state.reelCount);
  const rowCounts = useGameStore(state => state.rowCounts);
  const setRowCounts = useGameStore(state => state.setRowCounts);
  const currentStrips = useGameStore(state => state.currentStrips);
  const currentPaytable = useGameStore(state => state.currentPaytable);
  const customPaylines = useGameStore(state => state.customPaylines);
  const specialSymbolConfig = useGameStore(state => state.specialSymbolConfig);
  const setSpecialSymbolConfig = useGameStore(state => state.setSpecialSymbolConfig);
  const goldFrames = useGameStore(state => state.goldFrames);
  const setGoldFrames = useGameStore(state => state.setGoldFrames);
  const jackpots = useGameStore(state => state.jackpots);
  const setJackpots = useGameStore(state => state.setJackpots);
  const clovers = useGameStore(state => state.clovers);
  const setClovers = useGameStore(state => state.setClovers);
  const manualIndices = useGameStore(state => state.manualIndices);
  const setManualIndices = useGameStore(state => state.setManualIndices);
  const manualIndicesOther = useGameStore(state => state.manualIndicesOther);
  const setManualIndicesOther = useGameStore(state => state.setManualIndicesOther);
  const topTracker = useGameStore(state => state.topTracker);
  const setTopTracker = useGameStore(state => state.setTopTracker);
  const topTrackerOther = useGameStore(state => state.topTrackerOther);
  const setTopTrackerOther = useGameStore(state => state.setTopTrackerOther);
  const activeTab = useGameStore(state => state.activeTab);
  const setActiveTab = useGameStore(state => state.setActiveTab);

  const betMultiplier = bet / coin;
  const [lineViewerSymbolState, setLineViewerSymbolState] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [useWxInLines, setUseWxInLines] = useState<boolean>(true);

  useEffect(() => {
    if (gameType !== 'linegame' && gameType !== 'payanywhere_set2' && gameType !== 'linegame_set2' && activeTab === 'lines') {
      setActiveTab('manual');
    }
  }, [gameType, activeTab]);

  const [selectedSymbol, setSelectedSymbol] = useState<string>('');

  useEffect(() => {
    setManualIndices(Array(reelCount).fill(''));
    setManualIndicesOther(Array(reelCount).fill(''));
  }, [reelCount]);

  // Sync active tab if payanywhere_set2 is selected and manual is active
  useEffect(() => {
    if ((gameType === 'payanywhere_set2' || gameType === 'linegame_set2') && activeTab === 'manual') {
      setActiveTab('other');
    }
  }, [gameType, activeTab]);

  // 分組與排序邏輯 (同 Paytable Editor 三個區塊，並按指定順序排序)
  const groupedSymbols = useMemo(() => {
    const disabledSymbols = new Set(
      currentPaytable.filter(r => r.isEnabled === false).map(r => r.symbolId)
    );
    const allSyms = new Set<string>();
    currentStrips.forEach(strip => {
      if (!strip) return;
      strip.forEach(s => {
        if (s && s !== '-' && s !== '' && !disabledSymbols.has(s)) {
          allSyms.add(s);
        }
      });
    });

    if (allSyms.size === 0) {
      currentPaytable.forEach(r => {
        if (r.symbolId && r.isEnabled !== false) {
          allSyms.add(r.symbolId);
        }
      });
    }

    const symList = Array.from(allSyms);
    const order = ['WW', 'WX', 'B1', 'S1', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'A', 'K', 'Q', 'J', 'TE', 'NI'];

    const getBase = (sym: string): string => {
      const s = sym.toUpperCase();
      if (s === 'WILD' || s === 'WX' || s === 'WW') return 'WX';
      if (s === 'WT' || s === 'WTE') return 'TE';
      if (s === 'WN' || s === 'WNI') return 'NI';
      if (/^W\d+$/.test(s)) return `M${s.substring(1)}`;
      if (/^W[AKQJ]$/.test(s)) return s.substring(1);
      return s;
    };

    const getOrderScore = (sym: string): number => {
      const base = getBase(sym);
      const idx = order.indexOf(base);
      return idx === -1 ? 999 : idx;
    };

    const sorted = symList.sort((a, b) => getOrderScore(a) - getOrderScore(b));

    const others: string[] = [];
    const mnum: string[] = [];
    const mlet: string[] = [];

    sorted.forEach(sym => {
      const base = getBase(sym);
      const b = base.toUpperCase();
      if (b === 'WX' || b === 'WILD' || b === 'WW' || b === 'B1' || b === 'S1') {
        others.push(sym);
      } else if (/^M\d+$/.test(b)) {
        mnum.push(sym);
      } else if (['A', 'K', 'Q', 'J', 'TE', 'NI', 'T', 'N'].includes(b)) {
        mlet.push(sym);
      } else {
        others.push(sym);
      }
    });

    if (gameType === 'payanywhere_set2') {
      const hasB1 = others.includes('B1');
      const hasB2 = others.includes('B2');
      if (hasB1 || hasB2) {
        if (hasB1) others.splice(others.indexOf('B1'), 1);
        if (hasB2) others.splice(others.indexOf('B2'), 1);
        others.unshift('B1/B2');
      }
    }

    return [
      { id: 'others', title: '第一區塊 (其他)', list: others },
      { id: 'mnum', title: '第二區塊 (M數字)', list: mnum },
      { id: 'mlet', title: '第三區塊 (M字母)', list: mlet }
    ].filter(g => g.list.length > 0);
  }, [currentStrips, currentPaytable]);

  const symbols = useMemo(() => {
    const list: string[] = [];
    groupedSymbols.forEach(g => {
      g.list.forEach(sym => list.push(sym));
    });
    return list;
  }, [groupedSymbols]);

  const lineViewerSymbol = useMemo(() => {
    const matchKey = `match${Math.min(5, reelCount)}`;
    const candidate = currentPaytable.find(p => 
      !p.isWild && 
      !p.isScatter && 
      (p.payouts[matchKey as keyof typeof p.payouts] || 0) > 0
    );
    return candidate ? candidate.symbolId : (symbols[0] || 'M1');
  }, [currentPaytable, reelCount, symbols]);

  const activeLineViewerSymbol = lineViewerSymbolState || lineViewerSymbol;

  useEffect(() => {
    if (lineViewerSymbolState && !symbols.includes(lineViewerSymbolState)) {
      setLineViewerSymbolState('');
    }
    if (symbols.length > 0 && !symbols.includes(selectedSymbol)) {
      setSelectedSymbol(symbols[0]);
    }
  }, [symbols, lineViewerSymbolState, selectedSymbol]);

  const lineViewerPayout = useMemo(() => {
    const matchKey = `match${Math.min(5, reelCount)}`;
    const rule = currentPaytable.find(p => p.symbolId === activeLineViewerSymbol);
    return rule ? (rule.payouts[matchKey] || 0) : 0;
  }, [currentPaytable, reelCount, activeLineViewerSymbol]);

  // Reset Generator Grid when target symbol changes
  useEffect(() => {
    if (activeTab === 'other') {
      setManualIndicesOther(Array(reelCount).fill(''));
    }
  }, [selectedSymbol, reelCount]);



  return (
    <div className="h-full flex flex-col p-6 overflow-hidden relative">
      <style>{`
        @keyframes lineFlow {
          to {
            stroke-dashoffset: -32;
          }
        }
        .winning-line-flow {
          stroke-dasharray: 14 6;
          animation: lineFlow 1.1s linear infinite;
        }
      `}</style>

      {/* Tabs Switcher */}
      <div className="flex border-b border-gray-800 bg-[#0f1d35] rounded-t-xl overflow-hidden shrink-0 border border-gray-700/50">
        {(gameType !== 'payanywhere_set2' && gameType !== 'linegame_set2') && (
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-all duration-200 cursor-pointer ${activeTab === 'manual'
                ? 'border-dashboard-accent text-dashboard-accent bg-[#112240]/40'
                : 'border-transparent text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-[#112240]/20'
              }`}
          >
            手動計算盤面
          </button>
        )}
        <button
          onClick={() => setActiveTab('other')}
          className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-all duration-200 cursor-pointer ${activeTab === 'other'
              ? 'border-dashboard-accent text-dashboard-accent bg-[#112240]/40'
              : 'border-transparent text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-[#112240]/20'
            }`}
        >
          連線測試產生器
        </button>
        {(gameType === 'linegame' || gameType === 'payanywhere_set2' || gameType === 'linegame_set2') && (
          <button
            onClick={() => setActiveTab('lines')}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-all duration-200 cursor-pointer ${activeTab === 'lines'
                ? 'border-dashboard-accent text-dashboard-accent bg-[#112240]/40'
                : 'border-transparent text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-[#112240]/20'
              }`}
          >
            {(gameType === 'linegame' || gameType === 'linegame_set2') ? '贏分線路一覽' : '消除掉落測試'}
          </button>
        )}
        <button
          onClick={() => setActiveTab('customGrid')}
          className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-all duration-200 cursor-pointer ${activeTab === 'customGrid'
              ? 'border-dashboard-accent text-dashboard-accent bg-[#112240]/40'
              : 'border-transparent text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-[#112240]/20'
            }`}
        >
          自定義盤面
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 bg-[#112240]/10 border-x border-b border-gray-700/30 rounded-b-xl overflow-y-auto custom-scrollbar p-6 flex flex-col">
        {activeTab === 'manual' && (
          <SlotManualTab 
            reelCount={reelCount} rowCounts={rowCounts} onRowCountsChange={setRowCounts}
            manualIndices={manualIndices} setManualIndices={setManualIndices}
            topTracker={topTracker} setTopTracker={setTopTracker}
            gameType={gameType} betMultiplier={betMultiplier}
            parsePasteRng={parsePasteRng}
            isRunning={isRunning} selectedSymbol={selectedSymbol}
            currentStrips={currentStrips} currentGrid={currentGrid} currentPaytable={currentPaytable} customPaylines={customPaylines} bet={bet}
          />
        )}
        {activeTab === 'other' && (
          <div className="w-full">
            <SlotGeneratorTab 
              reelCount={reelCount} rowCounts={rowCounts} onRowCountsChange={setRowCounts}
              manualIndicesOther={manualIndicesOther} setManualIndicesOther={setManualIndicesOther}
              topTrackerOther={topTrackerOther} setTopTrackerOther={setTopTrackerOther}
              gameType={gameType} betMultiplier={betMultiplier}
              selectedSymbol={selectedSymbol} setSelectedSymbol={setSelectedSymbol}
              groupedSymbols={groupedSymbols} parsePasteRng={parsePasteRng} isRunning={isRunning}
              specialSymbolConfig={specialSymbolConfig} setSpecialSymbolConfig={setSpecialSymbolConfig}
              goldFrames={goldFrames} setGoldFrames={setGoldFrames}
              jackpots={jackpots} setJackpots={setJackpots}
              clovers={clovers} setClovers={setClovers}
              currentStrips={currentStrips} currentGrid={currentGrid} currentPaytable={currentPaytable} customPaylines={customPaylines} bet={bet}
            />
          </div>
        )}
        {(gameType === 'linegame' || gameType === 'linegame_set2') && activeTab === 'lines' && (
          <div className="w-full flex-1 flex flex-col">
            <LineViewerTab 
              reelCount={reelCount} rowCounts={rowCounts} currentStrips={currentStrips}
              activeLineViewerSymbol={activeLineViewerSymbol} setLineViewerSymbolState={setLineViewerSymbolState}
              symbols={symbols} useWxInLines={useWxInLines} setUseWxInLines={setUseWxInLines}
              lineViewerPayout={lineViewerPayout} betMultiplier={betMultiplier}
              customPaylines={customPaylines} defaultPaylines={defaultPaylines}
              setManualIndices={setManualIndices} setManualIndicesOther={setManualIndicesOther}
              copiedIndex={copiedIndex} setCopiedIndex={setCopiedIndex}
              currentPaytable={currentPaytable} gameType={gameType}
            />
          </div>
        )}
        {gameType === 'payanywhere_set2' && activeTab === 'lines' && (
          <div className="w-full flex-1 flex flex-col min-h-0">
            <TumbleViewerTab
              reelCount={reelCount}
              rowCounts={rowCounts}
              currentStrips={currentStrips}
              currentPaytable={currentPaytable}
              gameType={gameType}
              manualIndices={manualIndices}
              betMultiplier={betMultiplier}
            />
          </div>
        )}
        {activeTab === 'customGrid' && (
          <div className="w-full flex-1 flex flex-col min-h-0">
            <SlotCustomGridTab
              reelCount={reelCount}
              rowCounts={rowCounts}
              currentPaytable={currentPaytable}
              groupedSymbols={groupedSymbols}
              gameType={gameType}
              betMultiplier={betMultiplier}
              customPaylines={customPaylines}
            />
          </div>
        )}
      </div>
    </div>
  );
};
