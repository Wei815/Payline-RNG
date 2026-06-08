import type { PaytableRule, ReelStrips } from '../types';

export const defaultExcelStripsString = `Line #\tR1\tR2\tR3\tR4\tR5
0\tTE\tNI\tNI\tJ\tJ
1\tA\tM1\tK\tNI\tTE
2\tK\tM4\tTE\tA\tWX
3\tM4\tA\tS1\tS1\tJ
4\tM2\tM4\tM2\tM4\tJ
5\tA\tM2\tTE\tJ\tJ
6\tQ\tTE\tJ\tQ\tA
7\tNI\tA\tS1\tA\tTE
8\tQ\tNI\tA\tM2\tJ
9\tM4\tM3\tM1\tA\tM4
10\tB1\tS1\tB1\tQ\tJ
11\tTE\tNI\tTE\tNI\tA
12\tQ\tJ\tTE\tM3\tM3
13\tA\tM3\tM4\tS1\tA
14\tQ\tNI\tK\tM4\tS1
15\tM3\tM4\tA\tJ\tQ
16\tTE\tQ\tM2\tQ\tK
17\tS1\tQ\tNI\tTE\tM2
18\tM3\tS1\tK\tK\tK
19\tK\tQ\tQ\tK\tNI
20\tTE\tB1\tM4\tM4\tNI
21\tB1\tWX\tQ\tJ\tWX
22\tQ\tM2\tK\tA\tTE
23\tK\tJ\tNI\tS1\tQ
24\tM4\tNI\tM3\tM4\tNI
25\tM3\tB1\tB1\tM3\tM3
26\tB1\tNI\tNI\tJ\tA
27\tJ\tJ\tK\tK\tJ
28\tM1\tS1\tJ\tM1\tK
29\tK\tJ\tJ\tJ\tQ
30\tS1\tNI\tJ\tJ\tJ
31\tA\tM3\tB1\tNI\tM1
32\tK\tM4\tJ\tA\tTE
33\tB1\tB1\tTE\tM2\tJ
34\tQ\tTE\tJ\tQ\tK
35\tNI\tA\tS1\tA\tTE
36\tQ\tNI\tA\tM2\tM2
37\tQ\tK\tK\tQ\tK
38\tB1\tK\tNI\tTE\tNI
39\tJ\tQ\tTE\tJ\tQ
40\tTE\tJ\tQ\tNI\tTE
41\tTE\tK\tA\tNI\tQ
42\tTE\tK\tA\tNI\tQ
43\tM4\tM3\tM3\tA\tM4
44\tA\tM2\tTE\tJ\tJ
45\tQ\tTE\tJ\tQ\tA
46\tNI\tA\tS1\tA\tTE
47\tQ\tNI\tA\tM2\tJ
48\tM4\tM3\tM1\tA\tM4
49\tB1\tS1\tB1\tQ\tJ
50\tTE\tNI\tTE\tNI\tA
51\tQ\tK\tK\tQ\tK
52\tJ\tK\tNI\tTE\tNI
53\tNI\tNI\tTE\tJ\tQ
54\tTE\tJ\tQ\tNI\tTE
55\tS1\tB1\tB1\tNI\tQ
56\tTE\tK\tA\tNI\tQ
57\tTE\tK\tA\tNI\tQ
58\tA\tM2\tTE\tJ\tJ
59\tQ\tTE\tJ\tQ\tA
60\tNI\tA\tS1\tA\tTE
61\tQ\tNI\tA\tM2\tJ
62\tM3\tM3\tM3\tA\tM4
63\tB1\tK\tNI\tTE\tNI
64\tTE\tQ\tTE\tJ\tQ
65\tQ\tJ\tQ\tNI\tTE
66\tJ\tK\tNI\tTE\tNI
67\tNI\tNI\tB1\tJ\tQ
68\tTE\tB1\tQ\tNI\tTE
69\tM4\tM3\tM4\tA\tM4
70\tTE\tK\tA\tWX\tQ
71\tB1\tK\tA\tWX\tQ
72\tQ\tTE\tJ\tQ\tA
73\tNI\tA\tS1\tA\tTE
74\tK\tK\tK\tK\tK
75\tM2\tM3\tTE\tA\tM4
76\tM1\tS1\tJ\tM1\tK
77\tK\tJ\tJ\tJ\tQ
78\tTE\tNI\tNI\tJ\tJ
79\tQ\tK\tK\tQ\tK
80\tJ\tK\tNI\tTE\tNI
81\tNI\tNI\tTE\tJ\tQ
82\tTE\tJ\tQ\tNI\tTE
83\tS1\tB1\tB1\tNI\tQ
84\tTE\tK\tA\tNI\tQ
85\tTE\tK\tA\tWX\tQ
86\tA\tM2\tTE\tJ\tJ
87\tQ\tTE\tJ\tQ\tA
88\tNI\tA\tS1\tA\tTE
89\tQ\tNI\tA\tM2\tJ
90\tM3\tM3\tM1\tA\tM4
91\tB1\tS1\tB1\tQ\tJ
92\tTE\tNI\tK\tNI\tA
93\tM2\tK\tK\tQ\tK
94\tJ\tK\tNI\tTE\tNI
95\tNI\tNI\tQ\tJ\tQ
96\tTE\tK\tB1\tNI\tTE
97\tM2\tM3\tM4\tA\tM4
98\tTE\tK\tA\tNI\tQ
99\tB1\tK\tA\tNI\tQ
100\tQ\tTE\tJ\tQ\tA
101\tNI\tA\tS1\tA\tTE
102\tK\tK\tK\tK\tK
103\tM4\tM3\tTE\tA\tM4
104\tM1\tS1\tJ\tM1\tK
105\tK\tJ\tJ\tJ\tQ
106\tTE\tNI\tNI\tJ\tJ
107\tM2\tM1\tWX\tM3\tWX
108\tQ\tTE\tWX\tJ\tWX
109\tM1\tWX\tWX\tWX\tWX`;

