# 리뷰: 모션 관리자 화면 열람자(Google 계정) 등록 계획

대상: `.plans/2026-10-12-motion-viewers-draft.md`
검증 방법: 저장소 파일 직접 열람, scratchpad 에 `prisma@7.10.0 @prisma/client@7.10.0 @prisma/adapter-pg@7.10.0 pg` 임시 설치 후 CLI 실행(`generate`, `validate`, `migrate deploy/status/diff`, `--help`), node_modules 안 next / @auth/core / playwright 소스 확인, Railway 스키마·문서 조회. 로컬에 docker·postgres 가 없어(`which psql postgres docker` → not found) 실제 DB 연결과 컨테이너 실행은 검증하지 못했다.

---

## 계획의 주장 중 확인된 것 (문제 없음)

- `import type { PrismaConfig } from 'prisma'` 사용 가능: `node_modules/prisma/dist/cli/src/types.d.ts:1` 에 `export type { PrismaConfig } from '@prisma/config'` 가 있다. `prisma/config` 경로도 export 된다(`config.d.ts`).
- 타입 전용 import 와 평범한 객체 export 로 된 `prisma.config.ts` 는 근처에 `node_modules` 가 없어도 로드된다. 상위 어디에도 node_modules 가 없는 디렉터리에서 다른 위치의 CLI 로 `migrate deploy` 를 실행해 보니 `Loaded Prisma config from prisma.config.ts.` 가 출력되고 P1001(연결 불가)까지 진행됐다. 전역 CLI 방식의 전제는 맞다.
- `datasource.url = process.env.DATABASE_URL ?? ''` 이면 `generate`·`validate` 는 통과한다. `migrate deploy` 는 `Error: Connection url is empty` 를 내며 명확하게 실패한다.
- CLI 에 `--config` 옵션과 `prisma dev` 가 있다(`prisma dev` 는 v0.16.28 서브커맨드, PGlite 기반, 기본 connectionLimit 10).
- 저장소의 tsconfig(`tsconfig.base.json` + strict + noUncheckedIndexedAccess, TS 6.0.3)로 생성 클라이언트를 import 하는 코드를 `tsc` 로 검사했더니 오류 0건이었다. 생성 파일에는 `// @ts-nocheck` 와 `/* eslint-disable */` 가 들어 있다.
- 쿼리 컴파일러 wasm 은 생성된 `internal/class.ts:48-52` 에서 문자열 리터럴 dynamic import(`@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs`)로 불러온다. `@prisma/client`·`pg`·`prisma` 는 Next 기본 외부 패키지 목록에 들어 있다(`node_modules/next/dist/lib/server-external-packages.jsonc:16,67,80`). 그래서 nft 가 추적할 수 있는 구조이고, 네이티브 쿼리 엔진은 없다.
- next-auth 5.0.0-beta.32 의 signIn 콜백은 async 를 지원한다: `@auth/core/index.d.ts:198` 반환 타입이 `Awaitable<boolean | string>` 이고, `lib/actions/callback/index.js:397` 에서 `await signIn(params)` 를 호출한다.
- postinstall 을 쓰지 않는다는 판단은 맞다. `Dockerfile:4-8` 을 보면 `npm ci` 시점에는 package.json 만 복사되어 있다.
- 순환 import 우려는 실제다. `admin-session.ts:4` 가 `@/auth` 를 import 하므로 `getMotionRole` 을 admin-session 에 두면 순환이 생긴다. 별도 파일로 분리하는 방향이 맞다.
- Server Action 안의 `redirect()`·`notFound()` 는 처리된다(`next/dist/server/app-render/action-handler.js:857-905`). redirect 는 fetch 액션에서 `x-action-redirect` 로, notFound 는 상태 코드와 함께 클라이언트에 전달된다.
- Railway `preDeployCommand` 는 스키마상 `string` 또는 `maxItems: 1` 인 문자열 배열이다(railway.schema.json). pre-deploy 는 애플리케이션 이미지로 만든 별도 컨테이너에서 private network·환경변수를 갖고 실행되고, Volume 은 마운트되지 않으며, 실패하면 배포가 진행되지 않는다(docs.railway.com/guides/pre-deploy-command).

