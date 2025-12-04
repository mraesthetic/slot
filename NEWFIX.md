# DEFINITIVE Backend Payload Specification for Candy Carnage 1000

**GENERATED FROM ACTUAL FRONTEND CODE - NOT FROM PREVIOUS DOCS**

This document is the single source of truth. All payload formats, field names, and indexing are traced directly from the frontend codebase.

---

## CRITICAL: Row Indexing

The board has **7 symbols per reel** (1 top padding + 5 visible + 1 bottom padding).

| Array Index | What It Is | Use in Positions? |
|-------------|------------|-------------------|
| 0 | Top padding | ❌ NO |
| **1** | Visible row 0 (TOP) | ✅ YES |
| **2** | Visible row 1 | ✅ YES |
| **3** | Visible row 2 (MIDDLE) | ✅ YES |
| **4** | Visible row 3 | ✅ YES |
| **5** | Visible row 4 (BOTTOM) | ✅ YES |
| 6 | Bottom padding | ❌ NO |

**ALL position `row` values must be 1-5 (not 0-4).**

```
Visible Row (what you see)  →  position.row to send
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      Top row (row 0)       →         1
      Row 1                 →         2
      Row 2 (middle)        →         3
      Row 3                 →         4
      Bottom row (row 4)    →         5
```

**Source:** `Board.svelte:87` - `symbols[position.row]` is used directly as array index.

---

## Event Types (Complete List)

The frontend handles these exact event types from `typesBookEvent.ts`:

1. `reveal` - Board state after spin
2. `winInfo` - Cluster win information
3. `updateTumbleWin` - Cumulative tumble win amount
4. `setTotalWin` - Set total win amount
5. `tumbleBoard` - Symbols to explode and new symbols
6. `boardMultiplierInfo` - Bomb multiplier collection
7. `freeSpinTrigger` - Free spins triggered
8. `enterBonus` - Confirm bonus type
9. `updateFreeSpin` - Free spin counter update
10. `freeSpinRetrigger` - Additional free spins awarded
11. `freeSpinEnd` - Free spins ended
12. `setWin` - Big win animation
13. `finalWin` - Round complete

---

## 1. `reveal` Event

**Source:** `typesBookEvent.ts:5-12`, `bookEventHandlerMap.ts:63-79`

```typescript
{
  "index": number,        // Sequential event index (starts at 1)
  "type": "reveal",
  "gameType": "basegame" | "freegame",
  "paddingPositions": [0, 0, 0, 0, 0, 0],  // Always 6 zeros
  "board": [              // EXACTLY 6 reels
    [                     // EXACTLY 7 symbols per reel
      {"name": "L1"},     // Index 0 = TOP PADDING
      {"name": "H2"},     // Index 1 = VISIBLE ROW 0 (TOP)
      {"name": "L5"},     // Index 2 = VISIBLE ROW 1
      {"name": "H3"},     // Index 3 = VISIBLE ROW 2
      {"name": "L2"},     // Index 4 = VISIBLE ROW 3
      {"name": "H1"},     // Index 5 = VISIBLE ROW 4 (BOTTOM)
      {"name": "L4"}      // Index 6 = BOTTOM PADDING
    ],
    // ... 5 more reels (total 6)
  ]
}
```

### Symbol Object Format

**Source:** `types.ts:5`

```typescript
{
  "name": string,           // REQUIRED: H1-H4, L1-L5, S, BS, M
  "multiplier"?: number,    // REQUIRED for M symbols: 2,3,4,5,6,8,10,12,15,20,25,50,100,500,1000
  "scatter"?: boolean,      // Optional: true for S, BS
  "bomb"?: boolean          // Optional: true for M
}
```

### Valid Symbol Names

**Source:** `constants.ts:342-682`

| Name | Description |
|------|-------------|
| `H1`, `H2`, `H3`, `H4` | High symbols |
| `L1`, `L2`, `L3`, `L4`, `L5` | Low symbols |
| `S` | Regular scatter |
| `BS` | Super scatter (golden) |
| `M` | Bomb multiplier (MUST have `multiplier` field) |

### Valid Multiplier Values for M

**Source:** `constants.ts:440-561`

- **Low tier (bomb_low.png):** 2, 3, 4, 5, 6, 8, 10
- **Mid tier (bomb_mid.png):** 12, 15, 20, 25, 50
- **High tier (bomb_high.png):** 100, 500, 1000

