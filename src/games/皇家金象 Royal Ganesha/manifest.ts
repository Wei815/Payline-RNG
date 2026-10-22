import { defineGame } from '../base/GameManifest';
import { RoyalElephantGame } from './RoyalElephantGame';

export default defineGame({
  id: 'waygame_elephant',
  label: 'Way Game (皇家金象)',
  templateName: '皇家金象',
  fileNameKeywords: ['家', '象'],
  traits: {
    family: 'way',
    searchPositionDependent: true,
    mathIdGenerator: false,
    doublingTumbleMultiplier: true,
    goldCascadeSearch: true,
    simulationCascade: true,
  },
  create: () => new RoyalElephantGame(),
});
