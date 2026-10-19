# 데스크탑 전체 폭 레이아웃 Implementation Plan

> **For agentic workers:** 이 계획을 Task 순서대로 구현한다. 단계는 체크박스(`- [ ]`)로 추적한다. 각 Task 끝의 검증을 통과한 뒤 다음 Task 로 간다.

**Goal:** 모바일 레이아웃은 그대로 두고, 데스크탑(≥1024px)에서 홈과 AI활용 허브가 화면 폭을 자연스럽게 쓰게 한다. 컨테이너를 1152px 고정에서 "거의 유동(최대 1920px)"으로 바꾸고, 카드 그리드는 열 수를 늘려 카드 크기를 유지하며, 히어로 배경은 화면 끝까지, 모션 상세는 넓은 화면에서 2단으로 배치한다.

**Architecture:** 폭은 Tailwind 4 `@theme` 토큰 두 개(`--container-site` 120rem, `--container-wide` 96rem)로만 정한다. 토큰은 자동으로 `max-w-site`·`max-w-wide` 유틸리티가 된다. 좌우 여백은 CSS 변수 `--gutter` 하나를 미디어 쿼리로 키우고, `gutter` 유틸리티가 그 값을 쓴다. 홈 섹션은 `Section` 의 `width` prop 으로, 허브 화면은 유틸리티 직접 사용으로 폭을 고른다. 문단은 `max-w-2xl`(42rem)로 읽기 폭을 지킨다.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4(`@theme`·`@utility`), vitest 5, Playwright 1.64.

**Spec:** `docs/superpowers/specs/2026-10-19-desktop-layout-design.md`

## Global Constraints

- **모바일(<1024px)은 결과가 바뀌지 않는다.** `lg:` 미만 클래스는 손대지 않는다. 좌우 여백 `--gutter` 의 모바일 값(8·12·16px)은 지금의 `px-2 sm:px-3 md:px-4` 와 같아야 한다.
- 폭 숫자는 `web/src/app/globals.css` 의 토큰에만 둔다. 컴포넌트에 `max-w-[…px]` 를 새로 쓰지 않는다. 남아 있는 `max-w-6xl` 은 0개여야 한다(`max-w-md`·`max-w-2xl` 같은 문단·폼 폭은 예외).
- 반응형 규칙: 라벨 `whitespace-nowrap`, 칩 줄 가로 스크롤, 터치 타깃 `min-h-11`, `dvh`, `break-words`·`break-all` 금지. e2e 의 375px 가로 스크롤 검사(`smoke`·`motion`·`slide`·`account`)는 그대로 통과해야 한다.
- 섹션 id(`SECTION_IDS`)·`data-testid`·anchor 동작(`scroll-mt-[var(--nav-h)]`)은 바꾸지 않는다. 히어로는 `section#hero` 안에 `h1` 1개와 `svg[aria-hidden]` 1개를 유지한다.
- 사본 룩북의 사이드바 제거(스펙 §5)는 **이 계획의 범위 밖**이다. 네트워크 허용 또는 마크업 전달 뒤 별도로 진행한다.
- 작업 브랜치 `claude/busy-wright-f3z97j`, 검증 뒤 `main` 에 fast-forward 로 반영(운영자 1인 흐름). 커밋 메시지 끝에 세션의 attribution 줄을 붙인다. 모델 식별자는 커밋 본문에 쓰지 않는다.
- 주석은 "왜"가 비자명할 때만 한국어로 쓴다.

## Review Focus

1. **375px 가로 스크롤** — 히어로를 `Section` 밖으로 꺼낸 뒤에도 `scrollWidth <= innerWidth`. → Task 4, 기존 `smoke.spec` 375px 검사
2. **히어로 분리 후 앵커·구조** — `section#hero h1` 텍스트, `svg[aria-hidden]` 1개, `/#hero` 로 Nav 아래 정확히 멈춤. → Task 4, `smoke.spec` hero 검사 + 새 `desktop.spec`
3. **모션 상세 2단** — 1280px 이상에서 영상과 프롬프트 버튼이 같은 줄, 1024px 이하에서는 지금처럼 1단. 오른쪽 열 sticky 가 영상 아래 이전/다음 링크를 가리지 않는다. → Task 6, `desktop.spec`
4. **QHD(2560) 중앙 정렬** — Nav·갤러리가 1920px 에서 멈추고 좌우가 같은 여백. → Task 7 `desktop.spec`
5. **저서 3권 6열 그리드** — 표지 3장이 왼쪽부터 3칸, 나머지 3칸은 빈 채로. 표지가 과하게 커지지 않는다(≈290px). → Task 3, 스크린샷

