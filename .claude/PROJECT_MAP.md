# Project Map — my-introduction

## 개요
- 목적: 최재혁(포산고 수학교사) 소개 페이지 `me.chois.pro` 와 Remotion 모션그래픽 소개 영상. 웹·영상이 `content/` 의 JSON 을 단일 소스로 공유한다.
- 스택: npm workspaces 모노레포 (Node 24) — `content`(zod 4 스키마 + JSON) / `web`(Next.js 16 App Router, `output: 'standalone'`, React 19, Tailwind 4, motion 14, Prisma 7.10 + Railway PostgreSQL) / `video`(Remotion 4). 소개 영상 맨 앞 10초 스팅은 별도 `video/sting/`(HyperFrames, HTML+GSAP — 워크스페이스 아님, 자체 package.json). 테스트 vitest 5 + Playwright.
- 배포: `main` push → GitHub Actions(`.github/workflows/ci.yml`, check+build+e2e) → Railway 가 `Dockerfile` 로 빌드(video 워크스페이스 제외)·standalone 서버 실행. 헬스체크 `/api/health`(`railway.json` 에 적혀 있지만 **이 서비스에는 railway.json 이 적용되지 않음** — 배포 manifest 의 configFile·healthcheckPath·preDeployCommand 가 비어 있다, 2026-10-12 확인). 도메인 `me.chois.pro`. DB 는 Railway PostgreSQL(서비스 `Postgres`, 2026-10-12 추가) — AI활용 회원(`Member`)만 저장. 모션 영상·관리자 데이터(프롬프트 등)는 여전히 Railway Volume(`RAILWAY_VOLUME_MOUNT_PATH`, 1GB). 마이그레이션은 Dockerfile `CMD` 가 서버 시작 전에 `prisma migrate deploy` 를 실행(실패해도 서버는 뜨고 `[migrate]` 오류 로그만 남김 — 관리자 판정은 DB 무관, 회원 기능만 fail-closed). 소개 영상·이미지 산출물은 CI 가 만들지 않고 커밋한다. (GitHub Pages 배포는 폐지, `deploy.yml` 삭제됨)
- 모션 챕터 설계/계획: `docs/superpowers/specs/2026-10-12-motion-chapter-railway-design.md`, `docs/superpowers/plans/2026-10-12-motion-chapter-railway.md`.
- 모션 열람자 계획(이전 단계): `.plans/2026-10-12-motion-viewers-{draft,review,final,post-review}.md`.
- AI활용 허브·회원제 설계: `docs/superpowers/specs/2026-10-12-ai-hub-membership-design.md` (브랜치 `feat/ai-hub-membership`). **2026-10-19 공개 전환**: 오빠두엑셀의 허락을 받아 AI활용 탭(모션·슬라이드 프롬프트, 브랜드 룩북)을 비로그인 방문자에게도 연다. 로그인·승인신청·회원 관리와 회원 기능(프롬프트 편집기 `/ai/motion/admin/`)은 그대로 — 앞으로 제한이 필요한 페이지에 쓴다.
- AI활용 「슬라이드 디자인」 탭(브랜치 `feat/ai-slide`): spec `docs/superpowers/specs/2026-10-12-ai-slide-design.md`, plan `docs/superpowers/plans/2026-10-12-ai-slide.md`. 학교 상황으로 새로 만든 예시 덱 갤러리 + 스타일 프롬프트 복사(공개).
- AI활용 「브랜드 룩북」 탭(세 번째): oppadu.com 브랜드 룩북(design-systems-site)을 작성자 허락을 받아 그대로 재배포. 누구나 볼 수 있는 iframe(2026-10-19 공개), 콘텐츠는 Volume `private/brand/` 에만(git 미포함).
- 설계/계획 문서: `docs/superpowers/specs/2026-10-09-my-introduction-design.md`, `docs/superpowers/plans/2026-10-09-my-introduction.md`, 약력 초안 `docs/content/profile-draft.md`.

