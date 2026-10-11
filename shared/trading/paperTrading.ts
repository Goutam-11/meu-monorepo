import { marketDayIndex, marketDayOffset, marketDayStart, type MarketTimezone } from './marketDay';
import { advanceExitProtection, validateExitPolicy, type ProtectionChange } from './exitPolicy';
import {sizeAutomaticSimulationEntry, type AutoSizing, type AutomaticSizingDiagnostics} from './sizing';
import type { Candle } from './emaCrossover';
import { prepareStrategy, type Signal, type StrategyConfig, type EntryProposal } from './strategies';
import { decideSimulationEntry, type Contract, type SimTrade, type SimulationConfig, type ExecutionDiagnostics } from './perpetualBacktest';

export type PaperPosition = {
  leverage?:number;
  sizing?:AutomaticSizingDiagnostics;
  sign: 1 | -1; entry: number; timestamp: number; contracts: number; units: number;
  initialStop?: number; targetEnabled?: boolean; trailingActive?: boolean; protectionTimeline?: ProtectionChange[];
  stop: number; target: number; margin: number; fee: number; funding: number; liquidation: number;
};
export type PaperState = {
  lastCandle: number; cash: number; position: PaperPosition | null; trades: SimTrade[]; initialCapital: number;
  dailyTimezone?: MarketTimezone;
  day: number; dayStart: number; entries: number; entryOrders: number; pending: Signal; pendingAtr?: number;
  processedBars: number; history: Candle[]; totalTradeCount: number; totalFees: number; totalFunding: number;
  realizedPnl: number; liquidations: number;
  pendingExit?: Signal; lastExitBar?: number;
  pendingEntryProposal?: EntryProposal; pendingMean?: number; pendingExitSide?: 'long' | 'short';
  usedEntryProposalIds?: string[]; dailyGrossLoss?: number; executionDiagnostics?: ExecutionDiagnostics;
};

const MAX_HISTORY = 10_000;
const MAX_TRADES = 200;

export function initializePaperState(initialCapital: number, activationTimestamp: number, dailyTimezone: MarketTimezone = 'UTC'): PaperState {
  if (!Number.isFinite(initialCapital) || initialCapital <= 0 || !Number.isSafeInteger(activationTimestamp) || activationTimestamp < 0)
    throw new Error('Invalid paper activation settings');
  return { lastCandle: activationTimestamp, cash: initialCapital, position: null, trades: [], initialCapital,
    dailyTimezone, day: marketDayIndex(activationTimestamp, dailyTimezone), dayStart: initialCapital,
    entries: 0, entryOrders: 0, pending: 'hold', processedBars: 0, history: [], totalTradeCount: 0,
    totalFees: 0, totalFunding: 0, realizedPnl: 0, liquidations: 0 };
}

