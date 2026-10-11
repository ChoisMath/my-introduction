// 스팅 사운드트랙을 코드로 합성해 audio/soundtrack-<locale>.wav (48 kHz · 16-bit · 스테레오) 로 쓴다.
// 큐 시각은 index.html 의 #cues JSON 을 그대로 읽어 영상과 샘플 단위로 맞춘다.
// 사용: node audio/build-soundtrack.mjs [--locale ko|en]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const locale = process.argv.includes("--locale") ? process.argv[process.argv.indexOf("--locale") + 1] : "ko";
const vars = JSON.parse(readFileSync(join(root, "vars", `${locale}.json`), "utf8"));
const html = readFileSync(join(root, "index.html"), "utf8");
const cuesMatch = html.match(/<script id="cues" type="application\/json">([\s\S]*?)<\/script>/);
if (!cuesMatch) throw new Error("index.html: #cues block not found");
const CUES = JSON.parse(cuesMatch[1]);

const SR = 48000;
const DUR = CUES.end;
const N = Math.round(SR * DUR);
const BPM = 126;
const S16 = 60 / BPM / 4;

const music = new Float64Array(N);
const sfx = new Float64Array(N);
const send = new Float64Array(N);

let seed = 0x9e3779b9;
function rnd() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const noise = () => rnd() * 2 - 1;
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

function render(dur, gen) {
  const n = Math.round(dur * SR);
  const buf = new Float64Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    buf[i] = gen(t, i, (f) => {
      phase += (2 * Math.PI * f) / SR;
      return Math.sin(phase);
    });
  }
  return buf;
}
function lp1(buf, fc) {
  const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
  let y = 0;
  for (let i = 0; i < buf.length; i++) buf[i] = y += a * (buf[i] - y);
  return buf;
}
function hp1(buf, fc) {
  const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
  let y = 0;
  for (let i = 0; i < buf.length; i++) {
    y += a * (buf[i] - y);
    buf[i] -= y;
  }
  return buf;
}
// 상태변수 밴드패스. fc 는 상수 또는 (i)=>Hz.
function bp(buf, fc, q) {
  let low = 0;
  let band = 0;
  for (let i = 0; i < buf.length; i++) {
    const f = 2 * Math.sin((Math.PI * (typeof fc === "function" ? fc(i) : fc)) / SR);
    const high = buf[i] - low - band / q;
    band += f * high;
    low += f * band;
    buf[i] = band;
  }
  return buf;
}
function gainEnv(buf, fn) {
  for (let i = 0; i < buf.length; i++) buf[i] *= fn(i / SR);
  return buf;
}
// 모든 음의 양끝 3 ms 페이드 — 클릭 방지.
function mix(bus, t0, buf, gain = 1) {
  const start = Math.round(t0 * SR);
  const fade = Math.round(0.003 * SR);
  for (let i = 0; i < buf.length; i++) {
    const idx = start + i;
    if (idx < 0 || idx >= N) continue;
    let g = gain;
    if (i < fade) g *= i / fade;
    if (i >= buf.length - fade) g *= (buf.length - 1 - i) / fade;
    bus[idx] += buf[i] * g;
  }
}
const exp = (k) => (t) => Math.exp(-k * t);

/* ---------- 드럼 · 베이스 · 스탭 ---------- */
function kick(t, g = 1) {
  const b = render(0.42, (tt, i, osc) => osc(45 + 150 * Math.exp(-tt * 28)) * Math.exp(-tt * 8) + noise() * Math.exp(-tt * 500) * 0.5);
  mix(music, t, b, 0.95 * g);
}
function snare(t, g = 1) {
  const n = gainEnv(bp(render(0.24, () => noise()), 1900, 0.9), exp(17));
  const tone = render(0.12, (tt, i, osc) => osc(195) * Math.exp(-tt * 32));
  mix(music, t, n, 1.3 * g);
  mix(music, t, tone, 0.6 * g);
}
function hat(t, g = 1, open = false) {
  const b = gainEnv(hp1(render(open ? 0.26 : 0.06, () => noise()), 7000), exp(open ? 13 : 75));
  mix(music, t, b, 0.3 * g);
}
function bass(t, m, g = 1, dur = 0.22) {
  const f = midi(m);
  let hold = 0;
  let holdCount = 0;
  const b = render(dur, (tt, i, osc) => {
    const ph = (tt * f) % 1;
    const raw = 2 * ph - 1 + 0.5 * osc(f / 2);
    // 비트크러시: 6비트 양자화 + 9 kHz 샘플홀드
    if (holdCount <= 0) {
      hold = Math.round(raw * 32) / 32;
      holdCount = SR / 9000;
    }
    holdCount--;
    return hold;
  });
  const cutoff = (i) => 300 + 1600 * Math.exp(-(i / SR) * 18);
  bp(b, cutoff, 0.7);
  gainEnv(b, exp(9));
  mix(music, t, b, 0.9 * g);
}
function stab(t, notes, g = 1, dur = 0.17, decay = 22) {
  const b = new Float64Array(Math.round(dur * SR));
  for (const m of notes) {
    const f = midi(m);
    const part = render(dur, (tt) => {
      const idx = 2.6 * Math.exp(-tt * decay * 0.9);
      return Math.sin(2 * Math.PI * f * tt + idx * Math.sin(2 * Math.PI * f * 2 * tt)) * Math.exp(-tt * decay) * Math.min(1, tt / 0.004);
    });
    for (let i = 0; i < b.length; i++) b[i] += part[i] / notes.length;
  }
  mix(music, t, b, 0.55 * g);
}