## 폴더 구조
```
.
├── .github/workflows/ci.yml       # check(postgres:17 서비스) → build:web → e2e / docker(기본 CMD 로 컨테이너를 띄워 헬스체크·`Member` 테이블·마이그레이션 행 확인). 배포는 Railway
├── Dockerfile, railway.json       # Railway 빌드(Dockerfile CMD 가 시작 시 migrate deploy). railway.json 은 현재 서비스에 미적용
├── .plans/                        # 작업 계획 문서 (모션 열람자 등)
├── content/                       # @me/content 워크스페이스 (TS 소스 그대로 import)
│   ├── motion/ schema.ts, index.ts, public.json  # 모션 스타일 공개 데이터(커밋) + 관리자 스키마
│   ├── slide/ schema.ts, index.ts, public.json   # 슬라이드 스타일 공개 데이터(커밋, 배열 순서=인기순, .strict()) + 관리자 스키마 (+schema.test.ts)
│   ├── schema.ts                  # zod 스키마·타입 (profile/projects/ui/tokens/narration)
│   ├── index.ts                   # getContent(locale)/getNarration/checkParity/idsOf/tokens
│   ├── stats.ts                   # computeStats (연차·저서·서비스·수상 수)
│   ├── tokens.json                # 디자인 토큰 (색·폰트·radius) — 유일한 수정 지점
│   ├── ko/ {profile,projects,ui,narration}.json
│   ├── en/ {profile,projects,ui}.json      # narration 은 ko 만
│   └── __tests__/                 # 4개 (schema, parity, stats, narration)
├── web/                           # Next.js standalone 서버
│   ├── next.config.ts             # output standalone, trailingSlash, skipTrailingSlashRedirect, transpilePackages @me/content
│   ├── prisma.config.ts           # Prisma 설정 (타입 전용 import + 평범한 객체, .env.local 폴백)
│   ├── prisma/ schema.prisma, migrations/ (2개 + migration_lock.toml), rollback/20261012010000_member.down.sql (수동 롤백)
│   ├── src/generated/prisma/      # prisma generate 산출물 (gitignore, 읽지 말 것)
│   ├── src/app/
│   │   ├── (ko)/ layout.tsx, page.tsx      # /
│   │   ├── (en)/en/ layout.tsx, page.tsx   # /en/
│   │   ├── (ko)/ai/ page.tsx(첫 탭으로 redirect), actions.ts(signInWithGoogle·signOutAction)
│   │   │   ├── (hub)/ layout.tsx(AI활용 헤더: 제목 옆 얇은 탭 모션·슬라이드·브랜드 + 허락 문구·탭별 소개 한 줄 `AiIntro`), motion/{page,[id]/page}.tsx, slide/page.tsx, brand/{page.tsx,site/[[...path]]/route.ts}, join/{page,actions}.tsx, signin-error/page.tsx  # 갤러리·상세(프롬프트 복사)·슬라이드 갤러리·브랜드 룩북(iframe+Volume 서빙)·승인신청·로그인 오류 안내
│   │   │   └── (app)/ motion/admin/{layout,page,[id]/page}.tsx, admin/members/{page,actions}.tsx  # 전체 화면 앱: 프롬프트 편집기·회원 관리
│   │   ├── media/[...path]/route.ts        # Volume 영상 스트리밍(Range)
│   │   ├── api/ health, media (PUT 업로드), media/manifest, auth/[...nextauth]
│   │   ├── globals.css            # Tailwind 진입 + 히어로/표 공용 CSS
│   │   ├── tokens.css             # 생성 파일 (gitignore) ← scripts/gen-tokens-css.ts
│   │   └── icon.png, apple-icon.png        # prepare-assets.sh 가 생성
│   ├── src/components/
│   │   ├── RootShell, Nav, LangToggle, Section, HomePage, HeroVideo, VideoDialog, SiteFooter, LegacyAiAnchor
│   │   ├── motion/  HeroStage, hero-cycle, Typewriter, GridBackground, Reveal, CountUp
│   │   └── sections/ Hero, Stats, Timeline, Pillars, Projects, Books, Lectures, Contact
│   ├── src/components/ai-hub/  AiHeader, AiTabs, SignInButton, SignInDialog, JoinForm, AccountMenu, MemberAddForm, ConfirmDelete, clipboard.ts
│   ├── src/components/motion-gallery/  MotionGallery, MotionCard, KeyNav, PromptCopy, GoogleSignInButton, contact.ts, admin/{AdminGallery,AdminDetail,admin.module.css,admin-list,placeholders}
│   ├── src/components/slide-gallery/  SlideGallery, SlideCard, SlideSortMenu, SlideViewer, SlidePrompt, slide-order.ts, slide-hash.ts (+test 2)
│   ├── src/auth.ts                # NextAuth v5 (Google, signIn 은 검증된(email_verified) 구글 계정이면 통과 — 권한은 요청마다 access.ts, pages.error → /ai/signin-error/)
│   ├── src/lib/  locale, metadata, sections, volume, media, media-serve, media-upload, brand-site, range, motion-admin, slides, admin-emails, prisma, member-role, member-input, members, access, ai-paths, ai-tabs(라벨·href·탭별 intro, `aiTab(id)`), brand-embed(사본 셸 숨김 스타일), log (+ *.test.ts)
│   ├── e2e/ smoke, platform, motion, slide, brand, admin, security, prompt-copy, redirects, hub, membership, account, desktop .spec.ts + session.ts(signInAs·MARKER 공용)  # Playwright (standalone 서버 포트 3100, e2e/.volume 픽스처)
│   └── public/  robots.txt, sitemap.xml, img/, video/
├── video/                         # Remotion
│   ├── remotion.config.ts         # Playwright Chromium 사용, @me/content alias
│   ├── src/Root.tsx               # 컴포지션 등록
│   ├── src/{timeline,plan,loop,format,theme,fonts}.ts (+ *.test.ts 4개)
│   ├── src/compositions/ Intro, HeroLoop, OgImage
│   ├── src/scenes/ Opening, Tagline, Timeline, Pillars, Stats, Projects, Books, Ending
│   ├── src/components/ Grid, Curve, Badge, Clip, MockupCard
│   ├── scripts/copy-font.mjs      # postinstall: Pretendard woff2 → public/fonts (gitignore)
│   ├── public/ img/ (web/public/img 복사본), audio/bgm.mp3, narration/ko/*.wav + manifest.json
│   ├── narration/ref/             # 참조 음성 (gitignore)
│   └── sting/                     # HyperFrames 10초 네오브루탈리즘 스팅 (Remotion 과 별개 프로젝트)
│       ├── index.html             # 단일 컴포지션 1920×1080 30fps 10s. data-composition-variables + #cues JSON
│       ├── audio/ build-soundtrack.mjs, verify-cues.mjs, soundtrack-{ko,en}.wav (코드 합성, 커밋)
│       ├── vars/ ko.json, en.json # 렌더 시 --variables-file 로 넘기는 로케일 텍스트
│       ├── fonts/ Black Han Sans(korean/latin)·Archivo Black woff2 (OFL, @fontsource 복사, 커밋)
│       ├── assets/pictogram.png   # web/public/img/pictogram.png 복사본
│       ├── BRIEF.md, SHOTLIST.md  # 프롬프트→프로젝트 조정 내역 / 샷 리스트·사운드 큐 시트
│       ├── package.json (hyperframes@0.8.145 핀), hyperframes.json, meta.json, CLAUDE.md, AGENTS.md
│       └── node_modules/, snapshots/, renders/   # gitignore
├── scripts/                       # 루트 npm 스크립트 구현 (+ __tests__)
│   ├── motion-import.ts, media-prepare.ts, media-push.ts, media/manifest.ts, e2e-fixture.ts, copy-standalone-assets.mjs  # 모션 챕터
│   ├── slide-import.ts            # 슬라이드 원천(school/) → content/slide/public.json + .media-out (+test)
│   ├── brand-import.ts            # 브랜드 룩북 원천(BRAND_SRC) → .media-out/private/brand/ + manifest (git 미포함)
│   ├── validate-content.ts        # ko/en id 패리티 검사
│   ├── gen-tokens-css.ts          # tokens.json → web/src/app/tokens.css (@theme)
│   ├── prepare-assets.sh          # asset/ → web/public/img (+ video/public/img rsync)
│   ├── render-video.sh            # 스팅 렌더 → Remotion 본편 렌더 → 스팅 이어붙임 → web/public/video, og.png, 포스터
│   ├── render-sting.sh            # 사운드트랙 합성·큐 검증 → hyperframes render → video/out/sting-{ko,en}.mp4
│   └── narrate.ts                 # narration.json → Qwen3-TTS wav + manifest
├── asset/                         # 원본 이미지 (증명사진·픽토그램·표지 3·목업 5) — asset/README.md
├── docs/                          # 설계·계획·약력 초안
├── vitest.config.ts, tsconfig.base.json, package.json
```

## 주요 엔드포인트 / 라우트
홈 두 페이지는 `HomePage` 가 섹션 8개를 렌더한다(홈 `#ai` 섹션은 2026-10-13 제거 — AI활용은 Nav 마지막 항목·Contact 링크로 `/ai/` 이동). 모션 라우트는 Volume 을 읽으므로 `force-dynamic`.

