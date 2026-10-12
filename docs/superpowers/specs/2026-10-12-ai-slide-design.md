# AI활용 「슬라이드 디자인」 탭 설계

- 날짜: 2026-10-12
- 대상 저장소: `/Volumes/Chois_SD2/dev/my_intoduction` (`web`·`content` 워크스페이스, Railway 서비스 `my-introduction`)
- 원천 폴더: `/Volumes/Chois_SD2/dev/motion/slide` (오빠두엑셀 슬라이드 스타일 갤러리 스크랩 — 150개 스타일·예시 1,172장·프롬프트 150개)
- 선행 작업: AI활용 허브·회원제(`2026-10-12-ai-hub-membership-design.md`), 모션 챕터(`2026-10-12-motion-chapter-railway-design.md`)

## 1. 목적

AI활용 허브에 「슬라이드 디자인」 탭(`/ai/slide/`)을 추가한다. 원천 갤러리의 페이지 레이아웃과 동작은 그대로 옮긴다. 예시 슬라이드는 사회초년생·직장인 주제에서 **학교 현장 주제**로 스토리를 다시 짜서, 디자인 느낌은 유지한 채 새로 생성한다.

### 성공 기준

- `/ai/slide/` 에서 분류 칩, 정렬, 표지/본문 전환, 카드 호버, 상세 창(넘기기·썸네일 줄·스타일 이동·전체 화면·`#번호` 바로 열기)이 원천 갤러리와 같게 동작한다.
- 1차로 분류마다 대표 스타일 1개씩, 모두 7개 덱이 학교 주제로 생성되어 운영 사이트에 보인다.
- 프롬프트는 관리자·승인 회원 응답에만 실린다. 비로그인·대기·guest 의 HTML 에는 프롬프트가 0건이다.
- 덱을 나중에 150개로 늘려도 git 저장소와 빌드 크기가 늘지 않는다(그림은 Volume).

### 확정된 결정 (사용자 답변)

| 항목 | 결정 |
|---|---|
| 권리 | 원천 측(오빠두)과 별도 협의 후 회원을 받는다. 레이아웃·동작은 동일하게 하고, **코드와 문구는 새로 작성**한다 |
| 프롬프트 | 디자인 프롬프트는 크게 바꾸지 않는다. 직장인 인물처럼 학교와 맞지 않는 표현만 학생·교사로 바꾼다 |
| 슬라이드 내용 | 스토리를 학교 현장에 맞게 재구성한다. 원고는 Claude 가 초안을 쓰고 사용자와 함께 다듬는다 |
| 1차 범위 | 분류별 인기순 1위 1개씩, 모두 7개 덱 |
| 덱 주제 | 스타일마다 다른 학교 주제(§5) |
| 학교 이름 | 가상 이름 「○○고등학교」 |
| 탭 이름·주소 | 「슬라이드 디자인」, `/ai/slide/` |

### 범위 밖 (YAGNI)

- 원천 갤러리의 복사 수 집계와 그에 따른 인기순 갱신. 인기순은 원천 배열 순서로 고정한다.
- 나머지 143개 스타일(1차 결과를 보고 따로 진행).
- 관리자용 슬라이드 프롬프트 편집 화면. 프롬프트는 원천 폴더에서 고치고 업로드한다.
- 홈 `#ai` 섹션에 슬라이드 카드 노출(탭만 추가하면 허브 탭 줄에는 자동으로 나타난다).

## 2. 화면

### 2.1 위치

- `AI_TABS`(`web/src/lib/ai-tabs.ts`)에 `{ id: 'slide', label: { ko: '슬라이드 디자인', en: 'Slide design' }, href: AI_SLIDE }` 를 추가한다. `AI_SLIDE = '/ai/slide/'` 는 `ai-paths.ts` 에 둔다.
- 라우트: `web/src/app/(ko)/ai/(hub)/slide/page.tsx` (서버 컴포넌트, `force-dynamic` — Volume manifest 와 권한을 요청마다 읽는다).
- 원천의 왼쪽 메뉴(`aih-side`)·모바일 메뉴·경로 표시줄은 허브의 `AiHeader` + 탭이 대신한다. 그 아래 본문(제목·설명·거르기 막대·카드 격자·상세 창)을 원천과 같은 배치로 둔다.

### 2.2 목록