---

## 파일 구조

| 파일 | 변경 |
|---|---|
| `web/src/app/globals.css` | `@theme` 폭 토큰 2개, `--gutter` 변수(미디어 쿼리), `@utility gutter` |
| `web/src/components/Section.tsx` | `width?: 'site' \| 'wide'` prop, `gutter` 적용 |
| `web/src/components/Nav.tsx` | `max-w-6xl` → `max-w-site`, 여백 `gutter` |
| `web/src/components/ai-hub/AiHeader.tsx` | `max-w-site`, 소개문 `max-w-2xl` |
| `web/src/app/(ko)/ai/(hub)/{motion,slide,brand}/page.tsx` | 컨테이너 `max-w-site` + `gutter` |
| `web/src/app/(ko)/ai/(hub)/motion/[id]/page.tsx` | `max-w-site`, `xl:` 2단 그리드, 오른쪽 열 sticky |
| `web/src/components/sections/Hero.tsx` | `Section` 대신 자체 `<section id="hero">`, 배경 full-bleed |
| `web/src/components/sections/{Stats,Timeline,Pillars,Projects,Books,Lectures,Contact}.tsx` | `width` 지정, 열 수 조정 |
| `web/src/components/motion-gallery/MotionGallery.tsx` | `xl:grid-cols-5 2xl:grid-cols-6` |
| `web/src/components/slide-gallery/SlideGallery.tsx` | `xl:grid-cols-4` |
| `web/e2e/desktop.spec.ts` (신규) | 1920·2560·1280 폭 레이아웃 검사 |
| `.claude/PROJECT_MAP.md` | Nav·Section·갤러리 행 갱신, 폭 체계 한 줄 |

---

## Task 1: 폭 토큰과 여백 유틸리티

**Files:** `web/src/app/globals.css`, `web/src/components/Section.tsx`

- [ ] `globals.css` 의 `@import "./tokens.css";` 아래에 토큰과 여백을 추가한다. `tokens.css` 는 생성 파일이라 건드리지 않는다.

```css
/* 데스크탑 폭 체계 (spec 2026-10-19-desktop-layout-design §2).
   --container-* 토큰은 Tailwind 4 가 max-w-site / max-w-wide 유틸리티로 만들어 준다. */
@theme {
  --container-site: 120rem; /* 1920px — 셸·갤러리·상세 */
  --container-wide: 96rem;  /* 1536px — 글이 섞인 홈 섹션 */
}

/* 좌우 여백은 화면이 넓을수록 키운다. 모바일 값은 기존 px-2 sm:px-3 md:px-4 와 같다. */
:root { --gutter: 0.5rem; }
@media (min-width: 40rem) { :root { --gutter: 0.75rem; } }  /* sm */
@media (min-width: 48rem) { :root { --gutter: 1rem; } }     /* md */
@media (min-width: 64rem) { :root { --gutter: 1.5rem; } }   /* lg */
@media (min-width: 80rem) { :root { --gutter: 2rem; } }     /* xl */
@media (min-width: 96rem) { :root { --gutter: 2.5rem; } }   /* 2xl */

@utility gutter { padding-inline: var(--gutter); }
@utility -mx-gutter { margin-inline: calc(var(--gutter) * -1); }
```

- [ ] `Section.tsx` 에 `width` prop 을 더하고 여백을 `gutter` 로 바꾼다. 기본은 `site`.