| 경로 | 파일 | 설명 |
|---|---|---|
| `/` | `web/src/app/(ko)/page.tsx` | 한국어 홈 (`RootShell locale="ko"`) |
| `/en/` | `web/src/app/(en)/en/page.tsx` | 영어 홈. `LangToggle` 이 현재 `#hash` 를 유지한 채 전환 |
| `/ai/` | `web/src/app/(ko)/ai/page.tsx` | `AI_TABS[0]`(모션그래픽 탭)으로 redirect |
| `/ai/motion/` | `.../ai/(hub)/motion/page.tsx` | (hub) 그룹 — AI활용 헤더+탭. 모션 갤러리(그룹 필터 `?g=`) |
| `/ai/motion/[id]/` | `.../ai/(hub)/motion/[id]/page.tsx` | 상세(영상·키보드 좌우 이동, 1280px 이상 2단: 영상 왼쪽·정보 오른쪽 sticky). 렌더 안 된 id 는 404. 「프롬프트 복사 (영문)」「(국문)」 — 프롬프트는 누구에게나 props 로 실음(`readMotionAdmin` + `finalPrompt`, 2026-10-19 공개). 「빈칸 편집·장면표」→ `/ai/motion/admin/<id>/` 링크만 `isMember(getViewerState())` 일 때 |
| `/ai/slide/` | `.../ai/(hub)/slide/page.tsx` | 슬라이드 갤러리(`force-dynamic`, Volume manifest 에 그림이 다 있는 덱만). 분류 칩 `?f=`, 정렬 `?s=pop\|no\|new`(기본 pop=배열 순서), 표지/본문 `?v=body`, 상세 창은 `#<id>` 해시(별도 상세 라우트 없음). 프롬프트는 `readSlideAdmin` 으로 누구에게나 props 로 실음(2026-10-19 공개) |
| `/ai/brand/` | `.../ai/(hub)/brand/page.tsx` | 브랜드 룩북. 누구나(2026-10-19 공개) iframe(`data-testid=brand-frame`, 높이 `calc(100dvh - nav - footer)`)으로 `/ai/brand/site/` 를 띄움. 사본이라 noindex, robots.txt `Disallow: /ai/brand/` 유지 |
| `GET /ai/brand/site/[[...path]]` | `.../ai/(hub)/brand/site/[[...path]]/route.ts` | 권한 확인 없이(2026-10-19 공개) Volume `private/brand/<rel>` 을 `serveBrandFile` 로 응답. `.html` 에는 `brand-embed.ts` 의 덮어쓰기 `<style>` 을 `</head>` 앞에 끼워 사본의 허브 셸(`.aih-side`·`.aih-mnav`·`.aihx-crumb`·목록의 `.otl-band--content`)을 숨기고 필터·결과만 남김(사본 파일은 그대로)(Cache-Control private, X-Robots-Tag noindex). 허용 rel 은 `volume.ts` `isBrandFile` |
| `/ai/join/` | `.../ai/(hub)/join/{page,actions}.tsx` | 승인신청(이름·소속). Server Action `applyAction` → PENDING 생성/갱신 |
| `/ai/signin-error/` | `.../ai/(hub)/signin-error/page.tsx` | auth.ts `pages.error` 안내, noindex |
| `/ai/motion/admin/`, `/ai/motion/admin/[id]/` | `.../ai/(app)/motion/admin/` | (app) 전체 화면 어두운 앱. `requireMember` — 관리자(`ADMIN_EMAILS`) 또는 승인 회원. 프롬프트·장면표·소리 큐. 목록 머리글 「회원 관리」 링크는 관리자만 |
| `/ai/admin/members/` | `.../ai/(app)/admin/members/{page,actions}.tsx` | 관리자만(`requireAdmin`). 회원 목록·대기 승인·보류·대기 삭제·추가·이름/소속 수정 — Server Actions `approveAction`/`suspendAction`/`deleteAction`/`addMemberAction`/`updateProfileAction` |
| `/motion/…` (옛 경로) | `web/next.config.ts` `redirects()` | 308 → `/ai/motion/…`, `/motion/admin/viewers` → `/ai/admin/members/`, `/motion/signin-error` → `/ai/signin-error/` (슬래시 유무 모두) |
| `GET/HEAD /media/[...path]` | `web/src/app/media/[...path]/route.ts` | `media/motion/<id>/(video.mp4\|preview.mp4\|poster.webp)`, `media/slide/<id>/[s/\|t/]<k>.webp` 만 Range 스트리밍(`volume.ts` `SERVABLE`). 그 외 404 |
| `PUT /api/media?path=` | `web/src/app/api/media/route.ts` | `MEDIA_UPLOAD_TOKEN` Bearer. 같은 허용 경로만 |
| `GET /api/media/manifest` | `.../api/media/manifest/route.ts` | 토큰. Volume 파일 해시 목록(media:push 가 차이만 업로드). `?set=slide` 면 `media/slide/manifest.json`, `?set=brand` 면 `private/brand/manifest.json` |
| `/api/health` | `.../api/health/route.ts` | Railway 헬스체크 |
| `/api/auth/[...nextauth]` | `.../api/auth/[...nextauth]/route.ts` | NextAuth v5 Google |
| `#hero #stats #timeline #pillars #projects #books #lectures #contact` | `web/src/lib/sections.ts` `SECTION_IDS` | Nav 앵커·e2e 검증 기준. 옛 `/#ai`·`/#motion`(`/en/` 포함)은 `LegacyAiAnchor` 가 클라이언트에서 `/ai/` 로 보냄 |

정적 파일: `/video/intro-{ko,en}.mp4`(소개 영상 = 10초 스팅 + Remotion 본편, VideoDialog), `/video/hero-loop.{mp4,webm}` + `/video/hero-poster.jpg`(히어로 배경), `/img/og.png`(OG 1200×630), `/img/{photo,pictogram}.webp`, `/img/logo.webp`(Nav 로고, 픽토그램 얼굴 96px 정사각 crop → CSS 원형), `/img/books/*.webp`, `/img/projects/*.webp`.

Remotion 컴포지션 (`video/src/Root.tsx`, 1920×1080 30fps):

| ID | 컴포넌트 | 길이 | 비고 |
|---|---|---|---|
| `Intro-ko` / `Intro-en` | `compositions/Intro.tsx` | `buildPlan(locale)` 씬 합 (ko 약 82초) | props `{locale, bgm}`; 8개 씬 Sequence + BGM 페이드 |
| `HeroLoop` | `compositions/HeroLoop.tsx` | `HERO_LOOP_DURATION` = 20초 | Opening(6s, 이름 없음) + Timeline(14s, minimal) + 흰 베일 루프 |
| `OgImage` | `compositions/OgImage.tsx` | Still 1200×630 | 공유 이미지 |

HyperFrames 스팅 (`video/sting/index.html`, 1920×1080 30fps 10s): 변수 `name/role/url/card1–4/formula/tape/run/soundtrack` 를 `<html data-composition-variables>` 에 선언하고 `vars/{ko,en}.json` 으로 덮어씀(en 은 `soundtrack` 변수로 wav 도 교체). `<script id="cues" type="application/json">` 이 영상·오디오 큐의 단일 소스(126 BPM 16분음표 격자, 초 단위) — `audio/build-soundtrack.mjs` 가 이 블록을 regex 로 읽어 외부 음원 없이 음악·효과음을 합성해 `audio/soundtrack-{ko,en}.wav`(48kHz 16bit 스테레오)를 만들고, `audio/verify-cues.mjs` 가 각 큐 ±1프레임 온셋을 검증한다.

## 데이터 모델 (Prisma — `web/prisma/schema.prisma`)
`prisma-client` generator → `web/src/generated/prisma`(gitignore, web `predev`/`prebuild`/`typecheck` 가 `prisma generate`). 런타임은 `@prisma/adapter-pg`.

| 모델 | 관계 | 주요 필드 | 비고 |
|---|---|---|---|
| `Member` | 없음 (enum `MemberStatus` PENDING·APPROVED) | id, email(unique, 소문자), name, affiliation, status(기본 PENDING), createdAt, decidedBy?, decidedAt? · 인덱스 (status, createdAt) | AI활용 회원. 관리자(`ADMIN_EMAILS`)는 행이 없어도 관리자. email 소문자 CHECK 는 `migration.sql` 에만. 마이그레이션 2개: `20261012000000_motion_viewer`, `20261012010000_member`(MotionViewer→Member 데이터 보존, 기존 열람자는 APPROVED·이름은 이메일 앞부분 임시값). 수동 롤백 `web/prisma/rollback/20261012010000_member.down.sql` |

## 데이터 모델 (content 워크스페이스 — `content/schema.ts`)
zod 스키마로 검증되는 JSON. `getContent(locale)` 이 파싱·캐시, `npm run content:validate` 가 ko/en id 패리티를 검사.

