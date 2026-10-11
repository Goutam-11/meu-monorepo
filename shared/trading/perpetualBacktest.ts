import { marketDayIndex, marketDayOffset, type MarketTimezone } from './marketDay';
import { advanceExitProtection, validateExitPolicy, type ExitPolicy, type ProtectionChange } from './exitPolicy';
import {sizeEntry, sizeAutomaticSimulationEntry, type AutoSizing, type AutomaticSizingDiagnostics} from './sizing';
import type { Candle } from './emaCrossover';
import { prepareStrategy, type StrategyConfig, type Signal, type EntryProposal, STRATEGY_VERSION } from './strategies';
export type Contract = {
    symbol: string;
    contractSize: number;
    minContracts: number;
    maintenanceMarginRate: number;
    settlement: 'USD';
};
export type SimulationConfig = {
    /** Generic simulations default to UTC; exchange adapters supply their market zone. */
    dailyTimezone?: MarketTimezone;
    initialCapital: number;
    leverage: number;
    leverageMode?: 'FIXED' | 'AUTO';
    autoSizing?: AutoSizing;
    /** Offline/paper research only; absent retains the original fixed exit. */
    exitPolicy?: ExitPolicy;
    maxExposureMultiple?: number;
    riskPerTradePct: number;
    maxMarginPct: number;
    feeBps: number;
    slippageBps: number;
    fundingRatePct8h: number;
    maxTradesPerDay: number;
    maxPositionsOpenedPerDay: number;
    maxDailyLossPct: number;
    direction: 'both' | 'long' | 'short';
};
export type SimTrade = {
    side: 'long' | 'short';
    entryTimestamp: number;
    exitTimestamp: number;
    entryPrice: number;
    exitPrice: number;
    contracts: number;
    leverage?: number;
    sizing?: AutomaticSizingDiagnostics;
    stopPrice?: number;
    targetPrice?: number;
    protectionTimeline?: ProtectionChange[];
    fees: number;
    funding: number;
    netPnl: number;
    reason: 'stop' | 'target' | 'signal' | 'liquidation' | 'end';
};
export type ExecutionDiagnostics = { decisions: number; entries: number; skips: Record<string, number> };
export const MEAN_REVERSION_MIN_NET_REWARD_RISK = 0.75;
export const MEAN_REVERSION_MIN_COST_MULTIPLE = 2;
/** Research thresholds, not a profitability claim. Costs include both fills conservatively. */
export function evaluateMeanReversionEntry(input: {
    side: 'long' | 'short'; entryPrice: number; stopPrice: number; meanPrice: number; feeRate: number; slippageRate: number;
}): { ok: boolean; targetPrice: number; reason?: string } {
    const { side, entryPrice, stopPrice, meanPrice, feeRate, slippageRate } = input;
    const sign = side === 'long' ? 1 : -1;
    const reject = (reason: string) => ({ ok: false, targetPrice: meanPrice, reason });
    if (![entryPrice, stopPrice, meanPrice, feeRate, slippageRate].every(Number.isFinite) ||
        Math.min(entryPrice, stopPrice, meanPrice) <= 0 || feeRate < 0 || slippageRate < 0 ||
        (entryPrice - stopPrice) * sign <= 0 || (meanPrice - entryPrice) * sign <= 0) return reject('economics');
    const costs = (entryPrice + Math.max(entryPrice, stopPrice, meanPrice)) * (feeRate + slippageRate);
    const netReward = (meanPrice - entryPrice) * sign - costs;
    if (netReward < MEAN_REVERSION_MIN_NET_REWARD_RISK * Math.abs(entryPrice - stopPrice) ||
        netReward < MEAN_REVERSION_MIN_COST_MULTIPLE * costs) return reject('economics');
    return { ok: true, targetPrice: meanPrice };
}

