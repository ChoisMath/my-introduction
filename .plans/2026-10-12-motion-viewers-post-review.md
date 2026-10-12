# 모션 열람자 등록 — 사후 검토 (2026-10-12)

대상: `feat/motion-viewers` 작업 트리(미커밋). 기준: `2026-10-12-motion-viewers-final.md`.
읽은 범위: `git diff`(lock 제외, lock 은 제거된 패키지 없음만 확인) + 신규 파일 전부. `web/src/generated/` 는 읽지 않음.

## 요약

- **Critical: 없음.**
- 인가 경로는 계획대로 동작한다. layout(`requireViewer`) 과 각 page(`loadMotionAdmin`/`requireAdmin`) 가 각자 다시 확인하고, Server Action 두 개 모두 첫 줄이 try 밖의 `requireAdmin` 이다. Next 16 action-handler 를 확인해 보니 `notFound()` 는 fetch action 에서 404 와 rejected actionResult 로, `redirect()` 는 `x-action-redirect` 로 처리된다. 어느 쪽이든 액션 본문은 실행되지 않으므로 열람자·미등록자는 관리 액션을 호출할 수 없다.
- 관리자 데이터 유출 경로는 없다. 열람자 목록(`addedBy` 포함)은 `requireAdmin` 뒤에서만 렌더되고, 관리자 UI 의 다른 상태는 localStorage 뿐이다(서버 변경 액션 없음).
- e2e 가 운영 DB 를 건드릴 경로도 사실상 막혀 있다. fixture 는 `E2E_DATABASE_URL` 만 읽고 localhost 가드를 거치며, playwright 는 `DATABASE_URL` 을 항상 덮어쓰고, `.dockerignore` 가 `**/.env*` 를 제외한다.
- 아래 Warning 2건과 Minor 여러 건이 있다.

---

## Warning

### W1. Prisma 7 + adapter-pg 는 연결 타임아웃이 없음 → DB 장애 시 열람자 요청·로그인이 오래 멈출 수 있음
- 파일: `web/src/lib/prisma.ts:9`
- 문제: `new PrismaPg({ connectionString: url })` 는 pg Pool 기본값(`connectionTimeoutMillis: 0`, 무제한)을 그대로 쓴다. Prisma 6 은 기본 5초였지만, Prisma 7 의 driver adapter 는 pg 기본값을 따른다. 계획 §1 의 "비관리자는 fail-closed(404)" 는 DB 오류가 **빨리** 던져진다는 것을 전제한다. 그런데 Railway 내부망에서 DB 재시작이나 네트워크 블랙홀이 생기면 `findUnique` 가 OS TCP 타임아웃(수십 초~2분)까지 매달린다. 그동안 열람자 페이지 요청과 Google `signIn` 콜백이 응답 없이 대기한다. 관리자는 env 판정이 먼저라 영향이 없다.
- 수정안:
  ```ts
  new PrismaClient({ adapter: new PrismaPg({ connectionString: url, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000 }) })
  ```
  필요하면 `statement_timeout`(예: 연결 문자열 `?options=-c%20statement_timeout%3D5000`)도 함께 둔다.

### W2. 실제 Google 로그인 경로(`signIn` 콜백의 async DB 조회)가 어떤 테스트로도 검증되지 않음
- 파일: `web/src/auth.ts:11`, `web/e2e/admin.spec.ts:8-11`
- 문제: e2e 의 `signInAs` 는 JWT 쿠키를 직접 만들어 `signIn` 콜백을 우회한다. 그래서 이번 기능의 핵심인 "등록된 비관리자 Google 계정이 로그인을 통과한다"는 타입으로만 확인된 상태다. 이 경로는 Route Handler 안에서 `cache()` 로 감싼 `getMotionRole` 을 부르고 `./prisma` 를 동적 import 한다. 계획 §6-7 의 운영 검증 항목도 "관리자 열람자 추가·삭제" 뿐이다.
- 수정안:
  1. 운영 검증 체크리스트에 다음 항목을 명시적으로 추가한다.
     - 등록한 **비관리자** Google 계정으로 실제 로그인 → `/motion/admin/01-…/` 열람
     - 삭제 후 같은 브라우저에서 새로고침 → 404
     - 미등록 계정 로그인 → `AccessDenied`
  2. (선택) `signIn` 콜백을 `export async function allowSignIn(user, profile)` 로 분리해 vitest 로 단위 테스트한다. 이때 `getMotionRole` 은 mock 한다.

---

## Minor

