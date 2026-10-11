# 모션그래픽 챕터 + Railway 이전 — 설계

- 작성일: 2026-10-12
- 상태: 설계 승인 대기
- 관련: `docs/superpowers/specs/2026-10-09-my-introduction-design.md` (기존 사이트 설계), `/Volumes/Chois_SD2/dev/motion` (모션 가이드 원천 데이터·렌더)

## 1. 목표와 범위

### 1.1 목표
- 자기소개 사이트 `me.chois.pro` 를 GitHub Pages(정적 export)에서 **Railway(Node.js 서버 + Volume)** 로 옮긴다.
- 「Chois의 바이브코딩」 모션그래픽 인트로를 사이트의 한 챕터로 넣는다: 홈 `#motion` 섹션 + `/motion` 갤러리 + `/motion/[id]` 상세.
- 영상은 저장소가 아니라 **Railway Volume** 에 두고 서버가 스트리밍한다.

### 1.2 공개 범위 (확정)
| 대상 | 공개 | 관리자(본인) |
|---|---|---|
| 직접 렌더한 영상(HyperFrames) + 포스터·미리보기 | ✅ | ✅ |
| 스타일 이름·영문명·용도·컨셉 | ✅ (렌더된 항목만) | ✅ (50개 전체) |
| Chois 프롬프트(EN/KO)·장면표·소리 큐 | ❌ | ✅ |
| 원본 오빠두 영상·원본 프롬프트 | ❌ (저장소·Volume 어디에도 올리지 않음) | ❌ |

근거: Chois 프롬프트·장면표·소리 큐는 오빠두 회원 전용 프롬프트를 바탕으로 재작성한 2차 저작물이라 공개하지 않는다. 원천 자료는 계속 로컬 `motion` 폴더에만 있다.

### 1.3 범위 밖 (YAGNI)
- PostgreSQL/Prisma: 저장할 사용자 데이터가 없어 넣지 않는다. 조회수·수강생 계정이 필요해지면 그때 추가한다.
- 모션 챕터 영어판: `/en/` 홈 섹션만 영문 스타일명을 쓰고, `/motion` 은 한국어만.
- 21–50번 렌더: 이 설계는 렌더가 생기면 재배포 없이 붙는 경로만 만든다.

### 1.4 성공 기준
1. `https://me.chois.pro/` 가 Railway 에서 서빙되고, 기존 URL(`/`, `/en/`, `#섹션`)이 그대로 동작한다.
2. 홈 `#motion` 과 `/motion` 에 렌더된 20개가 보이고, 상세에서 소리 포함 영상이 탐색(seek) 가능하게 재생된다(Range 206).
3. 로그인하지 않은 사람이 받는 HTML·JS 어디에도 프롬프트·장면표·소리 큐 문자열이 없다(자동 검사).
4. `ADMIN_EMAILS` 의 Google 계정으로 로그인하면 `/motion/admin` 에서 50개 전체와 프롬프트 복사 기능을 쓸 수 있다.
5. 새 영상을 `npm run media:push` 하면 재배포 없이 1분 안에 공개 목록에 나타난다.

## 2. 아키텍처

단일 Railway 서비스(Next.js 16 standalone) + Volume 1개. 기존 npm workspaces 모노레포(`content` / `web` / `video`)를 유지한다.

```
브라우저 ──► Next.js (Railway, standalone)
              ├─ 페이지: /, /en/, /motion, /motion/[id]          (ISR)
              ├─ 관리자: /motion/admin, /motion/admin/[id]       (동적, Auth.js)
              ├─ GET  /media/[...path]   ──► Volume /data/media/**  (Range 스트리밍)
              ├─ PUT  /api/media          ◄── 로컬 media:push (Bearer 토큰)
              ├─ GET  /api/media/manifest
              ├─ /api/auth/[...nextauth]  (Google)
              └─ GET  /api/health
로컬 motion 폴더 ──motion:import──► content/motion/public.json (git)
                 ──media:prepare──► .media-out/ (웹용 mp4·preview·poster·manifest·motion-admin.json)
                 ──media:push─────► Volume
```

