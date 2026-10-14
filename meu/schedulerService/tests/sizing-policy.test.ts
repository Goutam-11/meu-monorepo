import {describe,expect,test} from 'bun:test';
import {defaultSizingPolicy, sizeEntry, validateSizingPolicy, minimumViableLeverage, sizeAutomaticSimulationEntry} from '../../../shared/trading/sizing';
import {formatTradingPolicy, sizeLongPosition, assertOrderAllowed, type TradingPolicy} from '../src/execution/tradeGuard';

const policy:TradingPolicy = {symbols:['INFY'],capital:{allocated:20,currency:'INR'},risk:{maxRiskPerTradePct:2,maxDailyLossPct:5,maxOpenPositions:1,maxTradesPerDay:1,maxPositionsOpenedPerDay:1}};
const input={riskBudget:0.4,marginBudget:20,exposureBudget:40,unitRisk:0.012,unitMargin:0.503,unitNotional:1,minAmount:1,roundDown:Math.floor};
describe('shared position sizing',()=>{
  test('margin allowance is independent of stop-loss risk, quantity rounds down',()=>{
    const sized=sizeEntry(input);
    expect(sized.amount).toBe(33);
    expect(sized.riskAtStop).toBeLessThanOrEqual(0.4);
    expect(sized.marginRequired).toBeLessThanOrEqual(20);
    expect(sized.notional).toBeGreaterThan(0.4);
    expect(sized.limitingConstraint).toBe('stop/loss risk budget');
  });
  test('each independent headroom and broker maximum can reduce size',()=>{
    expect(sizeEntry({...input,marginBudget:1}).amount).toBe(1);
    expect(sizeEntry({...input,exposureBudget:2}).amount).toBe(2);
    expect(sizeEntry({...input,maxAmount:4}).amount).toBe(4);
    expect(sizeEntry({...input,maxNotional:3}).amount).toBe(3);
    expect(sizeEntry({...input,requestedAmount:2}).amount).toBe(2);
  });
  test('minimum contracts, invalid snapshots, rounded-up and model quantities fail closed',()=>{
    expect(()=>sizeEntry({...input,unitMargin:60,unitNotional:120})).toThrow('minimum order needs');
    expect(()=>sizeEntry({...input,minNotional:40})).toThrow('below minimum');
    expect(()=>sizeEntry({...input,requestedAmount:34})).toThrow('between');
    expect(()=>sizeEntry({...input,requestedAmount:0.5})).toThrow();
    expect(()=>sizeEntry({...input,roundDown:Math.ceil})).toThrow('rounding exceeded');
    for (const value of [NaN,Infinity]) expect(()=>sizeEntry({...input,marginBudget:value})).toThrow('Authoritative');
    expect(()=>sizeEntry({...input,riskBudget:-1})).toThrow('No tradable quantity');
  });
  test('non-Delta adapters cannot grant unsupported protection credit',()=>{
    const sizing={...defaultSizingPolicy,mode:'STOP_LOSS' as const,leverage:2,maxExposureMultiple:2};
    expect(()=>assertOrderAllowed({...policy,sizing},'INFY',1,{dailyPnl:0,exposure:0,openPositions:0,availableFunds:20})).toThrow('verified protection');
    expect(()=>sizeLongPosition({allocated:20,maxRiskPerTradePct:2,exposure:0,availableFunds:20,remainingDailyLoss:1,price:1,sizing})).toThrow('does not support');
  });
  test('full-notional stock sizing respects collateral ceiling and cost buffer',()=>{
    expect(sizeLongPosition({allocated:100,maxRiskPerTradePct:100,exposure:0,availableFunds:100,remainingDailyLoss:100,price:10,sizing:{...defaultSizingPolicy,maxMarginPct:50}}).quantity).toBe(4);
    expect(()=>validateSizingPolicy({...defaultSizingPolicy,leverage:2})).toThrow();
    expect(()=>validateSizingPolicy({...defaultSizingPolicy,version:2})).toThrow();
    expect(()=>validateSizingPolicy({...defaultSizingPolicy,mode:'STOP_LOSS',leverage:2,maxExposureMultiple:3})).toThrow();
  });
  test('LLM prompt reports correct risk semantics and independent ceilings',()=>{
    const prompt=formatTradingPolicy({...policy,sizing:{...defaultSizingPolicy,mode:'STOP_LOSS',leverage:2,maxExposureMultiple:2}});
    expect(prompt).toContain('This is NOT a notional limit');
    expect(prompt).toContain('margin ceiling 100%');
    expect(prompt).not.toContain('Maximum notional per entry');
    expect(formatTradingPolicy(policy)).toContain('Maximum full entry notional');
  });
  test('LLM context distinguishes allocation budgets, automatic permissions and live headroom',()=>{
    const prompt=formatTradingPolicy({...policy,symbols:['XRPUSD'],capital:{allocated:25,currency:'USD'},
      risk:{...policy.risk,maxRiskPerTradePct:5,maxDailyLossPct:10},
      sizing:{...defaultSizingPolicy,mode:'STOP_LOSS',leverageMode:'AUTO',leverage:10,maxMarginPct:40,maxExposureMultiple:4}});
    expect(prompt).toContain('Allowed tickers: XRPUSD');
    expect(prompt).toContain('Allocated capital: 25 USD');
    expect(prompt).toContain('Per-entry estimated stop-loss budget: 1.25 USD');
    expect(prompt).toContain('Configured margin budget: 10 USD; configured gross exposure budget: 100 USD');
    expect(prompt).toContain('Configured daily loss budget: 2.5 USD');
    expect(prompt).toContain('within the 10× ceiling');
    expect(prompt).toContain('not the current broker leverage');
    expect(prompt).toContain('Shared-account ceilings');
    expect(prompt).toContain('not the remaining daily allowance');
    expect(formatTradingPolicy(policy)).toContain('Per-entry full-notional budget: 0.4 INR');
    const fixed=formatTradingPolicy({...policy,sizing:{...defaultSizingPolicy,mode:'STOP_LOSS',leverageMode:'FIXED',leverage:2,maxExposureMultiple:2}});
    expect(fixed).toContain('saved isolated leverage 2×');
    expect(fixed).not.toContain('You may use guarded setLeverage');
  });
});


