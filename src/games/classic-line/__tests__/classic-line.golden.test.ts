import { defineGoldenSuite } from '../../base/__tests__/harness';

// 經典通用線遊戲本身無預設資料，借用人魚傳說範本的滾輪表/賠率表（等同 App「預設泛用」載入範本的情境）
defineGoldenSuite({ gameType: 'linegame', template: 'Mermaid', seed: 102 });