## 3. 저장소 구조 (추가·변경분)

```
content/
  motion/
    schema.ts          # zod: motionPublicSchema, motionAdminSchema, mediaManifestSchema
    public.json        # 50개 공개 필드 (git 커밋)
    index.ts           # getMotionList(), getMotion(id), MOTION_GROUPS
  index.ts             # motion export 추가
web/src/
  app/(ko)/motion/page.tsx                 # 갤러리 (revalidate 60)
  app/(ko)/motion/[id]/page.tsx            # 상세 (revalidate 60, 미렌더 → notFound)
  app/(ko)/motion/admin/layout.tsx         # 세션 확인
  app/(ko)/motion/admin/page.tsx           # 50개 목록
  app/(ko)/motion/admin/[id]/page.tsx      # 프롬프트·장면표·소리 큐
  app/media/[...path]/route.ts             # Volume 스트리밍
  app/api/media/route.ts                   # 업로드 (PUT)
  app/api/media/manifest/route.ts          # manifest 조회 (GET)
  app/api/auth/[...nextauth]/route.ts
  app/api/health/route.ts
  auth.ts                                  # Auth.js 설정 (Google, ADMIN_EMAILS)
  components/sections/Motion.tsx           # 홈 #motion 섹션
  components/motion-gallery/
    MotionCard.tsx  MotionGrid.tsx  GroupFilter.tsx  MotionPlayer.tsx
    admin/PromptPanel.tsx  admin/ShotTable.tsx  admin/CueTable.tsx  admin/placeholders.ts
  lib/
    volume.ts          # 경로 해석·허용 목록 (server-only)
    media.ts           # manifest 읽기, mediaUrl(id, kind) (server-only)
    motion-admin.ts    # Volume 의 motion-admin.json 읽기 + auth 확인 (server-only)
    range.ts           # Range 헤더 파싱 (순수 함수)
  lib/sections.ts      # SECTION_IDS 에 'motion' 추가 (projects 다음)
scripts/
  motion-import.ts     # motion/data/chois-gallery.json → content/motion/public.json, .media-out/private/motion-admin.json
  media-prepare.sh     # motion/media/chois/<id>.mp4 → .media-out/media/motion/<id>/*
  media-push.ts        # manifest 비교 → 변경 파일만 PUT
railway.json
.github/workflows/ci.yml   # deploy.yml(Pages) 대체
```

`.gitignore` 추가: `.media-out/`, `.local-volume/`.

원천 경로는 환경변수 `MOTION_SRC`(기본 `/Volumes/Chois_SD2/dev/motion`)로 받는다.

## 4. 데이터

### 4.1 스키마 (`content/motion/schema.ts`)
```ts
motionPublicSchema = z.object({
  id: z.string().regex(/^\d{2}-[a-z0-9-]+$/),
  no: z.number().int().min(1).max(50),
  group: z.enum(MOTION_GROUPS),        // 게임·만화 | 종이·공예 | 손그림·노트 | 그림·일러스트 | 포스터·인쇄 | 네온·레트로 컴퓨터 | 입체·3D | 무대·영화 | 한국
  name: z.string(), en: z.string(), use: z.string(), concept: z.string(),
  featured: z.boolean().default(false),
}).strict();                           // 허용 키 외 필드가 있으면 실패 → 프롬프트 혼입 차단

motionAdminSchema = z.object({
  id, prompt: z.string(), ko: z.string(),
  shots: z.array(z.tuple([z.string(), z.string(), z.string()])),
  cues:  z.array(z.tuple([z.string(), z.string(), z.string()])),
}).strict();

mediaManifestSchema = z.record(z.string() /* 상대 경로 */, z.object({
  size: z.number().int(), sha256: z.string().length(64), updatedAt: z.string(),
  duration: z.number().optional(),
}));
```
`rendered` 는 JSON 에 저장하지 않고 런타임에 manifest 로 판정한다(`media/motion/<id>/video.mp4` 존재 여부).

