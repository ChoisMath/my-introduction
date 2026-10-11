// 사운드트랙의 각 큐에서 온셋(직전 2프레임 대비 직후 1프레임 RMS 상승)이 ±1프레임 안에 있는지 확인한다.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const locale = process.argv[2] || "ko";
const vars = JSON.parse(readFileSync(join(root, "vars", `${locale}.json`), "utf8"));
const html = readFileSync(join(root, "index.html"), "utf8");
const CUES = JSON.parse(html.match(/<script id="cues" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const wav = readFileSync(join(root, "audio", `soundtrack-${locale}.wav`));
const SR = wav.readUInt32LE(24);
const n = (wav.length - 44) / 4;
const mono = new Float64Array(n);
for (let i = 0; i < n; i++) mono[i] = (wav.readInt16LE(44 + i * 4) + wav.readInt16LE(46 + i * 4)) / 65536;
const FR = SR / 30;
const rms = (a, b) => { let s = 0; for (let i = Math.max(0, a | 0); i < Math.min(n, b | 0); i++) s += mono[i] * mono[i]; return Math.sqrt(s / Math.max(1, (b | 0) - (a | 0))); };
const peakFrame = (t) => { // 큐 주변 ±1프레임 범위에서 가장 큰 RMS 상승이 있는 프레임 오프셋
  const c = t * SR; let best = null;
  for (const off of [-1, 0, 1]) {
    const s = c + off * FR; const after = rms(s, s + FR); const before = rms(s - 2 * FR, s - FR * 0.2);
    const gain = 20 * Math.log10((after + 1e-6) / (before + 1e-6));
    if (!best || gain > best.gain) best = { off, gain, after };
  }
  return best;
};
const singles = Object.entries(CUES).filter(([k, v]) => typeof v === "number" && !["gridOn", "end", "hold", "progressSteps", "cut2", "cut3", "stall"].includes(k));
const list = singles.map(([k, v]) => [k, v]);
CUES.cards.forEach((t, i) => list.push([`card${i + 1}`, t]));
CUES.bars.forEach((t, i) => list.push([`bar${i + 1}`, t]));
CUES.buttons.forEach((t, i) => list.push([`button${i + 1}`, t]));
list.push(["tapeSnap", CUES.tape[1]]);
let bad = 0;
for (const [k, t] of list.sort((a, b) => a[1] - b[1])) {
  const r = peakFrame(t);
  const ok = r.off === 0 || (Math.abs(r.off) <= 1 && r.gain > 3);
  if (!ok) bad++;
  console.log(`${ok ? "ok " : "!! "} ${t.toFixed(3)}s ${k.padEnd(12)} onset@${r.off >= 0 ? "+" : ""}${r.off}f  +${r.gain.toFixed(1)} dB  level ${(20 * Math.log10(r.after + 1e-6)).toFixed(1)} dBFS`);
}
const stallLevel = 20 * Math.log10(rms(CUES.stall * SR + 0.05 * SR, CUES.buzzer * SR - 0.01 * SR) + 1e-6);
const tail = 20 * Math.log10(rms((CUES.end - 0.3) * SR, CUES.end * SR) + 1e-6);
console.log(`stall floor ${stallLevel.toFixed(1)} dBFS, last 300 ms ${tail.toFixed(1)} dBFS, ${bad} off-grid`);
