# AnyBuild: hackathon plan

> **You say what you want. Claude designs it in 3D, the browser tests it 1,000 times, and when you approve, you get a parts list with live prices, a step-by-step build guide, and firmware ready to flash.**
> It's NVIDIA's Berlin "three computers" demo, rebuilt so it runs in one browser tab, on any laptop, with no GPU, for free.

Judging: **50% technical execution · 30% creativity / wow · 20% real-world use.** Every decision below is checked against those three.

> **Design rule for now: black and white, function first.** Every feature in this plan gets built, but with no visual design yet. That means:
> - Black text on a white background, the system font, plain HTML elements (buttons, inputs, tables, tabs as buttons). No CSS framework, no colors, gradients, icons or animations.
> - The 3D view is grey shapes on white with a thin grid. Highlights are **black vs light grey**, and fitness shows as **darker = fitter** plus the number.
> - Keep the layout simple, semantic markup with clear class names (`.stage-describe`, `.bom-table`, …), so the design pass later restyles everything without touching logic.
> - Full design comes after the build works. Agents must not spend time on styling.

---

## 0. Answers to the questions you asked

**Do we need worktrees?**
- **Between the two of you: no.** Each of you works in your own clone on your own laptop. Git branches are enough.
- **For running several AI agents at once on one laptop: yes.** Two agents in one folder overwrite each other's files and fight over the dev server. Each agent gets its own worktree: its own folder, branch, ports and `node_modules`.
- **Recommended setup: 2 agents per person, 4 worktrees in total.** More than that and you spend the hackathon merging instead of building.

| Person | Laptop folder | Worktrees (one agent each) |
|---|---|---|
| **A, "Brain"** (Claude + product) | `anybuild_hackathon/` (integration + demo) | `anybuild_hackathon-a1` Design · `anybuild_hackathon-a2` Build |
| **B, "Body"** (3D + physics) | `anybuild_hackathon/` (integration + demo) | `anybuild_hackathon-b1` Compile + View · `anybuild_hackathon-b2` Train |

Create one: `scripts/worktree.sh a1`. It makes the folder, creates the branch, sets separate ports in `.env` and installs dependencies. Remove it after merging: `scripts/worktree.sh rm a1`.

**Can we use Isaac Sim / Isaac Lab like NVIDIA did?** Not in a few hours on a Mac. Isaac needs an NVIDIA RTX GPU on Linux or Windows, and setup alone takes hours. We use **MuJoCo**, Google DeepMind's physics engine and an industry standard, through its official WebAssembly build (`@mujoco/mujoco` 3.17). It's tested on this machine: **2,000 physics steps in 40 ms** for a test robot. That's how we fit "1,000 simulations" into roughly 30 seconds in the browser. "Runs on any laptop" is also a real-world argument in its own right.

---

## 1. The demo we're building toward (90 seconds; every task below serves this)

1. Type: *"A palm-sized four-legged robot that can walk across my desk, under $60."*
2. Claude's reasoning streams on screen while it designs. A 3D robot appears: body, legs, servos. It drops under gravity and stands.
3. Click **Train**. A grid of 16 small robots stumbles, then starts walking, while a counter runs to **1,024 simulations**, the fitness chart climbs and the best gait replays large.
4. **Stress test:** the same gait runs in 50 worlds with randomized friction, mass and weaker servos. "Survived 47/50."
5. Click **Approve**. You get a parts list with live prices and buy links (total $54.20), a numbered build guide where the 3D model explodes and highlights the part for each step, a wiring table, and a **Download firmware (.ino)** button.
6. Closing line: *"Tested 1,024 times before you spend a dollar."* If you have the hardware (see §10), the real robot walks at this point.

---

## 2. Stack: NVIDIA's version → ours