### 4.2 흐름
- `npm run motion:import`: 원천 JSON 을 읽어 공개 필드만 `content/motion/public.json` 에, 관리자 필드는 `.media-out/private/motion-admin.json` 에 쓴다. 원본(오빠두) 데이터·원본 영상은 읽지도 복사하지도 않는다.
- 관리자 데이터는 git 에 들어가지 않고 Volume `private/motion-admin.json` 으로만 배포된다.
- `lib/motion-admin.ts` 는 `import 'server-only'` + 호출 시 `auth()` 재확인 + mtime 기준 메모리 캐시.

## 5. 영상 파이프라인

### 5.1 Volume 레이아웃 (`$RAILWAY_VOLUME_MOUNT_PATH`, Railway 에서는 `/data`)
```
media/motion/<id>/video.mp4     # 1080p H.264 crf 23, AAC 128k, +faststart
media/motion/<id>/preview.mp4   # 640×360, 무음, crf 30
media/motion/<id>/poster.webp   # 9.0 s 프레임 (홀드 화면), 1280×720
media/motion/manifest.json
private/motion-admin.json       # /media 로는 서빙되지 않음
```

### 5.2 준비 — `npm run media:prepare`
- 입력 `$MOTION_SRC/media/chois/<id>.mp4` (현재 평균 27 MB). ffmpeg 으로 위 3종을 만들고 sha256·크기·길이를 `.media-out/media/motion/manifest.json` 에 기록.
- 원본 sha 가 직전 실행과 같으면 건너뛴다.

### 5.3 업로드 — `npm run media:push`
- `MEDIA_PUSH_URL`(로컬 `http://localhost:3000` / 운영 `https://me.chois.pro`), `MEDIA_UPLOAD_TOKEN` 사용.
- `GET /api/media/manifest` 와 로컬 manifest 를 비교해 sha 가 다른 파일만 `PUT /api/media?path=<상대경로>` (헤더 `Authorization: Bearer`, `X-Content-Sha256`). 마지막에 manifest 와 `private/motion-admin.json` 을 올린다.
- 서버:
  - 경로 허용 목록 정규식: `^media/motion/\d{2}-[a-z0-9-]+/(video\.mp4|preview\.mp4|poster\.webp)$`, `^media/motion/manifest\.json$`, `^private/motion-admin\.json$`. `..`·절대경로 거부.
  - 파일당 100 MB 상한, 본문을 임시 파일로 스트리밍하며 sha256 계산 → 헤더와 다르면 422 + 임시 파일 삭제 → 일치하면 `rename` 으로 원자적 교체.
  - JSON 파일은 저장 전에 해당 zod 스키마로 검증.
  - 토큰 비교는 `crypto.timingSafeEqual`.

### 5.4 서빙 — `GET /media/[...path]`
- `media/` 아래만 해석한다(`private/` 불가). 없으면 404.
- `Range` → 206 + `Content-Range`, 형식 오류·범위 밖 → 416. HEAD 지원. `Accept-Ranges: bytes`.
- `fs.createReadStream` → `Readable.toWeb` 로 스트리밍(메모리에 전체 적재 금지).
- URL 은 `?v=<sha256 앞 8자>` 를 붙여 생성하고 `Cache-Control: public, max-age=31536000, immutable`, `ETag: "<sha256>"`.

### 5.5 반영
- `/motion`, `/motion/[id]`, 홈은 `revalidate = 60`. 페이지가 manifest 를 읽어 렌더된 항목만 노출하므로, push 후 재배포 없이 1분 안에 반영된다.

### 5.6 용량
- 20개 ≈ 250 MB, 50개 ≈ 600 MB 예상. Volume 1 GB.

## 6. 화면

공통: `@rules/responsive-ui.md` 준수 — 라벨 `whitespace-nowrap`, 터치 타깃 ≥ 44 px, 모바일 바깥 여백 최소, 표는 래퍼 `overflow-x-auto` + sticky header/첫 열 + 불투명 배경, `100dvh`.

