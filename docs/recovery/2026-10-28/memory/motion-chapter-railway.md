---
name: motion-chapter-railway
description: 모션 가이드를 자기소개 사이트(my_intoduction)의 챕터로 넣고 Railway(standalone+Volume)로 이전한 작업 — 공개 범위·영상 01–50 업로드·남은 배포 단계 (2026-10-12)
metadata:
  node_type: memory
  type: project
  originSessionId: 3c61b914-e03e-4978-a57d-4ea5d8d496c9
  modified: 2026-10-12T10:39:00.628Z
---

2026-10-12: `/Users/chois/dev/my_introduction` `main` 병합·push 완료(2026-10-12, CI check·docker 빌드 통과). 설계 `docs/superpowers/specs/2026-10-12-motion-chapter-railway-design.md`(§12 계획 단계 결정), 계획 `docs/superpowers/plans/2026-10-12-motion-chapter-railway.md`.

- 공개 범위(사용자 확정): **렌더 영상 + 이름·용도·컨셉만 공개**. 프롬프트·장면표·소리 큐는 Google 로그인(ADMIN_EMAILS) 관리자만, 데이터는 Railway Volume `private/motion-admin.json` 에만(git·빌드에 없음). 원본 오빠두 영상은 어디에도 올리지 않음.
- 영상 흐름: motion 폴더에서 렌더 → my_intoduction 에서 `npm run motion:import` → `media:prepare` → `MEDIA_PUSH_URL=… MEDIA_UPLOAD_TOKEN=… npm run media:push` (재배포 없이 즉시 반영).
- 배포 완료(2026-10-12): Railway 프로젝트 `me_chois` / 서비스 `my-introduction`, Volume `/data`, 커스텀 도메인 `me.chois.pro` 가 이미 Railway 를 가리킴. 환경변수 7개 설정됨(AUTH_SECRET·MEDIA_UPLOAD_TOKEN 은 사용자가 openssl 로 생성, `AUTH_URL=https://me.chois.pro` 는 필수 — 없으면 Auth.js 가 로그인 URL 을 `https://0.0.0.0:8080` 으로 만들어 브라우저가 HTTPS 오류를 냄). 영상 01–50 전부 업로드·재생 확인(2026-10-12, Volume 약 299 MB). CLI 링크는 사용자가 홈 폴더에 했던 것을 `my_intoduction` 폴더에도 연결함. 관리자 Google 로그인 확인 완료(OAuth 클라이언트 `Me_Chois`, Client ID 318764925465-…; 처음 다른 클라이언트 값을 넣어 redirect_uri_mismatch). 남은 일: GitHub Pages 끄기, railway.json → `.railway/railway.ts` 이전(2026-12-01 전).
- 업로드 토큰은 `railway variables --json` 에서 읽어 `MEDIA_PUSH_URL=https://me.chois.pro npm run media:push` 로 넘긴다(값을 출력하지 않음).

- 2026-10-12 열람자 기능: 사용자가 Volume JSON 대신 **Railway PostgreSQL + Prisma 7** 를 명시적으로 선택(비용·복잡도 설명 후). 관리자가 `/motion/admin/viewers/` 에서 Google 이메일 등록 → 그 계정은 로그인 후 관리자 화면 전체(프롬프트·장면표·소리 큐) 열람, 관리는 ADMIN_EMAILS 만. Railway 에 Postgres 서비스 추가·`DATABASE_URL=${{Postgres.DATABASE_URL}}` 설정 완료. PR ChoisMath/my-introduction#2(브랜치 feat/motion-viewers). 로컬 DB 는 `npx prisma dev -n motion-e2e --detach`(docker·postgres 없음).
- **Railway 는 이 서비스에 railway.json 을 적용하지 않는다**(배포 manifest configFile·preDeployCommand·healthcheckPath 가 null). 그래서 preDeploy 마이그레이션이 안 돌아 운영에서 P2021 → PR #3 으로 Dockerfile CMD 가 시작 시 migrate deploy. 배포 SUCCESS 만으로 마이그레이션 적용을 판단하지 말고 `railway logs -d` 에서 "Applying migration" 을 확인. `railway ssh` 원격 쓰기는 자동 권한 검사가 거부함.
- PR #4(2026-10-12 배포): 공개 `/motion/<id>/` 에 프롬프트 복사(영문·국문), 비로그인은 Google 전용 로그인 모달(「로그인하여 프롬프트를 복사하세요.」「로그인을 위한 아이디 등록은 최재혁T에게 문의하세요.」), AccessDenied 는 `/motion/signin-error/`.

**Why:** 회원 전용 자료 기반 2차 저작물이라 공개 범위를 좁혔다.
**How to apply:** 스타일을 다시 렌더하면 motion:import → media:prepare → media:push 만 하면 된다. 렌더 결과는 0.9/7.5/9.0 s 프레임을 직접 보고 끝 화면 글자를 가리는 펜·깃펜 등이 없는지 확인(21–30 에서 2건 재렌더). 관리자 화면(`/motion/admin/`)은 motion 폴더 index.html 과 같은 디자인으로 바꿈(c1d3883, push·배포 완료). 배포 질문은 railway-deploy-advisor. 관련: [[motion-guide-project]]

- 2026-10-12 PR #5 병합·배포: 모션 챕터가 AI활용 허브 `/ai/motion/` 로 이전(예전 `/motion/…` 308), `MotionViewer` → `Member`(PENDING·APPROVED) 마이그레이션 운영 적용 완료(기존 열람자 APPROVED, 이름은 이메일 앞부분 임시값). 교사는 `/ai/join/` 에서 신청, 관리자는 `/ai/admin/members/` 에서 승인·대기로 변경(등록 회원 삭제 불가). 새 분야 탭은 `web/src/lib/ai-tabs.ts` 한 항목 + `(hub)/<id>/` 라우트. 설계·계획: my_intoduction `docs/superpowers/{specs,plans}/2026-10-12-ai-hub-membership*`. 남은 확인: 기존 열람자 임시 이름 수정, 다른 Google 계정으로 신청→승인→대기 실사용.
