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

  // If nums.length is large (e.g. >= 15), it's likely a copied MathID grid (e.g. 5x3=15, Megaways=20+)
  // Otherwise, if it's close to reelCount (e.g. count or count+1 for stripId), it's an RNG array
  const isMathIdGrid = rowCounts && rowCounts.length > 0 && nums.length >= 15;

  if (isMathIdGrid) {
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

  // It's an RNG array.
  // We no longer subtract 1, because the UI outputs 0-based indices and the user pastes 0-based indices.
  const resultLength = Math.max(count, nums.length);
  const result = Array(resultLength).fill('0');
  for (let i = 0; i < resultLength; i++) {
    if (nums[i] !== undefined) {
      const val = parseInt(nums[i], 10);
      if (isNaN(val)) {
        result[i] = nums[i];
      } else {
        result[i] = val.toString();
      }
    } else {
      result[i] = '0';
    }
  }

  return result;
}