test('automatic leverage selects the minimum viable value and never widens risk',()=>{
  expect(minimumViableLeverage(5,n=>n>=3)).toBe(3);
  expect(minimumViableLeverage(2,n=>n>=3)).toBeUndefined();
  expect(()=>minimumViableLeverage(21,()=>true)).toThrow();
  const args={ceiling:10,cash:20,riskBudget:0.4,maxMarginPct:100,maxExposureMultiple:10,price:100,stopPrice:99.9,contractSize:1,minContracts:1,maintenanceMarginRate:0.005,feeRate:0.001,slippageRate:0.0005};
  expect(sizeAutomaticSimulationEntry(args)?.leverage).toBe(6); // 5× still needs >$20 after costs.
  expect(sizeAutomaticSimulationEntry({...args,ceiling:5})).toBeUndefined();
  expect(sizeAutomaticSimulationEntry({...args,stopPrice:95})).toBeUndefined();
  expect(sizeAutomaticSimulationEntry({...args,maxExposureMultiple:1})).toBeUndefined();
  expect(sizeAutomaticSimulationEntry({...args,maxMarginPct:50})?.leverage).toBeUndefined(); // 10× + costs exceeds the $10 allowance.
});


test('generic automatic leverage is an explicit protected-policy opt-in',()=>{
 expect(validateSizingPolicy({...defaultSizingPolicy,mode:'STOP_LOSS',leverage:2,maxExposureMultiple:2,leverageMode:'AUTO'}).leverageMode).toBe('AUTO');
 expect(()=>validateSizingPolicy({...defaultSizingPolicy,leverageMode:'AUTO'})).toThrow();
 expect(()=>validateSizingPolicy({...defaultSizingPolicy,leverageMode:'UNBOUNDED'})).toThrow();
});