| 요소 | 동작 |
|---|---|
| 분류 칩 | 전체 + 7개 분류(업무·보고, 손그림·종이, 일러스트·만화, 입체·3D, 포스터·타이포, 어두운 테크, 사진·잡지). 해당 스타일이 없는 분류 칩은 숨긴다 |
| 정렬 메뉴 | 인기순(원천 배열 순서) · 번호순 · 최신순(`added`) |
| 표지/본문 | 목록 전체 카드를 표지 장(`cover`) 또는 본문 장(`body`)으로 바꾼다 |
| 카드 | 16:9 그림 + 번호·이름·분류. 마우스를 올리면 반대쪽 장(표지↔본문)을 보여 준다. 터치 기기는 탭하면 상세 창 |
| 상태 보존 | 분류·정렬·표지/본문은 `?f=&s=&v=` 쿼리로 둔다(모션 갤러리의 `?g=` 와 같은 방식) |

7개뿐이라 원천의 나눠 불러오기(무한 스크롤)는 만들지 않는다. 150개로 늘릴 때 다시 판단한다.

### 2.3 상세 창 (`<dialog>`)

- 왼쪽 무대: 큰 그림(1376×768), 그림 위 좌우 넘김 단추, 아래 썸네일 줄과 「n / N」, 전체 화면 단추.
- 오른쪽 패널: 스타일 이전/다음과 「k / 7」, 닫기, 분류, 이름, 생김새 설명, 「이럴 때 좋아요」, 「스타일 프롬프트」 칸, 「프롬프트 복사」.
- 키보드: `←` `→` 장 넘김(마지막 장 다음은 다음 스타일 첫 장), `Esc` 닫기. 좌우 밀기도 같은 동작.
- 주소 `#24` 로 들어오면 그 스타일 상세 창을 바로 연다. 창을 열고 닫을 때 해시를 바꾼다(`history.replaceState`).
- 전체 화면: Fullscreen API 로 무대만 띄운다. 전체 화면에서도 넘김이 다음 스타일까지 이어진다.
- 프롬프트 칸
  - allowed(관리자·승인 회원): 영문 프롬프트를 보여 주고 복사한다.
  - 그 외: 잠긴 칸을 보여 준다. 복사를 누르면 모션의 `PromptCopy` 와 같은 로그인/가입 안내 모달을 띄운다(`SignInDialog` 재사용).

### 2.4 구현 원칙

- 원천의 `app.js`·`slide-styles.css`·`hub.css` 는 복사하지 않는다. React(`'use client'` 는 갤러리·상세 창 컴포넌트만) + Tailwind 4 + 사이트 토큰(`globals.css` `@theme`)으로 새로 작성한다.
- 컴포넌트: `web/src/components/slide-gallery/` 아래 `SlideGallery`(막대·격자), `SlideCard`, `SlideViewer`(상세 창), `SlidePrompt`(프롬프트 칸·복사).
- 반응형 규칙(`~/.claude/rules/responsive-ui.md`): 모바일 바깥 여백 최소, 칩·단추 라벨 `whitespace-nowrap`, 칩 줄은 가로 스크롤, 터치 타겟 44px, 호버 전용 기능 없음(호버는 미리보기일 뿐, 탭으로 상세 창), 상세 창은 모바일에서 무대 위·패널 아래 세로 배치, 높이는 `dvh`.

## 3. 데이터와 권한

### 3.1 공개 데이터 — `content/slide/`

`content/slide/schema.ts` + `public.json`(커밋), `content/index.ts` 에서 export.

```ts
export const SLIDE_FAMILIES = [
  { key: 'work', label: '업무·보고' }, { key: 'hand', label: '손그림·종이' },
  { key: 'toon', label: '일러스트·만화' }, { key: 'solid', label: '입체·3D' },
  { key: 'poster', label: '포스터·타이포' }, { key: 'dark', label: '어두운 테크' },
  { key: 'photo', label: '사진·잡지' },
] as const;

slidePublicSchema = z.object({
  id: z.string().regex(/^\d{2,3}$/),   // 원천 번호 그대로('04', '24', '135')
  no: z.number().int().min(1),
  family: z.enum(familyKeys),
  name: z.string().min(1),             // 새로 쓴 이름
  look: z.string().min(1),             // 새로 쓴 생김새 설명
  use: z.string().min(1),              // 학교 용도로 새로 쓴 문구
  topic: z.string().min(1),            // 예시 덱의 학교 주제(상세 창에 표시)
  slides: z.number().int().min(1).max(12),
  cover: z.number().int().min(1),
  body: z.number().int().min(1),
  added: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict();
```

- `.strict()` — `prompt` 가 섞이면 파싱이 실패한다(모션과 같은 안전장치).
- 배열 순서 = 인기순. `cover`·`body` 는 `slides` 이하인지 `superRefine` 으로 검사한다.
- 화면에는 manifest 에 그림이 모두 있는 스타일만 나온다(`getRenderedSlides()`, 모션의 `getRenderedMotions` 와 같은 방식).

### 3.2 프롬프트 — Volume `private/slide-admin.json`

