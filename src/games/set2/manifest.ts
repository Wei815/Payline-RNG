import { defineGame } from '../base/GameManifest';
import { set2Generator } from './generator';
import { set2ScriptFormatter } from './script';
import { BattleSet2Game } from './BattleSet2Game';

export default defineGame({
  id: 'payanywhere_set2',
  label: 'Pay Anywhere (賽特)',
  templateName: '決戰賽特2',
  fileNameKeywords: ['決戰賽特'],
  traits: {
    family: 'payanywhere',
    searchPositionDependent: false,
    mathIdGenerator: true,
    multiplierBalls: true,
    cellMathIdLabel: true,
    ballMathIds: true,
    flatMathIdRng: true,
    tumbleViewerTab: true,
    rangedPayouts: true,
    combinedBonusSymbol: true,
    simulationCascade: true,
  },
  instantGenerator: set2Generator,
  script: set2ScriptFormatter,
  create: () => new BattleSet2Game(),
});