---

## 발견 사항

### [보안 / 부작용] e2e 픽스처의 `migrate reset --force` 가 `.env.local` 의 DB 를 지울 수 있음
- **심각도**: Critical
- **위치**: §3-2(prisma.config.ts 의 `.env.local` 로드), §3-11(playwright env, `scripts/e2e-fixture.ts` 의 `prisma migrate reset --force`)
- **문제**: `playwright.config.ts` 에서 `DATABASE_URL: process.env.E2E_DATABASE_URL` 은 로컬에서 E2E_DATABASE_URL 이 없으면 undefined 가 된다. Node 자식 프로세스 env 는 undefined 값을 무시하므로 픽스처 프로세스에는 DATABASE_URL 이 없다. 그 상태에서 `prisma migrate reset` 이 `prisma.config.ts` 를 로드하면 `process.loadEnvFile('.env.local')` 이 web/.env.local 의 `DATABASE_URL` 을 채운다. 글로벌 규칙(`~/.claude/rules/railway-stack.md` §1)은 `.env.local` 에 Railway 외부 연결 문자열을 넣어 로컬에서 마이그레이션하라고 하고, 계획의 `db:deploy` 스크립트도 같은 용도다. 따라서 `npm run e2e` 한 번이 **운영 열람자 테이블을 reset** 할 수 있는 경로가 생긴다.
- **근거**: `web/playwright.config.ts:15-28`(webServer 가 픽스처를 실행하고 env 를 넘김), 계획 §3-2 "로컬은 `process.loadEnvFile('.env.local')`", §3-11 "`prisma migrate reset --force`". Node `loadEnvFile` 은 이미 있는 변수는 덮어쓰지 않는다. 그래서 E2E_DATABASE_URL 이 있을 때만 안전하다.
- **제안**:
  1. 픽스처는 `E2E_DATABASE_URL` 이 없으면 즉시 종료(throw)하고, 그 값을 명시적으로 `DATABASE_URL` 로 넘긴다. 호스트가 `localhost`/`127.0.0.1` 이거나 DB 이름에 `e2e` 가 들어 있을 때만 진행하는 가드를 둔다.
  2. `migrate reset` 대신 `prisma migrate deploy` 다음에 `TRUNCATE "MotionViewer" RESTART IDENTITY` 를 pg 로 직접 실행한다. 파괴 범위가 테이블 하나로 줄고, 아래 W2(AI 에이전트 가드)도 피한다.
  3. `prisma.config.ts` 에서 `.env.local` 을 읽지 말고 `db:*` 스크립트에서만 `node --env-file-if-exists=.env.local` 이나 `dotenv` 방식으로 주입하는 것도 고려한다.

### [사실 확인 / 배포] 런타임 이미지(node:24-slim)에 OpenSSL 이 없어 `prisma migrate deploy` 가 실패할 가능성이 높음
- **심각도**: Critical (로컬에 docker 가 없어 실행 검증은 못 함. 다만 근거가 강하다)
- **위치**: §3-1 "Rust 엔진 없음 → 네이티브 바이너리 불필요", §3-12 Dockerfile `npm i -g prisma@7.10.0`, §5 위험 요소
- **문제**: Prisma 7 에서 없어진 것은 **쿼리 엔진**이다. **마이그레이션은 여전히 Rust 네이티브 schema-engine 바이너리**로 돌린다. `npm i prisma@7.10.0` 을 하면 `@prisma/engines` postinstall 이 플랫폼별 `schema-engine-*` 를 내려받는다. CLI 는 libssl 버전을 탐지해(ldconfig → `openssl version`) 바이너리를 고른다. node:slim 계열은 libssl/openssl 이 없을 수 있다는 것이 Prisma Docker 가이드의 공식 안내이고, 예시 Dockerfile 도 `apt-get install -y openssl` 을 한다. 계획 §3-1 의 "네이티브 바이너리 불필요"는 standalone 앱 런타임에만 맞고 pre-deploy 컨테이너에는 맞지 않는다.
- **근거**: scratchpad 설치 결과 `node_modules/@prisma/engines/schema-engine-darwin-arm64` 가 생성되고 `@prisma/engines/package.json` 에 `"postinstall": "node scripts/postinstall.js"` 가 있다. `prisma/build/cli.js` 에 libssl 탐지 코드가 있다("Found libssl.so file using ldconfig…", `openssl version -v`, 21회 참조). `migrate deploy` 실행 시 P1001 오류는 네이티브 엔진이 낸 것이다. `Dockerfile:14-18` 런타임 단계는 `node:24-slim` 에 아무 패키지도 설치하지 않는다.
- **제안**:
  - 런타임 단계에 `RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*` 를 `npm i -g prisma@7.10.0` **앞에** 추가한다.
  - CI docker 잡에 검증을 하나 추가한다. postgres service 를 붙이고 `docker run --network host -e DATABASE_URL=… me-chois prisma migrate deploy --config web/prisma.config.ts` 를 실행한다. 이렇게 하지 않으면 이 경로는 운영 첫 배포 때 처음 실행된다.
  - (선택) 전역 설치 대신 빌드 단계의 `node_modules/prisma`·`node_modules/@prisma/*` 를 별도 경로로 COPY 하면 버전이 package-lock 과 어긋나지 않는다. 전역 설치는 `@prisma/dev`·`@prisma/studio-core`·`mysql2`·`postgres` 까지 끌고 온다(`prisma/package.json` dependencies).

