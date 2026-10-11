# 모션그래픽 챕터 + Railway 이전 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 자기소개 사이트(`me.chois.pro`)를 Next.js standalone 서버로 Railway 에 올리고, Volume 에서 스트리밍하는 「Chois의 바이브코딩」 모션그래픽 챕터(홈 섹션 + `/motion` + 관리자 화면)를 추가한다.

**Architecture:** 기존 npm workspaces 모노레포(`content`/`web`/`video`)를 유지한다. 공개 메타데이터는 `content/motion/public.json`(git), 영상·관리자 데이터(프롬프트)는 Railway Volume 에만 둔다. Next.js Route Handler 가 Volume 파일을 Range 스트리밍하고, 토큰 보호 업로드 API 와 로컬 스크립트(`media:prepare`/`media:push`)가 Volume 을 채운다. 관리자 화면은 Auth.js(Google) 로 보호한다.

**Tech Stack:** Node 24, TypeScript 6, Next.js 16.4 (App Router, `output: 'standalone'`), React 19, Tailwind 4, zod 4, next-auth 5.0.0-beta.32, vitest 5, Playwright 1.64, ffmpeg/cwebp(로컬), Docker(Railway 빌드).

**Spec:** `docs/superpowers/specs/2026-10-12-motion-chapter-railway-design.md` (§12 "계획 단계 결정" 포함 — 계획이 스펙과 다른 부분은 거기 적혀 있다)

## Global Constraints

- 저장소 루트: `/Volumes/Chois_SD2/dev/my_intoduction`, 브랜치 `feat/motion-chapter-railway`. 모든 경로는 이 루트 기준.
- 원천 데이터: `MOTION_SRC` 기본값 `/Volumes/Chois_SD2/dev/motion`. 그 안의 `data/chois-gallery.json`, `media/chois/<id>.mp4` 만 읽는다. **원본(오빠두) 데이터·영상(`data/gallery.json`, `media/video|preview|thumb`)은 읽지도 복사하지도 않는다.**
- 프롬프트(`prompt`, `ko`)·장면표(`shots`)·소리 큐(`cues`)는 git·빌드 산출물·공개 HTML 어디에도 들어가면 안 된다. Volume `private/motion-admin.json` 에만 있다.
- 공개 데이터 키는 정확히 `id, no, group, name, en, use, concept, featured` (zod `.strict()`).
- Volume 경로 환경변수 `RAILWAY_VOLUME_MOUNT_PATH` (로컬 `./.local-volume`, e2e `web/e2e/.volume`). 하드코딩 경로 금지. `PORT` 하드코딩 금지.
- 서빙 허용 경로: `media/motion/<id>/(video.mp4|preview.mp4|poster.webp)`. 업로드 허용 경로: 그것 + `media/motion/manifest.json` + `private/motion-admin.json`. `<id>` = `^\d{2}-[a-z0-9-]+$`.
- 업로드 상한 100 MB/파일, 토큰 비교는 `timingSafeEqual`.
- 페이지 문구 한국어, 로그·개발자 에러 영어. 코드 주석은 "왜"가 비자명할 때만, 한국어(기존 코드 관례).
- UI 는 `~/.claude/rules/responsive-ui.md` 준수: 라벨 `whitespace-nowrap`, 터치 타깃 ≥ 44px(`min-h-11`), 모바일 바깥 여백 `px-2`, 표는 기존 `.data-table`(sticky header·`.sticky-col`).
- 디자인 토큰 클래스는 기존 것만 사용: `bg-bg text-fg text-muted border-line accent`, 다크 `bg-dark-bg text-dark-fg ...`, `rounded-[var(--radius-card)]`.
- 커밋 메시지 형식: 기존 관례 `feat(scope): 한국어 설명`, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 테스트 명령: 단위 `npx vitest run <path>`(루트), 전체 `npm run check`, e2e `npm run build:web && npm run e2e`.

## Review Focus

1. **슬래시 정책** — `trailingSlash: true` 인 앱에서 슬래시 없는 `/api/auth/*`, `/api/media`, `/api/health` 호출이 308 없이 바로 처리돼야 한다(Google 콜백·스트림 PUT 이 리다이렉트를 못 따라감). → Task 2 e2e `api routes answer without a trailing-slash redirect`.
2. **Volume 이 빈 첫 배포** — manifest·admin 파일이 없거나 Volume 이 설정되지 않았을 때 홈이 깨지지 않고 `#motion` 섹션·Nav 항목만 사라지며, `/motion` 은 「준비 중」. → Task 5 단위 테스트 `returns [] when manifest is missing`, `returns [] when the volume is not configured` (홈·Nav·갤러리는 모두 이 빈 배열로 분기).
3. **경로 우회** — `/media/motion/..%2F..%2Fprivate%2Fmotion-admin.json`, `/media/private/motion-admin.json` 이 404. → Task 3 단위 테스트 + Task 9 e2e.
4. **중단된 업로드** — 연결이 끊기거나 sha 가 다르면 기존 파일이 그대로 남고 `.part` 임시 파일이 지워진다. → Task 4 `keeps the previous file when the sha does not match`.
5. **관리자 데이터 유출** — 공개 페이지 HTML·`.next` 산출물에 프롬프트 문자열이 없다. → Task 9 e2e `no admin text leaks into public html or build output`.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `content/motion/schema.ts` | 모션 공개/관리자/manifest zod 스키마, `MOTION_GROUPS` |
| `content/motion/index.ts` | `getMotionList()`, `getMotion(id)` (public.json 파싱·캐시) |
| `content/motion/public.json` | 50개 공개 필드 (생성물, 커밋) |
| `content/__tests__/motion.test.ts` | 스키마·데이터 검증 |
| `scripts/motion-import.ts` | 원천 JSON → public.json + `.media-out/private/motion-admin.json` |
| `scripts/media/manifest.ts` | `sha256File`, `buildManifest`, `diffManifest` |
| `scripts/media-prepare.ts` | 렌더 → 웹용 mp4·preview·poster + manifest |
| `scripts/media-push.ts` | 변경 파일만 업로드 |
| `scripts/e2e-fixture.ts` | e2e 용 Volume 픽스처 생성 |
| `scripts/copy-standalone-assets.mjs` | standalone 에 `public`·`.next/static` 복사 |
| `web/src/lib/volume.ts` | Volume 루트·경로 허용 목록·안전한 resolve |
| `web/src/lib/range.ts` | Range 헤더 파싱 (순수) |
| `web/src/lib/media-serve.ts` | `serveMedia()` — 파일 스트리밍 Response |
| `web/src/lib/media-upload.ts` | `tokenMatches()`, `handleUpload()` |
| `web/src/lib/media.ts` | manifest 읽기, `mediaUrl`, `renderedMotions`, `getRenderedMotions`, `pickFeatured` |
| `web/src/lib/admin-emails.ts` | `isAdminEmail()` (순수) |
| `web/src/lib/motion-admin.ts` | Volume 의 admin JSON 읽기 |
| `web/src/lib/admin-session.ts` | `requireAdmin()`, `loadMotionAdmin()` |
| `web/src/auth.ts` | Auth.js 설정 |
| `web/src/app/media/[...path]/route.ts` | GET/HEAD 스트리밍 |
| `web/src/app/api/media/route.ts` | PUT 업로드 |
| `web/src/app/api/media/manifest/route.ts` | GET manifest (토큰) |
| `web/src/app/api/health/route.ts` | 헬스체크 |
| `web/src/app/api/auth/[...nextauth]/route.ts` | Auth.js 핸들러 |
| `web/src/app/(ko)/motion/page.tsx` | 갤러리 |
| `web/src/app/(ko)/motion/[id]/page.tsx` | 상세 |
| `web/src/app/(ko)/motion/admin/layout.tsx`, `page.tsx`, `[id]/page.tsx` | 관리자 |
| `web/src/components/sections/Motion.tsx` | 홈 섹션 |
| `web/src/components/motion-gallery/MotionCard.tsx` | 카드(호버 미리보기) |
| `web/src/components/motion-gallery/MotionGallery.tsx` | 필터 + 그리드 |
| `web/src/components/motion-gallery/KeyNav.tsx` | ←/→ 이동 |
| `web/src/components/motion-gallery/admin/placeholders.ts` | 프롬프트 빈칸 치환·표 마크다운 (순수) |
| `web/src/components/motion-gallery/admin/PromptPanel.tsx` | 탭·필드·토글·복사 |
| `web/src/components/motion-gallery/admin/RowsTable.tsx` | 장면표/큐 표 |
| `Dockerfile`, `.dockerignore`, `railway.json` | Railway 빌드·배포 |
| `.github/workflows/ci.yml` | CI (Pages 워크플로 대체) |
| `web/e2e/motion.spec.ts` | 모션·미디어·관리자·유출 e2e |
| `web/e2e/fixtures/tiny.mp4`, `tiny.webp` | e2e 픽스처 원본 |

---

### Task 1: 모션 콘텐츠 스키마와 import 스크립트

**Files:**
- Create: `content/motion/schema.ts`, `content/motion/index.ts`, `content/motion/public.json`(생성), `content/__tests__/motion.test.ts`, `scripts/motion-import.ts`, `scripts/__tests__/motion-import.test.ts`, `vitest.empty.ts`
- Modify: `content/index.ts` (export 추가), `vitest.config.ts`, `package.json`(스크립트), `.gitignore`

**Interfaces:**
- Produces: `MOTION_GROUPS`, `motionIdSchema`, `motionPublicSchema`, `motionPublicListSchema`, `motionAdminSchema`, `motionAdminListSchema`, `mediaManifestSchema`, types `MotionPublic`, `MotionAdmin`, `MediaManifest`, `MediaEntry`; `getMotionList(): MotionPublic[]`, `getMotion(id: string): MotionPublic | null` — 모두 `@me/content` 에서 export. `splitGallery(items: SourceItem[], featured: readonly string[]): { publicList: MotionPublic[]; adminList: MotionAdmin[] }` (scripts/motion-import.ts).

- [ ] **Step 1: vitest 설정 확장** — `web/src/**` 전체와 `server-only` 를 테스트할 수 있게 한다.

`vitest.empty.ts`:
```ts
// vitest 에서 'server-only' 를 import 하면 예외를 던지므로 빈 모듈로 대체한다.
export {};
```

`vitest.config.ts` 전체:
```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@me/content': path.resolve(__dirname, 'content/index.ts'),
      '@/': path.resolve(__dirname, 'web/src') + '/',
      'server-only': path.resolve(__dirname, 'vitest.empty.ts'),
    },
  },
  test: {
    include: [
      'content/**/*.test.ts',
      'scripts/**/*.test.ts',
      'web/src/**/*.test.ts',
      'video/src/**/*.test.ts',
    ],
    environment: 'node',
  },
});
```

- [ ] **Step 2: 실패하는 스키마 테스트 작성** — `content/__tests__/motion.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { getMotion, getMotionList, MOTION_GROUPS, motionPublicSchema, motionAdminSchema, mediaManifestSchema } from '../index';

const sample = { id: '01-pixel', no: 1, group: '게임·만화', name: '도트 픽셀 아트', en: 'Pixel Art', use: '게임 느낌', concept: '횡스크롤', featured: true };

describe('motion schemas', () => {
  it('accepts a public item', () => {
    expect(motionPublicSchema.parse(sample)).toEqual(sample);
  });
  it('rejects admin-only keys in a public item', () => {
    expect(() => motionPublicSchema.parse({ ...sample, prompt: '## 1. Channel' })).toThrow();
    expect(() => motionPublicSchema.parse({ ...sample, shots: [] })).toThrow();
  });
  it('rejects malformed ids', () => {
    expect(() => motionPublicSchema.parse({ ...sample, id: '../x' })).toThrow();
    expect(() => motionPublicSchema.parse({ ...sample, id: '1-pixel' })).toThrow();
  });
  it('accepts an admin item with 3-column rows', () => {
    const a = { id: '01-pixel', prompt: 'p', ko: 'k', shots: [['0.0–1.0', 's', 'w']], cues: [['0.000', 'kick', 'first frame']] };
    expect(motionAdminSchema.parse(a)).toEqual(a);
    expect(() => motionAdminSchema.parse({ ...a, shots: [['0.0', 's']] })).toThrow();
  });
  it('validates manifest entries', () => {
    const ok = { 'media/motion/01-pixel/video.mp4': { size: 10, sha256: 'a'.repeat(64), updatedAt: '2026-10-12T00:00:00.000Z' } };
    expect(mediaManifestSchema.parse(ok)).toEqual(ok);
    expect(() => mediaManifestSchema.parse({ x: { size: 1, sha256: 'zz', updatedAt: '' } })).toThrow();
  });
});

describe('motion public.json', () => {
  const list = getMotionList();
  it('has 50 unique items sorted by number', () => {
    expect(list).toHaveLength(50);
    expect(new Set(list.map((m) => m.id)).size).toBe(50);
    expect(list.map((m) => m.no)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });
  it('uses only known groups', () => {
    for (const m of list) expect(MOTION_GROUPS).toContain(m.group);
  });
  it('finds items by id', () => {
    expect(getMotion('11-rpg')?.no).toBe(11);
    expect(getMotion('nope')).toBeNull();
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run content/__tests__/motion.test.ts`
Expected: FAIL — `getMotionList` / `MOTION_GROUPS` 가 export 되지 않음.

- [ ] **Step 4: 스키마 구현** — `content/motion/schema.ts`:
```ts
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
```

`content/motion/index.ts`:
```ts
import raw from './public.json';
import { motionPublicListSchema, type MotionPublic } from './schema';

export * from './schema';

let list: MotionPublic[] | null = null;

export function getMotionList(): MotionPublic[] {
  list ??= motionPublicListSchema.parse(raw).sort((a, b) => a.no - b.no);
  return list;
}

export function getMotion(id: string): MotionPublic | null {
  return getMotionList().find((m) => m.id === id) ?? null;
}
```

`content/index.ts` 의 `export { computeStats, type Stats } from './stats';` 다음 줄에 추가:
```ts
export * from './motion';
```

- [ ] **Step 5: import 스크립트 테스트 작성** — `scripts/__tests__/motion-import.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { splitGallery, type SourceItem } from '../motion-import';

const src: SourceItem = {
  id: '11-rpg', no: '11', g: '게임·만화', name: 'RPG 게임 화면', use: '퀘스트형 강의 소개', en: 'RPG Game Screen',
  concept: '마을 광장', prompt: '## 1. Channel {{Channel name=Chois의 바이브코딩}}', ko: '## 1. 채널',
  shots: [['0.0–1.0', '장면', '이유']], cues: [['0.000', 'kick', 'first frame']],
};

describe('splitGallery', () => {
  const { publicList, adminList } = splitGallery([src], ['11-rpg']);
  it('keeps only public keys and converts no to a number', () => {
    expect(publicList).toEqual([{ id: '11-rpg', no: 11, group: '게임·만화', name: 'RPG 게임 화면', en: 'RPG Game Screen', use: '퀘스트형 강의 소개', concept: '마을 광장', featured: true }]);
    expect(JSON.stringify(publicList)).not.toContain('Channel');
  });
  it('moves prompt, shots and cues to the admin list', () => {
    expect(adminList).toEqual([{ id: '11-rpg', prompt: src.prompt, ko: src.ko, shots: src.shots, cues: src.cues }]);
  });
  it('marks non-listed ids as not featured', () => {
    expect(splitGallery([src], []).publicList[0]?.featured).toBe(false);
  });
});
```

- [ ] **Step 6: 실패 확인**