| 스키마 | 파일 | 주요 필드 | 비고 |
|---|---|---|---|
| `profileSchema` | `{ko,en}/profile.json` | name, tagline, intro, affiliation, role, `since`(YYYY-MM), photo, pictogram, links{email,github,sites[]} | 연차 계산 기준 `since` 는 ko/en 동일해야 함 |
| ↳ `timelineItemSchema[]` | profile.education / career / awards / groups / materials / lecturesTeacher / lecturesStudent | id, period, title, org?, detail?, `kind`(edu·career·award·cert·group·material·lecture-teacher·lecture-student), highlight? | ko 기준 2/6/6/13/3/6/4건. `highlight` 는 영상·히어로 배지용 |
| ↳ `bookSchema[]` | profile.books | id, title, role, year, isbn(13자리), publisher?, url, cover(`/img/`) | 3권 |
| ↳ `pillarSchema[]` | profile.pillars | id, title, summary, items(1–4) | 정확히 3개 (teach·train·build) |
| `projectsSchema` | `{ko,en}/projects.json` | id, name, tagline, description?, stack[], url?, urlNote?, youtubeId?, mockup(`/img/projects/`) | 5개: choisnote·choisclass·posanmeal·selfstudy·mathcoach |
| `uiSchema` | `{ko,en}/ui.json` | siteTitle, siteDescription, nav, hero, stats(`lecturesValue`="다수"), sections, projects, lectures, contact, lang, footer | 모든 UI 문구 |
| `tokensSchema` | `tokens.json` | color(12개 hex), font{sans,mono}, radius{card} | → `tokens.css` `@theme` 변수 (`--color-*`, `--font-*`, `--radius-card`) |
| `narrationSchema` | `ko/narration.json` | opening, tagline, timeline{id→문장}, pillars, projects{id→문장}, ending | ko 전용. 키는 `narrationKeys()` 로 `timeline.car-2012` 식 클립 키가 됨 |
| `Stats` | `stats.ts` | years, books, services, awards | 강의 수는 숫자 대신 `ui.stats.lecturesValue` |
| `motionPublicSchema` | `content/motion/schema.ts` + `public.json`(커밋) | id(`NN-slug`), no, group(9개 `MOTION_GROUPS`), name, en, use, concept, featured | `.strict()` — 관리자 필드가 섞이면 파싱 실패. 렌더된 id 만 `getRenderedMotions()` 가 노출 |
| `motionAdminSchema` | Volume `private/motion-admin.json` (**git 에 없음**) | id, prompt, ko, shots[[시간,장면,이유]], cues[[시각,소리,이벤트]] | 관리자 페이지 전용. `motion:import` 가 `.media-out/` 에 만들고 업로드 |
| `slidePublicSchema` | `content/slide/schema.ts` + `public.json`(커밋) | id(2–3자리 원천 번호), no, family(7종 `SLIDE_FAMILIES`), name, look, use, topic, slides(1–12), cover, body(대표 장 번호), added(YYYY-MM-DD) | `.strict()`. 배열 순서 = 인기순(`getSlideList()` 는 정렬 안 함). 그림이 다 올라간 덱만 `getRenderedSlides()` 가 노출 |
| `slideAdminSchema` | Volume `private/slide-admin.json` (**git 에 없음**) | [{id, prompt}] | `slide:import` 가 `.media-out/` 에 만들고 `media:push -- --set slide` 로 업로드 |
| `mediaManifestSchema` | Volume `media/motion/manifest.json` | 경로 → {size, sha256, updatedAt} | `media:prepare` 산출, 서버 `/api/media/manifest` 가 diff 기준으로 제공 |
| Volume 구조 | `$RAILWAY_VOLUME_MOUNT_PATH` | `media/motion/<id>/{video.mp4,preview.mp4,poster.webp}`, `media/motion/manifest.json`, `private/motion-admin.json` · `media/slide/<id>/{k}.webp`(1376×768), `s/{k}.webp`(172×96 장 넘김 썸네일), `t/{k}.webp`(760×424, 표지·본문 장만 카드용), `media/slide/manifest.json`, `private/slide-admin.json` · `private/brand/`(`BRAND_DIR`) — `index.html`, `brand/<slug>.html`, `assets/{app,ai-hub-static,shell}.js`, `assets/{app,ai-hub,shell,tokens}.css`, `assets/fonts/PretendardVariable.woff2`, `data/brands-index.json`, `data/{hero,detail}/<slug>.json`, `private/brand/manifest.json`(`BRAND_MANIFEST_PATH`) | `/media/*` 는 `SERVABLE` 패턴(모션 3파일·슬라이드 webp)만 공개, manifest·`private/` 는 절대 서빙 안 함. 단 `private/brand/` 는 `/ai/brand/site/` 가 누구에게나 `isBrandFile` 허용 경로만 서빙(2026-10-19 공개) |
| `Manifest` | `video/public/narration/ko/manifest.json` | key → {text, duration} | narrate.ts 산출물. 씬 길이 계산 입력 |

