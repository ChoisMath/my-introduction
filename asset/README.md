# 원본 자산

| 파일 | 용도 | 상태 |
|---|---|---|
| 최재혁_증명사진.jpg | 타임라인·연락 섹션 사진 | 있음 (공개용 사진으로 교체 가능) |
| 최재혁_픽토그램.jpg | 히어로 보조 그래픽·파비콘·OG | 있음 |
| 지오지브라_중학교_수학_이미지.png 외 표지 2장 | 저서 섹션 | 있음 |
| projects/{id}.png (또는 jpg) | 서비스 목업 | **없음 — 자리표시 svg 사용 중** |

실물 목업을 넣으려면 `asset/projects/<id>.png` 로 저장하고 `npm run assets` 를 실행한 뒤,
`content/ko/projects.json` 과 `content/en/projects.json` 의 `mockup` 을 `/img/projects/<id>.webp` 로 바꾼다.
YouTube 소개 영상이 있으면 같은 항목에 `"youtubeId": "..."` 를 추가한다.

교보문고에서 저장한 `*.html`, `*_files/`, `*.zip` 은 git 에 올리지 않는다.
