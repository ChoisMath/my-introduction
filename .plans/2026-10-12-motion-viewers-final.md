# 모션 관리자 화면 열람자(Google 계정) 등록 — 최종 계획

초안: `2026-10-12-motion-viewers-draft.md`, 검토: `2026-10-12-motion-viewers-review.md`. 초안 대비 바뀐 곳은 **[변경]** 표시.

## 1. 목표 / 성공 기준
- 관리자(`ADMIN_EMAILS`)가 `/motion/admin/viewers/` 에서 Google 이메일을 등록·삭제. 등록된 계정은 Google 로그인 후 `/motion/admin/` 목록·상세(프롬프트·장면표·소리 큐) 열람. 저장소는 Railway PostgreSQL + Prisma 7.10.0(사용자 선택).
- 관리자: 기존 그대로 + 열람자 관리. 열람자: 열람만, `/viewers/` 는 404. 미등록: 로그인 거부, 쿠키가 있어도 404. 삭제 즉시 다음 요청부터 404.
- **[변경]** DB 장애·Prisma 모듈 로드 실패 시: 관리자 무영향(env 판정 먼저, Prisma 는 비관리자일 때만 동적 import). 비관리자는 fail-closed(404, `console.error`).

## 2. 결정 사항 (검토 반영)
| 검토 항목 | 판단 |
|---|---|
| C1 e2e 가 `.env.local` 의 운영 DB 를 reset 할 위험 | 수용. `E2E_DATABASE_URL` 만 사용, localhost/127.0.0.1 아니면 throw. `migrate reset` 대신 `migrate deploy` + `TRUNCATE` |
| C2 slim 이미지 OpenSSL 없음 → schema-engine 실패 | 수용. 런타임 단계 `apt-get install -y openssl`. CI docker 잡에서 이미지로 `migrate deploy` 실제 실행 |
| preDeployCommand `cd && …` | 수용. `prisma migrate deploy --config web/prisma.config.ts` |
| schema 한 줄 datasource 문법 오류 | 수용 |
| playwright env 타입 | 수용. 값이 있을 때만 spread |
| auth.ts 정적 Prisma import | 수용. `getMotionRole` 안에서 동적 import |
| DB 없으면 e2e 전체 실패 | 수용. 비관리자 DB 오류는 null(404) → 기존 스펙은 DB 없이 통과, 열람자 스펙은 `E2E_DATABASE_URL` 없으면 skip. CI 는 postgres 서비스(health check) |
| Postgres 는 과잉 설계 | **거부** — 사용자가 명시적으로 선택 |
| zod 정규화·`deleteMany`·try 범위·CSRF 확인 | 수용 |
| 첫 마이그레이션 `migrate diff --from-empty` | 수용(로컬 DB 불필요) |
| lib 파일 통합, React `cache()` | 수용 |
| `pg@8.23.1` 고정, guardian·ui-reviewer 호출, 문서 문구 | 수용 |

## 3. 변경 계획

### 3-1. 패키지 (web)
- deps: `@prisma/client@7.10.0`, `@prisma/adapter-pg@7.10.0`, `pg@8.23.1`. devDeps: `prisma@7.10.0`. (`@types/pg` 는 adapter-pg 가 가져옴)

### 3-2. Prisma 파일
- `web/prisma/schema.prisma`: generator `prisma-client`, output `../src/generated/prisma`; datasource 여러 줄; 모델 `MotionViewer { id Int @id @default(autoincrement()), email String @unique, note String?, addedBy String, createdAt DateTime @default(now()) }`.
- `web/prisma.config.ts`: `import type { PrismaConfig } from 'prisma'` + 평범한 객체 `export default {...} satisfies PrismaConfig`. url `process.env.DATABASE_URL ?? ''`. `.env.local` 이 있으면 `process.loadEnvFile`.
- `web/prisma/migrations/<ts>_motion_viewer/migration.sql` + `migration_lock.toml` — `migrate diff --from-empty` 로 생성. 생성 후 **prisma-migration-guardian** 검토.
- `.gitignore` `web/src/generated/`, eslint globalIgnores `src/generated/**`.

### 3-3. `web/package.json` 스크립트
- `predev`/`prebuild`/`typecheck` 에 `prisma generate`. `db:migrate`(migrate dev), `db:deploy`(migrate deploy).

