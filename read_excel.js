import pkg from 'xlsx';
const { readFile, utils } = pkg;

const workbook = readFile('範本-人魚傳說.xlsx');

const sheetsToPrint = ['Overview', 'Base', 'Free'];

for (const sheetName of sheetsToPrint) {
  if (workbook.Sheets[sheetName]) {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const data = utils.sheet_to_json(sheet, { header: 1 });
    console.log(JSON.stringify(data.slice(0, 15), null, 2));
  }
}