## 주요 컴포넌트·유틸
| 이름 | 파일 | 역할 |
|---|---|---|
| `RootShell` | `web/src/components/RootShell.tsx` | html/body, 폰트 import, Nav + main. footer 는 렌더하지 않음(페이지별 `SiteFooter`) |
| `HomePage` | `web/src/components/HomePage.tsx` | 서버 컴포넌트. getContent + computeStats → 섹션 8개 + `LegacyAiAnchor` + `SiteFooter`(`ui.footer`). 모션 데이터는 읽지 않음 |
| `Nav` | `web/src/components/Nav.tsx` | `max-w-site` + `gutter`(2026-10-19 데스크탑 폭 체계). `SECTION_IDS`(hero 제외) 앵커 + 마지막 항목 AI활용(`ui.nav.ai`) → `/ai/`(`AI_HOME`), 로그인 여부와 무관하게 항상 링크(2026-10-19 공개; 홈 연락 섹션의 `contact-ai` 도 같음). 우측 상단은 비로그인이면 `SignInButton`(「로그인 · 승인신청」, `ui.ai.signIn`), 로그인하면 계정 메뉴 |
| `Contact` | `web/src/components/sections/Contact.tsx` | 연락처 + AI활용 링크(`/ai/`, 라벨은 `ui.nav.ai` 하나 — 탭 이름은 나열하지 않음). 비로그인이면 비활성 span. `isSignedIn` prop(HomePage 가 `getViewerState` 로 판정) |
| `SiteFooter` | `web/src/components/SiteFooter.tsx` | 화면 바닥 고정 footer(높이 `--footer-h`, globals.css) + 같은 높이 spacer. 문구가 달라 페이지별로 렌더: 홈은 `ui.footer`, `ai/(hub)/layout.tsx` 는 oppadu.com/ai 2차 저작물 고지(링크). (app) 전체 화면 앱은 없음 |
| `LegacyAiAnchor` | `web/src/components/LegacyAiAnchor.tsx` | 'use client'. 해시 `#ai`/`#motion` 이면 `location.replace('/ai/')` — 해시는 서버로 안 가서 `redirects()` 로 못 잡음 |
| `Section` | `web/src/components/Section.tsx` | 섹션 래퍼 (id, title, dark, `width: site \| wide`, `gutter`, nav 높이 scroll-mt). 히어로만 이 래퍼를 쓰지 않는다 |
| `Hero` | `web/src/components/sections/Hero.tsx` | `HeroStage` 안에 Typewriter 3줄(소속·이름·태그라인) + 픽토그램 + VideoDialog |
| `HeroStage` | `web/src/components/motion/HeroStage.tsx` | 히어로 20초 주기 제공자. GridBackground + HeroVideo 렌더, 영상 `onLoop` 로 주기 재동기화 |
| `hero-cycle.ts` | `web/src/components/motion/hero-cycle.ts` | `HERO_CYCLE_MS=20000`, `HeroCycleContext`, `useHeroCycle` |
| `Typewriter` | `web/src/components/motion/Typewriter.tsx` | 주기마다 반복되는 타자기 효과. 전체 글자는 항상 DOM 에 두고 미입력분만 투명 |
| `GridBackground` | `web/src/components/motion/GridBackground.tsx` | SVG 격자 + 상단 띠 곡선(`.hero-curve`) 그리기/지우기 |
| `HeroVideo` | `web/src/components/HeroVideo.tsx` | 데스크톱 자동재생/모바일 탭 후 로드, `onLoop` 콜백 |
| `VideoDialog` | `web/src/components/VideoDialog.tsx` | `<dialog>` 소개 영상, 바깥 클릭 닫기 |
| `Reveal`, `CountUp` | `web/src/components/motion/` | 스크롤 진입 페이드/카운트업 (reduced-motion 대응) |
| `Lectures` | `web/src/components/sections/Lectures.tsx` | 클라이언트 탭(교사/학생) + `.data-table` sticky 표 |
| `locale.ts` | `web/src/lib/locale.ts` | `localePath`, `otherLocale`, `toggleHref` |
| `metadata.ts` | `web/src/lib/metadata.ts` | `SITE_URL`, `buildMetadata(locale)` (canonical/hreflang/OG) |
| `member-role.ts` | `web/src/lib/member-role.ts` (+test) | `MemberRole`(admin·member·pending·guest·unavailable), `resolveRole`, `canUsePrompts`, `normalizeEmail` |
| `members.ts` | `web/src/lib/members.ts` | Member 저장소: `lookupMember`/`listMembers`/`countPending`/`applyMember`/`setMemberStatus`/`deletePendingMember`/`updateMemberProfile`/`addApprovedMember` |
| `member-input.ts` | `web/src/lib/member-input.ts` (+test) | zod `applySchema`·`adminAddSchema`·`memberIdSchema` (이메일 trim·소문자) |
| `access.ts` | `web/src/lib/access.ts` | 요청별 권한. `getAccess`(env `ADMIN_EMAILS` 먼저 → admin, 아니면 DB 조회, DB 오류는 `unavailable` = fail-closed), `requireMember`/`requireAdmin`(미로그인 redirect, 권한 없음 404), `loadMotionAdmin`, `getViewerState`(헤더·계정 메뉴용), `isMember(state)`(공개 상세가 편집기 링크를 보일지). 탭 게이트 함수(`getPromptAccess`·`getSlidePromptAccess`·`getBrandAccess`)는 2026-10-19 공개 전환으로 삭제 |
| `ai-paths.ts` | `web/src/lib/ai-paths.ts` (+test) | `/ai/…` 경로 상수(`AI_BRAND='/ai/brand/'`, `AI_BRAND_SITE='/ai/brand/site/'` 포함)와 `aiMotionPath`/`aiMotionAdminPath`, `safeReturnPath`(`/ai/…` 와 홈 `/`·`/en/` 만)·`joinPath`·`signOutReturnPath`(open redirect 방지) |
| `ai-tabs.ts` | `web/src/lib/ai-tabs.ts` (+test) | `AI_TABS`(motion·slide·brand 순) — 새 허브 탭은 여기 한 항목 + `(hub)/<id>/` 라우트 추가 |
| `log.ts` | `web/src/lib/log.ts` (+test) | `errorTag` — 오류를 태그로만 로그(이메일 등 개인정보 미기록) |
| `slides.ts` | `web/src/lib/slides.ts` (+test) | server-only. `slideRel`, `renderedSlides`/`getRenderedSlides`(manifest 기준 `?v=sha8` 붙은 URL, 빠진 그림 있는 덱 제외), `readSlideAdmin`(mtime 캐시) |
| `brand-site.ts` | `web/src/lib/brand-site.ts` | `serveBrandFile(root, rel)` — Volume `private/brand/` 파일 응답(Cache-Control private, X-Robots-Tag noindex) |
| `isBrandFile`, `BRAND_DIR`, `BRAND_MANIFEST_PATH` | `web/src/lib/volume.ts` (+test) | 브랜드 허용 rel 경로 regex / `private/brand/` / `private/brand/manifest.json`. `isUploadablePath` 가 이 경로들을 허용, `media-upload` 가 brand manifest 검증 |
| `buildBrandManifest` | `scripts/media/manifest.ts` | `brand:import` 가 쓰는 brand 세트 manifest 생성 |
| `SlideGallery` | `web/src/components/slide-gallery/SlideGallery.tsx` | 'use client'. URL(`?f=&s=&v=`)이 거르기·정렬·보기의 유일한 상태, 해시로 `SlideViewer` 열기 |
| `SlideCard`, `SlideSortMenu` | `web/src/components/slide-gallery/` | 카드(표지/본문 `t/` 이미지) / 정렬 메뉴(인기·번호·최신) |
| `SlideViewer`, `SlidePrompt` | `web/src/components/slide-gallery/` | 상세 창(장·스타일 넘김, 썸네일 띠) / 프롬프트 복사(`prompts` 맵에서 꺼냄, 없으면 「프롬프트 데이터 준비 중」) |
| `slide-order.ts`, `slide-hash.ts` | `web/src/components/slide-gallery/` (+test) | `parseQuery`·`toSearch`·`arrange`·`pickOrder`·`stepSlide`·`stepStyle` / `useHashId`(useSyncExternalStore)·`setHashId`(replaceState + 자체 이벤트) |
| `clipboard.ts` | `web/src/components/ai-hub/clipboard.ts` | `writeClipboard` — clipboard API 실패 시 textarea 폴백. PromptCopy·SlidePrompt 공용 |
| `PromptCopy` | `web/src/components/motion-gallery/PromptCopy.tsx` | 'use client'. 복사 버튼 2개(영문·국문) — 받은 en/ko 를 바로 복사(누구나). `canEdit` 이면 「빈칸 편집·장면표」 링크. 로그인 모달(`SignInDialog`)은 이제 Nav 의 `SignInButton` 에서만 연다 |
| `GoogleSignInButton` | `web/src/components/motion-gallery/GoogleSignInButton.tsx` | Server Action `app/(ko)/ai/actions.ts` `signInWithGoogle` 호출 — `signIn('google', {redirectTo})`, 돌아갈 곳은 `safeReturnPath` 로 `/ai/…`·홈만 허용 |
| `contact.ts` | `web/src/components/motion-gallery/contact.ts` | `CONTACT_NOTE` 문의 안내 문구 |
| `placeholders.ts` | `web/src/components/motion-gallery/admin/placeholders.ts` | `finalPrompt(data, locale, PromptState)` — 관리자 상세 복사와 공개 상세 복사(`{values:{},toggles:{},withTables:true}` = 빈칸 기본값 + 장면표·소리 큐)가 공유 |
| `prisma.ts` | `web/src/lib/prisma.ts` | PrismaClient 싱글턴(adapter-pg). `DATABASE_URL` 없으면 throw, 연결 대기 5초 |
| `AiHeader`, `AiTabs` | `web/src/components/ai-hub/` | (hub) 레이아웃의 AI활용 머리글과 탭(로그인 버튼은 사이트 Nav 로 옮김, 머리글엔 관리자 대기 배지만) |
| `SignInButton`, `SignInDialog` | `web/src/components/ai-hub/` | 로그인 버튼(사이트 Nav 우측 상단, 비로그인 시)/모달(대기·guest 안내 포함) |
| `JoinForm` | `web/src/components/ai-hub/JoinForm.tsx` | 승인신청 폼(`useActionState` + `applyAction`) |
| `AccountMenu` | `web/src/components/ai-hub/AccountMenu.tsx` | 계정 칩+메뉴+로그아웃. 사이트 Nav 와 편집기·회원 관리 바(dark tone)에서 공용 |
| `MemberAddForm`, `ConfirmDelete` | `web/src/components/ai-hub/` | 관리자 회원 추가 폼 / 삭제 확인 |
| `timeline.ts` | `video/src/timeline.ts` | FPS/WIDTH/HEIGHT, `buildScenes`(manifest 길이 기반), `timelineSchedule`, `projectSchedule`, `HERO_LOOP_DURATION` |
| `plan.ts` | `video/src/plan.ts` | `buildPlan(locale)` → scenes, careerIds(대본에 있는 경력만), clip(key) 경로 |
| `loop.ts` | `video/src/loop.ts` | `loopVeil` — 루프 경계 흰 베일 (0.5s in / 0.7s out) |
| `Curve`, `Grid` | `video/src/components/` | `CURVE`(본편) / `CURVE_TOP`(히어로 루프 상단 띠), 격자 |
| `Clip` | `video/src/components/Clip.tsx` | 내레이션 Audio Sequence (클립 없으면 렌더 안 함) |

## 외부 의존성
- 외부 서비스: Railway(호스팅·Volume·PostgreSQL), Google OAuth(관리자·회원 로그인, next-auth 5.0.0-beta.32).
- 서버 환경변수: `RAILWAY_VOLUME_MOUNT_PATH`(절대경로), `PORT`(Railway 자동), `AUTH_SECRET`, `AUTH_URL`(운영 `https://me.chois.pro`), `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ADMIN_EMAILS`(쉼표 구분), `MEDIA_UPLOAD_TOKEN`, `DATABASE_URL`(운영은 Railway 참조 `${{Postgres.DATABASE_URL}}`, 로컬은 `web/.env.local`). 예시는 루트 `.env.example`.
- 스크립트 전용: `MOTION_SRC`(motion 폴더, motion:import), `SLIDE_SRC`(슬라이드 원천, slide:import — 기본 `/Volumes/Chois_SD2/dev/motion/slide/school`), `BRAND_SRC`(브랜드 룩북 원천, brand:import — 기본 `/Volumes/Chois_SD2/dev/motion/brand`), `MEDIA_PUSH_URL`(+`MEDIA_UPLOAD_TOKEN`, media:push), `E2E_DATABASE_URL`(e2e 전용, localhost 만 허용, 실행마다 `Member` TRUNCATE 후 `viewer@`(APPROVED)·`pending@`(PENDING, admin.spec 이 변경)·`pending2@`(PENDING, 읽기 전용) 시드. 없으면 회원 e2e skip. Playwright 서버의 `DATABASE_URL` 은 항상 이 값으로 덮어씀).
- `scripts/narrate.ts` 만 선택적으로 사용:

