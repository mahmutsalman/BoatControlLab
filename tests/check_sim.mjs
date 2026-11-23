// Runs the simulation block of index.html in Node and checks that every scene teaches what it claims.
// Usage: node tests/check_sim.mjs   (exit 0 = all OK, exit 1 = something failed)
import fs from "fs";
import vm from "vm";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, "..", "lab.html"), "utf8");
const sim = html.match(/<script id="sim">([\s\S]*?)<\/script>/)[1];
const ctx = {};
vm.createContext(ctx);
vm.runInContext(sim + "\nthis.API = { makeRun, stepRun, verdict, HORIZON_S };", ctx);
const { makeRun, stepRun, verdict, HORIZON_S } = ctx.API;

const BASE = { target: 90, limit: 35, Kb: 0.2, T: 3, wind: 0, mismatch: 0, ruleOn: false, turnCap: 4,
               antiWindup: false, Kp: 3.5, Ki: 0.1, Kd: 6, qe: 1, qr: 4, R: 0.5 };

function runScene(changes) {
  const cfg = { ...BASE, ...changes };
  const run = makeRun(cfg);
  while (run.t < HORIZON_S - 1e-9) {
    stepRun(run);
  }
  const result = { run };
  for (const name of ["pid", "lqr", "mpc"]) {
    result[name] = verdict(run[name], cfg, run.turnCap);
  }
  return result;
}

let failed = 0;
function check(label, ok, value) {
  if (ok) {
    console.log("OK   " + label + "  (" + value + ")");
  } else {
    console.log("FAIL " + label + "  (" + value + ")");
    failed++;
  }
}

const calm = runScene({});
check("calm: PID without anti-windup overshoots > 15°", calm.pid.overshoot > 15, calm.pid.overshoot.toFixed(1));
check("calm: LQR gains kErr ≈ 1.397", Math.abs(calm.run.gains.kErr - 1.397) < 0.01, calm.run.gains.kErr.toFixed(3));
check("calm: LQR gains kTurn ≈ 3.678", Math.abs(calm.run.gains.kTurn - 3.678) < 0.01, calm.run.gains.kTurn.toFixed(3));
check("calm: LQR overshoots < 2°", calm.lqr.overshoot < 2, calm.lqr.overshoot.toFixed(1));
check("calm: MPC overshoots < 2°", calm.mpc.overshoot < 2, calm.mpc.overshoot.toFixed(1));

const aw = runScene({ antiWindup: true });
check("anti-windup: PID overshoot drops < 3°", aw.pid.overshoot < 3, aw.pid.overshoot.toFixed(1));

const rule = runScene({ ruleOn: true, antiWindup: true });
check("rule 4°/s: MPC keeps it", !rule.mpc.brokeRule, rule.mpc.maxTurn.toFixed(2));
check("rule 4°/s: PID breaks it", rule.pid.brokeRule, rule.pid.maxTurn.toFixed(2));
check("rule 4°/s: LQR breaks it", rule.lqr.brokeRule, rule.lqr.maxTurn.toFixed(2));

const wind = runScene({ wind: -0.6, antiWindup: true });
check("wind: PID reaches the target (|end error| < 1°)", Math.abs(wind.pid.endErr) < 1, wind.pid.endErr.toFixed(2));
check("wind: LQR stops short (> 3°)", wind.lqr.endErr > 3, wind.lqr.endErr.toFixed(2));
check("wind: MPC stops short (> 3°)", wind.mpc.endErr > 3, wind.mpc.endErr.toFixed(2));

const wrong = runScene({ mismatch: 1.5, antiWindup: true });
check("wrong model: LQR now overshoots > 3°", wrong.lqr.overshoot > 3, wrong.lqr.overshoot.toFixed(1));
check("wrong model: MPC now overshoots > 3°", wrong.mpc.overshoot > 3, wrong.mpc.overshoot.toFixed(1));

console.log(failed === 0 ? "\nALL OK" : "\n" + failed + " FAILED");
process.exit(failed === 0 ? 0 : 1);