Run: `npx vitest run scripts/__tests__/motion-import.test.ts`
Expected: FAIL — `../motion-import` 없음.

- [ ] **Step 7: import 스크립트 구현** — `scripts/motion-import.ts`:
```ts
// 로컬 motion 폴더의 Chois판 데이터(data/chois-gallery.json)를 공개/관리자 두 파일로 나눈다.
// 공개분만 git 에 들어가고, 관리자분은 .media-out/ 에 두었다가 media:push 로 Volume 에만 올린다.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { motionAdminListSchema, motionPublicListSchema, type MotionAdmin, type MotionPublic, type MotionGroup } from '../content/motion/schema';

export type SourceItem = {
  id: string; no: string; g: string; name: string; use: string; en: string; concept: string;
  prompt: string; ko: string; shots: [string, string, string][]; cues: [string, string, string][];
};

const FEATURED_IDS = ['01-pixel', '06-neon', '11-rpg', '13-manga', '17-embroidery', '19-chalkboard'] as const;

export function splitGallery(items: SourceItem[], featured: readonly string[]): { publicList: MotionPublic[]; adminList: MotionAdmin[] } {
  const publicList = motionPublicListSchema.parse(items.map((i) => ({
    id: i.id, no: Number(i.no), group: i.g as MotionGroup, name: i.name, en: i.en, use: i.use, concept: i.concept,
    featured: featured.includes(i.id),
  })));
  const adminList = motionAdminListSchema.parse(items.map((i) => ({ id: i.id, prompt: i.prompt, ko: i.ko, shots: i.shots, cues: i.cues })));
  return { publicList, adminList };
}

function main() {
  const src = process.env.MOTION_SRC ?? '/Volumes/Chois_SD2/dev/motion';
  const gallery = JSON.parse(readFileSync(path.join(src, 'data/chois-gallery.json'), 'utf8')) as { items: SourceItem[] };
  const { publicList, adminList } = splitGallery(gallery.items, FEATURED_IDS);
  writeFileSync(path.resolve('content/motion/public.json'), JSON.stringify(publicList, null, 1) + '\n');
  const adminFile = path.resolve('.media-out/private/motion-admin.json');
  mkdirSync(path.dirname(adminFile), { recursive: true });
  writeFileSync(adminFile, JSON.stringify(adminList));
  console.info(`motion:import public=${publicList.length} admin=${adminList.length} → ${adminFile}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
```

루트 `package.json` scripts 에 추가:
```json
"motion:import": "tsx scripts/motion-import.ts",
```

`.gitignore` 끝에 추가:
```
.media-out/
.local-volume/
web/e2e/.volume/
```

- [ ] **Step 8: 데이터 생성**

Run: `npm run motion:import`
Expected: `motion:import public=50 admin=50 → …/.media-out/private/motion-admin.json`, `content/motion/public.json` 생성.

Run: `grep -c '"prompt"\|{{' content/motion/public.json`
Expected: `0`

- [ ] **Step 9: 테스트 통과 확인**

Run: `npx vitest run content/__tests__/motion.test.ts scripts/__tests__/motion-import.test.ts`
Expected: PASS (전부)

- [ ] **Step 10: 커밋**
```bash
git add vitest.config.ts vitest.empty.ts content/motion content/index.ts content/__tests__/motion.test.ts scripts/motion-import.ts scripts/__tests__/motion-import.test.ts package.json .gitignore
git commit -m "feat(content): 모션 스타일 공개/관리자 스키마와 import 스크립트

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Next.js standalone 전환, 헬스체크, Docker·Railway·CI

**Files:**
- Create: `web/src/lib/volume.ts`, `web/src/lib/volume.test.ts`, `web/src/app/api/health/route.ts`, `scripts/copy-standalone-assets.mjs`, `Dockerfile`, `.dockerignore`, `railway.json`, `.github/workflows/ci.yml`, `scripts/__tests__/ci-workflow.test.ts`, `web/e2e/platform.spec.ts`
- Modify: `web/next.config.ts`, `web/package.json`, `package.json`, `web/playwright.config.ts`, `web/src/app/(ko)/page.tsx`, `web/src/app/(en)/en/page.tsx`, `web/e2e/smoke.spec.ts`
- Delete: `.github/workflows/deploy.yml`, `scripts/__tests__/deploy-workflow.test.ts`, `web/public/CNAME`, `web/public/.nojekyll`

**Interfaces:**
- Produces (`web/src/lib/volume.ts`): `class VolumeError extends Error`; `volumeRoot(): string` (env 없으면 `VolumeError`); `MANIFEST_PATH = 'media/motion/manifest.json'`; `ADMIN_PATH = 'private/motion-admin.json'`; `isServablePath(rel: string): boolean`; `isUploadablePath(rel: string): boolean`; `resolveIn(root: string, rel: string): string` (루트 밖이면 `VolumeError`).
- Produces: 서버 실행 `npm start` (= `node web/.next/standalone/web/server.js`), e2e 서버는 `scripts/e2e-fixture.ts` 를 먼저 실행(Task 7 에서 작성 — 이 Task 에서는 빈 Volume 디렉터리만 만드는 임시 버전을 둔다).

- [ ] **Step 1: volume 테스트 작성** — `web/src/lib/volume.test.ts`:
```ts
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ADMIN_PATH, MANIFEST_PATH, VolumeError, isServablePath, isUploadablePath, resolveIn, volumeRoot } from './volume';

describe('volume paths', () => {
  it('serves only motion media files', () => {
    expect(isServablePath('media/motion/11-rpg/video.mp4')).toBe(true);
    expect(isServablePath('media/motion/11-rpg/preview.mp4')).toBe(true);
    expect(isServablePath('media/motion/11-rpg/poster.webp')).toBe(true);
    expect(isServablePath(MANIFEST_PATH)).toBe(false);
    expect(isServablePath(ADMIN_PATH)).toBe(false);
    expect(isServablePath('media/motion/../private/motion-admin.json')).toBe(false);
    expect(isServablePath('media/motion/11-rpg/other.mp4')).toBe(false);
    expect(isServablePath('/etc/passwd')).toBe(false);
  });
  it('uploads media, manifest and the admin file only', () => {
    expect(isUploadablePath('media/motion/11-rpg/video.mp4')).toBe(true);
    expect(isUploadablePath(MANIFEST_PATH)).toBe(true);
    expect(isUploadablePath(ADMIN_PATH)).toBe(true);
    expect(isUploadablePath('private/other.json')).toBe(false);
    expect(isUploadablePath('media/motion/x/video.mp4')).toBe(false);
  });
  it('refuses to resolve outside the root', () => {
    expect(resolveIn('/data', 'media/motion/11-rpg/video.mp4')).toBe(path.join('/data', 'media/motion/11-rpg/video.mp4'));
    expect(() => resolveIn('/data', '../etc/passwd')).toThrow(VolumeError);
    expect(() => resolveIn('/data', '/etc/passwd')).toThrow(VolumeError);
  });
});

describe('volumeRoot', () => {
  const saved = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  afterEach(() => { process.env.RAILWAY_VOLUME_MOUNT_PATH = saved; });
  it('throws when the env var is missing', () => {
    delete process.env.RAILWAY_VOLUME_MOUNT_PATH;
    expect(() => volumeRoot()).toThrow(VolumeError);
  });
  it('resolves a relative path', () => {
    process.env.RAILWAY_VOLUME_MOUNT_PATH = './.local-volume';
    expect(path.isAbsolute(volumeRoot())).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run web/src/lib/volume.test.ts`
Expected: FAIL — `./volume` 없음.

- [ ] **Step 3: volume 구현** — `web/src/lib/volume.ts`:
```ts
import 'server-only';
import path from 'node:path';

export class VolumeError extends Error {}

export const MANIFEST_PATH = 'media/motion/manifest.json';
export const ADMIN_PATH = 'private/motion-admin.json';

const SERVABLE = /^media\/motion\/\d{2}-[a-z0-9-]+\/(video\.mp4|preview\.mp4|poster\.webp)$/;

export function volumeRoot(): string {
  const root = process.env.RAILWAY_VOLUME_MOUNT_PATH;
  if (!root) throw new VolumeError('RAILWAY_VOLUME_MOUNT_PATH is not set');
  return path.resolve(root);
}

export function isServablePath(rel: string): boolean {
  return SERVABLE.test(rel);
}

export function isUploadablePath(rel: string): boolean {
  return SERVABLE.test(rel) || rel === MANIFEST_PATH || rel === ADMIN_PATH;
}

export function resolveIn(root: string, rel: string): string {
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(path.resolve(root) + path.sep)) throw new VolumeError(`path escapes the volume: ${rel}`);
  return abs;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run web/src/lib/volume.test.ts`
Expected: PASS

- [ ] **Step 5: 헬스체크 라우트** — `web/src/app/api/health/route.ts`:
```ts
import { access, constants } from 'node:fs/promises';
import { volumeRoot } from '@/lib/volume';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await access(volumeRoot(), constants.W_OK);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('[health] volume is not writable', error);
    return Response.json({ ok: false }, { status: 503 });
  }
}
```

- [ ] **Step 6: next.config 전환** — `web/next.config.ts` 전체:
```ts
import path from 'node:path';
import type { NextConfig } from 'next';

// `npm run build -w web` 은 cwd 가 web/ 이다.
const repoRoot = path.resolve(process.cwd(), '..');

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: repoRoot,
  trailingSlash: true,
  // Google OAuth 콜백과 스트림 본문 PUT 은 308 리다이렉트를 따라가지 못하므로 슬래시 리다이렉트를 끈다.
  skipTrailingSlashRedirect: true,
  images: { unoptimized: true },
  // content 워크스페이스는 TS 소스 그대로 import 한다.
  transpilePackages: ['@me/content'],
  turbopack: { root: repoRoot },
  agentRules: false,
};

export default nextConfig;
```

`scripts/copy-standalone-assets.mjs`:
```js
// standalone 출력에는 public/ 과 .next/static/ 이 빠져 있어 server.js 옆으로 복사해야 서빙된다.
import { cpSync } from 'node:fs';
import path from 'node:path';

const web = path.resolve(import.meta.dirname, '../web');
const out = path.join(web, '.next/standalone/web');
cpSync(path.join(web, 'public'), path.join(out, 'public'), { recursive: true });
cpSync(path.join(web, '.next/static'), path.join(out, '.next/static'), { recursive: true });
console.info('standalone assets copied');
```

`web/package.json` scripts — `"build"` 다음에 추가, `"serve"` 교체:
```json
"postbuild": "node ../scripts/copy-standalone-assets.mjs",
"start": "node .next/standalone/web/server.js",
```
(`"serve": "serve out -l 3100"` 줄 삭제. `serve` devDependency 는 `npm uninstall serve -w web` 로 제거.)

루트 `package.json` scripts 에 추가:
```json
"start": "npm run start -w web",
```

- [ ] **Step 7: 홈을 요청마다 렌더** — 「교직 N년차」를 cron 재빌드 없이 갱신하고 Volume 상태를 즉시 반영하기 위해서다.

`web/src/app/(ko)/page.tsx`:
```tsx
import { HomePage } from '@/components/HomePage';

export const dynamic = 'force-dynamic';
export default function Page() { return <HomePage locale="ko" />; }
```
`web/src/app/(en)/en/page.tsx` 도 같은 형태로 `export const dynamic = 'force-dynamic';` 를 추가한다(기존 내용 유지, `locale="en"`).

- [ ] **Step 8: 임시 e2e 픽스처와 Playwright 서버 전환**

`scripts/e2e-fixture.ts` (Task 7 에서 완성본으로 교체):
```ts
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../web/e2e/.volume');
rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });
console.info(`e2e volume ready: ${root}`);
```

`web/playwright.config.ts` 전체:
```ts
// standalone 서버(.next/standalone)를 띄워 검사한다. 먼저 `npm run build -w web` 이 필요하다.
import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  expect: { timeout: 10_000 },
  use: { baseURL: `http://localhost:${PORT}`, ...devices['Desktop Chrome'] },
  webServer: {
    command: 'npx tsx ../scripts/e2e-fixture.ts && node .next/standalone/web/server.js',
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
      RAILWAY_VOLUME_MOUNT_PATH: 'e2e/.volume',
      AUTH_SECRET: 'e2e-secret-e2e-secret-e2e-secret-00',
      AUTH_GOOGLE_ID: 'e2e-client',
      AUTH_GOOGLE_SECRET: 'e2e-secret',
      ADMIN_EMAILS: 'admin@example.com',
      MEDIA_UPLOAD_TOKEN: 'e2e-upload-token',
    },
  },
});
```
(`RAILWAY_VOLUME_MOUNT_PATH` 는 서버 cwd(`web/`) 기준 상대경로다.)

- [ ] **Step 9: 플랫폼 e2e 작성** — `web/e2e/platform.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('health reports a writable volume', async ({ request }) => {
  const r = await request.get('/api/health', { maxRedirects: 0 });
  expect(r.status()).toBe(200);
  expect(await r.json()).toEqual({ ok: true });
});

test('existing locale urls still work', async ({ request }) => {
  for (const p of ['/', '/en/', '/en']) expect((await request.get(p, { maxRedirects: 0 })).status(), p).toBe(200);
});

test('api routes answer without a trailing-slash redirect', async ({ request }) => {
  for (const p of ['/api/health', '/api/health/']) expect((await request.get(p, { maxRedirects: 0 })).status(), p).toBe(200);
});
```

`web/e2e/smoke.spec.ts` 의 `static seo files are served` 테스트에서 `'/CNAME', ` 를 지운다.

- [ ] **Step 10: GitHub Pages 산출물 정리**
```bash
git rm web/public/CNAME web/public/.nojekyll .github/workflows/deploy.yml scripts/__tests__/deploy-workflow.test.ts
```

- [ ] **Step 11: CI 워크플로 테스트 작성** — `scripts/__tests__/ci-workflow.test.ts`:
```ts
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');

describe('ci workflow', () => {
  const yml = readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf-8');
  it('runs the same checks as local, then builds and runs e2e', () => {
    expect(yml).toContain('run: npm run check');
    expect(yml).toContain('run: npm run build:web');
    expect(yml).toContain('run: npm run e2e');
  });
  it('no longer deploys to GitHub Pages', () => {
    expect(existsSync(path.join(root, '.github/workflows/deploy.yml'))).toBe(false);
    expect(yml).not.toContain('deploy-pages');
  });
});

describe('railway config', () => {
  const cfg = JSON.parse(readFileSync(path.join(root, 'railway.json'), 'utf-8'));
  it('builds with the Dockerfile and checks health', () => {
    expect(cfg.build.builder).toBe('DOCKERFILE');
    expect(cfg.deploy.healthcheckPath).toBe('/api/health');
  });
});
```

- [ ] **Step 12: 실패 확인**

Run: `npx vitest run scripts/__tests__/ci-workflow.test.ts`
Expected: FAIL — `ci.yml` 없음.

- [ ] **Step 13: CI·Docker·Railway 파일 작성**

`.github/workflows/ci.yml`:
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: npm run build:web
      - run: npx playwright install --with-deps chromium
        working-directory: web
      - run: npm run e2e
```

`Dockerfile`:
```dockerfile
# Railway 빌드: video 워크스페이스(Remotion)는 설치하지 않는다.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY content/package.json content/
COPY web/package.json web/
COPY video/package.json video/
RUN npm ci -w content -w web --include-workspace-root
COPY content content
COPY scripts scripts
COPY web web
RUN npm run build:web

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0
COPY --from=build /app/web/.next/standalone ./
CMD ["node", "web/server.js"]
```