/* ---------- SFX ---------- */
function slam(t, size = 1, g = 1) {
  const sub = render(0.4 * size, (tt, i, osc) => osc(32 + 90 * size * Math.exp(-tt * 22)) * Math.exp((-tt * 7) / size));
  const burst = gainEnv(bp(render(0.05, () => noise()), 500, 0.6), exp(120));
  const click = render(0.004, () => noise());
  mix(sfx, t, sub, 1.1 * g);
  mix(sfx, t, burst, 1.4 * g);
  mix(sfx, t, click, 0.5 * g);
  mix(send, t, burst, 0.8 * g);
}
function tick(t, g = 1) {
  const b = render(0.014, (tt, i, osc) => noise() * Math.exp(-tt * 700) * 0.6 + osc(2600) * Math.exp(-tt * 350));
  mix(sfx, t, b, 0.28 * g);
}
function slap(t, g = 1) {
  const n = gainEnv(bp(render(0.06, () => noise()), 950, 0.8), exp(85));
  const bl = render(0.05, (tt, i, osc) => osc(180 + 420 * Math.exp(-tt * 70)) * Math.exp(-tt * 60));
  mix(sfx, t, n, 1.6 * g);
  mix(sfx, t, bl, 0.45 * g);
  mix(send, t, n, 0.6 * g);
}
function tapeStretch(t0, t1) {
  const dur = t1 - t0;
  const b = render(dur, () => noise());
  bp(b, (i) => 250 + 1500 * Math.pow(i / b.length, 1.6), 2.2);
  gainEnv(b, (tt) => Math.pow(tt / dur, 1.4));
  mix(sfx, t0, b, 1.2);
  const snapN = gainEnv(bp(render(0.05, () => noise()), 2500, 0.7), exp(110));
  const ping = render(0.1, (tt, i, osc) => osc(1400) * Math.exp(-tt * 110));
  mix(sfx, t1, snapN, 1.3);
  mix(sfx, t1, ping, 0.35);
  mix(send, t1, snapN, 0.8);
}
function dragSweep(t0, dur) {
  const b = gainEnv(lp1(render(dur, () => noise()), 1100), (tt) => Math.pow(Math.sin((Math.PI * tt) / dur), 2));
  mix(sfx, t0, b, 0.45);
}
function clunk(t, g = 1) {
  const body = render(0.1, (tt, i, osc) => osc(70 + 110 * Math.exp(-tt * 45)) * Math.exp(-tt * 32));
  const top = gainEnv(lp1(render(0.025, () => noise()), 2600), exp(140));
  mix(sfx, t, body, 1.2 * g);
  mix(sfx, t, top, 0.9 * g);
  mix(send, t, top, 0.5 * g);
}
function blip(t, f, g = 1) {
  const b = render(0.13, (tt, i, osc) => (osc(f) + 0.3 * Math.sin(2 * Math.PI * f * 2 * tt)) * Math.exp(-tt * 28));
  mix(sfx, t, b, 0.5 * g);
}
function buzzer(t) {
  const b = render(0.32, (tt) => {
    const sq = Math.sign(Math.sin(2 * Math.PI * 220 * tt)) * (0.55 + 0.45 * Math.sign(Math.sin(2 * Math.PI * 30 * tt)));
    return sq * Math.min(1, tt / 0.005) * Math.min(1, (0.32 - tt) / 0.03);
  });
  lp1(b, 3200);
  mix(sfx, t, b, 0.42);
  mix(send, t, b, 0.25);
}
function mouseClick(t) {
  for (const [dt, g] of [
    [0, 1],
    [0.045, 0.7],
  ]) {
    const b = render(0.02, (tt, i, osc) => noise() * Math.exp(-tt * 900) * 0.8 + osc(1100) * Math.exp(-tt * 260));
    mix(sfx, t + dt, b, 0.55 * g);
  }
}
function impact(t) {
  slam(t, 2.2, 1.2);
  const crash = gainEnv(hp1(render(1.4, () => noise()), 2800), exp(3.2));
  const sub = render(0.7, (tt, i, osc) => osc(42) * Math.exp(-tt * 4));
  mix(sfx, t, crash, 0.45);
  mix(sfx, t, sub, 0.9);
  mix(send, t, crash, 1.2);
}
function hum(t0, t1) {
  const b = render(t1 - t0, (tt, i, osc) => osc(55) + 0.3 * Math.sin(2 * Math.PI * 110 * tt));
  mix(sfx, t0, b, 0.012);
}