| Step | NVIDIA in Berlin | AnyBuild | Owner |
|---|---|---|---|
| Plan from plain language | Hermes + Nemotron | **Claude Opus 5.5** (`claude-opus-5-5`) with structured outputs → `RobotSpec` | A1 |
| Build the 3D scene and rig the robot | "Astra" driving FreeCAD + Blender | Claude writes the spec, then **deterministic code** compiles it to MuJoCo's robot format (MJCF), so it can't produce broken geometry | B1 |
| Physical properties | Omniverse SimReady assets | `shared/catalog.json`: **real servo specs** (SG90 is 0.176 N·m at 10.5 rad/s) used as the simulator's motor limits | shared |
| Physics | Newton | **MuJoCo WASM** (official DeepMind build) | B1 |
| Thousands training in parallel | Isaac Lab on cloud GPUs | **Web Workers × evolution strategy**, 64 robots × 16 generations = 1,024 runs, all in the browser | B2 |
| Evaluate before deploying | Isaac Sim on RTX Spark | **Stress test**: 50 runs with randomized physics → robustness score | B2 |
| Rendering | Omniverse | **three.js** via react-three-fiber, drawn straight from MuJoCo state | B1 |
| Deploy to the physical robot | Policy → robot | **Firmware generated from the trained gait** + live-priced parts list + build guide + wiring | A2 |
| (stretch) Simulated cameras / perception | Omniverse sensor sim | **Claude vision critique**: Claude watches rendered frames, finds the flaw, edits the spec, retrains | A1 + B2 |

Repo stack: Vite 7 + React 19 + TypeScript · `@react-three/fiber` 9 + drei · `@mujoco/mujoco` · Hono API server (keeps the API key off the browser) · `@anthropic-ai/sdk` called directly, no AI SDK · zod for the contract. `@dimforge/rapier3d-compat` is installed only as the physics fallback (§8).

```
 Browser ───────────────────────────────────────────────────────────┐
 Describe ──POST /api/design──► Hono ──► Claude (structured RobotSpec)│
    │                                     ▲ validator fixes once     │
    ▼ RobotSpec                                                      │
 mjcf.ts (spec → MJCF XML) ──► Viewer (three.js reads MuJoCo state)  │
    │                                                                │
    ▼ XML               ┌ worker 1: MuJoCo, N rollouts ┐             │
 train.ts (ES loop) ───►│ worker 2 …                    │──► fitness  │
    │                   └ worker k (cores − 1)          ┘   + traj.   │
    ▼ TrainResult (gait, robustness)                                 │
 Build ──POST /api/build──► Hono ──► Claude + web_search (prices)    │
    │                              └► firmware.ts / wiring.ts (code) │
    ▼ BuildPlan: BOM, steps (drive Viewer highlight), wiring, .ino   │
 ────────────────────────────────────────────────────────────────────┘
```

---

## 3. The contract (already on main, so nobody waits)

`shared/spec.ts` defines `RobotSpec` (A1 → B), `GaitParams` / `TrainProgress` / `TrainResult` (B2 → A2) and `BuildPlan` (A2). `shared/catalog.json` is the only list of parts Claude may use. `shared/fixtures/quadruped.json` is a hand-written valid robot, so B builds against it from minute one without waiting for Claude. `src/viewer/Viewer.tsx` has props that are frozen: `spec`, `trajectory`, `highlight`, `exploded`.

**Rule:** the contract changes only on `main`, with both of you agreeing, announced out loud. Then everyone rebases.

The stubs are wired end to end already: `pnpm dev` runs Describe → Simulate → Build with fake data. Each lane replaces its own stub.

---

## 4. Lanes: who owns which files (no overlaps = no merge conflicts)

| Lane | Owns (only edit these) | Delivers |
|---|---|---|
| **A1 Design** | `server/routes/design.ts`, `server/claude.ts`, `shared/validate.ts`, `src/stages/Describe.tsx` | Prompt → valid `RobotSpec`, with Claude's reasoning streamed live |
| **A2 Build** | `server/routes/build.ts`, `server/firmware.ts`, `server/wiring.ts`, `server/prices-cache.json`, `src/stages/Build.tsx` | Parts list with live prices, build steps, wiring, `.ino` download |
| **B1 Compile + View** | `src/sim/mjcf.ts`, `src/sim/mujoco.ts`, `src/viewer/**` | Spec → MJCF; a 3D viewer that replays trajectories, highlights parts and explodes the model |
| **B2 Train** | `src/sim/worker.ts`, `src/sim/es.ts`, `src/sim/train.ts`, `src/sim/robustness.ts`, `src/stages/Simulate.tsx`, `src/components/FitnessChart.tsx` | 1,024-run training with live progress, population grid, stress test, Approve |
| Shared, main only | `shared/**`, `package.json`, `pnpm-lock.yaml`, `src/App.tsx`, `server/index.ts` | Change only together |

