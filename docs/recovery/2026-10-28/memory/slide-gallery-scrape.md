---
name: slide-gallery-scrape
description: "motion/slide/ = 오빠두 슬라이드 갤러리(회원 전용 프롬프트) 로컬 스크랩. 데이터 추출 방법(Chrome JS 출력 1000자 잘림 → 객체로 반환), 재생성 명령 (2026-10-12)"
metadata:
  node_type: memory
  type: project
  originSessionId: 33fcf87f-4968-4880-98ba-28522d9e6c48
  modified: 2026-10-12T14:09:03.166Z
---

2026-10-12 사용자 요청으로 https://www.oppadu.com/ai/slide-styles/ 를 `/Users/chois/dev/motion/slide/` 에 원본과 같은 디자인·동작으로 스크랩했다(150 스타일, 슬라이드 1,172장, 프롬프트 150개). 개인 참고용 — 공개 배포 금지([[motion-guide-project]] 와 같은 조건).

- 데이터: 로그인한 Chrome 의 `window.OPD_SLIDE_STYLES`. 손님 HTML(curl)에는 `prompt` 만 빠져 있고 나머지 메타·그림 URL은 공개.
- Chrome 확장 javascript_tool 은 한 줄짜리 긴 문자열을 ~1000자에서 자르지만 **객체(여러 줄 JSON)로 반환하면 수만 자도 잘리지 않는다** → `{id: prompt}` 맵을 2–3번에 나눠 받고, 브라우저 해시와 대조해 전사 오류 0 확인.
- https 페이지에서 127.0.0.1 로 fetch POST 는 실패(Local Network Access) — 로컬 수신 서버 방식은 쓰지 말 것.
- 재생성: `node slide/scripts/download-images.cjs && node slide/scripts/build.cjs`. 상세는 `slide/README.md`.

**Why:** 원본이 매주 갱신되므로 같은 방식으로 다시 받을 일이 생긴다.
**How to apply:** 갱신 요청 시 로그인 Chrome 에서 styles 를 객체로 읽어 `slide/data/styles.json` 교체 → 두 스크립트 실행.
