---
name: feedback-no-mobile-file
description: 사용자는 이제 노트북으로 가이드를 보므로 모바일용 독립형 HTML(chois-guide.html 등)을 매번 SendUserFile 로 보내지 않는다 (2026-10-11)
metadata:
  node_type: memory
  type: feedback
  originSessionId: 7ca4ce3a-4535-4f96-8f33-3d69d705d6c4
  modified: 2026-10-11T08:23:00.571Z
---

2026-10-11 사용자: "이제 노트북으로 봅니다. 모바일용을 보내지 않으셔도 됩니다."

**Why:** 같은 파일을 반복 전송하면 카드만 쌓이고, 노트북에서는 로컬 서버(`node scripts/serve.cjs 4173`)로 `chois.html` 을 직접 연다.

**How to apply:** `scripts/build-chois.cjs` 는 계속 `chois-guide.html` 도 생성하되, 결과 전달 시 파일을 보내지 말고 `http://127.0.0.1:4173/chois.html` 경로와 변경 사항만 알린다. 사용자가 다시 요청하면 보낸다. 관련: [[motion-guide-project]]