- 형식: `[{ id, prompt }]`, `slideAdminSchema` 로 검사한다. git·빌드 산출물·공개 HTML 어디에도 넣지 않는다.
- `access.ts` 에 `getSlidePromptAccess()` 를 추가한다. allowed 일 때만 파일을 읽어 `Record<id, prompt>` 를 돌려주고, 아니면 상태(`signedOut`·`pending`·`guest`·`unavailable`)만 돌려준다. 페이지가 이 결과를 `SlideGallery` props 로 넘긴다.
- 갤러리가 한 페이지 안의 상세 창이라서 공개 상세 라우트가 따로 없다. 그래서 권한 판정은 목록 페이지 요청에서 한 번 한다.

## 4. 그림 저장과 업로드

### 4.1 Volume 구조

```
media/slide/<id>/<k>.webp      # 큰 그림 1376×768 (k = 1..slides)
media/slide/<id>/s/<k>.webp    # 썸네일 줄 (높이 96 기준)
media/slide/<id>/t/<k>.webp    # 목록 카드 760×424 — 표지·본문 장만
media/slide/manifest.json      # 경로 → {size, sha256, updatedAt}
private/slide-admin.json
```

- `volume.ts`: `SERVABLE` 에 `^media\/slide\/\d{2,3}\/(?:[st]\/)?\d{1,2}\.webp$` 를 더한다. `isUploadablePath` 는 slide manifest·admin 파일도 허용한다. `private/` 는 여전히 서빙하지 않는다.
- manifest 는 모션과 분리한다(`media/slide/manifest.json`). 그림 URL 은 `?v=<sha256 앞 8자>` 캐시 키를 붙인다.
- `/api/media/manifest` 는 `?set=slide` 로 slide manifest 를 돌려준다(기본값 motion, 토큰 인증은 그대로).

### 4.2 스크립트

| 명령 | 내용 |
|---|---|
| `npm run slide:import` (`scripts/slide-import.ts`) | 원천 폴더 `school/manifest.json`(§5.2)을 읽어 `content/slide/public.json` 을 쓰고, `school/<id>/deck.pdf` 를 장마다 PNG 로 래스터화(`pdftoppm`)한 뒤 `cwebp` 로 큰 그림·썸네일·카드 3종을 `.media-out/media/slide/` 에 만든다. 프롬프트는 `.media-out/private/slide-admin.json` 으로 낸다. 원본 PDF 의 sha256 이 같으면 건너뛴다 |
| `npm run media:push` | `--set slide` 인자를 받아 slide manifest 기준으로 바뀐 파일만 올린다. 인자가 없으면 지금처럼 motion |

## 5. 덱 제작

### 5.1 1차 7개 덱

| id | 스타일 | 분류 | 학교 주제(대상) | 8장 흐름 | 프롬프트 변경 |
|---|---|---|---|---|---|
| 24 | 스케치노트 | hand | 공부 잘하는 뇌의 비밀: 인출·분산·교차 학습 (학생) | 표지 → 망각곡선 → 3가지 전략 구조도 → 인출 → 분산 → 교차 → 하루 루틴 → 1장 요약 | 없음 |
| 59 | 패션 매거진 에디토리얼 | photo | 고교학점제 과목 선택 트렌드북 (고1) | 매거진 표지 → 에디터 노트 → 진로별 과목 조합 룩북(3장) → 선택 체크리스트 → 선배 인터뷰 → 1장 요약 | `cutout fashion photography` → `cutout student portrait photography` |
| 55 | 아르데코 | poster | ○○고등학교 학년말 시상식 · 올해의 학급 (전교) | 초대장 표지 → 식순 → 부문별 시상(3장) → 올해의 기록 숫자 → 감사 인사 → 마무리 | 없음 |
| 04 | 일본 종이 만화책 | toon | AI 과제, 어디까지 괜찮을까? 디지털 시민성 (학생) | 과제 마감 전날 → 생성형 AI 사용 → 출처·표절 문제 → 선생님 상담 → 올바른 사용 3원칙 → 다시 쓴 과제 → 정리 | `office worker character` → `Korean high school student characters in uniform` |
| 58 | 스포츠 중계 그래픽 | dark | ○○고등학교 체육대회 학급 대항전 중계 (전교) | 오프닝 → 대진표 → 종목별 스코어보드(3장) → MVP 스탯 → 최종 순위 → 클로징 | `high-energy action photography` → `high-energy high school sports day action photography` |
| 10 | 클레이 애니메이션 | solid | 신입생 학교생활 첫걸음 안내 (신입생) | 환영 → 하루 시간표 → 학교 지도 → 급식 → 동아리 → 도움 받는 곳 → 첫 달 체크리스트 → 요약 | `cute office worker figurine` → `cute high school student figurine` |
| 63 | 한국형 개조식 보고서 | work | 고교학점제·성취평가 운영 계획 교직원 브리핑 (교사) | 핵심 요약 박스 → 추진 배경 → 변경 사항 표 → 학년별 일정 → 평가 운영 → 협조 사항 → 문의 → 요약 | 없음 |

