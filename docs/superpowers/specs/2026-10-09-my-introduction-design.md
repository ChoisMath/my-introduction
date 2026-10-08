# 최재혁 소개 페이지·영상 설계 (me.chois.pro)

작성 2026-10-09. 브레인스토밍 문답으로 확정한 설계. 구현 계획은 `docs/superpowers/plans/` 에 별도 작성.

## 1. 목적과 관객

- 목적: 최재혁(포산고등학교 수학교사)의 포트폴리오를 집약한 **공개 자기소개 웹페이지**와 **모션그래픽 소개 영상**.
- 관객: 학생·동료 교사·외부(연수·발표·교류) 누구나. 수업 시범용 간소화 템플릿은 범위 밖.
- 성공 기준: `https://me.chois.pro/` 와 `/en/` 이 정적으로 서비스되고, 8개 섹션과 소개 영상이 같은 콘텐츠·디자인 토큰에서 생성되며, 모바일 375px 에서 가로 스크롤 없이 읽힌다.

## 2. 공개 범위

- 실명(최재혁 / Choi Jae-hyuk), 현 소속(포산고등학교), 학력·경력·수상·저서·연구회·강의 이력, 사진(증명사진) 및 픽셀아트 픽토그램 모두 공개.
- 운영 서비스는 **목업 이미지 + 이름 + 한 줄 소개 + 스택 배지 + YouTube 링크(있을 때) + 사이트 URL** 만. 로그인 전용 서비스는 `urlNote` 로 "교직원·학생 전용" 안내.
- 금지: 주민번호·주소·서명·전화번호 등 공적조서의 개인 식별 정보는 어떤 파일에도 넣지 않는다. `asset/` 의 교보문고 저장 HTML 과 zip 은 git 에서 제외.

## 3. 산출물

1. 웹페이지: Next.js 16 `output: "export"` 정적 사이트. `/`(ko), `/en/`(en).
2. 소개 영상: Remotion, 1920×1080 30fps 약 80초, 한국어 자막 내장 mp4(H.264, 20MB 이내). 영어판은 locale prop 교체로 렌더링 가능하게만 준비(1차 범위에서 렌더링하지 않음).
3. 히어로 루프: 오프닝+타임라인 장면 20초, 무음·자막 없음. webm + mp4, 각 5MB 이내.

## 4. 저장소 구조

```
my_intoduction/                 # 폴더명 오타는 사용자 지정 경로라 유지. GitHub 저장소명은 my-introduction
├── package.json                # npm workspaces: web, video. 루트 스크립트: check, dev, build, render
├── content/
│   ├── schema.ts               # zod 스키마 (profile, projects, tokens)
│   ├── tokens.json             # 색·폰트·간격. 웹 @theme 와 영상이 공유
│   ├── ko/profile.json
│   ├── ko/projects.json
│   ├── en/profile.json
│   └── en/projects.json
├── asset/                      # 원본 자산 (사용자 제공). 빌드 시 web/public/img 로 최적화 복사
├── web/                        # Next.js 16 + TypeScript + Tailwind 4 + motion
├── video/                      # Remotion
└── docs/
    ├── content/profile-draft.md
    └── superpowers/{specs,plans}/
```

## 5. 콘텐츠 모델 (`content/schema.ts`)

```ts
TimelineItem = { id, period, title, org?, detail?, kind: "edu"|"career"|"award"|"book"|"group"|"lecture-teacher"|"lecture-student" }
Profile = {
  name, nameEn, tagline, intro,            // 한 문장 소개, 2~3문장 소개
  affiliation, since: "2012-03",
  stats: { years, teacherLectures, books, services, awards },
  education: TimelineItem[], career: TimelineItem[], awards: TimelineItem[],
  books: { id, title, role: "공저", year, isbn, publisher, url, cover }[],
  groups: TimelineItem[], lecturesTeacher: TimelineItem[], lecturesStudent: TimelineItem[],
  pillars: { id, title, items: string[] }[3],
  links: { email, github, sites: { label, url }[] }
}
Project = { id, name, tagline, stack: string[], url?, urlNote?, youtubeId?, mockup, dark?: boolean }
```

- ko/en 두 파일은 **같은 id 집합**을 가져야 한다. 검증 스크립트가 id 집합·배열 길이 불일치 시 빌드를 실패시킨다.
- `stats` 는 수동 입력이 아니라 배열 길이에서 계산한다 (예: `teacherLectures = lecturesTeacher.length`). 단 `years` 는 `since` 와 빌드 연도로 계산.
- 초기 데이터는 `docs/content/profile-draft.md` 를 옮긴다.

### 5.1 서비스 목록 (확정, 5개)

