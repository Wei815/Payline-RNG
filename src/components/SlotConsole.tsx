import React, { useState, useEffect, useMemo } from 'react';
import { defaultPaylines } from '../utils/evaluation';
import { useMachineStore } from '../store/useMachineStore';
import { useGameStore } from '../store/useGameStore';

export interface SlotConsoleProps {
  currentGrid: string[][];
}

import { useShallow } from 'zustand/react/shallow';
import { parsePasteRng } from '../utils/formatters';
import { useSymbolGrouping } from '../hooks/useSymbolGrouping';

const SlotManualTab = React.lazy(() => import('./tabs/SlotManualTab').then(m => ({ default: m.SlotManualTab })));
const SlotGeneratorTab = React.lazy(() => import('./tabs/SlotGeneratorTab').then(m => ({ default: m.SlotGeneratorTab })));
const LineViewerTab = React.lazy(() => import('./tabs/LineViewerTab').then(m => ({ default: m.LineViewerTab })));
const TumbleViewerTab = React.lazy(() => import('./tabs/TumbleViewerTab').then(m => ({ default: m.TumbleViewerTab })));
const SlotCustomGridTab = React.lazy(() => import('./tabs/SlotCustomGridTab').then(m => ({ default: m.SlotCustomGridTab })));

export const SlotConsole: React.FC<SlotConsoleProps> = ({ currentGrid }) => {
  const { isRunning, bet, coin, gameType } = useMachineStore(useShallow(state => ({
    isRunning: state.isRunning,
    bet: state.bet,
    coin: state.coin,
    gameType: state.gameType
  })));

  const {
    reelCount, rowCounts, setRowCounts,
    currentStrips, currentPaytable, customPaylines,
    specialSymbolConfig, setSpecialSymbolConfig,
    goldFrames, setGoldFrames,
    jackpots, setJackpots,
    clovers, setClovers,
    manualIndices, setManualIndices,
    manualIndicesOther, setManualIndicesOther,
    topTracker, setTopTracker,
    topTrackerOther, setTopTrackerOther,
    activeTab, setActiveTab,
    isFreeGame
  } = useGameStore(useShallow(state => ({
    reelCount: state.reelCount,
    rowCounts: state.rowCounts,
    setRowCounts: state.setRowCounts,
    currentStrips: state.currentStrips,
    currentPaytable: state.currentPaytable,
    customPaylines: state.customPaylines,
    specialSymbolConfig: state.specialSymbolConfig,
    setSpecialSymbolConfig: state.setSpecialSymbolConfig,
    goldFrames: state.goldFrames,
    setGoldFrames: state.setGoldFrames,
    jackpots: state.jackpots,
    setJackpots: state.setJackpots,
    clovers: state.clovers,
    setClovers: state.setClovers,
    manualIndices: state.manualIndices,
    setManualIndices: state.setManualIndices,
    manualIndicesOther: state.manualIndicesOther,
    setManualIndicesOther: state.setManualIndicesOther,
    topTracker: state.topTracker,
    setTopTracker: state.setTopTracker,
    topTrackerOther: state.topTrackerOther,
    setTopTrackerOther: state.setTopTrackerOther,
    activeTab: state.activeTab,
    setActiveTab: state.setActiveTab,
    isFreeGame: state.isFreeGame
  })));

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
  const groupedSymbols = useSymbolGrouping(currentStrips, currentPaytable, gameType);

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
  }, [symbols, lineViewerSymbolState]);

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
        <React.Suspense fallback={<div>Loading...</div>}>
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
              reelCount={reelCount}
              rowCounts={rowCounts}
              onRowCountsChange={setRowCounts}
              manualIndicesOther={manualIndicesOther}
              setManualIndicesOther={setManualIndicesOther}
              topTrackerOther={topTrackerOther}
              setTopTrackerOther={setTopTrackerOther}
              gameType={gameType}
              betMultiplier={1}
              selectedSymbol={selectedSymbol}
              setSelectedSymbol={setSelectedSymbol}
              groupedSymbols={groupedSymbols}
              parsePasteRng={parsePasteRng}
              isRunning={false}
              specialSymbolConfig={specialSymbolConfig}
              setSpecialSymbolConfig={setSpecialSymbolConfig}
              goldFrames={goldFrames}
              setGoldFrames={setGoldFrames}
              jackpots={jackpots}
              setJackpots={setJackpots}
              clovers={clovers}
              setClovers={setClovers}
              currentStrips={currentStrips}
              currentGrid={currentGrid}
              currentPaytable={currentPaytable}
              customPaylines={customPaylines}
              bet={bet}
              isFreeGame={isFreeGame}
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
        </React.Suspense>
      </div>
    </div>
  );
};
