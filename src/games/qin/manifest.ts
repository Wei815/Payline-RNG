import { defineGame } from '../base/GameManifest';
import { QinGame } from './QinGame';

export default defineGame({
  id: 'waygame_qin',
  label: 'Way Game (秦皇)',
  templateName: '秦皇傳說',
  traits: {
    family: 'way',
    searchPositionDependent: false,
    mathIdGenerator: false,
  },
  create: () => new QinGame(),
});