/* ---------- 음악 편곡: 0 → stall (54 × 16분음표) ---------- */
const bars = [
  { kick: [0, 6, 10], snare: [4, 12], ghost: [7, 15], open: [14], bass: { 0: 40, 2: 40, 3: 52, 6: 43, 8: 40, 10: 40, 11: 45, 14: 47 }, stab: { 4: [52, 55, 59], 12: [52, 55, 59] } },
  { kick: [0, 3, 6, 10, 13], snare: [4, 12], ghost: [7, 15], open: [14], bass: { 0: 40, 2: 40, 3: 52, 6: 43, 8: 40, 10: 45, 11: 47, 14: 43 }, stab: { 4: [52, 55, 59], 11: [55, 59, 62] } },
  { kick: [0, 6, 10, 12], snare: [4, 12], ghost: [2, 7, 15], open: [6, 14], bass: { 0: 40, 2: 40, 3: 43, 6: 45, 8: 47, 10: 50, 11: 47, 14: 45 }, stab: { 4: [57, 60, 64], 12: [59, 62, 66] } },
  { kick: [0, 2, 4], snare: [], ghost: [], open: [], bass: { 0: 40, 1: 40, 2: 43, 3: 43, 4: 45, 5: 47 }, stab: { 0: [52, 55, 59], 2: [55, 59, 64], 4: [59, 64, 67] } },
];
const stallStep = Math.round(CUES.stall / S16);
for (let step = 0; step < stallStep; step++) {
  const bar = bars[Math.floor(step / 16)];
  const s = step % 16;
  const t = step * S16;
  const inBar4 = Math.floor(step / 16) === 3;
  if (bar.kick.includes(s)) kick(t);
  if (bar.snare.includes(s)) snare(t);
  if (bar.ghost.includes(s)) snare(t, 0.3);
  if (inBar4) {
    hat(t, 0.9 + 0.3 * (s / 6));
    if (s >= 2) snare(t, 0.35 + 0.15 * (s - 2));
  } else if (s % 2 === 0) hat(t, s % 4 === 0 ? 1 : 0.7, bar.open.includes(s));
  if (bar.bass[s] !== undefined) bass(t, bar.bass[s], inBar4 ? 1.1 : 1);
  if (bar.stab[s]) stab(t, bar.stab[s]);
}
// 스톨: 음악 급정지 (5 ms 페이드)
{
  const stop = Math.round(CUES.stall * SR);
  const fade = Math.round(0.005 * SR);
  for (let i = stop - fade; i < N; i++) music[i] *= i < stop ? (stop - i) / fade : 0;
}
// 페이오프: 임팩트 + 종지 코드(E 메이저) + 베이스, 긴 테일
impact(CUES.impact);
kick(CUES.impact, 1.1);
stab(CUES.impact, [52, 56, 59, 64, 71], 1.0, 1.8, 2.6);
bass(CUES.impact, 28, 1, 1.1);
stab(CUES.name, [52, 56, 59], 0.5, 0.3, 14);
stab(CUES.role, [56, 59, 64], 0.5, 0.3, 14);
hum(CUES.stall + 0.05, CUES.impact);

