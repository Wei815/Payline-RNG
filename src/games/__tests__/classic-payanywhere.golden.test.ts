import { defineGoldenSuite } from './harness';

// 經典全盤掉落本身無預設資料，借用決戰賽特2範本的滾輪表/賠率表
defineGoldenSuite({ gameType: 'payanywhere', template: 'Battle of Set', seed: 103, combos: true });
