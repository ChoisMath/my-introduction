# my-introduction

최재혁 소개 페이지(`me.chois.pro`)와 모션그래픽 소개 영상. 설계: `docs/superpowers/specs/2026-10-09-my-introduction-design.md`.

- `npm ci` → `npm run assets` → `npm run dev` (웹) / `npm run video:studio` (영상)
- `npm run check` : 콘텐츠 검증 + 단위 테스트 + lint + 타입 검사
- `npm run render` : 영상 렌더링 후 `web/public/video/` 로 복사
- 배포: `main` push → GitHub Actions → GitHub Pages
