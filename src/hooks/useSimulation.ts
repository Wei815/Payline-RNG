import { useState, useCallback, useRef, useEffect } from 'react';
import type { PaytableRule, ReelStrips, SimulationResult, GameConfig } from '../types';
import type { WorkerMessageData, WorkerResponse } from '../workers/simulation.worker';

export const useSimulation = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSpins, setCurrentSpins] = useState(0);
  const [currentGrid, setCurrentGrid] = useState<string[][]>([]);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const workerRef = useRef<Worker | null>(null);

  // Clean up worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const runSimulation = useCallback((
    strips: ReelStrips, 
    paytable: PaytableRule[], 
    totalSpins: number = 1000, 
    rowCounts: number[] = [],
    gameConfig: GameConfig,
    coin: number = 1,
    bet: number = 1
  ) => {
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    setIsRunning(true);
    setProgress(0);
    setCurrentSpins(0);
    setResult(null);

    // Initialize Web Worker
    workerRef.current = new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const data = e.data;
      if (data.type === 'PROGRESS') {
        setCurrentSpins(data.spinsDone);
        setProgress((data.spinsDone / totalSpins) * 100);
        if (data.currentGrid) {
          setCurrentGrid(data.currentGrid);
        }
      } else if (data.type === 'DONE') {
        setIsRunning(false);
        setResult(data.result);
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
      }
    };

    workerRef.current.onerror = (error) => {
      console.error("Simulation worker error:", error);
      setIsRunning(false);
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };

    const message: WorkerMessageData = {
      strips,
      paytable,
      totalSpins,
      rowCounts,
      gameConfig,
      coin,
      bet
    };

    workerRef.current.postMessage(message);

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
