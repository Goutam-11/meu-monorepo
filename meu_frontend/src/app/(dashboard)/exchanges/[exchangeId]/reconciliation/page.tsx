import { requireAuth } from '@/lib/auth/session';
import { ReconciliationWorkspace } from '@/features/exchange/components/reconciliation-workspace';

export default async function ReconciliationPage({ params }: { params: Promise<{exchangeId:string}> }) {
  await requireAuth();
  const { exchangeId } = await params;
  return <ReconciliationWorkspace exchangeId={exchangeId}/>;
}
