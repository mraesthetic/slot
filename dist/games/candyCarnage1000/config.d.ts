import { GameMode, GameSymbol, type InferGameType } from '@slot-engine/core';
type CandyCarnageBonusType = 'regular' | 'super';
declare const symbols: {
    H1: GameSymbol;
    H2: GameSymbol;
    H3: GameSymbol;
    H4: GameSymbol;
    L1: GameSymbol;
    L2: GameSymbol;
    L3: GameSymbol;
    L4: GameSymbol;
    L5: GameSymbol;
    S: GameSymbol;
    BS: GameSymbol;
    M: GameSymbol;
};
declare const userState: {
    activeBonus: CandyCarnageBonusType | null;
    freespinsRemaining: number;
    totalBonusSpinsAwarded: number;
    bonusMultiplierStack: number[];
};
declare const gameModes: {
    base: GameMode;
    bonus_hunt: GameMode;
    regular_buy: GameMode;
    super_buy: GameMode;
};
export type CandyCarnage1000Game = InferGameType<typeof gameModes, typeof symbols, typeof userState>;
export declare const candyCarnage1000Game: CandyCarnage1000Game;
export { gameModes, symbols, userState };
//# sourceMappingURL=config.d.ts.map