### M1. 추가 폼이 오류 응답 뒤에도 입력값을 지움
- 파일: `web/src/components/motion-gallery/admin/ViewerForm.tsx:9`
- 문제: React 19 는 `<form action={fn}>` 의 액션이 정상 반환하면 uncontrolled 폼을 자동으로 reset 한다. 액션이 `{ ok:false }` 를 반환하는 것도 "정상 반환"이다. 그래서 중복·형식 오류·DB 오류 때도 이메일·메모가 비워지고, 사용자가 다시 입력해야 한다. e2e 는 매번 `fill` 하므로 이 문제를 잡지 못한다.
- 수정안: 실패 상태에 입력값을 같이 돌려준다(`{ ok:false, message, values:{ email, note } }`). 입력에는 `defaultValue={state?.ok ? '' : state?.values?.email}` 와 `key={state ? JSON.stringify(state) : 'init'}` 를 준다. 다른 방법은 `onSubmit` 에서 `startTransition(() => action(new FormData(e.currentTarget)))` 로 바꿔 자동 reset 을 피하는 것이다.

### M2. `removeViewerAction` 은 DB 오류가 그대로 throw 됨 (계획 "try 는 DB 호출만 감쌈"과 불일치)
- 파일: `web/src/app/(ko)/motion/admin/viewers/actions.ts:31-37`
- 문제: `removeViewer` 가 실패하면 admin 경로에 `error.tsx` 가 없으므로 Next 기본 오류 화면이 뜬다. 추가 액션과 처리 방식이 다르다.
- 수정안: `try { await removeViewer(id.data) } catch (e) { console.error('[motion-viewers] remove failed', e); return; }` 로 감싼다. 사용자에게 알리려면 삭제 버튼도 `useActionState` 클라이언트 폼으로 바꿔 메시지를 표시한다.

### M3. 열람자·미등록자가 Server Action 을 직접 호출하는 경우의 회귀 테스트 없음
- 파일: `web/e2e/admin.spec.ts:42-55`
- 문제: 지금은 코드상 안전하다(첫 줄 `requireAdmin`). 그러나 나중에 누군가 그 줄을 try 안으로 옮기거나 지우면 잡아낼 테스트가 없다.
- 수정안: 열람자 컨텍스트로 관리자 페이지에서 얻은 액션 ID(`Next-Action` 헤더)를 써서 `POST /motion/admin/viewers/` 를 보내고, 404 와 DB 행 수 불변을 단언한다. 비용이 크면 최소한 `actions.ts` 상단 주석에 "첫 줄 requireAdmin 필수"를 남긴다.

### M4. e2e localhost 가드를 연결 문자열의 `host` 쿼리 파라미터로 우회할 수 있음
- 파일: `scripts/e2e-fixture.ts:37-38`
- 문제: pg/libpq 는 `postgresql://u:p@localhost/db?host=prod.example.com` 처럼 쿼리의 `host` 가 authority 의 호스트를 덮어쓴다. 실수로 이런 URL 이 들어오면 가드를 통과한 뒤 `TRUNCATE` 가 실행된다.
- 수정안: `const u = new URL(dbUrl); if (u.searchParams.has('host') || u.searchParams.has('hostaddr')) throw …;` 를 추가한다.

### M5. `db:migrate`(`prisma migrate dev`) 가 `web/.env.local` 의 `DATABASE_URL` 을 그대로 씀
- 파일: `web/package.json:15`, `web/prisma.config.ts:8`
- 문제: 전역 규칙(railway-stack §1)은 ".env.local 에 Railway public URL 을 넣어 로컬 마이그레이션"하는 관행을 권한다. 그 관행대로 `web/.env.local` 에 운영 URL 을 넣고 `npm run db:migrate` 를 실행하면 운영 DB 에 `migrate dev` 가 돌아간다(drift 시 reset 프롬프트).
- 수정안: `.env.example` 주석에 "DATABASE_URL 은 로컬 `prisma dev` 주소만. 운영 반영은 preDeploy(`migrate deploy`)로만"을 명시한다. 또는 `db:migrate` 를 localhost 가드 스크립트로 감싼다.

### M6. prisma 버전이 두 곳에 고정되어 어긋날 수 있음
- 파일: `Dockerfile:19`, `web/package.json:41`
- 수정안: Dockerfile 에 `ARG PRISMA_VERSION=7.10.0` 을 두고, CI 에서 `web/package.json` 의 `prisma` 버전과 같은지 grep 으로 확인하는 단계를 추가한다(또는 주석으로 동기화 필요를 표시).

### M7. `zod` 가 web 의 런타임 의존인데 루트 devDependencies 에만 있음
- 파일: `web/src/lib/viewer-input.ts:1`, 루트 `package.json`(`zod: 4.6.5`)
- 문제: 지금은 hoisting 과 Docker 빌드 단계의 `--include-workspace-root` 덕분에 동작한다. `content/` 도 같은 방식이라 기존 관행과는 일치한다. 그러나 web 이 Server Action 에서 직접 쓰기 시작했으므로 선언 누락이다.
- 수정안: `web/package.json` dependencies 에 `"zod": "4.6.5"` 를 추가한다(lock 변화 없음).

