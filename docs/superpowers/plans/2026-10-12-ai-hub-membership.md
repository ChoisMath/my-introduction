# AI활용 허브 · 교사 가입 신청 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 교사가 Google 로그인 → 이름·소속으로 가입을 신청하고 관리자가 승인(대기↔등록)하는 회원 체계를 만들고, 모션 챕터를 `/ai/` 「AI활용」 허브의 첫 탭으로 옮긴다. 로그인한 사용자는 어디서나 상태 칩·로그아웃을 본다.

**Architecture:** 기존 `MotionViewer` 테이블을 데이터 보존 마이그레이션으로 `Member(status PENDING|APPROVED)` 로 확장한다. 역할 판정(`admin|member|pending|guest|unavailable`)은 순수 함수 + 요청 단위 캐시로 매 요청 DB 를 읽는다. 라우트는 `app/(ko)/ai/` 아래 두 라우트 그룹 — 허브 머리글·탭이 있는 `(hub)` 와 Nav 를 덮는 전체 화면 `(app)` — 으로 나누고, 예전 `/motion/…` 은 `next.config.ts` 308 로 보낸다.

**Tech Stack:** Next.js 16.4 App Router (standalone), React 19.2, Tailwind 4, next-auth 5.0.0-beta.32 (Google, JWT), Prisma 7.10 + `@prisma/adapter-pg` + Railway PostgreSQL, zod 4.6, vitest 5, Playwright 1.64.

**Spec:** `docs/superpowers/specs/2026-10-12-ai-hub-membership-design.md` (구현자는 계획과 함께 반드시 읽는다)

## Global Constraints

- 브랜치: `feat/ai-hub-membership` (이미 존재, spec 커밋 3개). 작업은 모두 이 브랜치, 태스크마다 커밋.
- 모든 명령은 저장소 루트 `/Volumes/Chois_SD2/dev/my_intoduction` 기준. `cd` 대신 `npm -w web …` 또는 `(cd web && …)`.
- 회원 상태는 `PENDING`(대기) / `APPROVED`(등록) 두 가지뿐. 삭제는 `PENDING` 만 — SQL 조건(`where: { id, status: 'PENDING' }`)으로도 강제.
- 관리자 판정은 env `ADMIN_EMAILS` 가 DB 보다 먼저. DB 오류 시 비관리자는 `unavailable`, 권한은 절대 부여하지 않음(fail-closed).
- 신청 이메일은 세션에서만 읽는다. 폼에 email 필드를 받지 않는다(관리자 직접 추가 폼 제외).
- 이메일은 항상 `trim().toLowerCase()` 후 저장·조회(DB 에 소문자 CHECK 제약이 있음).
- 이름 1–30자, 소속 1–50자, 앞뒤 공백 제거, 제어문자(`\u0000-\u001f`, `\u007f`) 거부.
- 로그인 후 돌아갈 곳·`from` 허용 정규식: `^/ai/(?:[a-z0-9-]+/){0,3}$`, 어긋나면 `/ai/motion/`.
- 프롬프트·장면표·소리 큐는 Volume(`private/motion-admin.json`)에만, `allowed`(admin·member) 응답에만 싣는다. guest·pending HTML 에 `E2E-ADMIN-MARKER` 가 나오면 안 된다.
- 예전 주소는 308: `/motion/` → `/ai/motion/`, `/motion/admin/viewers/` → `/ai/admin/members/`, `/motion/signin-error/` → `/ai/signin-error/`, `/motion/:path*` → `/ai/motion/:path*/`.
- noindex: `/ai/join/`, `/ai/admin/…`, `/ai/motion/admin/…`, `/ai/signin-error/`.
- 반응형(`~/.claude/rules/responsive-ui.md`): 라벨·버튼·배지·탭 `whitespace-nowrap`, 터치 타깃 ≥44px, 호버 전용 UI 금지, `100vh` 금지(`dvh`).
- 주석은 비자명한 "왜" 만. 사용자용 문구 한국어.
- 로그에 이메일을 남기지 않는다(`console.error('[members] …', id 또는 error)`).
- DB 를 쓰는 테스트·e2e 는 `E2E_DATABASE_URL`(localhost 만) 로만. 로컬 DB: `npx prisma dev -n motion-e2e --detach` → `postgres://postgres:postgres@localhost:51214/template1?sslmode=disable`. Claude 세션에선 `migrate reset` 금지 — `migrate deploy` + TRUNCATE.

## Review Focus

1. **대문자 이메일로 Google 로그인** — `Teacher@School.KR` 로 신청해도 같은 행 하나, 판정도 같은 결과여야 한다. → Task 2 `normalizeEmail` 테스트 + Task 3 `getAccess` 가 정규화 후 조회.
2. **`from` 조작** — `/ai/join/?from=//evil.com`, `https://evil.com`, `/ai/../admin`, `/ai/motion/admin/x/` 같은 값은 안전한 기본값으로. 권한 경로(`/ai/motion/admin/`)는 허용 정규식에 맞으므로 돌려보내되 거기서 다시 가드가 판정. → Task 1 `safeReturnPath` 테스트.
3. **관리자 이메일이 `Member` 행도 가진 경우**(예전 열람자가 나중에 관리자가 됨) — 항상 admin. → Task 1 `resolveRole` 테스트.
4. **대기 회원이 공백만 넣어 재제출 / 등록 회원이 `/ai/join/` 에 POST** — 값이 바뀌지 않고 상태도 유지(등록 회원이 대기로 떨어지지 않음). → Task 1 입력 테스트 + Task 2 `applyMember` 의 `exists` 분기 + Task 7 e2e.
5. **두 탭에서 같은 행을 승인/삭제** — 이미 처리된 행 동작은 오류 없이 무시. 등록 행은 삭제 폼을 위조해 보내도 지워지지 않음. → Task 2 `deletePendingMember` 조건 + Task 8 e2e(등록 행 id 로 삭제 액션 직접 호출 → 행 유지).

---

## File Structure

| 파일 | 상태 | 책임 |
|---|---|---|
| `web/prisma/schema.prisma` | 수정 | `MotionViewer` → `Member` + `MemberStatus` |
| `web/prisma/migrations/20261012010000_member/migration.sql` | 신규 | 이름 변경·컬럼 추가·기존 행 APPROVED |
| `web/prisma/rollback/20261012010000_member.down.sql` | 신규 | 수동 되돌림 SQL(자동 실행 안 함) |
| `web/src/lib/member-role.ts` (+test) | 신규 | 순수: `resolveRole`, `canUsePrompts`, `normalizeEmail` |
| `web/src/lib/member-input.ts` (+test) | 신규(대체 `viewer-input.ts`) | zod `applySchema`, `adminAddSchema`, `memberIdSchema` |
| `web/src/lib/ai-paths.ts` (+test) | 신규 | 경로 상수·`aiMotionPath`·`safeReturnPath`·`joinPath`·`signOutReturnPath` |
| `web/src/lib/ai-tabs.ts` (+test) | 신규 | `AI_TABS`, `activeTabId` |
| `web/src/lib/members.ts` | 신규(대체 `motion-viewers.ts`) | Prisma 접근: 판정·목록·신청·승인·대기·삭제·수정·추가 |
| `web/src/lib/access.ts` | 신규(대체 `admin-session.ts`) | `requireMember`, `requireAdmin`, `getPromptAccess`, `loadMotionAdmin`, `getViewerState` |
| `web/src/auth.ts` | 수정 | 모든 확인된 Google 계정 로그인 허용, error 페이지 경로 |
| `web/src/app/(ko)/ai/actions.ts` | 신규(대체 `motion/actions.ts`) | `signInWithGoogle`, `signOutAction` |
| `web/src/app/(ko)/ai/page.tsx` | 신규 | `/ai/` → `/ai/motion/` |
| `web/src/app/(ko)/ai/(hub)/layout.tsx` | 신규 | 허브 머리글 + 탭 |
| `web/src/app/(ko)/ai/(hub)/motion/page.tsx`, `motion/[id]/page.tsx`, `signin-error/page.tsx` | 이동 | `(ko)/motion/…` 에서 git mv |
| `web/src/app/(ko)/ai/(hub)/join/page.tsx`, `join/actions.ts` | 신규 | 가입 신청 |
| `web/src/app/(ko)/ai/(app)/motion/admin/{layout,page,[id]/page}.tsx` | 이동 | 편집기 |
| `web/src/app/(ko)/ai/(app)/admin/members/{page.tsx,actions.ts}` | 신규(대체 `motion/admin/viewers/`) | 회원 관리 |
| `web/src/components/ai-hub/AiHeader.tsx`, `AiTabs.tsx`, `SignInDialog.tsx`, `SignInButton.tsx`, `AccountMenu.tsx`, `JoinForm.tsx`, `MemberAddForm.tsx`, `ConfirmDelete.tsx` | 신규 | 허브 UI |
| `web/src/components/motion-gallery/PromptCopy.tsx`, `GoogleSignInButton.tsx`, `MotionCard.tsx`, `admin/AdminGallery.tsx`, `admin/AdminDetail.tsx` | 수정 | 경로·모달·계정 칩 |
| `web/src/components/motion-gallery/admin/ViewerForm.tsx` | 삭제 | `MemberAddForm` 로 대체 |
| `web/src/components/sections/AiHub.tsx` | 신규(대체 `Motion.tsx`) | 홈 섹션 |
| `web/src/components/Nav.tsx`, `RootShell.tsx`, `web/src/lib/sections.ts` | 수정 | `ai` 섹션·계정 칩 |
| `content/schema.ts`, `content/{ko,en}/ui.json` | 수정 | `nav.ai`, `sections.ai`, `ai.intro`, `motion.title` |
| `web/next.config.ts`, `web/public/{sitemap.xml,robots.txt}` | 수정 | 308·검색 |
| `scripts/e2e-fixture.ts` | 수정 | `Member` 시드(approved, pending) |
| `web/e2e/*.spec.ts` | 수정·신규 | 새 경로, `membership.spec.ts`, `account.spec.ts` |
| `.claude/PROJECT_MAP.md` | 수정 | 마지막 태스크 |

---

### Task 1: 순수 규칙 — 역할 판정·입력 검증·경로·탭

**Files:**
- Create: `web/src/lib/member-role.ts`, `web/src/lib/member-role.test.ts`
- Create: `web/src/lib/member-input.ts`, `web/src/lib/member-input.test.ts`
- Create: `web/src/lib/ai-paths.ts`, `web/src/lib/ai-paths.test.ts`
- Create: `web/src/lib/ai-tabs.ts`, `web/src/lib/ai-tabs.test.ts`

**Interfaces:**
- Produces:
  - `type MemberRole = 'admin' | 'member' | 'pending' | 'guest' | 'unavailable'`
  - `type MemberStatus = 'PENDING' | 'APPROVED'`
  - `type MemberLookup = { status: MemberStatus } | null | 'error'`
  - `resolveRole(isAdmin: boolean, lookup: MemberLookup): MemberRole`
  - `canUsePrompts(role: MemberRole): role is 'admin' | 'member'`
  - `normalizeEmail(raw: string | null | undefined): string | null`
  - `applySchema` → `{ name: string; affiliation: string }`, `adminAddSchema` → `{ email; name; affiliation }`, `memberIdSchema` → `number`
  - 상수 `AI_HOME='/ai/'`, `AI_MOTION='/ai/motion/'`, `AI_MOTION_ADMIN='/ai/motion/admin/'`, `AI_JOIN='/ai/join/'`, `AI_MEMBERS='/ai/admin/members/'`, `AI_SIGNIN_ERROR='/ai/signin-error/'`
  - `aiMotionPath(id: string): string`, `aiMotionAdminPath(id: string): string`
  - `safeReturnPath(raw: unknown): string`, `joinPath(from?: unknown): string`, `signOutReturnPath(raw: unknown): string`
  - `type AiTab = { id: string; label: { ko: string; en: string }; href: string }`, `AI_TABS: readonly AiTab[]`, `activeTabId(pathname: string): string | null`

- [ ] **Step 1: Write the failing tests**

`web/src/lib/member-role.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { canUsePrompts, normalizeEmail, resolveRole } from './member-role';

describe('resolveRole', () => {
  it('admin env wins over any member row or db error', () => {
    expect(resolveRole(true, null)).toBe('admin');
    expect(resolveRole(true, { status: 'PENDING' })).toBe('admin');
    expect(resolveRole(true, 'error')).toBe('admin');
  });
  it('maps member rows and lookup failure for non-admins', () => {
    expect(resolveRole(false, { status: 'APPROVED' })).toBe('member');
    expect(resolveRole(false, { status: 'PENDING' })).toBe('pending');
    expect(resolveRole(false, null)).toBe('guest');
    expect(resolveRole(false, 'error')).toBe('unavailable');
  });
  it('only admin and member may use prompts', () => {
    expect(['admin', 'member', 'pending', 'guest', 'unavailable'].filter((r) => canUsePrompts(r as never))).toEqual(['admin', 'member']);
  });
});

describe('normalizeEmail', () => {
  it('trims and lowercases, empty becomes null', () => {
    expect(normalizeEmail('  Teacher@School.KR ')).toBe('teacher@school.kr');
    expect(normalizeEmail('   ')).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
  });
});
```

`web/src/lib/member-input.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { adminAddSchema, applySchema, memberIdSchema } from './member-input';

describe('applySchema', () => {
  it('trims name and affiliation', () => {
    expect(applySchema.parse({ name: ' 김교사 ', affiliation: ' 포산고등학교 ' })).toEqual({ name: '김교사', affiliation: '포산고등학교' });
  });
  it('rejects blank, too long and control characters', () => {
    expect(applySchema.safeParse({ name: '   ', affiliation: '학교' }).success).toBe(false);
    expect(applySchema.safeParse({ name: '가', affiliation: '' }).success).toBe(false);
    expect(applySchema.safeParse({ name: 'x'.repeat(31), affiliation: '학교' }).success).toBe(false);
    expect(applySchema.safeParse({ name: '가', affiliation: 'x'.repeat(51) }).success).toBe(false);
    expect(applySchema.safeParse({ name: '가\u0007', affiliation: '학교' }).success).toBe(false);
  });
  it('accepts the exact limits', () => {
    expect(applySchema.safeParse({ name: 'x'.repeat(30), affiliation: 'y'.repeat(50) }).success).toBe(true);
  });
});

describe('adminAddSchema', () => {
  it('normalizes email', () => {
    expect(adminAddSchema.parse({ email: ' New@Example.COM ', name: '이름', affiliation: '소속' }).email).toBe('new@example.com');
    expect(adminAddSchema.safeParse({ email: 'nope', name: '이름', affiliation: '소속' }).success).toBe(false);
  });
});

describe('memberIdSchema', () => {
  it('accepts positive integer strings only', () => {
    expect(memberIdSchema.parse('3')).toBe(3);
    expect(memberIdSchema.safeParse('0').success).toBe(false);
    expect(memberIdSchema.safeParse('1.5').success).toBe(false);
  });
});
```

