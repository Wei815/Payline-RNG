import re

with open('src/components/tabs/SlotGeneratorTab.tsx', 'r', encoding='utf8') as f:
    code = f.read()

# 1. Add props to interface
props_old = """export interface SlotGeneratorTabProps {
  reelCount: number;
  rowCounts: number[];"""
props_new = """export interface SlotGeneratorTabProps {
  stripSets?: Record<string, string[][]>;
  setActiveStripId?: (id: number) => void;
  reelCount: number;
  rowCounts: number[];"""
code = code.replace(props_old, props_new)

# 2. Add props to component signature
sig_old = """export const SlotGeneratorTab: React.FC<SlotGeneratorTabProps> = ({
  reelCount, rowCounts, onRowCountsChange,"""
sig_new = """export const SlotGeneratorTab: React.FC<SlotGeneratorTabProps> = ({
  stripSets, setActiveStripId,
  reelCount, rowCounts, onRowCountsChange,"""
code = code.replace(sig_old, sig_new)

# 3. Add stripSets to useRngSearch
search_old = """  const { combinations, isSearching, error } = useRngSearch(
    gameType, selectedSymbol, reelCount, rowCounts, currentStrips, currentPaytable, specialSymbolConfig, customPaylines, topTrackerOther,
    multiplierIntervals, betMultiplier, isFreeGame
  );"""
search_new = """  const { combinations, isSearching, error } = useRngSearch(
    gameType, selectedSymbol, reelCount, rowCounts, currentStrips, currentPaytable, specialSymbolConfig, customPaylines, topTrackerOther,
    multiplierIntervals, betMultiplier, isFreeGame, stripSets
  );"""
code = code.replace(search_old, search_new)

# 4. Modify finalRng in combination rendering
finalrng_old = """                      // For other game types, just copy the base RNG indices
                      const finalRng = comb.rng;
                      const finalCopy = `[${finalRng.join(',')}],`;"""
finalrng_new = """                      // For other game types, just copy the base RNG indices
                      const finalRng = (gameType === 'waygame' || gameType === 'megaway') 
                        ? [...comb.rng.slice(0, 6), (comb as any).stripId !== undefined ? Number((comb as any).stripId) + 1 : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) + 1 : 1)]
                        : comb.rng;
                      const finalCopy = `[${finalRng.join(',')}],`;"""
code = code.replace(finalrng_old, finalrng_new)

rngstr_old = """                          {`RNG: ${selectedCombIndex === idx && isManualEdited ? currentRngString : \`[\${comb.rng.join(',')}]\`} `}"""
rngstr_new = """                          {`RNG: ${selectedCombIndex === idx && isManualEdited ? currentRngString : \`[\${(gameType === 'waygame' || gameType === 'megaway') ? [...comb.rng.slice(0, 6), (comb as any).stripId !== undefined ? Number((comb as any).stripId) + 1 : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) + 1 : 1)].join(',') : comb.rng.join(',')}]\`} `}"""
code = code.replace(rngstr_old, rngstr_new)

# 5. Modify currentRngString
curr_rng_old = """  const currentRngString = `[${currentFormattedRngArray.join(',')}],`;"""
curr_rng_new = """  const currentRngString = (() => {
    const targetComb = combinations[selectedCombIndex < combinations.length ? selectedCombIndex : 0];
    if (gameType === 'waygame' || gameType === 'megaway') {
      const extraId = (targetComb as any)?.stripId !== undefined ? Number((targetComb as any).stripId) + 1 : (stripSets ? Number(Object.keys(stripSets).find(k => stripSets[k] === currentStrips) || 0) + 1 : 1);
      return `[${[...currentFormattedRngArray, extraId].join(',')}],`;
    }
    return `[${currentFormattedRngArray.join(',')}],`;
  })();"""
code = code.replace(curr_rng_old, curr_rng_new)

# 6. Modify onChange pasting logic
onchange_old = """                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    const parsed = parsePasteRng(val, reelCount, rowCounts);
                    if (parsed) {
                      setManualIndicesOther(parsed);
                      setIsManualEdited(true);
                    }
                    e.target.value = '';
                  }
                }}"""
onchange_new = """                onChange={(e) => {
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
                }}"""
code = code.replace(onchange_old, onchange_new)

with open('src/components/tabs/SlotGeneratorTab.tsx', 'w', encoding='utf8') as f:
    f.write(code)

print("SlotGeneratorTab.tsx fully restored and patched!")