- 학교·인물·수치는 모두 가상이다. 제도 설명(고교학점제·성취평가)은 공개된 교육부 기준과 어긋나지 않게 쓰고, 불확실한 수치는 넣지 않는다.
- 이름·생김새·용도 문구(`name`·`look`·`use`)는 원천 문구를 쓰지 않고 새로 쓴다.

### 5.2 원천 폴더 구조 (저장소 밖)

```
/Volumes/Chois_SD2/dev/motion/slide/school/
├── manifest.json            # [{id, family, name, look, use, topic, cover, body, added}] — 공개 데이터 원본, 순서 = 인기순
└── <id>/
    ├── source.md            # 학교 주제 원고(NotebookLM 소스)
    ├── prompt.txt           # 스타일 프롬프트(학교용 수정본)
    ├── instructions.txt     # slide-deck 생성 지시문(프롬프트 + "8장, 한국어, ○○고등학교" 등)
    └── deck.pdf             # 확정된 NotebookLM 결과
```

### 5.3 덱 하나 만드는 순서

1. Claude 가 `source.md` 초안을 쓰고 사용자와 다듬는다.
2. `notebooklm create` → `source add source.md` → `generate slide-deck --prompt-file instructions.txt --language ko --wait`.
3. `download slide-deck deck.pdf` → 장별 미리보기를 사용자에게 보여 준다.
4. 고칠 장은 `generate revise-slide` 로 다시 만들고, 덱 전체가 어긋나면 지시문을 고쳐 다시 생성한다.
5. 사용자가 확정하면 `slide:import` → 로컬 확인 → `media:push --set slide`.

NotebookLM 결과의 우하단 워터마크는 원천 예시와 같으므로 그대로 둔다. 장 수가 8장이 아니면 실제 장 수를 `slides` 로 쓴다.

## 6. 테스트

| 종류 | 내용 |
|---|---|
| vitest | `slidePublicSchema`(strict·cover/body 범위·중복 id), `isServablePath`(slide 경로 허용, `private/`·상위 경로·다른 확장자 거부), `AI_TABS`·`activeTabId('/ai/slide/')`, `renderedSlides`(manifest 에 빠진 장이 있으면 그 스타일 제외), 정렬·분류 거르기 순수 함수 |
| Playwright `slide.spec.ts` | 카드 7개, 분류 칩 거르기, 정렬, 표지/본문 전환, 상세 창 열기·`→` 로 마지막 장 다음 스타일 이동·`Esc`, `/ai/slide/#24` 바로 열기, 모바일 뷰포트 가로 스크롤 없음 |
| Playwright 보안 | `security.spec.ts`·`prompt-copy.spec.ts` 확장 — 비로그인·pending·guest 의 `/ai/slide/` HTML 에 프롬프트 마커 0건, 승인 회원은 복사 가능, `/media/private/slide-admin.json` 404 |
| e2e 픽스처 | `scripts/e2e-fixture.ts` 가 `web/e2e/.volume/media/slide/` 에 작은 webp 와 manifest, `private/slide-admin.json`(마커 포함)을 만든다 |

UI 변경 후 `responsive-ui-reviewer`, 구조 변경 후 `project-map-updater` 를 실행한다.

## 7. 진행 순서

1. 원고 7개 초안 작성 → 사용자와 다듬기
2. 덱 1개(24 스케치노트)로 생성 → PDF → webp 파이프라인 확인
3. 웹 탭 구현(데이터·서빙·화면·테스트)
4. 나머지 6개 덱 생성·검수
5. 운영 업로드(`media:push --set slide`)와 배포, 운영 확인(카드 7개, 프롬프트 비노출, 그림 200)

## 8. 위험과 대응

| 위험 | 대응 |
|---|---|
| NotebookLM 이 스타일을 덜 따르거나 장 수가 달라짐 | 지시문에 장 수·구성을 명시하고, 결과를 원천 예시와 나란히 비교해 다시 생성. 장 수는 실제 값을 쓴다 |
| NotebookLM 생성 한도 | 덱 단위로 하루에 나눠 생성. `--retry` 사용 |
| 슬라이드 속 한글 오탈자·사실 오류 | 장별 미리보기 검수 단계에서 사용자 확인 후 `revise-slide` |
| 프롬프트 유출 | strict 스키마 + Volume `private/` 비서빙 + 보안 e2e |
| 원천 권리 | 사용자가 원천 측과 협의한다. 사이트에는 원천 코드·문구·이미지를 싣지 않는다 |
