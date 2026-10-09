# Project Map — my-introduction

## 개요
- 목적: 최재혁(포산고 수학교사) 소개 페이지 `me.chois.pro` 와 Remotion 모션그래픽 소개 영상. 웹·영상이 `content/` 의 JSON 을 단일 소스로 공유한다.
- 스택: npm workspaces 모노레포 (Node 24) — `content`(zod 4 스키마 + JSON) / `web`(Next.js 16 App Router, `output: 'export'`, React 19, Tailwind 4, motion 14) / `video`(Remotion 4). 테스트 vitest 5 + Playwright.
- 배포: `main` push → GitHub Actions → GitHub Pages (`web/out`). 커스텀 도메인 `web/public/CNAME` = `me.chois.pro`. **DB·서버·Prisma 없음**(정적 사이트). 영상·이미지 산출물은 CI 가 만들지 않고 커밋한다.
- 설계/계획 문서: `docs/superpowers/specs/2026-10-09-my-introduction-design.md`, `docs/superpowers/plans/2026-10-09-my-introduction.md`, 약력 초안 `docs/content/profile-draft.md`.

## 폴더 구조
```
.
├── .github/workflows/deploy.yml   # check → build:web → Pages 배포 (+ 매년 3/1 재빌드)
├── content/                       # @me/content 워크스페이스 (TS 소스 그대로 import)
│   ├── schema.ts                  # zod 스키마·타입 (profile/projects/ui/tokens/narration)
│   ├── index.ts                   # getContent(locale)/getNarration/checkParity/idsOf/tokens
│   ├── stats.ts                   # computeStats (연차·저서·서비스·수상 수)
│   ├── tokens.json                # 디자인 토큰 (색·폰트·radius) — 유일한 수정 지점
│   ├── ko/ {profile,projects,ui,narration}.json
│   ├── en/ {profile,projects,ui}.json      # narration 은 ko 만
│   └── __tests__/                 # 4개 (schema, parity, stats, narration)
├── web/                           # Next.js 정적 사이트
│   ├── next.config.ts             # output export, trailingSlash, transpilePackages @me/content
│   ├── src/app/
│   │   ├── (ko)/ layout.tsx, page.tsx      # /
│   │   ├── (en)/en/ layout.tsx, page.tsx   # /en/
│   │   ├── globals.css            # Tailwind 진입 + 히어로/표 공용 CSS
│   │   ├── tokens.css             # 생성 파일 (gitignore) ← scripts/gen-tokens-css.ts
│   │   └── icon.png, apple-icon.png        # prepare-assets.sh 가 생성
│   ├── src/components/
│   │   ├── RootShell, Nav, LangToggle, Section, HomePage, HeroVideo, VideoDialog
│   │   ├── motion/  HeroStage, hero-cycle, Typewriter, GridBackground, Reveal, CountUp
│   │   └── sections/ Hero, Stats, Timeline, Pillars, Projects, Books, Lectures, Contact
│   ├── src/lib/  locale.ts, metadata.ts, sections.ts (+ locale.test.ts)
│   ├── e2e/smoke.spec.ts          # Playwright (out/ 을 serve 로 띄워 검사)
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
│   └── narration/ref/             # 참조 음성 (gitignore)
├── scripts/                       # 루트 npm 스크립트 구현 (+ __tests__ 2개)
│   ├── validate-content.ts        # ko/en id 패리티 검사
│   ├── gen-tokens-css.ts          # tokens.json → web/src/app/tokens.css (@theme)
│   ├── prepare-assets.sh          # asset/ → web/public/img (+ video/public/img rsync)
│   ├── render-video.sh            # Remotion 렌더 → web/public/video, og.png, 포스터
│   └── narrate.ts                 # narration.json → Qwen3-TTS wav + manifest
├── asset/                         # 원본 이미지 (증명사진·픽토그램·표지 3·목업 5) — asset/README.md
├── docs/                          # 설계·계획·약력 초안
├── vitest.config.ts, tsconfig.base.json, package.json
```

## 주요 엔드포인트 / 라우트
정적 export 이므로 API 라우트 없음. 두 페이지 모두 `HomePage` 가 섹션 8개를 순서대로 렌더한다.

