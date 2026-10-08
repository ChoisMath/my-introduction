# 최재혁 소개 페이지·영상 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `me.chois.pro` 에 공개할 한국어/영어 자기소개 정적 웹페이지와, 같은 콘텐츠·디자인 토큰으로 렌더링한 80초 모션그래픽 소개 영상(mp4)·히어로 루프를 만든다.

**Architecture:** npm workspaces 모노레포. `content/`(zod 스키마 + ko/en JSON + tokens.json)가 단일 진실 소스이고, `web/`(Next.js 16 `output: "export"`, Tailwind 4, motion)과 `video/`(Remotion)가 이를 import 한다. 웹은 두 개의 root layout(`(ko)`, `(en)/en`)으로 `/` 와 `/en/` 을 정적 생성하고 GitHub Pages 에 배포한다. 영상은 로컬에서 렌더링해 결과물을 `web/public/video/` 에 커밋한다.

**Tech Stack:** Node 24, TypeScript 6, Next.js 16.4, React 19.2, Tailwind 4.3, motion 14, zod 4.6, Remotion 4.0.534(+ @remotion/cli, @remotion/fonts, @remotion/google-fonts), vitest 5, @playwright/test 1.64, serve 14, tsx 4.23, pretendard 1.3.9, @fontsource-variable/jetbrains-mono 5.3. 이미지 변환은 macOS `sips` + Homebrew `cwebp`, 영상 후처리는 `ffmpeg`(설치됨).

**Spec:** `docs/superpowers/specs/2026-10-09-my-introduction-design.md`

## Global Constraints

- 저장 위치는 `/Volumes/Chois_SD2/dev/my_intoduction` (폴더명 오타 유지). GitHub 저장소명은 `ChoisMath/my-introduction`, 도메인 `me.chois.pro`.
- 라우트는 `/`(ko)·`/en/`(en) 두 개뿐. `trailingSlash: true`, `images.unoptimized: true`, `output: "export"`. 정적 내보내기 미지원 기능(Route Handler·redirects·headers·Server Actions·동적 라우트) 사용 금지.
- 개인 식별 정보(주민번호·주소·서명·전화) 는 어떤 파일에도 넣지 않는다. `asset/*.html`, `asset/*_files/`, `asset/*.zip` 는 git 제외.
- 섹션 8개 id 는 정확히 `hero, stats, timeline, pillars, projects, books, lectures, contact`.
- 영상: 1920×1080, 30fps, Intro 82초(2460프레임), HeroLoop 20초(600프레임), mp4 ≤ 20MB, 루프 webm/mp4 각 ≤ 5MB.
- 반응형 규칙(글로벌): 모바일 바깥 여백 `p-2`, 표는 `overflow-x-auto` + 모든 셀 `whitespace-nowrap` + sticky 헤더에 불투명 배경, 버튼·배지·탭 `whitespace-nowrap`, 터치 타겟 `min-h-11`, `100vh` 대신 `100dvh`, `break-words`/`break-all` 금지.
- 코드 주석은 "왜"가 비자명할 때만. `any` 금지. 커밋 메시지는 한국어 요약 + `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` 트레일러.
- 버전은 이 문서의 lockfile 이 기준. `npm view` 최신으로 올리지 않는다.
- SD 카드(APFS) 에서 `npm ci` 가 10분을 넘기면 `/Users/chois/dev/my_intoduction-work` 에 `git clone` 해 그곳에서 설치·빌드하고 결과를 push 로 되돌린다.

## Review Focus

1. **ko/en 콘텐츠 불일치** — 한쪽 JSON 에만 항목을 추가하면 빌드가 실패하고 어떤 id 가 빠졌는지 메시지에 나와야 한다. → Task 3 `parity.test.ts`.
2. **언어 토글의 해시 처리** — 해시가 없거나 `#` 로 시작하지 않는 값이 와도 `/en/` 또는 `/` 로 정상 이동해야 한다. → Task 4 `locale.test.ts`.
3. **자산 누락** — 목업·표지 파일이 없어도 빌드가 깨지지 않고, 페이지의 모든 `<img>` 가 실제로 로드(naturalWidth > 0)되어야 한다. → Task 9 e2e `images load`.
4. **모바일 가로 스크롤** — 375px 에서 `scrollWidth <= innerWidth`. 표·배지·긴 기관명이 원인이 되기 쉽다. → Task 9 e2e `no horizontal scroll`.
5. **reduced-motion 에서 내용 가려짐** — 모션을 끄면 `Reveal` 이 opacity 0 으로 남아 섹션이 안 보이는 사고가 흔하다. 비디오는 로드되지 않아야 한다. → Task 10 e2e `reduced motion`.
6. **영상 씬 시간표 구멍** — 씬 구간이 겹치거나 비면 검은 프레임이 생긴다. → Task 11 `timeline.test.ts`.

---

## File Structure

```
my_intoduction/
├── package.json                     # workspaces: content, web, video. 루트 스크립트
├── package-lock.json
├── tsconfig.base.json               # strict, noUncheckedIndexedAccess, resolveJsonModule
├── vitest.config.ts                 # content/, scripts/, web/src/lib, video/src 의 *.test.ts
├── .gitignore
├── .github/workflows/deploy.yml     # Pages 배포
├── README.md
├── asset/                           # 사용자 원본 (사진·픽토그램·표지·projects/*.svg|png)
│   ├── README.md                    # 필요 자산 목록·교체 방법
│   └── projects/{id}.svg            # 목업 자리표시 (실물 png/jpg 로 교체)
├── content/
│   ├── package.json                 # @me/content
│   ├── schema.ts                    # zod 스키마·타입
│   ├── index.ts                     # getContent(locale), locales
│   ├── stats.ts                     # computeStats(content, now)
│   ├── tokens.json                  # 색·폰트·반경
│   ├── ko/{profile,projects,ui}.json
│   ├── en/{profile,projects,ui}.json
│   └── __tests__/{schema,parity,stats}.test.ts
├── scripts/
│   ├── validate-content.ts          # npm run content:validate
│   ├── gen-tokens-css.ts            # tokens.json → web/src/app/tokens.css
│   ├── prepare-assets.sh            # asset/ → web/public/img, video/public/img
│   ├── render-video.sh              # Remotion 렌더 → web/public/video, og.png
│   └── __tests__/gen-tokens-css.test.ts
├── web/
│   ├── package.json · next.config.ts · tsconfig.json · postcss.config.mjs · eslint.config.mjs · playwright.config.ts
│   ├── public/{CNAME,.nojekyll,robots.txt,sitemap.xml}
│   ├── public/img/                  # prepare-assets 산출 (커밋)
│   ├── public/video/                # render-video 산출 (커밋)
│   ├── src/app/globals.css · tokens.css(생성) · icon.png · apple-icon.png
│   ├── src/app/(ko)/{layout,page}.tsx
│   ├── src/app/(en)/en/{layout,page}.tsx
│   ├── src/components/RootShell.tsx · HomePage.tsx · Nav.tsx · LangToggle.tsx · Section.tsx
│   ├── src/components/sections/{Hero,Stats,Timeline,Pillars,Projects,Books,Lectures,Contact}.tsx
│   ├── src/components/motion/{Reveal,CountUp,GridBackground}.tsx
│   ├── src/components/HeroVideo.tsx · VideoDialog.tsx
│   ├── src/lib/{locale,sections,metadata}.ts · src/lib/locale.test.ts
│   └── e2e/smoke.spec.ts
└── video/
    ├── package.json · tsconfig.json · remotion.config.ts · scripts/copy-font.mjs
    ├── public/fonts/PretendardVariable.woff2 (postinstall 복사) · public/img/ (prepare-assets) · public/audio/bgm.mp3 (선택)
    └── src/index.ts · Root.tsx · theme.ts · fonts.ts · timeline.ts · timeline.test.ts
        ├── compositions/{Intro,HeroLoop,OgImage}.tsx
        ├── scenes/{Opening,Tagline,Timeline,Pillars,Stats,Projects,Books,Ending}.tsx
        └── components/{Grid,Curve,Badge,MockupCard,Caption}.tsx
```

---

### Task 1: 모노레포 뼈대와 테스트 러너

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `vitest.config.ts`, `content/package.json`, `README.md`
- Modify: `.gitignore`

**Interfaces:**
- Produces: 루트 스크립트 `npm run test`(vitest), `npm run check`, 워크스페이스 이름 `@me/content`, `web`, `video`.

- [ ] **Step 1: 루트 package.json 작성**

```json
{
  "name": "my-introduction",
  "private": true,
  "type": "module",
  "workspaces": ["content", "web", "video"],
  "engines": { "node": ">=24 <25" },
  "scripts": {
    "test": "vitest run",
    "content:validate": "tsx scripts/validate-content.ts",
    "tokens:css": "tsx scripts/gen-tokens-css.ts",
    "assets": "bash scripts/prepare-assets.sh",
    "dev": "npm run dev -w web",
    "build:web": "npm run build -w web",
    "video:studio": "npm run studio -w video",
    "render": "bash scripts/render-video.sh",
    "e2e": "npm run e2e -w web",
    "check": "npm run content:validate && npm run test && npm run lint -w web && npm run typecheck -w web && npm run typecheck -w video"
  },
  "devDependencies": {
    "tsx": "4.23.15",
    "typescript": "6.0.3",
    "vitest": "5.0.3",
    "zod": "4.6.5"
  }
}
```

- [ ] **Step 2: tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "paths": {
      "@me/content": ["./content/index.ts"],
      "@me/content/*": ["./content/*"]
    }
  }
}
```

- [ ] **Step 3: vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@me/content': path.resolve(__dirname, 'content/index.ts') } },
  test: {
    include: [
      'content/**/*.test.ts',
      'scripts/**/*.test.ts',
      'web/src/lib/**/*.test.ts',
      'video/src/**/*.test.ts',
    ],
    environment: 'node',
  },
});
```

- [ ] **Step 4: content/package.json 과 README**

```json
{ "name": "@me/content", "version": "0.0.0", "private": true, "type": "module", "main": "index.ts", "types": "index.ts" }
```

`README.md`:

```markdown
# my-introduction

최재혁 소개 페이지(`me.chois.pro`)와 모션그래픽 소개 영상. 설계: `docs/superpowers/specs/2026-10-09-my-introduction-design.md`.

- `npm ci` → `npm run assets` → `npm run dev` (웹) / `npm run video:studio` (영상)
- `npm run check` : 콘텐츠 검증 + 단위 테스트 + lint + 타입 검사
- `npm run render` : 영상 렌더링 후 `web/public/video/` 로 복사
- 배포: `main` push → GitHub Actions → GitHub Pages
```

- [ ] **Step 5: .gitignore 에 추가**

```
web/out/
web/.next/
web/src/app/tokens.css
web/test-results/
web/playwright-report/
video/.remotion/
```

- [ ] **Step 6: 설치 후 vitest 가 "no test files" 로 끝나는지 확인**

Run: `npm install && npx vitest run`
Expected: `No test files found` (exit code 1 은 vitest 기본 동작이며 정상. `--passWithNoTests` 는 쓰지 않는다 — 이후 태스크에서 테스트가 생긴다.)

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: npm workspaces 모노레포 뼈대와 vitest 설정

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: 콘텐츠 스키마·토큰·한국어 콘텐츠

**Files:**
- Create: `content/schema.ts`, `content/tokens.json`, `content/ko/profile.json`, `content/ko/projects.json`, `content/ko/ui.json`, `content/__tests__/schema.test.ts`

**Interfaces:**
- Produces: `profileSchema`, `projectsSchema`, `uiSchema`, `tokensSchema`, 타입 `Profile`, `Project`, `Ui`, `Tokens`, `TimelineItem`, `Book`, `Pillar`, `Locale`.

- [ ] **Step 1: 실패하는 테스트 작성** — `content/__tests__/schema.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { profileSchema, projectsSchema, uiSchema, tokensSchema } from '../schema';
import profileKo from '../ko/profile.json';
import projectsKo from '../ko/projects.json';
import uiKo from '../ko/ui.json';
import tokens from '../tokens.json';

describe('ko content matches schema', () => {
  it('profile parses and has 3 pillars and 3 books', () => {
    const p = profileSchema.parse(profileKo);
    expect(p.pillars).toHaveLength(3);
    expect(p.books).toHaveLength(3);
    expect(p.since).toBe('2012-03');
  });
  it('projects parses with 5 projects and unique ids', () => {
    const list = projectsSchema.parse(projectsKo);
    expect(list).toHaveLength(5);
    expect(new Set(list.map((x) => x.id)).size).toBe(5);
  });
  it('timeline ids are unique across all arrays', () => {
    const p = profileSchema.parse(profileKo);
    const ids = [...p.education, ...p.career, ...p.awards, ...p.groups, ...p.materials, ...p.lecturesTeacher, ...p.lecturesStudent].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('ui and tokens parse', () => {
    expect(() => uiSchema.parse(uiKo)).not.toThrow();
    expect(tokensSchema.parse(tokens).color.accent).toMatch(/^#[0-9A-F]{6}$/);
  });
  it('rejects an isbn that is not 13 digits', () => {
    const bad = { ...profileKo, books: [{ ...profileKo.books[0], isbn: '123' }] };
    expect(() => profileSchema.parse(bad)).toThrow();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run content`
Expected: FAIL — `Cannot find module '../schema'`

- [ ] **Step 3: content/schema.ts**

```ts
import { z } from 'zod';

export const localeSchema = z.enum(['ko', 'en']);
export type Locale = z.infer<typeof localeSchema>;

export const timelineKindSchema = z.enum([
  'edu', 'career', 'award', 'cert', 'group', 'material', 'lecture-teacher', 'lecture-student',
]);

export const timelineItemSchema = z.object({
  id: z.string().min(1),
  period: z.string().min(1),
  title: z.string().min(1),
  org: z.string().optional(),
  detail: z.string().optional(),
  kind: timelineKindSchema,
  // 영상·히어로 배지에 쓰는 대표 항목
  highlight: z.boolean().optional(),
});
export type TimelineItem = z.infer<typeof timelineItemSchema>;

export const bookSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  role: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  isbn: z.string().regex(/^\d{13}$/),
  publisher: z.string().optional(),
  url: z.url(),
  cover: z.string().startsWith('/img/'),
});
export type Book = z.infer<typeof bookSchema>;

export const pillarSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  items: z.array(z.string().min(1)).min(1).max(4),
});
export type Pillar = z.infer<typeof pillarSchema>;

const timelineArray = z.array(timelineItemSchema);

export const profileSchema = z.object({
  name: z.string().min(1),
  nameLatin: z.string().min(1),
  tagline: z.string().min(1),
  intro: z.string().min(1),
  affiliation: z.string().min(1),
  role: z.string().min(1),
  since: z.string().regex(/^\d{4}-\d{2}$/),
  photo: z.string().startsWith('/img/'),
  pictogram: z.string().startsWith('/img/'),
  education: timelineArray,
  career: timelineArray,
  awards: timelineArray,
  groups: timelineArray,
  materials: timelineArray,
  lecturesTeacher: timelineArray,
  lecturesStudent: timelineArray,
  books: z.array(bookSchema),
  pillars: z.array(pillarSchema).length(3),
  links: z.object({
    email: z.email(),
    github: z.url(),
    sites: z.array(z.object({ label: z.string().min(1), url: z.url() })),
  }),
});
export type Profile = z.infer<typeof profileSchema>;

export const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tagline: z.string().min(1),
  description: z.string().optional(),
  stack: z.array(z.string().min(1)).min(1),
  url: z.url().optional(),
  urlNote: z.string().optional(),
  youtubeId: z.string().optional(),
  mockup: z.string().startsWith('/img/projects/'),
});
export type Project = z.infer<typeof projectSchema>;
export const projectsSchema = z.array(projectSchema).min(1);

export const uiSchema = z.object({
  siteTitle: z.string().min(1),
  siteDescription: z.string().min(1),
  nav: z.object({
    hero: z.string(), stats: z.string(), timeline: z.string(), pillars: z.string(),
    projects: z.string(), books: z.string(), lectures: z.string(), contact: z.string(),
  }),
  hero: z.object({ watchVideo: z.string(), playVideo: z.string(), closeVideo: z.string(), scrollHint: z.string() }),
  stats: z.object({ years: z.string(), lectures: z.string(), books: z.string(), services: z.string(), awards: z.string() }),
  sections: z.object({
    stats: z.string(), timeline: z.string(), education: z.string(), awards: z.string(), pillars: z.string(),
    projects: z.string(), books: z.string(), materials: z.string(), lectures: z.string(), contact: z.string(),
  }),
  projects: z.object({ visit: z.string(), watch: z.string(), stack: z.string() }),
  lectures: z.object({ teacher: z.string(), student: z.string(), period: z.string(), title: z.string(), org: z.string() }),
  contact: z.object({ email: z.string(), github: z.string(), sites: z.string() }),
  lang: z.object({ switchTo: z.string(), switchLabel: z.string() }),
  footer: z.string(),
});
export type Ui = z.infer<typeof uiSchema>;

const hex = z.string().regex(/^#[0-9A-F]{6}$/);
export const tokensSchema = z.object({
  color: z.object({
    bg: hex, fg: hex, muted: hex, accent: hex, accentSoft: hex, grid: hex, line: hex,
    darkBg: hex, darkSurface: hex, darkFg: hex, darkMuted: hex, darkAccent: hex,
  }),
  font: z.object({ sans: z.string().min(1), mono: z.string().min(1) }),
  radius: z.object({ card: z.string().min(1) }),
});
export type Tokens = z.infer<typeof tokensSchema>;

export const contentSchema = z.object({ profile: profileSchema, projects: projectsSchema, ui: uiSchema });
export type Content = z.infer<typeof contentSchema>;
```

- [ ] **Step 4: content/tokens.json**