```tsx
export function Section({ id, title, dark = false, width = 'site', children }: {
  id: SectionId; title?: string; dark?: boolean; width?: 'site' | 'wide'; children: ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-[var(--nav-h)] gutter py-10 lg:py-16 ${dark ? 'bg-dark-bg text-dark-fg' : ''}`}>
      <div className={`mx-auto w-full ${width === 'wide' ? 'max-w-wide' : 'max-w-site'}`}>
        {title ? <h2 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2> : null}
        {children}
      </div>
    </section>
  );
}
```

- [ ] 검증: `npm run typecheck -w web`, `npm run lint -w web`. 빌드 CSS 에 `.max-w-site` 와 `.gutter` 가 생겼는지 `npm run build -w web` 뒤 `grep -o "max-w-site" web/.next/static/css/*.css | head -1` 로 확인.
- [ ] 커밋: `style(layout): 데스크탑 폭 토큰(site·wide)과 gutter 유틸리티`

## Task 2: 셸과 허브 컨테이너 교체

**Files:** `Nav.tsx`, `ai-hub/AiHeader.tsx`, `(hub)/motion/page.tsx`, `(hub)/slide/page.tsx`, `(hub)/brand/page.tsx`, `(hub)/motion/[id]/page.tsx`(컨테이너만)

- [ ] `Nav.tsx`: `<nav className="mx-auto flex h-full max-w-6xl items-center gap-2 px-2 sm:px-3">` → `mx-auto flex h-full max-w-site items-center gap-2 gutter`. 로고·앵커·언어 토글·계정 순서는 그대로.
- [ ] `AiHeader.tsx`: `<header className="px-2 pt-6 sm:px-3 md:px-4 lg:px-6">` → `gutter pt-6`, 안쪽 `max-w-6xl` → `max-w-site`. 소개문 `<p className="mt-1 text-sm text-muted">` 에 `max-w-2xl` 추가(한 줄이 1800px 로 늘어지지 않게).
- [ ] 허브 3개 페이지의 `<section className="px-2 … lg:px-6">` → `gutter …`, `max-w-6xl` → `max-w-site`. 모션 상세는 `max-w-5xl` → `max-w-site`(2단 배치는 Task 6).
- [ ] `MotionGallery` 필터 툴바·`AiTabs` 의 `-mx-2 … px-2` 는 그대로 둔다(8px 만 흘러넘치는 가로 스크롤 영역, 모바일 전용 효과).
- [ ] 검증: `grep -rn "max-w-6xl" web/src` 가 0건. typecheck·lint. e2e `hub.spec`·`motion.spec`(머리글·탭·푸터) 통과.
- [ ] 커밋: `style(shell): Nav·AI활용 헤더·허브 페이지를 site 폭으로`

## Task 3: 홈 섹션 폭과 그리드

**Files:** `components/sections/{Stats,Timeline,Pillars,Projects,Books,Lectures,Contact}.tsx`

| 컴포넌트 | `width` | 그리드 변경 |
|---|---|---|
| Stats | `site`(기본) | 없음 (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`) |
| Timeline | `wide` | 연구회·자료 소그리드 `sm:grid-cols-2 lg:grid-cols-3` → `… xl:grid-cols-4` |
| Pillars | `wide` | 없음 (`md:grid-cols-3`) |
| Projects | `site` | `sm:grid-cols-2 lg:grid-cols-3` → `… xl:grid-cols-4 2xl:grid-cols-5` |
| Books | `site` | `sm:grid-cols-3` → `sm:grid-cols-3 xl:grid-cols-6` |
| Lectures | `wide` | 없음 |
| Contact | `wide` | 없음 |

- [ ] 각 파일에서 `<Section id=… title=…>` 에 `width="wide"` 를 넣거나(Timeline·Pillars·Lectures·Contact) 기본값을 둔다.
- [ ] Timeline 소그리드 2곳, Projects, Books 의 그리드 클래스를 표대로 바꾼다.
- [ ] 검증: typecheck·lint. `smoke.spec` 의 `project-card` 5개·`section#books img` 3개·`timeline li` 개수 검사 통과. Books 는 1920 스크린샷에서 표지 폭 ≈ 290px(Task 8).
- [ ] 커밋: `style(home): 섹션 폭(site·wide) 지정, 프로젝트·저서·소그리드 열 수 확대`

## Task 4: 히어로 full-bleed

**Files:** `components/sections/Hero.tsx`

- [ ] `Section` 을 쓰지 않고 자체 `<section id="hero">` 를 그린다. 배경(`HeroStage` 의 그리드 SVG + 루프 영상)은 섹션 전체(`relative overflow-hidden`)에 깔리고, 글과 픽토그램만 `max-w-site` 컨테이너 안에 둔다. 음수 마진 트릭(`-mx-2 -mt-10 …`)은 제거한다.

```tsx
export function Hero({ profile, ui, locale }: { profile: Profile; ui: Ui; locale: Locale }) {
  return (
    <section id="hero" className="relative flex min-h-[calc(100dvh-var(--nav-h)-var(--footer-h))] scroll-mt-[var(--nav-h)] flex-col justify-center overflow-hidden gutter py-10">
      <HeroStage video={{ srcMp4: '/video/hero-loop.mp4', srcWebm: '/video/hero-loop.webm', poster: '/video/hero-poster.jpg', playLabel: ui.hero.playVideo }}>
        <div className="relative z-[1] mx-auto flex w-full max-w-site flex-col gap-6 lg:flex-row lg:items-center">
          <div className="pointer-events-none flex-1 [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
            {/* Typewriter 3개, 소개문 max-w-2xl, VideoDialog, 스크롤 힌트 — 지금 그대로 */}
          </div>
          <div className="pointer-events-none flex justify-center lg:w-80">
            <Image … className="w-48 rounded-2xl sm:w-64 lg:w-80" />
          </div>
        </div>
      </HeroStage>
    </section>
  );
}
```

- [ ] `HeroStage` 는 `GridBackground`(`absolute inset-0`)와 영상(`absolute inset-0 opacity-60`)을 children 앞에 렌더하므로 부모가 `relative` 이면 그대로 full-bleed 가 된다. `HeroStage`·`GridBackground`·`HeroVideo` 는 수정하지 않는다.
- [ ] 소개문의 `max-w-2xl` 은 유지(읽기 폭). 1920 에서 텍스트 블록은 왼쪽, 픽토그램은 오른쪽 끝에 놓인다 — 과하게 벌어지면 안쪽 컨테이너를 `max-w-wide` 로 내리는 것을 Task 8 스크린샷에서 판단한다.
- [ ] 검증: `smoke.spec` 의 `section#hero h1`·`svg[aria-hidden]` 1개·hero 영상(`hero-video`) 로드·375px 가로 스크롤·`prefers-reduced-motion` 검사 통과. `/#hero` 앵커가 Nav 바로 아래에서 멈춤(수동).
- [ ] 커밋: `style(hero): 배경을 화면 끝까지, 내용은 site 폭 안으로`

