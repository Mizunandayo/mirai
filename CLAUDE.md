# CLAUDE.md — Mirai Project Depth Details
## Transforming Enterprise Through AI Hackathon | May 11–19, 2026

> This file is for AI assistants (Claude, Copilot, etc.) to quickly understand the full project context without reading multiple files.

---

## IDENTITY

- **Project:** Mirai (未来 — "Future")
- **Developer:** Francis Daniel (GitHub: Mizunandayo, handle: Mizu)
- **Hackathon:** Transforming Enterprise Through AI by lablab.ai
- **Tracks:** Track 3 — Robotics & Simulation (prize-eligible) + Gemini Award (partner award — can win both)
- **Prize Target:** $2,000–$5,000 (Track 3) + Gemini Award (Best Gemini Integration)
- **Hard Deadline:** May 19, 2026 — 8:00 AM PST (Philippine Standard Time)
- **Venue:** San Jose McEnery Convention Center, CA, USA (live demo)
- **Repo:** https://github.com/Mizunandayo/mirai
- **Submission platform:** lablab.ai

---

## WHAT MIRAI DOES

Browser-based AI-powered robot arm simulator that makes robotics accessible to everyone — zero install, zero coding required.

**Core flow:**
1. User designs a robot arm in 3D (segment panel, gripper library, joint config)
2. Types or speaks a task in plain English ("pick up socks and fold them into the drawer")
3. Gemini AI generates the motion program as visual blocks (React Flow)
4. Rapier WASM physics engine simulates at 60fps in the browser
5. MuJoCo (server-side) validates accuracy and predicts servo lifespan
6. User downloads Arduino `.ino` / Python `.py` code + BOM to build for under $300

**The key differentiator:** Zero setup, natural language input, real physics validation, community task sharing, bridge to real hardware — all in one browser tab.

---

## ACTUAL DAY PROGRESS

| Day | Date | Blueprint Plan | What Was Actually Done |
|---|---|---|---|
| 1 | May 11 | Foundation + 3D Engine | ✅ Scaffold created: package.json, vite.config.js, tsconfig.json, index.html, tailwind.config.js, ArmViewer.tsx, RobotArm.tsx, App.tsx, atoms.ts, server/main.py, server/requirements.txt — npm install NOT yet run |
| 2 | May 12 | Arm Design Studio | 🔄 In Progress — implementation guide written, Mizu coding now |
| 3 | May 13 | Task Editor (React Flow) | ❌ Not Started |
| 4 | May 14 | Physics Simulation (Rapier) | ❌ Not Started |
| 5 | May 15 | Gemini AI Integration | ❌ Not Started |
| 6 | May 16 | Backend + MuJoCo + Export | ❌ Not Started |
| 7 | May 17 | Community + Famous Preloads | ❌ Not Started |
| 8 | May 18–19 | Polish + Demo Prep + Submit | ❌ Not Started |

**⚠️ STATUS:** Implementation guide written for Day 2. Mizu is coding the files. See Day 2 task list for exact files to create/rewrite.

---

## FULL TASK LIST (by day)

### Day 1 (May 11) — Foundation + 3D Engine ✅ Partial

- ✅ GitHub repo created: `github.com/Mizunandayo/mirai`
- ✅ `package.json` — all frontend deps declared
- ✅ `vite.config.js`, `tsconfig.json`, `index.html`
- ✅ `tailwind.config.js`, `.gitignore`, `README.md`, `.env.example`
- ✅ `backend/.env` — GEMINI_API_KEY, JWT_SECRET, DATABASE_URL
- ✅ `server/requirements.txt` — mujoco>=3.1.0 (upgraded from PyBullet)
- ✅ `src/components/ArmViewer.tsx` — R3F canvas, OrbitControls, Physics wrapper, Grid
- ✅ `src/components/RobotArm.tsx` — base cylinder, 2 segments, end-effector sphere
- ✅ `src/App.tsx` — root component with ArmViewer mounted
- ✅ `src/store/atoms.ts` — Jotai atoms: armSegments, gripper, task, simulation, community, Gemini state
- ✅ `server/main.py` — FastAPI skeleton, CORS, health check + Gemini key status
- ❌ `npm install --legacy-peer-deps` — run this first
- ❌ `pip install -r server/requirements.txt`
- ❌ `git init` + push to remote
- ❌ `isAdvancedModeAtom` not added to `atoms.ts`
- ❌ Segment click-to-select highlight not coded