/* ---------- SFX 큐 ---------- */
const typeTimes = (text, [from, to]) => {
  const n = Array.from(text).length;
  const step = n > 1 ? (to - from) / (n - 1) : 0;
  return Array.from({ length: n }, (_, i) => from + i * step);
};
tick(CUES.gridOn, 1.2);
slam(CUES.slamBrowser, 1.3);
typeTimes(vars.url, CUES.urlType).forEach((t) => tick(t));
slap(CUES.live, 1.4);
CUES.cards.forEach((t, i) => slam(t, 0.9, 1 + i * 0.05));
slap(CUES.star);
slap(CUES.squiggle, 0.8);
tapeStretch(CUES.tape[0], CUES.tape[1]);
dragSweep(CUES.cut2, CUES.winLand - CUES.cut2);
clunk(CUES.winLand, 1.1);
typeTimes(vars.formula, CUES.formulaType).forEach((t) => tick(t, 0.9));
clunk(CUES.runPress, 1.3);
tick(CUES.runRelease, 1.6);
slam(CUES.chartSlam, 0.8);
CUES.bars.forEach((t, i) => { blip(t, [440, 554, 659][i], 1.2); slam(t, 0.5, 0.6); });
slam(CUES.loaderLand, 1.4);
{
  const steps = CUES.progressSteps;
  const [from, to] = CUES.progress;
  for (let i = 1; i <= steps; i++) tick(from + ((to - from) * i) / steps, 1.1);
}
buzzer(CUES.buzzer);
mouseClick(CUES.click);
slam(CUES.name, 1.1, 1.7);
slam(CUES.role, 0.9, 1.5);
CUES.buttons.forEach((t, i) => {
  clunk(t, 1.0);
  blip(t, [523, 587, 659, 784, 880][i], 0.6);
});
slap(CUES.url, 1.6);
slap(CUES.url + 0.06, 0.9);

/* ---------- 리버브(슈뢰더) · 믹스 · 리미터 ---------- */
function reverb(input, scale) {
  const out = new Float64Array(N);
  const combs = [29.7, 37.1, 41.1, 43.7].map((ms) => ({ d: Math.round((ms * scale * SR) / 1000), buf: new Float64Array(Math.round((ms * scale * SR) / 1000)), i: 0 }));
  const aps = [5.0, 1.7].map((ms) => ({ d: Math.round((ms * SR) / 1000), buf: new Float64Array(Math.round((ms * SR) / 1000)), i: 0 }));
  const fb = 0.72;
  for (let n = 0; n < N; n++) {
    const x = input[n];
    let y = 0;
    for (const c of combs) {
      const old = c.buf[c.i];
      c.buf[c.i] = x + old * fb;
      c.i = (c.i + 1) % c.d;
      y += old;
    }
    y /= combs.length;
    for (const a of aps) {
      const old = a.buf[a.i];
      const v = y + old * 0.7;
      a.buf[a.i] = v;
      a.i = (a.i + 1) % a.d;
      y = old - 0.7 * v;
    }
    out[n] = y;
  }
  return out;
}
const verbL = reverb(send, 1.0);
const verbR = reverb(send, 1.07);

function finalize(verb) {
  const out = new Float64Array(N);
  for (let i = 0; i < N; i++) out[i] = music[i] * 0.9 + sfx[i] + verb[i] * 0.28;
  hp1(out, 20);
  const drive = 1.35;
  for (let i = 0; i < N; i++) out[i] = Math.tanh(out[i] * drive) / Math.tanh(drive);
  return out;
}
const L = finalize(verbL);
const R = finalize(verbR);
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const target = Math.pow(10, -1 / 20);
const norm = target / peak;
const fadeIn = Math.round(0.003 * SR);
const fadeOut = Math.round(0.06 * SR);
for (let i = 0; i < N; i++) {
  let g = norm;
  if (i < fadeIn) g *= i / fadeIn;
  if (i >= N - fadeOut) g *= (N - 1 - i) / fadeOut;
  L[i] *= g;
  R[i] *= g;
}

const bytes = N * 4;
const wav = Buffer.alloc(44 + bytes);
wav.write("RIFF", 0);
wav.writeUInt32LE(36 + bytes, 4);
wav.write("WAVE", 8);
wav.write("fmt ", 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(SR, 24);
wav.writeUInt32LE(SR * 4, 28);
wav.writeUInt16LE(4, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(bytes, 40);
for (let i = 0; i < N; i++) {
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
}
mkdirSync(join(root, "audio"), { recursive: true });
const outPath = join(root, "audio", `soundtrack-${locale}.wav`);
writeFileSync(outPath, wav);

let dc = 0;
for (let i = 0; i < N; i++) dc += L[i];
console.log(`${outPath}: ${DUR}s, peak ${(20 * Math.log10(target)).toFixed(2)} dBFS, DC ${(dc / N).toExponential(2)}`);
