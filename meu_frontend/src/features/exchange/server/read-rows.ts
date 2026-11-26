import type { Prisma } from '@/generated/prisma/client';
import { readRows } from './reconciliation';

export async function readRowsParsed<T>(command: Prisma.InputJsonObject, maximum: number, schema: { parse(value: unknown): T }): Promise<T[]> {
  return (await readRows<unknown>(command, maximum)).map(row => schema.parse(row));
}
