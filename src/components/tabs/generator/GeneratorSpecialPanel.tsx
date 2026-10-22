import React from 'react';
import type { GameType, SpecialSymbolConfig } from '../../../types';
import { MULTIPLIER_BALLS, LUCKY_BALLS } from '../../../utils/evaluation/GameConstants';
import { getTraits } from '../../../games/registry';
import { copyText } from '../../../utils/clipboard';

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;
type JackpotKind = 'MINI' | 'MAJOR' | 'MEGA' | 'MAXWIN';

interface GeneratorSpecialPanelProps {
  gameType: GameType;
  specialSymbolConfig: SpecialSymbolConfig;
  setSpecialSymbolConfig: Setter<SpecialSymbolConfig>;
  /** 金框 / Jackpot 轉成的 ClassID 字串（顯示與複製用） */
  combinedClassIdStr: string;
  setGoldFrames: Setter<Record<string, number>>;
  setJackpots: Setter<Record<string, JackpotKind>>;
  setClovers: Setter<Record<string, boolean>>;
  /** 金框編輯（編輯模式與選定倍數也供盤面點擊使用，狀態留在父元件） */
  goldEditor: { show: boolean; setShow: Setter<boolean>; mode: boolean; setMode: Setter<boolean>; multiplier: number; setMultiplier: Setter<number> };
  jackpotEditor: { show: boolean; setShow: Setter<boolean>; mode: boolean; setMode: Setter<boolean>; selected: JackpotKind | 'ERASER'; setSelected: Setter<JackpotKind | 'ERASER'> };
  cloverEditor: { mode: boolean; setMode: Setter<boolean> };
}

