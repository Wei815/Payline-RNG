import { defineGame } from '../base/GameManifest';
import { BattleSet2Game } from './BattleSet2Game';

export default defineGame({
  id: 'payanywhere_set2',
  label: 'Pay Anywhere (賽特)',
  templateName: '決戰賽特2',
  traits: {
    family: 'payanywhere',
    searchPositionDependent: false,
    mathIdGenerator: true,
  },
  create: () => new BattleSet2Game(),
});
