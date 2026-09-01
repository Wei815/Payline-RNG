import React from 'react';
import { getWinColorClass } from '../utils/svgPaths';
import { MULTIPLIER_BALLS, LUCKY_BALLS } from '../utils/evaluation/GameConstants';

export interface SlotGridDisplayProps {
  gridSymbols: string[][];
  winningCoords: Map<string, number[]>;
  onCellClick?: (colIndex: number, rowIndex: number) => void;
  onDragStart?: (e: React.DragEvent, symbol: string, colIndex: number, rowIndex: number) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, colIndex: number, rowIndex: number) => void;
  
  // Custom configurations
  goldFrames?: Record<string, number>;
  jackpots?: Record<string, string>;
  
  // Mode controls for specific Tailwind styling
  gridMode?: 'custom' | 'manual' | 'tumble';
  pulseClass?: string;

  // Render prop for inside the cell
  renderCellInner?: (
    symbol: string, 
    colIndex: number, 
    rowIndex: number, 
    displaySymbol: string, 
    hasGoldFrame: boolean, 
    goldMultiplier: number | undefined, 
    hasJackpot: boolean, 
    jackpotValue: string | undefined
  ) => React.ReactNode;
}

export const SlotGridDisplay: React.FC<SlotGridDisplayProps> = ({
  gridSymbols,
  winningCoords,
  onCellClick,
  onDragStart,
  onDragOver,
  onDrop,
  goldFrames = {},
  jackpots = {},
  gridMode = 'custom',
  pulseClass = '',
  renderCellInner
}) => {
  return (
    <>
      {gridSymbols.map((col, colIndex) => (
        <div key={colIndex} className="flex flex-col justify-center gap-3">
          {col.map((symbol, rowIndex) => {
            const winIndices = winningCoords.get(`${colIndex}-${rowIndex}`);
            const isWinning = !!winIndices;
            const winColorClass = isWinning ? getWinColorClass(winIndices) : '';
            
            const goldMultiplier = goldFrames[`${colIndex}-${rowIndex}`];
            const hasGoldFrame = goldMultiplier !== undefined;
            const jackpotValue = jackpots[`${colIndex}-${rowIndex}`];
            const hasJackpot = jackpotValue !== undefined;
            
            let displaySymbol = symbol;
            let customBg = '';
            
            if (symbol.includes('_') && (symbol.startsWith('F') || symbol.startsWith('L'))) {
              const [ballId, valStr] = symbol.split('_');
              displaySymbol = valStr;
              let numVal = 0;
              if (valStr && valStr.endsWith('X')) {
                numVal = parseInt(valStr.replace('X', ''), 10);
              }
              const balls = ballId.startsWith('F') ? MULTIPLIER_BALLS : LUCKY_BALLS;
              const ball = balls.find(b => b.values.includes(numVal)) || balls.find(b => b.id === ballId);
              if (ball) {
                customBg = `bg-[#0a192f] border ${ball.border} ${ball.color}`;
              } else if (gridMode === 'tumble') {
                displaySymbol = '2X';
                customBg = `bg-red-900/30 border-2 border-red-500 text-red-500`;
              }
            }

            const hasAnyWin = winningCoords.size > 0;
            const isWild = symbol === 'WILD' || symbol.startsWith('W') || symbol === 'WX';
            const isUnknown = symbol.startsWith('?');

            let cellClassNames = '';

            if (gridMode === 'custom') {
              const defaultBg = symbol === '-' ? 'bg-[#0a192f] text-gray-700 border-2 border-gray-800 border-dashed hover:border-dashboard-accent' :
                                isWild ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-dashboard-bg border border-yellow-300' :
                                symbol === 'SCATTER' ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white border border-pink-300' :
                                'bg-[#112240] text-dashboard-text-primary border border-dashboard-accent/30';
              
              cellClassNames = `
                w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center text-xl font-bold
                shadow-lg transform relative cursor-pointer active:scale-95 transition-all duration-200 shrink-0
                ${customBg ? customBg : defaultBg}
                ${isWinning ? `ring-2 z-10 scale-105 ${winColorClass}` : ''}
                ${hasGoldFrame && !isWinning ? `ring-2 ring-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]` : ''}
                ${hasJackpot && !isWinning ? `ring-2 ring-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]` : ''}
              `;
            } else if (gridMode === 'manual') {
              const defaultBg = symbol === '-' ? 'bg-[#0a192f] text-gray-700 border-2 border-gray-800 border-dashed' :
                                isWild ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-dashboard-bg border-yellow-300' :
                                symbol === 'SCATTER' ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white border-pink-300' :
                                'bg-[#112240] text-dashboard-text-primary border-dashboard-accent/30';
                                
              cellClassNames = `
                w-20 h-20 rounded-lg flex items-center justify-center text-xl font-bold
                shadow-lg transform transition-all duration-300 relative cursor-grab active:cursor-grabbing border
                ${customBg ? customBg : defaultBg}
                ${isWinning ? `z-10 ring-2 scale-105 ${winColorClass}` : hasAnyWin ? 'opacity-20 scale-95 border-transparent contrast-75 filter blur-[0.3px]' : ''}
              `;
            } else if (gridMode === 'tumble') {
              const defaultBg = isWild ? 'bg-[#112240] text-purple-400 border border-purple-500/30' :
                                isUnknown ? 'bg-red-900/30 text-red-400 border border-red-500/50' :
                                'bg-[#112240] text-gray-300 border border-gray-700/50';
                                
              cellClassNames = `
                w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center rounded-lg relative transform text-sm sm:text-base font-bold
                ${!isWinning ? 'transition-all duration-300' : ''}
                ${isWinning ? `z-10 ring-2 scale-105 ${winColorClass} ${pulseClass}` : customBg ? customBg : defaultBg}
                ${!isWinning && hasAnyWin && !customBg ? 'opacity-30 scale-95 border-transparent' : ''}
              `;
            }

            const idPrefix = gridMode === 'custom' ? 'cell-custom' : gridMode === 'manual' ? 'cell-manual' : 'cell-tumble';

            return (
              <div
                id={`${idPrefix}-${colIndex}-${rowIndex}`}
                key={`${colIndex}-${rowIndex}`}
                draggable={!!onDragStart}
                onClick={() => onCellClick && onCellClick(colIndex, rowIndex)}
                onDragStart={(e) => onDragStart && onDragStart(e, symbol, colIndex, rowIndex)}
                onDragOver={(e) => {
                  if (onDragOver) onDragOver(e);
                  else if (onDrop) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }
                }}
                onDrop={(e) => onDrop && onDrop(e, colIndex, rowIndex)}
                className={cellClassNames.replace(/\s+/g, ' ').trim()}
              >
                {renderCellInner ? renderCellInner(symbol, colIndex, rowIndex, displaySymbol, hasGoldFrame, goldMultiplier, hasJackpot, jackpotValue) : (
                  <div className="flex flex-col items-center justify-center pointer-events-none w-full h-full relative">
                    <span>{displaySymbol}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
};