function validCandle(b: Candle) {
  return Number.isSafeInteger(b.timestamp) && b.timestamp >= 0 &&
    [b.open, b.high, b.low, b.close, b.volume].every(Number.isFinite) &&
    b.open > 0 && b.close > 0 && b.low > 0 && b.volume >= 0 &&
    b.high >= Math.max(b.open, b.close, b.low) && b.low <= Math.min(b.open, b.close, b.high);
}
function validateInputs(state: PaperState, contract: Contract, strategy: StrategyConfig, c: SimulationConfig) {
  if (!Number.isFinite(state.cash) || !Number.isFinite(state.initialCapital) || state.initialCapital <= 0 ||
      !Number.isSafeInteger(state.lastCandle) || !Number.isSafeInteger(state.processedBars) || state.processedBars < 0 ||
      !Number.isSafeInteger(state.day) || !Number.isFinite(state.dayStart) || state.dayStart < 0 ||
      ![state.entries,state.entryOrders].every(n => Number.isSafeInteger(n) && n >= 0) ||
      !Array.isArray(state.history) || state.history.length > MAX_HISTORY || !Array.isArray(state.trades) || state.trades.length > MAX_TRADES)
    throw new Error('Invalid paper state');
  marketDayOffset(c.dailyTimezone);
  if (state.dailyTimezone !== undefined) marketDayOffset(state.dailyTimezone);
  if (c.exitPolicy !== undefined) validateExitPolicy(c.exitPolicy, strategy.id);
  const position = state.position;
  if (position && c.exitPolicy !== undefined) {
    if (!Number.isFinite(position.initialStop) || position.initialStop! <= 0 ||
        (position.entry - position.initialStop!) * position.sign <= 0 ||
        (position.stop - position.initialStop!) * position.sign < 0 ||
        typeof position.targetEnabled !== "boolean" || typeof position.trailingActive !== "boolean" ||
        position.targetEnabled === position.trailingActive || !Array.isArray(position.protectionTimeline) ||
        !position.protectionTimeline.length || position.protectionTimeline.length > MAX_HISTORY + 1 ||
        position.protectionTimeline.some((change, i, all) =>
          !Number.isSafeInteger(change.effectiveFrom) || change.effectiveFrom < position.timestamp ||
          !Number.isFinite(change.stopPrice) || change.stopPrice <= 0 ||
          typeof change.targetEnabled !== "boolean" || typeof change.trailingActive !== "boolean" ||
          change.targetEnabled === change.trailingActive ||
          i > 0 && (change.effectiveFrom <= all[i-1]!.effectiveFrom || (change.stopPrice-all[i-1]!.stopPrice)*position.sign < 0)) ||
        position.protectionTimeline[0]!.effectiveFrom !== position.timestamp ||
        position.protectionTimeline[0]!.stopPrice !== position.initialStop ||
        position.protectionTimeline[0]!.targetEnabled !== true ||
        position.protectionTimeline[0]!.trailingActive !== false ||
        position.protectionTimeline.at(-1)!.stopPrice !== position.stop ||
        position.protectionTimeline.at(-1)!.targetEnabled !== position.targetEnabled ||
        position.protectionTimeline.at(-1)!.trailingActive !== position.trailingActive)
      throw new Error("Invalid persisted adaptive protection");
  } else if (position && (position.initialStop !== undefined || position.protectionTimeline !== undefined)) {
    throw new Error("Paper exit policy changed while a position is open");
  }
  if (position !== null && (typeof position !== 'object' || !position ||
      ![1, -1].includes(position.sign) ||
      ![position.entry, position.stop, position.target, position.units, position.margin]
        .every(n => Number.isFinite(n) && n > 0) ||
      !Number.isFinite(position.liquidation) || position.liquidation < 0 ||
      !Number.isSafeInteger(position.contracts) || position.contracts < contract.minContracts ||
      Math.abs(position.units - position.contracts * contract.contractSize) > Math.max(1, position.units) * 1e-9 ||
      !Number.isSafeInteger(position.timestamp) || position.timestamp < 0 || position.timestamp > state.lastCandle ||
      !Number.isFinite(position.fee) || position.fee < 0 || !Number.isFinite(position.funding) ||
      (position.target - position.entry) * position.sign <= 0 ||
      (position.entry - position.liquidation) * position.sign <= 0 ||
      position.leverage !== undefined && (!Number.isFinite(position.leverage) || position.leverage < 1 || position.leverage > 20)))
    throw new Error('Invalid paper position');
  if (strategy.executionRules !== undefined && (
      state.usedEntryProposalIds !== undefined && (!Array.isArray(state.usedEntryProposalIds) || state.usedEntryProposalIds.length > MAX_HISTORY ||
        !state.usedEntryProposalIds.every(id => typeof id === 'string') || new Set(state.usedEntryProposalIds).size !== state.usedEntryProposalIds.length) ||
      state.dailyGrossLoss !== undefined && (!Number.isFinite(state.dailyGrossLoss) || state.dailyGrossLoss < 0)))
    throw new Error('Invalid enhanced paper execution state');
  const proposal = state.pendingEntryProposal;
  if (strategy.executionRules !== undefined && proposal && (typeof proposal.id !== 'string' || !['long','short'].includes(proposal.side) ||
      !Number.isFinite(proposal.level) || proposal.level <= 0 ||
      proposal.priceLimit !== undefined && (!Number.isFinite(proposal.priceLimit) || proposal.priceLimit <= 0) ||
      ![proposal.originTimestamp,proposal.confirmedTimestamp,proposal.expiresTimestamp].every(n => Number.isSafeInteger(n) && n >= 0) ||
      proposal.originTimestamp > proposal.confirmedTimestamp || proposal.confirmedTimestamp >= proposal.expiresTimestamp))
    throw new Error('Invalid paper entry proposal');

  for (let i = 0; i < state.history.length; i++) {
    const b = state.history[i]!;
    if (!validCandle(b) || !b.closed || (i > 0 && b.timestamp <= state.history[i - 1]!.timestamp) || b.timestamp > state.lastCandle)
      throw new Error('Invalid paper indicator history');
  }
  if (![contract.contractSize, contract.minContracts].every(n => Number.isFinite(n) && n > 0) ||
      !Number.isSafeInteger(contract.minContracts) || !Number.isFinite(contract.maintenanceMarginRate) ||
      contract.maintenanceMarginRate <= 0 || contract.maintenanceMarginRate >= 1 || contract.settlement !== 'USD')
    throw new Error('Unsupported contract');
  if (![c.initialCapital, c.leverage, c.riskPerTradePct, c.maxMarginPct, c.maxDailyLossPct].every(n => Number.isFinite(n) && n > 0) ||
      c.leverage > 20 || c.leverage < 1 || c.leverage * contract.maintenanceMarginRate >= 1 || c.riskPerTradePct > 10 ||
      c.maxMarginPct > 100 || c.maxDailyLossPct > 100 || ![c.feeBps, c.slippageBps].every(n => Number.isFinite(n) && n >= 0 && n <= 100) ||
      !Number.isFinite(c.fundingRatePct8h) || Math.abs(c.fundingRatePct8h) > 1 ||
      ![c.maxTradesPerDay, c.maxPositionsOpenedPerDay].every(n => Number.isSafeInteger(n) && n > 0 && n <= 1000) ||
      !['both', 'long', 'short'].includes(c.direction)) throw new Error('Invalid simulation settings');
  if (c.autoSizing !== undefined && (!['TARGET_RISK','MINIMUM_ORDER'].includes(c.autoSizing) || c.leverageMode !== 'AUTO') || c.leverageMode !== undefined && !['FIXED','AUTO'].includes(c.leverageMode) || c.maxExposureMultiple !== undefined && (!Number.isFinite(c.maxExposureMultiple) || c.maxExposureMultiple<=0 || c.maxExposureMultiple>c.leverage)) throw new Error('Invalid leverage/exposure policy');
}

