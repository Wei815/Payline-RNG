import { defineGame } from '../base/GameManifest';
import { RomaGame } from './RomaGame';

export default defineGame({
  id: 'linegame_roma',
  label: 'Line Game (羅馬競技場)',
  templateName: '羅馬競技場',
  traits: {
    family: 'line',
    searchPositionDependent: true,
    mathIdGenerator: false,
  },
  create: () => new RomaGame(),
});
