# Project Map — my-introduction

## 개요
- 목적: 최재혁(포산고 수학교사) 소개 페이지 `me.chois.pro` 와 Remotion 모션그래픽 소개 영상. 웹·영상이 `content/` 의 JSON 을 단일 소스로 공유한다.
- 스택: npm workspaces 모노레포 (Node 24) — `content`(zod 4 스키마 + JSON) / `web`(Next.js 16 App Router, `output: 'standalone'`, React 19, Tailwind 4, motion 14) / `video`(Remotion 4). 소개 영상 맨 앞 10초 스팅은 별도 `video/sting/`(HyperFrames, HTML+GSAP — 워크스페이스 아님, 자체 package.json). 테스트 vitest 5 + Playwright.
- 배포: `main` push → GitHub Actions(`.github/workflows/ci.yml`, check+build+e2e) → Railway 가 `Dockerfile` 로 빌드(video 워크스페이스 제외)·standalone 서버 실행. 헬스체크 `/api/health`(`railway.json`). 도메인 `me.chois.pro`. **DB·Prisma 없음** — 모션 영상·관리자 데이터는 Railway Volume(`RAILWAY_VOLUME_MOUNT_PATH`, 1GB). 소개 영상·이미지 산출물은 CI 가 만들지 않고 커밋한다. (GitHub Pages 배포는 폐지, `deploy.yml` 삭제됨)
- 모션 챕터 설계/계획: `docs/superpowers/specs/2026-10-12-motion-chapter-railway-design.md`, `docs/superpowers/plans/2026-10-12-motion-chapter-railway.md`.
- 설계/계획 문서: `docs/superpowers/specs/2026-10-09-my-introduction-design.md`, `docs/superpowers/plans/2026-10-09-my-introduction.md`, 약력 초안 `docs/content/profile-draft.md`.

