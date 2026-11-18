// btc-race-24h-20261118-1444 entry: washout dip-turn, full size, tight trail.
//
// Why this bot (exact-fill backtest on the NEW dev window, grade-local verified):
//   The new dev window (24h to the opening) falls -2.8% with one +2.2% recovery
//   mid-window (bars ~268-508). Buy-and-hold loses -$31.63 here, so the v1 bot
//   (buy 75% first batch + 3% trail) loses -$23.86 and FAILS the dev gate.
//   Everything else tested loses too: EMA trend best -$9.97, mean reversion
//   best -$26.31, house baselines -$23.87 (momentum) to -$148.17 (ema-cross).
//   This bot makes +$9.73 on the same window (4 trades, maxDD 1.29%):
//     1. Arm when the close falls >= 2.5% below the highest close seen so far.
//        A 2.5% intraday drawdown is a real washout, not noise; arming earlier
//        (1.2-2.0%) buys dead-cat bounces in the falling market and bleeds.
//     2. Buy 100% of cash when armed and the close turns back above the 12-bar
//        EMA: confirmation, not catching the knife. Full size because the edge
//        is the recovery, and the trail (not size) is the risk control.
//     3. Exit on a 0.75% trailing stop from the highest close since entry.
//        The tight trail banks the recovery before the chop eats it (a 1.5%
//        trail keeps only +$1.37). Re-arm after a 60-bar cooldown.
//     4. Fallback: if nothing was ever bought by batch 720, buy on the first
//        batch whose close is above the 60-bar EMA (trend confirmation), same
//        trail. On the dev window it never fires (dev PnL unchanged +$9.73);
//        on a window with no washout it keeps the bot trading instead of
//        sitting out the whole race with 0 trades.
//   The parameter neighbourhood is robust, not a knife-edge: dd 2.5% +
//   trail 0.75% gives +$5.92 to +$9.95 across EMA-12/24 and cooldown 0/60.
//
// Deterministic: every decision is a pure function of the bars received
// (EMAs in float64 from integer closes, same order of operations every run).
// No clock, no environment, no randomness. Two runs produce byte-identical
// action logs.

import { runBars, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const DD_TRIG_NUM = 975n; // arm when close <= 97.5% of the running max close
const DD_TRIG_DEN = 1000n;
const EMA_FAST = 12;
const EMA_SLOW = 60;
const TRAIL_NUM = 9925n; // exit when close < peak * 9925/10000 (0.75% below peak)
const TRAIL_DEN = 10000n;
const COOLDOWN_BARS = 60;
const FALLBACK_BAR = 720;
const ENTRY_MAX_SLIPPAGE_BPS = 1000;
const STOP_MAX_SLIPPAGE_BPS = 10000;

let emaFast = 0; // float64 EMA of closes, period 12
let emaSlow = 0; // float64 EMA of closes, period 60
let barsSeen = 0; // closes recorded (skips bars where CBBTC is absent)
let maxClose = 0n; // highest close seen
let peakClose = 0n; // highest close since entry
let armed = false;
let everEntered = false;
let coolUntil = -1; // batch seq before which no new buy

function emaUpdate(prev: number, close: number, period: number): number {
  const k = 2 / (period + 1);
  return close * k + prev * (1 - k);
}

await runBars({
  onBatch(state, batch) {
    if (state.warmingUp) return [];
    const close = state.close(SYMBOL);
    if (close === null) return [];
    const seq = batch.seq;

    // Record the close first: EMAs, running max and the arm check all see it,
    // exactly as the offline backtest does (signal on bar k's close).
    const closeF = Number(close) / 1e5;
    if (barsSeen === 0) {
      emaFast = closeF;
      emaSlow = closeF;
    } else {
      emaFast = emaUpdate(emaFast, closeF, EMA_FAST);
      emaSlow = emaUpdate(emaSlow, closeF, EMA_SLOW);
    }
    barsSeen++;
    if (close > maxClose) maxClose = close;

    const pos = state.positions.get(SYMBOL);
    const qty = pos?.qty ?? 0n;

    if (qty > 0n) {
      if (close > peakClose) peakClose = close;
      // Trailing stop: 0.75% below the peak close since entry.
      if (close * TRAIL_DEN < peakClose * TRAIL_NUM) {
        coolUntil = seq + COOLDOWN_BARS;
        return [
          {
            side: 'sell',
            symbol: SYMBOL,
            qty,
            max_slippage_bps: STOP_MAX_SLIPPAGE_BPS,
          } satisfies SellInput,
        ];
      }
      return [];
    }

    // Flat: arm on a >= 2.5% drawdown from the running max close.
    if (close * DD_TRIG_DEN <= maxClose * DD_TRIG_NUM) armed = true;
    // Fallback: never entered by batch 720 -> buy on trend confirmation.
    const fallback = !everEntered && seq >= FALLBACK_BAR && closeF > emaSlow;
    if ((armed && closeF > emaFast) || fallback) {
      if (seq < coolUntil) return [];
      const notional = state.cash; // 100%
      if (notional < BigInt(state.hello.fees.min_notional_quote_units)) return [];
      peakClose = close;
      armed = false;
      everEntered = true;
      return [
        {
          side: 'buy',
          symbol: SYMBOL,
          notional_quote_units: notional,
          max_slippage_bps: ENTRY_MAX_SLIPPAGE_BPS,
        } satisfies BuyInput,
      ];
    }
    return [];
  },
});
