/**
 * 自定義盤面「存成測試腳本」的 QA 內容
 *
 * 曾經按 Enter 與按「確定」是兩份複製的程式，按鈕版漏了 LuckySelects（諸神的腳本存檔後遺失 WY 選擇）。
 */
export interface CustomGridQaEntry {
  RNGs: number[][];
  ClassIDs: number[][];
  LuckySelects: number[][];
  Selection: number[][];
}

/** 解析畫面上的「[1,2,3],」字串；空字串或格式錯誤時為空陣列 */
function parseRow(label: string, str: string | undefined): number[][] {
  if (!str) return [];
  try {
    return [JSON.parse(str.replace(/,$/, ''))];
  } catch (e) {
    console.error(`Failed to parse ${label}`, e);
    return [];
  }
}

export function buildCustomGridQaEntry(src: { rngStr?: string; classIdStr?: string; luckySelectsStr?: string }): CustomGridQaEntry {
  return {
    RNGs: parseRow('RNG', src.rngStr),
    ClassIDs: parseRow('ClassID', src.classIdStr),
    LuckySelects: parseRow('LuckySelects', src.luckySelectsStr),
    Selection: [],
  };
}
