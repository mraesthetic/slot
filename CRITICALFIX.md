# EXACT Payload Specification for Candy Carnage 1000

**CRITICAL: Every field shown here is REQUIRED unless marked (optional)**

---

## reveal Event - EXACT FORMAT

```json
{
  "index": 0,
  "type": "reveal",
  "gameType": "basegame",
  "paddingPositions": [0, 0, 0, 0, 0, 0],
  "board": [
    [
      {"name": "L1"},
      {"name": "H1"},
      {"name": "H2"},
      {"name": "L3"},
      {"name": "H4"},
      {"name": "L2"},
      {"name": "L5"}
    ],
    [
      {"name": "H3"},
      {"name": "L4"},
      {"name": "H1"},
      {"name": "L1"},
      {"name": "H2"},
      {"name": "L3"},
      {"name": "H4"}
    ],
    [
      {"name": "L2"},
      {"name": "H3"},
      {"name": "L4"},
      {"name": "H1"},
      {"name": "L1"},
      {"name": "H2"},
      {"name": "L3"}
    ],
    [
      {"name": "H4"},
      {"name": "L2"},
      {"name": "H3"},
      {"name": "L4"},
      {"name": "H1"},
      {"name": "L1"},
      {"name": "H2"}
    ],
    [
      {"name": "L3"},
      {"name": "H4"},
      {"name": "L2"},
      {"name": "H3"},
      {"name": "L4"},
      {"name": "H1"},
      {"name": "L1"}
    ],
    [
      {"name": "H2"},
      {"name": "L3"},
      {"name": "H4"},
      {"name": "L2"},
      {"name": "H3"},
      {"name": "L4"},
      {"name": "H1"}
    ]
  ]
}
```

### CRITICAL RULES FOR `board`:

1. **MUST be an array of exactly 6 arrays** (6 reels)
2. **Each reel MUST have exactly 7 symbol objects** (1 top padding + 5 visible + 1 bottom padding)
3. **NO null values** - every position must be a valid symbol object
4. **NO undefined values** - every position must be a valid symbol object
5. **Every symbol object MUST have a `name` field**

### Valid Symbol Objects:

```json
// Regular symbols - just name
{"name": "H1"}
{"name": "H2"}
{"name": "H3"}
{"name": "H4"}
{"name": "L1"}
{"name": "L2"}
{"name": "L3"}
{"name": "L4"}
{"name": "L5"}

// Scatter - name + scatter flag
{"name": "S", "scatter": true}

// Super Scatter - name + scatter flag
{"name": "BS", "scatter": true}

// Multiplier Bomb - name + bomb flag + multiplier value
// MULTIPLIER MUST BE > 0 (never 0!)
{"name": "M", "bomb": true, "multiplier": 2}
{"name": "M", "bomb": true, "multiplier": 3}
{"name": "M", "bomb": true, "multiplier": 4}
{"name": "M", "bomb": true, "multiplier": 5}
{"name": "M", "bomb": true, "multiplier": 6}
{"name": "M", "bomb": true, "multiplier": 8}
{"name": "M", "bomb": true, "multiplier": 10}
{"name": "M", "bomb": true, "multiplier": 12}
{"name": "M", "bomb": true, "multiplier": 15}
{"name": "M", "bomb": true, "multiplier": 20}
{"name": "M", "bomb": true, "multiplier": 25}
{"name": "M", "bomb": true, "multiplier": 50}
{"name": "M", "bomb": true, "multiplier": 100}
{"name": "M", "bomb": true, "multiplier": 500}
{"name": "M", "bomb": true, "multiplier": 1000}
```

### INVALID - Will Crash Frontend:

```json
// ❌ WRONG - null value
[{"name": "H1"}, null, {"name": "L2"}, ...]

// ❌ WRONG - undefined value
[{"name": "H1"}, undefined, {"name": "L2"}, ...]

// ❌ WRONG - empty object
[{"name": "H1"}, {}, {"name": "L2"}, ...]

// ❌ WRONG - missing name
[{"name": "H1"}, {"multiplier": 5}, {"name": "L2"}, ...]

// ❌ WRONG - M with multiplier 0
{"name": "M", "bomb": true, "multiplier": 0}

// ❌ WRONG - M without multiplier
{"name": "M", "bomb": true}

// ❌ WRONG - only 5 reels
"board": [[...], [...], [...], [...], [...]]

// ❌ WRONG - only 5 symbols per reel
"board": [[{...}, {...}, {...}, {...}, {...}], ...]
```

