// Plays every screen of a lesson page like a real browser: the first frame after a screen change is stamped
// 16 ms BEFORE the click (that is what requestAnimationFrame does). Fails on any throw, NaN, or a drawn "screen error".
// Usage: node tests/real_frames.mjs pid.html
import fs from "fs"; import vm from "vm";
const html = fs.readFileSync(process.argv[2], "utf8");
const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join("\n");
const problems = new Set();
const ctx2d = new Proxy({}, { get: (o, k) => {
  if (k in o) { return o[k]; }
  return (...a) => {
    if (a.some(x => typeof x === "number" && !Number.isFinite(x))) { problems.add(String(k) + " got NaN/Infinity"); }
    if (k === "fillText" && String(a[0]).startsWith("screen error")) { problems.add("DRAWN: " + a[0]); }
    if (k === "arc" && a[2] < 0) { throw new Error("arc negative radius " + a[2]); }
  };
}, set: (o, k, v) => { o[k] = v; return true; } });
let raf = null;
const el = () => ({ style: {}, value: "50", getContext: () => ctx2d, width: 0, height: 520, clientWidth: 1000, clientHeight: 520, textContent: "", innerHTML: "", children: [], dataset: {}, classList: { toggle() {} }, addEventListener() {} });
const els = {};
let clock = 0;
const sb = { document: { getElementById: id => (els[id] ||= el()), documentElement: {} }, getComputedStyle: () => ({ getPropertyValue: () => "#fff" }),
  window: { addEventListener() {}, devicePixelRatio: 2 }, performance: { now: () => clock }, requestAnimationFrame: f => { raf = f; }, console, Math };
vm.createContext(sb);
vm.runInContext(js + "\nthis.__show = show; this.__N = (typeof SCREENS!=='undefined'?SCREENS:LESSONS).length;", sb);
for (let s = 0; s < sb.__N; s++) {
  sb.__show(s);
  for (let k = 0; k < 400; k++) {           // 400 frames of 50 ms = 20 s on each screen
    clock += 50;
    const f = raf; raf = null;
    const stamp = k === 0 ? clock - 66 : clock;   // = 16 ms BEFORE show() set t0   // a real browser: the first frame after a click is stamped BEFORE the click
    try { f(stamp); } catch (e) { console.log("screen", s + 1, "frame", k, "THROWS:", e.message); break; }
    if (!raf) { console.log("screen", s + 1, "loop STOPPED at frame", k); break; }
  }
}
console.log("problems:", [...problems].join(" | ") || "none"); process.exit(problems.size ? 1 : 0);
