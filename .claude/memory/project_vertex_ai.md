---
name: project-vertex-ai
description: Mirai originally used Vertex AI but switched to direct Gemini Developer API from the frontend for speed. Backend still supports Vertex AI as fallback. VITE_GEMINI_API_KEY needed for fast path.
metadata:
  type: project
---

Mirai's planning uses **two Gemini access paths**:

**Fast path (primary)**: Browser → `@google/generative-ai` SDK → Gemini Developer API
- Requires `VITE_GEMINI_API_KEY=<developer-key>` in frontend `.env`
- 5-15 second latency
- `src/utils/geminiDirectPlanner.ts` implements this
- `isDirectGeminiAvailable()` returns true when key is set

**Slow path (fallback)**: Browser → FastAPI → Vertex AI → Gemini
- Used when `VITE_GEMINI_API_KEY` is absent
- 4-6 minute latency (Vertex AI auth overhead + regional routing)
- Backend `.env` requires: `GEMINI_PROVIDER=vertex`, `VERTEX_PROJECT_ID`, `VERTEX_LOCATION`

**Why the switch**: Vertex AI was causing 4-6 minute latency per planning call due to OAuth2 token refresh, GCP regional routing, and cold-start overhead. The Developer API is 10-20× faster for interactive inference.

**The Gemini requirement is still satisfied**: Both paths call the same `gemini-2.0-flash` model. The hackathon requires Gemini, not necessarily Vertex AI.

**Backend still uses Vertex AI for**:
- `/ai/repair` (L3 repair, 1 call max)
- `/ai/suggest` (suggestions panel)
- `/ai/plan` (fallback when no VITE_GEMINI_API_KEY)

**How to apply:**
- Always check `isDirectGeminiAvailable()` before suggesting backend-dependent flows
- When user asks about speed, recommend setting `VITE_GEMINI_API_KEY` first
- Frontend SDK (`@google/generative-ai`) now DOES call Gemini directly — the old rule "frontend must go through backend" is obsolete for planning
