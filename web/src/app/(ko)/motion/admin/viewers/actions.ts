'use server';
import { revalidatePath } from 'next/cache';
import { isAdminEmail } from '@/lib/admin-emails';
import { requireAdmin } from '@/lib/admin-session';
import { addViewer, removeViewer } from '@/lib/motion-viewers';
import { viewerIdSchema, viewerInputSchema } from '@/lib/viewer-input';

const PATH = '/motion/admin/viewers/';

// 실패 시 입력값을 돌려준다. React 가 액션 후 폼을 reset 하므로 defaultValue 로 되살린다.
export type ViewerFormState = { ok: boolean; message: string; email?: string; note?: string } | null;

// requireAdmin 의 redirect/notFound 는 throw 로 동작하므로 try 밖에서 호출한다.
export async function addViewerAction(_prev: ViewerFormState, formData: FormData): Promise<ViewerFormState> {
  const addedBy = await requireAdmin(PATH);
  const raw = { email: String(formData.get('email') ?? ''), note: String(formData.get('note') ?? '') };
  const fail = (message: string): ViewerFormState => ({ ok: false, message, ...raw });
  const parsed = viewerInputSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? '입력을 확인하세요.');
  const { email, note } = parsed.data;
  if (isAdminEmail(email, process.env.ADMIN_EMAILS)) return fail('관리자 계정은 등록하지 않아도 볼 수 있습니다.');
  let result: Awaited<ReturnType<typeof addViewer>>;
  try {
    result = await addViewer({ email, note, addedBy });
  } catch (error) {
    console.error('[motion-viewers] add failed', error);
    return fail('DB 오류로 등록하지 못했습니다.');
  }
  if (result === 'duplicate') return fail(`이미 등록된 이메일입니다: ${email}`);
  revalidatePath(PATH);
  return { ok: true, message: `등록했습니다: ${email}` };
}

export async function removeViewerAction(formData: FormData): Promise<void> {
  await requireAdmin(PATH);
  const id = viewerIdSchema.safeParse(formData.get('id'));
  if (!id.success) return;
  await removeViewer(id.data);
  revalidatePath(PATH);
}