| 경로 | 파일 | 설명 |
|---|---|---|
| `/` | `web/src/app/(ko)/page.tsx` | 한국어 홈 (`RootShell locale="ko"`) |
| `/en/` | `web/src/app/(en)/en/page.tsx` | 영어 홈. `LangToggle` 이 현재 `#hash` 를 유지한 채 전환 |
| `#hero #stats #timeline #pillars #projects #books #lectures #contact` | `web/src/lib/sections.ts` `SECTION_IDS` | Nav 앵커·e2e 검증 기준 |

정적 파일: `/video/intro-ko.mp4`(소개 영상, VideoDialog), `/video/hero-loop.{mp4,webm}` + `/video/hero-poster.jpg`(히어로 배경), `/img/og.png`(OG 1200×630), `/img/{photo,pictogram}.webp`, `/img/books/*.webp`, `/img/projects/*.webp`.

Remotion 컴포지션 (`video/src/Root.tsx`, 1920×1080 30fps):

| ID | 컴포넌트 | 길이 | 비고 |
|---|---|---|---|
| `Intro-ko` / `Intro-en` | `compositions/Intro.tsx` | `buildPlan(locale)` 씬 합 (ko 약 82초) | props `{locale, bgm}`; 8개 씬 Sequence + BGM 페이드 |
| `HeroLoop` | `compositions/HeroLoop.tsx` | `HERO_LOOP_DURATION` = 20초 | Opening(6s, 이름 없음) + Timeline(14s, minimal) + 흰 베일 루프 |
| `OgImage` | `compositions/OgImage.tsx` | Still 1200×630 | 공유 이미지 |

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
- 런타임 서비스 없음. 외부 API 호출 없음.
- 환경변수: 앱 런타임에는 없음. `scripts/narrate.ts` 만 선택적으로 사용:

| 키 | 용도 | 기본값 |
|---|---|---|
| `MLX_TTS` | mlx-audio TTS 실행 파일 | `/Volumes/Chois_SD2/venvs/mlx-audio/bin/mlx_audio.tts.generate` |
| `TTS_MODEL` | Qwen3-TTS 모델 | `mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16` |

- 로컬 도구: `cwebp`(brew webp), `sips`, `ffmpeg`/`ffprobe`, Playwright Chromium(`npx playwright install chromium`), mlx-audio venv.
- 주요 패키지: next 16.4 / react 19.2 / motion 14 / tailwindcss 4.3 / remotion 4.0.534 / zod 4.6 / vitest 5 / @playwright/test 1.64 / pretendard, @fontsource-variable/jetbrains-mono.
- 외부 자원: 배경음악 CC0 "Calm Ambient 3" (cynicmusic) — `video/public/audio/README.md`.

## 명령 (루트 `package.json`)
| 명령 | 역할 |
|---|---|
| `npm run check` | content:validate + vitest + web lint + web/video typecheck (CI 와 동일) |
| `npm run dev` / `build:web` | 웹 개발/정적 빌드 (`predev`/`prebuild` 가 tokens.css 생성) |
| `npm run e2e` | `web/out` 을 serve(3100) 로 띄워 Playwright 스모크 — 빌드 선행 필요 |
| `npm run assets` | asset/ → web/public/img, video/public/img, 파비콘 |
| `npm run narrate` | 대본 → wav + manifest (변경된 키만 재생성) |
| `npm run render` | Intro-ko·HeroLoop(mp4/webm)·OgImage 렌더 + 포스터(2s 프레임) → web/public, 용량 상한 검사 |
| `npm run video:studio` | Remotion 스튜디오 |

