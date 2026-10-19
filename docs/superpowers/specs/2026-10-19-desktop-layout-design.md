# 데스크탑 전체 폭 레이아웃 설계

- 날짜: 2026-10-19
- 대상: `web` 워크스페이스 — 홈(`/`, `/en/`)과 AI활용 허브(`/ai/…`) 전부
- 배경: 모바일은 만족스럽지만 데스크탑에서는 모든 컨테이너가 1152px(`max-w-6xl`)에 갇혀 FHD 이상에서 양옆이 크게 빈다. 모바일 레이아웃은 그대로 두고 데스크탑에서 화면 폭을 자연스럽게 쓰게 한다.

## 1. 확정된 결정 (사용자 답변)

| 항목 | 결정 |
|---|---|
| 어색한 화면 | AI활용 갤러리(모션·슬라이드), 홈 소개 페이지, 모션 상세, 브랜드 룩북 — 전부 |
| 방식 | **넓은 유동 컨테이너**. 2단 사이드바 구조로 바꾸지 않는다 |
| 최대 폭 | **거의 유동(약 1920px)**. FHD 까지는 여백만 남기고 끝까지 쓰고, QHD 이상에서만 중앙 정렬 |
| 긴 글 | **읽기 폭 유지** — 문단은 70자 안팎, 카드·그리드만 넓힌다 |
| 카드 그리드 | **열 수를 늘려 카드 크기 유지**(한 화면에 더 많이) |
| 모션 상세 | 1280px 이상에서 **2단**: 영상 왼쪽, 제목·설명·프롬프트 복사·이전/다음 오른쪽 |
| 홈 히어로 | **배경 영상은 화면 끝까지**(full-bleed), 글·픽토그램은 컨테이너 안 |
| 기준 화면 | 혼합(노트북 1440~1536 + 모니터 1920, 때때로 QHD) |

## 2. 폭 체계

지금은 `max-w-6xl`(72rem) 하나를 모든 곳에 쓴다. 세 가지 폭으로 나눈다. Tailwind 4 `@theme` 토큰으로 두어 숫자를 한 곳에서 바꾼다(`web/src/app/globals.css`).

| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| `--container-site` | **120rem (1920px)** | Nav, AI활용 헤더+탭, 모션·슬라이드 갤러리, 모션 상세, 브랜드 룩북 출처 줄, 히어로 내용, 통계, 프로젝트, 저서 |
| `--container-wide` | **96rem (1536px)** | 글이 섞인 홈 섹션 — 소개 3기둥(Pillars), 경력(Timeline), 강의 표(Lectures), 연락(Contact) |
| `--container-prose` | **42rem (672px)** | 문단 — 히어로 소개문(`max-w-2xl` 유지), 허브 소개 한 줄 등 |

좌우 여백(gutter)은 화면이 넓을수록 키운다: `px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 2xl:px-10` (8→12→16→24→32→40px). FHD 에서 site 폭은 1920−80=1840px 로 사실상 전체 폭, QHD(2560)에서는 1920px 중앙 정렬.

구현은 `Section` 에 `width?: 'site' | 'wide'` prop(기본 `site`)을 두고, 허브 쪽은 공용 유틸 클래스(`@utility container-site`, `container-wide`)를 쓴다. 지금 각 페이지에 흩어진 `mx-auto w-full max-w-6xl` 을 전부 이 둘로 바꾼다.

## 3. 화면별 변경

### 3.1 공통 셸
- **Nav**(`components/Nav.tsx`): `max-w-6xl` → `container-site`. 로고 왼쪽, 섹션 앵커, 언어 토글·계정 오른쪽은 그대로.
- **SiteFooter**: 변경 없음(중앙 한 줄).
- **AI활용 헤더+탭**(`ai-hub/AiHeader.tsx`): `container-site`. 제목 옆 소개문은 `max-w-prose` 로 묶어 한 줄이 1800px 까지 늘어지지 않게 한다.

### 3.2 홈 (`components/sections/*`)
| 섹션 | 폭 | 그리드(열 수: 기본 / sm / lg / xl / 2xl) | 비고 |
|---|---|---|---|
| Hero | 배경 full-bleed, 내용 site | — | `Section` 안의 음수 마진 트릭 대신 Hero 가 자체 `<section id="hero">` 를 그린다. `HeroStage`(그리드 배경+루프 영상)는 섹션 전체에 깔고, 텍스트+픽토그램만 `container-site` 안에. 소개 문단 `max-w-2xl`, 픽토그램 `lg:w-80` 유지 |
| Stats | site | 2 / 3 / 5 / 5 / 5 | 5장이라 열 수 고정. 카드가 넓어질 뿐 |
| Timeline | wide | 경력 `lg:grid-cols-[1fr_320px]` 유지, 연구회·자료 3 → `xl:grid-cols-4` | 항목이 짧아 4열 가능 |
| Pillars | wide | 1 / — / 3(md) | 글 카드라 wide(1536)에 가둔다. 3열 유지 |
| Projects | site | 1 / 2 / 3 / 4 / 5 | 프로젝트 5개 → 2xl 에서 한 줄 |
| Books | site | 1 / 3 / 3 / 6 / 6 | 3권이라 xl 부터 6열 그리드에 3칸만 써서 표지가 ~290px 로 유지(왼쪽 정렬) |
| Lectures | wide | 표 | 표는 1536 안에서 읽기 좋게 |
| Contact | wide | 칩 flex-wrap | 그대로 |

