# AI활용 허브 · 교사 가입 신청 설계

- 날짜: 2026-10-12
- 대상 저장소: `/Volumes/Chois_SD2/dev/my_intoduction` (`web` 워크스페이스, Railway 서비스 `my-introduction` + `Postgres`)
- 선행 작업: 모션 챕터(`2026-10-12-motion-chapter-railway-design.md`), 모션 열람자(`.plans/2026-10-12-motion-viewers-final.md`)

## 1. 목적

1. 교사가 사이트에서 스스로 가입을 신청하고(이름·소속 + 본인 Google 계정), 관리자가 승인하면 프롬프트를 쓸 수 있게 한다. 지금은 관리자가 이메일을 직접 등록해야 한다.
2. 회원은 지우지 않고 「대기 ↔ 등록」 상태만 바꿔 필요할 때 다시 쓸 수 있게 한다.
3. 자기소개 사이트의 「모션」을 「AI활용」 허브로 바꾸고, 모션그래픽을 그 안의 첫 탭으로 둔다. 웹디자인 가이드 프롬프트·업무 프롬프트 같은 탭을 같은 규칙으로 덧붙일 수 있게 한다.

### 성공 기준

- 등록되지 않은 교사가 공개 상세에서 「가입 신청」 → Google 로그인 → 이름·소속 제출까지 마치면 관리자 회원 화면에 「대기」로 나타난다.
- 관리자가 「승인」하면 그 교사는 새로고침만으로 프롬프트 복사·편집 화면을 쓸 수 있고, 「대기로 변경」하면 다음 요청부터 바로 못 쓴다.
- 기존 등록 열람자는 배포 후에도 그대로 쓸 수 있다(데이터 보존, 상태 `APPROVED`).
- 예전 `/motion/…` 주소(공유 링크·검색 결과)는 새 `/ai/motion/…` 으로 영구 이동한다.
- 새 탭은 탭 목록 한 곳과 해당 라우트만 추가하면 허브 머리글·탭 줄·홈 섹션에 함께 나타난다.

### 확정된 결정 (사용자 답변)

| 항목 | 결정 |
|---|---|
| 승인 범위 | AI활용 전체 한 번에. 승인된 회원은 지금과 앞으로의 모든 탭을 쓴다 |
| 주소 | `/ai/` 아래로 이전, `/motion/…` 은 308 영구 이동 |
| 상태 | `PENDING`(대기) / `APPROVED`(등록) 두 가지. 승인↔대기는 자유 전환. 삭제는 대기 상태에서만 |
| 허브 화면 | 공통 머리글 + 탭, `/ai/` 는 첫 탭(`/ai/motion/`)으로 바로 이동. 탭은 실제 내용이 있을 때만 |
| 신청 흐름 | Google 로그인 먼저 → 이름·소속 입력 → 제출 시 대기 |

### 범위 밖 (YAGNI)

- 새 신청 알림 메일·메신저(외부 서비스 필요). 허브 머리글의 대기 수 배지로 대신한다.
- 탭별 권한, 거절 상태, 회원 탈퇴 화면, 신청 사유·첨부.
- 웹디자인·업무 프롬프트 탭의 실제 내용(이번엔 확장 구조만).

## 2. 데이터 모델

`MotionViewer` 를 이름을 바꿔 `Member` 로 확장한다(별도 신청 테이블을 두지 않는다 — 한 사람 = 한 행).