## 폴더 구조
```
.
├── .github/workflows/ci.yml       # check → build:web → e2e (배포는 Railway 가 담당)
├── Dockerfile, railway.json       # Railway 빌드·헬스체크
├── content/                       # @me/content 워크스페이스 (TS 소스 그대로 import)
│   ├── motion/ schema.ts, index.ts, public.json  # 모션 스타일 공개 데이터(커밋) + 관리자 스키마
│   ├── schema.ts                  # zod 스키마·타입 (profile/projects/ui/tokens/narration)
│   ├── index.ts                   # getContent(locale)/getNarration/checkParity/idsOf/tokens
│   ├── stats.ts                   # computeStats (연차·저서·서비스·수상 수)
│   ├── tokens.json                # 디자인 토큰 (색·폰트·radius) — 유일한 수정 지점
│   ├── ko/ {profile,projects,ui,narration}.json
│   ├── en/ {profile,projects,ui}.json      # narration 은 ko 만
│   └── __tests__/                 # 4개 (schema, parity, stats, narration)
├── web/                           # Next.js standalone 서버
│   ├── next.config.ts             # output standalone, trailingSlash, skipTrailingSlashRedirect, transpilePackages @me/content
│   ├── src/app/
│   │   ├── (ko)/ layout.tsx, page.tsx      # /
│   │   ├── (en)/en/ layout.tsx, page.tsx   # /en/
│   │   ├── (ko)/motion/ page.tsx, [id]/page.tsx, admin/{layout,page,[id]/page}.tsx  # 갤러리·상세·관리자(Google 로그인)
│   │   ├── media/[...path]/route.ts        # Volume 영상 스트리밍(Range)
│   │   ├── api/ health, media (PUT 업로드), media/manifest, auth/[...nextauth]
│   │   ├── globals.css            # Tailwind 진입 + 히어로/표 공용 CSS
│   │   ├── tokens.css             # 생성 파일 (gitignore) ← scripts/gen-tokens-css.ts
│   │   └── icon.png, apple-icon.png        # prepare-assets.sh 가 생성
│   ├── src/components/
│   │   ├── RootShell, Nav, LangToggle, Section, HomePage, HeroVideo, VideoDialog
│   │   ├── motion/  HeroStage, hero-cycle, Typewriter, GridBackground, Reveal, CountUp
│   │   └── sections/ Hero, Stats, Timeline, Pillars, Projects, Books, Lectures, Contact
│   ├── src/components/motion-gallery/  MotionGallery, MotionCard, KeyNav, admin/{PromptPanel,RowsTable,placeholders}
│   ├── src/components/sections/Motion.tsx  # 홈 #motion 섹션
│   ├── src/auth.ts                # NextAuth v5 (Google, ADMIN_EMAILS 화이트리스트)
│   ├── src/lib/  locale, metadata, sections, volume, media, media-serve, media-upload, range, motion-admin, admin-emails, admin-session (+ *.test.ts)
│   ├── e2e/ smoke, platform, motion, admin, security .spec.ts  # Playwright (standalone 서버 포트 3100, e2e/.volume 픽스처)
│   └── public/  CNAME, robots.txt, sitemap.xml, .nojekyll, img/, video/
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
홈 두 페이지는 `HomePage` 가 섹션 9개(#motion 포함)를 렌더한다. 모션 라우트는 Volume 을 읽으므로 `force-dynamic`.

| 경로 | 파일 | 설명 |
|---|---|---|
| `/` | `web/src/app/(ko)/page.tsx` | 한국어 홈 (`RootShell locale="ko"`) |
| `/en/` | `web/src/app/(en)/en/page.tsx` | 영어 홈. `LangToggle` 이 현재 `#hash` 를 유지한 채 전환 |
| `/motion/` | `web/src/app/(ko)/motion/page.tsx` | 모션 갤러리(그룹 필터 `?g=`) |
| `/motion/[id]/` | `.../motion/[id]/page.tsx` | 상세(영상·키보드 좌우 이동). 렌더 안 된 id 는 404 |
| `/motion/admin/`, `/motion/admin/[id]/` | `.../motion/admin/` | Google 로그인 + `ADMIN_EMAILS` 만. 프롬프트·장면표·소리 큐 |
| `GET/HEAD /media/[...path]` | `web/src/app/media/[...path]/route.ts` | `media/motion/<id>/(video.mp4\|preview.mp4\|poster.webp)` 만 Range 스트리밍. 그 외 404 |
| `PUT /api/media?path=` | `web/src/app/api/media/route.ts` | `MEDIA_UPLOAD_TOKEN` Bearer. 같은 허용 경로만 |
| `GET /api/media/manifest` | `.../api/media/manifest/route.ts` | 토큰. Volume 파일 해시 목록(media:push 가 차이만 업로드) |
| `/api/health` | `.../api/health/route.ts` | Railway 헬스체크 |
| `/api/auth/[...nextauth]` | `.../api/auth/[...nextauth]/route.ts` | NextAuth v5 Google |
| `#hero #stats #timeline #pillars #projects #motion #books #lectures #contact` | `web/src/lib/sections.ts` `SECTION_IDS` | Nav 앵커·e2e 검증 기준 |

정적 파일: `/video/intro-{ko,en}.mp4`(소개 영상 = 10초 스팅 + Remotion 본편, VideoDialog), `/video/hero-loop.{mp4,webm}` + `/video/hero-poster.jpg`(히어로 배경), `/img/og.png`(OG 1200×630), `/img/{photo,pictogram}.webp`, `/img/books/*.webp`, `/img/projects/*.webp`.

Remotion 컴포지션 (`video/src/Root.tsx`, 1920×1080 30fps):

| ID | 컴포넌트 | 길이 | 비고 |
|---|---|---|---|
| `Intro-ko` / `Intro-en` | `compositions/Intro.tsx` | `buildPlan(locale)` 씬 합 (ko 약 82초) | props `{locale, bgm}`; 8개 씬 Sequence + BGM 페이드 |
| `HeroLoop` | `compositions/HeroLoop.tsx` | `HERO_LOOP_DURATION` = 20초 | Opening(6s, 이름 없음) + Timeline(14s, minimal) + 흰 베일 루프 |
| `OgImage` | `compositions/OgImage.tsx` | Still 1200×630 | 공유 이미지 |

HyperFrames 스팅 (`video/sting/index.html`, 1920×1080 30fps 10s): 변수 `name/role/url/card1–4/formula/tape/run/soundtrack` 를 `<html data-composition-variables>` 에 선언하고 `vars/{ko,en}.json` 으로 덮어씀(en 은 `soundtrack` 변수로 wav 도 교체). `<script id="cues" type="application/json">` 이 영상·오디오 큐의 단일 소스(126 BPM 16분음표 격자, 초 단위) — `audio/build-soundtrack.mjs` 가 이 블록을 regex 로 읽어 외부 음원 없이 음악·효과음을 합성해 `audio/soundtrack-{ko,en}.wav`(48kHz 16bit 스테레오)를 만들고, `audio/verify-cues.mjs` 가 각 큐 ±1프레임 온셋을 검증한다.

