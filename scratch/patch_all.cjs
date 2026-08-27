const fs = require('fs');
let code = fs.readFileSync('src/components/tabs/SlotGeneratorTab.tsx', 'utf8');

// 1. Add props to interface
const props_old = `export interface SlotGeneratorTabProps {
  reelCount: number;
  rowCounts: number[];`;
const props_new = `export interface SlotGeneratorTabProps {
  stripSets?: Record<string, string[][]>;
  setActiveStripId?: (id: number) => void;
  reelCount: number;
  rowCounts: number[];`;
code = code.replace(props_old, props_new);

// 2. Add props to component signature
const sig_old = `export const SlotGeneratorTab: React.FC<SlotGeneratorTabProps> = ({
  reelCount, rowCounts, onRowCountsChange,`;
const sig_new = `export const SlotGeneratorTab: React.FC<SlotGeneratorTabProps> = ({
  stripSets, setActiveStripId,
  reelCount, rowCounts, onRowCountsChange,`;
code = code.replace(sig_old, sig_new);

// 3. Add stripSets to useRngSearch
const search_old = `  const { combinations, isSearching, error } = useRngSearch(
    gameType, selectedSymbol, reelCount, rowCounts, currentStrips, currentPaytable, specialSymbolConfig, customPaylines, topTrackerOther,
    multiplierIntervals, betMultiplier, isFreeGame
  );`;
const search_new = `  const { combinations, isSearching, error } = useRngSearch(
    gameType, selectedSymbol, reelCount, rowCounts, currentStrips, currentPaytable, specialSymbolConfig, customPaylines, topTrackerOther,
    multiplierIntervals, betMultiplier, isFreeGame, stripSets
  );`;
code = code.replace(search_old, search_new);

// 4. Modify finalRng in combination rendering
const finalrng_old = `                      // For other game types, just copy the base RNG indices
                      const finalRng = comb.rng;
                      const finalCopy = \`[\${finalRng.join(',')}],\`;`;
const finalrng_new = `                      // For other game types, just copy the base RNG indices
                      const finalRng = (gameType === 'waygame' || gameType === 'megaway') 
                        ? [...comb.rng.slice(0, 6), (comb as any).stripId !== undefined ? Number((comb as any).stripId) + 1 : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) + 1 : 1)]
                        : comb.rng;
                      const finalCopy = \`[\${finalRng.join(',')}],\`;`;
code = code.replace(finalrng_old, finalrng_new);

const rngstr_old = `                          {\`RNG: \${selectedCombIndex === idx && isManualEdited ? currentRngString : \\\`[\\\${comb.rng.join(',')}]\\\`} \`}`;
const rngstr_new = `                          {\`RNG: \${selectedCombIndex === idx && isManualEdited ? currentRngString : \\\`[\\\${(gameType === 'waygame' || gameType === 'megaway') ? [...comb.rng.slice(0, 6), (comb as any).stripId !== undefined ? Number((comb as any).stripId) + 1 : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) + 1 : 1)].join(',') : comb.rng.join(',')}]\\\`} \`}`;
code = code.replace(rngstr_old, rngstr_new);

// 5. Modify currentRngString
const curr_rng_old = `  const currentRngString = \`[\${currentFormattedRngArray.join(',')}],\`;`;
const curr_rng_new = `  const currentRngString = (() => {
    const targetComb = combinations[selectedCombIndex < combinations.length ? selectedCombIndex : 0];
    if (gameType === 'waygame' || gameType === 'megaway') {
      const extraId = (targetComb as any)?.stripId !== undefined ? Number((targetComb as any).stripId) + 1 : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) + 1 : 1);
      return \`[\${[...currentFormattedRngArray, extraId].join(',')}],\`;
    }
    return \`[\${currentFormattedRngArray.join(',')}],\`;
  })();`;
code = code.replace(curr_rng_old, curr_rng_new);

// 6. Modify onChange pasting logic
const onchange_old = `                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    const parsed = parsePasteRng(val, reelCount, rowCounts);
                    if (parsed) {
                      setManualIndicesOther(parsed);
                      setIsManualEdited(true);
                    }
                    e.target.value = '';
                  }
                }}`;
const onchange_new = `                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    const parsed = parsePasteRng(val, reelCount, rowCounts);
                    if (parsed) {
                      if (parsed.length > reelCount) {
                        const extraId = Number(parsed[reelCount]);
                        if (!isNaN(extraId) && setActiveStripId) {
                          setActiveStripId(extraId);
                        }
                        setManualIndicesOther(parsed.slice(0, reelCount));
                      } else {
                        setManualIndicesOther(parsed);
                      }
                      setIsManualEdited(true);
                    }
                    e.target.value = '';
                  }
                }}`;
code = code.replace(onchange_old, onchange_new);

fs.writeFileSync('src/components/tabs/SlotGeneratorTab.tsx', code);
console.log("SlotGeneratorTab.tsx fully restored and patched!");
