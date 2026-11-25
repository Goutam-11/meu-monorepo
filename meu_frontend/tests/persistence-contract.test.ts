import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENT_FIELDS, PRISMA_AGENT_CONTRACT } from '../../shared/persistence/fields';
import { COLLECTIONS } from '../../shared/persistence/collections';

const schema = readFileSync(fileURLToPath(new URL('../prisma/schema.prisma', import.meta.url)), 'utf8');

function prismaBlock(kind: 'model' | 'type', name: string): string {
  const match = schema.match(new RegExp(`^${kind}\\s+${name}\\s*\\{([\\s\\S]*?)^\\}`, 'm'));
  if (!match) throw new Error(`Prisma ${kind} ${name} not found`);
  return match[1]!;
}

function filesUnder(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' || entry.name === 'generated' || entry.name === '.next' ? [] : filesUnder(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });
}

describe('persistence contract', () => {
  test('Prisma Agent fields still satisfy the shared cross-package paths', () => {
    const agent = prismaBlock('model', 'Agent');
    const composite: Record<string, string> = { risk: 'RiskLimits', capital: 'Capital', market: 'MarketScope' };
    for (const field of Object.keys(PRISMA_AGENT_CONTRACT)) {
      expect(agent).toMatch(new RegExp(`^\\s*${field}\\s`, 'm'));
      const typeName = composite[field];
      if (!typeName) continue;
      const block = prismaBlock('type', typeName);
      for (const nested of PRISMA_AGENT_CONTRACT[field as keyof typeof PRISMA_AGENT_CONTRACT]) {
        expect(block).toMatch(new RegExp(`^\\s*${nested}\\s`, 'm'));
      }
    }
    for (const path of Object.values(AGENT_FIELDS)) expect(agent).toMatch(new RegExp(`^\\s*${path.split('.')[0]}\\s`, 'm'));
  });

  test('services do not hard-code collection names outside the shared module', () => {
    const roots = [
      fileURLToPath(new URL('../../meu/schedulerService/src', import.meta.url)),
      fileURLToPath(new URL('../../meu/notificationService/src', import.meta.url)),
      fileURLToPath(new URL('../src', import.meta.url)),
    ];
    const names = Object.values(COLLECTIONS);
    const allowed = new Set(['use-browser-notifications.ts']);
    const violations: string[] = [];
    for (const root of roots) {
      for (const file of filesUnder(root)) {
        if (allowed.has(file.split('/').at(-1)!) || file.includes('/src/tests/')) continue;
        const source = readFileSync(file, 'utf8');
        for (const name of names) {
          if (source.includes(`"${name}"`) || source.includes(`'${name}'`)) violations.push(`${file}: ${name}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