### [사실 확인 / 배포] `preDeployCommand: "cd web && prisma migrate deploy"` 는 셸 없이 exec 형식으로 실행되면 실패함
- **심각도**: Warning
- **위치**: §3-12 railway.json
- **문제**: Railway 문서에 따르면 Dockerfile 배포의 start command 는 "exec form" 으로 실행되고 셸 기능을 쓰려면 `/bin/sh -c` 로 감싸야 한다. pre-deploy 문서는 셸 사용 여부를 밝히지 않는다. exec 형식이면 `cd` 는 셸 내장 명령이라 실행 파일이 없고 `&&` 도 해석되지 않는다. 배열 형식은 `maxItems: 1` 이라 `["sh","-c","…"]` 처럼 나눠 쓸 수도 없다.
- **근거**: railway.schema.json `deploy.preDeployCommand` = string | string[](maxItems 1). docs.railway.com/guides/start-command: "commands ran in exec form do not support variable expansion… wrap… `/bin/sh -c`".
- **제안**: `"preDeployCommand": "prisma migrate deploy --config web/prisma.config.ts"` 로 쓴다. cwd 가 `/app` 이어도 동작한다. scratchpad 에서 상위 디렉터리를 cwd 로 두고 `--config web/prisma.config.ts` 를 줬을 때 `web/prisma/schema.prisma` 를 찾고 마이그레이션 경로도 설정 파일 기준으로 풀렸다. 또 메모리에 "railway.json → `.railway/railway.ts` 이전(2026-12-01 전)" 이 남은 일로 기록되어 있으니 같은 작업에서 처리할지 결정한다.

### [사실 확인] 계획의 schema 스니펫 `datasource db { provider = "postgresql" }` 는 문법 오류
- **심각도**: Warning (`generate` 에서 바로 드러나지만 계획대로 옮기면 1단계에서 막힌다)
- **위치**: §3-2 schema.prisma
- **문제**: Prisma 스키마는 블록 안 정의를 한 줄에 쓸 수 없다. 그러면 그 아래 model 줄이 모두 datasource 내부로 해석된다.
- **근거**: scratchpad 에서 그대로 실행하니 `Error code: P1012 … This line is not a valid definition within a datasource.` (Validation Error Count: 7). 여러 줄로 바꾸자 `The schema at prisma/schema.prisma is valid`.
- **제안**:
  ```prisma
  datasource db {
    provider = "postgresql"
  }
  ```

