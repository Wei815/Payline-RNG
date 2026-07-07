import { useState, useCallback, useRef, useEffect } from 'react';
import type { PaytableRule, ReelStrips, SimulationResult, GameConfig } from '../types';
import type { WorkerMessageData, WorkerResponse } from '../workers/simulation.worker';
import { useMachineStore } from '../store/useMachineStore';

export const useSimulation = () => {
  const { isRunning, setIsRunning } = useMachineStore();
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
    if (isRunning && workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), { type: 'module' });
    } else if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), { type: 'module' });
    }

    setIsRunning(true);
    setProgress(0);
    setCurrentSpins(0);
    setResult(null);

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
      }
    };

    workerRef.current.onerror = (error) => {
      console.error("Simulation worker error:", error);
      setIsRunning(false);
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
