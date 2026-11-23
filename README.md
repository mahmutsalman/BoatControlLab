# ⛵ Boat Control Lab: PID vs LQR vs MPC

One order, *"turn the boat from 0° to 90°"*, given to three controllers and to you.
Watch how each one decides the rudder, 10 times a second, with every term of its formula live on screen.

| captain | looks at | decides by |
|---|---|---|
| 🧑‍✈️ **PID** | the error only | `Kp·error + Ki·Σerror + Kd·(−turn)` |
| 📐 **LQR** | error **and** turn speed, through a model | two gains computed **once**, before the trip (Riccati) |
| 🔮 **MPC** | the model, 8 s into the future | imagines 1 331 rudder plans, keeps the best one that breaks no rule, uses its first step, repeats every 0.5 s |
| 🙋 **You** | your eyes | `←` `→` |

## Run

Open `index.html` in a browser. No install, no build.

## Scenes (each one shows one trade-off)

| scene | what happens (numbers from `tests/check_sim.mjs`) |
|---|---|
| 1 · calm sea | PID's integral winds up while the rudder is stuck at ±35° → **22.5° overshoot**. Anti-windup → **1.8°** |
| 2 · cargo rule: never turn faster than 4°/s | only **MPC** obeys (3.7°/s); PID 6.9°/s, LQR 6.7°/s. A rule on the *state* has no place in PID or LQR |
| 3 · steady wind | only **PID** reaches the target (its integral cancels the wind); LQR stops 6.5° short, MPC 5.2° short |
| 4 · wrong model | the real boat reacts 2.5× slower than the model: the model-based controllers overshoot too → measure the real system first (system identification) |

## The boat model

A first-order Nomoto model, stepped every 0.1 s:

```
turn    += 0.1 × ((Kb × rudder − turn) / T + wind)     Kb = 0.2, T = 3 s
heading += 0.1 × turn
```

## Test

```
node tests/check_sim.mjs
```

Runs the simulation headless and checks that every scene still teaches what it claims.

## Roadmap

- [ ] Python desktop version (pygame): every variable drawn as a shape (error arc, P/I/D stacked bar, integral tank, MPC's fan of futures)
- [ ] More scenes: a wave hits mid-trip, noisy compass, moving target, small rudder
- [ ] MPC with a wind estimate (removes the steady-state error)