**Example M symbol:**
```json
{"name": "M", "bomb": true, "multiplier": 25}
```

---

## 2. `winInfo` Event

**Source:** `typesBookEvent.ts:14-28`, `bookEventHandlerMap.ts:80-130`

```typescript
{
  "index": number,
  "type": "winInfo",
  "totalWin": number,       // Total win for THIS tumble (in cents)
  "wins": [                 // One entry per cluster
    {
      "symbol": string,     // H1, H2, L1, etc.
      "win": number,        // Final win amount (after any multiplier)
      "positions": [        // ALL positions in the cluster
        {"reel": 0, "row": 1},  // row 1-5 ONLY
        {"reel": 0, "row": 2},
        {"reel": 1, "row": 1},
        // ... all 8+ positions in cluster
      ],
      "meta": {
        "clusterMult": number,    // Cluster multiplier (usually 1)
        "winWithoutMult": number, // Win before multiplier
        "overlay": {              // Position for win text display
          "reel": number,         // 0-5
          "row": number           // 1-5 (visible rows only)
        }
      }
    }
  ]
}
```

### Important Notes

1. **positions[].row must be 1-5** - These are array indices into the 7-element board
2. **overlay.row must be 1-5** - Used for rendering text at correct position
3. **overlay position** should be approximately center of the cluster
4. **Minimum cluster size:** 8 symbols

**Source for overlay rendering:** `ClusterWinAmount.svelte:7, 85`
```typescript
row: number; // 1 | 2 | 3 | 4 | 5; // excluding the off top row and the off bottom row
y={SYMBOL_SIZE * (props.win.row - 0.5) + y.current}
```

---

## 3. `updateTumbleWin` Event

**Source:** `typesBookEvent.ts:30-34`, `bookEventHandlerMap.ts:131-143`

```typescript
{
  "index": number,
  "type": "updateTumbleWin",
  "amount": number    // CUMULATIVE total win so far (in cents)
}
```

**Note:** This is the running total, not an incremental amount.

---

## 4. `tumbleBoard` Event

**Source:** `typesBookEvent.ts:88-93`, `bookEventHandlerMap.ts:354-394`

```typescript
{
  "index": number,
  "type": "tumbleBoard",
  "explodingSymbols": [     // Positions of symbols to explode
    {"reel": 0, "row": 1},  // row MUST be 1-5
    {"reel": 0, "row": 2},
    {"reel": 1, "row": 1},
    // ... all exploding positions
  ],
  "newSymbols": [           // EXACTLY 6 arrays (one per reel)
    [                       // Reel 0: new symbols to drop
      {"name": "L3"},
      {"name": "H4"}
    ],
    [],                     // Reel 1: no new symbols
    [],                     // Reel 2: no new symbols
    [{"name": "M", "bomb": true, "multiplier": 25}],  // Reel 3
    [],                     // Reel 4: no new symbols
    []                      // Reel 5: no new symbols
  ]
}
```

### Rules

1. **explodingSymbols[].row must be 1-5** - Matches board array indices
2. **newSymbols must be exactly 6 arrays** - One per reel, even if empty
3. **Number of new symbols per reel** = number of exploded symbols in that reel
4. **Order of newSymbols[reel]** = top to bottom (first symbol goes to topmost empty slot)

**Source for tumble processing:** `TumbleBoard.svelte:106-115`
```typescript
tumbleBoardExplode: async ({ explodingPositions }) => {
  explodingPositions.map(async (position) => {
    const tumbleSymbol = context.stateGame.tumbleBoardBase[position.reel][position.row];
    // position.row is used directly as array index
  });
}
```

---

## 5. `boardMultiplierInfo` Event

**Source:** `typesBookEvent.ts:75-86`, `bookEventHandlerMap.ts:303-353`

Sent when bomb multipliers activate during a winning tumble.

```typescript
{
  "index": number,
  "type": "boardMultiplierInfo",
  "multInfo": {
    "positions": [          // All active bombs on board
      {
        "reel": 2,
        "row": 3,           // 1-5 (visible rows only)
        "multiplier": 50,
        "name": "M"
      }
    ]
  },
  "winInfo": {
    "tumbleWin": number,    // Win BEFORE bomb multiplier
    "boardMult": number,    // Sum of all bomb multipliers
    "totalWin": number      // tumbleWin × boardMult
  }
}
```

