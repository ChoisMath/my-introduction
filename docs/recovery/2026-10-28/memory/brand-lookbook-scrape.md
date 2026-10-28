---
name: brand-lookbook-scrape
description: "motion/brand/ = 오빠두 브랜드 룩북(디자인 시스템 갤러리 290개) 로컬 사본. 데이터는 공개 JSON, 회원 잠금은 화면만, 재생성 명령 (2026-10-13)"
metadata:
  node_type: memory
  type: project
  originSessionId: 9f684b4b-66e8-41d1-a7e4-aa951091618b
  modified: 2026-10-13T00:56:14.377Z
---

2026-10-13 사용자 요청으로 https://www.oppadu.com/ai/design-systems-site/ 를 `/Users/chois/dev/motion/brand/` 에 사본으로 만들었다(290 브랜드, 약 42 MB). 개인 참고용 — 공개 배포 금지([[motion-guide-project]], [[slide-gallery-scrape]] 와 같은 조건).

- 사용자가 "/brand 폴더"라고 했고 기존 `motion/brand/`(Chois 브리프·로고)가 있어 그 안에 함께 넣었다. 기존 파일은 건드리지 않음.
- 슬라이드 갤러리와 달리 **로그인 Chrome 이 필요 없다**: `tools/design-systems-site/data/{brands-index,hero/*,detail/*}.json` 이 전부 공개이고, 회원 전용 기능(프롬프트 복사·가이드 다운로드 = `detail.raw_markdown`)은 app.js 의 화면 잠금뿐. 로컬은 `OPD_DSG.member=true`.
- 재생성: `node brand/scripts/download.cjs && node brand/scripts/build.cjs`. 상세는 `brand/README.md`.

**Why:** 원본이 "주기적으로 업데이트"되므로 다시 받을 일이 생긴다.
**How to apply:** 갱신 요청 시 두 스크립트만 실행. 원본 페이지 구조(`.aih` 틀)가 바뀌면 build.cjs 가 에러를 낸다.
