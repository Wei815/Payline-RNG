import { defineGame } from '../base/GameManifest';
import { GodsGame } from './GodsGame';

export default defineGame({
  id: 'linegame_gods',
  label: 'Line Game (諸神之戰)',
  templateName: '諸神之戰：雷神VS戰神',
  fileNameKeywords: ['雷神', '諸神'],
  traits: {
    family: 'line',
    searchPositionDependent: true,
    mathIdGenerator: true,
    snippetClassIds: 'wyConfig',
  },
  multiplierIntervals: [
    { id: '1', name: 'Big Win', min: 20, max: 35 },
    { id: '2', name: 'Super Win', min: 35, max: 50 },
    { id: '3', name: 'Mega Win', min: 50, max: 100 },
    { id: '4', name: 'Ultra Win', min: 100, max: 300 },
    { id: '5', name: 'Legend Win', min: 300, max: null },
  ],
  create: () => new GodsGame(),
});