`.dockerignore`:
```
**/node_modules
**/.next
.git
.media-out
.local-volume
asset
docs
web/out
web/e2e
web/test-results
web/playwright-report
video/*
!video/package.json
```

`railway.json`:
```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": { "builder": "DOCKERFILE", "dockerfilePath": "Dockerfile" },
  "deploy": {
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 60,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

- [ ] **Step 14: 단위 테스트 통과 확인**

Run: `npx vitest run scripts/__tests__/ci-workflow.test.ts web/src/lib/volume.test.ts`
Expected: PASS

- [ ] **Step 15: 빌드·e2e 회귀 확인**

Run: `npm run build:web && ls web/.next/standalone/web/server.js web/.next/standalone/web/public/video`
Expected: 빌드 성공, `server.js` 와 `public/video` 존재.

Run: `npm run e2e`
Expected: `platform.spec.ts` 3개 PASS, `smoke.spec.ts` 기존 테스트 PASS. (`/en` 이 200 이 아니라 404/308 이면 Review Focus 1 실패 — `skipTrailingSlashRedirect` 가 적용됐는지 `web/.next/standalone/web/.next/required-server-files.json` 의 `config.skipTrailingSlashRedirect` 로 확인.)

Run: `docker build -t me-chois . && docker run --rm -e RAILWAY_VOLUME_MOUNT_PATH=/tmp -e PORT=3000 -p 3000:3000 me-chois` (다른 터미널에서 `curl -s localhost:3000/api/health`)
Expected: `{"ok":true}`. Docker 가 없으면 이 확인은 건너뛰고 보고에 명시한다.

- [ ] **Step 16: 커밋**
```bash
git add -A web/next.config.ts web/package.json package.json package-lock.json web/playwright.config.ts web/e2e web/src/lib/volume.ts web/src/lib/volume.test.ts web/src/app/api/health "web/src/app/(ko)/page.tsx" "web/src/app/(en)/en/page.tsx" scripts Dockerfile .dockerignore railway.json .github
git commit -m "feat(deploy): Next.js standalone 서버와 Railway(Docker)·CI 로 전환, GitHub Pages 제거

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Range 파싱과 Volume 미디어 스트리밍

**Files:**
- Create: `web/src/lib/range.ts`, `web/src/lib/range.test.ts`, `web/src/lib/media-serve.ts`, `web/src/lib/media-serve.test.ts`, `web/src/app/media/[...path]/route.ts`

**Interfaces:**
- Consumes: `isServablePath`, `resolveIn`, `volumeRoot` (Task 2).
- Produces: `type ByteRange = { start: number; end: number }`; `parseRange(header: string | null, size: number): ByteRange | 'unsatisfiable' | null`; `serveMedia(root: string, rel: string, req: Request): Promise<Response>`.

- [ ] **Step 1: Range 테스트 작성** — `web/src/lib/range.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseRange } from './range';

describe('parseRange', () => {
  it('returns null without a header', () => expect(parseRange(null, 100)).toBeNull());
  it('parses a closed range', () => expect(parseRange('bytes=0-99', 1000)).toEqual({ start: 0, end: 99 }));
  it('parses an open range', () => expect(parseRange('bytes=900-', 1000)).toEqual({ start: 900, end: 999 }));
  it('parses a suffix range', () => expect(parseRange('bytes=-100', 1000)).toEqual({ start: 900, end: 999 }));
  it('clamps an end past the file', () => expect(parseRange('bytes=10-5000', 1000)).toEqual({ start: 10, end: 999 }));
  it('clamps a suffix longer than the file', () => expect(parseRange('bytes=-5000', 1000)).toEqual({ start: 0, end: 999 }));
  it('marks a start past the end unsatisfiable', () => expect(parseRange('bytes=1000-', 1000)).toBe('unsatisfiable'));
  it('marks a zero suffix unsatisfiable', () => expect(parseRange('bytes=-0', 1000)).toBe('unsatisfiable'));
  it('ignores malformed and multi-range headers', () => {
    expect(parseRange('bytes=abc', 1000)).toBeNull();
    expect(parseRange('bytes=0-1,5-6', 1000)).toBeNull();
    expect(parseRange('items=0-1', 1000)).toBeNull();
    expect(parseRange('bytes=50-10', 1000)).toBeNull();
    expect(parseRange('bytes=-', 1000)).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run web/src/lib/range.test.ts`
Expected: FAIL — `./range` 없음.

- [ ] **Step 3: Range 구현** — `web/src/lib/range.ts`:
```ts
export type ByteRange = { start: number; end: number };

// 단일 범위만 지원한다. 형식이 틀리거나 다중 범위면 RFC 9110 대로 무시하고(null) 전체를 보낸다.
export function parseRange(header: string | null, size: number): ByteRange | 'unsatisfiable' | null {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  const [, a = '', b = ''] = m;
  if (a === '' && b === '') return null;
  if (a === '') {
    const suffix = Number(b);
    if (suffix === 0 || size === 0) return 'unsatisfiable';
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(a);
  if (start >= size) return 'unsatisfiable';
  const end = b === '' ? size - 1 : Math.min(Number(b), size - 1);
  if (end < start) return null;
  return { start, end };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run web/src/lib/range.test.ts`
Expected: PASS

- [ ] **Step 5: serveMedia 테스트 작성** — `web/src/lib/media-serve.test.ts`:
```ts
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { serveMedia } from './media-serve';

let root: string;
const rel = 'media/motion/11-rpg/video.mp4';
const bytes = Buffer.from(Array.from({ length: 1000 }, (_, i) => i % 256));

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), 'vol-'));
  mkdirSync(path.join(root, 'media/motion/11-rpg'), { recursive: true });
  writeFileSync(path.join(root, rel), bytes);
  mkdirSync(path.join(root, 'private'), { recursive: true });
  writeFileSync(path.join(root, 'private/motion-admin.json'), '[]');
});

const req = (headers: Record<string, string> = {}, method = 'GET') => new Request('http://x/' + rel, { headers, method });

describe('serveMedia', () => {
  it('returns the whole file with range support headers', async () => {
    const r = await serveMedia(root, rel, req());
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('video/mp4');
    expect(r.headers.get('accept-ranges')).toBe('bytes');
    expect(r.headers.get('content-length')).toBe('1000');
    expect(Buffer.from(await r.arrayBuffer()).equals(bytes)).toBe(true);
  });
  it('returns 206 with the requested slice', async () => {
    const r = await serveMedia(root, rel, req({ range: 'bytes=10-19' }));
    expect(r.status).toBe(206);
    expect(r.headers.get('content-range')).toBe('bytes 10-19/1000');
    expect(r.headers.get('content-length')).toBe('10');
    expect(Buffer.from(await r.arrayBuffer()).equals(bytes.subarray(10, 20))).toBe(true);
  });
  it('returns 416 for a start past the end', async () => {
    const r = await serveMedia(root, rel, req({ range: 'bytes=5000-' }));
    expect(r.status).toBe(416);
    expect(r.headers.get('content-range')).toBe('bytes */1000');
  });
  it('answers HEAD without a body', async () => {
    const r = await serveMedia(root, rel, req({}, 'HEAD'));
    expect(r.status).toBe(200);
    expect(r.headers.get('content-length')).toBe('1000');
    expect(r.body).toBeNull();
  });
  it('404s for missing files and non-servable paths', async () => {
    expect((await serveMedia(root, 'media/motion/02-comics/video.mp4', req())).status).toBe(404);
    expect((await serveMedia(root, 'private/motion-admin.json', req())).status).toBe(404);
    expect((await serveMedia(root, 'media/motion/../../private/motion-admin.json', req())).status).toBe(404);
  });
});
```

- [ ] **Step 6: 실패 확인**

Run: `npx vitest run web/src/lib/media-serve.test.ts`
Expected: FAIL — `./media-serve` 없음.

- [ ] **Step 7: serveMedia 구현** — `web/src/lib/media-serve.ts`:
```ts
import 'server-only';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { parseRange } from './range';
import { isServablePath, resolveIn } from './volume';

const CONTENT_TYPES: Record<string, string> = { '.mp4': 'video/mp4', '.webp': 'image/webp' };

const notFound = () => new Response('Not found', { status: 404 });

export async function serveMedia(root: string, rel: string, req: Request): Promise<Response> {
  if (!isServablePath(rel)) return notFound();
  const file = resolveIn(root, rel);
  let info;
  try {
    info = await stat(file);
  } catch {
    return notFound();
  }
  const size = info.size;
  const headers = new Headers({
    'Content-Type': CONTENT_TYPES[path.extname(file)] ?? 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    // URL 에 ?v=<sha> 가 붙어 내용이 바뀌면 주소도 바뀐다.
    'Cache-Control': 'public, max-age=31536000, immutable',
    ETag: `"${size}-${Math.trunc(info.mtimeMs)}"`,
  });
  const range = parseRange(req.headers.get('range'), size);
  if (range === 'unsatisfiable') {
    headers.set('Content-Range', `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }
  const { start, end } = range ?? { start: 0, end: Math.max(0, size - 1) };
  const length = size === 0 ? 0 : end - start + 1;
  headers.set('Content-Length', String(length));
  if (range) headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  const status = range ? 206 : 200;
  if (req.method === 'HEAD' || length === 0) return new Response(null, { status, headers });
  const body = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream<Uint8Array>;
  return new Response(body, { status, headers });
}
```

- [ ] **Step 8: 통과 확인**

Run: `npx vitest run web/src/lib/media-serve.test.ts`
Expected: PASS

- [ ] **Step 9: 라우트 연결** — `web/src/app/media/[...path]/route.ts`:
```ts
import { serveMedia } from '@/lib/media-serve';
import { volumeRoot } from '@/lib/volume';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(req: Request, { params }: Ctx) {
  const { path } = await params;
  // 라우트가 /media 아래에 있으므로 Volume 상대경로에는 'media/' 를 다시 붙인다.
  return serveMedia(volumeRoot(), ['media', ...path].join('/'), req);
}

export { handle as GET, handle as HEAD };
```

- [ ] **Step 10: 타입 확인과 커밋**

Run: `npm run typecheck -w web`
Expected: 에러 없음.

```bash
git add web/src/lib/range.ts web/src/lib/range.test.ts web/src/lib/media-serve.ts web/src/lib/media-serve.test.ts "web/src/app/media"
git commit -m "feat(media): Volume 영상 Range 스트리밍 라우트

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 토큰 보호 업로드 API 와 manifest 조회

**Files:**
- Create: `web/src/lib/media-upload.ts`, `web/src/lib/media-upload.test.ts`, `web/src/app/api/media/route.ts`, `web/src/app/api/media/manifest/route.ts`

**Interfaces:**
- Consumes: `isUploadablePath`, `resolveIn`, `volumeRoot`, `MANIFEST_PATH`, `ADMIN_PATH` (Task 2); `mediaManifestSchema`, `motionAdminListSchema` (Task 1).
- Produces: `MAX_UPLOAD_BYTES = 100 * 1024 * 1024`; `tokenMatches(header: string | null, expected: string | undefined): boolean`; `handleUpload(root: string, req: Request, expectedToken: string | undefined, maxBytes?: number): Promise<Response>`. HTTP: `PUT /api/media?path=<rel>` (헤더 `Authorization: Bearer <token>`, `X-Content-Sha256: <hex>`), `GET /api/media/manifest` (같은 토큰, 응답 = manifest JSON 또는 `{}`).

- [ ] **Step 1: 업로드 테스트 작성** — `web/src/lib/media-upload.test.ts`:
```ts
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { handleUpload, tokenMatches } from './media-upload';

const TOKEN = 'secret-token';
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
let root: string;
beforeEach(() => { root = mkdtempSync(path.join(tmpdir(), 'up-')); });

function put(rel: string, body: Buffer | string, headers: Record<string, string> = {}) {
  return new Request(`http://x/api/media?path=${encodeURIComponent(rel)}`, {
    method: 'PUT',
    body,
    headers: { authorization: `Bearer ${TOKEN}`, 'x-content-sha256': sha(body), ...headers },
  });
}

describe('tokenMatches', () => {
  it('accepts only the exact bearer token', () => {
    expect(tokenMatches('Bearer secret-token', TOKEN)).toBe(true);
    expect(tokenMatches('Bearer secret-tokeX', TOKEN)).toBe(false);
    expect(tokenMatches('secret-token', TOKEN)).toBe(false);
    expect(tokenMatches(null, TOKEN)).toBe(false);
    expect(tokenMatches('Bearer ', undefined)).toBe(false);
    expect(tokenMatches('Bearer ', '')).toBe(false);
  });
});