| id | 이름 | 한 줄 소개 | 스택 | URL |
|---|---|---|---|---|
| choisnote | ChoisNote | 교사용 스마트 교무수첩·협업 플랫폼 (일정·학급·상담·AI 생기부·Google 연동, PWA/Android) | Rails 8, Hotwire, Tailwind, PostgreSQL, Railway | chois.pro |
| choisclass | ChoisClass | 태블릿 필기 기반 수학 수업 플랫폼 (실시간 공유, 인터랙티브 HTML 도구) | React, Fastify, Socket.IO, Excalidraw | class.chois.ai.kr (urlNote: 교사·학생 전용) |
| posanmeal | PosanMeal | 학교 급식 신청·확인 앱 | Next.js, Prisma, Railway | meal.posan.kr (urlNote: 교직원·학생 전용) |
| selfstudy | 자율학습 출석부 | 자율학습(오후/야간) 출결 관리 앱 | Next.js, Prisma, Railway | self.posan.kr (urlNote: 교직원·학생 전용) |
| mathcoach | MathCoach | AI 수학 코칭 도구 (문제 은행·OCR) | Firebase, Genkit, Gemini | — |

목업 이미지와 YouTube ID 는 사용자가 제공. 없으면 자리표시 목업으로 빌드.

### 5.2 저서 (확정, 3권)

| 제목 | ISBN | 출판사 | 연도 | 표지 파일 |
|---|---|---|---|---|
| 지오지브라 중학교 수학 (공저) | 9791187541202 | (교보 페이지에서 확인) | 2017 | asset/지오지브라_중학교_수학_이미지.png |
| 지오지브라 고등학교 수학 (공저) | 9791187541196 | (교보 페이지에서 확인) | 2017 | asset/지오지브라_고등학교_수학_이미지.png |
| 에이전틱 AI 학교 교육 활용법 (홍진우·류진현·유상은·최재혁 공저) | 9791193059975 | 앤써북 | 2026 | asset/에이전틱AI학교교육활용법_이미지.png |

교보문고 링크: S000001903386, S000001903385, S000221379920.

## 6. 디자인

- 톤: 밝은 **수학적 미니멀**(흰 바탕, 좌표평면 격자, 함수 곡선 모션) 기본. **만든 서비스** 섹션만 다크 패널. 영상도 같은 전환.
- 토큰(`content/tokens.json`): `bg #FFFFFF`, `fg #0F172A`, `accent 네이비(픽토그램 정장색 계열, 예 #1D3C77)`, `grid #E2E8F0`, `dark-bg #0B1220`, `dark-fg #E5E7EB`, `dark-accent 밝은 하늘색`. 폰트 Pretendard(본문) + JetBrains Mono(숫자·코드). 웹 `globals.css` `@theme` 과 Remotion 이 같은 JSON 을 읽는다.
- 픽셀아트 픽토그램은 히어로 보조 그래픽·파비콘·OG 이미지에, 증명사진은 타임라인/연락 섹션에 사용.
- `prefers-reduced-motion` 시 모든 모션 off, 히어로는 포스터 이미지.

## 7. 웹페이지 구성 (단일 페이지, 상단 고정 내비 + 언어 토글)

| # | 섹션 (anchor) | 내용 | 모션 |
|---|---|---|---|
| 1 | hero | 이름·한 줄 소개·소속, 히어로 루프 배경, "영상 전체 보기" | 격자 드로잉 → 곡선 → 이름 |
| 2 | stats | 교직 N년·연수 강의 N회·저서 3권·서비스 5개·표창 2건 | 카운트업 |
| 3 | timeline | 학력·경력·수상 한 축 | 축 드로잉, 노드 점등 |
| 4 | pillars | 수학 수업 / AI 융합교육 연수·강의 / 교육용 서비스 개발 | 카드 슬라이드 인 |
| 5 | projects (다크) | 서비스 5개 카드 그리드 | 배경 전환, 호버 리프트 |
| 6 | books | 책 표지 3권 + 출제·자료개발 이력 | 책장 펼침 |
| 7 | lectures | 교사 대상 / 학생 대상 탭, 표 | 탭 전환 |
| 8 | contact | 이메일, GitHub, 운영 사이트 | 없음 |

공통 규칙: 모바일 우선, 바깥 여백 `p-2`(모바일)~`lg:p-4`, 표는 `overflow-x-auto` + `whitespace-nowrap` + sticky 헤더(배경색 명시), 버튼·배지 `whitespace-nowrap`, 터치 타겟 44px, `100dvh`. 히어로 영상은 모바일에서 포스터만 보이고 탭 시 로드.

## 8. 소개 영상 스토리보드 (Remotion, 80초)

