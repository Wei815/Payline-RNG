import { defineGame } from '../base/GameManifest';
import { luxeScriptFormatter } from './script';
import { LuxeGame } from './LuxeGame';

export default defineGame({
  id: 'linegame_set2',
  label: 'Line Game (奢華)',
  templateName: '奢華',
  fileNameKeywords: ['奢華'],
  traits: {
    family: 'line',
    searchPositionDependent: true,
    mathIdGenerator: true,
    goldFramesAndJackpots: true,
    cloverCollection: true,
    ballMathIds: true,
    showPaylineTable: true,
    metricsPaylineCount: true,
    snippetClassIds: 'coordinate',
  },
  multiplierIntervals: [
    { id: '1', name: '大獎? (50~100)', min: 50, max: 100 },
    { id: '2', name: '大獎? (100~300)', min: 100, max: 300 },
    { id: '3', name: '大獎? (300~500)', min: 300, max: 500 },
    { id: '4', name: '大獎? (500~800)', min: 500, max: 800 },
    { id: '5', name: '大獎? (800~1000)', min: 800, max: 1000 },
    { id: '6', name: '大獎? (1000+)', min: 1000, max: null },
  ],
  script: luxeScriptFormatter,
  create: () => new LuxeGame(),
});
