# 모션 관리자 화면 열람자(Google 계정) 등록

## 1. 목표
- 관리자(`ADMIN_EMAILS`)가 `/motion/admin/viewers/` 에서 Google 이메일을 등록·삭제하면, 등록된 계정은 Google 로그인 후 `/motion/admin/` 목록·상세(프롬프트·장면표·소리 큐)를 볼 수 있다. 열람자 목록은 Railway PostgreSQL(Prisma 7)에 저장한다.
- 성공 기준
  - 관리자: 기존과 동일하게 전부 접근 + 열람자 관리 화면 접근.
  - 등록된 열람자: 로그인 가능, 목록·상세 열람 가능, `/motion/admin/viewers/` 는 404.
  - 미등록 계정: 로그인 거부(signIn 콜백), 세션 쿠키가 있어도 404.
  - 열람자를 삭제하면 다음 요청부터 즉시 404 (JWT 가 살아 있어도 요청마다 DB 확인).
  - DB 장애 시에도 관리자는 영향 없음(관리자 판정은 환경변수가 먼저, DB 조회 안 함).
  - `npm run check`, `build:web`, e2e(DB 포함), `docker build` 통과. 운영 배포 후 마이그레이션 적용 확인.

## 2. 현재 상태 분석
- `web/src/auth.ts` — NextAuth v5, Google, JWT. signIn 콜백이 `isAdminEmail(user.email, ADMIN_EMAILS)` 로 로그인 자체를 거부.
- `web/src/lib/admin-emails.ts` (+test) — 쉼표 목록 대소문자 무시 비교.
- `web/src/lib/admin-session.ts` — `requireAdmin(callbackPath)`: 세션 없으면 signin 리다이렉트, 관리자 아니면 `notFound()`. `loadMotionAdmin` 이 requireAdmin 후 Volume JSON 읽음.
- `web/src/app/(ko)/motion/admin/layout.tsx` / `page.tsx` / `[id]/page.tsx` — layout 과 각 page(loadMotionAdmin)가 이중 확인.
- `web/src/components/motion-gallery/admin/AdminGallery.tsx` — 목록 머리글(`.top`). `admin.module.css` 어두운 앱 스타일.
- `web/e2e/admin.spec.ts` — `next-auth/jwt` `encode` 로 세션 쿠키를 직접 만들어 검사. `playwright.config.ts` 가 standalone 서버를 env 와 함께 띄움, `scripts/e2e-fixture.ts` 가 Volume 픽스처 생성.
- 배포: `Dockerfile`(build → standalone 만 복사한 런타임), `railway.json`(healthcheck). CI `.github/workflows/ci.yml`(check → build:web → e2e, docker build).
- DB·Prisma 없음. 로컬에 Postgres·docker 없음.

## 3. 변경 계획

### 3-1. 패키지 (web 워크스페이스)
- dependencies: `@prisma/client@7.10.0`, `@prisma/adapter-pg@7.10.0`, `pg`. devDependencies: `prisma@7.10.0`, `@types/pg`.
- 이유: Prisma 7 은 드라이버 어댑터 필수, Rust 엔진 없음 → standalone 에 네이티브 바이너리 불필요.

### 3-2. `web/prisma/schema.prisma`, `web/prisma.config.ts`, 마이그레이션
```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
datasource db { provider = "postgresql" }

model MotionViewer {
  id        Int      @id @default(autoincrement())
  email     String   @unique   // 소문자·trim 저장
  note      String?             // 누구인지 메모(선택)
  addedBy   String              // 등록한 관리자 이메일
  createdAt DateTime @default(now())
}
```
- `prisma.config.ts`: `import type { PrismaConfig } from 'prisma'` 형식의 타입 전용 import + 일반 객체 export(런타임 이미지의 전역 prisma CLI 가 `prisma/config` 를 resolve 못 하는 문제 회피). `datasource.url = process.env.DATABASE_URL ?? ''` (빌드·generate 때 DATABASE_URL 없어도 실패하지 않게). 로컬은 `process.loadEnvFile('.env.local')` 를 파일 있을 때만 호출(dotenv 의존성 없이).
- 첫 마이그레이션 `web/prisma/migrations/<ts>_motion_viewer/` — `prisma migrate dev --create-only` 로 생성(로컬 DB: `npx prisma dev`).
- `.gitignore`: `web/src/generated/`. eslint globalIgnores 에 `src/generated/**`.

### 3-3. `web/package.json` 스크립트
- `prebuild`, `predev`, `typecheck` 에 `prisma generate` 추가(생성물은 커밋하지 않음). `db:migrate`(migrate dev), `db:deploy`(migrate deploy) 추가.
- postinstall 은 쓰지 않는다 — Dockerfile 에서 `npm ci` 시점엔 schema 가 아직 COPY 되지 않음.

### 3-4. `web/src/lib/prisma.ts` (server-only)
- 전역 싱글톤 `new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })`.

### 3-5. `web/src/lib/viewer-email.ts` (+ `viewer-email.test.ts`)
- 순수 함수: `normalizeEmail(raw)` (trim+lowercase), zod `viewerInputSchema = { email: z.email(), note: z.string().max(100).optional() }`.

### 3-6. `web/src/lib/motion-viewers.ts` (server-only)
- `isViewerEmail(email)`, `listViewers()`, `addViewer({email, note, addedBy})`(P2002 → 'duplicate'), `removeViewer(id)`.

