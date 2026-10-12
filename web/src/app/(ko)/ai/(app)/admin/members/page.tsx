import { requireAdmin } from '@/lib/access';
import { AI_MEMBERS } from '@/lib/ai-paths';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  await requireAdmin(AI_MEMBERS);
  return <p className="p-4">회원 관리 화면 준비 중</p>;
}