/** 連線測試產生器：特殊符號與倍數球配置（Scatter、金框、Jackpot、幸運草、WY、倍數球） */
export const GeneratorSpecialPanel: React.FC<GeneratorSpecialPanelProps> = ({
  gameType, specialSymbolConfig, setSpecialSymbolConfig, combinedClassIdStr, setGoldFrames, setJackpots, setClovers,
  goldEditor, jackpotEditor, cloverEditor,
}) => {
  const { show: showGoldFrameEditor, setShow: setShowGoldFrameEditor, mode: isGoldFrameMode, setMode: setIsGoldFrameMode,
    multiplier: selectedGoldMultiplier, setMultiplier: setSelectedGoldMultiplier } = goldEditor;
  const { show: showJackpotEditor, setShow: setShowJackpotEditor, mode: isJackpotMode, setMode: setIsJackpotMode,
    selected: selectedJackpot, setSelected: setSelectedJackpot } = jackpotEditor;
  const { mode: isCloverMode, setMode: setIsCloverMode } = cloverEditor;
  return (
    <>
    {/* Right Column: Special Symbol & Multiplier Config */}
    {getTraits(gameType).family !== 'way' && (
    <div className="w-full bg-dashboard-card p-4 sm:p-5 rounded-xl border border-dashboard-border flex flex-col gap-4">
      <span className="text-base font-bold text-dashboard-text-secondary border-b border-gray-700/50 pb-2 mb-1">特殊符號與倍數球配置</span>
      
      <div className="flex flex-col gap-4 p-4 bg-dashboard-card rounded border border-gray-700/50">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between bg-dashboard-bg p-2 rounded-lg border border-purple-500/20">
            <label className="flex items-center gap-3 cursor-pointer hover:opacity-90 ml-1">
              {getTraits(gameType).goldFramesAndJackpots ? (
                <input type="checkbox" className="accent-purple-500 w-5 h-5" checked={showGoldFrameEditor}
                  onChange={(e) => setShowGoldFrameEditor(e.target.checked)} />
              ) : (
                <input type="checkbox" className="accent-purple-500 w-5 h-5" checked={specialSymbolConfig.s1Enabled || specialSymbolConfig.s2Enabled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSpecialSymbolConfig(prev => ({ ...prev, s1Enabled: checked, s2Enabled: checked }));
                    if (!checked) {
                      setClovers({});
                      setIsCloverMode(false);
                    }
                  }} />
              )}
              <span className="text-base font-bold text-purple-400">{getTraits(gameType).goldFramesAndJackpots ? '啟用金框' : (getTraits(gameType).wyReels ? '啟用 WY/WZ' : '啟用 Scatter (S1/S2)')}</span>
            </label>
          </div>
          
          {getTraits(gameType).goldFramesAndJackpots && showGoldFrameEditor && (
            <div className="mt-2 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-dashboard-text-secondary">金框倍數 ID:</span>
                  <select 
                    value={selectedGoldMultiplier}
                    onChange={e => setSelectedGoldMultiplier(Number(e.target.value))}
                    className="bg-dashboard-bg border border-dashboard-accent/30 text-dashboard-text-primary rounded px-2 py-1 text-sm outline-none focus:border-dashboard-accent cursor-pointer"
                  >
                    <option value={0}>🧽 橡皮擦 (刪除)</option>
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 25, 50, 100].map(m => (
                      <option key={m} value={m}>{m}X</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setGoldFrames({})}
                  className="text-xs font-bold px-2 py-1 rounded border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-500 transition-colors shadow-sm"
                >
                  全部重置
                </button>
              </div>
              <button
                onClick={() => {
                  const next = !isGoldFrameMode;
                  setIsGoldFrameMode(next);
                  if (next) {
                    setIsJackpotMode(false);
                    setIsCloverMode(false);
                  }
                }}
                className={`w-full py-1.5 px-2 rounded text-xs font-bold transition-all border flex justify-center items-center gap-1 ${
                  isGoldFrameMode 
                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500 ring-1 ring-yellow-400' 
                    : 'bg-dashboard-bg text-gray-400 border-gray-600 hover:border-gray-400'
                }`}
              >
                👑 金框編輯模式 {isGoldFrameMode ? '(ON)' : '(OFF)'}
              </button>
            </div>
          )}

          {getTraits(gameType).goldFramesAndJackpots && (
            <div className="flex items-center justify-between bg-dashboard-bg p-2 rounded-lg border border-red-500/20 mt-2">
              <label className="flex items-center gap-3 cursor-pointer hover:opacity-90 ml-1">
                <input type="checkbox" className="accent-red-500 w-5 h-5" checked={showJackpotEditor}
                  onChange={(e) => setShowJackpotEditor(e.target.checked)} />
                <span className="text-base font-bold text-red-400">啟用大獎 (Jackpot)</span>
              </label>
            </div>
          )}

          {getTraits(gameType).goldFramesAndJackpots && showJackpotEditor && (
            <div className="mt-2 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-dashboard-text-secondary">選擇大獎類型:</span>
                  <select 
                    value={selectedJackpot}
                    onChange={e => setSelectedJackpot(e.target.value as any)}
                    className="bg-dashboard-bg border border-red-500/30 text-dashboard-text-primary rounded px-2 py-1 text-sm outline-none focus:border-red-500 cursor-pointer"
                  >
                    <option value="ERASER">🧽 橡皮擦 (刪除)</option>
                    <option value="MINI">MINI (25x)</option>
                    <option value="MAJOR">MAJOR (100x)</option>
                    <option value="MEGA">MEGA (500x)</option>
                    <option value="MAXWIN">MAXWIN (20000x)</option>
                  </select>
                </div>
                <button
                  onClick={() => setJackpots({})}
                  className="text-xs font-bold px-2 py-1 rounded border border-red-500/40 text-red-400 hover:bg-red-500/20 hover:border-red-500 transition-colors shadow-sm"
                >
                  全部重置
                </button>
              </div>
              <button
                onClick={() => {
                  const next = !isJackpotMode;
                  setIsJackpotMode(next);
                  if (next) {
                    setIsGoldFrameMode(false);
                    setIsCloverMode(false);
                  }
                }}
                className={`w-full py-1.5 px-2 rounded text-xs font-bold transition-all border flex justify-center items-center gap-1 ${
                  isJackpotMode 
                    ? 'bg-red-500/20 text-red-400 border-red-500 ring-1 ring-red-400' 
                    : 'bg-dashboard-bg text-gray-400 border-gray-600 hover:border-gray-400'
                }`}
              >
                🎯 大獎編輯模式 {isJackpotMode ? '(ON)' : '(OFF)'}
              </button>
            </div>
          )}

          {getTraits(gameType).goldFramesAndJackpots && (
            <>
            {combinedClassIdStr && (
              <div className="flex items-center gap-2 bg-dashboard-card px-2 py-1 rounded border border-gray-700/30 w-full justify-between mt-2">
                <span className="text-xs text-yellow-400 font-bold shrink-0">ClassIDs:</span>
                <div className="flex items-center gap-1 overflow-hidden">
                  <code className="text-xs text-yellow-400 font-mono truncate w-[85%]" title={combinedClassIdStr}>
                    {combinedClassIdStr}
                  </code>
                  <button
                    onClick={() => copyText(combinedClassIdStr)}
                    className="text-[10px] font-bold bg-dashboard-bg text-yellow-400 border border-yellow-400/50 px-1.5 py-0.5 rounded hover:bg-yellow-400 hover:text-dashboard-bg transition-colors shrink-0 cursor-pointer"
                  >
                    COPY
                  </button>
                </div>
              </div>
            )}
            </>
          )}
          
          {!getTraits(gameType).goldFramesAndJackpots && (specialSymbolConfig.s1Enabled || specialSymbolConfig.s2Enabled) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              {specialSymbolConfig.s1Enabled && (
                <div className="flex flex-col gap-3 p-4 rounded-lg border-2 bg-dashboard-bg border-purple-500/30 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full bg-purple-500"></div>
                  <span className="text-sm font-bold text-purple-400">S1 (Scatter 1)</span>
                  <div className="flex flex-wrap gap-2 relative z-10">
                    <div className="flex items-center gap-2 bg-dashboard-card rounded-md px-3 py-1.5 border border-purple-500/50 hover:border-purple-500 transition-colors">
                      <span className="text-sm text-purple-300 font-bold">數量</span>
                      <select className="bg-transparent text-sm text-dashboard-text-primary outline-none cursor-pointer border-none font-bold"
                        value={specialSymbolConfig.s1Count} onChange={(e) => setSpecialSymbolConfig(prev => ({ ...prev, s1Count: Number(e.target.value) }))}>
                        {[0, 1, 2, 3].map(n => (
                          <option key={n} value={n} className="bg-dashboard-card text-dashboard-text-primary">{n}</option>
                        ))}
                      </select>
                    </div>

                  </div>
                </div>
              )}
              {specialSymbolConfig.s2Enabled && (
                <div className="flex flex-col gap-3 p-4 rounded-lg border-2 bg-dashboard-bg border-purple-500/30 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full bg-purple-500"></div>
                  <span className="text-sm font-bold text-purple-400">S2 (Scatter 2)</span>
                  <div className="flex flex-wrap gap-2 relative z-10">
                    <div className="flex items-center gap-2 bg-dashboard-card rounded-md px-3 py-1.5 border border-purple-500/50 hover:border-purple-500 transition-colors">
                      <span className="text-sm text-purple-300 font-bold">數量</span>
                      <select className="bg-transparent text-sm text-dashboard-text-primary outline-none cursor-pointer border-none font-bold"
                        value={specialSymbolConfig.s2Count} onChange={(e) => setSpecialSymbolConfig(prev => ({ ...prev, s2Count: Number(e.target.value) }))}>
                        {[0, 1, 2, 3].map(n => (
                          <option key={n} value={n} className="bg-dashboard-card text-dashboard-text-primary">{n}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {(getTraits(gameType).cloverCollection || getTraits(gameType).multiplierBalls) && (
          <div className="flex flex-col gap-3 mt-2 pt-4 border-t border-gray-700/50">
            <div className="flex items-center justify-between bg-dashboard-bg p-2 rounded-lg border border-dashboard-accent/20">
              <label className="flex items-center gap-3 cursor-pointer hover:opacity-90 ml-1">
                {getTraits(gameType).cloverCollection ? (
                  <input type="checkbox" className="accent-dashboard-accent w-5 h-5" checked={specialSymbolConfig.s1Enabled}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSpecialSymbolConfig(prev => ({ ...prev, s1Enabled: checked, s1Count: 0 }));
                      if (!checked) {
                        setClovers({});
                        setIsCloverMode(false);
                      }
                    }} />
                ) : (
                  <input type="checkbox" className="accent-dashboard-accent w-5 h-5" checked={specialSymbolConfig.multipliersEnabled}
                    onChange={(e) => setSpecialSymbolConfig(prev => ({ ...prev, multipliersEnabled: e.target.checked }))} />
                )}
                <span className="text-base font-bold text-dashboard-accent">{getTraits(gameType).cloverCollection ? '啟用幸運草' : '啟用倍數球 (F1~F4)'}</span>
              </label>
              {specialSymbolConfig.multipliersEnabled && !getTraits(gameType).cloverCollection && (() => {
                const total = Object.values(specialSymbolConfig.multiplierCounts).reduce((a, b) => a + b, 0);
                return (
                  <div className="flex items-center gap-3 mr-1">
                    <span className={`text-sm ${total === 6 ? 'text-dashboard-accent font-bold' : 'text-gray-300 font-bold'}`}>總數: {total}/6 (最多可選 6 顆)</span>
                    {total > 0 && (
                      <button
                        onClick={() => setSpecialSymbolConfig(prev => ({ ...prev, multiplierCounts: {} }))}
                        className="text-xs font-bold px-2 py-1 rounded border border-red-500/40 text-red-400 hover:bg-red-500/20 hover:border-red-500 transition-colors shadow-sm"
                      >
                        重置歸零
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
            
            {getTraits(gameType).cloverCollection && specialSymbolConfig.s1Enabled && (
              <div className="grid grid-cols-1 gap-4 mt-2">
                <div className="flex flex-col gap-3 p-4 rounded-lg border-2 bg-dashboard-bg border-dashboard-accent/30 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full bg-dashboard-accent"></div>
                  <span className="text-sm font-bold text-dashboard-accent">幸運草 (S1)</span>
                  <div className="flex flex-wrap gap-2 relative z-10">

                    <button
                      onClick={() => {
                        const next = !isCloverMode;
                        setIsCloverMode(next);
                        if (next) { setIsGoldFrameMode(false); setIsJackpotMode(false); }
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border flex justify-center items-center gap-1 ${
                        isCloverMode 
                          ? 'bg-dashboard-accent/20 text-dashboard-accent border-dashboard-accent ring-1 ring-dashboard-accent' 
                          : 'bg-dashboard-card text-gray-400 border-gray-600 hover:border-gray-400'
                      }`}
                    >
                      🍀 幸運草編輯模式 {isCloverMode ? '(ON)' : '(OFF)'}
                    </button>

                  </div>
                </div>
              </div>
            )}
            
            {!getTraits(gameType).cloverCollection && specialSymbolConfig.multipliersEnabled && (() => {
              const totalMultipliers = Object.values(specialSymbolConfig.multiplierCounts).reduce((a, b) => a + b, 0);
              return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                {MULTIPLIER_BALLS.map(ball => (
                  <div key={ball.id} className={`flex flex-col gap-3 p-4 rounded-lg border-2 bg-dashboard-bg ${ball.border} shadow-lg relative overflow-hidden`}>
                    <div className={`absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full ${ball.color.replace('text-', 'bg-')}`}></div>
                    <span className={`text-sm font-bold ${ball.color}`}>{ball.name}</span>
                    <div className="flex flex-wrap gap-2 relative z-10">
                      {ball.values.map(val => {
                        const key = `${ball.id}_${val}X`;
                        const count = specialSymbolConfig.multiplierCounts[key] || 0;
                        return (
                          <div key={val} className={`flex items-center gap-2 bg-dashboard-card rounded-md px-3 py-1.5 border transition-colors ${count > 0 ? 'border-dashboard-accent shadow-[0_0_8px_rgba(100,255,218,0.2)]' : 'border-gray-700/50 hover:border-gray-500'}`}>
                            <span className={`text-sm w-8 text-right font-bold ${count > 0 ? 'text-dashboard-accent' : 'text-gray-300'}`}>{val}X</span>
                            <select className="bg-transparent text-sm text-dashboard-text-primary outline-none cursor-pointer border-none font-bold"
                              value={count}
                              onChange={(e) => {
                              const num = Number(e.target.value);
                              if (totalMultipliers + (num - count) > 6) return;
                              setSpecialSymbolConfig(prev => {
                                const next = { ...prev, multiplierCounts: { ...prev.multiplierCounts, [key]: num } };
                                if (num === 0) delete next.multiplierCounts[key];
                                return next;
                              });
                            }}>
                            {[0, 1, 2, 3, 4, 5, 6].map(n => {
                              const wouldExceed = totalMultipliers + (n - count) > 6;
                              return (
                                <option key={n} value={n} disabled={wouldExceed} className={`bg-dashboard-card ${wouldExceed ? 'text-gray-600' : 'text-dashboard-text-primary'}`}>
                                  {n}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
          })()}

          {!getTraits(gameType).cloverCollection && (
            <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-700/50">
              <div className="flex items-center justify-between bg-dashboard-bg p-2 rounded-lg border border-pink-500/20">
                <label className="flex items-center gap-3 cursor-pointer hover:opacity-90 ml-1">
                  <input type="checkbox" className="accent-pink-500 w-5 h-5" checked={specialSymbolConfig.luckyBallsEnabled}
                    onChange={(e) => setSpecialSymbolConfig(prev => ({ ...prev, luckyBallsEnabled: e.target.checked }))} />
                  <span className="text-base font-bold text-pink-400">啟用升級倍數球 (L1~L4)</span>
                </label>
                {specialSymbolConfig.luckyBallsEnabled && (() => {
                  const total = Object.values(specialSymbolConfig.luckyCounts).reduce((a, b) => a + b, 0);
                  return (
                    <div className="flex items-center gap-3 mr-1">
                      <span className={`text-sm ${total === 6 ? 'text-pink-400 font-bold' : 'text-gray-300 font-bold'}`}>總數: {total}/6 (最多可選 6 顆)</span>
                      {total > 0 && (
                        <button
                          onClick={() => setSpecialSymbolConfig(prev => ({ ...prev, luckyCounts: {} }))}
                          className="text-xs font-bold px-2 py-1 rounded border border-red-500/40 text-red-400 hover:bg-red-500/20 hover:border-red-500 transition-colors shadow-sm"
                        >
                          重置歸零
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
              
              {specialSymbolConfig.luckyBallsEnabled && (() => {
                const totalLucky = Object.values(specialSymbolConfig.luckyCounts).reduce((a, b) => a + b, 0);
                return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {LUCKY_BALLS.map(ball => (
                    <div key={ball.id} className={`flex flex-col gap-3 p-4 rounded-lg border-2 bg-dashboard-bg ${ball.border} shadow-lg relative overflow-hidden`}>
                      <div className={`absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full ${ball.color.replace('text-', 'bg-')}`}></div>
                      <span className={`text-sm font-bold ${ball.color}`}>{ball.name}</span>
                      <div className="flex flex-wrap gap-2 relative z-10">
                        {ball.values.map(val => {
                          const key = `${ball.id}_${val}X`;
                          const count = specialSymbolConfig.luckyCounts[key] || 0;
                          return (
                            <div key={val} className={`flex items-center gap-2 bg-dashboard-card rounded-md px-3 py-1.5 border transition-colors ${count > 0 ? 'border-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.2)]' : 'border-gray-700/50 hover:border-gray-500'}`}>
                              <span className={`text-sm w-8 text-right font-bold ${count > 0 ? 'text-pink-400' : 'text-gray-300'}`}>{val}X</span>
                              <select className="bg-transparent text-sm text-dashboard-text-primary outline-none cursor-pointer border-none font-bold"
                                value={count}
                                onChange={(e) => {
                                const num = Number(e.target.value);
                                if (totalLucky + (num - count) > 6) return;
                                setSpecialSymbolConfig(prev => {
                                  const next = { ...prev, luckyCounts: { ...prev.luckyCounts, [key]: num } };
                                  if (num === 0) delete next.luckyCounts[key];
                                  return next;
                                });
                              }}>
                              {[0, 1, 2, 3, 4, 5, 6].map(n => {
                                const wouldExceed = totalLucky + (n - count) > 6;
                                return (
                                  <option key={n} value={n} disabled={wouldExceed} className={`bg-dashboard-card ${wouldExceed ? 'text-gray-600' : 'text-dashboard-text-primary'}`}>
                                    {n}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
            })()}
          </div>
          )}
        </div>
        )}
      </div>
    </div>
    )}
    </>
  );
};
