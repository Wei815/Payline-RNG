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
  },
  create: () => new MermaidGame(),
});