### M8. `Viewer` 타입을 손으로 정의함 → 스키마 변경 시 어긋날 수 있음
- 파일: `web/src/lib/motion-viewers.ts:6`
- 수정안: `import type { MotionViewer as Viewer } from '@/generated/prisma/client';` 로 바꾼다. 타입 전용 import 라서 런타임 동적 import 설계에는 영향이 없다.

### M9. 마이그레이션에 손으로 넣은 CHECK 제약이 계획·스키마 어디에도 기록되지 않음
- 파일: `web/prisma/migrations/20261012000000_motion_viewer/migration.sql:16-17`
- 문제: 의도는 타당하다(소문자 강제). 하지만 Prisma 는 CHECK 를 스키마로 표현하지 못하므로, 나중에 `schema.prisma` 만 보는 사람은 이 제약을 모른다.
- 수정안: `schema.prisma` 의 `email` 필드 위에 `// DB CHECK: email = lower(email) (migration 20261012000000)` 주석을 추가한다.

### M10. 열람자 표의 sticky thead 가 실제로는 고정되지 않음
- 파일: `web/src/components/motion-gallery/admin/admin.module.css:166`
- 문제: `.vTable { overflow-x:auto }` 때문에 `.vTable` 이 세로 스크롤 컨테이너가 된다(overflow-y 도 auto 로 계산됨). 그런데 높이 제한이 없어서 `thead th { position:sticky; top:0 }` 가 `.vMain` 스크롤에 대해 붙지 않는다. 행이 많을 때만 드러난다. sticky 첫 열(가로)은 정상이다.
- 수정안: `.vTable { overflow:auto; max-height: calc(100dvh - var(--header-h) - 200px); }` 처럼 높이를 제한해 표 자체가 스크롤되게 한다. 또는 행 수가 적다는 전제를 받아들이고 주석으로 남긴다.

### M11. 상태 메시지 접근성·잘림
- 파일: `ViewerForm.tsx:21`, `admin.module.css:164`
- 문제:
  - `role="status"` 요소가 메시지와 동시에 마운트되어 일부 스크린리더가 읽지 않는다.
  - `.vMsg` 는 nowrap 와 ellipsis 라서 좁은 화면에서 긴 이메일이 들어간 중복 메시지가 잘린다.
- 수정안: `<p role="status" className={…}>{state?.message ?? ''}</p>` 처럼 항상 렌더한다. `title={state?.message}` 도 추가한다.

### M12. 계획과 다른 점 (문제 아님, 기록용)
- `playwright.config.ts`: 계획은 "값이 있을 때만 spread"였지만 구현은 `DATABASE_URL: E2E ?? ''` 로 항상 덮어쓴다. 셸에 있는 운영 URL 을 물려받지 않으므로 더 안전하다. 빈 문자열은 `prisma.ts` 에서 throw 되고 null(404)로 이어진다. 유지 권장.
- 테스트 파일 `motion-viewers.test.ts` 대신 순수 모듈 `viewer-input.ts` 와 그 테스트로 분리했다. 계획이 허용한 판단이다.
- 계획 §3-9 (PROJECT_MAP·메모리 갱신)는 아직 하지 않았다. 배포 후 진행한다.

### M13. 커밋 범위 주의
- 미추적 파일 `asset/포산고등학교교표.ai` 는 이번 기능과 무관하다. `git add -A` 로 섞여 들어가지 않게 한다.

---

## 배포 경로 확인 (문제 없음)
- `railway.json` `preDeployCommand` 문자열 형식은 Railway 스키마(string 또는 1개짜리 array)에 맞다. `--config web/prisma.config.ts` 는 WORKDIR `/app` 기준으로 맞는 경로다.
- 런타임 이미지에서는 openssl 설치가 `npm i -g prisma` 보다 먼저 실행되므로, postinstall 엔진 선택이 올바르다.
- `.dockerignore` 의 `**/.env*` 때문에 이미지 안의 `prisma.config.ts` 가 `.env.local` 을 읽을 일은 없다.
- 첫 배포 순서: `DATABASE_URL` 변수 없이 main 에 반영하면 preDeploy 의 `migrate deploy` 가 빈 URL 로 실패한다. Railway 는 이전 배포를 유지하므로 장애는 아니고 배포만 막힌다. 계획 §6-7 순서(변수 연결 → main 반영)를 지키면 된다.
- CI docker 잡은 이미지로 `migrate deploy` 를 실제로 실행한다. 다만 컨테이너 안 standalone 서버의 Prisma 쿼리는 검증하지 않는다. 호스트 standalone e2e 가 이를 대신한다.
