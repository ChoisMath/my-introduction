'use server';
import { revalidatePath } from 'next/cache';
import { isAdminEmail } from '@/lib/admin-emails';
import { requireAdmin } from '@/lib/access';
import { AI_MEMBERS } from '@/lib/ai-paths';
import { adminAddSchema, applySchema, memberIdSchema } from '@/lib/member-input';
import { addApprovedMember, deletePendingMember, setMemberStatus, updateMemberProfile } from '@/lib/members';

export type MemberFormState = { ok: boolean; message: string; email?: string; name?: string; affiliation?: string } | null;

const STATUS_LABEL = { PENDING: '대기', APPROVED: '등록' } as const;

// requireAdmin 의 redirect/notFound 는 throw 로 동작하므로 try 밖에서 호출한다.
export async function addMemberAction(_prev: MemberFormState, formData: FormData): Promise<MemberFormState> {
  const by = await requireAdmin(AI_MEMBERS);
  const raw = { email: String(formData.get('email') ?? ''), name: String(formData.get('name') ?? ''), affiliation: String(formData.get('affiliation') ?? '') };
  const fail = (message: string): MemberFormState => ({ ok: false, message, ...raw });
  const parsed = adminAddSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? '입력을 확인하세요.');
  if (isAdminEmail(parsed.data.email, process.env.ADMIN_EMAILS)) return fail('관리자 계정은 등록하지 않아도 쓸 수 있습니다.');
  let outcome: Awaited<ReturnType<typeof addApprovedMember>>;
  try {
    outcome = await addApprovedMember({ ...parsed.data, by });
  } catch (error) {
    console.error('[members] add failed', error);
    return fail('DB 오류로 등록하지 못했습니다.');
  }
  if (outcome.result === 'duplicate') return fail(`이미 있는 회원입니다(상태: ${STATUS_LABEL[outcome.status]})`);
  revalidatePath(AI_MEMBERS);
  return { ok: true, message: `등록했습니다: ${parsed.data.email}` };
}

async function withId(formData: FormData, run: (id: number, by: string) => Promise<unknown>): Promise<void> {
  const by = await requireAdmin(AI_MEMBERS);
  const id = memberIdSchema.safeParse(formData.get('id'));
  if (!id.success) return;
  // 다른 탭에서 이미 처리된 행이면 0건으로 끝나고 화면만 새로 그린다.
  await run(id.data, by);
  revalidatePath(AI_MEMBERS);
}

export async function approveAction(formData: FormData): Promise<void> {
  await withId(formData, (id, by) => setMemberStatus(id, 'APPROVED', by));
}

export async function suspendAction(formData: FormData): Promise<void> {
  await withId(formData, (id, by) => setMemberStatus(id, 'PENDING', by));
}

export async function deleteAction(formData: FormData): Promise<void> {
  await withId(formData, (id) => deletePendingMember(id));
}

export async function updateProfileAction(formData: FormData): Promise<void> {
  const parsed = applySchema.safeParse({ name: String(formData.get('name') ?? ''), affiliation: String(formData.get('affiliation') ?? '') });
  if (!parsed.success) return;
  await withId(formData, (id) => updateMemberProfile(id, parsed.data));
}
