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
    // RTP 模擬依羅馬規則掉落（滾輪表依 Combo 輪替、覆蓋式遞補、連續消除次數給免遊）
    simulationCascade: true,
  },
  script: romaScriptFormatter,
  create: () => new RomaGame(),
});