/** Shared opt-in entry decision for historical and durable paper replay. */
export function decideSimulationEntry(input: {
    proposal: EntryProposal; timestamp: number; activeAfter?: number; usedIds: readonly string[];
    occupied: boolean; cooldown: boolean; cash: number; dayStart: number; dailyGrossLoss: number;
    entries: number; orders: number; atr?: number; mean?: number; open: number;
    contract: Contract; strategy: StrategyConfig; config: SimulationConfig;
}) {
    const { proposal, contract, strategy, config: c, cash } = input;
    const skip = (reason: string) => ({ reason, entry: undefined });
    if (proposal.originTimestamp < (input.activeAfter ?? 0)) return skip('inactive');
    if (input.timestamp >= proposal.expiresTimestamp) return skip('expired');
    if (input.usedIds.includes(proposal.id)) return skip('duplicate');
    if (input.occupied) return skip('position_open');
    if (input.cooldown) return skip('cooldown');
    if (c.direction !== 'both' && c.direction !== proposal.side) return skip('direction');
    if (cash <= 0 || input.dayStart <= 0 || input.dailyGrossLoss >= input.dayStart * c.maxDailyLossPct / 100) return skip('daily_loss');
    if (input.entries >= c.maxPositionsOpenedPerDay || input.orders >= c.maxTradesPerDay) return skip('daily_entry_limit');
    if (!input.atr || !Number.isFinite(input.atr) || input.atr <= 0) return skip('invalid_atr');
    const sign: 1 | -1 = proposal.side === 'long' ? 1 : -1;
    if ((input.open - proposal.level) * sign <= 0) return skip('invalid_proposal');
    const feeRate = c.feeBps / 10000, slip = c.slippageBps / 10000;
    const price = input.open * (1 + sign * slip), distance = input.atr * strategy.stopAtr, stop = price - sign * distance;
    if (proposal.priceLimit !== undefined && (!Number.isFinite(proposal.priceLimit) || (price - proposal.priceLimit) * sign > 0)) return skip('price_extension');
    let target = price + sign * distance * strategy.rewardRisk;
    if (strategy.id === 'meanReversion') {
        const economics = evaluateMeanReversionEntry({ side: proposal.side, entryPrice: price, stopPrice: stop,
            meanPrice: input.mean ?? NaN, feeRate, slippageRate: slip });
        if (!economics.ok) return skip(economics.reason!);
        target = economics.targetPrice;
    }
    if (stop <= 0 || target <= 0) return skip('invalid_price');
    const riskBudget = Math.min(cash * c.riskPerTradePct / 100, Math.max(0, input.dayStart * c.maxDailyLossPct / 100 - input.dailyGrossLoss));
    const costs = (price + Math.max(price, stop)) * (feeRate + slip);
    const automatic = c.leverageMode === 'AUTO' ? sizeAutomaticSimulationEntry({ceiling:c.leverage,autoSizing:c.autoSizing,cash,riskBudget,maxMarginPct:c.maxMarginPct,maxExposureMultiple:c.maxExposureMultiple??c.leverage,price,stopPrice:stop,contractSize:contract.contractSize,minContracts:contract.minContracts,maintenanceMarginRate:contract.maintenanceMarginRate,feeRate,slippageRate:slip}) : undefined;
    const leverage = automatic?.leverage ?? c.leverage;
    if (distance / price + costs / price + 2 * contract.maintenanceMarginRate >= 1 / leverage) return skip('liquidation_distance');
    let contracts: number;
    try {
        contracts = c.leverageMode === 'AUTO' ? automatic?.amount ?? 0 : sizeEntry({riskBudget,marginBudget:cash*c.maxMarginPct/100,
            exposureBudget:cash*(c.maxExposureMultiple??c.leverage),unitRisk:contract.contractSize*(distance+costs),
            unitMargin:contract.contractSize*(price/leverage+costs),unitNotional:contract.contractSize*price,
            minAmount:contract.minContracts,roundDown:Math.floor}).amount;
    } catch { return skip('budget_minimum'); }
    if (contracts < contract.minContracts) return skip('budget_minimum');
    const units = contracts * contract.contractSize, margin = price * units / leverage, fee = price * units * feeRate;
    const liquidation = sign === 1 ? price * (1 - 1 / leverage) / (1 - contract.maintenanceMarginRate) : price * (1 + 1 / leverage) / (1 + contract.maintenanceMarginRate);
    return { reason: undefined, entry: { ...(automatic ? {leverage,...(c.autoSizing ? {sizing:automatic.diagnostics} : {})} : {}),
        sign, entry: price, timestamp: input.timestamp, contracts, units, margin, fee, funding: 0, stop, target, liquidation } };
}

