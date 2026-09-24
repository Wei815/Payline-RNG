const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf-8');

content = content.replace(/\(\?\?\?\?\?\?/g, '(干擾)');
content = content.replace(/\(\?\?\?\?\?佇\)/g, '(SC下落)');
content = content.replace(/\?\?\?\?\?\(\?\?\?\?湛\?\)/g, '包含掉落');
content = content.replace(/憭抒\?\?€\?\身摰\?\(\?\? = 蝮質\?\?\?\/ BET\)/g, 'Multiplier Config');
content = content.replace(/\?\?撌脰\?鋆賣葫獢\?/g, '已複製所有測案');
content = content.replace(/\?\? 銴ˊ\?券皜祆\?/g, '複製全部測案');

fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', content, 'utf-8');