describe('handleUpload', () => {
  const rel = 'media/motion/11-rpg/video.mp4';
  it('stores the file atomically', async () => {
    const r = await handleUpload(root, put(rel, 'hello'), TOKEN);
    expect(r.status).toBe(200);
    expect(readFileSync(path.join(root, rel), 'utf8')).toBe('hello');
    expect(readdirSync(path.join(root, 'media/motion/11-rpg'))).toEqual(['video.mp4']);
  });
  it('401s with a wrong token', async () => {
    const r = await handleUpload(root, put(rel, 'x', { authorization: 'Bearer nope' }), TOKEN);
    expect(r.status).toBe(401);
  });
  it('400s for a path outside the allow list', async () => {
    expect((await handleUpload(root, put('private/other.json', '{}'), TOKEN)).status).toBe(400);
    expect((await handleUpload(root, put('../escape.mp4', 'x'), TOKEN)).status).toBe(400);
  });
  it('413s when the body exceeds the limit', async () => {
    const r = await handleUpload(root, put(rel, Buffer.alloc(32)), TOKEN, 16);
    expect(r.status).toBe(413);
    expect(existsSync(path.join(root, rel))).toBe(false);
  });
  it('keeps the previous file when the sha does not match', async () => {
    mkdirSync(path.join(root, 'media/motion/11-rpg'), { recursive: true });
    writeFileSync(path.join(root, rel), 'old');
    const r = await handleUpload(root, put(rel, 'new', { 'x-content-sha256': sha('other') }), TOKEN);
    expect(r.status).toBe(422);
    expect(readFileSync(path.join(root, rel), 'utf8')).toBe('old');
    expect(readdirSync(path.join(root, 'media/motion/11-rpg'))).toEqual(['video.mp4']);
  });
  it('validates json files against their schema', async () => {
    expect((await handleUpload(root, put('private/motion-admin.json', '[{"id":"x"}]'), TOKEN)).status).toBe(422);
    const admin = JSON.stringify([{ id: '11-rpg', prompt: 'p', ko: 'k', shots: [['a', 'b', 'c']], cues: [['a', 'b', 'c']] }]);
    expect((await handleUpload(root, put('private/motion-admin.json', admin), TOKEN)).status).toBe(200);
    expect((await handleUpload(root, put('media/motion/manifest.json', '{"a":1}'), TOKEN)).status).toBe(422);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run web/src/lib/media-upload.test.ts`
Expected: FAIL — `./media-upload` 없음.

- [ ] **Step 3: 업로드 구현** — `web/src/lib/media-upload.ts`:
```ts
import 'server-only';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { mediaManifestSchema, motionAdminListSchema } from '@me/content';
import { ADMIN_PATH, MANIFEST_PATH, isUploadablePath, resolveIn } from './volume';

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

class TooLarge extends Error {}

const JSON_SCHEMAS: Record<string, { parse(value: unknown): unknown }> = {
  [MANIFEST_PATH]: mediaManifestSchema,
  [ADMIN_PATH]: motionAdminListSchema,
};

const fail = (status: number, error: string) => Response.json({ error }, { status });

export function tokenMatches(header: string | null, expected: string | undefined): boolean {
  if (!expected || !header?.startsWith('Bearer ')) return false;
  const given = Buffer.from(header.slice('Bearer '.length));
  const want = Buffer.from(expected);
  return given.length === want.length && timingSafeEqual(given, want);
}

export async function handleUpload(root: string, req: Request, expectedToken: string | undefined, maxBytes = MAX_UPLOAD_BYTES): Promise<Response> {
  if (!tokenMatches(req.headers.get('authorization'), expectedToken)) return fail(401, 'unauthorized');
  const rel = new URL(req.url).searchParams.get('path') ?? '';
  if (!isUploadablePath(rel)) return fail(400, 'path not allowed');
  if (Number(req.headers.get('content-length') ?? 0) > maxBytes) return fail(413, 'too large');
  const expectedSha = req.headers.get('x-content-sha256') ?? '';
  if (!/^[0-9a-f]{64}$/.test(expectedSha) || !req.body) return fail(400, 'missing sha or body');

  const dest = resolveIn(root, rel);
  await mkdir(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.${randomUUID()}.part`;
  const hash = createHash('sha256');
  let bytes = 0;
  const meter = new Transform({
    transform(chunk: Buffer, _encoding, done) {
      bytes += chunk.length;
      if (bytes > maxBytes) return done(new TooLarge());
      hash.update(chunk);
      done(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(req.body as unknown as NodeReadableStream), meter, createWriteStream(tmp));
  } catch (error) {
    await rm(tmp, { force: true });
    if (error instanceof TooLarge) return fail(413, 'too large');
    throw error;
  }
  if (hash.digest('hex') !== expectedSha) {
    await rm(tmp, { force: true });
    return fail(422, 'sha256 mismatch');
  }
  const schema = JSON_SCHEMAS[rel];
  if (schema) {
    try {
      schema.parse(JSON.parse(await readFile(tmp, 'utf8')));
    } catch (error) {
      await rm(tmp, { force: true });
      console.error(`[upload] ${rel} failed validation`, error);
      return fail(422, 'invalid json');
    }
  }
  await rename(tmp, dest);
  return Response.json({ ok: true, path: rel, size: bytes });
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run web/src/lib/media-upload.test.ts`
Expected: PASS

- [ ] **Step 5: 라우트 연결**

`web/src/app/api/media/route.ts`:
```ts
import { handleUpload } from '@/lib/media-upload';
import { volumeRoot } from '@/lib/volume';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  return handleUpload(volumeRoot(), req, process.env.MEDIA_UPLOAD_TOKEN);
}
```

`web/src/app/api/media/manifest/route.ts`:
```ts
import { readFile } from 'node:fs/promises';
import { tokenMatches } from '@/lib/media-upload';
import { MANIFEST_PATH, resolveIn, volumeRoot } from '@/lib/volume';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!tokenMatches(req.headers.get('authorization'), process.env.MEDIA_UPLOAD_TOKEN)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    return new Response(await readFile(resolveIn(volumeRoot(), MANIFEST_PATH)), { headers: { 'Content-Type': 'application/json' } });
  } catch {
    return Response.json({});
  }
}
```

- [ ] **Step 6: 타입 확인과 커밋**

Run: `npm run typecheck -w web`
Expected: 에러 없음.

```bash
git add web/src/lib/media-upload.ts web/src/lib/media-upload.test.ts web/src/app/api/media
git commit -m "feat(media): 토큰 보호 업로드 API(sha256·크기·스키마 검증, 원자적 교체)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: manifest 읽기와 렌더된 모션 목록

**Files:**
- Create: `web/src/lib/media.ts`, `web/src/lib/media.test.ts`

**Interfaces:**
- Consumes: `getMotionList`, `mediaManifestSchema`, `MotionPublic`, `MediaManifest` (Task 1); `MANIFEST_PATH`, `resolveIn`, `volumeRoot` (Task 2).
- Produces:
  - `type MediaKind = 'video' | 'preview' | 'poster'`
  - `mediaRel(id: string, kind: MediaKind): string`
  - `readManifest(root: string): Promise<MediaManifest | null>`
  - `mediaUrl(manifest: MediaManifest, id: string, kind: MediaKind): string | null` → `/media/motion/<id>/<file>?v=<sha 8자>`
  - `type MotionCardData = MotionPublic & { video: string; poster: string; preview: string | null }`
  - `renderedMotions(list: MotionPublic[], manifest: MediaManifest | null): MotionCardData[]` (video·poster 둘 다 있는 항목만, 입력 순서 유지)
  - `getRenderedMotions(): Promise<MotionCardData[]>` (Volume 미설정·manifest 없음 → `[]`)
  - `pickFeatured(items: MotionCardData[], n?: number): MotionCardData[]` (featured 먼저, 나머지 번호순, 최대 n=6)

- [ ] **Step 1: 테스트 작성** — `web/src/lib/media.test.ts`:
```ts
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { MediaManifest, MotionPublic } from '@me/content';
import { getRenderedMotions, mediaUrl, pickFeatured, readManifest, renderedMotions, type MotionCardData } from './media';

const entry = (c: string) => ({ size: 1, sha256: c.repeat(64), updatedAt: '2026-10-12T00:00:00.000Z' });
const manifest: MediaManifest = {
  'media/motion/01-pixel/video.mp4': entry('a'),
  'media/motion/01-pixel/poster.webp': entry('b'),
  'media/motion/01-pixel/preview.mp4': entry('c'),
  'media/motion/02-comics/video.mp4': entry('d'),
};
const item = (id: string, no: number, featured = false): MotionPublic => ({ id, no, group: '게임·만화', name: id, en: id, use: 'u', concept: 'c', featured });

describe('mediaUrl', () => {
  it('builds a versioned url', () => expect(mediaUrl(manifest, '01-pixel', 'video')).toBe('/media/motion/01-pixel/video.mp4?v=aaaaaaaa'));
  it('returns null for a missing file', () => expect(mediaUrl(manifest, '03-paper-app', 'poster')).toBeNull());
});

describe('renderedMotions', () => {
  it('keeps only items with both video and poster', () => {
    const out = renderedMotions([item('01-pixel', 1), item('02-comics', 2), item('03-paper-app', 3)], manifest);
    expect(out.map((m) => m.id)).toEqual(['01-pixel']);
    expect(out[0]).toMatchObject({ poster: '/media/motion/01-pixel/poster.webp?v=bbbbbbbb', preview: '/media/motion/01-pixel/preview.mp4?v=cccccccc' });
  });
  it('returns [] when manifest is missing', () => expect(renderedMotions([item('01-pixel', 1)], null)).toEqual([]));
});

describe('pickFeatured', () => {
  const card = (id: string, no: number, featured: boolean): MotionCardData => ({ ...item(id, no, featured), video: 'v', poster: 'p', preview: null });
  it('puts featured first then fills by number', () => {
    const list = [card('01-a', 1, false), card('02-b', 2, true), card('03-c', 3, false)];
    expect(pickFeatured(list, 2).map((m) => m.id)).toEqual(['02-b', '01-a']);
  });
});

describe('getRenderedMotions', () => {
  it('returns [] when the volume is not configured', async () => {
    const saved = process.env.RAILWAY_VOLUME_MOUNT_PATH;
    delete process.env.RAILWAY_VOLUME_MOUNT_PATH;
    try {
      expect(await getRenderedMotions()).toEqual([]);
    } finally {
      process.env.RAILWAY_VOLUME_MOUNT_PATH = saved;
    }
  });
});

describe('readManifest', () => {
  it('returns null when the file is missing or invalid', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'mf-'));
    expect(await readManifest(root)).toBeNull();
    mkdirSync(path.join(root, 'media/motion'), { recursive: true });
    writeFileSync(path.join(root, 'media/motion/manifest.json'), '{"x":1}');
    expect(await readManifest(root)).toBeNull();
  });
  it('parses a valid manifest', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'mf-'));
    mkdirSync(path.join(root, 'media/motion'), { recursive: true });
    writeFileSync(path.join(root, 'media/motion/manifest.json'), JSON.stringify(manifest));
    expect(await readManifest(root)).toEqual(manifest);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run web/src/lib/media.test.ts`
Expected: FAIL — `./media` 없음.

- [ ] **Step 3: 구현** — `web/src/lib/media.ts`:
```ts
import 'server-only';
import { readFile, stat } from 'node:fs/promises';
import { getMotionList, mediaManifestSchema, type MediaManifest, type MotionPublic } from '@me/content';
import { MANIFEST_PATH, resolveIn, volumeRoot } from './volume';

export type MediaKind = 'video' | 'preview' | 'poster';
export type MotionCardData = MotionPublic & { video: string; poster: string; preview: string | null };

const FILES: Record<MediaKind, string> = { video: 'video.mp4', preview: 'preview.mp4', poster: 'poster.webp' };

export function mediaRel(id: string, kind: MediaKind): string {
  return `media/motion/${id}/${FILES[kind]}`;
}

// 요청마다 렌더하므로 manifest 는 mtime 이 바뀔 때만 다시 읽는다.
const cache = new Map<string, { mtimeMs: number; manifest: MediaManifest }>();

export async function readManifest(root: string): Promise<MediaManifest | null> {
  const file = resolveIn(root, MANIFEST_PATH);
  let mtimeMs: number;
  try {
    mtimeMs = (await stat(file)).mtimeMs;
  } catch {
    return null;
  }
  const hit = cache.get(file);
  if (hit?.mtimeMs === mtimeMs) return hit.manifest;
  try {
    const manifest = mediaManifestSchema.parse(JSON.parse(await readFile(file, 'utf8')));
    cache.set(file, { mtimeMs, manifest });
    return manifest;
  } catch (error) {
    console.error('[media] invalid manifest', error);
    return null;
  }
}

export function mediaUrl(manifest: MediaManifest, id: string, kind: MediaKind): string | null {
  const rel = mediaRel(id, kind);
  const entry = manifest[rel];
  return entry ? `/${rel}?v=${entry.sha256.slice(0, 8)}` : null;
}

export function renderedMotions(list: MotionPublic[], manifest: MediaManifest | null): MotionCardData[] {
  if (!manifest) return [];
  return list.flatMap((m) => {
    const video = mediaUrl(manifest, m.id, 'video');
    const poster = mediaUrl(manifest, m.id, 'poster');
    return video && poster ? [{ ...m, video, poster, preview: mediaUrl(manifest, m.id, 'preview') }] : [];
  });
}

export async function getRenderedMotions(): Promise<MotionCardData[]> {
  let root: string;
  try {
    root = volumeRoot();
  } catch (error) {
    console.error('[media]', error);
    return [];
  }
  return renderedMotions(getMotionList(), await readManifest(root));
}

export function pickFeatured(items: MotionCardData[], n = 6): MotionCardData[] {
  return [...items.filter((m) => m.featured), ...items.filter((m) => !m.featured)].slice(0, n);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run web/src/lib/media.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**
```bash
git add web/src/lib/media.ts web/src/lib/media.test.ts
git commit -m "feat(media): manifest 기반 렌더된 모션 목록과 버전 URL

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: media:prepare / media:push 스크립트

**Files:**
- Create: `scripts/media/manifest.ts`, `scripts/__tests__/media-manifest.test.ts`, `scripts/media-prepare.ts`, `scripts/media-push.ts`
- Modify: `package.json` (scripts), `.env.example`

**Interfaces:**
- Consumes: `mediaManifestSchema`, `MediaManifest` (Task 1); HTTP API (Task 4).
- Produces: `sha256File(file: string): Promise<string>`; `buildManifest(root: string): Promise<MediaManifest>` (`root/media/motion/*/{video.mp4,preview.mp4,poster.webp}` 만, 키 정렬); `diffManifest(local: MediaManifest, remote: MediaManifest): string[]` (remote 에 없거나 sha 가 다른 키, 정렬). 산출물 디렉터리 `.media-out/` = Volume 과 같은 구조.

- [ ] **Step 1: 테스트 작성** — `scripts/__tests__/media-manifest.test.ts`:
```ts
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildManifest, diffManifest } from '../media/manifest';

const e = (c: string) => ({ size: 1, sha256: c.repeat(64), updatedAt: 't' });

describe('diffManifest', () => {
  it('lists new and changed files only', () => {
    const local = { 'a.mp4': e('a'), 'b.mp4': e('b'), 'c.mp4': e('c') };
    const remote = { 'a.mp4': e('a'), 'b.mp4': e('x') };
    expect(diffManifest(local, remote)).toEqual(['b.mp4', 'c.mp4']);
  });
  it('is empty when identical', () => expect(diffManifest({ 'a.mp4': e('a') }, { 'a.mp4': e('a') })).toEqual([]));
});

describe('buildManifest', () => {
  it('hashes known media files and ignores others', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'bm-'));
    const dir = path.join(root, 'media/motion/11-rpg');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'video.mp4'), 'v');
    writeFileSync(path.join(dir, 'poster.webp'), 'p');
    writeFileSync(path.join(dir, '.source-sha256'), 'x');
    const m = await buildManifest(root);
    expect(Object.keys(m)).toEqual(['media/motion/11-rpg/poster.webp', 'media/motion/11-rpg/video.mp4']);
    expect(m['media/motion/11-rpg/video.mp4']).toMatchObject({ size: 1, sha256: createHash('sha256').update('v').digest('hex') });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run scripts/__tests__/media-manifest.test.ts`
Expected: FAIL — `../media/manifest` 없음.

- [ ] **Step 3: manifest 모듈 구현** — `scripts/media/manifest.ts`:
```ts
import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { mediaManifestSchema, type MediaManifest } from '../../content/motion/schema';

const MEDIA_FILES = ['video.mp4', 'preview.mp4', 'poster.webp'] as const;

export async function sha256File(file: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

export async function buildManifest(root: string): Promise<MediaManifest> {
  const base = path.join(root, 'media/motion');
  const ids = existsSync(base) ? (await readdir(base, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name) : [];
  const out: MediaManifest = {};
  for (const id of ids.sort()) {
    for (const name of MEDIA_FILES) {
      const file = path.join(base, id, name);
      if (!existsSync(file)) continue;
      const info = await stat(file);
      out[`media/motion/${id}/${name}`] = { size: info.size, sha256: await sha256File(file), updatedAt: info.mtime.toISOString() };
    }
  }
  const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
  return mediaManifestSchema.parse(sorted);
}

export function diffManifest(local: MediaManifest, remote: MediaManifest): string[] {
  return Object.keys(local).filter((k) => remote[k]?.sha256 !== local[k]?.sha256).sort();
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run scripts/__tests__/media-manifest.test.ts`
Expected: PASS

- [ ] **Step 5: prepare 스크립트** — `scripts/media-prepare.ts`:
```ts
// MOTION_SRC/media/chois/<id>.mp4 (HyperFrames 렌더)를 웹용으로 다시 인코딩해 .media-out/ 에 Volume 과 같은 구조로 둔다.
// 이 ffmpeg 빌드에는 WebP 인코더가 없어 포스터는 PNG 를 뽑은 뒤 cwebp 로 변환한다.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildManifest, sha256File } from './media/manifest';

const SRC = process.env.MOTION_SRC ?? '/Volumes/Chois_SD2/dev/motion';
const OUT = path.resolve('.media-out');
const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'inherit'] });

const renders = path.join(SRC, 'media/chois');
const ids = readdirSync(renders).filter((f) => /^\d{2}-[a-z0-9-]+\.mp4$/.test(f)).map((f) => f.slice(0, -4)).sort();

for (const id of ids) {
  const src = path.join(renders, `${id}.mp4`);
  const dir = path.join(OUT, 'media/motion', id);
  mkdirSync(dir, { recursive: true });
  const stamp = path.join(dir, '.source-sha256');
  const srcSha = await sha256File(src);
  const outputs = ['video.mp4', 'preview.mp4', 'poster.webp'].map((f) => path.join(dir, f));
  if (existsSync(stamp) && readFileSync(stamp, 'utf8') === srcSha && outputs.every((f) => existsSync(f))) {
    console.info(`skip ${id}`);
    continue;
  }
  const [video, preview, poster] = outputs as [string, string, string];
  run('ffmpeg', ['-y', '-v', 'error', '-i', src, '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', video]);
  run('ffmpeg', ['-y', '-v', 'error', '-i', src, '-an', '-vf', 'scale=640:360', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', preview]);
  const png = path.join(dir, 'poster.png');
  run('ffmpeg', ['-y', '-v', 'error', '-ss', '9', '-i', src, '-frames:v', '1', '-vf', 'scale=1280:720', png]);
  run('cwebp', ['-quiet', '-q', '82', png, '-o', poster]);
  rmSync(png);
  writeFileSync(stamp, srcSha);
  console.info(`prepared ${id}`);
}

const manifest = await buildManifest(OUT);
writeFileSync(path.join(OUT, 'media/motion/manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.info(`manifest: ${Object.keys(manifest).length} files`);
```

- [ ] **Step 6: push 스크립트** — `scripts/media-push.ts`:
```ts
// .media-out/ 을 서버 Volume 과 비교해 바뀐 파일만 업로드한다. 관리자 데이터와 manifest 는 마지막에 항상 올린다.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { mediaManifestSchema } from '../content/motion/schema';
import { diffManifest, sha256File } from './media/manifest';

const BASE = (process.env.MEDIA_PUSH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const TOKEN = process.env.MEDIA_UPLOAD_TOKEN;
const OUT = path.resolve('.media-out');
const MANIFEST = 'media/motion/manifest.json';
const ADMIN = 'private/motion-admin.json';

if (!TOKEN) throw new Error('MEDIA_UPLOAD_TOKEN is not set');
const auth = { authorization: `Bearer ${TOKEN}` };

async function put(rel: string) {
  const file = path.join(OUT, rel);
  const res = await fetch(`${BASE}/api/media?path=${encodeURIComponent(rel)}`, {
    method: 'PUT',
    headers: { ...auth, 'x-content-sha256': await sha256File(file), 'content-length': String(statSync(file).size), 'content-type': 'application/octet-stream' },
    body: Readable.toWeb(createReadStream(file)) as ReadableStream,
    duplex: 'half',
  } as RequestInit);
  if (!res.ok) throw new Error(`upload failed ${rel}: ${res.status} ${await res.text()}`);
  console.info(`uploaded ${rel}`);
}

const local = mediaManifestSchema.parse(JSON.parse(await readFile(path.join(OUT, MANIFEST), 'utf8')));
const remoteRes = await fetch(`${BASE}/api/media/manifest`, { headers: auth });
if (!remoteRes.ok) throw new Error(`manifest fetch failed: ${remoteRes.status}`);
const remote = mediaManifestSchema.parse(await remoteRes.json());
const changed = diffManifest(local, remote);
console.info(`${changed.length} changed of ${Object.keys(local).length}`);
for (const rel of changed) await put(rel);
if (!existsSync(path.join(OUT, ADMIN))) throw new Error(`${ADMIN} missing — run npm run motion:import first`);
await put(ADMIN);
await put(MANIFEST);
console.info('done');
```

루트 `package.json` scripts 에 추가:
```json
"media:prepare": "tsx scripts/media-prepare.ts",
"media:push": "tsx scripts/media-push.ts",
```

`.env.example` (없으면 생성, 있으면 끝에 추가):
```
# 로컬 개발 (web/.env.local 로 복사)
RAILWAY_VOLUME_MOUNT_PATH=../.local-volume
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
ADMIN_EMAILS=
MEDIA_UPLOAD_TOKEN=
# 로컬 스크립트 전용
MOTION_SRC=/Volumes/Chois_SD2/dev/motion
MEDIA_PUSH_URL=http://localhost:3000
```

- [ ] **Step 7: 실제 실행 확인 (로컬)**

Run: `npm run media:prepare`
Expected: `prepared 01-pixel` … 20개, `manifest: 60 files`. `du -sh .media-out/media` 가 약 200–300 MB.

Run (빌드 후 서버를 로컬 Volume 으로 띄움): `npm run build:web && RAILWAY_VOLUME_MOUNT_PATH=$PWD/.local-volume MEDIA_UPLOAD_TOKEN=dev-token PORT=3000 npm start` (다른 터미널)
Run: `MEDIA_UPLOAD_TOKEN=dev-token npm run media:push`
Expected: `60 changed of 60` → `uploaded …` 62줄 → `done`. 같은 명령을 다시 실행하면 `0 changed of 60`.

Run: `curl -sI -H 'Range: bytes=0-99' http://localhost:3000/media/motion/11-rpg/video.mp4`
Expected: `HTTP/1.1 206`, `content-range: bytes 0-99/…`.

- [ ] **Step 8: 커밋**
```bash
git add scripts/media scripts/media-prepare.ts scripts/media-push.ts scripts/__tests__/media-manifest.test.ts package.json .env.example
git commit -m "feat(media): 웹용 인코딩(media:prepare)과 변경분 업로드(media:push)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 공개 화면 — 홈 섹션, 갤러리, 상세

**Files:**
- Create: `web/src/components/sections/Motion.tsx`, `web/src/components/motion-gallery/MotionCard.tsx`, `web/src/components/motion-gallery/MotionGallery.tsx`, `web/src/components/motion-gallery/KeyNav.tsx`, `web/src/app/(ko)/motion/page.tsx`, `web/src/app/(ko)/motion/[id]/page.tsx`, `web/e2e/fixtures/tiny.mp4`, `web/e2e/fixtures/tiny.webp`, `web/e2e/motion.spec.ts`
- Modify: `content/schema.ts` (uiSchema), `content/ko/ui.json`, `content/en/ui.json`, `web/src/lib/sections.ts`, `web/src/components/Nav.tsx`, `web/src/components/RootShell.tsx`, `web/src/components/HomePage.tsx`, `scripts/e2e-fixture.ts`, `web/public/sitemap.xml`

**Interfaces:**
- Consumes: `getRenderedMotions`, `pickFeatured`, `MotionCardData` (Task 5); `MOTION_GROUPS`, `getContent` (`@me/content`); `localePath` (`web/src/lib/locale.ts`).
- Produces: `ui.nav.motion`, `ui.sections.motion`, `ui.motion = { intro, viewAll, empty, all, admin, back, prev, next }`; `SECTION_IDS` 에 `'motion'`(projects 다음); `MotionCard({ item, label, href? })`; `MotionGallery({ items, groups, allLabel, initialGroup })`; `KeyNav({ prevHref, nextHref })`; e2e 픽스처: 렌더된 id = `01-pixel`(게임·만화), `17-embroidery`(종이·공예), 관리자 마커 문자열 `E2E-ADMIN-MARKER`.

- [ ] **Step 1: UI 문구 스키마 확장** — `content/schema.ts` 의 `uiSchema`:
  - `nav` 객체에 `motion: z.string(),` 추가 (`projects` 다음).
  - `sections` 객체에 `motion: z.string(),` 추가.
  - `projects:` 줄 다음에 추가:
```ts
  motion: z.object({ intro: z.string(), viewAll: z.string(), empty: z.string(), all: z.string(), admin: z.string(), back: z.string(), prev: z.string(), next: z.string() }),
```

`content/ko/ui.json`: `nav` 에 `"motion": "모션"`, `sections` 에 `"motion": "바이브코딩 모션그래픽"`, 최상위에:
```json
"motion": {
  "intro": "기초 바이브코딩부터 에이전틱 AI까지 — HyperFrames 로 직접 만든 10초 인트로",
  "viewAll": "전체 보기",
  "empty": "영상을 준비하고 있습니다.",
  "all": "전체",
  "admin": "관리자",
  "back": "목록으로",
  "prev": "이전",
  "next": "다음"
}
```
`content/en/ui.json`: `nav` 에 `"motion": "Motion"`, `sections` 에 `"motion": "Vibe-coding motion graphics"`, 최상위에:
```json
"motion": {
  "intro": "10-second intros I made with HyperFrames — from vibe-coding basics to agentic AI",
  "viewAll": "See all",
  "empty": "Videos are on the way.",
  "all": "All",
  "admin": "Admin",
  "back": "Back to list",
  "prev": "Previous",
  "next": "Next"
}
```

Run: `npx vitest run content && npm run content:validate`
Expected: PASS

- [ ] **Step 2: e2e 픽스처 원본 만들기** (로컬 1회, 커밋)
```bash
mkdir -p web/e2e/fixtures
ffmpeg -y -v error -f lavfi -i color=c=0x14365B:s=320x180:d=1 -f lavfi -i sine=frequency=440:duration=1 -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest -movflags +faststart web/e2e/fixtures/tiny.mp4
ffmpeg -y -v error -f lavfi -i color=c=0xE4B23A:s=320x180 -frames:v 1 /tmp/tiny.png && cwebp -quiet /tmp/tiny.png -o web/e2e/fixtures/tiny.webp
ls -l web/e2e/fixtures
```
Expected: 두 파일 모두 수 KB.

- [ ] **Step 3: 픽스처 스크립트 완성** — `scripts/e2e-fixture.ts` 전체 교체:
```ts
// e2e 서버가 읽을 Volume 을 만든다: 01-pixel·17-embroidery 두 개만 렌더된 상태 + 표식이 든 관리자 데이터.
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildManifest } from './media/manifest';

const web = path.resolve(import.meta.dirname, '../web');
const root = path.join(web, 'e2e/.volume');
const fixtures = path.join(web, 'e2e/fixtures');
export const RENDERED = ['01-pixel', '17-embroidery'];

rmSync(root, { recursive: true, force: true });
for (const id of RENDERED) {
  const dir = path.join(root, 'media/motion', id);
  mkdirSync(dir, { recursive: true });
  copyFileSync(path.join(fixtures, 'tiny.mp4'), path.join(dir, 'video.mp4'));
  copyFileSync(path.join(fixtures, 'tiny.mp4'), path.join(dir, 'preview.mp4'));
  copyFileSync(path.join(fixtures, 'tiny.webp'), path.join(dir, 'poster.webp'));
}
const manifest = await buildManifest(root);
writeFileSync(path.join(root, 'media/motion/manifest.json'), JSON.stringify(manifest));
mkdirSync(path.join(root, 'private'), { recursive: true });
writeFileSync(path.join(root, 'private/motion-admin.json'), JSON.stringify(RENDERED.map((id) => ({
  id,
  prompt: `E2E-ADMIN-MARKER ## 1. Channel\n- Name: {{Channel name=Chois의 바이브코딩}}\n- {{-Numbers=Show numbers}}`,
  ko: `E2E-ADMIN-MARKER ## 1. 채널\n- 이름: {{채널 이름=Chois의 바이브코딩}}`,
  shots: [['0.0–1.0', 'E2E-ADMIN-MARKER 장면', '이유']],
  cues: [['0.000', 'E2E-ADMIN-MARKER kick', 'first frame']],
}))));
console.info(`e2e volume ready: ${root}`);
```

- [ ] **Step 4: 실패하는 e2e 작성** — `web/e2e/motion.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('home shows the motion section with rendered cards only', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('section#motion');
  await expect(section.getByTestId('motion-card')).toHaveCount(2);
  await expect(section.getByRole('link', { name: /전체 보기/ })).toHaveAttribute('href', '/motion/');
  await expect(page.getByRole('navigation', { name: 'primary' }).getByRole('link', { name: '모션' })).toHaveAttribute('href', '/#motion');
});

test('english home links english names to the korean gallery', async ({ page }) => {
  await page.goto('/en/');
  await expect(page.locator('section#motion').getByTestId('motion-card')).toHaveCount(2);
});

test('gallery filters by group and keeps it in the url', async ({ page }) => {
  await page.goto('/motion/');
  await expect(page.getByTestId('motion-card')).toHaveCount(2);
  await page.getByRole('button', { name: /종이·공예/ }).click();
  await expect(page.getByTestId('motion-card')).toHaveCount(1);
  await expect(page).toHaveURL(/\?g=/);
  await page.reload();
  await expect(page.getByTestId('motion-card')).toHaveCount(1);
  await page.getByRole('button', { name: /^전체/ }).click();
  await expect(page.getByTestId('motion-card')).toHaveCount(2);
});

test('detail page plays the versioned video and moves with arrow keys', async ({ page, request }) => {
  await page.goto('/motion/01-pixel/');
  const video = page.locator('video[data-testid="motion-video"]');
  const src = await video.getAttribute('src');
  expect(src).toMatch(/^\/media\/motion\/01-pixel\/video\.mp4\?v=[0-9a-f]{8}$/);
  const r = await request.get(src!, { headers: { range: 'bytes=0-99' } });
  expect(r.status()).toBe(206);
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/\/motion\/17-embroidery\/$/);
});

test('unrendered and unknown ids are 404', async ({ request }) => {
  expect((await request.get('/motion/02-comics/')).status()).toBe(404);
  expect((await request.get('/motion/zz-nope/')).status()).toBe(404);
});

test.describe('mobile 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test('gallery has no horizontal page scroll', async ({ page }) => {
    await page.goto('/motion/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
```

Run: `npm run build:web && npm run e2e -- motion.spec.ts`
Expected: FAIL — `section#motion` 없음.

- [ ] **Step 5: 섹션 ID·Nav·RootShell** 

`web/src/lib/sections.ts`:
```ts
export const SECTION_IDS = ['hero', 'stats', 'timeline', 'pillars', 'projects', 'motion', 'books', 'lectures', 'contact'] as const;
export type SectionId = (typeof SECTION_IDS)[number];
```

`web/src/components/Nav.tsx` — `/motion` 등 다른 페이지에서도 앵커가 홈으로 가도록 경로를 붙이고, 렌더된 모션이 없으면 「모션」을 숨긴다:
```tsx
import type { Locale, Ui } from '@me/content';
import { localePath } from '@/lib/locale';
import { SECTION_IDS } from '@/lib/sections';
import { LangToggle } from './LangToggle';

export function Nav({ locale, ui, hasMotion }: { locale: Locale; ui: Ui; hasMotion: boolean }) {
  const home = localePath(locale);
  const ids = SECTION_IDS.filter((id) => id !== 'hero' && (hasMotion || id !== 'motion'));
  return (
    <header className="fixed inset-x-0 top-0 z-10 h-[var(--nav-h)] border-b border-line bg-bg/90 backdrop-blur">
      <nav className="mx-auto flex h-full max-w-6xl items-center gap-2 px-2 sm:px-3" aria-label="primary">
        <a href={`${home}#hero`} className="min-h-11 min-w-11 inline-flex items-center px-2 font-mono text-sm font-bold whitespace-nowrap">chois</a>
        <ul className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap">
          {ids.map((id) => (
            <li key={id}>
              <a href={`${home}#${id}`} className="min-h-11 inline-flex items-center rounded-full px-3 text-sm text-muted hover:text-fg">
                {ui.nav[id]}
              </a>
            </li>
          ))}
        </ul>
        <LangToggle locale={locale} label={ui.lang.switchTo} title={ui.lang.switchLabel} />
      </nav>
    </header>
  );
}
```

`web/src/components/RootShell.tsx` — async 로 바꾸고 `hasMotion` 전달:
```tsx
import type { ReactNode } from 'react';
import { getContent, type Locale } from '@me/content';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@fontsource-variable/jetbrains-mono';
import '@/app/globals.css';
import { getRenderedMotions } from '@/lib/media';
import { Nav } from './Nav';

export async function RootShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const { ui } = getContent(locale);
  const hasMotion = (await getRenderedMotions()).length > 0;
  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
        <Nav locale={locale} ui={ui} hasMotion={hasMotion} />
        <main className="pt-[var(--nav-h)]">{children}</main>
        <footer className="px-2 py-8 text-center text-xs text-muted sm:px-3">{ui.footer}</footer>
      </body>
    </html>
  );
}
```
(기존 `smoke.spec.ts` 의 `language toggle keeps the section hash` 는 `/#projects` 형태를 그대로 기대하므로 변경 없음.)

- [ ] **Step 6: 카드와 홈 섹션**

`web/src/components/motion-gallery/MotionCard.tsx`:
```tsx
'use client';
import Link from 'next/link';
import { useRef } from 'react';
import type { MotionCardData } from '@/lib/media';

export function MotionCard({ item, label, href }: { item: MotionCardData; label: string; href?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  // 터치 기기는 호버가 없으므로 미리보기를 받지 않고 탭하면 바로 상세로 간다.
  const play = () => {
    const v = video.current;
    if (!v || !item.preview || !window.matchMedia('(hover: hover)').matches) return;
    if (!v.getAttribute('src')) v.src = item.preview;
    v.play().catch(() => {});
  };
  const stop = () => {
    const v = video.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
  };
  return (
    <Link
      href={href ?? `/motion/${item.id}/`}
      data-testid="motion-card"
      onMouseEnter={play}
      onMouseLeave={stop}
      onFocus={play}
      onBlur={stop}
      className="group block h-full overflow-hidden rounded-[var(--radius-card)] border border-line bg-bg hover:border-accent"
    >
      <div className="relative aspect-video bg-line">
        {/* eslint-disable-next-line @next/next/no-img-element -- Volume 에서 스트리밍하는 버전 URL 이라 next/image 대상이 아니다 */}
        <img src={item.poster} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        {item.preview ? (
          <video ref={video} muted loop playsInline preload="none" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity group-hover:opacity-100" />
        ) : null}
      </div>
      <div className="flex items-baseline gap-2 px-2 pt-2">
        <span className="font-mono text-xs text-muted">{String(item.no).padStart(2, '0')}</span>
        <span className="min-w-0 overflow-hidden text-sm font-bold text-ellipsis whitespace-nowrap" title={label}>{label}</span>
      </div>
      <p className="overflow-hidden px-2 pb-2 text-xs text-ellipsis whitespace-nowrap text-muted" title={item.use}>{item.use}</p>
    </Link>
  );
}
```

`web/src/components/sections/Motion.tsx`:
```tsx
import Link from 'next/link';
import type { Locale, Ui } from '@me/content';
import type { MotionCardData } from '@/lib/media';
import { Section } from '../Section';
import { MotionCard } from '../motion-gallery/MotionCard';

export function Motion({ items, ui, locale }: { items: MotionCardData[]; ui: Ui; locale: Locale }) {
  return (
    <Section id="motion" title={ui.sections.motion}>
      <p className="mb-4 text-muted">{ui.motion.intro}</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {items.map((m) => (
          <li key={m.id}>
            <MotionCard item={m} label={locale === 'en' ? m.en : m.name} />
          </li>
        ))}
      </ul>
      <Link href="/motion/" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm whitespace-nowrap hover:border-accent">
        {ui.motion.viewAll} →
      </Link>
    </Section>
  );
}
```

`web/src/components/HomePage.tsx` — async 로 바꾸고 Projects 다음에 넣는다:
```tsx
import { computeStats, getContent, type Locale } from '@me/content';
import { getRenderedMotions, pickFeatured } from '@/lib/media';
import { Hero } from './sections/Hero';
import { Stats } from './sections/Stats';
import { Timeline } from './sections/Timeline';
import { Pillars } from './sections/Pillars';
import { Projects } from './sections/Projects';
import { Motion } from './sections/Motion';
import { Books } from './sections/Books';
import { Lectures } from './sections/Lectures';
import { Contact } from './sections/Contact';

export async function HomePage({ locale }: { locale: Locale }) {
  const content = getContent(locale);
  const { profile, ui } = content;
  const stats = computeStats(content);
  const motions = pickFeatured(await getRenderedMotions());
  return (
    <>
      <Hero profile={profile} ui={ui} locale={locale} />
      <Stats stats={stats} ui={ui} />
      <Timeline profile={profile} ui={ui} />
      <Pillars profile={profile} ui={ui} />
      <Projects projects={content.projects} ui={ui} />
      {motions.length > 0 ? <Motion items={motions} ui={ui} locale={locale} /> : null}
      <Books profile={profile} ui={ui} />
      <Lectures profile={profile} ui={ui} />
      <Contact profile={profile} ui={ui} />
    </>
  );
}
```

- [ ] **Step 7: 갤러리 페이지**

`web/src/components/motion-gallery/MotionGallery.tsx`:
```tsx
'use client';
import { useState } from 'react';
import type { MotionCardData } from '@/lib/media';
import { MotionCard } from './MotionCard';

type Props = { items: MotionCardData[]; groups: readonly string[]; allLabel: string; initialGroup: string | null };

export function MotionGallery({ items, groups, allLabel, initialGroup }: Props) {
  const present = groups.filter((g) => items.some((m) => m.group === g));
  const [group, setGroup] = useState<string | null>(initialGroup && present.includes(initialGroup) ? initialGroup : null);
  const shown = group ? items.filter((m) => m.group === group) : items;
  const choose = (g: string | null) => {
    setGroup(g);
    history.replaceState(null, '', g ? `?g=${encodeURIComponent(g)}` : location.pathname);
  };
  return (
    <>
      <div role="toolbar" aria-label="group filter" className="-mx-2 mb-4 flex gap-2 overflow-x-auto px-2 pb-1">
        {[null, ...present].map((g) => (
          <button
            key={g ?? 'all'}
            type="button"
            aria-pressed={group === g}
            onClick={() => choose(g)}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-sm whitespace-nowrap ${group === g ? 'border-fg bg-fg text-bg' : 'border-line'}`}
          >
            {g ?? allLabel} <span className="font-mono text-xs opacity-70">{g ? items.filter((m) => m.group === g).length : items.length}</span>
          </button>
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
        {shown.map((m) => (
          <li key={m.id}>
            <MotionCard item={m} label={m.name} />
          </li>
        ))}
      </ul>
    </>
  );
}
```

`web/src/app/(ko)/motion/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { MOTION_GROUPS, getContent } from '@me/content';
import { MotionGallery } from '@/components/motion-gallery/MotionGallery';
import { getRenderedMotions } from '@/lib/media';

export const dynamic = 'force-dynamic';

const { ui } = getContent('ko');
export const metadata: Metadata = {
  title: `${ui.sections.motion} · ${ui.siteTitle}`,
  description: ui.motion.intro,
  alternates: { canonical: '/motion/' },
};

export default async function MotionPage({ searchParams }: { searchParams: Promise<{ g?: string }> }) {
  const { g } = await searchParams;
  const items = await getRenderedMotions();
  return (
    <section className="px-2 py-8 sm:px-3 md:px-4 lg:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">{ui.sections.motion}</h1>
        <p className="mb-4 text-muted">{ui.motion.intro}</p>
        {items.length > 0 ? (
          <MotionGallery items={items} groups={MOTION_GROUPS} allLabel={ui.motion.all} initialGroup={g ?? null} />
        ) : (
          <p data-testid="motion-empty" className="text-muted">{ui.motion.empty}</p>
        )}
        <div className="mt-10 text-right">
          <a href="/motion/admin/" className="inline-flex min-h-11 items-center px-2 text-xs whitespace-nowrap text-muted">{ui.motion.admin}</a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 8: 상세 페이지와 키보드 이동**

`web/src/components/motion-gallery/KeyNav.tsx`:
```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function KeyNav({ prevHref, nextHref }: { prevHref: string | null; nextHref: string | null }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 입력 중이거나 영상에 포커스가 있으면 브라우저 기본 동작(커서 이동·탐색)을 지킨다.
      const t = e.target;
      if (e.altKey || e.ctrlKey || e.metaKey || t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLVideoElement) return;
      if (e.key === 'ArrowLeft' && prevHref) router.push(prevHref);
      if (e.key === 'ArrowRight' && nextHref) router.push(nextHref);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prevHref, nextHref, router]);
  return null;
}
```

`web/src/app/(ko)/motion/[id]/page.tsx`:
```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getContent } from '@me/content';
import { KeyNav } from '@/components/motion-gallery/KeyNav';
import { getRenderedMotions } from '@/lib/media';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  const items = await getRenderedMotions();
  const i = items.findIndex((m) => m.id === id);
  if (i < 0) return null;
  return { item: items[i]!, prev: items[i - 1] ?? null, next: items[i + 1] ?? null };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const hit = await load((await params).id);
  if (!hit) return {};
  const { ui } = getContent('ko');
  const title = `${hit.item.name} · ${ui.sections.motion}`;
  const url = `/motion/${hit.item.id}/`;
  return {
    title,
    description: hit.item.concept,
    alternates: { canonical: url },
    openGraph: { type: 'video.other', title, description: hit.item.concept, url, images: [{ url: hit.item.poster, width: 1280, height: 720 }] },
  };
}

const navLink = 'inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm whitespace-nowrap hover:border-accent';

export default async function MotionDetailPage({ params }: Props) {
  const hit = await load((await params).id);
  if (!hit) notFound();
  const { ui } = getContent('ko');
  const { item, prev, next } = hit;
  const href = (m: { id: string } | null) => (m ? `/motion/${m.id}/` : null);
  return (
    <article className="px-2 py-6 sm:px-3 md:px-4 lg:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <video data-testid="motion-video" src={item.video} poster={item.poster} controls playsInline preload="metadata" className="aspect-video w-full rounded-[var(--radius-card)] bg-black" />
        <header className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-sm text-muted">{String(item.no).padStart(2, '0')}</span>
          <h1 className="text-2xl font-bold tracking-tight whitespace-nowrap sm:text-3xl">{item.name}</h1>
          <span className="text-sm whitespace-nowrap text-muted">{item.en}</span>
        </header>
        <p className="mt-1 text-sm text-muted">{item.use}</p>
        <p className="mt-4 leading-relaxed">{item.concept}</p>
        <nav className="mt-6 flex flex-wrap items-center gap-2" aria-label="motion">
          {prev ? <Link href={href(prev)!} className={navLink}>← {ui.motion.prev}</Link> : null}
          <Link href="/motion/" className={navLink}>{ui.motion.back}</Link>
          {next ? <Link href={href(next)!} className={navLink}>{ui.motion.next} →</Link> : null}
        </nav>
        <KeyNav prevHref={href(prev)} nextHref={href(next)} />
      </div>
    </article>
  );
}
```

`web/public/sitemap.xml` 의 `</urlset>` 앞에 추가:
```xml
  <url><loc>https://me.chois.pro/motion/</loc></url>
```

- [ ] **Step 9: e2e 통과 확인**

Run: `npm run build:web && npm run e2e`
Expected: `motion.spec.ts` 전부 PASS, `smoke.spec.ts`(섹션 9개 포함)·`platform.spec.ts` PASS.

- [ ] **Step 10: 린트·타입 확인과 커밋**

Run: `npm run check`
Expected: PASS

```bash
git add content web/src web/e2e web/public/sitemap.xml scripts/e2e-fixture.ts
git commit -m "feat(motion): 홈 모션 섹션·/motion 갤러리·상세 페이지

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Google 로그인과 관리자 화면

**Files:**
- Create: `web/src/auth.ts`, `web/src/app/api/auth/[...nextauth]/route.ts`, `web/src/lib/admin-emails.ts`, `web/src/lib/admin-emails.test.ts`, `web/src/lib/motion-admin.ts`, `web/src/lib/motion-admin.test.ts`, `web/src/lib/admin-session.ts`, `web/src/components/motion-gallery/admin/placeholders.ts`, `web/src/components/motion-gallery/admin/placeholders.test.ts`, `web/src/components/motion-gallery/admin/PromptPanel.tsx`, `web/src/components/motion-gallery/admin/RowsTable.tsx`, `web/src/app/(ko)/motion/admin/layout.tsx`, `web/src/app/(ko)/motion/admin/page.tsx`, `web/src/app/(ko)/motion/admin/[id]/page.tsx`
- Modify: `web/package.json` (next-auth), `web/src/app/globals.css` (`.prose-cell`), `web/e2e/motion.spec.ts`

**Interfaces:**
- Consumes: `getMotionList`, `getMotion`, `motionAdminListSchema`, `MotionAdmin` (Task 1); `ADMIN_PATH`, `resolveIn`, `volumeRoot` (Task 2); `getRenderedMotions` (Task 5).
- Produces: `auth`, `handlers`, `signIn`, `signOut` (`@/auth`); `isAdminEmail(email: string | null | undefined, raw: string | undefined): boolean`; `readMotionAdmin(root: string): Promise<MotionAdmin[] | null>`; `requireAdmin(callbackPath: string): Promise<void>`; `loadMotionAdmin(callbackPath: string): Promise<MotionAdmin[] | null>`; placeholders: `type PromptLang = 'en' | 'ko'`, `type PromptState = { values: Record<string, string>; toggles: Record<string, boolean>; withTables: boolean }`, `type Segment = { text: string; mark?: 'value' | 'on' | 'off' }`, `FIELD_KEYS`, `TOGGLE_KEYS`, `parsePlaceholders(src: string): Record<string, Placeholder>`, `isToggleOn(key: string, flag: string, toggles: Record<string, boolean>): boolean`, `renderLines(src: string, state: PromptState): Segment[][]`, `renderPrompt(src: string, state: PromptState): string`, `tablesMarkdown(item: Pick<MotionAdmin, 'shots' | 'cues'>, lang: PromptLang): string`, `finalPrompt(item: MotionAdmin, lang: PromptLang, state: PromptState): string`.

- [ ] **Step 1: next-auth 설치**

Run: `npm install next-auth@5.0.0-beta.32 server-only@0.0.1 -w web`
Expected: 설치 성공(peer 경고 없음 — next 16 지원 확인됨).

- [ ] **Step 2: 관리자 이메일 테스트** — `web/src/lib/admin-emails.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { isAdminEmail } from './admin-emails';

describe('isAdminEmail', () => {
  const raw = ' Admin@Example.com , second@example.com,';
  it('matches case- and space-insensitively', () => {
    expect(isAdminEmail('admin@example.com', raw)).toBe(true);
    expect(isAdminEmail(' SECOND@example.com ', raw)).toBe(true);
  });
  it('rejects others and empty input', () => {
    expect(isAdminEmail('other@example.com', raw)).toBe(false);
    expect(isAdminEmail(null, raw)).toBe(false);
    expect(isAdminEmail('', raw)).toBe(false);
    expect(isAdminEmail('admin@example.com', undefined)).toBe(false);
    expect(isAdminEmail('', ',')).toBe(false);
  });
});
```

Run: `npx vitest run web/src/lib/admin-emails.test.ts` → Expected: FAIL (모듈 없음)

`web/src/lib/admin-emails.ts`:
```ts
export function isAdminEmail(email: string | null | undefined, raw: string | undefined): boolean {
  const target = email?.trim().toLowerCase();
  if (!target) return false;
  return (raw ?? '').split(',').some((e) => e.trim().toLowerCase() === target);
}
```

Run: `npx vitest run web/src/lib/admin-emails.test.ts` → Expected: PASS

- [ ] **Step 3: Auth.js 설정**

`web/src/auth.ts`:
```ts
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { isAdminEmail } from '@/lib/admin-emails';

// DB 없이 JWT 세션만 쓴다. 허용 목록에 없는 계정은 로그인 자체가 거부된다.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt' },
  trustHost: true,
  callbacks: {
    signIn: ({ user }) => isAdminEmail(user.email, process.env.ADMIN_EMAILS),
  },
});
```

`web/src/app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
```

- [ ] **Step 4: 관리자 데이터 읽기 테스트** — `web/src/lib/motion-admin.test.ts`:
```ts
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readMotionAdmin } from './motion-admin';

const item = { id: '11-rpg', prompt: 'p', ko: 'k', shots: [['a', 'b', 'c']], cues: [['a', 'b', 'c']] };

describe('readMotionAdmin', () => {
  it('returns null when missing or invalid', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'ad-'));
    expect(await readMotionAdmin(root)).toBeNull();
    mkdirSync(path.join(root, 'private'));
    writeFileSync(path.join(root, 'private/motion-admin.json'), '[{"id":1}]');
    expect(await readMotionAdmin(root)).toBeNull();
  });
  it('parses a valid file', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'ad-'));
    mkdirSync(path.join(root, 'private'));
    writeFileSync(path.join(root, 'private/motion-admin.json'), JSON.stringify([item]));
    expect(await readMotionAdmin(root)).toEqual([item]);
  });
});
```

Run: `npx vitest run web/src/lib/motion-admin.test.ts` → Expected: FAIL

`web/src/lib/motion-admin.ts`:
```ts
import 'server-only';
import { readFile, stat } from 'node:fs/promises';
import { motionAdminListSchema, type MotionAdmin } from '@me/content';
import { ADMIN_PATH, resolveIn } from './volume';

const cache = new Map<string, { mtimeMs: number; list: MotionAdmin[] }>();

export async function readMotionAdmin(root: string): Promise<MotionAdmin[] | null> {
  const file = resolveIn(root, ADMIN_PATH);
  let mtimeMs: number;
  try {
    mtimeMs = (await stat(file)).mtimeMs;
  } catch {
    return null;
  }
  const hit = cache.get(file);
  if (hit?.mtimeMs === mtimeMs) return hit.list;
  try {
    const list = motionAdminListSchema.parse(JSON.parse(await readFile(file, 'utf8')));
    cache.set(file, { mtimeMs, list });
    return list;
  } catch (error) {
    console.error('[motion-admin] invalid admin data', error);
    return null;
  }
}
```

Run: `npx vitest run web/src/lib/motion-admin.test.ts` → Expected: PASS

`web/src/lib/admin-session.ts`:
```ts
import 'server-only';
import { notFound, redirect } from 'next/navigation';
import type { MotionAdmin } from '@me/content';
import { auth } from '@/auth';
import { isAdminEmail } from './admin-emails';
import { readMotionAdmin } from './motion-admin';
import { volumeRoot } from './volume';

// layout 만 믿지 않고 관리자 데이터를 읽는 모든 경로에서 다시 확인한다.
export async function requireAdmin(callbackPath: string): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);
  if (!isAdminEmail(session.user.email, process.env.ADMIN_EMAILS)) notFound();
}

export async function loadMotionAdmin(callbackPath: string): Promise<MotionAdmin[] | null> {
  await requireAdmin(callbackPath);
  return readMotionAdmin(volumeRoot());
}
```

- [ ] **Step 5: 플레이스홀더 테스트** — `web/src/components/motion-gallery/admin/placeholders.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { finalPrompt, isToggleOn, parsePlaceholders, renderLines, renderPrompt, tablesMarkdown, type PromptState } from './placeholders';

const src = [
  '## 1. Channel',
  '- Name: {{Channel name=Chois의 바이브코딩}}',
  '- {{?Logo=Use the pixel portrait}}',
  '- {{-Numbers=Show real numbers}}',
  'Length {{Length=10 s}}',
].join('\n');
const base: PromptState = { values: {}, toggles: {}, withTables: false };

describe('parsePlaceholders', () => {
  it('maps english and korean labels to the same keys', () => {
    expect(parsePlaceholders(src)).toMatchObject({
      name: { flag: '', def: 'Chois의 바이브코딩' },
      logo: { flag: '?', def: 'Use the pixel portrait' },
      numbers: { flag: '-', def: 'Show real numbers' },
      length: { flag: '', def: '10 s' },
    });
    expect(parsePlaceholders('{{채널 이름=A}}').name?.def).toBe('A');
  });
});

describe('isToggleOn', () => {
  it('follows the prompt flag unless the user toggled', () => {
    expect(isToggleOn('logo', '?', {})).toBe(true);
    expect(isToggleOn('numbers', '-', {})).toBe(false);
    expect(isToggleOn('numbers', '-', { numbers: true })).toBe(true);
  });
});

describe('renderPrompt', () => {
  it('fills defaults and drops lines whose only content was an off option', () => {
    expect(renderPrompt(src, base)).toBe(['## 1. Channel', '- Name: Chois의 바이브코딩', '- Use the pixel portrait', 'Length 10 s'].join('\n'));
  });
  it('uses edited values and toggles', () => {
    const out = renderPrompt(src, { ...base, values: { name: '내 채널', length: '' }, toggles: { logo: false, numbers: true } });
    expect(out).toBe(['## 1. Channel', '- Name: 내 채널', '- Show real numbers', 'Length 10 s'].join('\n'));
  });
  it('marks segments for highlighting', () => {
    const lines = renderLines('- {{-Numbers=N}} and {{Length=10 s}}', base);
    expect(lines[0]).toEqual([{ text: '- ' }, { text: 'N', mark: 'off' }, { text: ' and ' }, { text: '10 s', mark: 'value' }]);
  });
});

describe('tables', () => {
  const item = { id: '11-rpg', prompt: src, ko: '## 1. 채널\n- 이름: {{채널 이름=Chois}}', shots: [['0.0–1.0', 'a|b', 'why']] as [string, string, string][], cues: [['0.000', 'kick', 'first\nframe']] as [string, string, string][] };
  it('renders escaped markdown tables', () => {
    const md = tablesMarkdown(item, 'en');
    expect(md).toContain('## 8. Shot list (director\'s intent)');
    expect(md).toContain('| 0.0–1.0 | a\\|b | why |');
    expect(md).toContain('| 0.000 | kick | first frame |');
    expect(tablesMarkdown(item, 'ko')).toContain('## 9. 소리 큐 시트');
  });
  it('appends tables only when enabled and uses the chosen language', () => {
    expect(finalPrompt(item, 'ko', base)).toBe('## 1. 채널\n- 이름: Chois');
    expect(finalPrompt(item, 'en', { ...base, withTables: true })).toContain('## 9. Sound cue sheet');
  });
});
```

Run: `npx vitest run web/src/components/motion-gallery/admin/placeholders.test.ts` → Expected: FAIL

- [ ] **Step 6: 플레이스홀더 구현** (현재 `motion/index.html` 의 로직을 순수 함수로 옮김) — `web/src/components/motion-gallery/admin/placeholders.ts`:
```ts
import type { MotionAdmin } from '@me/content';

export type PromptLang = 'en' | 'ko';
export type PromptState = { values: Record<string, string>; toggles: Record<string, boolean>; withTables: boolean };
export type Segment = { text: string; mark?: 'value' | 'on' | 'off' };
export type Placeholder = { key: string; flag: '' | '?' | '-'; label: string; def: string };

export const FIELD_KEYS = [
  { key: 'name', en: 'Channel name', ko: '채널 이름' },
  { key: 'tagline', en: 'Tagline', ko: '한 줄 소개' },
  { key: 'topic', en: 'Topic', ko: '주제' },
  { key: 'length', en: 'Length', ko: '길이' },
  { key: 'format', en: 'Format', ko: '화면' },
  { key: 'lang', en: 'On-screen language', ko: '화면 글자' },
] as const;

export const TOGGLE_KEYS = [
  { key: 'logo', en: 'Logo', ko: '로고' },
  { key: 'soundtrack', en: 'Soundtrack source', ko: '사운드트랙 만들기' },
  { key: 'musicfile', en: 'Music file', ko: '음악 파일' },
  { key: 'hyperframes', en: 'Render with HyperFrames', ko: 'HyperFrames 로 렌더' },
  { key: 'numbers', en: 'Numbers', ko: '숫자' },
] as const;

const LABEL_TO_KEY: Record<string, string> = Object.fromEntries(
  [...FIELD_KEYS, ...TOGGLE_KEYS].flatMap((f) => [[f.en, f.key], [f.ko, f.key]]),
);

const PH = /\{\{([?-]?)([^=}]+)=([^}]*)\}\}/g;
const keyOf = (label: string) => LABEL_TO_KEY[label.trim()] ?? label.trim();

export function parsePlaceholders(src: string): Record<string, Placeholder> {
  const out: Record<string, Placeholder> = {};
  for (const m of src.matchAll(PH)) {
    const key = keyOf(m[2] ?? '');
    out[key] = { key, flag: (m[1] ?? '') as Placeholder['flag'], label: (m[2] ?? '').trim(), def: m[3] ?? '' };
  }
  return out;
}

// 선택 항목 기본값은 프롬프트의 기호(? 켬, - 끔)를 따르고, 사용자가 누른 값이 있으면 그것이 우선한다.
export function isToggleOn(key: string, flag: string, toggles: Record<string, boolean>): boolean {
  return key in toggles ? Boolean(toggles[key]) : flag === '?';
}

function renderLine(line: string, state: PromptState): Segment[] {
  const segs: Segment[] = [];
  let last = 0;
  for (const m of line.matchAll(PH)) {
    if (m.index > last) segs.push({ text: line.slice(last, m.index) });
    const flag = m[1] ?? '';
    const key = keyOf(m[2] ?? '');
    const def = m[3] ?? '';
    if (flag) {
      segs.push({ text: def, mark: isToggleOn(key, flag, state.toggles) ? 'on' : 'off' });
    } else {
      const v = state.values[key];
      segs.push({ text: v ? v : def, mark: 'value' });
    }
    last = m.index + m[0].length;
  }
  if (last < line.length) segs.push({ text: line.slice(last) });
  return segs;
}

const plain = (segs: Segment[]) => segs.filter((s) => s.mark !== 'off').map((s) => s.text).join('');

// 꺼진 선택 항목만 있던 "- " 목록 줄은 통째로 뺀다.
export function renderLines(src: string, state: PromptState): Segment[][] {
  return src.split('\n').map((l) => renderLine(l, state)).filter((segs) => plain(segs) !== '- ');
}

export function renderPrompt(src: string, state: PromptState): string {
  return renderLines(src, state).map(plain).join('\n');
}

const mdCell = (v: string) => v.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const table = (cols: string[], rows: string[][]) =>
  `| ${cols.join(' | ')} |\n| --- | --- | --- |\n` + rows.map((r) => `| ${r.map(mdCell).join(' | ')} |`).join('\n');

export function tablesMarkdown(item: Pick<MotionAdmin, 'shots' | 'cues'>, lang: PromptLang): string {
  const en = lang === 'en';
  const h1 = en ? "## 8. Shot list (director's intent)" : '## 8. 장면표 (감독의 의도)';
  const h2 = en ? '## 9. Sound cue sheet' : '## 9. 소리 큐 시트';
  const c1 = en ? ['Time (s)', 'Scene', 'Why'] : ['시간(초)', '장면', '왜 이렇게'];
  const c2 = en ? ['Time (s)', 'Sound', 'Visual event'] : ['시각(초)', '소리', '화면 이벤트'];
  const note = en
    ? 'Keep the order and timing below within ±0.2 s; refine details, do not replace them.'
    : '아래 순서와 시각을 ±0.2 s 안에서 지키고, 세부만 다듬는다. 대체하지 않는다.';
  return `\n\n${h1}\n${note}\n\n${table(c1, item.shots)}\n\n${h2}\n\n${table(c2, item.cues)}\n`;
}

export function finalPrompt(item: MotionAdmin, lang: PromptLang, state: PromptState): string {
  const body = renderPrompt(lang === 'ko' ? item.ko : item.prompt, state);
  return body + (state.withTables ? tablesMarkdown(item, lang) : '');
}
```

Run: `npx vitest run web/src/components/motion-gallery/admin/placeholders.test.ts` → Expected: PASS

- [ ] **Step 7: 관리자 표와 프롬프트 패널**

`web/src/app/globals.css` 의 `.data-table .sticky-col` 줄 다음에 추가:
```css
/* 장면 설명처럼 긴 문장 칸: 단어(어절)는 쪼개지 않고 어절 사이에서만 줄을 바꾼다. */
.data-table td.prose-cell { @apply min-w-[24rem] whitespace-normal; word-break: keep-all; }
```

`web/src/components/motion-gallery/admin/RowsTable.tsx`:
```tsx
export function RowsTable({ head, rows, caption }: { head: [string, string, string]; rows: [string, string, string][]; caption: string }) {
  return (
    <div className="max-h-[70dvh] overflow-auto rounded-[var(--radius-card)] border border-line">
      <table className="data-table">
        <caption className="px-3 py-2 text-left text-xs whitespace-nowrap text-muted">{caption}</caption>
        <thead>
          <tr>
            <th className="sticky-col">{head[0]}</th>
            <th>{head[1]}</th>
            <th>{head[2]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="sticky-col font-mono">{r[0]}</td>
              <td className="prose-cell">{r[1]}</td>
              <td className="prose-cell text-muted">{r[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

`web/src/components/motion-gallery/admin/PromptPanel.tsx`:
```tsx
'use client';
import { useEffect, useMemo, useState } from 'react';
import type { MotionAdmin } from '@me/content';
import { FIELD_KEYS, TOGGLE_KEYS, finalPrompt, isToggleOn, parsePlaceholders, renderLines, type PromptLang, type PromptState } from './placeholders';
import { RowsTable } from './RowsTable';

const STORAGE_KEY = 'cs.admin.prompt';
const INITIAL: PromptState & { lang: PromptLang } = { values: {}, toggles: {}, withTables: true, lang: 'en' };
type Tab = 'prompt' | 'shots' | 'cues';

function loadState(): typeof INITIAL {
  try {
    return { ...INITIAL, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };
  } catch {
    return INITIAL;
  }
}

const pill = (on: boolean) => `inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm whitespace-nowrap ${on ? 'border-fg bg-fg text-bg' : 'border-line'}`;

export function PromptPanel({ item }: { item: MotionAdmin }) {
  const [state, setState] = useState(INITIAL);
  const [tab, setTab] = useState<Tab>('prompt');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const restore = () => setState(loadState());
    restore();
  }, []);
  const update = (next: typeof INITIAL) => {
    setState(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* 저장 실패는 무시 — 다음 방문에 기본값 */ }
  };
  const src = state.lang === 'ko' ? item.ko : item.prompt;
  const defs = useMemo(() => parsePlaceholders(src), [src]);
  const lines = renderLines(src, state);
  const text = finalPrompt(item, state.lang, state);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const label = (f: { en: string; ko: string }) => (state.lang === 'ko' ? f.ko : f.en);

  return (
    <section className="mt-6" aria-label="prompt">
      <div role="tablist" className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-2">
        {(['prompt', 'shots', 'cues'] as const).map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={pill(tab === t)}>
            {{ prompt: '프롬프트', shots: '장면표', cues: '소리 큐' }[t]}
          </button>
        ))}
      </div>

      {tab === 'prompt' ? (
        <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
          <aside className="flex flex-col gap-3">
            <div className="flex gap-2">
              {(['en', 'ko'] as const).map((l) => (
                <button key={l} type="button" aria-pressed={state.lang === l} onClick={() => update({ ...state, lang: l })} className={pill(state.lang === l)}>{l.toUpperCase()}</button>
              ))}
            </div>
            {FIELD_KEYS.filter((f) => defs[f.key]).map((f) => (
              <label key={f.key} className="flex flex-col gap-1 text-xs text-muted">
                <span className="whitespace-nowrap">{label(f)}</span>
                <input
                  className="min-h-11 rounded-md border border-line bg-bg px-3 text-sm text-fg"
                  value={state.values[f.key] ?? ''}
                  placeholder={defs[f.key]?.def}
                  onChange={(e) => update({ ...state, values: { ...state.values, [f.key]: e.target.value } })}
                />
              </label>
            ))}
            <div className="flex flex-wrap gap-2">
              {TOGGLE_KEYS.filter((t) => defs[t.key]).map((t) => {
                const on = isToggleOn(t.key, defs[t.key]?.flag ?? '', state.toggles);
                return (
                  <button key={t.key} type="button" aria-pressed={on} title={defs[t.key]?.def} onClick={() => update({ ...state, toggles: { ...state.toggles, [t.key]: !on } })} className={pill(on)}>
                    {label(t)}
                  </button>
                );
              })}
              <button type="button" aria-pressed={state.withTables} onClick={() => update({ ...state, withTables: !state.withTables })} className={pill(state.withTables)}>
                장면표·소리 큐 포함
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={copy} data-testid="copy-prompt" className={pill(true)}>{copied ? '복사됨' : '복사'}</button>
              <button type="button" onClick={() => update({ ...INITIAL, lang: state.lang })} className={pill(false)}>기본값</button>
              <span className="text-xs whitespace-nowrap text-muted">{text.length.toLocaleString()}자</span>
            </div>
          </aside>
          <pre data-testid="prompt-output" className="max-h-[70dvh] overflow-auto rounded-[var(--radius-card)] border border-line p-3 text-sm leading-relaxed whitespace-pre-wrap" style={{ wordBreak: 'keep-all' }}>
            {lines.map((segs, i) => (
              <span key={i} className={segs[0]?.text.startsWith('#') ? 'font-bold' : undefined}>
                {segs.map((s, j) => (s.mark ? <mark key={j} className={s.mark === 'off' ? 'bg-transparent text-muted line-through' : 'bg-accentSoft text-fg'}>{s.text}</mark> : <span key={j}>{s.text}</span>))}
                {'\n'}
              </span>
            ))}
          </pre>
        </div>
      ) : (
        <RowsTable
          caption={tab === 'shots' ? `${item.shots.length}개 장면 · 10초` : `${item.cues.length}개 큐`}
          head={tab === 'shots' ? ['시간(초)', '장면', '왜 이렇게'] : ['시각(초)', '소리', '화면 이벤트']}
          rows={tab === 'shots' ? item.shots : item.cues}
        />
      )}
    </section>
  );
}
```
(`bg-accentSoft` 는 `tokens.json` 의 `accentSoft` 에서 생성되는 클래스다. `web/src/app/tokens.css` 에서 실제 변수명을 확인하고 다르면 맞춘다.)

- [ ] **Step 8: 관리자 페이지**

`web/src/app/(ko)/motion/admin/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin('/motion/admin/');
  return <div className="px-2 py-6 sm:px-3 md:px-4 lg:px-6"><div className="mx-auto w-full max-w-6xl">{children}</div></div>;
}
```

`web/src/app/(ko)/motion/admin/page.tsx`:
```tsx
import Link from 'next/link';
import { getMotionList } from '@me/content';
import { loadMotionAdmin } from '@/lib/admin-session';
import { getRenderedMotions } from '@/lib/media';

