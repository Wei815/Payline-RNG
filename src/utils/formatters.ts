export function formatAmount(num: number): string {
  if (Number.isInteger(num)) return num.toString();
  return parseFloat(num.toFixed(4)).toString();
}

export function parsePasteRng(text: string, count: number, rowCounts?: number[]): string[] | null {
  const match = text.match(/\[([^\]]+)\]/);
  let numbersString = "";

  if (match && match[1]) {
    numbersString = match[1];
  } else {
    numbersString = text;
  }

  const cleanStr = numbersString.replace(/[^0-9A-Za-z_]/g, ' ');
  const nums = cleanStr.trim().split(/\s+/).filter(s => s !== '');

  if (nums.length === 0) return null;

  if (nums.length > count && rowCounts && rowCounts.length > 0) {
    const result = Array(count).fill('');
    let idx = 0;
    for (let c = 0; c < count; c++) {
      const rows = rowCounts[c] || 3;
      const colItems = [];
      for (let r = 0; r < rows; r++) {
        colItems.push(nums[idx] !== undefined ? nums[idx] : '0');
        idx++;
      }
      result[c] = colItems.join(',');
    }
    return result;
  }

  const result = Array(count).fill('0');
  for (let i = 0; i < count; i++) {
    result[i] = nums[i] !== undefined ? nums[i] : '0';
  }

  return result;
}
