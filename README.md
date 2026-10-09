# my-introduction

최재혁 소개 페이지(`me.chois.pro`)와 모션그래픽 소개 영상. 설계: `docs/superpowers/specs/2026-10-09-my-introduction-design.md`, 계획: `docs/superpowers/plans/2026-10-09-my-introduction.md`.

## 구조

- `content/` — 약력·서비스·UI 문구(ko/en JSON)와 디자인 토큰. 웹과 영상이 함께 읽는 단일 소스.
- `web/` — Next.js 16 정적 사이트 (`/` 한국어, `/en/` 영어).
- `video/` — Remotion 소개 영상(82초)·히어로 루프(20초)·OG 이미지.
- `asset/` — 원본 이미지. 교체 방법은 `asset/README.md`.

## 명령

```bash
npm ci                      # 설치 (video postinstall 이 Pretendard 폰트를 복사)
npx playwright install chromium   # e2e 와 Remotion 렌더가 쓰는 브라우저
npm run assets              # asset/ → web/public/img, video/public/img
npm run dev                 # 웹 개발 서버
npm run video:studio        # Remotion 스튜디오
npm run render              # 영상 렌더 → web/public/video, web/public/img/og.png
npm run check               # 콘텐츠 검증 + 단위 테스트 + lint + 타입 검사
npm run build:web && npm run e2e   # 정적 빌드 후 Playwright 스모크
```

- 콘텐츠를 바꾸면 `content/ko/*.json` 과 `content/en/*.json` 을 함께 고친다. id 가 어긋나면 `npm run content:validate` 가 실패한다.
- 색·폰트는 `content/tokens.json` 만 수정한다. `web/src/app/tokens.css` 는 빌드 때 생성된다.
- Remotion 은 SD 카드에 내려받은 Chrome Headless Shell 로는 루트 로드가 멈추므로 `remotion.config.ts` 가 Playwright 의 Chromium 을 사용한다.
- 내레이션: `content/ko/narration.json` 대본 → `npm run narrate` 가 Qwen3-TTS(mlx-audio, `/Volumes/Chois_SD2/venvs/mlx-audio`)로 `video/public/narration/ko/*.wav` 와 `manifest.json`(클립 길이)을 만든다. 참조 음성 `video/narration/ref/chois.{wav,txt}`(Voicebox "Chois" 프로필)는 git 에 올리지 않는다. 씬 길이는 manifest 의 클립 길이로 계산되므로 대본을 바꾸면 narrate → render 순서로 돌린다.
- 배경음악 `video/public/audio/bgm.mp3` 는 CC0 트랙(출처·저작자는 `video/public/audio/README.md`). 바꾸려면 같은 경로에 두고 `npm run render`.

## 배포

`main` push → GitHub Actions(`.github/workflows/deploy.yml`) → GitHub Pages. 커스텀 도메인은 `web/public/CNAME`(`me.chois.pro`)이며 name.com DNS 에 `me CNAME choismath.github.io.` 가 필요하다. 영상·이미지 산출물은 CI 에서 만들지 않고 커밋한다.