## 주의사항 / 특이 패턴
- **콘텐츠 단일 소스**: `content/ko/*.json` 과 `content/en/*.json` 을 항상 함께 수정. id·배열 길이·`since` 가 어긋나면 `content:validate` 가 실패해 CI 가 멈춘다.
- **색·폰트는 `content/tokens.json` 만** 수정. `web/src/app/tokens.css` 는 생성 파일(gitignore). `video/src/theme.ts` 도 같은 토큰을 읽는다.
- **`@me/content` 는 TS 소스를 그대로 import**: web 은 `transpilePackages`, video 는 webpack alias, vitest 는 resolve alias, tsconfig 는 `paths` 로 각각 연결. 새 번들러·도구 추가 시 같은 alias 필요.
- **히어로 20초 주기 동기화**: `web/.../motion/hero-cycle.ts` 의 `HERO_CYCLE_MS=20000` 은 `video/src/timeline.ts` `HERO_LOOP_DURATION`(20×FPS) 과 같은 길이여야 한다. `HeroStage` 가 `setInterval` 로 주기를 돌리고, `HeroVideo.onLoop`(첫 재생·currentTime 되감김 감지) 때 주기 번호를 올려 영상과 재동기화. 영상 없는 모바일은 타이머만으로 돈다. 곡선(`GridBackground`)과 `Typewriter` 는 `useHeroCycle()` 값이 바뀔 때 처음부터 다시 시작.
- **히어로 곡선/영상 레이아웃**: 글자가 세로 가운데라 곡선은 viewBox 상단 띠(`xMidYMin slice`)에만. 영상 쪽도 같은 이유로 `Curve.tsx` `CURVE_TOP` 과 `Timeline.tsx` `AXIS_Y_MINIMAL=240` 을 HeroLoop 에만 쓴다. 세로 화면(`max-aspect-ratio: 1/1`)에서는 `globals.css` 가 `.hero-curve` 를 숨기고 `.hero-video/.hero-poster` 를 `contain` + bottom 으로 바꾼다. 포스터는 `render-video.sh` 가 2초 프레임(격자 완성·곡선 시작 직후)에서 추출.
- **Typewriter 는 전체 텍스트를 항상 DOM 에 둔다**(정적 HTML·검색·접근성·줄바꿈 안정). 커서 `.hero-caret` 은 absolute 블록이라 textContent 를 더럽히지 않음. e2e 가 `h1` 텍스트를 그대로 검사한다.
- **HeroVideo**: 서버 렌더는 항상 포스터 버튼 → 데스크톱(≥640px, reduced-motion 아님)만 하이드레이션 후 영상. 모바일은 탭 후 로드(데이터 절약).
- **영상 씬 길이는 내레이션 길이로 결정**: `timeline.ts buildScenes` 가 `manifest.json` 클립 길이로 계산. 대본(`ko/narration.json`)을 바꾸면 반드시 `narrate → render` 순서. 타임라인 노드는 대본에 있는 경력만(car-2013 제외). en 은 manifest 가 비어 기본 길이로 렌더.
- **Remotion 브라우저**: SD 카드의 Chrome Headless Shell 은 멈추므로 `remotion.config.ts` 가 Playwright 캐시의 Chromium 을 쓴다.
- **참조 음성·폰트·tokens.css·렌더 중간물은 gitignore** (`video/narration/ref/`, `video/public/fonts/`, `video/out/`, `web/out/`). 반면 `web/public/video/*`, `web/public/img/*`, `video/public/narration/ko/*.wav` 는 **커밋 대상**(CI 가 만들지 않음).
- **렌더 용량 상한**: intro-ko.mp4 20MB, hero-loop.{mp4,webm} 5MB — 초과 시 `render-video.sh` 가 실패, crf 를 올릴 것.
- **연차("N년차")는 빌드 시각 기준**(`computeStats`, 3월 임용 기준) → deploy.yml 이 매년 3/1 cron 으로 재빌드.
- **반응형 규칙 적용 지점**: 표는 `.data-table`(globals.css, sticky header/col + nowrap), body `word-break: keep-all`, 히어로 높이 `100dvh - var(--nav-h)`, 터치 타겟 `min-h-11`.
- 테스트: vitest 10개(content 4, scripts 2, web/lib 1, video 4 — `vitest.config.ts` include 참고), Playwright 스모크 1 파일(`web/e2e/smoke.spec.ts`). CI `check` 는 e2e 를 돌리지 않는다.
- 문서 불일치 메모: `video/public/audio/README.md` 는 BGM 볼륨 0.6 이라 적혀 있으나 실제 `Intro.tsx` `BGM_LEVEL` 은 0.22.

---
마지막 업데이트: 2026-10-09
