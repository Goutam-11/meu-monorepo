import { exchangeMarketTimezone } from '../../../../shared/trading/marketDay';
import { analysisTimeframe, LlmMarketDataError } from "@/agentFunctions/cmFunctions";
import { validateSizingPolicy } from "../../../../shared/trading/sizing";
import { executionFailure, ExecutionLockReviewError } from './executionFailure';
import { DeltaDataError, DeltaDataValidationError } from '../../../../shared/trading/delta-data';
import { MissedLiveCandlesError } from '@/agent/cryptoStrategyConfig';
import type { Exchange } from "ccxt";
import { identifyDeltaAccount, registerDeltaAccount, createCryptoAccountContext, accountRiskSchema, type AccountRiskLimits } from "@/agent/cryptoAccount";
import { Worker, type Job } from "bullmq";
import { ObjectId, type Db } from "mongodb";
import { AGENT_QUEUE_NAME, agentQueue } from "@/queue/queue";
import { redis as connection, setAgentCached, deleteAgentCached, closeRedis } from "@/lib/redis";
import { connectDB, closeDB } from "@/db/db";
import { configureCryptoExchange, exchangeMap, type ExchangeName } from "@/config/config";
import { decryptSecret } from "@/config/encryption";
import { tradingAgent } from "@/agent/vercelAgent";
import { zerodhaTradingAgent } from "@/agent/zerodhaAgent";
import { getKiteEmaSignals } from "@/agent/kiteEmaSignals";
import { runPaperStrategy, runLiveCryptoStrategy, validateCryptoStrategy } from "@/agent/runCryptoStrategy";
import { runKiteEmaStrategy } from "@/agent/runKiteEmaStrategy";
import { validateEmaCrossoverParams, type EmaCrossoverParams } from "@/strategy/emaCrossover";
import { getKiteForExchange } from "@/agent/kiteTokenManager";
import { CryptoProtectionError, CryptoSettingsUncertainError, DeltaLeverageUncertainError, OrderRejectedError, type ExecutionSafety, type TradingPolicy } from "@/agent/tradeGuard";
import { cryptoEntrySnapshot, cryptoEntryMarket } from "@/agent/cryptoRisk";
import { reserveDailyEntry } from "@/agent/dailyRiskUsage";
import { isIndianMarketOpen, nextMarketOpen } from "@/lib/marketHours";
import { emitNotification, setLegacyNotificationCollection } from "@/lib/notifications";
import { logger, errMeta, runWithLogContext } from "@/lib/logger";
import { scheduleAgentRun } from "@/schedulers/scheduler";
import { toAgentCacheEntry } from "@/state/setStates";
import { LLM_REQUEST_TIMEOUT_MS, type LLMProviderId } from "@/agent/providers";
import { buildRunMemory, formatRunMemory, memoryContext, operationReceipt, type OperationReceipt } from "@/agent/runMemory";