### [실행 순서 / 테스트] Prisma CLI 의 AI 에이전트 가드가 Claude Code 세션의 `migrate reset` 을 막음
- **심각도**: Warning
- **위치**: §3-11 픽스처, §6 단계 6(e2e 실행)
- **문제**: Prisma 7.10 CLI 는 `CLAUDECODE`, `AI_AGENT` 같은 환경변수를 감지하면 `migrate reset`, `db push --force-reset`/`--accept-data-loss` 에서 `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` 없이는 에러를 낸다. 현재 세션 환경에는 `CLAUDECODE=1`, `AI_AGENT=claude-code_…` 가 설정되어 있다. 따라서 Claude 가 로컬에서 `npm run e2e` 를 돌리면 픽스처 단계에서 실패하고 서버가 뜨지 않는다. 동의 변수를 스크립트에 박아 넣으면 가드의 의미가 사라지므로 하면 안 된다.
- **근거**: `prisma/build/cli.js` 의 `WMe="PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION"`, 감지 목록 `Ll("Claude Code","CLAUDECODE")`, reset 확인 직후의 `bS()` 호출. `env` 출력에 `CLAUDECODE=1` 이 있다.
- **제안**: Critical 1 의 제안처럼 `migrate deploy` 와 `TRUNCATE` 로 바꾼다. 그러면 가드 대상이 아니다.

### [타입 안전성] `playwright.config.ts` 의 `DATABASE_URL: process.env.E2E_DATABASE_URL` 은 tsc 오류
- **심각도**: Warning
- **위치**: §3-11
- **문제**: Playwright `webServer.env` 타입은 `{ [key: string]: string }` 이다. `string | undefined` 를 넣으면 strict 모드에서 `Type 'string | undefined' is not assignable to type 'string'` 이 난다. `web/tsconfig.json` 의 include `**/*.ts` 에 playwright.config.ts 도 들어가므로 `npm run check`(typecheck) 가 실패한다.
- **근거**: `node_modules/playwright/types/test.d.ts:11110` `env?: { [key: string]: string; };`, `web/tsconfig.json:16`.
- **제안**: config 상단에서 `const E2E_DB = process.env.E2E_DATABASE_URL; if (!E2E_DB) throw new Error('E2E_DATABASE_URL is required')` 로 좁힌다. 이렇게 하면 Critical 1 의 가드도 함께 해결된다. 또는 `...(E2E_DB ? { DATABASE_URL: E2E_DB } : {})` 형태로 쓴다.

### [부작용] auth.ts 가 Prisma 를 정적으로 import → Prisma 모듈 로드 실패가 관리자 로그인까지 깨뜨림
- **심각도**: Warning
- **위치**: §1 성공 기준 "DB 장애 시에도 관리자는 영향 없음", §3-8
- **문제**: import 체인 `auth.ts → motion-role.ts → motion-viewers.ts → prisma.ts → 생성 클라이언트 + @prisma/adapter-pg` 가 정적이다. DB **연결** 장애는 env 판정이 먼저라 관리자에게 영향이 없다. 하지만 standalone 트레이싱 누락(§5 에서 인정한 위험), wasm 로드 실패, 모듈 초기화 예외처럼 **모듈 로드 단계**에서 나는 실패는 `/api/auth/[...nextauth]` 라우트와 `admin-session` 전체를 500 으로 만든다. 그러면 관리자도 로그인할 수 없다. 즉 성공 기준이 연결 장애에 대해서만 성립한다.
- **근거**: `web/src/app/api/auth/[...nextauth]/route.ts:1` 이 `@/auth` 를 import 하고, `web/src/lib/admin-session.ts:4` 도 `@/auth` 를 import 한다.
- **제안**: `motion-viewers.ts` 에서 `const { prisma } = await import('./prisma')` 처럼 지연 import 하거나 `getPrisma()` 를 지연 생성해서, 관리자 경로가 Prisma 모듈 평가를 전혀 거치지 않게 한다. 그리고 §6 단계 6 에 "standalone 산출물에서 관리자 로그인과 열람자 쿼리를 둘 다 확인"을 명시한다.

