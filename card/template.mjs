// 명함 도안. 길이 단위는 전부 mm. 트림(재단선) 86×52, 사방 2mm 재단 여백, 안전선 3mm.
export const CARD = {
  trim: { w: 86, h: 52 },
  bleed: 2,
  safe: 3,
  url: 'https://me.chois.pro',
  urlLabel: 'me.chois.pro',
  school: { ko: '포산고등학교', en: 'POSAN HIGH SCHOOL' },
  name: '최재혁',
  role: '수학교사 · 2학년 담임교사',
  contacts: [
    ['연락처', '010-5187-7235'],
    ['이메일', 'complete0037@gmail.com'],
    ['웹사이트', 'me.chois.pro'],
  ],
  back: {
    caption: '수학교사 최재혁의 웹페이지 바로가기',
    tagline: '일은 쉽게 · 동료는 편하게 · (앱과 도구를) 만드는 사람.',
  },
  // content/tokens.json 과 같은 팔레트
  color: {
    fg: '#0F172A',
    muted: '#475569',
    accent: '#1D3C77',
    grid: '#EEF2F8',
    axis: '#7C8DB0',
    curve: '#5B6E99',
    faint: '#C5CFE0',
    qr: '#0F172A',
  },
};

const PAGE_W = CARD.trim.w + CARD.bleed * 2; // 90
const PAGE_H = CARD.trim.h + CARD.bleed * 2; // 56
const MARK_MARGIN = 6;

function gridLines(x0, x1, y0, y1, step, color) {
  const lines = [];
  for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) {
    lines.push(`M${x} ${y0}V${y1}`);
  }
  for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
    lines.push(`M${x0} ${y}H${x1}`);
  }
  return `<path d="${lines.join('')}" stroke="${color}" stroke-width="0.12" fill="none"/>`;
}

function axes({ ox, oy, left, right, top, bottom }) {
  const c = CARD.color.axis;
  const ticks = [];
  for (let x = ox - 6; x >= left + 2; x -= 6) ticks.push(`M${x} ${oy - 0.6}V${oy + 0.6}`);
  for (let x = ox + 6; x <= right - 2; x += 6) ticks.push(`M${x} ${oy - 0.6}V${oy + 0.6}`);
  for (let y = oy - 6; y >= top + 2; y -= 6) ticks.push(`M${ox - 0.6} ${y}H${ox + 0.6}`);
  for (let y = oy + 6; y <= bottom - 2; y += 6) ticks.push(`M${ox - 0.6} ${y}H${ox + 0.6}`);
  return `
    <path d="M${left} ${oy}H${right} M${ox} ${bottom}V${top}" stroke="${c}" stroke-width="0.25" fill="none" stroke-linecap="round"/>
    <path d="M${right - 1.6} ${oy - 1}L${right} ${oy}L${right - 1.6} ${oy + 1} M${ox - 1} ${top + 1.6}L${ox} ${top}L${ox + 1} ${top + 1.6}" stroke="${c}" stroke-width="0.25" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${ticks.join('')}" stroke="${c}" stroke-width="0.2" fill="none"/>`;
}

// 딥러닝 노드 그래프 (수학 + AI 도구 상징). 좌표는 재단 여백 포함 페이지(90×56) 기준.
function neuralNetwork() {
  const { accent, axis, faint } = CARD.color;
  const layerXs = [51, 62.5, 74, 85.5];
  const counts = [3, 5, 5, 2];
  const centerY = 21;
  const gap = 5.4;
  const r = 1.55;
  const nodes = counts.map((n, li) =>
    Array.from({ length: n }, (_, i) => ({ x: layerXs[li], y: centerY + (i - (n - 1) / 2) * gap })),
  );
  // 결정적 의사난수로 연결선 농도를 다르게 해 '학습된 가중치' 느낌
  const weight = (a, b, c) => ((Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453) % 1 + 1) % 1;
  const highlighted = new Set(['0-1-1-2', '1-2-2-3', '2-3-3-0']);
  const edges = [];
  for (let li = 0; li < nodes.length - 1; li++) {
    nodes[li].forEach((a, i) => nodes[li + 1].forEach((b, j) => {
      const key = `${li}-${i}-${li + 1}-${j}`;
      const w = weight(li, i, j);
      const strong = highlighted.has(key);
      edges.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${strong ? accent : axis}" stroke-width="${strong ? 0.42 : 0.14 + w * 0.14}" stroke-opacity="${strong ? 1 : (0.35 + w * 0.45).toFixed(2)}"/>`);
    }));
  }
  const circles = nodes.flatMap((layer, li) => layer.map((n, i) => {
    const isIo = li === 0 || li === nodes.length - 1;
    const onPath = ['0-1', '1-2', '2-3', '3-0'].includes(`${li}-${i}`);
    const fill = onPath ? accent : isIo ? '#fff' : '#fff';
    return `<circle cx="${n.x}" cy="${n.y}" r="${r}" fill="${fill}" stroke="${onPath ? accent : isIo ? accent : axis}" stroke-width="${isIo || onPath ? 0.35 : 0.28}"/>`;
  }));
  const dots = Array.from({ length: 3 }, (_, i) => `<circle cx="${layerXs[0] - 4.5}" cy="${centerY - 2 + i * 2}" r="0.35" fill="${faint}"/>`);
  return `<g stroke-linecap="round">${edges.join('')}${circles.join('')}${dots.join('')}</g>`;
}

