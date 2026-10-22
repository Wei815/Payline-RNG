import { describe, expect, test } from 'vitest';
import { buildCustomGridQaEntry } from '../customGridSnippet';

describe('自定義盤面存成測試腳本', () => {
  test('RNG / ClassIDs / LuckySelects 都寫入（曾經按「確定」會漏 LuckySelects）', () => {
    expect(buildCustomGridQaEntry({ rngStr: '[1,2,3],', classIdStr: '[2,10,0],', luckySelectsStr: '[1,0],' })).toEqual({
      RNGs: [[1, 2, 3]], ClassIDs: [[2, 10, 0]], LuckySelects: [[1, 0]], Selection: [],
    });
  });

  test('空字串或格式錯誤時為空陣列', () => {
    expect(buildCustomGridQaEntry({ rngStr: '', classIdStr: 'oops', luckySelectsStr: undefined })).toEqual({
      RNGs: [], ClassIDs: [], LuckySelects: [], Selection: [],
    });
  });
});
