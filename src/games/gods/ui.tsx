import type { FreeGameToggleProps, GameUi } from '../base/GameUi';

const FreeGameToggle: React.FC<FreeGameToggleProps> = ({ isFreeGame, setIsFreeGame }) => (
  <button
    onClick={() => setIsFreeGame(!isFreeGame)}
    className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${isFreeGame ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/50 hover:bg-blue-500/30'}`}
  >
    {isFreeGame ? 'FG 模式 (WY)' : 'BG 模式 (WX)'}
  </button>
);

export const godsUi: GameUi = { FreeGameToggle };