// 배경 레이어. 좌표는 재단 여백 포함 페이지(90×56) 기준.
export function backgroundLayers() {
  const { curve, faint, grid } = CARD.color;
  return {
    grid: gridLines(0, PAGE_W, 0, PAGE_H, 3, grid),
    frontNetwork: neuralNetwork(),
    backGraphLeft: `
    ${axes({ ox: 12, oy: 47, left: 1, right: 23, top: 29, bottom: 55 })}
    <path d="M3 35 Q 12 63 21 35" stroke="${curve}" stroke-width="0.3" fill="none" stroke-linecap="round"/>`,
    backGraphRight: `
    ${axes({ ox: 74, oy: 14, left: 56, right: 89, top: 1, bottom: 32 })}
    <path d="M57 18 C 63 2, 69 28, 75 10 S 84 20, 89 8" stroke="${curve}" stroke-width="0.3" fill="none" stroke-linecap="round"/>`,
    backSymbols: `
    <g fill="${faint}" font-family="Pretendard" font-weight="400" font-size="3.2">
      <text x="6" y="12">∑</text>
      <text x="5" y="22">x²</text>
      <text x="82" y="40">∫</text>
      <text x="83" y="28">π</text>
      <text x="78" y="51">√2</text>
    </g>`,
  };
}

function backgroundSvg(...parts) {
  return `<svg class="bg" viewBox="0 0 ${PAGE_W} ${PAGE_H}" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
}

function frontBackground() {
  const l = backgroundLayers();
  return backgroundSvg(l.grid, l.frontNetwork);
}

function backBackground() {
  const l = backgroundLayers();
  return backgroundSvg(l.grid, l.backGraphLeft, l.backGraphRight, l.backSymbols);
}

// 레이어 하나를 재단 크기(86×52) 캔버스의 독립 SVG 로. Canva 등에서 페이지 크기에 맞춰 올리면 위치가 그대로 맞는다.
export function layerSvg(markup, { withBleed = false } = {}) {
  const b = withBleed ? 0 : CARD.bleed;
  const w = withBleed ? PAGE_W : CARD.trim.w;
  const h = withBleed ? PAGE_H : CARD.trim.h;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="${b} ${b} ${w} ${h}">${markup}</svg>`;
}

function fitSvg(svg) {
  return svg
    .replace(/^<\?xml[^>]*>\s*/, '')
    .replace(/<svg([^>]*)>/, (m, attrs) => {
      const cleaned = attrs.replace(/\s(width|height)="[^"]*"/g, '');
      return `<svg${cleaned} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`;
    });
}

function cropMarks() {
  const m = MARK_MARGIN;
  const b = CARD.bleed;
  const tx0 = m + b;
  const tx1 = m + b + CARD.trim.w;
  const ty0 = m + b;
  const ty1 = m + b + CARD.trim.h;
  const gap = b + 1;
  const len = m - gap;
  const W = PAGE_W + m * 2;
  const H = PAGE_H + m * 2;
  const s = CARD.safe;
  return `<svg class="marks" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 ${ty0}H${len} M${W - len} ${ty0}H${W} M0 ${ty1}H${len} M${W - len} ${ty1}H${W}
             M${tx0} 0V${len} M${tx0} ${H - len}V${H} M${tx1} 0V${len} M${tx1} ${H - len}V${H}"
          stroke="#000" stroke-width="0.1" fill="none"/>
    <rect x="${tx0}" y="${ty0}" width="${CARD.trim.w}" height="${CARD.trim.h}" stroke="#E0007A" stroke-width="0.1" stroke-dasharray="1 0.6" fill="none"/>
    <rect x="${tx0 + s}" y="${ty0 + s}" width="${CARD.trim.w - s * 2}" height="${CARD.trim.h - s * 2}" stroke="#00A3C4" stroke-width="0.1" stroke-dasharray="0.6 0.6" fill="none"/>
    <text x="${m}" y="${H - 1.8}" font-family="Pretendard" font-size="2.2" fill="#555">재단 ${CARD.trim.w}×${CARD.trim.h}mm · 재단 여백 ${b}mm(용지 ${PAGE_W}×${PAGE_H}mm) · 분홍 점선 = 재단선 · 청록 점선 = 안전선 ${s}mm</text>
  </svg>`;
}

function frontContent({ logoSvg, qrSvg }) {
  const [phone, email, site] = CARD.contacts;
  return `
    <div class="logo">${fitSvg(logoSvg)}</div>
    <div class="school-ko">${CARD.school.ko}</div>
    <div class="school-en">${CARD.school.en}</div>
    <div class="name">${CARD.name}</div>
    <div class="role">${CARD.role}</div>
    <dl class="contacts">
      <div><dt>${phone[0]}</dt><dd>${phone[1]}</dd></div>
      <div><dt>${email[0]}</dt><dd>${email[1]}</dd></div>
      <div><dt>${site[0]}</dt><dd>${site[1]}</dd></div>
    </dl>
    <div class="qr qr-front">${qrSvg}</div>`;
}

