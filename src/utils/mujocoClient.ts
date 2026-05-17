import type { MuJoCoFrame, MuJoCoRunResult } from "../types/mujoco"




const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)
  ?? 'http://localhost:8000'



function getWsUrl(): string {
  return API_BASE
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://')
    + '/ws/simulate'
}




export type RapierFrameLite = {
  frame_index: number
  time_ms: number
  end_effector_xyz: [number, number, number]
  joint_angles_deg: number[]
}




type RunArgs = {
  runId: string
  arm: Record<string, unknown>
  executionPlan: Record<string, unknown>
  rapierFrames: RapierFrameLite[]
  onFrame: (frame: MuJoCoFrame) => void
  onComplete: (result: MuJoCoRunResult) => void
  onError: (message: string) => void
}






// Returns a cleanup function — call it to cancel the validation mid-run.
export function runMuJoCoValidation(args: RunArgs): () => void {
  let ws: WebSocket | null = null
  let cancelled = false

  // Limit payload: max 2000 frames to prevent runaway payloads
  const frames = args.rapierFrames.slice(0, 2000)

  try {
    ws = new WebSocket(getWsUrl())

    ws.onopen = () => {
      if (cancelled) { ws?.close(); return }
      ws!.send(JSON.stringify({
        run_id:         args.runId,
        arm:            args.arm,
        execution_plan: args.executionPlan,
        rapier_frames:  frames,
        target_fps:     60,
        strict:         true,
      }))
    }

    ws.onmessage = (ev) => {
      if (cancelled) return
      try {
        const msg = JSON.parse(ev.data as string) as Record<string, unknown>
        if (msg.type === 'frame')    args.onFrame(msg.frame as MuJoCoFrame)
        if (msg.type === 'complete') args.onComplete(msg.result as MuJoCoRunResult)
        if (msg.type === 'error')    args.onError(String(msg.message ?? 'Unknown MuJoCo error'))
      } catch {
        // Malformed WS message — silently ignore
      }
    }

    ws.onerror = () => {
      if (!cancelled) args.onError('MuJoCo socket unavailable — backend may be offline.')
    }

    ws.onclose = (ev) => {
      if (!cancelled && ev.code !== 1000 && ev.code !== 1001) {
        args.onError(`MuJoCo socket closed unexpectedly (code ${ev.code}).`)
      }
    }
  } catch (err) {
    args.onError(err instanceof Error ? err.message : String(err))
  }

  return () => {
    cancelled = true
    ws?.close()
  }
}