### 3.3 AI활용 허브
| 화면 | 폭 | 그리드 / 배치 |
|---|---|---|
| 모션 갤러리(`MotionGallery`) | site | 카드 2 / 3 / 4 / **5(xl)** / **6(2xl)**. 필터 툴바는 그대로 |
| 슬라이드 갤러리(`SlideGallery`) | site | 카드 1 / 2 / 3 / **4(xl)**. 카드 썸네일이 760×424 라 4열(FHD 에서 ~450px)까지가 적당 |
| 모션 상세(`motion/[id]/page.tsx`) | site | `xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] xl:gap-8`. 왼쪽 영상(aspect-video), 오른쪽 세로 스택: 번호+제목+영문명 → 용도 → 컨셉 → 프롬프트 복사(+편집기 링크) → 이전/목록/다음. 오른쪽 열 `xl:sticky xl:top-[calc(var(--nav-h)+1rem)]`. 1280 미만은 지금처럼 1단 |
| 브랜드 룩북(`brand/page.tsx`) | 출처 줄 site, iframe 은 이미 전체 폭 | 변경은 헤더·탭이 넓어지는 것뿐. 사이드바 제거는 §5 별도 과제 |
| 승인신청·로그인 오류 | `max-w-md` 유지 | 폼은 좁은 게 맞다 |
| 편집기·회원 관리(`(app)`) | 범위 밖 | 이미 전체 화면 앱 |

### 3.4 슬라이드 상세 창(`SlideViewer`)
dialog 안 레이아웃은 이번 범위에서 손대지 않는다(이미 뷰포트 기준). 필요하면 후속.

## 4. 구현 순서와 검증

1. `globals.css` 에 토큰·유틸 추가, `Section` 에 `width` prop.
2. Nav·AiHeader·허브 페이지 컨테이너 교체(기계적 치환).
3. 갤러리 열 수(모션·슬라이드·프로젝트·저서·타임라인 소그리드).
4. 히어로 full-bleed 분리.
5. 모션 상세 2단.
6. 검증: `npm run typecheck -w web`, `npm run lint -w web`, `npm test`, e2e(`smoke`·`motion`·`slide`·`hub` 의 375px 가로 스크롤 검사가 그대로 통과해야 함). 1440·1920·2560 폭 스크린샷으로 육안 확인(Playwright `page.setViewportSize`).
7. e2e 추가: 1920 폭에서 모션 카드 한 줄 6개, 슬라이드 4개, 모션 상세가 2단(영상과 프롬프트 버튼의 `boundingBox().y` 가 겹침)인지.

모바일(≤1023px)은 클래스가 바뀌지 않으므로 지금과 같아야 한다 — 변경 전후 375·768 스크린샷 비교로 확인.

## 5. 함께 요청된 별도 과제 — 브랜드 룩북 사본의 사이드바 제거

- 요구: `/ai/brand/site/` 사본에서 오빠두엑셀 쪽 사이드바·제목은 숨기고 **필터와 콘텐츠만** 남긴다.
- 방법: 사본 파일은 고치지 않고, `lib/brand-site.ts` 가 `.html` 응답을 보낼 때 `</head>` 앞에 덮어쓰기 `<style>` 한 조각을 끼운다(사이드바·상단 제목 요소 `display:none`, 본문 영역 여백 0). 사본을 다시 import 해도 유지되고, 선택자만 바꾸면 된다.
- 막힌 점: 선택자를 정하려면 사본 `index.html`/`assets/shell.css` 의 구조를 봐야 하는데, 이 세션의 네트워크 정책이 `me.chois.pro`·`www.oppadu.com` 접속을 거부한다. 환경 설정의 Allowed domains 에 `me.chois.pro` 를 추가하거나, Mac 에서 `grep -o '<\(aside\|header\|nav\|main\|section\|div\|h1\)[^>]*\(id\|class\)="[^"]*"' index.html | head -60` 결과를 붙여 주면 바로 진행한다.
- 허락 문구 「(오빠두 엑셀의 허락을 받아 활용합니다.)」는 허브 소개문(`content/ko/ui.json` `ai.intro`)에 이미 추가됨(`ee33ba3`).