### 6.1 홈 `#motion` 섹션
- 위치: `projects` 다음. Nav 라벨 「모션」(en: "Motion").
- 제목 「바이브코딩 모션그래픽」, 한 줄 소개, 카드 6개(`featured` 우선, 부족하면 번호순으로 렌더된 항목), 「전체 보기 →」.
- 렌더된 항목이 0개면 섹션 자체를 렌더하지 않는다(Nav 항목도 숨김).
- `/en/` 홈에도 동일 섹션: 카드 이름은 `en`, 링크는 `/motion`.

### 6.2 카드 (`MotionCard`)
- 포스터 + 번호·이름·용도. 데스크톱(`(hover: hover)`)은 호버 시 preview.mp4 무음 재생, 모바일은 탭 → 상세.

### 6.3 `/motion`
- 그룹 필터 칩(가로 스크롤) + 그리드 2/3/4열. 번호순. 필터는 쿼리스트링 `?g=` (공유 가능, 클라이언트 필터링).
- 하단에 작은 「관리자」 링크.

### 6.4 `/motion/[id]`
- `<video controls preload="metadata" poster>` 16:9, 기본 음소거 아님(사용자가 재생을 누르므로 소리 포함 재생).
- 이름·영문명·용도·컨셉, 이전/다음(버튼 + ←/→), 목록으로.
- `generateMetadata`: 제목·설명·OG 이미지 = poster.
- 공개 목록에 없는 id → `notFound()`.

### 6.5 `/motion/admin`, `/motion/admin/[id]`
- `dynamic = 'force-dynamic'`. 목록은 50개 + 「렌더됨/대기」 배지.
- 상세: 렌더된 경우 플레이어 + `PromptPanel`(현재 `motion/index.html` 기능 이식) — 탭 프롬프트/장면표/소리 큐, EN/KO, 플레이스홀더 필드(`{{Label=default}}`, `{{?…}}` 기본 켬, `{{-…}}` 기본 끔), 「장면표·소리 큐 포함」 토글(기본 켬) 복사.
- 플레이스홀더 치환 로직은 `admin/placeholders.ts` 순수 함수로 분리해 단위 테스트한다.

## 7. 인증

- Auth.js(NextAuth v5) + Google provider, `session.strategy = 'jwt'`, `trustHost: true`.
- `callbacks.signIn`: 이메일이 `ADMIN_EMAILS`(쉼표 구분, 소문자 비교)에 없으면 거부.
- `callbacks.jwt`/`session`: `role: 'admin'` 주입.
- 검사 지점(각각 독립): `motion/admin/layout.tsx`(미로그인 → 로그인, 비관리자 → 403), 각 admin 페이지, `getMotionAdmin()`. 업로드 API 는 세션이 아니라 `MEDIA_UPLOAD_TOKEN` 만 본다.

## 8. 배포

### 8.1 Next.js
- `output: 'standalone'`, `outputFileTracingRoot: <repo root>`, `trailingSlash: true` 유지, `images.unoptimized` 유지.
- 홈 `(ko)/page.tsx`, `(en)/en/page.tsx`: `revalidate = 86400` (「교직 N년차」 갱신; 연 1회 cron 재빌드 제거).
- 삭제: `web/public/CNAME`, `web/public/.nojekyll`. 기존 `web/public/video/`(17 MB)는 유지.

### 8.2 Railway (`railway.json`)
- build: `npm ci -w content -w web --include-workspace-root && npm run build:web` (video 워크스페이스·Remotion 미설치)
- postbuild: `.next/static`, `public` 을 standalone 으로 복사
- start: `HOSTNAME=0.0.0.0 node web/.next/standalone/web/server.js` (`PORT` 는 Railway 주입)
- healthcheck: `/api/health` — Volume 경로 존재·쓰기 가능 확인
- Volume: `/data`, 1 GB. `main` push 자동 배포, "Wait for CI" 켬.