```prisma
enum MemberStatus {
  PENDING
  APPROVED
}

// AI활용 회원. 관리자(ADMIN_EMAILS)는 여기 없어도 항상 관리자다.
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

### 마이그레이션 `…_member` (데이터 보존)

손으로 다듬은 SQL 한 개. 순서:

1. `ALTER TABLE "MotionViewer" RENAME TO "Member"`, PK·유니크 인덱스·소문자 CHECK 제약 이름도 `Member_*` 로 바꾼다(CHECK 는 유지).
2. `CREATE TYPE "MemberStatus" AS ENUM ('PENDING','APPROVED')`.
3. 컬럼 추가: `name TEXT`, `affiliation TEXT NOT NULL DEFAULT ''`, `status "MemberStatus" NOT NULL DEFAULT 'PENDING'`, `decidedBy TEXT`, `decidedAt TIMESTAMP(3)`.
4. 기존 행 채우기: `status='APPROVED'`, `name = split_part(email,'@',1)`, `affiliation = COALESCE(note,'')`, `decidedBy = "addedBy"`, `decidedAt = "createdAt"`.
5. `name SET NOT NULL`, `note`·`addedBy` 컬럼 삭제.
6. `CREATE INDEX "Member_status_createdAt_idx"`.

- 기존 행은 모두 `APPROVED` 이므로 배포 직후 기존 열람자의 접근이 끊기지 않는다.
- 실행 전 `prisma-migration-guardian` 에이전트로 검토한다(rename·NOT NULL 추가·컬럼 삭제가 섞인 마이그레이션).
- 롤백: 이 마이그레이션 이전 이미지로 되돌리면 코드가 `MotionViewer` 를 찾아 열람자 기능만 fail-closed(관리자는 env 판정이라 영향 없음). 되돌림 SQL 은 계획 단계에서 함께 적는다.

## 3. 인증·권한

### 역할

요청마다 서버가 하나로 판정한다(`lib/members.ts` `getAccess(email)`, 요청 단위 `cache`).

| 역할 | 조건 | 프롬프트·편집 화면 | 회원 관리 |
|---|---|---|---|
| `admin` | `ADMIN_EMAILS` 에 포함 (DB 보다 먼저) | O | O |
| `member` | `Member.status = APPROVED` | O | X |
| `pending` | `Member.status = PENDING` | X (승인 대기 안내) | X |
| `guest` | 로그인했지만 `Member` 행 없음 | X (가입 신청으로 안내) | X |
| `signedOut` | 세션 없음 | X (로그인 모달) | X |
| `unavailable` | 비관리자인데 DB 조회 실패 | X (잠시 후 다시 시도) | X |

- DB 오류 시 비관리자는 `guest` 가 아니라 **`unavailable`** 로 판정해 「잠시 후 다시 시도」를 보여 준다(신청 폼을 띄우면 중복 신청 오류가 나므로). 권한은 어떤 경우에도 부여하지 않는다(fail-closed).
- 판정은 매 요청 DB 를 읽으므로 대기로 바꾸면 JWT 세션이 남아 있어도 다음 요청부터 막힌다.

### 로그인 (`auth.ts`)

- `signIn` 콜백: `profile.email_verified !== false` 인 Google 계정은 모두 통과(지금은 등록 계정만 통과). 미등록 계정을 막지 않아야 가입 신청을 받을 수 있다.
- 로그인 후 돌아갈 곳(`signInWithGoogle` 의 `redirectTo` 허용 목록): `/ai/` 아래 경로만(`^/ai/(?:[a-z0-9-]+/){0,3}$`). 열린 리다이렉트 방지는 유지.
- `pages.error` → `/ai/signin-error/` (이메일 미확인 계정·OAuth 오류 안내).

### 서버 가드 (`lib/admin-session.ts` 대체 → `lib/access.ts`)

- `requireMember(path)`: admin·member 만, signedOut 은 로그인으로 redirect, 그 외 404 → 지금의 `requireViewer` 자리.
- `requireAdmin(path)`: admin 만, 관리자 이메일 반환 → 그대로.
- `getPromptAccess(id)`: `signedOut | guest | pending | unavailable | allowed(+data)` 를 돌려준다. allowed 일 때만 Volume 의 프롬프트를 읽는다(지금 원칙 유지).
- 모든 Server Action 은 layout 과 별개로 자체 가드를 다시 호출한다.

## 4. 주소와 화면

### 라우트

| 주소 | 파일(`web/src/app/(ko)/ai/…`) | 내용 | 권한 |
|---|---|---|---|
| `/ai/` | `page.tsx` | `redirect('/ai/motion/')` (첫 탭) | 공개 |
| `/ai/motion/` | `motion/page.tsx` | 모션 갤러리(지금 `/motion/`) | 공개 |
| `/ai/motion/[id]/` | `motion/[id]/page.tsx` | 영상 + 프롬프트 복사 | 영상 공개, 프롬프트 admin·member |
| `/ai/motion/admin/`, `/ai/motion/admin/[id]/` | `motion/admin/…` | 지금의 어두운 전체 화면 편집기(목록·빈칸·장면표·소리 큐) | admin·member |
| `/ai/join/` | `join/page.tsx`, `join/actions.ts` | 가입 신청 폼·상태 안내 | 로그인한 누구나 |
| `/ai/admin/members/` | `admin/members/page.tsx`, `actions.ts` | 회원 관리(지금 열람자 화면) | admin |
| `/ai/signin-error/` | `signin-error/page.tsx` | 로그인 오류 안내 | 공개 |

- **영구 이동**: `next.config.ts` `redirects()` 에 `/motion/` → `/ai/motion/`, `/motion/admin/viewers/` → `/ai/admin/members/`, `/motion/signin-error/` → `/ai/signin-error/`, `/motion/:path*` → `/ai/motion/:path*` (308, 앞의 구체 규칙 먼저). 미디어 `/media/…`·`/api/…` 는 그대로.
- 이동은 기존 `/motion/…` 페이지 파일을 지우고 새 위치로 옮겨서 한다(복제하지 않음).
- `sitemap.xml`·`robots.txt`·홈 링크·`metadata` canonical 을 새 주소로 바꾼다. `/ai/join/`, `/ai/admin/…`, `/ai/motion/admin/…`, `/ai/signin-error/` 는 noindex.

### 허브 공통 레이아웃 (`ai/layout.tsx`)

- 머리글: 「AI활용」 + 한 줄 소개(`content/ko/ui.json` `ai.intro`), 오른쪽 계정 버튼 `AccountButton`.
  - signedOut: 「로그인 · 가입 신청」 → 로그인 모달
  - guest: 「가입 신청」 → `/ai/join/`
  - pending: 「승인 대기 중」 배지(누르면 `/ai/join/` 상태 안내)
  - member: 이름 + 「로그아웃」
  - admin: 위에 더해 「회원 관리」 + 대기 수 배지(0 이면 숨김)
- 탭 줄: `lib/ai-tabs.ts` 의 `AI_TABS` 배열(`{ id: 'motion', label: '모션그래픽', href: '/ai/motion/', isEnabled }`)을 그린다. 현재 경로로 활성 탭 표시. 새 탭 = 배열 한 항목 + 라우트 폴더.
- 편집기(`/ai/motion/admin/…`)와 회원 관리 화면은 지금처럼 머리글을 덮는 전체 화면이므로 허브 머리글·탭을 보이지 않는다(라우트 그룹으로 분리하거나 해당 화면이 `fixed inset-0` 을 유지).
- 반응형 규칙(`responsive-ui.md`): 탭·버튼·배지 `whitespace-nowrap`, 탭 줄 가로 스크롤, 터치 타깃 44px.

### 로그인·가입 모달 (`SignInDialog`, 지금 `PromptCopy` 안의 `<dialog>` 를 분리)

- 프롬프트 복사 버튼과 허브 머리글 계정 버튼이 같은 모달을 연다.
- signedOut: 제목 「로그인하여 프롬프트를 복사하세요.」, 안내 「승인된 교사만 프롬프트를 쓸 수 있어요. 처음이면 가입 신청을 해 주세요.」, 버튼 [Google로 로그인] [가입 신청 (교사)] [닫기].
  - 두 버튼 모두 Google 로그인 후 `/ai/join/?from=<현재 경로>` 로 돌아온다. `/ai/join/` 이 역할에 따라 갈라 준다: member·admin 은 즉시 `from` 으로 되돌려 보내고(로그인한 회원은 신청 화면을 보지 않음), guest 는 신청 폼, pending 은 대기 안내. 그래서 미등록 계정이 오류 화면으로 가는 일이 없다.
  - [Google로 로그인]과 [가입 신청]은 문구만 다르고 같은 흐름이다(처음 온 교사가 어느 쪽을 눌러도 신청에 닿는다).
  - `from` 은 `redirectTo` 와 같은 허용 정규식으로 검사하고, 어긋나면 `/ai/motion/`.
- guest: 「아직 가입 신청을 하지 않은 계정입니다.」 + [가입 신청하기] (→ `/ai/join/`) + [다른 Google 계정으로 로그인].
- pending: 「승인 대기 중입니다. 관리자가 확인하면 사용할 수 있어요.」 + 신청한 이름·소속·신청일.
- unavailable: 「잠시 후 다시 시도해 주세요.」
- 기존 `CONTACT_NOTE`(최재혁T 문의)는 보조 문구로 남긴다.

### `/ai/join/` 가입 신청

- 비로그인: Google 로그인 버튼만(돌아올 곳 `/ai/join/`).
- guest: 폼 — 이메일(Google 계정, 읽기 전용 표시), 이름(필수, 1–30자), 소속(필수, 1–50자, 예: 「○○고등학교」). [신청하기] → Server Action `applyAction` → `Member` 행 `PENDING` 생성 → 「신청을 받았습니다」 안내 + `from` 이 있으면 「돌아가기」 링크.
- pending: 상태 안내 + 이름·소속 수정 폼(다시 제출하면 값만 갱신, 상태는 그대로).
- member/admin: `from`(검사 통과 시) 또는 `/ai/motion/` 으로 즉시 redirect.
- 입력 검증: zod(`lib/member-input.ts`), 앞뒤 공백 제거, 제어문자 거부. 이메일은 폼 값이 아니라 **세션의 이메일만** 쓴다(남의 이메일로 신청 불가).
- 남용 방지: 한 계정 = 한 행(`email @unique`)이라 반복 제출은 갱신만 된다. 승인 전에는 아무 권한도 없으므로 별도 속도 제한은 두지 않는다.

### `/ai/admin/members/` 회원 관리

- 상태 탭: [대기 n] [등록 n] [전체], 기본은 대기가 있으면 대기, 없으면 등록.
- 표(지금 `.vTable` 스타일 유지, sticky 머리글·첫 열): 이름 · 소속 · 이메일 · 상태 · 신청일 · 처리(누가/언제) · 동작.
- 동작(각각 Server Action, `requireAdmin` 재확인, `revalidatePath`):
  - 대기 행: [승인] (`APPROVED`, decidedBy/At 기록), [삭제] (확인 `<dialog>` 후 `deleteMany({ where: { id, status: 'PENDING' } })` — 등록 상태는 SQL 조건으로도 못 지움).
  - 등록 행: [대기로 변경] (`PENDING`, decidedBy/At 기록).
  - 행의 이름·소속 [수정] (인라인 폼) — 기존 열람자 임시 이름 채우기용.
- 직접 추가 폼(지금 `ViewerForm` 확장): 이메일·이름·소속 → 바로 `APPROVED`. 이미 있는 이메일이면 오류 대신 「이미 있는 회원입니다(상태: 대기)」 안내.
- 관리자 이메일(`ADMIN_EMAILS`)은 추가 거부(지금 규칙 유지).

### 홈 (`/`, `/en/`)

- `SECTION_IDS` 의 `motion` → `ai`. Nav 라벨 ko 「AI활용」 / en 「AI Tools」.
- `sections/Motion.tsx` → `sections/AiHub.tsx`: 제목 「AI활용」, `AI_TABS` 탭 표시(지금은 모션그래픽 하나), 모션 카드 6개, 「전체 보기 →」 `/ai/motion/`.
- 예전 앵커 `/#motion` 은 페이지 안에서 `#ai` 로 옮겨 주는 작은 스크립트 없이, `id="ai"` 섹션 안에 빈 `<span id="motion">` 을 둬 링크가 계속 맞는 위치로 스크롤되게 한다.