### Event Sequence

```
winInfo              ← cluster wins detected
updateTumbleWin      ← running total (pre-bomb)
boardMultiplierInfo  ← bombs collect, multiplier applied
updateTumbleWin      ← running total (post-bomb)
tumbleBoard          ← symbols explode and fall
```

---

## 6. `freeSpinTrigger` Event

**Source:** `typesBookEvent.ts:42-47`, `bookEventHandlerMap.ts:147-230`

Sent when 4+ scatters trigger free spins.

```typescript
{
  "index": number,
  "type": "freeSpinTrigger",
  "totalFs": number,        // Total free spins awarded (e.g., 10)
  "positions": [            // Scatter positions (for animation)
    {"reel": 0, "row": 2},  // row 1-5
    {"reel": 1, "row": 3},
    {"reel": 2, "row": 1},
    {"reel": 3, "row": 4}
  ]
}
```

**Note:** Frontend also scans the board for BS symbols to animate them, but positions should include all S symbols.

---

## 7. `enterBonus` Event

**Source:** `typesBookEvent.ts:63-67`, `bookEventHandlerMap.ts:239-246`

Confirms bonus type after freeSpinTrigger.

```typescript
{
  "index": number,
  "type": "enterBonus",
  "reason": "regular" | "super"   // "super" if BS was in scatters
}
```

---

## 8. `updateFreeSpin` Event

**Source:** `typesBookEvent.ts:49-54`, `bookEventHandlerMap.ts:231-238`

Updates free spin counter.

```typescript
{
  "index": number,
  "type": "updateFreeSpin",
  "amount": number,   // Current spin number (1, 2, 3, ...)
  "total": number     // Total spins remaining
}
```

---

## 9. `freeSpinRetrigger` Event

**Source:** `typesBookEvent.ts:69-73`, `bookEventHandlerMap.ts:247-261`

Sent when 3+ scatters appear during free spins.

```typescript
{
  "index": number,
  "type": "freeSpinRetrigger",
  "totalFs": number   // NEW total free spins (current + 5)
}
```

---

## 10. `freeSpinEnd` Event

**Source:** `typesBookEvent.ts:56-61`, `bookEventHandlerMap.ts:262-302`

Free spins feature complete.

```typescript
{
  "index": number,
  "type": "freeSpinEnd",
  "amount": number,     // Total win from all free spins (in cents)
  "winLevel": number    // 0-10 (see Win Levels table)
}
```

---

## 11. `setTotalWin` Event

**Source:** `typesBookEvent.ts:36-40`, `bookEventHandlerMap.ts:144-146`

```typescript
{
  "index": number,
  "type": "setTotalWin",
  "amount": number    // Total win amount (in cents)
}
```

---

## 12. `setWin` Event

**Source:** `typesBookEvent.ts:101-106`, `bookEventHandlerMap.ts:395-410`

Triggers big win celebration during tumbles.

```typescript
{
  "index": number,
  "type": "setWin",
  "amount": number,     // Win amount (in cents)
  "winLevel": number    // 6-10 (only sent for big wins)
}
```

---

## 13. `finalWin` Event

**Source:** `typesBookEvent.ts:95-99`, `bookEventHandlerMap.ts:411-415`

**MUST be the last event in every round.**

```typescript
{
  "index": number,
  "type": "finalWin",
  "amount": number    // Final total win (in cents)
}
```

---

## Win Levels

**Source:** `winLevelMap.ts`

| Level | Alias | Trigger (× bet) |
|-------|-------|-----------------|
| 0-5 | — | Small wins (no animation) |
| 6 | big | 20× |
| 7 | super | 50× |
| 8 | mega | 100× |
| 9 | epic | 250× |
| 10 | max | 1000× (max win cap) |

---

## Event Sequences

### Base Game - No Win

```
reveal (gameType: "basegame")
finalWin (amount: 0)
```

### Base Game - Single Tumble Win

```
reveal
winInfo
updateTumbleWin
tumbleBoard
finalWin
```

### Base Game - Multiple Tumbles

```
reveal
winInfo              ← First cluster
updateTumbleWin
tumbleBoard
winInfo              ← Second cluster (new symbols created matches)
updateTumbleWin
tumbleBoard
finalWin
```

### Base Game - Tumble with Bombs (Free Spins)

