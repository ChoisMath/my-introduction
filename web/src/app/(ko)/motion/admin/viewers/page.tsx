import { redirect } from 'next/navigation';
import { AI_MEMBERS } from '@/lib/ai-paths';
import { requireAdmin } from '@/lib/access';

export const dynamic = 'force-dynamic';

export default async function ViewersPage() {
  await requireAdmin(AI_MEMBERS);
  redirect(AI_MEMBERS);
}