## 5. 코드 구성

| 단위 | 파일 | 역할 |
|---|---|---|
| 회원 저장소 | `lib/members.ts` (`motion-viewers.ts` 대체) | `getAccess`, `listMembers(status?)`, `countPending`, `applyMember`, `approveMember`, `suspendMember`, `deletePendingMember`, `updateMemberProfile`, `addApprovedMember`. Prisma 는 지금처럼 동적 import |
| 입력 검증 | `lib/member-input.ts` (`viewer-input.ts` 대체) | `applySchema`(name, affiliation), `adminAddSchema`(+email), `memberIdSchema` |
| 접근 가드 | `lib/access.ts` (`admin-session.ts` 대체) | `requireMember`, `requireAdmin`, `getPromptAccess`, `getViewerState`(머리글·모달용) |
| 탭 목록 | `lib/ai-tabs.ts` | `AI_TABS` |
| 허브 UI | `components/ai-hub/` | `AiHeader`, `AiTabs`, `AccountButton`, `SignInDialog`, `JoinForm`, `MemberTable`, `MemberAddForm` |
| 모션 UI | `components/motion-gallery/` | 그대로(경로 문자열만 `/ai/motion/` 으로). `PromptCopy` 는 `SignInDialog` 를 쓰도록 축소 |

경로 문자열은 `lib/ai-tabs.ts` 옆 `lib/ai-paths.ts` 의 상수/함수(`aiMotionPath(id)` 등)로 모아 하드코딩을 줄인다.

