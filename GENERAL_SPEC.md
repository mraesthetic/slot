# Candy Carnage 1000 - Game Mechanics Reference

**For Backend Team Confirmation**

---

## Table of Contents
1. [Game Overview](#1-game-overview)
2. [Board Layout](#2-board-layout)
3. [Symbols](#3-symbols)
4. [Paytable](#4-paytable)
5. [Cluster Wins](#5-cluster-wins)
6. [Tumble Mechanic](#6-tumble-mechanic)
7. [Scatter & Bonus Trigger](#7-scatter--bonus-trigger)
8. [Free Spins (Bonus)](#8-free-spins-bonus)
9. [Super Bonus](#9-super-bonus)
10. [Multiplier Bombs](#10-multiplier-bombs)
11. [Bet Modes](#11-bet-modes)
12. [Win Levels](#12-win-levels)
13. [Win Caps & Limits](#13-win-caps--limits)
14. [Event Sequence Examples](#14-event-sequence-examples)

---

## 1. Game Overview

| Property | Value |
|----------|-------|
| **Game Type** | Cluster Pay (Tumble/Cascade) |
| **Grid Size** | 6 reels × 5 visible rows |
| **RTP** | 96.2% |
| **Volatility** | Medium to Very High |
| **Max Win** | 25,000× bet |
| **Cluster Minimum** | 8+ matching symbols |

---

## 2. Board Layout

### Grid Structure
```
Reel:    0     1     2     3     4     5
       ┌─────┬─────┬─────┬─────┬─────┬─────┐
Row 0  │     │     │     │     │     │     │
       ├─────┼─────┼─────┼─────┼─────┼─────┤
Row 1  │     │     │     │     │     │     │
       ├─────┼─────┼─────┼─────┼─────┼─────┤
Row 2  │     │     │     │     │     │     │
       ├─────┼─────┼─────┼─────┼─────┼─────┤
Row 3  │     │     │     │     │     │     │
       ├─────┼─────┼─────┼─────┼─────┼─────┤
Row 4  │     │     │     │     │     │     │
       └─────┴─────┴─────┴─────┴─────┴─────┘
```

- **Reels**: 0-5 (left to right)
- **Rows**: 0-4 (top to bottom)
- **Total Positions**: 30 symbols on screen

### Padding Rows
Backend sends boards with **padding rows** (top and bottom) for tumble mechanics:
- Actual array: 7 rows per reel (1 top padding + 5 visible + 1 bottom padding)
- Positions in events use **visible row indices (0-4)** unless otherwise specified

---

## 3. Symbols

### Regular Pay Symbols

| Name | Type | Description |
|------|------|-------------|
| `H1` | High Pay | Premium Symbol 1 (Highest pay) |
| `H2` | High Pay | Premium Symbol 2 |
| `H3` | High Pay | Premium Symbol 3 |
| `H4` | High Pay | Premium Symbol 4 |
| `L1` | Low Pay | Low Symbol 1 |
| `L2` | Low Pay | Low Symbol 2 |
| `L3` | Low Pay | Low Symbol 3 |
| `L4` | Low Pay | Low Symbol 4 |
| `L5` | Low Pay | Low Symbol 5 |

### Special Symbols

| Name | Type | Description |
|------|------|-------------|
| `S` | Scatter | Regular scatter - triggers Bonus |
| `BS` | Super Scatter | Golden scatter - triggers Super Bonus |
| `M` | Multiplier Bomb | Appears in Free Spins only |

### Symbol Object Format
```json
{
  "name": "H1"
}

// Scatter
{
  "name": "S",
  "scatter": true
}

// Super Scatter
{
  "name": "BS",
  "scatter": true
}

// Multiplier Bomb (in reveal event)
{
  "name": "M",
  "bomb": true,
  "multiplier": 50
}
```

**Important**: `M` symbols MUST include the `multiplier` field in the `reveal` event so frontend can display the value.

---

## 4. Paytable

All payouts are **multiplied by bet amount**.

### High Pay Symbols

| Symbol | 12+ | 10-11 | 8-9 |
|--------|-----|-------|-----|
| H1 | 50× | 25× | 10× |
| H2 | 25× | 10× | 2.5× |
| H3 | 15× | 5× | 2× |
| H4 | 12× | 2× | 1.5× |

### Low Pay Symbols

| Symbol | 12+ | 10-11 | 8-9 |
|--------|-----|-------|-----|
| L1 | 10× | 1.5× | 1× |
| L2 | 8× | 1.2× | 0.8× |
| L3 | 5× | 1× | 0.5× |
| L4 | 4× | 0.9× | 0.4× |
| L5 | 2× | 0.75× | 0.25× |

### Scatter Payouts

| Scatters | Payout |
|----------|--------|
| 4 | 0× (triggers bonus only) |
| 5 | 5× bet |
| 6 | 100× bet |

**Note**: Scatter payouts are awarded BEFORE entering free spins (except buy bonus modes).

---

## 5. Cluster Wins

### Rules
1. **Minimum 8** matching symbols anywhere on the grid form a winning cluster
2. Symbols must be **adjacent** (horizontally or vertically connected)
3. **Diagonal does NOT count** as adjacent
4. Scatters (`S`, `BS`) do NOT substitute - they have their own payout

### Example Cluster
```
  0   1   2   3   4   5
┌───┬───┬───┬───┬───┬───┐
│ H1│ H1│ H1│   │   │   │  ← 3 H1s
├───┼───┼───┼───┼───┼───┤
│ H1│ H1│   │   │   │   │  ← 2 H1s connected
├───┼───┼───┼───┼───┼───┤
│ H1│ H1│ H1│   │   │   │  ← 3 H1s connected
└───┴───┴───┴───┴───┴───┘
Total: 8 H1 symbols = WINNING CLUSTER (8-9 tier payout)
```

---

## 6. Tumble Mechanic

After every winning cluster:

1. **Winning symbols explode** and are removed from the grid
2. **Symbols above fall down** to fill empty spaces
3. **New symbols fall in** from the top to fill remaining spaces
4. **Check for new wins** - repeat until no more wins

### Event Sequence Per Tumble
```
1. winInfo        → Cluster win details
2. updateTumbleWin → Running total
3. tumbleBoard    → Exploding positions + new symbols
4. reveal         → New board state (optional, for validation)
```

### Tumble Win Accumulation
- Each tumble's win **adds** to the running tumble total
- Displayed to player as cumulative win
- Final tumble win = sum of all individual cluster wins in that spin

---

## 7. Scatter & Bonus Trigger

### Scatter Appearance
- `S` (Scatter) can appear on **any reel** in base game
- **Maximum 1 scatter per reel** (never 2 scatters on same reel)
- `BS` (Super Scatter) appears in **base game only**, max 1 per board

### Trigger Conditions

| Condition | Result |
|-----------|--------|
| 4+ `S` symbols | Regular Bonus (10 free spins) |
| 3+ `S` + 1 `BS` | Super Bonus (10 free spins, better bombs) |

### Trigger Flow
```
1. Spin reveals 4+ scatters
2. winInfo → scatter positions animate
3. Scatter payout awarded (if 5-6 scatters)
4. freeSpinTrigger event → frontend shows intro
5. enterBonus event → confirms bonus type
6. Free spins begin
```

---

## 8. Free Spins (Bonus)

### Regular Bonus
- **Trigger**: 4+ `S` scatter symbols
- **Initial Spins**: 10
- **Multiplier Bombs**: Appear with values 2×-1000×
- **Retrigger**: 3+ `S` symbols = +5 spins

### Bomb Values in Regular Bonus
Available multipliers: `2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 50, 100, 500, 1000`

### Visual Tiers
| Multiplier | Bomb Type |
|------------|-----------|
| 2-10 | Low (Pink/Red) |
| 12-50 | Mid (Orange) |
| 100-1000 | High (Golden) |

---

## 9. Super Bonus

### Trigger
- 3+ `S` + 1 `BS` (Super Scatter)
- OR buy via `super_buy` mode (500× bet)

### Differences from Regular Bonus
| Feature | Regular Bonus | Super Bonus |
|---------|---------------|-------------|
| Trigger | 4+ S | 3+ S + 1 BS |
| Min Bomb Value | 2× | 20× |
| Golden Bomb Chance | Normal | Increased |
| Initial Spins | 10 | 10 |

### Bomb Values in Super Bonus
- **Minimum**: 20×
- Available: `20, 25, 50, 100, 500, 1000`
- **Increased frequency** of 100×, 500×, 1000× golden bombs

---

## 10. Multiplier Bombs

### Overview
- Only appear during **Free Spins** (regular or super bonus)
- Land on the board as part of winning tumbles
- Multiply the **current tumble win** when they're part of a win

### How They Work
1. Bomb lands on board with a multiplier value
2. If bomb is part of a winning cluster, its multiplier applies
3. **Multiple bombs ADD together** before multiplying
   - Example: 5× bomb + 10× bomb = 15× total multiplier
4. Tumble win × board multiplier = final tumble win

### Event: `boardMultiplierInfo`
```json
{
  "type": "boardMultiplierInfo",
  "multInfo": {
    "positions": [
      { "reel": 2, "row": 2, "multiplier": 50, "name": "M" },
      { "reel": 4, "row": 3, "multiplier": 10, "name": "M" }
    ]
  },
  "winInfo": {
    "tumbleWin": 100,      // Win before bombs
    "boardMult": 60,       // 50 + 10 = 60
    "totalWin": 6000       // 100 × 60 = 6000
  }
}
```

### Important Notes
- Bombs that are NOT part of a winning cluster do NOT apply
- Bomb symbols explode with the win like any other symbol
- New bombs can fall in on subsequent tumbles

---

## 11. Bet Modes

### Available Modes

| Mode | Cost | Description |
|------|------|-------------|
| `base` | 1× | Standard spin |
| `bonus_hunt` | 3× | Higher scatter frequency |
| `regular_buy` | 100× | Buy Regular Bonus |
| `super_buy` | 500× | Buy Super Bonus |

### Base Mode
- Standard gameplay
- All symbols can appear
- Normal scatter frequency

### Bonus Hunt Mode
- 3× bet cost per spin
- **Increased scatter frequency**
- Higher chance to trigger free spins naturally
- Mode persists until player deactivates

### Regular Buy
- 100× bet cost
- Immediately triggers free spins
- Backend sends clamped board with 4 `S` symbols
- **No scatter payout** (goes straight to bonus)
- 10 free spins with standard bomb distribution

### Super Buy
- 500× bet cost
- Immediately triggers super free spins
- Backend sends clamped board with 3 `S` + 1 `BS` symbols
- **No scatter payout** (goes straight to bonus)
- 10 free spins with enhanced bomb distribution (20× minimum)

---

## 12. Win Levels

Used for win celebrations and free spin outro.

| Level | Name | Trigger (× bet) | Animation |
|-------|------|-----------------|-----------|
| 0 | zero | < 2× | None |
| 1 | standard | 2-5× | None |
| 2 | small | 5-10× | None |
| 3 | nice | 10-15× | None |
| 4 | substantial | 15-20× | None |
| 5 | (unused) | - | None |
| 6 | big | 20-50× | Big Win |
| 7 | superwin | 50-100× | Super Win |
| 8 | mega | 100-250× | Mega Win |
| 9 | epic | 250-1000× | Epic Win |
| 10 | max | 1000×+ | MAX WIN |

### Usage
- `setWin` event includes `winLevel` for big win animations during tumbles
- `freeSpinEnd` event includes `winLevel` for bonus outro celebration

---

## 13. Win Caps & Limits

| Limit | Value |
|-------|-------|
| **Max Win** | 25,000× bet |
| **Retrigger Amount** | +5 spins per retrigger |
| **Retrigger Requirement** | 3+ `S` symbols during free spins |

### Win Cap Behavior
When 25,000× is reached:
1. Feature terminates immediately
2. `freeSpinEnd` event sent with `winLevel: 10`
3. MAX WIN celebration plays
4. Remaining spins are forfeited

---

## 14. Event Sequence Examples

### Base Game - Win, No Feature
```
reveal (gameType: "basegame")
  ↓
winInfo (cluster wins)
  ↓
updateTumbleWin
  ↓
tumbleBoard
  ↓
[repeat if more wins]
  ↓
setTotalWin
  ↓
finalWin
```

### Base Game - Feature Trigger
```
reveal (gameType: "basegame")
  ↓
[tumbles if any]
  ↓
winInfo (shows scatter positions)
  ↓
freeSpinTrigger (totalFs: 10, positions: [...])
  ↓
enterBonus (reason: "regular" or "super")
  ↓
[FREE SPINS SEQUENCE]
  ↓
freeSpinEnd (amount, winLevel)
  ↓
finalWin
```

### Free Spin Sequence
```
updateFreeSpin (amount: 1, total: 10)
  ↓
reveal (gameType: "freegame")
  ↓
winInfo
  ↓
updateTumbleWin (pre-bomb)
  ↓
boardMultiplierInfo (if bombs in win)
  ↓
updateTumbleWin (post-bomb)
  ↓
tumbleBoard
  ↓
[repeat for more tumbles]
  ↓
[repeat for each spin]
```

### Retrigger During Free Spins
```
[during a free spin]
  ↓
winInfo (shows 3+ scatter positions)
  ↓
freeSpinRetrigger (totalFs: 15)
  ↓
[continue with updated total]
```

### Buy Bonus Flow
```
/wallet/play (mode: "regular_buy" or "super_buy")
  ↓
reveal (clamped board with scatters)
  ↓
freeSpinTrigger (positions: clamp positions)
  ↓
enterBonus
  ↓
[normal free spin sequence]
```

---

## Summary Checklist for Backend

### Symbols
- [ ] All symbol names match: `H1-H4`, `L1-L5`, `M`, `S`, `BS`
- [ ] `M` symbols include `multiplier` field in reveal event
- [ ] `S` and `BS` include `scatter: true` field
- [ ] Max 1 scatter per reel
- [ ] Max 1 `BS` per board (base game only)
- [ ] `BS` never appears in free spins

### Clusters
- [ ] Minimum 8 symbols to win
- [ ] Adjacent = horizontal/vertical only (no diagonal)

### Payouts
- [ ] Correct paytable values per symbol tier
- [ ] Scatter payouts: 5S=5×, 6S=100×
- [ ] No scatter payout on buy bonus

### Free Spins
- [ ] 10 initial spins
- [ ] Retrigger: 3+ S = +5 spins
- [ ] Regular bonus: bombs 2×-1000×
- [ ] Super bonus: bombs 20×-1000× (min 20×)

### Multipliers
- [ ] Bombs only in free spins
- [ ] Multiple bombs ADD together
- [ ] `boardMultiplierInfo` fires after `winInfo`/`updateTumbleWin`
- [ ] Second `updateTumbleWin` has post-multiplier amount

### Win Levels
- [ ] Correct thresholds for levels 0-10
- [ ] `winLevel` included in `setWin` and `freeSpinEnd`

### Win Cap
- [ ] 25,000× max
- [ ] Feature terminates immediately on cap
- [ ] `winLevel: 10` sent on max win

### Bet Modes
- [ ] `base` = 1× cost
- [ ] `bonus_hunt` = 3× cost
- [ ] `regular_buy` = 100× cost
- [ ] `super_buy` = 500× cost

---

*Document Version: 1.0*
*Game: Candy Carnage 1000*

