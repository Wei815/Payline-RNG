import { defineGoldenSuite } from './harness';

// 秦皇範本滾輪表沒有金框符號，額外混入 G 開頭金框以覆蓋「金框→WX」掉落邏輯
defineGoldenSuite({
  gameType: 'waygame_qin', template: 'Chin Shi', seed: 105, combos: true,
  extraSymbols: ['G1', 'GA', 'GM1'],
});
