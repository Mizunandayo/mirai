# Mirai — Session Context
**Last updated:** Tuesday, May 12, 2026 — Day 2 complete + extended UX polish. Day 3 starts next.

---

## Project Summary
**Mirai (未来 · "Future")** — AI-powered browser-based robot arm simulator.
- **Hackathon:** Transforming Enterprise Through AI by lablab.ai
- **Dates:** May 11–19, 2026
- **Solo builder:** Francis Daniel (Mizunandayo / Mizu)
- **Primary Track:** Track 3 — Robotics & Simulation
- **Partner Award target:** Gemini Award (Best use of Gemini) — separate from track, can win both

---

## Track Strategy
- Competing in **Track 3 only** (eligible for 1 track prize)
- Also targeting the **Gemini Award** — partner award, no track restriction
- Gemini is deeply integrated → qualifies naturally for Gemini Award

---

## Submission Fields (lablab.ai)
| Field | Value |
|-------|-------|
| **Details** | `Mirai (未来) — AI robot arm simulator in the browser. Design, simulate physics & export Arduino/Python code. Tracks 2 & 3.` |
| **State** | `Active Development` |

---

## Tech Stack (confirmed)
| Layer | Technology |
|-------|-----------|
| Frontend | React **18.3.1** + TypeScript strict (downgraded from 19 for R3F v8 compat) |
| 3D | React Three Fiber + @react-three/drei |
| Client physics | @react-three/rapier (Rapier WASM) — 60fps |
| Server physics | MuJoCo 3.x (upgraded from PyBullet) |
| AI | Gemini 2.0 Flash (voice/text) + Gemini 2.0 Pro (ReAct reasoning) |
| Visual programming | React Flow v12 |
| State | Jotai v2 |
| Backend | FastAPI 0.115 + Python 3.12 |
| Code export | Jinja2 (deterministic — NOT LLM) |
| Database | SQLite + SQLAlchemy |
| Desktop wrapper | Tauri v2 (web-first for demo) |
| Styling | TailwindCSS v4 + Framer Motion v11 |
| Build | Vite **7** |
| Deploy | Vercel + Railway + Docker |

---

## Gemini Setup
- **One API key** covers all models — `GEMINI_API_KEY` in `backend/.env`
- `gemini-2.0-flash` → real-time voice/text arm design (fast)
- `gemini-2.0-pro` → multi-step motion planning via ReAct loop (smart)
- Free tier is sufficient — no $300 Google Cloud credits needed for Tracks 2 & 3

---

## Credits / Cloud
- **$300 Google Cloud credits** — NOT required for Mirai
- Track 3 has no cloud dependency (Rapier = browser WASM, MuJoCo = local)
- Track 2 (Gemini) covered by free API tier
- Only needed if rate limits are hit mid-hackathon (unlikely solo, 8 days)

---

## Current File State
| File | Status |
|------|--------|
| `MIRAI_BLUEPRINT.md` | ✅ v2.0 — fully updated |
| `MIRAI_BLUEPRINT.pdf` | ✅ Generated (1,017 KB) |
| `backend/.env` | ✅ GEMINI_API_KEY, JWT_SECRET, DATABASE_URL |
| `server/requirements.txt` | ✅ mujoco>=3.1.0 |
| `package.json` | ✅ All deps, npm installed |
| `vite.config.js` | ✅ @tailwindcss/vite plugin, port 5173 |
| `src/index.css` | ✅ @import tailwindcss + @theme tokens |
| `src/vite-env.d.ts` | ✅ React 18 JSX augmentation |
| `src/main.tsx` | ✅ Imports index.css + App.css + Atkinson font |
| `src/App.tsx` | ✅ 3-zone layout (header + panel + viewport + footer) |
| `src/App.css` | ✅ Full design system (~1,550 lines): hdr-* header + panel redesign + BOM :has() expand rules + panel-resize-handle + no-transition-while-resizing |
| `src/types/arm.ts` | ✅ ArmSegment, GripperConfig, BOMItem, ValidationResult, ArmConfig |
| `src/store/atoms.ts` | ✅ Fully typed Jotai atoms |
| `src/utils/armPhysics.ts` | ✅ calculateMaxReach, calculateTorqueAtJoint, validateArm |
| `src/utils/bomPricing.ts` | ✅ calculateBOM, getTotalBOMCost (72-piece BOM) |
| `src/utils/armExport.ts` | ✅ exportArmConfig, parseArmConfig, loadArmConfigFromFile |
| `src/components/ArmViewer.tsx` | ✅ Full R3F scene, lights, shadows, grid |
| `src/components/RobotArm.tsx` | ✅ Dynamic segments, click-to-select, 3 gripper types |
| `src/components/ReachEnvelope.tsx` | ✅ Wireframe reach sphere |
| `src/components/JointArcOverlay.tsx` | ✅ Joint arc + fill |
| `src/components/arm-designer/ArmDesignerPanel.tsx` | ✅ Topbar + toolbar (tabs + icon btns) + content + footer + right-edge drag-resize handle (min 336px, max 560px) |
| `src/components/arm-designer/SegmentList.tsx` | ✅ Add/remove/edit with sliders |
| `src/components/arm-designer/GripperLibrary.tsx` | ✅ 3 gripper types with expand controls |
| `src/components/arm-designer/ValidationPanel.tsx` | ✅ Metrics + errors + warnings |
| `src/components/arm-designer/BOMCounter.tsx` | ✅ Live cost + collapsible BOM; expanded: parts list top, Estimated cost row bottom (CSS order), no redundant total row |
| `server/main.py` | ✅ FastAPI skeleton + health check |
| `convert_blueprint.py` | Can be deleted |
| `MIRAI_BLUEPRINT.html` | Can be deleted |

---

## Extended Day 2 UX Polish — COMPLETE
- ✅ Nav click toggles panel open/close (smooth CSS width transition)
- ✅ `ArmViewer` converted to `forwardRef`, exposes `resetCamera()` via `useImperativeHandle`
- ✅ Viewport camera reset button (top-right, SVG spin animation)
- ✅ Dismissable viewport hint pill (left of reset button, SVG X close)
- ✅ BOM expanded: fills full panel height; collapses `.panel-toolbar` + `.panel-content` via CSS `:has()`
- ✅ BOM text quality: Poppins, no gray, no small text
- ✅ BOM expanded layout: parts list at top, Estimated cost row at bottom, redundant total row removed
- ✅ Panel right-edge drag-to-resize (min 336px · max 560px · no-transition while dragging · body cursor lock)

## Next Up — Day 3 (Task Editor)
1. Install reactflow: `npm install reactflow --legacy-peer-deps`
2. Create `src/types/task.ts` — SceneGraph, TaskSpec, ValidationReport, ExecutionPlan
3. Create `src/store/taskAtoms.ts` — taskBlocks, selectedBlockId, sceneObjects
4. Build React Flow canvas with custom MOVE / GRIP / WAIT / LOOP / IF node types
5. Wire live 3D ghost preview in ArmViewer as blocks are placed
6. Export task as portable JSON
7. Add error highlighting (red = impossible, yellow = near-limit)
8. Add keyboard shortcuts: Ctrl+S, Ctrl+Z, Space, Delete

---

## Hackathon Deadline
**May 19, 2026 — 8:00 AM Philippine Standard Time**
Day 2 complete (+ extended polish). Day 3 (Task Editor / React Flow) starts next. 7 days remaining.

---

## Security Note
⚠️ `GEMINI_API_KEY` is in `backend/.env` — `.gitignore` covers `.env` files. **DO NOT COMMIT.**