`web/src/lib/ai-paths.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { aiMotionAdminPath, aiMotionPath, joinPath, safeReturnPath, signOutReturnPath } from './ai-paths';

describe('safeReturnPath', () => {
  it('keeps paths under /ai/', () => {
    expect(safeReturnPath('/ai/motion/01-pixel/')).toBe('/ai/motion/01-pixel/');
    expect(safeReturnPath('/ai/motion/admin/01-pixel/')).toBe('/ai/motion/admin/01-pixel/');
    expect(safeReturnPath('/ai/')).toBe('/ai/');
  });
  it('falls back for anything else', () => {
    for (const bad of ['//evil.com', 'https://evil.com/ai/', '/ai/../admin/', '/motion/', '/ai/motion', '/ai/Motion/', null, 42, '/ai/a/b/c/d/']) {
      expect(safeReturnPath(bad)).toBe('/ai/motion/');
    }
  });
});

describe('joinPath', () => {
  it('encodes a safe from', () => {
    expect(joinPath('/ai/motion/01-pixel/')).toBe('/ai/join/?from=%2Fai%2Fmotion%2F01-pixel%2F');
    expect(joinPath('//evil.com')).toBe('/ai/join/?from=%2Fai%2Fmotion%2F');
    expect(joinPath()).toBe('/ai/join/?from=%2Fai%2Fmotion%2F');
  });
});

describe('signOutReturnPath', () => {
  it('stays on public pages', () => {
    expect(signOutReturnPath('/')).toBe('/');
    expect(signOutReturnPath('/en/')).toBe('/en/');
    expect(signOutReturnPath('/ai/motion/')).toBe('/ai/motion/');
    expect(signOutReturnPath('/ai/motion/01-pixel/')).toBe('/ai/motion/01-pixel/');
  });
  it('leaves protected pages for the gallery', () => {
    expect(signOutReturnPath('/ai/motion/admin/')).toBe('/ai/motion/');
    expect(signOutReturnPath('/ai/motion/admin/01-pixel/')).toBe('/ai/motion/');
    expect(signOutReturnPath('/ai/admin/members/')).toBe('/ai/motion/');
    expect(signOutReturnPath('/ai/join/')).toBe('/ai/motion/');
  });
  it('unknown goes home', () => {
    expect(signOutReturnPath('https://evil.com')).toBe('/');
    expect(signOutReturnPath(undefined)).toBe('/');
  });
});

it('builds motion paths', () => {
  expect(aiMotionPath('01-pixel')).toBe('/ai/motion/01-pixel/');
  expect(aiMotionAdminPath('01-pixel')).toBe('/ai/motion/admin/01-pixel/');
});
```

`web/src/lib/ai-tabs.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { AI_TABS, activeTabId } from './ai-tabs';

describe('AI_TABS', () => {
  it('starts with motion and every href lives under /ai/', () => {
    expect(AI_TABS[0]?.id).toBe('motion');
    for (const t of AI_TABS) expect(t.href).toMatch(/^\/ai\/[a-z0-9-]+\/$/);
  });
  it('finds the active tab by path prefix', () => {
    expect(activeTabId('/ai/motion/')).toBe('motion');
    expect(activeTabId('/ai/motion/01-pixel/')).toBe('motion');
    expect(activeTabId('/ai/join/')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run web/src/lib/member-role.test.ts web/src/lib/member-input.test.ts web/src/lib/ai-paths.test.ts web/src/lib/ai-tabs.test.ts`
Expected: FAIL — `Failed to resolve import "./member-role"` (and the other three modules).

- [ ] **Step 3: Write minimal implementation**

`web/src/lib/member-role.ts`:
```ts
export type MemberRole = 'admin' | 'member' | 'pending' | 'guest' | 'unavailable';
export type MemberStatus = 'PENDING' | 'APPROVED';
export type MemberLookup = { status: MemberStatus } | null | 'error';

// 관리자는 env 판정이 먼저라 DB 장애·예전 회원 행과 무관하게 항상 관리자다.
export function resolveRole(isAdmin: boolean, lookup: MemberLookup): MemberRole {
  if (isAdmin) return 'admin';
  if (lookup === 'error') return 'unavailable';
  if (lookup === null) return 'guest';
  return lookup.status === 'APPROVED' ? 'member' : 'pending';
}

export function canUsePrompts(role: MemberRole): role is 'admin' | 'member' {
  return role === 'admin' || role === 'member';
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  const email = raw?.trim().toLowerCase();
  return email ? email : null;
}
```

`web/src/lib/member-input.ts`:
```ts
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
```

`web/src/lib/ai-paths.ts`:
```ts
export const AI_HOME = '/ai/';
export const AI_MOTION = '/ai/motion/';
export const AI_MOTION_ADMIN = '/ai/motion/admin/';
export const AI_JOIN = '/ai/join/';
export const AI_MEMBERS = '/ai/admin/members/';
export const AI_SIGNIN_ERROR = '/ai/signin-error/';

export const aiMotionPath = (id: string) => `${AI_MOTION}${id}/`;
export const aiMotionAdminPath = (id: string) => `${AI_MOTION_ADMIN}${id}/`;

// 로그인 뒤 돌아갈 곳은 허브 안 경로만 허용한다(열린 리다이렉트 방지). 권한은 도착한 페이지가 다시 판정한다.
const RETURN_PATH = /^\/ai\/(?:[a-z0-9-]+\/){0,3}$/;

export function safeReturnPath(raw: unknown): string {
  return typeof raw === 'string' && RETURN_PATH.test(raw) ? raw : AI_MOTION;
}

export function joinPath(from?: unknown): string {
  return `${AI_JOIN}?from=${encodeURIComponent(safeReturnPath(from))}`;
}

const PUBLIC_AI = /^\/ai\/motion\/(?:[a-z0-9-]+\/)?$/;

// 공개 화면에서 로그아웃하면 그 자리에 남고, 권한이 필요한 화면에서는 갤러리로 나간다.
export function signOutReturnPath(raw: unknown): string {
  if (raw === '/' || raw === '/en/') return raw;
  if (typeof raw !== 'string') return '/';
  if (PUBLIC_AI.test(raw) && !raw.startsWith(AI_MOTION_ADMIN)) return raw;
  return RETURN_PATH.test(raw) ? AI_MOTION : '/';
}
```

`web/src/lib/ai-tabs.ts`:
```ts
import { AI_MOTION } from './ai-paths';

export type AiTab = { id: string; label: { ko: string; en: string }; href: string };

// 새 분야(웹디자인 가이드·업무 프롬프트 등)는 여기 한 항목 + `app/(ko)/ai/(hub)/<id>/` 라우트로 추가한다.
export const AI_TABS: readonly AiTab[] = [
  { id: 'motion', label: { ko: '모션그래픽', en: 'Motion graphics' }, href: AI_MOTION },
];

export function activeTabId(pathname: string): string | null {
  return AI_TABS.find((t) => pathname.startsWith(t.href))?.id ?? null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run web/src/lib/member-role.test.ts web/src/lib/member-input.test.ts web/src/lib/ai-paths.test.ts web/src/lib/ai-tabs.test.ts`
Expected: PASS (4 files).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/member-role.ts web/src/lib/member-role.test.ts web/src/lib/member-input.ts web/src/lib/member-input.test.ts web/src/lib/ai-paths.ts web/src/lib/ai-paths.test.ts web/src/lib/ai-tabs.ts web/src/lib/ai-tabs.test.ts
git commit -m "feat(ai): 회원 역할 판정·입력 검증·허브 경로·탭 규칙"
```

---

### Task 2: `Member` 스키마·마이그레이션·저장소

**Files:**
- Modify: `web/prisma/schema.prisma`
- Create: `web/prisma/migrations/20261012010000_member/migration.sql`
- Create: `web/prisma/rollback/20261012010000_member.down.sql`
- Create: `web/src/lib/members.ts`
- Modify: `scripts/e2e-fixture.ts:42-50`

**Interfaces:**
- Consumes: `MemberStatus`, `MemberLookup`, `normalizeEmail` (Task 1)
- Produces (`web/src/lib/members.ts`, `import 'server-only'`):
  - `type MemberRow = { id: number; email: string; name: string; affiliation: string; status: MemberStatus; createdAt: Date; decidedBy: string | null; decidedAt: Date | null }`
  - `lookupMember(email: string): Promise<MemberRow | null>` (오류는 throw)
  - `listMembers(): Promise<MemberRow[]>` (상태 무관, `status asc, createdAt desc`)
  - `countPending(): Promise<number>`
  - `applyMember(input: { email: string; name: string; affiliation: string }): Promise<'created' | 'updated' | 'exists'>`
  - `setMemberStatus(id: number, to: MemberStatus, by: string): Promise<boolean>` (바뀌었으면 true)
  - `deletePendingMember(id: number): Promise<boolean>`
  - `updateMemberProfile(id: number, input: { name: string; affiliation: string }): Promise<boolean>`
  - `addApprovedMember(input: { email: string; name: string; affiliation: string; by: string }): Promise<{ result: 'added' } | { result: 'duplicate'; status: MemberStatus }>`
  - e2e 시드 계정: `viewer@example.com`(APPROVED, 「등록교사」), `pending@example.com`(PENDING, 「대기교사」 — admin.spec 이 승인·대기·삭제에 씀), `pending2@example.com`(PENDING, 「대기교사2」/「대기중학교2」 — 다른 spec 이 대기 상태 확인에 씀, 아무도 지우지 않음). Playwright 는 서버를 한 번 띄우고 파일 이름 순서로 돌리므로 spec 끼리 행을 공유하지 않게 나눴다.

- [ ] **Step 1: Replace the Prisma model**

`web/prisma/schema.prisma` 에서 `model MotionViewer { … }` 블록(주석 포함)을 아래로 바꾼다:
```prisma
enum MemberStatus {
  PENDING
  APPROVED
}

// AI활용 회원. 관리자(ADMIN_EMAILS)는 여기 없어도 항상 관리자다. 이메일 소문자 CHECK 제약은 migration.sql 에만 있다.
model Member {
  id          Int          @id @default(autoincrement())
  email       String       @unique
  name        String
  affiliation String       @default("")
  status      MemberStatus @default(PENDING)
  createdAt   DateTime     @default(now())
  decidedBy   String?
  decidedAt   DateTime?

  @@index([status, createdAt])
}
```

- [ ] **Step 2: Write the data-preserving migration**

`web/prisma/migrations/20261012010000_member/migration.sql`:
```sql
-- MotionViewer 를 Member 로 바꾸며 기존 열람자는 모두 등록(APPROVED) 상태로 보존한다.
ALTER TABLE "MotionViewer" RENAME TO "Member";
ALTER SEQUENCE "MotionViewer_id_seq" RENAME TO "Member_id_seq";
ALTER TABLE "Member" RENAME CONSTRAINT "MotionViewer_pkey" TO "Member_pkey";
ALTER INDEX "MotionViewer_email_key" RENAME TO "Member_email_key";
ALTER TABLE "Member" RENAME CONSTRAINT "MotionViewer_email_lower_chk" TO "Member_email_lower_chk";

CREATE TYPE "MemberStatus" AS ENUM ('PENDING', 'APPROVED');

ALTER TABLE "Member"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "affiliation" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "status" "MemberStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "decidedBy" TEXT,
  ADD COLUMN "decidedAt" TIMESTAMP(3);

UPDATE "Member"
SET "status" = 'APPROVED',
    "name" = split_part("email", '@', 1),
    "affiliation" = COALESCE("note", ''),
    "decidedBy" = "addedBy",
    "decidedAt" = "createdAt";

ALTER TABLE "Member" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "Member" DROP COLUMN "note", DROP COLUMN "addedBy";

CREATE INDEX "Member_status_createdAt_idx" ON "Member"("status", "createdAt");
```

`web/prisma/rollback/20261012010000_member.down.sql` (수동 전용 — 이전 이미지로 롤백할 때만):
```sql
-- 자동 실행하지 않는다. 이 마이그레이션 이전 코드로 되돌릴 때 수동으로 실행한 뒤
-- DELETE FROM "_prisma_migrations" WHERE migration_name = '20261012010000_member'; 도 실행한다.
-- PENDING 신청자는 예전 모델에 없는 개념이라 지운다.
DELETE FROM "Member" WHERE "status" = 'PENDING';
DROP INDEX "Member_status_createdAt_idx";
ALTER TABLE "Member" ADD COLUMN "note" TEXT, ADD COLUMN "addedBy" TEXT;
UPDATE "Member" SET "note" = NULLIF("affiliation", ''), "addedBy" = COALESCE("decidedBy", 'unknown');
ALTER TABLE "Member" ALTER COLUMN "addedBy" SET NOT NULL;
ALTER TABLE "Member" DROP COLUMN "name", DROP COLUMN "affiliation", DROP COLUMN "status", DROP COLUMN "decidedBy", DROP COLUMN "decidedAt";
DROP TYPE "MemberStatus";
ALTER TABLE "Member" RENAME CONSTRAINT "Member_email_lower_chk" TO "MotionViewer_email_lower_chk";
ALTER INDEX "Member_email_key" RENAME TO "MotionViewer_email_key";
ALTER TABLE "Member" RENAME CONSTRAINT "Member_pkey" TO "MotionViewer_pkey";
ALTER SEQUENCE "Member_id_seq" RENAME TO "MotionViewer_id_seq";
ALTER TABLE "Member" RENAME TO "MotionViewer";
```

- [ ] **Step 3: Review the migration with the guardian agent**

Dispatch the `prisma-migration-guardian` agent with: "Review `web/prisma/migrations/20261012010000_member/migration.sql` against `web/prisma/schema.prisma` in /Volumes/Chois_SD2/dev/my_intoduction. It renames MotionViewer→Member on a production table holding live rows, adds NOT NULL `name` after a backfill, and drops `note`/`addedBy`. Check ordering, constraint/sequence names Prisma expects, and data loss." Fix anything it flags as blocking before continuing.

- [ ] **Step 4: Apply to the local DB and verify there is no drift**

Run (local DB must be up: `npx prisma dev -n motion-e2e --detach`):
```bash
export E2E_DATABASE_URL='postgres://postgres:postgres@localhost:51214/template1?sslmode=disable'
(cd web && DATABASE_URL="$E2E_DATABASE_URL" npx prisma migrate deploy)
(cd web && DATABASE_URL="$E2E_DATABASE_URL" npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code)
```
Expected: deploy applies `20261012010000_member`; diff prints no SQL and exits 0. (If this Prisma 7 build names the flag differently, check `npx prisma migrate diff --help`; the goal is "DB == schema".)

Seed-and-check the backfill once by hand:
```bash
psql "$E2E_DATABASE_URL" -c "TRUNCATE \"Member\" RESTART IDENTITY" -c "INSERT INTO \"Member\"(email,name,affiliation,status) VALUES ('Upper@x.com','a','b','PENDING')"
```
Expected: ERROR violates check constraint "Member_email_lower_chk" (the CHECK survived the rename).

- [ ] **Step 5: Write the repository**

`web/src/lib/members.ts` (replaces `motion-viewers.ts`; do not delete that file yet — Task 3 removes it with its callers):
```ts
import 'server-only';
import type { MemberStatus } from './member-role';

