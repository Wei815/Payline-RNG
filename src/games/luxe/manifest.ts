import { defineGame } from '../base/GameManifest';
import { LuxeGame } from './LuxeGame';

export default defineGame({
  id: 'linegame_set2',
  label: 'Line Game (奢華)',
  templateName: '奢華',
  traits: {
    family: 'line',
    searchPositionDependent: true,
    mathIdGenerator: true,
  },
  create: () => new LuxeGame(),
});
