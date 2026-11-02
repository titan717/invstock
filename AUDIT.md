# Ticker code audit and UI refresh

Branch: `feat/robinhood-dark-ui`

## Scope

Reviewed the complete standalone `index.html` (inline CSS and vanilla JavaScript). The application remains a single-file, no-build-step browser game. No framework or package dependency was introduced.

## Implemented in this branch

### Visual refresh
- Reworked the palette to a near-black trading interface with Robinhood-inspired green gains and red losses.
- Added a responsive market-card grid, more consistent card padding, stronger financial hierarchy and a daily market-mover card.
- Added a compact custom Ticker mark.
- Added company marks via the Simple Icons CDN, with Google favicon fallback and ticker initials if network assets are unavailable.
- Kept the game usable offline; only remote logo images need a connection.

### Logic and correctness fixes
- New games now size the seeded positions from current seeded prices and allocate the remaining cash so starting net worth is exactly $10,000.
- Seeded portfolio history is derived from the generated OHLC history rather than a separate unrelated random line.
- Portfolio chart windows now use intraday history for 1D/1W and daily history for 1M/1Y/ALL. The live history is bounded; daily portfolio history is capped at 3,650 points.
- Stock detail chart windows now use 78 five-minute candles for 1D, 390 for 1W, 30 daily candles for 1M, 252 for 1Y, and available daily history for ALL.
- Stock daily percentage changes are calculated against the current session open; market cap is calculated from fixed shares outstanding and current price.
- Added shares outstanding to the stock fundamentals grid.
- Reduced saved per-stock candle history to 390 intraday bars and 400 daily bars to keep localStorage snapshots bounded.
- Added an absolute simulated-tick clock for rumor aftermath so rumors resolve correctly across market-day rollover.
- Macro events now affect the broad market; sector events affect all companies in the selected sector.
- Diamond Hands now checks actual holding duration rather than simply elapsed time after any trade.
- Missed loan payments now incur a late fee; margin-call handling also covers the no-stock-holdings case. Borrowing is capped by net worth rather than an arbitrary minimum credit floor.
- Order-slider maximums now account for spread and fees.
- Pausing or hiding the page stops the animation loop; resuming restarts it without replaying the hidden interval twice.
- Canvas dimensions are only reset when their rendered size changes, reducing redraw churn during chart scrubbing.
- Persisted the PRNG state and next event time so reloads do not restart the same random sequence or reset the news timer.

## Remaining limitations and recommended next work

1. **Real browser QA is still required.** Verify Android Chrome, iOS Safari, desktop Chrome/Firefox, keyboard navigation, touch scrubbing, modal focus/escape handling, and all buy/sell/bank/building flows. Static syntax checks are not a substitute for browser testing.
2. **Chart range transitions still redraw the canvas.** A true interpolated path morph and richer axis/date labels would improve polish.
3. **Remote logos are best-effort.** Simple Icons does not cover every corporate identity; Google favicon and ticker fallbacks prevent broken empty avatars. For broad ticker coverage, evaluate a stock-logo API such as Logo.dev and configure its publishable key and attribution appropriately.
4. **All market prices and news are simulated.** Familiar company tickers/logos do not mean the game uses live quotes or real company fundamentals.
5. **Dividend yield is displayed but dividends are not yet credited.** Add a scheduled dividend-payment mechanic if it should affect the strategy loop.
6. **Property valuations are not yet dynamically marked to market.** Building income responds to regimes, but resale value could also fluctuate with rates, recession and property demand.
7. **Add automated browser smoke tests.** At minimum test fresh-game net worth = $10,000, fee-aware max buy, insufficient cash, overselling, daily rollover, rumor confirmation/debunking, missed payment, margin liquidation, and localStorage recovery after malformed or quota-failed data.
8. **Consider export/import save data.** The game currently saves locally to the current browser profile; users can lose progress if they clear site data or switch devices.

## Asset notes

- Company logo icons use the documented Simple Icons CDN URL pattern. Brand marks are trademarks of their respective owners; keep their use nominative and review the applicable Simple Icons legal guidance.
- The Google favicon endpoint is a fallback only. Both remote sources are optional; initials remain as the offline fallback.
- No logo API secret or external runtime library is embedded in the page.