export type MemberRow = {
  id: number;
  email: string;
  name: string;
  affiliation: string;
  status: MemberStatus;
  createdAt: Date;
  decidedBy: string | null;
  decidedAt: Date | null;
};

// Prisma 는 필요할 때만 불러온다. 모듈 로드 실패나 DB 장애가 관리자(환경변수 판정) 화면까지 막지 않게.
async function db() {
  return (await import('./prisma')).prisma;
}

const isUniqueViolation = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';

export async function lookupMember(email: string): Promise<MemberRow | null> {
  return (await db()).member.findUnique({ where: { email } });
}

export async function listMembers(): Promise<MemberRow[]> {
  return (await db()).member.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }] });
}

export async function countPending(): Promise<number> {
  return (await db()).member.count({ where: { status: 'PENDING' } });
}

// 한 계정 = 한 행. 대기 중 재제출은 이름·소속만 고치고, 등록된 계정은 건드리지 않는다.
export async function applyMember(input: { email: string; name: string; affiliation: string }): Promise<'created' | 'updated' | 'exists'> {
  const client = await db();
  const existing = await client.member.findUnique({ where: { email: input.email }, select: { status: true } });
  if (existing?.status === 'APPROVED') return 'exists';
  if (existing) {
    await client.member.updateMany({ where: { email: input.email, status: 'PENDING' }, data: { name: input.name, affiliation: input.affiliation } });
    return 'updated';
  }
  try {
    await client.member.create({ data: { ...input, status: 'PENDING' } });
    return 'created';
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    // 같은 계정이 거의 동시에 두 번 제출한 경우.
    return applyMember(input);
  }
}

export async function setMemberStatus(id: number, to: MemberStatus, by: string): Promise<boolean> {
  const from: MemberStatus = to === 'APPROVED' ? 'PENDING' : 'APPROVED';
  const { count } = await (await db()).member.updateMany({ where: { id, status: from }, data: { status: to, decidedBy: by, decidedAt: new Date() } });
  return count > 0;
}

// 등록 회원은 화면이 아니라 이 조건으로도 지울 수 없다.
export async function deletePendingMember(id: number): Promise<boolean> {
  const { count } = await (await db()).member.deleteMany({ where: { id, status: 'PENDING' } });
  return count > 0;
}

export async function updateMemberProfile(id: number, input: { name: string; affiliation: string }): Promise<boolean> {
  const { count } = await (await db()).member.updateMany({ where: { id }, data: input });
  return count > 0;
}

export async function addApprovedMember(input: { email: string; name: string; affiliation: string; by: string }): Promise<{ result: 'added' } | { result: 'duplicate'; status: MemberStatus }> {
  const client = await db();
  try {
    await client.member.create({ data: { email: input.email, name: input.name, affiliation: input.affiliation, status: 'APPROVED', decidedBy: input.by, decidedAt: new Date() } });
    return { result: 'added' };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const row = await client.member.findUnique({ where: { email: input.email }, select: { status: true } });
    return { result: 'duplicate', status: row?.status ?? 'PENDING' };
  }
}
```

- [ ] **Step 6: Update the e2e fixture seed**

In `scripts/e2e-fixture.ts` replace the `E2E_VIEWER` export and the TRUNCATE/INSERT lines:
```ts
export const E2E_MEMBER = 'viewer@example.com';
export const E2E_PENDING = 'pending@example.com';
export const E2E_PENDING2 = 'pending2@example.com';
```
```ts
  await client.query('TRUNCATE "Member" RESTART IDENTITY');
  await client.query(
    `INSERT INTO "Member" (email, name, affiliation, status, "decidedBy", "decidedAt") VALUES
       ($1, '등록교사', '테스트고등학교', 'APPROVED', 'admin@example.com', now()),
       ($2, '대기교사', '대기중학교', 'PENDING', NULL, NULL),
       ($3, '대기교사2', '대기중학교2', 'PENDING', NULL, NULL)`,
    [E2E_MEMBER, E2E_PENDING, E2E_PENDING2],
  );
```
(Also update the `console.info` text to `e2e member db ready`.)

- [ ] **Step 7: Typecheck**

Run: `npm -w web run typecheck`
Expected: errors only in files still importing `motionViewer` (`motion-viewers.ts`) — that file is deleted in Task 3. If `members.ts` itself has errors, fix them now.

- [ ] **Step 8: Commit**

```bash
git add web/prisma web/src/lib/members.ts scripts/e2e-fixture.ts
git commit -m "feat(db): MotionViewer 를 Member(대기·등록)로 확장 — 기존 열람자는 등록 상태로 보존"
```

---

### Task 3: 접근 가드·로그인 허용 범위·로그인/로그아웃 액션

**Files:**
- Create: `web/src/lib/access.ts`
- Create: `web/src/app/(ko)/ai/actions.ts`
- Modify: `web/src/auth.ts`
- Modify: `web/src/components/motion-gallery/GoogleSignInButton.tsx`
- Modify (imports only): `web/src/app/(ko)/motion/[id]/page.tsx`, `web/src/app/(ko)/motion/admin/layout.tsx`, `web/src/app/(ko)/motion/admin/page.tsx`, `web/src/app/(ko)/motion/admin/[id]/page.tsx`, `web/src/app/(ko)/motion/admin/viewers/page.tsx`, `web/src/app/(ko)/motion/admin/viewers/actions.ts`, `web/src/app/(ko)/motion/signin-error/page.tsx`
- Delete: `web/src/lib/admin-session.ts`, `web/src/lib/motion-viewers.ts`, `web/src/lib/viewer-input.ts`, `web/src/lib/viewer-input.test.ts`, `web/src/app/(ko)/motion/actions.ts`

**Interfaces:**
- Consumes: Task 1 (`resolveRole`, `canUsePrompts`, `normalizeEmail`, `joinPath`, `safeReturnPath`, `signOutReturnPath`, `AI_SIGNIN_ERROR`), Task 2 (`lookupMember`, `countPending`, `MemberRow`)
- Produces (`web/src/lib/access.ts`):
  - `getAccess(email: string | null | undefined): Promise<{ role: MemberRole; member: MemberRow | null }>` (React `cache`)
  - `requireMember(path: string): Promise<{ role: 'admin' | 'member'; email: string }>` — 비로그인 → `redirect(joinPath(path))`, 그 외 비회원 → `notFound()`
  - `requireAdmin(path: string): Promise<string>` (관리자 이메일)
  - `type PromptAccess = { status: 'signedOut' | 'guest' | 'pending' | 'unavailable'; member: MemberSummary | null } | { status: 'allowed'; data: MotionAdmin | null }`
  - `getPromptAccess(id: string): Promise<PromptAccess>`
  - `loadMotionAdmin(path: string): Promise<{ role: 'admin' | 'member'; list: MotionAdmin[] | null }>`
  - `type MemberSummary = { name: string; affiliation: string; createdAt: string }` (ISO 날짜 — 클라이언트 props 용)
  - `type ViewerState = { status: 'signedOut' } | { status: MemberRole; email: string; name: string; image: string | null; member: MemberSummary | null; pendingCount: number }`
  - `getViewerState(): Promise<ViewerState>` (React `cache`; admin 일 때만 `pendingCount` 를 DB 에서, 실패하면 0)
  - Server Actions (`app/(ko)/ai/actions.ts`): `signInWithGoogle(formData: FormData)` (`from` 필드), `signOutAction(formData: FormData)` (`from` 필드)
  - `GoogleSignInButton({ from, label = 'Google로 로그인', testId = 'google-signin' })`

- [ ] **Step 1: Write `access.ts`**

```ts
import 'server-only';
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import type { MotionAdmin } from '@me/content';
import { auth } from '@/auth';
import { isAdminEmail } from './admin-emails';
import { joinPath } from './ai-paths';
import { canUsePrompts, normalizeEmail, resolveRole, type MemberLookup, type MemberRole } from './member-role';
import { countPending, lookupMember, type MemberRow } from './members';
import { readMotionAdmin } from './motion-admin';
import { volumeRoot } from './volume';

export type MemberSummary = { name: string; affiliation: string; createdAt: string };
export type ViewerState =
  | { status: 'signedOut' }
  | { status: MemberRole; email: string; name: string; image: string | null; member: MemberSummary | null; pendingCount: number };
export type PromptAccess =
  | { status: 'signedOut' | 'guest' | 'pending' | 'unavailable'; member: MemberSummary | null }
  | { status: 'allowed'; data: MotionAdmin | null };

const summary = (m: MemberRow | null): MemberSummary | null =>
  m ? { name: m.name, affiliation: m.affiliation, createdAt: m.createdAt.toISOString() } : null;

// 매 요청 DB 를 다시 읽으므로 대기로 바꾸면 JWT 세션이 남아 있어도 다음 요청부터 막힌다.
export const getAccess = cache(async (rawEmail: string | null | undefined): Promise<{ role: MemberRole; member: MemberRow | null }> => {
  const email = normalizeEmail(rawEmail);
  if (!email) return { role: 'unavailable', member: null };
  if (isAdminEmail(email, process.env.ADMIN_EMAILS)) return { role: 'admin', member: null };
  let member: MemberRow | null = null;
  let lookup: MemberLookup;
  try {
    member = await lookupMember(email);
    lookup = member ? { status: member.status } : null;
  } catch (error) {
    console.error('[members] lookup failed', error);
    lookup = 'error';
  }
  return { role: resolveRole(false, lookup), member };
});

// layout 만 믿지 않고 회원 데이터를 읽는 모든 경로·액션에서 다시 확인한다.
export async function requireMember(path: string): Promise<{ role: 'admin' | 'member'; email: string }> {
  const session = await auth();
  if (!session?.user?.email) redirect(joinPath(path));
  const { role } = await getAccess(session.user.email);
  if (!canUsePrompts(role)) notFound();
  return { role, email: normalizeEmail(session.user.email) ?? '' };
}

export async function requireAdmin(path: string): Promise<string> {
  const { role, email } = await requireMember(path);
  if (role !== 'admin') notFound();
  return email;
}

// 공개 상세용: 리다이렉트하지 않고 상태만 돌려준다. 권한이 있을 때만 Volume 의 프롬프트를 읽는다.
export async function getPromptAccess(id: string): Promise<PromptAccess> {
  const session = await auth();
  if (!session?.user?.email) return { status: 'signedOut', member: null };
  const { role, member } = await getAccess(session.user.email);
  if (!canUsePrompts(role)) return { status: role, member: summary(member) };
  const list = await readMotionAdmin(volumeRoot());
  return { status: 'allowed', data: list?.find((a) => a.id === id) ?? null };
}

export async function loadMotionAdmin(path: string): Promise<{ role: 'admin' | 'member'; list: MotionAdmin[] | null }> {
  const { role } = await requireMember(path);
  return { role, list: await readMotionAdmin(volumeRoot()) };
}

export const getViewerState = cache(async (): Promise<ViewerState> => {
  const session = await auth();
  const email = normalizeEmail(session?.user?.email);
  if (!session?.user || !email) return { status: 'signedOut' };
  const { role, member } = await getAccess(email);
  let pendingCount = 0;
  if (role === 'admin') {
    try {
      pendingCount = await countPending();
    } catch (error) {
      console.error('[members] count failed', error);
    }
  }
  return { status: role, email, name: member?.name ?? session.user.name ?? email, image: session.user.image ?? null, member: summary(member), pendingCount };
});
```

Note: `canUsePrompts(role)` narrows `role` so `{ status: role }` in `getPromptAccess` is `'pending' | 'guest' | 'unavailable'`. If TS doesn't narrow through the type guard's negative branch, write `role as 'pending' | 'guest' | 'unavailable'`.

- [ ] **Step 2: Allow every verified Google account to sign in**

`web/src/auth.ts`:
```ts
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { AI_SIGNIN_ERROR } from '@/lib/ai-paths';

// 세션은 JWT 만 쓴다. 이메일이 확인된 Google 계정은 모두 로그인할 수 있어야 가입 신청을 받을 수 있다.
// 권한은 로그인이 아니라 요청마다 lib/access 가 회원 상태로 판정한다.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: 'jwt' },
  trustHost: true,
  pages: { error: AI_SIGNIN_ERROR },
  callbacks: {
    signIn: ({ profile }) => profile?.email_verified !== false,
  },
});
```

- [ ] **Step 3: Sign-in/out actions and button**

`web/src/app/(ko)/ai/actions.ts`:
```ts
'use server';
import { signIn, signOut } from '@/auth';
import { joinPath, signOutReturnPath } from '@/lib/ai-paths';

// 어느 버튼으로 로그인하든 /ai/join/ 이 역할에 따라 원래 화면·신청 폼·대기 안내로 갈라 준다.
export async function signInWithGoogle(formData: FormData): Promise<void> {
  await signIn('google', { redirectTo: joinPath(formData.get('from')) });
}

