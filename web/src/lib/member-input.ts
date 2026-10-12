import { z } from 'zod';

const CONTROL = /[\u0000-\u001f\u007f]/;

const text = (max: number, empty: string, long: string) =>
  z.string().trim().min(1, empty).max(max, long).refine((v) => !CONTROL.test(v), '사용할 수 없는 문자가 있습니다.');

export const applySchema = z.object({
  name: text(30, '이름을 입력하세요.', '이름은 30자까지 쓸 수 있습니다.'),
  affiliation: text(50, '소속을 입력하세요.', '소속은 50자까지 쓸 수 있습니다.'),
});

export const adminAddSchema = applySchema.extend({
  email: z.string().trim().toLowerCase().pipe(z.email('올바른 이메일 주소가 아닙니다.')),
});

export const memberIdSchema = z.coerce.number().int().positive();