## 데이터 모델 (content 워크스페이스 — `content/schema.ts`)
Prisma 대신 zod 스키마로 검증되는 JSON. `getContent(locale)` 이 파싱·캐시, `npm run content:validate` 가 ko/en id 패리티를 검사.

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
| `mediaManifestSchema` | Volume `media/motion/manifest.json` | 경로 → {size, sha256, updatedAt} | `media:prepare` 산출, 서버 `/api/media/manifest` 가 diff 기준으로 제공 |
| Volume 구조 | `$RAILWAY_VOLUME_MOUNT_PATH` | `media/motion/<id>/{video.mp4,preview.mp4,poster.webp}`, `media/motion/manifest.json`, `private/motion-admin.json` | `/media/*` 는 `media/motion/<id>/` 의 3파일만 공개, `private/` 는 절대 서빙 안 함 |
| `Manifest` | `video/public/narration/ko/manifest.json` | key → {text, duration} | narrate.ts 산출물. 씬 길이 계산 입력 |

## 주요 컴포넌트·유틸
| 이름 | 파일 | 역할 |
|---|---|---|
| `RootShell` | `web/src/components/RootShell.tsx` | html/body, 폰트 import, Nav + main + footer |
| `HomePage` | `web/src/components/HomePage.tsx` | 서버 컴포넌트. getContent + computeStats → 섹션 8개 |
| `Section` | `web/src/components/Section.tsx` | 섹션 래퍼 (id, title, dark, nav 높이 scroll-mt) |
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
| `timeline.ts` | `video/src/timeline.ts` | FPS/WIDTH/HEIGHT, `buildScenes`(manifest 길이 기반), `timelineSchedule`, `projectSchedule`, `HERO_LOOP_DURATION` |
| `plan.ts` | `video/src/plan.ts` | `buildPlan(locale)` → scenes, careerIds(대본에 있는 경력만), clip(key) 경로 |
| `loop.ts` | `video/src/loop.ts` | `loopVeil` — 루프 경계 흰 베일 (0.5s in / 0.7s out) |
| `Curve`, `Grid` | `video/src/components/` | `CURVE`(본편) / `CURVE_TOP`(히어로 루프 상단 띠), 격자 |
| `Clip` | `video/src/components/Clip.tsx` | 내레이션 Audio Sequence (클립 없으면 렌더 안 함) |

## 외부 의존성
- 외부 서비스: Railway(호스팅·Volume), Google OAuth(관리자 로그인, next-auth 5.0.0-beta.32). DB 없음.
- 서버 환경변수: `RAILWAY_VOLUME_MOUNT_PATH`(절대경로), `PORT`(Railway 자동), `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ADMIN_EMAILS`(쉼표 구분), `MEDIA_UPLOAD_TOKEN`. 예시는 `web/.env.example`.
- 스크립트 전용: `MOTION_SRC`(motion 폴더, motion:import), `MEDIA_PUSH_URL`(+`MEDIA_UPLOAD_TOKEN`, media:push).
- `scripts/narrate.ts` 만 선택적으로 사용:

| 키 | 용도 | 기본값 |
|---|---|---|
| `MLX_TTS` | mlx-audio TTS 실행 파일 | `/Volumes/Chois_SD2/venvs/mlx-audio/bin/mlx_audio.tts.generate` |
| `TTS_MODEL` | Qwen3-TTS 모델 | `mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16` |

- 로컬 도구: `cwebp`(brew webp), `sips`, `ffmpeg`/`ffprobe`, Playwright Chromium(`npx playwright install chromium`), mlx-audio venv.
- 주요 패키지: next 16.4 / react 19.2 / motion 14 / tailwindcss 4.3 / remotion 4.0.534 / zod 4.6 / vitest 5 / @playwright/test 1.64 / pretendard, @fontsource-variable/jetbrains-mono. `video/sting/package.json`(별도): hyperframes 0.8.145 핀, devDeps `@fontsource/black-han-sans`, `@fontsource/archivo-black`.
- 외부 자원: 배경음악 CC0 "Calm Ambient 3" (cynicmusic) — `video/public/audio/README.md`.