## Task 5: 갤러리 열 수

**Files:** `motion-gallery/MotionGallery.tsx`, `slide-gallery/SlideGallery.tsx`

- [ ] MotionGallery: `grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4` → `… lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6`.
- [ ] SlideGallery: `grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3` → `… lg:grid-cols-3 xl:grid-cols-4`.
- [ ] 검증: `motion.spec`·`slide.spec` 통과(카드 수·필터·해시 동작은 열 수와 무관). 1920 에서 모션 6열·슬라이드 4열은 Task 7 e2e.
- [ ] 커밋: `style(gallery): 넓은 화면에서 모션 6열·슬라이드 4열`

## Task 6: 모션 상세 2단

**Files:** `(hub)/motion/[id]/page.tsx`

- [ ] `<article>` 안 컨테이너를 2단 그리드로 바꾼다. 1280px 미만은 지금과 같은 1단(DOM 순서 = 영상 → 머리글 → 용도 → 컨셉 → 복사 → 이전/다음).

```tsx
<article className="gutter py-6">
  <div className="mx-auto grid w-full max-w-site gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] xl:gap-8">
    <video … className="aspect-video w-full rounded-[var(--radius-card)] bg-black" />
    <div className="xl:sticky xl:top-[calc(var(--nav-h)+1rem)] xl:self-start">
      <header className="flex items-baseline gap-x-3">…</header>
      <p className="mt-1 text-sm text-muted">{item.use}</p>
      <p className="mt-4 leading-relaxed">{item.concept}</p>
      <PromptCopy … />
      <nav className="mt-6 flex flex-wrap items-center gap-2" aria-label="motion">…</nav>
    </div>
  </div>
  <KeyNav … />
</article>
```

- [ ] 영상 아래에 아무것도 남기지 않는다(이전/다음도 오른쪽 열로). `mt-4` 였던 머리글 간격은 1단에서 그대로 보이도록 `xl:` 없이 유지한다.
- [ ] 오른쪽 열이 긴 컨셉 글로 뷰포트보다 길어질 수 있으므로 `xl:max-h-[calc(100dvh-var(--nav-h)-var(--footer-h)-2rem)] xl:overflow-y-auto` 를 둘지 스크린샷으로 판단한다(기본은 두지 않는다 — 대부분 한 화면에 들어온다).
- [ ] 검증: `prompt-copy.spec`·`membership.spec`·`motion.spec` 상세 검사(영상 src·ArrowRight 이동·375px 가로 스크롤) 통과. 2단 여부는 Task 7.
- [ ] 커밋: `style(motion-detail): 1280px 이상에서 영상 왼쪽·정보 오른쪽 2단`

## Task 7: 데스크탑 e2e

**Files:** `web/e2e/desktop.spec.ts`(신규)

- [ ] 픽스처에는 모션 카드가 2장뿐이므로 "한 줄 6개"는 DOM 이 아니라 **그리드 열 수**로 검사한다.

