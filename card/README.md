# 명함 도안 (`card/`)

포산고등학교 수학교사 최재혁 명함. 앞면은 소속·이름·연락처·QR, 뒷면은 QR·사이트 주소·태그라인.
HTML/CSS 로 실치수 도안을 작성하고 Playwright Chromium 으로 벡터 PDF 를 만든다.

```bash
npm run card
```

## 산출물 (`card/print/`)

| 파일 | 용도 |
|---|---|
| `business-card.pdf` | **인쇄소 입고용.** 1p 앞면 / 2p 뒷면. 용지 90×56mm = 재단 86×52mm + 사방 2mm 재단 여백. 재단선 없음(인쇄소가 재단 여백 기준으로 자름) |
| `business-card-canva.pdf` | Canva 업로드용. 재단 여백 없는 86×52mm (Canva 가 자체 여백을 붙임) |
| `business-card-cropmarks.pdf` | 확인용. 재단선·재단선(분홍 점선)·안전선 3mm(청록 점선) 표시 |
| `front.png`, `back.png` | 확인용 300dpi 미리보기 (재단 여백 포함) |
| `layers/*.svg`, `layers/*.png` | 배경 레이어 분리본. 모눈(`grid`), 앞면 딥러닝 노드 그래프(`front-network`), 뒷면 그래프 좌하(`back-graph-left`)·우상(`back-graph-right`), 뒷면 수식 기호(`back-symbols`). 모두 재단 크기 86×52mm 캔버스에 제자리 배치, 투명 배경, PNG 600dpi. Canva 에서 페이지 크기에 맞춰 올리면 위치가 그대로 맞는다 |

## 수정하는 곳

- 문구·연락처·색: `template.mjs` 상단 `CARD`.
- 배치(mm 단위 절대 좌표)와 배경 그래프: `template.mjs` 의 CSS 와 `frontBackground` / `backBackground`.
- 학교 로고: `asset/포산고등학교교표.svg` (아웃라인 처리된 벡터).
- QR 내용: `CARD.url`. 빌드 시 `qrcode` 패키지로 다시 생성된다.

## 인쇄소 입고 시 참고

- 색상은 RGB 로 들어 있다. 인쇄소에서 CMYK 로 변환되며 남색(`#1D3C77`)이 약간 탁해질 수 있다.
- 폰트는 Pretendard 고정 굵기(TrueType) 로 서브셋 임베드되어 있어 별도 폰트 전달이 필요 없다.
- 본문 최소 글자 크기 5pt(영문 학교명), 한글 6pt 이상. 무광 코팅 용지에서 QR 인식이 더 안정적이다.
