import { defineGame } from '../base/GameManifest';
import { GodsGame } from './GodsGame';

export default defineGame({
  id: 'linegame_gods',
  label: 'Line Game (諸神之戰)',
  templateName: '諸神之戰：雷神VS戰神',
  traits: {
    family: 'line',
    searchPositionDependent: true,
    mathIdGenerator: true,
  },
  create: () => new GodsGame(),
});
