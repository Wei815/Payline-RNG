import { useState, useCallback } from 'react';
import type { PaytableRule, ReelStrips, SimulationResult, SymbolMetric } from '../types';

export const useSimulation = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSpins, setCurrentSpins] = useState(0);
  const [currentGrid, setCurrentGrid] = useState<string[][]>([]);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const runSimulation = useCallback((strips: ReelStrips, paytable: PaytableRule[], totalSpins: number = 1000, rowCounts: number[] = []) => {
    setIsRunning(true);
    setProgress(0);
    setCurrentSpins(0);
    setResult(null);

    // Mock Simulation Logic using setTimeout to prevent blocking UI
    let spinsDone = 0;
    const batchSize = Math.max(1, Math.floor(totalSpins / 100)); // Update UI 100 times

    // Dummy logic for generating mock result instead of actual full math logic for MVP
    const mockSymbolMetrics: Record<string, SymbolMetric> = {};
    paytable.forEach(rule => {
      mockSymbolMetrics[rule.symbolId] = {
        symbolId: rule.symbolId,
        hits2: Math.floor(Math.random() * 500),
        hits3: Math.floor(Math.random() * 200),
        hits4: Math.floor(Math.random() * 50),
        hits5: Math.floor(Math.random() * 10),
        totalPayout: Math.floor(Math.random() * 10000),
        contributionRTP: Number((Math.random() * 10).toFixed(2))
      };
    });

    const mockResult: SimulationResult = {
      totalSpins,
      overallRTP: 96.42 + (Math.random() * 1 - 0.5), // around 96.42%
      hitFrequency: 30.5 + (Math.random() * 2 - 1), // around 30.5%
      symbolMetrics: mockSymbolMetrics
    };

    const runBatch = () => {
      spinsDone += batchSize;
      if (spinsDone > totalSpins) spinsDone = totalSpins;

      // Random grid generator based on strips (mock)
      const mockGrid = strips.map((strip, colIndex) => {
        const rows = rowCounts[colIndex] || 3;
        return Array.from({ length: rows }).map(() => {
          if (!strip || strip.length === 0) return 'WILD';
          return strip[Math.floor(Math.random() * strip.length)];
        });
      });

      setCurrentSpins(spinsDone);
      setProgress((spinsDone / totalSpins) * 100);
      setCurrentGrid(mockGrid);

      if (spinsDone < totalSpins) {
        setTimeout(runBatch, 20); // 20ms per batch to animate
      } else {
        setIsRunning(false);
        setResult(mockResult);
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