describe('target quantity automatic sizing',()=>{
  const args={ceiling:5,cash:100,riskBudget:10,maxMarginPct:100,maxExposureMultiple:5,price:10,stopPrice:9.5,contractSize:1,minContracts:1,maintenanceMarginRate:0.005,feeRate:0.001,slippageRate:0};
  test('legacy and explicit minimum objective retain first tradable leverage; target uses lowest leverage funding maximum size',()=>{
    const legacy=sizeAutomaticSimulationEntry(args)!;
    expect(legacy.leverage).toBe(1);expect(legacy.amount).toBe(9);
    expect(sizeAutomaticSimulationEntry({...args,autoSizing:'MINIMUM_ORDER'})).toEqual(legacy);
    const target=sizeAutomaticSimulationEntry({...args,autoSizing:'TARGET_RISK'})!;
    expect(target.leverage).toBe(2);expect(target.amount).toBe(19);
    expect(target.diagnostics).toMatchObject({autoSizing:'TARGET_RISK',targetAmount:19,fundedAmount:19,targetFunded:true});
    expect(target.riskAtStop).toBeLessThanOrEqual(args.riskBudget);
    expect(target.marginRequired).toBeLessThanOrEqual(args.cash);
    expect(target.notional).toBeLessThanOrEqual(args.cash*args.maxExposureMultiple);
  });
  test('an unfundable target transparently falls back to maximum bounded lots',()=>{
    const sized=sizeAutomaticSimulationEntry({...args,autoSizing:'TARGET_RISK',ceiling:3,maxMarginPct:10})!;
    expect(sized.leverage).toBe(3);expect(sized.amount).toBe(2);
    expect(sized.diagnostics).toMatchObject({targetAmount:19,fundedAmount:2,targetFunded:false,limitingConstraint:'margin and available funds'});
    expect(sized.marginRequired).toBeLessThanOrEqual(10);
    expect(sizeAutomaticSimulationEntry({...args,autoSizing:'TARGET_RISK',ceiling:3,maxMarginPct:10,minContracts:3})).toBeUndefined();
  });
  test('exposure, risk and liquidation checks continue to bound target selection',()=>{
    const exposed=sizeAutomaticSimulationEntry({...args,autoSizing:'TARGET_RISK',maxExposureMultiple:1})!;
    expect(exposed.amount).toBe(10);expect(exposed.leverage).toBe(2);expect(exposed.notional).toBeLessThanOrEqual(100);
    const lowRisk=sizeAutomaticSimulationEntry({...args,autoSizing:'TARGET_RISK',riskBudget:0.6})!;
    expect(lowRisk.amount).toBe(1);expect(lowRisk.leverage).toBe(1);
    const liquidationBound=sizeAutomaticSimulationEntry({...args,autoSizing:'TARGET_RISK',riskBudget:100,stopPrice:7,maxMarginPct:10})!;
    expect(liquidationBound.leverage).toBe(3);expect(liquidationBound.amount).toBe(2);
    expect(3+0.02+2*args.maintenanceMarginRate*args.price).toBeLessThan(args.price/liquidationBound.leverage);
    expect(sizeAutomaticSimulationEntry({...args,autoSizing:'TARGET_RISK',riskBudget:0.1})).toBeUndefined();
  });
  test('objective is validated and never silently attached to legacy or fixed policies',()=>{
    const auto={...defaultSizingPolicy,mode:'STOP_LOSS' as const,leverage:5,maxExposureMultiple:5,leverageMode:'AUTO' as const};
    expect(validateSizingPolicy(auto).autoSizing).toBeUndefined();
    expect(validateSizingPolicy({...auto,autoSizing:'TARGET_RISK'}).autoSizing).toBe('TARGET_RISK');
    for(const value of [{...auto,autoSizing:'UNBOUNDED'},{...auto,leverageMode:'FIXED',autoSizing:'TARGET_RISK'},{...defaultSizingPolicy,autoSizing:'TARGET_RISK'}])
      expect(()=>validateSizingPolicy(value)).toThrow('Invalid sizing policy');
    expect(formatTradingPolicy({...policy,sizing:{...auto,autoSizing:'TARGET_RISK'}})).toContain('lowest leverage funding that quantity');
  });
});

test('legacy sizing preserves adapter rounding calls when the risk target exceeds funded size',()=>{
  let rounds=0;
  const result=sizeEntry({...input,marginBudget:1,roundDown:n=>{rounds++;if(n>2)throw new Error('unsupported extra target rounding');return Math.floor(n);}});
  expect(result.amount).toBe(1);expect(rounds).toBe(2);
});
