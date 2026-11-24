# Risk policy ownership

**Owner:** `Agent.risk` and `Agent.capital`.
**Projection:** `Agent.strategyConfig.simulation` is derived from the owner fields when a crypto algorithm agent is created or edited.

## What changed

- The crypto agent schema accepts the canonical `risk` and `capital` objects alongside the strategy configuration.
- `risk.maxRiskPerTradePct`, `risk.maxDailyLossPct`, `risk.maxTradesPerDay`, `risk.maxPositionsOpenedPerDay` and `capital.allocated` are projected into `strategyConfig.simulation` (`riskPerTradePct`, `maxDailyLossPct`, `maxTradesPerDay`, `maxPositionsOpenedPerDay`, `initialCapital`) at the write boundary. `risk.maxOpenPositions` is fixed at one and `capital.currency` at USD for Delta algorithms.
- A request whose canonical policy disagrees with its simulation snapshot is rejected before persistence instead of being saved.
- Legacy callers without the canonical fields (the backtest-run launch path) still get the snapshot-derived policy, then the same projection is applied.

## Existing mismatched agents

The scheduler keeps refusing a mismatched legacy record and now names the field and both values, for example:

```
Saved strategy allocation and agent policy differ: simulation.riskPerTradePct=1 vs risk.maxRiskPerTradePct=0.5; simulation.maxDailyLossPct=5 vs risk.maxDailyLossPct=3
```

Find candidates in MongoDB:

```js
db.Agent.find(
  { $expr: { $ne: ["$strategyConfig.simulation.riskPerTradePct", "$risk.maxRiskPerTradePct"] } },
  { name: 1, risk: 1, capital: 1, "strategyConfig.simulation": 1 },
)
```

Also compare `capital.allocated` with `strategyConfig.simulation.initialCapital`, and the daily loss / trade cap fields.

Reconcile deliberately: confirm that `Agent.risk` and `Agent.capital` hold the policy the operator intends, then open the agent in the UI and save it (the form rewrites the projection), or back up the document and update the snapshot from the canonical fields:

```js
db.Agent.updateOne(
  { _id: ObjectId("<agent id>") },
  [{
    $set: {
      "strategyConfig.simulation.initialCapital": "$capital.allocated",
      "strategyConfig.simulation.riskPerTradePct": "$risk.maxRiskPerTradePct",
      "strategyConfig.simulation.maxDailyLossPct": "$risk.maxDailyLossPct",
      "strategyConfig.simulation.maxTradesPerDay": "$risk.maxTradesPerDay",
      "strategyConfig.simulation.maxPositionsOpenedPerDay": "$risk.maxPositionsOpenedPerDay",
    },
  }],
)
```

There is no automatic migration: a mismatch may mean the saved snapshot is stale, or that the operator intended a different policy. Resolve which value is correct first; the scheduler will continue to pause the agent until the pair agrees.