export function runPerpetualBacktest(bars: readonly Candle[], contract: Contract, strategy: StrategyConfig, c: SimulationConfig) {
    if (bars.length < 2 || bars.length > 10000 || !bars.every((b, i) => b.closed && [b.timestamp, b.open, b.high, b.low, b.close, b.volume].every(Number.isFinite) && Number.isSafeInteger(b.timestamp) && b.timestamp >= 0 && b.open > 0 && b.close > 0 && b.low > 0 && b.volume >= 0 && b.high >= Math.max(b.open, b.close, b.low) && b.low <= Math.min(b.open, b.close, b.high) && (!i || b.timestamp > bars[i - 1]!.timestamp)))
        throw new Error('Invalid closed candle data');
    if (![contract.contractSize, contract.minContracts].every(n => Number.isFinite(n) && n > 0) || !Number.isSafeInteger(contract.minContracts) || !Number.isFinite(contract.maintenanceMarginRate) || contract.maintenanceMarginRate <= 0 || contract.maintenanceMarginRate >= 1 || contract.settlement !== 'USD')
        throw new Error('Unsupported contract');
    if (![c.initialCapital, c.leverage, c.riskPerTradePct, c.maxMarginPct, c.maxDailyLossPct].every(n => Number.isFinite(n) && n > 0) || c.leverage > 20 || c.leverage < 1 || c.leverage * contract.maintenanceMarginRate >= 1 || c.riskPerTradePct > 10 || c.maxMarginPct > 100 || c.maxDailyLossPct > 100 || ![c.feeBps, c.slippageBps].every(n => Number.isFinite(n) && n >= 0 && n <= 100) || !Number.isFinite(c.fundingRatePct8h) || Math.abs(c.fundingRatePct8h) > 1 || ![c.maxTradesPerDay, c.maxPositionsOpenedPerDay].every(n => Number.isSafeInteger(n) && n > 0 && n <= 1000) || !['both', 'long', 'short'].includes(c.direction))
        throw new Error('Invalid simulation settings');
    if (c.autoSizing !== undefined && (!['TARGET_RISK','MINIMUM_ORDER'].includes(c.autoSizing) || c.leverageMode !== 'AUTO') || c.leverageMode !== undefined && !['FIXED','AUTO'].includes(c.leverageMode) || c.maxExposureMultiple !== undefined && (!Number.isFinite(c.maxExposureMultiple) || c.maxExposureMultiple<=0 || c.maxExposureMultiple>c.leverage)) throw new Error('Invalid leverage/exposure policy');
    if (c.exitPolicy !== undefined) validateExitPolicy(c.exitPolicy, strategy.id);
    marketDayOffset(c.dailyTimezone);
    const prepared = prepareStrategy(bars, strategy), { signals, rawSignals, atr } = prepared, trades: SimTrade[] = [], equityCurve: {
        timestamp: number;
        equity: number;
        benchmark: number;
    }[] = [];
    let cash = c.initialCapital, peak = cash, drawdown = 0, day = -1, dayStart = cash, entries = 0, orders = 0, liquidations = 0;
    let pending: Signal = 'hold', pendingExit: Signal = 'hold', pendingAtr: number | undefined;
    let lastExitIndex = -Infinity, currentIndex = 0;
    type Position = {
        sign: 1 | -1;
        entry: number;
        timestamp: number;
        contracts: number;
        units: number;
        stop: number;
        target: number;
        initialStop?: number;
        targetEnabled?: boolean;
        trailingActive?: boolean;
        protectionTimeline?: ProtectionChange[];
        margin: number;
        fee: number;
        funding: number;
        liquidation: number;
        leverage?: number;
    sizing?: AutomaticSizingDiagnostics;
    };
    let p: Position | undefined;
    const enhanced = strategy.executionRules !== undefined;
    const executionDiagnostics: ExecutionDiagnostics = { decisions: 0, entries: 0, skips: {} };
    const usedIds: string[] = [];
    let dailyGrossLoss = 0;
    const feeRate = c.feeBps / 10000, slip = c.slippageBps / 10000;
    const close = (raw: number, timestamp: number, reason: SimTrade['reason']) => {
        if (!p)
            return;
        const price = raw * (1 - p.sign * slip), fee = price * p.units * feeRate;
        // Isolated margin bounds loss at the posted margin; fees already paid separately.
        const pnl = reason === 'liquidation' ? -p.margin : (price - p.entry) * p.units * p.sign;
        cash += pnl - fee;
        if (enhanced) dailyGrossLoss += Math.max(0, -pnl) + fee;
        trades.push({ side: p.sign === 1 ? 'long' : 'short', entryTimestamp: p.timestamp, exitTimestamp: timestamp, entryPrice: p.entry, exitPrice: price, contracts: p.contracts, ...(p.leverage!==undefined?{leverage:p.leverage}:{}), ...(p.sizing?{sizing:p.sizing}:{}), ...(enhanced || c.exitPolicy ? { stopPrice: p.initialStop ?? p.stop, targetPrice: p.target } : {}), ...(p.protectionTimeline ? {protectionTimeline:p.protectionTimeline} : {}), fees: p.fee + fee, funding: p.funding, netPnl: pnl - p.fee - fee - p.funding, reason });
        if (reason === 'liquidation')
            liquidations++;
        p = undefined;
        lastExitIndex = currentIndex;
    };
    for (let i = 0; i < bars.length; i++) {
        currentIndex = i;
        const b = bars[i]!, prev = bars[i - 1];
        // Funding is an explicit constant-rate approximation, settled at UTC 8h boundaries.
        let fundingLoss = 0;
        if (p && prev) {
            const settlements = Math.floor(b.timestamp / 28800) - Math.floor(prev.timestamp / 28800);
            const payment = settlements * p.sign * p.units * prev.close * c.fundingRatePct8h / 100;
            cash -= payment;
            p.funding += payment;
            fundingLoss = Math.max(0, payment);
        }
        const equityAtOpen = cash + (p ? (b.open - p.entry) * p.units * p.sign : 0);
        const newDay = marketDayIndex(b.timestamp, c.dailyTimezone);
        if (newDay !== day) {
            day = newDay;
            dayStart = Math.max(equityAtOpen, 0);
            entries = 0;
            orders = 0;
            if (enhanced) dailyGrossLoss = 0;
        }
        if (enhanced) dailyGrossLoss += fundingLoss;
        if (p && (p.sign === 1 ? b.open <= p.liquidation : b.open >= p.liquidation))
            close(p.liquidation, b.timestamp, 'liquidation');
        if (p && (enhanced && strategy.id === 'meanReversion' ? prepared.exitSignals[i - 1] === (p.sign === 1 ? 'long' : 'short') : (pendingExit === 'exit' || (pendingExit === 'long' && p.sign === -1) || (pendingExit === 'short' && p.sign === 1))))
            close(b.open, b.timestamp, 'signal');
        if (enhanced && prepared.entryProposals[i - 1]) {
            executionDiagnostics.decisions++;
            const proposal = prepared.entryProposals[i - 1]!;
            const decision = decideSimulationEntry({proposal,timestamp:b.timestamp,usedIds,occupied:!!p,
                cooldown:i-lastExitIndex <= (strategy.entryTiming?.cooldownBars ?? -1),cash,dayStart,dailyGrossLoss,
                entries,orders,atr:atr[i-1],mean:prepared.means[i-1],open:b.open,contract,strategy,config:c});
            if (decision.entry) {
                p = decision.entry; cash -= p.fee; dailyGrossLoss += p.fee;
                entries++; orders++; usedIds.push(proposal.id); executionDiagnostics.entries++;
            } else executionDiagnostics.skips[decision.reason!] = (executionDiagnostics.skips[decision.reason!] ?? 0) + 1;
        }
        const lossBlocked = dayStart <= 0 || cash <= dayStart * (1 - c.maxDailyLossPct / 100);
        if (!enhanced && !p && i - lastExitIndex > (strategy.entryTiming?.cooldownBars ?? -1) && !lossBlocked && cash > 0 && entries < c.maxPositionsOpenedPerDay && orders < c.maxTradesPerDay && pendingAtr && pendingAtr > 0 && ((pending === 'long' && c.direction !== 'short') || (pending === 'short' && c.direction !== 'long'))) {
            const sign: 1 | -1 = pending === 'long' ? 1 : -1, price = b.open * (1 + sign * slip), distance = pendingAtr * strategy.stopAtr;
            const perContractRisk = contract.contractSize * (distance + 2 * price * feeRate + 2 * price * slip);
            const remainingDailyLoss = Math.max(0, cash - dayStart * (1 - c.maxDailyLossPct / 100));
            const riskBudget = Math.min(cash * c.riskPerTradePct / 100, remainingDailyLoss);
            const riskContracts = Math.floor(riskBudget / perContractRisk);
            const marginContracts = Math.floor(cash * c.maxMarginPct / 100 / (price * contract.contractSize * (1 / c.leverage + feeRate)));
            const automatic=c.leverageMode==='AUTO' ? sizeAutomaticSimulationEntry({ceiling:c.leverage,autoSizing:c.autoSizing,cash,riskBudget,maxMarginPct:c.maxMarginPct,maxExposureMultiple:c.maxExposureMultiple??c.leverage,price,stopPrice:price-sign*distance,contractSize:contract.contractSize,minContracts:contract.minContracts,maintenanceMarginRate:contract.maintenanceMarginRate,feeRate,slippageRate:slip}) : undefined;
            const leverage=automatic?.leverage??c.leverage;
            const contracts=c.leverageMode==='AUTO' ? automatic?.amount??0 : Math.min(riskContracts,marginContracts,Math.floor(cash*(c.maxExposureMultiple??c.leverage)/(price*contract.contractSize)));
            if (contracts >= contract.minContracts && price - sign * distance > 0 && price + sign * distance * strategy.rewardRisk > 0) {
                const units = contracts * contract.contractSize, margin = price * units / leverage, fee = price * units * feeRate;
                cash -= fee;
                const liquidation = sign === 1 ? price * (1 - 1 / leverage) / (1 - contract.maintenanceMarginRate) : price * (1 + 1 / leverage) / (1 + contract.maintenanceMarginRate);
                p = { ...(automatic?{leverage,...(c.autoSizing?{sizing:automatic.diagnostics}:{})}:{}), sign, entry: price, timestamp: b.timestamp, contracts, units, margin, fee, funding: 0, stop: price - sign * distance, target: price + sign * distance * strategy.rewardRisk, liquidation };
                entries++;
                orders++;
            }
        }
        if (p && c.exitPolicy && p.initialStop === undefined) {
            p.initialStop = p.stop; p.targetEnabled = true; p.trailingActive = false;
            p.protectionTimeline = [{effectiveFrom:b.timestamp,stopPrice:p.stop,targetEnabled:true,trailingActive:false}];
        }
        if (p) {
            // Candle OHLC does not reveal event ordering: choose adverse liquidation first,
            // then stop before target. Gaps execute at the worse opening price.
            const liquidationHit = p.sign === 1 ? b.low <= p.liquidation : b.high >= p.liquidation;
            const stopHit = p.sign === 1 ? b.low <= p.stop : b.high >= p.stop;
            const targetHit = p.targetEnabled !== false && (p.sign === 1 ? b.high >= p.target : b.low <= p.target);
            if (liquidationHit)
                close(p.liquidation, b.timestamp, 'liquidation');
            else if (stopHit)
                close(p.sign === 1 ? Math.min(b.open, p.stop) : Math.max(b.open, p.stop), b.timestamp, 'stop');
            else if (targetHit)
                close(p.target, b.timestamp, 'target');
        }
        if (p && c.exitPolicy && i < bars.length - 1 && atr[i] !== undefined) {
            const protection = advanceExitProtection({side:p.sign === 1 ? 'long' : 'short',entryPrice:p.entry,close:b.close,atr:atr[i]!,
                state:{initialStop:p.initialStop!,stop:p.stop,targetEnabled:p.targetEnabled!,trailingActive:p.trailingActive!},policy:c.exitPolicy});
            if (protection.stop !== p.stop || protection.targetEnabled !== p.targetEnabled || protection.trailingActive !== p.trailingActive) {
                p.stop = protection.stop; p.targetEnabled = protection.targetEnabled; p.trailingActive = protection.trailingActive;
                p.protectionTimeline!.push({effectiveFrom:bars[i+1]!.timestamp,stopPrice:p.stop,targetEnabled:p.targetEnabled,trailingActive:p.trailingActive});
            }
        }
        if (i === bars.length - 1 && p)
            close(b.close, b.timestamp, 'end');
        const equity = cash + (p ? (b.close - p.entry) * p.units * p.sign - p.units * b.close * feeRate : 0);
        peak = Math.max(peak, equity);
        drawdown = Math.max(drawdown, (peak - equity) / peak * 100);
        equityCurve.push({ timestamp: b.timestamp, equity, benchmark: c.initialCapital * b.close / bars[0]!.close });
        pending = signals[i]!;
        pendingExit = rawSignals[i]!;
        pendingAtr = atr[i];
    }
    const grossWin = trades.reduce((a, t) => a + Math.max(t.netPnl, 0), 0), grossLoss = trades.reduce((a, t) => a - Math.min(t.netPnl, 0), 0);
    return { ...(enhanced ? { executionDiagnostics } : {}), strategyVersion: STRATEGY_VERSION, trades, equityCurve, finalEquity: cash, netReturnPct: (cash / c.initialCapital - 1) * 100, maxDrawdownPct: drawdown, tradeCount: trades.length, winRatePct: trades.length ? trades.filter(t => t.netPnl > 0).length / trades.length * 100 : 0, profitFactor: grossLoss ? grossWin / grossLoss : null, liquidations, benchmarkReturnPct: (bars.at(-1)!.close / bars[0]!.close - 1) * 100, totalFees: trades.reduce((a, t) => a + t.fees, 0), totalFunding: trades.reduce((a, t) => a + t.funding, 0) };
}
