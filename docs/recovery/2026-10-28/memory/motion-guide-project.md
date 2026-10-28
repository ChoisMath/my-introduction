---
name: motion-guide-project
description: motion 폴더 = 오빠두엑셀 모션 스타일 갤러리(회원 전용)를 로컬로 가져온 가이드 + Chois의 바이브코딩 채널용 재작성판. 출처·구조·저작권 제약·재생성 명령 (2026-10-11)
metadata:
  node_type: memory
  type: project
  originSessionId: 7ca4ce3a-4535-4f96-8f33-3d69d705d6c4
  modified: 2026-10-11T07:22:39.509Z
---

`/Users/chois/dev/motion` 은 2026-10-11 에 만든 **모션 그래픽 인트로 프롬프트 가이드**.

- **출처**: https://www.oppadu.com/ai/motion-styles/ (오빠두엑셀 회원 전용). 사용자가 로그인한 Chrome 에서 `window.GALLERY` 를 읽어 50개 스타일(프롬프트 영문/국문·장면표·소리 큐)을 `data/gallery.json` 에 저장. 영상은 공개 URL `…/_motion-styles-assets/v/<id>.mp4`(소리 포함, 상세용) 와 `c/<id>.mp4`(무음 카드용), 썸네일 `t/<id>.webp`. 효과음 mp3 는 `?oppadu_ms_audio=<id>&t=music|sfx&f=mp3`(쿠키 필요)로 아직 안 받음.
- **저작권**: 원본 자료는 회원 전용이라 **개인 참고용만**. 공개 배포 금지. 사용자가 개인용으로 확정함.
- **Chois 판**: 사용자가 원본은 두고 채널명 "Chois의 바이브코딩", 태그라인 "기초 바이브코딩부터 에이전틱 AI활용법 까지" 로 50개 전부 재작성 요청. 대상 문구는 "교사와 학생을 위한"(2026-10-11 "고등학생과 대학생을 위한"에서 변경, 주제 칸 영문은 "for teachers and students"). 기준 문서는 `brand/chois-brief.md`(채널 필드·픽셀 초상 로고·브랜드 5색·모티프 치환표·4단 성장 사다리 "바이브코딩 기초 → 프롬프트 설계 → 자동화·배포 → 에이전틱 AI"·이야기 뼈대). 10개 서브에이전트가 5개씩 작성 → `data/chois/<id>.json`, 검증 `scripts/validate-chois.cjs`, 병합·페이지 생성 `scripts/build-chois.cjs`.
- **페이지**: `index.html`(원본, 로컬 미디어) → `chois.html`/`chois-guide.html` 은 빌드 스크립트가 index.html 에 `window.MOTION_CONFIG` 를 끼워 생성하므로 **index.html 만 고치고 빌드로 전파**. 미리보기 서버는 `node scripts/serve.cjs 4173`(python http.server 는 SD 카드 cwd 권한 오류).

**Why:** 원본 데이터는 로그인 세션에서만 읽히고, 재작성판은 브리프 한 파일에서 파생되므로 프롬프트 톤을 바꾸려면 브리프를 먼저 고쳐야 일관성이 유지된다.

- **연출 기준(2026-10-11)**: 렌더 전 `brand/direction-standard.md` 비트 예산으로 50개 장면표·큐 시트를 재구성(7.0 클라이맥스, 6.8–7.0 정적, 8–10 홀드, 큐는 1/30초 격자). 검사 `scripts/audit-direction.cjs`. 프롬프트 §4 에 "director's intent" 문장 추가, 복사 시 「장면표·소리 큐 포함」(기본 켬)이면 §8·§9 표가 붙는다.

- **렌더(2026-10-11)**: 01–20번(1차 01–10, 2차 11–20)을 서브에이전트 10개가 HyperFrames 0.8.146 `/motion-graphics` 경로로 제작·렌더. 프로젝트 `videos/<id>/`, 결과 `media/chois/<id>.mp4`(10.0 s·1080p·오디오), 썸네일/미리보기는 `scripts/make-chois-media.cjs`(이 ffmpeg 은 WebP 인코더가 없어 JPG). 동시 렌더는 `-w 2` 로 충돌 없이 끝남. 사운드는 수치로만 검증, 귀로 듣지 않음. 03 에이전트 발견: getter/setter 프록시 클록 + `<audio>` 조합에서 CLI snapshot 이 무한 대기 → `onUpdate: () => draw(tl.time())` 로 해결.

**How to apply:** 프롬프트 수정 요청 → `brand/chois-brief.md` 갱신 후 해당 `data/chois/<id>.json` 수정 → validate → build. 영상을 새 프롬프트로 렌더하면 `media/chois/` 에 두고 build 스크립트의 MEDIA 경로를 바꾼다. 관련: [[channel-intro-decisions]], [[vibe-coding-class-project]]