| 키 | 용도 | 기본값 |
|---|---|---|
| `MLX_TTS` | mlx-audio TTS 실행 파일 | `/Volumes/Chois_SD2/venvs/mlx-audio/bin/mlx_audio.tts.generate` |
| `TTS_MODEL` | Qwen3-TTS 모델 | `mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16` |

- 로컬 도구: `cwebp`(brew webp), `pdftoppm`(poppler, slide:import), `sips`, `ffmpeg`/`ffprobe`, Playwright Chromium(`npx playwright install chromium`), mlx-audio venv.
- 주요 패키지: next 16.4 / react 19.2 / motion 14 / prisma·@prisma/client·@prisma/adapter-pg 7.10.0 / pg 8.23 / tailwindcss 4.3 / remotion 4.0.534 / zod 4.6 / vitest 5 / @playwright/test 1.64 / pretendard, @fontsource-variable/jetbrains-mono. `video/sting/package.json`(별도): hyperframes 0.8.145 핀, devDeps `@fontsource/black-han-sans`, `@fontsource/archivo-black`.
- 외부 자원: 배경음악 CC0 "Calm Ambient 3" (cynicmusic) — `video/public/audio/README.md`.

## 명령 (루트 `package.json`)
| 명령 | 역할 |
|---|---|
| `npm run check` | content:validate + vitest + web lint + web/video typecheck (CI 와 동일) |
| `npm run dev` / `build:web` | 웹 개발/standalone 빌드 (`predev`/`prebuild` 가 tokens.css 생성) |
| `npm run e2e` | standalone 서버(3100, `web/e2e/.volume` 픽스처 = `scripts/e2e-fixture.ts`)로 Playwright — `build:web` 선행 필요 |
| `npm start` | standalone 서버 실행 (`RAILWAY_VOLUME_MOUNT_PATH` 절대경로 필요) |
| `npm -w web run db:migrate` / `db:deploy` | `prisma migrate dev` / `prisma migrate deploy`. 로컬 DB 는 `npx prisma dev -n motion-e2e --detach` (TCP `postgres://postgres:postgres@localhost:51214/template1?sslmode=disable`). Claude 세션에서는 Prisma 가 `migrate reset` 을 막으므로 픽스처는 migrate deploy + TRUNCATE |
| `npm run motion:import` | motion 폴더 → `content/motion/public.json`(커밋) + `.media-out/` 관리자 데이터 |
| `npm run media:prepare` | 렌더 mp4 → 웹용 video/preview/poster 인코딩 + manifest |
| `npm run slide:import` | 원천 `/Volumes/Chois_SD2/dev/motion/slide/school/` 의 `manifest.json` + `<id>/deck.pdf` + `prompt.txt` → `content/slide/public.json`(커밋) + `.media-out/`(webp 3종·manifest·`private/slide-admin.json`). `deck.pdf` 없는 덱은 건너뜀. env `SLIDE_SRC` |
| `npm run brand:import` | `BRAND_SRC`(기본 `/Volumes/Chois_SD2/dev/motion/brand`, 그 폴더 `build.cjs` 산출물) → `.media-out/private/brand/`(881파일 ≈ 44MB) + manifest(`buildBrandManifest`). index.html 의 형제 링크 2개(`../index.html`, `../slide/index.html`)만 oppadu 원본 URL 로 되돌리고, 각 html 에 교차 출처 링크를 새 탭으로 여는 작은 클릭 스크립트를 주입(원본 사이트는 iframe 에 안 뜸) |
| `npm run media:push` | manifest diff 로 바뀐 파일만 `PUT /api/media` 업로드 (재배포 불필요). `-- --set slide` 면 슬라이드 세트, `-- --set brand` 면 브랜드 룩북(admin 파일 없음)(기본 motion) |
| `npm run assets` | asset/ → web/public/img, video/public/img, 파비콘 |
| `npm run narrate` | 대본 → wav + manifest (변경된 키만 재생성) |
| `npm run render` | `render:sting` → Intro-{ko,en} 을 `out/intro-*-body.mp4` 로 렌더 → `prepend_sting`(ffmpeg concat 필터 재인코딩, crf 23, aac 160k)으로 `out/intro-{ko,en}.mp4` → HeroLoop(mp4/webm)·OgImage·포스터(2s 프레임) → web/public, 용량 상한 검사. `SKIP_STING=1` 이면 기존 `out/sting-*.mp4` 재사용 |
| `npm run render:sting` | `video/sting` 사운드트랙 합성+큐 검증 후 `npx hyperframes render` → `video/out/sting-{ko,en}.mp4` |
| `npm run video:studio` | Remotion 스튜디오 |

## 운영 현황 (Railway, 2026-10-12)
- 프로젝트 `me_chois` / 서비스 `my-introduction` + `Postgres`(2026-10-12 추가) / 환경 `production`. Volume `/data`. 커스텀 도메인 `me.chois.pro` 가 이미 Railway 를 가리킨다(DNS 전환 완료, 응답 헤더 `server: railway-hikari`).
- 환경변수 8개 설정 완료: `ADMIN_EMAILS`, `DATABASE_URL`(`${{Postgres.DATABASE_URL}}` 참조), `AUTH_URL=https://me.chois.pro`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `MEDIA_UPLOAD_TOKEN`(뒤 둘은 `openssl rand` 로 생성 — 값은 Railway 에만 있음), `RAILWAY_VOLUME_MOUNT_PATH`(자동).
- **`AUTH_URL` 필수**: standalone 서버가 `HOSTNAME=0.0.0.0`·`PORT=8080` 으로 떠서, 없으면 Auth.js 가 로그인·콜백 URL 을 `https://0.0.0.0:8080/...` 로 만든다(2026-10-12 실제 장애). 도메인을 바꾸면 이 값과 Google 리디렉션 URI 를 함께 바꾼다.
- Railway CLI 링크: 이 폴더를 위 서비스에 연결해 둠(`railway status`). `AUTH_SECRET` 은 바꾸면 관리자 세션이 모두 풀린다.
- Volume 내용: 모션 01–50 전부 영상·미리보기·포스터(manifest 150파일, 약 299 MB / Volume 1 GB) + `private/motion-admin.json`(50개). 운영 확인: `/ai/motion/` 카드 50, 홈 `#ai` 카드 6, 영상 Range 206, `/media/private/...` 404, 공개 HTML 에 프롬프트 0건. (홈 `#ai` 섹션은 2026-10-13 제거)
- 슬라이드 원천: `/Volumes/Chois_SD2/dev/motion/slide/` 는 오빠두엑셀 스크랩(개인 참고용, **공개 배포 금지** — 코드·문구·이미지를 이 저장소에 복사하지 않음). 학교용 덱은 `school/<id>/{source.md,prompt.txt,instructions.txt,deck.pdf,notebook.txt}` 에서 NotebookLM(`notebooklm generate slide-deck`)으로 만들고, `school/manifest.json` 이 공개 문구·순서를 가진다.
- 영상 원천: `/Volumes/Chois_SD2/dev/motion` (`MOTION_SRC` 기본값). 그 폴더의 `data/chois-gallery.json` 과 `media/chois/<id>.mp4` 만 읽는다. 렌더 절차는 그 폴더의 `.claude/PROJECT_MAP.md` 「21–50 렌더 절차」.
- 업로드 명령(토큰을 화면에 내지 않음):
  `T=$(railway variables --json | python3 -c 'import json,sys;print(json.load(sys.stdin)["MEDIA_UPLOAD_TOKEN"])') && MEDIA_PUSH_URL=https://me.chois.pro MEDIA_UPLOAD_TOKEN="$T" npm run media:push`
