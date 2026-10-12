import { z } from 'zod';

export const viewerInputSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('올바른 이메일 주소가 아닙니다.')),
  note: z.string().trim().max(100, '메모는 100자까지 쓸 수 있습니다.').optional().transform((v) => v || null),
});

export const viewerIdSchema = z.coerce.number().int().positive();