---

## gameType Values - EXACT STRINGS

```
"basegame"  - for base game spins
"freegame"  - for free spin bonus rounds
```

**Case sensitive! Must be lowercase!**

---

## winInfo Event - EXACT FORMAT

```json
{
  "index": 1,
  "type": "winInfo",
  "totalWin": 500,
  "wins": [
    {
      "symbol": "H1",
      "win": 500,
      "positions": [
        {"reel": 0, "row": 1},
        {"reel": 0, "row": 2},
        {"reel": 1, "row": 1},
        {"reel": 1, "row": 2},
        {"reel": 2, "row": 1},
        {"reel": 2, "row": 2},
        {"reel": 3, "row": 1},
        {"reel": 3, "row": 2}
      ],
      "meta": {
        "clusterMult": 1,
        "winWithoutMult": 500,
        "overlay": {"reel": 1, "row": 1}
      }
    }
  ]
}
```

### Position Indexing:
- `reel`: 0-5 (left to right)
- `row`: 0-4 (top to bottom, **VISIBLE ROWS ONLY**)

**Row 0 = top visible row, Row 4 = bottom visible row**

---

## tumbleBoard Event - EXACT FORMAT

```json
{
  "index": 3,
  "type": "tumbleBoard",
  "explodingSymbols": [
    {"reel": 0, "row": 1},
    {"reel": 0, "row": 2},
    {"reel": 1, "row": 1},
    {"reel": 1, "row": 2},
    {"reel": 2, "row": 1},
    {"reel": 2, "row": 2},
    {"reel": 3, "row": 1},
    {"reel": 3, "row": 2}
  ],
  "newSymbols": [
    [{"name": "L3"}, {"name": "H4"}],
    [{"name": "L1"}, {"name": "H2"}],
    [{"name": "L5"}, {"name": "H3"}],
    [{"name": "L4"}, {"name": "H1"}],
    [],
    []
  ]
}
```

### CRITICAL RULES FOR `newSymbols`:

1. **MUST be an array of exactly 6 arrays** (one per reel)
2. **Each array contains the NEW symbols falling into that reel**
3. **Empty array `[]` if no new symbols for that reel**
4. **Every symbol object MUST have a `name` field**
5. **NO null or undefined values in symbol arrays**

---

## updateTumbleWin Event - EXACT FORMAT

```json
{
  "index": 2,
  "type": "updateTumbleWin",
  "amount": 500
}
```

---

## boardMultiplierInfo Event - EXACT FORMAT

```json
{
  "index": 4,
  "type": "boardMultiplierInfo",
  "multInfo": {
    "positions": [
      {"reel": 2, "row": 3, "multiplier": 50, "name": "M"}
    ]
  },
  "winInfo": {
    "tumbleWin": 100,
    "boardMult": 50,
    "totalWin": 5000
  }
}
```

---

## freeSpinTrigger Event - EXACT FORMAT

```json
{
  "index": 5,
  "type": "freeSpinTrigger",
  "totalFs": 10,
  "positions": [
    {"reel": 1, "row": 2},
    {"reel": 2, "row": 3},
    {"reel": 4, "row": 1},
    {"reel": 5, "row": 4}
  ]
}
```

---

## enterBonus Event - EXACT FORMAT

```json
{
  "index": 6,
  "type": "enterBonus",
  "reason": "regular"
}
```

**`reason` must be exactly `"regular"` or `"super"`**

---

## updateFreeSpin Event - EXACT FORMAT

```json
{
  "index": 7,
  "type": "updateFreeSpin",
  "amount": 1,
  "total": 10
}
```

---

## freeSpinRetrigger Event - EXACT FORMAT

```json
{
  "index": 8,
  "type": "freeSpinRetrigger",
  "totalFs": 15
}
```

---

