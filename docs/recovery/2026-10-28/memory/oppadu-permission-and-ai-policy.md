---
name: oppadu-permission-and-ai-policy
description: "오빠두엑셀이 메일로 웹페이지 자료 전부를 출처 표기만 하면 써도 된다고 허락(2026-10-28). me.chois.pro/ai 반영 원칙 = 변형본 있으면 변형본, 없으면 원본+출처, 이후 순차 교체"
metadata:
  node_type: memory
  type: project
  originSessionId: fc9731ce-7122-4ed6-a8d3-2fda4b1a3031
  modified: 2026-10-28T08:01:39.514Z
---

2026-10-28 사용자: 오빠두엑셀과의 메일에서 oppadu.com/ai 의 **모든 웹페이지 자료(모션·슬라이드 프롬프트·예시 등)를 출처만 밝히고 사용해도 좋다**고 전달받음. 이전 메모리·PROJECT_MAP 의 "개인 참고용, 공개 배포 금지" 조건은 이 허락으로 대체된다(출처 표기는 필수).

- 사용자는 위캔두 멤버십 회원 — 전체 프롬프트·장면표·소리 큐는 로그인한 Chrome 에서만 받힌다(무료 로그인은 하루 1개).
- 2026-10-28 기준 원본 규모: 모션 106개(01–50 + 51–119 중 56개, 새 v2 프롬프트 형식 `{{#a}}`·`{{@hook}}`·`{{@len}}` 등, 길이 5–45초, 종류 kind_label), 슬라이드 748개.

**반영 원칙(사용자 확정):** 새로 변형한 것(Chois 렌더 모션, 학교용 슬라이드 덱)이 있는 항목은 변형본을 올리고, 없는 항목은 원본을 출처와 함께 올린다. 나중에 순차적으로 변형해 교체한다.

**Why:** 허락 범위 안에서 사이트를 빨리 채우고, 변형본은 시간이 걸리므로 점진 교체.
**How to apply:** 사이트 데이터에 항목별 출처 구분(변형본/원본)을 두고, 원본 항목에는 출처 링크를 표시. 관련: [[motion-guide-project]], [[slide-gallery-scrape]], [[motion-chapter-railway]]

**진행 상태(2026-10-28 저녁):** 로컬 추출 완료(motion `data/oppadu-v2/`·`media/oppadu/`, `slide/data/styles.json` 748 + 그림). 사이트 반영은 my_intoduction 브랜치 `feat/ai-oppadu-originals`(미커밋): 단위 테스트 172·tsc 통과, `.media-out` 준비됨(모션 318·슬라이드 12,937 파일, 원본 대조 일치). 막힌 것: Chois_SD2 APFS 손상(EILSEQ·ENOTEMPTY, node_modules 일부 파일 소실 → prisma·eslint·next dev 실행 불가) — 사용자 디스크 검사 후 `npm ci` → 화면 확인·e2e → 커밋 → Railway 로그인·Volume 확장(예상 ≈1.3 GB) → media:push. 깨진 폴더는 `my_intoduction/.media-broken/` 로 옮겨 둠.