### 3-4. lib
- `web/src/lib/prisma.ts` (server-only): PrismaPg 어댑터 싱글톤.
- `web/src/lib/motion-viewers.ts` (server-only): **[변경]** `viewerInputSchema`(email `z.string().trim().toLowerCase().pipe(z.email())`, note `trim().max(100)` → 빈 값 null), `getMotionRole(email)` = `cache()` 감싼 함수: `isAdminEmail` → 'admin', 아니면 `await import('./prisma')` 로 조회, 오류 시 `console.error` 후 null. `listViewers`, `addViewer`(P2002 → 'duplicate'), `removeViewer`(`deleteMany`).
- `web/src/lib/motion-viewers.test.ts`: 스키마 정규화·거부 케이스(Prisma 미의존 부분만 — 스키마는 순수 파일 `viewer-input.ts` 로 분리할지 구현 시 판단: test 가 server-only/prisma 를 끌어오지 않도록).
- `admin-session.ts`: `requireViewer(path)` → role, `requireAdmin` 은 `getMotionRole === 'admin'`. `loadMotionAdmin` 은 `{ role, list }`.

### 3-5. `web/src/auth.ts`
- signIn: `email_verified !== false && (await getMotionRole(user.email)) !== null`. 주석 "DB 없이 JWT 세션만" 갱신.

### 3-6. 라우트·액션·UI
- `admin/layout.tsx` → `requireViewer`. `admin/page.tsx` → `canManage={role === 'admin'}`. `admin/[id]/page.tsx` → 반환 형태 반영.
- 신규 `admin/viewers/page.tsx`(requireAdmin): 머리글(← 목록), 추가 폼, 표(이메일·메모·등록자·등록일·삭제).
- 신규 `admin/viewers/actions.ts`('use server'): 각 액션 첫 줄 `requireAdmin`(try 밖), `Object.fromEntries(formData)` → zod, 관리자 이메일 등록 시 안내, try 는 DB 호출만 감쌈, `revalidatePath`.
- 신규 `components/motion-gallery/admin/ViewerForm.tsx`('use client', `useActionState`).
- `AdminGallery`: `canManage` 일 때 「열람자」 링크.
- `admin.module.css`: 폼·표(overflow-x auto, nowrap, sticky thead/첫 열, 불투명 배경, 44px 터치 타겟). 완료 후 **responsive-ui-reviewer**.

### 3-7. 테스트·CI
- `scripts/e2e-fixture.ts`: `E2E_DATABASE_URL` 있으면 localhost 가드 → `prisma migrate deploy --config web/prisma.config.ts`(env DATABASE_URL=E2E 값) → `TRUNCATE "MotionViewer"` → `viewer@example.com` insert(pg).
- `playwright.config.ts`: `...(e2eDb ? { DATABASE_URL: e2eDb } : {})`.
- `e2e/admin.spec.ts`: 기존 3개 유지 + (DB 있을 때) 열람자 상세 열람·`/viewers/` 404, 관리자 추가→열람 가능→삭제→404.
- `ci.yml`: check 잡에 `services.postgres`(postgres:17, health check) + `E2E_DATABASE_URL`. docker 잡에 postgres 서비스 + 빌드한 이미지로 `prisma migrate deploy --config web/prisma.config.ts` 실행.

### 3-8. 배포
- `Dockerfile` 런타임: `apt-get install -y --no-install-recommends openssl`, `npm i -g prisma@7.10.0`, `web/prisma/`·`web/prisma.config.ts` 복사.
- `railway.json`: `"preDeployCommand": "prisma migrate deploy --config web/prisma.config.ts"`.
- Railway: Postgres 서비스 추가 + `DATABASE_URL=${{Postgres.DATABASE_URL}}` — **실행 전 사용자 확인**.
- `.env.example`: `DATABASE_URL`, `E2E_DATABASE_URL`.

### 3-9. 문서
- PROJECT_MAP(project-map-updater: "DB 없음" 문구 등), 메모리.

## 4. 영향 범위
- 신규 테이블 1개(기존 데이터 없음). signIn 허용 대상 확대(관리자 판정 불변). `loadMotionAdmin` 반환 변경 → page 2개. 빌드·CI·Docker·Railway 설정.

## 5. 위험
- standalone 트레이싱 누락 → 로컬 `npx prisma dev` DB 로 standalone 서버에서 실제 쿼리 확인(Claude 세션에서 `migrate reset` 은 Prisma 가 막으므로 쓰지 않음).
- Server Action CSRF(Railway 프록시) → 배포 후 운영에서 추가·삭제 확인, 실패 시 `serverActions.allowedOrigins`.
- 런타임 이미지 증가(전역 prisma + openssl) — 감수.

## 6. 실행 순서
1. 패키지·schema·config·generate, `migrate diff` 로 마이그레이션 → guardian
2. lib·테스트·admin-session·auth
3. 라우트·액션·UI → responsive-ui-reviewer
4. fixture·playwright·e2e·CI
5. Dockerfile·railway.json·.env.example
6. `npm run check`, `build:web`, 로컬 `prisma dev` DB 로 e2e 전체
7. 커밋(브랜치) → 사용자 확인 후 Railway Postgres 추가·변수 연결 → main 반영·배포 → 운영 검증(관리자 열람자 추가·삭제, preDeploy 로그)
8. 문서·맵·메모리
