import { defineGame } from '../base/GameManifest';
import { QinGame } from './QinGame';

export default defineGame({
  id: 'waygame_qin',
  label: 'Way Game (秦皇)',
  templateName: '秦皇傳說',
  fileNameKeywords: ['秦皇'],
  templateWays: 4096,
  templateLayout: { reelCount: 6, rowCounts: [4, 4, 4, 4, 4, 4] },
  traits: {
    family: 'way',
    searchPositionDependent: false,
    mathIdGenerator: false,
    doublingTumbleMultiplier: true,
    goldCascadeSearch: true,
    simulationCascade: true,
  },
  create: () => new QinGame(),
});