### [누락 / 테스트] e2e 전체가 DB 에 의존하게 되는데 로컬 실행 경로가 불명확함
- **심각도**: Warning
- **위치**: §3-11, §5 "로컬 e2e 는 `npx prisma dev`"
- **문제**: 픽스처가 webServer command 안에서 돌기 때문에 DB 가 없으면 smoke·platform·motion·security 스펙까지 **전부** 실패한다. 기존 테스트 `signed-in non-admin gets 404` 도 이제 `other@example.com` 이 DB 조회를 거치므로 DB 가 없으면 404 가 아니라 500 이다(§5 에서도 "DB 없는 환경에서 비관리자 접근 → 500" 이라고 인정). `prisma dev` 는 실행할 때마다 네트워크에서 업데이트를 가져오고("Fetching latest updates for this subcommand...") 별도 프로세스로 계속 떠 있어야 하는데, 계획에는 실행·URL 전달·종료 절차가 없다. CI 쪽 `services: postgres:17` 도 health check 옵션이 없으면 픽스처가 DB 준비 전에 돌 수 있다.
- **근거**: `web/playwright.config.ts:15`, `web/e2e/admin.spec.ts:23-30`, `which psql postgres docker` → 모두 없음.
- **제안**: (a) CI 에 `options: --health-cmd pg_isready --health-interval 5s --health-retries 10` 와 `POSTGRES_PASSWORD`·`POSTGRES_DB=e2e` 를 명시한다. (b) 로컬 절차를 `.env.example`/README 에 적는다: `npx prisma dev -d` → 출력된 TCP URL 을 `E2E_DATABASE_URL` 로 지정 → `npm run e2e` → `prisma dev stop`. (c) 원하면 DB 의존 스펙만 `test.skip(!process.env.E2E_DATABASE_URL)` 으로 분리할 수 있지만, 그러려면 Critical 1 의 throw 가드와 조율해야 한다. 이 프로젝트에서는 "CI 전용, 로컬은 prisma dev 필수"로 정하고 문서화하는 편이 단순하다.

### [실행 순서] Dockerfile·pre-deploy 경로는 운영 배포 전에 한 번도 실행되지 않음
- **심각도**: Warning
- **위치**: §6 단계 6 "docker build(로컬 docker 없음 → CI 에서)", 단계 7
- **문제**: CI docker 잡은 `docker build` 만 한다(`.github/workflows/ci.yml:21-25`). 그래서 런타임 이미지 안의 `prisma` 실행·openssl·config 경로·마이그레이션 적용은 Railway pre-deploy 에서 처음 실행된다. 실패해도 배포가 중단될 뿐이라 안전하긴 하지만, 운영에서 디버깅하게 된다. 또 Railway 가 CI 결과를 기다리지 않고 push 즉시 빌드하는 설정이라면, Postgres 서비스와 `DATABASE_URL` 이 먼저 준비되지 않은 상태에서 pre-deploy 가 `Connection url is empty` 로 실패한다. 계획의 "Postgres 추가 → push" 순서는 맞으므로 이 순서를 반드시 지켜야 한다.
- **근거**: ci.yml:21-25. scratchpad 에서 URL 이 비었을 때 `Error: Connection url is empty. See https://pris.ly/d/config-url`.
- **제안**: CI docker 잡에 postgres service 를 붙이고 `docker run … prisma migrate deploy --config web/prisma.config.ts` 와, 가능하면 `node web/server.js` 를 띄워 `/api/health` 를 확인하는 단계를 추가한다(Critical 2 와 연결).

