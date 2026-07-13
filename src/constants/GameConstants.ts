export const GameTypes = {
  LINE_GAME: 'linegame',
  LINE_GAME_SET2: 'linegame_set2',
  PAY_ANYWHERE: 'payanywhere',
  PAY_ANYWHERE_SET2: 'payanywhere_set2',
  WAY_GAME: 'waygame',
  WAY_GAME_QIN: 'waygame_qin',
  MEGAWAY: 'megaway',
} as const;

export const SpecialSymbols = {
  S1: 'S1',
  S2: 'S2',
  B1: 'B1',
  B2: 'B2',
  WX: 'WX',
  WW: 'WW',
  WILD: 'WILD',
  W: 'W',
  TE: 'TE',
  NI: 'NI',
} as const;

export const SymbolGroupOrder = [
  SpecialSymbols.WW,
  SpecialSymbols.WX,
  SpecialSymbols.B1,
  SpecialSymbols.S1,
  'M1',
  'M2',
  'M3',
  'M4',
  'M5',
  'M6',
  'A',
  'K',
  'Q',
  'J',
  SpecialSymbols.TE,
  SpecialSymbols.NI,
] as const;

export const SymbolCategories = {
  OTHERS: 'others',
  M_NUM: 'mnum',
  M_LET: 'mlet'
} as const;
