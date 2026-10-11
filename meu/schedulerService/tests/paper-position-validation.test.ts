import {expect, test} from 'bun:test';
import {advancePaperState, initializePaperState, type PaperPosition} from '../../../shared/trading/paperTrading';

const contract = {symbol:'TEST',contractSize:0.1,minContracts:1,maintenanceMarginRate:0.005,settlement:'USD' as const};
const strategy = {id:'ema' as const,fastPeriod:2,slowPeriod:3,lookback:3,atrPeriod:2,stopAtr:1,rewardRisk:2};
const simulation = {initialCapital:1000,leverage:2,riskPerTradePct:1,maxMarginPct:25,feeBps:10,slippageBps:5,
  fundingRatePct8h:0,maxTradesPerDay:10,maxPositionsOpenedPerDay:5,maxDailyLossPct:5,direction:'both' as const};
const long:PaperPosition = {sign:1,entry:100,timestamp:60,contracts:3,units:0.3,stop:98,target:104,
  margin:15,fee:0.03,funding:-0.01,liquidation:50,leverage:2};
function replay(position:PaperPosition) {
  const state = initializePaperState(1000,120);
  state.position = position;
  return advancePaperState(JSON.parse(JSON.stringify(state)),[],contract,strategy,simulation).state;
}

test('durable positions accept long, short and profitable trailing stops without changing state',()=>{
  expect(replay(long).position).toEqual(long);
  expect(replay({...long,leverage:1,liquidation:0}).position?.liquidation).toBe(0);
  expect(replay({...long,stop:102}).position?.stop).toBe(102);
  const short:PaperPosition = {...long,sign:-1,stop:102,target:96,liquidation:150};
  expect(replay(short).position).toEqual(short);
  expect(replay({...short,stop:98}).position?.stop).toBe(98);
});

test('durable positions reject malformed protection, quantity and execution fields before replay',()=>{
  const invalid:Partial<PaperPosition>[] = [
    {sign:0 as 1}, {entry:NaN}, {stop:NaN}, {stop:0}, {target:Infinity}, {target:99},
    {units:0},{units:0.4},{contracts:1.5},{contracts:0},{margin:-1},{liquidation:-1},{liquidation:110},
    {fee:-1},{funding:Infinity},{timestamp:121},{timestamp:-1},{leverage:NaN},
  ];
  for (const fields of invalid) expect(()=>replay({...long,...fields})).toThrow('Invalid paper position');
  expect(()=>replay({...long,sign:-1,stop:102,target:96,liquidation:50})).toThrow('Invalid paper position');
});