### Day 2 (May 12) — Arm Design Studio 🔄 TODAY

**Carry-overs (terminal commands first):**
- ❌ `npm install --legacy-peer-deps`
- ❌ `pip install -r server/requirements.txt`
- ❌ `git init ; git remote add origin https://github.com/Mizunandayo/mirai.git ; git add . ; git commit -m "feat: Day 1 scaffold" ; git push -u origin main`
- ❌ `npm run dev` → confirm app renders at localhost:5173

**Config fixes (before any new code):**
- ❌ `vite.config.js` — rewrite to use `@tailwindcss/vite` plugin (v4 native)
- ❌ `src/index.css` — NEW: `@import "tailwindcss"` + `@theme {}` design tokens
- ❌ `src/main.tsx` — import `./index.css`

**New files to create:**
- ❌ `src/types/arm.ts` — ArmSegment, GripperConfig, BOMItem, ValidationResult types
- ❌ `src/store/atoms.ts` — REWRITE: fully typed, add isAdvancedModeAtom, selectedSegmentIdAtom
- ❌ `src/utils/armPhysics.ts` — torque/reach calc + validateArm()
- ❌ `src/utils/bomPricing.ts` — static BOM lookup + getTotalBOMCost()
- ❌ `src/utils/armExport.ts` — exportArmConfig() + parseArmConfig() + loadArmConfigFromFile()
- ❌ `src/components/ReachEnvelope.tsx` — wireframe reach sphere in R3F
- ❌ `src/components/JointArcOverlay.tsx` — joint limit arc for selected segment
- ❌ `src/components/arm-designer/BOMCounter.tsx` — live cost counter with expandable BOM
- ❌ `src/components/arm-designer/SegmentList.tsx` — add/remove/edit segments panel
- ❌ `src/components/arm-designer/GripperLibrary.tsx` — 3 gripper types with controls
- ❌ `src/components/arm-designer/ValidationPanel.tsx` — torque/reach validation display
- ❌ `src/components/arm-designer/ArmDesignerPanel.tsx` — composes all sidebar sections

**Full rewrites:**
- ❌ `src/components/RobotArm.tsx` — dynamic segments from atoms, click-to-select
- ❌ `src/components/ArmViewer.tsx` — lights, shadows, ReachEnvelope, JointArcOverlay
- ❌ `src/App.tsx` — full 3-zone layout (header + sidebar + viewport + statusbar)
- ❌ `src/App.css` — full engineering-workstation design system

**Deliverable:** Full arm designer live in browser. BOM counter shows live total. Reach envelope and joint arcs toggle in viewport.

### Day 3 (May 13) — Task Editor (React Flow)

- ❌ React Flow canvas with custom node types
- ❌ MOVE node — x/y/z/speed inputs + 3D ghost preview in R3F viewport
- ❌ GRIP node — open/close/force inputs
- ❌ WAIT node — ms delay input
- ❌ LOOP node — count + nested blocks
- ❌ IF node — condition string + then/else branches
- ❌ Live 3D ghost arm preview as blocks are placed
- ❌ Export task as portable JSON file
- ❌ Error highlighting — red nodes (impossible coords), yellow (near-limit)
- ❌ Keyboard shortcuts: Ctrl+S (save), Ctrl+Z (undo), Space (simulate), Delete (remove node)

**Deliverable:** Visual task programmer that exports valid task JSON.

### Day 4 (May 14) — Physics Simulation (Rapier WASM)

- ❌ Rapier rigid body per arm segment (Box + Cylinder colliders)
- ❌ Joint constraints — revolute (rotating), prismatic (sliding)
- ❌ Task executor — reads task JSON blocks, drives simulation frame-by-frame
- ❌ Playback controls — play / pause / rewind / step-frame / speed 0.25x–4x
- ❌ Timeline scrubber — click any frame to jump
- ❌ Joint angle HUD — J1–J5 angles + gripper state live during playback
- ❌ Physics metrics panel — torque, velocity, acceleration per joint
- ❌ Collision highlight — red mesh flash + auto-rewind to collision frame
- ❌ Path trail — glowing trajectory line behind end-effector
- ❌ Environment objects — table, shelf, box, sock pile, drawer

**Deliverable:** Smooth 60fps physics simulation. Collision detection working.

### Day 5 (May 15) — Gemini AI Integration 🏆 CRITICAL DAY

