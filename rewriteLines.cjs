const fs = require('fs');
let code = fs.readFileSync('src/components/tabs/LineViewerTab.tsx', 'utf-8');

// 1. Add state for isCopiedAll
code = code.replace(
  'copiedIndex: number | null;',
  'copiedIndex: number | null;\n  isCopiedAll?: boolean;'
);
if (!code.includes('isCopiedAll = false,')) {
  code = code.replace(
    '  copiedIndex, setCopiedIndex, currentPaytable, gameType\n}) => {',
    '  copiedIndex, setCopiedIndex, currentPaytable, gameType\n}) => {\n  const [isCopiedAll, setIsCopiedAll] = React.useState(false);'
  );
}

// 2. Extract computation to useMemo
if (!code.includes('const computedLines = React.useMemo(')) {
  const mapStart = code.indexOf('{(customPaylines && customPaylines.length > 0 ? customPaylines : defaultPaylines).map((line, lineIdx) => {');
  const returnStart = code.indexOf('return (', mapStart);
  
  const computationBlock = code.substring(mapStart, returnStart);
  
  const extractedComputation = `
  const linesToRender = customPaylines && customPaylines.length > 0 ? customPaylines : defaultPaylines;

  const computedLines = React.useMemo(() => {
    return linesToRender.map((line, lineIdx) => {
      ${computationBlock.substring(computationBlock.indexOf('const { rng'))}
      return { line, lineIdx, rng, actualTotalWin, mathIdRng };
    });
  }, [linesToRender, gameType, reelCount, rowCounts, activeLineViewerSymbol, currentPaytable, currentStrips, useWxInLines, lineViewerPayout, customPaylines]);
  `;
  
  code = code.replace(
    'return (\n    <>\n      <div className="flex-1 flex flex-col gap-6">\n',
    extractedComputation + '\n  return (\n    <>\n      <div className="flex-1 flex flex-col gap-6">\n'
  );
  
  code = code.replace(
    computationBlock,
    '{computedLines.map(({ line, lineIdx, rng, actualTotalWin, mathIdRng }) => {\n'
  );
}

// 3. Add Copy All Button
const copyAllButtonStr = `
          <div className="flex items-center gap-3">
            <span className="text-xs text-dashboard-text-secondary font-mono">共計 {customPaylines && customPaylines.length > 0 ? customPaylines.length : defaultPaylines.length} 條線路</span>
            <button
              onClick={() => {
                const textToCopy = computedLines.map(c => {
                  if (c.mathIdRng) return \`[\${c.mathIdRng.join(',')}]\`;
                  if (c.rng) return \`[\${c.rng.join(',')}]\`;
                  return '';
                }).filter(Boolean).map(c => c + ',').join('\\n');
                navigator.clipboard.writeText(textToCopy);
                setIsCopiedAll(true);
                setTimeout(() => setIsCopiedAll(false), 2000);
              }}
              className={\`px-2 py-1 text-xs font-bold rounded border transition-colors \${
                isCopiedAll 
                  ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                  : 'bg-[#64ffda]/10 hover:bg-[#64ffda]/20 text-[#64ffda] border-[#64ffda]/30'
              }\`}
            >
              {isCopiedAll ? '✅ 已複製全部！' : '📋 複製全部腳本'}
            </button>
          </div>
`;

code = code.replace(
  '<span className="text-xs text-dashboard-text-secondary font-mono">共計 {customPaylines && customPaylines.length > 0 ? customPaylines.length : defaultPaylines.length} 條線路</span>',
  copyAllButtonStr
);

// 4. Remove dropMathIds logic
code = code.replace(/const dropMathIds: string\[\] = \[\];[\s\S]*?dropMathIds\.push\(mathIdMap\[sym\] \|\| sym\);[\s\S]*?nsIdx\+\+;[\s\S]*?\}/, '');
code = code.replace(/mathIdRng: columnStrings, dropMathIds/g, 'mathIdRng: columnStrings');
code = code.replace(/mathIdRng: null, dropMathIds: undefined/g, 'mathIdRng: null');
code = code.replace(/, dropMathIds \}/g, ' }');
code = code.replace(/if \(dropMathIds\) \{[\s\S]*?text \+= \`\[\$\{dropMathIds\.join\(\',\ '\)\}\],\.?\`\;[\s\S]*?\}/g, '');
code = code.replace(/\{dropMathIds && \([\s\S]*?\[\{dropMathIds\.join\(\',\ '\)\}\], \(自動複製\)[\s\S]*?\)\]\}[\s\S]*?\)/g, '');
code = code.replace(/\{dropMathIds && \([\s\S]*?\(自動複製\)[\s\S]*?\)\}/g, '');

fs.writeFileSync('src/components/tabs/LineViewerTab.tsx', code);
console.log('Done rewriting LineViewerTab.tsx');