export const dynamic = 'force-dynamic';

export default async function AdminListPage() {
  const admin = await loadMotionAdmin('/motion/admin/');
  const rendered = new Set((await getRenderedMotions()).map((m) => m.id));
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">모션 관리자</h1>
      {admin ? null : <p role="alert" className="mb-4 rounded-md border border-line p-3 text-sm">관리자 데이터가 없습니다. 로컬에서 <code>npm run motion:import && npm run media:push</code> 를 실행하세요.</p>}
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {getMotionList().map((m) => (
          <li key={m.id}>
            <Link href={`/motion/admin/${m.id}/`} data-testid="admin-row" className="flex min-h-11 items-center gap-2 rounded-md border border-line px-3 hover:border-accent">
              <span className="font-mono text-xs text-muted">{String(m.no).padStart(2, '0')}</span>
              <span className="min-w-0 flex-1 overflow-hidden text-sm text-ellipsis whitespace-nowrap" title={m.name}>{m.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs whitespace-nowrap ${rendered.has(m.id) ? 'bg-fg text-bg' : 'border border-line text-muted'}`}>
                {rendered.has(m.id) ? '렌더됨' : '대기'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
```

`web/src/app/(ko)/motion/admin/[id]/page.tsx`:
```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMotion } from '@me/content';
import { PromptPanel } from '@/components/motion-gallery/admin/PromptPanel';
import { loadMotionAdmin } from '@/lib/admin-session';
import { getRenderedMotions } from '@/lib/media';

export const dynamic = 'force-dynamic';

export default async function AdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const motion = getMotion(id);
  if (!motion) notFound();
  const admin = await loadMotionAdmin(`/motion/admin/${id}/`);
  const data = admin?.find((a) => a.id === id) ?? null;
  const card = (await getRenderedMotions()).find((m) => m.id === id) ?? null;
  return (
    <article>
      <Link href="/motion/admin/" className="inline-flex min-h-11 items-center text-sm whitespace-nowrap text-muted">← 관리자 목록</Link>
      <h1 className="mt-2 text-2xl font-bold whitespace-nowrap">{String(motion.no).padStart(2, '0')} {motion.name}</h1>
      {card ? <video src={card.video} poster={card.poster} controls playsInline preload="metadata" className="mt-4 aspect-video w-full max-w-3xl rounded-[var(--radius-card)] bg-black" /> : <p className="mt-4 text-sm text-muted">아직 렌더하지 않은 스타일입니다.</p>}
      {data ? <PromptPanel item={data} /> : <p role="alert" className="mt-6 text-sm">관리자 데이터가 없습니다. <code>npm run media:push</code> 를 실행하세요.</p>}
    </article>
  );
}
```

- [ ] **Step 9: 관리자 e2e 추가** — `web/e2e/motion.spec.ts` 끝에 추가:
```ts
test('admin pages require sign-in', async ({ page }) => {
  for (const p of ['/motion/admin/', '/motion/admin/01-pixel/']) {
    await page.goto(p);
    await expect(page).toHaveURL(/\/api\/auth\/signin/);
  }
});

test('auth endpoints answer without a trailing-slash redirect', async ({ request }) => {
  const r = await request.get('/api/auth/providers', { maxRedirects: 0 });
  expect(r.status()).toBe(200);
  expect(Object.keys(await r.json())).toContain('google');
});
```

- [ ] **Step 10: 전체 확인**

Run: `npm run check && npm run build:web && npm run e2e`
Expected: 전부 PASS.

수동 확인(로컬, Google OAuth 테스트 클라이언트가 있을 때만): `web/.env.local` 에 실제 `AUTH_*`, `ADMIN_EMAILS` 를 넣고 `npm run dev` → `/motion/admin/` 로그인 → 50개 목록, `01-pixel` 상세에서 탭 전환·EN/KO·토글·복사 동작. OAuth 클라이언트가 아직 없으면 Task 10 이후로 미루고 보고에 명시한다.

- [ ] **Step 11: 커밋**
```bash
git add web/package.json package-lock.json web/src web/e2e/motion.spec.ts
git commit -m "feat(motion): Google 로그인 관리자 화면(프롬프트·장면표·소리 큐, 빈칸 채워 복사)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 보안 경계 e2e, 반응형 리뷰, 문서

**Files:**
- Create: `web/e2e/security.spec.ts`
- Modify: `README.md`, `.claude/PROJECT_MAP.md` (project-map-updater 에이전트로)

**Interfaces:**
- Consumes: e2e 픽스처 마커 `E2E-ADMIN-MARKER` (Task 7), 업로드 토큰 `e2e-upload-token` (Task 2 playwright env).

- [ ] **Step 1: 보안 e2e 작성** — `web/e2e/security.spec.ts`:
```ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const MARKER = 'E2E-ADMIN-MARKER';

test('no admin text leaks into public html or build output', async ({ request }) => {
  for (const p of ['/', '/en/', '/motion/', '/motion/01-pixel/', '/motion/17-embroidery/']) {
    const html = await (await request.get(p)).text();
    expect(html, p).not.toContain(MARKER);
    expect(html, p).not.toContain('{{Channel name=');
  }
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
    const f = path.join(dir, n);
    return statSync(f).isDirectory() ? walk(f) : [f];
  });
  const files = walk(path.resolve('.next/standalone/web/.next')).filter((f) => /\.(js|html|json|rsc|body)$/.test(f));
  for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/\{\{Channel name=|## 9\. Sound cue sheet/);
});

test('private files and traversal attempts are not served', async ({ request }) => {
  for (const p of ['/media/private/motion-admin.json', '/media/motion/..%2F..%2Fprivate%2Fmotion-admin.json', '/media/motion/manifest.json']) {
    expect((await request.get(p)).status(), p).toBe(404);
  }
});

test('upload and manifest apis reject missing or wrong tokens', async ({ request }) => {
  const put = await request.put('/api/media?path=media/motion/01-pixel/video.mp4', { data: 'x', headers: { authorization: 'Bearer wrong' } });
  expect(put.status()).toBe(401);
  expect((await request.get('/api/media/manifest')).status()).toBe(401);
  const ok = await request.get('/api/media/manifest', { headers: { authorization: 'Bearer e2e-upload-token' } });
  expect(Object.keys(await ok.json())).toContain('media/motion/01-pixel/video.mp4');
});
```

- [ ] **Step 2: 통과 확인**

Run: `npm run build:web && npm run e2e -- security.spec.ts`
Expected: PASS (3개)

- [ ] **Step 3: 반응형 리뷰** — `responsive-ui-reviewer` 에이전트를 다음 파일에 대해 실행하고, 위반을 수정한 뒤 e2e 재실행:
`web/src/components/sections/Motion.tsx`, `web/src/components/motion-gallery/**`, `web/src/app/(ko)/motion/**`, `web/src/components/Nav.tsx`, `web/src/app/globals.css`.
(관리자 표의 `.prose-cell` 어절 단위 줄바꿈은 긴 장면 설명을 읽기 위한 의도된 예외 — 리뷰 결과에 "의도된 예외"로 남긴다.)

- [ ] **Step 4: README 갱신** — `README.md` 에 「배포(Railway)」 절을 추가:
```markdown
## 배포 (Railway)

- `main` push → GitHub Actions CI 통과 → Railway 가 `Dockerfile` 로 빌드·배포. 헬스체크 `/api/health`.
- Volume `/data` (1 GB): `media/motion/<id>/{video.mp4,preview.mp4,poster.webp}`, `media/motion/manifest.json`, `private/motion-admin.json`.
- 환경변수: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ADMIN_EMAILS`, `MEDIA_UPLOAD_TOKEN` (`RAILWAY_VOLUME_MOUNT_PATH`·`PORT` 는 Railway 자동).

### 모션 영상 올리기
1. (motion 폴더에서 렌더 후) `npm run motion:import` — 공개 데이터 갱신(커밋), 관리자 데이터는 `.media-out/` 에만.
2. `npm run media:prepare` — 웹용 인코딩·포스터·manifest.
3. `MEDIA_PUSH_URL=https://me.chois.pro MEDIA_UPLOAD_TOKEN=… npm run media:push` — 바뀐 파일만 업로드. 재배포 없이 바로 반영.

### 로컬 실행
`web/.env.local` 에 `.env.example` 값을 채우고 `npm run dev`. 영상은 `.local-volume/` 을 Volume 으로 쓴다.
```

- [ ] **Step 5: 프로젝트 맵 갱신** — `project-map-updater` 에이전트 실행(배포 방식, 라우트 `/motion`·`/media`·`/api/*`, Volume 구조, 환경변수, 명령 추가 반영).

- [ ] **Step 6: 최종 확인과 커밋**

Run: `npm run check && npm run build:web && npm run e2e`
Expected: 전부 PASS.

```bash
git add web/e2e/security.spec.ts README.md .claude/PROJECT_MAP.md web/src
git commit -m "test(motion): 관리자 데이터 유출·경로 우회·토큰 e2e, 배포 문서

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Railway 배포와 도메인 전환 (사용자와 함께)

자격 증명 입력·DNS·OAuth 콘솔 작업은 **사용자가 직접** 한다. 에이전트는 명령과 확인만 맡는다.

- [ ] **Step 1 (사용자): Railway 프로젝트 생성** — GitHub 저장소 연결, 브랜치 `main`(또는 검증용으로 `feat/motion-chapter-railway`), Settings → "Wait for CI" 켬. Volume 추가: mount path `/data`, 1 GB.
- [ ] **Step 2 (사용자): 환경변수 입력** — `AUTH_SECRET`(`npx auth secret` 출력값), `ADMIN_EMAILS`, `MEDIA_UPLOAD_TOKEN`(`openssl rand -hex 32`). Google 값은 Step 3 후.
- [ ] **Step 3 (사용자): Google OAuth 클라이언트** — Google Cloud Console → OAuth 클라이언트(웹). 승인된 리디렉트 URI: `https://<railway 임시 도메인>/api/auth/callback/google`, `https://me.chois.pro/api/auth/callback/google`, `http://localhost:3000/api/auth/callback/google`. 발급된 ID/Secret 을 Railway `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` 에 입력.
- [ ] **Step 4 (에이전트): 배포 확인**

Run: `curl -s https://<railway 임시 도메인>/api/health`
Expected: `{"ok":true}`

- [ ] **Step 5 (에이전트, 토큰은 사용자가 셸 환경변수로 설정): 미디어 업로드**

Run: `MEDIA_PUSH_URL=https://<railway 임시 도메인> npm run media:push`
Expected: `60 changed of 60` … `done`.

- [ ] **Step 6 (사용자+에이전트): 임시 도메인에서 전 화면 확인** — `/`, `/en/`, `#motion`, `/motion/`, 상세 재생·탐색, `/motion/admin/` 로그인(사용자), 모바일 폭.
- [ ] **Step 7 (사용자): 도메인 전환** — Railway → Custom Domain `me.chois.pro` 추가 → DNS 의 `me` 레코드를 Railway 가 알려 준 CNAME 으로 변경 → HTTPS 발급 대기.
- [ ] **Step 8 (에이전트): 새 도메인 확인**

Run: `curl -sI https://me.chois.pro/ | head -1 && curl -s https://me.chois.pro/api/health`
Expected: `HTTP/2 200`, `{"ok":true}`.

- [ ] **Step 9 (사용자): GitHub Pages 비활성화** — 저장소 Settings → Pages → Source 없음.
