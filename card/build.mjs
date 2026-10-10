import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import QRCode from 'qrcode';
import { CARD, backgroundLayers, layerSvg, renderCardHtml } from './template.mjs';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, 'print');
const workDir = path.join(here, '.work');
mkdirSync(outDir, { recursive: true });
mkdirSync(workDir, { recursive: true });

const fontDir = path.join(path.dirname(require.resolve('pretendard/package.json')), 'dist/web/static/woff2');
// 가변 폰트는 Chromium 이 Type 3 로 내보내므로, 인쇄소 호환을 위해 고정 굵기(TrueType) 사용
const fontUrls = Object.fromEntries(
  Object.entries({ 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold' })
    .map(([weight, name]) => [weight, pathToFileURL(path.join(fontDir, `Pretendard-${name}.woff2`)).href]),
);
const logoSvg = readFileSync(path.join(here, '../asset/포산고등학교교표.svg'), 'utf8');
const qrSvg = await QRCode.toString(CARD.url, {
  type: 'svg',
  errorCorrectionLevel: 'M',
  margin: 0,
  color: { dark: CARD.color.qr, light: '#0000' },
});

const assets = { fontUrls, logoSvg, qrSvg };

const browser = await chromium.launch();
const page = await browser.newPage();

async function renderPdf(variant, fileName) {
  const html = renderCardHtml({ ...assets, variant });
  const htmlPath = path.join(workDir, `${variant}.html`);
  writeFileSync(htmlPath, html);
  await page.goto(pathToFileURL(htmlPath).href);
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: path.join(outDir, fileName),
    printBackground: true,
    preferCSSPageSize: true,
  });
  console.info(`wrote print/${fileName}`);
}

// 인쇄소 입고용: 재단 여백 포함 페이지, 1p 앞면 / 2p 뒷면
await renderPdf('bleed', 'business-card.pdf');
// 확인용: 재단선·여백 안내가 그려진 버전
await renderPdf('marks', 'business-card-cropmarks.pdf');
// Canva 등 자체 재단 여백을 쓰는 도구용: 재단 여백 없는 86×52mm
await renderPdf('trim', 'business-card-canva.pdf');

// 확인용 PNG (300dpi, 재단 여백 포함)
const PRINT_DPI = 300;
const CSS_DPI = 96;
const previewContext = await browser.newContext({ deviceScaleFactor: PRINT_DPI / CSS_DPI });
const previewPage = await previewContext.newPage();
await previewPage.goto(pathToFileURL(path.join(workDir, 'bleed.html')).href);
await previewPage.evaluate(() => document.fonts.ready);
for (const side of ['front', 'back']) {
  const fileName = `${side}.png`;
  await previewPage.locator(`.page.${side}`).screenshot({ path: path.join(outDir, fileName), scale: 'device' });
  console.info(`wrote print/${fileName}`);
}

// 배경 레이어 분리 출력 (모눈·그래프 요소 각각, 투명 배경 SVG + 600dpi PNG, 재단 크기 86×52mm)
const layersDir = path.join(outDir, 'layers');
mkdirSync(layersDir, { recursive: true });
const LAYER_DPI = 600;
const layerContext = await browser.newContext({ deviceScaleFactor: LAYER_DPI / CSS_DPI });
const layerPage = await layerContext.newPage();
const fontFaces = Object.entries(fontUrls)
  .map(([weight, url]) => `@font-face { font-family: 'Pretendard'; src: url('${url}') format('woff2'); font-weight: ${weight}; }`)
  .join('\n');
for (const [name, markup] of Object.entries(backgroundLayers())) {
  const fileBase = name.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);
  const svg = layerSvg(markup);
  writeFileSync(path.join(layersDir, `${fileBase}.svg`), svg);
  const htmlPath = path.join(workDir, `layer-${fileBase}.html`);
  writeFileSync(
    htmlPath,
    `<!doctype html><html><head><meta charset="utf-8"><style>${fontFaces} html,body{margin:0;background:transparent} svg{display:block}</style></head><body>${svg}</body></html>`,
  );
  await layerPage.goto(pathToFileURL(htmlPath).href);
  await layerPage.evaluate(() => document.fonts.ready);
  await layerPage.locator('svg').screenshot({ path: path.join(layersDir, `${fileBase}.png`), omitBackground: true, scale: 'device' });
  console.info(`wrote print/layers/${fileBase}.{svg,png}`);
}

await browser.close();
