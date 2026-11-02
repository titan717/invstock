# InvStock Full Simulator Feature-Parity Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore every simulator subsystem from the original Ticker browser game inside the Next.js InvStock app, with reliable charting, complete company branding, legacy-save migration and polished green/red glow styling.

**Architecture:** Keep the App Router UI and extract all game rules into deterministic TypeScript modules. A versioned simulator state owns portfolio, market snapshots, savings, loans, buildings, activity, achievements, watchlists, settings, market events, rumours, dividends and progression. A compatibility adapter reads the original `ticker_game_v1` save and converts it without discarding holdings or progress. React components consume typed selectors/actions; charts use actual persisted OHLC/history series rather than synthetic UI-only lines.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Recharts, Vitest and Testing Library.

## Global Constraints

- Keep work on `feat/invstock-nextjs-rebuild`; do not merge or modify `main`.
- Preserve the five primary tabs: Home, Discovery, Options, News and Account. Put Bank, Buildings, Achievements and Settings in accessible Account subviews rather than removing the primary navigation.
- All prices, events, options, news and fills remain simulated. Do not imply live exchange data or brokerage execution.
- Preserve original game mechanics and legacy save data, including the `ticker_game_v1` storage key, holdings/cost basis, savings, loans, buildings, market snapshot, histories, settings, achievements, watchlist, activity, PRNG seed and pending rumours.
- Every company/ETF shown must have a logo asset lookup with an accessible ticker fallback; failed remote logo loads must never leave an empty mark.
- Positive chart/price states use the green palette and glow; negative states use the red palette and glow. Avoid applying positive glow to neutral or negative data.
- All charts must use their selected range's underlying series, update as the simulated market advances, resize responsively and handle empty/flat/single-point datasets.
- Maintain keyboard focus visibility, reduced-motion support, safe-area padding and mobile/desktop responsiveness.
- Add deterministic tests for business rules; use injected seeds/timestamps instead of flaky wall-clock assertions.

---

### Task 1: Domain engine and legacy save compatibility

**Files:**
- Create: `src/lib/game-engine.ts`
- Create: `src/lib/game-engine.test.ts`
- Modify: `src/lib/simulator.ts`
- Modify: `src/lib/simulator.test.ts`

**Interfaces:**
- `createGameState(seed?: number): GameState`
- `migrateLegacySave(raw: unknown, market: Stock[]): GameState`
- `calculateNetWorth(state: GameState, market: Stock[]): number`
- `executeGameTrade(state, market, ticker, side, quantity): GameActionResult`
- `bankAction(state, market, action, amount): GameActionResult`
- `buildingAction(state, market, action, buildingId): GameActionResult`
- `advanceGameDay(state, market): { state: GameState; market: Stock[]; events: MarketEvent[] }`

- [ ] **Step 1: Add focused failing tests**
  - A legacy save with cash, fractional holdings, costs, savings, loan, buildings, achievements, watchlist, settings and market snapshot migrates without losing those values.
  - Net worth includes cash, holdings at current prices, savings and property value, less debt.
  - Deposit/withdraw/borrow/repay reject invalid amounts and preserve state on failure.
  - Building buy/upgrade/sell update cash, level, value and income using the original game rules.
  - A new market day credits savings interest, accrues 12% APR loan interest, applies the minimum payment and late-fee/margin-call rules.
  - A dividend-paying holding receives the simulated daily dividend credit once per market day.
- [ ] **Step 2: Verify the relevant failure**
  - Run: `npm test -- src/lib/game-engine.test.ts`
  - Expected: module/export failures proving the full engine is not present.
- [ ] **Step 3: Implement the minimum domain engine**
  - Define typed versioned state and action result contracts.
  - Preserve the original five achievements, building catalog, 35% net-worth credit limit, 3.5% savings APY, 12% loan APR, 2% daily minimum loan payment, 1% missed-payment penalty, property upgrade/sale multipliers and trading spread/fee.
  - Preserve market regime, sector factors, OHLC candles, daily history, news and rumor resolution state.
  - Add dividend accrual with a per-day ledger to prevent duplicate credits.
  - Migrate malformed or partial saves defensively; unknown tickers are retained in an orphaned-position list rather than silently deleted.
- [ ] **Step 4: Verify the focused pass**
  - Run: `npm test -- src/lib/game-engine.test.ts`
  - Expected: all engine behavior tests pass.
- [ ] **Step 5: Run integration checks**
  - Run: `npm test` and `npm run lint`
  - Expected: existing trade tests and new game-engine tests pass; TypeScript has no errors.
- [ ] **Step 6: Commit**
  - `feat: restore full simulator domain engine`

### Task 2: Persistent runtime, market events and progression

**Files:**
- Create: `src/lib/game-runtime.ts`
- Create: `src/lib/game-runtime.test.ts`
- Modify: `src/components/invstock-app.tsx`
- Modify: `src/lib/simulator.ts`

**Interfaces:**
- `loadGameState(storage): GameState`
- `saveGameState(storage, state): SaveResult`
- `tickGame(state, market, elapsedTicks): GameTickResult`
- `evaluateAchievements(state, market): AchievementUnlock[]`
- `resolveRumours(state, market, absoluteSimTick): MarketEvent[]`

- [ ] **Step 1: Add focused failing tests**
  - Load the original key before creating a new save and migrate it once to the new versioned key.
  - Saving/reloading retains market snapshot, random seed, event schedule, chart history and pending rumours.
  - Macro events affect the broad market; sector events affect only the chosen sector; single-company events affect only named tickers.
  - Rumours resolve after their scheduled simulated tick as confirmed or debunked and cannot resolve twice.
  - Diamond Hands unlocks only after actual holding duration reaches seven simulated days; First Profit, Landlord, Margin Called and Millionaire unlock from their real conditions.
  - Pause and hidden-tab states do not advance simulated time; supported speed multipliers advance deterministic tick counts.