### 3-7. `web/src/lib/admin-session.ts`
- `getMotionRole(email): Promise<'admin' | 'viewer' | null>` — `isAdminEmail` 먼저, 아니면 DB.
- `requireViewer(callbackPath)` → role 반환(admin 포함). `requireAdmin` 은 관리자 전용 유지.
- `loadMotionAdmin` 은 `requireViewer` 로 변경하고 `{ role, list }` 반환.

### 3-8. `web/src/auth.ts`
- signIn: `email_verified !== false && (await getMotionRole(email)) !== null`. DB 오류 시 false(로그 남김) — 관리자는 env 판정이 먼저라 영향 없음.
- `auth.ts` → `admin-session.ts` → `auth.ts` 순환 import 가 생기므로 `getMotionRole` 은 별도 파일 `web/src/lib/motion-role.ts` 에 둔다(auth 미의존).

### 3-9. 라우트
- `admin/layout.tsx`: `requireViewer`.
- `admin/page.tsx`: `role` 을 `AdminGallery` 에 `canManage` 로 전달.
- `admin/[id]/page.tsx`: loadMotionAdmin 반환 형태 변경 반영.
- 신규 `admin/viewers/page.tsx`(server): `requireAdmin` → 목록 표 + 추가 폼 + 행별 삭제 폼.
- 신규 `admin/viewers/actions.ts`('use server'): `addViewerAction(prev, formData)`, `removeViewerAction(formData)` — 둘 다 첫 줄에서 `requireAdmin`, zod 검증, `revalidatePath('/motion/admin/viewers/')`. 관리자 이메일 자체를 열람자로 넣으려 하면 안내 메시지.
- 신규 `components/motion-gallery/admin/ViewerForm.tsx`('use client'): `useActionState` 로 오류/성공 메시지 표시.

### 3-10. UI
- `AdminGallery` 머리글: `canManage` 일 때만 「열람자」 링크(`min-h-11`, nowrap).
- 열람자 화면: `admin.module.css` 에 표 스타일 추가 — 래퍼 `overflow-x: auto`, 셀 nowrap, `thead th` sticky + 불투명 배경, 첫 열(이메일) sticky left. 상단 `.top` 에 ← 목록 링크.

### 3-11. 테스트
- vitest: `viewer-email.test.ts`.
- e2e `admin.spec.ts` 확장: viewer@example.com(픽스처 DB 에 등록) 이 상세 프롬프트 열람·`/viewers/` 404, 관리자가 열람자 추가 → 그 계정 열람 가능 → 삭제 → 404. 기존 3개 유지.
- `playwright.config.ts` env 에 `DATABASE_URL: process.env.E2E_DATABASE_URL`. `scripts/e2e-fixture.ts` 에서 `prisma migrate reset --force` 후 viewer 1건 insert(pg 직접).
- CI: `services: postgres:17` + `E2E_DATABASE_URL`.

### 3-12. 배포
- `Dockerfile` 런타임 단계: `npm i -g prisma@7.10.0`, `web/prisma/`·`web/prisma.config.ts` 복사.
- `railway.json` `deploy.preDeployCommand`: `cd web && prisma migrate deploy`.
- Railway: Postgres 서비스 추가(`railway add --database postgres`), my-introduction 에 `DATABASE_URL=${{Postgres.DATABASE_URL}}` 참조 변수. **사용자 확인 후 실행.**
- `.env.example`: `DATABASE_URL`, `E2E_DATABASE_URL`.

### 3-13. 문서
- `.claude/PROJECT_MAP.md`(project-map-updater), 메모리 갱신.

## 4. 의존성 및 영향 범위
- DB 스키마: 신규 테이블 1개(기존 데이터 없음 → 마이그레이션 위험 낮음).
- 인증: signIn 허용 대상 확대. 관리자 판정 로직은 그대로.
- `loadMotionAdmin` 시그니처 변경 → 두 page 수정.
- 빌드·CI·Docker·Railway 설정 변경.

## 5. 위험 요소
- standalone 트레이싱이 Prisma 런타임(wasm 쿼리 컴파일러)·pg 를 빠뜨릴 수 있음 → 로컬 standalone + `prisma dev` DB 로 실제 쿼리 확인.
- 전역 prisma CLI 가 런타임 이미지 크기 증가(수십 MB) — 감수.
- preDeploy 실패 시 배포 중단(기존 컨테이너 유지) — 안전한 방향.
- DB 없는 환경(로컬 dev)에서 비관리자 접근 → 500. 관리자 경로는 무관.
- 로컬 e2e 는 `npx prisma dev` 로 DB 를 띄워야 함 → 문서화.

## 6. 실행 순서
1. 패키지 설치, schema·config, generate, `prisma dev` 로 마이그레이션 생성
2. lib(prisma, viewer-email+test, motion-viewers, motion-role), admin-session, auth
3. 라우트·액션·UI
4. e2e·CI·fixture
5. Dockerfile·railway.json·.env.example
6. check / build / e2e / docker build(로컬 docker 없음 → CI 에서)
7. Railway Postgres 추가(사용자 확인) → push → 배포·마이그레이션 확인 → 운영 시나리오 검증
8. 문서·맵·메모리