export const defaultReelStrips: ReelStrips = (() => {
  const lines = defaultExcelStripsString.split('\n');
  const strips: ReelStrips = [[], [], [], [], []];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length >= 6) {
      strips[0].push(cols[1]);
      strips[1].push(cols[2]);
      strips[2].push(cols[3]);
      strips[3].push(cols[4]);
      strips[4].push(cols[5]);
    }
  }
  return strips;
})();

export const defaultPaytable: PaytableRule[] = [
  {
    symbolId: 'WX',
    name: 'Wild',
    payouts: { match2: 10, match3: 50, match4: 200, match5: 1000 },
    isWild: true,
    isScatter: false
  },
  {
    symbolId: 'S1',
    name: 'Scatter',
    payouts: { match2: 2, match3: 5, match4: 20, match5: 100 },
    isWild: false,
    isScatter: true
  },
  {
    symbolId: 'M1',
    name: 'High 1',
    payouts: { match2: 0, match3: 20, match4: 100, match5: 400 },
    isWild: false,
    isScatter: false
  },
  {
    symbolId: 'M2',
    name: 'High 2',
    payouts: { match2: 0, match3: 15, match4: 75, match5: 300 },
    isWild: false,
    isScatter: false
  },
  {
    symbolId: 'M3',
    name: 'High 3',
    payouts: { match2: 0, match3: 10, match4: 50, match5: 200 },
    isWild: false,
    isScatter: false
  },
  {
    symbolId: 'M4',
    name: 'High 4',
    payouts: { match2: 0, match3: 10, match4: 50, match5: 200 },
    isWild: false,
    isScatter: false
  },
  {
    symbolId: 'A',
    name: 'Ace',
    payouts: { match2: 0, match3: 10, match4: 50, match5: 150 },
    isWild: false,
    isScatter: false
  },
  {
    symbolId: 'K',
    name: 'King',
    payouts: { match2: 0, match3: 10, match4: 50, match5: 150 },
    isWild: false,
    isScatter: false
  },
  {
    symbolId: 'Q',
    name: 'Queen',
    payouts: { match2: 0, match3: 5, match4: 20, match5: 100 },
    isWild: false,
    isScatter: false
  },
  {
    symbolId: 'J',
    name: 'Jack',
    payouts: { match2: 0, match3: 5, match4: 20, match5: 100 },
    isWild: false,
    isScatter: false
  },
  {
    symbolId: 'TE',
    name: 'Ten',
    payouts: { match2: 0, match3: 5, match4: 20, match5: 100 },
    isWild: false,
    isScatter: false
  },
  {
    symbolId: 'NI',
    name: 'Nine',
    payouts: { match2: 0, match3: 5, match4: 20, match5: 100 },
    isWild: false,
    isScatter: false
  },
  {
    symbolId: 'B1',
    name: 'Bonus',
    payouts: { match2: 0, match3: 0, match4: 0, match5: 0 },
    isWild: false,
    isScatter: false
  }
];