### [과잉 설계] 이메일 몇 개를 저장하려고 Postgres 서비스·Prisma·전역 CLI·CI DB 를 새로 들임
- **심각도**: Warning (사용자가 Postgres 를 명시적으로 요구한 것이 아니라면)
- **위치**: 계획 전체(§3-1, §3-2, §3-11, §3-12)
- **문제**: 이 프로젝트는 일부러 DB 없이 Volume JSON 으로 운영해 왔다(PROJECT_MAP "DB·Prisma 없음", `private/motion-admin.json` 패턴이 이미 있음). 열람자 수십 건을 위해 늘어나는 것은 Railway Postgres 서비스 비용, 마이그레이션 체계, 런타임 이미지의 전역 CLI·openssl, pre-deploy, CI postgres, e2e DB 픽스처, 로컬 `prisma dev`, 새 lib 파일 4개다. 위 Critical·Warning 대부분이 이 선택에서 나온다.
- **근거**: `web/src/lib/motion-admin.ts`(mtime 캐시가 있는 Volume JSON 읽기), `web/src/lib/volume.ts`(`resolveIn`, `private/` 비공개 경로), `.claude/PROJECT_MAP.md` 개요.
- **제안**: 대안은 Volume `private/motion-viewers.json` 이다. 서버 액션에서 임시 파일에 쓰고 rename 하는 원자적 쓰기를 하고, 서비스가 단일 인스턴스라 경합이 거의 없다. `readMotionAdmin` 과 같은 패턴으로 읽는다. e2e 는 기존 Volume 픽스처에 한 줄만 추가하면 된다. "요청마다 즉시 반영"과 "DB 장애와 관리자 분리" 요구도 그대로 충족된다. 사용자가 앞으로 다른 기능에도 DB 를 쓸 계획이라 Postgres 를 원한 경우에만 현재 계획을 유지하고, 그 결정을 계획서 §1 에 기록한다.

---

### [타입 안전성] FormData → zod 변환 세부
- **심각도**: Suggestion
- **위치**: §3-5, §3-9 actions
- **문제**: `formData.get('note')` 는 필드가 없으면 `null` 을 돌려준다. `z.string().max(100).optional()` 은 null 을 거부한다. 빈 입력은 `''` 로 저장된다. 그리고 email 은 공백이 섞이면 `z.email()` 이 trim 전에 실패한다.
- **제안**: `email: z.string().trim().toLowerCase().pipe(z.email())` 처럼 정규화를 스키마 안에서 하고, `note: z.string().trim().max(100).transform(v => v || null).nullish()` 로 둔다. 입력은 `Object.fromEntries(formData)` 로 파싱한다. 그러면 `normalizeEmail` 별도 함수가 필요 없어진다(조회 쪽 `isViewerEmail` 에서만 같은 정규화를 공유).

### [보안] Server Action 세부
- **심각도**: Suggestion
- **위치**: §3-9 actions
- **문제/제안**:
  - `requireAdmin` 이 던지는 `redirect`/`notFound` 는 `try/catch` 안에 두면 삼켜진다. P2002 처리용 try 는 `addViewer` 호출만 감싸야 한다(action-handler.js:857-905 는 throw 가 바깥까지 전파되는 것을 전제로 한다).
  - `removeViewer(id)` 는 `delete` 대신 `deleteMany({ where: { id } })` 를 쓴다. 두 탭에서 같은 행을 지울 때 P2025 로 500 이 나는 것을 막는다. id 는 `z.coerce.number().int().positive()` 로 검증한다.
  - Server Action CSRF 검사는 `origin` 과 `x-forwarded-host`/`host` 를 비교한다(action-handler.js:347-454). Railway 프록시 뒤에서 처음 쓰는 Server Action 이므로(현재 `'use server'` 사용처 없음) 배포 후 추가·삭제가 실제로 되는지 확인 항목에 넣는다. 안 되면 `experimental.serverActions.allowedOrigins: ['me.chois.pro']` 를 쓴다.

### [사실 확인 / 단순화] signIn 의 "DB 오류 시 false(로그 남김)" 처리는 이미 Auth.js 가 함
- **심각도**: Suggestion
- **위치**: §3-8
- **근거**: `@auth/core/lib/actions/callback/index.js:396-403`. signIn 이 던지면 `AccessDenied` 로 감싸서 로그인을 거부한다. 거부(fail-closed)는 이미 보장되므로 try/catch 는 로그 메시지용으로만 의미가 있다.
- **제안**: try/catch 를 넣는다면 `console.error` 후 `return false` 정도로 짧게 둔다. 넣지 않아도 안전하다.

### [실행 순서 / 단순화] 첫 마이그레이션은 DB 없이 `migrate diff` 로 만들 수 있음
- **심각도**: Suggestion
- **위치**: §3-2, §6 단계 1 "`prisma dev` 로 마이그레이션 생성"
- **근거**: scratchpad 에서 `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` 가 DB 없이 `CREATE TABLE "MotionViewer"`·`CREATE UNIQUE INDEX "MotionViewer_email_key"` SQL 을 출력했다.
- **제안**: `web/prisma/migrations/<ts>_motion_viewer/migration.sql` 과 `migration_lock.toml`(`provider = "postgresql"`)을 이 명령으로 만들면 단계 1 에서 `prisma dev` 가 필요 없다. 출력의 `CREATE SCHEMA IF NOT EXISTS "public";` 은 지워도 된다.

