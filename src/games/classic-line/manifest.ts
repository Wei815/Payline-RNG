import { defineGame } from '../base/GameManifest';
import { ClassicLineGame } from './ClassicLineGame';

export default defineGame({
  id: 'linegame',
  label: 'Line Game (通用基底)',
  engineName: 'Line Game',
  traits: {
    family: 'line',
    searchPositionDependent: true,
    mathIdGenerator: false,
  },
  create: () => new ClassicLineGame(),
});
