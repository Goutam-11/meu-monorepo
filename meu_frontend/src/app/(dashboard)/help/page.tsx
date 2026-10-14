import { requireAuth } from '@/lib/auth/session';
import { HelpWorkspace } from '@/features/help/components/help-workspace';

export default async function HelpPage() {
  await requireAuth();
  return <HelpWorkspace />;
}