function backContent({ qrSvg }) {
  return `
    <div class="qr qr-back">${qrSvg}</div>
    <div class="back-caption">${CARD.back.caption}</div>
    <div class="back-url">${CARD.urlLabel}</div>
    <div class="back-tagline">${CARD.back.tagline}</div>`;
}

export function renderCardHtml({ fontUrls, logoSvg, qrSvg, variant }) {
  const fontFaces = Object.entries(fontUrls)
    .map(([weight, url]) => `@font-face { font-family: 'Pretendard'; src: url('${url}') format('woff2'); font-weight: ${weight}; }`)
    .join('\n    ');
  const withMarks = variant === 'marks';
  // trim: 재단 여백 없이 실제 명함 크기 페이지 (Canva 등 자체 여백을 붙이는 도구용)
  const margin = withMarks ? MARK_MARGIN : variant === 'trim' ? -CARD.bleed : 0;
  const pageW = PAGE_W + margin * 2;
  const pageH = PAGE_H + margin * 2;
  const c = CARD.color;

  const css = `
    ${fontFaces}
    @page { size: ${pageW}mm ${pageH}mm; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; }
    body {
      font-family: 'Pretendard', sans-serif;
      color: ${c.fg};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      -webkit-font-smoothing: antialiased;
      text-rendering: geometricPrecision;
    }
    .page {
      position: relative;
      width: ${pageW}mm;
      height: ${pageH}mm;
      overflow: hidden;
      break-after: page;
    }
    .page:last-child { break-after: auto; }
    .marks { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
    .bleed {
      position: absolute;
      left: ${margin}mm;
      top: ${margin}mm;
      width: ${PAGE_W}mm;
      height: ${PAGE_H}mm;
      background: #fff;
      overflow: hidden;
    }
    .bg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .trim {
      position: absolute;
      left: ${CARD.bleed}mm;
      top: ${CARD.bleed}mm;
      width: ${CARD.trim.w}mm;
      height: ${CARD.trim.h}mm;
    }
    .trim > * { position: absolute; white-space: nowrap; }

    .logo { left: 4.6mm; top: 4.4mm; width: 9.6mm; height: 9.6mm; }
    .school-ko {
      left: 15.6mm; top: 4.6mm;
      font-size: 10pt; font-weight: 700; letter-spacing: 0.03em; line-height: 1.2;
    }
    .school-en {
      left: 15.8mm; top: 9.5mm;
      font-size: 5pt; font-weight: 500; letter-spacing: 0.16em; color: ${c.muted}; line-height: 1.2;
    }
    .name {
      left: 4.4mm; top: 19.2mm;
      font-size: 18.5pt; font-weight: 800; letter-spacing: 0.24em; line-height: 1.1;
    }
    .role {
      left: 4.9mm; top: 27.6mm;
      font-size: 7.5pt; font-weight: 500; letter-spacing: 0.06em; color: ${c.accent}; line-height: 1.2;
    }
    .contacts { left: 4.9mm; bottom: 4.8mm; font-size: 6.3pt; line-height: 3.4mm; }
    .contacts div { display: flex; gap: 1.6mm; }
    .contacts dt { width: 9mm; color: ${c.muted}; font-weight: 400; }
    .contacts dd { font-weight: 500; letter-spacing: 0.01em; }

    .qr {
      background: #fff;
      border: 0.3mm solid ${c.accent};
      display: flex; align-items: center; justify-content: center;
    }
    .qr svg { display: block; width: 100%; height: 100%; }
    .qr-front { left: 68.6mm; top: 34.6mm; width: 13.4mm; height: 13.4mm; padding: 1mm; }

    .qr-back { left: 33.4mm; top: 6.2mm; width: 19.2mm; height: 19.2mm; padding: 1.4mm; border-width: 0.35mm; }
    .back-caption {
      left: 0; right: 0; top: 27.6mm; text-align: center;
      font-size: 6pt; font-weight: 400; color: ${c.muted}; letter-spacing: 0.01em;
    }
    .back-url {
      left: 0; right: 0; top: 31mm; text-align: center;
      font-size: 12.5pt; font-weight: 700; color: ${c.accent}; letter-spacing: 0.05em; line-height: 1.2;
    }
    .back-tagline {
      left: 0; right: 0; top: 41.6mm; text-align: center;
      font-size: 6.8pt; font-weight: 500; letter-spacing: 0.02em;
    }
  `;

  const page = (side, bg, content) => `
    <section class="page ${side}">
      <div class="bleed">
        ${bg}
        <div class="trim">${content}</div>
      </div>
      ${withMarks ? cropMarks() : ''}
    </section>`;

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>최재혁 명함</title><style>${css}</style></head>
<body>
${page('front', frontBackground(), frontContent({ logoSvg, qrSvg }))}
${page('back', backBackground(), backContent({ qrSvg }))}
</body></html>`;
}
