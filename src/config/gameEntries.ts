/** 側欄「遊戲入口」：外部測試環境的登入頁，點擊以新分頁開啟 */
export interface GameEntry {
  name: string;
  url: string;
}

export const GAME_ENTRIES: GameEntry[] = [
  { name: 'Royal Game（UAT - Egret）', url: 'http://qa-royalgameweb.rsg-games.com/QALogin' },
  { name: 'Royal Game（DEV - Egret）', url: 'http://dev-royalgameweb.rsg-games.com/QALogin' },
  { name: 'Royal Game（UAT - Cocos）', url: 'http://qa-royalgameweb-cocos.rsg-games.com/QALogin' },
  { name: 'Royal Game（DEV - Cocos）', url: 'http://dev-royalgameweb-cocos.rsg-games.com/QALogin' },
];
