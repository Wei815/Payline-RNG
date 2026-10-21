import { defineGame } from '../base/GameManifest';
import { BattleSet2Game } from './BattleSet2Game';

export default defineGame({
  id: 'payanywhere_set2',
  label: 'Pay Anywhere (賽特)',
  templateName: '決戰賽特2',
  fileNameKeywords: ['決戰賽特'],
  traits: {
    family: 'payanywhere',
    searchPositionDependent: false,
    mathIdGenerator: true,
    simulation: { cascade: true },
  },
  create: () => new BattleSet2Game(),
});