**Core AI:**
- ❌ FastAPI `POST /ai/plan` endpoint — Gemini Flash integration
- ❌ Arm-aware prompt construction (injects arm specs into every call)
- ❌ Structured JSON output parsing + validation
- ❌ Auto-populate React Flow canvas from Gemini-returned task JSON
- ❌ Conversational refinement — "make it slower at step 3"
- ❌ Gemini Pro error diagnosis — plain English failure explanation
- ❌ Loading states + streaming indicator + error handling

**Gemini Award Critical Features:**
- ❌ **Voice input** — record audio → Gemini multimodal → task program (demo wow moment)
- ❌ **AI confidence score badge** — "87% confident — J3 near limit at step 4"
- ❌ **Side-by-side mode** — simulation left, live generated code right, synced
- ❌ **Pre-flight safety check** — Gemini audits task + [Fix All with AI] one-click repair
- ❌ **Agentic ReAct loop** — Think→Act→Observe for complex multi-step tasks 🏆
- ❌ **ReAct UI panel** — visible sidebar showing live agent thinking steps 🏆
- ❌ **Natural language arm designer** — "arm reaching 1.2m that lifts 500g" → full config

**Deliverable:** Voice → ReAct loop → pre-flight → confidence score → simulation. Judges MUST see the agent think.

### Day 6 (May 16) — Backend + MuJoCo + Export

**Backend & Physics:**
- ❌ FastAPI backend deployed to Railway (Docker)
- ❌ WebSocket `WS /ws/simulate` — MuJoCo frame streaming
- ❌ MuJoCo MJCF/URDF builder from arm config
- ❌ Task executor in MuJoCo (same task JSON as Rapier)
- ❌ Accuracy comparison badge ("94% accurate") in UI
- ❌ **Physics side-by-side replay** — Rapier (left) vs. MuJoCo (right), divergence frames in red
- ❌ **Servo lifespan predictor** — torque data → predicted hours per joint

**Export:**
- ❌ Jinja2 code gen — Arduino `.ino` + Python `.py` templates (NOT LLM — deterministic)
- ❌ BOM generator from arm config with live AliExpress/Amazon pricing
- ❌ URDF export (ROS2-compatible)
- ❌ **QR code generator** — scan → hosted BOM + code page instantly
- ❌ **Signed export** — SHA-256 hash header in every downloaded file
- ❌ ZIP bundle — code + BOM + wiring diagram in one `.zip`

**Deliverable:** Dual physics live. Servo lifespan shown. Signed downloads. Judges scan QR on stage.

### Day 7 (May 17) — Community + Famous Preloads + Bonus

**Community (browse-only, no auth needed):**
- ❌ Browse page — grid with 3D mini-previews
- ❌ One-click import — Gemini adapts community task to YOUR arm + compatibility %
- ❌ Seeded library — 12 tasks (sock folding, mail sorting, box packing, etc.)

**Famous Preloads (high demo impact):**
- ❌ Boston Dynamics inspection task
- ❌ Tesla Optimus box-stacking task
- ❌ Toyota laundry folding task

**Quality:**
- ❌ Full E2E test: design → voice → pre-flight → simulate → side-by-side → export → QR
- ❌ 60fps confirmed on mid-range hardware

**Bonus (only if Day 5–6 ahead):**
- ❌ WebSerial live control (5h) — browser → Arduino USB → real servo moves on stage
- ❌ GIF simulation export (2h) — one-click animated GIF

### Day 8 (May 18–19) — Polish + Demo Prep + Submit

**Testing:**
- ❌ Full E2E test
- ❌ Verify SHA-256 hash in downloaded `.ino`
- ❌ 60fps confirmed on mid-range laptop (venue machine)
- ❌ Voice input tested on demo hardware + fallback confirmed

**Deployment:**
- ❌ Frontend → Vercel (production URL)
- ❌ FastAPI → Railway (production URL, Docker)
- ❌ Sentry error tracking on both
- ❌ Demo mode — "sock folding" pre-loaded as landing state

**Submission:**
- ❌ Record 2-min demo video (design → voice → pre-flight → simulate → side-by-side → QR)
- ❌ Slide deck (5 slides: problem → solution → demo → market → impact)
- ❌ README.md final pass — screenshots + live demo link
- ❌ Repo cleanup — no `.env`, no `node_modules`, no debug logs
- ❌ **Submit to lablab.ai before 8:00 AM PST May 19** ← HARD DEADLINE

---

