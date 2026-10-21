import { defineGame } from '../base/GameManifest';
import { romaScriptFormatter } from './script';
import { RomaGame } from './RomaGame';

export default defineGame({
  id: 'linegame_roma',
  label: 'Line Game (羅馬競技場)',
  templateName: '羅馬競技場',
  fileNameKeywords: ['羅馬', 'Roma', 'roma'],
  traits: {
    family: 'line',
    searchPositionDependent: true,
    mathIdGenerator: false,
  },
  script: romaScriptFormatter,
  create: () => new RomaGame(),
});