## 명령 (루트 `package.json`)
| 명령 | 역할 |
|---|---|
| `npm run check` | content:validate + vitest + web lint + web/video typecheck (CI 와 동일) |
| `npm run dev` / `build:web` | 웹 개발/standalone 빌드 (`predev`/`prebuild` 가 tokens.css 생성) |
| `npm run e2e` | standalone 서버(3100, `web/e2e/.volume` 픽스처 = `scripts/e2e-fixture.ts`)로 Playwright — `build:web` 선행 필요 |
| `npm start` | standalone 서버 실행 (`RAILWAY_VOLUME_MOUNT_PATH` 절대경로 필요) |
| `npm run motion:import` | motion 폴더 → `content/motion/public.json`(커밋) + `.media-out/` 관리자 데이터 |
| `npm run media:prepare` | 렌더 mp4 → 웹용 video/preview/poster 인코딩 + manifest |
| `npm run media:push` | manifest diff 로 바뀐 파일만 `PUT /api/media` 업로드 (재배포 불필요) |
| `npm run assets` | asset/ → web/public/img, video/public/img, 파비콘 |
| `npm run narrate` | 대본 → wav + manifest (변경된 키만 재생성) |
| `npm run render` | `render:sting` → Intro-{ko,en} 을 `out/intro-*-body.mp4` 로 렌더 → `prepend_sting`(ffmpeg concat 필터 재인코딩, crf 23, aac 160k)으로 `out/intro-{ko,en}.mp4` → HeroLoop(mp4/webm)·OgImage·포스터(2s 프레임) → web/public, 용량 상한 검사. `SKIP_STING=1` 이면 기존 `out/sting-*.mp4` 재사용 |
| `npm run render:sting` | `video/sting` 사운드트랙 합성+큐 검증 후 `npx hyperframes render` → `video/out/sting-{ko,en}.mp4` |
| `npm run video:studio` | Remotion 스튜디오 |

## 주의사항 / 특이 패턴
- **관리자 데이터는 Volume 에만**: 프롬프트·장면표·소리 큐(`motion-admin.json`)는 git·빌드 산출물·공개 HTML 어디에도 들어가면 안 된다. `web/e2e/security.spec.ts` 가 마커(`E2E-ADMIN-MARKER`)와 `{{Channel name=` 유출, `/media` 경로 우회, 토큰 없는 업로드를 검사.
- **standalone 은 server.js 폴더로 chdir** → 상대 `RAILWAY_VOLUME_MOUNT_PATH` 는 엉뚱한 곳을 가리킨다. 항상 절대경로(e2e 는 `web/e2e/.volume` 절대경로).
- **`skipTrailingSlashRedirect: true`**: Google OAuth 콜백과 스트림 본문 PUT 이 308 리다이렉트를 따라가지 못해서. `trailingSlash` 는 유지하되 슬래시 없는 API 경로도 응답.
- **모션 페이지는 `force-dynamic`**: 렌더 여부를 Volume 에서 읽기 때문. 관리자 표 `.prose-cell` 의 어절 단위 줄바꿈은 긴 장면 설명용 의도된 반응형 규칙 예외.
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
- **연차("N년차")는 빌드 시각 기준**(`computeStats`, 3월 임용 기준) → 매년 3/1 에 Railway 수동 재배포 필요(deploy.yml cron 폐지).
- **반응형 규칙 적용 지점**: 표는 `.data-table`(globals.css, sticky header/col + nowrap), body `word-break: keep-all`, 히어로 높이 `100dvh - var(--nav-h)`, 터치 타겟 `min-h-11`.
- 테스트: vitest 10개(content 4, scripts 2, web/lib 1, video 4 — `vitest.config.ts` include 참고), Playwright 5 파일(smoke, platform, motion, admin, security — 38개). `check` 는 e2e 를 돌리지 않고 CI 워크플로가 build 후 따로 실행.
- 문서 불일치 메모: `video/public/audio/README.md` 는 BGM 볼륨 0.6 이라 적혀 있으나 실제 `Intro.tsx` `BGM_LEVEL` 은 0.22.

---
마지막 업데이트: 2026-10-12
