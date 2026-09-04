import { LuxeGame } from './src/games/luxe/LuxeGame';
import { GameRegistry } from './src/core/GameRegistry';
import { parseExcelTemplate } from './src/utils/excelParser';
import * as fs from 'fs';

async function test() {
  const buf = fs.readFileSync('./public/templates/範本-奢華.xlsx');
  // Need to mock File
  const file = new File([buf], '範本-奢華.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const data = await parseExcelTemplate(file);
  console.log("Paytable length:", data.paytable.length);
  
  const luxe = new LuxeGame();
  
  // grid 5x4 M1
  const grid = Array(5).fill(Array(4).fill('M1'));
  const config = {
    gameType: 'linegame_set2',
    paylines: data.paylines,
    goldFrames: {},
    jackpots: {}
  };
  
  const wins = luxe.evaluate(grid, data.paytable, config, data.paylines, false);
  console.log("Wins:", wins);
}

test();
