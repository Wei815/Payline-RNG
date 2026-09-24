const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf-8');

const badUi = `            </select>
          <div className="flex flex-col gap-2 items-end">`;
const fixedUi = `            </select>
          </div>
          <div className="flex flex-col gap-2 items-end">`;

content = content.replace(badUi, fixedUi);
fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', content, 'utf-8');
