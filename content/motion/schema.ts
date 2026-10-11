import { z } from 'zod';

export const MOTION_GROUPS = [
  '게임·만화', '종이·공예', '손그림·노트', '그림·일러스트', '포스터·인쇄',
  '네온·레트로 컴퓨터', '입체·3D', '무대·영화', '한국',
] as const;
export type MotionGroup = (typeof MOTION_GROUPS)[number];

export const motionIdSchema = z.string().regex(/^\d{2}-[a-z0-9-]+$/);

// .strict() — 프롬프트·장면표 같은 관리자 필드가 공개 데이터에 섞이면 파싱이 실패해야 한다.
export const motionPublicSchema = z.object({
  id: motionIdSchema,
  no: z.number().int().min(1).max(50),
  group: z.enum(MOTION_GROUPS),
  name: z.string().min(1),
  en: z.string().min(1),
  use: z.string().min(1),
  concept: z.string().min(1),
  featured: z.boolean(),
}).strict();
export type MotionPublic = z.infer<typeof motionPublicSchema>;

export const motionPublicListSchema = z.array(motionPublicSchema).min(1).superRefine((list, ctx) => {
  if (new Set(list.map((m) => m.id)).size !== list.length) ctx.addIssue({ code: 'custom', message: 'duplicate motion id' });
  if (new Set(list.map((m) => m.no)).size !== list.length) ctx.addIssue({ code: 'custom', message: 'duplicate motion no' });
});

const row = z.tuple([z.string(), z.string(), z.string()]);
export const motionAdminSchema = z.object({
  id: motionIdSchema,
  prompt: z.string().min(1),
  ko: z.string().min(1),
  shots: z.array(row).min(1),
  cues: z.array(row).min(1),
}).strict();
export type MotionAdmin = z.infer<typeof motionAdminSchema>;
export const motionAdminListSchema = z.array(motionAdminSchema).min(1);

export const mediaEntrySchema = z.object({
  size: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  updatedAt: z.string().min(1),
}).strict();
export type MediaEntry = z.infer<typeof mediaEntrySchema>;
export const mediaManifestSchema = z.record(z.string(), mediaEntrySchema);
export type MediaManifest = z.infer<typeof mediaManifestSchema>;