## TECH STACK

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Frontend | React + TypeScript strict | 19 / 6.0 | |
| 3D | React Three Fiber + @react-three/drei | 8.16 / 9.120 | |
| Client physics | @react-three/rapier (Rapier WASM) | 0.12 | 60fps in-browser |
| Server physics | MuJoCo | 3.x | Server-side validation only |
| AI | Gemini 2.0 Flash + Gemini 2.0 Pro | — | Flash = fast text/voice; Pro = ReAct planning |
| AI SDK | @google/generative-ai | 0.21.0 | |
| Visual programming | reactflow | 12 | Listed as `reactflow` in package.json |
| State | Jotai | 2.19 | |
| Backend | FastAPI | 0.115 | |
| Code export | Jinja2 | 3.1.4 | Deterministic — NOT LLM |
| Database | SQLite + SQLAlchemy | 2.0 | |
| Styling | TailwindCSS v4 + Framer Motion | 4.2 / 12 | |
| Build | Vite | 7 | Port 5173 (strictPort) |
| Deploy | Vercel (frontend) + Railway (backend) | — | |
| Desktop wrapper | Tauri v2 | 2 | Web-first for demo |

---

## FILE STRUCTURE (current state)

```
mirai/
├── CLAUDE.md                    # This file
├── MIRAI_BLUEPRINT.md           # Full design blueprint (v2.0)
├── MIRAI_SESSION_CONTEXT.md     # Session context / operational notes
├── package.json                 # All frontend deps declared (npm install NOT yet run)
├── vite.config.js               # Vite 7, port 5173 strictPort, TailwindCSS via postcss
├── tsconfig.json                # TypeScript strict
├── tailwind.config.js           # Tailwind config
├── index.html                   # Entry HTML
├── README.md                    # Project README
├── backend/
│   └── .env                     # GEMINI_API_KEY, JWT_SECRET, DATABASE_URL (gitignored)
├── server/
│   ├── main.py                  # FastAPI skeleton — CORS, health check, Gemini key check
│   └── requirements.txt         # fastapi, uvicorn, mujoco>=3.1.0, google-generativeai, jinja2, sqlalchemy...
└── src/
    ├── App.tsx                  # Root component — ArmViewer mounted, gray-900 layout
    ├── App.css
    ├── main.tsx                 # React entry point
    ├── components/
    │   ├── ArmViewer.tsx        # R3F Canvas, OrbitControls (autoRotate), Physics wrapper, Grid, lights
    │   └── RobotArm.tsx         # Static 3-segment arm: base cylinder + 2 boxes + end-effector sphere
    └── store/
        └── atoms.ts             # Jotai atoms: armSegments(3), gripper, taskBlocks, simulationFrames, community, gemini
```

**Files that can be deleted:**
- `convert_blueprint.py` — one-time utility, no longer needed
- `MIRAI_BLUEPRINT.html` — PDF conversion artifact, no longer needed

---

## CURRENT BUILD STATUS

| Component | Status | Notes |
|---|---|---|
| package.json | ✅ Complete | All deps declared |
| npm install | ❌ NOT RUN | Run `npm install --legacy-peer-deps` first |
| vite.config.js | ✅ Created | Port 5173 |
| tsconfig.json | ✅ Created | Strict mode |
| tailwind.config.js | ✅ Created | |
| index.html | ✅ Created | |
| src/App.tsx | ✅ Scaffold | ArmViewer mounted, needs full layout |
| src/App.css | ✅ Exists | |
| src/store/atoms.ts | ✅ Scaffold | Placeholder atoms — need proper typing + isAdvancedModeAtom |
| src/components/ArmViewer.tsx | ✅ Scaffold | R3F canvas works, Physics disabled for now |
| src/components/RobotArm.tsx | ✅ Scaffold | Static mesh — not interactive yet |
| server/main.py | ✅ Scaffold | Health check only — no AI endpoints yet |
| server/requirements.txt | ✅ Complete | MuJoCo 3.x included |
| pip install | ❌ NOT RUN | |
| git init + push | ❌ NOT RUN | |
| App renders in browser | ❌ UNTESTED | Blocked by npm install |

---

## GEMINI SETUP

- **One API key** covers all models — `GEMINI_API_KEY` in `backend/.env`
- `gemini-2.0-flash` → real-time text/voice arm design (fast, cheap)
- `gemini-2.0-pro` → multi-step motion planning via ReAct loop (smart, deep reasoning)
- Free tier sufficient for the entire hackathon (solo, 8 days, low volume)
- SDK: `@google/generative-ai` v0.21.0 (frontend) + `google-generativeai` 0.21.0 (backend)