**New dependency?** Don't add it inside a lane worktree, because lockfile conflicts are painful. Tell your partner, add it on `main`, push, and every lane rebases.

---

## 5. Lane specs

### A1: Design (Claude → RobotSpec)
1. `server/claude.ts`: one shared client `new Anthropic()` that reads `ANTHROPIC_API_KEY`. Model `claude-opus-5-5`.
2. `POST /api/design {prompt}`:
   - Use `client.messages.stream(...)` with `output_config: { effort: "medium", format: zodOutputFormat(RobotSpec) }` (from `@anthropic-ai/sdk/helpers/zod`) and `thinking: { type: "adaptive", display: "summarized" }`.
   - Stream the thinking summary to the browser over server-sent events (Hono's `streamSSE`) so the screen is never empty. Send the final spec as the last event.
   - System prompt = template rules + the whole `catalog.json`. Mark it with `cache_control: { type: "ephemeral" }`: it's identical on every call, so cached calls are cheaper and faster.
   - Template rules for `quadruped`: 4 limbs, 2 segments each (yaw hip, pitch knee), mounts symmetric about y = 0, segments 0.03–0.08 m. `hexapod` uses 6 limbs with the same pattern. Only use catalog ids. Don't send `temperature` (it returns a 400 now) and don't prefill the answer.
3. `shared/validate.ts`: plain-code checks, returning a list of errors:
   - every id exists in the catalog;
   - limbs are symmetric;
   - more than 6 servos ⇒ `servoDriver` is set;
   - **torque check**: estimated total mass × g ÷ (legs on the ground, assume half) × knee segment length must be ≤ 0.5 × the servo's `torqueNm`.
   - If anything fails, send the errors back to Claude once ("fix these: …"). If it still fails, upgrade the servo in code. Mention this repair loop in the pitch; it counts as technical execution.
4. `Describe.tsx`: prompt box, three example chips (desk walker, hexapod explorer, "the cheapest robot that walks"), a live reasoning panel, and then "Design ready".
- **Done when:** 3 different prompts give specs that pass validation and that B1 renders.
- **Gotchas:** no forced `tool_choice` on Opus 5.5 (it returns a 400), so use structured outputs as described. Opus 5.5's default effort is `medium`, so set it explicitly anyway. Check `stop_reason` before parsing.

### A2: Build (approve → parts list, guide, firmware)
1. `server/wiring.ts`, plain code: servo i → PCA9685 channel i; PCA9685 SDA → ESP32 GPIO21, SCL → GPIO22; servo power from the UBEC 5V, never from the ESP32's 3.3V pin; common ground; IMU on the same I2C bus. On Arduino Nano without the driver board, use pins D3, D5, D6, D9, D10, D11.
2. `server/firmware.ts`, plain code with no Claude: a `.ino` template. It includes `Adafruit_PWMServoDriver` (or `ESP32Servo` when there's no driver board), defines the gait parameters as `const` arrays from `TrainResult.gait`, includes a `stand()` pose plus a 2-second wait, then runs `loop()` with `angle = offset + amp*sin(2π f t + phase)` mapped to each joint's range, and adds a calibration-offsets block with comments. Plain code, so it can't hallucinate pin numbers.
3. `POST /api/build {spec, train}`, two Claude calls **in parallel**:
   - **Prices:** tools `[{ type: "web_search_20260209", name: "web_search", max_uses: 8 }]`. For each unique catalog id, find a current price and a buy link (allow Amazon, AliExpress, Adafruit, SparkFun, DigiKey). **First 10 minutes:** check whether `web_search` and `output_config.format` work together in one call. If not, run the search call first, then a second call that only formats the result as JSON. Save results in `server/prices-cache.json` keyed by catalog id; the UI shows "live" or "cached" per line. If search fails, use `estUsd` and a store search link, and never block the demo.
   - **Steps:** structured `BuildPlan.steps`. Each step's `highlight` uses limb or segment ids from the spec. Write for a beginner: tools needed, minutes, one action per step.
4. `Build.tsx`: three tabs (Parts with total, Guide, Wiring) plus a **Download firmware** button. The Guide tab puts `<Viewer exploded highlight={step.highlight}/>` beside the step text, with ← → keys to move between steps.
- **Done when:** the fixture spec plus a fake `TrainResult` produce a full build page, and the `.ino` compiles in Arduino IDE or `arduino-cli` (check one by hand if either is installed).

### B1: Compile + View (spec → MJCF → three.js)
1. `src/sim/mjcf.ts`: `specToMjcf(spec, catalog, opts?) → string`.
   - The body is a box with `<freejoint/>` and mass = material density × volume + electronics mass. Each segment is a capsule with a hinge joint (axis from `axis`, range from `rangeDeg`). Name every geom and joint after its segment id; A2's highlight depends on those names.
   - Actuators: `<position kp=… forcerange="±torqueNm">` from the servo specs. `opts` carries randomization multipliers (friction, mass, torque) for the stress test.
   - Use timestep 0.005 and a floor plane with friction 1.
2. `src/sim/mujoco.ts`: load the WASM once, single-threaded build: `import loadMujoco from '@mujoco/mujoco'`, then `mj.MjModel.from_xml_string(xml)`, `new mj.MjData(model)`, `mj.mj_step(model, data)`. The Vite config already excludes it from pre-bundling.
3. `src/viewer/Viewer.tsx`: a **generic MJCF renderer**. For each geom, build a three.js mesh from `model.geom_type` / `geom_size`; every frame, set its position and rotation from `data.geom_xpos` / `geom_xmat` (live) or from a recorded `trajectory` (replay: set `qpos`, call `mj_forward`, read the poses).
   - `highlight`: draw the named geoms solid black and every other geom light grey. `exploded`: push each limb out along its mount direction by 0.05 m.
   - Keep it plain for now (design comes later): grey shapes on white, a thin ground grid, an orbit camera, one light. No shadows, colors or post-effects.
4. Also export `<PopulationGrid trajectories={…} fitness={…}/>`: a 4×4 grid of small robots replaying, each shaded from light grey to black by fitness (darker = fitter) with its fitness number underneath. B2 feeds it.
- **Done when:** the fixture drops, settles and stands, and a hand-coded sine gait visibly moves it.
- **Gotcha:** `data.qpos` is a live view into WASM memory. Copy it (`Float64Array.from`) before storing, and don't keep views across `mj_step` calls on a different model.

### B2: Train (1,024 simulations + stress test)
1. `src/sim/worker.ts`: each worker loads MuJoCo once and receives `{xml, params[], record:boolean}`.
   - For each parameter set it runs 10 simulated seconds (2,000 steps). Control: `ctrl = offset + amp·sin(2πft + phase)` per joint, **rate-limited to the servo's `speedRadS × dt`** so it can't move faster than the real servo.
   - It returns fitness, plus the recorded `qpos` at 30 fps when `record` is set.
   - Run `navigator.hardwareConcurrency − 1` workers, created with `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`.
2. `src/sim/es.ts`: a (μ/μ_w, λ) evolution strategy: λ = 64, μ = 16, rank weights, σ starting at 0.3 and decaying ×0.93 per generation, 16 generations = **1,024 runs**.
   - **Symmetry prior** to keep it learnable in 1,024 runs: one shared frequency; hips and knees share amplitude by joint type; phases start from a **trot** (diagonal legs paired) and the strategy learns small phase offsets. That's about 8–10 parameters, not 25.
3. **Fitness** = forward x distance − 0.5·|y drift| − 3·(fell) − 0.002·Σ|Δctrl|. "Fell" = torso height < 40% of its starting height, or torso up-vector z < 0.5.
4. `src/sim/robustness.ts`: the best gait × 50 worlds with friction ∈ [0.5, 1.2], mass ×[0.8, 1.2] and servo torque ×[0.7, 1.0] → `robustness` = share of worlds where it stayed upright and covered more than 50% of the nominal distance.
5. `Simulate.tsx`: the large Viewer replays the current best; the population grid shows 16 of the generation; a run counter animates toward 1,024; `FitnessChart` plots best and mean per generation; then a robustness badge and an **Approve** button that calls `onApprove(TrainResult)`. Also a **Retrain** button.
- **Done when:** the fixture learns a gait that visibly walks forward in under 60 s on this MacBook. **Measure rollouts per second in the first 30 minutes** and adjust λ or generations so training stays under 60 s.

### Stretch (only after checkpoint 2): Claude vision critique, the "it learns to see" moment
After training, B2 captures 4 frames from the canvas (`canvas.toDataURL`). A1 adds `POST /api/critique {spec, frames, trainResult}` → Claude (vision + structured output) returns `{diagnosis, specPatch}`, for example "tips sideways: widen stance 20%, lower the body". Apply the patch, retrain, and show "v2: +38% distance". The design loop closing on its own is the strongest wow moment, but **only build it once the main flow is solid.**

---

## 6. Timeline (built for ~4 h; a 2.5 h version is in §9)

| Time | Both | Person A (a1 + a2) | Person B (b1 + b2) | Checkpoint |
|---|---|---|---|---|
| **0:00–0:20** | Push to GitHub; B clones; both run `pnpm install`, `cp .env.example .env` + key, and `pnpm dev` (stub flow works). Read `shared/spec.ts` together. Each runs `scripts/worktree.sh` ×2 and starts 2 agents. | | | |
| **0:20–1:30** | | a1: streaming design + validator · a2: wiring + firmware + build endpoint on the fixture | b1: mjcf + MuJoCo loader + Viewer (fixture stands) · b2: worker + ES on the fixture, numbers in the console | **CP1 @1:30:** merge everything. A real Claude spec renders and stands. Training improves fitness on the fixture. |
| **1:30–2:45** | | a1: Describe UI (plain), 3 prompts pass · a2: live prices + steps + Build UI with highlights | b1: highlight/exploded + PopulationGrid (black and white) · b2: Simulate UI, chart, robustness, Approve | **CP2 @2:45:** full flow on the hero prompt end to end, **on main**. |
| **2:45–3:30** | Decide go/no-go on stretch | Stretch: critique endpoint · prices cache warmed for the hero prompt | Stretch: frame capture + retrain v2 · performance pass | **CP3 @3:30: FEATURE FREEZE** |
| **3:30–4:00** | Rehearse the 90 s demo 3×. Record a backup video of a perfect run. Write the 3-line pitch. Fix only crashes. | | | Submit |

**Merging (every checkpoint, plus whenever a piece works):** in the lane worktree, run `git fetch && git rebase origin/main && pnpm typecheck && git push origin HEAD:main`. Then in your main folder run `git pull` and click through the whole flow. Never leave main broken; if your push broke it, fix or revert within 5 minutes.

---

## 7. Running agents well

- Start each agent in its worktree with: `claude "Read plan.md and AGENTS.md. You own lane <x>. Start with its first numbered task."`
- Give each agent **one numbered task at a time** from §5, and check it in the browser before giving the next.
- The human owns merges and the contract. Agents never edit files outside their lane (AGENTS.md says so).
- Each lane runs on its own ports (a1 5174, a2 5175, b1 5176, b2 5177; API ports 8788–8791), so all four dev servers can run at once.
- If an agent loops for more than 10 minutes on one bug, stop it, cut the feature to its fallback (§8) and move on.

---

## 8. Risks and fallbacks (decide quickly, don't debug for an hour)

| Risk | Detect by | Fallback |
|---|---|---|
| MuJoCo WASM has trouble in Vite or workers | B1/B2 in the first 30 min | Load it from `public/` with a plain URL; if it still fails, switch to Rapier (`@dimforge/rapier3d-compat`, already installed; revolute joints with motors). Same contract, so nothing else changes. |
| Training doesn't produce a walk in 1,024 runs | b2 at CP1 | Stronger trot prior, fewer parameters, or more generations. Last resort: seed with a known-good hand-tuned gait and present training as "fine-tuning". |
| Claude design is slow or invalid on stage | a1 | Pre-warm the hero prompt; the validator fixes or upgrades in code; keep `fixtures/quadruped.json` as a "demo mode" switch. |
| Web search slow or failing | a2 | `prices-cache.json` warmed before the demo; badge shows "cached". |
| Venue Wi-Fi dies | — | Run locally (default). Demo mode with fixtures + cached build plan. Backup video. |

Deploying to Vercel is a **stretch goal**. Demo from localhost; you control it.

---

## 9. If you only have ~2.5 hours, cut in this order
1. Vision critique (stretch). 2. Population grid: replay the best robot only. 3. Live web search: use catalog prices plus store search links. 4. Hexapod template: quadruped only. 5. Exploded view: highlight only.
**Never cut:** Claude design → 3D → training counter + walking replay → approve → parts list + firmware download. That chain *is* the product.

---

## 10. How this scores

- **Technical execution (50%)**:
  - Real physics (MuJoCo) with real servo limits.
  - Parallel workers running 1,024 simulations.
  - An evolution strategy with a symmetry prior.
  - A stress test with randomized physics (the same technique NVIDIA uses to make simulated skills work on real robots).
  - Claude structured outputs plus a code validator with a repair loop.
  - Prompt caching.
  - Deterministic firmware.
  - Say all of this in the pitch: judges score what they hear.
- **Creativity / wow (30%)**: 16 robots learning on screen at once; reasoning streaming live; the exploded build guide; the vision-critique v2 if built. **Physical finale:** if either of you has an ESP32 + PCA9685 + 8 servos, pre-build the fixture robot *Pip* out of foam board before the build window if the rules allow (or during the last hour) and flash the generated `.ino` on stage. Even one leg moving on cue lands well.
- **Real-world use (20%)**: schools and makerspaces (robotics without a $10k GPU), hackathons (a buildable plan in minutes), and anyone wanting to test before buying parts. The open contract means new templates (rover, arm) are plugins. Lines for the pitch: *"NVIDIA showed this needs three computers. We do it in one browser tab."* and *"Tested 1,024 times before you spend a dollar."*

---

## 11. Checklist (tick as you merge to main)

- [ ] 0 Repo on GitHub, both clones run the stub flow, 4 worktrees + agents up
- [ ] A1.1 Streaming design endpoint returns a valid spec
- [ ] A1.2 Validator + one repair call + servo upgrade in code
- [ ] A1.3 Describe UI with live reasoning + example chips
- [ ] A2.1 Wiring + firmware generator (fixture → `.ino`)
- [ ] A2.2 Build endpoint: steps + prices (live or cached)
- [ ] A2.3 Build UI: parts / guide with 3D highlight / wiring / download
- [ ] B1.1 spec → MJCF; fixture stands in MuJoCo
- [ ] B1.2 Viewer: live + replay, highlight, exploded
- [ ] B1.3 PopulationGrid (black and white)
- [ ] Later, after the hackathon build works: full design pass (the plan's black and white rule ends here)
- [ ] B2.1 Workers + ES: fitness rises on the fixture (rollouts/s measured: ___)
- [ ] B2.2 Simulate UI: counter, chart, best replay, grid
- [ ] B2.3 Stress test + Approve → TrainResult
- [ ] CP2 Full hero flow on main
- [ ] Stretch: vision critique → v2 retrain
- [ ] Hero prompt pre-warmed, demo mode works offline, backup video recorded
