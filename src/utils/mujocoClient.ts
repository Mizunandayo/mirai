import type { MuJoCoFrame, MuJoCoRunResult } from "../types/mujoco"

type RunArgs = {
  runId: string
  arm: Record<string, unknown>
  executionPlan: Record<string, unknown>
  rapierFrames: Array<{
    frame_index: number
    time_ms: number
    end_effector_xyz: [number, number, number]
    joint_angles_deg: number[]
  }>
  onFrame: (frame: MuJoCoFrame) => void
  onComplete: (result: MuJoCoRunResult) => void
  onError: (message: string) => void
}

export function runMuJoCoValidation(args: RunArgs) {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws"
  const ws = new WebSocket(`${protocol}://${window.location.host}/ws/simulate`)

  ws.onopen = () => {
    ws.send(JSON.stringify({
      run_id: args.runId,
      arm: args.arm,
      execution_plan: args.executionPlan,
      rapier_frames: args.rapierFrames,
      target_fps: 60,
      strict: true,
    }))
  }

  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data)
    if (msg.type === "frame") args.onFrame(msg.frame as MuJoCoFrame)
    if (msg.type === "complete") args.onComplete(msg.result as MuJoCoRunResult)
    if (msg.type === "error") args.onError(String(msg.message || "Unknown MuJoCo error"))
  }

  ws.onerror = () => args.onError("MuJoCo socket connection failed")
  return () => ws.close()
}