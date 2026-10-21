import { defineGame } from '../base/GameManifest';
import { RoyalElephantGame } from './RoyalElephantGame';

export default defineGame({
  id: 'waygame_elephant',
  label: 'Way Game (皇家金象)',
  templateName: '皇家金象',
  traits: {
    family: 'way',
    searchPositionDependent: true,
    mathIdGenerator: false,
  },
  create: () => new RoyalElephantGame(),
});