/** Advance over fresh closed candles only. Timestamps and funding boundaries use seconds. */
export function advancePaperState(state: PaperState, candles: readonly Candle[], contract: Contract,
  strategy: StrategyConfig, simulation: SimulationConfig, timeframeSeconds?: number, activeAfter = 0): { state: PaperState; processed: number } {
  validateInputs(state, contract, strategy, simulation);
  if (timeframeSeconds !== undefined && (!Number.isSafeInteger(timeframeSeconds) || timeframeSeconds <= 0))
    throw new Error('Invalid timeframe');
  if (simulation.exitPolicy !== undefined && timeframeSeconds === undefined) throw new Error('Adaptive paper exits require a timeframe');
  let previousInput = -1;
  for (const b of candles) {
    if (!validCandle(b) || typeof b.closed !== 'boolean' || b.timestamp <= previousInput)
      throw new Error('Invalid ordered candle data');
    previousInput = b.timestamp;
  }
  const bootstrap = state.history.length === 0 ? candles.filter(b => b.closed && b.timestamp <= state.lastCandle) : [];
  const fresh = candles.filter(b => b.closed && b.timestamp > state.lastCandle);
  if (bootstrap.length + state.history.length + fresh.length > MAX_HISTORY)
    throw new Error('Paper indicator history reached its 10,000 candle cap; reset required');
  if (timeframeSeconds !== undefined) {
    for (let i = 1; i < bootstrap.length; i++)
      if (bootstrap[i]!.timestamp - bootstrap[i - 1]!.timestamp !== timeframeSeconds) throw new Error('Candle gap detected');
    if (bootstrap.length && bootstrap.at(-1)!.timestamp !== state.lastCandle)
      throw new Error('Warmup does not reach the activation candle');
  }
  let last = state.lastCandle;
  for (const b of fresh) {
    if (timeframeSeconds !== undefined && b.timestamp - last !== timeframeSeconds)
      throw new Error('Candle gap detected');
    last = b.timestamp;
  }
  if (!fresh.length && !bootstrap.length) return { state, processed: 0 };

  const enhanced = strategy.executionRules !== undefined;
  const next: PaperState = { ...state, position: state.position ? { ...state.position, ...(state.position.protectionTimeline ? {protectionTimeline:state.position.protectionTimeline.map(change=>({...change}))} : {}) } : null, trades: [...state.trades], history: [...state.history, ...bootstrap] };
  const dailyTimezone = simulation.dailyTimezone ?? 'UTC';
  if (state.dailyTimezone !== dailyTimezone) {
    // Old state has no zone marker. Carry its consumed allowance into the new
    // window, retaining cash, positions and loss baseline until the next midnight.
    const previousTimezone = state.dailyTimezone ?? (enhanced ? 'UTC' : 'Asia/Kolkata');
    if (state.processedBars > 0 && marketDayStart(state.lastCandle, previousTimezone) > marketDayStart(state.lastCandle, dailyTimezone)) {
      // The old midnight already erased part of the new day's usage. Without a
      // complete ledger, reserve the remainder of this one day conservatively.
      next.entries = Math.max(state.entries, simulation.maxPositionsOpenedPerDay);
      next.entryOrders = Math.max(state.entryOrders, simulation.maxTradesPerDay);
      next.dailyGrossLoss = Math.max(state.dailyGrossLoss ?? 0, state.dayStart * simulation.maxDailyLossPct / 100);
    }
    next.day = marketDayIndex(state.lastCandle, dailyTimezone);
    next.dailyTimezone = dailyTimezone;
  }
  if (enhanced) {
    next.usedEntryProposalIds = [...(state.usedEntryProposalIds ?? [])];
    next.dailyGrossLoss ??= 0;
    next.executionDiagnostics = { decisions: state.executionDiagnostics?.decisions ?? 0,
      entries: state.executionDiagnostics?.entries ?? 0, skips: {...state.executionDiagnostics?.skips} };
  }
  const feeRate = simulation.feeBps / 10_000, slip = simulation.slippageBps / 10_000;
  const closePosition = (raw: number, timestamp: number, reason: SimTrade['reason']) => {
    const p = next.position;
    if (!p) return;
    const price = raw * (1 - p.sign * slip), fee = price * p.units * feeRate;
    const pnl = reason === 'liquidation' ? -p.margin : (price - p.entry) * p.units * p.sign;
    next.cash += pnl - fee;
    if (enhanced) next.dailyGrossLoss = (next.dailyGrossLoss ?? 0) + Math.max(0, -pnl) + fee;
    const trade: SimTrade = { side: p.sign === 1 ? 'long' : 'short', entryTimestamp: p.timestamp, exitTimestamp: timestamp,
      entryPrice: p.entry, exitPrice: price, contracts: p.contracts, ...(p.leverage!==undefined?{leverage:p.leverage}:{}), ...(p.sizing?{sizing:p.sizing}:{}), ...(enhanced || simulation.exitPolicy ? { stopPrice: p.initialStop ?? p.stop, targetPrice: p.target } : {}), ...(p.protectionTimeline ? {protectionTimeline:p.protectionTimeline.filter(change=>change.effectiveFrom<=timestamp)} : {}), fees: p.fee + fee, funding: p.funding,
      netPnl: pnl - p.fee - fee - p.funding, reason };
    next.trades.push(trade); if (next.trades.length > MAX_TRADES) next.trades.splice(0, next.trades.length - MAX_TRADES);
    next.totalTradeCount++; next.totalFees += fee; next.realizedPnl += trade.netPnl;
    if (reason === 'liquidation') next.liquidations++;
    next.position = null;
    next.lastExitBar = next.processedBars;
  };

  const prepared = prepareStrategy([...next.history, ...fresh], strategy, activeAfter);
  for (const b of fresh) {
    const prev = next.history.at(-1);
    let fundingLoss = 0;
    if (next.position && prev) {
      const settlements = Math.floor(b.timestamp / 28_800) - Math.floor(prev.timestamp / 28_800);
      const payment = settlements * next.position.sign * next.position.units * prev.close * simulation.fundingRatePct8h / 100;
      next.cash -= payment; next.position.funding += payment; next.totalFunding += payment;
      fundingLoss = Math.max(0, payment);
    }
    const markEquity = next.cash + (next.position && prev ? (b.open - next.position.entry) * next.position.units * next.position.sign : 0);
    const day = marketDayIndex(b.timestamp, dailyTimezone);
    if (day !== next.day) { next.day = day; next.dayStart = Math.max(markEquity, 0); next.entries = 0; next.entryOrders = 0; if (enhanced) next.dailyGrossLoss = 0; }
    if (enhanced) next.dailyGrossLoss = (next.dailyGrossLoss ?? 0) + fundingLoss;
    const pending = b.timestamp >= activeAfter && (prev?.timestamp ?? 0) >= activeAfter ? next.pending : 'hold';
    if (next.position && (next.position.sign === 1 ? b.open <= next.position.liquidation : b.open >= next.position.liquidation))
      closePosition(next.position.liquidation, b.timestamp, 'liquidation');
    const pendingExit = enhanced || b.timestamp >= activeAfter && (prev?.timestamp ?? 0) >= activeAfter ? (next.pendingExit ?? pending) : 'hold';
    if (next.position && (enhanced && strategy.id === 'meanReversion' ? next.pendingExitSide === (next.position.sign === 1 ? 'long' : 'short') : (pendingExit === 'exit' || (pendingExit === 'long' && next.position.sign === -1) || (pendingExit === 'short' && next.position.sign === 1))))
      closePosition(b.open, b.timestamp, 'signal');
    if (enhanced && next.pendingEntryProposal) {
      const proposal = next.pendingEntryProposal, diagnostics = next.executionDiagnostics!;
      diagnostics.decisions++;
      const decision = decideSimulationEntry({proposal,timestamp:b.timestamp,activeAfter,usedIds:next.usedEntryProposalIds!,
        occupied:!!next.position,cooldown:next.processedBars-(next.lastExitBar??-Infinity) <= (strategy.entryTiming?.cooldownBars??-1),
        cash:next.cash,dayStart:next.dayStart,dailyGrossLoss:next.dailyGrossLoss??0,entries:next.entries,orders:next.entryOrders,
        atr:next.pendingAtr,mean:next.pendingMean,open:b.open,contract,strategy,config:simulation});
      if (decision.entry) {
        next.position = decision.entry; next.cash -= decision.entry.fee; next.totalFees += decision.entry.fee;
        next.dailyGrossLoss = (next.dailyGrossLoss ?? 0) + decision.entry.fee;
        next.entries++; next.entryOrders++; next.usedEntryProposalIds!.push(proposal.id); diagnostics.entries++;
      } else diagnostics.skips[decision.reason!] = (diagnostics.skips[decision.reason!] ?? 0) + 1;
    }
    const lossBlocked = next.dayStart <= 0 || next.cash <= next.dayStart * (1 - simulation.maxDailyLossPct / 100);
    if (!enhanced && !next.position && next.processedBars - (next.lastExitBar ?? -Infinity) > (strategy.entryTiming?.cooldownBars ?? -1) && !lossBlocked && next.cash > 0 && next.entries < simulation.maxPositionsOpenedPerDay &&
        next.entryOrders < simulation.maxTradesPerDay && next.pendingAtr && next.pendingAtr > 0 &&
        ((pending === 'long' && simulation.direction !== 'short') || (pending === 'short' && simulation.direction !== 'long'))) {
      const sign: 1 | -1 = pending === 'long' ? 1 : -1, price = b.open * (1 + sign * slip), distance = next.pendingAtr * strategy.stopAtr;
      const perContractRisk = contract.contractSize * (distance + 2 * price * feeRate + 2 * price * slip);
      const lossRoom = Math.max(0, next.cash - next.dayStart * (1 - simulation.maxDailyLossPct / 100));
      const riskContracts = Math.floor(Math.min(next.cash * simulation.riskPerTradePct / 100, lossRoom) / perContractRisk);
      const marginContracts = Math.floor(next.cash * simulation.maxMarginPct / 100 / (price * contract.contractSize * (1 / simulation.leverage + feeRate)));
      const automatic=simulation.leverageMode==='AUTO' ? sizeAutomaticSimulationEntry({ceiling:simulation.leverage,autoSizing:simulation.autoSizing,cash:next.cash,riskBudget:Math.min(next.cash*simulation.riskPerTradePct/100,lossRoom),maxMarginPct:simulation.maxMarginPct,maxExposureMultiple:simulation.maxExposureMultiple??simulation.leverage,price,stopPrice:price-sign*distance,contractSize:contract.contractSize,minContracts:contract.minContracts,maintenanceMarginRate:contract.maintenanceMarginRate,feeRate,slippageRate:slip}) : undefined;
      const leverage=automatic?.leverage??simulation.leverage;
      const contracts=simulation.leverageMode==='AUTO' ? automatic?.amount??0 : Math.min(riskContracts,marginContracts,Math.floor(next.cash*(simulation.maxExposureMultiple??simulation.leverage)/(price*contract.contractSize)));
      if (contracts >= contract.minContracts && price - sign * distance > 0 && price + sign * distance * strategy.rewardRisk > 0) {
        const units = contracts * contract.contractSize, margin = price * units / leverage, fee = price * units * feeRate;
        next.cash -= fee; next.totalFees += fee;
        const liquidation = sign === 1 ? price * (1 - 1 / leverage) / (1 - contract.maintenanceMarginRate) :
          price * (1 + 1 / leverage) / (1 + contract.maintenanceMarginRate);
        next.position = { ...(automatic?{leverage,...(simulation.autoSizing?{sizing:automatic.diagnostics}:{})}:{}), sign, entry: price, timestamp: b.timestamp, contracts, units, margin, fee, funding: 0,
          stop: price - sign * distance, target: price + sign * distance * strategy.rewardRisk, liquidation };
        next.entries++; next.entryOrders++;
      }
    }
    const idx = next.history.length;
    next.pending = b.timestamp >= activeAfter ? prepared.signals[idx]! : 'hold'; next.pendingExit = enhanced || b.timestamp >= activeAfter ? prepared.rawSignals[idx]! : 'hold'; next.pendingAtr = prepared.atr[idx];
    if (enhanced) {
      next.pendingEntryProposal = b.timestamp >= activeAfter ? prepared.entryProposals[idx] : undefined;
      next.pendingMean = prepared.means[idx]; next.pendingExitSide = prepared.exitSignals[idx];
    }
    if (next.position) {
      const p = next.position;
      if (simulation.exitPolicy && p.initialStop === undefined) {
        p.initialStop = p.stop; p.targetEnabled = true; p.trailingActive = false;
        p.protectionTimeline = [{effectiveFrom:b.timestamp,stopPrice:p.stop,targetEnabled:true,trailingActive:false}];
      }
      const liq = p.sign === 1 ? b.low <= p.liquidation : b.high >= p.liquidation;
      const stop = p.sign === 1 ? b.low <= p.stop : b.high >= p.stop;
      const target = p.targetEnabled !== false && (p.sign === 1 ? b.high >= p.target : b.low <= p.target);
      if (liq) closePosition(p.liquidation, b.timestamp, 'liquidation');
      else if (stop) closePosition(p.sign === 1 ? Math.min(b.open, p.stop) : Math.max(b.open, p.stop), b.timestamp, 'stop');
      else if (target) closePosition(p.target, b.timestamp, 'target');
    }
    if (next.position && simulation.exitPolicy && next.pendingAtr !== undefined) {
      const p = next.position;
      const protection = advanceExitProtection({side:p.sign===1?'long':'short',entryPrice:p.entry,close:b.close,
        atr:next.pendingAtr,policy:simulation.exitPolicy,state:{initialStop:p.initialStop!,stop:p.stop,
          targetEnabled:p.targetEnabled!,trailingActive:p.trailingActive!}});
      if (protection.stop !== p.stop || protection.targetEnabled !== p.targetEnabled) {
        p.protectionTimeline!.push({effectiveFrom:b.timestamp+timeframeSeconds!,stopPrice:protection.stop,
          targetEnabled:protection.targetEnabled,trailingActive:protection.trailingActive});
      }
      Object.assign(p,protection);
    }
    next.history.push(b);
    next.lastCandle = b.timestamp; next.processedBars++;
  }
  return { state: next, processed: fresh.length };
}
