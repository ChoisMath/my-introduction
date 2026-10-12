import raw from './public.json';
import { slidePublicListSchema, type SlidePublic } from './schema';

export * from './schema';

let list: SlidePublic[] | null = null;

// 배열 순서가 곧 인기순이라 정렬하지 않는다.
export function getSlideList(): SlidePublic[] {
  list ??= slidePublicListSchema.parse(raw);
  return list;
}
