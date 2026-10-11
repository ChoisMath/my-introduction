---
workflow: motion-graphics
flow: automation
storyboard: no
message: "최재혁 — 수학교사 · 만드는 사람 (me.chois.pro)"
destination: site-video-prefix
aspect: 1920x1080
language: ko
length: 10s
angle: logo-reveal
---

## Intent

소개 영상(`web/public/video/intro-ko.mp4`, `intro-en.mp4`) 맨 앞에 붙는 10초 네오브루탈리즘 스팅.
거친 콘크리트 벽 위에 시끄러운 브루탈리스트 웹 페이지가 스스로 조립되다가, 로딩 바가 99%에서
멈추고(근접 무음) → 100% 클릭 → 픽토그램·이름·역할·URL 로크업으로 터지며 마지막 2초를 정지 홀드.

원 프롬프트("ChoisT 바이브 코딩" 유튜브 채널 인트로)에서 프로젝트에 맞게 바꾼 것:

| 프롬프트 | 이 프로젝트 | 근거 |
|---|---|---|
| 채널명 ChoisT 바이브 코딩 / 태그라인 기본기부터 풀스텍까지 | 최재혁 / 수학교사 · 만드는 사람 / me.chois.pro | `content/ko/ui.json` siteTitle, `web/public/CNAME` |
| 카드 기본기·파워쿼리·VBA·파워BI | 수학 수업 · AI 융합교육 · 서비스 개발 · 저서 | `profile.pillars` 3개 + 저서 섹션 |
| 직장인 업무 자동화 모티프(스프레드시트 수식) | 수식 입력창에 `f(x) = 수업 + 연수 + 개발` 타이핑 + 막대 그래프 스티커 | 수학교사 + 만드는 사람 세계관 |
| "첨부 로고" 5색 | `asset/최재혁_픽토그램.jpg` 픽셀아트 → 원본 PNG 그대로 사용, 브랜드 5색은 네이비·스카이·크림·오렌지·잉크 | `content/tokens.json` accent/darkAccent + 픽토그램 색 |
| 렌더 도구 | HyperFrames (프롬프트대로). 결과 mp4 를 `scripts/render-video.sh` 가 Remotion 본편 앞에 ffmpeg 로 이어 붙임 | 본편은 Remotion 유지 |
| 언어 | ko 기본, en 은 변수(`--variables`)로 라벨만 교체 | intro-en.mp4 도 존재 |

## Assets

- assets/pictogram.png — 픽셀아트 픽토그램(web/public/img/pictogram.png 복사본). 마지막 샷 로고.
- fonts/black-han-sans-*.woff2, fonts/archivo-black-*.woff2 — OFL. 한글 디스플레이 / 라틴 액센트.
- audio/soundtrack.wav — `audio/build-soundtrack.mjs` 가 코드로 합성 (48 kHz 16-bit, 외부 음원 없음).

## Customizations

- 단일 GSAP 타임라인, 시드 랜덤만, `index.html` 안의 `#cues` JSON 블록이 영상 큐와 오디오 큐의 단일 소스.
- 변수: name · role · url · card1–4 · formula · tape · run (en 렌더 시 덮어씀).

## Notes

- 피하기: 부드러운 그림자, 그라디언트, 둥근 모서리, 은은한 색, 미니멀 UI.
- 텍스트는 5% 세이프 에어리어 안. 마지막 2초(8.0–10.0s)는 로고·이름 정지 + 캐럿 깜빡임만.
- 음악 126 BPM 일렉트로 브레이크비트, 99% 스톨 구간(6.43–7.26s)은 근접 무음.
