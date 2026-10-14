import 'server-only';
import prisma from '@/lib/db';
import { decryptSecret } from '@/lib/security/encryption';
import { TRPCError } from '@trpc/server';
import { configureCryptoExchange, exchangeMap } from '../../../../../meu/schedulerService/src/config/config';
import { identifyDeltaAccount, accountRiskSchema, defaultAccountRisk } from '../../../../../meu/schedulerService/src/brokers/crypto/cryptoAccount';
import type { Exchange } from '../../../../../meu/schedulerService/node_modules/ccxt';

export async function executionConnection(exchangeId: string, userId: string) {
  const connection = await prisma.exchange.findFirst({ where: { id: exchangeId, userId } });
  if (!connection || !['DELTA','BINANCE'].includes(connection.name.toUpperCase()) || connection.sandbox || !connection.apiKey || !connection.secret)
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Execution tracking requires an owned production Delta India or Binance USD-M connection.' });
  const exchange = new exchangeMap[connection.name.toUpperCase() as "DELTA"|"BINANCE"]({ apiKey: decryptSecret(connection.apiKey), secret: decryptSecret(connection.secret), timeout: 15_000, enableRateLimit: true, verbose: false });
  configureCryptoExchange(exchange, false);
  return { connection, exchange };
}
export async function registerExecutionAccount(exchange: Exchange, exchangeId: string, userId: string) {
  let accountKey: string;
  try { accountKey = await identifyDeltaAccount(exchange, false); }
  catch { throw new TRPCError({ code:'PRECONDITION_FAILED', message:'Could not verify the broker account. Check the connection and retry.' }); }
  const upserted = await prisma.$runCommandRaw({ update: 'BrokerAccounts', updates: [{ q: { _id: accountKey }, u: { $setOnInsert: { userId, limits: defaultAccountRisk, updatedAt: { $date: new Date().toISOString() } } }, upsert: true }] });
  if (upserted.ok !== 1 || (Array.isArray(upserted.writeErrors) && upserted.writeErrors.length)) throw new Error('Could not register execution account');
  const accounts = await prisma.$runCommandRaw({ find: 'BrokerAccounts', filter: { _id: accountKey, userId }, limit: 1 });
  const account = (accounts.cursor as { firstBatch?: { limits: unknown }[] })?.firstBatch?.[0];
  if (!account) throw new TRPCError({ code: 'CONFLICT', message: 'This broker account belongs to another Meu user.' });
  const previousRows = await prisma.$runCommandRaw({ find:'BrokerAccountLinks', filter:{_id:exchangeId}, limit:1 });
  const previous = (previousRows.cursor as {firstBatch?:{accountKey:string;userId:string}[]})?.firstBatch?.[0];
  if (previous && (previous.accountKey !== accountKey || previous.userId !== userId)) throw new TRPCError({ code:'PRECONDITION_FAILED', message:'This connection points to a different broker account. Create a new connection and reconcile the old account.' });
  const links = await prisma.$runCommandRaw({ update: 'BrokerAccountLinks', updates: [{ q: { _id: exchangeId }, u: { $set: { accountKey, userId, updatedAt: { $date: new Date().toISOString() } } }, upsert: true }] });
  if (links.ok !== 1 || (Array.isArray(links.writeErrors) && links.writeErrors.length)) throw new Error('Could not register exchange account link');
  return { accountKey, limits: accountRiskSchema.parse(account.limits) };
}
export async function linkedExchangeIds(accountKey: string, userId: string) {
  const rows = await prisma.$runCommandRaw({ find: 'BrokerAccountLinks', filter: { accountKey, userId }, limit: 101, batchSize: 101 });
  const cursor = rows.cursor as { firstBatch?: { _id: string }[]; id?: number | {$numberLong:string} } | undefined;
  const cursorId = typeof cursor?.id === 'object' ? cursor.id.$numberLong : String(cursor?.id);
  if (rows.ok !== 1 || !Array.isArray(cursor?.firstBatch) || cursorId !== '0')
    throw new TRPCError({ code:'PRECONDITION_FAILED', message:'Could not read all linked account connections. Retry before continuing.' });
  const links = cursor.firstBatch;
  if (links.length > 100) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Too many account connections to verify.' });
  return links.map(link => link._id);
}