const log = logger.child({ module: "worker" });
type AgentJobData = { agentId: string; userId: string; runAt: number; recoveryFailure?: {version:1;runId:string;brokerOperationRequested:false;failedAt:string;code:string} };
const providers: Record<string, LLMProviderId> = {
  OPENROUTER: "openrouter", OPENAI: "openai", ANTHROPIC: "anthropic", NVIDIA_NIM: "nvidia", OPENCODE: "opencode", AMAZON_BEDROCK: "bedrock",
};
export function createRunProcessor(db: Db) {
  const agents = db.collection("Agent");
  const executions = db.collection<{ _id: string; state: string; agentId: string; startedAt: Date; finishedAt?: Date; reviewReason?: string; outcome?: string; failure?: ReturnType<typeof executionFailure> & {retryAt?: string; consecutiveFailures?: number} }>("AgentExecutions");
  const locks = db.collection<{ _id: string; executionId: string; createdAt: Date; kind?: string; state?: string }>("ExecutionLocks");
  const intents = db.collection<{ _id: string; state: string; executionId: string; intent: Record<string, unknown>; createdAt: Date; result?: unknown }>("OrderIntents");
  if (process.env.NOTIFICATION_TRANSPORT === "db") setLegacyNotificationCollection(db.collection("Notification"));

  async function processRun(job: Job<AgentJobData>) {
    const { agentId, userId, runAt } = job.data;
    const startedAt = Date.now();
    log.info({ event: "run.started", scheduledAt: runAt }, "Agent run started");
    if (!ObjectId.isValid(agentId) || !Number.isSafeInteger(runAt)) throw new Error("Invalid agent job");
    const agent = await agents.findOne({ _id: new ObjectId(agentId), userId, status: "RUNNING" });
    if (!agent) { await deleteAgentCached(agentId); log.info({ event: "run.skipped", skipReason: "inactive_or_missing" }, "Agent run skipped"); return; }
    // Superseded/legacy queue entries must not create a second schedule chain.
    if (!agent.nextRunAt || new Date(agent.nextRunAt).getTime() !== runAt) { log.info({ event: "run.skipped", skipReason: "superseded" }, "Agent run skipped"); return; }
    log.info({ event: "run.configured", exchangeId: String(agent.exchangeId), strategy: agent.strategy, executionMode: agent.executionMode ?? "LIVE" }, "Agent run configuration resolved");
    const next = async (at: number) => {
      const result = await agents.updateOne({ _id: agent._id, userId, status: "RUNNING", nextRunAt: agent.nextRunAt }, {
        $set: { nextRunAt: new Date(at), updatedAt: new Date() },
      });
      if (result.modifiedCount) {
        const fresh = await agents.findOne({ _id: agent._id, userId, status: "RUNNING" });
        if (fresh) {
          await setAgentCached(toAgentCacheEntry(fresh));
          await scheduleAgentRun(agentId, userId, at);
        }
      }
    };
    const cadence = Number(agent.market?.agentCycles);
    const executionId = String(job.id);
    const acquired: string[] = [];
    let stage = "validate_configuration";
    let llmAnalysisTimeframe: string | undefined;
    let llmProvider: string | undefined;
    let llmEndpoint: string | undefined;
    let claimed = false;
    let completed = false;
    let brokerOperationRequested = false;
    let ambiguous = false;
    let uncertainFailure:unknown;
    const receipts: OperationReceipt[] = [];
    try {
      if (!Number.isSafeInteger(cadence) || cadence < 1) throw new Error("Invalid cadence");
      const strategy = String(agent.strategy);
      const usesLlm = strategy === "LLM_TRADING" || strategy === "HYBRID";
      if (!["LLM_TRADING", "ALGO_TRADING", "HYBRID"].includes(strategy) || !agent.exchangeId ||
          (usesLlm && (!agent.credentialId || !agent.llmModel))) {
        throw new Error("A supported strategy, exchange and any required model credential are required");
      }
      const credential = usesLlm
        ? await db.collection("Credentials").findOne({ _id: new ObjectId(agent.credentialId), userId })
        : null;
      llmProvider = credential ? providers[credential.type] : undefined;
      llmEndpoint = credential?.type === "AMAZON_BEDROCK" ? credential.bedrockEndpoint ?? "runtime" : undefined;
      const exchangeDoc = await db.collection("Exchange").findOne({ _id: new ObjectId(agent.exchangeId), userId });
      if ((usesLlm && !credential) || !exchangeDoc) throw new Error("Agent resources must belong to its owner");
      const paper = agent.executionMode === "PAPER";
      const cryptoAlgo = strategy === "ALGO_TRADING" && agent.type === "CRYPTO" && exchangeDoc.name.toUpperCase() === "DELTA" && ["PAPER", "LIVE"].includes(agent.executionMode);
      if (paper && !cryptoAlgo) throw new Error("Paper mode requires a saved Delta algorithm strategy");
      const cryptoConfig = cryptoAlgo ? validateCryptoStrategy(agent.strategyConfig) : undefined;
      if (cryptoConfig && (agent.market.symbols.length !== 1 || agent.capital.currency !== "USD" || cryptoConfig.simulation.initialCapital !== agent.capital.allocated || cryptoConfig.simulation.riskPerTradePct !== agent.risk.maxRiskPerTradePct)) throw new Error("Saved strategy allocation and agent policy differ");
      const zerodha = exchangeDoc.name.toUpperCase() === "ZERODHA";
      if (!zerodha && strategy === "LLM_TRADING") llmAnalysisTimeframe = analysisTimeframe(agent.strategyConfig?.analysisTimeframe);
      if ((strategy === "ALGO_TRADING" || strategy === "HYBRID") && !cryptoAlgo && (!zerodha || agent.type !== "STOCKS")) {
        throw new Error("Deterministic and hybrid execution currently require Zerodha stocks with verified INR risk accounting");
      }
      if (zerodha && !isIndianMarketOpen()) {
        const open = nextMarketOpen();
        if (!open) throw new Error("Next market session is unavailable");
        log.info({ event: "run.skipped", skipReason: "market_closed", nextRunAt: open.getTime() }, "Agent run deferred");
        await next(open.getTime());
        return;
      }
      let deltaExchange: Exchange | undefined;
      let accountKey: string | undefined;
      let accountLimits: AccountRiskLimits | undefined;
      if (!paper && (exchangeDoc.name.toUpperCase() === "DELTA" || exchangeDoc.name.toUpperCase() === "BINANCE")) {
        deltaExchange = new exchangeMap[exchangeDoc.name.toUpperCase() as "DELTA"|"BINANCE"]({ apiKey: decryptSecret(exchangeDoc.apiKey), secret: decryptSecret(exchangeDoc.secret), timeout: 15_000 });
        configureCryptoExchange(deltaExchange, Boolean(exchangeDoc.sandbox));
        await deltaExchange.loadMarkets();
        accountKey = await identifyDeltaAccount(deltaExchange, Boolean(exchangeDoc.sandbox));
        accountLimits = (await registerDeltaAccount(db, accountKey, userId, String(agent.exchangeId))).limits;
        const links = await db.collection("BrokerAccountLinks").find({ accountKey, userId }).toArray();
        const peers = await agents.find({ userId, status: "RUNNING", exchangeId: { $in: links.map(link => new ObjectId(String(link._id))) }, _id: { $ne: agent._id }, executionMode: { $ne: "PAPER" } }).toArray();
        const canonical = (symbol: string) => deltaExchange!.market(symbol).symbol;
        if (peers.some(other => other.market?.symbols?.some((symbol: string) => agent.market.symbols.some((allowed: string) => canonical(allowed) === canonical(symbol)))))
          throw new OrderRejectedError("Another live agent covers this broker account/ticker");
      }
      stage = "claim_execution";
      // Durable unique claims survive process death and BullMQ stalled redelivery.
      // Locks deliberately have no expiry: uncertain orders require review, not takeover.
      for (const key of paper ? [`agent:${agentId}`] : [`agent:${agentId}`, `exchange:${agent.exchangeId}`, ...(accountKey ? [`account:${accountKey}`] : [])]) {
        try { await locks.insertOne({ _id: key, executionId, createdAt: new Date() }); acquired.push(key); log.info({ event: "lock.acquired", lockId: key }, "Execution lock acquired"); }
        catch (err) {
          if ((err as { code?: number }).code === 11000) {
            const holder = await locks.findOne({ _id: key });
            const execution = holder && await executions.findOne({ _id: holder.executionId });
            let active = false;
            if (holder && holder.executionId !== executionId && holder.state !== "REVIEW_REQUIRED" && execution?.state !== "REVIEW_REQUIRED") {
              if (holder.kind === "START_PREFLIGHT" && holder.state === "PREPARING") {
                const age = Date.now() - holder.createdAt.getTime();
                active = age >= 0 && age < 5 * 60_000;
              } else {
                const ownerJob = await agentQueue.getJob(holder.executionId);
                active = !!ownerJob && await ownerJob.getState() === "active" && await connection.exists(agentQueue.toKey(`${holder.executionId}:lock`)) === 1;
              }
            }
            if (active) {
              await next(Date.now() + 15_000);
              log.info({ event: "run.skipped", skipReason: "exchange_busy", nextRunDelayMs: 15_000 }, "Agent run deferred until the active account operation completes");
              return;
            }
            throw new ExecutionLockReviewError(key.split(":")[0]!,holder?.executionId,execution?.state ?? holder?.state);
          }
          throw err;
        }
      }
      try {
        await executions.insertOne({ _id: executionId, state: "STARTED", agentId, startedAt: new Date() });
        claimed = true;
        log.info({ event: "run.claimed" }, "Agent execution claimed");
      } catch (err) {
        if ((err as { code?: number }).code === 11000) throw new Error("Run was already claimed; replay is prohibited");
        throw err;
      }
      let serial: Promise<unknown> = Promise.resolve();
      let sequence = 0;
      const policy: TradingPolicy = {
        symbols: agent.market.symbols,
        risk: {
          ...agent.risk,
          // Conservative defaults keep existing Mongo records valid after the config schema grows.
          maxTradesPerDay: agent.risk.maxTradesPerDay ?? 10,
          maxPositionsOpenedPerDay: agent.risk.maxPositionsOpenedPerDay ?? 5,
        },
        capital: agent.capital,
        ...(agent.strategyConfig?.sizing ? {sizing:validateSizingPolicy(agent.strategyConfig.sizing)} : {}),
        ...(cryptoConfig && !paper ? { futures: {
          leverage: cryptoConfig.simulation.leverage,
          maxMarginPct: cryptoConfig.simulation.maxMarginPct,
          maxNotional: agent.capital.allocated * (cryptoConfig.simulation.maxExposureMultiple ?? cryptoConfig.simulation.leverage),
          maintenanceMarginRate: cryptoConfig.contract.maintenanceMarginRate,
          feeBps: cryptoConfig.simulation.feeBps,
          slippageBps: cryptoConfig.simulation.slippageBps,
        } } : {}),
      };
      const safety: ExecutionSafety = {
        agentId,
        policy,
        assertActive: async () => {
          const current = await agents.findOne({ _id: agent._id, userId, status: "RUNNING", updatedAt: agent.updatedAt });
          if (!current) throw new OrderRejectedError("Agent was paused, deleted or changed during the run");
          if (ambiguous) throw new OrderRejectedError("An earlier broker operation has an unresolved result");
        },
        reserveDailyEntry: async (symbol, opensPosition) => {
          await reserveDailyEntry(db, agentId, policy, symbol, opensPosition, { timezone: exchangeMarketTimezone(zerodha ? "ZERODHA" : exchangeDoc.name) });
        },
        executeOrder: async <T>(intent: Record<string, unknown>, execute: () => Promise<T>): Promise<T> => {
          brokerOperationRequested = true;
          const operation = serial.then(async () => {
            await safety.assertActive();
            const id = `${executionId}-${++sequence}`;
            await intents.insertOne({ _id: id, executionId, state: "PENDING", intent, createdAt: new Date() });
            const orderStartedAt = Date.now();
            log.info({ event: "order.started", intentId: id }, "Broker operation started");
            try {
              const result = await execute();
              await intents.updateOne({ _id: id }, { $set: { state: "CONFIRMED", result } });
              receipts.push(operationReceipt(intent, "CONFIRMED"));
              log.info({ event: "order.confirmed", intentId: id, durationMs: Date.now() - orderStartedAt }, "Broker operation confirmed");
              return result;
            } catch (err) {
              if (err instanceof OrderRejectedError) {
                await intents.updateOne({ _id: id }, { $set: { state: "REFUSED", reason: err.message } });
                receipts.push(operationReceipt(intent, "REFUSED"));
              } else {
                ambiguous = true;
                uncertainFailure ??= err;
                receipts.push(operationReceipt(intent, "UNRESOLVED"));
              }
              log.warn({ event: err instanceof OrderRejectedError ? "order.refused" : "order.uncertain", intentId: id, durationMs: Date.now() - orderStartedAt, ...errMeta(err) }, "Broker operation did not complete");
              throw err;
            }
          });
          serial = operation.catch(() => {});
          return operation;
        },
      };
      if (deltaExchange && accountKey && accountLimits) {
        // Resolve limits under the shared lock, after any completed settings update.
        const current = await db.collection("BrokerAccounts").findOne({ _id: accountKey, userId } as never);
        accountLimits = accountRiskSchema.parse(current?.limits);
        safety.crypto = createCryptoAccountContext(db, deltaExchange, { accountKey, limits: accountLimits, agentId, userId });
        const market = cryptoEntryMarket(deltaExchange, policy.symbols[0]!, policy.capital.currency);
        await safety.crypto.scopeSnapshot(await cryptoEntrySnapshot(deltaExchange, market, policy), market);
      }
      const context = memoryContext(agent, exchangeDoc);
      const recent = usesLlm ? await db.collection("AgentRuns").find({ agentId, memoryContext: context })
        .sort({ createdAt: -1 }).limit(5).toArray() : [];
      const recentRuns = recent.map(formatRunMemory);
      stage = "prepare_execution";
      const secrets = paper ? { ...exchangeDoc } : {
        ...exchangeDoc, apiKey: decryptSecret(exchangeDoc.apiKey), secret: decryptSecret(exchangeDoc.secret),
        accessToken: exchangeDoc.accessToken ? decryptSecret(exchangeDoc.accessToken) : undefined,
      };
      const providerId = credential ? providers[String(credential.type)] : undefined;
      if (usesLlm && !providerId) throw new Error("Unsupported LLM provider");
      const common = credential && providerId && agent.llmModel ? {
        llmKey: decryptSecret(credential.apiKey), model: agent.llmModel, providerId, providerRegion: credential.region ?? undefined, providerEndpoint: credential.bedrockEndpoint ?? "runtime", name: exchangeDoc.name,
        recentRuns, safety, temperature: agent.temperature ?? 0.7,
      } : undefined;
      const strategyConfig = (agent.strategyConfig ?? { fastPeriod: 12, slowPeriod: 26 }) as EmaCrossoverParams;
      if (!cryptoAlgo && (strategy === "ALGO_TRADING" || strategy === "HYBRID")) validateEmaCrossoverParams(strategyConfig);
      stage = "execute_strategy";
      let response: string;
      if (cryptoAlgo && cryptoConfig) {
        if (exchangeDoc.sandbox) throw new Error("Saved historical strategies currently require Delta India production market data");
        const symbol = agent.market.symbols[0];
        const activeAfter = agent.strategyStartedAt ? Math.floor(new Date(agent.strategyStartedAt).getTime() / 1000) : Math.floor(Date.now() / 1000);
        if (paper) {
          response = await runPaperStrategy({ db, agentId, userId, symbol, config: cryptoConfig, safety, activeAfter });
        } else {
          const Adapter = exchangeMap.DELTA;
          const exchange = deltaExchange ?? new Adapter({ apiKey: secrets.apiKey, secret: secrets.secret, timeout: 15_000 });
          configureCryptoExchange(exchange, false);
          await exchange.loadMarkets();
          const market = exchange.market(symbol);
          const others = await agents.find({ exchangeId: agent.exchangeId, status: "RUNNING" }).toArray();
          if (others.some(other => String(other._id) !== agentId && other.executionMode !== "PAPER" && other.market?.symbols?.some((allowed: string) => exchange.market(allowed)?.symbol === market.symbol))) throw new Error("Another live agent covers this symbol; keep a single owner");
          response = await runLiveCryptoStrategy({ db, agentId, userId, symbol, config: cryptoConfig, safety, exchange, activeAfter });
        }
      } else if (zerodha) {
        if (exchangeDoc.sandbox) throw new Error("Kite does not provide a supported sandbox");
        const kc = await getKiteForExchange(db, secrets);
        if (!kc) {
          await executions.updateOne({ _id: executionId }, { $set: { state: "COMPLETED", finishedAt: new Date() } });
          completed = true;
          log.info({ event: "run.skipped", skipReason: "broker_auth_unavailable", durationMs: Date.now() - startedAt }, "Agent run skipped");
          await next(Date.now() + cadence * 1000);
          return;
        }
        if (strategy === "ALGO_TRADING") {
          response = await runKiteEmaStrategy({ kc, safety, symbols: agent.market.symbols, params: strategyConfig });
        } else if (strategy === "HYBRID") {
          const signals = await getKiteEmaSignals(kc, agent.market.symbols, strategyConfig);
          const actionable = signals.filter(item => item.decision.action !== "hold");
          if (actionable.length === 0) {
            response = "HYBRID: no configured EMA crossover signal; LLM was not invoked.";
          } else {
            if (!common) throw new Error("Hybrid strategy requires an LLM model and credential");
            response = await zerodhaTradingAgent({
              ...common,
              symbols: actionable.map(item => item.symbol),
              signalContext: actionable.map(item => `${item.symbol}: ${item.decision.action}${item.decision.action === "hold" ? "" : ` (${item.decision.reason})`}; current position quantity=${item.positionQuantity}`).join("\n"),
              kc,
            });
          }
        } else {
          if (!common) throw new Error("LLM strategy requires a model and credential");
          response = await zerodhaTradingAgent({ ...common, symbols: agent.market.symbols, kc });
        }
      } else {
        if (!common || strategy !== "LLM_TRADING") throw new Error("This crypto exchange currently uses the LLM strategy path");
        const Adapter = exchangeMap[exchangeDoc.name.toUpperCase() as ExchangeName];
        if (!Adapter) throw new Error("Unsupported exchange");
        const exchange = deltaExchange ?? new Adapter({ apiKey: secrets.apiKey, secret: secrets.secret, timeout: 15_000 });
        configureCryptoExchange(exchange, Boolean(exchangeDoc.sandbox));
        await exchange.loadMarkets();
        const timeframe = analysisTimeframe(agent.strategyConfig?.analysisTimeframe);
        if (!exchange.timeframes?.[timeframe]) throw new Error(`Exchange does not support the configured ${timeframe} candle interval`);
        const completedReviewCount = await db.collection("AgentRuns").countDocuments({ agentId });
        const lastSuccessfulReview = agent.lastRun ? new Date(agent.lastRun) : null;
        response = await tradingAgent({ ...common, Coin: agent.market.symbols, exchange, analysisTimeframe: timeframe,
          reviewContext: {
            currentRunStartedAt: new Date(startedAt).toISOString(), scheduledReviewAt: new Date(runAt).toISOString(),
            reviewCadenceSeconds: cadence,
            lastSuccessfulReviewAt: lastSuccessfulReview && Number.isFinite(lastSuccessfulReview.getTime()) ? lastSuccessfulReview.toISOString() : null,
            completedReviewCount, nextScheduledReviewAt: null,
            nextReviewPolicy: `On successful completion, schedule the next review ${cadence} seconds after completion; temporary failures may delay it.`,
          },
        });
      }
      await serial;
      if (ambiguous) throw uncertainFailure instanceof CryptoProtectionError || uncertainFailure instanceof CryptoSettingsUncertainError || uncertainFailure instanceof DeltaLeverageUncertainError ? uncertainFailure : new Error("A broker operation failed; reconcile OrderIntents before resuming");
      stage = "persist_run";
      const missingOutput = usesLlm && !response.trim();
      const savedResponse = missingOutput ? `Model returned no readable decision summary. Recorded broker operations: ${receipts.length}. Inspect execution evidence; no model decision is available.` : response;
      await db.collection("AgentRuns").insertOne({ agentId, llmResponse: savedResponse, createdAt: new Date(), executionId,
        ...(usesLlm ? { memoryContext: context, memory: buildRunMemory(response, receipts) } : {}),
      });
      await executions.updateOne({ _id: executionId }, { $set: { state: "COMPLETED", finishedAt: new Date(), ...(missingOutput ? { outcome: "LLM_OUTPUT_MISSING" } : {}) } });
      completed = true;
      await agents.updateOne({ _id: agent._id, userId }, { $set: { lastRun: new Date(), dataFailureCount: 0, executionWaitCount: 0, executionWaitingOn: null } });
      stage = "schedule_next_run";
      await next(Date.now() + cadence * 1000);
      log.info({ event: "run.completed", durationMs: Date.now() - startedAt }, "Agent run completed");
      if (missingOutput) {
        log.warn({event:'llm.output_missing',model:agent.llmModel,brokerOperationCount:receipts.length},'Model returned no readable decision summary');
        await emitNotification({type:'WARNING',source:'AGENT',code:'LLM_OUTPUT_MISSING',title:'Agent completed without a model summary',userId,agentId,exchangeId:String(agent.exchangeId),runId:executionId,message:savedResponse,metadata:{runId:executionId,model:agent.llmModel,brokerOperationCount:receipts.length,nextAction:'Inspect execution evidence and model compatibility. The run was not retried automatically.'}});
      }
    } catch (err) {
      let failure = executionFailure(err,{stage: err instanceof Error && ["AI_APICallError","APICallError","TimeoutError"].includes(err.name) ? "llm_request" : stage,...(['LLM_TRADING','HYBRID'].includes(agent.strategy) ? {llmProvider,llmEndpoint,llmModel:agent.llmModel,llmRequestTimeoutMs:LLM_REQUEST_TIMEOUT_MS} : {}),brokerOperationRequested,runId:executionId,scheduledAt:runAt,mode:agent.executionMode ?? 'LIVE',strategy:agent.strategy,symbols:agent.market?.symbols ?? [],lockCount:acquired.length,cadenceSeconds:Number.isSafeInteger(cadence) ? cadence : undefined,candleTimeframe:agent.strategy==='LLM_TRADING' ? llmAnalysisTimeframe : ['15m','1h','4h','1d'].includes(agent.strategyConfig?.timeframe) ? agent.strategyConfig.timeframe : undefined});
      // Keep independent evidence in durable queue storage before Mongo failure writes.
      // Only a claimed run with no requested broker operation can use this fallback.
      if (claimed && !brokerOperationRequested) {
        try { await job.updateData({...job.data,recoveryFailure:{version:1,runId:executionId,brokerOperationRequested:false,failedAt:failure.failedAt,code:failure.code}}); }
        catch(queueError) { log.error({event:'run.recovery_evidence_failed',...errMeta(queueError)},'Could not save queue recovery evidence; retained locks still require review'); }
      }
      if (err instanceof ExecutionLockReviewError && !claimed && stage === 'claim_execution') {
        const waitCount=Math.min(1000,Math.max(0,Number(agent.executionWaitCount)||0)+1);
        const retryAt=Date.now()+Math.min(5*60_000,30_000*2**Math.min(waitCount-1,4));
        const waitingFailure={...failure,nextAction:'The agent remains active and waits without placing orders. The holding execution must finish or be reconciled; its lock will not be taken over.',retryAt:new Date(retryAt).toISOString()};
        let executionRecordSaved=false;
        try {await executions.insertOne({_id:executionId,agentId,state:'COMPLETED',startedAt:new Date(startedAt),finishedAt:new Date(),outcome:'WAITING_ON_LOCK',failure:waitingFailure});executionRecordSaved=true;}
        catch(auditError){log.error({event:'run.failure_persist_failed',...errMeta(auditError)},'Could not persist waiting audit; holding execution preserved');}
        await agents.updateOne({_id:agent._id,userId,status:'RUNNING',nextRunAt:agent.nextRunAt},{$set:{executionWaitCount:waitCount,executionWaitingOn:err.ownerExecutionId ?? null}});
        await next(retryAt);
        log.warn({event:'run.lock_waiting',failure:waitingFailure},'Agent waits for the holding execution; no lock takeover');
        if(waitCount===1 || waitCount%5===0)await emitNotification({type:'WARNING',source:'AGENT',code:'AGENT_WAITING_ON_EXECUTION',title:'Agent waiting for account execution',userId,agentId,exchangeId:String(agent.exchangeId),message:`${waitingFailure.summary} The agent remains active; next check: ${new Date(retryAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',timeZoneName:'short'})}. Reconcile holding execution ${err.ownerExecutionId ?? 'shown in account diagnostics'} if it requires review.`,metadata:{...waitingFailure,executionRecordSaved}});
        return;
      }
      const temporaryData = err instanceof LlmMarketDataError || err instanceof DeltaDataError && err.retryable && agent.type==='CRYPTO' && agent.strategy==='ALGO_TRADING';
      const temporaryProvider = ['LLM_TRADING','HYBRID'].includes(agent.strategy) && ['LLM_REQUEST_TIMEOUT','EXECUTION_NETWORK_FAILED','EXECUTION_RATE_LIMIT','EXECUTION_UPSTREAM_FAILED'].includes(failure.code);
      const temporaryPreparation = !claimed && stage==='validate_configuration' && ['EXECUTION_NETWORK_FAILED','EXECUTION_RATE_LIMIT','EXECUTION_UPSTREAM_FAILED'].includes(failure.code);
      if (!brokerOperationRequested && (temporaryPreparation || ((temporaryData || temporaryProvider) && claimed && stage==='execute_strategy'))) {
        // These failures precede state persistence and any broker operation request.
        try {
          const failures = Math.min(1000,Math.max(0,Number(agent.dataFailureCount)||0)+1);
          const delayMs = Math.max(cadence*1000,Math.min(30*60_000,60_000*2**Math.min(failures-1,5)),err instanceof DeltaDataError ? err.retryAfterMs : 0);
          const retryAt = Date.now()+delayMs;
          const deferredFailure={...failure,nextAction:agent.executionMode==='PAPER' ? 'The agent remains running. Simulation state was not advanced; wait for the scheduled retry.' : 'The agent remains running. No broker operation was requested in this run; wait for the scheduled retry.',retryAt:new Date(retryAt).toISOString(),consecutiveFailures:failures};
          if(claimed) {
            const recorded = await executions.updateOne({_id:executionId,state:'STARTED'},{$set:{state:'COMPLETED',finishedAt:new Date(),outcome:temporaryData ? 'DATA_UNAVAILABLE' : 'PROVIDER_UNAVAILABLE',failure:deferredFailure}});
            if (recorded.modifiedCount !== 1) throw new Error('Data retry execution could not be verified');
          } else await executions.insertOne({_id:executionId,agentId,state:'COMPLETED',startedAt:new Date(startedAt),finishedAt:new Date(),outcome:'SERVICE_UNAVAILABLE_BEFORE_CLAIM',failure:deferredFailure});
          await agents.updateOne({_id:agent._id,userId,status:'RUNNING',nextRunAt:agent.nextRunAt},{$set:{dataFailureCount:failures}});
          await next(retryAt);
          completed = true;
          log.warn({event:'run.data_deferred',failure:deferredFailure,nextRunAt:retryAt},'Agent run deferred before broker operations and state persistence');
          if (temporaryProvider || failures===1 || failures%5===0) await emitNotification({type:'WARNING',source:'AGENT',code:failure.code,title:temporaryProvider ? 'LLM run delayed — provider unavailable' : agent.executionMode==='PAPER' ? 'Paper run delayed — market data unavailable' : 'Agent run delayed — service unavailable',userId,agentId,exchangeId:String(agent.exchangeId),
            message:`${failure.summary} ${llmProvider ? `Provider: ${llmProvider}. Model: ${agent.llmModel}. ` : ''}${agent.market.symbols.join(', ')} / ${failure.candleTimeframe ?? 'configured interval'}. ${deferredFailure.nextAction} Next scheduled retry: ${new Date(retryAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',timeZoneName:'short'})}.`,
            metadata:deferredFailure});
          return;
        } catch (retryError) { completed=false; err=retryError; log.error({event:'run.retry_persist_failed',...errMeta(retryError),originalFailureCode:failure.code},'Could not persist or schedule the retry'); failure={...failure,summary:failure.summary+' The retry state could not be saved.',nextAction:'Keep this agent paused and use account recovery after database connectivity is restored. No broker operation was requested in this run.'}; }
      }
      const rejectedBeforeOrders = claimed && !brokerOperationRequested && ['LLM_TRADING','HYBRID'].includes(agent.strategy) && ['AI_APICallError','APICallError'].includes(failure.errorType) && [400,401,403,404,422].includes(failure.httpStatus ?? 0);
      // These typed failures occur while loading/validating history, before
      // strategy state persistence. They introduce no uncertain broker operation.
      const rejectedStrategyData = claimed && !brokerOperationRequested && stage==='execute_strategy' && agent.type==='CRYPTO' && agent.strategy==='ALGO_TRADING' && (err instanceof MissedLiveCandlesError || err instanceof DeltaDataValidationError);
      const knownNoEntryEffect = !ambiguous && receipts.length>0 && receipts.every(receipt=>receipt.state==='REFUSED' || receipt.state==='CONFIRMED' && ['delta-leverage','crypto-leverage'].includes(receipt.action ?? ''));
      const rejectedByGuard = claimed && (!brokerOperationRequested || knownNoEntryEffect) && stage==='execute_strategy' && err instanceof OrderRejectedError;
      const safeToRelease = rejectedBeforeOrders || rejectedStrategyData || rejectedByGuard;
      if (rejectedBeforeOrders) failure={...failure,nextAction:failure.nextAction+' No broker operation was requested. This agent is paused for configuration correction; other agents can continue.'};
      if (rejectedStrategyData) failure={...failure,nextAction:err instanceof MissedLiveCandlesError ? 'No broker operation was requested. Execution locks will be released after the failure is saved. Resume this agent to refresh indicator history and skip old signals; other agents can continue.' : 'No broker operation was requested. Execution locks will be released after the failure is saved. Check market-data availability and retry Resume to load fresh completed candles; other agents can continue.'};
      if (rejectedByGuard) failure={...failure,nextAction:'No entry order or uncertain broker operation remains; any setting update was verified. Execution locks will be released after the failure is saved. Review the guard reason above and adjust the agent configuration or account state, then Resume. Other agents can continue.'};
      log.error({ event: safeToRelease ? 'run.rejected_before_orders' : 'run.review_required', stage, exchangeId: String(agent.exchangeId), durationMs: Date.now() - startedAt, ...errMeta(err), failure }, safeToRelease ? 'Agent paused; execution locks can be released after failure persistence' : 'Agent run failed; pausing for review');
      try { await agents.updateOne({ _id: agent._id, userId }, { $set: { status: "PAUSED", updatedAt: new Date() } }); }
      catch(pauseError) { log.error({event:'run.pause_persist_failed',...errMeta(pauseError)},'Could not persist pause; execution locks remain held'); }
      try { await deleteAgentCached(agentId); }
      catch(cacheError) { log.error({event:'run.cache_remove_failed',...errMeta(cacheError)},'Could not remove agent registry entry'); }
      let executionRecordSaved=false;
      try {
        if (claimed) {
          const saved=await executions.updateOne({_id:executionId,state:'STARTED'},{$set:{state:safeToRelease ? 'COMPLETED' : 'REVIEW_REQUIRED',finishedAt:new Date(),reviewReason:failure.code,failure,...(safeToRelease ? {outcome:rejectedStrategyData ? 'STRATEGY_DATA_REJECTED' : rejectedByGuard ? 'GUARD_REJECTED_BEFORE_ORDER' : 'PROVIDER_REQUEST_REJECTED'} : {})}});
          executionRecordSaved=saved.modifiedCount===1;
          if (safeToRelease && executionRecordSaved) completed=true;
        } else {
          // A rejected lock/configuration attempt is an audit record, never an execution claim.
          await executions.insertOne({_id:executionId,agentId,state:'COMPLETED',startedAt:new Date(startedAt),finishedAt:new Date(),outcome:'BLOCKED_BEFORE_EXECUTION',failure});
          executionRecordSaved=true;
        }
      } catch (auditError) {
        log.error({event:'run.failure_persist_failed',...errMeta(auditError),failureCode:failure.code},'Could not persist failure audit; original execution records were preserved');
      }
      await emitNotification({ type: "ERROR", source: "AGENT", code: failure.code.startsWith("DELTA_DATA_") || failure.code.startsWith("LLM_") ? failure.code : "AGENT_REVIEW_REQUIRED", title: rejectedBeforeOrders ? "LLM request rejected — agent paused" : rejectedStrategyData ? "Algorithm paused — candle history needs refresh" : rejectedByGuard ? 'Agent paused — execution guard rejected the run' : "Agent paused for review",
        userId, agentId, exchangeId: String(agent.exchangeId),
        message: `${failure.summary} ${llmProvider ? `Provider: ${llmProvider}. Model: ${agent.llmModel}. ` : ""}${failure.symbols.join(', ')} (${failure.mode}). ${failure.nextAction}`,
        metadata:{...failure,executionRecordSaved} });
      throw err;
    } finally {
      // Failed/uncertain runs retain their account locks for explicit reconciliation.
      if (completed || !claimed) {
        for (const key of acquired) {
          await locks.deleteOne({ _id: key, executionId });
          log.info({ event: "lock.released", lockId: key }, "Execution lock released");
        }
      } else {
        log.warn({ event: "lock.retained", lockCount: acquired.length }, "Execution locks retained for reconciliation");
      }
    }
  }
  return (job: Job<AgentJobData>) => runWithLogContext({ agentId: job.data.agentId, runId: String(job.id) }, async () => {
    try { await processRun(job); }
    catch (err) { log.error({ event: "run.failed", ...errMeta(err) }, "Agent job failed"); throw err; }
  });
}
export async function startWorkers() {
  const db = await connectDB();
  const worker = new Worker<AgentJobData>(AGENT_QUEUE_NAME, createRunProcessor(db), {
    connection, concurrency: 5, lockDuration: 300_000, maxStalledCount: 0,
  });
  worker.on("failed", (job, err) => log.error({ event: "job.failed", runId: job?.id, agentId: job?.data.agentId, ...errMeta(err) }, "Agent failed; no automatic replay"));
  worker.on("error", err => log.error(errMeta(err), "Worker error"));
  worker.on("ready", () => log.info({ event: "worker.ready", concurrency: 5 }, "Agent worker ready"));
  const shutdown = async () => {
    log.info({ event: "worker.stopping" }, "Agent worker shutting down");
    try {
      await worker.close(); await closeRedis(); await closeDB();
      log.info({ event: "worker.stopped" }, "Agent worker stopped");
    } catch (err) {
      log.error({ event: "worker.shutdown_failed", ...errMeta(err) }, "Agent worker shutdown failed");
      process.exitCode = 1;
    }
  };
  process.once("SIGINT", () => { void shutdown(); });
  process.once("SIGTERM", () => { void shutdown(); });
  return worker;
}
if (import.meta.main) startWorkers().catch(err => { log.fatal(errMeta(err), "Worker startup failed"); process.exit(1); });