| 시간 | 장면(Sequence) | 화면 | 텍스트 |
|---|---|---|---|
| 0~6s | Opening | 격자 → 곡선 → 점이 이름으로 | 최재혁 / 수학교사 · 만드는 사람 |
| 6~14s | Tagline | 이름 축소, 핵심 문장 타이핑 | intro 문장 |
| 14~30s | Timeline | 2012→2026 가로축, 학교 노드 5개, 배지 3개(석사·AIEDAP·장관표창) | career 라벨 |
| 30~42s | Pillars | 3분할 아이콘+제목+대표활동 2개 | pillars |
| 42~50s | Stats | 숫자 4개 카운트업 | stats |
| 50~68s | Projects (다크) | 목업 5개 각 3초 슬라이드, 마지막 그리드 정렬 | projects |
| 68~76s | Books & Lectures | 표지 3권 펼침, 강의 장소 티커 | books, lecturesTeacher |
| 76~82s | Ending | 밝게, 주소·연락처 | me.chois.pro / GitHub / email |

- 히어로 루프 컴포지션 = Opening + Timeline (20초, 무음, 자막 없음).
- 사운드: CC0 배경음악 1곡(다크 전환 지점에 톤 변화). 내레이션은 기본 없음. `video/narration/` 에 선택 옵션(로컬 Qwen3-TTS 또는 본인 녹음 wav)을 넣으면 자막과 동기화하는 훅만 준비.
- 렌더: `npm run render` → `video/out/intro-ko.mp4`, `hero-loop.webm/mp4` → `web/public/video/` 로 복사하는 스크립트.

## 9. 다국어

- `/`(ko) 와 `/en/` 정적 생성. `[locale]` 세그먼트 + `generateStaticParams`. `trailingSlash: true`.
- 언어 토글은 현재 앵커를 유지하며 이동. `<html lang>`, `hreflang`, OG 제목·설명 두 언어.
- 영어 콘텐츠는 초벌 번역 후 사용자 검토. 기관 공식 영문명 사용 (Posan High School, Daegu Science High School, Kyungpook National University, Hongik University, Daegu Metropolitan Office of Education).

## 10. 배포

- GitHub `ChoisMath/my-introduction`, GitHub Pages, 커스텀 도메인 `me.chois.pro` (`web/public/CNAME`), name.com DNS `me` CNAME → `choismath.github.io`, HTTPS 강제.
- Actions: `main` push → `npm ci` → `npm run check` → `next build` (web/out) → `actions/deploy-pages`. 영상은 CI 에서 렌더링하지 않고 결과물을 커밋(20MB 이내).
- `images.unoptimized: true`, `robots.txt`, `sitemap.xml`(2 URL), OG 이미지.

## 11. 검증

- `npm run check`: tsc + eslint + 콘텐츠 스키마·ko/en 일치 검증.
- 단위(vitest): 스키마 검증 함수, stats 계산, 언어 토글 URL 계산.
- Playwright 스모크: ko/en 두 페이지 로드, 8개 앵커 존재, 토글 시 앵커 유지, 375px 가로 스크롤 없음, reduced-motion 시 비디오 미로드.
- 배포 후 수동: `/`, `/en/` 200, OG 이미지, 히어로 영상 재생, 모바일 실기기.

## 12. 범위 밖 (YAGNI)

학생용 간소화 템플릿, 블로그·방명록·문의 폼, 영어판 영상 렌더링, 내레이션 음성 제작, 전체 다크 모드 토글.

## 13. 구현 순서

1. 뼈대: workspaces, content 스키마 + ko JSON(약력 초안 이관), 검증 스크립트, .gitignore.
2. 웹 1차: 8개 섹션 정적 완성(모션 없음), 반응형.
3. 웹 2차: motion 애니메이션, 다크 전환, reduced-motion.
4. 영상: Remotion 7개 씬 → ko mp4 + 히어로 루프 → 웹 삽입.
5. 영어판: content/en, `/en/`, 토글.
6. 배포: GitHub 저장소, Actions, CNAME, 스모크.

## 14. 사용자 제공 자산 현황

| 자산 | 상태 |
|---|---|
| 사진 `asset/최재혁_증명사진.jpg` (472×591) | 있음 |
| 픽토그램 `asset/최재혁_픽토그램.jpg` (1024×1024 픽셀아트) | 있음 |
| 책 표지 3권 PNG | 있음 |
| 서비스 목업 이미지 5개, YouTube ID | **대기** (자리표시로 진행) |
| 배경음악 | 구현 시 CC0 트랙 선택 |

## 15. 리스크

- Remotion 은 Chrome Headless 를 내려받는다. 브라우저 캐시는 로컬 디스크(`~/.cache`)에 두고 SD 카드에는 두지 않는다.
- GitHub Pages 파일당 100MB·총 1GB 제한 → 영상 비트레이트로 20MB 이내 유지.
- SD 카드(APFS) 위 `node_modules` 는 느릴 수 있다. 문제 시 `npm ci` 를 로컬 디스크 클론에서 수행하는 대안을 계획에 명시.