- 남은 일:
  - [x] 관리자 Google 로그인 확인(2026-10-12). OAuth 클라이언트는 Google Cloud 의 `Me_Chois`(Client ID `318764925465-…`) — Railway `AUTH_GOOGLE_ID/SECRET` 은 반드시 이 클라이언트 값(처음엔 다른 프로젝트 클라이언트 값이 들어가 redirect_uri_mismatch 발생). 리디렉션 URI `https://me.chois.pro/api/auth/callback/google`(끝 슬래시 없음)
  - [ ] GitHub Pages 비활성화(저장소 Settings → Pages)
  - [ ] `railway.json` → `.railway/railway.ts` 이전 — Railway CLI 경고: Config as Code 는 2026-12-01 까지만 지원(`railway config migrate`)
  - [x] 모션 21–30, 31–50 업로드(2026-10-12) — 50개 전부 공개. 스타일을 다시 렌더하면 같은 세 명령만 반복
  - [x] 마이그레이션 핫픽스(fix/migrate-on-start) 배포 후 migrate 적용 확인(2026-10-12, 운영 로그)
  - [ ] (feat/ai-hub-membership 운영 배포 후) Railway 로그에 `[migrate]` 오류 없음 확인
  - [ ] 기존 열람자 계정이 `Member`(APPROVED)로 복사됐는지 확인 — 이름은 이메일 앞부분 임시값이므로 회원 관리에서 수정
  - [ ] 다른 Google 계정으로 가입 신청 → 관리자 승인 → 프롬프트 사용 → 대기로 변경 시 차단 확인
  - [ ] 운영에서 Server Action Origin 검사 동작 확인
  - [ ] 로컬 e2e PGlite(:51214)에 남은 테스트용 `MotionViewer` 테이블 정리 (사용자 확인 필요)

