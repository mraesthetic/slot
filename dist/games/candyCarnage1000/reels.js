"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReelsForMode = getReelsForMode;
const BASE_REELS = [
    [
        'L1', 'L3', 'L4', 'H2', 'L5', 'L2', 'L3', 'L1', 'L4', 'H3', 'S', 'L2', 'L5', 'L1', 'L4', 'L3', 'H4', 'L2', 'L1',
        'L5', 'H2', 'L3', 'L4', 'L1', 'L2', 'H3', 'L5', 'L4', 'L3', 'L2', 'L1', 'L5', 'H1', 'L3', 'L4', 'L2', 'L5', 'L1',
        'L3', 'L4', 'L2', 'L5', 'L1', 'L3', 'L2', 'L4',
    ],
    [
        'L2', 'L5', 'L1', 'H3', 'L4', 'L2', 'L5', 'L1', 'H2', 'L3', 'L4', 'S', 'L2', 'L5', 'L1', 'H4', 'L3', 'L5', 'L2',
        'L1', 'H3', 'L4', 'L2', 'L5', 'L1', 'H1', 'L3', 'L4', 'L2', 'L5', 'L1', 'H2', 'L3', 'L4', 'L2', 'L5', 'L1', 'H3',
        'L4', 'L2', 'L5', 'L1', 'H4', 'L3', 'L5',
    ],
    [
        'L3', 'L2', 'L4', 'L5', 'H3', 'L1', 'L4', 'L2', 'L5', 'H2', 'L3', 'L4', 'L5', 'L1', 'S', 'L4', 'L2', 'L5', 'H3',
        'L1', 'L4', 'L2', 'L5', 'H2', 'L3', 'L4', 'BS', 'L5', 'L1', 'H4', 'L2', 'L5', 'L3', 'L4', 'L1', 'H1', 'L5', 'L2',
        'L3', 'L4', 'L1', 'H3', 'L5', 'L2', 'L4',
    ],
    [
        'L4', 'L1', 'L5', 'H3', 'L2', 'L4', 'L1', 'L5', 'H2', 'L3', 'L4', 'L1', 'S', 'L5', 'L2', 'H4', 'L3', 'L4', 'L2',
        'L5', 'H3', 'L1', 'L4', 'L2', 'L5', 'H2', 'L3', 'L4', 'L1', 'L5', 'H1', 'L2', 'L4', 'L1', 'L5', 'H3', 'L2', 'L4',
        'L1', 'L5', 'H2', 'L3', 'L4', 'L1', 'L5',
    ],
    [
        'L5', 'L2', 'L3', 'H4', 'L1', 'L5', 'L2', 'L3', 'H2', 'L4', 'L5', 'L2', 'S', 'L3', 'H3', 'L5', 'L2', 'L3', 'H1',
        'L4', 'L5', 'L2', 'L3', 'H2', 'L4', 'L5', 'L1', 'L3', 'H4', 'L2', 'L5', 'L1', 'L3', 'H2', 'L4', 'L5', 'L1', 'L3',
        'H3', 'L4', 'L5', 'L2', 'L3', 'H4', 'L1',
    ],
    [
        'L3', 'L4', 'L2', 'H2', 'L5', 'L3', 'L4', 'L1', 'H3', 'L5', 'L3', 'L4', 'L2', 'S', 'L5', 'L3', 'L4', 'L1', 'H4',
        'L5', 'L3', 'L4', 'L2', 'H3', 'L5', 'L3', 'L4', 'L1', 'H2', 'L5', 'L3', 'L4', 'L2', 'H1', 'L5', 'L3', 'L4', 'L1',
        'H3', 'L5', 'L3', 'L4', 'L2', 'H4', 'L5',
    ],
];
const BONUS_HUNT_REELS = BASE_REELS.map((reel, idx) => {
    const insertPos = ((idx + 1) * 9) % reel.length;
    const nextPos = (insertPos + 13) % reel.length;
    const copy = [...reel];
    copy.splice(insertPos, 0, 'S');
    copy.splice(nextPos, 0, 'S');
    return copy;
});
function addBombsWithoutSuperScatter(reel, bombCount) {
    const filtered = reel.filter((symbol) => symbol !== 'BS');
    const result = [...filtered];
    for (let i = 0; i < bombCount; i += 1) {
        const insertPos = ((i + 1) * 7) % result.length;
        result.splice(insertPos, 0, 'M');
    }
    return result;
}
function emphasizePremiums(reel) {
    return reel.map((symbol, idx) => {
        if (symbol.startsWith('L') && idx % 10 === 0) {
            return idx % 20 === 0 ? 'H1' : 'H2';
        }
        return symbol;
    });
}
const REGULAR_BONUS_REELS = BASE_REELS.map((reel) => addBombsWithoutSuperScatter(reel, 3));
const SUPER_BONUS_REELS_PER_REEL = BASE_REELS.map((reel, idx) => emphasizePremiums(addBombsWithoutSuperScatter(reel, 5 + (idx % 2))));
const MODE_BASE_REELS = {
    base: BASE_REELS,
    bonus_hunt: BONUS_HUNT_REELS,
    regular_buy: BASE_REELS,
    super_buy: BASE_REELS,
};
const MODE_BONUS_REELS = {
    base: REGULAR_BONUS_REELS,
    bonus_hunt: REGULAR_BONUS_REELS,
    regular_buy: REGULAR_BONUS_REELS,
    super_buy: SUPER_BONUS_REELS_PER_REEL,
};
function cloneReels(reels) {
    return reels.map((reel) => [...reel]);
}
function getReelsForMode(mode, type) {
    const reelSet = type === 'base' ? MODE_BASE_REELS[mode] : MODE_BONUS_REELS[mode];
    return cloneReels(reelSet);
}
//# sourceMappingURL=reels.js.map