### [과잉 설계] lib 파일 수
- **심각도**: Suggestion
- **위치**: §3-4 ~ §3-8
- **문제**: `prisma.ts`, `viewer-email.ts`, `motion-viewers.ts`, `motion-role.ts` 네 파일이 새로 생긴다. 순환을 피하는 데 필요한 조건은 "auth 에 의존하지 않을 것" 하나뿐이다.
- **제안**: `getMotionRole` 을 `motion-viewers.ts` 에 두면(그 파일도 auth 에 의존하지 않음) `motion-role.ts` 가 필요 없다. 위 zod 제안대로 하면 `viewer-email.ts` 는 스키마 하나만 남는다. layout 과 page 에서 `getMotionRole` 이 두 번 DB 를 조회하는 것은 React `cache()` 로 요청 단위 중복을 없앨 수 있다.

### [누락] 의존성 고정·규칙상 에이전트·기타
- **심각도**: Suggestion
- **문제/제안**:
  - `pg` 버전이 고정되어 있지 않다. 저장소 관례(정확한 버전)를 따라 `pg@8.23.1` 로 고정한다. `@types/pg` 는 `@prisma/adapter-pg@7.10.0` 의 dependencies 에 이미 있으므로(npm view) 직접 추가하지 않아도 된다. 픽스처에서 pg 를 직접 쓴다면 유지해도 무방하다. 참고로 `npm view prisma dist-tags` 의 `latest` 는 `8.0.0-rc.22` 라서 버전 없이 `npm i prisma` 를 하면 8 RC 가 설치된다. 전역 설치에 버전을 고정한 것은 맞다.
  - 글로벌 규칙의 에이전트 호출이 빠져 있다: 마이그레이션 생성·적용 전 `prisma-migration-guardian`, UI(`ViewerForm`, `AdminGallery`, css) 변경 후 `responsive-ui-reviewer`. §6 에 넣는다.
  - `.claude/PROJECT_MAP.md` 개요의 "DB·Prisma 없음", "외부 의존성: DB 없음" 문구, `auth.ts:5` 의 "DB 없이 JWT 세션만" 주석도 갱신 대상이다.
  - `revalidatePath('/motion/admin/viewers/')` 는 force-dynamic 페이지에서 액션 응답에 새 RSC 를 실어 보내는 트리거 역할만 한다. 동작은 문제없다.

---

## 종합 평가

- **평가**: 중
- **Critical**: 2개
  1. e2e 픽스처의 `migrate reset --force` 와 `.env.local` 자동 로드가 결합해 개발·운영 DB 를 reset 할 수 있다.
  2. node:24-slim 런타임에 OpenSSL 이 없어 schema-engine 기반 `migrate deploy`(pre-deploy)가 실패할 가능성이 높다.
- **Warning**: 8개. preDeployCommand 셸 문제, schema 한 줄 datasource 문법 오류, Prisma AI 에이전트 가드, playwright env 타입 오류, auth 의 정적 Prisma import, e2e 의 DB 전면 의존·로컬 절차 부재, 배포 전 이미지 미검증, 과잉 설계.
- **실행 가능 여부**: 지금 상태로는 **조건부 불가**다. 큰 방향(prisma-client generator + adapter-pg + 타입 전용 config + 전역 CLI 의 pre-deploy, 요청마다 DB 재확인, 액션마다 requireAdmin)은 검증 결과 대부분 성립한다. 다만 Critical 2건과 schema·preDeployCommand·playwright 타입 수정을 반영해야 실행할 수 있다. 착수 전에 "Postgres 를 쓸지, Volume JSON 으로 갈지"를 사용자에게 한 번 확인하기를 권한다. Volume JSON 을 택하면 Critical 2건과 Warning 대부분이 함께 사라진다.