```
reveal (gameType: "freegame")
winInfo
updateTumbleWin      ← Pre-bomb amount
boardMultiplierInfo  ← Bombs activate
updateTumbleWin      ← Post-bomb amount (tumbleWin × boardMult)
tumbleBoard
```

### Feature Trigger

```
reveal (gameType: "basegame")
winInfo              ← Optional, if clusters also won
updateTumbleWin
freeSpinTrigger      ← 4+ scatters detected
enterBonus           ← "regular" or "super"
```

### Free Spin Round

```
updateFreeSpin (amount: 1, total: 10)
reveal (gameType: "freegame")
winInfo
updateTumbleWin
[boardMultiplierInfo if bombs]
[updateTumbleWin if bombs]
tumbleBoard
[repeat if more matches]
```

### Free Spins Complete

```
[last free spin events]
freeSpinEnd
finalWin
```

### Retrigger During Free Spins

After 3+ scatters appear in a free spin:
```
winInfo              ← May include scatter win
updateTumbleWin
freeSpinRetrigger    ← totalFs = current remaining + 5
tumbleBoard
```

### Buy Bonus

Same as regular feature, but:
- `reveal` comes immediately after purchase
- Use `gameType: "freegame"` from first reveal

---

## Bet Modes

**Source:** `config.ts:3-11`

| Mode | Cost Multiplier |
|------|-----------------|
| `base` | 1× |
| `bonus_hunt` | 3× |
| `regular_buy` | 100× |
| `super_buy` | 500× |

---

## Common Errors and Fixes

### Error: `Cannot read properties of undefined (reading 'name')`

**Cause:** Null or missing symbols in board/newSymbols

**Fix:**
- `reveal.board` must have exactly 6 reels × 7 symbols
- Every symbol must have `{"name": "..."}`
- `tumbleBoard.newSymbols` must have exactly 6 arrays

### Error: `Symbol M_0 not found`

**Cause:** M symbol missing multiplier or has multiplier: 0

**Fix:** All M symbols must have `multiplier` with value 2-1000

### Error: Clusters appear one row above actual position

**Cause:** Using row 0-4 instead of 1-5

**Fix:** Add 1 to all row values in positions

### Error: Free spin outro stuck

**Cause:** Missing `freeSpinEnd` event

**Fix:** Always send `freeSpinEnd` with `amount` and `winLevel` before `finalWin`

### Error: Wrong symbols explode

**Cause:** `explodingSymbols` doesn't match `winInfo.wins[].positions`

**Fix:** `explodingSymbols` should be the union of all winning positions

---

## Validation Checklist

Before sending each event, verify:

### `reveal`
- [ ] `board.length === 6`
- [ ] Each `board[n].length === 7`
- [ ] Every symbol has `{"name": "..."}`
- [ ] M symbols have `{"name": "M", "bomb": true, "multiplier": <2-1000>}`
- [ ] `paddingPositions === [0,0,0,0,0,0]`

### `winInfo`
- [ ] All `positions[].row` are 1-5
- [ ] All `overlay.row` are 1-5
- [ ] Cluster has 8+ positions
- [ ] `totalWin` = sum of all `wins[].win`

### `tumbleBoard`
- [ ] All `explodingSymbols[].row` are 1-5
- [ ] `newSymbols.length === 6`
- [ ] Each reel's newSymbols count = that reel's exploded count
- [ ] Every new symbol has `{"name": "..."}`

### `boardMultiplierInfo`
- [ ] All `positions[].row` are 1-5
- [ ] `totalWin === tumbleWin × boardMult`

### `freeSpinTrigger`
- [ ] All `positions[].row` are 1-5
- [ ] `totalFs` is the total spins awarded

### `freeSpinEnd`
- [ ] `winLevel` is 0-10
- [ ] `amount` is total from all free spins
- [ ] Sent BEFORE `finalWin`

### Every Round
- [ ] Events have sequential `index` values
- [ ] `finalWin` is always the LAST event
- [ ] No null values anywhere

---

## Example: Complete Base Game Win