export async function signOutAction(formData: FormData): Promise<void> {
  await signOut({ redirectTo: signOutReturnPath(formData.get('from')) });
}
```

`web/src/components/motion-gallery/GoogleSignInButton.tsx` — change the import to `@/app/(ko)/ai/actions`, the props to `{ from, label = 'Google로 로그인', testId = 'google-signin' }: { from: string; label?: string; testId?: string }`, the hidden input to `<input type="hidden" name="from" value={from} />`, and `data-testid={testId}`. Everything else (SVG, classes) stays.

- [ ] **Step 4: Point the existing pages at the new modules**

Mechanical import swaps (routes move in Task 4):
- `motion/admin/layout.tsx`: `import { requireMember } from '@/lib/access';` and `await requireMember('/ai/motion/admin/');`
- `motion/admin/page.tsx`, `motion/admin/[id]/page.tsx`: `import { loadMotionAdmin } from '@/lib/access';`
- `motion/[id]/page.tsx`: `import { getPromptAccess } from '@/lib/access';` and render `<PromptCopy id={item.id} status={access.status} member={access.member} />` in the non-allowed branch (Task 6 replaces PromptCopy; for now add an optional `member?: unknown` prop and widen `status` in PromptCopy's `Props` to `'signedOut' | 'guest' | 'pending' | 'unavailable'`, mapping every non-`signedOut` value to the existing "denied" copy).
- `motion/signin-error/page.tsx`: `<GoogleSignInButton from="/ai/motion/" label="다른 Google 계정으로 로그인" />`.
- `motion/admin/viewers/page.tsx` + `actions.ts`: temporarily import `requireAdmin` from `@/lib/access`; switch `listViewers/addViewer/removeViewer` to `listMembers`/`addApprovedMember`/`deletePendingMember` only as far as needed to compile — Task 8 rewrites this screen. Simplest: replace the page body with `redirect('/ai/admin/members/')` after `requireAdmin`, and delete `actions.ts` + `ViewerForm.tsx` now.

Then delete `web/src/lib/admin-session.ts`, `web/src/lib/motion-viewers.ts`, `web/src/lib/viewer-input.ts`, `web/src/lib/viewer-input.test.ts`, `web/src/app/(ko)/motion/actions.ts`, `web/src/components/motion-gallery/admin/ViewerForm.tsx`, `web/src/app/(ko)/motion/admin/viewers/actions.ts`.

- [ ] **Step 5: Verify**

Run: `npm run check`
Expected: content ok, vitest all pass, eslint clean, web typecheck clean. Fix any leftover import of a deleted module (`grep -rn "admin-session\|motion-viewers\|viewer-input\|motion/actions" web/src` must print nothing).

- [ ] **Step 6: Commit**

```bash
git add -A web/src
git commit -m "feat(auth): 확인된 Google 계정 로그인 허용, 회원 역할 기반 접근 가드"
```

---

### Task 4: `/motion/` → `/ai/` 라우트 이전과 308

**Files:**
- Move (git mv): `web/src/app/(ko)/motion/page.tsx` → `web/src/app/(ko)/ai/(hub)/motion/page.tsx`; `motion/[id]/page.tsx` → `ai/(hub)/motion/[id]/page.tsx`; `motion/signin-error/page.tsx` → `ai/(hub)/signin-error/page.tsx`; `motion/admin/layout.tsx`, `page.tsx`, `[id]/page.tsx` → `ai/(app)/motion/admin/…`
- Delete: `web/src/app/(ko)/motion/admin/viewers/page.tsx` (and the empty `motion/` folder)
- Create: `web/src/app/(ko)/ai/page.tsx`, `web/src/app/(ko)/ai/(hub)/layout.tsx` (placeholder pass-through in this task), `web/src/app/(ko)/ai/(app)/admin/members/page.tsx` (temporary — Task 8 replaces)
- Modify: `web/next.config.ts`, `web/public/sitemap.xml`, `web/public/robots.txt`, `web/src/components/motion-gallery/MotionCard.tsx:23`, `web/src/components/motion-gallery/admin/AdminGallery.tsx:67,83,103`, `web/src/components/motion-gallery/PromptCopy.tsx` (admin link), `web/src/components/sections/Motion.tsx:18`
- Modify tests: `web/e2e/motion.spec.ts`, `web/e2e/security.spec.ts`, `web/e2e/admin.spec.ts`, `web/e2e/prompt-copy.spec.ts`
- Create test: `web/e2e/redirects.spec.ts`

**Interfaces:**
- Consumes: Task 1 path constants/functions, Task 3 guards.
- Produces: all routes from spec §4 table exist at their `/ai/…` URLs; `(hub)` and `(app)` route groups.

- [ ] **Step 1: Write the failing redirect test**

`web/e2e/redirects.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

const CASES: [string, string][] = [
  ['/motion/', '/ai/motion/'],
  ['/motion', '/ai/motion/'],
  ['/motion/01-pixel/', '/ai/motion/01-pixel/'],
  ['/motion/admin/', '/ai/motion/admin/'],
  ['/motion/admin/01-pixel/', '/ai/motion/admin/01-pixel/'],
  ['/motion/admin/viewers/', '/ai/admin/members/'],
  ['/motion/signin-error/?error=AccessDenied', '/ai/signin-error/?error=AccessDenied'],
];

test('old /motion/ links move permanently to /ai/', async ({ request }) => {
  for (const [from, to] of CASES) {
    const r = await request.get(from, { maxRedirects: 0 });
    expect(r.status(), from).toBe(308);
    expect(r.headers().location, from).toBe(to);
  }
});

