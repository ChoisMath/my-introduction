import { z } from 'zod';

export const SLIDE_FAMILIES = [
  { key: 'work', label: '업무·보고' },
  { key: 'hand', label: '손그림·종이' },
  { key: 'toon', label: '일러스트·만화' },
  { key: 'solid', label: '입체·3D' },
  { key: 'poster', label: '포스터·타이포' },
  { key: 'dark', label: '어두운 테크' },
  { key: 'photo', label: '사진·잡지' },
] as const;
export type SlideFamily = (typeof SLIDE_FAMILIES)[number]['key'];
const familyKeys = SLIDE_FAMILIES.map((f) => f.key) as [SlideFamily, ...SlideFamily[]];

export const slideIdSchema = z.string().regex(/^\d{2,3}$/);

// school = 학교 상황으로 새로 만든 덱, oppadu = 아직 변형하지 않아 원본(oppadu.com/ai/slide-styles) 예시를 출처와 함께 싣는 스타일.
export const SLIDE_SOURCES = ['school', 'oppadu'] as const;
export type SlideSource = (typeof SLIDE_SOURCES)[number];

// .strict() — 프롬프트가 공개 데이터에 섞이면 파싱이 실패해야 한다.
export const slidePublicSchema = z.object({
  id: slideIdSchema,
  no: z.number().int().min(1),
  family: z.enum(familyKeys),
  name: z.string().min(1),
  look: z.string().min(1),
  use: z.string().min(1),
  topic: z.string().min(1).optional(),
  slides: z.number().int().min(1).max(12),
  cover: z.number().int().min(1),
  body: z.number().int().min(1),
  added: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.enum(SLIDE_SOURCES),
}).strict();
export type SlidePublic = z.infer<typeof slidePublicSchema>;

export const slidePublicListSchema = z.array(slidePublicSchema).min(1).superRefine((list, ctx) => {
  if (new Set(list.map((s) => s.id)).size !== list.length) ctx.addIssue({ code: 'custom', message: 'duplicate slide id' });
  if (new Set(list.map((s) => s.no)).size !== list.length) ctx.addIssue({ code: 'custom', message: 'duplicate slide no' });
  for (const s of list) {
    if (s.cover > s.slides || s.body > s.slides) ctx.addIssue({ code: 'custom', message: `cover/body out of range: ${s.id}` });
  }
});

export const slideAdminSchema = z.object({ id: slideIdSchema, prompt: z.string().min(1) }).strict();
export type SlideAdmin = z.infer<typeof slideAdminSchema>;
export const slideAdminListSchema = z.array(slideAdminSchema).min(1);
