# Mirai — AI-Powered Robot Arm Simulator

**Transform robotics design through the power of Gemini AI.** Mirai is a browser-based simulator that makes robot arm design accessible to everyone.

## What is Mirai?

- **Design** a custom 3D robot arm (drag-and-drop segments, joints, grippers)
- **Describe** a task in plain English ("fold socks into drawer")
- **Gemini AI generates** the motion program (block-based visual programming)
- **Simulate** 60fps physics in-browser using Rapier WASM
- **Export** Arduino/Python code + BOM + PDF assembly guide
- **Build** the real arm for $150–$300

## Quick Start

```bash
# Install dependencies
npm install
pip install -r server/requirements.txt

# Set up environment
cp .env.example .env
# Add your Gemini API key to .env

# Run dev server
npm run dev

# In another terminal, start FastAPI backend
cd server && python -m uvicorn main:app --reload
```

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Tailwind |
| 3D Rendering | React Three Fiber + Drei |
| Physics (client) | Rapier WASM |
| Physics (server) | PyBullet |
| Visual Programming | React Flow |
| AI | Gemini 2.0 Flash + Pro |
| Backend | FastAPI + Python |

## Hackathon Info

- **Event:** Transforming Enterprise Through AI (lablab.ai)
- **Tracks:** Track 3 (Robotics) + Track 2 (Gemini AI Agents)
- **Prize Target:** Gemini Award
- **Deadline:** May 19, 2026

## Project Structure

```
mirai/
├── src/                    # React frontend
│   ├── components/        # UI components
│   ├── store/            # Jotai atoms (state)
│   └── App.tsx
├── server/               # FastAPI backend
│   ├── main.py
│   ├── models/          # PyBullet simulation
│   ├── ai/              # Gemini integration
│   └── requirements.txt
├── src-tauri/           # Tauri desktop app
└── package.json
```

---

**Made with ❤️ for the hackathon | May 2026**