test('/ai/ opens the first tab', async ({ page }) => {
  await page.goto('/ai/');
  await expect(page).toHaveURL(/\/ai\/motion\/$/);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run build:web && npm -w web run e2e -- redirects.spec.ts`
Expected: FAIL — `/motion/` returns 200, not 308.

- [ ] **Step 3: Move the route files**

```bash
mkdir -p "web/src/app/(ko)/ai/(hub)/motion/[id]" "web/src/app/(ko)/ai/(hub)/signin-error" "web/src/app/(ko)/ai/(app)/motion/admin/[id]" "web/src/app/(ko)/ai/(app)/admin/members"
git mv "web/src/app/(ko)/motion/page.tsx" "web/src/app/(ko)/ai/(hub)/motion/page.tsx"
git mv "web/src/app/(ko)/motion/[id]/page.tsx" "web/src/app/(ko)/ai/(hub)/motion/[id]/page.tsx"
git mv "web/src/app/(ko)/motion/signin-error/page.tsx" "web/src/app/(ko)/ai/(hub)/signin-error/page.tsx"
git mv "web/src/app/(ko)/motion/admin/layout.tsx" "web/src/app/(ko)/ai/(app)/motion/admin/layout.tsx"
git mv "web/src/app/(ko)/motion/admin/page.tsx" "web/src/app/(ko)/ai/(app)/motion/admin/page.tsx"
git mv "web/src/app/(ko)/motion/admin/[id]/page.tsx" "web/src/app/(ko)/ai/(app)/motion/admin/[id]/page.tsx"
git rm -r "web/src/app/(ko)/motion"
```
`(hub)/motion/[id]` and `(app)/motion/admin` both resolve under `/ai/motion/`; the static `admin` segment wins over `[id]` exactly as it did when both lived in `(ko)/motion/`. If `next build` reports a route conflict, move `(hub)/motion/[id]` to `(hub)/motion/(public)/[id]` — do not rename URLs.

- [ ] **Step 4: New entry pages**

`web/src/app/(ko)/ai/page.tsx`:
```tsx
import { redirect } from 'next/navigation';
import { AI_TABS } from '@/lib/ai-tabs';

export default function AiHomePage() {
  redirect(AI_TABS[0]!.href);
}
```

`web/src/app/(ko)/ai/(hub)/layout.tsx` (Task 5 fills in the header):
```tsx
import type { ReactNode } from 'react';

export default function AiHubLayout({ children }: { children: ReactNode }) {
  return children;
}
```

`web/src/app/(ko)/ai/(app)/admin/members/page.tsx` (temporary, replaced in Task 8):
```tsx
import { requireAdmin } from '@/lib/access';
import { AI_MEMBERS } from '@/lib/ai-paths';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  await requireAdmin(AI_MEMBERS);
  return <p className="p-4">회원 관리 화면 준비 중</p>;
}
```

- [ ] **Step 5: Replace every hard-coded `/motion` path**

Use the Task 1 helpers:
- `(hub)/motion/page.tsx`: canonical `AI_MOTION`; the bottom 「관리자」 link `href={AI_MOTION_ADMIN}`.
- `(hub)/motion/[id]/page.tsx`: `url = aiMotionPath(hit.item.id)`, `href = (m) => (m ? aiMotionPath(m.id) : null)`, back link `AI_MOTION`.
- `(hub)/signin-error/page.tsx`: links `AI_MOTION`.
- `(app)/motion/admin/layout.tsx`: `requireMember(AI_MOTION_ADMIN)`.
- `(app)/motion/admin/page.tsx`: `loadMotionAdmin(AI_MOTION_ADMIN)`.
- `(app)/motion/admin/[id]/page.tsx`: `loadMotionAdmin(aiMotionAdminPath(id))`, `href = (m) => (m ? `${aiMotionAdminPath(m.id)}${suffix}` : null)`, `closeHref={`${AI_MOTION_ADMIN}${suffix}`}`.
- `MotionCard.tsx`: `href ?? aiMotionPath(item.id)`.
- `AdminGallery.tsx`: `history.replaceState(null, '', `${AI_MOTION_ADMIN}${suffix}`)`, card href `${aiMotionAdminPath(i.id)}${suffix}`, manage link `href={AI_MEMBERS}` text 「회원 관리」 (keep `data-testid="viewers-link"` renamed to `members-link`).
- `PromptCopy.tsx`: 「빈칸 편집·장면표」 `href={aiMotionAdminPath(props.id)}`.
- `sections/Motion.tsx`: 「전체 보기」 `href={AI_MOTION}`.

Check: `grep -rn "'/motion\|\`/motion\|\"/motion" web/src` prints nothing.

- [ ] **Step 6: 308 redirects, sitemap, robots**

`web/next.config.ts` — add to `nextConfig`:
```ts
  // 예전 모션 챕터 주소(공유 링크·검색 결과)는 AI활용 허브로 영구 이동한다. 구체 규칙이 먼저다.
  async redirects() {
    return [
      { source: '/motion/admin/viewers/', destination: '/ai/admin/members/', permanent: true },
      { source: '/motion/signin-error/', destination: '/ai/signin-error/', permanent: true },
      { source: '/motion', destination: '/ai/motion/', permanent: true },
      { source: '/motion/', destination: '/ai/motion/', permanent: true },
      { source: '/motion/:path+/', destination: '/ai/motion/:path+/', permanent: true },
    ];
  },
```
(`skipTrailingSlashRedirect` is on, so match the trailing slash explicitly. If the redirect test shows a different `Location` form, adjust the source/destination patterns — the test cases are the contract. Query strings are carried over by Next.)

`web/public/sitemap.xml`: replace the `/motion/` line with `<url><loc>https://me.chois.pro/ai/motion/</loc></url>`.

`web/public/robots.txt`:
```
User-agent: *
Allow: /
Disallow: /ai/motion/admin/
Disallow: /ai/admin/
Disallow: /ai/join/
Disallow: /ai/signin-error/
Disallow: /api/
Sitemap: https://me.chois.pro/sitemap.xml
```

- [ ] **Step 7: Move existing e2e specs to the new paths**

In `motion.spec.ts`, `security.spec.ts`, `admin.spec.ts`, `prompt-copy.spec.ts` replace path literals: `'/motion/'` → `'/ai/motion/'`, `'/motion/01-pixel/'` → `'/ai/motion/01-pixel/'`, `'/motion/17-embroidery/'` → `'/ai/motion/17-embroidery/'`, `'/motion/admin/…'` → `'/ai/motion/admin/…'`, `/\/motion\/\d{2}-/` → `/\/ai\/motion\/\d{2}-/`, `'/motion/02-comics/'`/`'/motion/zz-nope/'` → `/ai/motion/…`, `'/motion/signin-error/?error=AccessDenied'` → `'/ai/signin-error/?error=AccessDenied'`. Keep `'/#motion'` assertions for now (Task 9 changes the home section).
`admin.spec.ts` anonymous test: expect `location` to contain `/ai/join/?from=` instead of `/api/auth/signin`.
`admin.spec.ts` viewer tests: the 「열람자」 flow is superseded — mark the two tests in `describe('registered viewers')` that manage viewers as `test.skip(true, 'Task 8 회원 관리로 대체')` except `viewer sees prompts but not viewer management`, which becomes: sign in as `viewer@example.com`, `/ai/motion/admin/01-pixel/` shows MARKER, `members-link` count 0, `/ai/admin/members/` → 404.
`prompt-copy.spec.ts`: `DETAIL = '/ai/motion/01-pixel/'`; the callback-url assertion becomes `toContain('/ai/join/?from=' + encodeURIComponent(DETAIL))`.

- [ ] **Step 8: Run the whole suite**

Run: `npm run check && npm run build:web && E2E_DATABASE_URL='postgres://postgres:postgres@localhost:51214/template1?sslmode=disable' npm -w web run e2e`
Expected: all pass (the two skipped viewer-management tests show as skipped). Redirect test passes.

- [ ] **Step 9: Commit**

```bash
git add -A web
git commit -m "feat(ai): 모션 챕터를 /ai/ 허브 아래로 이전, 예전 /motion/ 주소는 308"
```

---

### Task 5: 허브 머리글·탭과 화면 문구

**Files:**
- Create: `web/src/components/ai-hub/AiTabs.tsx`, `web/src/components/ai-hub/AiHeader.tsx`, `web/src/components/ai-hub/SignInButton.tsx` (Task 6 gives it the real dialog; here it renders the button only)
- Modify: `web/src/app/(ko)/ai/(hub)/layout.tsx`
- Modify: `content/schema.ts:87-99`, `content/ko/ui.json`, `content/en/ui.json`
- Modify: `web/src/app/(ko)/ai/(hub)/motion/page.tsx` (heading uses `ui.motion.title`)
- Test: `web/e2e/hub.spec.ts`

**Interfaces:**
- Consumes: `AI_TABS`, `activeTabId`, `AI_MEMBERS` (Task 1), `getViewerState`, `ViewerState` (Task 3)
- Produces:
  - ui keys: `nav.ai`, `sections.ai`, `ai.intro`, `ai.signIn`, `motion.title` (and `nav.motion`/`sections.motion` removed)
  - `<AiTabs locale="ko" />` (client; uses `usePathname`), `<AiHeader state={ViewerState} />` (server), `<SignInButton state={ViewerState} />` (client)

- [ ] **Step 1: Write the failing e2e**

`web/e2e/hub.spec.ts`:
```ts
import { expect, test } from '@playwright/test';
import { signInAs } from './session';

test('hub header and tab show on gallery and detail', async ({ page }) => {
  for (const p of ['/ai/motion/', '/ai/motion/01-pixel/']) {
    await page.goto(p);
    const header = page.getByTestId('ai-header');
    await expect(header.getByRole('heading', { level: 1 })).toHaveText('AI활용');
    const tab = header.getByRole('link', { name: '모션그래픽' });
    await expect(tab).toHaveAttribute('aria-current', 'page');
    await expect(header.getByTestId('hub-signin')).toHaveText('로그인 · 가입 신청');
  }
});

test('admin sees members badge only when someone is waiting', async ({ context, page }) => {
  test.skip(!process.env.E2E_DATABASE_URL, 'DB 필요');
  await signInAs(context, 'admin@example.com');
  await page.goto('/ai/motion/');
  await expect(page.getByTestId('members-badge')).toHaveText(/회원 관리\s*\d+/);
  await expect(page.getByTestId('hub-signin')).toHaveCount(0);
});

test('full-screen editor does not show the hub header', async ({ context, page }) => {
  await signInAs(context, 'admin@example.com');
  await page.goto('/ai/motion/admin/');
  await expect(page.getByTestId('ai-header')).toHaveCount(0);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run build:web && npm -w web run e2e -- hub.spec.ts`
Expected: FAIL — `getByTestId('ai-header')` not found.

- [ ] **Step 3: Content keys**

`content/schema.ts`:
- `nav`: replace `motion: z.string()` with `ai: z.string()`.
- `sections`: replace `motion: z.string()` with `ai: z.string()`.
- `motion`: add `title: z.string()` as the first key.
- add after `motion`: `ai: z.object({ intro: z.string(), signIn: z.string(), members: z.string() }),`

`content/ko/ui.json`: `nav.motion` → `"ai": "AI활용"`; `sections.motion` → `"ai": "AI활용"`; in `motion` add `"title": "바이브코딩 모션그래픽"`; add
```json
"ai": {
  "intro": "수업과 업무에 바로 쓰는 바이브코딩 프롬프트 모음. 승인된 교사는 프롬프트를 복사해 쓸 수 있어요.",
  "signIn": "로그인 · 가입 신청",
  "members": "회원 관리"
}
```
`content/en/ui.json`: `"ai": "AI Tools"` in `nav` and `sections`; `motion.title`: `"Vibe-coding motion graphics"`; `ai`: `{ "intro": "Ready-to-use vibe-coding prompts for classes and work. Approved teachers can copy the prompts.", "signIn": "Sign in · Apply", "members": "Members" }`.

Fix every compile error from the removed keys:
- `ui.sections.motion` → `ui.motion.title` in the gallery/detail metadata and headings.
- Because `nav.motion` is gone, rename the section id now (Task 9 only restyles it): `web/src/lib/sections.ts` `'motion'` → `'ai'`; `Nav.tsx` filter `(hasMotion || id !== 'ai')`; `sections/Motion.tsx` `<Section id="ai" title={ui.sections.ai}>`.

Run: `npm run content:validate && npm -w web run typecheck`
Expected: PASS.

- [ ] **Step 4: Tabs, header, sign-in button**

`web/src/components/ai-hub/AiTabs.tsx`:
```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@me/content';
import { AI_TABS, activeTabId } from '@/lib/ai-tabs';

export function AiTabs({ locale }: { locale: Locale }) {
  const active = activeTabId(usePathname());
  return (
    <nav aria-label="AI활용" className="-mx-2 overflow-x-auto px-2">
      <ul className="flex gap-2 whitespace-nowrap">
        {AI_TABS.map((t) => (
          <li key={t.id}>
            <Link
              href={t.href}
              aria-current={t.id === active ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm whitespace-nowrap ${t.id === active ? 'border-fg bg-fg text-bg' : 'border-line hover:border-accent'}`}
            >
              {t.label[locale]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

`web/src/components/ai-hub/SignInButton.tsx` (dialog wired in Task 6):
```tsx
'use client';
import type { ViewerState } from '@/lib/access';

export function SignInButton({ label }: { state: ViewerState; label: string }) {
  return (
    <button type="button" data-testid="hub-signin" className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 text-sm font-semibold whitespace-nowrap text-bg">
      {label}
    </button>
  );
}
```
(`import type` from a `server-only` module is erased at compile time, so it is safe in a client component.)

`web/src/components/ai-hub/AiHeader.tsx`:
```tsx
import Link from 'next/link';
import { getContent } from '@me/content';
import type { ViewerState } from '@/lib/access';
import { AI_MEMBERS } from '@/lib/ai-paths';
import { AiTabs } from './AiTabs';
import { SignInButton } from './SignInButton';

export function AiHeader({ state }: { state: ViewerState }) {
  const { ui } = getContent('ko');
  return (
    <header data-testid="ai-header" className="px-2 pt-6 sm:px-3 md:px-4 lg:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight whitespace-nowrap sm:text-3xl">{ui.sections.ai}</h1>
            <p className="mt-1 text-sm text-muted">{ui.ai.intro}</p>
          </div>
          {state.status === 'signedOut' ? <SignInButton state={state} label={ui.ai.signIn} /> : null}
          {state.status === 'admin' && state.pendingCount > 0 ? (
            <Link href={AI_MEMBERS} prefetch={false} data-testid="members-badge" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm whitespace-nowrap hover:border-accent">
              {ui.ai.members}<span className="rounded-full bg-accent px-2 text-xs font-bold text-bg">{state.pendingCount}</span>
            </Link>
          ) : null}
        </div>
        <AiTabs locale="ko" />
      </div>
    </header>
  );
}
```

`web/src/app/(ko)/ai/(hub)/layout.tsx`:
```tsx
import type { ReactNode } from 'react';
import { AiHeader } from '@/components/ai-hub/AiHeader';
import { getViewerState } from '@/lib/access';

export const dynamic = 'force-dynamic';

export default async function AiHubLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AiHeader state={await getViewerState()} />
      {children}
    </>
  );
}
```
In `(hub)/motion/page.tsx` change the `<h1>` to `<h2>` (the hub owns the page `<h1>`) and its text to `ui.motion.title`; reduce the section's top padding to `pt-4`.

- [ ] **Step 5: Run tests**

Run: `npm run check && npm run build:web && E2E_DATABASE_URL='postgres://postgres:postgres@localhost:51214/template1?sslmode=disable' npm -w web run e2e -- hub.spec.ts motion.spec.ts smoke.spec.ts`
Expected: PASS. (`motion.spec` home-section assertions that look for `section#motion` / nav 「모션」 now fail — update them here to `section#ai` and nav link name 「AI활용」 with `href` `/#ai`.)

- [ ] **Step 6: Commit**

```bash
git add -A content web
git commit -m "feat(ai): 허브 머리글·탭, AI활용 문구, 홈 섹션 id 를 ai 로"
```

---

### Task 6: 로그인·가입 모달과 `/ai/join/`

**Files:**
- Create: `web/src/components/ai-hub/SignInDialog.tsx`, `web/src/components/ai-hub/JoinForm.tsx`
- Modify: `web/src/components/ai-hub/SignInButton.tsx`
- Modify: `web/src/components/motion-gallery/PromptCopy.tsx`
- Modify: `web/src/app/(ko)/ai/(hub)/motion/[id]/page.tsx`
- Create: `web/src/app/(ko)/ai/(hub)/join/page.tsx`, `web/src/app/(ko)/ai/(hub)/join/actions.ts`
- Modify: `web/src/app/(ko)/ai/(hub)/signin-error/page.tsx`
- Test: `web/e2e/prompt-copy.spec.ts`, Create `web/e2e/membership.spec.ts`

**Interfaces:**
- Consumes: `getViewerState`, `getPromptAccess`, `MemberSummary`, `PromptAccess` (Task 3); `applySchema` (Task 1); `applyMember` (Task 2); `joinPath`, `safeReturnPath`, `AI_JOIN`, `AI_MOTION` (Task 1); `GoogleSignInButton({ from, label, testId })` (Task 3)
- Produces:
  - `type DialogState = 'signedOut' | 'guest' | 'pending' | 'unavailable'`
  - `<SignInDialog open onClose state from member />` (client, controlled)
  - `applyAction(prev: JoinFormState, formData: FormData): Promise<JoinFormState>`, `type JoinFormState = { ok: boolean; message: string; name?: string; affiliation?: string } | null`
  - `<JoinForm defaults={{ name, affiliation }} isPending={boolean} />`

- [ ] **Step 1: Write the failing e2e**

Replace the three non-admin tests in `web/e2e/prompt-copy.spec.ts` with:
```ts
test('anonymous visitor gets the sign-in modal with a join button and no prompt data', async ({ page }) => {
  const html = await (await page.request.get(DETAIL)).text();
  expect(html).not.toContain(MARKER);
  await page.goto(DETAIL);
  await page.getByTestId('copy-prompt-en').click();
  const dialog = page.getByTestId('signin-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('로그인하여 프롬프트를 복사하세요.');
  await expect(dialog).toContainText('승인된 교사만 프롬프트를 쓸 수 있어요.');
  await expect(dialog.getByRole('button')).toHaveText(['Google로 로그인', '가입 신청 (교사)', '닫기']);
  await dialog.getByRole('button', { name: '닫기' }).click();
  await expect(dialog).toBeHidden();
});

test('both Google buttons come back through /ai/join/ with the detail as from', async ({ page }) => {
  await page.route('https://accounts.google.com/**', (route) => route.fulfill({ body: 'google' }));
  for (const testId of ['google-signin', 'join-signin']) {
    await page.goto(DETAIL);
    await page.getByTestId('copy-prompt-ko').click();
    await page.getByTestId(testId).click();
    await page.waitForURL(/accounts\.google\.com/);
    const cookies = await page.context().cookies();
    expect(decodeURIComponent(cookies.find((c) => c.name === 'authjs.callback-url')?.value ?? '')).toContain(`/ai/join/?from=${encodeURIComponent(DETAIL)}`);
  }
});
```
And add `web/e2e/membership.spec.ts`:
```ts
import { expect, test } from '@playwright/test';
import { MARKER, signInAs } from './session';

test.skip(!process.env.E2E_DATABASE_URL, '회원 시나리오는 DB 가 필요하다');
const DETAIL = '/ai/motion/01-pixel/';

test('guest applies and becomes pending without seeing prompts', async ({ context, page }) => {
  const email = `guest.${Date.now()}@example.com`;
  await signInAs(context, email);
  await page.goto(DETAIL);
  await page.getByTestId('copy-prompt-en').click();
  const dialog = page.getByTestId('signin-dialog');
  await expect(dialog).toContainText('아직 가입 신청을 하지 않은 계정입니다.');
  await dialog.getByRole('link', { name: '가입 신청하기' }).click();
  await expect(page).toHaveURL(/\/ai\/join\/\?from=/);
  await expect(page.getByTestId('join-email')).toHaveText(email);
  await page.getByLabel('이름').fill('  새교사 ');
  await page.getByLabel('소속').fill('새고등학교');
  await page.getByRole('button', { name: '신청하기' }).click();
  await expect(page.getByRole('status')).toHaveText('신청을 받았습니다. 관리자가 확인하면 사용할 수 있어요.');
  await expect(page.getByTestId('join-state')).toContainText('승인 대기 중');
  const html = await (await context.request.get(DETAIL)).text();
  expect(html).not.toContain(MARKER);
  expect((await context.request.get('/ai/motion/admin/', { maxRedirects: 0 })).status()).toBe(404);
});

test('pending member sees the waiting modal and can edit the application', async ({ context, page }) => {
  await signInAs(context, 'pending2@example.com');
  await page.goto(DETAIL);
  await page.getByTestId('copy-prompt-en').click();
  const dialog = page.getByTestId('signin-dialog');
  await expect(dialog).toContainText('승인 대기 중입니다.');
  await expect(dialog).toContainText('대기교사2');
  await page.goto('/ai/join/');
  await page.getByLabel('소속').fill('   ');
  await page.getByRole('button', { name: '신청 내용 저장' }).click();
  await expect(page.getByRole('status')).toHaveText('소속을 입력하세요.');
  await page.reload();
  await expect(page.getByLabel('소속')).toHaveValue('대기중학교2');
});

test('approved member and admin are sent straight back from /ai/join/', async ({ context, page }) => {
  await signInAs(context, 'viewer@example.com');
  await page.goto(`/ai/join/?from=${encodeURIComponent(DETAIL)}`);
  await expect(page).toHaveURL(new RegExp(`${DETAIL}$`));
  await page.goto('/ai/join/?from=%2F%2Fevil.com');
  await expect(page).toHaveURL(/\/ai\/motion\/$/);
});

test('approved member posting the join form stays approved', async ({ context, page }) => {
  await signInAs(context, 'viewer@example.com');
  await page.goto(DETAIL);
  await expect(page.getByTestId('copy-prompt-en')).toBeEnabled();
  // 회원은 폼을 볼 수 없으므로 액션을 직접 부르는 대신 상태가 유지되는지만 확인한다.
  expect((await context.request.get('/ai/motion/admin/01-pixel/')).status()).toBe(200);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run build:web && E2E_DATABASE_URL='postgres://postgres:postgres@localhost:51214/template1?sslmode=disable' npm -w web run e2e -- prompt-copy.spec.ts membership.spec.ts`
Expected: FAIL — dialog text/buttons differ, `/ai/join/` 404.

- [ ] **Step 3: SignInDialog**

`web/src/components/ai-hub/SignInDialog.tsx`:
```tsx
'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { MemberSummary } from '@/lib/access';
import { joinPath } from '@/lib/ai-paths';
import { CONTACT_NOTE } from '@/components/motion-gallery/contact';
import { GoogleSignInButton } from '@/components/motion-gallery/GoogleSignInButton';

export type DialogState = 'signedOut' | 'guest' | 'pending' | 'unavailable';

const btn = 'inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm whitespace-nowrap hover:border-accent';
const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' });

const TITLE: Record<DialogState, string> = {
  signedOut: '로그인하여 프롬프트를 복사하세요.',
  guest: '아직 가입 신청을 하지 않은 계정입니다.',
  pending: '승인 대기 중입니다.',
  unavailable: '잠시 후 다시 시도해 주세요.',
};

export function SignInDialog({ open, onClose, state, from, member }: {
  open: boolean;
  onClose: () => void;
  state: DialogState;
  from: string;
  member: MemberSummary | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      data-testid="signin-dialog"
      aria-labelledby="signin-dialog-title"
      onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="m-auto w-[min(92vw,440px)] rounded-2xl bg-bg p-0 text-fg backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-3 p-3 sm:p-5">
        <h2 id="signin-dialog-title" className="text-lg font-bold">{TITLE[state]}</h2>
        {state === 'signedOut' ? <p className="text-sm text-muted">승인된 교사만 프롬프트를 쓸 수 있어요. 처음이면 가입 신청을 해 주세요.</p> : null}
        {state === 'pending' ? (
          <>
            <p className="text-sm text-muted">관리자가 확인하면 사용할 수 있어요.</p>
            {member ? (
              <dl className="grid grid-cols-[4rem_1fr] gap-x-2 gap-y-1 text-sm">
                <dt className="text-muted">이름</dt><dd className="overflow-hidden text-ellipsis whitespace-nowrap">{member.name}</dd>
                <dt className="text-muted">소속</dt><dd className="overflow-hidden text-ellipsis whitespace-nowrap">{member.affiliation}</dd>
                <dt className="text-muted">신청일</dt><dd>{dateFormat.format(new Date(member.createdAt))}</dd>
              </dl>
            ) : null}
          </>
        ) : null}
        <p className="text-xs text-muted">{CONTACT_NOTE}</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {state === 'signedOut' ? (
            <>
              <GoogleSignInButton from={from} />
              <GoogleSignInButton from={from} label="가입 신청 (교사)" testId="join-signin" />
            </>
          ) : null}
          {state === 'guest' ? (
            <>
              <Link href={joinPath(from)} className={`${btn} bg-accent font-semibold text-bg`}>가입 신청하기</Link>
              <GoogleSignInButton from={from} label="다른 Google 계정으로 로그인" />
            </>
          ) : null}
          {state === 'pending' ? <Link href={joinPath(from)} className={btn}>신청 내용 수정</Link> : null}
          <button type="button" onClick={onClose} className={btn}>닫기</button>
        </div>
      </div>
    </dialog>
  );
}
```

Update `CONTACT_NOTE` in `web/src/components/motion-gallery/contact.ts` to `'문의는 최재혁T에게 해 주세요.'` (registration is now self-service).

- [ ] **Step 4: PromptCopy uses the dialog**

Rewrite `web/src/components/motion-gallery/PromptCopy.tsx` props and dialog part:
```tsx
type Props =
  | { id: string; status: DialogState; member: MemberSummary | null }
  | { id: string; status: 'allowed'; prompts: Record<Lang, string> | null };
```
- Replace the inline `<dialog>` with `const [isOpen, setOpen] = useState(false)` and, when `props.status !== 'allowed'`, render `<SignInDialog open={isOpen} onClose={() => setOpen(false)} state={props.status} from={aiMotionPath(props.id)} member={props.member} />`.
- `onCopy`: if `!prompts` → `setOpen(true)`.
- Remove the `useRef` dialog, `CONTACT_NOTE`, `GoogleSignInButton` imports.

In `(hub)/motion/[id]/page.tsx` the non-allowed branch is `<PromptCopy id={item.id} status={access.status} member={access.member} />`.

- [ ] **Step 5: Hub sign-in button opens the dialog**

`web/src/components/ai-hub/SignInButton.tsx`:
```tsx
'use client';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { ViewerState } from '@/lib/access';
import { SignInDialog } from './SignInDialog';

export function SignInButton({ label }: { state: ViewerState; label: string }) {
  const [isOpen, setOpen] = useState(false);
  const from = usePathname();
  return (
    <>
      <button type="button" data-testid="hub-signin" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 text-sm font-semibold whitespace-nowrap text-bg">
        {label}
      </button>
      <SignInDialog open={isOpen} onClose={() => setOpen(false)} state="signedOut" from={from} member={null} />
    </>
  );
}
```

- [ ] **Step 6: Join action and page**

`web/src/app/(ko)/ai/(hub)/join/actions.ts`:
```ts
'use server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { getAccess } from '@/lib/access';
import { AI_JOIN } from '@/lib/ai-paths';
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
    console.error('[members] apply failed', error);
    return fail('잠시 후 다시 시도해 주세요.');
  }
  revalidatePath(AI_JOIN);
  if (result === 'exists') return { ok: true, message: '이미 등록된 계정입니다.' };
  return { ok: true, message: result === 'created' ? '신청을 받았습니다. 관리자가 확인하면 사용할 수 있어요.' : '신청 내용을 고쳤습니다.' };
}
```

`web/src/components/ai-hub/JoinForm.tsx`:
```tsx
'use client';
import { useActionState } from 'react';
import { applyAction, type JoinFormState } from '@/app/(ko)/ai/(hub)/join/actions';

const field = 'min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-base';

export function JoinForm({ defaults, isPending }: { defaults: { name: string; affiliation: string }; isPending: boolean }) {
  const [state, action, isSubmitting] = useActionState<JoinFormState, FormData>(applyAction, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="whitespace-nowrap text-muted">이름</span>
        <input name="name" required maxLength={30} autoComplete="name" defaultValue={state?.name ?? defaults.name} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="whitespace-nowrap text-muted">소속</span>
        <input name="affiliation" required maxLength={50} placeholder="예: ○○고등학교" defaultValue={state?.affiliation ?? defaults.affiliation} className={field} />
      </label>
      <button type="submit" disabled={isSubmitting} className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold whitespace-nowrap text-bg disabled:opacity-50">
        {isSubmitting ? '보내는 중…' : isPending ? '신청 내용 저장' : '신청하기'}
      </button>
      {state ? <p role="status" className={`text-sm ${state.ok ? 'text-fg' : 'text-accent'}`}>{state.message}</p> : null}
    </form>
  );
}
```
Note: `required` would stop the browser before the server sees `'   '`; the pending e2e fills spaces, which passes `required`, so the server message 「소속을 입력하세요.」 is what the user sees.

`web/src/app/(ko)/ai/(hub)/join/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { GoogleSignInButton } from '@/components/motion-gallery/GoogleSignInButton';
import { JoinForm } from '@/components/ai-hub/JoinForm';
import { getViewerState } from '@/lib/access';
import { AI_JOIN, safeReturnPath } from '@/lib/ai-paths';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '가입 신청', robots: { index: false, follow: false } };

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' });

export default async function JoinPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).from;
  const from = safeReturnPath(Array.isArray(raw) ? raw[0] : raw);
  const state = await getViewerState();
  if (state.status === 'admin' || state.status === 'member') redirect(from);

  return (
    <section className="px-2 py-6 sm:px-3 md:px-4 lg:px-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-[var(--radius-card)] border border-line p-3 sm:p-6">
        <h2 className="text-xl font-bold whitespace-nowrap">교사 가입 신청</h2>
        {state.status === 'signedOut' ? (
          <>
            <p className="text-sm text-muted">본인 Google 계정으로 로그인한 뒤 이름과 소속을 적어 주세요. 관리자가 확인하면 프롬프트를 쓸 수 있어요.</p>
            <GoogleSignInButton from={from === AI_JOIN ? '/ai/motion/' : from} />
          </>
        ) : state.status === 'unavailable' ? (
          <p role="alert" className="text-sm">잠시 후 다시 시도해 주세요.</p>
        ) : (
          <>
            <p className="text-sm">
              <span className="text-muted">Google 계정 </span>
              <span data-testid="join-email" className="font-mono">{state.email}</span>
            </p>
            {state.status === 'pending' && state.member ? (
              <p data-testid="join-state" className="rounded-lg bg-accent-soft px-3 py-2 text-sm">
                승인 대기 중 · {dateFormat.format(new Date(state.member.createdAt))} 신청
              </p>
            ) : null}
            <JoinForm defaults={{ name: state.member?.name ?? state.name, affiliation: state.member?.affiliation ?? '' }} isPending={state.status === 'pending'} />
          </>
        )}
      </div>
    </section>
  );
}
```
Note: after a successful first submit, `revalidatePath(AI_JOIN)` re-renders the page as `pending`, so `join-state` appears and the button label switches to 「신청 내용 저장」.

- [ ] **Step 7: signin-error wording**

In `(hub)/signin-error/page.tsx`: `AccessDenied` now only happens for unverified Google emails — title 「이메일이 확인되지 않은 Google 계정입니다.」; keep the generic branch; button `GoogleSignInButton from={AI_MOTION} label="다른 Google 계정으로 로그인"`. Update the last test in `prompt-copy.spec.ts` to expect that title on `/ai/signin-error/?error=AccessDenied`.

- [ ] **Step 8: Run tests**

Run: `npm run check && npm run build:web && E2E_DATABASE_URL='postgres://postgres:postgres@localhost:51214/template1?sslmode=disable' npm -w web run e2e -- prompt-copy.spec.ts membership.spec.ts hub.spec.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A web
git commit -m "feat(ai): 로그인·가입 모달과 /ai/join/ 가입 신청(Google 로그인 후 이름·소속)"
```

---

### Task 7: 계정 칩·메뉴·로그아웃

**Files:**
- Create: `web/src/components/ai-hub/AccountMenu.tsx`
- Modify: `web/src/components/RootShell.tsx`, `web/src/components/Nav.tsx`
- Modify: `web/src/components/motion-gallery/admin/AdminGallery.tsx`, `web/src/components/motion-gallery/admin/AdminDetail.tsx`, `web/src/app/(ko)/ai/(app)/motion/admin/page.tsx`, `web/src/app/(ko)/ai/(app)/motion/admin/[id]/page.tsx`
- Test: Create `web/e2e/account.spec.ts`

**Interfaces:**
- Consumes: `ViewerState`, `getViewerState` (Task 3); `signOutAction` (Task 3); `AI_JOIN`, `AI_MOTION_ADMIN`, `AI_MEMBERS` (Task 1)
- Produces: `<AccountMenu state={Exclude<ViewerState, { status: 'signedOut' }>} tone="site" | "dark" />` — chip `data-testid="account-chip"`, menu `data-testid="account-menu"`, logout button text 「로그아웃」. `AdminGallery`/`AdminDetail` take a new prop `account: ViewerState`.

- [ ] **Step 1: Write the failing e2e**

`web/e2e/account.spec.ts`:
```ts
import { expect, test } from '@playwright/test';
import { signInAs } from './session';

test('signed-out home has no account chip', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('account-chip')).toHaveCount(0);
});

// 편집기는 사이트 Nav 를 덮는 전체 화면이라 Nav 칩(가려짐)과 편집기 칩이 DOM 에 둘 다 있다. 편집기 칩이 나중에 나온다.
const chip = (page: import('@playwright/test').Page) => page.getByTestId('account-chip').last();

test('admin sees the chip on home, hub and editor and can sign out', async ({ context, page }) => {
  await signInAs(context, 'admin@example.com');
  for (const p of ['/', '/en/', '/ai/motion/', '/ai/motion/admin/', '/ai/motion/admin/01-pixel/']) {
    await page.goto(p);
    await expect(chip(page), p).toContainText('관리자');
  }
  await chip(page).click();
  const menu = page.getByTestId('account-menu');
  await expect(menu).toContainText('admin@example.com');
  await expect(menu.getByRole('link', { name: /회원 관리/ })).toBeVisible();
  // 편집기 상세는 Esc 로 목록에 돌아가는 단축키가 있다. 메뉴가 열려 있을 땐 메뉴만 닫혀야 한다.
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(/\/ai\/motion\/admin\/01-pixel\/$/);
  await chip(page).click();
  await menu.getByRole('button', { name: '로그아웃' }).click();
  await expect(page).toHaveURL(/\/ai\/motion\/$/);
  await expect(page.getByTestId('account-chip')).toHaveCount(0);
  await expect(page.getByTestId('hub-signin')).toBeVisible();
});

test('signing out on a public detail stays on that detail', async ({ context, page }) => {
  await signInAs(context, 'admin@example.com');
  await page.goto('/ai/motion/01-pixel/');
  await page.getByTestId('account-chip').click();
  await page.getByTestId('account-menu').getByRole('button', { name: '로그아웃' }).click();
  await expect(page).toHaveURL(/\/ai\/motion\/01-pixel\/$/);
});

test('member and pending chips show their status and links', async ({ browser }) => {
  test.skip(!process.env.E2E_DATABASE_URL, 'DB 필요');
  for (const [email, badge, link] of [['viewer@example.com', '등록', '모션그래픽 프롬프트'], ['pending@example.com', '승인 대기', '신청 내용 수정']] as const) {
    const ctx = await browser.newContext();
    await signInAs(ctx, email);
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.getByTestId('account-chip')).toContainText(badge);
    await page.getByTestId('account-chip').click();
    await expect(page.getByTestId('account-menu').getByRole('link', { name: link })).toBeVisible();
    await ctx.close();
  }
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run build:web && npm -w web run e2e -- account.spec.ts`
Expected: FAIL — `account-chip` not found.

- [ ] **Step 3: AccountMenu**

`web/src/components/ai-hub/AccountMenu.tsx`:
```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { signOutAction } from '@/app/(ko)/ai/actions';
import type { ViewerState } from '@/lib/access';
import { AI_JOIN, AI_MEMBERS, AI_MOTION_ADMIN } from '@/lib/ai-paths';

type SignedIn = Exclude<ViewerState, { status: 'signedOut' }>;

const BADGE: Record<SignedIn['status'], string | null> = { admin: '관리자', member: '등록', pending: '승인 대기', guest: '미신청', unavailable: null };
const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' });

const TONE = {
  site: { chip: 'border-line bg-bg text-fg hover:border-accent', menu: 'border-line bg-bg text-fg', item: 'hover:bg-line/40', muted: 'text-muted', badge: 'bg-accent-soft text-fg' },
  dark: { chip: 'border-[#343946] bg-[#15171c] text-[#e8eaf0] hover:border-[#ffb547]', menu: 'border-[#343946] bg-[#15171c] text-[#e8eaf0]', item: 'hover:bg-[#1c1f26]', muted: 'text-[#a9afbd]', badge: 'bg-[#ffb547] text-[#1a1200]' },
} as const;

export function AccountMenu({ state, tone = 'site' }: { state: SignedIn; tone?: keyof typeof TONE }) {
  const [isOpen, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const from = usePathname();
  const c = TONE[tone];
  const badge = BADGE[state.status];

  useEffect(() => {
    if (!isOpen) return;
    // 캡처 단계에서 Esc 를 먼저 받아 멈춘다. 편집기 상세(AdminDetail)의 Esc=목록으로 단축키가 함께 실행되지 않게.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
    };
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onDown);
    return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('pointerdown', onDown); };
  }, [isOpen]);

  const item = `flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm whitespace-nowrap ${c.item}`;
  return (
    <div ref={root} className="relative flex-none">
      <button
        type="button"
        data-testid="account-chip"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm whitespace-nowrap ${c.chip}`}
      >
        {state.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- Google 프로필 주소라 next/image 대상이 아니다
          <img src={state.image} alt="" width={32} height={32} referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" />
        ) : (
          <span aria-hidden className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-bg">{state.name.slice(0, 1)}</span>
        )}
        <span className="hidden max-w-[10rem] overflow-hidden text-ellipsis sm:inline">{state.name}</span>
        {badge ? <span className={`rounded-full px-2 text-xs font-semibold ${c.badge}`}>{badge}</span> : null}
      </button>
      {isOpen ? (
        <div id={menuId} data-testid="account-menu" className={`absolute right-0 z-50 mt-2 w-[min(88vw,18rem)] rounded-xl border p-2 shadow-lg ${c.menu}`}>
          <div className="px-3 py-2">
            <p className="overflow-hidden font-semibold text-ellipsis whitespace-nowrap">{state.name}</p>
            <p className={`overflow-hidden text-xs text-ellipsis whitespace-nowrap ${c.muted}`} title={state.email}>{state.email}</p>
            {state.status === 'pending' && state.member ? (
              <p className={`mt-1 text-xs whitespace-nowrap ${c.muted}`}>승인 대기 중 · {dateFormat.format(new Date(state.member.createdAt))} 신청</p>
            ) : null}
          </div>
          {state.status === 'guest' ? <Link href={AI_JOIN} prefetch={false} className={item}>가입 신청하기</Link> : null}
          {state.status === 'pending' ? <Link href={AI_JOIN} prefetch={false} className={item}>신청 내용 수정</Link> : null}
          {state.status === 'admin' || state.status === 'member' ? <Link href={AI_MOTION_ADMIN} prefetch={false} className={item}>모션그래픽 프롬프트</Link> : null}
          {state.status === 'admin' ? <Link href={AI_MEMBERS} prefetch={false} className={item}>회원 관리{state.pendingCount > 0 ? ` (대기 ${state.pendingCount})` : ''}</Link> : null}
          <form action={signOutAction}>
            <input type="hidden" name="from" value={from} />
            <button type="submit" className={item}>로그아웃</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Put it in the site Nav**

`RootShell.tsx`: `const account = await getViewerState();` and pass `account={account}` to `Nav`.
`Nav.tsx` signature adds `account: ViewerState`; after `<LangToggle … />` render `{account.status === 'signedOut' ? null : <AccountMenu state={account} />}`.

- [ ] **Step 5: Put it in the full-screen editor**

- `(app)/motion/admin/page.tsx` and `[id]/page.tsx`: `const account = await getViewerState();` and pass `account` to `AdminGallery` / `AdminDetail`.
- `AdminGallery.tsx`: add prop `account: ViewerState`; in the top header, right after the existing 「회원 관리」 link, render `{account.status === 'signedOut' ? null : <AccountMenu state={account} tone="dark" />}`.
- `AdminDetail.tsx`: same prop; render it at the right end of the top bar (after the sound button).

- [ ] **Step 6: Run tests**

Run: `npm run check && npm run build:web && E2E_DATABASE_URL='postgres://postgres:postgres@localhost:51214/template1?sslmode=disable' npm -w web run e2e -- account.spec.ts smoke.spec.ts admin.spec.ts`
Expected: PASS. Also open `/` at 375px in the browser preview: Nav must not scroll the page horizontally (chip shows avatar + badge only).

- [ ] **Step 7: Commit**

```bash
git add -A web
git commit -m "feat(ai): 로그인 상태 칩·계정 메뉴·로그아웃(사이트 Nav, 편집기)"
```

---

### Task 8: 회원 관리 화면

**Files:**
- Replace: `web/src/app/(ko)/ai/(app)/admin/members/page.tsx`
- Create: `web/src/app/(ko)/ai/(app)/admin/members/actions.ts`
- Create: `web/src/components/ai-hub/MemberAddForm.tsx`, `web/src/components/ai-hub/ConfirmDelete.tsx`
- Modify: `web/src/components/motion-gallery/admin/admin.module.css` (status tab + row action styles)
- Test: `web/e2e/admin.spec.ts` (replace the skipped viewer-management tests)

**Interfaces:**
- Consumes: `requireAdmin`, `getViewerState` (Task 3); `listMembers`, `setMemberStatus`, `deletePendingMember`, `updateMemberProfile`, `addApprovedMember`, `MemberRow` (Task 2); `adminAddSchema`, `applySchema`, `memberIdSchema` (Task 1); `AccountMenu` (Task 7); `AI_MEMBERS`, `AI_MOTION_ADMIN` (Task 1)
- Produces: Server Actions `addMemberAction(prev: MemberFormState, fd)`, `approveAction(fd)`, `suspendAction(fd)`, `deleteAction(fd)`, `updateProfileAction(fd)`; `type MemberFormState = { ok: boolean; message: string; email?: string; name?: string; affiliation?: string } | null`. Row `data-testid="member-row"` with `data-status="PENDING|APPROVED"`.

- [ ] **Step 1: Write the failing e2e**

In `web/e2e/admin.spec.ts`, replace the `describe('registered viewers')` block with:
```ts
test.describe('members', () => {
  test.skip(!process.env.E2E_DATABASE_URL, 'E2E_DATABASE_URL 이 없으면 DB 가 필요한 회원 시나리오는 건너뛴다');

  test('member sees prompts but not member management', async ({ context, page }) => {
    await signInAs(context, 'viewer@example.com');
    await page.goto('/ai/motion/admin/01-pixel/');
    await expect(page.getByTestId('prompt-output')).toContainText(MARKER);
    await page.goto('/ai/motion/admin/');
    await expect(page.getByTestId('members-link')).toHaveCount(0);
    expect((await context.request.get('/ai/admin/members/', { maxRedirects: 0 })).status()).toBe(404);
  });

  test('admin approves, suspends and deletes; access follows immediately', async ({ browser }) => {
    const admin = await browser.newContext();
    await signInAs(admin, 'admin@example.com');
    const page = await admin.newPage();
    const teacher = await browser.newContext();
    await signInAs(teacher, 'pending@example.com');

    await page.goto('/ai/admin/members/');
    const pending = page.getByTestId('member-row').filter({ hasText: 'pending@example.com' });
    await expect(pending).toHaveAttribute('data-status', 'PENDING');
    expect((await teacher.request.get('/ai/motion/admin/', { maxRedirects: 0 })).status()).toBe(404);

    await pending.getByRole('button', { name: '승인' }).click();
    await page.getByRole('link', { name: /등록/ }).first().click();
    const approved = page.getByTestId('member-row').filter({ hasText: 'pending@example.com' });
    await expect(approved).toHaveAttribute('data-status', 'APPROVED');
    await expect(approved.getByRole('button', { name: '삭제' })).toHaveCount(0);
    expect((await teacher.request.get('/ai/motion/admin/')).status()).toBe(200);

    await approved.getByRole('button', { name: '대기로 변경' }).click();
    expect((await teacher.request.get('/ai/motion/admin/', { maxRedirects: 0 })).status()).toBe(404);

    await page.goto('/ai/admin/members/?s=pending');
    const again = page.getByTestId('member-row').filter({ hasText: 'pending@example.com' });
    await again.getByRole('button', { name: '삭제' }).click();
    await page.getByTestId('confirm-delete').getByRole('button', { name: '삭제' }).click();
    await expect(page.getByTestId('member-row').filter({ hasText: 'pending@example.com' })).toHaveCount(0);
    await admin.close();
    await teacher.close();
  });

  test('admin adds a teacher directly as approved and edits the name', async ({ context, page }) => {
    await signInAs(context, 'admin@example.com');
    await page.goto('/ai/admin/members/?s=all');
    await page.getByLabel('이메일').fill('  Direct@Example.com ');
    await page.getByLabel('이름', { exact: true }).fill('직접교사');
    await page.getByLabel('소속', { exact: true }).fill('직접고');
    await page.getByRole('button', { name: '추가' }).click();
    await expect(page.getByRole('status')).toHaveText('등록했습니다: direct@example.com');
    const row = page.getByTestId('member-row').filter({ hasText: 'direct@example.com' });
    await expect(row).toHaveAttribute('data-status', 'APPROVED');
    await row.getByText('수정').click();
    await row.getByLabel('이름').fill('고친교사');
    await row.getByRole('button', { name: '저장' }).click();
    await expect(page.getByTestId('member-row').filter({ hasText: 'direct@example.com' })).toContainText('고친교사');
  });

  test('approved member cannot be deleted even with a forged form post', async ({ context, page }) => {
    await signInAs(context, 'admin@example.com');
    await page.goto('/ai/admin/members/?s=approved');
    const row = page.getByTestId('member-row').filter({ hasText: 'viewer@example.com' });
    const id = await row.getAttribute('data-id');
    // 등록 행에는 삭제 폼이 없으므로 pending2 행의 삭제 폼 id 값을 바꿔 보낸다.
    await page.goto('/ai/admin/members/?s=pending');
    await page.evaluate((target) => {
      const row = [...document.querySelectorAll('[data-testid="member-row"]')].find((r) => r.textContent?.includes('pending2@example.com'));
      const form = row?.querySelector<HTMLFormElement>('form[data-action="delete"]');
      if (!form) throw new Error('no pending2 delete form');
      form.querySelector<HTMLInputElement>('input[name="id"]')!.value = target!;
      form.requestSubmit();
    }, id);
    await page.goto('/ai/admin/members/?s=approved');
    await expect(page.getByTestId('member-row').filter({ hasText: 'viewer@example.com' })).toHaveCount(1);
    await page.goto('/ai/admin/members/?s=pending');
    await expect(page.getByTestId('member-row').filter({ hasText: 'pending2@example.com' })).toHaveCount(1);
  });
});
```
(The forged-post test uses `pending2@example.com`'s delete form, which no test deletes, so test order doesn't matter. The confirm `<dialog>` is closed but its `<form>` is in the DOM, so `requestSubmit()` works without opening it.)

- [ ] **Step 2: Run to verify failure**

Run: `npm run build:web && E2E_DATABASE_URL='postgres://postgres:postgres@localhost:51214/template1?sslmode=disable' npm -w web run e2e -- admin.spec.ts`
Expected: FAIL — `member-row` not found.

- [ ] **Step 3: Actions**

`web/src/app/(ko)/ai/(app)/admin/members/actions.ts`:
```ts
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
```

- [ ] **Step 4: Form components**

`web/src/components/ai-hub/MemberAddForm.tsx`:
```tsx
'use client';
import { useActionState } from 'react';
import { addMemberAction, type MemberFormState } from '@/app/(ko)/ai/(app)/admin/members/actions';
import s from '@/components/motion-gallery/admin/admin.module.css';

export function MemberAddForm() {
  const [state, action, isPending] = useActionState<MemberFormState, FormData>(addMemberAction, null);
  return (
    <form action={action}>
      <div className={s.vForm}>
        <div className={s.f}><label htmlFor="member-email">이메일</label><input id="member-email" name="email" type="email" required autoComplete="off" placeholder="teacher@gmail.com" defaultValue={state?.email} /></div>
        <div className={s.f}><label htmlFor="member-name">이름</label><input id="member-name" name="name" required maxLength={30} autoComplete="off" defaultValue={state?.name} /></div>
        <div className={s.f}><label htmlFor="member-affiliation">소속</label><input id="member-affiliation" name="affiliation" required maxLength={50} autoComplete="off" defaultValue={state?.affiliation} /></div>
        <button type="submit" className={s.vSubmit} disabled={isPending}>{isPending ? '등록 중…' : '추가'}</button>
      </div>
      {state ? <p role="status" title={state.message} className={`${s.vMsg} ${state.ok ? '' : s.isError}`}>{state.message}</p> : null}
    </form>
  );
}
```

`web/src/components/ai-hub/ConfirmDelete.tsx`:
```tsx
'use client';
import { useRef } from 'react';
import { deleteAction } from '@/app/(ko)/ai/(app)/admin/members/actions';
import s from '@/components/motion-gallery/admin/admin.module.css';

export function ConfirmDelete({ id, label }: { id: number; label: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={s.del} onClick={() => dialog.current?.showModal()}>삭제</button>
      <dialog ref={dialog} data-testid="confirm-delete" className={s.confirm} onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
        <p>{label} 신청을 삭제할까요? 되돌릴 수 없습니다.</p>
        <form action={deleteAction} data-action="delete" className={s.confirmRow}>
          <input type="hidden" name="id" value={id} />
          <button type="button" className={s.del} onClick={() => dialog.current?.close()}>취소</button>
          <button type="submit" className={s.vSubmit}>삭제</button>
        </form>
      </dialog>
    </>
  );
}
```

Add to `admin.module.css` (after the `.del` rule):
```css
.sTabs { display: flex; gap: 6px; overflow-x: auto; padding: 0 0 2px; scrollbar-width: none; }
.sTabs a { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--line-2); background: var(--bg-2); color: var(--fg-2); white-space: nowrap; }
.sTabs a.isOn { background: var(--accent); border-color: var(--accent); color: #1a1200; }
.rowActs { display: flex; gap: 6px; flex-wrap: nowrap; }
.ok { min-height: 44px; padding: 0 12px; border-radius: 8px; background: var(--ok); color: #04210f; font-weight: 600; white-space: nowrap; }
.stat { display: inline-flex; padding: 2px 8px; border-radius: 999px; font-size: 12px; white-space: nowrap; border: 1px solid var(--line-2); }
.stat.isPending { border-color: var(--accent); color: var(--accent); }
.edit summary { cursor: pointer; min-height: 44px; display: inline-flex; align-items: center; color: var(--fg-2); text-decoration: underline; white-space: nowrap; }
.edit form { display: flex; gap: 6px; padding-top: 6px; }
.edit input { min-height: 44px; background: var(--bg-3); border: 1px solid var(--line-2); border-radius: 8px; padding: 0 10px; width: 9rem; }
.confirm { margin: auto; border: 1px solid var(--line-2); border-radius: 12px; background: var(--bg-2); color: var(--fg); padding: 16px; width: min(92vw, 360px); }
.confirm::backdrop { background: rgba(0, 0, 0, .6); }
.confirmRow { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
```

- [ ] **Step 5: The page**

`web/src/app/(ko)/ai/(app)/admin/members/page.tsx`:
```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { AccountMenu } from '@/components/ai-hub/AccountMenu';
import { ConfirmDelete } from '@/components/ai-hub/ConfirmDelete';
import { MemberAddForm } from '@/components/ai-hub/MemberAddForm';
import s from '@/components/motion-gallery/admin/admin.module.css';
import { getViewerState, requireAdmin } from '@/lib/access';
import { AI_MEMBERS, AI_MOTION_ADMIN } from '@/lib/ai-paths';
import { listMembers, type MemberRow } from '@/lib/members';
import { approveAction, suspendAction, updateProfileAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '회원 관리', robots: { index: false, follow: false } };

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' });
type Filter = 'pending' | 'approved' | 'all';
const FILTERS: [Filter, string][] = [['pending', '대기'], ['approved', '등록'], ['all', '전체']];

export default async function MembersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin(AI_MEMBERS);
  const account = await getViewerState();
  let members: MemberRow[] | null = null;
  try {
    members = await listMembers();
  } catch (error) {
    console.error('[members] list failed', error);
  }
  const pending = members?.filter((m) => m.status === 'PENDING') ?? [];
  const approved = members?.filter((m) => m.status === 'APPROVED') ?? [];
  const raw = (await searchParams).s;
  const asked = (Array.isArray(raw) ? raw[0] : raw) as Filter | undefined;
  const filter: Filter = asked && FILTERS.some(([f]) => f === asked) ? asked : pending.length > 0 ? 'pending' : 'approved';
  const rows = filter === 'pending' ? pending : filter === 'approved' ? approved : (members ?? []);
  const count = { pending: pending.length, approved: approved.length, all: members?.length ?? 0 };

  return (
    <div className={s.app}>
      <header className={s.dTop}>
        <Link href={AI_MOTION_ADMIN} prefetch={false} className={s.ib} aria-label="프롬프트 목록으로">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <div className={s.crumb}><b>회원 관리</b> · 승인된 교사는 AI활용의 모든 프롬프트를 쓸 수 있습니다</div>
        {account.status === 'signedOut' ? null : <AccountMenu state={account} tone="dark" />}
      </header>
      <main className={s.vMain}>
        <section className={s.box}>
          <div className={s.boxH}><h3>직접 추가</h3><span className={s.hint}>바로 등록 상태가 됩니다</span></div>
          <MemberAddForm />
        </section>
        <nav className={s.sTabs} aria-label="상태">
          {FILTERS.map(([f, label]) => (
            <Link key={f} href={`${AI_MEMBERS}?s=${f}`} prefetch={false} className={f === filter ? s.isOn : ''} aria-current={f === filter ? 'page' : undefined}>
              {label} <b>{count[f]}</b>
            </Link>
          ))}
        </nav>
        {members === null ? (
          <p role="alert" className={s.alert}>회원 목록을 불러오지 못했습니다. <code>DATABASE_URL</code> 과 DB 상태를 확인하세요.</p>
        ) : rows.length === 0 ? (
          <div className={s.empty}>해당하는 회원이 없습니다</div>
        ) : (
          <section className={`${s.box} ${s.vTable}`}>
            <table className={s.table}>
              <thead>
                <tr><th className={s.t}>이름</th><th>소속</th><th>이메일</th><th>상태</th><th>신청일</th><th>처리</th><th><span className="sr-only">동작</span></th></tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} data-testid="member-row" data-status={m.status} data-id={m.id}>
                    <td className={s.t}>
                      <details className={s.edit}>
                        <summary>{m.name}<span className="sr-only"> 수정</span></summary>
                        <form action={updateProfileAction}>
                          <input type="hidden" name="id" value={m.id} />
                          <input name="name" aria-label="이름" required maxLength={30} defaultValue={m.name} />
                          <input name="affiliation" aria-label="소속" required maxLength={50} defaultValue={m.affiliation} />
                          <button type="submit" className={s.vSubmit}>저장</button>
                        </form>
                      </details>
                    </td>
                    <td>{m.affiliation}</td>
                    <td title={m.email}><span className={s.cut}>{m.email}</span></td>
                    <td><span className={`${s.stat} ${m.status === 'PENDING' ? s.isPending : ''}`}>{m.status === 'PENDING' ? '대기' : '등록'}</span></td>
                    <td>{dateFormat.format(m.createdAt)}</td>
                    <td>{m.decidedBy && m.decidedAt ? `${m.decidedBy.split('@')[0]} · ${dateFormat.format(m.decidedAt)}` : ''}</td>
                    <td>
                      <div className={s.rowActs}>
                        {m.status === 'PENDING' ? (
                          <>
                            <form action={approveAction}><input type="hidden" name="id" value={m.id} /><button type="submit" className={s.ok}>승인</button></form>
                            <ConfirmDelete id={m.id} label={m.name} />
                          </>
                        ) : (
                          <form action={suspendAction}><input type="hidden" name="id" value={m.id} /><button type="submit" className={s.del}>대기로 변경</button></form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}
```
In the e2e, 「수정」 is the `<summary>` (its text is the name plus a visually-hidden 「수정」); `row.getByText('수정')` targets the sr-only span — if Playwright refuses because it is visually hidden, click `row.locator('summary')` instead.

- [ ] **Step 6: Run tests**

Run: `npm run check && npm run build:web && E2E_DATABASE_URL='postgres://postgres:postgres@localhost:51214/template1?sslmode=disable' npm -w web run e2e`
Expected: whole suite PASS.

- [ ] **Step 7: Commit**

```bash
git add -A web
git commit -m "feat(ai): 회원 관리 — 대기·등록 탭, 승인·대기로 변경·대기만 삭제, 직접 추가·이름 수정"
```

---

### Task 9: 홈 「AI활용」 섹션

**Files:**
- Create: `web/src/components/sections/AiHub.tsx`
- Delete: `web/src/components/sections/Motion.tsx`
- Modify: `web/src/components/HomePage.tsx`
- Test: `web/e2e/motion.spec.ts` (home tests)

**Interfaces:**
- Consumes: `AI_TABS` (Task 1), `AI_MOTION` (Task 1), `ui.sections.ai`, `ui.ai.intro`, `ui.motion.viewAll` (Task 5), `MotionCard`
- Produces: `<AiHub items ui locale />` rendering `section#ai` with an inner `#motion` anchor.

- [ ] **Step 1: Write the failing e2e**

Replace the first two home tests in `web/e2e/motion.spec.ts`:
```ts
test('home shows the AI활용 section with the motion tab and rendered cards only', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('section#ai');
  await expect(section.getByRole('heading', { level: 2 })).toHaveText('AI활용');
  await expect(section.getByRole('link', { name: '모션그래픽' })).toHaveAttribute('href', '/ai/motion/');
  await expect(section.getByTestId('motion-card')).toHaveCount(2);
  await expect(section.getByRole('link', { name: /전체 보기/ })).toHaveAttribute('href', '/ai/motion/');
  await expect(page.getByRole('navigation', { name: 'primary' }).getByRole('link', { name: 'AI활용' })).toHaveAttribute('href', '/#ai');
});

test('english home labels the section AI Tools and old #motion anchor still lands in it', async ({ page }) => {
  await page.goto('/en/');
  await expect(page.locator('section#ai').getByRole('heading', { level: 2 })).toHaveText('AI Tools');
  await page.goto('/#motion');
  await expect(page.locator('section#ai')).toBeInViewport();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run build:web && npm -w web run e2e -- motion.spec.ts`
Expected: FAIL — no 「모션그래픽」 tab link in the section; `#motion` anchor missing.

- [ ] **Step 3: The section**

`web/src/components/sections/AiHub.tsx`:
```tsx
import Link from 'next/link';
import type { Locale, Ui } from '@me/content';
import { AI_MOTION } from '@/lib/ai-paths';
import { AI_TABS } from '@/lib/ai-tabs';
import type { MotionCardData } from '@/lib/media';
import { Section } from '../Section';
import { MotionCard } from '../motion-gallery/MotionCard';

export function AiHub({ items, ui, locale }: { items: MotionCardData[]; ui: Ui; locale: Locale }) {
  return (
    <Section id="ai" title={ui.sections.ai}>
      {/* 예전 공유 링크 /#motion 이 이 섹션으로 오도록 남겨 둔 앵커 */}
      <span id="motion" aria-hidden className="block scroll-mt-[var(--nav-h)]" />
      <p className="mb-4 text-muted">{ui.ai.intro}</p>
      <ul className="-mx-2 mb-4 flex gap-2 overflow-x-auto px-2 whitespace-nowrap">
        {AI_TABS.map((t, i) => (
          <li key={t.id}>
            <Link href={t.href} className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm whitespace-nowrap ${i === 0 ? 'border-fg bg-fg text-bg' : 'border-line hover:border-accent'}`}>
              {t.label[locale]}
            </Link>
          </li>
        ))}
      </ul>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {items.map((m) => (
          <li key={m.id}>
            <MotionCard item={m} label={locale === 'en' ? m.en : m.name} subtitle={locale === 'en' ? null : undefined} />
          </li>
        ))}
      </ul>
      <Link href={AI_MOTION} className="mt-4 inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm whitespace-nowrap hover:border-accent">
        {ui.motion.viewAll} →
      </Link>
    </Section>
  );
}
```
`HomePage.tsx`: import `AiHub` instead of `Motion`, render `<AiHub items={motions} ui={ui} locale={locale} />`. Delete `sections/Motion.tsx`.

- [ ] **Step 4: Run tests**

Run: `npm run check && npm run build:web && npm -w web run e2e -- motion.spec.ts smoke.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A web
git commit -m "feat(home): 모션 섹션을 AI활용 허브 섹션(탭 + 모션 카드)으로"
```

---

### Task 10: 보안 회귀·반응형 점검·문서

**Files:**
- Modify: `web/e2e/security.spec.ts`
- Modify: `.claude/PROJECT_MAP.md`
- Modify: `.env.example` (comment only, if it mentions viewers)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Extend the leak test**

In `web/e2e/security.spec.ts`, after the existing public-page leak loop add:
```ts
test('guest and pending pages never carry admin data', async ({ browser }) => {
  test.skip(!process.env.E2E_DATABASE_URL, 'DB 필요');
  for (const email of ['stranger@example.com', 'pending2@example.com']) {
    const ctx = await browser.newContext();
    await signInAs(ctx, email);
    for (const p of ['/ai/motion/', '/ai/motion/01-pixel/', '/ai/join/', '/']) {
      const html = await (await ctx.request.get(p)).text();
      expect(html, `${email} ${p}`).not.toContain(MARKER);
      expect(html, `${email} ${p}`).not.toContain('{{Channel name=');
    }
    for (const p of ['/ai/motion/admin/', '/ai/motion/admin/01-pixel/', '/ai/admin/members/']) {
      expect((await ctx.request.get(p, { maxRedirects: 0 })).status(), `${email} ${p}`).toBe(404);
    }
    await ctx.close();
  }
});
```
(Import `signInAs` from `./session` at the top if not already imported. `pending2@example.com` is never modified by other specs.)

- [ ] **Step 2: Full verification**

Run:
```bash
npm run check
npm run build:web
E2E_DATABASE_URL='postgres://postgres:postgres@localhost:51214/template1?sslmode=disable' npm -w web run e2e
```
Expected: check clean; all Playwright tests pass, none skipped.

- [ ] **Step 3: Responsive review**

Dispatch `responsive-ui-reviewer` on: `web/src/components/ai-hub/*.tsx`, `web/src/components/sections/AiHub.tsx`, `web/src/components/Nav.tsx`, `web/src/app/(ko)/ai/**/page.tsx`, the CSS added to `admin.module.css`. Fix real violations (text breaking mid-word, touch targets < 44px, page-level horizontal scroll at 375px). Re-run `npm run check`.

- [ ] **Step 4: Update the project map**

Dispatch `project-map-updater` for `/Volumes/Chois_SD2/dev/my_intoduction` describing: routes moved to `/ai/…` (table from spec §4), 308 rules, `(hub)`/`(app)` groups, `Member` model + migration `20261012010000_member` + manual rollback SQL, `lib/{member-role,member-input,members,access,ai-paths,ai-tabs}.ts` replacing `motion-viewers`/`viewer-input`/`admin-session`, `components/ai-hub/*`, sign-in now allows any verified Google account (permission is per-request role), e2e seeds `viewer@`(APPROVED)/`pending@`(PENDING), new specs `redirects/hub/membership/account`. Also add to its 「남은 일」: 운영에서 다른 Google 계정으로 신청 → 승인 → 사용 → 대기로 변경 확인.

- [ ] **Step 5: Commit**

```bash
git add -A web .claude/PROJECT_MAP.md .env.example
git commit -m "test(ai): guest·pending 유출 검사, 반응형 점검 반영, 프로젝트 지도 갱신"
```

- [ ] **Step 6: Hand back for PR**

Do not push or merge. Report to the user: branch `feat/ai-hub-membership`, commit list, test results, and the production checklist (migration runs on container start; existing viewers stay APPROVED with temporary names to edit in 회원 관리; `/motion/…` → 308).