## freeSpinEnd Event - EXACT FORMAT

```json
{
  "index": 9,
  "type": "freeSpinEnd",
  "amount": 5000,
  "winLevel": 7
}
```

**`winLevel` must be 0-10**

---

## setTotalWin Event - EXACT FORMAT

```json
{
  "index": 10,
  "type": "setTotalWin",
  "amount": 5000
}
```

---

## setWin Event - EXACT FORMAT (for big wins level 6+)

```json
{
  "index": 11,
  "type": "setWin",
  "amount": 5000,
  "winLevel": 7
}
```

---

## finalWin Event - EXACT FORMAT (ALWAYS LAST)

```json
{
  "index": 12,
  "type": "finalWin",
  "amount": 5000
}
```

---

## Complete Base Spin Example (Win + Tumble)

```json
{
  "state": [
    {
      "index": 0,
      "type": "reveal",
      "gameType": "basegame",
      "paddingPositions": [0, 0, 0, 0, 0, 0],
      "board": [
        [{"name":"L1"},{"name":"H1"},{"name":"H1"},{"name":"H1"},{"name":"L2"},{"name":"L3"},{"name":"H4"}],
        [{"name":"L2"},{"name":"H1"},{"name":"H1"},{"name":"H1"},{"name":"L1"},{"name":"L4"},{"name":"L5"}],
        [{"name":"H3"},{"name":"H1"},{"name":"H1"},{"name":"L2"},{"name":"L3"},{"name":"H4"},{"name":"L1"}],
        [{"name":"L4"},{"name":"L3"},{"name":"L4"},{"name":"L5"},{"name":"H2"},{"name":"L2"},{"name":"H3"}],
        [{"name":"H2"},{"name":"L5"},{"name":"H4"},{"name":"L1"},{"name":"L4"},{"name":"H3"},{"name":"L2"}],
        [{"name":"L5"},{"name":"H4"},{"name":"L2"},{"name":"H3"},{"name":"L5"},{"name":"L1"},{"name":"H2"}]
      ]
    },
    {
      "index": 1,
      "type": "winInfo",
      "totalWin": 1000,
      "wins": [{
        "symbol": "H1",
        "win": 1000,
        "positions": [
          {"reel":0,"row":0},{"reel":0,"row":1},{"reel":0,"row":2},
          {"reel":1,"row":0},{"reel":1,"row":1},{"reel":1,"row":2},
          {"reel":2,"row":0},{"reel":2,"row":1}
        ],
        "meta": {"clusterMult":1,"winWithoutMult":1000,"overlay":{"reel":1,"row":1}}
      }]
    },
    {
      "index": 2,
      "type": "updateTumbleWin",
      "amount": 1000
    },
    {
      "index": 3,
      "type": "tumbleBoard",
      "explodingSymbols": [
        {"reel":0,"row":0},{"reel":0,"row":1},{"reel":0,"row":2},
        {"reel":1,"row":0},{"reel":1,"row":1},{"reel":1,"row":2},
        {"reel":2,"row":0},{"reel":2,"row":1}
      ],
      "newSymbols": [
        [{"name":"L3"},{"name":"H2"},{"name":"L4"}],
        [{"name":"L1"},{"name":"H3"},{"name":"L2"}],
        [{"name":"L5"},{"name":"H4"}],
        [],
        [],
        []
      ]
    },
    {
      "index": 4,
      "type": "setTotalWin",
      "amount": 1000
    },
    {
      "index": 5,
      "type": "finalWin",
      "amount": 1000
    }
  ]
}
```

---

## Validation Checklist

Before sending ANY event, verify:

- [ ] `board` has exactly 6 reels
- [ ] Each reel has exactly 7 symbols
- [ ] NO null values anywhere in board
- [ ] NO undefined values anywhere
- [ ] Every symbol has a `name` field
- [ ] M symbols have `multiplier` > 0 (never 0)
- [ ] `gameType` is exactly `"basegame"` or `"freegame"`
- [ ] `newSymbols` has exactly 6 arrays (even if empty)
- [ ] All positions use `reel` 0-5 and `row` 0-4
- [ ] `finalWin` is always the last event

