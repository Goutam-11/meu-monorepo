import { z } from 'zod';
export const cryptoStrategySettingsSchema = z.object({
    symbol: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,24}$/),
    timeframe: z.enum(['15m', '1h', '4h', '1d']),
    strategy: z.object({ id: z.enum(['ema', 'donchian', 'meanReversion']), executionRules: z.discriminatedUnion('version', [z.object({ version: z.literal(1) }).strict(), z.object({ version: z.literal(2), emaEntry: z.enum(['crossover','trend','combined']) }).strict()]).optional(), fastPeriod: z.number().int().min(2).max(500), slowPeriod: z.number().int().min(3).max(500), lookback: z.number().int().min(2).max(500), atrPeriod: z.number().int().min(2).max(500), stopAtr: z.number().positive().max(10), rewardRisk: z.number().positive().max(10), entryTiming: z.object({mode:z.enum(['immediate','confirm','retest']),confirmationBars:z.number().int().min(1).max(5),maxWaitBars:z.number().int().min(1).max(20),cooldownBars:z.number().int().min(0).max(20)}).refine(timing=>timing.maxWaitBars>=timing.confirmationBars,{message:'Wait window must cover confirmation candles',path:['maxWaitBars']}).optional() }).refine(c => c.fastPeriod < c.slowPeriod, { message: 'Fast EMA must be shorter than slow EMA' }),
    simulation: z.object({ dailyTimezone: z.literal('Asia/Kolkata').default('Asia/Kolkata'), initialCapital: z.number().positive().max(1e8), leverage: z.number().int().min(1).max(20), leverageMode:z.enum(['FIXED','AUTO']).optional(), autoSizing:z.enum(['TARGET_RISK','MINIMUM_ORDER']).optional(), maxExposureMultiple:z.number().positive().max(20).optional(), riskPerTradePct: z.number().positive().max(10), maxMarginPct: z.number().positive().max(100), feeBps: z.number().min(0).max(100), slippageBps: z.number().min(0).max(100), fundingRatePct8h: z.number().min(-1).max(1), maxTradesPerDay: z.number().int().min(1).max(1000), maxPositionsOpenedPerDay: z.number().int().min(1).max(1000), maxDailyLossPct: z.number().positive().max(100), direction: z.enum(['both', 'long', 'short']) }).superRefine((s,ctx)=>{if(s.autoSizing!==undefined&&s.leverageMode!=='AUTO')ctx.addIssue({code:'custom',path:['autoSizing'],message:'Automatic sizing requires automatic leverage'});if(s.maxExposureMultiple!==undefined&&s.maxExposureMultiple>s.leverage)ctx.addIssue({code:'custom',path:['maxExposureMultiple'],message:'Gross notional ceiling cannot exceed the leverage ceiling'});}),
});
export const configuredCryptoAgentSchema = z.object({
    name: z.string().trim().min(2).max(100),
    exchangeId: z.string().regex(/^[a-f0-9]{24}$/i),
    mode: z.enum(['PAPER', 'LIVE']),
    agentCycles: z.number().int().min(1).max(86400),
    risk: z.object({
        maxRiskPerTradePct: z.number().positive().max(10),
        maxDailyLossPct: z.number().positive().max(100),
        maxOpenPositions: z.literal(1),
        maxTradesPerDay: z.number().int().min(1).max(1000),
        maxPositionsOpenedPerDay: z.number().int().min(1).max(1000),
    }).optional(),
    capital: z.object({ allocated: z.number().positive().max(1e8), currency: z.literal('USD') }).optional(),
    config: cryptoStrategySettingsSchema,
}).superRefine((input, ctx) => {
    const interval = { '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 }[input.config.timeframe];
    if (input.agentCycles > interval) ctx.addIssue({ code: 'custom', path: ['agentCycles'], message: 'Agent cycle must not exceed the candle timeframe' });
    if (Boolean(input.risk) !== Boolean(input.capital))
        ctx.addIssue({ code: 'custom', path: [input.risk ? 'capital' : 'risk'], message: 'Provide both the agent risk policy and its capital allocation' });
    if (input.risk && input.capital) {
        const simulation = input.config.simulation;
        const pairs: [string, number, string, number][] = [
            ['risk.maxRiskPerTradePct', input.risk.maxRiskPerTradePct, 'config.simulation.riskPerTradePct', simulation.riskPerTradePct],
            ['risk.maxDailyLossPct', input.risk.maxDailyLossPct, 'config.simulation.maxDailyLossPct', simulation.maxDailyLossPct],
            ['risk.maxTradesPerDay', input.risk.maxTradesPerDay, 'config.simulation.maxTradesPerDay', simulation.maxTradesPerDay],
            ['risk.maxPositionsOpenedPerDay', input.risk.maxPositionsOpenedPerDay, 'config.simulation.maxPositionsOpenedPerDay', simulation.maxPositionsOpenedPerDay],
            ['capital.allocated', input.capital.allocated, 'config.simulation.initialCapital', simulation.initialCapital],
        ];
        for (const [agentField, agentValue, simulationField, simulationValue] of pairs)
            if (agentValue !== simulationValue)
                ctx.addIssue({ code: 'custom', path: ['risk'], message: `${agentField}=${agentValue} must match ${simulationField}=${simulationValue}` });
    }
});
export const backtestInputSchema = cryptoStrategySettingsSchema.extend({
    start: z.number().int().nonnegative(), end: z.number().int().positive(),
    periodRole: z.enum(['research', 'validation']).default('research'),
}).superRefine((c, ctx) => {
    const seconds = { '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 }[c.timeframe];
    if (c.end <= c.start || c.end > Math.floor(Date.now() / 1000) || (c.end - c.start) / seconds > 10000)
        ctx.addIssue({ code: 'custom', path: ['end'], message: 'Choose a past date range with at most 10,000 candles' });
    if ((c.end - c.start) / seconds < Math.max(c.strategy.id === 'ema' ? c.strategy.slowPeriod : c.strategy.lookback, c.strategy.atrPeriod, c.strategy.id === 'meanReversion' ? 15 : 0) + 2)
        ctx.addIssue({ code: 'custom', path: ['end'], message: 'Date range is too short for indicator warmup' });
});
export type BacktestInput = z.infer<typeof backtestInputSchema>;
