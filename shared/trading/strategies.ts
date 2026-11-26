import type { Candle } from './emaCrossover';
export type StrategyConfig = {
    id: 'ema' | 'donchian' | 'meanReversion';
    fastPeriod: number;
    slowPeriod: number;
    lookback: number;
    atrPeriod: number;
    stopAtr: number;
    rewardRisk: number;
    /** Explicit opt-in: stored legacy configurations keep their original signals. */
    executionRules?: { version: 1 } | { version: 2; emaEntry: 'crossover' | 'trend' | 'combined' };
    /** Optional: legacy configurations retain immediate entries. */
    entryTiming?: { mode: 'immediate' | 'confirm' | 'retest'; confirmationBars: number; maxWaitBars: number; cooldownBars: number };
};
export type EntryProposal = {
    id: string;
    side: 'long' | 'short';
    level: number;
    source?: 'crossover' | 'trend' | 'breakout' | 'range';
    /** Causal EMA extension bound, refreshed only by completed candles. */
    priceLimit?: number;
    originTimestamp: number;
    confirmedTimestamp: number;
    /** Exclusive cutoff, fixed when the setup is first observed. */
    expiresTimestamp: number;
};
// Mechanical guards, not fitted to returns: EMA separation is |fast - slow|,
// extension is |close - fast|. Range drift and separation use pre-excursion ATR.
const MIN_TREND_SEPARATION_ATR = 0.1;
const MAX_EMA_EXTENSION_ATR = 1.5;
const RANGE_DRIFT_BARS = 5;
const MAX_RANGE_DRIFT_ATR = 0.5;
// v2 research policy: fixed before cross-period evaluation, not fitted to a run.
const EFFICIENCY_PERIOD = 10;
const MIN_DIRECTIONAL_EFFICIENCY = 0.35;
const TREND_RESET_EFFICIENCY = 0.2;
const TREND_SLOPE_BARS = 5;
const MIN_TREND_SLOPE_ATR = 0.25;
const MIN_REGIME_SEPARATION_ATR = 0.25;
export type Signal = 'long' | 'short' | 'exit' | 'hold';
export type StrategyDefinition = {
    readonly adaptive: boolean;
    readonly regime: boolean;
    readonly emaEntry: 'crossover' | 'trend' | 'combined';
};
/** Explicit behaviours keyed by the saved configuration's legacy flags. */
export const STRATEGY_DEFINITIONS = {
    legacy: { adaptive: false, regime: false, emaEntry: 'combined' },
    adaptiveV1: { adaptive: true, regime: false, emaEntry: 'combined' },
    adaptiveV2Crossover: { adaptive: true, regime: true, emaEntry: 'crossover' },
    adaptiveV2Trend: { adaptive: true, regime: true, emaEntry: 'trend' },
    adaptiveV2Combined: { adaptive: true, regime: true, emaEntry: 'combined' },
} as const satisfies Record<string, StrategyDefinition>;
export function resolveStrategyDefinition(c: StrategyConfig): StrategyDefinition {
    if (c.executionRules?.version === 2) {
        if (c.executionRules.emaEntry === 'crossover') return STRATEGY_DEFINITIONS.adaptiveV2Crossover;
        if (c.executionRules.emaEntry === 'trend') return STRATEGY_DEFINITIONS.adaptiveV2Trend;
        return STRATEGY_DEFINITIONS.adaptiveV2Combined;
    }
    return c.executionRules?.version === 1 ? STRATEGY_DEFINITIONS.adaptiveV1 : STRATEGY_DEFINITIONS.legacy;
}
export const STRATEGY_VERSION = '1.1.0';
export const strategyCatalog = [
    { id: 'ema', name: 'EMA crossover', description: 'Follow closed-candle fast/slow EMA crossovers. Can whipsaw in ranges.' },
    { id: 'donchian', name: 'Donchian breakout', description: 'Break the previous high/low range. Susceptible to false breakouts.' },
    { id: 'meanReversion', name: 'Bollinger + RSI', description: 'Enter on a return inside the bands after an RSI extreme. Trends can defeat it.' },
] as const;
export function validateStrategy(c: StrategyConfig) {
    if (!strategyCatalog.some(s => s.id === c.id) || ![c.fastPeriod, c.slowPeriod, c.lookback, c.atrPeriod].every(n => Number.isSafeInteger(n) && n >= 2 && n <= 500) || c.fastPeriod >= c.slowPeriod || ![c.stopAtr, c.rewardRisk].every(n => Number.isFinite(n) && n > 0 && n <= 10))
        throw new Error('Invalid strategy parameters');
    if (c.executionRules !== undefined && (!c.executionRules || c.executionRules.version !== 1 && c.executionRules.version !== 2 ||
        c.executionRules.version === 2 && !['crossover','trend','combined'].includes(c.executionRules.emaEntry)))
        throw new Error('Invalid execution rules version');
    const t = c.entryTiming;
    if (t && (!['immediate', 'confirm', 'retest'].includes(t.mode) || !Number.isSafeInteger(t.confirmationBars) || t.confirmationBars < 1 || t.confirmationBars > 5 || !Number.isSafeInteger(t.maxWaitBars) || t.maxWaitBars < t.confirmationBars || t.maxWaitBars > 20 || !Number.isSafeInteger(t.cooldownBars) || t.cooldownBars < 0 || t.cooldownBars > 20))
        throw new Error('Invalid entry timing settings');
}
function ema(values: number[], period: number) {
    const out: (number | undefined)[] = [];
    let sum = 0;
    let previous: number | undefined;
    for (let i = 0; i < values.length; i++) {
        sum += values[i]!;
        if (i === period - 1)
            previous = sum / period;
        else if (i >= period)
            previous = values[i]! * (2 / (period + 1)) + previous! * (1 - 2 / (period + 1));
        out.push(previous);
    }
    return out;
}
/** Each index uses only the prefix ending at that index; executable after its close. */
export function prepareStrategy(bars: readonly Candle[], c: StrategyConfig, activeAfter = 0) {
    validateStrategy(c);
    const closes = bars.map(b => b.close), fast = ema(closes, c.fastPeriod), slow = ema(closes, c.slowPeriod);
    const signals: Signal[] = [], rawSignals: Signal[] = [], decisions: string[] = [], atr: (number | undefined)[] = [];
    const definition = resolveStrategyDefinition(c);
    const adaptive = definition.adaptive;
    const regimeRules = definition.regime;
    const emaEntry = definition.emaEntry;
    const entryProposals: (EntryProposal | undefined)[] = [], exitSignals: ('long' | 'short' | undefined)[] = [], means: (number | undefined)[] = [];
    let setup: { side: 'long' | 'short'; index: number; level: number; confirmations: number; touched: boolean; expiresTimestamp: number; source?: EntryProposal['source']; proposal?: EntryProposal } | undefined;
    let breakoutEpisode: { side: 'long' | 'short'; level: number } | undefined;
    let trendEpisode: { side: 'long' | 'short'; confirmed: boolean; weakBars: number } | undefined;
    let previouslyEligible = false;
    let gain = 0, loss = 0, range = 0;
    const rsi: (number | undefined)[] = [], bands: ({
        lower: number;
        upper: number;
        mean: number;
    } | undefined)[] = [];
    let pending: { side: 'long' | 'short'; index: number; level: number; confirmations: number; touched: boolean } | undefined;
    for (let i = 0; i < bars.length; i++) {
        const b = bars[i]!, prev = bars[i - 1];
        const tr = prev ? Math.max(b.high - b.low, Math.abs(b.high - prev.close), Math.abs(b.low - prev.close)) : b.high - b.low;
        if (i < c.atrPeriod)
            range += tr;
        else
            range = range - range / c.atrPeriod + tr;
        atr.push(i >= c.atrPeriod - 1 ? range / c.atrPeriod : undefined);
        if (prev) {
            const delta = b.close - prev.close;
            if (i <= 14) {
                gain += Math.max(delta, 0);
                loss += Math.max(-delta, 0);
            }
            else {
                gain = gain - gain / 14 + Math.max(delta, 0);
                loss = loss - loss / 14 + Math.max(-delta, 0);
            }
        }
        rsi.push(i >= 14 ? (loss === 0 ? (gain === 0 ? 50 : 100) : 100 - 100 / (1 + gain / loss)) : undefined);
        if (i >= c.lookback - 1) {
            const window = closes.slice(i - c.lookback + 1, i + 1), mean = window.reduce((a, v) => a + v, 0) / window.length, deviation = Math.sqrt(window.reduce((a, v) => a + (v - mean) ** 2, 0) / window.length);
            bands.push({ mean, lower: mean - 2 * deviation, upper: mean + 2 * deviation });
        }
        else
            bands.push(undefined);
        let signal: Signal = 'hold';
        if (c.id === 'ema' && i > 0 && slow[i - 1] !== undefined) {
            if (fast[i - 1]! <= slow[i - 1]! && fast[i]! > slow[i]!)
                signal = 'long';
            if (fast[i - 1]! >= slow[i - 1]! && fast[i]! < slow[i]!)
                signal = 'short';
        }
        else if (c.id === 'donchian' && i >= c.lookback) {
            const prior = bars.slice(i - c.lookback, i);
            if (b.close > Math.max(...prior.map(x => x.high)))
                signal = 'long';
            else if (b.close < Math.min(...prior.map(x => x.low)))
                signal = 'short';
        }
        else if (c.id === 'meanReversion' && prev && bands[i - 1] && bands[i] && rsi[i - 1] !== undefined) {
            if (prev.close < bands[i - 1]!.lower && rsi[i - 1]! < 30 && b.close >= bands[i]!.lower)
                signal = 'long';
            else if (prev.close > bands[i - 1]!.upper && rsi[i - 1]! > 70 && b.close <= bands[i]!.upper)
                signal = 'short';
            else if ((prev.close < bands[i - 1]!.mean && b.close >= bands[i]!.mean) || (prev.close > bands[i - 1]!.mean && b.close <= bands[i]!.mean))
                signal = 'exit';
        }
        means.push(bands[i]?.mean);
        const exitSide = c.id === 'meanReversion' && prev && bands[i - 1] && bands[i] ?
            prev.close < bands[i - 1]!.mean && b.close >= bands[i]!.mean ? 'long' :
            prev.close > bands[i - 1]!.mean && b.close <= bands[i]!.mean ? 'short' : undefined : undefined;
        exitSignals.push(exitSide);
        if (adaptive) {
            const timing = c.entryTiming ?? { mode: 'immediate', confirmationBars: 1, maxWaitBars: 3, cooldownBars: 0 };
            const volatility = atr[i];
            const path = i >= EFFICIENCY_PERIOD ? closes.slice(i - EFFICIENCY_PERIOD + 1, i + 1)
                .reduce((sum, close, offset) => sum + Math.abs(close - closes[i - EFFICIENCY_PERIOD + offset]!), 0) : 0;
            const signedEfficiency = path > 0 ? (b.close - closes[i - EFFICIENCY_PERIOD]!) / path : 0;
            const regimeReason = (side: 'long' | 'short', source: EntryProposal['source'] = 'trend'): string | undefined => {
                if (!regimeRules || c.id === 'meanReversion') return;
                if (!volatility || i < EFFICIENCY_PERIOD) return 'Waiting for trend indicator warmup';
                const sign = side === 'long' ? 1 : -1;
                if (sign * signedEfficiency < MIN_DIRECTIONAL_EFFICIENCY) return 'Sideways or opposing movement: directional efficiency too low';
                // Breakouts lead moving averages: do not require a lagging EMA trend.
                if (c.id === 'donchian') return;
                // A crossover is the start of a trend, not a mature trend.
                // Requiring established separation here suppresses every early cross.
                if (source === 'crossover') {
                    if (fast[i] === undefined) return 'Waiting for trend indicator warmup';
                    if (Math.abs(b.close - fast[i]!) > MAX_EMA_EXTENSION_ATR * volatility) return 'Price extended: waiting instead of chasing the move';
                    return;
                }
                if (slow[i - TREND_SLOPE_BARS] === undefined || fast[i] === undefined) return 'Waiting for trend indicator warmup';
                if (sign * (slow[i]! - slow[i - TREND_SLOPE_BARS]!) < MIN_TREND_SLOPE_ATR * volatility ||
                    sign * (fast[i]! - slow[i]!) < MIN_REGIME_SEPARATION_ATR * volatility) return 'Waiting for sustained EMA trend strength';
                if (sign * (b.close - fast[i]!) <= 0) return 'Waiting for price to align with the EMA trend';
                if (Math.abs(b.close - fast[i]!) > MAX_EMA_EXTENSION_ATR * volatility) return 'Price extended: waiting instead of chasing the move';
            };
            const crossoverSignal = signal;
            let entryRaw = signal;
            if (regimeRules && c.id === 'ema') {
                // Activation is a fresh opportunity, never an entry from a setup
                // formed during warmup or an intentional pause.
                if (b.timestamp >= activeAfter && prev && prev.timestamp < activeAfter) previouslyEligible = false;
                const side = fast[i] !== undefined && slow[i] !== undefined && fast[i] !== slow[i] ? fast[i]! > slow[i]! ? 'long' : 'short' : undefined;
                if (!side || trendEpisode?.side !== side) { trendEpisode = side ? {side,confirmed:false,weakBars:0} : undefined; previouslyEligible = false; }
                if (trendEpisode) {
                    const sign = trendEpisode.side === 'long' ? 1 : -1;
                    const weak = sign * signedEfficiency <= TREND_RESET_EFFICIENCY;
                    trendEpisode.weakBars = weak ? trendEpisode.weakBars + 1 : 0;
                    if (trendEpisode.weakBars >= 3) trendEpisode.confirmed = false;
                }
                const eligible = !!side && !regimeReason(side);
                const mode = emaEntry;
                entryRaw = mode === 'trend' ? 'hold' : crossoverSignal;
                if (mode !== 'crossover' && side && eligible && !previouslyEligible && !trendEpisode?.confirmed) entryRaw = side;
                previouslyEligible = eligible;
                signal = crossoverSignal === 'long' || crossoverSignal === 'short' ? crossoverSignal : entryRaw;
            }
            // Qualify the background before the excursion/reclaim pair; the shock
            // itself must not turn a previously flat range into a trend rejection.
            const rangeIndex = i - 2, rangeAtr = atr[rangeIndex];
            const rangeValid = rangeAtr !== undefined && rangeAtr > 0 && slow[rangeIndex - RANGE_DRIFT_BARS] !== undefined &&
                Math.abs(slow[rangeIndex]! - slow[rangeIndex - RANGE_DRIFT_BARS]!) <= MAX_RANGE_DRIFT_ATR * rangeAtr &&
                Math.abs(fast[rangeIndex]! - slow[rangeIndex]!) <= MAX_RANGE_DRIFT_ATR * rangeAtr;
            // A reclaim is a new event even when the crossover setup has expired.
            if (!regimeRules && c.id === 'ema' && prev && fast[i - 1] !== undefined && slow[i - 1] !== undefined && signal === 'hold') {
                if (fast[i]! > slow[i]! && fast[i - 1]! > slow[i - 1]! && prev.close <= fast[i - 1]! && b.close > fast[i]!) signal = 'long';
                else if (fast[i]! < slow[i]! && fast[i - 1]! < slow[i - 1]! && prev.close >= fast[i - 1]! && b.close < fast[i]!) signal = 'short';
            }
            if (c.id === 'donchian') {
                // A continuation above the original boundary belongs to the same episode,
                // even after confirmation or expiry. A close back inside resets it.
                if (breakoutEpisode && (breakoutEpisode.side === 'long' ? b.close <= breakoutEpisode.level : b.close >= breakoutEpisode.level)) breakoutEpisode = undefined;
                if (signal === 'long' || signal === 'short') {
                    if (breakoutEpisode?.side === signal) signal = 'hold';
                    else {
                        const prior = bars.slice(i - c.lookback, i);
                        breakoutEpisode = { side: signal, level: signal === 'long' ? Math.max(...prior.map(x => x.high)) : Math.min(...prior.map(x => x.low)) };
                    }
                }
            }
            if (c.id === 'meanReversion' && (signal === 'long' || signal === 'short') &&
                (!rangeValid || (signal === 'long' ? b.close >= bands[i]!.mean : b.close <= bands[i]!.mean))) signal = 'hold';
            rawSignals.push(signal);
            let decision = 'No new setup';
            const raw = regimeRules && c.id === 'ema' ? entryRaw : signal;
            if (regimeRules && c.id !== 'meanReversion') {
                const side = fast[i]! > slow[i]! ? 'long' : 'short';
                decision = regimeReason(side) ?? (c.id === 'ema' && trendEpisode?.confirmed ? 'Trend opportunity already confirmed; waiting for a new trend phase' : 'Waiting for a fresh entry setup');
            }
            signal = exitSide ? 'exit' : 'hold';
            const trendValid = (side: 'long' | 'short') => c.id !== 'ema' || (side === 'long' ? fast[i]! > slow[i]! : fast[i]! < slow[i]!);
            const qualityValid = (side: 'long' | 'short', source?: EntryProposal['source']) => volatility !== undefined && volatility > 0 && !regimeReason(side,source) && (!regimeRules && c.id === 'ema' ?
                Math.abs(fast[i]! - slow[i]!) >= MIN_TREND_SEPARATION_ATR * volatility &&
                (side === 'long' ? slow[i]! > slow[i - 1]! : slow[i]! < slow[i - 1]!) &&
                Math.abs(b.close - fast[i]!) <= MAX_EMA_EXTENSION_ATR * volatility : true);
            if (setup && (i - setup.index > timing.maxWaitBars || b.timestamp >= setup.expiresTimestamp || !trendValid(setup.side) ||
                (setup.side === 'long' ? b.close <= setup.level : b.close >= setup.level) || exitSide === setup.side ||
                c.id === 'meanReversion' && (setup.side === 'long' ? b.close >= bands[i]!.mean : b.close <= bands[i]!.mean) ||
                (raw === 'long' || raw === 'short') && raw !== setup.side)) {
                setup = undefined;
                decision = 'Setup expired or invalidated';
            }
            if (!setup && b.timestamp >= activeAfter && (raw === 'long' || raw === 'short')) {
                const interval = prev ? b.timestamp - prev.timestamp : 1;
                const level = c.id === 'ema' ? slow[i]! : c.id === 'donchian' ? breakoutEpisode!.level : raw === 'long' ? bands[i]!.lower : bands[i]!.upper;
                setup = { side: raw, index: i, level, confirmations: 0, touched: false, expiresTimestamp: b.timestamp + (timing.maxWaitBars + 1) * interval, ...(regimeRules ? {source:c.id === 'ema' ? (raw === crossoverSignal && regimeRules && emaEntry !== 'trend' ? 'crossover' as const : 'trend' as const) : c.id === 'donchian' ? 'breakout' as const : 'range' as const} : {}) };
                decision = timing.mode === 'retest' ? 'Setup found; waiting for retest' : 'Setup found; waiting for confirmation';
            }
            if (setup && !setup.proposal) {
                if (i > setup.index) decision = timing.mode === 'retest' ? 'Waiting for retest and reclaim' : 'Waiting for closed-candle follow-through';
                const long = setup.side === 'long';
                const holdsLevel = long ? b.close > setup.level : b.close < setup.level;
                if (i > setup.index) setup.touched ||= long ? b.low <= setup.level : b.high >= setup.level;
                const followsThrough = !!prev && (long ? b.close > prev.close : b.close < prev.close);
                const ready = qualityValid(setup.side,setup.source) && holdsLevel && (timing.mode === 'immediate' || i > setup.index &&
                    (timing.mode === 'retest' ? setup.touched : followsThrough));
                setup.confirmations = ready ? setup.confirmations + 1 : 0;
                if (setup.confirmations >= (timing.mode === 'immediate' ? 1 : timing.confirmationBars)) {
                    setup.proposal = { id: `${c.id}:${setup.side}:${bars[setup.index]!.timestamp}`, side: setup.side, level: setup.level,
                        ...(regimeRules ? {source:setup.source} : {}), originTimestamp: bars[setup.index]!.timestamp, confirmedTimestamp: b.timestamp, expiresTimestamp: setup.expiresTimestamp };
                    decision = 'Closed-candle setup confirmed';
                    if (regimeRules && c.id === 'ema' && trendEpisode?.side === setup.side) trendEpisode.confirmed = true;
                }
                if (regimeReason(setup.side,setup.source)) decision = regimeReason(setup.side,setup.source)!;
            }
            // Valid proposals remain available during cooldown; consumers consume an ID
            // only after an actual entry. Confirmation never extends the original expiry.
            const proposal = setup?.proposal && qualityValid(setup.side,setup.source) ?
                regimeRules && c.id === 'ema' ? {...setup.proposal,priceLimit:fast[i]! + (setup.side === 'long' ? 1 : -1) * MAX_EMA_EXTENSION_ATR * volatility!} : setup.proposal : undefined;
            if (proposal) { signal = proposal.side; decision = 'Confirmed setup remains valid'; }
            entryProposals.push(proposal);
            signals.push(signal);
            decisions.push(exitSide ? `Mean crossing closes ${exitSide}` : decision);
            continue;
        }
        entryProposals.push(undefined);
        rawSignals.push(signal);
        const timing = c.entryTiming;
        let decision = signal === 'hold' ? 'No new setup' : signal === 'exit' ? 'Mean-reversion exit signal' : 'Immediate entry setup';
        if (timing && timing.mode !== 'immediate') {
            const raw = signal;
            signal = raw === 'exit' ? 'exit' : 'hold';
            if (pending && i > pending.index) {
                const long = pending.side === 'long';
                const trendValid = c.id !== 'ema' || (long ? fast[i]! > slow[i]! : fast[i]! < slow[i]!);
                const holdsLevel = long ? b.close > pending.level : b.close < pending.level;
                if (!trendValid || raw === 'exit' || (raw !== 'hold' && raw !== pending.side) || i - pending.index > timing.maxWaitBars) {
                    decision = 'Setup expired or invalidated';
                    pending = undefined;
                } else {
                    pending.touched ||= long ? b.low <= pending.level : b.high >= pending.level;
                    const followsThrough = prev && (long ? b.close > prev.close : b.close < prev.close);
                    const ready = timing.mode === 'retest' ? pending.touched && holdsLevel : holdsLevel && !!followsThrough;
                    pending.confirmations = ready ? pending.confirmations + 1 : 0;
                    decision = timing.mode === 'retest' ? 'Waiting for retest and reclaim' : 'Waiting for closed-candle follow-through';
                    if (pending.confirmations >= timing.confirmationBars) {
                        signal = pending.side;
                        decision = timing.mode === 'retest' ? 'Retest reclaimed the setup level' : 'Closed-candle follow-through confirmed';
                        pending = undefined;
                    }
                }
            }
            // Repeated Donchian breakouts must not reset a waiting setup's age.
            if (!pending && b.timestamp >= activeAfter && signal === 'hold' && (raw === 'long' || raw === 'short')) {
                const prior = bars.slice(Math.max(0, i - c.lookback), i);
                const level = c.id === 'ema' ? slow[i]! : c.id === 'donchian' ?
                    (raw === 'long' ? Math.max(...prior.map(x => x.high)) : Math.min(...prior.map(x => x.low))) :
                    (raw === 'long' ? bands[i]!.lower : bands[i]!.upper);
                pending = { side: raw, index: i, level, confirmations: 0, touched: false };
                decision = timing.mode === 'retest' ? 'Setup found; waiting for retest' : 'Setup found; waiting for confirmation';
            }
        }
        signals.push(signal);
        decisions.push(decision);
    }
    return { signals, rawSignals, decisions, atr, entryProposals, exitSignals, means };
}
/** Shared entry point for paper/live consumers; does not access a broker. */
export function evaluateStrategy(bars: readonly Candle[], config: StrategyConfig, activeAfter = 0) {
    const prepared = prepareStrategy(bars.filter(b => b.closed), config, activeAfter);
    return { signal: prepared.signals.at(-1) ?? 'hold', rawSignal: prepared.rawSignals.at(-1) ?? 'hold', decision: prepared.decisions.at(-1) ?? 'No new setup', atr: prepared.atr.at(-1), entryProposal: prepared.entryProposals.at(-1), exitSide: prepared.exitSignals.at(-1), mean: prepared.means.at(-1) };
}
/** Legacy agents use their ID; revisions own separate indicator/portfolio state. */
export function strategyStateKey(agentId: string, config: {stateId?: unknown} | null | undefined) {
    if (config?.stateId === undefined) return agentId;
    if (typeof config.stateId !== 'string' || !config.stateId.startsWith(`${agentId}:`) ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(config.stateId.slice(agentId.length + 1)))
        throw new Error('Invalid strategy state revision');
    return config.stateId;
}
