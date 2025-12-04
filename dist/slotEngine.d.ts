export type SymbolName = 'H1' | 'H2' | 'H3' | 'H4' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'W' | 'S' | 'BS' | 'M';
export type SymbolCategory = 'high' | 'low' | 'wild' | 'scatter' | 'bomb';
export interface SymbolDefinition {
    name: SymbolName;
    category: SymbolCategory;
    description: string;
    scatter?: boolean;
    bomb?: boolean;
}
export interface ClusterTier {
    min: number;
    max: number | null;
    multiplier: number;
}
export interface PaytableEntry {
    symbol: Extract<SymbolName, 'H1' | 'H2' | 'H3' | 'H4' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5'>;
    tiers: ClusterTier[];
}
export interface ScatterPay {
    count: number;
    multiplier: number;
}
export interface GridConfig {
    reels: number;
    rows: number;
    paddingRows: number;
}
export interface ClusterConfig {
    minSize: number;
    adjacency: 'orthogonal';
}
export interface TumbleConfig {
    enabled: boolean;
    boardPaddingRows: number;
}
export interface BetMode {
    id: 'base' | 'bonus_hunt' | 'regular_buy' | 'super_buy';
    costMultiplier: number;
    description: string;
}
export type BonusType = 'regular' | 'super';
export interface BonusConfig {
    type: BonusType;
    trigger: string;
    initialSpins: number;
    retriggerRequirement: number;
    retriggerSpins: number;
    bombMultipliers: number[];
}
export interface WinLevel {
    id: number;
    name: string;
    minMultiplier: number;
    maxMultiplier: number | null;
    animation: 'none' | 'big' | 'superwin' | 'mega' | 'epic' | 'max';
}
export interface GameConfig {
    id: string;
    title: string;
    rtp: number;
    volatility: string;
    maxWinMultiplier: number;
    grid: GridConfig;
    cluster: ClusterConfig;
    tumble: TumbleConfig;
    symbols: SymbolDefinition[];
    paytable: PaytableEntry[];
    scatterPays: ScatterPay[];
    betModes: BetMode[];
    bonuses: BonusConfig[];
    winLevels: WinLevel[];
}
export interface SlotGameRuntime {
    config: GameConfig;
    describe(): string;
}
export declare class SlotEngineConfigError extends Error {
    constructor(message: string);
}
export declare function createSlotGame(config: GameConfig): SlotGameRuntime;
//# sourceMappingURL=slotEngine.d.ts.map