- [ ] **Step 2: Verify red**
  - Run: `npm test -- src/lib/game-runtime.test.ts`
  - Expected: missing runtime exports/tests fail for the expected missing behavior.
- [ ] **Step 3: Implement runtime**
  - Move all interval/tick behavior out of the component; inject clock and random source.
  - Keep saved market histories bounded (390 intraday and 3,650 daily points) and serialize market state, pending news, PRNG state and next event timestamp.
  - Add dividend credits, property income and bank day-rollover processing.
- [ ] **Step 4: Verify green**
  - Run: `npm test -- src/lib/game-runtime.test.ts`
  - Expected: migration, event, progression, pause and speed tests pass.
- [ ] **Step 5: Run integration checks**
  - Run: `npm test` and `npm run lint`
  - Expected: all domain/runtime tests pass and UI compiles.
- [ ] **Step 6: Commit**
  - `feat: restore persistent market simulation and progression`

### Task 3: Complete game surfaces in the five-tab app

**Files:**
- Create: `src/components/account/BankPanel.tsx`
- Create: `src/components/account/BuildingsPanel.tsx`
- Create: `src/components/account/AchievementsPanel.tsx`
- Create: `src/components/account/SettingsPanel.tsx`
- Create: `src/components/charts/PortfolioChart.tsx`
- Create: `src/components/charts/StockChart.tsx`
- Modify: `src/components/invstock-app.tsx`

**Interfaces:**
- Account panels receive typed `GameState`, `Stock[]` and action callbacks.
- Chart components receive typed series, range, selected point and positive/negative trend.
- The five bottom tabs remain persistent; account panels are selected by Account sub-navigation.

- [ ] **Step 1: Add focused failing UI tests**
  - Bank actions show balances and expose deposit, withdraw, borrow and repay with validation.
  - Buildings show owned assets/catalog and expose buy, upgrade and sell.
  - Achievements show locked/unlocked status and best net worth.
  - Settings expose speed, sound, haptics, save export/import and reset confirmation.
  - Chart range controls change the actual displayed series; chart line, gradient and tooltip switch green/red based on selected range performance.
  - Stock chart renders candlesticks and line mode from OHLC data and has all range controls.
- [ ] **Step 2: Verify red**
  - Run: `npm test -- src/components`
  - Expected: tests fail because the missing full-game panels and chart contracts are not present.
- [ ] **Step 3: Implement UI surfaces**
  - Add accessible forms and explicit confirmation for reset/import; no browser prompt dialogs.
  - Use Recharts responsive containers and preserve chart history from the game engine.
  - Add green/red line, area fill, endpoint marker, tooltip and subtle matching glow.
  - Keep chart labels readable and avoid clipping on narrow screens.
- [ ] **Step 4: Verify green**
  - Run: `npm test -- src/components`
  - Expected: panels and chart interactions pass.
- [ ] **Step 5: Run integration checks**
  - Run: `npm test`, `npm run lint`, `npm run build`
  - Expected: all UI/domain tests pass and Next.js production build succeeds.
- [ ] **Step 6: Commit**
  - `feat: restore bank buildings achievements and interactive charts`

### Task 4: Company identity, visual polish and end-to-end regression

**Files:**
- Create: `src/lib/company-logos.ts`
- Create: `src/components/market/CompanyLogo.tsx`
- Create: `src/components/market/CompanyLogo.test.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/invstock-app.tsx`
- Modify: `README.md`

**Interfaces:**
- `companyLogoFor(ticker): { domain?: string; simpleIcon?: string; fallback: string }`
- `CompanyLogo({ ticker, name, size, className }): JSX.Element`

- [ ] **Step 1: Add focused failing tests**
  - Every ticker in the full market universe resolves to a known logo/domain mapping or visible ticker fallback.
  - Image load failure switches to fallback and never renders an empty image container.
  - Positive and negative chart states expose the correct semantic classes and glow tokens.
  - All stock lists, search, holdings, watchlists, news and order surfaces render the same logo component.
- [ ] **Step 2: Verify red**
  - Run: `npm test -- src/components/market/CompanyLogo.test.tsx`
  - Expected: missing component/mapping exports fail.
- [ ] **Step 3: Implement logos and glow**
  - Centralize brand domains and Simple Icons slugs for every stock/ETF; use deterministic ticker initials when remote assets are missing.
  - Add semantic `--gain-glow` and `--loss-glow` tokens and use them only for positive/negative states.
  - Add reduced-motion-safe glow and price pulse styles.
- [ ] **Step 4: Verify green**
  - Run: `npm test -- src/components/market/CompanyLogo.test.tsx`
  - Expected: every market ticker resolves and broken logos fall back.
- [ ] **Step 5: Final integration checks**
  - Run: `npm test`, `npm run lint`, `npm run build`.
  - Expected: all automated checks pass. Verify preview manually at mobile and desktop widths before marking the PR ready.
- [ ] **Step 6: Commit**
  - `feat: complete company branding and gain-loss chart polish`

## Unresolved product decisions

- Save import conflict policy: recommendation is to show a preview and require explicit confirmation before replacing the current save.
- Cross-device/cloud save: the current app has browser-local saves only; account authentication and a database are not present, so cloud sync is outside this migration unless separately requested.
- Logo delivery: recommendation is Simple Icons CDN with official-domain favicon fallback and ticker initials; no paid logo API key is assumed.