---

## ARCHITECTURE

```
Browser (React + Vite)
  → ArmViewer (React Three Fiber + Rapier WASM)
    → 60fps physics simulation — NO server round-trip
  → Task Editor (React Flow)
    → Visual block programming → task JSON
  → Gemini AI (frontend SDK or via FastAPI)
    → Text/voice → task JSON → populates React Flow
    → ReAct agent loop (Think→Act→Observe)
  → FastAPI backend (server/main.py → Railway)
    → POST /ai/plan — Gemini orchestration
    → WS /ws/simulate — MuJoCo frame streaming
    → GET /export/code — Jinja2 Arduino/Python generation
    → GET /export/bom — Bill of Materials with pricing
    → MuJoCo (Python) validates Rapier simulation
      → Accuracy badge ("94% accurate")
      → Servo lifespan prediction
```

### Dual Physics Strategy
- **Rapier (client):** 60fps real-time, interactive, instant feedback
- **MuJoCo (server):** High-fidelity validation run after task is designed
- UI shows: `"Rapier ✅ 94% accurate | MuJoCo validated"`
- Side-by-side replay: Rapier left, MuJoCo right, divergence frames in red

### Gemini Integration Strategy
- **Single prompt:** text → task JSON (fast path)
- **ReAct loop:** complex tasks → agent iterates Think→Act→Observe until satisfied
- **Multimodal voice:** Web Audio API → Gemini audio input → task JSON
- **Arm-aware:** every prompt injects current arm config (segments, joint limits, reach)

---

## KEY ENGINEERING DECISIONS

| Decision | Rationale |
|---|---|
| Rapier WASM in-browser | 60fps with zero server latency — feels like a game engine |
| MuJoCo server-side only | Python-only, can't run in browser; used for validation not real-time |
| Jinja2 for code export | Deterministic output — LLM hallucinations are dangerous in hardware code |
| React Flow for task editor | Purpose-built for node graphs; drag/drop + custom nodes out of the box |
| Jotai for state | Atomic model maps cleanly to arm segments, task blocks — granular re-renders |
| `@google/generative-ai` SDK | Official Google SDK, handles streaming, multimodal, function calling |
| Web-first (not Tauri-first) | Demo runs at a Vercel URL — judges don't install anything |
| `--legacy-peer-deps` | reactflow v12 has peer dep conflicts with React 19 — flag resolves it |

---

## LOCAL COMMANDS

```powershell
# Install all dependencies (MUST run first)
npm install --legacy-peer-deps

# Start dev server → http://localhost:5173
npm run dev

# Build production bundle
npm run build

# Start FastAPI backend (port 8000)
cd server
pip install -r requirements.txt
python main.py

# Git init and first push (Day 1 carry-over)
git init
git remote add origin https://github.com/Mizunandayo/mirai.git
git add .
git commit -m "init: Mirai scaffold v2.0"
git push -u origin main
```

---

## DEPLOYMENT

| Service | Target | Command |
|---|---|---|
| Frontend | Vercel | `vercel --prod` from project root |
| Backend | Railway | Docker container from `server/` |
| Backend Dockerfile | TBD Day 6 | `FROM python:3.12-slim` + `pip install -r requirements.txt` |

---

## SECURITY NOTES

- ⚠️ `GEMINI_API_KEY` is in `backend/.env` — **NEVER COMMIT**
- `.gitignore` covers: `.env`, `node_modules/`, `dist/`, `__pycache__/`, `*.pyc`
- FastAPI CORS is currently `allow_origins=["*"]` — tighten to Vercel domain before deployment
- `python-jose` included for JWT — use for future auth endpoints only
- Signed export uses SHA-256 (not LLM-generated) — deterministic, verifiable

---

## PRIZE STRATEGY

1. **Track 3 — Robotics & Simulation:** Dual physics (Rapier + MuJoCo), 60fps, BOM-to-reality bridge
2. **Gemini Award:** Voice input + ReAct agent with visible Think/Act/Observe UI panel + multimodal image input
3. **Demo wow moments for judges:**
   - Speak a task aloud → arm moves in 3 seconds
   - Visible agent thinking sidebar (ReAct loop streaming live)
   - Scan QR code on stage → BOM + code on phone instantly
   - Dual physics side-by-side replay with divergence highlighting
   - Servo lifespan predictor ("J2 will fail in ~180hrs at this load")
