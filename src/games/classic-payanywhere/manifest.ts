import { defineGame } from '../base/GameManifest';
import { ClassicPayAnywhere } from './ClassicPayAnywhere';

export default defineGame({
  id: 'payanywhere',
  label: 'Pay Anywhere (通用基底)',
  engineName: 'Pay Anywhere',
  traits: {
    family: 'payanywhere',
    searchPositionDependent: false,
    mathIdGenerator: false,
  },
  create: () => new ClassicPayAnywhere(),
});
