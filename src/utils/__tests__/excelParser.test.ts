import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseExcelData } from '../excelParser';
import { loadTemplate } from '../../games/base/__tests__/harness';

const TEMPLATES_DIR = path.resolve(__dirname, '../../../templates');

describe('excelParser 範本辨識', () => {
  test.each([
    ['Mermaid', 'linegame'],
    ['The Luxe', 'linegame_set2'],
    ['Battle of Set', 'payanywhere_set2'],
    ['Royal Ganesha', 'waygame_elephant'],
    ['Chin Shi', 'waygame_qin'],
    ['Roma', 'linegame_roma'],
    ['God of Wars', 'linegame_gods'],
  ])('%s → %s', async (file, gameType) => {
    const parsed = await loadTemplate(file);
    expect(parsed.gameType).toBe(gameType);
    expect({ reelCount: parsed.reelCount, rowCounts: parsed.rowCounts }).toMatchSnapshot();
  });

  test('只靠檔名辨識（無 Line Table / Way 資訊）', async () => {
    // 以秦皇範本的 Base 頁為內容，換不同檔名驗證檔名關鍵字規則
    const fileName = fs.readdirSync(TEMPLATES_DIR).find(f => f.includes('Chin Shi'))!;
    const buf = fs.readFileSync(path.join(TEMPLATES_DIR, fileName));
    const xlsx = await import('xlsx');
    const wb = xlsx.read(buf, { type: 'buffer' });
    const onlyBase = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(onlyBase, wb.Sheets['Base'], 'Base');
    const out = xlsx.write(onlyBase, { type: 'buffer', bookType: 'xlsx' });

    const detect = async (name: string) => {
      const r = await parseExcelData(new File([out], name));
      return `${r.gameType} reels=${r.reelCount} rows=${r.rowCounts?.join(',')}`;
    };
    expect({
      set2: await detect('範本-決戰賽特2.xlsx'),
      qin: await detect('範本-秦皇傳說.xlsx'),
      luxe: await detect('範本-奢華.xlsx'),
      gods: await detect('範本-諸神之戰.xlsx'),
      roma: await detect('範本-Roma.xlsx'),
      elephant: await detect('範本-皇家金象.xlsx'),
      unknown: await detect('random.xlsx'),
    }).toMatchSnapshot();
  });
});