## 6. 오류 처리

| 상황 | 동작 |
|---|---|
| DB 연결 실패 | 관리자: 회원 관리 화면에 「DB 오류」 표시, 나머지 관리자 기능 정상. 비관리자: `unavailable` → 「잠시 후 다시 시도」, 권한 없음 |
| 마이그레이션 실패 | 지금처럼 서버는 뜨고 `[migrate]` 로그. 회원 기능만 fail-closed |
| 같은 이메일 동시 신청 | 유니크 위반(P2002)을 잡아 「이미 신청한 계정입니다」로 갱신 경로 안내 |
| 이미 처리된 행에 동작(두 탭) | `updateMany`/`deleteMany` + 상태 조건이라 0건이면 조용히 새로고침 |
| 이메일 미확인 Google 계정 | `signIn` false → `/ai/signin-error/` 안내 |
| `redirectTo` 조작 | 허용 정규식 밖이면 `/ai/motion/` |

## 7. 보안

- 프롬프트·장면표·소리 큐는 Volume 에만, allowed 응답에만 실린다(지금 원칙). guest·pending HTML 에도 없어야 한다.
- 신청 이메일은 세션에서만 가져온다. 회원 관리 액션은 모두 `requireAdmin` 재확인 + zod.
- Server Action 은 Next 의 Origin 검사(CSRF)에 기댄다(지금과 같음). 운영에서 실제 동작 확인을 체크리스트에 넣는다.
- 회원 개인정보(이름·소속·이메일)는 관리자 화면에만. 공개 페이지·로그에 이메일을 남기지 않는다(`console.error` 에 이메일 대신 id).

