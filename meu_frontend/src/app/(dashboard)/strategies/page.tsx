import { requireAuth } from '@/lib/auth-utils';
import { BacktestWorkspace } from '@/features/backtests/components/backtest-workspace';
export default async function StrategiesPage({ searchParams }: {
  searchParams: Promise<{ strategy?: string | string[]; run?: string | string[] }>;
}) {
  await requireAuth();
  const { strategy, run } = await searchParams;
  const initialStrategy = strategy === 'donchian' || strategy === 'meanReversion' ? strategy : 'ema';
  const initialRunId = typeof run === 'string' && /^[a-f0-9]{24}$/i.test(run) ? run : null;
  return <BacktestWorkspace key={`${initialStrategy}-${initialRunId ?? ''}`} initialStrategy={initialStrategy} initialRunId={initialRunId} />;
}
