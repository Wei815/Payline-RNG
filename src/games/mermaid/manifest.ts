import { defineGame } from '../base/GameManifest';
import { MermaidGame } from './MermaidGame';

export default defineGame({
  id: 'waygame',
  label: 'Way Game (通用基底)',
  templateName: '人魚傳說',
  engineName: 'Way Game',
  traits: {
    family: 'way',
    searchPositionDependent: true,
    mathIdGenerator: false,
    specialConfigFromGrid: false,
    simulation: { cascade: true, doublingTumbleMultiplier: true },
  },
  multiplierIntervals: [
    { id: '1', name: 'Big Win', min: 20, max: 50 },
    { id: '2', name: 'Mega Win', min: 50, max: 300 },
    { id: '3', name: 'SuperMega Win', min: 300, max: null },
  ],
  create: () => new MermaidGame(),
});
