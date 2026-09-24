const fs = require('fs');
let content = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf-8');

// 1. Fix line 496 unreachable TS error
content = content.replace(
    "const config = { gameType, paylines: customPaylines, effectiveBet: bet, goldFrames: gameType === 'linegame_set2' ? goldFrames : {}, specialRules: { derivativeSymbols: { 'B1': ['B2'] }, unremovableSymbols: ['S1', 'B1'] } };",
    "const config = { gameType, paylines: customPaylines, effectiveBet: bet, goldFrames, specialRules: { derivativeSymbols: { 'B1': ['B2'] }, unremovableSymbols: ['S1', 'B1'] } };"
);

// 2. Fix line 1530 unreachable TS error
content = content.replace(
    "      {!gameType.startsWith('waygame') && gameType !== 'linegame_gods' && (",
    "      {!gameType.startsWith('waygame') && ("
);

// 3. Ensure setIsFreeGame is added if it is missing
if (!content.includes("const { setIsFreeGame } = useGameStore();")) {
    content = content.replace(
        "  currentStrips, currentGrid, currentPaytable, customPaylines, bet, isFreeGame\n}) => {\n  const gridContainerRefOther = useRef<HTMLDivElement>(null);",
        "  currentStrips, currentGrid, currentPaytable, customPaylines, bet, isFreeGame\n}) => {\n  const { setIsFreeGame } = useGameStore();\n  const gridContainerRefOther = useRef<HTMLDivElement>(null);"
    );
    // CRLF fallback
    content = content.replace(
        "  currentStrips, currentGrid, currentPaytable, customPaylines, bet, isFreeGame\r\n}) => {\r\n  const gridContainerRefOther = useRef<HTMLDivElement>(null);",
        "  currentStrips, currentGrid, currentPaytable, customPaylines, bet, isFreeGame\r\n}) => {\r\n  const { setIsFreeGame } = useGameStore();\r\n  const gridContainerRefOther = useRef<HTMLDivElement>(null);"
    );
}

fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', content, 'utf-8');
