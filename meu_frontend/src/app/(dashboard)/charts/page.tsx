import { requireAuth } from '@/lib/auth-utils';
import { ChartsWorkspace } from '@/features/charts/components/charts-workspace';

export default async function ChartsPage({ searchParams }: { searchParams: Promise<{ agent?: string | string[] }> }) {
  await requireAuth();
  const { agent } = await searchParams;
  const initialAgentId = typeof agent === 'string' && /^[a-f0-9]{24}$/i.test(agent) ? agent : undefined;
  return <ChartsWorkspace key={initialAgentId ?? 'browse'} initialAgentId={initialAgentId} />;
}