```ts
import { expect, test, type Page } from '@playwright/test';

const cols = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);

test.describe('1920 (FHD)', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });
  test('galleries use 6 / 4 columns and the shell spans the width', async ({ page }) => {
    await page.goto('/ai/motion/');
    expect(await cols(page, 'ul.grid')).toBe(6);
    const nav = await page.getByRole('navigation', { name: 'primary' }).boundingBox();
    expect(nav!.width).toBeGreaterThan(1800);          // 1920 − gutter 40×2
    await page.goto('/ai/slide/');
    expect(await cols(page, 'ol.grid')).toBe(4);
  });
  test('motion detail is two-column: video left, prompt buttons right', async ({ page }) => {
    await page.goto('/ai/motion/01-pixel/');
    const video = (await page.getByTestId('motion-video').boundingBox())!;
    const copy = (await page.getByTestId('copy-prompt-en').boundingBox())!;
    expect(copy.x).toBeGreaterThan(video.x + video.width);   // 오른쪽 열
    expect(copy.y).toBeLessThan(video.y + video.height);     // 같은 높이 띠 안
  });
  test('hero background spans the viewport, text stays in the container', async ({ page }) => {
    await page.goto('/');
    const stage = (await page.locator('section#hero svg[aria-hidden]').boundingBox())!;
    expect(Math.round(stage.width)).toBe(1920);
    const h1 = (await page.locator('section#hero h1').boundingBox())!;
    expect(h1.x).toBeGreaterThanOrEqual(40);
  });
});

test.describe('2560 (QHD)', () => {
  test.use({ viewport: { width: 2560, height: 1440 } });
  test('content is capped at 1920 and centered', async ({ page }) => {
    await page.goto('/ai/motion/');
    const grid = (await page.locator('ul.grid').boundingBox())!;
    expect(Math.round(grid.width)).toBeLessThanOrEqual(1920 - 80);
    expect(Math.round(grid.x)).toBe(Math.round(2560 - grid.x - grid.width)); // 좌우 여백 같음
  });
});

test.describe('1024 (lg) keeps one column detail', () => {
  test.use({ viewport: { width: 1024, height: 768 } });
  test('motion detail stacks', async ({ page }) => {
    await page.goto('/ai/motion/01-pixel/');
    const video = (await page.getByTestId('motion-video').boundingBox())!;
    const copy = (await page.getByTestId('copy-prompt-en').boundingBox())!;
    expect(copy.y).toBeGreaterThan(video.y + video.height);
  });
});
```

- [ ] 선택자 `ul.grid`·`ol.grid` 가 갤러리 하나만 잡는지 확인(필요하면 `data-testid="motion-grid"`·`slide-grid` 를 붙인다).
- [ ] 검증: `npx playwright test e2e/desktop.spec.ts` + 전체 e2e. 이 컨테이너에서는 `playwright.local.config.ts`(사전 설치 Chromium 경로, 커밋 안 함)로 돌린다. DB 없는 환경에서 실패하는 2개(`account.spec` 대기 회원 메뉴, `admin.spec` DB 오류 알림)는 기존 상태이므로 CI 결과로 확인한다.
- [ ] 커밋: `test(e2e): 데스크탑 폭(1920·2560·1024) 레이아웃 검사`

## Task 8: 스크린샷 점검·문서·배포

- [ ] Playwright 스크립트로 `/`, `/ai/motion/`, `/ai/motion/01-pixel/`, `/ai/slide/`, `/ai/brand/` 를 375·768·1440·1920·2560 폭으로 전체 페이지 캡처해 scratchpad 에 저장하고 사용자에게 보낸다. 특히 (1) 히어로 텍스트와 픽토그램 간격, (2) 저서 표지 크기, (3) 모션 상세 오른쪽 열 높이를 본다. 어색하면 Task 4·3·6 의 "판단" 항목을 적용한다.
- [ ] 375·768 스크린샷은 변경 전(`main` 의 이전 커밋)과 비교해 차이가 없어야 한다.
- [ ] `.claude/PROJECT_MAP.md`: `Nav`·`Section` 행에 폭 체계 한 줄(`max-w-site`/`max-w-wide`/`gutter`, 토큰은 `globals.css`), 갤러리 행에 열 수, 모션 상세 행에 2단. 「주의사항」에 "새 화면은 `gutter` + `max-w-site|wide`, `max-w-6xl` 금지" 추가.
- [ ] `npm run typecheck -w web && npm run lint -w web && npm test` 전부 통과 → 브랜치 push → `main` fast-forward → Railway 배포 뒤 운영 사이트에서 1920 과 모바일 한 번씩 확인.
- [ ] 커밋: `docs(map): 데스크탑 폭 체계 기록`

---

## 롤백

CSS 토큰·클래스만 바뀌고 데이터·라우트·API 는 그대로이므로, 문제가 있으면 `main` 에서 이 계획의 커밋들을 `git revert` 하면 된다. 히어로(Task 4)와 모션 상세(Task 6)는 독립 커밋이라 따로 되돌릴 수 있다.