```json
{
  "color": {
    "bg": "#FFFFFF",
    "fg": "#0F172A",
    "muted": "#475569",
    "accent": "#1D3C77",
    "accentSoft": "#E8EEF8",
    "grid": "#E2E8F0",
    "line": "#CBD5E1",
    "darkBg": "#0B1220",
    "darkSurface": "#131C2E",
    "darkFg": "#E5E7EB",
    "darkMuted": "#94A3B8",
    "darkAccent": "#7DD3FC"
  },
  "font": {
    "sans": "'Pretendard Variable', Pretendard, -apple-system, 'Apple SD Gothic Neo', sans-serif",
    "mono": "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace"
  },
  "radius": { "card": "16px" }
}
```

- [ ] **Step 5: content/ko/profile.json** (약력 초안 `docs/content/profile-draft.md` 를 옮긴 것)

```json
{
  "name": "최재혁",
  "nameLatin": "Choi Jae-hyuk",
  "tagline": "수학교사 · 만드는 사람",
  "intro": "2012년부터 대구의 중·고등학교에서 수학을 가르쳐 왔습니다. GeoGebra로 시작한 공학적 도구 수업은 Python과 인공지능 수학으로 이어졌고, 지금은 수업과 학교 업무의 문제를 직접 웹 서비스로 만들어 풀고 있습니다. 배운 것은 교사 연수와 학생 강의로 다시 전달합니다.",
  "affiliation": "포산고등학교",
  "role": "수학교사",
  "since": "2012-03",
  "photo": "/img/photo.webp",
  "pictogram": "/img/pictogram.png",
  "education": [
    { "id": "edu-ba", "period": "~ 2011.08", "title": "홍익대학교 사범대학 수학교육과 졸업", "detail": "교육학사", "kind": "edu" },
    { "id": "edu-ma", "period": "2021.09 ~ 2024.02", "title": "경북대학교 교육대학원 AI융합교육전공 졸업", "detail": "교육학석사", "kind": "edu", "highlight": true }
  ],
  "career": [
    { "id": "car-2012", "period": "2012.03 ~ 2014.02", "title": "시지중학교 교사", "detail": "영재학급 수학 담당", "kind": "career" },
    { "id": "car-2013", "period": "2013 ~ 2015", "title": "대구동부교육지원청 영재교육원 강사", "detail": "수학 수업·영재 선발", "kind": "career" },
    { "id": "car-2014", "period": "2014.03 ~ 2019.02", "title": "대구서부고등학교 교사", "detail": "2018 보직교사", "kind": "career" },
    { "id": "car-2019", "period": "2019.03 ~ 2025.02", "title": "대구과학고등학교(영재학교) 교사", "detail": "교육과정부장 · 「인공지능」 교과 개설·담당(2022~2024)", "kind": "career" },
    { "id": "car-2025", "period": "2025.03 ~ 2026.02", "title": "경북대학교 파견교사", "detail": "IBEC 과정", "kind": "career" },
    { "id": "car-2026", "period": "2026.03 ~ 현재", "title": "포산고등학교 교사", "detail": "IB Math AA · 인공지능수학 공동교육과정", "kind": "career" }
  ],
  "awards": [
    { "id": "awd-2019", "period": "2019", "title": "전국학생통계활용대회 지도교사상(장려)", "kind": "award" },
    { "id": "awd-2020", "period": "2020", "title": "전국학생통계활용대회 지도교사상(은상)", "kind": "award" },
    { "id": "cert-2023-12", "period": "2023.12", "title": "AIEDAP 마스터교원", "org": "교육부 AI·디지털 교육 역량 강화 사업(대구경북권역)", "kind": "cert", "highlight": true },
    { "id": "awd-2024-05", "period": "2024.05", "title": "스승의 날 유공교원 표창", "org": "대구광역시교육감", "kind": "award" },
    { "id": "cert-2024-09", "period": "2024.09", "title": "대구 AI 디지털 융합 교육 혁신 플랫폼 객원연구원", "kind": "cert" },
    { "id": "awd-2024-12", "period": "2024.12", "title": "교원 디지털 역량 강화 유공교원 표창", "org": "부총리 겸 교육부장관", "kind": "award", "highlight": true }
  ],
  "groups": [
    { "id": "grp-2014", "period": "2014 ~ 2018", "title": "대구 중등수학연구회 공학용 도구 활용팀 회원", "kind": "group" },
    { "id": "grp-2020", "period": "2020 ~ 2022", "title": "인공지능 수학 교육과정 개발 연구회 회장", "org": "대구광역시교육청 융합교육과", "kind": "group" },
    { "id": "grp-2021-jump", "period": "2021 ~ 2023", "title": "인공지능 활용 수학 점핑학교 운영 참가교사", "detail": "칸아카데미 활용 · 교사-학생 멘토링", "kind": "group" },
    { "id": "grp-2022-pilot", "period": "2022.06 ~ 12", "title": "인공지능(AI) 융합교육 시범학급 운영", "detail": "대구과학고 고1 수학·지구과학·정보 융합, 드론·이미지 분류", "kind": "group" },
    { "id": "grp-2022-share", "period": "2022 ~ 2024", "title": "수학나눔학교 운영", "org": "대구광역시교육청 융합교육과", "kind": "group" },
    { "id": "grp-fest", "period": "2021 · 2022 · 2024", "title": "대구수학페스티벌 프로그램 개발·운영", "detail": "제13·14·16회 — 2022 수학탐구대회팀 팀장, 2024 수학체험기획팀 팀장", "kind": "group" },
    { "id": "grp-2026", "period": "2026", "title": "수학과 교육과정 수학 몰입캠프 연구회 회장", "kind": "group" }
  ],
  "materials": [
    { "id": "mat-2017-ebs", "period": "2017 ~ 2018", "title": "대구광역시교육청 중등 수학과 EBS 연계문항 자료집 개발팀", "kind": "material" },
    { "id": "mat-2017-exam", "period": "2017.11", "title": "대구광역시 모의고사 수리영역(가) 출제위원", "kind": "material" },
    { "id": "mat-2024-aidt", "period": "2024", "title": "고등학교 『수학1』 AI 디지털교과서 현장적합성 검토지원단", "kind": "material" }
  ],
  "lecturesTeacher": [
    { "id": "lt-2024-02", "period": "2024.02", "title": "AI 융합교육 사례 발표", "org": "경북대학교 AIEDAP 사업팀 워크숍", "kind": "lecture-teacher" },
    { "id": "lt-2024-06", "period": "2024.06", "title": "AI 융합교육 사례 및 ChatGPT 활용법", "org": "대구 중등화학연구회 총회", "kind": "lecture-teacher" },
    { "id": "lt-2024-07a", "period": "2024.07", "title": "교실혁명 선도교사 양성 연수 주강사", "org": "경북1팀", "kind": "lecture-teacher" },
    { "id": "lt-2024-07b", "period": "2024.07", "title": "AIEDAP 마스터교원 승급 연수 주강사(중등)", "org": "서울대학교 시흥캠퍼스", "kind": "lecture-teacher" },
    { "id": "lt-2024-08", "period": "2024.08", "title": "AIEDAP 권역통합 중등 예비교원 워크숍 강사", "org": "경주 교원드림센터", "kind": "lecture-teacher" },
    { "id": "lt-2025-06", "period": "2025.06 ~", "title": "2025 교실혁명 선도교사 양성 연수 강사", "org": "한국교육학술정보원", "kind": "lecture-teacher" },
    { "id": "lt-2025-consult", "period": "2025.08 ~ 2026.02", "title": "찾아가는 학교 컨설팅 주강사·코디네이터 (20회)", "org": "금오고, 해마루중, 구미인덕중 등", "detail": "디지털 문해력 · 데이터 기반 현장 연구 · 학교 교육과정 평가·환류", "kind": "lecture-teacher" },
    { "id": "lt-2025-10", "period": "2025.10", "title": "2025 AIEDAP 마스터교원 신규연수 중등 1차 강사", "org": "오송", "kind": "lecture-teacher" },
    { "id": "lt-2025-11", "period": "2025.11", "title": "2025 중등 수학교과 지도역량 강화 직무연수(2기) 강사", "org": "대구광역시교육연수원", "kind": "lecture-teacher" }
  ],
  "lecturesStudent": [
    { "id": "ls-small", "period": "2022 ~ 현재", "title": "「인공지능 수학」 「고급수학」 소인수 과목 수업", "org": "칠성고, 호산고, 달성고, 대구온라인학교 등", "kind": "lecture-student" },
    { "id": "ls-ml", "period": "2022 ~ 현재", "title": "「인공지능의 수학적 원리」 특강", "org": "성화여고, 포항제철고", "detail": "2024 「머신러닝의 수학적 원리: PCA」", "kind": "lecture-student" },
    { "id": "ls-rne", "period": "2022 ~ 2023", "title": "한국과학창의재단 R&E 지도", "detail": "발표대회 수상", "kind": "lecture-student" },
    { "id": "ls-dgist", "period": "2026", "title": "DGIST 중3 바이브 코딩 수업", "detail": "2회 × 150분", "kind": "lecture-student" }
  ],
  "books": [
    { "id": "book-geogebra-middle", "title": "지오지브라 중학교 수학", "role": "공저", "year": 2017, "isbn": "9791187541202", "url": "https://product.kyobobook.co.kr/detail/S000001903386", "cover": "/img/books/geogebra-middle.webp" },
    { "id": "book-geogebra-high", "title": "지오지브라 고등학교 수학", "role": "공저", "year": 2017, "isbn": "9791187541196", "url": "https://product.kyobobook.co.kr/detail/S000001903385", "cover": "/img/books/geogebra-high.webp" },
    { "id": "book-agentic-ai", "title": "에이전틱 AI 학교 교육 활용법", "role": "공저 (홍진우·류진현·유상은·최재혁)", "year": 2026, "isbn": "9791193059975", "publisher": "앤써북", "url": "https://product.kyobobook.co.kr/detail/S000221379920", "cover": "/img/books/agentic-ai.webp" }
  ],
  "pillars": [
    { "id": "teach", "title": "수학 수업", "summary": "학생마다 다른 속도를 공학적 도구로 맞춥니다.", "items": ["IB Math AA · 미적분 · 인공지능수학", "GeoGebra · Desmos · Python 으로 개별화 수업", "R&E · 통계활용대회 지도"] },
    { "id": "train", "title": "AI 융합교육 연수·강의", "summary": "배운 것을 교사와 학생에게 바로 쓸 수 있는 형태로 전달합니다.", "items": ["AIEDAP 마스터교원 · 승급·신규연수 강사", "교실혁명 선도교사 양성 연수 강사", "찾아가는 학교 컨설팅 20회"] },
    { "id": "build", "title": "교육용 서비스 개발", "summary": "학교에서 부딪힌 문제를 직접 웹 서비스로 만들어 운영합니다.", "items": ["교무수첩 · 수업 플랫폼 · 급식 · 출결 앱", "Next.js · Rails · Railway 로 실배포", "학생과 함께하는 바이브 코딩"] }
  ],
  "links": {
    "email": "complete860127@gmail.com",
    "github": "https://github.com/ChoisMath",
    "sites": [
      { "label": "ChoisNote", "url": "https://chois.pro" },
      { "label": "ChoisClass", "url": "https://class.chois.ai.kr" }
    ]
  }
}
```

- [ ] **Step 6: content/ko/projects.json**

```json
[
  { "id": "choisnote", "name": "ChoisNote", "tagline": "교사용 스마트 교무수첩·협업 플랫폼", "description": "일정·학급·상담·AI 생기부·Google 연동. PWA와 Android 앱으로 제공.", "stack": ["Rails 8", "Hotwire", "Tailwind", "PostgreSQL", "Railway"], "url": "https://chois.pro", "mockup": "/img/projects/choisnote.svg" },
  { "id": "choisclass", "name": "ChoisClass", "tagline": "태블릿 필기 기반 수학 수업 플랫폼", "description": "실시간 필기 공유와 인터랙티브 HTML 도구 페이지.", "stack": ["React", "Fastify", "Socket.IO", "Excalidraw"], "url": "https://class.chois.ai.kr", "urlNote": "교사·학생 전용", "mockup": "/img/projects/choisclass.svg" },
  { "id": "posanmeal", "name": "PosanMeal", "tagline": "학교 급식 신청·확인 앱", "stack": ["Next.js", "Prisma", "Railway"], "url": "https://meal.posan.kr", "urlNote": "교직원·학생 전용", "mockup": "/img/projects/posanmeal.svg" },
  { "id": "selfstudy", "name": "자율학습 출석부", "tagline": "자율학습(오후·야간) 출결 관리 앱", "stack": ["Next.js", "Prisma", "Railway"], "url": "https://self.posan.kr", "urlNote": "교직원·학생 전용", "mockup": "/img/projects/selfstudy.svg" },
  { "id": "mathcoach", "name": "MathCoach", "tagline": "AI 수학 코칭 도구", "description": "문제 은행과 OCR 로 학생 풀이를 읽고 피드백.", "stack": ["Firebase", "Genkit", "Gemini"], "mockup": "/img/projects/mathcoach.svg" }
]
```

- [ ] **Step 7: content/ko/ui.json**

```json
{
  "siteTitle": "최재혁 — 수학교사 · 만드는 사람",
  "siteDescription": "포산고등학교 수학교사 최재혁의 소개. AI 융합교육 연수·강의, 직접 만든 교육용 서비스, 저서와 경력.",
  "nav": { "hero": "소개", "stats": "숫자", "timeline": "경력", "pillars": "하는 일", "projects": "만든 서비스", "books": "저서", "lectures": "강의", "contact": "연락" },
  "hero": { "watchVideo": "소개 영상 보기", "playVideo": "영상 재생", "closeVideo": "닫기", "scrollHint": "아래로" },
  "stats": { "years": "교직 년차", "lectures": "강의·연수", "books": "저서(공저)", "services": "운영 서비스", "awards": "표창·수상" },
  "sections": { "stats": "숫자로 보는 나", "timeline": "걸어온 길", "education": "학력", "awards": "자격·수상", "pillars": "하는 일", "projects": "만든 서비스", "books": "저서", "materials": "출제·자료 개발", "lectures": "강의·연수 이력", "contact": "연락·링크" },
  "projects": { "visit": "사이트", "watch": "소개 영상", "stack": "스택" },
  "lectures": { "teacher": "교사 대상", "student": "학생 대상", "period": "시기", "title": "내용", "org": "기관·장소" },
  "contact": { "email": "이메일", "github": "GitHub", "sites": "운영 사이트" },
  "lang": { "switchTo": "EN", "switchLabel": "Switch to English" },
  "footer": "© 2026 최재혁. 이 페이지는 Next.js 와 Remotion 으로 직접 만들었습니다."
}
```

- [ ] **Step 8: 테스트 통과 확인**

Run: `npx vitest run content`
Expected: PASS (5 tests)

- [ ] **Step 9: Commit**

```bash
git add content && git commit -m "feat(content): zod 스키마·디자인 토큰·한국어 콘텐츠

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: 영어 콘텐츠, 로더, ko/en 일치 검증 스크립트

**Files:**
- Create: `content/en/profile.json`, `content/en/projects.json`, `content/en/ui.json`, `content/index.ts`, `content/__tests__/parity.test.ts`, `scripts/validate-content.ts`

**Interfaces:**
- Produces: `getContent(locale: Locale): Content`, `locales: readonly ['ko','en']`, `idsOf(profile: Profile): string[]`, `checkParity(a: Content, b: Content): string[]` (불일치 메시지 배열, 비어 있으면 일치).

- [ ] **Step 1: 실패하는 테스트** — `content/__tests__/parity.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { checkParity, getContent, locales } from '../index';

