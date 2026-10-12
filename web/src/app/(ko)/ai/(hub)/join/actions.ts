'use server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { getAccess } from '@/lib/access';
import { AI_JOIN } from '@/lib/ai-paths';
import { errorTag } from '@/lib/log';
import { applySchema } from '@/lib/member-input';
import { normalizeEmail } from '@/lib/member-role';
import { applyMember } from '@/lib/members';

export type JoinFormState = { ok: boolean; message: string; name?: string; affiliation?: string } | null;

// 이메일은 폼이 아니라 세션에서만 가져온다(다른 사람 이메일로 신청할 수 없게).
export async function applyAction(_prev: JoinFormState, formData: FormData): Promise<JoinFormState> {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  const raw = { name: String(formData.get('name') ?? ''), affiliation: String(formData.get('affiliation') ?? '') };
  const fail = (message: string): JoinFormState => ({ ok: false, message, ...raw });
  if (!email) return fail('먼저 Google 계정으로 로그인하세요.');
  const { role } = await getAccess(email);
  if (role === 'admin' || role === 'member') return { ok: true, message: '이미 등록된 계정입니다.' };
  if (role === 'unavailable') return fail('잠시 후 다시 시도해 주세요.');
  const parsed = applySchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? '입력을 확인하세요.');
  let result: Awaited<ReturnType<typeof applyMember>>;
  try {
    result = await applyMember({ email, ...parsed.data });
  } catch (error) {
    console.error('[members] apply failed', errorTag(error));
    return fail('잠시 후 다시 시도해 주세요.');
  }
  revalidatePath(AI_JOIN);
  if (result === 'exists') return { ok: true, message: '이미 등록된 계정입니다.' };
  return { ok: true, message: result === 'created' ? '신청을 받았습니다. 관리자가 확인하면 사용할 수 있어요.' : '신청 내용을 고쳤습니다.' };
}
