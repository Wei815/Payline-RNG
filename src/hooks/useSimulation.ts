import { useState, useCallback } from 'react';
import type { PaytableRule, ReelStrips, SimulationResult, SymbolMetric, GameType } from '../types';
import { evaluateGrid } from '../utils/evaluation';

export const useSimulation = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSpins, setCurrentSpins] = useState(0);
  const [currentGrid, setCurrentGrid] = useState<string[][]>([]);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const runSimulation = useCallback((
    strips: ReelStrips, 
    paytable: PaytableRule[], 
    totalSpins: number = 1000, 
    rowCounts: number[] = [],
    gameType: GameType = 'waygame',
    paylines?: number[][]
  ) => {
    setIsRunning(true);
    setProgress(0);
    setCurrentSpins(0);
    setResult(null);

    // Initialize symbol metrics tracking
    const symbolMetrics: Record<string, SymbolMetric> = {};
    paytable.forEach(rule => {
      symbolMetrics[rule.symbolId] = {
        symbolId: rule.symbolId,
        hits2: 0,
        hits3: 0,
        hits4: 0,
        hits5: 0,
        totalPayout: 0,
        contributionRTP: 0
      };
    });

    let overallWin = 0;
    let winningSpins = 0;
    let spinsDone = 0;

    // Process in chunks to maintain UI responsiveness
    const batchSize = Math.max(50, Math.floor(totalSpins / 100));

    const runBatch = () => {
      const currentBatchLimit = Math.min(totalSpins - spinsDone, batchSize);
      let lastGrid: string[][] = [];

      for (let i = 0; i < currentBatchLimit; i++) {
        // 1. Generate random grid based on currentStrips (and optionally Megaways top row) in a single loop to avoid allocations
        const grid: string[][] = [];
        for (let colIndex = 0; colIndex < strips.length; colIndex++) {
          const strip = strips[colIndex];
          const rows = rowCounts[colIndex] || 3;
          const colCells: string[] = [];
          
          for (let r = 0; r < rows; r++) {
            if (!strip || strip.length === 0) {
              colCells.push('WILD');
            } else {
              colCells.push(strip[Math.floor(Math.random() * strip.length)]);
            }
          }
          
          // Append Megaways top row symbols directly during generation
          if (gameType === 'megaway' && colIndex >= 1 && colIndex <= 4) {
            if (!strip || strip.length === 0) {
              colCells.push('WX');
            } else {
              colCells.push(strip[Math.floor(Math.random() * strip.length)]);
            }
          }
          
          grid.push(colCells);
        }

        lastGrid = grid;

        // 3. Evaluate grid
        const wins = evaluateGrid(grid, paytable, gameType, paylines);
        
        let spinWin = 0;
        wins.forEach(win => {
          spinWin += win.totalWin;

          const metric = symbolMetrics[win.symbolId];
          if (metric) {
            metric.totalPayout += win.totalWin;

            // Map matchCount to hit categories
            if (gameType === 'payanywhere') {
              if (win.matchCount >= 8 && win.matchCount <= 9) {
                metric.hits3++;
              } else if (win.matchCount >= 10 && win.matchCount <= 11) {
                metric.hits4++;
              } else if (win.matchCount >= 12) {
                metric.hits5++;
              }
            } else {
              const matches = Math.min(win.matchCount, 5);
              if (matches === 2) metric.hits2++;
              else if (matches === 3) metric.hits3++;
              else if (matches === 4) metric.hits4++;
              else if (matches >= 5) metric.hits5++;
            }
          }
        });

        if (spinWin > 0) {
          winningSpins++;
          overallWin += spinWin;
        }
      }

      spinsDone += currentBatchLimit;
      setCurrentSpins(spinsDone);
      setProgress((spinsDone / totalSpins) * 100);
      if (lastGrid.length > 0) {
        // Strip out top tracker symbols for proper console grid rendering
        const displayGrid = gameType === 'megaway' 
          ? lastGrid.map((col, colIdx) => (colIdx >= 1 && colIdx <= 4 ? col.slice(0, -1) : col))
          : lastGrid;
        setCurrentGrid(displayGrid);
      }

      if (spinsDone < totalSpins) {
        setTimeout(runBatch, 0); // Yield main thread to allow React to paint the UI
      } else {
        // 4. Compute overall simulator statistics
        const overallRTP = (overallWin / totalSpins) * 100;
        const hitFrequency = (winningSpins / totalSpins) * 100;

        // Calculate contributionRTP for each symbol
        Object.keys(symbolMetrics).forEach(symId => {
          const metric = symbolMetrics[symId];
          metric.contributionRTP = (metric.totalPayout / totalSpins) * 100;
        });

        setIsRunning(false);
        setResult({
          totalSpins,
          overallRTP,
          hitFrequency,
          symbolMetrics
        });
      }
    };

    runBatch();

  }, []);

  return {
    isRunning,
    progress,
    currentSpins,
    currentGrid,
    result,
    runSimulation
  };
};