## 주의사항 / 특이 패턴
- **관리자 데이터는 Volume 에만**: 프롬프트·장면표·소리 큐(`motion-admin.json`)·`slide-admin.json` 은 git·빌드 산출물에 들어가면 안 된다. 2026-10-19 공개 전환 뒤 **완성 프롬프트**(빈칸을 기본값으로 채운 `finalPrompt` 결과, 슬라이드 스타일 프롬프트)는 공개 상세 `/ai/motion/[id]/`·`/ai/slide/` HTML 에 누구에게나 실린다. 원문 빈칸 템플릿(`{{Channel name=`)·장면표 원본은 여전히 편집기(회원)에서만. `web/e2e/security.spec.ts` 가 프롬프트를 싣지 않는 화면(홈·목록·승인신청)의 마커(`E2E-ADMIN-MARKER`) 유출, 모든 공개 화면의 `{{Channel name=` 유출, 빌드 산출물, `/media` 경로 우회, 토큰 없는 업로드를 검사.
- **슬라이드 프롬프트도 git·공개 HTML 금지**: `private/slide-admin.json` 은 Volume 에만, 공개 데이터 `content/slide/public.json` 은 `.strict()` 라 프롬프트가 섞이면 파싱 실패. security.spec 이 `/ai/slide/` 와 `/media/private/slide-admin.json`·`/media/slide/manifest.json` 404 도 검사. e2e 픽스처는 슬라이드 `24`·`63` 두 덱만 렌더된 상태.
- **브랜드 룩북 콘텐츠는 git 금지**: 저장소가 public 이라 oppadu 브랜드 룩북 복사본은 Volume `private/brand/` 에만 둔다(작성자 허락 하 재배포). `/ai/brand/` 는 페이지 전체가 승인 회원 전용이고 파일 라우트도 요청마다 권한 확인. e2e 픽스처(`scripts/e2e-fixture.ts`)는 마커 `E2E-BRAND-MARKER` 를 가진 작은 `private/brand/` 만 쓴다(`brand.spec.ts`).
- **AI활용 탭은 공개, 회원제는 보관(2026-10-19 결정)**: 오빠두엑셀의 허락으로 AI활용 탭(모션·슬라이드 프롬프트, 브랜드 룩북)은 비로그인 방문자에게도 연다. 로그인(Google)·승인신청(`/ai/join/`)·회원 관리(`/ai/admin/members/`)·프롬프트 편집기(`/ai/motion/admin/`)는 **일부러 그대로 남겨 두었다** — 앞으로 제한이 필요한 페이지를 만들 때 쓰기 위해서다. 그때는 회원제를 다시 설계하지 말고 **그 페이지에만** 판정을 붙인다: 서버 라우트/레이아웃/Server Action 은 `requireMember(path)`(미로그인 → 승인신청으로 redirect, 권한 없음 → 404) 또는 `requireAdmin(path)`, 공개 화면 안에서 회원에게만 보일 UI 는 `isMember(await getViewerState())`. 사이트 전체나 허브 레이아웃에 게이트를 다시 두지 않는다(운영자 1인, 방문자 적음 — main 직접 반영 흐름).
- **데스크탑 폭 체계(2026-10-19, spec `2026-10-19-desktop-layout-design.md`)**: 폭 숫자는 `web/src/app/globals.css` 의 `@theme` 토큰 `--container-site`(120rem=1920, 셸·갤러리·상세·통계·프로젝트·저서)와 `--container-wide`(96rem=1536, 글이 섞인 3기둥·경력·강의·연락)뿐이다 → 유틸리티 `max-w-site`/`max-w-wide`. 좌우 여백은 `--gutter`(8→12→16→24→32→40px, 미디어 쿼리) 하나와 `gutter` 유틸리티. 새 화면은 `gutter` + `max-w-site|wide` 를 쓰고 `max-w-6xl`·`px-2 sm:px-3 …` 나열은 쓰지 않는다. 홈 섹션은 `Section` 의 `width` prop. 히어로는 `Section` 밖(배경 full-bleed, 내용 `max-w-site`). 그리드 열 수: 모션 2/3/4/5(xl)/6(2xl), 슬라이드 1/2/3/4(xl), 프로젝트 1/2/3/4(xl)/5(2xl), 저서 1/3/6(xl, 3칸만 사용), 타임라인 소그리드 1/2/3/4(xl). 모션 상세는 `xl:` 2단(영상 왼쪽, 정보 오른쪽 sticky). 검사: `web/e2e/desktop.spec.ts`(1920·2560·1024).
- **로그아웃 복귀 공개 경로**: `ai-paths.ts` `PUBLIC_AI` 에 `/ai/slide/`·`/ai/brand/` 포함 — 새 공개 탭을 만들면 여기도 추가.
- **로컬 dev Volume**: gitignore 된 `web/.env.development.local` 에 `RAILWAY_VOLUME_MOUNT_PATH=<절대경로>/.local-volume`, `AUTH_SECRET` 을 둔다.
- **standalone 은 server.js 폴더로 chdir** → 상대 `RAILWAY_VOLUME_MOUNT_PATH` 는 엉뚱한 곳을 가리킨다. 항상 절대경로(e2e 는 `web/e2e/.volume` 절대경로).
- **`skipTrailingSlashRedirect: true`**: Google OAuth 콜백과 스트림 본문 PUT 이 308 리다이렉트를 따라가지 못해서. `trailingSlash` 는 유지하되 슬래시 없는 API 경로도 응답.
- **모션 페이지는 `force-dynamic`**: 렌더 여부를 Volume 에서 읽기 때문. 관리자 표 `.prose-cell` 의 어절 단위 줄바꿈은 긴 장면 설명용 의도된 반응형 규칙 예외.
- **관리자 화면 디자인 = motion 폴더 `index.html`**: `/ai/motion/admin/` 목록·상세는 (app) 그룹의 전체 화면 어두운 앱(`fixed inset-0`). 스타일은 `admin/admin.module.css` 에 index.html CSS 를 그대로 옮김(사이트 토큰과 별개). 목록의 그룹·검색은 `?g=&q=` 로 상세에 넘겨 이전/다음 순서·닫기 위치를 맞춘다(`admin-list.ts` `adminOrder`). 단축키 `←` `→` / `1` `2` `3` / `Esc`.
- **회원 권한**: 로그인은 검증된 구글 계정이면 누구나 통과하고, 권한은 매 요청 `access.ts` 가 판정(JWT 세션과 무관 → 승인 취소·삭제 즉시 반영). 관리자는 env(`ADMIN_EMAILS`) 우선이라 DB 장애와 무관하게 항상 들어간다. 그 외는 DB 조회 실패 시 `unavailable`(fail-closed). 회원 관리 표는 `.vTable` 이 스스로 스크롤해야 sticky 머리글이 고정된다. 로그·오류에는 이메일을 남기지 않는다(`errorTag`). 옛 `/motion/…` 는 308 으로 `/ai/…` 에 연결.
- **Prisma 배포 구성**: `web/prisma.config.ts` 는 `defineConfig` 대신 타입 전용 import + 평범한 객체 — 런타임 이미지가 전역 설치 prisma CLI 로 migrate deploy 를 돌려 `prisma/config` 를 resolve 못 하기 때문. Dockerfile 런타임 단계에 openssl + `npm i -g prisma@7.10.0` + `web/prisma`·`prisma.config.ts` 복사. `lib/prisma` 는 `members.ts` 가 동적 import 로만 부른다.
- **모션 카드 미리보기**: 호버 가능 기기(`(hover: hover)`)에서만 preview.mp4 를 지연 로드. 터치는 탭하면 상세로.
- **콘텐츠 단일 소스**: `content/ko/*.json` 과 `content/en/*.json` 을 항상 함께 수정. id·배열 길이·`since` 가 어긋나면 `content:validate` 가 실패해 CI 가 멈춘다.
- **색·폰트는 `content/tokens.json` 만** 수정. `web/src/app/tokens.css` 는 생성 파일(gitignore). `video/src/theme.ts` 도 같은 토큰을 읽는다.
- **`@me/content` 는 TS 소스를 그대로 import**: web 은 `transpilePackages`, video 는 webpack alias, vitest 는 resolve alias, tsconfig 는 `paths` 로 각각 연결. 새 번들러·도구 추가 시 같은 alias 필요.
- **히어로 20초 주기 동기화**: `web/.../motion/hero-cycle.ts` 의 `HERO_CYCLE_MS=20000` 은 `video/src/timeline.ts` `HERO_LOOP_DURATION`(20×FPS) 과 같은 길이여야 한다. `HeroStage` 가 `setInterval` 로 주기를 돌리고, `HeroVideo.onLoop`(첫 재생·currentTime 되감김 감지) 때 주기 번호를 올려 영상과 재동기화. 영상 없는 모바일은 타이머만으로 돈다. 곡선(`GridBackground`)과 `Typewriter` 는 `useHeroCycle()` 값이 바뀔 때 처음부터 다시 시작.
- **히어로 곡선/영상 레이아웃**: 글자가 세로 가운데라 곡선은 viewBox 상단 띠(`xMidYMin slice`)에만. 영상 쪽도 같은 이유로 `Curve.tsx` `CURVE_TOP` 과 `Timeline.tsx` `AXIS_Y_MINIMAL=240` 을 HeroLoop 에만 쓴다. 세로 화면(`max-aspect-ratio: 1/1`)에서는 `globals.css` 가 `.hero-curve` 를 숨기고 `.hero-video/.hero-poster` 를 `contain` + bottom 으로 바꾼다. 포스터는 `render-video.sh` 가 2초 프레임(격자 완성·곡선 시작 직후)에서 추출.
- **Typewriter 는 전체 텍스트를 항상 DOM 에 둔다**(정적 HTML·검색·접근성·줄바꿈 안정). 커서 `.hero-caret` 은 absolute 블록이라 textContent 를 더럽히지 않음. e2e 가 `h1` 텍스트를 그대로 검사한다.
- **HeroVideo**: 서버 렌더는 항상 포스터 버튼 → 데스크톱(≥640px, reduced-motion 아님)만 하이드레이션 후 영상. 모바일은 탭 후 로드(데이터 절약).
- **영상 씬 길이는 내레이션 길이로 결정**: `timeline.ts buildScenes` 가 `manifest.json` 클립 길이로 계산. 대본(`ko/narration.json`)을 바꾸면 반드시 `narrate → render` 순서. 타임라인 노드는 대본에 있는 경력만(car-2013 제외). en 은 manifest 가 비어 기본 길이로 렌더.
- **Remotion 브라우저**: SD 카드의 Chrome Headless Shell 은 멈추므로 `remotion.config.ts` 가 Playwright 캐시의 Chromium 을 쓴다.
- **참조 음성·폰트·tokens.css·렌더 중간물은 gitignore** (`video/narration/ref/`, `video/public/fonts/`, `video/out/`, `web/out/`, `video/sting/{node_modules,snapshots,renders}/`). 반면 `web/public/video/*`, `web/public/img/*`, `video/public/narration/ko/*.wav`, `video/sting/fonts/*.woff2`, `video/sting/audio/soundtrack-*.wav` 는 **커밋 대상**(CI 가 만들지 않음).
- **렌더 용량 상한**: intro-ko.mp4 20MB, hero-loop.{mp4,webm} 5MB — 초과 시 `render-video.sh` 가 실패, crf 를 올릴 것. intro-ko.mp4 길이 = 스팅 10s + 본편.
- **스팅(video/sting) 수정 규칙**: 텍스트를 바꾸려면 `vars/*.json` 과 `index.html` 의 variable default 를 **함께** 수정. 큐 시각을 바꾸면 영상·오디오가 같이 움직이므로 `#cues` JSON 만 수정하고 `npm run render:sting` 재실행(사운드트랙이 큐에서 재합성됨). 스팅과 본편은 인코딩 파라미터가 달라 concat demuxer 로 못 붙이고 `prepend_sting` 이 필터로 재인코딩한다.
- **HyperFrames 렌더 브라우저**: `~/.cache/hyperframes` 의 chrome-headless-shell 을 쓴다(Remotion 의 Playwright Chromium 과 별개). `npx hyperframes lint` 의 sub-composition 분할 경고는 "단일 HTML" 요구사항 때문에 의도적으로 무시.
- **연차("N년차")는 요청 시각 기준**(`computeStats`, 3월 임용 기준) → 홈이 force-dynamic 이라 요청마다 계산되므로 재배포 없이 자동 갱신된다.
- **반응형 규칙 적용 지점**: 표는 `.data-table`(globals.css, sticky header/col + nowrap), body `word-break: keep-all`, 히어로 높이 `100dvh - var(--nav-h) - var(--footer-h)`, 터치 타겟 `min-h-11`.
- 테스트: vitest 는 `vitest.config.ts` include 기준(32개 파일·162 tests, 2026-10-13), Playwright 12 파일(smoke, platform, motion, slide, brand, admin, security, prompt-copy, redirects, hub, membership, account — DB 없이 63 passed·14 skipped, 2026-10-13, `E2E_DATABASE_URL` 있을 때 skip 0). `motion.spec` 은 홈 AI활용 섹션 부재·Nav/Contact 허브 링크·옛 `#ai`/`#motion` 이동·페이지별 고정 footer 도 검사. 세션 쿠키 헬퍼는 `e2e/session.ts`. `check` 는 e2e 를 돌리지 않고 CI 워크플로가 build 후 따로 실행.
- 문서 불일치 메모: `video/public/audio/README.md` 는 BGM 볼륨 0.6 이라 적혀 있으나 실제 `Intro.tsx` `BGM_LEVEL` 은 0.22.

---
마지막 업데이트: 2026-10-13
