# MIRAI — MASTER BLUEPRINT v2.0
## Transforming Enterprise Through AI Hackathon | May 11–19, 2026
### Accessible AI-Powered Robot Arm Simulator + Community Task Marketplace

> **Project Name:** Mirai (未来 — "Future")
> **Track:** Track 3 — Robotics & Simulation
> **AI Engine:** Gemini 2.5 Flash (primary) via Google AI Studio — fallback chain: 2.5-flash-lite → 2.0-flash → 1.5-flash
> **Physics Engine:** Rapier.js (WASM, client 60fps) + MuJoCo (server-side validation, Google/DeepMind standard)
> **Deadline:** May 19, 2026 — Live Demo at AI & Big Data Expo North America
> **Venue:** San Jose McEnery Convention Center, CA, USA
> **Team:** Solo
> **Prize Target:** Track 3 Winner ($2,000–$5,000)
> **Blueprint Version:** v2.0 — updated May 12, 2026 (scope tightened, MuJoCo upgrade, multimodal AI added)

---

## TABLE OF CONTENTS

1. [What is Mirai?](#what-is-mirai)
2. [The Problem It Solves](#the-problem-it-solves)
3. [Real-World Application](#real-world-application)
4. [Complete Feature Set](#complete-feature-set)
5. [Full Tech Stack — 32 Technologies](#full-tech-stack)
6. [System Architecture](#system-architecture)
7. [System Design Deep Dive](#system-design-deep-dive)
8. [Engineering Decisions & Trade-offs](#engineering-decisions-and-trade-offs)
9. [Tech Stack Pros & Cons](#tech-stack-pros-and-cons)
10. [8-Day Build Timeline](#8-day-build-timeline)
11. [UI/UX Page Visualizations](#uiux-page-visualizations)
12. [Wow Factor Analysis](#wow-factor-analysis)
13. [Why Hire This Engineer](#why-hire-this-engineer)
14. [Judge Pitch](#judge-pitch)
15. [Submission Checklist](#submission-checklist)
16. [Risk Register](#risk-register)
17. [Business Model](#business-model)
18. [Pre-Hackathon Setup](#pre-hackathon-setup)

---

## DAILY PROGRESS TRACKER

> **Today:** Sunday, May 18, 2026 (Day 8 of 8) | **Deadline:** Monday, May 19, 2026 — 8:00 AM PST (Philippine Standard Time)
> **Legend:** ✅ Done &nbsp; ❌ Not Started &nbsp; 🔄 In Progress (today)
> **STATUS: Days 1–7 complete. Day 8 is the final push — deploy, demo video, submit.**

---

## UPDATED DAILY TASKS (AUTHORITATIVE)

### Detailed Daily Task Snapshot (May 17, 2026)

### Day 1 — Foundation + 3D Engine
✅ GitHub repo created and initial scaffold completed
✅ Frontend package setup completed
✅ Vite, TypeScript, Tailwind, index, gitignore, env example configured
✅ Backend environment and requirements prepared
✅ Base 3D viewer scene mounted
✅ Base robot arm component created
✅ Root app shell wired
✅ Jotai state atoms initialized
✅ FastAPI skeleton with health and Gemini key check added
✅ Dependency install flow completed
✅ Initial git push completed
✅ Advanced mode atom added
✅ Segment click-to-select highlight wiring completed

### Day 2 — Arm Design Studio
✅ Arm segment editor built with add/remove/edit controls
✅ Gripper library built with parallel jaw, suction, magnetic options
✅ Reach envelope visualization added
✅ Joint arc overlay visualization added
✅ Arm validation pipeline added
✅ BOM counter added with live cost calculation
✅ Save and load arm config implemented
✅ Arm viewer upgraded with proper lighting, shadows, controls
✅ App layout upgraded to full designer workspace
✅ Panel UX polish completed (topbar, toolbar, tab flow)
✅ Camera reset and viewport hint UX added
✅ Panel resize behavior added
✅ TypeScript clean build verified

### Day 3 — Task Editor (React Flow)
✅ Task graph schema and core task types created
✅ Scene registry for default objects and zones created
✅ Task editor atoms added
✅ Task validation utility added
✅ Task export/import utility added
✅ Start node implemented
✅ End node implemented
✅ Move node implemented
✅ Grip node implemented
✅ Wait node implemented
✅ Loop node implemented
✅ If node implemented
✅ Deletable edge component implemented
✅ Node palette implemented
✅ Flow canvas and provider architecture completed
✅ Undo history support added
✅ Keyboard shortcuts added (export and undo)
✅ Drag/drop and click-to-add flow completed
✅ Local persistence across tab change added
✅ Local persistence across full page reload added
✅ Clear-all flow with confirmation added

### Day 4 — Physics Simulation (Rapier)
✅ Forward kinematics utility completed
✅ Inverse kinematics utility completed
✅ Motion compiler pipeline completed
✅ Simulation atoms and playback state model completed
✅ Scene object physics bodies completed
✅ Simulated arm articulation completed
✅ Path trail visualization completed
✅ Simulation viewer and playback runner completed
✅ Playback controls completed (play, pause, rewind, speed, jump)
✅ Loop, reverse, collision pause behavior completed
✅ Timeline scrubber with markers completed
✅ Joint HUD completed
✅ Physics metrics panel completed
✅ Teach mode manual control completed
✅ PTP point stack and play-all completed
✅ Transport and teach interlock behavior completed
✅ Collision logic upgraded to arm-link collision detection
✅ Persistent collision highlight polish completed
✅ Frame-0 baseline reset behavior completed

### Day 5 — Gemini AI Integration
✅ AI workflow consolidated into task editor panel
✅ Generate motion grounded on current scene and arm state
✅ AI Results panel with confidence/safety/reachability/pickability
✅ AI actions exposed (fix, suggestions, think trace, auto-config)
✅ Empty-plan guard added
✅ Normalization and schema hardening added
✅ Deterministic preflight collision/reach validation added
✅ Bounded repair loops added for invalid plans
✅ Suggest endpoint integrated
✅ Target consistency validation added
✅ Startup self-test and port conflict handling added
✅ Auto handoff to simulation after successful generation
✅ Task flow load acknowledgement before navigation
✅ Fail-closed behavior for unresolved blocking errors
✅ Execution gate state model added (idle/verify/ready/blocked)
✅ Gate diagnostics exposed in AI Results
✅ E2E autonomy regression skeleton added
✅ Canonical target-name normalization added
✅ Deterministic fallback plan generation added
✅ Repair loop fail-soft UI behavior added
✅ Collision handling default refined
✅ Playback compile scene snapshot freeze behavior added
✅ Dynamic object baseline restore contract refined
✅ Direct Gemini browser integration added
✅ Model fallback chain added
✅ Scene planner and feasibility analysis completed
✅ IK conditioning auto-scale and destination reach checks completed
✅ Volumetric collision widening and joint housing checks completed
✅ Obstacle-aware approach strategy added
✅ Task editor mount persistence to preserve AI state completed

### Day 6 — Backend + MuJoCo + Export
✅ FastAPI deployment pipeline completed
✅ MuJoCo websocket simulation stream completed
✅ MJCF/URDF build pipeline completed
✅ Shared execution contract across Rapier and MuJoCo completed
✅ Accuracy/divergence validation pipeline completed
✅ Servo lifespan predictor completed
✅ Deterministic Arduino export completed
✅ Deterministic Python export completed
✅ BOM export generation completed
✅ URDF export completed
✅ Signed export — SHA-256 hash headers
✅ ZIP bundle with code + BOM + wiring diagram + URDF + manifest
✅ Export pipeline fully working: `/export/preview`, `/export/bundle`, `/export/code`, `/export/bom`, `/export/urdf`
✅ Python export template created: `server/export/templates/python_control.py.j2`
✅ Bundle filename sanitization (ASCII-safe slug for HTTP headers)
✅ Bundle ZIP internal paths sanitized (Windows extraction-safe, fixes 0x80070057 error)
✅ Live deployment verified: Vercel (200 OK), Railway (200 OK + Gemini key loaded)
✅ Day 7 COMPLETE — Community + Famous Preloads + Presets (see Day 7 section below)
✅ Model auto-fallback: gemini-2.5-flash → 2.0-flash → 1.5-flash on 404/deprecated errors
✅ scenePlanner.ts — single source of truth for collision-free waypoint geometry
✅ normalizeTaskCoordinates — post-processes Gemini output with scene-planner safe coords
✅ computeObstacleAwareApproach — detects elevated shelf blocking pickup path, adds Z-avoidance waypoint
✅ analyzeTaskFeasibility — pickup-ok / deposit-impossible detected as distinct infeasibility case
✅ CRITICAL resolveTarget bug fixed: explicit x/y/z now always override scene lookup (was causing 919-1328 collision frames)
✅ armConfigOptimizer.ts: IK conditioning (ratio<0.33→auto-scale), destination reachability, arm extend
✅ Fully automatic arm reconfiguration — user clicks Generate, AI handles all arm/gripper config
✅ Regression-confirmed: Box B IK ratio 0.321 (fail) → auto-scale → 0.440 (succeed)
✅ Volumetric collision detection: LINK_COLLISION_RADIUS 2.2→4.5cm, JOINT_HOUSING_RADIUS 6.5cm, 32 samples
✅ checkJointHousings() — sphere collision checks at every articulated joint housing
✅ Surface collision rule fixed: only work table skipped; elevated shelf IS checked as real obstacle
✅ Specific infeasibility error messages with object names, distances, and actionable fixes
✅ AI Results UI redesigned: air-* namespace, status banner, 3-col metric chips, disclosure tabs
✅ TaskEditorPanel always-mounted (display:none on other tabs) — AI state survives navigation
✅ commitTask ACK timeout fixed — valid tasks never show false "Plan blocked"
✅ Shelf height increased: 0.02 → 0.08m (centre at Y=0.3 unchanged); zone-shelf Y: 0.32 → 0.35
✅ regression_test.py + regression_test_boxb.py added

### Day 7 — Community + Famous Preloads + Presets ✅ COMPLETE (May 17–18, 2026)
✅ Community browse/import flow — CommunityBrowse.tsx, TaskPreviewCard.tsx, Library 5th nav tab
✅ 11 seeded community tasks in communityTasks.ts with proven scene-planner waypoints
✅ Famous preloads — Boston Dynamics (Inspection Traverse), Tesla Optimus (Box Stack Assembly), Toyota Research (Laundry Fold Demo)
✅ Real robot preset skins — RobotPresetSelector.tsx with UR5 (850mm), KUKA KR6 (706mm), ABB IRB 1200 (700mm)
✅ End-to-end quality pass — production build clean (852 modules, zero TS errors), all code paths verified
✅ 60fps verification — no-op write guard, PCFShadowMap, MAX_LINK_SWEEP_COLLISIONS=150, no regressions

### Day 8 — Polish + Demo Prep + Submit 🔄 IN PROGRESS (May 18–19, 2026)
✅ Simulation playback completion reset fixed — sceneResetTrigger fires on status='complete' so objects return to default positions when playback ends naturally
✅ Gemini API key dialog — popup appears before Generate motion when no key is stored; key saved to localStorage; full error handling (invalid/quota/network/auth errors re-open dialog with specific messages)
✅ Backend token gate — MIRAI_API_TOKEN env var; X-Mirai-Token header validated on /ai/plan, /ai/repair, /ai/suggest; 401 on missing/wrong token
✅ X-Forwarded-For IP fix — _get_client_ip() reads proxy headers for correct per-IP rate limiting behind Railway
✅ VITE_GEMINI_API_KEY removed from Vercel env (no longer baked into JS bundle)
✅ MIRAI_API_TOKEN set on Railway + VITE_MIRAI_API_TOKEN set on Vercel
✅ All Gemini Award / prize-eligible references removed from CLAUDE.md, BLUEPRINT.md, SESSION_CONTEXT.md, README.md, slides
✅ mirai-deck.html created — 7-slide PDF presentation (Cover, Problem, Solution, Features, Market/TAM, Revenue Streams, Scalability Roadmap) with CSS triangle funnel, illustrated revenue cards, horizontal timeline
✅ miraistaticpage Revenue.jsx + Roadmap.jsx created — business model + future prospects sections with visual cards, timeline, conversion flow
✅ miraistaticpage content audit — fixed Gemini model names (2.0-pro → 2.5-flash), task count 12→11, fallback chain corrected
✅ miraistaticpage deployed to GitHub docs/ folder; Vercel project configured as canonical deployment
✅ MIRAI_BLUEPRINT.md duplicate Day 6 section (×55) cleaned up — single authoritative copy retained; line count reduced from 2749 to ~260
❌ Record 2-min demo video (design → voice → pre-flight → simulate → export)
❌ Full browser E2E walkthrough: Design → Library → Tasks → Simulate → Export
❌ README.md final pass — screenshots + live Vercel URL + Railway backend URL
❌ Repo cleanup — no .env committed, no node_modules, no debug console.log
❌ Submit on lablab.ai before May 19, 2026 — 8:00 AM PST ← HARD DEADLINE




















































### Day 7 — Community + Famous Preloads + Presets ✅ COMPLETE
✅ FastAPI backend deployed on Railway and healthy
✅ WebSocket `/ws/simulate` streaming MuJoCo validation frames
✅ MuJoCo MJCF/URDF builder from arm config
✅ Task executor consumes same ExecutionPlan as Rapier
✅ MuJoCo validator and accuracy badge ("94% accurate")
✅ Confidence report derived from validation + rule checks
✅ **Physics side-by-side replay** — Rapier (left) + MuJoCo (right) play simultaneously, divergence frames in red
✅ **Servo