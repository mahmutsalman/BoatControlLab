// Draws every screen of a lesson page at several moments with a fake canvas; exit 1 if any screen throws.
// Usage: node tests/draw_screens.mjs pid.html
import fs from "fs"; import vm from "vm";
const file = process.argv[2];
const html = fs.readFileSync(file, "utf8");
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/requestAnimationFrame\(frame\);\s*<?\/?$/,"");
const ctx2d = new Proxy({}, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
const el = () => ({ getContext: () => ctx2d, width: 1000, height: 520, textContent: "", innerHTML: "", children: [], dataset: {}, classList: { toggle() {} }, set onclick(f) {}, addEventListener() {} });
const els = {};
const sandbox = { document: { getElementById: id => (els[id] ||= el()), documentElement: {} }, getComputedStyle: () => ({ getPropertyValue: () => "#fff" }),
  window: { addEventListener() {}, devicePixelRatio: 1 }, performance: { now: () => 0 }, requestAnimationFrame: () => {}, console, Math };
vm.createContext(sandbox);
vm.runInContext(js + "\nthis.__S = typeof SCREENS !== 'undefined' ? SCREENS : LESSONS; this.__X = { P_ALONE: typeof P_ALONE!=='undefined'?P_ALONE:null, PD: typeof PD!=='undefined'?PD:null, PI: typeof PI_WIND!=='undefined'?PI_WIND:null, W1: typeof P_WIND_1!=='undefined'?P_WIND_1:null };", sandbox);
let bad = 0;
sandbox.__S.forEach((s, i) => { for (const t of [0, 1, s.dur / 3, s.dur / 2, s.dur * 0.9, s.dur]) { try { s.draw(t); } catch (e) { bad++; console.log("screen", i + 1, s.title, "t", t, "ERR", e.message); } } });
const X = sandbox.__X;
if (X.P_ALONE) {
  const mx = r => Math.max(...r.map(x => x.heading));
  console.log("P alone over", (mx(X.P_ALONE) - 90).toFixed(1), "| PD over", (mx(X.PD) - 90).toFixed(1), "| P wind end", X.W1.at(-1).heading.toFixed(1), "| PI end", X.PI.at(-1).heading.toFixed(2), "I", X.PI.at(-1).i.toFixed(2));
}
console.log(bad === 0 ? "ALL SCREENS DRAW" : bad + " ERRORS"); process.exit(bad ? 1 : 0);
