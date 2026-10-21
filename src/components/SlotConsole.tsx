import React, { useState, useEffect, useMemo } from 'react';
import { defaultPaylines } from '../utils/evaluation';
import { useMachineStore } from '../store/useMachineStore';
import { useGameStore } from '../store/useGameStore';

export interface SlotConsoleProps {
  currentGrid: string[][];
}

import { useShallow } from 'zustand/react/shallow';
import { parsePasteRng } from '../utils/formatters';
import { getTraits } from '../games/registry';
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
    currentStrips, currentStripSets, currentFreeStripSets, setActiveStripId,
    currentPaytable, customPaylines,
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
    currentStripSets: state.currentStripSets,
    isFreeGame: state.isFreeGame,
    currentFreeStripSets: state.currentFreeStripSets,
    setActiveStripId: state.setActiveStripId,
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
  })));

  const betMultiplier = bet / coin;
  const [lineViewerSymbolState, setLineViewerSymbolState] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [useWxInLines, setUseWxInLines] = useState<boolean>(true);

  const hasLinesTab = getTraits(gameType).family === 'line' || !!getTraits(gameType).tumbleViewerTab;
  const hasCustomGridTab = !!getTraits(gameType).customGridTab;

  const formattedStripSets = useMemo(() => {
    const sets = isFreeGame ? currentFreeStripSets : currentStripSets;
    if (!sets || sets.length <= 1) return undefined;
    const rec: Record<string, string[][]> = {};
    sets.forEach((s, i) => { rec[i] = s; });
    return rec;
  }, [isFreeGame, currentFreeStripSets, currentStripSets]);

  useEffect(() => {
    if (!hasLinesTab && activeTab === 'lines') {
      setActiveTab('manual');
    }
    if (!hasCustomGridTab && activeTab === 'customGrid') {
      setActiveTab(getTraits(gameType).mathIdGenerator ? 'other' : 'manual');
    }
  }, [gameType, activeTab]);

  const [selectedSymbol, setSelectedSymbol] = useState<string>('');

  useEffect(() => {
    setManualIndices(Array(reelCount).fill(''));
    setManualIndicesOther(Array(reelCount).fill(''));
  }, [reelCount]);

  // Sync active tab if payanywhere_set2 is selected and manual is active
  useEffect(() => {
    if (getTraits(gameType).mathIdGenerator && activeTab === 'manual') {
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
    <div className="h-full flex flex-col p-3 sm:p-5 overflow-hidden relative">


      {/* Tabs Switcher */}
      <div role="tablist" className="flex bg-dashboard-card rounded-t-xl shrink-0 border border-dashboard-border overflow-x-auto custom-scrollbar">
        {!getTraits(gameType).mathIdGenerator && (
          <button
            onClick={() => setActiveTab('manual')}
            role="tab"
            aria-selected={activeTab === 'manual'}
            className={`flex-1 min-w-max px-4 h-11 text-[13px] font-semibold text-center whitespace-nowrap border-b-2 transition-colors cursor-pointer ${activeTab === 'manual'
                ? 'border-dashboard-accent text-dashboard-text-primary bg-dashboard-raised'
                : 'border-transparent text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-dashboard-hover/60'
              }`}
          >
            手動計算盤面
          </button>
        )}
        <button
          onClick={() => setActiveTab('other')}
          role="tab"
            aria-selected={activeTab === 'other'}
            className={`flex-1 min-w-max px-4 h-11 text-[13px] font-semibold text-center whitespace-nowrap border-b-2 transition-colors cursor-pointer ${activeTab === 'other'
                ? 'border-dashboard-accent text-dashboard-text-primary bg-dashboard-raised'
                : 'border-transparent text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-dashboard-hover/60'
              }`}
        >
          連線測試產生器
        </button>
        {hasLinesTab && (
          <button
            onClick={() => setActiveTab('lines')}
            role="tab"
            aria-selected={activeTab === 'lines'}
            className={`flex-1 min-w-max px-4 h-11 text-[13px] font-semibold text-center whitespace-nowrap border-b-2 transition-colors cursor-pointer ${activeTab === 'lines'
                ? 'border-dashboard-accent text-dashboard-text-primary bg-dashboard-raised'
                : 'border-transparent text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-dashboard-hover/60'
              }`}
          >
            {getTraits(gameType).family === 'line' ? '贏分線路一覽' : '消除掉落測試'}
          </button>
        )}
        {hasCustomGridTab && (
        <button
          onClick={() => setActiveTab('customGrid')}
          role="tab"
            aria-selected={activeTab === 'customGrid'}
            className={`flex-1 min-w-max px-4 h-11 text-[13px] font-semibold text-center whitespace-nowrap border-b-2 transition-colors cursor-pointer ${activeTab === 'customGrid'
                ? 'border-dashboard-accent text-dashboard-text-primary bg-dashboard-raised'
                : 'border-transparent text-dashboard-text-secondary hover:text-dashboard-text-primary hover:bg-dashboard-hover/60'
              }`}
        >
          自定義盤面
        </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0 bg-dashboard-inset/40 border-x border-b border-dashboard-border rounded-b-xl overflow-y-auto custom-scrollbar p-3 sm:p-6 flex flex-col">
        <React.Suspense fallback={<div className="m-auto text-sm text-dashboard-text-muted">載入中…</div>}>
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
              stripSets={formattedStripSets}
              setActiveStripId={setActiveStripId}

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
              currentStrips={isFreeGame && currentFreeStripSets && currentFreeStripSets.length > 0 ? currentFreeStripSets[0] : currentStrips}
              currentGrid={currentGrid}
              currentPaytable={currentPaytable}
              customPaylines={customPaylines}
              bet={bet}
              isFreeGame={isFreeGame}
            />
          </div>
        )}
        {getTraits(gameType).family === 'line' && activeTab === 'lines' && (
          <div className="w-full flex-1 flex flex-col">
            <LineViewerTab 
              reelCount={reelCount} rowCounts={rowCounts} currentStrips={currentStrips}
              stripSets={formattedStripSets}
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
        {getTraits(gameType).tumbleViewerTab && activeTab === 'lines' && (
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
        {hasCustomGridTab && activeTab === 'customGrid' && (
          <div className="w-full flex-1 flex flex-col min-h-0">
            <SlotCustomGridTab 
              reelCount={reelCount} rowCounts={rowCounts} currentPaytable={currentPaytable}
              groupedSymbols={groupedSymbols} gameType={gameType} betMultiplier={betMultiplier} customPaylines={customPaylines}
              bet={bet}
            />
          </div>
        )}
        </React.Suspense>
      </div>
    </div>
  );
};
