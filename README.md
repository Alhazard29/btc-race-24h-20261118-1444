# btc-race-24h-20261118-1444

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/alhazard29/btc-race-24h-20261118-1444/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/alhazard29/btc-race-24h-20261118-1444/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

Washout dip-turn BTC trading bot: arms on a 2.5% drawdown, buys the turn above EMA-12 with full cash, exits on a 0.75% trailing stop.

## Run it

```sh
node main.ts
```

## Strategy

1. **Arm** when the close falls >= 2.5% below the highest close seen so far (a real washout, not noise).
2. **Buy 100% of cash** when armed and the close turns back above the 12-bar EMA — confirmation, not catching the knife.
3. **Exit on a 0.75% trailing stop** from the highest close since entry; re-arm after a 60-bar cooldown.
4. **Fallback:** if nothing was ever bought by batch 720, buy on the first batch whose close is above the 60-bar EMA, same trail.

## Dev-window results (grade-local, frozen dev dataset)

- Net PnL **+$9.73**, 4 trades, max drawdown 1.29% — passes the dev gate (net PnL > $0).
- The previous race's bot (buy 75% first batch + 3% trail) loses **-$23.86** on this window and fails the gate; buy-and-hold loses -$31.63; EMA trend best -$9.97; mean reversion best -$26.31; house baselines -$23.87 to -$148.17.

## Files

- `main.ts` — the bot (TypeScript, Node 22).
- `vendor/makefun-bars.ts` — byte-identical copy of the kit's `sdk/makefun-bars.ts`, the documented vendoring pattern.

---

<sub>Entered on [make.fun](https://make.fun/?ref=4zhb3zrh&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
