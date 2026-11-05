// Leaf module (no imports) so game-engine and trading-automation can share these
// constants without a circular-import evaluation-order bug.
export const MARKET_OPEN_MINUTE = 570; // 9:30 AM
export const MARKET_SESSION_MINUTES = 390;
export const MARKET_CLOSE_MINUTE = MARKET_OPEN_MINUTE + MARKET_SESSION_MINUTES; // 4:00 PM
export const MINUTES_PER_DAY = 1440;