### 8.3 환경변수
| 키 | 용도 |
|---|---|
| `RAILWAY_VOLUME_MOUNT_PATH` | Volume 경로 (Railway 자동, 로컬은 `./.local-volume`) |
| `PORT` | Railway 자동 |
| `AUTH_SECRET` | Auth.js 서명 |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth |
| `ADMIN_EMAILS` | 관리자 허용 이메일 |
| `MEDIA_UPLOAD_TOKEN` | 업로드 API 토큰 |
로컬 스크립트 전용: `MOTION_SRC`, `MEDIA_PUSH_URL`.

### 8.4 CI
- `.github/workflows/deploy.yml` 삭제 → `ci.yml`: `npm ci` → `npm run check` → `npm run build:web` → e2e.

### 8.5 전환 순서 (무중단)
1. Railway `*.up.railway.app` 에 배포.
2. `media:prepare` → `media:push` 로 영상·관리자 데이터 업로드, 임시 주소에서 전 화면 확인.
3. Google OAuth 리디렉트 URI 에 임시 주소와 `https://me.chois.pro` 등록.
4. Railway 커스텀 도메인 `me.chois.pro` 추가 → DNS CNAME 변경.
5. 새 도메인 HTTPS 확인 후 GitHub Pages 비활성화.

## 9. 오류 처리

| 상황 | 동작 |
|---|---|
| `RAILWAY_VOLUME_MOUNT_PATH` 없음 | 시작 시 `console.error`, `/api/health` 503 → 배포 실패 |
| manifest 없음/스키마 오류 | 공개 목록 0개로 취급: `/motion` 「준비 중」, 홈 섹션 숨김, 에러 로그 |
| 미디어 파일 없음 / 잘못된 Range | 404 / 416 |
| `motion-admin.json` 없음/오류 | 관리자 화면에 「media:push 필요」 안내, 에러 로그 |
| 업로드 | 401 토큰, 400 경로, 413 크기, 422 sha·스키마 불일치(임시 파일 삭제) |
사용자에게 보이는 메시지는 한국어, 로그는 영어.

## 10. 테스트

- **vitest**
  - `content/motion`: public.json 이 `.strict()` 스키마를 통과(프롬프트 키 혼입 시 실패), id·no 유일성.
  - `lib/range.ts`: 정상/열린 범위/접미 범위/범위 밖/형식 오류.
  - `lib/volume.ts`: 허용 경로·`..`·절대경로·`private/` 서빙 차단.
  - `media-push`: manifest 비교(변경·신규·동일).
  - `admin/placeholders.ts`: 3가지 플레이스홀더 치환, 옵션 on/off.
  - `auth`: `ADMIN_EMAILS` 판별(대소문자·공백).
  - 미디어 Route Handler: 임시 디렉터리를 Volume 으로 200/206/416/404, 업로드 401/400/413/422/성공.
- **Playwright e2e** (standalone 서버 + 짧은 테스트 mp4 를 넣은 `.local-volume` 픽스처)
  - 홈 `#motion` 카드 표시, Nav 앵커.
  - `/motion` 카드 수 = 픽스처 manifest 의 렌더 항목 수, 필터 동작.
  - 상세 영상 요청 206.
  - 미로그인 `/motion/admin` → 로그인 페이지로 이동.
  - **유출 검사**: 공개 페이지 HTML 과 `web/.next` 산출물에 관리자 픽스처의 표식 문자열이 없음.
  - 기존 스모크(섹션 8개 → 9개) 갱신.
- `npm run check` 에 위 단위 테스트 포함. UI 작업 후 `responsive-ui-reviewer` 실행.

## 11. 구현 순서 (계획 작성 시 기준)
1. content/motion 스키마·import 스크립트·테스트
2. Next.js standalone 전환 + health + Railway 설정 (기존 페이지 회귀 없음 확인)
3. Volume 라이브러리 + 미디어 서빙/업로드 API + 테스트
4. media:prepare / media:push
5. 공개 화면(섹션·갤러리·상세)
6. Auth.js + 관리자 화면
7. CI·e2e·유출 검사
8. Railway 배포 → 미디어 업로드 → 도메인 전환