describe('ko/en parity', () => {
  it('both locales load', () => {
    for (const l of locales) expect(getContent(l).profile.since).toBe('2012-03');
  });
  it('ko and en have identical id sets and array lengths', () => {
    expect(checkParity(getContent('ko'), getContent('en'))).toEqual([]);
  });
  it('reports the missing id by name', () => {
    const ko = getContent('ko');
    const en = structuredClone(getContent('en'));
    en.profile.career = en.profile.career.filter((c) => c.id !== 'car-2026');
    const problems = checkParity(ko, en);
    expect(problems.join('\n')).toContain('car-2026');
    expect(problems.join('\n')).toContain('profile.career');
  });
  it('reports a project present only in one locale', () => {
    const ko = getContent('ko');
    const en = structuredClone(getContent('en'));
    en.projects = en.projects.filter((p) => p.id !== 'mathcoach');
    expect(checkParity(ko, en).join('\n')).toContain('projects: mathcoach');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run content/__tests__/parity.test.ts`
Expected: FAIL — `Cannot find module '../index'`

- [ ] **Step 3: content/index.ts**

```ts
import { contentSchema, type Content, type Locale, type Profile } from './schema';
import profileKo from './ko/profile.json';
import projectsKo from './ko/projects.json';
import uiKo from './ko/ui.json';
import profileEn from './en/profile.json';
import projectsEn from './en/projects.json';
import uiEn from './en/ui.json';

export * from './schema';

export const locales = ['ko', 'en'] as const;

const raw: Record<Locale, unknown> = {
  ko: { profile: profileKo, projects: projectsKo, ui: uiKo },
  en: { profile: profileEn, projects: projectsEn, ui: uiEn },
};

const cache = new Map<Locale, Content>();

export function getContent(locale: Locale): Content {
  const hit = cache.get(locale);
  if (hit) return hit;
  const parsed = contentSchema.parse(raw[locale]);
  cache.set(locale, parsed);
  return parsed;
}

const timelineKeys = [
  'education', 'career', 'awards', 'groups', 'materials', 'lecturesTeacher', 'lecturesStudent',
] as const;

export function idsOf(profile: Profile): string[] {
  return timelineKeys.flatMap((k) => profile[k].map((x) => x.id));
}

function diffIds(label: string, a: string[], b: string[]): string[] {
  const out: string[] = [];
  const sa = new Set(a);
  const sb = new Set(b);
  for (const id of a) if (!sb.has(id)) out.push(`${label}: ${id} exists only in ko`);
  for (const id of b) if (!sa.has(id)) out.push(`${label}: ${id} exists only in en`);
  return out;
}

export function checkParity(ko: Content, en: Content): string[] {
  const problems: string[] = [];
  for (const k of timelineKeys) {
    problems.push(...diffIds(`profile.${k}`, ko.profile[k].map((x) => x.id), en.profile[k].map((x) => x.id)));
  }
  problems.push(...diffIds('profile.books', ko.profile.books.map((b) => b.id), en.profile.books.map((b) => b.id)));
  problems.push(...diffIds('profile.pillars', ko.profile.pillars.map((p) => p.id), en.profile.pillars.map((p) => p.id)));
  problems.push(...diffIds('projects', ko.projects.map((p) => p.id), en.projects.map((p) => p.id)));
  if (ko.profile.since !== en.profile.since) problems.push('profile.since differs');
  return problems;
}
```

`content/stats.ts` 와 index.ts 의 `export { computeStats, type Stats } from './stats';` 줄은 Task 4 에서 추가한다.

- [ ] **Step 4: content/en/profile.json**

```json
{
  "name": "Jae-hyuk Choi",
  "nameLatin": "최재혁",
  "tagline": "Math teacher · Maker",
  "intro": "I have taught mathematics at middle and high schools in Daegu since 2012. What began as GeoGebra-based lessons grew into Python and AI mathematics, and today I solve classroom and school-office problems by building web services myself. What I learn, I pass on through teacher training and student lectures.",
  "affiliation": "Posan High School",
  "role": "Mathematics Teacher",
  "since": "2012-03",
  "photo": "/img/photo.webp",
  "pictogram": "/img/pictogram.png",
  "education": [
    { "id": "edu-ba", "period": "– Aug 2011", "title": "B.Ed. in Mathematics Education, Hongik University", "kind": "edu" },
    { "id": "edu-ma", "period": "Sep 2021 – Feb 2024", "title": "M.Ed. in AI Convergence Education, Kyungpook National University", "kind": "edu", "highlight": true }
  ],
  "career": [
    { "id": "car-2012", "period": "Mar 2012 – Feb 2014", "title": "Teacher, Siji Middle School", "detail": "Gifted-class mathematics", "kind": "career" },
    { "id": "car-2013", "period": "2013 – 2015", "title": "Instructor, Gifted Education Center, Daegu Dongbu Office of Education", "kind": "career" },
    { "id": "car-2014", "period": "Mar 2014 – Feb 2019", "title": "Teacher, Daegu Seobu High School", "detail": "Department head, 2018", "kind": "career" },
    { "id": "car-2019", "period": "Mar 2019 – Feb 2025", "title": "Teacher, Daegu Science High School (gifted school)", "detail": "Head of curriculum · launched and taught the \"Artificial Intelligence\" course (2022–2024)", "kind": "career" },
    { "id": "car-2025", "period": "Mar 2025 – Feb 2026", "title": "Seconded teacher, Kyungpook National University", "detail": "IBEC programme", "kind": "career" },
    { "id": "car-2026", "period": "Mar 2026 – present", "title": "Teacher, Posan High School", "detail": "IB Math AA · AI Mathematics joint curriculum", "kind": "career" }
  ],
  "awards": [
    { "id": "awd-2019", "period": "2019", "title": "Coach Award (Honorable Mention), National Student Statistics Competition", "kind": "award" },
    { "id": "awd-2020", "period": "2020", "title": "Coach Award (Silver), National Student Statistics Competition", "kind": "award" },
    { "id": "cert-2023-12", "period": "Dec 2023", "title": "AIEDAP Master Teacher", "org": "Ministry of Education AI·Digital Education Alliance & Policy (Daegu–Gyeongbuk)", "kind": "cert", "highlight": true },
    { "id": "awd-2024-05", "period": "May 2024", "title": "Teachers' Day Commendation", "org": "Superintendent, Daegu Metropolitan Office of Education", "kind": "award" },
    { "id": "cert-2024-09", "period": "Sep 2024", "title": "Visiting Researcher, Daegu AI·Digital Convergence Education Innovation Platform", "kind": "cert" },
    { "id": "awd-2024-12", "period": "Dec 2024", "title": "Commendation for Teachers' Digital Competency", "org": "Deputy Prime Minister and Minister of Education", "kind": "award", "highlight": true }
  ],
  "groups": [
    { "id": "grp-2014", "period": "2014 – 2018", "title": "Member, Technology Tools Team, Daegu Secondary Mathematics Research Society", "kind": "group" },
    { "id": "grp-2020", "period": "2020 – 2022", "title": "Chair, AI Mathematics Curriculum Development Research Group", "org": "Daegu Metropolitan Office of Education", "kind": "group" },
    { "id": "grp-2021-jump", "period": "2021 – 2023", "title": "Participating teacher, AI-powered Math Jumping School", "detail": "Khan Academy · teacher–student mentoring", "kind": "group" },
    { "id": "grp-2022-pilot", "period": "Jun – Dec 2022", "title": "Led the AI Convergence Education pilot class", "detail": "Grade 10 mathematics, earth science and informatics; drones and image classification", "kind": "group" },
    { "id": "grp-2022-share", "period": "2022 – 2024", "title": "Ran the Math Sharing School programme", "org": "Daegu Metropolitan Office of Education", "kind": "group" },
    { "id": "grp-fest", "period": "2021 · 2022 · 2024", "title": "Programme developer and team lead, Daegu Math Festival", "detail": "13th, 14th and 16th festivals — led the Math Inquiry Contest team (2022) and the Math Experience Planning team (2024)", "kind": "group" },
    { "id": "grp-2026", "period": "2026", "title": "Chair, Mathematics Immersion Camp Research Group", "kind": "group" }
  ],
  "materials": [
    { "id": "mat-2017-ebs", "period": "2017 – 2018", "title": "EBS-linked item development team, Daegu Metropolitan Office of Education", "kind": "material" },
    { "id": "mat-2017-exam", "period": "Nov 2017", "title": "Item writer, Daegu mock examination (Mathematics)", "kind": "material" },
    { "id": "mat-2024-aidt", "period": "2024", "title": "Field review panel, AI Digital Textbook for High School Mathematics 1", "kind": "material" }
  ],
  "lecturesTeacher": [
    { "id": "lt-2024-02", "period": "Feb 2024", "title": "Case presentation on AI convergence education", "org": "KNU AIEDAP project workshop", "kind": "lecture-teacher" },
    { "id": "lt-2024-06", "period": "Jun 2024", "title": "AI convergence education and using ChatGPT", "org": "Daegu Secondary Chemistry Research Society", "kind": "lecture-teacher" },
    { "id": "lt-2024-07a", "period": "Jul 2024", "title": "Lead instructor, Classroom Revolution Leading Teacher training", "org": "Gyeongbuk team 1", "kind": "lecture-teacher" },
    { "id": "lt-2024-07b", "period": "Jul 2024", "title": "Lead instructor (secondary), AIEDAP Master Teacher promotion training", "org": "Seoul National University, Siheung campus", "kind": "lecture-teacher" },
    { "id": "lt-2024-08", "period": "Aug 2024", "title": "Instructor, AIEDAP secondary pre-service teacher workshop", "org": "Gyeongju", "kind": "lecture-teacher" },
    { "id": "lt-2025-06", "period": "Jun 2025 –", "title": "Instructor, 2025 Classroom Revolution Leading Teacher training", "org": "KERIS", "kind": "lecture-teacher" },
    { "id": "lt-2025-consult", "period": "Aug 2025 – Feb 2026", "title": "Lead instructor and coordinator, School Visit Consulting (20 sessions)", "org": "Geumo High, Haemaru Middle, Gumi Indeok Middle and others", "detail": "Digital literacy · data-driven field research · curriculum evaluation and feedback", "kind": "lecture-teacher" },
    { "id": "lt-2025-10", "period": "Oct 2025", "title": "Instructor, 2025 AIEDAP Master Teacher induction training (secondary)", "org": "Osong", "kind": "lecture-teacher" },
    { "id": "lt-2025-11", "period": "Nov 2025", "title": "Instructor, 2025 secondary mathematics teaching competency in-service course", "org": "Daegu Education Training Institute", "kind": "lecture-teacher" }
  ],
  "lecturesStudent": [
    { "id": "ls-small", "period": "2022 – present", "title": "Small-cohort courses: AI Mathematics, Advanced Mathematics", "org": "Chilseong High, Hosan High, Dalseong High, Daegu Online School and others", "kind": "lecture-student" },
    { "id": "ls-ml", "period": "2022 – present", "title": "Lecture series: the mathematics behind AI", "org": "Seonghwa Girls' High, Pohang Jecheol High", "detail": "2024: \"The mathematics of machine learning — PCA\"", "kind": "lecture-student" },
    { "id": "ls-rne", "period": "2022 – 2023", "title": "R&E mentor, Korea Foundation for the Advancement of Science and Creativity", "detail": "Students won at the presentation contest", "kind": "lecture-student" },
    { "id": "ls-dgist", "period": "2026", "title": "Vibe-coding class for 9th graders, DGIST", "detail": "2 sessions × 150 min", "kind": "lecture-student" }
  ],
  "books": [
    { "id": "book-geogebra-middle", "title": "GeoGebra for Middle School Mathematics", "role": "Co-author", "year": 2017, "isbn": "9791187541202", "url": "https://product.kyobobook.co.kr/detail/S000001903386", "cover": "/img/books/geogebra-middle.webp" },
    { "id": "book-geogebra-high", "title": "GeoGebra for High School Mathematics", "role": "Co-author", "year": 2017, "isbn": "9791187541196", "url": "https://product.kyobobook.co.kr/detail/S000001903385", "cover": "/img/books/geogebra-high.webp" },
    { "id": "book-agentic-ai", "title": "Agentic AI in School Education", "role": "Co-author (with Hong Jin-woo, Ryu Jin-hyeon, Yu Sang-eun)", "year": 2026, "isbn": "9791193059975", "publisher": "Answerbook", "url": "https://product.kyobobook.co.kr/detail/S000221379920", "cover": "/img/books/agentic-ai.webp" }
  ],
  "pillars": [
    { "id": "teach", "title": "Teaching mathematics", "summary": "Technology lets every student move at their own pace.", "items": ["IB Math AA · Calculus · AI Mathematics", "Differentiated lessons with GeoGebra, Desmos and Python", "R&E and statistics-competition coaching"] },
    { "id": "train", "title": "AI convergence training", "summary": "I pass on what I learn in a form teachers and students can use right away.", "items": ["AIEDAP Master Teacher · instructor for promotion and induction courses", "Instructor, Classroom Revolution Leading Teacher training", "20 school-visit consulting sessions"] },
    { "id": "build", "title": "Building education services", "summary": "Problems I meet at school become web services I run myself.", "items": ["Teacher planner · lesson platform · meals · attendance apps", "Shipped on Next.js, Rails and Railway", "Vibe-coding with students"] }
  ],
  "links": {
    "email": "complete860127@gmail.com",
    "github": "https://github.com/ChoisMath",
    "sites": [
      { "label": "ChoisNote", "url": "https://chois.pro" },
      { "label": "ChoisClass", "url": "https://class.chois.ai.kr" }
    ]
  }
}
```

- [ ] **Step 5: content/en/projects.json**

```json
[
  { "id": "choisnote", "name": "ChoisNote", "tagline": "Smart planner and collaboration platform for teachers", "description": "Schedules, classes, counselling, AI-assisted student records, Google sync. Available as a PWA and an Android app.", "stack": ["Rails 8", "Hotwire", "Tailwind", "PostgreSQL", "Railway"], "url": "https://chois.pro", "mockup": "/img/projects/choisnote.svg" },
  { "id": "choisclass", "name": "ChoisClass", "tagline": "Tablet handwriting platform for math lessons", "description": "Live shared handwriting and interactive HTML tool pages.", "stack": ["React", "Fastify", "Socket.IO", "Excalidraw"], "url": "https://class.chois.ai.kr", "urlNote": "Teachers and students only", "mockup": "/img/projects/choisclass.svg" },
  { "id": "posanmeal", "name": "PosanMeal", "tagline": "School meal sign-up and check-in app", "stack": ["Next.js", "Prisma", "Railway"], "url": "https://meal.posan.kr", "urlNote": "School members only", "mockup": "/img/projects/posanmeal.svg" },
  { "id": "selfstudy", "name": "Self-study Attendance", "tagline": "Attendance management for afternoon and evening self-study", "stack": ["Next.js", "Prisma", "Railway"], "url": "https://self.posan.kr", "urlNote": "School members only", "mockup": "/img/projects/selfstudy.svg" },
  { "id": "mathcoach", "name": "MathCoach", "tagline": "AI math coaching tool", "description": "Reads student work with OCR against a problem bank and gives feedback.", "stack": ["Firebase", "Genkit", "Gemini"], "mockup": "/img/projects/mathcoach.svg" }
]
```

- [ ] **Step 6: content/en/ui.json**

```json
{
  "siteTitle": "Jae-hyuk Choi — Math teacher · Maker",
  "siteDescription": "Jae-hyuk Choi, mathematics teacher at Posan High School, Daegu: AI convergence training, self-built education services, books and career.",
  "nav": { "hero": "About", "stats": "Numbers", "timeline": "Career", "pillars": "Work", "projects": "Projects", "books": "Books", "lectures": "Lectures", "contact": "Contact" },
  "hero": { "watchVideo": "Watch the intro video", "playVideo": "Play video", "closeVideo": "Close", "scrollHint": "Scroll" },
  "stats": { "years": "Years teaching", "lectures": "Lectures & trainings", "books": "Books (co-authored)", "services": "Services in production", "awards": "Commendations & awards" },
  "sections": { "stats": "By the numbers", "timeline": "The road so far", "education": "Education", "awards": "Credentials & awards", "pillars": "What I do", "projects": "Things I built", "books": "Books", "materials": "Items & materials", "lectures": "Lectures & trainings", "contact": "Contact & links" },
  "projects": { "visit": "Site", "watch": "Video", "stack": "Stack" },
  "lectures": { "teacher": "For teachers", "student": "For students", "period": "When", "title": "What", "org": "Where" },
  "contact": { "email": "Email", "github": "GitHub", "sites": "Live sites" },
  "lang": { "switchTo": "한국어", "switchLabel": "한국어로 보기" },
  "footer": "© 2026 Jae-hyuk Choi. Built with Next.js and Remotion."
}
```

- [ ] **Step 7: scripts/validate-content.ts**

```ts
import { checkParity, getContent } from '../content/index';

const problems = checkParity(getContent('ko'), getContent('en'));
if (problems.length > 0) {
  console.error('ko/en content mismatch:\n' + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.info('content ok: ko/en parity verified');
```

- [ ] **Step 8: 테스트·스크립트 통과 확인**

Run: `npx vitest run content && npm run content:validate`
Expected: PASS (parity 4 + schema 5), 마지막 줄 `content ok: ko/en parity verified`

- [ ] **Step 9: Commit**

```bash
git add content scripts && git commit -m "feat(content): 영어 콘텐츠와 ko/en 일치 검증

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: 통계 계산과 로케일 경로 헬퍼

**Files:**
- Create: `content/stats.ts`, `content/__tests__/stats.test.ts`, `web/src/lib/locale.ts`, `web/src/lib/locale.test.ts`, `web/src/lib/sections.ts`
- Modify: `content/index.ts` (stats re-export 추가)

**Interfaces:**
- Produces: `computeStats(content: Content, now?: Date): Stats` with `Stats = { years: number; lectures: number; books: number; services: number; awards: number }`; `localePath(locale): '/' | '/en/'`; `toggleHref(locale, hash): string`; `otherLocale(locale): Locale`; `SECTION_IDS` readonly tuple of 8 ids; `SectionId` type.

- [ ] **Step 1: 실패하는 테스트** — `content/__tests__/stats.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { computeStats } from '../stats';
import { getContent } from '../index';

describe('computeStats', () => {
  const ko = getContent('ko');
  it('counts the 15th year of service in 2026', () => {
    expect(computeStats(ko, new Date('2026-10-09')).years).toBe(15);
  });
  it('is the 14th year just before the March anniversary', () => {
    expect(computeStats(ko, new Date('2026-02-15')).years).toBe(14);
  });
  it('derives other numbers from the arrays', () => {
    const s = computeStats(ko, new Date('2026-10-09'));
    expect(s.lectures).toBe(ko.profile.lecturesTeacher.length + ko.profile.lecturesStudent.length);
    expect(s.books).toBe(3);
    expect(s.services).toBe(5);
    expect(s.awards).toBe(ko.profile.awards.filter((a) => a.kind === 'award').length);
  });
});
```

`web/src/lib/locale.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { localePath, otherLocale, toggleHref } from './locale';

describe('locale helpers', () => {
  it('maps locales to static paths', () => {
    expect(localePath('ko')).toBe('/');
    expect(localePath('en')).toBe('/en/');
  });
  it('toggles to the other locale keeping the hash', () => {
    expect(toggleHref('ko', '#projects')).toBe('/en/#projects');
    expect(toggleHref('en', '#projects')).toBe('/#projects');
  });
  it('ignores an empty or malformed hash', () => {
    expect(toggleHref('ko', '')).toBe('/en/');
    expect(toggleHref('en', 'projects')).toBe('/');
    expect(toggleHref('ko', '#')).toBe('/en/');
  });
  it('otherLocale flips', () => {
    expect(otherLocale('ko')).toBe('en');
    expect(otherLocale('en')).toBe('ko');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run stats locale`
Expected: FAIL — 두 모듈 모두 없음

- [ ] **Step 3: content/stats.ts**

```ts
import type { Content } from './schema';

export type Stats = { years: number; lectures: number; books: number; services: number; awards: number };

// "N년차": 임용 월(3월)을 지나면 햇수를 하나 더 센다.
export function computeStats(content: Content, now: Date = new Date()): Stats {
  const [y, m] = content.profile.since.split('-').map(Number) as [number, number];
  const passedAnniversary = now.getMonth() + 1 >= m;
  const years = now.getFullYear() - y + (passedAnniversary ? 1 : 0);
  const p = content.profile;
  return {
    years,
    lectures: p.lecturesTeacher.length + p.lecturesStudent.length,
    books: p.books.length,
    services: content.projects.length,
    awards: p.awards.filter((a) => a.kind === 'award').length,
  };
}
```

`content/index.ts` 상단 export 블록에 추가:

```ts
export { computeStats, type Stats } from './stats';
```

- [ ] **Step 4: web/src/lib/locale.ts 와 sections.ts**

```ts
// web/src/lib/locale.ts
import type { Locale } from '@me/content';

export function localePath(locale: Locale): '/' | '/en/' {
  return locale === 'ko' ? '/' : '/en/';
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'ko' ? 'en' : 'ko';
}

export function toggleHref(locale: Locale, hash: string): string {
  const safeHash = hash.startsWith('#') && hash.length > 1 ? hash : '';
  return localePath(otherLocale(locale)) + safeHash;
}
```

```ts
// web/src/lib/sections.ts
export const SECTION_IDS = ['hero', 'stats', 'timeline', 'pillars', 'projects', 'books', 'lectures', 'contact'] as const;
export type SectionId = (typeof SECTION_IDS)[number];
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run`
Expected: PASS (schema 5, parity 4, stats 3, locale 4)

- [ ] **Step 6: Commit**

```bash
git add content web/src/lib && git commit -m "feat: 통계 계산과 로케일 경로 헬퍼

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: 디자인 토큰 CSS 생성기와 자산 준비 스크립트

**Files:**
- Create: `scripts/gen-tokens-css.ts`, `scripts/__tests__/gen-tokens-css.test.ts`, `scripts/prepare-assets.sh`, `asset/README.md`, `asset/projects/{choisnote,choisclass,posanmeal,selfstudy,mathcoach}.svg`

**Interfaces:**
- Produces: `tokensToCss(tokens: Tokens): string` (Tailwind 4 `@theme` 블록), 생성 파일 `web/src/app/tokens.css`, 이미지 `web/public/img/{photo.webp,pictogram.png,books/*.webp,projects/*.svg}`, 아이콘 `web/src/app/{icon.png,apple-icon.png}`, 복사본 `video/public/img/`.

- [ ] **Step 1: 실패하는 테스트** — `scripts/__tests__/gen-tokens-css.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { tokensToCss } from '../gen-tokens-css';
import tokens from '../../content/tokens.json';

describe('tokensToCss', () => {
  const css = tokensToCss(tokens);
  it('emits a @theme block with kebab-case color variables', () => {
    expect(css).toContain('@theme {');
    expect(css).toContain('--color-accent: #1D3C77;');
    expect(css).toContain('--color-dark-bg: #0B1220;');
    expect(css).toContain('--color-accent-soft: #E8EEF8;');
  });
  it('emits font and radius variables', () => {
    expect(css).toContain("--font-sans: 'Pretendard Variable'");
    expect(css).toContain('--radius-card: 16px;');
  });
  it('starts with a generated-file notice', () => {
    expect(css.startsWith('/* generated from content/tokens.json')).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run scripts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: scripts/gen-tokens-css.ts**

```ts
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokensSchema, type Tokens } from '../content/schema';
import rawTokens from '../content/tokens.json';

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

export function tokensToCss(tokens: Tokens): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(tokens.color)) lines.push(`  --color-${kebab(k)}: ${v};`);
  lines.push(`  --font-sans: ${tokens.font.sans};`);
  lines.push(`  --font-mono: ${tokens.font.mono};`);
  lines.push(`  --radius-card: ${tokens.radius.card};`);
  return `/* generated from content/tokens.json — edit the JSON, not this file */\n@theme {\n${lines.join('\n')}\n}\n`;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const out = path.resolve(here, '../web/src/app/tokens.css');
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, tokensToCss(tokensSchema.parse(rawTokens)));
  console.info(`wrote ${out}`);
}
```

- [ ] **Step 4: 통과 확인 후 실제 생성**

Run: `npx vitest run scripts && npm run tokens:css && head -5 web/src/app/tokens.css`
Expected: PASS 3; 파일 첫 줄이 `/* generated from content/tokens.json`

- [ ] **Step 5: 목업 자리표시 SVG 5개** — `asset/projects/choisnote.svg` (나머지 4개는 `<text>` 의 이름만 ChoisClass / PosanMeal / 자율학습 출석부 / MathCoach 로 바꿔 같은 내용으로 저장)

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750" viewBox="0 0 1200 750">
  <defs>
    <pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="#1F2A44" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="750" fill="#131C2E"/>
  <rect width="1200" height="750" fill="url(#g)"/>
  <rect x="80" y="60" width="1040" height="630" rx="24" fill="#0B1220" stroke="#7DD3FC" stroke-width="3"/>
  <text x="600" y="395" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="72" font-weight="700" fill="#E5E7EB">ChoisNote</text>
  <text x="600" y="455" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="28" fill="#94A3B8">mockup placeholder</text>
</svg>
```

- [ ] **Step 6: scripts/prepare-assets.sh**

```bash
#!/usr/bin/env bash
# asset/ 원본 → web/public/img (+ video/public/img 복사). macOS sips 와 Homebrew cwebp 사용.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/asset"
OUT="$ROOT/web/public/img"
APP="$ROOT/web/src/app"
mkdir -p "$OUT/books" "$OUT/projects" "$ROOT/video/public"

command -v cwebp >/dev/null || { echo "cwebp not found: brew install webp"; exit 1; }

cwebp -quiet -q 85 -resize 600 0 "$SRC/최재혁_증명사진.jpg" -o "$OUT/photo.webp"
sips -s format png -Z 512 "$SRC/최재혁_픽토그램.jpg" --out "$OUT/pictogram.png" >/dev/null
sips -s format png -Z 180 "$SRC/최재혁_픽토그램.jpg" --out "$APP/apple-icon.png" >/dev/null
sips -s format png -Z 64  "$SRC/최재혁_픽토그램.jpg" --out "$APP/icon.png" >/dev/null

cwebp -quiet -q 85 -resize 600 0 "$SRC/지오지브라_중학교_수학_이미지.png"   -o "$OUT/books/geogebra-middle.webp"
cwebp -quiet -q 85 -resize 600 0 "$SRC/지오지브라_고등학교_수학_이미지.png" -o "$OUT/books/geogebra-high.webp"
cwebp -quiet -q 85 -resize 600 0 "$SRC/에이전틱AI학교교육활용법_이미지.png"  -o "$OUT/books/agentic-ai.webp"

# 목업: 실물 png/jpg 가 있으면 webp 로, 없으면 자리표시 svg 를 그대로 복사
for id in choisnote choisclass posanmeal selfstudy mathcoach; do
  real=""
  for ext in png jpg jpeg; do [ -f "$SRC/projects/$id.$ext" ] && real="$SRC/projects/$id.$ext"; done
  if [ -n "$real" ]; then
    cwebp -quiet -q 85 -resize 1200 0 "$real" -o "$OUT/projects/$id.webp"
    rm -f "$OUT/projects/$id.svg"
    echo "mockup $id: real image → remember to point content/*/projects.json mockup at /img/projects/$id.webp"
  else
    cp "$SRC/projects/$id.svg" "$OUT/projects/$id.svg"
  fi
done

rsync -a --delete "$OUT/" "$ROOT/video/public/img/"
echo "assets ready → $OUT and video/public/img"
```

`asset/README.md`:

```markdown
# 원본 자산

| 파일 | 용도 | 상태 |
|---|---|---|
| 최재혁_증명사진.jpg | 타임라인·연락 섹션 사진 | 있음 (공개용 사진으로 교체 가능) |
| 최재혁_픽토그램.jpg | 히어로 보조 그래픽·파비콘·OG | 있음 |
| 지오지브라_중학교_수학_이미지.png 외 표지 2장 | 저서 섹션 | 있음 |
| projects/{id}.png (또는 jpg) | 서비스 목업 | **없음 — 자리표시 svg 사용 중** |

실물 목업을 넣으려면 `asset/projects/<id>.png` 로 저장하고 `npm run assets` 를 실행한 뒤,
`content/ko/projects.json` 과 `content/en/projects.json` 의 `mockup` 을 `/img/projects/<id>.webp` 로 바꾼다.
YouTube 소개 영상이 있으면 같은 항목에 `"youtubeId": "..."` 를 추가한다.

교보문고에서 저장한 `*.html`, `*_files/`, `*.zip` 은 git 에 올리지 않는다.
```

- [ ] **Step 7: 실행·산출 확인**

Run: `chmod +x scripts/prepare-assets.sh && npm run assets && ls web/public/img web/public/img/books web/public/img/projects web/src/app/*.png video/public/img`
Expected: `photo.webp pictogram.png`, 표지 3개 webp, 목업 5개 svg, `icon.png apple-icon.png`, video 복사본

- [ ] **Step 8: Commit**

```bash
git add scripts asset web/public/img web/src/app/icon.png web/src/app/apple-icon.png video/public/img && git commit -m "feat: 디자인 토큰 CSS 생성기와 자산 준비 스크립트

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Next.js 정적 사이트 뼈대 — 두 root layout, 내비, 언어 토글, 빈 섹션

**Files:**
- Create: `web/package.json`, `web/next.config.ts`, `web/tsconfig.json`, `web/postcss.config.mjs`, `web/eslint.config.mjs`, `web/playwright.config.ts`, `web/next-env.d.ts`(next 가 생성), `web/src/app/globals.css`, `web/src/app/(ko)/layout.tsx`, `web/src/app/(ko)/page.tsx`, `web/src/app/(en)/en/layout.tsx`, `web/src/app/(en)/en/page.tsx`, `web/src/lib/metadata.ts`, `web/src/components/RootShell.tsx`, `web/src/components/Nav.tsx`, `web/src/components/LangToggle.tsx`, `web/src/components/Section.tsx`, `web/src/components/HomePage.tsx`, `web/public/.nojekyll`, `web/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `getContent`, `Locale`, `Ui` (Task 2–3), `localePath`, `toggleHref`, `SECTION_IDS` (Task 4), `tokens.css` (Task 5).
- Produces: `RootShell({ locale, children })`, `Section({ id, title?, dark?, children })`, `HomePage({ locale })` (섹션 컴포넌트를 순서대로 배치; Task 7~9 에서 자리표시 `<p>` 를 실제 섹션으로 교체), `Nav({ locale, ui })`, `LangToggle({ locale, label, title })`, `buildMetadata(locale): Metadata`, `SITE_URL`.

- [ ] **Step 1: web/package.json**

```json
{
  "name": "web",
  "private": true,
  "type": "module",
  "scripts": {
    "predev": "tsx ../scripts/gen-tokens-css.ts",
    "dev": "next dev",
    "prebuild": "tsx ../scripts/gen-tokens-css.ts",
    "build": "next build",
    "lint": "eslint .",
    "typecheck": "tsx ../scripts/gen-tokens-css.ts && tsc --noEmit",
    "serve": "serve out -l 3100",
    "e2e": "playwright test"
  },
  "dependencies": {
    "@fontsource-variable/jetbrains-mono": "5.3.0",
    "@me/content": "*",
    "motion": "14.0.0",
    "next": "16.4.0",
    "pretendard": "1.3.9",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "zod": "4.6.5"
  },
  "devDependencies": {
    "@playwright/test": "1.64.0",
    "@tailwindcss/postcss": "4.3.3",
    "@types/node": "24.13.6",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.4.0",
    "serve": "14.2.6",
    "tailwindcss": "4.3.3",
    "tsx": "4.23.15",
    "typescript": "6.0.3"
  }
}
```

- [ ] **Step 2: next.config.ts / tsconfig.json / postcss / eslint / playwright**

```ts
// web/next.config.ts
import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // content 워크스페이스는 TS 소스 그대로 import 한다.
  transpilePackages: ['@me/content'],
  // `npm run build -w web` 은 cwd 가 web/ 이다.
  turbopack: { root: path.resolve(process.cwd(), '..') },
  agentRules: false,
};

export default nextConfig;
```

```json
// web/tsconfig.json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "noEmit": true,
    "incremental": true,
    "jsx": "react-jsx",
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@me/content": ["../content/index.ts"],
      "@me/content/*": ["../content/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules", "out"]
}
```

```js
// web/postcss.config.mjs
export default { plugins: { '@tailwindcss/postcss': {} } };
```

```js
// web/eslint.config.mjs
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'playwright-report/**', 'test-results/**']),
  { rules: { '@typescript-eslint/no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }] } },
]);
```

```ts
// web/playwright.config.ts — 정적 산출물(out/)을 serve 로 띄워 검사한다. 먼저 `npm run build` 가 필요하다.
import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  expect: { timeout: 10_000 },
  use: { baseURL: `http://localhost:${PORT}`, ...devices['Desktop Chrome'] },
  webServer: {
    command: `npx serve out -l ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
```

- [ ] **Step 3: globals.css**

```css
@import "tailwindcss";
@import "./tokens.css";

:root {
  --nav-h: 3rem;
  color-scheme: light;
}

html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}

body { background: var(--color-bg); color: var(--color-fg); }

/* 좌표평면 격자. 히어로와 엔딩 배경. */
.grid-paper {
  background-image:
    linear-gradient(to right, var(--color-grid) 1px, transparent 1px),
    linear-gradient(to bottom, var(--color-grid) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* 표: 모든 셀 줄바꿈 금지, 헤더 고정, 불투명 배경 (글로벌 반응형 규칙) */
.data-table { @apply w-full border-collapse text-sm; }
.data-table th, .data-table td { @apply whitespace-nowrap px-3 py-2 text-left align-top border-b border-line; }
.data-table thead th { @apply sticky top-0 z-[2] bg-bg font-semibold; }
```

- [ ] **Step 4: metadata.ts, RootShell, Nav, LangToggle, Section, HomePage**

```ts
// web/src/lib/metadata.ts
import type { Metadata } from 'next';
import { getContent, type Locale } from '@me/content';
import { localePath } from './locale';

export const SITE_URL = 'https://me.chois.pro';

export function buildMetadata(locale: Locale): Metadata {
  const { ui } = getContent(locale);
  const path = localePath(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: ui.siteTitle,
    description: ui.siteDescription,
    alternates: { canonical: path, languages: { ko: '/', en: '/en/' } },
    openGraph: {
      type: 'website',
      locale: locale === 'ko' ? 'ko_KR' : 'en_US',
      url: path,
      title: ui.siteTitle,
      description: ui.siteDescription,
      images: [{ url: '/img/og.png', width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title: ui.siteTitle, description: ui.siteDescription },
  };
}
```

```tsx
// web/src/components/RootShell.tsx
import type { ReactNode } from 'react';
import { getContent, type Locale } from '@me/content';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@fontsource-variable/jetbrains-mono';
import '@/app/globals.css';
import { Nav } from './Nav';

export function RootShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const { ui } = getContent(locale);
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
        <Nav locale={locale} ui={ui} />
        <main className="pt-[var(--nav-h)]">{children}</main>
        <footer className="px-2 py-8 text-center text-xs text-muted sm:px-3">{ui.footer}</footer>
      </body>
    </html>
  );
}
```

```tsx
// web/src/components/Nav.tsx
import type { Locale, Ui } from '@me/content';
import { SECTION_IDS } from '@/lib/sections';
import { LangToggle } from './LangToggle';

export function Nav({ locale, ui }: { locale: Locale; ui: Ui }) {
  return (
    <header className="fixed inset-x-0 top-0 z-10 h-[var(--nav-h)] border-b border-line bg-bg/90 backdrop-blur">
      <nav className="mx-auto flex h-full max-w-6xl items-center gap-2 px-2 sm:px-3" aria-label="primary">
        <a href="#hero" className="min-h-11 inline-flex items-center font-mono text-sm font-bold whitespace-nowrap">chois</a>
        <ul className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap">
          {SECTION_IDS.filter((id) => id !== 'hero').map((id) => (
            <li key={id}>
              <a href={`#${id}`} className="min-h-11 inline-flex items-center rounded-full px-3 text-sm text-muted hover:text-fg">
                {ui.nav[id]}
              </a>
            </li>
          ))}
        </ul>
        <LangToggle locale={locale} label={ui.lang.switchTo} title={ui.lang.switchLabel} />
      </nav>
    </header>
  );
}
```

```tsx
// web/src/components/LangToggle.tsx
'use client';
import { useEffect, useState } from 'react';
import type { Locale } from '@me/content';
import { toggleHref } from '@/lib/locale';

export function LangToggle({ locale, label, title }: { locale: Locale; label: string; title: string }) {
  const [href, setHref] = useState(() => toggleHref(locale, ''));
  useEffect(() => {
    const update = () => setHref(toggleHref(locale, window.location.hash));
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, [locale]);
  return (
    <a
      href={href}
      aria-label={title}
      data-testid="lang-toggle"
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line px-3 font-mono text-xs whitespace-nowrap"
    >
      {label}
    </a>
  );
}
```

```tsx
// web/src/components/Section.tsx
import type { ReactNode } from 'react';
import type { SectionId } from '@/lib/sections';

export function Section({ id, title, dark = false, children }: { id: SectionId; title?: string; dark?: boolean; children: ReactNode }) {
  return (
    <section
      id={id}
      className={`scroll-mt-[var(--nav-h)] px-2 py-10 sm:px-3 md:px-4 lg:px-6 lg:py-16 ${dark ? 'bg-dark-bg text-dark-fg' : ''}`}
    >
      <div className="mx-auto w-full max-w-6xl">
        {title ? <h2 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2> : null}
        {children}
      </div>
    </section>
  );
}
```

```tsx
// web/src/components/HomePage.tsx — Task 7~9 에서 자리표시를 실제 섹션으로 바꾼다.
import { getContent, type Locale } from '@me/content';
import { Section } from './Section';

export function HomePage({ locale }: { locale: Locale }) {
  const { ui } = getContent(locale);
  return (
    <>
      <Section id="hero"><p>hero</p></Section>
      <Section id="stats" title={ui.sections.stats}><p>stats</p></Section>
      <Section id="timeline" title={ui.sections.timeline}><p>timeline</p></Section>
      <Section id="pillars" title={ui.sections.pillars}><p>pillars</p></Section>
      <Section id="projects" title={ui.sections.projects} dark><p>projects</p></Section>
      <Section id="books" title={ui.sections.books}><p>books</p></Section>
      <Section id="lectures" title={ui.sections.lectures}><p>lectures</p></Section>
      <Section id="contact" title={ui.sections.contact}><p>contact</p></Section>
    </>
  );
}
```

- [ ] **Step 5: 두 root layout 과 page**

```tsx
// web/src/app/(ko)/layout.tsx
import type { ReactNode } from 'react';
import { RootShell } from '@/components/RootShell';
import { buildMetadata } from '@/lib/metadata';

export const metadata = buildMetadata('ko');
export default function KoLayout({ children }: { children: ReactNode }) {
  return <RootShell locale="ko">{children}</RootShell>;
}
```

```tsx
// web/src/app/(ko)/page.tsx
import { HomePage } from '@/components/HomePage';
export default function Page() { return <HomePage locale="ko" />; }
```

```tsx
// web/src/app/(en)/en/layout.tsx
import type { ReactNode } from 'react';
import { RootShell } from '@/components/RootShell';
import { buildMetadata } from '@/lib/metadata';

export const metadata = buildMetadata('en');
export default function EnLayout({ children }: { children: ReactNode }) {
  return <RootShell locale="en">{children}</RootShell>;
}
```

```tsx
// web/src/app/(en)/en/page.tsx
import { HomePage } from '@/components/HomePage';
export default function Page() { return <HomePage locale="en" />; }
```

`web/public/.nojekyll` 은 빈 파일. (GitHub Pages 가 `_next/` 처럼 `_` 로 시작하는 폴더를 Jekyll 규칙으로 버리는 것을 막는다.)

- [ ] **Step 6: 설치·빌드**

Run: `npm install && npm run build:web && ls web/out web/out/en`
Expected: `web/out/index.html`, `web/out/en/index.html`, `web/out/.nojekyll` 존재. 빌드 로그에 `○ /` 와 `○ /en` 이 static 으로 표시.

- [ ] **Step 7: 실패하는 e2e 작성** — `web/e2e/smoke.spec.ts`

```ts
import { expect, test } from '@playwright/test';
import { SECTION_IDS } from '../src/lib/sections';

for (const [path, lang] of [['/', 'ko'], ['/en/', 'en']] as const) {
  test(`${path} renders every section with lang=${lang}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    for (const id of SECTION_IDS) await expect(page.locator(`section#${id}`)).toHaveCount(1);
  });
}

test('language toggle keeps the section hash', async ({ page }) => {
  await page.goto('/#projects');
  await page.getByTestId('lang-toggle').click();
  await expect(page).toHaveURL(/\/en\/#projects$/);
  await page.getByTestId('lang-toggle').click();
  await expect(page).toHaveURL(/\/#projects$/);
});
```

- [ ] **Step 8: e2e 실행**

Run: `cd web && npx playwright install chromium && npm run e2e`
Expected: PASS 3

- [ ] **Step 9: lint·typecheck**

Run: `npm run lint -w web && npm run typecheck -w web`
Expected: 오류 0

- [ ] **Step 10: Commit**

```bash
git add web package-lock.json && git commit -m "feat(web): Next.js 정적 사이트 뼈대, ko/en root layout, 내비·언어 토글

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Hero · Stats · Timeline 섹션 (정적)

**Files:**
- Create: `web/src/components/sections/Hero.tsx`, `web/src/components/sections/Stats.tsx`, `web/src/components/sections/Timeline.tsx`
- Modify: `web/src/components/HomePage.tsx`

**Interfaces:**
- Consumes: `Profile`, `Ui`, `Stats`, `computeStats` (Task 2–4).
- Produces: `Hero({ profile, ui })`, `Stats({ stats, ui })` (숫자 `<span data-count>`; Task 10 이 CountUp 으로 교체), `Timeline({ profile, ui })`.

- [ ] **Step 1: Hero.tsx**

```tsx
import Image from 'next/image';
import type { Profile, Ui } from '@me/content';
import { Section } from '../Section';

export function Hero({ profile, ui }: { profile: Profile; ui: Ui }) {
  return (
    <Section id="hero">
      <div className="grid-paper -mx-2 -mt-10 flex min-h-[calc(100dvh-var(--nav-h))] flex-col justify-center gap-6 px-2 py-10 sm:-mx-3 sm:px-3 md:-mx-4 md:px-4 lg:-mx-6 lg:-mt-16 lg:flex-row lg:items-center lg:px-6">
        <div className="flex-1">
          <p className="font-mono text-sm text-accent">{profile.affiliation} · {profile.role}</p>
          <h1 className="mt-2 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">{profile.name}</h1>
          <p className="mt-2 text-xl text-muted sm:text-2xl">{profile.tagline}</p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed sm:text-lg">{profile.intro}</p>
          <p className="mt-8 font-mono text-xs text-muted">↓ {ui.hero.scrollHint}</p>
        </div>
        <div className="flex justify-center lg:w-80">
          <Image src={profile.pictogram} alt={profile.name} width={320} height={320} priority className="w-48 rounded-2xl sm:w-64 lg:w-80" />
        </div>
      </div>
    </Section>
  );
}
```

- [ ] **Step 2: Stats.tsx**

```tsx
import type { Stats as StatsData, Ui } from '@me/content';
import { Section } from '../Section';

const KEYS = ['years', 'lectures', 'books', 'services', 'awards'] as const;

export function Stats({ stats, ui }: { stats: StatsData; ui: Ui }) {
  return (
    <Section id="stats" title={ui.sections.stats}>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {KEYS.map((k) => (
          <div key={k} className="rounded-[var(--radius-card)] border border-line p-4">
            <dd className="font-mono text-4xl font-bold text-accent" data-count={stats[k]}>{stats[k]}</dd>
            <dt className="mt-1 text-sm whitespace-nowrap text-muted">{ui.stats[k]}</dt>
          </div>
        ))}
      </dl>
    </Section>
  );
}
```

- [ ] **Step 3: Timeline.tsx**

```tsx
import Image from 'next/image';
import type { Profile, TimelineItem, Ui } from '@me/content';
import { Section } from '../Section';

function Item({ item }: { item: TimelineItem }) {
  return (
    <li className="relative pl-6">
      <span className={`absolute top-1.5 left-0 h-3 w-3 rounded-full ${item.highlight ? 'bg-accent' : 'border-2 border-accent bg-bg'}`} />
      <p className="font-mono text-xs text-muted">{item.period}</p>
      <p className="font-semibold">{item.title}</p>
      {item.org ? <p className="text-sm text-muted">{item.org}</p> : null}
      {item.detail ? <p className="text-sm text-muted">{item.detail}</p> : null}
    </li>
  );
}

export function Timeline({ profile, ui }: { profile: Profile; ui: Ui }) {
  return (
    <Section id="timeline" title={ui.sections.timeline}>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <ol className="relative space-y-6 border-l border-line pl-2">
          {profile.career.map((c) => <Item key={c.id} item={c} />)}
        </ol>
        <aside className="space-y-6">
          <Image src={profile.photo} alt={profile.name} width={240} height={300} className="w-40 rounded-2xl" />
          <div>
            <h3 className="mb-2 text-sm font-bold text-muted">{ui.sections.education}</h3>
            <ol className="space-y-3">{profile.education.map((e) => <Item key={e.id} item={e} />)}</ol>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-bold text-muted">{ui.sections.awards}</h3>
            <ol className="space-y-3">{profile.awards.map((a) => <Item key={a.id} item={a} />)}</ol>
          </div>
        </aside>
      </div>
    </Section>
  );
}
```

- [ ] **Step 4: HomePage 에 연결**

`HomePage.tsx` 상단에 import 와 데이터 준비를 추가하고 자리표시 세 개를 교체:

```tsx
import { computeStats, getContent, type Locale } from '@me/content';
import { Section } from './Section';
import { Hero } from './sections/Hero';
import { Stats } from './sections/Stats';
import { Timeline } from './sections/Timeline';

export function HomePage({ locale }: { locale: Locale }) {
  const content = getContent(locale);
  const { profile, ui } = content;
  const stats = computeStats(content);
  return (
    <>
      <Hero profile={profile} ui={ui} />
      <Stats stats={stats} ui={ui} />
      <Timeline profile={profile} ui={ui} />
      <Section id="pillars" title={ui.sections.pillars}><p>pillars</p></Section>
      <Section id="projects" title={ui.sections.projects} dark><p>projects</p></Section>
      <Section id="books" title={ui.sections.books}><p>books</p></Section>
      <Section id="lectures" title={ui.sections.lectures}><p>lectures</p></Section>
      <Section id="contact" title={ui.sections.contact}><p>contact</p></Section>
    </>
  );
}
```

- [ ] **Step 5: e2e 에 내용 검증 추가** — `smoke.spec.ts` 끝에

```ts
test('hero shows name and stats shows 5 numbers', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('section#hero h1')).toHaveText('최재혁');
  await expect(page.locator('section#stats [data-count]')).toHaveCount(5);
  await expect(page.locator('section#timeline li')).toHaveCount(6 + 2 + 6);
});
```

- [ ] **Step 6: 빌드·e2e·lint**

Run: `npm run build:web && npm run e2e -w web && npm run lint -w web && npm run typecheck -w web`
Expected: e2e PASS 4, lint/typecheck 오류 0

- [ ] **Step 7: Commit**

```bash
git add web && git commit -m "feat(web): Hero·Stats·Timeline 섹션

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Pillars · Projects(다크) · Books 섹션

**Files:**
- Create: `web/src/components/sections/Pillars.tsx`, `web/src/components/sections/Projects.tsx`, `web/src/components/sections/Books.tsx`
- Modify: `web/src/components/HomePage.tsx`

**Interfaces:**
- Produces: `Pillars({ profile, ui })`, `Projects({ projects, ui })`, `Books({ profile, ui })`.

- [ ] **Step 1: Pillars.tsx**

```tsx
import type { Profile, Ui } from '@me/content';
import { Section } from '../Section';

export function Pillars({ profile, ui }: { profile: Profile; ui: Ui }) {
  return (
    <Section id="pillars" title={ui.sections.pillars}>
      <div className="grid gap-2 md:grid-cols-3">
        {profile.pillars.map((p, i) => (
          <article key={p.id} className="rounded-[var(--radius-card)] border border-line p-5">
            <p className="font-mono text-xs text-accent">0{i + 1}</p>
            <h3 className="mt-1 text-xl font-bold">{p.title}</h3>
            <p className="mt-2 text-sm text-muted">{p.summary}</p>
            <ul className="mt-4 space-y-1 text-sm">
              {p.items.map((it) => <li key={it} className="flex gap-2"><span className="text-accent">•</span><span>{it}</span></li>)}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  );
}
```

- [ ] **Step 2: Projects.tsx**

```tsx
import Image from 'next/image';
import type { Project, Ui } from '@me/content';
import { Section } from '../Section';

const linkClass = 'inline-flex min-h-11 items-center rounded-full border border-dark-muted px-3 text-sm whitespace-nowrap hover:border-dark-accent hover:text-dark-accent';

export function Projects({ projects, ui }: { projects: Project[]; ui: Ui }) {
  return (
    <Section id="projects" title={ui.sections.projects} dark>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <li key={p.id} className="flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-dark-surface" data-testid="project-card">
            <Image src={p.mockup} alt={`${p.name} mockup`} width={1200} height={750} className="aspect-[16/10] w-full object-cover" />
            <div className="flex flex-1 flex-col gap-2 p-4">
              <h3 className="text-lg font-bold">{p.name}</h3>
              <p className="text-sm text-dark-muted">{p.tagline}</p>
              {p.description ? <p className="text-sm">{p.description}</p> : null}
              <ul className="flex flex-wrap gap-1" aria-label={ui.projects.stack}>
                {p.stack.map((s) => <li key={s} className="rounded-full bg-dark-bg px-2 py-0.5 font-mono text-xs whitespace-nowrap">{s}</li>)}
              </ul>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                {p.url ? <a href={p.url} target="_blank" rel="noreferrer" className={linkClass}>{ui.projects.visit} ↗</a> : null}
                {p.youtubeId ? <a href={`https://www.youtube.com/watch?v=${p.youtubeId}`} target="_blank" rel="noreferrer" className={linkClass}>▶ {ui.projects.watch}</a> : null}
                {p.urlNote ? <span className="text-xs whitespace-nowrap text-dark-muted">{p.urlNote}</span> : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
```

- [ ] **Step 3: Books.tsx**

```tsx
import Image from 'next/image';
import type { Profile, Ui } from '@me/content';
import { Section } from '../Section';

export function Books({ profile, ui }: { profile: Profile; ui: Ui }) {
  return (
    <Section id="books" title={ui.sections.books}>
      <ul className="grid gap-4 sm:grid-cols-3">
        {profile.books.map((b) => (
          <li key={b.id}>
            <a href={b.url} target="_blank" rel="noreferrer" className="block">
              <Image src={b.cover} alt={b.title} width={600} height={880} className="w-full rounded-lg border border-line shadow-sm" />
              <p className="mt-3 font-semibold">{b.title}</p>
              <p className="text-sm text-muted">{b.role} · {b.year}{b.publisher ? ` · ${b.publisher}` : ''}</p>
              <p className="font-mono text-xs text-muted">ISBN {b.isbn}</p>
            </a>
          </li>
        ))}
      </ul>
      <h3 className="mt-10 mb-3 text-lg font-bold">{ui.sections.materials}</h3>
      <ul className="space-y-2">
        {profile.materials.map((m) => (
          <li key={m.id} className="flex flex-wrap gap-x-3 text-sm">
            <span className="font-mono text-xs text-muted">{m.period}</span>
            <span>{m.title}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
```

- [ ] **Step 4: HomePage 교체** — `pillars`, `projects`, `books` 자리표시를 `<Pillars profile={profile} ui={ui} />`, `<Projects projects={content.projects} ui={ui} />`, `<Books profile={profile} ui={ui} />` 로 바꾸고 import 추가.

- [ ] **Step 5: e2e 추가** — `smoke.spec.ts`

```ts
test('projects shows 5 cards and books shows 3 covers', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('project-card')).toHaveCount(5);
  await expect(page.locator('section#books img')).toHaveCount(3);
});
```

- [ ] **Step 6: 빌드·e2e·lint**

Run: `npm run build:web && npm run e2e -w web && npm run lint -w web && npm run typecheck -w web`
Expected: e2e PASS 5, 오류 0

- [ ] **Step 7: Commit**

```bash
git add web && git commit -m "feat(web): Pillars·Projects·Books 섹션

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Lectures(탭·표) · Contact 섹션과 반응형 검증

**Files:**
- Create: `web/src/components/sections/Lectures.tsx`, `web/src/components/sections/Contact.tsx`
- Modify: `web/src/components/HomePage.tsx`, `web/e2e/smoke.spec.ts`

**Interfaces:**
- Produces: `Lectures({ profile, ui })` (client, 탭 상태), `Contact({ profile, ui })`.

- [ ] **Step 1: Lectures.tsx**

```tsx
'use client';
import { useState } from 'react';
import type { Profile, TimelineItem, Ui } from '@me/content';
import { Section } from '../Section';

type Tab = 'teacher' | 'student';

function Table({ rows, ui }: { rows: TimelineItem[]; ui: Ui }) {
  return (
    <div className="max-h-[70dvh] overflow-auto rounded-[var(--radius-card)] border border-line">
      <table className="data-table">
        <thead>
          <tr><th>{ui.lectures.period}</th><th>{ui.lectures.title}</th><th>{ui.lectures.org}</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="font-mono text-xs text-muted">{r.period}</td>
              <td>{r.title}{r.detail ? <span className="block text-xs text-muted">{r.detail}</span> : null}</td>
              <td className="text-muted">{r.org ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Lectures({ profile, ui }: { profile: Profile; ui: Ui }) {
  const [tab, setTab] = useState<Tab>('teacher');
  const rows = tab === 'teacher' ? profile.lecturesTeacher : profile.lecturesStudent;
  return (
    <Section id="lectures" title={ui.sections.lectures}>
      <div role="tablist" className="mb-3 flex gap-1">
        {(['teacher', 'student'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-11 rounded-full px-4 text-sm whitespace-nowrap ${tab === t ? 'bg-accent text-bg' : 'border border-line text-muted'}`}
          >
            {ui.lectures[t]} ({t === 'teacher' ? profile.lecturesTeacher.length : profile.lecturesStudent.length})
          </button>
        ))}
      </div>
      <Table rows={rows} ui={ui} />
    </Section>
  );
}
```

- [ ] **Step 2: Contact.tsx**

```tsx
import type { Profile, Ui } from '@me/content';
import { Section } from '../Section';

const item = 'inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm whitespace-nowrap hover:border-accent';

export function Contact({ profile, ui }: { profile: Profile; ui: Ui }) {
  return (
    <Section id="contact" title={ui.sections.contact}>
      <div className="flex flex-wrap gap-2">
        <a href={`mailto:${profile.links.email}`} className={item}><span className="text-muted">{ui.contact.email}</span>{profile.links.email}</a>
        <a href={profile.links.github} target="_blank" rel="noreferrer" className={item}><span className="text-muted">{ui.contact.github}</span>ChoisMath ↗</a>
        {profile.links.sites.map((s) => (
          <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className={item}><span className="text-muted">{ui.contact.sites}</span>{s.label} ↗</a>
        ))}
      </div>
    </Section>
  );
}
```

- [ ] **Step 3: HomePage 교체** — 남은 자리표시 두 개를 `<Lectures profile={profile} ui={ui} />`, `<Contact profile={profile} ui={ui} />` 로 바꾸고, 이제 `Section` import 는 HomePage 에서 제거한다.

- [ ] **Step 4: 반응형·이미지 e2e 추가** — `smoke.spec.ts`

```ts
test('lectures tabs switch rows', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('section#lectures tbody tr')).toHaveCount(9);
  await page.getByRole('tab', { name: /학생 대상/ }).click();
  await expect(page.locator('section#lectures tbody tr')).toHaveCount(4);
});

test('every image on the page actually loads', async ({ page }) => {
  await page.goto('/');
  const broken = await page.locator('img').evaluateAll((imgs) =>
    imgs.filter((img) => !(img instanceof HTMLImageElement) || !img.complete || img.naturalWidth === 0).map((img) => (img as HTMLImageElement).src),
  );
  expect(broken).toEqual([]);
});

test.describe('mobile 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } });
  for (const path of ['/', '/en/']) {
    test(`${path} has no horizontal scroll`, async ({ page }) => {
      await page.goto(path);
      for (const id of ['hero', 'projects', 'lectures', 'contact']) {
        await page.locator(`section#${id}`).scrollIntoViewIfNeeded();
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
```

- [ ] **Step 5: 빌드·e2e** — 가로 스크롤 테스트가 실패하면 원인은 보통 (a) 히어로의 `-mx-*` 네거티브 마진이 Section 패딩과 어긋남, (b) 표 래퍼 바깥에 `whitespace-nowrap` 텍스트. `Section` 의 패딩 단계와 Hero 의 네거티브 마진 단계를 똑같이 맞추고, 긴 텍스트는 래퍼에 `overflow-x-auto` 를 준다.

Run: `npm run build:web && npm run e2e -w web && npm run lint -w web && npm run typecheck -w web`
Expected: e2e PASS 9, 오류 0

- [ ] **Step 6: responsive-ui-reviewer 에이전트 실행** — `web/src/components/**` 를 대상으로 호출하고 보고된 위반을 같은 태스크 안에서 수정한 뒤 e2e 를 다시 돌린다.

- [ ] **Step 7: Commit**

```bash
git add web && git commit -m "feat(web): Lectures·Contact 섹션과 모바일 가로 스크롤 검증

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: 모션 — Reveal · CountUp · GridBackground · HeroVideo · reduced-motion

**Files:**
- Create: `web/src/components/motion/Reveal.tsx`, `web/src/components/motion/CountUp.tsx`, `web/src/components/motion/GridBackground.tsx`, `web/src/components/HeroVideo.tsx`
- Modify: `web/src/components/sections/{Hero,Stats,Timeline,Pillars,Projects,Books}.tsx`, `web/e2e/smoke.spec.ts`

**Interfaces:**
- Produces: `Reveal({ children, delay?, className? })`, `CountUp({ value, className? })`, `GridBackground()` (히어로 절대 배치 SVG), `HeroVideo({ srcMp4, srcWebm, poster, playLabel })` — Task 14 에서 `/video/hero-loop.*` 를 넘긴다. Task 10 에서는 `Hero` 에 **아직 연결하지 않는다** (파일이 없으므로).

- [ ] **Step 1: Reveal.tsx**

```tsx
'use client';
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: CountUp.tsx**

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';

export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  useEffect(() => {
    if (!inView || reduced) { setShown(value); return; }
    const controls = animate(0, value, { duration: 1.2, ease: 'easeOut', onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [inView, reduced, value]);
  return <span ref={ref} className={className} data-count={value}>{shown}</span>;
}
```

- [ ] **Step 3: GridBackground.tsx** — 격자선이 그려지고 곡선이 뒤따르는 히어로 배경

```tsx
'use client';
import { motion, useReducedMotion } from 'motion/react';

const W = 1200; const H = 700; const STEP = 40;
const curve = 'M0 520 C 200 520, 260 180, 420 300 S 700 560, 860 360 S 1100 120, 1200 200';

export function GridBackground() {
  const reduced = useReducedMotion();
  const vLines = Array.from({ length: W / STEP + 1 }, (_, i) => i * STEP);
  const hLines = Array.from({ length: H / STEP + 1 }, (_, i) => i * STEP);
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <g stroke="var(--color-grid)" strokeWidth="1">
        {vLines.map((x, i) => (
          <motion.line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: i * 0.01 }} />
        ))}
        {hLines.map((y, i) => (
          <motion.line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: i * 0.015 }} />
        ))}
      </g>
      <motion.path d={curve} fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round"
        initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, delay: 0.6, ease: 'easeInOut' }} />
    </svg>
  );
}
```

- [ ] **Step 4: HeroVideo.tsx** — 모바일·reduced-motion 은 포스터만, 탭하면 로드

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

export function HeroVideo({ srcMp4, srcWebm, poster, playLabel }: { srcMp4: string; srcWebm: string; poster: string; playLabel: string }) {
  const reduced = useReducedMotion();
  const [wantsVideo, setWantsVideo] = useState(false);
  useEffect(() => {
    // 데스크톱(≥640px)에서만 자동 로드. 모바일은 데이터 절약을 위해 탭 후 로드.
    if (!reduced && window.matchMedia('(min-width: 640px)').matches) setWantsVideo(true);
  }, [reduced]);
  if (!wantsVideo) {
    return (
      <button type="button" onClick={() => setWantsVideo(true)} aria-label={playLabel} className="absolute inset-0 block h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${poster})` }} />
    );
  }
  return (
    <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline poster={poster} data-testid="hero-video">
      <source src={srcWebm} type="video/webm" />
      <source src={srcMp4} type="video/mp4" />
    </video>
  );
}
```

- [ ] **Step 5: 섹션에 적용**
  - `Hero`: 바깥 div 에 `relative overflow-hidden` 추가, 첫 자식으로 `<GridBackground />`, 텍스트 블록은 `relative z-[1]`. `grid-paper` 클래스는 제거(SVG 가 대신).
  - `Stats`: `<dd>` 안 숫자를 `<CountUp value={stats[k]} />` 로 바꾸고 `<dd>` 의 `data-count` 는 제거(CountUp 이 붙인다).
  - `Timeline`·`Pillars`·`Books`: 각 카드/항목을 `<Reveal delay={i * 0.05}>` 로 감싼다.
  - `Projects`: `<ul>` 안의 `<li>` 는 그대로 두고(리스트 구조 유지), `<li>` 내용 전체를 `<Reveal delay={i * 0.06} className="h-full">` 로 감싼 뒤 그 안에 `<article data-testid="project-card" className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-dark-surface">` 를 둔다. 기존 `<li>` 의 className 과 `data-testid` 는 `<article>` 로 옮기고 `<li>` 는 `className="h-full"` 만 남긴다.

- [ ] **Step 6: reduced-motion e2e** — `smoke.spec.ts`

```ts
test.describe('prefers-reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('all section titles are visible and no video is loaded', async ({ page }) => {
    await page.goto('/');
    for (const id of ['stats', 'timeline', 'pillars', 'projects', 'books', 'lectures', 'contact']) {
      await expect(page.locator(`section#${id} h2`)).toBeVisible();
    }
    await expect(page.getByTestId('project-card').first()).toBeVisible();
    await expect(page.getByTestId('hero-video')).toHaveCount(0);
    await expect(page.locator('section#stats [data-count]').first()).not.toHaveText('0');
  });
});
```

- [ ] **Step 7: 빌드·e2e·lint**

Run: `npm run build:web && npm run e2e -w web && npm run lint -w web && npm run typecheck -w web`
Expected: e2e PASS 10, 오류 0. `npm run dev` 로 열어 격자→곡선→숫자 카운트업이 보이는지 눈으로 확인.

- [ ] **Step 8: Commit**

```bash
git add web && git commit -m "feat(web): 스크롤 모션·카운트업·격자 배경·히어로 비디오 컴포넌트

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Remotion 프로젝트 뼈대 — 테마·폰트·씬 시간표·컴포지션 등록

**Files:**
- Create: `video/package.json`, `video/tsconfig.json`, `video/remotion.config.ts`, `video/scripts/copy-font.mjs`, `video/src/index.ts`, `video/src/Root.tsx`, `video/src/theme.ts`, `video/src/fonts.ts`, `video/src/timeline.ts`, `video/src/timeline.test.ts`, `video/src/compositions/Intro.tsx`, `video/src/compositions/HeroLoop.tsx`, `video/src/compositions/OgImage.tsx`, `video/src/components/Grid.tsx`, `video/src/components/Caption.tsx`
- Modify: `content/index.ts` (tokens export), `.gitignore`

**Interfaces:**
- Consumes: `getContent`, `Content`, `Locale`, `computeStats` (Task 2–4).
- Produces: `tokens` (content 에서 export, `Tokens` 타입), `FPS=30`, `WIDTH=1920`, `HEIGHT=1080`, `SCENES`, `SceneId`, `sceneFrames(id): { from, durationInFrames }`, `INTRO_DURATION=2460`, `HERO_LOOP_DURATION=600`, `theme` (`{ color, font: { sans, mono } }`), `fontsReady: Promise<void>`, `Grid({ progress, dark? })`, `Caption({ text, dark? })`, `IntroProps = { locale: Locale; bgm: string | null }`, 컴포지션 id `Intro-ko`, `Intro-en`, `HeroLoop`, `OgImage`. 씬 컴포넌트 공통 시그니처 `({ content }: { content: Content }) => JSX` (Task 12–13 에서 구현; 이 태스크에서는 `Intro` 가 씬 자리에 `<Caption text={sceneId} />` 를 넣는다).

- [ ] **Step 1: 실패하는 테스트** — `video/src/timeline.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { FPS, HERO_LOOP_DURATION, INTRO_DURATION, SCENES, sceneFrames } from './timeline';

describe('scene timeline', () => {
  it('is contiguous from 0 to 82 seconds with no gaps or overlaps', () => {
    expect(SCENES[0]?.from).toBe(0);
    for (let i = 1; i < SCENES.length; i++) expect(SCENES[i]?.from).toBe(SCENES[i - 1]?.to);
    expect(SCENES[SCENES.length - 1]?.to).toBe(82);
  });
  it('gives every scene at least 4 seconds', () => {
    for (const s of SCENES) expect(s.to - s.from).toBeGreaterThanOrEqual(4);
  });
  it('converts seconds to frames', () => {
    expect(sceneFrames('projects')).toEqual({ from: 50 * FPS, durationInFrames: 18 * FPS });
    expect(INTRO_DURATION).toBe(2460);
    expect(HERO_LOOP_DURATION).toBe(600);
  });
  it('throws on an unknown scene id', () => {
    expect(() => sceneFrames('nope' as never)).toThrow();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run video`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: timeline.ts**

```ts
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const SCENES = [
  { id: 'opening', from: 0, to: 6 },
  { id: 'tagline', from: 6, to: 14 },
  { id: 'timeline', from: 14, to: 30 },
  { id: 'pillars', from: 30, to: 42 },
  { id: 'stats', from: 42, to: 50 },
  { id: 'projects', from: 50, to: 68 },
  { id: 'books', from: 68, to: 76 },
  { id: 'ending', from: 76, to: 82 },
] as const;
export type SceneId = (typeof SCENES)[number]['id'];

const byId = new Map<string, { from: number; to: number }>(SCENES.map((s) => [s.id, s]));

export function sceneFrames(id: SceneId): { from: number; durationInFrames: number } {
  const s = byId.get(id);
  if (!s) throw new Error(`unknown scene: ${id}`);
  return { from: s.from * FPS, durationInFrames: (s.to - s.from) * FPS };
}

export const INTRO_DURATION = SCENES[SCENES.length - 1]!.to * FPS;
export const HERO_LOOP_DURATION = 20 * FPS;
```

(`SCENES[SCENES.length - 1]!` 는 `as const` 튜플이라 길이가 고정돼 안전하다. `noUncheckedIndexedAccess` 때문에 `!` 가 필요하다.)

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run video`
Expected: PASS 4

- [ ] **Step 5: content/index.ts 에 tokens export 추가**

```ts
import rawTokens from './tokens.json';
export const tokens = tokensSchema.parse(rawTokens);
```

(기존 `import { contentSchema, type Content, type Locale, type Profile } from './schema';` 에 `tokensSchema` 를 추가한다.)

- [ ] **Step 6: video/package.json, tsconfig, remotion.config.ts, copy-font.mjs**

```json
{
  "name": "video",
  "private": true,
  "type": "module",
  "scripts": {
    "postinstall": "node scripts/copy-font.mjs",
    "studio": "remotion studio src/index.ts",
    "compositions": "remotion compositions src/index.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@me/content": "*",
    "@remotion/cli": "4.0.534",
    "@remotion/fonts": "4.0.534",
    "@remotion/google-fonts": "4.0.534",
    "pretendard": "1.3.9",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "remotion": "4.0.534",
    "zod": "4.6.5"
  },
  "devDependencies": {
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "6.0.3"
  }
}
```

```json
// video/tsconfig.json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "react-jsx",
    "noEmit": true,
    "paths": { "@me/content": ["../content/index.ts"], "@me/content/*": ["../content/*"] }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "remotion.config.ts"]
}
```

```ts
// video/remotion.config.ts
import path from 'node:path';
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// content 워크스페이스를 node_modules 심링크가 아닌 실제 경로로 묶어 TS 로더가 처리하게 한다.
Config.overrideWebpackConfig((current) => ({
  ...current,
  resolve: {
    ...current.resolve,
    alias: { ...(current.resolve?.alias ?? {}), '@me/content': path.resolve(process.cwd(), '../content/index.ts') },
  },
}));
```

```js
// video/scripts/copy-font.mjs — Pretendard 가변 폰트를 Remotion 의 public/ 으로 복사
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const src = path.join(path.dirname(require.resolve('pretendard/package.json')), 'dist/web/variable/woff2/PretendardVariable.woff2');
mkdirSync('public/fonts', { recursive: true });
copyFileSync(src, 'public/fonts/PretendardVariable.woff2');
console.info('copied PretendardVariable.woff2');
```

`.gitignore` 에 `video/public/fonts/` 추가.

- [ ] **Step 7: theme.ts, fonts.ts, Grid, Caption**

```ts
// video/src/theme.ts
import { tokens } from '@me/content';
export const theme = tokens;
export const SANS = 'Pretendard Variable';
```

```ts
// video/src/fonts.ts
import { loadFont } from '@remotion/fonts';
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';
import { staticFile } from 'remotion';
import { SANS } from './theme';

export const MONO = loadJetBrainsMono('normal', { weights: ['400', '700'], subsets: ['latin'] }).fontFamily;
export const fontsReady: Promise<void> = loadFont({ family: SANS, url: staticFile('fonts/PretendardVariable.woff2'), weight: '100 900' });
```

```tsx
// video/src/components/Grid.tsx — progress 0→1 로 격자선이 그려진다
import { AbsoluteFill } from 'remotion';
import { HEIGHT, WIDTH } from '../timeline';
import { theme } from '../theme';

const STEP = 60;

export function Grid({ progress, dark = false }: { progress: number; dark?: boolean }) {
  const stroke = dark ? theme.color.darkSurface : theme.color.grid;
  const v = Array.from({ length: WIDTH / STEP + 1 }, (_, i) => i * STEP);
  const h = Array.from({ length: HEIGHT / STEP + 1 }, (_, i) => i * STEP);
  const p = Math.max(0, Math.min(1, progress));
  return (
    <AbsoluteFill>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <g stroke={stroke} strokeWidth={1}>
          {v.map((x) => <line key={`v${x}`} x1={x} y1={0} x2={x} y2={HEIGHT} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />)}
          {h.map((y) => <line key={`h${y}`} x1={0} y1={y} x2={WIDTH} y2={y} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />)}
        </g>
      </svg>
    </AbsoluteFill>
  );
}
```

```tsx
// video/src/components/Caption.tsx — 하단 자막
import { AbsoluteFill } from 'remotion';
import { SANS, theme } from '../theme';

export function Caption({ text, dark = false }: { text: string; dark?: boolean }) {
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 72 }}>
      <div style={{ fontFamily: SANS, fontSize: 40, fontWeight: 600, color: dark ? theme.color.darkFg : theme.color.fg, background: dark ? 'rgba(11,18,32,0.7)' : 'rgba(255,255,255,0.85)', padding: '12px 28px', borderRadius: 16, whiteSpace: 'nowrap' }}>
        {text}
      </div>
    </AbsoluteFill>
  );
}
```

- [ ] **Step 8: 컴포지션과 Root**

```tsx
// video/src/compositions/Intro.tsx — Task 12·13 이 자리표시 Caption 을 실제 씬으로 바꾼다
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from 'remotion';
import { getContent, type Locale } from '@me/content';
import { INTRO_DURATION, SCENES, sceneFrames } from '../timeline';
import { theme } from '../theme';
import { Caption } from '../components/Caption';

export type IntroProps = { locale: Locale; bgm: string | null };

export function Intro({ locale, bgm }: IntroProps) {
  const content = getContent(locale);
  void content;
  return (
    <AbsoluteFill style={{ background: theme.color.bg }}>
      {SCENES.map((s) => {
        const { from, durationInFrames } = sceneFrames(s.id);
        return (
          <Sequence key={s.id} from={from} durationInFrames={durationInFrames} name={s.id}>
            <Caption text={s.id} />
          </Sequence>
        );
      })}
      {bgm ? (
        <Audio src={staticFile(bgm)} volume={(f) => interpolate(f, [0, 30, INTRO_DURATION - 60, INTRO_DURATION], [0, 0.6, 0.6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
      ) : null}
    </AbsoluteFill>
  );
}
```

```tsx
// video/src/compositions/HeroLoop.tsx — Task 12 에서 Opening + Timeline 씬으로 교체
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { getContent, type Locale } from '@me/content';
import { FPS, HERO_LOOP_DURATION } from '../timeline';
import { theme } from '../theme';
import { Grid } from '../components/Grid';

export function HeroLoop({ locale }: { locale: Locale }) {
  const frame = useCurrentFrame();
  void getContent(locale);
  return (
    <AbsoluteFill style={{ background: theme.color.bg }}>
      <Sequence from={0} durationInFrames={HERO_LOOP_DURATION}>
        <Grid progress={frame / (2 * FPS)} />
      </Sequence>
    </AbsoluteFill>
  );
}
```

```tsx
// video/src/compositions/OgImage.tsx — 1200×630 공유 이미지
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { getContent, type Locale } from '@me/content';
import { SANS, theme } from '../theme';
import { MONO } from '../fonts';

export function OgImage({ locale }: { locale: Locale }) {
  const { profile } = getContent(locale);
  return (
    <AbsoluteFill style={{ background: theme.color.bg, backgroundImage: `linear-gradient(${theme.color.grid} 1px, transparent 1px), linear-gradient(90deg, ${theme.color.grid} 1px, transparent 1px)`, backgroundSize: '40px 40px', flexDirection: 'row', alignItems: 'center', padding: 72, fontFamily: SANS }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: MONO, fontSize: 24, color: theme.color.accent }}>{profile.affiliation} · {profile.role}</div>
        <div style={{ fontSize: 96, fontWeight: 800, color: theme.color.fg, marginTop: 8 }}>{profile.name}</div>
        <div style={{ fontSize: 40, color: theme.color.muted, marginTop: 8 }}>{profile.tagline}</div>
        <div style={{ fontFamily: MONO, fontSize: 28, color: theme.color.accent, marginTop: 40 }}>me.chois.pro</div>
      </div>
      <Img src={staticFile(profile.pictogram.replace(/^\//, ''))} style={{ width: 400, height: 400, borderRadius: 32 }} />
    </AbsoluteFill>
  );
}
```

```tsx
// video/src/Root.tsx
import { Composition, Still } from 'remotion';
import { Intro } from './compositions/Intro';
import { HeroLoop } from './compositions/HeroLoop';
import { OgImage } from './compositions/OgImage';
import { FPS, HEIGHT, HERO_LOOP_DURATION, INTRO_DURATION, WIDTH } from './timeline';
import './fonts';

export function Root() {
  return (
    <>
      <Composition id="Intro-ko" component={Intro} durationInFrames={INTRO_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{ locale: 'ko', bgm: null }} />
      <Composition id="Intro-en" component={Intro} durationInFrames={INTRO_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{ locale: 'en', bgm: null }} />
      <Composition id="HeroLoop" component={HeroLoop} durationInFrames={HERO_LOOP_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{ locale: 'ko' }} />
      <Still id="OgImage" component={OgImage} width={1200} height={630} defaultProps={{ locale: 'ko' }} />
    </>
  );
}
```

```ts
// video/src/index.ts
import { registerRoot } from 'remotion';
import { Root } from './Root';
registerRoot(Root);
```

- [ ] **Step 9: 설치·컴포지션 확인·OG 스틸 렌더**

Run: `npm install && ls video/public/fonts && npm run compositions -w video && (cd video && npx remotion still src/index.ts OgImage out/og.png) && npm run typecheck -w video`
Expected: 폰트 파일 존재; 목록에 `Intro-ko`, `Intro-en`, `HeroLoop`, `OgImage`; `video/out/og.png` 생성(첫 실행은 Chrome Headless Shell 다운로드로 1~3분); typecheck 오류 0. `open video/out/og.png` 으로 이름·픽토그램이 보이는지 확인.

- [ ] **Step 10: Commit**

```bash
git add video content package-lock.json .gitignore && git commit -m "feat(video): Remotion 뼈대, 테마·폰트·씬 시간표, 컴포지션 등록

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: 영상 씬 1~4 — Opening · Tagline · Timeline · Pillars, HeroLoop 완성

**Files:**
- Create: `video/src/components/Curve.tsx`, `video/src/components/Badge.tsx`, `video/src/scenes/Opening.tsx`, `video/src/scenes/Tagline.tsx`, `video/src/scenes/Timeline.tsx`, `video/src/scenes/Pillars.tsx`
- Modify: `video/src/compositions/Intro.tsx`, `video/src/compositions/HeroLoop.tsx`

**Interfaces:**
- Produces: `Curve({ progress, color?, strokeWidth? })`, `Badge({ text, dark? })`, 씬 4개 `({ content, caption?: boolean })`. `caption=false` 이면 자막을 그리지 않는다(히어로 루프용).

- [ ] **Step 1: Curve.tsx 와 Badge.tsx**

```tsx
// video/src/components/Curve.tsx
import { AbsoluteFill } from 'remotion';
import { HEIGHT, WIDTH } from '../timeline';
import { theme } from '../theme';

export const CURVE = 'M0 760 C 320 760, 420 300, 680 480 S 1120 880, 1380 560 S 1760 200, 1920 320';
export const CURVE_END = { x: 1920, y: 320 };

export function Curve({ progress, color = theme.color.accent, strokeWidth = 6 }: { progress: number; color?: string; strokeWidth?: number }) {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <AbsoluteFill>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <path d={CURVE} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
      </svg>
    </AbsoluteFill>
  );
}
```

```tsx
// video/src/components/Badge.tsx
import { SANS, theme } from '../theme';

export function Badge({ text, dark = false }: { text: string; dark?: boolean }) {
  return (
    <span style={{ fontFamily: SANS, fontSize: 26, fontWeight: 700, color: dark ? theme.color.darkBg : theme.color.bg, background: dark ? theme.color.darkAccent : theme.color.accent, padding: '10px 22px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {text}
    </span>
  );
}
```

- [ ] **Step 2: Opening.tsx** — 격자(0–2s) → 곡선(1.5–4s) → 점 → 이름(4.5–6s)

```tsx
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Content } from '@me/content';
import { Grid } from '../components/Grid';
import { Curve } from '../components/Curve';
import { SANS, theme } from '../theme';
import { MONO } from '../fonts';

export function Opening({ content }: { content: Content; caption?: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const grid = interpolate(frame, [0, 2 * fps], [0, 1], { extrapolateRight: 'clamp' });
  const curve = interpolate(frame, [1.5 * fps, 4 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dot = spring({ frame: frame - 4 * fps, fps, config: { damping: 12 } });
  const name = spring({ frame: frame - 4.5 * fps, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ background: theme.color.bg }}>
      <Grid progress={grid} />
      <Curve progress={curve} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: 28 * dot, height: 28 * dot, borderRadius: 999, background: theme.color.accent, marginBottom: 24 }} />
        <div style={{ fontFamily: SANS, fontSize: 160, fontWeight: 800, color: theme.color.fg, opacity: name, transform: `translateY(${(1 - name) * 40}px)`, letterSpacing: -4 }}>
          {content.profile.name}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 40, color: theme.color.muted, opacity: name }}>{content.profile.tagline}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
```

- [ ] **Step 3: Tagline.tsx** — 이름이 좌상단으로 작아지고 소개문이 타이핑된다

```tsx
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Content } from '@me/content';
import { Grid } from '../components/Grid';
import { SANS, theme } from '../theme';
import { MONO } from '../fonts';

export function Tagline({ content }: { content: Content; caption?: boolean }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const move = spring({ frame, fps, config: { damping: 18 } });
  const intro = content.profile.intro;
  const shown = Math.floor(interpolate(frame, [0.5 * fps, durationInFrames - 1.5 * fps], [0, intro.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const cursorOn = Math.floor(frame / (fps / 2)) % 2 === 0;
  return (
    <AbsoluteFill style={{ background: theme.color.bg }}>
      <Grid progress={1} />
      <div style={{ position: 'absolute', left: 120, top: interpolate(move, [0, 1], [440, 140]), fontFamily: SANS, fontWeight: 800, color: theme.color.fg, fontSize: interpolate(move, [0, 1], [160, 72]), letterSpacing: -2 }}>
        {content.profile.name}
        <span style={{ fontFamily: MONO, fontSize: 32, color: theme.color.accent, marginLeft: 24, fontWeight: 400 }}>{content.profile.affiliation} · {content.profile.role}</span>
      </div>
      <div style={{ position: 'absolute', left: 120, right: 120, top: 300, fontFamily: SANS, fontSize: 52, lineHeight: 1.5, color: theme.color.fg, opacity: move }}>
        {intro.slice(0, shown)}
        <span style={{ opacity: cursorOn ? 1 : 0, color: theme.color.accent }}>▍</span>
      </div>
    </AbsoluteFill>
  );
}
```

- [ ] **Step 4: Timeline.tsx** — 가로축 2012→2026, 노드 6개 순차 점등, 배지 3개 떠오름. 씬 길이(`durationInFrames`)에 맞춰 타이밍을 계산하므로 HeroLoop(14s) 와 Intro(16s) 에 모두 쓴다.

```tsx
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Content } from '@me/content';
import { Grid } from '../components/Grid';
import { Badge } from '../components/Badge';
import { Caption } from '../components/Caption';
import { SANS, theme } from '../theme';
import { MONO } from '../fonts';

const X0 = 160; const X1 = 1760; const Y = 600;

export function Timeline({ content, caption = true }: { content: Content; caption?: boolean }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { career, education, awards } = content.profile;
  const axis = interpolate(frame, [0, 2 * fps], [0, 1], { extrapolateRight: 'clamp' });
  const nodeWindow = durationInFrames * 0.6;
  const highlights = [...education, ...awards].filter((x) => x.highlight);
  const badgeStart = durationInFrames * 0.62;
  const badgeGap = (durationInFrames - badgeStart - fps) / Math.max(1, highlights.length);
  return (
    <AbsoluteFill style={{ background: theme.color.bg, fontFamily: SANS }}>
      <Grid progress={1} />
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        <line x1={X0} y1={Y} x2={X0 + (X1 - X0) * axis} y2={Y} stroke={theme.color.accent} strokeWidth={6} strokeLinecap="round" />
      </svg>
      {career.map((c, i) => {
        const x = X0 + ((X1 - X0) * (i + 0.5)) / career.length;
        const s = spring({ frame: frame - (2 * fps + (nodeWindow * i) / career.length), fps, config: { damping: 12 } });
        const up = i % 2 === 0;
        return (
          <div key={c.id} style={{ position: 'absolute', left: x, top: Y, transform: 'translate(-50%, -50%)', opacity: s }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, background: theme.color.bg, border: `6px solid ${theme.color.accent}`, transform: `scale(${s})` }} />
            <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: up ? -150 : 50, width: 300, textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 24, color: theme.color.muted, whiteSpace: 'nowrap' }}>{c.period.split(' ')[0]}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: theme.color.fg, lineHeight: 1.25 }}>{c.title}</div>
            </div>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 860, display: 'flex', justifyContent: 'center', gap: 24 }}>
        {highlights.map((h, i) => {
          const s = spring({ frame: frame - (badgeStart + badgeGap * i), fps, config: { damping: 12 } });
          return <div key={h.id} style={{ opacity: s, transform: `translateY(${(1 - s) * 40}px)` }}><Badge text={`${h.period} ${h.title}`} /></div>;
        })}
      </div>
      {caption ? <Caption text={`${career[0]?.period.slice(0, 4)} → ${career[career.length - 1]?.period.slice(0, 4)}`} /> : null}
    </AbsoluteFill>
  );
}
```

- [ ] **Step 5: Pillars.tsx** — 세 칸이 아래에서 순차로 떠오른다

```tsx
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Content } from '@me/content';
import { Grid } from '../components/Grid';
import { Caption } from '../components/Caption';
import { SANS, theme } from '../theme';
import { MONO } from '../fonts';

export function Pillars({ content, caption = true }: { content: Content; caption?: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: theme.color.bg, fontFamily: SANS }}>
      <Grid progress={1} />
      <div style={{ position: 'absolute', inset: '140px 120px 200px', display: 'flex', gap: 32 }}>
        {content.profile.pillars.map((p, i) => {
          const s = spring({ frame: frame - i * 0.6 * fps, fps, config: { damping: 14 } });
          return (
            <div key={p.id} style={{ flex: 1, background: theme.color.bg, border: `3px solid ${theme.color.line}`, borderRadius: 32, padding: 40, opacity: s, transform: `translateY(${(1 - s) * 80}px)` }}>
              <div style={{ fontFamily: MONO, fontSize: 28, color: theme.color.accent }}>0{i + 1}</div>
              <div style={{ fontSize: 56, fontWeight: 800, color: theme.color.fg, marginTop: 8 }}>{p.title}</div>
              <div style={{ fontSize: 30, color: theme.color.muted, marginTop: 16, lineHeight: 1.4 }}>{p.summary}</div>
              <ul style={{ marginTop: 32, paddingLeft: 0, listStyle: 'none', fontSize: 30, lineHeight: 1.6, color: theme.color.fg }}>
                {p.items.slice(0, 2).map((it) => <li key={it}>• {it}</li>)}
              </ul>
            </div>
          );
        })}
      </div>
      {caption ? <Caption text={content.ui.sections.pillars} /> : null}
    </AbsoluteFill>
  );
}
```

- [ ] **Step 6: Intro 와 HeroLoop 연결**

`Intro.tsx` 의 `SCENES.map` 자리표시를 씬 컴포넌트 맵으로 바꾼다 (Task 13 의 씬 4개는 아직 `Caption` 자리표시 유지):

```tsx
import type { Content } from '@me/content';
import { type SceneId } from '../timeline';
import { Opening } from '../scenes/Opening';
import { Tagline } from '../scenes/Tagline';
import { Timeline } from '../scenes/Timeline';
import { Pillars } from '../scenes/Pillars';

const scenes: Record<SceneId, (p: { content: Content }) => React.JSX.Element> = {
  opening: Opening,
  tagline: Tagline,
  timeline: Timeline,
  pillars: Pillars,
  stats: () => <Caption text="stats" />,
  projects: () => <Caption text="projects" dark />,
  books: () => <Caption text="books" />,
  ending: () => <Caption text="ending" />,
};
// ... Sequence 안: const Scene = scenes[s.id]; <Scene content={content} />
```

`HeroLoop.tsx` 는 Opening(6s) + Timeline(14s, 자막 없음):

```tsx
import { AbsoluteFill, Sequence } from 'remotion';
import { getContent, type Locale } from '@me/content';
import { FPS, HERO_LOOP_DURATION } from '../timeline';
import { theme } from '../theme';
import { Opening } from '../scenes/Opening';
import { Timeline } from '../scenes/Timeline';

export function HeroLoop({ locale }: { locale: Locale }) {
  const content = getContent(locale);
  return (
    <AbsoluteFill style={{ background: theme.color.bg }}>
      <Sequence from={0} durationInFrames={6 * FPS} name="opening"><Opening content={content} /></Sequence>
      <Sequence from={6 * FPS} durationInFrames={HERO_LOOP_DURATION - 6 * FPS} name="timeline"><Timeline content={content} caption={false} /></Sequence>
    </AbsoluteFill>
  );
}
```

- [ ] **Step 7: 스튜디오에서 확인 후 시험 렌더**

Run: `npm run typecheck -w video && (cd video && npx remotion render src/index.ts HeroLoop out/hero-loop-test.mp4 --codec h264 --crf 28 --frames=0-150)`
Expected: 오류 0, `out/hero-loop-test.mp4` 생성. `npm run video:studio` 로 열어 Opening→Tagline→Timeline→Pillars 를 스크럽해 글자 잘림·겹침이 없는지 확인하고 필요한 좌표만 조정.

- [ ] **Step 8: Commit**

```bash
git add video && git commit -m "feat(video): Opening·Tagline·Timeline·Pillars 씬과 히어로 루프

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: 영상 씬 5~8 — Stats · Projects(다크) · Books · Ending

**Files:**
- Create: `video/src/components/MockupCard.tsx`, `video/src/scenes/Stats.tsx`, `video/src/scenes/Projects.tsx`, `video/src/scenes/Books.tsx`, `video/src/scenes/Ending.tsx`
- Modify: `video/src/compositions/Intro.tsx`

**Interfaces:**
- Produces: `MockupCard({ project, width })`, 씬 4개 `({ content })`.

- [ ] **Step 1: MockupCard.tsx**

```tsx
import { Img, staticFile } from 'remotion';
import type { Project } from '@me/content';
import { SANS, theme } from '../theme';
import { MONO } from '../fonts';

export function MockupCard({ project, width }: { project: Project; width: number }) {
  return (
    <div style={{ width, background: theme.color.darkSurface, borderRadius: 24, overflow: 'hidden', fontFamily: SANS, boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
      <Img src={staticFile(project.mockup.replace(/^\//, ''))} style={{ width, height: width * 0.625, objectFit: 'cover', display: 'block' }} />
      <div style={{ padding: 28 }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: theme.color.darkFg }}>{project.name}</div>
        <div style={{ fontSize: 26, color: theme.color.darkMuted, marginTop: 6 }}>{project.tagline}</div>
        <div style={{ fontFamily: MONO, fontSize: 20, color: theme.color.darkAccent, marginTop: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.stack.join(' · ')}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Stats.tsx** — 숫자 4개 카운트업(2×2)

```tsx
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { computeStats, type Content } from '@me/content';
import { Grid } from '../components/Grid';
import { Caption } from '../components/Caption';
import { SANS, theme } from '../theme';
import { MONO } from '../fonts';

const KEYS = ['years', 'lectures', 'books', 'services'] as const;

export function Stats({ content }: { content: Content }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stats = computeStats(content);
  return (
    <AbsoluteFill style={{ background: theme.color.bg, fontFamily: SANS }}>
      <Grid progress={1} />
      <div style={{ position: 'absolute', inset: '140px 200px 200px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        {KEYS.map((k, i) => {
          const s = spring({ frame: frame - i * 0.3 * fps, fps, config: { damping: 14 } });
          const n = Math.round(interpolate(frame, [i * 0.3 * fps, i * 0.3 * fps + 2 * fps], [0, stats[k]], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
          return (
            <div key={k} style={{ opacity: s, transform: `scale(${0.9 + 0.1 * s})`, background: theme.color.bg, border: `3px solid ${theme.color.line}`, borderRadius: 32, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 180, fontWeight: 700, color: theme.color.accent, lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 36, color: theme.color.muted, marginTop: 12 }}>{content.ui.stats[k]}</div>
            </div>
          );
        })}
      </div>
      <Caption text={content.ui.sections.stats} />
    </AbsoluteFill>
  );
}
```

- [ ] **Step 3: Projects.tsx** — 다크 전환 후 카드 5장이 3초씩 중앙을 지나가고 마지막 3초에 그리드로 정렬

```tsx
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Content } from '@me/content';
import { Grid } from '../components/Grid';
import { Caption } from '../components/Caption';
import { MockupCard } from '../components/MockupCard';
import { theme } from '../theme';

const CARD_W = 900;
const SLOT_SEC = 3;

export function Projects({ content }: { content: Content }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const projects = content.projects;
  const darken = interpolate(frame, [0, fps], [0, 1], { extrapolateRight: 'clamp' });
  const gridStart = durationInFrames - 3 * fps;
  const toGrid = spring({ frame: frame - gridStart, fps, config: { damping: 16 } });
  const gridW = 520;
  return (
    <AbsoluteFill style={{ background: theme.color.darkBg, opacity: 1 }}>
      <AbsoluteFill style={{ background: theme.color.bg, opacity: 1 - darken }} />
      <Grid progress={1} dark />
      {projects.map((p, i) => {
        const start = fps + i * SLOT_SEC * fps;
        const enter = spring({ frame: frame - start, fps, config: { damping: 18 } });
        const exit = spring({ frame: frame - (start + (SLOT_SEC - 0.6) * fps), fps, config: { damping: 18 } });
        const passX = interpolate(enter, [0, 1], [2200, 960]) - interpolate(exit, [0, 1], [0, 2200]);
        // 그리드 위치: 위 3개, 아래 2개
        const col = i < 3 ? i : i - 3;
        const cols = i < 3 ? 3 : 2;
        const gx = 960 + (col - (cols - 1) / 2) * (gridW + 40);
        const gy = i < 3 ? 330 : 760;
        const x = interpolate(toGrid, [0, 1], [passX, gx]);
        const y = interpolate(toGrid, [0, 1], [540, gy]);
        const w = interpolate(toGrid, [0, 1], [CARD_W, gridW]);
        const visible = frame >= start || toGrid > 0;
        return (
          <div key={p.id} style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', opacity: visible ? 1 : 0 }}>
            <MockupCard project={p} width={w} />
          </div>
        );
      })}
      <Caption text={content.ui.sections.projects} dark />
    </AbsoluteFill>
  );
}
```

- [ ] **Step 4: Books.tsx** — 밝게 복귀, 표지 3권 부채꼴, 아래로 연수 기관 티커

```tsx
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Content } from '@me/content';
import { Grid } from '../components/Grid';
import { Caption } from '../components/Caption';
import { SANS, theme } from '../theme';

export function Books({ content }: { content: Content }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lighten = interpolate(frame, [0, fps], [0, 1], { extrapolateRight: 'clamp' });
  const orgs = content.profile.lecturesTeacher.map((l) => l.org ?? l.title).join('   ·   ');
  const tickerX = interpolate(frame, [fps, 8 * fps], [1920, -2400]);
  return (
    <AbsoluteFill style={{ background: theme.color.darkBg, fontFamily: SANS }}>
      <AbsoluteFill style={{ background: theme.color.bg, opacity: lighten }} />
      <Grid progress={1} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 120, display: 'flex', justifyContent: 'center', gap: 48 }}>
        {content.profile.books.map((b, i) => {
          const s = spring({ frame: frame - (0.5 + i * 0.4) * fps, fps, config: { damping: 14 } });
          const rot = (i - 1) * 8;
          return (
            <div key={b.id} style={{ opacity: s, transform: `translateY(${(1 - s) * 80}px) rotate(${rot * s}deg)`, textAlign: 'center' }}>
              <Img src={staticFile(b.cover.replace(/^\//, ''))} style={{ width: 360, borderRadius: 12, boxShadow: '0 24px 60px rgba(15,23,42,0.25)' }} />
              <div style={{ fontSize: 28, fontWeight: 700, color: theme.color.fg, marginTop: 20, width: 360 }}>{b.title}</div>
              <div style={{ fontSize: 22, color: theme.color.muted }}>{b.role.split(' ')[0]} · {b.year}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', top: 900, left: tickerX, whiteSpace: 'nowrap', fontSize: 34, color: theme.color.accent, fontWeight: 600 }}>{orgs}</div>
      <Caption text={`${content.ui.sections.books} · ${content.ui.sections.lectures}`} />
    </AbsoluteFill>
  );
}
```

- [ ] **Step 5: Ending.tsx**

```tsx
import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Content } from '@me/content';
import { Grid } from '../components/Grid';
import { SANS, theme } from '../theme';
import { MONO } from '../fonts';

export function Ending({ content }: { content: Content }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16 } });
  const { profile } = content;
  return (
    <AbsoluteFill style={{ background: theme.color.bg, fontFamily: SANS, justifyContent: 'center', alignItems: 'center' }}>
      <Grid progress={1} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 80, opacity: s, transform: `translateY(${(1 - s) * 40}px)` }}>
        <Img src={staticFile(profile.pictogram.replace(/^\//, ''))} style={{ width: 360, height: 360, borderRadius: 48 }} />
        <div>
          <div style={{ fontSize: 96, fontWeight: 800, color: theme.color.fg }}>{profile.name}</div>
          <div style={{ fontFamily: MONO, fontSize: 56, color: theme.color.accent, marginTop: 16 }}>me.chois.pro</div>
          <div style={{ fontFamily: MONO, fontSize: 30, color: theme.color.muted, marginTop: 24 }}>github.com/ChoisMath</div>
          <div style={{ fontFamily: MONO, fontSize: 30, color: theme.color.muted }}>{profile.links.email}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
```

- [ ] **Step 6: Intro 의 자리표시 4개를 실제 씬으로 교체** — `scenes` 맵의 `stats: Stats, projects: Projects, books: Books, ending: Ending`. 이제 `Caption` import 가 Intro 에서 불필요하면 제거.

- [ ] **Step 7: 전체 시험 렌더 (저해상도·일부 구간)**

Run: `npm run typecheck -w video && (cd video && npx remotion render src/index.ts Intro-ko out/intro-test.mp4 --codec h264 --scale 0.5 --frames=1200-2460)`
Expected: 오류 0, 파일 생성. 스튜디오에서 Projects 카드의 진입·퇴장·그리드 정렬과 Books 티커가 자연스러운지 확인하고 좌표만 조정.

- [ ] **Step 8: Commit**

```bash
git add video && git commit -m "feat(video): Stats·Projects·Books·Ending 씬

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: 렌더 스크립트, 영상·OG 를 웹에 연결, SEO 파일

**Files:**
- Create: `scripts/render-video.sh`, `web/src/components/VideoDialog.tsx`, `web/public/robots.txt`, `web/public/sitemap.xml`, `web/public/CNAME`
- Modify: `web/src/components/sections/Hero.tsx`, `web/e2e/smoke.spec.ts`, `README.md`

**Interfaces:**
- Produces: `web/public/video/{intro-ko.mp4,hero-loop.mp4,hero-loop.webm,hero-poster.jpg}`, `web/public/img/og.png`, `VideoDialog({ src, openLabel, closeLabel })`.

- [ ] **Step 1: scripts/render-video.sh**

```bash
#!/usr/bin/env bash
# Remotion 렌더 → web/public 으로 복사. 배경음악은 video/public/audio/bgm.mp3 가 있을 때만 넣는다.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/video"
mkdir -p out "$ROOT/web/public/video" "$ROOT/web/public/img"

if [ -f public/audio/bgm.mp3 ]; then BGM='"audio/bgm.mp3"'; else BGM='null'; echo "no bgm.mp3 — rendering without music"; fi

npx remotion render src/index.ts Intro-ko out/intro-ko.mp4 --codec h264 --crf 23 --props="{\"locale\":\"ko\",\"bgm\":$BGM}"
npx remotion render src/index.ts HeroLoop out/hero-loop.mp4 --codec h264 --crf 28
npx remotion render src/index.ts HeroLoop out/hero-loop.webm --codec vp8 --crf 34
npx remotion still src/index.ts OgImage out/og.png

ffmpeg -y -loglevel error -ss 5 -i out/hero-loop.mp4 -frames:v 1 -q:v 3 out/hero-poster.jpg

cp out/intro-ko.mp4 out/hero-loop.mp4 out/hero-loop.webm out/hero-poster.jpg "$ROOT/web/public/video/"
cp out/og.png "$ROOT/web/public/img/og.png"

limit() { local f=$1 max=$2; local size; size=$(stat -f%z "$f"); [ "$size" -le "$max" ] || { echo "too big: $f ($size bytes > $max) — raise --crf in scripts/render-video.sh"; exit 1; }; }
limit "$ROOT/web/public/video/intro-ko.mp4" 20971520
limit "$ROOT/web/public/video/hero-loop.mp4" 5242880
limit "$ROOT/web/public/video/hero-loop.webm" 5242880
echo "rendered → web/public/video, web/public/img/og.png"
```

- [ ] **Step 2: 렌더 실행**

Run: `chmod +x scripts/render-video.sh && npm run render && ls -la web/public/video web/public/img/og.png`
Expected: 파일 4개 + og.png, 용량 제한 통과 (Intro 전체 렌더는 M4 기준 3~8분).

- [ ] **Step 3: VideoDialog.tsx**

```tsx
'use client';
import { useRef } from 'react';

export function VideoDialog({ src, openLabel, closeLabel }: { src: string; openLabel: string; closeLabel: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const open = () => { dialog.current?.showModal(); void video.current?.play(); };
  const close = () => { video.current?.pause(); dialog.current?.close(); };
  return (
    <>
      <button type="button" onClick={open} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold whitespace-nowrap text-bg" data-testid="open-video">
        ▶ {openLabel}
      </button>
      <dialog ref={dialog} onClose={close} className="m-auto w-[min(96vw,1200px)] rounded-2xl bg-dark-bg p-2 backdrop:bg-black/70">
        <video ref={video} controls preload="metadata" className="aspect-video w-full rounded-xl" src={src} />
        <button type="button" onClick={close} className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-dark-muted text-sm whitespace-nowrap text-dark-fg">{closeLabel}</button>
      </dialog>
    </>
  );
}
```

- [ ] **Step 4: Hero 에 연결** — `Hero.tsx` 의 `<GridBackground />` 바로 뒤에 히어로 루프를 깔고, 소개문 아래에 버튼을 둔다.

```tsx
import { HeroVideo } from '../HeroVideo';
import { VideoDialog } from '../VideoDialog';
// ... 바깥 div 첫 자식들:
<GridBackground />
<div className="absolute inset-0 opacity-60"><HeroVideo srcMp4="/video/hero-loop.mp4" srcWebm="/video/hero-loop.webm" poster="/video/hero-poster.jpg" playLabel={ui.hero.playVideo} /></div>
// ... 소개문 <p> 다음:
<div className="mt-8"><VideoDialog src="/video/intro-ko.mp4" openLabel={ui.hero.watchVideo} closeLabel={ui.hero.closeVideo} /></div>
```

(텍스트 블록이 `relative z-[1]` 인지 다시 확인한다. 영어판도 1차에서는 한국어 자막 영상을 쓴다.)

- [ ] **Step 5: SEO 파일**

`web/public/CNAME`: `me.chois.pro`

`web/public/robots.txt`:
```
User-agent: *
Allow: /
Sitemap: https://me.chois.pro/sitemap.xml
```

`web/public/sitemap.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url><loc>https://me.chois.pro/</loc><xhtml:link rel="alternate" hreflang="ko" href="https://me.chois.pro/"/><xhtml:link rel="alternate" hreflang="en" href="https://me.chois.pro/en/"/></url>
  <url><loc>https://me.chois.pro/en/</loc><xhtml:link rel="alternate" hreflang="ko" href="https://me.chois.pro/"/><xhtml:link rel="alternate" hreflang="en" href="https://me.chois.pro/en/"/></url>
</urlset>
```

- [ ] **Step 6: e2e 추가**

```ts
test('desktop loads the hero loop and the intro dialog opens', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('hero-video')).toHaveCount(1);
  await page.getByTestId('open-video').click();
  await expect(page.locator('dialog[open] video')).toHaveAttribute('src', '/video/intro-ko.mp4');
});

test.describe('mobile hero', () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test('shows the poster button instead of loading the video', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('hero-video')).toHaveCount(0);
    await page.getByRole('button', { name: /영상 재생/ }).click();
    await expect(page.getByTestId('hero-video')).toHaveCount(1);
  });
});

test('static seo files are served', async ({ request }) => {
  for (const p of ['/robots.txt', '/sitemap.xml', '/CNAME', '/img/og.png', '/video/intro-ko.mp4']) {
    const r = await request.get(p);
    expect(r.status(), p).toBe(200);
  }
});
```

- [ ] **Step 7: 빌드·e2e·lint**

Run: `npm run build:web && npm run e2e -w web && npm run lint -w web && npm run typecheck -w web`
Expected: e2e PASS 13, 오류 0

- [ ] **Step 8: README 에 렌더·자산 절차 한 줄씩 추가 후 Commit**

```bash
git add scripts web README.md && git commit -m "feat: 영상 렌더 스크립트, 히어로 영상·소개 영상 연결, SEO 파일

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 15: GitHub Pages 배포

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md`

- [ ] **Step 1: deploy.yml**

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run content:validate
      - run: npm run test
      - run: npm run lint -w web
      - run: npm run typecheck -w web
      - run: npm run build:web
      - uses: actions/upload-pages-artifact@v3
        with:
          path: web/out
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

(영상 렌더와 자산 변환은 CI 에서 하지 않는다. `web/public/video`, `web/public/img` 는 커밋된 산출물이다. `npm ci` 는 video 워크스페이스의 postinstall(폰트 복사)도 실행하지만 Chrome 은 내려받지 않는다.)

- [ ] **Step 2: 로컬 최종 점검**

Run: `npm run check && npm run build:web && npm run e2e -w web && git status --short`
Expected: 모두 통과, 작업 트리 깨끗함 (`tokens.css`, `out/`, `video/out/` 은 ignore)

- [ ] **Step 3: 저장소 생성·push (사용자 확인 후)**

```bash
gh repo create ChoisMath/my-introduction --public --source=. --remote=origin --description "최재혁 소개 페이지 (me.chois.pro)"
git push -u origin main
gh api -X POST repos/ChoisMath/my-introduction/pages -f build_type=workflow
gh api -X PUT repos/ChoisMath/my-introduction/pages -f cname=me.chois.pro -F https_enforced=true
gh run watch
```

Expected: 워크플로 성공, `https://choismath.github.io/my-introduction/` 대신 커스텀 도메인 대기 상태.

- [ ] **Step 4: DNS (사용자가 name.com 에서 직접)**

`chois.pro` 존에 레코드 추가: `me`  CNAME  `choismath.github.io.` (TTL 300). 전파 후 GitHub Pages 설정에서 "DNS check successful" 과 "Enforce HTTPS" 를 확인.

- [ ] **Step 5: 배포 후 확인**

```bash
curl -sI https://me.chois.pro/ | head -1
curl -sI https://me.chois.pro/en/ | head -1
curl -sI https://me.chois.pro/img/og.png | head -1
curl -sI https://me.chois.pro/video/intro-ko.mp4 | head -1
```

Expected: 모두 `HTTP/2 200`. 휴대폰 실기기에서 `/` 를 열어 포스터→탭→영상, 언어 토글, 표 가로 스크롤을 확인.

- [ ] **Step 6: README 에 배포·DNS 절차 기록 후 Commit·push**

```bash
git add .github README.md && git commit -m "ci: GitHub Pages 배포 워크플로

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

---

## 자가 검토 메모

- 스펙 §2 공개 범위 → Task 2·3(콘텐츠), §3 산출물 → Task 14, §4 구조 → Task 1·6·11, §5 모델 → Task 2, §5.1/5.2 → Task 2·5, §6 디자인 → Task 5(토큰)·10(모션), §7 섹션 8개 → Task 6~10, §8 스토리보드 → Task 11~13, §9 다국어 → Task 3·6, §10 배포 → Task 14·15, §11 검증 → 각 태스크의 vitest·e2e, §12 범위 밖 항목은 어느 태스크에도 없음.
- 영어판 영상은 `Intro-en` 컴포지션 등록만 하고 렌더하지 않는다 (스펙 §3).
- 내레이션은 `Intro` 의 `bgm` prop 과 같은 방식으로 `narration` 을 추가하면 되지만 1차 범위 밖이므로 넣지 않았다.