```json
{
  "state": [
    {
      "index": 1,
      "type": "reveal",
      "gameType": "basegame",
      "paddingPositions": [0, 0, 0, 0, 0, 0],
      "board": [
        [{"name": "L1"}, {"name": "H1"}, {"name": "H1"}, {"name": "L2"}, {"name": "L3"}, {"name": "H1"}, {"name": "L4"}],
        [{"name": "L2"}, {"name": "H1"}, {"name": "H1"}, {"name": "L1"}, {"name": "L4"}, {"name": "H1"}, {"name": "L5"}],
        [{"name": "L3"}, {"name": "H1"}, {"name": "L3"}, {"name": "L2"}, {"name": "L1"}, {"name": "H1"}, {"name": "L1"}],
        [{"name": "L4"}, {"name": "L4"}, {"name": "L2"}, {"name": "L3"}, {"name": "L2"}, {"name": "L3"}, {"name": "L2"}],
        [{"name": "L5"}, {"name": "L5"}, {"name": "L4"}, {"name": "L4"}, {"name": "L3"}, {"name": "L4"}, {"name": "L3"}],
        [{"name": "H2"}, {"name": "H2"}, {"name": "L5"}, {"name": "L5"}, {"name": "L4"}, {"name": "L5"}, {"name": "L4"}]
      ]
    },
    {
      "index": 2,
      "type": "winInfo",
      "totalWin": 150,
      "wins": [
        {
          "symbol": "H1",
          "win": 150,
          "positions": [
            {"reel": 0, "row": 1}, {"reel": 0, "row": 2}, {"reel": 0, "row": 5},
            {"reel": 1, "row": 1}, {"reel": 1, "row": 2}, {"reel": 1, "row": 5},
            {"reel": 2, "row": 1}, {"reel": 2, "row": 5}
          ],
          "meta": {
            "clusterMult": 1,
            "winWithoutMult": 150,
            "overlay": {"reel": 1, "row": 2}
          }
        }
      ]
    },
    {
      "index": 3,
      "type": "updateTumbleWin",
      "amount": 150
    },
    {
      "index": 4,
      "type": "tumbleBoard",
      "explodingSymbols": [
        {"reel": 0, "row": 1}, {"reel": 0, "row": 2}, {"reel": 0, "row": 5},
        {"reel": 1, "row": 1}, {"reel": 1, "row": 2}, {"reel": 1, "row": 5},
        {"reel": 2, "row": 1}, {"reel": 2, "row": 5}
      ],
      "newSymbols": [
        [{"name": "L2"}, {"name": "L3"}, {"name": "L4"}],
        [{"name": "L5"}, {"name": "H2"}, {"name": "L1"}],
        [{"name": "H3"}, {"name": "L2"}],
        [],
        [],
        []
      ]
    },
    {
      "index": 5,
      "type": "finalWin",
      "amount": 150
    }
  ]
}
```

---

## Example: Free Spin with Bombs

```json
{
  "index": 15,
  "type": "reveal",
  "gameType": "freegame",
  "paddingPositions": [0, 0, 0, 0, 0, 0],
  "board": [
    [{"name": "L1"}, {"name": "H1"}, {"name": "H1"}, {"name": "H1"}, {"name": "L2"}, {"name": "L3"}, {"name": "L4"}],
    [{"name": "L2"}, {"name": "H1"}, {"name": "H1"}, {"name": "M", "bomb": true, "multiplier": 50}, {"name": "L1"}, {"name": "L4"}, {"name": "L5"}],
    [{"name": "L3"}, {"name": "H1"}, {"name": "H1"}, {"name": "L3"}, {"name": "L2"}, {"name": "L1"}, {"name": "L1"}],
    [{"name": "L4"}, {"name": "L4"}, {"name": "L2"}, {"name": "L3"}, {"name": "L2"}, {"name": "L3"}, {"name": "L2"}],
    [{"name": "L5"}, {"name": "L5"}, {"name": "L4"}, {"name": "L4"}, {"name": "L3"}, {"name": "L4"}, {"name": "L3"}],
    [{"name": "H2"}, {"name": "H2"}, {"name": "L5"}, {"name": "L5"}, {"name": "L4"}, {"name": "L5"}, {"name": "L4"}]
  ]
}
```

Then after winInfo/updateTumbleWin:

```json
{
  "index": 18,
  "type": "boardMultiplierInfo",
  "multInfo": {
    "positions": [
      {"reel": 1, "row": 3, "multiplier": 50, "name": "M"}
    ]
  },
  "winInfo": {
    "tumbleWin": 200,
    "boardMult": 50,
    "totalWin": 10000
  }
}
```

---

*Document generated from frontend source code. If something doesn't work, share the exact error message and event payload.*