## 8. 테스트

- **vitest**: `member-input`(공백·길이·제어문자), `getAccess` 판정 표(admin env 우선, APPROVED/PENDING/없음/DB 오류), `redirectTo` 허용 정규식, `AI_TABS`/경로 함수.
- **Playwright** (`E2E_DATABASE_URL` 로컬 Postgres, 픽스처는 TRUNCATE + 시드: approved@, pending@):
  - guest 로그인 → 모달 「가입 신청」 → `/ai/join/` 제출 → 대기 안내, 프롬프트 HTML 없음.
  - pending: 상세에서 「승인 대기 중」, `/ai/motion/admin/` 404.
  - admin: 회원 관리에서 승인 → 그 계정으로 프롬프트 복사 성공 → 대기로 변경 → 다시 404.
  - 등록 행엔 삭제 버튼 없음, 대기 행 삭제 확인.
  - `/motion/…` 4종 → 308 `Location` 확인.
  - 홈 `#ai` 섹션·Nav 「AI활용」, 탭 줄, 모바일 375px 가로 스크롤 없음.
  - 기존 `security.spec`·`prompt-copy.spec` 을 새 경로로 옮기고 guest/pending 유출 검사를 추가.
- **수동(운영)**: 실제 다른 Google 계정으로 신청 → 승인 → 사용 → 대기로 변경까지 한 번.

## 9. 배포 순서

1. PR 브랜치에서 마이그레이션 검토(`prisma-migration-guardian`) → CI(check·build·e2e·docker) 통과.
2. `main` 병합 → Railway 빌드 → 컨테이너 시작 시 `prisma migrate deploy` 가 rename·채우기 실행.
3. 운영 확인: 기존 열람자 로그인·복사, `/motion/…` 308, 새 계정 신청·승인.
4. Google OAuth 리디렉션 URI 는 `/api/auth/callback/google` 그대로라 변경 없음.
5. `PROJECT_MAP.md`(라우트·데이터 모델·컴포넌트) 갱신은 `project-map-updater`, UI 변경은 `responsive-ui-reviewer` 로 점검.
